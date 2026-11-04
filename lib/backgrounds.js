import crypto from 'crypto';
import sharp from 'sharp';
import { getPool } from './db';
import {
  backgroundOwnerId,
  deleteObject,
  isUserBackgroundUrl,
  ossConfig,
  putObject,
  userBackgroundKey,
} from './oss';
import { ensureVipSchema, uploadLimitFor } from './vip';

export const MAX_USER_BACKGROUNDS = 20;
export const CUSTOM_BG_CATEGORY = 'custom';
const MAX_BYTES = 8 * 1024 * 1024;
const THUMB_EDGE = 640;

let tableReady;

export async function ensureBackgroundTable() {
  if (!tableReady) {
    tableReady = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_backgrounds (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          object_key VARCHAR(255) NOT NULL,
          image_url VARCHAR(512) NOT NULL,
          thumb_url VARCHAR(512) NOT NULL DEFAULT '',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_used_at DATETIME NOT NULL DEFAULT '2000-01-01 00:00:00',
          PRIMARY KEY (id),
          UNIQUE KEY uniq_object_key (object_key),
          KEY idx_user_used (user_id, last_used_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      const [cols] = await pool.query("SHOW COLUMNS FROM user_backgrounds LIKE 'thumb_url'");
      if (!cols.length) {
        await pool.query("ALTER TABLE user_backgrounds ADD COLUMN thumb_url VARCHAR(512) NOT NULL DEFAULT '' AFTER image_url");
      }
    })().catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  return tableReady;
}

export function imageKind(buffer) {
  if (!buffer || buffer.length < 12 || buffer.length > MAX_BYTES) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', type: 'image/jpeg' };
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { ext: 'png', type: 'image/png' };
  }
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') {
    return { ext: 'webp', type: 'image/webp' };
  }
  return null;
}

async function storeThumbnail(userId, buffer) {
  const body = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const key = `whatab/${userId}/${crypto.randomBytes(8).toString('hex')}.webp`;
  const url = await putObject(key, body, 'image/webp');
  if (backgroundOwnerId(url) !== Number(userId)) {
    await deleteObject(key).catch(() => {});
    throw httpError('上传失败，请稍后再试', 500);
  }
  return { key, url };
}

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function countUserBackgrounds(userId) {
  await ensureBackgroundTable();
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM user_backgrounds WHERE user_id = ?',
    [userId],
  );
  return Number(rows[0].total || 0);
}

export async function listUserBackgrounds(userId) {
  await ensureBackgroundTable();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, image_url, thumb_url, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
     FROM user_backgrounds
     WHERE user_id = ?
     ORDER BY id DESC`,
    [userId],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    url: row.image_url,
    thumb: row.thumb_url || row.image_url,
    created_at: row.created_at,
  }));
}

export async function listUserBackgroundThumbs(userId, offset) {
  await ensureBackgroundTable();
  const pool = getPool();
  const start = Math.max(0, Number.parseInt(offset, 10) || 0);
  const [rows] = await pool.query(
    `SELECT image_url, thumb_url
     FROM user_backgrounds
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT 15 OFFSET ?`,
    [userId, start],
  );
  return rows.map((row) => ({
    url: row.image_url,
    thumb: row.thumb_url || row.image_url,
  }));
}

export async function addUserBackground(userId, buffer, ext, contentType) {
  if (!ossConfig().ready) throw httpError('上传服务还没有配置', 503);
  await ensureBackgroundTable();
  await ensureVipSchema();
  const pool = getPool();
  const connection = await pool.getConnection();
  let key = '';
  let thumbKey = '';
  let uploaded = false;
  let thumbUploaded = false;
  try {
    await connection.beginTransaction();
    const [locked] = await connection.query(
      'SELECT vip_until FROM users WHERE id = ? FOR UPDATE',
      [userId],
    );
    const limit = uploadLimitFor(locked[0]?.vip_until);
    const [counts] = await connection.query(
      'SELECT COUNT(*) AS total FROM user_backgrounds WHERE user_id = ?',
      [userId],
    );
    const total = Number(counts[0].total || 0);
    if (total >= limit) {
      await connection.rollback();
      throw httpError(`最多上传 ${limit} 张背景图`, 400);
    }
    key = `whatab/${userId}/${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const url = await putObject(key, buffer, contentType);
    uploaded = true;
    if (backgroundOwnerId(url) !== Number(userId)) {
      throw httpError('上传失败，请稍后再试', 500);
    }
    const thumb = await storeThumbnail(userId, buffer);
    thumbKey = thumb.key;
    thumbUploaded = true;
    await connection.query(
      'INSERT INTO user_backgrounds (user_id, object_key, image_url, thumb_url) VALUES (?, ?, ?, ?)',
      [userId, key, url, thumb.url],
    );
    await connection.commit();
    return { url, thumb: thumb.url, total: total + 1, limit };
  } catch (error) {
    try { await connection.rollback(); } catch { /* 事务可能已经结束 */ }
    if (thumbUploaded && thumbKey) await deleteObject(thumbKey).catch(() => {});
    if (uploaded && key) await deleteObject(key).catch(() => {});
    if (error.status) throw error;
    throw httpError('上传失败，请稍后再试', 500);
  } finally {
    connection.release();
  }
}

