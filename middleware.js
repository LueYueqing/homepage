import { NextResponse } from 'next/server';
import { BUILD_ID } from './lib/build-id.mjs';

const APEX = 'whatab.com';
const PAGE_CACHE = 'public, max-age=31536000';
const SKIP = /^\/(?:_next|home|wechat|vip|uploads|static|common|_ext)(?:\/|$)|^(?:\/qqlogin|\/links)$/;

function cachePage(response, pathname) {
  if (SKIP.test(pathname) || pathname.includes('.')) return response;
  response.headers.set('Cache-Control', PAGE_CACHE);
  response.headers.set('ETag', `"${BUILD_ID}"`);
  return response;
}

function hostName(value) {
  return String(value || '').split(',')[0].trim().split(':')[0].toLowerCase();
}

export function middleware(request) {
  const hosts = [request.headers.get('x-forwarded-host'), request.headers.get('host')];
  if (!hosts.some((value) => hostName(value) === `www.${APEX}`)) {
    return cachePage(NextResponse.next(), request.nextUrl.pathname);
  }
  const url = request.nextUrl.clone();
  url.protocol = 'https:';
  url.hostname = APEX;
  url.port = '';
  return NextResponse.redirect(url, 301);
}

export const config = {
  matcher: '/:path*',
};
