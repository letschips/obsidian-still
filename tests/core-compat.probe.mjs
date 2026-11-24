// Headless check of Still against Obsidian's own app.css (1.15+), no running
// Obsidian needed. Covers rules that meet core DOM introduced in 1.15.
// Usage: node tests/core-compat.probe.mjs <obsidian-x.y.z.asar> <playwright-core dir> <chrome binary>
import {readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const [asar, pw, chrome] = process.argv.slice(2);
if (!asar || !pw || !chrome) {
  console.error('Usage: node tests/core-compat.probe.mjs <obsidian.asar> <playwright-core dir> <chrome binary>');
  process.exit(2);
}
const buf = readFileSync(asar);
const size = buf.readUInt32LE(12), base = 8 + buf.readUInt32LE(4);
const entry = JSON.parse(buf.subarray(16, 16 + size).toString()).files['app.css'];
const app = buf.subarray(base + Number(entry.offset), base + Number(entry.offset) + entry.size).toString();
const theme = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'theme.css'), 'utf8');
const {chromium} = await import(pathToFileURL(join(pw, 'index.mjs')).href);

const W = html => `<div class="app-container"><div class="workspace">${html}</div></div>`;
// [name, body classes, body html, property, expected, target]
const cases = [
  ['Web Viewer address bar stays visible', 'theme-light', W('<div class="view-header"><div class="view-header-title-container webviewer-address-container" id=t></div></div>'), 'opacity', '1'],
  ['Plain header title still hides', 'theme-light', W('<div class="view-header"><div class="view-header-title-container" id=t></div></div>'), 'opacity', '0'],
  ['Bases multi-line cells wrap', 'theme-light', W('<div class="bases-table-container mod-multiline"><div class="bases-td"><div class="metadata-input-longtext" id=t>x</div></div></div>'), 'white-space', 'pre-wrap'],
  ['Note property long text stays one line', 'theme-light', W('<div class="metadata-properties"><div class="metadata-input-longtext" id=t>x</div></div>'), 'white-space', 'pre'],
  ['Dark PDF skips core Adapt to theme', 'theme-dark still-pdf-dark', W('<div class="pdf-container mod-themed"><div class="pdfViewer"><div class="page" id=t></div></div></div>'), 'filter', 'none'],
  ['Phone Bases sheet keeps full height', 'theme-light is-phone is-mobile', '<div class="menu bases-toolbar-menu mod-sheet"><div class="menu-scroll" id=t></div></div>', 'max-height', 'none'],
  ['Phone menu sheet keeps Still padding', 'theme-light is-phone is-mobile', '<div class="menu mod-sheet"><div class="menu-scroll" id=t></div></div>', 'padding-top', '32px'],
  ['Phone grouped menu first item keeps rounded top corners', 'theme-light is-phone is-mobile', '<div class="menu mod-sheet"><div class="menu-scroll"><div class="menu-group"><div class="menu-item" id=t>A</div><div class="menu-item">B</div></div></div></div>', 'border-top-left-radius', '12.5px'],
  ['Push drawers: 1.15 note cover hidden', 'theme-light is-phone is-mobile still-push-drawers', W('<div class="workspace-split mod-root is-sliding-sidebar" style="transform:translateX(300px)"><div class="workspace-drawer-backdrop" id=t style="opacity:1"></div></div>'), 'opacity', '0'],
  ['Push drawers: 1.15 navbar cover hidden', 'theme-light is-phone is-mobile still-push-drawers', W('<div class="mobile-navbar is-sliding-sidebar"><div class="workspace-drawer-navbar-backdrop" id=t style="opacity:1"></div></div>'), 'opacity', '0'],
  ['Canvas toolbars share one dark tone', 'theme-dark', W('<div class="canvas-card-menu" id=t></div><div class="canvas-control-group" id=u></div>'), 'background-color', 'same'],
  ['Active line skips YAML', 'theme-light still-active-line', W('<div class="markdown-source-view mod-cm6"><div class="cm-editor cm-focused"><div class="cm-line cm-active" id=t><span class="cm-hmd-frontmatter">a: b</span></div></div></div>'), 'background-color', 'rgba(0, 0, 0, 0)'],
  ['Tablet pinned drawer has its edge', 'theme-light is-mobile is-tablet', W('<div class="workspace-drawer mod-primary is-pinned" id=t></div>'), 'border-inline-end-width', '1px'],
  ['Print drops the window texture', 'theme-light still-backdrop-frame', '<div class="print"></div>', 'content', 'none', 'body::before'],
  ['Canvas tool buttons show the group tone', 'theme-dark', W('<div class="canvas-control-group"><div class="canvas-control-item" id=t></div></div>'), 'background-color', 'rgba(0, 0, 0, 0)'],
  ['Phone Bases sheet keeps core ground', 'theme-dark is-phone is-mobile', '<div class="menu bases-toolbar-menu mod-sheet" id=t><div class="menu-scroll"></div></div><div class="menu mod-sheet" id=u></div>', 'background-color', 'differs'],
  ['Phone Bases sheet grabber stays in flow', 'theme-light is-phone is-mobile', '<div class="menu bases-toolbar-menu mod-sheet"><div class="menu-grabber" id=t></div></div>', 'position', 'relative'],
  ['Push drawers: 1.15 note keeps core layer', 'theme-light is-phone is-mobile still-push-drawers', W('<div class="workspace-split mod-root is-sliding-sidebar" id=t style="transform:translateX(300px)"></div>'), 'z-index', '31'],
  ['Graphite ink: tags carry no accent hue', 'theme-light still-graphite', W('<div class="markdown-rendered"><a class="tag" id=t>#x</a></div>'), 'background-color', 'neutral'],
  ['Graphite ink: Canvas active tool is ink', 'theme-light still-graphite', W('<div class="canvas-control-group"><div class="canvas-control-item is-active" id=t></div></div>'), 'background-color', 'neutral'],
  ['Suggestion icons stay square', 'theme-light', W('<div class="suggestion-item"><div class="suggestion-flair-left"><img id=t></div></div>'), 'border-top-left-radius', '0px'],
  ['Kanban cards use the content radius', 'theme-light', W('<div class="bases-kanban-card" id=t></div>'), 'border-top-left-radius', '10px'],
  ['Folded card callout is even', 'theme-light still-card-callouts', W('<div class="callout is-collapsed"><div class="callout-title" id=t></div></div>'), 'padding-bottom', '12px'],
  ['CJK code blocks keep exact spacing', 'theme-light still-cjk', W('<div class="markdown-rendered"><pre><code id=t>「a」</code></pre></div>'), 'text-spacing-trim', 'space-all'],
  ['CJK table cells skip pretty wrapping', 'theme-light still-cjk', W('<div class="markdown-rendered"><table><tbody><tr><td id=t>cell</td></tr></tbody></table></div>'), 'text-wrap-style', 'auto'],
  ['First-line indent skips YAML frontmatter', 'theme-light still-indent', W('<div class="markdown-source-view mod-cm6 is-live-preview"><div class="cm-content"><div class="cm-line" id=t><span class="cm-hmd-frontmatter">---</span></div></div></div>'), 'text-indent', '0px'],
  ['First paragraph after YAML still indents', 'theme-light still-indent', W('<div class="markdown-source-view mod-cm6 is-live-preview" style="font-size:16px"><div class="cm-content"><div class="cm-line"><span class="cm-hmd-frontmatter">---</span></div><div class="cm-line" id=t>Body</div></div></div>'), 'text-indent', '32px'],
  ['Paragraph after a setext heading still indents', 'theme-light still-indent', W('<div class="markdown-source-view mod-cm6 is-live-preview" style="font-size:16px"><div class="cm-content"><div class="cm-line">Title</div><div class="cm-line HyperMD-header-line HyperMD-header-line-2">---</div><div class="cm-line" id=t>Body</div></div></div>'), 'text-indent', '32px'],
  ['Justify skips math blocks', 'theme-light still-justify', W('<div class="markdown-source-view mod-cm6 is-live-preview"><div class="cm-content"><div class="cm-line HyperMD-math" id=t>$$x$$</div></div></div>'), 'text-align', 'start'],
  ['Mobile tree items drop hover transition', 'theme-light is-mobile is-ios is-phone', W('<div class="tree-item-self" id=t>Note</div>'), 'transition-property', 'none'],
  ['Mobile properties skip desktop -8px shift', 'theme-light is-mobile is-phone', W('<div class="mod-root"><div class="markdown-preview-view"><div class="metadata-container"><div class="metadata-content" id=t></div></div></div></div>'), 'margin-left', '0px'],
  ['Mobile quiet properties drops core card fill', 'theme-light is-mobile is-phone still-quiet-properties', W('<div class="mod-root"><div class="markdown-preview-view"><div class="metadata-container"><div class="metadata-content" id=t></div></div></div></div>'), 'background-color', 'rgba(0, 0, 0, 0)'],
  ['Mobile quiet properties resets core card transform', 'theme-light is-mobile is-phone still-quiet-properties', W('<div class="mod-root"><div class="markdown-preview-view"><div class="metadata-container"><div class="metadata-content" id=t></div></div></div></div>'), 'transform', 'none'],
  ['Mobile tables keep desktop content radius', 'theme-light is-mobile is-phone', W('<div class="markdown-rendered"><table id=t><tbody><tr><td>a</td></tr></tbody></table></div>'), 'border-top-left-radius', '10px'],
  ['Mobile tab switcher avoids oversized radius', 'theme-light is-mobile is-phone', '<div class="mobile-tab-switcher"><div class="mobile-tab"><div class="mobile-tab-preview" id=t></div></div></div>', 'border-top-left-radius', '22.5px'],
  ['Phone prompt capsule drops desktop bottom border', 'theme-light is-mobile is-phone', '<div class="prompt"><div class="prompt-input-container" id=t><input type="text" class="prompt-input"></div></div>', 'border-bottom-width', '0px'],
  ['Phone prompt input uses lifted sheet card ground', 'theme-light is-mobile is-phone', '<div class="prompt"><div class="prompt-input-container"><input type="text" class="prompt-input" id=t></div></div>', 'background-color', 'rgb(250, 250, 250)'],
  ['Mobile wide table uses 24px drag-handle gutter', 'theme-light is-mobile is-tablet still-table-auto', W('<div class="markdown-source-view mod-cm6 is-readable-line-width" style="width:600px"><div class="cm-content"><div class="cm-table-widget" id=t><div class="table-wrapper"><table><tr><td>a</td></tr></table></div></div></div></div>'), 'width', '600px'],
  ['OLED black mobile lifts settings cards', 'theme-dark is-mobile is-phone still-black-mobile', '<div class="modal mod-settings"><div class="setting-group"><div class="setting-items" id=t></div></div></div>', 'background-color', 'rgb(25, 25, 25)'],
  ['OLED black mobile frames tab preview cards', 'theme-dark is-mobile is-phone still-black-mobile', '<div class="mobile-tab-switcher"><div class="mobile-tab"><div class="mobile-tab-preview-empty" id=t></div></div></div>', 'box-shadow', 'rgba(255, 255, 255, 0.11) 0px 0px 0px 1px'],
  ['Full-screen drawers disables push-drawers rounding', 'theme-light is-mobile is-phone still-full-drawers still-push-drawers', W('<div class="workspace-split mod-root is-sliding-sidebar" id=t style="transform:translateX(300px)"></div>'), 'border-top-left-radius', '0px'],
  ['Light floating nav uses raised surface', 'theme-light is-mobile is-phone is-floating-nav', '<div class="mobile-navbar mod-raised" id=t></div>', 'background-color', 'rgb(255, 255, 255)'],
  ['Mobile keyboard toolbar follows preset surface', 'theme-light is-mobile is-phone still-preset-paper', '<div class="mobile-toolbar"><div class="mobile-toolbar-options-list" id=t></div></div>', 'background-color', 'rgb(242, 233, 205)'],
  ['Floating-nav drawer keeps normal toolbar unclipped', 'theme-light is-mobile is-phone is-floating-nav', W('<div class="workspace-drawer"><div class="nav-buttons-container" id=t><div class="nav-action-button"></div><div class="nav-action-button"></div><div class="nav-action-button"></div><div class="nav-action-button"></div></div></div>'), 'overflow-x', 'visible'],
  ['Floating-nav drawer scrolls crowded toolbar', 'theme-light is-mobile is-phone is-floating-nav', W('<div class="workspace-drawer"><div class="nav-buttons-container" id=t><div class="nav-action-button"></div><div class="nav-action-button"></div><div class="nav-action-button"></div><div class="nav-action-button"></div><div class="nav-action-button"></div><div class="nav-action-button"></div><div class="nav-action-button"></div></div></div>'), 'overflow-x', 'auto'],
  ['Phone code block tightens horizontal padding', 'theme-light is-mobile is-phone', W('<div class="markdown-rendered" style="font-size:16px"><pre id=t><code>x</code></pre></div>'), 'padding-left', '14.4px'],
  ['Tablet fine-pointer enables quiet view header', 'theme-light is-mobile is-tablet still-quiet-header', W('<div class="workspace-split mod-root"><div class="workspace-tabs"><div class="view-header"><div class="view-actions" id=t></div></div></div></div>'), 'opacity', '0'],
  ['Narrow tablet shrinks horizontal file margins', 'theme-light is-mobile is-tablet', W('<div id=t style="padding-left:var(--file-margins-x)"></div>'), 'padding-left', '16px', null, {width: 600, height: 900}],
  ['Wide tablet keeps 24px horizontal file margins', 'theme-light is-mobile is-tablet', W('<div id=t style="padding-left:var(--file-margins-x)"></div>'), 'padding-left', '24px', null, {width: 820, height: 1180}],
  ['macOS scrollbar thumb keeps the Still hairline', 'theme-light mod-macos', W('<div id=t></div>'), '--scrollbar-thumb-bg', 'rgb(0 0 0 / 0.12)'],
  ['macOS slider thumb keeps its hairline edge', 'theme-light mod-macos', W('<input type=range id=t>'), '--slider-thumb-border-width', '0.5px'],
  ['macOS slider thumb stays opaque while pressed', 'theme-light mod-macos', W('<input type=range id=t>'), '--slider-thumb-opacity-active', '1'],
  ['macOS tree rows keep the desktop radius', 'theme-light mod-macos', W('<div class="tree-item-self" id=t>a</div>'), 'border-top-left-radius', '10px'],
  ['Phone tree rows take the touch radius', 'theme-light is-mobile is-phone', W('<div class="tree-item-self" id=t>a</div>'), 'border-top-left-radius', '17.5px'],
  ['macOS menus share the control corner curve', 'theme-light mod-macos', W('<div class="menu" id=t></div><button id=u>b</button>'), 'corner-shape', 'same'],
  ['macOS search field keeps the control corner curve', 'theme-light mod-macos', W('<div class="search-input-container"><input type="search" id=t></div><button id=u>b</button>'), 'corner-shape', 'same'],
  ['Windows tabs share the control corner curve', 'theme-light mod-windows', W('<div class="workspace-tab-header-container"><div class="workspace-tab-header" id=t></div></div><input type="text" id=u>'), 'corner-shape', 'same'],
  ['Phone note header uses the 44px touch height', 'theme-light is-mobile is-phone', W('<div class="workspace-leaf-content"><div class="view-header"><div class="view-actions" id=t></div></div></div>'), 'height', '44px'],
  ['Tablet note header keeps 52px', 'theme-light is-mobile is-tablet', W('<div class="workspace-leaf-content"><div class="view-header" id=t></div></div>'), 'height', '52px'],
];

