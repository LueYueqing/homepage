import crypto from 'crypto';
import { getPool } from './db';
import { ossConfig, putObject } from './oss';
import { domainTitle } from './site-meta';

const MAX_SITES = 200;
const DEFAULT_ICON = '/static/home/images/defaultsicon/null.png';

let tableReady;

function fail(message) {
  const error = new Error(message);
  error.expose = true;
  return error;
}

export async function ensureUserSiteTable() {
  if (!tableReady) {
    tableReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS user_sites (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        title VARCHAR(40) NOT NULL DEFAULT '',
        url VARCHAR(2048) NOT NULL DEFAULT '',
        icon VARCHAR(2048) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_user_sort (user_id, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  return tableReady;
}

function cleanTitle(value, fallback) {
  const text = String(value || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  return text || String(fallback || '网站').slice(0, 20);
}

export function cleanSiteUrl(value) {
  let text = String(value || '').trim().replace(/。/g, '.');
  if (!text || text.length > 2048) return '';
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    if (!parsed.hostname || parsed.hostname.length > 253) return '';
    return parsed.href.slice(0, 2048);
  } catch {
    return '';
  }
}

function cleanIcon(value) {
  const text = String(value || '').trim();
  if (!text || text.startsWith('data:')) return '';
  if (/^\/static\/home\/images\/[a-zA-Z0-9._/-]+$/.test(text)) return text.slice(0, 2048);
  if (/^static\/home\/images\/[a-zA-Z0-9._/-]+$/.test(text)) return `/${text}`.slice(0, 2048);
  if (/^https?:\/\/\S+$/i.test(text)) return text.slice(0, 2048);
  return '';
}

function seedSites(sites) {
  const list = [];
  for (const item of Array.isArray(sites) ? sites : []) {
    const url = cleanSiteUrl(item?.url);
    if (!url) continue;
    list.push({
      title: cleanTitle(item.title, domainTitle(url)),
      url,
      icon: cleanIcon(item.icon || item.icon_url) || DEFAULT_ICON,
    });
    if (list.length >= MAX_SITES - 1) break;
  }
  return list;
}

async function storedIcon(userId, file, iconText) {
  if (file && Number(file.size) > 0) {
    if (file.size > 2 * 1024 * 1024) throw fail('上传图标文件大小不能大于2M！');
    const types = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    const ext = types[String(file.type || '').toLowerCase()];
    if (!ext) throw fail('请上传jpg / jpeg / png / gif 格式图片');
    if (!ossConfig().ready) throw fail('上传服务还没有配置');
    const body = Buffer.from(await file.arrayBuffer());
    const key = `whatab/${userId}/icons/${crypto.randomBytes(8).toString('hex')}.${ext}`;
    return putObject(key, body, file.type);
  }
  return cleanIcon(iconText) || DEFAULT_ICON;
}

async function withSites(userId, fallbackSites, change) {
  await ensureUserSiteTable();
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
    let [rows] = await connection.query(
      'SELECT id, sort_order, title, url, icon FROM user_sites WHERE user_id = ? ORDER BY sort_order ASC, id ASC FOR UPDATE',
      [userId],
    );
    if (!rows.length) {
      const seed = seedSites(fallbackSites);
      for (let index = 0; index < seed.length; index += 1) {
        await connection.query(
          'INSERT INTO user_sites (user_id, sort_order, title, url, icon) VALUES (?, ?, ?, ?, ?)',
          [userId, index, seed[index].title, seed[index].url, seed[index].icon],
        );
      }
      [rows] = await connection.query(
        'SELECT id, sort_order, title, url, icon FROM user_sites WHERE user_id = ? ORDER BY sort_order ASC, id ASC FOR UPDATE',
        [userId],
      );
    }
    const result = await change(connection, rows);
    await connection.commit();
    return result;
  } catch (error) {
    try { await connection.rollback(); } catch { /* 事务可能已经结束 */ }
    if (error.expose) throw error;
    throw fail('保存失败，请稍后再试');
  } finally {
    connection.release();
  }
}

export async function listUserSites(userId) {
  await ensureUserSiteTable();
  const [rows] = await getPool().query(
    'SELECT title, url, icon FROM user_sites WHERE user_id = ? ORDER BY sort_order ASC, id ASC',
    [userId],
  );
  return rows.map((row, index) => ({
    sort: index,
    title: row.title,
    url: row.url,
    icon: row.icon,
  }));
}

export async function createUserSite(userId, fields, file, fallbackSites) {
  const url = cleanSiteUrl(fields.url);
  if (!url) throw fail('获取图标失败！未输入网址或格式不正确');
  const title = cleanTitle(fields.title, domainTitle(url));
  const icon = await storedIcon(userId, file, fields.icon);
  return withSites(userId, fallbackSites, async (connection, rows) => {
    if (rows.length >= MAX_SITES) throw fail('无法添加更多网站！');
    const sort = rows.length;
    await connection.query(
      'INSERT INTO user_sites (user_id, sort_order, title, url, icon) VALUES (?, ?, ?, ?, ?)',
      [userId, sort, title, url, icon],
    );
    return { success: '已添加到你的网址', sort, title, url, icon };
  });
}

export async function editUserSite(userId, fields, file, fallbackSites) {
  const sort = Number.parseInt(fields.sort, 10);
  const url = cleanSiteUrl(fields.url);
  if (!Number.isInteger(sort) || sort < 0 || !url) throw fail('保存失败！未输入网址或格式不正确');
  const title = cleanTitle(fields.title, domainTitle(url));
  const icon = await storedIcon(userId, file, fields.icon);
  return withSites(userId, fallbackSites, async (connection, rows) => {
    const current = rows[sort];
    if (!current) throw fail('没有找到这个网址');
    await connection.query(
      'UPDATE user_sites SET title = ?, url = ?, icon = ? WHERE id = ? AND user_id = ?',
      [title, url, icon, current.id, userId],
    );
    return { success: '已保存', title, url, icon };
  });
}

export async function deleteUserSite(userId, sortValue, fallbackSites) {
  const sort = Number.parseInt(sortValue, 10);
  if (!Number.isInteger(sort) || sort < 0) throw fail('没有找到这个网址');
  return withSites(userId, fallbackSites, async (connection, rows) => {
    if (rows.length <= 1) throw fail('至少须保留一个网址');
    const current = rows[sort];
    if (!current) throw fail('没有找到这个网址');
    await connection.query('DELETE FROM user_sites WHERE id = ? AND user_id = ?', [current.id, userId]);
    await connection.query(
      'UPDATE user_sites SET sort_order = sort_order - 1 WHERE user_id = ? AND sort_order > ?',
      [userId, sort],
    );
    return { success: '已删除' };
  });
}

export async function sortUserSites(userId, sortValue, fallbackSites) {
  const order = String(sortValue || '').split(',').map((item) => Number.parseInt(item, 10));
  return withSites(userId, fallbackSites, async (connection, rows) => {
    if (order.length !== rows.length || new Set(order).size !== rows.length) throw fail('排序保存失败');
    for (let index = 0; index < order.length; index += 1) {
      const current = rows[order[index]];
      if (!current) throw fail('排序保存失败');
      await connection.query(
        'UPDATE user_sites SET sort_order = ? WHERE id = ? AND user_id = ?',
        [index, current.id, userId],
      );
    }
    return { success: '排序已保存' };
  });
}

export async function resetUserSites(userId) {
  await ensureUserSiteTable();
  await getPool().query('DELETE FROM user_sites WHERE user_id = ?', [userId]);
  return { success: '已恢复默认网址' };
}
