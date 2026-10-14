# Changelog

## 0.6.0 · 2026-10-14

### Added
- Option **CJK typography** (Style Settings → Still → Reading, off by default). Where Han characters meet Latin letters or digits with no space typed, the browser draws the customary eighth-em gap; the note's text is unchanged and a typed space is left alone. Reading view keeps a lone character off the last line of a paragraph and balances headings; the editor doesn't, so lines never reflow behind the caret. The default line height opens to 1.75, and the Line height slider still wins. Code, inline code and code blocks keep their exact spacing. An opening bracket at the start of a line sits flush when the font supports it (PingFang SC does; most Fangsong and Song faces don't).
- Option **Justified paragraphs** (Reading, off by default). Body text lines up on both edges in reading and editing views; headings, code blocks and table rows keep their alignment.
- Option **Dim images in dark mode** (Content, off by default). Note images rest at 75% opacity in dark mode and brighten under the pointer, like PDF pages; link favicons are left alone.
- Option **Outline guides** (Interface, off by default). Core's indentation guide, one hairline per heading level, in the outline view only; the branch under the heading the pointer is on darkens. The file tree stays guide-free.
- **Per-note classes**, set in a note's `cssclasses` and named as in Minimal: `wide` (1.35 × line width), `max` (the full pane), and `img-grid` (in reading view, images on consecutive lines share a row, uncropped).
- **Chinese option names and descriptions.** Every Style Settings option has `title.zh` and `description.zh`, shown when Obsidian's language is Chinese.
- Tests: `tests/settings.check.mjs` (fails if an option lacks a Chinese title or description), 19 new checks in `tests/content.e2e.mjs`, 4 in `tests/surfaces.e2e.mjs`.

### Changed
- **Requires Obsidian 1.14.0.** The pre-1.14 ribbon selector (`.mod-left`) is gone; the left ribbon is matched as `.mod-primary` only.

### Fixed
- **Sidebar header no longer jumps with the auto-hide ribbon in translucent windows.** The header now uses the open sidebar's own transition, so if a translucency snippet turns that transition off, the header jumps along with it instead of sliding back on its own.
- **Dark buttons lighten on hover.** `--interactive-hover` was darker than `--interactive-normal` in dark mode, so hovering a button barely changed it.
- **Reduced motion covers the ribbon shift.** The open sidebar and its header no longer slide when the ribbon comes out.
- The version in the `theme.css` header now matches the manifest.
- **Tables are hairline rows again.** Core draws the first and last columns' outer edges through `--table-column-first-border-width` and `--table-column-last-border-width`, which outranked Still's own rule, so every table kept a left and right frame in reading and editing views. Both are now 0.

### 中文
- 新增可选项「中文排版」（Reading，默认关闭）：中文与英文、数字相邻且没打空格时，浏览器自动画出约 1/8 字宽的间隙，笔记内容不变，已打的空格不受影响；阅读视图段尾不留单字、标题自动均衡断行，编辑视图不做，以免打字时前面的行跟着重排；默认行高放宽到 1.75，行高滑块仍然优先；代码保持原样。行首括号挤压需要字体支持（苹方可以，多数仿宋、宋体不行）。
- 新增可选项「两端对齐」（Reading，默认关闭）：正文在阅读和编辑视图中两端对齐，标题、代码块和表格行不受影响。
- 新增可选项「深色模式图片降亮」（Content，默认关闭）：深色模式下笔记图片平时 75% 不透明，鼠标移上去恢复，与 PDF 一致；链接图标不受影响。
- 新增可选项「大纲层级线」（Interface，默认关闭）：只在大纲面板里每级标题显示一条细线，鼠标所在标题下的分支加深；文件树不受影响。
- 新增按笔记生效的类（写在笔记属性 `cssclasses` 里，类名与 Minimal 一致）：`wide` 行宽 1.35 倍，`max` 铺满面板，`img-grid` 阅读视图中连续几行的图片排成一行、不裁切。
- 所有 Style Settings 选项加了中文名称和说明，Obsidian 界面为中文时显示。
- 最低版本改为 Obsidian 1.14.0，去掉 1.14 之前的功能区选择器（`.mod-left`），只认 `.mod-primary`。
- 修复透明窗口里自动隐藏功能区时，侧栏顶部图标先右跳再滑回：标题栏改为跟随侧栏自己的过渡，透明 snippet 关掉侧栏过渡时两者一起移动。
- 深色模式按钮悬停改为变亮（原来比常态更暗，几乎看不出反馈）。
- 系统开启「减弱动态效果」后，功能区滑出时侧栏和标题栏不再滑动。
- 表格恢复为只有横向细线：核心通过两个变量画首列左边线和末列右边线，优先级高于 Still 自己的规则，阅读和编辑视图里每张表都多了左右外框，现在两个变量设为 0。
- 测试：新增 `tests/settings.check.mjs`（缺中文名称或说明就报错），`tests/content.e2e.mjs` 新增 19 项、`tests/surfaces.e2e.mjs` 新增 4 项检查。

## 0.5.5 · 2026-10-10

### Fixed
- **Sidebar peek closes again after a click inside.** Clicking in a peeking sidebar makes its view the active leaf, and that leaf stays active after the pointer leaves. Still kept the panel open for as long as the leaf was active, so it never slid away. It now stays open only while focus is inside it (typing in a field), and parks as soon as the pointer leaves otherwise. Two new checks in `tests/surfaces.e2e.mjs`.

### Changed
- **Auto-hide ribbon and peek panel read as one drawer.** With *Soft sidebar peek* on, the revealed ribbon kept its own gray surface (`--background-secondary`) beside the page-colored panel, so it stood apart as a separate column that started below the header. The ribbon surface now takes the panel's color in both peek styles, as in Baseline. Ribbon icons are at full opacity (core's default is 0.85), also as in Baseline. New check in `tests/surfaces.e2e.mjs`.

