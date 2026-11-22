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
  ['Justify skips math blocks', 'theme-light still-justify', W('<div class="markdown-source-view mod-cm6 is-live-preview"><div class="cm-content"><div class="cm-line HyperMD-math" id=t>$$x$$</div></div></div>'), 'text-align', 'start'],
  ['Mobile tree items drop hover transition', 'theme-light is-mobile is-ios is-phone', W('<div class="tree-item-self" id=t>Note</div>'), 'transition-property', 'none'],
];

// Static perf guard: [class*=...] to the left of a combinator triggers
// WholeSubtreeInvalidation on every class mutation across the document.
const hasClassSubstring = /\[class\*=/.test(theme.replace(/\/\*[\s\S]*?\*\//g, ''));
let fail = 0;
if (hasClassSubstring) {
  fail++;
  console.log('FAIL No [class*=] attribute substring selectors in theme.css');
} else {
  console.log('ok   No [class*=] attribute substring selectors in theme.css');
}

const browser = await chromium.launch({executablePath: chrome});
const page = await browser.newPage();
for (const [name, cls, html, prop, want, target] of cases) {
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
await browser.close();
const total = cases.length + 1;
console.log(`${total - fail}/${total} passed`);
process.exit(fail ? 1 : 0);
