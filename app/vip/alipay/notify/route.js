import { NextResponse } from 'next/server';
import { handleAlipayNotify } from '../../../../lib/pay';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const form = await request.formData();
  const params = {};
  for (const [key, value] of form.entries()) params[key] = String(value);
  let ok = false;
  try {
    ok = await handleAlipayNotify(params);
  } catch {
    ok = false;
  }
  return new NextResponse(ok ? 'success' : 'fail', {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
