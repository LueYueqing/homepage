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
    siteData: readJson('siteData.json'),
    engineData: readJson('engineData.json'),
    uiData: readJson('uiData.json'),
  };
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
    return NextResponse.json(data);
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
