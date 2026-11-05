# viaim 五色品牌系统

本文件是 viaim Brand PPT Skill 的颜色真值源。除透明度派生值外，页面、图表、Logo 和装饰图形只能从以下五个品牌色 token 取色。

| 英文名 | 中文名 | HEX | RGB | CMYK | Pantone | 类别 | PPT 语义角色 |
|---|---|---|---|---|---|---|---|
| Signal Fog | 信号灰 | `#F2F1F1` | 242 / 241 / 241 | C4 M3 Y3 K0 | — | 品牌主色 | 页面底色、浅色分区 |
| Blank State | 基准白 | `#FFFFFF` | 255 / 255 / 255 | C0 M0 Y0 K0 | — | 品牌主色 | 卡片、留白、品牌橙底文字 |
| Vision Orange | 未来橙 | `#FF3B0F` | 255 / 59 / 15 | C0 M86 Y91 K0 | 172 C / Orange 021 U | 品牌主色 | 唯一高饱和强调色 |
| Neutral Ash | 系统灰 | `#666666` | 102 / 102 / 102 | C3 M3 Y6 K72 | Cool Gray 10 C / U | 辅助色 | 次级文字、图例、辅助线 |
| Silent Black | 静默黑 | `#000000` | 0 / 0 / 0 | C0 M0 Y0 K100 | Black C / U | 辅助色 | 主标题、正文、深色页面 |

## 标准 token

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
```

模板可以保留 `--paper`、`--surface`、`--ink`、`--accent` 和 `--accent-on` 等语义别名，但这些别名必须指向上面的品牌 token，禁止另起一套裸 hex。

## 使用边界

- Vision Orange 是唯一高饱和强调色；其余四个颜色是背景、表面和文字层级，不是四个额外 accent。
- 默认浅色页面使用 Signal Fog，白色卡片使用 Blank State，主文字使用 Silent Black，次级文字使用 Neutral Ash。
- 品牌橙底禁止黑字。橙底统一用 Blank State；其 3.57:1 的对比度只适合大标题、短标签和必要 UI，不承载长正文或小字号说明。
- Vision Orange 文字放在 Signal Fog 上为 3.12:1，只用于大数字、短标题、图表标记和非文本装饰。
- Neutral Ash 在 Signal Fog 和 Blank State 上分别达到 5.09:1 与 5.74:1，可用于普通字号的次级信息。
- 边框、网格和弱化层级优先使用 Silent Black 或 Neutral Ash 的透明度派生值，不新增第六个灰色 hex。
- Vision Orange 固定为 `#FF3B0F`；禁止误用近似橙色。Logo 母版作为不可编辑的几何源，通过 mask 或等价方式显示为本文件定义的品牌色。
