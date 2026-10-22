# 简法主页（jianfast.com）本地镜像

**采集时间**：2026-10-22
**源站**：https://www.jianfast.com/ ｜ robots.txt 允许全站抓取（`User-agent: * / Disallow:` 空）

---

## 一、怎么打开

### 方式 A：直接双击 `index.html`
最省事，页面与交互均可正常工作。

### 方式 B：起本地服务器（推荐，兼容性最好）
`file://` 协议下浏览器会拦截部分请求，本地服务器无此限制：

```bash
cd E:\MyYunPan\Projects\homepage
python -m http.server 8000
```
然后浏览器打开 http://127.0.0.1:8000/

---

## 二、目录结构

```
homepage/
├── index.html              首页（主页面）
├── offline-shim.js         ★ 离线补丁：拦截后端 XHR，改用本地数据渲染
├── favicon.ico
├── about/index.html        关于
├── contact/index.html      联系方式
├── contract/index.html     用户协议
├── zhinan/index.html       使用指南
├── zhuye/index.html        设为浏览器主页教程
├── qqlogin/index.html      QQ 登录页
├── _api/                   ★ 运行时数据（从线上接口采集的真实 JSON）
│   ├── clogin_raw.json     /home/user/clogin 原始响应
│   ├── siteData.json       18 个导航链接配置
│   ├── engineData.json     12 个搜索引擎配置
│   ├── uiData.json         界面布局配置
│   └── home_bg_ajaxbg.json 壁纸库接口响应
├── static/home/            主站资源
│   ├── css/index/          主样式（含版本哈希后缀）
│   ├── js/                 jQuery + 业务脚本
│   └── images/             图标 / siteimg 导航图标 / searchChoice 搜索引擎图标
├── zhuye/images/           浏览器设置教程截图（29 张）
├── _ext/                   外部 CDN 资源（已本地化）
│   ├── apps_bdimg_com/     jQuery 2.1.4
│   └── cdn_bootcdn_net/    jquery-cookie 1.4.1
├── _mirror_report.json     采集统计
└── _verify_report.json     完整性校验结果
```

---

## 三、这个站是怎么工作的（重要）

简法主页是**登录态动态渲染**的站点，HTML 里**没有导航链接和搜索引擎图标**，
它们在页面加载后由 JS 请求后端接口再插入 DOM：

```
index.html
  └─ site.js 页面加载即发 POST /home/user/clogin
        └─ 返回 { userData, siteData, engineData, uiData }
              └─ JS 把 siteData 渲染成图标网格，engineData 渲染成搜索引擎选项
```

因此**只抓 HTML 会得到一个空壳**。本镜像额外做了两件事：

1. 调用真实接口把 `siteData / engineData / uiData` 存进 `_api/*.json`，
   并下载其中引用的 **30 个导航图标 + 搜索引擎图标**；
2. 写了 `offline-shim.js`，在 `</body>` 前注入，重写 `XMLHttpRequest`，
   把 `/home/user/clogin` 请求就地喂给本地 JSON。**未登录态与线上匿名访客一致**（`user_type: 0`）。

---

## 四、离线能力说明

| 功能 | 离线状态 | 说明 |
|---|---|---|
| 页面导航/链接跳转 | ✅ | 12 个页面全部本地化 |
| 导航图标网格 | ✅ | 18 个链接 + 30 个图标已落盘 |
| 搜索引擎切换 | ✅ | 12 个引擎配置完整 |
| 界面布局设置 | ✅ | uiData 已本地化 |
| 浏览器设置教程页 | ✅ | 29 张截图完整 |
| 背景壁纸（预设库） | ⚠️ 部分 | 已下载默认壁纸；壁纸库接口需登录，见 `_api/home_bg_ajaxbg.json` |
| 登录 / 注册 / 云同步 | ❌ | 依赖后端账号系统，未采集（也不应采集） |
| 「/links/?cu=xxx」跳转 | ❌ | 服务端跳转接口，未采集 |
| 随机壁纸、上传图床 | ⚠️ | 逻辑代码在，但取图走线上 |

> 注：`static/home/images/searchChoice/baiduicon.png` 和 `header.html` 在**线上本身就是 404 死链**，
> 校验报告中的 4 处"缺失"即来源于此，非采集遗漏。

---

## 五、采集脚本

位于 `D:\WorkBuddy\2026-10-22-09-49-18\work\`：

| 脚本 | 作用 |
|---|---|
| `mirror_jianfast.py` | 主镜像：递归页面 + 资源下载 + 链接本地化改写 |
| `fill_assets.py` | 补采 CSS/JS **内部**引用的图标（url() 与字符串路径），并改写 |
| `fetch_api_data.py` | 采集 `/home/user/clogin` 接口数据 + 30 个导航图标 |
| `verify_mirror.py` | 完整性校验：本地引用命中率 / 死链 / 远程残留 |

重跑时注意：`mirror_jianfast.py` 会 **清空** `homepage/` 目录后重建，
跑完需依次执行 `fill_assets.py`、`fetch_api_data.py`，
并重新注入 `offline-shim.js` 的 `<script>` 标签。

---

## 六、统计

- 文件总数：**113**
- 总体积：约 **2.5 MB**
- 页面：12（去重后 9 个独立页面，3 个为 `?btn` 参数副本）
- 静态资源：82（图片 71 / JS 8 / CSS 2 / ICO 1）
- 接口数据：5 个 JSON
- 链接本地化改写：**294 处**（HTML）+ CSS 内 `url()` 改写
- 本地引用命中：**273 处**，无本站远程残留