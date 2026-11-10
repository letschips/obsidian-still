# Still options

Every option needs the [Style Settings](https://github.com/obsidian-community/obsidian-style-settings) plugin. Without it, Still uses its defaults. Option names and descriptions are also in Chinese and appear when Obsidian's language is Chinese.

| Group | Option | Default |
| --- | --- | --- |
| Reading | Line width, line height, paragraph spacing, list item spacing | 700 px · 1.625 · 1.25 × text size · 0.175 × text size |
| Reading | Centered note title | Off |
| Reading | CJK typography: a gap where Han meets Latin or digits, improved paragraph endings in reading view (normal paragraph wrapping on iOS), line height 1.75 unless set | Off |
| Reading | Justified paragraphs: body text lines up on both edges in reading and editing views; headings, code and tables keep their alignment | Off |
| Reading | First-line indent: body paragraphs start two characters in, in reading view and Live Preview; lists, quotes, callouts, tables and code are left alone | Off |
| Reading | Chinese font pairing: system fonts only. Hei keeps Chinese sans glyphs on systems set to another language; Song sets body text in a Song typeface with sans headings and Kai quotes. A font chosen in Settings → Appearance still comes first | Off |
| Reading | Active line highlight: a faint wash on the focused editor's current text line; quotes and code keep their backgrounds | Off |
| Reading | Underline links: keep note and web links underlined in reading and editing views | Off |
| Colors | Preset: a ready-made light and dark palette (Paper, Mist, Sand, Sage, Graphite, Night). While one is picked it sets the window background, page, sidebar, text and secondary text colors; Off brings back your own. Its grain or gradient shows with Window background on | Off |
| Colors | Preset accent: with a preset picked, buttons, links, tags and the selection use the preset's own hue instead of the accent from Settings → Appearance | Off |
| Colors | Page, sidebar, text, secondary text, link, list marker, checkbox, H1–H6 heading, table header text and table header background colors, for light and dark | Theme palette; links and checkboxes use the accent; headings use the text color, H4 and H6 the secondary text; table headers use the text color on a faint wash |
| Colors | Window background: one background behind the whole window, showing through a clear frame (Frame) or through the page too (Whole window); a color per light and dark, with optional CSS backgrounds such as a paper texture drawn over it. On phones and tablets only the color carries over: to the sidebars, and to the page with Whole window | Off; the color defaults to the sidebar color |
| Colors | Graphite ink: buttons, toggles and links use the text color | Off |
| Interface | Roundness: scales every corner radius | 1.25 |
| Interface | Compact interface: a shorter header and tabs, closer rows in the sidebars, menus and settings; reading sizes stay the same. Desktop only | Off |
| Interface | Flat page: no floating card beside the sidebars | Off |
| Interface | Left-aligned tabs; tabs fit their titles | Off |
| Interface | Always show the note title in the header (otherwise it appears on hover) | Off |
| Interface | Disable sidebar peek | Off |
| Interface | Soft sidebar peek: the peeking sidebar sits on the page color and fades into the page, with no shadowed edge | Off |
| Interface | Auto-hide ribbon, revealed from the left edge together with the sidebar | Off |
| Interface | Quiet vault switcher: the vault foot keeps only Settings (Help is in the command palette); the vault name appears when the pointer reaches it | Off |
| Interface | Quiet sidebar toolbar: buttons rest as dots; hover opens them, or a tap on touch screens | Off |
| Interface | Quiet status bar: hidden until the pointer nears the bottom center | Off |
| Interface | Outline guides: a hairline per heading level in the outline view; the branch under the pointer darkens | Off |
| Interface | Disable entrance motion | Off |
| Interface | Pure black on phones and tablets in dark mode, for OLED screens | Off |
| Interface | Full-screen sidebars on phones: a swiped-in sidebar covers the whole screen; also narrow iPad windows | Off |
| Interface | Sidebars stay put on phones: with Obsidian's Sliding sidebar on, the sidebar stays underneath and the note slides off it | Off |
| Content | Card callouts: tinted frame with an inner content card | Off |
| Content | Plain tags, don't strike completed tasks | Off |
| Content | Colored headings: one hue per level, red at H1 to purple at H6 | Off |
| Content | Images fill the line width (only media without a set width; tall ones stay within the window) | Off |
| Content | Hairline tables: no frame or header wash, lines between rows only | Off |
| Content | Tables fill the line width, lining up with the text; notes with `table-wide` keep their own width | Off |
| Content | Wide tables grow: a table wider than the text spreads to both sides only as far as it needs, up to the pane, then scrolls; narrower tables stay as they are (needs readable line length; `table-wide` notes keep their own width) | Off |
| Content | Column lines in tables: hairlines between columns in every table, like `col-lines` | Off |
| Content | Striped Bases tables: stripes follow row position, so they stay put while long tables scroll | Off |
| Content | Plain Canvas background: no dot grid | Off |
| Content | Dark PDFs, dim PDFs in dark mode, dim images in dark mode | Off |

Still also respects the system "reduce motion" setting.

Keyboard focus on links in rendered notes always has a visible outline; this does not require Style Settings.

CJK typography, Justified paragraphs, First-line indent and Underline links can also be set per note: add `cjk` / `no-cjk`, `justify` / `no-justify`, `indent` / `no-indent` or `link-underline` / `no-link-underline` to the note's `cssclasses`. The note's class wins over the global option. An embedded note follows its own classes; inside a note that turns an option off, it stays off.

Back to the [README](../README.md).
