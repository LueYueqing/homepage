import crypto from 'crypto';
import https from 'https';

const USER_BG_PATH = /\/whatab\/(\d+)\/([a-f0-9]{16})\.(jpg|png|webp)$/i;

function stripHost(value) {
  return String(value || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function endpointFromRegion(region) {
  const value = stripHost(region);
  if (!value) return '';
  if (value.includes('.')) return value;
  return `oss-${value.replace(/^oss-/, '')}.aliyuncs.com`;
}

export function ossConfig() {
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID || '';
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET || '';
  const bucket = process.env.ALIYUN_OSS_BUCKET || '';
  const endpoint = stripHost(process.env.ALIYUN_OSS_ENDPOINT) || endpointFromRegion(process.env.ALIYUN_REGION_ID);
  let domain = String(process.env.ALIYUN_OSS_DOMAIN || '').trim().replace(/\/$/, '');
  if (domain && !/^https?:\/\//.test(domain)) domain = `https://${domain}`;
  return {
    accessKeyId,
    accessKeySecret,
    bucket,
    endpoint,
    domain,
    ready: Boolean(accessKeyId && accessKeySecret && bucket && endpoint),
  };
}

export function ossHost(bucket, endpoint) {
  const host = stripHost(endpoint);
  if (!bucket || !host) return '';
  return host.startsWith(`${bucket}.`) ? host : `${bucket}.${host}`;
}

function hostOf(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    return new URL(/^https?:\/\//.test(text) ? text : `https://${text}`).host;
  } catch {
    return '';
  }
}

export function allowedBackgroundHosts() {
  const cfg = ossConfig();
  const hosts = new Set();
  const domainHost = hostOf(cfg.domain);
  const picHost = hostOf(process.env.ALIYUN_OSS_DOMAIN_PICNAN);
  const bucketHost = hostOf(ossHost(cfg.bucket, cfg.endpoint));
  if (domainHost) hosts.add(domainHost);
  if (picHost) hosts.add(picHost);
  if (bucketHost) hosts.add(bucketHost);
  return hosts;
}

export function publicObjectUrl(key) {
  const cfg = ossConfig();
  const base = (cfg.domain || `https://${ossHost(cfg.bucket, cfg.endpoint)}`).replace(/\/$/, '');
  return `${base}/${String(key || '').replace(/^\//, '')}`;
}

export function userBackgroundKey(url) {
  const hosts = allowedBackgroundHosts();
  if (!hosts.size) return '';
  try {
    const parsed = new URL(String(url || '').trim());
    if (parsed.protocol !== 'https:' || !hosts.has(parsed.host)) return '';
    const match = parsed.pathname.match(USER_BG_PATH);
    if (!match) return '';
    return `whatab/${match[1]}/${match[2]}.${match[3].toLowerCase()}`;
  } catch {
    return '';
  }
}

export function isUserBackgroundUrl(url) {
  return Boolean(userBackgroundKey(url));
}

export function backgroundOwnerId(url) {
  const key = userBackgroundKey(url);
  const match = key.match(/^whatab\/(\d+)\//);
  return match ? Number(match[1]) : 0;
}

function sign(method, contentType, date, ossHeaders, resource, secret) {
  const canonicalHeaders = Object.keys(ossHeaders)
    .map((name) => name.toLowerCase())
    .sort()
    .map((name) => `${name}:${ossHeaders[name]}\n`)
    .join('');
  const stringToSign = `${method}\n\n${contentType}\n${date}\n${canonicalHeaders}${resource}`;
  return crypto.createHmac('sha1', secret).update(stringToSign).digest('base64');
}

function ossRequest(method, key, body, contentType, ossHeaders, extraHeaders) {
  const cfg = ossConfig();
  if (!cfg.ready) return Promise.reject(new Error('上传服务还没有配置'));
  const objectKey = String(key || '').replace(/^\//, '');
  const date = new Date().toUTCString();
  const type = contentType || '';
  const signedHeaders = {};
  for (const [name, value] of Object.entries(ossHeaders || {})) {
    if (name.toLowerCase().startsWith('x-oss-')) signedHeaders[name.toLowerCase()] = value;
  }
  const resource = `/${cfg.bucket}/${objectKey}`;
  const signature = sign(method, type, date, signedHeaders, resource, cfg.accessKeySecret);
  const host = ossHost(cfg.bucket, cfg.endpoint);
  const requestHeaders = {
    Date: date,
    Authorization: `OSS ${cfg.accessKeyId}:${signature}`,
    ...signedHeaders,
    ...(extraHeaders || {}),
  };
  if (type) requestHeaders['Content-Type'] = type;
  if (body) requestHeaders['Content-Length'] = body.length;

  return new Promise((resolve, reject) => {
    const req = https.request({
      method,
      host,
      path: `/${objectKey}`,
      headers: requestHeaders,
      timeout: 20000,
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          body: Buffer.concat(chunks).toString('utf8').slice(0, 500),
        });
      });
    });
    req.on('timeout', () => req.destroy(new Error('对象存储超时')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

export async function putObject(key, body, contentType) {
  const cache = { 'Cache-Control': 'public, max-age=31536000' };
  let result = await ossRequest('PUT', key, body, contentType, {
    'x-oss-object-acl': 'public-read',
  }, cache);
  if (result.status === 403) {
    result = await ossRequest('PUT', key, body, contentType, {}, cache);
  }
  if (result.status !== 200) {
    throw new Error('上传失败，请稍后再试');
  }
  return publicObjectUrl(key);
}

export async function deleteObject(key) {
  const result = await ossRequest('DELETE', key, null, '', {});
  if (result.status === 200 || result.status === 204 || result.status === 404) return;
  throw new Error('删除失败，请稍后再试');
}
