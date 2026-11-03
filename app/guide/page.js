import LegacyPage from '../../components/LegacyPage';
import { pageMeta } from '../../lib/seo';

export const metadata = pageMeta({
  title: '哇塔主页使用指南：壁纸、导航和搜索设置',
  description: '查看哇塔主页使用指南。从右下角设置开始，了解如何更换壁纸、调整界面、收藏网站、自定义搜索引擎，以及登录和设为主页时的常见问题，照着页面做即可。',
  path: '/guide',
});

export default function GuidePage() {
  return <LegacyPage file="guide/index.html" self="/guide" />;
}
