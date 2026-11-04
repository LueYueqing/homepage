import SiteFooter from '../../../components/SiteFooter';
import SiteHeader from '../../../components/SiteHeader';
import UploadBackgrounds from '../../../components/UploadBackgrounds';

export const metadata = {
  title: '上传壁纸 - 哇塔主页',
  description: '登录后上传自己的壁纸。首页选择「自选」会轮播这些图片，也可以到分享主页把它们分享给别人。',
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
        .upload-progress {
          position: relative;
          height: 28px;
          margin-top: 12px;
          border-radius: 100px;
          background: #eee;
          overflow: hidden;
        }
        .upload-progress-bar {
          height: 100%;
          background: #2c7bf6;
          transition: width .2s;
        }
        .upload-progress span {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          color: #333;
        }
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
          align-items: start;
        }
        .upload-card {
          position: relative;
          border-radius: 8px;
          background: #e7e7e7;
          overflow: hidden;
        }
        .upload-card img {
          display: block;
          width: 100%;
          height: auto;
          cursor: pointer;
        }
        .crop-layer {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.72);
        }
        .crop-stage {
          position: relative;
          max-width: calc(100vw - 64px);
          max-height: calc(100vh - 64px);
        }
        .crop-stage > img {
          display: block;
          max-width: calc(100vw - 64px);
          max-height: calc(100vh - 64px);
          user-select: none;
        }
        .crop-box {
          position: absolute;
          z-index: 2;
          box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);
          outline: 2px solid #fff;
          outline-offset: -2px;
          touch-action: none;
        }
        .crop-box.x { cursor: ew-resize; }
        .crop-box.y { cursor: ns-resize; }
        .crop-nav {
          position: absolute;
          z-index: 4;
          top: 50%;
          width: 42px;
          height: 42px;
          margin-top: -21px;
          border: 0;
          border-radius: 50%;
          background: rgba(255,255,255,0.92);
          color: #333;
          font-size: 28px;
          line-height: 42px;
          cursor: pointer;
        }
        .crop-nav.prev { left: 12px; }
        .crop-nav.next { right: 12px; }
        .crop-nav:disabled { opacity: 0.35; cursor: default; }
        .crop-close, .crop-apply {
          border: 0;
          border-radius: 100px;
          padding: 8px 16px;
          cursor: pointer;
        }
        .crop-close {
          position: absolute;
          z-index: 4;
          top: 12px;
          left: 12px;
          background: rgba(255,255,255,0.92);
          color: #333;
        }
        .crop-actions {
          position: absolute;
          z-index: 4;
          top: 12px;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .crop-apply { background: #2c7bf6; color: #fff; }
        .crop-apply:disabled, .crop-delete:disabled { opacity: 0.45; cursor: default; }
        .crop-delete {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: #d92d20;
          cursor: pointer;
        }
        .crop-delete svg { width: 18px; height: 18px; fill: #fff; display: block; }
        .crop-error {
          position: absolute;
          z-index: 3;
          left: 12px;
          right: 12px;
          bottom: 12px;
          margin: 0;
          color: #fff;
          text-align: center;
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
              <h1 className="fontTitle1">上传壁纸</h1>
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
