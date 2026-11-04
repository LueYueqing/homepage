import { SITE } from '../lib/seo';

const PRIVATE_PATHS = ['/home/', '/wechat/', '/qqlogin', '/links', '/admin'];
const AI_BOTS = ['GPTBot', 'Google-Extended', 'ClaudeBot'];

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      ...AI_BOTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
