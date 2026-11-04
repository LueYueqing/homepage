import LegacyPage from '../../components/LegacyPage';
import OrderedScripts from '../../components/OrderedScripts';
import { pageMeta } from '../../lib/seo';

export const metadata = pageMeta({
  title: '把哇塔主页设为 Chrome 等浏览器启动页',
  description: '把哇塔主页设为浏览器启动页。打开浏览器就是你的网址导航，也可以继续使用自己上传和分享的壁纸。支持 Chrome、Edge、Firefox 以及 360、QQ、搜狗等浏览器。',
  path: '/set-homepage',
});

export default function SetHomepagePage() {
  return (
    <>
      <LegacyPage file="set-homepage/index.html" self="/set-homepage" localImages header />
      <OrderedScripts
        srcs={[
          '/static/home/js/jquery-1.8.0.js',
          '/set-homepage/browser.js',
          '/set-homepage/init.js',
        ]}
      />
    </>
  );
}
