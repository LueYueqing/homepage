import { NextResponse } from 'next/server';

const APEX = 'whatab.com';

function hostName(value) {
  return String(value || '').split(',')[0].trim().split(':')[0].toLowerCase();
}

export function middleware(request) {
  const hosts = [request.headers.get('x-forwarded-host'), request.headers.get('host')];
  if (!hosts.some((value) => hostName(value) === `www.${APEX}`)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.protocol = 'https:';
  url.hostname = APEX;
  url.port = '';
  return NextResponse.redirect(url, 301);
}

export const config = {
  matcher: '/:path*',
};