### 中文
- 自动隐藏的功能区与侧栏抽屉融为一体：开启「Soft sidebar peek」时，滑出的功能区仍用自己的灰色底（`--background-secondary`），旁边的侧栏却是页面色，功能区看起来是单独一条、而且从标题栏下方才开始。现在功能区底色跟随侧栏面板，两种 peek 样式下都一致，与 Baseline 相同；功能区图标改为不透明（核心默认 0.85），也与 Baseline 一致。`tests/surfaces.e2e.mjs` 新增一条检查。
- 修复折叠侧栏悬停展开后不收回：在展开的侧栏里点一下，里面的视图就成了当前活动视图，鼠标移开后仍然是活动状态；Still 之前按"视图是否活动"保持展开，所以面板一直停在页面上。现在只在面板内有焦点（比如正在输入框里打字）时保持展开，否则鼠标离开就收回。`tests/surfaces.e2e.mjs` 新增两条检查。

## 0.5.4 · 2026-10-09

### Fixed
- **Mobile view switcher is opaque again.** The list that opens from a drawer's view selector was transparent, so the drawer's content showed through it, and its padding was cleared, so the last view sat under the selector button. It now uses the drawer surface and keeps core's vertical padding.

### 中文
- 修复移动端侧栏视图切换列表透明：点开侧栏底部的视图选择器后，列表是透明的，能透出下面的面板内容；内边距也被清零，最后一项压在选择按钮下面形成重影。现在列表使用侧栏底色，并保留 Obsidian 核心的上下内边距。

## 0.5.3 · 2026-10-09

### Changed
- **Ribbon matches Baseline.** Tiles are now 32px hit areas, 4px apart and 12px from the window edge (were 28×24, 6px apart), starting flush under the header line. With *Auto-hide ribbon* on, revealing the ribbon beside an open sidebar slides the sidebar's content right by the ribbon's width (less 8px) instead of laying the icons over the file tree, and the header gives the same amount back so the window controls and toolbar stay put. The ribbon surface added in 0.5.2 now applies only when the sidebar is collapsed and the ribbon floats over the page. Two new checks in `tests/surfaces.e2e.mjs`; the 0.5.2 check now covers the collapsed case.

