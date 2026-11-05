# viaim 五色品牌主题 · Style A

风格 A 使用 viaim 五色品牌系统：Signal Fog 纸面、Blank State 表面、Silent Black 正文、Neutral Ash 次级信息，Vision Orange 是唯一高饱和强调色。完整色值见 `brand-colors.md`。

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
--ink:var(--brand-silent-black);
--paper:var(--brand-signal-fog);
--paper-tint:var(--brand-blank-state);
--ink-tint:var(--brand-neutral-ash);
--brand:var(--brand-vision-orange);
--brand-on:var(--brand-blank-state);
--accent:var(--brand-vision-orange);
--accent-ink:var(--brand-silent-black);
--accent-display:var(--brand-vision-orange);
--accent-on:var(--brand-blank-state);
--accent-on-text:var(--brand-blank-state);
--title-line-height:1.3;
```

只允许在 `:root` 的五个品牌 token 定义中写品牌 hex。页面与组件使用语义别名和品牌 RGB token 的透明度派生值。

## 角色分配

| 角色 | Token | 使用范围 |
|---|---|---|
| 页面底色 | Signal Fog / `--paper` | 章节页、浅色画布 |
| 白色表面 | Blank State / `--paper-tint` | 卡片、留白、品牌橙底文字 |
| 主标题与正文 | Silent Black / `--ink` | 常规阅读内容、深色页面 |
| 次级信息 | Neutral Ash / `--ink-tint` | 辅助文字、图例、元信息 |
| 小字号强调 | `--accent-ink` | kicker、时间、类别、短标签；浅色页默认 Silent Black，深色页可切 Vision Orange |
| 展示级强调 | `--accent-display` | 大数字、大结论、短展示标题；固定 Vision Orange |
| 品牌橙表面文字 | `--accent-on` / `--accent-on-text` | 品牌橙底的大标题、短标签与必要 UI；固定 Blank State |

## 对比度边界

- 品牌橙底禁止黑字；Blank State 白字对 Vision Orange 为 3.57:1，只用于大标题、短标签和必要 UI。
- Vision Orange 文字在 Signal Fog 上为 3.12:1，只通过 `--accent-display` 用于大字、粗线、图形和非文本强调；小字号强调必须走 `--accent-ink`。
- Neutral Ash 在 Signal Fog 上为 5.09:1，可用于普通字号次级信息。
- 长正文和小字号说明放在 Signal Fog、Blank State 或 Silent Black 区域。

## 使用规则

- 一份 deck 只使用 Vision Orange `#FF3B0F` 作为高饱和 accent。
- 不直接把 `--accent` 当成通用文字色；按小字号 `--accent-ink`、展示级 `--accent-display`、品牌橙底 `--accent-on` 分工。
- 禁止品牌橙底黑字、旧版橙色、额外高饱和色与裸 hex。
- 所有页面主标题固定 `font-weight:500`、`line-height:130%`，全文禁止斜体。
- 读取 `chinese-typesetting.md`，执行行首行尾禁则、中英文空格和孤字规则。
- 读取 `assets/logo/README.md`；Logo 不变形、不改路径，只能等比缩放并显示为五色品牌 token。
