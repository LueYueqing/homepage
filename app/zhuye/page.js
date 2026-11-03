import LegacyPage from '../../components/LegacyPage';
import OrderedScripts from '../../components/OrderedScripts';
import { pageMeta } from '../../lib/seo';

export const metadata = pageMeta({
  title: '把哇塔主页设为 Chrome 等浏览器启动页',
  description: '按浏览器查看把哇塔主页设为启动页的步骤。支持 Chrome、Edge、Firefox 以及 360、QQ、搜狗等浏览器，打开浏览器即可进入自己的导航主页。',
  path: '/zhuye',
});

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
