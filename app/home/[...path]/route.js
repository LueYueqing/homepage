import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';
import {
  CUSTOM_BG_CATEGORY,
  addUserBackground,
  backfillUserThumbnails,
  countUserBackgrounds,
  imageKind,
  listUserBackgroundThumbs,
  listUserBackgrounds,
  markUserBackgroundUsed,
  peekUserBackground,
  removeUserBackground,
  replaceUserBackground,
  takeNextUserBackground,
} from '../../../lib/backgrounds';
import { createAlipayPayment, createWechatPayment, paymentReady, syncVipOrder } from '../../../lib/pay';
import { isLibraryWallpaperUrl, isUserBackgroundUrl } from '../../../lib/oss';
import {
  destroySession,
  findUserBySession,
  readSessionToken,
  saveUserSettings,
  sessionCookieOptions,
} from '../../../lib/users';
import { handleAdmin } from '../../../lib/admin-http';
import {
  clearShareCookies,
  handleShare,
  shareIndexCookieOptions,
  stepSharedWallpaper,
  wallpaperShare,
} from '../../../lib/shares';
import { createVipOrder, FREE_UPLOAD_LIMIT, VIP_PRICE_YUAN } from '../../../lib/vip';

export const dynamic = 'force-dynamic';

const CATEGORY_ORDER = [
  'nature',
  'ocean',
  'architecture',
  'animal',
  'travel',
  'food',
  'anime',
  'sport',
  'tech',
  'street',
];

const NAV_CATEGORY_ORDER = [
  'shopping',
  'video',
  'music',
  'news',
  'social',
  'app',
  'games',
  'life',
  'read',
  'education',
  'tech',
  'ai',
  'photos',
  'sports',
  'finance',
  'others',
];

const NAV_CATEGORY_NOTES = {
  shopping: '购物',
  video: '视频',
  music: '音乐',
  news: '资讯',
  social: '社区',
  app: '应用',
  games: '游戏',
  life: '生活',
  read: '阅读',
  education: '教育',
  tech: '技术',
  ai: '人工智能',
  photos: '图片',
  sports: '运动',
  finance: '金融',
  others: '其他',
};

function readJson(name) {
  const file = path.join(process.cwd(), '_api', name);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function payload() {
  return {
    userData: { user_type: 0 },
    engineData: readJson('engineData.json'),
    uiData: readJson('uiData.json'),
  };
}

function readCategoryList(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(',');
  if (!Array.isArray(value) && value) {
    try {
      const parsed = JSON.parse(String(value));
      if (Array.isArray(parsed)) return readCategoryList(parsed);
    } catch {
      /* 逗号分隔的分类代号 */
    }
  }
  return [...new Set(source.map((item) => safeCategory(item)).filter(Boolean))];
}

function navCategoryNote(category, note) {
  const text = String(note || '');
  if (/[\u4e00-\u9fff]/.test(text)) return text;
  return NAV_CATEGORY_NOTES[category] || text || category;
}

async function listNavSites(userId = 0, categories = []) {
  const pool = getPool();
  const selected = readCategoryList(categories);
  const sql = selected.length
    ? `SELECT title, keyword, url, description, logo, icon_url, img_name,
              category, category_note, source, country, popularity, is_pinned,
              external_uid,
              DATE_FORMAT(link_updated_at, '%Y-%m-%d %H:%i:%s') AS link_updated_at,
              DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
       FROM nav_sites
       WHERE (user_id = ? OR user_id IS NULL)
         AND is_enabled = 1
         AND JSON_OVERLAPS(category, CAST(? AS JSON))
       ORDER BY popularity DESC, sort_order ASC, id ASC
       LIMIT 18`
    : `SELECT title, keyword, url, description, logo, icon_url, img_name,
              category, category_note, source, country, popularity, is_pinned,
              external_uid,
              DATE_FORMAT(link_updated_at, '%Y-%m-%d %H:%i:%s') AS link_updated_at,
              DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
       FROM nav_sites
       WHERE (user_id = ? OR user_id IS NULL) AND is_enabled = 1
       ORDER BY sort_order ASC, id ASC
       LIMIT 18`;
  const params = selected.length ? [userId, JSON.stringify(selected)] : [userId];
  const [rows] = await pool.query(sql, params);
  return rows.map((row, index) => ({
    sort: index,
    title: row.title,
    keyword: row.keyword,
    url: row.url,
    description: row.description,
    icon: row.logo,
    icon_url: row.icon_url,
    img_name: row.img_name,
    category: asStringList(row.category),
    category_note: asStringList(row.category_note),
    source: row.source,
    country: row.country,
    popularity: Number(row.popularity || 0),
    is_pinned: Number(row.is_pinned || 0),
    external_uid: row.external_uid,
    link_updated_at: row.link_updated_at,
    updated_at: row.updated_at,
  }));
}

function asStringList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (value == null || value === '') return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return asStringList(parsed);
    } catch {
      return [value];
    }
    return [value];
  }
  return [];
}

