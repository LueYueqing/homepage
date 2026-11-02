import LegacyPage from '../../components/LegacyPage';
import OrderedScripts from '../../components/OrderedScripts';

export const metadata = { title: '设置主页-哇塔主页' };

export default function ZhuyePage() {
  return (
    <>
      <LegacyPage file="zhuye/index.html" self="/zhuye" localImages />
      <OrderedScripts
        srcs={[
          '/static/home/js/jquery-1.8.0.js',
          '/zhuye/browser.js',
          '/zhuye/init.js',
        ]}
      />
    </>
  );
}
