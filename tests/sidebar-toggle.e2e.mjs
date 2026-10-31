// Renderer regression with Obsidian's real core CSS. Platform classes and
// ribbon-owned toggles model Windows/Linux and macOS with a visible frame;
// this does not replace a native Windows smoke test.
// Usage: node tests/sidebar-toggle.e2e.mjs <vault> <report.json> [screenshot.png]
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const [vault, output = 'still-sidebar-toggle.json', screenshot] = process.argv.slice(2);
if (!vault) throw Error('Pass a running test vault with Still selected');
const code = `(${async function(screenshot) {
  if (app.customCss.theme !== 'Still') throw Error('Select Still before running this regression');
  const results = [], pause = ms => new Promise(r => setTimeout(r, ms));
  const electron = require('electron').remote;
  const ids = new Set(electron.BrowserWindow.getAllWindows().map(w => w.id));
  const oldLeaf = app.workspace.activeLeaf;
  const leaf = app.workspace.openPopoutLeaf({width: 720, height: 480});
  let win, attached = false;
  try {
    for (let n = 0; n < 60 && leaf.view.containerEl.ownerDocument === document; n++) await pause(50);
    const doc = leaf.view.containerEl.ownerDocument;
    if (doc === document) throw Error('Popout unavailable');
    if (![...doc.styleSheets].some(s => !s.disabled && !s.href && s.ownerNode.textContent.includes('Still —'))) throw Error('Still stylesheet is not loaded');
    win = electron.BrowserWindow.getAllWindows().find(w => !ids.has(w.id));
    const dbg = win.webContents.debugger;
    if (!dbg.isAttached()) { dbg.attach('1.3'); attached = true; }
    await dbg.sendCommand('DOM.enable');
    await dbg.sendCommand('CSS.enable');
    for (const sheet of doc.styleSheets) {
      if (!sheet.href && !sheet.ownerNode.textContent.includes('Still —')) sheet.disabled = true;
    }
    const host = doc.createElement('div');
    host.id = 'still-toggle-regression';
    host.style.cssText = 'position:fixed;inset:60px 20px 20px;z-index:1000;background:var(--background-primary)';
    host.innerHTML = '<div class="workspace" style="position:relative;height:100%;overflow:hidden"><div class="workspace-ribbon side-dock-ribbon mod-primary"><div class="sidebar-toggle-button mod-primary mod-left"><div class="clickable-icon">◧</div></div><div class="side-dock-actions"><div class="side-dock-ribbon-action clickable-icon">A</div><div class="side-dock-ribbon-action clickable-icon">B</div></div></div><div class="workspace-split mod-sidedock mod-left-split" style="width:240px"><div class="workspace-tabs mod-top"><div class="workspace-tab-header-container">Sidebar header</div></div></div><div class="workspace-split mod-root"><div class="workspace-tabs mod-top"><div class="workspace-tab-header-container">Note header</div></div></div></div>';
    doc.body.append(host);
    const frame = host.firstElementChild, ribbon = host.querySelector('.workspace-ribbon');
    const toggle = ribbon.querySelector('.sidebar-toggle-button');
    const tile = ribbon.querySelector('.side-dock-ribbon-action');
    const side = host.querySelector('.mod-left-split');
    const header = side.querySelector('.workspace-tab-header-container');
    const root = (await dbg.sendCommand('DOM.getDocument')).root.nodeId;
    const nodeId = (await dbg.sendCommand('DOM.querySelector', {nodeId: root, selector: '#still-toggle-regression .workspace-ribbon'})).nodeId;
    const rect = e => e.getBoundingClientRect().toJSON();
    const view = doc.defaultView;
    for (const platform of ['mod-windows', 'mod-linux', 'mod-macos']) {
      for (const palette of ['theme-light', 'theme-dark']) {
        for (const autoHide of [false, true]) {
          for (const collapsed of [false, true]) {
            doc.body.className = [platform, palette, 'is-frameless', 'show-ribbon', 'still-motion-off', autoHide ? 'still-peek-ribbon' : ''].join(' ');
            ribbon.prepend(toggle);
            ribbon.classList.toggle('is-collapsed', collapsed);
            side.classList.toggle('is-sidedock-collapsed', collapsed);
            side.style.cssText = collapsed ? 'display:none;width:0' : 'width:240px';
            await dbg.sendCommand('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: ['hover']});
            await pause(350);
            const f = rect(frame), t = rect(toggle), i = rect(tile);
            const hit = doc.elementFromPoint(t.left + t.width / 2, t.top + t.height / 2);
            results.push({name: [platform, palette, autoHide ? 'auto-hide' : 'fixed', collapsed ? 'collapsed' : 'open'].join(' / '), pass: Math.abs(t.top - f.top) < 1 && t.height >= 32 && t.bottom <= i.top && toggle.contains(hit), evidence: {frame: f, toggle: t, firstTile: i, hit: hit?.className}});
            if (screenshot && platform === 'mod-windows' && palette === 'theme-light' && autoHide && !collapsed) {
              require('fs').writeFileSync(screenshot, (await win.webContents.capturePage()).toPNG());
            }
            await dbg.sendCommand('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: []});
          }
        }
      }
    }
    // macOS hidden frame keeps the native header-owned toggle and ribbon gap.
    doc.body.className = 'mod-macos theme-light is-frameless is-hidden-frameless show-ribbon still-peek-ribbon still-motion-off';
    side.classList.remove('is-sidedock-collapsed'); side.style.cssText = 'width:240px';
    header.prepend(toggle);
    results.push({name: 'macOS hidden frame keeps header toggle and ribbon gap', pass: Math.abs(rect(toggle).top - rect(frame).top) < 1 && view.getComputedStyle(ribbon).paddingTop === '0px' && parseFloat(view.getComputedStyle(ribbon).marginTop) > 0});
    host.remove();
  } catch (error) {
    results.push({name: 'Harness', pass: false, error: String(error)});
  } finally {
    if (attached) try {win.webContents.debugger.detach();} catch {}
    leaf.detach();
    if (oldLeaf) app.workspace.setActiveLeaf(oldLeaf, {focus: true});
  }
  return JSON.stringify({vault: app.vault.getName(), theme: app.customCss.theme, coverage: 'Real Obsidian renderer, simulated platform classes and ribbon-owned toggle DOM', results, passed: results.filter(r => r.pass).length, total: results.length});
}})(${JSON.stringify(screenshot ? resolve(screenshot) : null)})`;
const run = spawnSync('obsidian', [`vault=${vault}`, 'eval', `code=${code}`], {encoding: 'utf8', timeout: 60000});
if (run.error) throw run.error;
const marker = run.stdout.lastIndexOf('=> ');
const report = JSON.parse((marker >= 0 ? run.stdout.slice(marker + 3) : run.stdout).trim());
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(`${report.passed}/${report.total} passed`);
for (const r of report.results) if (!r.pass) console.log(`FAIL ${r.name}: ${JSON.stringify(r.evidence ?? r.error)}`);
process.exitCode = report.passed === report.total ? 0 : 1;
