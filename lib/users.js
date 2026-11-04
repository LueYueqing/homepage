import crypto from 'crypto';
import { getPool } from './db';
import { backgroundOwnerId, isLibraryWallpaperUrl, isUserBackgroundUrl } from './oss';
import { ensureVipSchema, formatVipDate, isVipUntil, uploadLimitFor } from './vip';

const SESSION_COOKIE = 'wa_session';
const SESSION_DAYS = 30;

const UI_KEYS = [
  'search_opacity', 'search_width', 'search_height', 'search_radius', 'search_open',
  'search_keyword', 'search_hotword', 'search_empty', 'site_width', 'site_opacity',
  'site_radius', 'siteli_size', 'site_row', 'site_column', 'site_titleshow', 'site_open',
  'site_allhide', 'main_width', 'mask_opacity', 'bg_blur', 'search_spacing', 'bg_url',
];

let tablesReady;
let adminReady;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function newSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export function readSessionToken(request) {
  return request.cookies?.get(SESSION_COOKIE)?.value || '';
}

export { SESSION_COOKIE };

export async function ensureUserTables() {
  if (!tablesReady) {
    tablesReady = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          wechat_openid VARCHAR(64) NOT NULL,
          wechat_unionid VARCHAR(64) NULL,
          nickname VARCHAR(64) NOT NULL DEFAULT '',
          avatar_url VARCHAR(512) NOT NULL DEFAULT '',
          bg_url VARCHAR(512) NOT NULL DEFAULT '',
          bg_category VARCHAR(32) NOT NULL DEFAULT '',
          nav_categories JSON NULL,
          ui_settings JSON NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          vip_until DATETIME NULL,
          is_admin TINYINT NOT NULL DEFAULT 0,
          last_login_at DATETIME NULL,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_wechat_openid (wechat_openid),
          KEY idx_wechat_unionid (wechat_unionid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await ensureVipSchema();
      const [adminCols] = await pool.query("SHOW COLUMNS FROM users LIKE 'is_admin'");
      if (!adminCols.length) {
        await pool.query('ALTER TABLE users ADD COLUMN is_admin TINYINT NOT NULL DEFAULT 0');
      }
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          token_hash CHAR(64) NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_token_hash (token_hash),
          KEY idx_user_id (user_id),
          KEY idx_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    })().catch((error) => {
      tablesReady = null;
      throw error;
    });
  }
  return tablesReady;
}

export async function ensureAdminUser() {
  await ensureUserTables();
  if (adminReady) return;
  const pool = getPool();
  const [admins] = await pool.query('SELECT id FROM users WHERE is_admin = 1 LIMIT 1');
  if (admins.length) {
    adminReady = true;
    return;
  }
  const [first] = await pool.query('SELECT id FROM users ORDER BY id ASC LIMIT 1');
  if (!first.length) return;
  const [result] = await pool.query('UPDATE users SET is_admin = 1 WHERE id = ?', [first[0].id]);
  if (result.affectedRows) adminReady = true;
}

function asList(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string' && value) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function publicUser(row) {
  return {
    id: Number(row.id),
    user_type: 1,
    user_name: row.nickname || '微信用户',
    user_headimg: row.avatar_url || '/static/home/images/console/userhead.svg',
    bg_url: row.bg_url || '',
    bg_category: row.bg_category || '',
    nav_categories: asList(row.nav_categories).filter((item) => /^[a-z0-9-]{1,32}$/.test(String(item))),
    ui_settings: asObject(row.ui_settings),
    is_vip: isVipUntil(row.vip_until),
    vip_until: formatVipDate(row.vip_until),
    upload_limit: uploadLimitFor(row.vip_until),
    is_admin: Number(row.is_admin) === 1,
  };
}

