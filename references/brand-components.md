# viaim 演示组件契约

本文件用于在不同页型之间复用信息结构，避免每页临时发明一套组件。先选内容角色，再选择对应风格已有的类；不要为了“丰富”而堆叠组件。

## 强调色角色

模板提供三种语义角色，禁止直接把 `#FF3B0F` 用在所有文字上：

- `--accent-ink`：浅色页面上的小标签、小标题、时间线名称。viaim 固定映射为 Silent Black，确保可读。
- `--accent-display`：大数字、大字号结论和满足大字对比度要求的重点，映射为 Vision Orange。
- `--accent-on` / `--accent-on-text`：Vision Orange 色块上的文字，固定为 Blank State。禁止橙底黑字。

深色页面中 `--accent-ink` 与 `--accent-display` 都可使用 Vision Orange；橙底页面中二者自动切换为 Blank State。组件只引用语义 token，不写裸 hex。

## 组件选择表

| 内容角色 | 风格 A | 风格 B | 必需结构 | 不要这样做 |
|---|---|---|---|---|
| 页眉 / 页脚 | `.chrome` / `.foot` | `.chrome-min` / `.foot` | 页码、章节或状态中至少一项；信息短且一致 | 每页换位置、加入长句 |
| 封面 / 幕封 | Layout 1 / 2 | `SWISS-COVER-ASCII` / S01 | 一个主结论、一个短副标、必要元信息 | 把封面做成目录或六卡片 |
| 数据组 | `.stat` / `.stat-card` | `.kpi-hero` / `.kpi-thin` / S06 / S20 / S21 | 数值、单位、口径或注释 | 只有大数字，没有口径 |
| 引言 / 观点 | `.callout` / Layout 8 | S09 / S12 | 观点、来源或说话者；一页一个主观点 | 伪造引用或堆三条金句 |
| 流程 | `.pipeline` / Layout 6 | S02 / S11 / S14 | 3–7 步；每步动作动词开头 | 用流程表达并列特性 |
| 对比 | Layout 9 | S03 / S08 | 两侧维度一致，差异能逐项配对 | 左右信息层级不对称 |
| 单图证据 | `.frame-img` + `.img-cap` | S22 / `.frame-img` + caption | 图片、说明、来源或口径 | 图片无说明、截图关键文字被裁掉 |
| 多图证据 | Layout 5 | S15 / S16 图片格 | 同比例、同高度、统一 caption 密度 | 混用 contain / cover 或比例 |
| 账单 / 清单 | 列表或 Layout 6 的文本变体 | S16 / `.stacked-ledger` | 行号、短标题、说明或状态 | 用卡片墙承载长段正文 |

## 组件使用顺序

1. 先判断页面是“结论、证据、过程、对比、数据”中的哪一种。
2. 一页只选一个主组件；页眉页脚和 caption 不计入主组件。
3. 数据页必须写口径；图片页必须写说明；引用页必须写来源或明确标注为内部观点。
4. 使用现有布局骨架，不创建同义新 class。需要轻微变化时优先调 token、间距和槽位。
5. 交付前检查标题、组件和底部导航之间的实际像素距离，不以 DOM 结构代替视觉验收。

## 可选结构标记

复杂 deck 可以在主组件容器上增加 `data-component`，便于审阅和后续自动检查：

```html
<div data-component="stats" class="kpi-tower-row">…</div>
<figure data-component="figure" class="frame-img">…</figure>
<div data-component="compare" class="duo-compare">…</div>
```

可用值：`chrome`、`cover`、`stats`、`quote`、`process`、`compare`、`figure`、`gallery`、`ledger`。这只是结构元数据，不用于改变视觉样式。
