import SiteFooter from '../../../components/SiteFooter';
import SiteHeader from '../../../components/SiteHeader';
import UploadBackgrounds from '../../../components/UploadBackgrounds';

export const metadata = {
  title: '上传背景图 - 哇塔主页',
  robots: { index: false, follow: false },
};

export default function UploadPage() {
  return (
    <>
      <link rel="stylesheet" href="/common/base.a83ad4.css" />
      <style>{`
        .upload-panel { color: #333; line-height: 1.7; }
        .upload-row { display: flex; align-items: center; gap: 16px; margin: 18px 0 8px; }
        .upload-btn {
          display: inline-block;
          padding: 8px 18px;
          border-radius: 100px;
          background: #fff;
          color: #333;
          text-decoration: none;
          cursor: pointer;
          border: 0;
        }
        .upload-btn.disabled, .upload-btn:disabled { opacity: 0.55; cursor: default; }
        .upload-submit {
          border: 0;
          border-radius: 100px;
          padding: 8px 18px;
          background: #2c7bf6;
          color: #fff;
          cursor: pointer;
        }
        .upload-submit:disabled { opacity: 0.45; cursor: default; }
        .upload-pending { margin: 8px 0 0; padding-left: 18px; color: #666; font-size: 14px; }
        .upload-btn input { display: none; }
        .upload-note, .upload-message { color: #666; font-size: 14px; }
        .upload-message { color: #b42318; }
        .vip-box { margin: 0 0 18px; padding: 14px 16px; background: #fff; border-radius: 10px; }
        .vip-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 10px; }
        .vip-qr { display: block; width: 220px; height: 220px; margin-top: 12px; background: #fff; }
        .upload-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
          gap: 14px;
          margin-top: 22px;
        }
        .upload-card {
          position: relative;
          aspect-ratio: 16 / 9;
          border-radius: 8px;
          background: #e7e7e7 center / cover no-repeat;
          overflow: hidden;
        }
        .upload-pager {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 18px;
          color: #666;
          font-size: 14px;
        }
        .upload-card button {
          position: absolute;
          right: 8px;
          bottom: 8px;
          border: 0;
          border-radius: 100px;
          padding: 4px 10px;
          background: rgba(255,255,255,0.92);
          cursor: pointer;
        }
      `}</style>
      <SiteHeader current="/set-homepage/upload" />
      <div id="grayDiv">
        <div id="widthDiv">
          <div className="textMain">
            <div className="textDiv">
              <h1 className="fontTitle1">上传背景图</h1>
              <br /><br /><br /><br />
              <UploadBackgrounds />
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
