import LegacyPage from '../../components/LegacyPage';
import { pageMeta } from '../../lib/seo';

export const metadata = pageMeta({
  title: '联系哇塔主页：问题反馈与合作邮箱',
  description: '联系哇塔主页。网址导航、上传壁纸或分享壁纸遇到问题时，请先看使用指南，仍未解决再发邮件到 87371@qq.com。',
  path: '/contact',
});

export default function ContactPage() {
  return <LegacyPage file="contact/index.html" self="/contact" header />;
}