function clampCrop(width, height, crop) {
  const imageWidth = Number(width);
  const imageHeight = Number(height);
  let cropWidth = Math.round(Number(crop.width));
  let cropHeight = Math.round(Number(crop.height));
  let left = Math.round(Number(crop.x));
  let top = Math.round(Number(crop.y));
  if (![imageWidth, imageHeight, cropWidth, cropHeight, left, top].every((value) => Number.isFinite(value) && value >= 0)) {
    throw httpError('裁剪位置不正确', 400);
  }
  if (cropWidth < 1 || cropHeight < 1) throw httpError('裁剪位置不正确', 400);
  cropWidth = Math.min(cropWidth, imageWidth);
  cropHeight = Math.min(cropHeight, imageHeight);
  left = Math.min(Math.max(0, left), imageWidth - cropWidth);
  top = Math.min(Math.max(0, top), imageHeight - cropHeight);
  return { left, top, width: cropWidth, height: cropHeight };
}

async function encodeCrop(buffer, rect, kind) {
  const base = () => sharp(buffer).extract(rect);
  let ext = kind.ext;
  let type = kind.type;
  let output;
  if (ext === 'png') output = await base().png().toBuffer();
  else if (ext === 'webp') output = await base().webp({ quality: 86 }).toBuffer();
  else output = await base().jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  if (output.length > MAX_BYTES) {
    output = await base().jpeg({ quality: 78, mozjpeg: true }).toBuffer();
    ext = 'jpg';
    type = 'image/jpeg';
  }
  if (output.length > MAX_BYTES) throw httpError('裁剪后的图片仍然超过 8MB', 400);
  return { output, ext, type };
}

