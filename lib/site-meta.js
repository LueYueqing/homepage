import dns from 'dns/promises';
import http from 'http';
import https from 'https';
import net from 'net';
import zlib from 'zlib';

const MAX_BYTES = 512 * 1024;
const MAX_HOPS = 4;

function fail(message) {
  const error = new Error(message);
  error.expose = true;
  return error;
}

export function domainTitle(pageUrl) {
  let host = '';
  try {
    host = new URL(pageUrl).hostname.replace(/^www\./i, '');
  } catch {
    return '网站';
  }
  const parts = host.split('.').filter(Boolean);
  const label = parts.length >= 2 ? parts[parts.length - 2] : (parts[0] || '网站');
  const name = label.slice(0, 1).toUpperCase() + label.slice(1);
  return name.slice(0, 20) || '网站';
}

function blockedIp(ip) {
  const version = net.isIP(ip);
  if (version === 4) {
    const [a, b] = ip.split('.').map((part) => Number(part));
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (version === 6) {
    const text = ip.toLowerCase();
    if (text === '::' || text === '::1') return true;
    if (text.startsWith('fc') || text.startsWith('fd') || text.startsWith('fe80')) return true;
    if (text.startsWith('::ffff:')) return blockedIp(text.slice('::ffff:'.length));
    return false;
  }
  return true;
}

function blockedHost(hostname) {
  const host = String(hostname || '').replace(/\.+$/, '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (net.isIP(host)) return blockedIp(host);
  return false;
}

export function publicPageUrl(value) {
  let text = String(value || '').trim().replace(/。/g, '.');
  if (!text || text.length > 2048) return '';
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    return '';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
  if (parsed.username || parsed.password || blockedHost(parsed.hostname)) return '';
  return parsed.href;
}

async function resolvePublic(hostname) {
  if (blockedHost(hostname)) throw fail('获取图标失败！未输入网址或格式不正确');
  if (net.isIP(hostname)) return hostname;
  const looked = await dns.lookup(hostname, { verbatim: true });
  if (!looked?.address || blockedIp(looked.address)) {
    throw fail('获取图标失败！未输入网址或格式不正确');
  }
  return looked.address;
}

function inflate(buffer, encoding) {
  const type = String(encoding || '').toLowerCase();
  if (type === 'gzip') return zlib.gunzipSync(buffer);
  if (type === 'deflate') return zlib.inflateSync(buffer);
  return buffer;
}

function requestPublic(pageUrl, address) {
  const parsed = new URL(pageUrl);
  const lib = parsed.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.request({
      host: address,
      servername: parsed.hostname,
      method: 'GET',
      path: `${parsed.pathname}${parsed.search}`,
      timeout: 6000,
      headers: {
        Host: parsed.host,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,image/avif,image/webp,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
      },
    }, (res) => {
      const chunks = [];
      let size = 0;
      res.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_BYTES) {
          req.destroy(fail('页面太大'));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });
    req.on('timeout', () => req.destroy(fail('抓取超时')));
    req.on('error', reject);
    req.end();
  });
}

async function fetchPublic(rawUrl, hops = 0) {
  const pageUrl = publicPageUrl(rawUrl);
  if (!pageUrl) throw fail('获取图标失败！未输入网址或格式不正确');
  const parsed = new URL(pageUrl);
  const address = await resolvePublic(parsed.hostname);
  const response = await requestPublic(pageUrl, address);
  const location = response.headers.location;
  if (location && response.status >= 300 && response.status < 400 && hops < MAX_HOPS) {
    return fetchPublic(new URL(location, pageUrl).href, hops + 1);
  }
  let body = response.body;
  try {
    body = inflate(body, response.headers['content-encoding']);
  } catch {
    body = response.body;
  }
  return {
    url: pageUrl,
    status: response.status,
    contentType: String(response.headers['content-type'] || ''),
    body,
  };
}

function decodeHtml(buffer, contentType) {
  const headerCharset = /charset=([^;\s]+)/i.exec(contentType || '');
  const meta = buffer.slice(0, 2048).toString('latin1');
  const metaCharset = /charset=["']?([a-z0-9._-]+)/i.exec(meta);
  const charset = String(headerCharset?.[1] || metaCharset?.[1] || 'utf-8').replace(/["']/g, '').toLowerCase();
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return buffer.toString('utf8');
  }
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, num) => {
      const code = Number(num);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, num) => {
      const code = Number.parseInt(num, 16);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
    });
}

function pageTitle(html) {
  const patterns = [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ];
  for (const pattern of patterns) {
    const matched = html.match(pattern);
    if (!matched) continue;
    const title = decodeEntities(matched[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (title) return title.slice(0, 20);
  }
  return '';
}

function pageIcon(pageUrl, html) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  let href = '';
  for (const tag of tags) {
    if (!/\brel=["'][^"']*icon/i.test(tag)) continue;
    const found = tag.match(/\bhref=["']([^"']+)["']/i);
    if (!found || found[1].startsWith('data:')) continue;
    href = found[1];
    if (/apple-touch-icon/i.test(tag)) break;
  }
  if (!href) href = '/favicon.ico';
  try {
    const iconUrl = new URL(href, pageUrl).href;
    return publicPageUrl(iconUrl);
  } catch {
    return '';
  }
}

function looksLikeImage(contentType, body) {
  if (/^image\//i.test(contentType)) return true;
  if (!body || body.length < 4) return false;
  if (body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47) return true;
  if (body[0] === 0xff && body[1] === 0xd8) return true;
  if (body[0] === 0x47 && body[1] === 0x49 && body[2] === 0x46) return true;
  if (body[0] === 0x00 && body[1] === 0x00 && body[2] === 0x01 && body[3] === 0x00) return true;
  if (body.slice(0, 4).toString('utf8') === 'RIFF' && body.slice(8, 12).toString('utf8') === 'WEBP') return true;
  return false;
}

export async function fetchSiteMeta(rawUrl) {
  const pageUrl = publicPageUrl(rawUrl);
  if (!pageUrl) return { error: '获取图标失败！未输入网址或格式不正确' };
  const fallback = domainTitle(pageUrl);
  try {
    const page = await fetchPublic(pageUrl);
    if (page.status < 200 || page.status >= 400) {
      return { success: '已根据网址填写名称', title: fallback, icon: '', icontype: 1 };
    }
    const html = decodeHtml(page.body, page.contentType);
    const title = pageTitle(html) || fallback;
    const iconUrl = pageIcon(page.url, html);
    let icon = '';
    if (iconUrl) {
      try {
        const image = await fetchPublic(iconUrl);
        if (image.status >= 200 && image.status < 300 && looksLikeImage(image.contentType, image.body)) {
          icon = iconUrl;
        }
      } catch {
        icon = '';
      }
    }
    return {
      success: icon ? '已获取网站名称和图标' : '已获取网站名称',
      title,
      icon,
      icontype: icon ? 2 : 1,
    };
  } catch (error) {
    if (error.expose && error.message.startsWith('获取图标失败')) return { error: error.message };
    return { success: '已根据网址填写名称', title: fallback, icon: '', icontype: 1 };
  }
}
