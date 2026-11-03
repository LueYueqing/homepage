import crypto from 'crypto';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { getPool } from './db';
import { markVipPaid, VIP_PRICE_FEN, VIP_PRICE_YUAN, vipOrderForUser } from './vip';

const WECHAT_NOTIFY = 'https://whatab.com/vip/wechat/notify';
const ALIPAY_NOTIFY = 'https://whatab.com/vip/alipay/notify';
const CERT_DIR = path.join(process.cwd(), 'certs', 'alipay');

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function envFirst(...names) {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return value;
  }
  return '';
}

function wechatConfig() {
  return {
    appId: envFirst('WECHAT_PAY_APP_ID', 'WECHAT_OPEN_APP_ID', 'WECHAT_APP_ID'),
    mchId: envFirst('WECHAT_PAY_MCH_ID', 'WECHAT_MCH_ID'),
    apiKey: envFirst('WECHAT_PAY_API_KEY', 'WECHAT_PAY_MCH_KEY', 'WECHAT_PAY_KEY'),
    notifyUrl: envFirst('WECHAT_PAY_NOTIFY_URL') || WECHAT_NOTIFY,
  };
}

function certReady() {
  return ['appCertPublicKey.crt', 'alipayCertPublicKey.crt', 'alipayRootCert.crt']
    .every((name) => fs.existsSync(path.join(CERT_DIR, name)));
}

export function paymentReady() {
  const wechat = wechatConfig();
  return {
    wechat: Boolean(wechat.appId && wechat.mchId && wechat.apiKey),
    alipay: Boolean(envFirst('ALIPAY_APP_ID') && envFirst('ALIPAY_PRIVATE_KEY') && certReady()),
  };
}

function shanghaiStamp(offsetSec = 0) {
  const date = new Date(Date.now() + offsetSec * 1000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const read = (type) => parts.find((part) => part.type === type)?.value || '00';
  const hour = read('hour') === '24' ? '00' : read('hour');
  return `${read('year')}${read('month')}${read('day')}${hour}${read('minute')}${read('second')}`;
}

function wechatSign(params, apiKey) {
  const content = Object.keys(params)
    .filter((name) => name !== 'sign' && params[name] !== '' && params[name] != null)
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join('&');
  return crypto.createHmac('sha256', apiKey).update(`${content}&key=${apiKey}`, 'utf8').digest('hex').toUpperCase();
}

function xmlFields(xml) {
  const fields = {};
  const pattern = /<([a-zA-Z0-9_]+)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/\1>/g;
  let match = pattern.exec(xml);
  while (match) {
    fields[match[1]] = (match[2] != null ? match[2] : (match[3] || '')).trim();
    match = pattern.exec(xml);
  }
  return fields;
}

function toXml(params) {
  const body = Object.entries(params)
    .map(([key, value]) => (typeof value === 'number'
      ? `<${key}>${value}</${key}>`
      : `<${key}><![CDATA[${value}]]></${key}>`))
    .join('');
  return `<xml>${body}</xml>`;
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
      res.on('end', () => resolve(xmlFields(Buffer.concat(chunks).toString('utf8'))));
    });
    req.on('timeout', () => req.destroy(httpError('支付网关超时', 502)));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export async function createWechatPayment(order) {
  const config = wechatConfig();
  if (!paymentReady().wechat) throw httpError('微信支付还没有开通', 503);
  const params = {
    appid: config.appId,
    mch_id: config.mchId,
    nonce_str: crypto.randomBytes(16).toString('hex'),
    body: '哇塔主页会员一年',
    attach: '哇塔主页会员一年',
    out_trade_no: order.outTradeNo,
    total_fee: VIP_PRICE_FEN,
    spbill_create_ip: '127.0.0.1',
    time_start: shanghaiStamp(0),
    time_expire: shanghaiStamp(1800),
    goods_tag: '会员',
    notify_url: config.notifyUrl,
    trade_type: 'NATIVE',
    product_id: order.outTradeNo,
    sign_type: 'HMAC-SHA256',
  };
  params.sign = wechatSign(params, config.apiKey);
  const result = await postXml('https://api.mch.weixin.qq.com/pay/unifiedorder', toXml(params));
  if (result.return_code !== 'SUCCESS' || result.result_code !== 'SUCCESS' || !result.code_url) {
    throw httpError('微信支付暂时不可用', 502);
  }
  return { codeUrl: result.code_url };
}

async function queryWechatOrder(outTradeNo) {
  const config = wechatConfig();
  const params = {
    appid: config.appId,
    mch_id: config.mchId,
    out_trade_no: outTradeNo,
    nonce_str: crypto.randomBytes(16).toString('hex'),
    sign_type: 'HMAC-SHA256',
  };
  params.sign = wechatSign(params, config.apiKey);
  return postXml('https://api.mch.weixin.qq.com/pay/orderquery', toXml(params));
}

function privateKeyPem(value) {
  const text = String(value || '').replace(/\\n/g, '\n').replace(/\r/g, '').trim();
  const label = text.includes('BEGIN RSA PRIVATE KEY') ? 'RSA PRIVATE KEY' : 'PRIVATE KEY';
  const body = text
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s/g, '');
  if (!body) throw httpError('支付宝还没有开通', 503);
  const wrapped = body.match(/.{1,64}/g).join('\n');
  return {
    pem: `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----`,
    keyType: label === 'RSA PRIVATE KEY' ? 'PKCS1' : 'PKCS8',
  };
}

