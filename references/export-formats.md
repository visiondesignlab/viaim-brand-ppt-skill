# 输出格式与转换规则

## 支持的交付物

| 格式 | 用途 | 可编辑性 | 跨平台 | 保留内容 |
|---|---|---|---|---|
| HTML | 正式现场演示、网页分享 | 可编辑 HTML / CSS / JS | 浏览器 | 动效、演讲者模式、观众屏同步、备注 |
| PPTX 原生可编辑版 | 团队协作、客户交付、离线播放 | 文字、色块、线条、数据条和基础图形可逐个编辑 | Windows PowerPoint、macOS PowerPoint、macOS Keynote | 静态版式、原生演讲者备注 |

导出器直接把 HTML DOM 的最终静态状态映射为 PowerPoint 对象，不经过 Keynote，也不把整页截图设为页面主体。输出日志必须包含：

```text
full_slide_rasters=0 keynote_handoff=none
```

照片、Logo、SVG 和图标在 PPTX 中会作为独立图片对象存在；这属于素材自身的对象类型，不等于整页栅格化。正文、标题、色块、分隔线、卡片和数据条必须是可编辑对象。

## macOS 与 Windows 使用方式

- Windows：用 PowerPoint 直接打开同一份 `.pptx`。
- macOS：用 PowerPoint 或 Keynote 直接打开同一份 `.pptx`。
- 禁止先生成 `.key` 再转 `.pptx`，也禁止把 Keynote 作为转换中间层。
- 只有用户明确要求 Keynote 专属文件时，才允许在交付后由用户另存为 `.key`；Skill 本身不依赖此步骤。

## 静态 PPTX 不包含的网页能力

- WebGL、ASCII canvas 和 Motion One 动态过程
- `Esc` 网页总览
- `P` 网页演讲者控制台
- 观众屏同步、激光笔、圈选、黑白屏与冻结

导出器会读取开启低功耗模式后的最终静态状态，将可见内容翻译为原生对象。HTML 应作为交互完整版保留，PPTX 作为跨平台可编辑版交付。

## 输出参数

生成前询问用户：

```text
输出格式：HTML / PPTX / 两者都要
PPTX 模式：原生可编辑（默认且唯一）
```

如果用户没有指定，默认只交付 HTML。用户要求 PowerPoint、PPTX、可编辑版本、跨平台演示文件或“两者都要”时，必须运行导出脚本。

## 命令

先通过 Codex 的 workspace dependencies 取得并设置这三个环境变量：

- `RUNTIME_NODE`：Node.js executable
- `RUNTIME_NODE_MODULES`：Node.js packages
- `RUNTIME_BIN_DIR`：Override binaries

然后运行：

```bash
RUNTIME_NODE="<NODE>" \
RUNTIME_NODE_MODULES="<NODE_MODULES>" \
RUNTIME_BIN_DIR="<BIN_DIR>" \
"<NODE>" "<SKILL_ROOT>/scripts/export-deck.mjs" \
  "path/to/index.html" \
  --format pptx \
  --logo-scale 8
```

常用参数：

- `--output-dir path`：指定输出文件夹。
- `--name deck-name`：指定文件名，不带扩展名。
- `--keep-media`：保留导出中间生成的独立图片素材，方便排查。
- `--logo-scale 8`：Logo PNG 相对页面显示尺寸的像素倍率；默认 8，允许 4–20，禁止低于 4。
- `--force`：覆盖完全相同的目标文件。

`--format` 只接受 `pptx`。不支持 `keynote`、`all` 或任何整页栅格模式。

## DOM 到 PowerPoint 的映射

| HTML / CSS | PPTX 对象 |
|---|---|
| 可见文本节点 | 独立可编辑文本框，按浏览器实际换行拆成行 |
| 纯色背景、卡片、数据条 | 原生矩形或椭圆形状 |
| border、rule、分隔线 | 原生线条 |
| 点阵、圆环、十字装饰 | 原生图案填充或形状 |
| `<img>`、SVG、图标 | 独立图片对象 |
| `.brand-logo` | 独立透明高清 PNG，默认 8× 页面显示尺寸 |
| 非背景 canvas | 独立图片对象 |
| `SPEAKER_NOTES` | 原生 PowerPoint 演讲者备注 |

导出字体固定使用跨平台字体映射，并始终保持正体。页面主标题的 500 字重映射到 Medium 字体；禁止自动生成斜体。

## 导出前置条件

1. HTML 的品牌、Logo、中文排版、标题换行、演讲者模式校验全部通过。
2. 瑞士风额外通过 `validate-swiss-deck.mjs`。
3. 页面图片没有失效。
4. `SPEAKER_NOTES` 的 ID 与 `section[data-slide-id]` 一一对应。
5. 浏览器低功耗静态模式能完整显示所有内容，不能停在动效中间状态。

## 导出后验收

1. 输出页数与 HTML 一致，演讲者备注页数与非空备注数一致。
2. 解包 PPTX 检查每页都包含文本框或原生形状，不能只有一张全页图片。
3. 输出统计必须是 `full_slide_rasters=0`、`keynote_handoff=none`。
4. 用 PowerPoint 渲染全部页面，并运行 `slides_test.py`，不允许画布越界。
5. 查看 contact sheet，并抽查封面、橙底页、中文长标题、图片页、数据页和尾页原尺寸截图。
6. 使用 `--keep-media` 时，检查所有 `*-logo-hd.png`：透明底、118:32，像素宽高不低于页面 Logo 实际显示尺寸的 4×；默认应为 8×。
7. 条件允许时分别在 Windows PowerPoint 与 macOS PowerPoint / Keynote 打开，抽查文字、色块和数据条能否单独选中编辑，并在 200% 缩放下检查 Logo 边缘无锯齿或模糊。

## 可编辑性边界

- 文字、色块、分隔线、卡片和数据条是原生可编辑对象。
- Logo、照片、SVG 和图标保持为独立图片对象；可以移动、缩放、裁切和替换，但不会被拆成可编辑矢量路径。Logo PNG 使用母版高倍生成，禁止用低清截图替代。
- 浏览器动效不会自动变成 PowerPoint 动画；PPTX 表达的是页面的最终静态状态。
- HTML 和 PowerPoint 的字体排版引擎不同，极少数长文本可能出现轻微字距差异；交付前必须以 PowerPoint 渲染结果为准进行复核。
