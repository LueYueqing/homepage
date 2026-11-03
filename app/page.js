import LegacyPage from '../components/LegacyPage';
import OrderedScripts from '../components/OrderedScripts';
import { HOME_DESCRIPTION, HOME_TITLE, homeJsonLd, pageMeta } from '../lib/seo';

export const metadata = pageMeta({
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  path: '/',
});

const HOME_STYLES = [
  '/static/home/css/index/base.9f99ea.css',
  '/static/home/css/index/console.f95946.css',
];

const HOME_SCRIPTS = [
  '/_ext/apps_bdimg_com/libs/jquery/2.1.4/jquery.min.js',
  '/static/home/js/jquery.cookie.min.js',
  '/static/home/js/jquery-ui.min.sortable.js',
  '/static/home/js/index/tool.js',
  '/set-homepage/browser.js',
  '/static/home/js/index/search.52bc13.js',
  '/static/home/js/index/keyword.bc4442.js',
  '/static/home/js/index/console.d222c4.js',
  '/static/home/js/index/site.46dbb4.js',
  '/static/home/js/index/base.46dbb4.js',
];

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
        #site-legal {
          position: fixed;
          z-index: 30;
          left: 50%;
          bottom: 16px;
          transform: translateX(-50%);
          display: flex;
          gap: 16px;
          padding: 6px 14px;
          border-radius: 100px;
          background: rgba(0,0,0,0.28);
          font-size: 12px;
          line-height: 1.4;
        }
        #site-legal a { color: #fff; text-decoration: none; white-space: nowrap; }
      `}</style>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <LegacyPage id="home-root" file="index.html" self="/" styles={HOME_STYLES} />
      <OrderedScripts srcs={HOME_SCRIPTS} />
    </>
  );
}
