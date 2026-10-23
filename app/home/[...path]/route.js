import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';

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

async function listNavSites(userId = 0) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT title, url, logo, category, category_note,
            DATE_FORMAT(link_updated_at, '%Y-%m-%d %H:%i:%s') AS link_updated_at,
            DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
     FROM nav_sites
     WHERE (user_id = ? OR user_id IS NULL) AND is_enabled = 1
     ORDER BY sort_order ASC, id ASC`,
    [userId],
  );
  return rows.map((row, index) => ({
    sort: index,
    title: row.title,
    url: row.url,
    icon: row.logo,
    category: row.category,
    category_note: row.category_note,
    link_updated_at: row.link_updated_at,
    updated_at: row.updated_at,
  }));
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

async function listCategories() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT category, category_note, COUNT(*) AS total
     FROM wallpapers
     GROUP BY category, category_note`,
  );
  return rows
    .map((row) => ({
      category: row.category,
      category_note: row.category_note,
      total: Number(row.total),
    }))
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
}

async function listThumbs(category, offset) {
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
  if (!/^\/uploads\/bg\/[a-z0-9-]+\/[a-z0-9-]+\.jpg$/.test(imagePath)) return '';
  return imagePath;
}

async function peekNextWallpaper(category, exclude) {
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
  return peekNextWallpaper(category, '');
}

async function markWallpaperUsed(imagePath) {
  const pool = getPool();
  const [result] = await pool.query(
    'UPDATE wallpapers SET last_used_at = NOW() WHERE image_path = ?',
    [imagePath],
  );
  return result.affectedRows > 0;
}

async function takeNextWallpaper(category) {
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

async function handle(request, context) {
  const params = context?.params ? await context.params : {};
  const segments = params.path || params.slug || [];
  const key = '/home/' + (Array.isArray(segments) ? segments.join('/') : String(segments));
  const data = payload();

  if (key === '/home/user/clogin' || key === '/home/user/login') {
    data.siteData = await listNavSites(0);
    return NextResponse.json(data);
  }
  if (key === '/home/site/getsite') {
    return NextResponse.json({
      siteData: await listNavSites(0),
      uiData: data.uiData,
    });
  }
  if (key === '/home/bg/categories') {
    return NextResponse.json(await listCategories());
  }
  if (key === '/home/bg/ajaxbg') {
    const fields = await readFields(request);
    const category = safeCategory(fields.category);
    const offset = Math.max(0, Number.parseInt(fields.offset, 10) || 0);
    if (!category) return NextResponse.json([]);
    return NextResponse.json(await listThumbs(category, offset));
  }
  if (key === '/home/bg/peek') {
    const fields = await readFields(request);
    const category = safeCategory(fields.category);
    const exclude = safeImagePath(fields.exclude);
    const pick = await peekNextWallpaper(category, exclude);
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
    const used = await markWallpaperUsed(imagePath);
    return NextResponse.json({ success: used ? 1 : 0 });
  }
  if (key === '/home/bg/randbg') {
    const fields = await readFields(request);
    const category = safeCategory(fields.category);
    const pick = await takeNextWallpaper(category);
    if (!pick) {
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
    return NextResponse.json(['搜你想搜的', '简法主页', '今日热搜']);
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
