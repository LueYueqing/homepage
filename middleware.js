import { NextResponse } from 'next/server';

const APEX = 'whatab.com';
const RENAMES = [
  ['/zhuye', '/set-homepage'],
  ['/zhinan', '/guide'],
];

function hostName(value) {
  return String(value || '').split(',')[0].trim().split(':')[0].toLowerCase();
}

function englishPath(pathname) {
  if (/^\/set-homepage\/index(?:\.[a-z0-9]+)?\.html$/i.test(pathname)) return '/set-homepage';
  if (/^\/guide\/index(?:\.[a-z0-9]+)?\.html$/i.test(pathname)) return '/guide';
  for (const [from, to] of RENAMES) {
    if (pathname !== from && !pathname.startsWith(`${from}/`)) continue;
    const rest = pathname.slice(from.length);
    if (rest === '' || rest === '/' || /^\/index(?:\.[a-z0-9]+)?\.html$/i.test(rest)) return to;
    return to + rest;
  }
  return '';
}

export function middleware(request) {
  const hosts = [request.headers.get('x-forwarded-host'), request.headers.get('host')];
  const www = hosts.some((value) => hostName(value) === `www.${APEX}`);
  const mapped = englishPath(request.nextUrl.pathname);
  if (!www && !mapped) return NextResponse.next();
  const url = request.nextUrl.clone();
  if (www) {
    url.protocol = 'https:';
    url.hostname = APEX;
    url.port = '';
  }
  if (mapped) url.pathname = mapped;
  return NextResponse.redirect(url, 301);
}

export const config = {
  matcher: '/:path*',
};