async function rewriteSavedWallpaper(userId, oldUrl, nextUrl) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT bg_url, ui_settings FROM users WHERE id = ? LIMIT 1',
    [userId],
  );
  if (!rows.length || oldUrl === nextUrl) return;
  let settings = rows[0].ui_settings;
  if (typeof settings === 'string') {
    try { settings = JSON.parse(settings); } catch { settings = {}; }
  }
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) settings = {};
  const sets = [];
  const params = [];
  if (rows[0].bg_url === oldUrl) {
    sets.push('bg_url = ?');
    params.push(nextUrl);
  }
  if (settings.bg_url === oldUrl) {
    settings.bg_url = nextUrl;
    sets.push('ui_settings = CAST(? AS JSON)');
    params.push(JSON.stringify(settings));
  }
  if (!sets.length) return;
  params.push(userId);
  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function replaceUserBackground(userId, id, crop) {
  if (!ossConfig().ready) throw httpError('上传服务还没有配置', 503);
  await ensureBackgroundTable();
  const backgroundId = Number.parseInt(id, 10);
  if (!backgroundId) throw httpError('没有找到这张背景图', 404);
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT object_key, image_url, thumb_url FROM user_backgrounds WHERE id = ? AND user_id = ? LIMIT 1',
    [backgroundId, userId],
  );
  if (!rows.length) throw httpError('没有找到这张背景图', 404);
  const response = await fetch(rows[0].image_url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw httpError('读取原图失败，请稍后再试', 502);
  const source = Buffer.from(await response.arrayBuffer());
  const kind = imageKind(source);
  if (!kind) throw httpError('只支持 JPG、PNG、WEBP', 400);
  const oriented = await sharp(source, { failOn: 'none' }).rotate().toBuffer();
  const meta = await sharp(oriented).metadata();
  const rect = clampCrop(meta.width, meta.height, crop);
  const { output, ext, type } = await encodeCrop(oriented, rect, kind);
  const key = `whatab/${userId}/${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const url = await putObject(key, output, type);
  if (backgroundOwnerId(url) !== Number(userId)) {
    await deleteObject(key).catch(() => {});
    throw httpError('裁剪失败，请稍后再试', 500);
  }
  let thumbKey = '';
  try {
    const thumb = await storeThumbnail(userId, output);
    thumbKey = thumb.key;
    await pool.query(
      'UPDATE user_backgrounds SET object_key = ?, image_url = ?, thumb_url = ? WHERE id = ? AND user_id = ?',
      [key, url, thumb.url, backgroundId, userId],
    );
    await rewriteSavedWallpaper(userId, rows[0].image_url, url);
    await deleteObject(rows[0].object_key).catch(() => {});
    const oldThumb = userBackgroundKey(rows[0].thumb_url);
    if (oldThumb) await deleteObject(oldThumb).catch(() => {});
    return { url, thumb: thumb.url };
  } catch (error) {
    await deleteObject(key).catch(() => {});
    if (thumbKey) await deleteObject(thumbKey).catch(() => {});
    throw error.status ? error : httpError('裁剪失败，请稍后再试', 500);
  }
}

export async function removeUserBackground(userId, id) {
  await ensureBackgroundTable();
  const backgroundId = Number.parseInt(id, 10);
  if (!backgroundId) return false;
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT object_key, thumb_url FROM user_backgrounds WHERE id = ? AND user_id = ? LIMIT 1',
    [backgroundId, userId],
  );
  if (!rows.length) return false;
  await deleteObject(rows[0].object_key);
  const thumbKey = userBackgroundKey(rows[0].thumb_url);
  if (thumbKey) await deleteObject(thumbKey).catch(() => {});
  await pool.query('DELETE FROM user_backgrounds WHERE id = ? AND user_id = ?', [backgroundId, userId]);
  return true;
}

export async function takeNextUserBackground(userId) {
  await ensureBackgroundTable();
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT id, image_url
       FROM user_backgrounds
       WHERE user_id = ?
       ORDER BY last_used_at ASC, id ASC
       LIMIT 1
       FOR UPDATE`,
      [userId],
    );
    if (!rows.length) {
      await connection.rollback();
      return null;
    }
    await connection.query('UPDATE user_backgrounds SET last_used_at = NOW() WHERE id = ?', [rows[0].id]);
    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function peekUserBackground(userId, exclude) {
  await ensureBackgroundTable();
  const pool = getPool();
  const filters = ['user_id = ?'];
  const params = [userId];
  if (exclude && isUserBackgroundUrl(exclude)) {
    filters.push('image_url <> ?');
    params.push(exclude);
  }
  const [rows] = await pool.query(
    `SELECT image_url
     FROM user_backgrounds
     WHERE ${filters.join(' AND ')}
     ORDER BY last_used_at ASC, id ASC
     LIMIT 1`,
    params,
  );
  if (rows.length || !exclude) return rows[0] || null;
  return peekUserBackground(userId, '');
}

export async function markUserBackgroundUsed(userId, url) {
  if (!isUserBackgroundUrl(url) || backgroundOwnerId(url) !== Number(userId)) return false;
  await ensureBackgroundTable();
  const pool = getPool();
  const [result] = await pool.query(
    'UPDATE user_backgrounds SET last_used_at = NOW() WHERE user_id = ? AND image_url = ?',
    [userId, url],
  );
  return result.affectedRows > 0;
}
