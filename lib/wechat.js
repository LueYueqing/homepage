import crypto from 'crypto';

const DEFAULT_REDIRECT = 'https://whatab.com/wechat/callback';

export function wechatConfig() {
  const appId = process.env.WECHAT_APP_ID || process.env.WECHAT_APPID || '';
  const appSecret = process.env.WECHAT_APP_SECRET || process.env.WECHAT_APPSECRET || '';
  const redirectUri = process.env.WECHAT_REDIRECT_URI || DEFAULT_REDIRECT;
  return { appId, appSecret, redirectUri };
}

export function wechatReady() {
  const { appId, appSecret } = wechatConfig();
  return Boolean(appId && appSecret);
}

export function createOAuthState() {
  return crypto.randomBytes(16).toString('hex');
}

export function authorizeUrl(state) {
  const { appId, redirectUri } = wechatConfig();
  const query = new URLSearchParams({
    appid: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'snsapi_login',
    state,
  });
  return `https://open.weixin.qq.com/connect/qrconnect?${query.toString()}#wechat_redirect`;
}

async function readJson(url) {
  const response = await fetch(url);
  const data = await response.json();
  if (data.errcode) {
    const error = new Error(data.errmsg || '微信接口返回错误');
    error.code = data.errcode;
    throw error;
  }
  return data;
}

export async function exchangeCode(code) {
  const { appId, appSecret } = wechatConfig();
  const query = new URLSearchParams({
    appid: appId,
    secret: appSecret,
    code,
    grant_type: 'authorization_code',
  });
  return readJson(`https://api.weixin.qq.com/sns/oauth2/access_token?${query.toString()}`);
}

export async function fetchWechatUser(accessToken, openid) {
  const query = new URLSearchParams({
    access_token: accessToken,
    openid,
    lang: 'zh_CN',
  });
  return readJson(`https://api.weixin.qq.com/sns/userinfo?${query.toString()}`);
}
