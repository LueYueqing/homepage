import { SITE } from '../lib/seo';

const PAGES = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/zhuye', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/zhinan', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/contract', priority: 0.4, changeFrequency: 'yearly' },
];

export default function sitemap() {
  const lastModified = new Date();
  return PAGES.map(({ path, priority, changeFrequency }) => ({
    url: path === '/' ? `${SITE}/` : `${SITE}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
