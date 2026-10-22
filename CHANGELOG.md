# Changelog

## 0.6.9 · 2026-10-22

### Fixed
- **Colored highlights are easier to tell apart in light mode.** Obsidian 1.14's orange and yellow highlights (`==🟠text==`, `==🟡text==`) used Still's softened hues and looked the same; their washes are now brighter and further apart.

### 中文
- 浅色模式下的彩色高亮更好分辨：Obsidian 1.14 的橙色、黄色高亮原来沿用 Still 柔化后的色相，看起来几乎一样，现在两者更亮、色相拉开。

## 0.6.8 · 2026-10-20

### Changed
- **Quiet status bar has no resting line.** It stays hidden until the pointer nears the bottom center (a 256 × 32px band), then the pill fades in. When the pointer leaves, the pill fades out in place over 400ms instead of holding and then shrinking into the line.

### 中文
- 安静状态栏去掉了底部短线：平时完全隐藏，鼠标靠近底部中间（256 × 32px 的范围）时胶囊淡入；移开后原地 400ms 淡出，不再先停顿、再缩成短线。

## 0.6.7 · 2026-10-20

### Changed
- **Quiet status bar is easier to reach and slower to leave.** It opens when the pointer comes within about 24px above the resting line (48px to each side), and stays open 500ms after the pointer leaves before folding.

### Fixed
- **Quiet status bar keeps its surface in translucent windows.** The pill and the resting line are painted on a pseudo-element, so snippets that clear the status bar background no longer leave them transparent.
- Tests: new `tests/status-bar.e2e.mjs`.

### 中文
- 安静状态栏更容易唤出、收起更从容：鼠标到短线上方约 24px、左右各 48px 内就会展开；移开后停留 500ms 再收起。
- 半透明窗口下安静状态栏不再透明：胶囊和短线的底色改由伪元素绘制，清掉状态栏背景的 snippet 不会再把它变透明。
- 测试：新增 `tests/status-bar.e2e.mjs`。

## 0.6.6 · 2026-10-17

### Fixed
- **No frosted glass on mobile menus, prompts and suggestions.** Obsidian's mobile rules blurred them and left them 90% opaque on phones and tablets. They are now solid, as on desktop.
- **Image and PDF embed buttons** are an opaque chip without blur on every platform.
- **Dialogs keep Still's shadow** (the lit edge in dark mode) instead of core's, which replaced it whenever the backdrop was dimmed.
- **Mobile dark mode:** the base color steps climb in order again (pure black included: embeds and code no longer swap brightness), tags keep Still's lighter tint, and Plain tags stays plain. In mobile light mode the darkest step is Still's ink, not pure black.
- **Tablet dark mode:** the status area uses the tab strip's tone, as in light mode.
- **Inline code in the editor** has the same 5px corners as in reading view (it took the 10px code-block radius).
- **Graphite links** keep their hairline underline in the editor; it was drawn in the full text color. Bare URLs get the same underline offset.
- **Dark PDFs** no longer get core's 1px frame.
- Tests: 7 new checks in `tests/surfaces.e2e.mjs`.

### 中文
- 手机和平板上的菜单、命令面板、补全列表不再有毛玻璃：Obsidian 的移动端规则给它们加了模糊、只有 90% 不透明，现在和桌面一样是实底。
- 图片和 PDF 嵌入右上角的按钮：所有平台都改为不透明底、不模糊。
- 对话框保留 Still 的阴影（深色模式下的亮边）。原来只要背景变暗，就被核心阴影换掉。
- 移动端深色模式：底色阶梯恢复由暗到亮的顺序（纯黑模式下嵌入块和代码块的明暗不再颠倒），标签保持 Still 较淡的底色，「朴素标签」选项也恢复无底色。移动端浅色模式下最深一级用 Still 的文字色，而不是纯黑。
- 平板深色模式：顶部状态区与标签栏同色，和浅色模式一致。
- 编辑器里的行内代码圆角改为 5px，和阅读视图一致（原来用了代码块的 10px）。
- 石墨链接在编辑器里也是细线下划线（原来是正文色的实线）；裸链接的下划线偏移也一致了。
- 深色模式的 PDF 页面不再有核心加的 1px 边框。
- 测试：`tests/surfaces.e2e.mjs` 新增 7 项检查。

