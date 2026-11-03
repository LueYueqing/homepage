import { NextResponse } from 'next/server';
import { authorizeUrl, createOAuthState, wechatReady } from '../../../lib/wechat';

export const dynamic = 'force-dynamic';

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60,
  };
}

export function GET(request) {
  if (!wechatReady()) {
    return new NextResponse(
      '<!doctype html><meta charset="utf-8"><title>微信登录</title><p>微信登录的 AppID 和 AppSecret 还没有配置。配置 WECHAT_APP_ID、WECHAT_APP_SECRET 后即可使用。</p><p><a href="/">返回首页</a></p>',
      { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }
  const state = createOAuthState();
  const response = NextResponse.redirect(authorizeUrl(state));
  response.cookies.set('wechat_state', state, cookieOptions());
  const next = new URL(request.url).searchParams.get('next');
  if (next === '/set-homepage/upload') {
    response.cookies.set('wa_next', next, cookieOptions());
  }
  return response;
}
