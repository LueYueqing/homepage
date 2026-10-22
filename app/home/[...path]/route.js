import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

async function handle(_request, context) {
  const params = context?.params ? await context.params : {};
  const segments = params.path || params.slug || [];
  const key = '/home/' + (Array.isArray(segments) ? segments.join('/') : String(segments));
  const data = payload();

  if (key === '/home/user/clogin' || key === '/home/user/login') {
    return NextResponse.json(data);
  }
  if (key === '/home/bg/ajaxbg') {
    return NextResponse.json(readJson('home_bg_ajaxbg.json'));
  }
  if (key === '/home/bg/randbg') {
    return NextResponse.json({ success: 1, bg_url: data.uiData.bg_url });
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
