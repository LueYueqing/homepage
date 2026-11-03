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

export const HOME_TITLE = '哇塔主页 - 极简浏览器主页，自定义壁纸和网址导航';
export const HOME_DESCRIPTION = '哇塔主页是一个极简的浏览器主页。打开就能搜索，并把常用网站放在眼前。你可以更换壁纸、调整界面、选择搜索引擎，把启动页做成自己的网址导航，适合作为每天打开浏览器的第一页。';

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
