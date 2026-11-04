import LegacyPage from '../../components/LegacyPage';
import { pageMeta } from '../../lib/seo';

export const metadata = pageMeta({
  title: '哇塔主页使用指南：网址导航、上传壁纸和分享',
  description: '查看如何在哇塔主页收藏网站、上传自己的壁纸、把壁纸分享给别人，以及更换壁纸、调整界面和设为浏览器主页。',
  path: '/guide',
});

export default function GuidePage() {
  return <LegacyPage file="guide/index.html" self="/guide" header />;
}
