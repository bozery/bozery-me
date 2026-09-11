# Bozery

Astro 个人网站。页面包括主页、随笔、图集、关于，使用连续的海色动态背景。正式地址：https://bozery.me 。

## 本地命令

- npm run dev -- --background：启动后台开发预览。
- npm run astro -- dev status：查看当前预览地址。
- npm run astro -- dev stop：停止预览。
- npm run build：生成生产文件到 dist。
- npm run preview：预览生产构建。

## 关于页和联系方式

编辑 src/data/profile.ts。

homeTagline 设置主页短句；aboutTitle 设置关于页标题；paragraphs 每个字符串是一段正文。contactHeading 设置联系方式的小标题。
contacts 每条包含 label（平台名）、value（账号）、可选 url（https://、mailto: 或 tel: 地址）与 icon（图标）。
没有填写联系方式时，不显示整个联系方式区块。有链接时点击图标跳转；只有账号时点击图标复制，并显示账号。
icon 可填 x、qq 或 link。当前配置为 X @_bozery 和 QQ 1738983866。
请只填准备公开的信息。

## 图集与画师配置

1. 把图片放到 src/assets/oc/，名称为 oc-14.jpg、oc-15.png 等。支持 jpg、jpeg、png、webp。
2. 在 src/data/artworks.ts 找到对应编号，填写已确认的信息。

字段如下：

| 字段 | 用途 |
|---|---|
| title | 作品标题。空白时显示作品编号。 |
| kind | commission 表示委托；personal 表示自绘。不确定时省略。 |
| artist | 画师署名。 |
| artistUrl | 画师主页的完整 http 或 https 链接。 |
| description | 作品说明，保留换行。 |
| date | 作品日期，可写到年、月或日。 |
| alt | 给屏幕阅读器使用的画面描述。 |

空字段不会显示“待填写”。不自动把图片归类为委托，也不推断作者。
画师署名会同时出现在缩略图下方和大图详情中，有链接时可点击打开。

示例（请换成真实资料）：

```ts
'oc-14': {
  title: '作品标题',
  kind: 'commission',
  artist: '画师名字',
  artistUrl: 'https://画师的主页',
  description: '想留下的作品说明',
  date: '2026-09',
},
```

一幅作品使用一个唯一编号。不同扩展名的图片不要共用相同编号。
仅补充署名等信息时，不需要改图片文件。

## 随笔和建站小记

在 src/content/blog/ 新建 .md 或 .mdx 文件：

```md
---
title: '文章标题'
description: '这篇文章讲什么'
pubDate: '2026-09-11'
category: '随笔'
---

正文。
```

category 可填“随笔”或“建站小记”，省略时使用“随笔”。
可选字段 updatedDate、heroImage、heroImageAlt 分别设置修订日期、封面相对路径、封面描述。
首页不展示文章简介；随笔列表按发布日期自动归入年度，年份和每年内的文章均倒序排列。日期和年份统一按北京时间计算，新增年度不需要手动建栏目。RSS 自动同步。
文件名决定文章 URL，改标题不会改变旧链接。

## 动画与页面

- src/styles/global.css：共用视觉样式与页面过渡。
- src/scripts/ocean-background.ts：持续运行的海光背景。
- src/components/OceanBackground.astro：跨页面保留背景状态。
- src/components/SiteNav.astro、src/scripts/site-navigation.ts：四个页面的导航及跨页面保留的渐变选中状态。
- src/pages/concept.astro：保留的预览入口，与正式主页共用相同内容，带 noindex。
- src/components/BaseHead.astro：标题、描述、正式域名和分享元数据。

页面内容加载完成后再同时交叉淡入淡出，等待期间保留当前页。没有原生页面过渡支持时直接替换已准备好的页面，不先清空文字。导航支持浏览器前进、后退和快速连续切换。手机导航采用无框布局，共用一条会移动和渐变的指示线。左上角标志固定在屏幕上，手机上下边缘通过渐隐遮罩避免滚动内容与操作区重叠。

暂停动态会跨站内导航保留；系统设置“减少动态效果”时默认静止；切换到其他浏览器标签后停止渲染。
无法运行动态背景时仍有静态海色背景，导航、文章和图集可照常使用。
图集支持键盘打开、Esc 关闭、点击弹窗外关闭，关闭后返回原链接焦点。
所有图片和字体都由本站提供，不需要访问参考网站。

## 图标来源

- X 图标来自 Simple Icons：https://simpleicons.org/ 。
- QQ 图标来自 Font Awesome Free Brands，CC BY 4.0：https://fontawesome.com/license/free 。SVG 内保留了原始版权注释。

## 字体

主页英文使用 Cormorant Garamond 的斜体字形；中文标题、关于正文和图集作品标题使用 LXGW WenKai Lite 的文楷字形。左上角 BOZERY 保留原字体。

网页字体保存在 public/fonts/，经过重命名、WOFF2 压缩和 Unicode 分包。当前页面的常用字约 106 KB，英文约 17 KB；以后添加的新文字按需加载其他分包，未加载时立即用系统字体显示。许可和原始来源见该目录的 README.md 与 OFL 文件。
