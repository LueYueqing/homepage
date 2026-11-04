export const SITE = 'https://whatab.com';

export const OG_IMAGE = {
  url: `${SITE}/static/home/images/og.png`,
  width: 1200,
  height: 630,
  alt: '哇塔主页',
};

export function pageMeta({ title, description, path }) {
  const url = path === '/' ? `${SITE}/` : `${SITE}${path}`;
  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: '哇塔主页',
      locale: 'zh_CN',
      type: 'website',
      images: [OG_IMAGE],
    },
  };
}

export const HOME_TITLE = '哇塔主页 - 网址导航，上传壁纸并分享给别人';
export const HOME_DESCRIPTION = '哇塔主页是一个网址导航站。打开就能搜索、使用常用网站。你可以上传自己的壁纸，也可以分享给别人：打开链接的人会在壁纸库里看到「分享」，自己的「自选」仍然只放本人上传的壁纸。';

export const homeJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      name: '哇塔主页',
      url: `${SITE}/`,
      description: HOME_DESCRIPTION,
      inLanguage: 'zh-CN',
      publisher: { '@id': `${SITE}/#organization` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE}/#organization`,
      name: '哇塔主页',
      legalName: '东莞市梦霓科技有限公司',
      url: `${SITE}/`,
      email: '87371@qq.com',
      logo: `${SITE}/static/home/images/og.png`,
    },
  ],
};
