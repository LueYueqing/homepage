import { NextResponse } from 'next/server';

const QQ_AUTHORIZE =
  'https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=101845170&redirect_uri=https%3A%2F%2Fwww.jianfast.com%2Fqqlogin&state=0df33a047f6fa04ea3f1eed4a8f5d731';

export function GET() {
  return NextResponse.redirect(QQ_AUTHORIZE);
}