- **Darker secondary text and icons, as in Baseline.** `--text-muted` goes from `#8e8e90` to `#4d4d4d` in light and from `#9b9b9b` to `#ababab` in dark; `--text-faint` from `#a0a1a8` to `#939393` and from `#65645f` to `#7a7a7a`. Ribbon icons, file-tree names, header icons and secondary labels follow. Inactive sidebar tab icons stay one step lighter (faint), as they do in Baseline. The *Secondary text* option in Style Settings still overrides `--text-muted`.

### 中文
- 次要文字和图标颜色调深，与 Baseline 一致：`--text-muted` 浅色由 `#8e8e90` 改为 `#4d4d4d`，深色由 `#9b9b9b` 改为 `#ababab`；`--text-faint` 浅色由 `#a0a1a8` 改为 `#939393`，深色由 `#65645f` 改为 `#7a7a7a`。功能区图标、文件树名称、标题栏图标和次要标签随之变深；侧栏里未选中的标签图标仍用浅一档（faint），与 Baseline 相同。Style Settings 的「Secondary text」仍可覆盖 `--text-muted`。
- 功能区对齐 Baseline：图标改为 32px 点击区、间距 4px、距窗口左缘 12px（原 28×24、间距 6px），顶部紧贴标题栏线。开启「自动隐藏功能区」后，侧栏展开时悬停左缘，侧栏内容整体右移（功能区宽度减 8px），不再让图标压在文件树上；标题栏同步回退相同距离，红绿灯和工具栏位置不变。0.5.2 加的功能区底色只在侧栏折叠、功能区浮在页面上时使用。`tests/surfaces.e2e.mjs` 新增两条检查，并让 0.5.2 的检查覆盖折叠场景。

## 0.5.2 · 2026-10-09

### Fixed
- **Auto-hide ribbon over an open sidebar.** A translucency snippet repaints `.workspace-ribbon` with a near-clear tint and `!important`, so Still's own ribbon background never applied. Hovering the left edge slid the icons over the file tree, with chevrons, labels and indent ticks showing through. The ribbon now carries an opaque surface on its `::after` pseudo-element (the same approach the peek panel uses), with a 10px feather on the page-facing edge. Collapsed-sidebar drawers look the same as before. New check in `tests/surfaces.e2e.mjs`.

### 中文
- 修复「自动隐藏功能区」：在侧栏已展开时悬停左缘，功能区图标会叠在文件树上，箭头、文字和缩进刻度都透出来。原因是透明窗口 snippet 用 `!important` 把功能区背景刷成近乎透明，Still 自己设的背景不生效。现在背景改画在 `::after` 伪元素上（与折叠侧栏面板同一做法），页面一侧有 10px 羽化；折叠侧栏的抽屉形态不变。`tests/surfaces.e2e.mjs` 新增一条检查。

## 0.5.1 · 2026-10-08

### Added
- Option **Colored headings** (Style Settings → Still → Content, off by default). Each heading level gets its own hue, from red at H1 to purple at H6, in reading and editing views. Hues are mixed 75/25 with the text color to stay readable in light and dark. H4 and H6 are colored too, although Still keeps their `--h4-color` and `--h6-color` muted.
- Option **Soft sidebar peek** (Style Settings → Still → Interface, off by default). A collapsed sidebar that slides in now sits on the page color and feathers out past its inner edge with a 144px gradient, instead of a shadowed slab. The panel stays opaque under its own content, and there is no filter or blur.
- Two checks in `tests/content.e2e.mjs`: headings keep the text color by default, and all six levels get distinct hues with the option on. Two more cover the soft peek: the shadowed slab stays by default, and the option swaps it for the gradient fade on the page-facing edge.

### 中文
- 新增可选项「Soft sidebar peek」（Style Settings → Still → Interface，默认关闭）：折起的侧栏临时展开时，用页面底色并向页面一侧羽化 144px，不再是带阴影的实色板；面板内容下仍然不透明，不用滤镜。
- 新增可选项「Colored headings」（Style Settings → Still → Content，默认关闭）：H1 到 H6 各有一种颜色，从红到紫，阅读和编辑视图都生效；H4、H6 也上色。