function safeCategory(value) {
  const category = String(value || '').trim();
  if (!category) return '';
  if (!/^[a-z0-9-]{1,32}$/.test(category)) return '';
  return category;
}

async function readFields(request) {
  const type = request.headers.get('content-type') || '';
  try {
    if (type.includes('application/json')) {
      const data = await request.json();
      return data && typeof data === 'object' ? data : {};
    }
    if (type.includes('form') || type.includes('multipart')) {
      const form = await request.formData();
      const data = {};
      for (const [key, value] of form.entries()) data[key] = String(value);
      return data;
    }
    const text = await request.text();
    const params = new URLSearchParams(text);
    const data = {};
    for (const [key, value] of params.entries()) data[key] = value;
    return data;
  } catch {
    return {};
  }
}

async function listNavCategorySites(category, offset, limit = 30) {
  const safe = safeCategory(category);
  const start = Math.max(0, Number.parseInt(offset, 10) || 0);
  const size = Math.min(60, Math.max(1, Number.parseInt(limit, 10) || 30));
  if (!safe) return [];
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT title, url, logo, icon_url
     FROM nav_sites
     WHERE (user_id = 0 OR user_id IS NULL)
       AND is_enabled = 1
       AND JSON_CONTAINS(category, JSON_QUOTE(?))
     ORDER BY popularity DESC, id ASC
     LIMIT ? OFFSET ?`,
    [safe, size, start],
  );
  return rows.map((row) => ({
    title: row.title,
    url: row.url,
    icon: row.logo || row.icon_url || '',
  }));
}

async function listNavCategories() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT cat.category AS category,
            MAX(note.category_note) AS category_note,
            COUNT(DISTINCT n.id) AS total
     FROM nav_sites n
     JOIN JSON_TABLE(n.category, '$[*]' COLUMNS (
       ord FOR ORDINALITY,
       category VARCHAR(64) PATH '$'
     )) cat
     JOIN JSON_TABLE(n.category_note, '$[*]' COLUMNS (
       ord FOR ORDINALITY,
       category_note VARCHAR(64) PATH '$'
     )) note ON note.ord = cat.ord
     GROUP BY cat.category`,
  );
  return rows
    .map((row) => ({
      category: safeCategory(row.category),
      category_note: navCategoryNote(safeCategory(row.category), row.category_note),
      total: Number(row.total),
    }))
    .filter((row) => row.category)
    .sort((a, b) => {
      const left = NAV_CATEGORY_ORDER.indexOf(a.category);
      const right = NAV_CATEGORY_ORDER.indexOf(b.category);
      return (left < 0 ? 99 : left) - (right < 0 ? 99 : right);
    });
}

