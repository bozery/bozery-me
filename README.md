# Bozery

Astro 个人网站。页面包括主页、随笔、图集、关于，共用连续运行的云海列车 3D 场景。正式地址：https://bozery.me 。

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
icon 可填 x、qq 或 link。
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

- src/styles/global.css：旧版海岸预览样式。
- src/scripts/ocean-background.ts：持续运行的海光背景。
- src/components/OceanBackground.astro：跨页面保留背景状态。
- src/components/SiteNav.astro、src/scripts/site-navigation.ts：四个页面的导航及跨页面保留的渐变选中状态。
- src/pages/index.astro：正式首页，使用云海观景列车。
- src/pages/blog/：正式随笔列表与正文，沿用原文章 URL，直接读取现有文章。
- src/pages/gallery.astro、src/pages/about.astro：同一车厢内的图集和关于，复用现有作品、画师信息与联系方式。
- src/layouts/GeometricLayout.astro、src/components/GeometricBackground.astro：正式布局、搜索与分享元数据，以及跨页面保留的列车画布。
- src/scripts/train-world.ts：Three.js 车厢、云海、高架轨道、持续运行的时钟和四个机位。
- src/scripts/train-book.ts：桌上的立体书，包括封面开启、弯曲纸页和定时翻页。
- src/styles/geometric.css、src/scripts/geometric-scene.ts：阅读排版、导航状态及连续运镜与内容切换的衔接。
- src/pages/concept/coast.astro：上一版明亮海岸静态预览，移到 /concept/coast/ 保留对照。
- src/components/HomeScene.astro：主页和海岸预览共用的名字、短句与角色布局。
- src/scripts/coast-background.ts：静态海岸的水色、沙滩、薄浪和透光纹理，仅在加载、尺寸变化或图形上下文恢复时绘制。
- src/styles/coast-preview.css：静态海岸预览的文字配色、角色阴影与手机上下遮罩。
- src/pages/concept.astro、src/pages/concept/：原列车预览地址跳转至对应正式页面；coast 仍保留为不索引的旧版对照。

页面内容加载完成后再同时交叉淡入淡出，等待期间保留当前页。没有原生页面过渡支持时直接替换已准备好的页面，不先清空文字。导航支持浏览器前进、后退和快速连续切换。手机导航采用无框布局，共用一条会移动和渐变的指示线。左上角标志固定在屏幕上，手机上下边缘通过渐隐遮罩避免滚动内容与操作区重叠。

动画默认持续运行；系统设置“减少动态效果”时静止；切换到其他浏览器标签后暂停渲染。
无法运行动态背景时仍有静态浅色背景，导航、文章和图集可照常使用。
图集支持键盘打开、Esc 关闭、点击弹窗外关闭，关闭后返回原链接焦点。
所有图片和字体都由本站提供，不需要访问参考网站。

### 云海列车正式页面

打开 `/`，四个导航都留在同一节车厢，正式路径为 `/`、`/blog/`、`/gallery/` 和 `/about/`。随笔移向窗边小桌，从上方俯看完整的书、杯子与桌沿；图集转向另一侧的三个画框；关于转向放着台灯、盆栽和行李的安静座位。点文章标题进入正文，沿用随笔机位。顶部导航和浏览器前进、后退均可连续切换。

场景用 Three.js 几何体、程序化材质和云层着色器绘制，素材在本地打包，不使用生成式背景图片或远程模型。窗框、座椅、桌子、书与杯子属于同一空间。场景时钟和画布跨页面保留，切页时相机从当前位置出发，约 2.1 秒到达目标，朝向用四元数插值平稳转动；文字只等待最多 280ms 的退出段，目标页面同时加载。快速切换会接续当前机位，取消导航时回到当前页对应的机位。

首次进入随笔时，书的封面缓缓打开；停留后每隔约 11 秒翻过一页，纸张有轻微弯曲。离开阅读区域后停止安排新翻页，返回时保留已经打开的书和页码，正文与列表共用书的状态。图集画框直接使用现有 OC 作品的优化贴图，首次进入图集才加载；作品列表保留完整原画比例、画师标注与大图弹窗。关于保留原有联系方式及复制功能。

背景默认持续运行，不提供页面开关，也不读取旧的暂停状态。系统减少动态设置关闭背景运动、运镜和入场动画；隐藏标签暂停渲染，图形上下文丢失时显示浅色备用背景，恢复后继续渲染。动画跟随屏幕刷新，不再用跳帧方式限速。静态模型按材质合并，圆角与远景减少细分；哑光表面使用漫反射材质，金属和釉面保留物理材质；静态阴影缓存，只在开书或翻页时更新。云团复用实例，仅更新位移，远处云层使用 12～18 步采样。

3D 画布最多绘制约 180 万像素；持续检测到帧时间偏长时，停稳后逐档降低背景分辨率，最低为初始比例的 70%，避免切页途中跳变或反复变化。文字和图片仍按原生分辨率显示。实际帧率取决于设备与同时运行的应用。手机调整相机视野和阅读遮罩。禁用脚本时仍能通过普通链接阅读。正式页面和文章进入站点地图，保留 canonical、RSS 和分享元数据；旧预览跳转页不进入站点地图。车厢两端均封闭，侧墙、顶板与地板共用长度边界；图集展墙前的座椅为扶手留出了间距。

小头像仅在首页出现，来自用户原设定图中的“三分之二”彩色侧脸，以 SVG 视口裁切显示，没有重绘。先前试用的生成式线稿已撤下，制作记录保留在 `src/assets/home/LINEART.md`。正式主页为 `/`，深海及海岸相关样式不由列车页面加载。

## 图标来源

- X 图标来自 Simple Icons：https://simpleicons.org/ 。
- QQ 图标来自 Font Awesome Free Brands，CC BY 4.0：https://fontawesome.com/license/free 。SVG 内保留了原始版权注释。

## 字体

列车主页英文标题使用 Barlow Condensed ExtraBold，正文使用系统字体。旧版海岸预览保留 Cormorant Garamond 与 LXGW WenKai Lite。

网页字体保存在 public/fonts/，经过重命名、WOFF2 压缩和 Unicode 分包。当前页面的常用字约 106 KB，英文约 17 KB；以后添加的新文字按需加载其他分包，未加载时立即用系统字体显示。许可和原始来源见该目录的 README.md 与 OFL 文件。

列车预览的英文大标题使用本地 Barlow Condensed ExtraBold，中文使用系统无衬线字体。字体来自 Google Fonts 的 `ofl/barlowcondensed` 目录，许可见 `public/fonts/barlow-condensed-OFL.txt`。
