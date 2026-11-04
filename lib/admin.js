import crypto from 'crypto';
import sharp from 'sharp';
import { getPool } from './db';
import { imageKind } from './backgrounds';
import {
  copyObject,
  deleteObject,
  isLibraryWallpaperUrl,
  libraryObjectKey,
  ossConfig,
  putObject,
} from './oss';
import { findUserBySession, readSessionToken } from './users';

const SITE_PAGE = 20;
const WALLPAPER_PAGE = 24;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const NAV_CATEGORIES = [
  ['shopping', '购物'],
  ['video', '视频'],
  ['music', '音乐'],
  ['news', '资讯'],
  ['social', '社区'],
  ['app', '应用'],
  ['games', '游戏'],
  ['life', '生活'],
  ['read', '阅读'],
  ['education', '教育'],
  ['tech', '技术'],
  ['ai', '人工智能'],
  ['photos', '图片'],
  ['sports', '运动'],
  ['finance', '金融'],
  ['others', '其他'],
];

const WALLPAPER_CATEGORIES = [
  ['nature', '自然'],
  ['ocean', '海洋'],
  ['architecture', '建筑'],
  ['animal', '动物'],
  ['travel', '旅行'],
  ['food', '美食'],
  ['anime', '动漫'],
  ['sport', '运动'],
  ['tech', '科技'],
  ['street', '街景'],
];

const NAV_NOTES = Object.fromEntries(NAV_CATEGORIES);
const WALLPAPER_NOTES = Object.fromEntries(WALLPAPER_CATEGORIES);
const columnCache = new Map();

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function requireAdmin(request) {
  const user = await findUserBySession(readSessionToken(request));
  if (!user) throw httpError('请先登录', 401);
  if (!user.is_admin) throw httpError('没有管理权限', 403);
  return user;
}

function quote(name) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw httpError('保存失败，请稍后再试', 500);
  return `\`${name}\``;
}

function tableName(table) {
  if (table !== 'nav_sites' && table !== 'wallpapers') throw httpError('保存失败，请稍后再试', 500);
  return table;
}

async function columns(table) {
  const name = tableName(table);
  if (columnCache.has(name)) return columnCache.get(name);
  try {
    const [rows] = await getPool().query(`SHOW COLUMNS FROM ${quote(name)}`);
    columnCache.set(name, rows);
    return rows;
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') throw httpError('数据表还没有准备好', 500);
    throw error;
  }
}

function has(cols, name) {
  return cols.some((col) => col.Field === name);
}

function emptyFor(col) {
  const type = String(col.Type || '').toLowerCase();
  if ((String(col.Field).endsWith('_at') || String(col.Field).endsWith('_time')) && (type.includes('datetime') || type.includes('timestamp'))) {
    return new Date();
  }
  const enumMatch = type.match(/^enum\((.*)\)$/);
  if (enumMatch) return enumMatch[1].split(',')[0].trim().replace(/^'/, '').replace(/'$/, '');
  if (type.includes('json')) return '[]';
  if (/int|decimal|float|double|bit|bool/.test(type)) return 0;
  if (type.includes('datetime') || type.includes('timestamp')) return '2000-01-01 00:00:00';
  if (type.startsWith('date')) return '2000-01-01';
  if (type.includes('time')) return '00:00:00';
  return '';
}

