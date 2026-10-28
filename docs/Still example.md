---
cssclasses:
  - table-wide
  # Try more: wide, max, img-wide, img-grid, embed-strict, table-small,
  # table-tiny, table-nowrap, table-numbers, row-alt, col-lines,
  # table-lines, table-center, cjk, no-cjk, justify, no-justify,
  # link-underline, no-link-underline
---

# Still example

Copy this note into a vault that uses Still, then switch between reading view and Live Preview. Everything here works without plugins; [Style Settings](https://github.com/obsidian-community/obsidian-style-settings) only adds options.

## Text

Body text keeps a readable line when **Settings → Editor → Readable line length** is on. Keys look like <kbd>⌘</kbd> <kbd>K</kbd>, and a footnote marker stays on its line.[^1]

Still 的中文排版是可选项：在 Style Settings 里打开「中文排版」，中文和 English 或数字 2026 之间会自动留出一点空隙，段尾也不容易只剩一个字。

> A quote sits on its own ground with an inset bar.

> [!note] Callout
> Callouts take a wash of their color, with no frame. Card callouts are an option.

## Tasks

The marks only change how a task looks. They don't schedule or move anything; plugins such as Tasks do that.

- [ ] To do
- [x] Done
- [/] In progress
- [>] Forwarded
- [<] Scheduled
- [?] Question
- [!] Important
- [*] Star
- [-] Cancelled

Nested lists show indentation guides when **Settings → Editor → Indentation guides** is on:

- Project
	- Research
		- Read the brief
	- Draft

## Tables

This note has `table-wide` in its `cssclasses`, so wide tables (and embedded Bases) spread past the text and narrow ones line up with it. `img-wide` does the same for images. Without readable line length these classes have nothing to widen.

| Plan | Notes | Sync | Publish | Price |
| --- | --- | --- | --- | --- |
| Free | Unlimited | — | — | 0 |
| Plus | Unlimited | Yes | — | 4 |

| Day | Reading | Writing | Walking | Sleep | Mood | Focus | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mon | 40 min | 900 words | 6,200 steps | 7 h 10 min | Calm | Deep | Finished the outline |
| Tue | 25 min | 1,400 words | 8,100 steps | 6 h 40 min | Busy | Scattered | Two meetings |

## Quick reference

- Accent color, fonts and text size: **Settings → Appearance**.
- Line width, line height and spacing: Style Settings → Still → Reading.
- Chinese typography: Style Settings → Still → Reading → CJK typography. To set it for one note only, add `cjk` or `no-cjk` to `cssclasses`; `justify` / `no-justify` and `link-underline` / `no-link-underline` work the same way.
- Editing position: Style Settings → Still → Reading → Active line highlight (当前编辑行提示). The wash follows the cursor and disappears when the editor loses focus.
- Link visibility: Style Settings → Still → Reading → Underline links (链接常显下划线). Both options are off by default. In reading view, use Tab to reach a web link and see its focus outline.
- Per-note layout: add a class from the list at the top to `cssclasses`. `img-grid` works in reading view only. `embed-strict` suits notes stitched together from `![[note#section]]` embeds.
- Back to defaults: reset Still's options in Style Settings and remove the classes from `cssclasses`.

[^1]: Footnotes read as quiet end matter.