async function listCategories(user, share) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT category, category_note, COUNT(*) AS total
     FROM wallpapers
     GROUP BY category, category_note`,
  );
  const categories = rows
    .map((row) => ({
      category: row.category,
      category_note: row.category_note,
      total: Number(row.total),
    }))
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
  const ownerId = user?.id || share?.userId || 0;
  categories.unshift({
    category: CUSTOM_BG_CATEGORY,
    category_note: '自选',
    total: ownerId ? await countUserBackgrounds(ownerId) : 0,
  });
  return categories;
}

async function listThumbs(category, offset, user, share) {
  if (category === CUSTOM_BG_CATEGORY) {
    const ownerId = user?.id || share?.userId;
    if (!ownerId) return [];
    return listUserBackgroundThumbs(ownerId, offset);
  }
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT thumb_path
     FROM wallpapers
     WHERE category = ?
     ORDER BY file_name
     LIMIT 15 OFFSET ?`,
    [category, offset],
  );
  return rows.map((row) => row.thumb_path);
}

function safeImagePath(value) {
  const imagePath = String(value || '').trim();
  if (/^\/uploads\/bg\/[a-z0-9-]+\/[a-z0-9-]+\.jpg$/.test(imagePath)) return imagePath;
  if (isUserBackgroundUrl(imagePath)) return imagePath.split('?')[0];
  if (isLibraryWallpaperUrl(imagePath)) return imagePath.split('?')[0];
  return '';
}

