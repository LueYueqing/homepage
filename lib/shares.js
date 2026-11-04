import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { countUserBackgrounds, ensureBackgroundTable } from './backgrounds';
import { getPool } from './db';

const TOKEN_RE = /^[a-f0-9]{32}$/;
const SHARE_MAX_AGE = 365 * 24 * 60 * 60;

let tableReady;

function ensureShareTable() {
  if (!tableReady) {
    tableReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS homepage_shares (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        token CHAR(32) NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'active',
        open_count INT UNSIGNED NOT NULL DEFAULT 0,
        last_opened_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        stopped_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_share_token (token),
        KEY idx_share_user (user_id, status, id)
      )
    `).catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  return tableReady;
}

function displayName(value) {
  const name = String(value || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 32);
  return name || '微信用户';
}

function shareCookieOptions(httpOnly) {
  return {
    httpOnly,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SHARE_MAX_AGE,
  };
}

export function shareIndexCookieOptions() {
  return shareCookieOptions(true);
}

export function clearShareCookies(response) {
  const gone = { path: '/', maxAge: 0 };
  response.cookies.set('wa_share', '', { ...gone, httpOnly: true });
  response.cookies.set('wa_share_idx', '', { ...gone, httpOnly: true });
  response.cookies.set('wa_shared', '', { ...gone, httpOnly: false });
  return response;
}

function publicOrigin(request) {
  const forwarded = request.headers.get('x-forwarded-host');
  const host = (forwarded ? forwarded.split(',')[0] : new URL(request.url).host).trim();
  const proto = (request.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim() || 'https';
  return `${proto}://${host}`;
}

function presentShare(row, origin) {
  return {
    id: Number(row.id),
    token: row.token,
    url: `${origin}/?share=${row.token}`,
    status: row.status,
    open_count: Number(row.open_count) || 0,
    last_opened_at: row.last_opened_at || '',
    created_at: row.created_at || '',
  };
}

const SHARE_FIELDS = `id, token, status, open_count,
  DATE_FORMAT(last_opened_at, '%Y-%m-%d %H:%i:%s') AS last_opened_at,
  DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at`;

async function readBody(request) {
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
  } catch {
    return {};
  }
  return {};
}

async function findShare(token) {
  await ensureShareTable();
  const [rows] = await getPool().query(
    `SELECT homepage_shares.id, homepage_shares.user_id, homepage_shares.status, homepage_shares.token,
            users.nickname
     FROM homepage_shares
     JOIN users ON users.id = homepage_shares.user_id
     WHERE homepage_shares.token = ?
     LIMIT 1`,
    [token],
  );
  return rows[0] || null;
}

export async function wallpaperShare(request, user) {
  if (user) return null;
  const token = String(request.cookies.get('wa_share')?.value || '').toLowerCase();
  if (!TOKEN_RE.test(token)) return null;
  const row = await findShare(token);
  if (!row) return null;
  if (row.status !== 'active') return { stopped: true };
  return { userId: Number(row.user_id), name: displayName(row.nickname) };
}

export async function stepSharedWallpaper(userId, { exclude = '', advance = false, index = '' } = {}) {
  await ensureShareTable();
  await ensureBackgroundTable();
  const [rows] = await getPool().query(
    `SELECT image_url, thumb_url
     FROM user_backgrounds
     WHERE user_id = ?
     ORDER BY id ASC`,
    [userId],
  );
  const images = rows
    .map((row) => ({ url: row.image_url, thumb: row.thumb_url || '' }))
    .filter((row) => row.url);
  if (!images.length) return null;
  const parsed = Number.parseInt(index, 10);
  const hasIndex = index !== undefined && index !== null && String(index) !== '' && Number.isInteger(parsed);
  let next = 0;
  if (exclude) {
    const found = images.findIndex((item) => item.url === exclude);
    next = found >= 0 ? (found + 1) % images.length : 0;
  } else if (advance && hasIndex) {
    next = (parsed + 1) % images.length;
  } else if (hasIndex) {
    next = ((parsed % images.length) + images.length) % images.length;
  }
  return { url: images[next].url, thumb: images[next].thumb, index: next };
}

