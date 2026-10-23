import LegacyPage from '../components/LegacyPage';
import OrderedScripts from '../components/OrderedScripts';

const HOME_STYLES = [
  '/static/home/css/index/base.9f99ea.css',
  '/static/home/css/index/console.f95946.css',
];

const HOME_SCRIPTS = [
  '/_ext/apps_bdimg_com/libs/jquery/2.1.4/jquery.min.js',
  '/static/home/js/jquery.cookie.min.js',
  '/static/home/js/jquery-ui.min.sortable.js',
  '/static/home/js/index/tool.js',
  '/zhuye/browser.js',
  '/static/home/js/index/search.52bc13.js',
  '/static/home/js/index/keyword.bc4442.js',
  '/static/home/js/index/console.d222c4.js',
  '/static/home/js/index/site.46dbb4.js',
  '/static/home/js/index/base.46dbb4.js',
];

export const metadata = {
  title: '清新主页',
  keywords: '简法,简法主页,简法导航,网址导航',
};

export default function HomePage() {
  return (
    <>
      <style>{`
        body { display: block !important; height: 100%; margin: 0; }
        #home-root {
          width: 100%;
          min-height: 100%;
          display: flex;
          align-items: center;
          position: relative;
        }
      `}</style>
      <LegacyPage id="home-root" file="index.html" self="/" styles={HOME_STYLES} />
      <OrderedScripts srcs={HOME_SCRIPTS} />
    </>
  );
}
