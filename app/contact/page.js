import LegacyPage from '../../components/LegacyPage';
import { pageMeta } from '../../lib/seo';

export const metadata = pageMeta({
  title: '联系哇塔主页：问题反馈与合作邮箱',
  description: '联系哇塔主页获取使用帮助或沟通合作。请先查看使用指南，仍未解决时发送邮件到 87371@qq.com，并写清遇到的问题和需要沟通的事项，我们会尽快回复。',
  path: '/contact',
});

export default function ContactPage() {
  return <LegacyPage file="contact/index.html" self="/contact" header />;
}
