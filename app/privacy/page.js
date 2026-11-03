import LegacyPage from '../../components/LegacyPage';
import { pageMeta } from '../../lib/seo';

export const metadata = pageMeta({
  title: '哇塔主页隐私政策',
  description: '了解哇塔主页如何处理微信登录、主页设置、上传背景图和会员支付相关的个人信息。运营者是东莞市梦霓科技有限公司。',
  path: '/privacy',
});

export default function PrivacyPage() {
  return <LegacyPage file="privacy/index.html" self="/privacy" header />;
}
