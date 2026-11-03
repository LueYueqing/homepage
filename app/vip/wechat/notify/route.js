import { NextResponse } from 'next/server';
import { handleWechatNotify } from '../../../../lib/pay';

export const dynamic = 'force-dynamic';

function xml(ok) {
  const code = ok ? 'SUCCESS' : 'FAIL';
  return `<xml><return_code><![CDATA[${code}]]></return_code><return_msg><![CDATA[${code}]]></return_msg></xml>`;
}

export async function POST(request) {
  const body = await request.text();
  let ok = false;
  try {
    ok = await handleWechatNotify(body);
  } catch {
    ok = false;
  }
  return new NextResponse(xml(ok), {
    status: 200,
    headers: { 'content-type': 'text/xml; charset=utf-8' },
  });
}
