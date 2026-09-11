# Bozery

Bozery 的角色主页 —— 设定、随笔与图集。

线上地址：<https://bozery.me>

## 技术栈

- [Astro](https://astro.build/) 静态站点
- 部署：Vercel
- 域名与 DNS：Cloudflare

## 本地开发

```sh
npm install
npm run dev
```

打开 http://localhost:4321/

## 目录说明

```
src/
├── components/        # 页头、页脚等公共组件
├── content/blog/      # 随笔文章（Markdown 文件）
├── layouts/           # 页面布局
├── pages/
│   ├── index.astro    # 主页（角色设定）
│   ├── blog/          # 随笔列表与详情
│   ├── gallery.astro  # 图集
│   └── about.astro    # 关于
└── styles/global.css  # 全局样式（主题色等）
```

## 怎么加内容

**写一篇随笔**：在 `src/content/blog/` 新建 `.md` 文件，开头照抄这个格式：

```md
---
title: '标题'
description: '一句话简介'
pubDate: 'Sep 11 2026'
---

正文……
```

**加图片**：把图片放到 `src/assets/`，然后在页面里引用。

**改主题色**：`src/styles/global.css` 里的 `--accent`。

## 命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 本地预览（改代码自动刷新） |
| `npm run build` | 构建生产版本到 `dist/` |
| `npm run preview` | 预览构建结果 |

## Credit

主题基于 Astro 官方 blog 模板，源自 [Bear Blog](https://github.com/HermanMartinus/bearblog/)。
