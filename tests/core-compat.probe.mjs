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
];

const browser = await chromium.launch({executablePath: chrome});
const page = await browser.newPage();
let fail = 0;
for (const [name, cls, html, prop, want, target] of cases) {
  await page.emulateMedia({media: name.startsWith('Print') ? 'print' : 'screen'});
  await page.setContent(`<!doctype html><html><head><style>${app}</style><style>${theme}</style></head><body class="${cls}">${html}</body></html>`);
  const got = await page.evaluate(([prop, target]) => {
    if (target === 'body::before') return getComputedStyle(document.body, '::before').getPropertyValue(prop);
    const a = getComputedStyle(document.getElementById('t')).getPropertyValue(prop);
    const u = document.getElementById('u');
    return u ? (a === getComputedStyle(u).getPropertyValue(prop) ? 'same' : a + ' vs ' + getComputedStyle(u).getPropertyValue(prop)) : a;
  }, [prop, target]);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `: want ${want}, got ${got}`}`);
}
await browser.close();
console.log(`${cases.length - fail}/${cases.length} passed`);
process.exit(fail ? 1 : 0);