async function loadShareRow(id) {
  const [rows] = await getPool().query(
    `SELECT ${SHARE_FIELDS} FROM homepage_shares WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

export async function handleShare(request, action, user) {
  try {
    if (action === 'visit') return await visitShare(request, user);
    if (action === 'leave') {
      const response = NextResponse.json({ success: 1 });
      clearShareCookies(response);
      return response;
    }
    if (!user) return NextResponse.json({ error: '请先微信登录', login: 1 }, { status: 401 });
    if (action === 'mine') {
      await ensureShareTable();
      const [rows] = await getPool().query(
        `SELECT ${SHARE_FIELDS}
         FROM homepage_shares
         WHERE user_id = ?
         ORDER BY id DESC
         LIMIT 50`,
        [user.id],
      );
      const origin = publicOrigin(request);
      return NextResponse.json({ shares: rows.map((row) => presentShare(row, origin)) });
    }
    if (action === 'create') return await createShare(request, user);
    if (action === 'stop') return await stopShare(request, user);
  } catch {
    return NextResponse.json({ error: '分享暂时不可用，请稍后再试' }, { status: 500 });
  }
  return NextResponse.json({ error: 'not found' }, { status: 404 });
}

async function createShare(request, user) {
  await ensureShareTable();
  const total = await countUserBackgrounds(user.id);
  if (!total) {
    return NextResponse.json({ error: '您没有上传任何壁纸，无法创建分享。' }, { status: 400 });
  }
  const body = await readBody(request);
  const origin = publicOrigin(request);
  if (String(body.reuse || '') === '1') {
    const [rows] = await getPool().query(
      `SELECT ${SHARE_FIELDS}
       FROM homepage_shares
       WHERE user_id = ? AND status = 'active'
       ORDER BY id DESC
       LIMIT 1`,
      [user.id],
    );
    if (rows[0]) {
      return NextResponse.json({ ...presentShare(rows[0], origin), reused: true });
    }
  }
  const token = crypto.randomBytes(16).toString('hex');
  const [result] = await getPool().query(
    'INSERT INTO homepage_shares (user_id, token) VALUES (?, ?)',
    [user.id, token],
  );
  const row = await loadShareRow(result.insertId);
  return NextResponse.json({ ...presentShare(row, origin), reused: false });
}

async function stopShare(request, user) {
  await ensureShareTable();
  const body = await readBody(request);
  const id = Number.parseInt(body.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: '没有找到这个分享' }, { status: 404 });
  }
  const [result] = await getPool().query(
    `UPDATE homepage_shares
     SET status = 'stopped', stopped_at = NOW()
     WHERE id = ? AND user_id = ? AND status = 'active'`,
    [id, user.id],
  );
  if (!result.affectedRows) {
    return NextResponse.json({ error: '没有找到这个分享' }, { status: 404 });
  }
  return NextResponse.json({ success: 1 });
}

async function visitShare(request, user) {
  const body = await readBody(request);
  const fromLink = TOKEN_RE.test(String(body.token || '').toLowerCase())
    ? String(body.token).toLowerCase()
    : '';
  const cookieToken = String(request.cookies.get('wa_share')?.value || '').toLowerCase();
  const fromCookie = TOKEN_RE.test(cookieToken) ? cookieToken : '';
  const token = fromLink || fromCookie;
  if (!token) return NextResponse.json({ status: 'missing' });
  const row = await findShare(token);
  if (!row || row.status !== 'active') {
    const response = NextResponse.json({ status: row ? 'stopped' : 'missing' });
    clearShareCookies(response);
    return response;
  }
  const count = String(body.count || '') === '1'
    && fromLink
    && (!user || Number(user.id) !== Number(row.user_id));
  if (count) {
    await getPool().query(
      `UPDATE homepage_shares
       SET open_count = open_count + 1, last_opened_at = NOW()
       WHERE id = ? AND status = 'active'`,
      [row.id],
    );
  }
  const response = NextResponse.json({
    status: 'active',
    name: displayName(row.nickname),
  });
  response.cookies.set('wa_share', token, shareCookieOptions(true));
  response.cookies.set('wa_shared', '1', shareCookieOptions(false));
  if (fromLink) response.cookies.set('wa_share_idx', '', { path: '/', maxAge: 0 });
  return response;
}
