import LegacyPage from '../../components/LegacyPage';
import { pageMeta } from '../../lib/seo';

export const metadata = pageMeta({
  title: '哇塔主页用户服务协议与使用条款说明',
  description: '阅读哇塔主页用户服务协议。使用 whatab.com 的搜索、导航和个性化主页前，请了解账号、个人信息、服务规则，以及争议由东莞市法院管辖等约定。',
  path: '/contract',
});

export default function ContractPage() {
  return <LegacyPage file="contract/index.html" self="/contract" header />;
}
