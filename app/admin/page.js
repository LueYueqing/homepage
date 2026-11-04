import { cookies } from 'next/headers';
import AdminPanel from '../../components/AdminPanel';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { findUserBySession } from '../../lib/users';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '管理后台 - 哇塔主页',
  robots: { index: false, follow: false },
};

function Frame({ children }) {
  return (
    <>
      <link rel="stylesheet" href="/common/base.a83ad4.css" />
      <style>{`
        .admin-panel { color: #333; }
        .admin-note { color: #666; line-height: 1.7; }
        .admin-message { color: #b42318; }
        .admin-message.ok { color: #067647; }
        .admin-tabs { display: flex; gap: 8px; margin: 8px 0 16px; }
        .admin-tab, .admin-btn {
          border: 0;
          border-radius: 100px;
          padding: 8px 16px;
          background: #fff;
          color: #333;
          cursor: pointer;
        }
        .admin-tab.active, .admin-btn.primary { background: #2c7bf6; color: #fff; }
        .admin-btn.danger { color: #b42318; }
        .admin-btn:disabled { opacity: 0.45; cursor: default; }
        .admin-form, .admin-search { margin: 12px 0 18px; }
        .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .admin-form label, .admin-search { display: block; color: #666; font-size: 13px; }
        .admin-form input, .admin-form textarea, .admin-form select, .admin-search input, .admin-search select, .admin-photo input, .admin-photo select {
          display: block;
          width: 100%;
          box-sizing: border-box;
          margin-top: 4px;
          padding: 8px 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          color: #333;
          background: #fff;
        }
        .admin-checks { display: flex; flex-wrap: wrap; gap: 8px 14px; margin: 12px 0; }
        .admin-checks label, .admin-inline { display: flex; align-items: center; gap: 6px; color: #333; }
        .admin-checks input, .admin-inline input { width: auto; margin: 0; }
        .admin-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .admin-search { display: flex; gap: 8px; align-items: center; }
        .admin-search input, .admin-search select { margin-top: 0; }
        .admin-list { display: flex; flex-direction: column; gap: 10px; }
        .admin-site {
          display: grid;
          grid-template-columns: 48px 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 10px;
          background: #fff;
          border-radius: 10px;
        }
        .admin-site img, .admin-icon-empty { width: 48px; height: 48px; object-fit: contain; background: #f3f3f3; border-radius: 8px; }
        .admin-site strong { margin-right: 8px; }
        .admin-site em { margin-right: 8px; color: #888; font-style: normal; font-size: 12px; }
        .admin-site span, .admin-url { display: block; color: #666; word-break: break-all; }
        .admin-photos {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
        }
        .admin-photo { display: flex; flex-direction: column; gap: 8px; padding: 8px; background: #fff; border-radius: 10px; }
        .admin-photo img { width: 100%; height: 120px; object-fit: contain; background: #111; border-radius: 8px; }
        .admin-pager { display: flex; justify-content: center; align-items: center; gap: 14px; margin: 16px 0; color: #666; }
        .admin-panel a { color: #2c7bf6; }
        @media (max-width: 720px) {
          .admin-grid, .admin-site { grid-template-columns: 1fr; }
        }
      `}</style>
      <SiteHeader />
      <div id="grayDiv">
        <div id="widthDiv">
          <div className="textMain">
            <div className="textDiv">
              <h1 className="fontTitle1">管理后台</h1>
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

export default async function AdminPage() {
  let user = null;
  let failed = false;
  try {
    const jar = await cookies();
    user = await findUserBySession(jar.get('wa_session')?.value || '');
  } catch {
    failed = true;
  }
  if (failed) return <Frame><p>管理页暂时打不开，请稍后再试。</p></Frame>;
  if (!user) {
    return <Frame><p>请先用管理员微信登录。<a href="/wechat/login?next=/admin">微信登录</a></p></Frame>;
  }
  if (!user.is_admin) return <Frame><p>这个账号不是管理员。</p></Frame>;
  return <Frame><AdminPanel name={user.user_name} /></Frame>;
}