// Static perf & typography guards:
// - [class*=...] triggers WholeSubtreeInvalidation on every class mutation.
// - rem units drift in popout windows (15px root) and iOS Dynamic Type.
const uncommented = theme.replace(/\/\*[\s\S]*?\*\//g, '');
const hasClassSubstring = /\[class\*=/.test(uncommented);
const hasRemUnit = /\drem\b/.test(uncommented);
let fail = 0;
if (hasClassSubstring) {
  fail++;
  console.log('FAIL No [class*=] attribute substring selectors in theme.css');
} else {
  console.log('ok   No [class*=] attribute substring selectors in theme.css');
}
if (hasRemUnit) {
  fail++;
  console.log('FAIL No rem units in theme.css');
} else {
  console.log('ok   No rem units in theme.css');
}

const browser = await chromium.launch({executablePath: chrome});
const page = await browser.newPage();
for (const [name, cls, html, prop, want, target, viewport] of cases) {
  await page.setViewportSize(viewport ?? {width: 1280, height: 720});
  await page.emulateMedia({media: name.startsWith('Print') ? 'print' : 'screen'});
  await page.setContent(`<!doctype html><html><head><style>${app}</style><style>${theme}</style></head><body class="${cls}">${html}</body></html>`);
  const got = await page.evaluate(([prop, target, want]) => {
    if (target === 'body::before') return getComputedStyle(document.body, '::before').getPropertyValue(prop);
    const a = getComputedStyle(document.getElementById('t')).getPropertyValue(prop);
    const u = document.getElementById('u');
    if (want === 'neutral') {
      // Graphite: any accent hue left over shows as unequal channels.
      const ok = a.match(/^oklch\(\S+ (\S+)/);
      if (ok) return parseFloat(ok[1]) < 0.02 ? 'neutral' : a;
      const c = document.createElement('canvas').getContext('2d');
      c.fillStyle = a; c.fillRect(0, 0, 1, 1);
      const [r, g, b, al] = c.getImageData(0, 0, 1, 1).data;
      return al === 0 || Math.max(r, g, b) - Math.min(r, g, b) <= 6 ? 'neutral' : a;
    }
    if (want === 'differs') return u && a !== getComputedStyle(u).getPropertyValue(prop) ? 'differs' : a;
    return u ? (a === getComputedStyle(u).getPropertyValue(prop) ? 'same' : a + ' vs ' + getComputedStyle(u).getPropertyValue(prop)) : a;
  }, [prop, target, want]);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `: want ${want}, got ${got}`}`);
}
// Peeking sidebars on macOS frameless windows: the collapsed sidebar's
// toggle stays in the page header under the panel. Resting on it keeps the
// panel open, the toggle stays on top and clickable, and the left panel's
// tabs start past it. Reduced motion drops the transitions so states settle.
const peekSide = side => `<div class="workspace-split mod-horizontal mod-sidedock mod-${side}-split is-sidedock-collapsed" id=${side}p style="width: 0px; display: none;"><div class="workspace-leaf-resize-handle"></div><div class="workspace-tabs mod-top mod-top-${side}-space"><div class="workspace-tab-header-container"><div class="workspace-tab-header-container-inner" id=${side}tabs><div class="workspace-tab-header">a</div><div class="workspace-tab-header">b</div></div></div><div class="workspace-tab-container"></div></div></div>`;
const peekHtml = `<div class="app-container" style="height: 100vh"><div class="workspace">${peekSide('left')}<div class="workspace-split mod-vertical mod-root"><div class="workspace-tabs mod-top mod-top-left-space mod-top-right-space"><div class="workspace-tab-header-container"><div class="sidebar-toggle-button mod-left mod-primary" id=lt><div class="clickable-icon" id=li>L</div></div><div class="workspace-tab-header-container-inner"></div><div class="sidebar-toggle-button mod-right mod-secondary" id=rt><div class="clickable-icon">R</div></div></div><div class="workspace-tab-container"></div></div></div>${peekSide('right')}</div></div>`;
const peekChecks = [];
await page.setViewportSize({width: 1280, height: 720});
await page.emulateMedia({media: 'screen', reducedMotion: 'reduce'});
await page.setContent(`<!doctype html><html><head><style>${app}</style><style>${theme}</style></head><body class="theme-light mod-macos is-hidden-frameless is-focused">${peekHtml}</body></html>`);
for (const side of ['left', 'right']) {
  const box = await page.locator(side === 'left' ? '#li' : '#rt .clickable-icon').boundingBox();
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  // Open from the edge strip first: the toggle must win over the open panel.
  await page.mouse.move(side === 'left' ? 2 : 1278, 400);
  await page.waitForTimeout(350);
  const onTop = await page.evaluate(([id, x, y]) => !!document.elementFromPoint(x, y)?.closest(id), [side === 'left' ? '#lt' : '#rt', x, y]);
  const fromEdge = await page.evaluate(side => getComputedStyle(document.getElementById(side + 'p')).opacity, side);
  await page.mouse.move(x, y);
  await page.waitForTimeout(350);
  const onToggle = await page.evaluate(side => getComputedStyle(document.getElementById(side + 'p')).opacity, side);
  peekChecks.push([`macOS ${side} peek opens from the edge`, fromEdge === '1', fromEdge]);
  peekChecks.push([`macOS ${side} toggle sits above the open peek panel`, onTop, onTop]);
  peekChecks.push([`macOS ${side} toggle hover closes the panel instead of holding it`, onToggle === '0', onToggle]);
  await page.mouse.move(640, 600);
}
// The header toggle alone does not open a collapsed sidebar; it sits beside
// the window buttons, so passing them must not spill a panel over the page.
for (const side of ['left', 'right']) {
  const box = await page.locator(side === 'left' ? '#li' : '#rt .clickable-icon').boundingBox();
  await page.mouse.move(640, 600);
  await page.waitForTimeout(50);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(500);
  const open = await page.evaluate(id => getComputedStyle(document.getElementById(id)).opacity, side + 'p');
  peekChecks.push([`macOS ${side} toggle hover alone keeps its sidebar closed`, open === '0', open]);
  await page.mouse.move(640, 600);
}
// Quiet tab bar buttons: a peeking panel shows the toggle that pins it.
await page.setContent(`<!doctype html><html><head><style>${app}</style><style>${theme}</style></head><body class="theme-light mod-macos is-hidden-frameless is-focused still-quiet-tab-actions">${peekHtml}</body></html>`);
for (const side of ['left', 'right']) {
  await page.mouse.move(640, 600);
  await page.waitForTimeout(50);
  const rest = await page.evaluate(id => getComputedStyle(document.getElementById(id)).opacity, side === 'left' ? 'lt' : 'rt');
  await page.mouse.move(side === 'left' ? 2 : 1278, 400);
  await page.waitForTimeout(350);
  const peek = await page.evaluate(id => getComputedStyle(document.getElementById(id)).opacity, side === 'left' ? 'lt' : 'rt');
  peekChecks.push([`Quiet ${side} toggle shows while its sidebar peeks`, rest === '0' && peek === '1', JSON.stringify({rest, peek})]);
}
// Auto-hide ribbon beside an open left sidebar: the tab content slides by
// transform, so the sidebar keeps its padding and width, the page does not
// move and the header row stays put.
await page.mouse.move(640, 600);
await page.setContent(`<!doctype html><html><head><style>${app}</style><style>${theme}</style></head><body class="theme-light mod-macos is-hidden-frameless is-focused show-ribbon still-peek-ribbon"><div class="app-container" style="height: 100vh"><div class="workspace"><div class="workspace-ribbon side-dock-ribbon mod-primary"><div class="side-dock-actions"><div class="clickable-icon side-dock-ribbon-action">A</div></div></div><div class="workspace-split mod-horizontal mod-sidedock mod-left-split" id=ls style="width: 300px;"><div class="workspace-leaf-resize-handle"></div><div class="workspace-sidedock-vault-profile"><div class="workspace-drawer-vault-switcher" id=vn>Vault</div></div><div class="workspace-tabs mod-top mod-top-left-space"><div class="workspace-tab-header-container"><div class="workspace-tab-header-container-inner" id=lh><div class="workspace-tab-header">a</div></div></div><div class="workspace-tab-container" id=lc><div class="workspace-leaf"></div></div></div></div><div class="workspace-split mod-vertical mod-root" id=rs><div class="workspace-tabs mod-top mod-top-right-space"><div class="workspace-tab-header-container"></div><div class="workspace-tab-container"></div></div></div></div></div></body></html>`);
const ribbonGeo = () => page.evaluate(() => ({pad: getComputedStyle(document.getElementById('ls')).paddingLeft, root: Math.round(document.getElementById('rs').getBoundingClientRect().left), header: Math.round(document.getElementById('lh').getBoundingClientRect().left), content: Math.round(document.getElementById('lc').getBoundingClientRect().left), vault: Math.round(document.getElementById('vn').getBoundingClientRect().left)}));
const atRest = await ribbonGeo();
await page.mouse.move(2, 400);
await page.waitForTimeout(50);
const revealed = await ribbonGeo();
peekChecks.push(['Auto-hide ribbon slides the open sidebar content', revealed.content - atRest.content >= 30, JSON.stringify({atRest, revealed})]);
peekChecks.push(['Auto-hide ribbon keeps the sidebar padding, page and header still', revealed.pad === '0px' && revealed.root === atRest.root && revealed.header === atRest.header, JSON.stringify({atRest, revealed})]);
peekChecks.push(['Auto-hide ribbon slides the vault name with the content', revealed.vault - atRest.vault === revealed.content - atRest.content, JSON.stringify({atRest, revealed})]);
// A single note tab centers on the page in every macOS sidebar state:
// window-control gap, left toggle and auto-hide ribbon on one side, new tab,
// tab list and the floating right toggle's slot on the other.
const tabIcon = '<div class="clickable-icon"><svg class="svg-icon"></svg></div>';
const tabHeader = (cls, leftToggle, rightToggle) => `<div class="workspace-tabs mod-top mod-active ${cls}"><div class="workspace-tab-header-container">${leftToggle ? `<div class="sidebar-toggle-button mod-primary mod-left">${tabIcon}</div>` : ''}<div class="workspace-tab-header-container-inner"><div class="workspace-tab-header tappable mod-active is-active" id=tab><div class="workspace-tab-header-inner"><div class="workspace-tab-header-inner-title">Note</div></div></div></div><div class="workspace-tab-header-new-tab"><span class="clickable-icon"><svg class="svg-icon"></svg></span></div><div class="workspace-tab-header-spacer"></div><div class="workspace-tab-header-tab-list"><span class="clickable-icon"><svg class="svg-icon"></svg></span></div>${rightToggle ? `<div class="sidebar-toggle-button mod-right mod-secondary">${tabIcon}</div>` : ''}</div><div class="workspace-tab-container"></div></div>`;
const tabSide = (which, collapsed) => `<div class="workspace-split mod-horizontal mod-sidedock mod-${which}-split${collapsed ? ' is-sidedock-collapsed' : ''}" style="${collapsed ? 'width: 0px; display: none;' : 'width: 260px;'}">${tabHeader(collapsed ? '' : `mod-top-${which}-space`, false, false).replace(' id=tab', '')}</div>`;
const offsets = {};
for (const ribbon of ['static', 'peek']) for (const lc of [false, true]) for (const rc of [false, true]) {
  const cls = `theme-light mod-macos is-frameless is-hidden-frameless is-focused show-ribbon${ribbon === 'peek' ? ' still-peek-ribbon' : ''}`;
  const ws = `<div class="workspace-ribbon side-dock-ribbon mod-primary${lc ? ' is-collapsed' : ''}"></div>${tabSide('left', lc)}<div class="workspace-split mod-vertical mod-root" id=rs>${tabHeader([lc ? 'mod-top-left-space' : '', rc ? 'mod-top-right-space' : ''].join(' '), lc, rc)}</div>${tabSide('right', rc)}`;
  await page.setContent(`<!doctype html><html><head><style>${app}</style><style>${theme}</style></head><body class="${cls}"><div class="app-container" style="height: 100vh"><div class="workspace">${ws}</div></div></body></html>`);
  offsets[`${ribbon} L:${lc ? 'closed' : 'open'} R:${rc ? 'closed' : 'open'}`] = await page.evaluate(() => { const t = document.getElementById('tab').getBoundingClientRect(), r = document.getElementById('rs').getBoundingClientRect(); return Math.round((t.left + t.right) / 2 - (r.left + r.right) / 2); });
}
peekChecks.push(['macOS single tab centers on the page in every sidebar state', Object.values(offsets).every(v => Math.abs(v) <= 1), JSON.stringify(offsets)]);
for (const [name, ok, got] of peekChecks) {
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `: got ${got}`}`);
}
await browser.close();
const total = cases.length + 2 + peekChecks.length;
console.log(`${total - fail}/${total} passed`);
process.exit(fail ? 1 : 0);