async function peekNextWallpaper(category, exclude, user) {
  if (category === CUSTOM_BG_CATEGORY) {
    if (!user) return null;
    const pick = await peekUserBackground(user.id, exclude);
    return pick ? { image_path: pick.image_url, category: CUSTOM_BG_CATEGORY, title: '自选' } : null;
  }
  const pool = getPool();
  const filters = [];
  const params = [];
  if (category) {
    filters.push('category = ?');
    params.push(category);
  }
  if (exclude) {
    filters.push('image_path <> ?');
    params.push(exclude);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT image_path, category, title
     FROM wallpapers
     ${where}
     ORDER BY last_used_at ASC, id ASC
     LIMIT 1`,
    params,
  );
  if (rows.length || !exclude) return rows[0] || null;
  return peekNextWallpaper(category, '', user);
}

async function markWallpaperUsed(imagePath, user) {
  if (isUserBackgroundUrl(imagePath)) {
    if (!user) return false;
    return markUserBackgroundUsed(user.id, imagePath);
  }
  const pool = getPool();
  const [result] = await pool.query(
    'UPDATE wallpapers SET last_used_at = NOW() WHERE image_path = ?',
    [imagePath],
  );
  return result.affectedRows > 0;
}

async function takeNextWallpaper(category, user) {
  if (category === CUSTOM_BG_CATEGORY) {
    if (!user) return null;
    const pick = await takeNextUserBackground(user.id);
    return pick ? { image_path: pick.image_url, category: CUSTOM_BG_CATEGORY, title: '自选' } : null;
  }
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const sql = category
      ? `SELECT id, image_path, category, title
         FROM wallpapers
         WHERE category = ?
         ORDER BY last_used_at ASC, id ASC
         LIMIT 1
         FOR UPDATE`
      : `SELECT id, image_path, category, title
         FROM wallpapers
         ORDER BY last_used_at ASC, id ASC
         LIMIT 1
         FOR UPDATE`;
    const [rows] = await connection.query(sql, category ? [category] : []);
    if (!rows.length) {
      await connection.rollback();
      return null;
    }
    await connection.query('UPDATE wallpapers SET last_used_at = NOW() WHERE id = ?', [rows[0].id]);
    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function currentUser(request) {
  try {
    return await findUserBySession(readSessionToken(request));
  } catch {
    return null;
  }
}

function userPayload(base, user) {
  const data = {
    ...base,
    uiData: { ...base.uiData },
  };
  if (!user) return data;
  data.uiData = { ...data.uiData, ...user.ui_settings };
  if (user.bg_url) data.uiData.bg_url = user.bg_url;
  data.userData = {
    id: user.id,
    user_type: 1,
    user_name: user.user_name,
    user_headimg: user.user_headimg,
    bg_category: user.bg_category,
    nav_categories: user.nav_categories,
    ...(user.is_admin ? { is_admin: 1 } : {}),
  };
  return data;
}

async function handleBackgroundUpload(request, user) {
  if (!user) return NextResponse.json({ error: '请先微信登录' }, { status: 401 });
  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: '没有收到图片' }, { status: 400 });
  }
  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function' || !file.size) {
    return NextResponse.json({ error: '请选择图片' }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: '单张图片不能超过 8MB' }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = imageKind(buffer);
  if (!kind) return NextResponse.json({ error: '只支持 JPG、PNG、WEBP' }, { status: 400 });
  try {
    const saved = await addUserBackground(user.id, buffer, kind.ext, kind.type);
    return NextResponse.json({ success: 1, ...saved });
  } catch (error) {
    const status = error.status || 500;
    const message = status === 500 ? '上传失败，请稍后再试' : (error.message || '上传失败');
    return NextResponse.json({ error: message }, { status });
  }
}

function stoppedShareResponse() {
  const response = NextResponse.json({
    success: 0,
    error: '分享给您主页的用户已经取消了分享',
    stopped: 1,
  });
  return clearShareCookies(response);
}

async function sharedRotation(request, user, category, options) {
  const share = await wallpaperShare(request, user);
  if (!share) return null;
  if (category && category !== CUSTOM_BG_CATEGORY) return null;
  if (share.stopped) return { stopped: true };
  const pick = await stepSharedWallpaper(share.userId, {
    exclude: options.exclude || '',
    advance: Boolean(options.advance),
    index: request.cookies.get('wa_share_idx')?.value,
  });
  return { pick };
}

async function handle(request, context) {
  const params = context?.params ? await context.params : {};
  const segments = params.path || params.slug || [];
  const key = '/home/' + (Array.isArray(segments) ? segments.join('/') : String(segments));
  if (key === '/home/admin/sites' || key === '/home/admin/wallpapers') {
    return handleAdmin(request, key.endsWith('/wallpapers') ? 'wallpapers' : 'sites');
  }
  const user = await currentUser(request);
  if (key.startsWith('/home/share/')) {
    return handleShare(request, key.slice('/home/share/'.length), user);
  }
  const data = userPayload(payload(), user);

  if (key === '/home/user/clogin' || key === '/home/user/login') {
    const fields = await readFields(request);
    const requested = readCategoryList(fields.categories);
    const categories = requested.length ? requested : (user?.nav_categories || []);
    data.siteData = await listNavSites(0, categories);
    const response = NextResponse.json(data);
    const token = readSessionToken(request);
    if (user && token) response.cookies.set('wa_session', token, sessionCookieOptions());
    return response;
  }
  if (key === '/home/user/logout') {
    await destroySession(readSessionToken(request)).catch(() => {});
    const response = NextResponse.json({ success: 1 });
    response.cookies.set('wa_session', '', { path: '/', maxAge: 0 });
    return response;
  }
  if (key === '/home/user/prefs') {
    if (!user) return NextResponse.json({ success: 0 });
    try {
      await saveUserSettings(user.id, await readFields(request));
    } catch {
      return NextResponse.json({ error: '保存失败，请稍后再试' });
    }
    return NextResponse.json({ success: 1 });
  }
  if (key === '/home/bg/save') {
    if (!user) return NextResponse.json({ success: '登录后可同步壁纸' });
    try {
      const saved = await saveUserSettings(user.id, await readFields(request));
      if (!saved) return NextResponse.json({ error: '壁纸地址无效' });
    } catch {
      return NextResponse.json({ error: '壁纸保存失败' });
    }
    return NextResponse.json({ success: '壁纸保存成功' });
  }
  if (key === '/home/ui/saveui') {
    if (!user) return NextResponse.json({ success: '已在本机生效，登录后可云同步' });
    try {
      await saveUserSettings(user.id, await readFields(request));
    } catch {
      return NextResponse.json({ error: '保存失败，请稍后再试' });
    }
    return NextResponse.json({ success: '保存成功' });
  }
  if (key === '/home/site/getsite') {
    const fields = await readFields(request);
    return NextResponse.json({
      siteData: await listNavSites(0, readCategoryList(fields.categories)),
      uiData: data.uiData,
    });
  }
  if (key === '/home/nav/categories') {
    return NextResponse.json(await listNavCategories());
  }
  if (key === '/home/nav/sites') {
    const fields = await readFields(request);
    const category = safeCategory(fields.category);
    const offset = Math.max(0, Number.parseInt(fields.offset, 10) || 0);
    if (!category) return NextResponse.json([]);
    return NextResponse.json(await listNavCategorySites(category, offset, 30));
  }
  if (key === '/home/bg/categories') {
    return NextResponse.json(await listCategories(user, await wallpaperShare(request, user)));
  }
  if (key === '/home/bg/thumbs') {
    if (!user) return NextResponse.json({ error: '请先微信登录' }, { status: 401 });
    const fields = await readFields(request);
    try {
      return NextResponse.json(await backfillUserThumbnails(user.id, fields.after));
    } catch {
      return NextResponse.json({ error: '缩略图生成失败，请稍后再试' }, { status: 500 });
    }
  }
  if (key === '/home/bg/mine') {
    if (!user) {
      return NextResponse.json({
        logged_in: false,
        images: [],
        total: 0,
        limit: FREE_UPLOAD_LIMIT,
        is_vip: false,
        vip_until: '',
        price_yuan: VIP_PRICE_YUAN,
      });
    }
    const images = await listUserBackgrounds(user.id);
    return NextResponse.json({
      logged_in: true,
      images,
      total: images.length,
      limit: user.upload_limit || FREE_UPLOAD_LIMIT,
      is_vip: Boolean(user.is_vip),
      vip_until: user.vip_until || '',
      price_yuan: VIP_PRICE_YUAN,
    });
  }
  if (key === '/home/vip/create') {
    if (!user) return NextResponse.json({ error: '请先微信登录' }, { status: 401 });
    const fields = await readFields(request);
    if (fields.provider !== 'wechat' && fields.provider !== 'alipay') {
      return NextResponse.json({ error: '请选择微信或支付宝' }, { status: 400 });
    }
    const ready = paymentReady();
    if (fields.provider === 'wechat' && !ready.wechat) {
      return NextResponse.json({ error: '微信支付还没有开通' }, { status: 503 });
    }
    if (fields.provider === 'alipay' && !ready.alipay) {
      return NextResponse.json({ error: '支付宝还没有开通' }, { status: 503 });
    }
    try {
      const order = await createVipOrder(user.id, fields.provider);
      const payment = fields.provider === 'wechat'
        ? await createWechatPayment(order)
        : await createAlipayPayment(order);
      const QRCode = (await import('qrcode')).default;
      const qr = await QRCode.toDataURL(payment.codeUrl, { margin: 1, width: 240 });
      return NextResponse.json({ out_trade_no: order.outTradeNo, qr });
    } catch (error) {
      const status = error.status || 500;
      return NextResponse.json({ error: status === 500 ? '暂时无法发起支付' : error.message }, { status });
    }
  }
  if (key === '/home/vip/status') {
    if (!user) return NextResponse.json({ error: '请先微信登录' }, { status: 401 });
    const fields = await readFields(request);
    const order = await syncVipOrder(user.id, String(fields.out_trade_no || '').slice(0, 32));
    if (!order) return NextResponse.json({ error: '没有找到这笔订单' }, { status: 404 });
    return NextResponse.json(order);
  }
  if (key === '/home/bg/upload') {
    return handleBackgroundUpload(request, user);
  }
  if (key === '/home/bg/crop') {
    if (!user) return NextResponse.json({ error: '请先微信登录' }, { status: 401 });
    const fields = await readFields(request);
    try {
      const saved = await replaceUserBackground(user.id, fields.id, {
        x: fields.x,
        y: fields.y,
        width: fields.width,
        height: fields.height,
      });
      return NextResponse.json({ success: 1, url: saved.url, thumb: saved.thumb });
    } catch (error) {
      const status = error.status || 500;
      const message = status === 500 ? '裁剪失败，请稍后再试' : (error.message || '裁剪失败');
      return NextResponse.json({ error: message }, { status });
    }
  }
  if (key === '/home/bg/remove') {
    if (!user) return NextResponse.json({ error: '请先微信登录' }, { status: 401 });
    const fields = await readFields(request);
    try {
      const removed = await removeUserBackground(user.id, fields.id);
      if (!removed) return NextResponse.json({ error: '没有找到这张背景图' }, { status: 404 });
    } catch {
      return NextResponse.json({ error: '删除失败，请稍后再试' }, { status: 500 });
    }
    return NextResponse.json({ success: 1 });
  }
  if (key === '/home/bg/ajaxbg') {
    const fields = await readFields(request);
    const category = safeCategory(fields.category);
    const offset = Math.max(0, Number.parseInt(fields.offset, 10) || 0);
    if (!category) return NextResponse.json([]);
    return NextResponse.json(await listThumbs(category, offset, user, await wallpaperShare(request, user)));
  }
  if (key === '/home/bg/peek') {
    const fields = await readFields(request);
    const category = safeCategory(fields.category);
    const exclude = safeImagePath(fields.exclude);
    const shared = await sharedRotation(request, user, category, { exclude, advance: false });
    if (shared?.stopped) return stoppedShareResponse();
    if (shared) {
      if (!shared.pick) return NextResponse.json({ success: 0 });
      return NextResponse.json({
        success: 1,
        bg_url: shared.pick.url,
        category: CUSTOM_BG_CATEGORY,
        title: '分享',
      });
    }
    const pick = await peekNextWallpaper(category, exclude, user);
    if (!pick) return NextResponse.json({ success: 0 });
    return NextResponse.json({
      success: 1,
      bg_url: pick.image_path,
      category: pick.category,
      title: pick.title,
    });
  }
  if (key === '/home/bg/use') {
    const fields = await readFields(request);
    const imagePath = safeImagePath(fields.image_path);
    if (!imagePath) return NextResponse.json({ success: 0 });
    const used = await markWallpaperUsed(imagePath, user);
    return NextResponse.json({ success: used ? 1 : 0 });
  }
  if (key === '/home/bg/randbg') {
    const fields = await readFields(request);
    const category = safeCategory(fields.category);
    const shared = await sharedRotation(request, user, category, { advance: true });
    if (shared?.stopped) return stoppedShareResponse();
    if (shared) {
      if (!shared.pick) return NextResponse.json({ success: 0, error: '分享的主页还没有背景图' });
      const response = NextResponse.json({
        success: 1,
        bg_url: shared.pick.url,
        category: CUSTOM_BG_CATEGORY,
        title: '分享',
      });
      response.cookies.set('wa_share_idx', String(shared.pick.index), shareIndexCookieOptions());
      return response;
    }
    if (category === CUSTOM_BG_CATEGORY && !user) {
      return NextResponse.json({ success: 0, error: '请先微信登录', login: 1 });
    }
    const pick = await takeNextWallpaper(category, user);
    if (!pick) {
      if (category === CUSTOM_BG_CATEGORY) {
        return NextResponse.json({ success: 0, error: '还没有自选背景图，请先上传' });
      }
      return NextResponse.json({ success: 0, bg_url: data.uiData.bg_url });
    }
    return NextResponse.json({
      success: 1,
      bg_url: pick.image_path,
      category: pick.category,
      title: pick.title,
    });
  }
  if (key === '/home/ui/getDefaultUi') {
    return NextResponse.json(data.uiData);
  }
  if (key === '/home/engine/getnews') {
    return NextResponse.json(['搜你想搜的', '哇塔主页', '今日热搜']);
  }
  if (key.startsWith('/home/')) {
    return NextResponse.json({ success: '本地预览模式，修改不会写回服务器' });
  }
  return NextResponse.json({ error: 'not found', params }, { status: 404 });
}

export function GET(request, context) {
  return handle(request, context);
}

export function POST(request, context) {
  return handle(request, context);
}