export async function findUserBySession(token) {
  if (!token) return null;
  await ensureAdminUser();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT u.*
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > NOW()
     LIMIT 1`,
    [hashToken(token)],
  );
  return rows[0] ? publicUser(rows[0]) : null;
}

export async function upsertWechatUser(profile) {
  await ensureUserTables();
  const pool = getPool();
  const openid = String(profile.openid || '').slice(0, 64);
  if (!openid) throw new Error('微信没有返回 openid');
  const unionid = profile.unionid ? String(profile.unionid).slice(0, 64) : null;
  const nickname = String(profile.nickname || '微信用户').replace(/[\u0000-\u001f]/g, '').slice(0, 64);
  const avatar = String(profile.headimgurl || '').slice(0, 512);
  await pool.query(
    `INSERT INTO users (wechat_openid, wechat_unionid, nickname, avatar_url, last_login_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       wechat_unionid = VALUES(wechat_unionid),
       nickname = VALUES(nickname),
       avatar_url = VALUES(avatar_url),
       last_login_at = NOW()`,
    [openid, unionid, nickname, avatar],
  );
  await ensureAdminUser();
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE wechat_openid = ? LIMIT 1',
    [openid],
  );
  return publicUser(rows[0]);
}

export async function createSession(userId) {
  await ensureUserTables();
  const token = newSessionToken();
  const pool = getPool();
  await pool.query(
    'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
    [userId, hashToken(token), SESSION_DAYS],
  );
  return token;
}

export async function destroySession(token) {
  if (!token) return;
  await ensureUserTables();
  const pool = getPool();
  await pool.query('DELETE FROM user_sessions WHERE token_hash = ?', [hashToken(token)]);
}

export function sanitizeCategory(value) {
  const category = String(value || '').trim();
  return /^[a-z0-9-]{1,32}$/.test(category) ? category : '';
}

export function sanitizeNavCategories(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(',');
  let list = source;
  if (!Array.isArray(value) && value) {
    try {
      const parsed = JSON.parse(String(value));
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      /* 逗号分隔 */
    }
  }
  return [...new Set(list.map((item) => sanitizeCategory(item)).filter(Boolean))].slice(0, 16);
}

export function sanitizeWallpaper(value) {
  const imagePath = String(value || '').trim();
  if (/^\/uploads\/bg\/[a-z0-9-]+\/[a-z0-9-]+\.jpg$/.test(imagePath)) return imagePath;
  if (/^\/static\/home\/images\/[a-z0-9._-]+$/i.test(imagePath)) return imagePath;
  if (isUserBackgroundUrl(imagePath)) return imagePath.split('?')[0];
  if (isLibraryWallpaperUrl(imagePath)) return imagePath.split('?')[0];
  return '';
}

export function pickUiSettings(fields) {
  const settings = {};
  for (const key of UI_KEYS) {
    if (fields[key] == null || fields[key] === '') continue;
    const value = String(fields[key]).slice(0, 512);
    if (key === 'bg_url') {
      const wallpaper = sanitizeWallpaper(value);
      if (wallpaper) settings.bg_url = wallpaper;
      continue;
    }
    settings[key] = value;
  }
  return settings;
}

export async function saveUserSettings(userId, fields) {
  await ensureUserTables();
  const pool = getPool();
  const ui = pickUiSettings(fields);
  if (Object.prototype.hasOwnProperty.call(fields, 'bg')) {
    const wallpaper = sanitizeWallpaper(fields.bg);
    if (!wallpaper) return false;
    const owner = backgroundOwnerId(wallpaper);
    if (owner && owner !== Number(userId)) return false;
    ui.bg_url = wallpaper;
  }
  const sets = [];
  const params = [];
  if (Object.keys(ui).length) {
    const [rows] = await pool.query('SELECT ui_settings FROM users WHERE id = ? LIMIT 1', [userId]);
    const merged = { ...asObject(rows[0] && rows[0].ui_settings), ...ui };
    sets.push('ui_settings = CAST(? AS JSON)');
    params.push(JSON.stringify(merged));
    if (ui.bg_url) {
      sets.push('bg_url = ?');
      params.push(ui.bg_url);
    }
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'bg_category')) {
    sets.push('bg_category = ?');
    params.push(sanitizeCategory(fields.bg_category));
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'nav_categories')) {
    sets.push('nav_categories = CAST(? AS JSON)');
    params.push(JSON.stringify(sanitizeNavCategories(fields.nav_categories)));
  }
  if (!sets.length) return true;
  params.push(userId);
  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
  return true;
}