## 0.6.5 · 2026-10-17

### Fixed
- **Callout titles and icons are readable.** They used the raw callout hue, a fill color that fell to about 2:1 against the wash in light mode (note and info). Titles and icons now use the hue mixed halfway with the text color, 4.5:1 or better for every hue in both modes and both callout styles. The wash is unchanged.
- **Card callouts:** a long title no longer runs under the corner icon.
- **Unresolved links** draw their dotted underline and use the muted text color at full opacity. They were told apart by 0.6 opacity alone, below 3:1.
- **Faint small text** (inactive tabs, file tags, tree flairs, menu group titles, prompt instructions) uses the muted text color, which clears 4.5:1.
- **Table cells** use the theme's 7px / 12px padding in reading view and Live Preview. The padding tokens were declared but never read, so tables stayed at core's 4px / 8px.
- **Ribbon icons** are centred in the ribbon instead of touching the sidebar edge.
- Quiet vault switcher: the description now says Help is in the command palette. Obsidian binds no key to Help, so "Help stays on F1" was wrong.
- Removed the unused `--button-shadow` token; the header version is current.
- Tests: 4 new checks in `tests/content.e2e.mjs`; the ribbon check in `tests/surfaces.e2e.mjs` now asserts centring.

### 中文
- callout 标题和图标看得清了：原来直接用 callout 的色相，这是按底色调的颜色，浅色模式下 note、info 的标题对比度只有约 2:1。现在标题和图标用色相与正文色各半混合，所有颜色在深浅模式、两种 callout 样式下都达到 4.5:1 以上；底色不变。
- 卡片 callout：长标题不再压到右上角的大图标下面。
- 未解析链接：补上虚线下划线，改用次要文字色、不再半透明。原来只靠 0.6 的透明度区分，对比度不到 3:1。
- 小号淡色文字（非当前标签、文件标签、树状列表角标、菜单分组标题、命令面板提示）改用次要文字色，达到 4.5:1。
- 表格单元格在阅读视图和实时预览里都用主题的 7px / 12px 内边距。原来这两个变量声明了但没有被读取，表格一直是核心的 4px / 8px。
- 功能区图标在功能区里居中，不再贴着侧栏边缘。
- 安静的库切换器：说明改为「帮助可在命令面板搜索打开」。Obsidian 没有给帮助绑定快捷键，原来写的 F1 不对。
- 删除无效的 `--button-shadow` 变量；文件头版本号更新。
- 测试：`tests/content.e2e.mjs` 新增 4 项检查；`tests/surfaces.e2e.mjs` 的功能区检查改为断言居中。

## 0.6.4 · 2026-10-15

### Fixed
- **Quiet vault switcher is easy to click.** Reaching Settings revealed the vault name, but the 4px gap between the two (and the name being shorter than the button) dropped the hover, and the name vanished under the pointer on its way over. The whole vault foot now holds the hover once the pointer is in, and the name lingers for 300ms after the pointer leaves, still clickable. At rest its spot still lets the pointer through to the sidebar.
- Tests: added `tests/vault-foot.e2e.mjs` (4 checks, main window).

### 中文
- 安静的库切换器更好点了：原来鼠标到设置按钮时库名会出现，但往左移时会经过两者之间 4px 的空隙（库名也比按钮矮），悬停随即丢失，库名在鼠标到达前就消失了。现在鼠标进入后整条库栏都保持悬停；离开后库名停留 300ms，期间仍可点击。平时库名所在位置依然不挡侧栏。
- 测试：新增 `tests/vault-foot.e2e.mjs`（4 项检查，在主窗口运行）。

## 0.6.3 · 2026-10-14

### Fixed
- **Phone header buttons and navigation bar have a surface again.** With the floating navigation, Obsidian draws the header buttons, navigation bar, editing toolbar and prompt field as raised pills over the page. Still turned off core's frosted glass with `--raised: none`, which also removed their background, so icons sat on the text scrolling underneath and the navigation bar let it show through. They now keep an opaque tone (the sidebar grey in light mode, a lifted grey in dark and pure-black modes) with a hairline, still without blur or a halo.
- **Quick switcher and command palette on phones:** rows are touch-height (44px) with a 16px inset, instead of the compact desktop list that ran to the screen edge.
- **CJK typography on iOS:** paragraphs keep normal wrapping. WebKit's `pretty` rebalanced every line of a short paragraph, leaving a ragged column well short of the line width in reading view. Other platforms keep `pretty`.
- Tests: 4 new checks in `tests/surfaces.e2e.mjs`.
- Mobile checks now initialize phone and tablet layouts separately, load the file explorer before measuring it, and capture screenshots through CDP with a timeout.