async function insertDynamic(table, values) {
  const cols = await columns(table);
  const data = {};
  for (const col of cols) {
    if (String(col.Extra || '').toLowerCase().includes('auto_increment')) continue;
    if (Object.prototype.hasOwnProperty.call(values, col.Field)) {
      data[col.Field] = values[col.Field];
      continue;
    }
    const generated = String(col.Extra || '').toLowerCase().includes('default_generated');
    if (col.Null === 'NO' && col.Default == null && !generated) data[col.Field] = emptyFor(col);
  }
  const names = Object.keys(data);
  if (!names.length) throw httpError('保存失败，请稍后再试', 500);
  const [result] = await getPool().query(
    `INSERT INTO ${quote(tableName(table))} (${names.map(quote).join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
    names.map((name) => data[name]),
  );
  return Number(result.insertId);
}

async function updateDynamic(table, id, values) {
  const cols = await columns(table);
  const names = Object.keys(values).filter((name) => (
    name !== 'id' && cols.some((col) => col.Field === name)
  ));
  if (!names.length) return;
  await getPool().query(
    `UPDATE ${quote(tableName(table))} SET ${names.map((name) => `${quote(name)} = ?`).join(', ')} WHERE id = ?`,
    [...names.map((name) => values[name]), id],
  );
}

async function writeRow(work) {
  try {
    return await work();
  } catch (error) {
    if (error.status) throw error;
    if (error.code === 'ER_DATA_TOO_LONG') throw httpError('有一项内容太长', 400);
    throw error;
  }
}

function cleanText(value, max) {
  return String(value || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);
}

function cleanLink(value) {
  const url = cleanText(value, 512);
  if (/^https?:\/\/\S+$/i.test(url)) return url;
  if (/^\/(?!\/)\S*$/.test(url)) return url;
  return '';
}

function cleanIcon(value) {
  const icon = cleanText(value, 512);
  if (!icon) return '';
  if (/^\/(?:static|uploads)\/[a-zA-Z0-9._/-]+$/.test(icon)) return icon;
  if (/^https?:\/\/\S+$/i.test(icon)) return icon;
  return '';
}

function cleanCount(value, max = 2000000000) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.min(max, number);
}

function cleanOffset(value) {
  return cleanCount(value, 100000);
}

function truthy(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return value === 1 || value === '1' || value === 'true';
}

function asList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (value == null || value === '') return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return asList(parsed);
    } catch {
      return [value];
    }
    return [value];
  }
  return [];
}

function cleanCategories(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(',');
  const picked = [];
  for (const item of source) {
    const category = String(item || '').trim();
    if (!/^[a-z0-9-]{1,32}$/.test(category) || picked.includes(category)) continue;
    picked.push(category);
  }
  return picked.slice(0, 16);
}

function siteView(row) {
  return {
    id: Number(row.id),
    title: row.title || '',
    url: row.url || '',
    icon: row.logo || row.icon_url || '',
    keyword: row.keyword || '',
    description: row.description || '',
    categories: asList(row.category),
    sort_order: Number(row.sort_order || 0),
    popularity: Number(row.popularity || 0),
    is_enabled: row.is_enabled == null ? true : Number(row.is_enabled) === 1,
    user_id: Number(row.user_id || 0),
  };
}

function isLocalWallpaper(url) {
  return /^\/uploads\/bg\/[a-z0-9-]+\/[a-z0-9-]+\.jpg$/.test(String(url || '').split('?')[0]);
}

function wallpaperView(row) {
  const image = row.image_path || '';
  return {
    id: Number(row.id),
    title: row.title || '',
    category: row.category || '',
    category_note: row.category_note || '',
    image,
    thumb: row.thumb_path || image,
    local: isLocalWallpaper(image),
  };
}

export async function listSites({ q = '', offset = 0 } = {}) {
  const cols = await columns('nav_sites');
  const query = cleanText(q, 40);
  const start = cleanOffset(offset);
  const where = [];
  const params = [];
  if (query) {
    const pattern = `%${query.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
    const parts = [];
    for (const name of ['title', 'url', 'keyword']) {
      if (!has(cols, name)) continue;
      parts.push(`${quote(name)} LIKE ?`);
      params.push(pattern);
    }
    if (parts.length) where.push(`(${parts.join(' OR ')})`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = has(cols, 'sort_order') ? 'sort_order ASC, id ASC' : 'id ASC';
  const pool = getPool();
  const [counts] = await pool.query(`SELECT COUNT(*) AS total FROM nav_sites ${clause}`, params);
  const [rows] = await pool.query(
    `SELECT * FROM nav_sites ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`,
    [...params, SITE_PAGE, start],
  );
  return {
    sites: rows.map(siteView),
    total: Number(counts[0].total || 0),
    offset: start,
    page_size: SITE_PAGE,
    categories: NAV_CATEGORIES.map(([category, category_note]) => ({ category, category_note })),
    fields: {
      sort_order: has(cols, 'sort_order'),
      popularity: has(cols, 'popularity'),
      is_enabled: has(cols, 'is_enabled'),
    },
  };
}

export async function saveSite(fields) {
  return writeRow(async () => {
    const cols = await columns('nav_sites');
    const id = cleanCount(fields.id);
    const title = cleanText(fields.title, 80);
    const url = cleanLink(fields.url);
    if (!title) throw httpError('请填写名称', 400);
    const icon = cleanIcon(fields.icon);
    if (fields.icon && !icon) throw httpError('图标请填写站内图片地址或 http 链接', 400);
    if (!url) throw httpError('网址要以 http 或 / 开头', 400);
    const categories = cleanCategories(fields.categories);
    const values = {
      title,
      url,
      keyword: cleanText(fields.keyword, 64),
      description: cleanText(fields.description, 200),
      logo: icon,
      icon_url: icon,
      img_name: icon ? icon.split('?')[0].split('/').pop().slice(0, 128) : '',
      category: JSON.stringify(categories),
      category_note: JSON.stringify(categories.map((item) => NAV_NOTES[item] || item)),
      sort_order: cleanCount(fields.sort_order, 9999),
      popularity: cleanCount(fields.popularity),
      is_enabled: truthy(fields.is_enabled, true) ? 1 : 0,
      link_updated_at: new Date(),
      updated_at: new Date(),
    };
    if (id) {
      const [rows] = await getPool().query('SELECT id FROM nav_sites WHERE id = ? LIMIT 1', [id]);
      if (!rows.length) throw httpError('没有找到这个网址', 404);
      await updateDynamic('nav_sites', id, values);
      return { id };
    }
    const userColumn = cols.find((col) => col.Field === 'user_id');
    if (userColumn) values.user_id = userColumn.Null === 'YES' ? null : 0;
    return { id: await insertDynamic('nav_sites', values) };
  });
}

export async function removeSite(id) {
  const siteId = cleanCount(id);
  if (!siteId) throw httpError('没有找到这个网址', 404);
  const [result] = await getPool().query('DELETE FROM nav_sites WHERE id = ?', [siteId]);
  if (!result.affectedRows) throw httpError('没有找到这个网址', 404);
  return { id: siteId };
}

async function wallpaperCategories() {
  const cols = await columns('wallpapers');
  const [rows] = await getPool().query(
    has(cols, 'category_note')
      ? 'SELECT category, MAX(category_note) AS category_note, COUNT(*) AS total FROM wallpapers GROUP BY category'
      : 'SELECT category, COUNT(*) AS total FROM wallpapers GROUP BY category',
  );
  const byCode = new Map(WALLPAPER_CATEGORIES.map(([category, category_note]) => (
    [category, { category, category_note, total: 0 }]
  )));
  for (const row of rows) {
    const category = String(row.category || '').trim();
    if (!/^[a-z0-9-]{1,32}$/.test(category)) continue;
    const current = byCode.get(category) || { category, category_note: category, total: 0 };
    current.total = Number(row.total || 0);
    if (row.category_note) current.category_note = row.category_note;
    byCode.set(category, current);
  }
  const order = WALLPAPER_CATEGORIES.map(([category]) => category);
  return [...byCode.values()].sort((a, b) => {
    const left = order.indexOf(a.category);
    const right = order.indexOf(b.category);
    return (left < 0 ? 99 : left) - (right < 0 ? 99 : right);
  });
}

async function categoryNote(category) {
  const cols = await columns('wallpapers');
  const fallback = WALLPAPER_NOTES[category] || category;
  if (!has(cols, 'category_note')) return fallback;
  const [rows] = await getPool().query(
    'SELECT category_note FROM wallpapers WHERE category = ? AND category_note <> \'\' LIMIT 1',
    [category],
  );
  return rows[0]?.category_note || fallback;
}

export async function listWallpapers({ category = '', offset = 0 } = {}) {
  await columns('wallpapers');
  const chosen = /^[a-z0-9-]{1,32}$/.test(category) ? category : '';
  const start = cleanOffset(offset);
  const where = chosen ? 'WHERE category = ?' : '';
  const params = chosen ? [chosen] : [];
  const pool = getPool();
  const [counts] = await pool.query(`SELECT COUNT(*) AS total FROM wallpapers ${where}`, params);
  const [rows] = await pool.query(
    `SELECT * FROM wallpapers ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, WALLPAPER_PAGE, start],
  );
  return {
    wallpapers: rows.map(wallpaperView),
    total: Number(counts[0].total || 0),
    offset: start,
    page_size: WALLPAPER_PAGE,
    category: chosen,
    categories: await wallpaperCategories(),
  };
}

async function storeLibraryFiles(category, buffer, kind) {
  if (!ossConfig().ready) throw httpError('上传服务还没有配置', 503);
  const id = crypto.randomBytes(8).toString('hex');
  const fullKey = `wallpapers/${category}/${id}.jpg`;
  const thumbKey = `wallpapers/${category}/400/${id}.jpg`;
  const options = { failOn: 'none', limitInputPixels: 40000000 };
  let full = buffer;
  let thumb;
  try {
    const meta = await sharp(buffer, options).metadata();
    const uprightJpeg = kind.ext === 'jpg' && (!meta.orientation || meta.orientation === 1);
    if (!uprightJpeg) {
      full = await sharp(buffer, options).rotate().jpeg({ quality: 90 }).toBuffer();
    }
    thumb = await sharp(buffer, options)
      .rotate()
      .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch {
    throw httpError('这张图片无法处理', 400);
  }
  if (full.length > MAX_IMAGE_BYTES) throw httpError('图片太大', 400);
  const imageUrl = await putObject(fullKey, full, 'image/jpeg');
  if (!isLibraryWallpaperUrl(imageUrl)) {
    await deleteObject(fullKey).catch(() => {});
    throw httpError('上传失败，请稍后再试', 500);
  }
  try {
    const thumbUrl = await putObject(thumbKey, thumb, 'image/jpeg');
    return { imageUrl, thumbUrl, fileName: `${id}.jpg` };
  } catch (error) {
    await deleteObject(fullKey).catch(() => {});
    throw error;
  }
}

export async function addWallpaper(fields, buffer) {
  return writeRow(async () => {
    const category = String(fields.category || '').trim();
    const allowed = new Set((await wallpaperCategories()).map((item) => item.category));
    if (!allowed.has(category)) throw httpError('请选择分类', 400);
    if (!buffer || !buffer.length) throw httpError('请选择图片', 400);
    if (buffer.length > MAX_IMAGE_BYTES) throw httpError('单张图片不能超过 8MB', 400);
    const kind = imageKind(buffer);
    if (!kind) throw httpError('只支持 JPG、PNG、WEBP', 400);
    const stored = await storeLibraryFiles(category, buffer, kind);
    try {
      const id = await insertDynamic('wallpapers', {
        title: cleanText(fields.title, 80),
        category,
        category_note: await categoryNote(category),
        image_path: stored.imageUrl,
        thumb_path: stored.thumbUrl,
        file_name: stored.fileName,
        last_used_at: '2000-01-01 00:00:00',
      });
      return { id };
    } catch (error) {
      const fullKey = libraryObjectKey(stored.imageUrl);
      const thumbKey = libraryObjectKey(stored.thumbUrl);
      if (fullKey) await deleteObject(fullKey).catch(() => {});
      if (thumbKey) await deleteObject(thumbKey).catch(() => {});
      throw error;
    }
  });
}

export async function updateWallpaper(fields) {
  return writeRow(async () => {
    const id = cleanCount(fields.id);
    if (!id) throw httpError('没有找到这张壁纸', 404);
    const [rows] = await getPool().query('SELECT * FROM wallpapers WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) throw httpError('没有找到这张壁纸', 404);
    const row = rows[0];
    const title = cleanText(fields.title, 80);
    const nextCategory = String(fields.category || row.category || '').trim();
    const allowed = new Set((await wallpaperCategories()).map((item) => item.category));
    if (nextCategory !== row.category && !allowed.has(nextCategory)) throw httpError('请选择分类', 400);
    if (nextCategory === row.category || isLocalWallpaper(row.image_path)) {
      if (nextCategory !== row.category) throw httpError('这张图保存在网站文件里，分类不能修改', 400);
      await updateDynamic('wallpapers', id, { title, updated_at: new Date() });
      return { id };
    }
    const oldFull = libraryObjectKey(row.image_path);
    if (!oldFull) throw httpError('这张图的地址不能改分类', 400);
    const oldThumb = libraryObjectKey(row.thumb_path);
    const fileId = crypto.randomBytes(8).toString('hex');
    const fullKey = `wallpapers/${nextCategory}/${fileId}.jpg`;
    const thumbKey = `wallpapers/${nextCategory}/400/${fileId}.jpg`;
    const imageUrl = await copyObject(oldFull, fullKey);
    let thumbUrl = '';
    if (oldThumb && oldThumb !== oldFull) {
      try {
        thumbUrl = await copyObject(oldThumb, thumbKey);
      } catch {
        thumbUrl = '';
      }
    }
    if (!isLibraryWallpaperUrl(imageUrl)) {
      await deleteObject(fullKey).catch(() => {});
      await deleteObject(thumbKey).catch(() => {});
      throw httpError('保存失败，请稍后再试', 500);
    }
    try {
      await updateDynamic('wallpapers', id, {
        title,
        category: nextCategory,
        category_note: await categoryNote(nextCategory),
        image_path: imageUrl,
        thumb_path: thumbUrl || imageUrl,
        file_name: `${fileId}.jpg`,
        updated_at: new Date(),
      });
    } catch (error) {
      await deleteObject(fullKey).catch(() => {});
      await deleteObject(thumbKey).catch(() => {});
      throw error;
    }
    await deleteObject(oldFull).catch(() => {});
    if (oldThumb && oldThumb !== oldFull) await deleteObject(oldThumb).catch(() => {});
    return { id };
  });
}

export async function removeWallpaper(id) {
  const wallpaperId = cleanCount(id);
  if (!wallpaperId) throw httpError('没有找到这张壁纸', 404);
  const [rows] = await getPool().query(
    'SELECT image_path, thumb_path FROM wallpapers WHERE id = ? LIMIT 1',
    [wallpaperId],
  );
  if (!rows.length) throw httpError('没有找到这张壁纸', 404);
  await getPool().query('DELETE FROM wallpapers WHERE id = ?', [wallpaperId]);
  const fullKey = libraryObjectKey(rows[0].image_path);
  const thumbKey = libraryObjectKey(rows[0].thumb_path);
  if (fullKey) await deleteObject(fullKey).catch(() => {});
  if (thumbKey && thumbKey !== fullKey) await deleteObject(thumbKey).catch(() => {});
  return { id: wallpaperId };
}
