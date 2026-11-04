import LegacyPage from '../../components/LegacyPage';
import { pageMeta } from '../../lib/seo';

export const metadata = pageMeta({
  title: '哇塔主页服务条款',
  description: '阅读哇塔主页服务条款。使用网址导航、壁纸上传、壁纸分享和会员服务前，请了解账号、服务规则，以及争议由东莞市法院管辖等约定。',
  path: '/terms',
});

export default function TermsPage() {
  return <LegacyPage file="contract/index.html" self="/terms" header />;
}