### 中文
- 手机顶部按钮和底部导航栏恢复底色：开启浮动导航时，Obsidian 把顶部按钮、导航栏、编辑工具栏和搜索框画成浮在页面上的胶囊。Still 原来用 `--raised: none` 关掉毛玻璃，连底色也一起去掉了，按钮直接压在滚动的正文上，导航栏也会透出下面的文字。现在保留不透明底色（浅色用侧栏灰，深色和纯黑模式用浮起灰）加一圈细线，仍然不做模糊和光晕。
- 手机上的快速切换和命令面板：每行改为 44px 触控高度、左右留 16px，不再沿用贴边的桌面紧凑列表。
- iOS 上的中文排版：段落改回普通换行。WebKit 的 `pretty` 会把短段落的每一行都重新平衡，阅读视图里整段只排到约八成宽；其他平台仍保留 `pretty`。
- 测试：`tests/surfaces.e2e.mjs` 新增 4 项检查。
- 移动端检查分别初始化手机和平板布局，测量前加载文件列表，并改用带超时的 CDP 截图，避免后台窗口截图挂起。

## 0.6.2 · 2026-10-14

### Fixed
- **Image grids keep paragraph text in normal flow.** Consecutive images share a row without turning nearby text into narrow grid cells. Standard Markdown images work alongside attachment embeds, and narrow panes wrap the images without cropping.
- Image grids keep their row width when **Images fill the line width** is also enabled.
- The options reference now describes paragraph and list spacing as multiples of the text size, matching 0.6.1.
- Added `tests/image-grid.e2e.mjs`, using the actual Obsidian Markdown renderer with transient text and no note writes.

### 中文
- 图片网格保留正文的正常排版，不再把图片前后的文字挤进窄列；标准 Markdown 图片和附件嵌入均可并排，窄面板自动换行、不裁切。
- 同时开启「图片填满行宽」时，网格中的图片仍保持并排，不再恢复为全宽竖排。
- 选项文档中的段距、列表间距单位同步为正文字号的倍数。
- 新增 `tests/image-grid.e2e.mjs`，使用真实 Obsidian Markdown 渲染器及无文件绑定的临时文本验证，不改写笔记。

## 0.6.1 · 2026-10-14

### Fixed
- **Headings follow the text size.** Heading and note title sizes were in `rem`, and paragraph, heading and list spacing too. The root font size isn't the text size everywhere: popout windows set it to 15px while text stays at the font size setting, so an H3 came out smaller than body text there, and iOS scales it with the system text size. Headings are now in `em`, as in core, and spacing is a multiple of the text size. The Paragraph spacing and List item spacing sliders keep their values, which now mean multiples of the text size.
- **Card callouts: no extra gap under a nested callout.** When the last block in a card was a nested callout, its bottom margin added to the card's padding (33px below, 16px above). The large corner icon of a collapsed card callout is no longer cut off at the bottom.
- Tests: 5 new checks in `tests/content.e2e.mjs`.

### 中文
- 标题字号改为跟随正文字号：标题、笔记标题、段距、标题间距、列表间距原来用 `rem`，而根字号不一定等于正文字号——弹出窗口里根字号是 15px、正文仍是设置的字号，三级标题比正文还小；iOS 上根字号还会随系统字号变化。现在标题用 `em`（与 Obsidian 核心一致），间距按正文字号的倍数计算；「段落间距」「列表项间距」滑块保留原数值，含义变为正文字号的倍数。
- 卡片 callout 里最后一项是嵌套 callout 时，底部不再多出一段空白（原来下方 33px、上方 16px）；折叠的卡片 callout 右上角大图标不再被裁掉底部。
- 测试：`tests/content.e2e.mjs` 新增 5 项检查。

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
