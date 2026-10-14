# Contributing to Still

Thanks for helping. Bug reports, screenshots of something that looks wrong, and small focused pull requests are all welcome.

## Reporting a problem

Open an [issue](https://github.com/letschips/obsidian-still/issues) with:

- Obsidian version and platform (Settings → About), and Still's version (`manifest.json`).
- Light or dark mode, and which Still options are on in Style Settings.
- Other CSS snippets and plugins that change the interface. Turning them off for a moment tells us whether Still alone is the cause.
- A screenshot, and the steps that lead to it.

## Changing the theme

`theme.css` is the whole theme. There is no build step.

1. Fork the repository and edit `theme.css`.
2. Copy it into a test vault: `node scripts/deploy.mjs <path to vault>`. Obsidian reloads the theme when the file changes.
3. Check light and dark mode, and phone or tablet layouts if your change can reach them (Obsidian's `dev:mobile` emulation is enough for a first look).
4. Run the checks below and open a pull request that says what changed and why. Before and after screenshots help.

### What Still holds to

- **Obsidian variables first.** Override core variables under `body`, `.theme-light` and `.theme-dark` before reaching for selectors. Keep selectors short and low in specificity; element-level rules (`button`, `input:focus`, `:focus-visible`) go inside `:where()` so plugins can override them.
- **Light to render.** No `backdrop-filter`, 3D transforms or `will-change`, no `filter` on the interface (the opt-in Dark PDFs option inverts PDF pages, nothing else), and no `:has()` on `body` or other wide containers. Panels move with `transform` and `opacity`; any other transition stays on a few small elements.
- **Opaque by design.** Still never makes the window translucent and never forces workspace backgrounds with `!important`. The header of `theme.css` names the three places that use `!important` (collapsed-sidebar inline styles, reduced motion, plugin guards in translucent windows); a new one needs the same kind of reason.
- **Options are additive.** Still works without Style Settings. Every new option is off by default and has an English and a Chinese title (`title.zh`), plus `description.zh` when it has a description.
- **Accent and fonts follow Obsidian.** Settings → Appearance stays in charge.
- **No remote assets.** Obsidian's [developer policies](https://docs.obsidian.md/Developer+policies) don't allow themes to load fonts or images from the network.
- **Obsidian 1.14 or later.** No selectors for older class names.

### Checks

- `node tests/settings.check.mjs` checks the Style Settings block. It needs only Node.
- `tests/*.e2e.mjs` run inside a live Obsidian through the [Obsidian CLI](https://obsidian.md/help/cli), with Still selected: `node tests/surfaces.e2e.mjs "<vault name>" report.json`. See the Development section of the README for what each one touches.

If a change fixes a bug that a check could catch, add the check, and make sure it fails without the fix.

## Releases

Maintainers bump `version` in `manifest.json`, add a `CHANGELOG.md` entry, and push a matching tag. The workflow in `.github/workflows/release.yml` drafts a release with `manifest.json` and `theme.css`.

## License

By contributing you agree that your contribution is released under the [MIT License](./LICENSE).

---

## 中文

欢迎反馈问题和提交修改。

- **反馈问题**：在 [Issues](https://github.com/letschips/obsidian-still/issues) 里写明 Obsidian 版本和系统、Still 版本、浅色还是深色、开了哪些 Still 选项，以及其他会改界面的 CSS 片段和插件（先关掉它们试一下，能判断是不是 Still 本身的问题），附上截图和复现步骤。
- **修改主题**：只需要改 `theme.css`，用 `node scripts/deploy.mjs <库路径>` 复制到测试库里看效果，浅色、深色都要看。原则见上文「What Still holds to」：优先改 Obsidian 变量、选择器保持低优先级；界面不用滤镜（只有可选的「深色 PDF」反色 PDF 页面）、背景模糊、3D 变换和 `will-change`；不加载远程资源；新选项默认关闭，并要有中文名称和说明。
- **检查**：`node tests/settings.check.mjs`，以及在打开的 Obsidian 里运行 `tests/*.e2e.mjs`。
