import { NextResponse } from 'next/server';

export function GET(request) {
  return NextResponse.redirect(new URL('/wechat/login', request.url));
}
