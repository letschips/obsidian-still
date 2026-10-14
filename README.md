# Still

A quiet, monochrome theme for Obsidian. Neutral greys carry the structure, hairlines replace heavy borders, and the accent color you pick in Obsidian is the only color the interface adds.

| Light | Dark |
| --- | --- |
| ![Still in light mode](./images/light.png) | ![Still in dark mode](./images/dark.png) |
| ![Callout, table, code and image in light mode](./images/content-light.png) | ![Callout, table, code and image in dark mode](./images/content-dark.png) |

## What it does

- **Tonal surfaces.** The sidebar sits one step away from the page. Hover and selection change lightness, never hue. Light and dark use the same ladder.
- **Floating page.** With a sidebar open, the page lifts off the frame as a rounded card. Collapse the sidebars and it takes the whole window.
- **Settings window.** In Obsidian 1.14's separate Settings window the title text goes, the window controls sit inside a taller bar, and rows, toggles, sliders and dropdowns use the same compact controls as the rest of the theme.
- **Phone and tablet layouts.** Touch targets, drawer headers that give the vault name and file counts their own rows on phone and tablet, tighter tree indents, code, images and callouts that keep their desktop corners, keyboard-aware menu height, horizontally scrollable tablet tabs, and pinned or overlay drawers with room left for reading. Navigation gestures and the editing toolbar stay under Obsidian’s control.
- **Floating tabs.** Equal-width tabs with centered titles sit centered above the page. The current tab is a soft tile.
- **Sidebar peek.** Collapse a sidebar and it stays one movement away: rest the pointer on the window edge and it slides in over the page, then slides away when you leave.
- **A readable file tree.** Roomy rows, bold folders, regular files, no extra lines.
- **Calm reading.** A readable line length, generous line height, light headings, block quotes, washed callouts and hairline tables.
- **Light to render.** No interface blur, 3D transforms or body-wide `:has()` rules, so typing, scrolling and plugin animations don't trigger whole-window style work.
- **Accent and fonts follow Obsidian.** Change them in Settings → Appearance; Still never overrides them.

Still is opaque. It does not make the window translucent on any platform. It has been tested on macOS desktop, with phone and tablet layouts checked in Obsidian's desktop mobile emulation. Native iOS/Android keyboard and gesture behavior still needs physical-device confirmation. If you use a CSS snippet for window translucency on macOS, Still is written to stay out of its way: it never sets `backdrop-filter`, and it does not force workspace backgrounds with `!important`. Inside a translucent window it switches off plugin `backdrop-filter` and `will-change` in the workspace, which otherwise leave stale frames such as ghosted tooltips and text.

## Options

