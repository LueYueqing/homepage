import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createSession, sessionCookieOptions, upsertWechatUser } from '../../../lib/users';
import { exchangeCode, fetchWechatUser } from '../../../lib/wechat';

export const dynamic = 'force-dynamic';

function home(request, reason) {
  const forwarded = request.headers.get('x-forwarded-host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const origin = forwarded
    ? `${proto}://${forwarded.split(',')[0].trim()}`
    : new URL(request.url).origin;
  const url = new URL('/', origin);
  if (reason) url.searchParams.set('wechat', reason);
  const response = NextResponse.redirect(url);
  response.cookies.set('wechat_state', '', { path: '/', maxAge: 0 });
  return response;
}

function sameState(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const saved = request.cookies?.get('wechat_state')?.value || '';
  if (!code || !sameState(state, saved)) return home(request, 'denied');
  try {
    const token = await exchangeCode(code);
    let profile = { openid: token.openid, unionid: token.unionid };
    try {
      profile = await fetchWechatUser(token.access_token, token.openid);
    } catch {
      /* 没有拿到头像时仍用 openid 建立账号 */
    }
    const user = await upsertWechatUser(profile);
    const session = await createSession(user.id);
    const response = home(request);
    response.cookies.set('wa_session', session, sessionCookieOptions());
    return response;
  } catch {
    return home(request, 'failed');
  }
}
