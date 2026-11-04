const LINKS = [
  ['/', '首页'],
  ['/about', '关于我们'],
  ['/contact', '联系'],
  ['/guide', '使用指南'],
  ['/set-homepage/upload', '上传壁纸'],
  ['/share', '分享主页'],
];

export default function SiteHeader({ current }) {
  return (
    <div id="headDiv">
      <div id="headWidthDiv">
        <a id="headLogo" href="/">
          <img src="/static/home/images/logo_text.svg" alt="哇塔主页" />
        </a>
        <ul>
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} className={current === href ? 'nav-current' : undefined}>
              {label}
            </a>
          ))}
        </ul>
      </div>
    </div>
  );
}