Every option needs the [Style Settings](https://github.com/obsidian-community/obsidian-style-settings) plugin. Without it, Still uses its defaults. Option names and descriptions are also in Chinese and appear when Obsidian's language is Chinese.

| Group | Option | Default |
| --- | --- | --- |
| Reading | Line width, line height, paragraph spacing, list item spacing | 700 px · 1.625 · 1.25 rem · 0.175 rem |
| Reading | Centered note title | Off |
| Reading | CJK typography: a gap where Han meets Latin or digits, no lone character at a paragraph's end in reading view, line height 1.75 unless set | Off |
| Reading | Justified paragraphs: body text lines up on both edges in reading and editing views; headings, code and tables keep their alignment | Off |
| Colors | Page, sidebar, text, secondary text, link, list marker and checkbox colors, for light and dark | Theme palette; links and checkboxes use the accent |
| Colors | Graphite ink: buttons, toggles and links use the text color | Off |
| Interface | Roundness: scales every corner radius | 1.25 |
| Interface | Flat page: no floating card beside the sidebars | Off |
| Interface | Left-aligned tabs; tabs fit their titles | Off |
| Interface | Always show the note title in the header (otherwise it appears on hover) | Off |
| Interface | Disable sidebar peek | Off |
| Interface | Auto-hide ribbon, revealed from the left edge together with the sidebar | Off |
| Interface | Soft sidebar peek: the peeking sidebar sits on the page color and fades into the page, with no shadowed edge | Off |
| Interface | Quiet vault switcher: the vault foot keeps only Settings (Help stays on F1); the vault name appears when the pointer reaches it | Off |
| Interface | Quiet sidebar toolbar: buttons rest as dots | Off |
| Interface | Quiet status bar: rests as a short line at the bottom center | Off |
| Interface | Outline guides: a hairline per heading level in the outline view; the branch under the pointer darkens | Off |
| Interface | Disable entrance motion | Off |
| Interface | Pure black on phones and tablets in dark mode, for OLED screens | Off |
| Content | Card callouts: tinted frame with an inner content card | Off |
| Content | Images fill the line width (only media without a set width; tall ones stay within the window) | Off |
| Content | Striped Bases tables: stripes follow row position, so they stay put while long tables scroll | Off |
| Content | Colored headings: one hue per level, red at H1 to purple at H6 | Off |
| Content | Plain tags, don't strike completed tasks, dark PDFs, dim PDFs or images in dark mode | Off |

Still also respects the system "reduce motion" setting.

## Per-note classes

Add these to a note's `cssclasses` property. They only affect that note, and the names match Minimal's.

| Class | Effect |
| --- | --- |
| `wide` | A wider line (1.35 × line width) for tables, dashboards and image-heavy notes. Needs "Readable line length" on. |
| `max` | The line fills the pane. Needs "Readable line length" on. |
| `img-grid` | In reading view, images on consecutive lines share a row, uncropped. A single image, or one beside text, is left alone. |

```yaml
---
cssclasses:
  - wide
  - img-grid
---
```

## Install

**From Obsidian** (once listed in the community directory): Settings → Appearance → Themes → Manage, search for "Still", then Install and use.

**Manually:** download `manifest.json` and `theme.css` from the latest release into `<your vault>/.obsidian/themes/Still/`, then pick Still in Settings → Appearance.

Requires Obsidian 1.14.0 or later.

## Development

`theme.css` is the whole theme; there is no build step.

- `node scripts/deploy.mjs <path to vault>` copies the theme into a vault, where Obsidian reloads it on change.
- `node tests/settings.check.mjs` checks the Style Settings block (every option has a Chinese title and description). It needs only Node.
- `tests/*.e2e.mjs` run inside a live Obsidian through the [Obsidian CLI](https://obsidian.md/help/cli): `node tests/surfaces.e2e.mjs "<vault name>" report.json`. Select Still first. They add and remove their own probe elements and restore what they toggle. `content.e2e` opens and closes a Bases tab (pass a `.base` file and a table view, or the stripe checks are skipped), `runtime.e2e` opens Settings windows, and `mobile.e2e` turns on Obsidian's mobile emulation, which reloads the window. None of them edits notes.
- Pushing a tag that matches `version` in `manifest.json` creates a draft release with `manifest.json` and `theme.css` (`.github/workflows/release.yml`).

## Credits

Still is an original theme. Its direction draws on two MIT-licensed projects, and no code from either is bundled:

- [whirl](https://github.com/whirlchat/whirl): the tonal ladder, hairlines and motion curves.
- [Baseline](https://github.com/svnaxis/obsidian-baseline) by Alexis C: the floating page, floating tabs, card callouts and the sidebar peek.

## License

[MIT](./LICENSE) © 2026 letschips

---

## 中文说明

Still 是一款安静的单色 Obsidian 主题。界面结构靠灰阶区分，细线代替粗边框，唯一的颜色来自你在 Obsidian 里设置的强调色。

- **灰阶层次**：侧栏比正文退后一级。悬停和选中只改变明暗，不改变色相。浅色、深色模式用同一套层级。
- **浮动页面**：打开侧栏时，正文像一张圆角卡片浮在框架上；收起侧栏后铺满窗口。
- **设置窗口**：Obsidian 1.14 的独立设置窗口去掉标题文字，窗口按钮收进更高的标题栏，侧栏条目、开关、滑块和下拉框与主题其他部分一致。
- **手机与平板布局**：放大触控区域，手机和平板侧栏的库名与统计各占一行，文件树缩进更紧凑，代码块、图片和提示块保持桌面端圆角，菜单高度避开键盘；平板标签可以横向滚动，常驻与滑出侧栏给正文保留空间。导航手势和编辑工具栏继续使用 Obsidian 原生行为。
- **浮动标签**：等宽标签、标题居中，整排居中；当前标签是一块浅色底。
- **侧栏滑出**：收起侧栏后，鼠标停在窗口边缘，它会从边上滑出来，移开后自动收回。
- **清楚的文件树**：行距宽松，文件夹加粗、文件常规字重，不加额外线条。
- **阅读排版**：可读行宽、舒展的行距、更轻的标题、块状引用、淡色提示块和细线表格。
- **中文排版**（可选，默认关闭）：中文与英文、数字相邻且没打空格时，自动留出约 1/8 字宽的间隙（只是显示，不改笔记内容）；阅读视图里段尾不留单字；默认行高放宽到 1.75，行高滑块仍然优先。代码保持原样。行首括号挤压需要字体支持，苹方可以，多数仿宋、宋体不行。
- **两端对齐**（可选）：正文在阅读和编辑视图中两端对齐；标题、代码和表格不受影响。
- **深色模式图片降亮**（可选）：笔记图片平时调暗，鼠标移上去恢复，与 PDF 降亮一致。
- **大纲层级线**（可选）：大纲面板每级标题一条细线，鼠标所在标题下的分支加深。
- **渲染轻**：不用滤镜、背景模糊、3D 变换，也不写作用于整个界面的 `:has()`，打字、滚动和插件动画不会触发整窗样式重算。
- **强调色和字体跟随 Obsidian**：在「设置 → 外观」里改，主题不会覆盖。

Still 本身不透明，在任何平台都不会让窗口变成半透明。目前在 macOS 桌面端测试过，手机和平板布局已在 Obsidian 的桌面移动端模拟里检查；原生 iOS/Android 的键盘与手势行为仍需实机确认。如果你在 macOS 上用 CSS 片段实现窗口透明，Still 不会和它冲突：主题不设置 `backdrop-filter`，也不用 `!important` 强制工作区背景。在半透明窗口里，它会关掉工作区内插件的 `backdrop-filter` 和 `will-change`，避免提示框、文字等留下残影。

按笔记生效的类：在笔记属性 `cssclasses` 里加上，只影响这一篇，类名和 Minimal 一致。`wide`：行宽放大到 1.35 倍，适合表格、看板和图多的笔记；`max`：铺满整个面板（两者都要打开「可读行宽」）；`img-grid`：阅读视图里，连续几行的图片排成一行，不裁切；单张图或和文字同一行的图不受影响。

所有可调选项都需要安装 Style Settings 插件；不装也能正常使用默认效果。Obsidian 界面语言为中文时，选项名称和说明显示中文。最低支持 Obsidian 1.14.0。
