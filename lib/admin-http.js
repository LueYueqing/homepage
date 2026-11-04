import { NextResponse } from 'next/server';
import {
  addWallpaper,
  listSites,
  listWallpapers,
  removeSite,
  removeWallpaper,
  requireAdmin,
  saveSite,
  updateWallpaper,
} from './admin';

function json(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

async function readBody(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('multipart')) {
    const form = await request.formData();
    const file = form.get('file');
    const fields = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') fields[key] = value;
    }
    if (file && typeof file.arrayBuffer === 'function' && file.size) {
      if (file.size > 8 * 1024 * 1024) {
        const error = new Error('单张图片不能超过 8MB');
        error.status = 400;
        throw error;
      }
      return { fields, buffer: Buffer.from(await file.arrayBuffer()) };
    }
    return { fields, buffer: null };
  }
  const data = await request.json().catch(() => ({}));
  return {
    fields: data && typeof data === 'object' && !Array.isArray(data) ? data : {},
    buffer: null,
  };
}

export async function handleAdmin(request, name) {
  if (name !== 'sites' && name !== 'wallpapers') return json({ error: 'not found' }, 404);
  try {
    await requireAdmin(request);
    if (request.method === 'GET') {
      const url = new URL(request.url);
      if (name === 'sites') {
        return json(await listSites({
          q: url.searchParams.get('q') || '',
          offset: url.searchParams.get('offset') || 0,
        }));
      }
      return json(await listWallpapers({
        category: url.searchParams.get('category') || '',
        offset: url.searchParams.get('offset') || 0,
      }));
    }
    if (request.method !== 'POST') return json({ error: 'not found' }, 404);
    const { fields, buffer } = await readBody(request);
    if (name === 'sites') {
      if (fields.action === 'remove') return json(await removeSite(fields.id));
      return json(await saveSite(fields));
    }
    if (buffer) return json(await addWallpaper(fields, buffer));
    if (fields.action === 'remove') return json(await removeWallpaper(fields.id));
    return json(await updateWallpaper(fields));
  } catch (error) {
    const status = error.status || 500;
    return json({ error: error.status ? error.message : '操作失败，请稍后再试' }, status);
  }
}
