import LegacyPage from '../../components/LegacyPage';
import { pageMeta } from '../../lib/seo';

export const metadata = pageMeta({
  title: '哇塔主页服务条款',
  description: '阅读哇塔主页服务条款。使用 whatab.com 的搜索、导航、壁纸和会员服务前，请了解账号、服务规则，以及争议由东莞市法院管辖等约定。',
  path: '/terms',
});

export default function TermsPage() {
  return <LegacyPage file="contract/index.html" self="/terms" />;
}
