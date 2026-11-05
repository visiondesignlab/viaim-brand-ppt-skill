# viaim Logo 母版

- 文件：`viaim-logo-master.svg`
- 原始尺寸：118 × 32
- `viewBox`：`0 0 118 32`
- SHA-256：`b9fd8b1b3c5f70e32fd9c4744dfc9c88d8b93834bc2f353aeb599b68239f6da0`

## 不可变规则

- 母版按字节原样保存，禁止重绘、改路径、裁切、旋转、倾斜、描边、拆分或重新组合。
- 只允许等比缩放；CSS 必须保持 `aspect-ratio:118 / 32`，不得同时写入不匹配的宽高。
- 只允许改为 `references/brand-colors.md` 定义的五个品牌色。
- 母版包含品牌填充色 `#FF3B0F`。推荐把母版作为 CSS mask，以 `currentColor` 显示为五个品牌 token；这样不改 SVG 路径，也能安全切换允许的品牌色。
- Logo 四周保留最少相当于 Logo 高度 0.5 倍的安全区，不与标题、页码或页面边缘贴合。

## 高清 PNG 硬规则

- SVG 母版始终是唯一几何真值源；PNG 只能由母版自动派生，禁止从网页截图、旧 PPT、聊天图片或低清 PNG 再放大。
- PPTX 中的 Logo PNG 必须至少按页面实际显示尺寸的 **4×** 像素密度生成；Skill 默认使用 **8×**。例如页面中宽 148 px 的 Logo，嵌入 PNG 至少为 592 px 宽，默认应为 1184 px 宽。
- 需要独立交付 Logo PNG 素材时，默认输出透明底 **2360 × 640 px**（母版 20×）；允许继续向下缩小，禁止把较小 PNG 放大使用。
- PNG 必须保持透明背景、`118:32` 比例和完整安全区；禁止 JPG、有色底烘焙、裁切、拉伸、模糊滤镜、阴影、描边或锐化重绘。
- PNG 只允许五个品牌色。改色必须从母版的填充 token 派生，不能修改任何路径。
- 交付前检查 PNG 的真实像素尺寸，不得只看 CSS 宽高或文件预览尺寸。

生成默认高清 Vision Orange PNG：

```bash
RUNTIME_NODE_MODULES="<NODE_MODULES>" \
"<NODE>" "<SKILL_ROOT>/scripts/export-logo-png.mjs" --force
```

一次生成五个品牌色的 2360 × 640 透明 PNG：

```bash
RUNTIME_NODE_MODULES="<NODE_MODULES>" \
"<NODE>" "<SKILL_ROOT>/scripts/export-logo-png.mjs" \
  --all-colors --width 2360 --force
```

脚本必须输出 `LOGO_PNG_HD_OK`，并报告 `transparent=true aspect=118:32`。

## 推荐用法

```html
<span class="brand-logo" role="img" aria-label="viaim"></span>
```

```css
.brand-logo{
  display:block;
  width:118px;
  aspect-ratio:118 / 32;
  color:var(--brand-vision-orange);
  background:currentColor;
  -webkit-mask:url("assets/logo/viaim-logo-master.svg") center / contain no-repeat;
  mask:url("assets/logo/viaim-logo-master.svg") center / contain no-repeat;
}
```
