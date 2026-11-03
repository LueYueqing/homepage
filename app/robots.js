import { SITE } from '../lib/seo';

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/home/', '/wechat/', '/qqlogin', '/links'],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
