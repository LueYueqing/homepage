import LegacyPage from '../../components/LegacyPage';

export const metadata = { title: '关于哇塔主页' };

export default function AboutPage() {
  return <LegacyPage file="about/index.html" self="/about" />;
}
