# viaim 五色品牌主题 · Style B

瑞士风以 Blank State 白色卡片叠放于 Signal Fog 页面底色，Silent Black 承担主文字，Neutral Ash 承担辅助信息，Vision Orange 是唯一高饱和 accent。完整色值见 `brand-colors.md`。

## Token

```css
--brand-signal-fog:#F2F1F1;
--brand-signal-fog-rgb:242,241,241;
--brand-blank-state:#FFFFFF;
--brand-blank-state-rgb:255,255,255;
--brand-vision-orange:#FF3B0F;
--brand-vision-orange-rgb:255,59,15;
--brand-neutral-ash:#666666;
--brand-neutral-ash-rgb:102,102,102;
--brand-silent-black:#000000;
--brand-silent-black-rgb:0,0,0;
--paper:var(--brand-signal-fog);
--surface:var(--brand-blank-state);
--ink:var(--brand-silent-black);
--grey-1:var(--brand-signal-fog);
--grey-3:var(--brand-neutral-ash);
--accent:var(--brand-vision-orange);
--accent-ink:var(--brand-silent-black);
--accent-display:var(--brand-vision-orange);
--accent-on:var(--brand-blank-state);
--accent-on-text:var(--brand-blank-state);
--title-line-height:1.3;
```

边框、弱分隔和占位文字使用 Silent Black 或 Neutral Ash 的透明度派生值，不增加第六个灰色 hex。

## 瑞士风使用规则

- 默认浅色页面为 Blank State，灰色分区为 Signal Fog；深色页使用 Silent Black。
- Vision Orange 背景全部使用 Blank State 白字，禁止品牌橙底黑字；小字号长正文移出品牌橙区域。
- 小字号 kicker、年份、类别和标签使用 `--accent-ink`；浅色表面默认 Silent Black，深色表面可切 Vision Orange。
- Vision Orange 文字只通过 `--accent-display` 用于大数字、大结论、图表标记和非文本装饰；品牌橙表面统一使用 `--accent-on` / `--accent-on-text`。
- 所有页面主标题固定 `font-weight:500`、`line-height:130%`；全文禁止斜体。
- 读取 `chinese-typesetting.md`，执行 CLReq 行首行尾禁则、不可拆分符号、孤字不成行，以及中英文/数字空格规则。
- 读取 `assets/logo/README.md`；Logo 不重绘、不裁切、不旋转、不拉伸，只能等比缩放并显示为五色品牌 token。
- 保留直角、纯色、无阴影、无渐变；不混入 viaim 五色系统之外的高饱和颜色。
