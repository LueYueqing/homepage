const LINKS = [
  ['/', '哇塔首页'],
  ['/about', '关于我们'],
  ['/contact', '联系'],
  ['/guide', '使用指南'],
  ['/set-homepage', '设为主页'],
  ['/guide', '常见问题解答'],
  ['/terms', '服务条款'],
  ['/privacy', '隐私政策'],
];

export default function SiteFooter() {
  return (
    <div id="bottomDiv" style={{ margin: 0, padding: 0 }}>
      <div id="botWidthDiv">
        <div id="botLink">
          {LINKS.map(([href, label], index) => (
            <span key={label}>
              {index > 0 ? '\u00a0\u00a0\u00a0\u00a0' : null}
              <a href={href}>{label}</a>
            </span>
          ))}
        </div>
        <div id="bottom-text-box">
          <div id="botCopyright">
            ©2026 whatab.com{'\u00a0\u00a0'}
            <a id="bottom-beian" href="http://beian.miit.gov.cn/" target="_blank" rel="noreferrer">粤ICP备2021102007号-15</a>
            {'\u00a0\u00a0'}东莞市梦霓科技有限公司
          </div>
        </div>
      </div>
    </div>
  );
}
