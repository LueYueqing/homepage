import { cookies } from 'next/headers';
import ShareHome from '../../components/ShareHome';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { findUserBySession } from '../../lib/users';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '分享我的主页 - 哇塔主页',
  robots: { index: false, follow: false },
};

function Frame({ children }) {
  return (
    <>
      <link rel="stylesheet" href="/common/base.a83ad4.css" />
      <style>{`
        .share-panel { color: #333; }
        .share-note { color: #666; line-height: 1.7; }
        .share-message { color: #067647; }
        .share-message.bad { color: #b42318; }
        .share-btn {
          border: 0;
          border-radius: 100px;
          padding: 8px 16px;
          background: #fff;
          color: #333;
          cursor: pointer;
        }
        .share-btn.primary { background: #2c7bf6; color: #fff; }
        .share-btn.danger { color: #b42318; }
        .share-btn:disabled { opacity: 0.45; cursor: default; }
        .share-list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
        .share-item { padding: 12px; background: #fff; border-radius: 10px; }
        .share-item input {
          display: block;
          width: 100%;
          box-sizing: border-box;
          padding: 8px 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          color: #333;
        }
        .share-meta, .share-actions { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 8px; color: #666; }
        .share-panel a { color: #2c7bf6; }
      `}</style>
      <SiteHeader current="/share" />
      <div id="grayDiv">
        <div id="widthDiv">
          <div className="textMain">
            <div className="textDiv">
              <h1 className="fontTitle1">分享我的主页</h1>
              <br /><br /><br /><br />
              {children}
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}

export default async function SharePage() {
  let user = null;
  let failed = false;
  try {
    const jar = await cookies();
    user = await findUserBySession(jar.get('wa_session')?.value || '');
  } catch {
    failed = true;
  }
  if (failed) return <Frame><p>分享页暂时打不开，请稍后再试。</p></Frame>;
  if (!user) {
    return <Frame><p>请先微信登录后再管理分享。<a href="/wechat/login?next=/share">微信登录</a></p></Frame>;
  }
  return <Frame><ShareHome /></Frame>;
}
