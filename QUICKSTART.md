# viaim Brand PPT Skill · 同事快速上手

这是一套让 AI 按 viaim 品牌规范生成网页 PPT 的工作流。你只需要准备内容和素材，Skill 会完成结构规划、版式选择、HTML 生成、演讲者备注、校验和截图，并可按需直接输出原生可编辑 PPTX。

## 1. 安装

把整个 `viaim-brand-ppt-skill` 文件夹复制到:

```text
~/.agents/skills/viaim-brand-ppt-skill/
```

确认下面这个文件存在:

```text
~/.agents/skills/viaim-brand-ppt-skill/SKILL.md
```

然后在 Codex 中新建一个任务。Skill 已安装时,直接从下一步开始。

## 2. 准备四样东西

1. 主题和目标:这份 PPT 要解决什么问题。
2. 受众和场景:内部汇报、产品发布、客户提案还是公开分享。
3. 页数或演讲时长:例如 15 分钟约 10 页,30 分钟约 20 页。
4. 素材:大纲、文档、数据、图片、截图、Logo 或旧 PPT。数据最好附来源和统计口径。

## 3. 复制这段提示词

```text
用 viaim-brand-ppt-skill 制作一份 PPT。

主题:
目标:
受众与场景:
页数或时长:
风格:B 瑞士国际主义风 / A 电子杂志风
输出格式:HTML / PPTX / 两者都要
已有素材:
必须包含:
禁止出现:

请先给出“页码 → 版式 → 选用理由 → 图片槽位”的规划,确认内容形状与版式匹配后再生成。
最终交付指定格式、演讲者备注和逐页截图，并运行品牌、Logo、中文排版、标题换行和演讲者模式校验。PPTX 必须是原生可编辑版，禁止整页截图，禁止以 Keynote 为转换中间层；HTML 作为交互完整版保留。
```

不知道选哪种风格时:

- 数据汇报、科技产品、路线图、流程图:选 B。
- 人文分享、行业观察、照片较多:选 A。

## 4. 第一次试用示例

```text
用 viaim-brand-ppt-skill 做一份 10 页的季度产品复盘。
受众是产品、设计和研发团队,演讲 15 分钟,使用 B 瑞士国际主义风。
必须包含目标、3 个核心数据、用户反馈、问题诊断、下季度路线图和结尾行动项。
数据缺口请明确标记,不要编造。输出 index.html、演讲者备注和逐页截图。
```

如果需要发给使用 Windows PowerPoint、macOS PowerPoint 或 Keynote 的同事，在最后加一句：

```text
输出格式选择“两者都要”：保留交互版 index.html，并直接生成原生可编辑 .pptx；文字、色块、线条、卡片和数据条必须可单独编辑，禁止整页截图，禁止先生成 .key 再转 .pptx。把讲稿写入原生演讲者备注，导出后重新渲染并核对页数。
```

## 5. 看稿和演示

- 浏览器打开 `index.html`。
- `←` / `→`:翻页。
- `Esc`:查看全部页面。
- `P`:打开演讲者模式和备注。
- `B`:切换低功耗静态模式。

重点检查内容是否真实、标题是否清楚、数据口径是否一致、图片是否有版权或授权问题。品牌硬规则由 Skill 和校验器处理,但最终内容仍需人工确认。

## 6. 常见修改指令

```text
第 6 页信息太密,保留数据和结论,换成更合适的已登记版式,不要只缩小字号。
```

```text
把第 3-5 页统一为浅底,只用 #FF3B0F 做重点强调,禁止橙底黑字。
```

```text
检查所有大标题:字重 500、行高 130%、无斜体、无孤字成行,然后重新截图。
```

```text
给每页补充 3-5 条演讲者备注,并按 20 分钟总时长重新分配时间。
```

## 7. 交付前必须通过

```bash
node ~/.agents/skills/viaim-brand-ppt-skill/scripts/validate-brand-theme.mjs path/to/index.html
node ~/.agents/skills/viaim-brand-ppt-skill/scripts/validate-logo.mjs path/to/index.html
node ~/.agents/skills/viaim-brand-ppt-skill/scripts/validate-chinese-typesetting.mjs path/to/index.html
node ~/.agents/skills/viaim-brand-ppt-skill/scripts/validate-title-wrap.mjs path/to/index.html
node ~/.agents/skills/viaim-brand-ppt-skill/scripts/validate-presenter-mode.mjs path/to/index.html
```

瑞士风再运行:

```bash
node ~/.agents/skills/viaim-brand-ppt-skill/scripts/validate-swiss-deck.mjs path/to/index.html
```

如果任一脚本报错,先修复再交付。

## 品牌硬规则

- 五色:#F2F1F1、#FFFFFF、#FF3B0F、#666666、#000000。
- #FF3B0F 是唯一高饱和强调色。
- 小字号重点用 `--accent-ink`，大数字和大字号结论用 `--accent-display`；禁止把未来橙直接铺到所有文字。
- 禁止橙底黑字;橙底使用白字。
- 页面主标题字重 500,大标题行高 130%。
- 全文禁止斜体,中文标题和正文禁止孤字成行。
- Logo 不得变形或改路径,只能等比缩放和改为品牌色。
- Logo PNG 禁止使用网页截图或放大低清文件；必须由 SVG 母版生成。独立 PNG 默认 2360×640 透明底，PPTX 内默认按显示尺寸 8× 导出。
- 中文遵守 CLReq 和中文文案排版规则。