async function alipayClient() {
  if (!paymentReady().alipay) throw httpError('支付宝还没有开通', 503);
  const { pem, keyType } = privateKeyPem(envFirst('ALIPAY_PRIVATE_KEY'));
  const sdkModule = await import('alipay-sdk');
  const Sdk = sdkModule.AlipaySdk || sdkModule.default;
  if (typeof Sdk !== 'function') throw httpError('支付宝还没有开通', 503);
  return new Sdk({
    appId: envFirst('ALIPAY_APP_ID'),
    privateKey: pem,
    keyType,
    appCertPath: path.join(CERT_DIR, 'appCertPublicKey.crt'),
    alipayPublicCertPath: path.join(CERT_DIR, 'alipayCertPublicKey.crt'),
    alipayRootCertPath: path.join(CERT_DIR, 'alipayRootCert.crt'),
    gateway: envFirst('ALIPAY_GATEWAY') || 'https://openapi.alipay.com/gateway.do',
    signType: 'RSA2',
    timeout: 8000,
  });
}

function alipayField(record, camel, snake) {
  return record[camel] ?? record[snake];
}

export async function createAlipayPayment(order) {
  const client = await alipayClient();
  const result = await client.exec('alipay.trade.precreate', {
    notifyUrl: envFirst('ALIPAY_NOTIFY_URL') || ALIPAY_NOTIFY,
    bizContent: {
      outTradeNo: order.outTradeNo,
      productCode: 'FACE_TO_FACE_PAYMENT',
      totalAmount: VIP_PRICE_YUAN,
      subject: '哇塔主页会员一年',
    },
  });
  const data = typeof result === 'string' ? JSON.parse(result) : (result || {});
  const codeUrl = alipayField(data, 'qrCode', 'qr_code');
  if (data.code === '10000' && codeUrl) return { codeUrl: String(codeUrl) };
  throw httpError('支付宝暂时不可用', 502);
}

async function queryAlipayOrder(outTradeNo) {
  const client = await alipayClient();
  const result = await client.exec('alipay.trade.query', {
    bizContent: { outTradeNo },
  });
  const data = typeof result === 'string' ? JSON.parse(result) : (result || {});
  const subCode = String(alipayField(data, 'subCode', 'sub_code') || '');
  if (subCode === 'ACQ.TRADE_NOT_EXIST') return { tradeStatus: 'WAIT_BUYER_PAY' };
  if (data.code !== '10000') return { tradeStatus: '' };
  const amount = alipayField(data, 'totalAmount', 'total_amount');
  return {
    tradeStatus: String(alipayField(data, 'tradeStatus', 'trade_status') || ''),
    totalAmountFen: amount == null ? undefined : Math.round(Number(amount) * 100),
  };
}

export async function handleWechatNotify(xml) {
  const config = wechatConfig();
  if (!paymentReady().wechat) return false;
  const fields = xmlFields(xml);
  if (fields.return_code !== 'SUCCESS' || fields.result_code !== 'SUCCESS') return false;
  const expected = wechatSign(fields, config.apiKey);
  const left = Buffer.from(String(fields.sign || '').toUpperCase());
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;
  if (fields.appid !== config.appId || fields.mch_id !== config.mchId) return false;
  return markVipPaid(fields.out_trade_no, 'wechat', Number(fields.total_fee));
}

export async function handleAlipayNotify(params) {
  if (!paymentReady().alipay) return false;
  if (params.trade_status !== 'TRADE_SUCCESS' && params.trade_status !== 'TRADE_FINISHED') return false;
  if (params.app_id !== envFirst('ALIPAY_APP_ID')) return false;
  const client = await alipayClient();
  const valid = await client.checkNotifySign(params);
  if (!valid) return false;
  return markVipPaid(params.out_trade_no, 'alipay', Math.round(Number(params.total_amount) * 100));
}

export async function syncVipOrder(userId, outTradeNo) {
  const current = await vipOrderForUser(userId, outTradeNo);
  if (!current || current.status === 'paid') return current;
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT provider FROM vip_orders WHERE user_id = ? AND out_trade_no = ? LIMIT 1',
    [userId, outTradeNo],
  );
  if (!rows.length) return current;
  try {
    if (rows[0].provider === 'wechat' && paymentReady().wechat) {
      const result = await queryWechatOrder(outTradeNo);
      if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS' && result.trade_state === 'SUCCESS') {
        await markVipPaid(outTradeNo, 'wechat', Number(result.total_fee));
      }
    }
    if (rows[0].provider === 'alipay' && paymentReady().alipay) {
      const result = await queryAlipayOrder(outTradeNo);
      if (result.tradeStatus === 'TRADE_SUCCESS' || result.tradeStatus === 'TRADE_FINISHED') {
        await markVipPaid(outTradeNo, 'alipay', result.totalAmountFen);
      }
    }
  } catch {
    return current;
  }
  return vipOrderForUser(userId, outTradeNo);
}
