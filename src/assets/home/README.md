# 首页小狼素材

`bozery-cutout.png` 是使用内置 image_gen 从 `../oc/oc-01.jpg` 生成的透明底首页版本，保留了原文件。生成式处理可能带来笔触和轮廓的细微差别；图集继续展示原画。

首页通过 Astro 输出带透明通道的 WebP 和响应式尺寸。以后如有画师提供的透明原稿，可以替换此首页素材。

`/concept/` 当前使用 `bozery-reference-sheet.png` 中标注“三分之二”的彩色头部，作为小尺寸首页头像。该文件是用户提供的 OC 双视图原件副本；Astro 转为 WebP 后，用 SVG 视口截取头部区域，没有重绘角色。头像仅出现在预览主页。

此前尝试的原比例角色线稿 `bozery-lineart.png` 已从页面撤下，保留素材制作记录和完整提示词：[LINEART.md](./LINEART.md)。

## 生成提示词

Use case: background-extraction. Asset type: transparent PNG cutout for the homepage of the character owner's personal website. Edit target: the provided original square illustration. Primary request: remove ONLY the plain white background outside the character, producing a genuinely transparent alpha background. Preserve the original wolf illustration as exactly as possible: identical pose, expression, silhouette, proportions, golden eyes, cyan/turquoise fur, pale white and lavender fur, black outlines, blue outer outline, brush texture, every limb and large curled tail. Keep the white areas INSIDE the character opaque. Keep the full character entirely in frame with a small transparent margin on all sides, square canvas. Do not redraw, redesign, retouch, add detail, change color, add a backdrop, add light, add shadow, add text or add any other object. Output the original character cleanly isolated with real transparency, no white fringe and no checkerboard pixels.
