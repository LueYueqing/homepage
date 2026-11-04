import LegacyPage from '../../components/LegacyPage';
import { pageMeta } from '../../lib/seo';

export const metadata = pageMeta({
  title: '关于哇塔主页：可上传、可分享壁纸的网址导航',
  description: '哇塔主页是一个网址导航站。你可以搜索、收藏常用网站，上传自己的壁纸，并把壁纸分享给别人。没登录的打开者会轮播你分享的壁纸。',
  path: '/about',
});

export default function AboutPage() {
  return <LegacyPage file="about/index.html" self="/about" header />;
}
