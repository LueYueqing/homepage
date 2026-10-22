import fs from 'fs';
import path from 'path';

const PAGE_LINKS = [
  ['../contact/index.907548.html', '/contact'],
  ['../zhuye/index.456cf4.html', '/zhuye'],
  ['../zhuye/index.d4f5c2.html', '/zhuye'],
  ['../contract/index.html', '/contract'],
  ['../contact/index.html', '/contact'],
  ['../zhinan/index.html', '/zhinan'],
  ['../zhuye/index.html', '/zhuye'],
  ['../about/index.html', '/about'],
  ['../index.html', '/'],
  ['zhuye/index.456cf4.html', '/zhuye'],
  ['zhuye/index.d4f5c2.html', '/zhuye'],
  ['qqlogin/index.html', '/qqlogin'],
  ['contract/index.html', '/contract'],
  ['contact/index.html', '/contact'],
  ['zhinan/index.html', '/zhinan'],
  ['zhuye/index.html', '/zhuye'],
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
    ['src="zhuye/images/', 'src="/zhuye/images/'],
    ["src='zhuye/images/", "src='/zhuye/images/"],
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
    html = html.split("src='images/").join("src='/zhuye/images/");
    html = html.split('src="images/').join('src="/zhuye/images/');
  }

  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = (bodyMatch ? bodyMatch[1] : html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  return {
    title: titleMatch ? titleMatch[1].trim() : '简法主页',
    body,
  };
}
