import fs from 'fs';
import path from 'path';

const PAGE_LINKS = [
  ['../contact/index.907548.html', '/contact'],
  ['../zhuye/index.456cf4.html', '/set-homepage'],
  ['../zhuye/index.d4f5c2.html', '/set-homepage'],
  ['../contract/index.html', '/contract'],
  ['../contact/index.html', '/contact'],
  ['../zhinan/index.html', '/guide'],
  ['../zhuye/index.html', '/set-homepage'],
  ['../about/index.html', '/about'],
  ['../index.html', '/'],
  ['zhuye/index.456cf4.html', '/set-homepage'],
  ['zhuye/index.d4f5c2.html', '/set-homepage'],
  ['qqlogin/index.html', '/qqlogin'],
  ['contract/index.html', '/contract'],
  ['contact/index.html', '/contact'],
  ['zhinan/index.html', '/guide'],
  ['zhuye/index.html', '/set-homepage'],
  ['about/index.html', '/about'],
  ['index.907548.html', '/contact'],
];

function rewriteInternalUrls(html, self) {
  let next = html;
  for (const [from, to] of PAGE_LINKS) {
    next = next.split(from).join(to);
  }
  next = next.split('href="index.html"').join(`href="${self}"`);
  next = next.split("href='index.html'").join(`href='${self}'`);

  const assetPairs = [
    ['src="../static/', 'src="/static/'],
    ["src='../static/", "src='/static/"],
    ['href="../static/', 'href="/static/'],
    ['href="../common/', 'href="/common/'],
    ['src="../favicon.ico"', 'src="/favicon.ico"'],
    ['href="../favicon.ico"', 'href="/favicon.ico"'],
    ['src="static/', 'src="/static/'],
    ["src='static/", "src='/static/"],
    ['href="static/', 'href="/static/'],
    ["href='static/", "href='/static/"],
    ['src="zhuye/images/', 'src="/set-homepage/images/'],
    ["src='zhuye/images/", "src='/set-homepage/images/"],
    ['href="/zhuye/upload"', 'href="/set-homepage/upload"'],
    ['href="/zhuye"', 'href="/set-homepage"'],
    ['href="/zhinan"', 'href="/guide"'],
    ['href="favicon.ico"', 'href="/favicon.ico"'],
    ['src="favicon.ico"', 'src="/favicon.ico"'],
  ];
  for (const [from, to] of assetPairs) {
    next = next.split(from).join(to);
  }
  return next;
}

export function readLegacyDocument(relPath, { self = '/', localImages = false } = {}) {
  const file = path.join(process.cwd(), relPath);
  let html = fs.readFileSync(file, 'utf8');
  html = rewriteInternalUrls(html, self);
  if (localImages) {
    html = html.split("src='images/").join("src='/set-homepage/images/");
    html = html.split('src="images/').join('src="/set-homepage/images/');
  }

  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headCss = headMatch
    ? [...headMatch[1].matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join('\n')
    : '';
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = (bodyMatch ? bodyMatch[1] : html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  return {
    title: titleMatch ? titleMatch[1].trim() : '哇塔主页',
    headCss,
    body,
  };
}
