import { NextResponse } from 'next/server';

const DEST = {
  tb: 'https://www.taobao.com/',
  tmall: 'https://www.tmall.com/',
  jd: 'https://www.jd.com/',
  vip: 'https://www.vip.com/',
  doubao: 'https://www.doubao.com/chat/',
  qiewen: 'https://qiewenpaper.com/zh?utm_source=jianfast',
  douyin: 'https://www.douyin.com/',
};

export function GET(request) {
  const cu = new URL(request.url).searchParams.get('cu') || '';
  const target = DEST[cu] || '/';
  return NextResponse.redirect(target);
}
