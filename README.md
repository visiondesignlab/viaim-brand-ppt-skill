# viaim Brand PPT Skill

面向 viaim 品牌分享、产品发布、内部汇报和演讲的 HTML PPT Skill，支持从已验收网页稿直接导出原生可编辑 PPTX。同一份 `.pptx` 可在 Windows PowerPoint、macOS PowerPoint 和 macOS Keynote 中打开，不经过 Keynote 转换，也不使用整页截图。

当前品牌基线:

- Signal Fog 信号灰:`#F2F1F1`
- Blank State 基准白:`#FFFFFF`
- Vision Orange 未来橙:`#FF3B0F`
- Neutral Ash 系统灰:`#666666`
- Silent Black 静默黑:`#000000`
- Vision Orange 是唯一高饱和 accent
- 品牌橙底禁止黑字,统一使用白字;长正文和小字号说明优先放在白底或黑底
- 所有页面主标题固定为 `font-weight:500`
- 所有页面大标题固定为 130% 行高
- 全文禁止斜体,所有文字保持正体
- 中文排版遵守 CLReq 与中文文案排版指北
- Logo 母版禁止变形与路径修改，只能等比缩放和改为五个品牌色；PNG 必须由母版高清派生，独立素材默认 2360×640 透明底，PPTX 内默认 8× 显示尺寸

## 使用

安装后,在 Codex 中提出类似请求:

- “用 viaim 品牌做一份产品发布 PPT”
- “生成一份品牌瑞士风季度汇报”
- “把这份大纲做成 viaim 杂志风网页 PPT”

Skill 会从 `assets/template.html` 或 `assets/template-swiss.html` 生成单文件 HTML deck。用户要求 PowerPoint、Keynote 可打开的版本或跨平台可编辑文件时，再通过 `scripts/export-deck.mjs` 直接输出 16:9 `.pptx` 并保留演讲者备注。标题、正文、色块、线条、卡片和数据条都是独立可编辑对象；照片、Logo、SVG 和图标保留为独立图片对象。

第一次使用或需要转交同事时,直接阅读 [`QUICKSTART.md`](./QUICKSTART.md)。里面包含安装、首条提示词、素材准备、交付校验和常见修改指令。

## 品牌文件

- `SKILL.md`:触发规则与生成工作流
- `references/themes.md`:Style A 品牌 token 和使用边界
- `references/themes-swiss.md`:Style B 品牌 token 与对比度规则
- `references/brand-colors.md`:五色品牌真值源
- `references/chinese-typesetting.md`:中文排版执行规则
- `references/brand-components.md`:跨风格组件契约与强调色角色
- `assets/logo/`:Logo 母版和不可变约束
- `references/image-prompts.md`:带品牌色约束的配图提示词
- `references/screenshot-framing.md`:品牌截图包装策略
- `references/export-formats.md`:HTML 与原生可编辑 PPTX 输出契约
- `scripts/validate-brand-theme.mjs`:品牌色守卫
- `scripts/export-deck.mjs`:HTML DOM → 原生可编辑 PPTX 直接导出
- `scripts/export-logo-png.mjs`:SVG 母版 → 高清透明五色 Logo PNG

修改品牌颜色或主题文件后运行:

```bash
node scripts/validate-brand-theme.mjs
node scripts/validate-logo.mjs
node scripts/validate-chinese-typesetting.mjs path/to/index.html
```

必须得到:

```text
BRAND_THEME_OK palette=5
```
