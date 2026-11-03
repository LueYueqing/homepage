import crypto from 'crypto';
import { getPool } from './db';
import {
  backgroundOwnerId,
  deleteObject,
  isUserBackgroundUrl,
  ossConfig,
  putObject,
} from './oss';
import { ensureVipSchema, uploadLimitFor } from './vip';

export const MAX_USER_BACKGROUNDS = 20;
export const CUSTOM_BG_CATEGORY = 'custom';
const MAX_BYTES = 8 * 1024 * 1024;

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
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_used_at DATETIME NOT NULL DEFAULT '2000-01-01 00:00:00',
          PRIMARY KEY (id),
          UNIQUE KEY uniq_object_key (object_key),
          KEY idx_user_used (user_id, last_used_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
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
    `SELECT id, image_url, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
     FROM user_backgrounds
     WHERE user_id = ?
     ORDER BY id DESC`,
    [userId],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    url: row.image_url,
    created_at: row.created_at,
  }));
}

export async function listUserBackgroundThumbs(userId, offset) {
  await ensureBackgroundTable();
  const pool = getPool();
  const start = Math.max(0, Number.parseInt(offset, 10) || 0);
  const [rows] = await pool.query(
    `SELECT image_url
     FROM user_backgrounds
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT 15 OFFSET ?`,
    [userId, start],
  );
  return rows.map((row) => row.image_url);
}

export async function addUserBackground(userId, buffer, ext, contentType) {
  if (!ossConfig().ready) throw httpError('上传服务还没有配置', 503);
  await ensureBackgroundTable();
  await ensureVipSchema();
  const pool = getPool();
  const connection = await pool.getConnection();
  let key = '';
  let uploaded = false;
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
    await connection.query(
      'INSERT INTO user_backgrounds (user_id, object_key, image_url) VALUES (?, ?, ?)',
      [userId, key, url],
    );
    await connection.commit();
    return { url, total: total + 1, limit };
  } catch (error) {
    try { await connection.rollback(); } catch { /* 事务可能已经结束 */ }
    if (uploaded && key) await deleteObject(key).catch(() => {});
    if (error.status) throw error;
    throw httpError('上传失败，请稍后再试', 500);
  } finally {
    connection.release();
  }
}

export async function removeUserBackground(userId, id) {
  await ensureBackgroundTable();
  const backgroundId = Number.parseInt(id, 10);
  if (!backgroundId) return false;
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT object_key FROM user_backgrounds WHERE id = ? AND user_id = ? LIMIT 1',
    [backgroundId, userId],
  );
  if (!rows.length) return false;
  await deleteObject(rows[0].object_key);
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
