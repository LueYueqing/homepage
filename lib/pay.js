import crypto from 'crypto';
import https from 'https';
import { markVipPaid, VIP_PRICE_FEN, VIP_PRICE_YUAN } from './vip';

const WECHAT_NOTIFY = 'https://whatab.com/vip/wechat/notify';
const ALIPAY_NOTIFY = 'https://whatab.com/vip/alipay/notify';
const ALIPAY_RETURN = 'https://whatab.com/zhuye/upload?vip=return';

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function pem(value, type) {
  const text = String(value || '').replace(/\\n/g, '\n').trim();
  if (!text) return '';
  if (text.includes('BEGIN')) return text;
  const body = text.replace(/\s+/g, '').match(/.{1,64}/g).join('\n');
  return `-----BEGIN ${type}-----\n${body}\n-----END ${type}-----`;
}

export function paymentReady() {
  return {
    wechat: Boolean(process.env.WECHAT_MCH_ID && process.env.WECHAT_PAY_KEY && (process.env.WECHAT_PAY_APP_ID || process.env.WECHAT_APP_ID)),
    alipay: Boolean(process.env.ALIPAY_APP_ID && process.env.ALIPAY_PRIVATE_KEY && process.env.ALIPAY_PUBLIC_KEY),
  };
}

function wechatSign(params, key) {
  const content = Object.keys(params)
    .filter((name) => name !== 'sign' && params[name] !== '' && params[name] != null)
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join('&');
  return crypto.createHash('md5').update(`${content}&key=${key}`, 'utf8').digest('hex').toUpperCase();
}

function xmlValue(xml, tag) {
  const wrapped = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`));
  if (wrapped) return wrapped[1];
  const plain = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return plain ? plain[1] : '';
}

function xmlFields(xml) {
  const fields = {};
  const pattern = /<([a-zA-Z0-9_]+)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/\1>/g;
  let match = pattern.exec(xml);
  while (match) {
    fields[match[1]] = match[2] != null ? match[2] : (match[3] || '');
    match = pattern.exec(xml);
  }
  return fields;
}

function postXml(url, body) {
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request({
      method: 'POST',
      hostname: target.hostname,
      path: target.pathname,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 15000,
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('timeout', () => req.destroy(new Error('支付网关超时')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export async function createWechatPayment(order, clientIp) {
  if (!paymentReady().wechat) throw httpError('微信支付还没有开通', 503);
  const appId = process.env.WECHAT_PAY_APP_ID || process.env.WECHAT_APP_ID;
  const params = {
    appid: appId,
    mch_id: process.env.WECHAT_MCH_ID,
    nonce_str: crypto.randomBytes(16).toString('hex'),
    body: '哇塔主页会员一年',
    out_trade_no: order.outTradeNo,
    total_fee: String(VIP_PRICE_FEN),
    spbill_create_ip: clientIp || '127.0.0.1',
    notify_url: process.env.WECHAT_PAY_NOTIFY_URL || WECHAT_NOTIFY,
    trade_type: 'NATIVE',
  };
  params.sign = wechatSign(params, process.env.WECHAT_PAY_KEY);
  const xml = `<xml>${Object.entries(params).map(([key, value]) => `<${key}><![CDATA[${value}]]></${key}>`).join('')}</xml>`;
  const response = await postXml('https://api.mch.weixin.qq.com/pay/unifiedorder', xml);
  if (xmlValue(response, 'return_code') !== 'SUCCESS' || xmlValue(response, 'result_code') !== 'SUCCESS') {
    throw httpError('微信支付暂时不可用', 502);
  }
  const codeUrl = xmlValue(response, 'code_url');
  if (!codeUrl) throw httpError('微信支付暂时不可用', 502);
  return { codeUrl };
}

function alipayContent(params) {
  return Object.keys(params)
    .filter((key) => key !== 'sign' && key !== 'sign_type' && params[key] !== '' && params[key] != null)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
}

function alipayRequestContent(params) {
  return Object.keys(params)
    .filter((key) => key !== 'sign' && params[key] !== '' && params[key] != null)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
}

function beijingNow() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai', hour12: false }).replace('T', ' ').slice(0, 19);
}

export function createAlipayPayment(order) {
  if (!paymentReady().alipay) throw httpError('支付宝还没有开通', 503);
  const privateKey = pem(process.env.ALIPAY_PRIVATE_KEY, 'PRIVATE KEY');
  const params = {
    app_id: process.env.ALIPAY_APP_ID,
    method: 'alipay.trade.page.pay',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: beijingNow(),
    version: '1.0',
    notify_url: process.env.ALIPAY_NOTIFY_URL || ALIPAY_NOTIFY,
    return_url: ALIPAY_RETURN,
    biz_content: JSON.stringify({
      out_trade_no: order.outTradeNo,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      total_amount: VIP_PRICE_YUAN,
      subject: '哇塔主页会员一年',
    }),
  };
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(alipayRequestContent(params), 'utf8');
  try {
    params.sign = signer.sign(privateKey, 'base64');
  } catch {
    throw httpError('支付宝还没有开通', 503);
  }
  const gateway = process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do';
  const query = new URLSearchParams(params).toString();
  return { payUrl: `${gateway}?${query}` };
}

export async function handleWechatNotify(xml) {
  if (!paymentReady().wechat) return false;
  const fields = xmlFields(xml);
  if (fields.return_code !== 'SUCCESS' || fields.result_code !== 'SUCCESS') return false;
  const sign = fields.sign;
  const expected = wechatSign(fields, process.env.WECHAT_PAY_KEY);
  const left = Buffer.from(String(sign || ''));
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;
  const appId = process.env.WECHAT_PAY_APP_ID || process.env.WECHAT_APP_ID;
  if (fields.appid !== appId || fields.mch_id !== process.env.WECHAT_MCH_ID) return false;
  return markVipPaid(fields.out_trade_no, 'wechat', Number(fields.total_fee));
}

export async function handleAlipayNotify(params) {
  if (!paymentReady().alipay) return false;
  if (params.trade_status !== 'TRADE_SUCCESS' && params.trade_status !== 'TRADE_FINISHED') return false;
  if (params.app_id !== process.env.ALIPAY_APP_ID) return false;
  const publicKey = pem(process.env.ALIPAY_PUBLIC_KEY, 'PUBLIC KEY');
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(alipayContent(params), 'utf8');
  let valid = false;
  try {
    valid = verifier.verify(publicKey, String(params.sign || ''), 'base64');
  } catch {
    valid = false;
  }
  if (!valid) return false;
  const amountFen = Math.round(Number(params.total_amount) * 100);
  return markVipPaid(params.out_trade_no, 'alipay', amountFen);
}
