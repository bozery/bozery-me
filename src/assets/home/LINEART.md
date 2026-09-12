# 几何预览的角色线稿

存档文件：`bozery-lineart.png`，1024 × 1536。用户评估后已从 `/concept/` 撤下，当前页面不再引用。

使用内置 `image_gen` 工具，根据用户提供的 OC 双视图里最左侧的原比例立绘转换成未上色的深蓝灰线稿。原始设定图未修改。线稿是生成的衍生预览，并非画师原线稿。此前预览使用 Astro 输出 384、640、896、1024 宽度的 WebP，配合 CSS `mix-blend-mode: multiply`，让纯白背景融入几何画面；相关展示样式现已撤下。

第一轮生成未得到真实透明通道，背景包含灰色棋盘格，因此没有使用该版本。第二轮仅清理背景为白色，最终 PNG 不带 alpha。页面里的几何图形、文字和动效全部使用代码绘制。

## 第一轮：角色转换

```text
Use case: style-transfer / identity-preserve. Asset type: original-character line drawing for a clean graphic personal website.
Input image: supplied wolf reference sheet, an identity and pose reference. Transform ONLY the large full-body FRONT figure at the far LEFT of the sheet into an uncolored ink line drawing; omit every other figure, diagram, label, swatch and background.
Keep that exact character: tall slim athletic adult anthropomorphic wolf, left-facing calm slightly confident head, pointed ears, angular layered mane, long legs, relaxed open left hand and lowered right hand, huge curved bushy tail to the right. Preserve face proportions, fingers, paws, silhouette, fur tufts and pose from the reference.
Style: thoughtful hand-inked illustration, fine dark blue-gray contour lines with subtle natural line-weight variation. Sparse interior lines to describe the face, chest fur, hands, leg joints and tail tufts. Simplify the number of tiny fur strokes while keeping distinctive silhouette. Uncolored paper-white interior. No colored fur, no color accents even in eyes, no shading, no grayscale modeling, no gradients, no hatching, no glow, no glossy or 3D look, no synthetic airbrushed finish. Eyes have outlined irises and small dark pupils; do not fill the paw pads solid.
Composition: one complete standing figure with head, ears, both hands, both feet and entire tail visible, centered within a tall portrait canvas, 7% padding, no cropping.
Background: genuinely transparent outside the character; keep uncolored white interior of character for clarity. Crisp clean alpha edge. No surrounding rectangle or checkerboard baked into the pixels. No words, symbols, frame, watermark, props or additional limbs. Output a single production-ready portrait PNG.
```

## 第二轮：清理背景

```text
Use case: precise-object-edit. Edit target: the provided full-body wolf line drawing. Change ONLY the background. Replace ALL of the gray checkerboard pattern and faint background diagram traces with uniform solid pure white (#FFFFFF). This is a white-paper drawing, NOT a transparency request: no checkerboard, no transparency visualization, no gray pixels in the empty background, no texture or grain. Preserve the existing wolf silhouette, face, pose, fingers, paws, tail, proportions, uncolored white interior and dark blue-gray ink contour exactly. Do not redesign or add detail. Preserve the entire figure with the same framing. No text or symbols. The finished image should look like a carefully inked uncolored character drawing on a completely clean white sheet.
```
