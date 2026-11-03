import LegacyPage from '../../components/LegacyPage';
import { pageMeta } from '../../lib/seo';

export const metadata = pageMeta({
  title: '关于哇塔主页：极简浏览器主页与网址导航',
  description: '了解哇塔主页。它是东莞市梦霓科技有限公司运营的极简浏览器主页，提供搜索、网址导航、壁纸和界面自定义，页面保持简洁，让每次打开浏览器都更轻快。',
  path: '/about',
});

export default function AboutPage() {
  return <LegacyPage file="about/index.html" self="/about" header />;
}
