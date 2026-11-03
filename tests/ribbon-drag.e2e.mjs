// Auto-hide ribbon vs window drag regions, with Obsidian's real core CSS.
// On Windows a drag region is title bar to the OS: the page loses hover the
// moment the pointer enters one, so a revealed ribbon closes under it.
// Electron applies regions in tree order (later wins, z-index ignored), so the
// sidebar and note headers, which follow the ribbon, override its toggle.
// Failure cases: a drag region over the toggle or the ribbon's header row
// while revealed (also before the open sidebar has shifted aside), or over
// the parked ribbon's corner. Platform classes are simulated; this does not
// replace a Windows smoke test.
// Usage: node tests/ribbon-drag.e2e.mjs <vault> <report.json> [candidate.css]
import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
const [vault, output = 'still-ribbon-drag.json', candidate] = process.argv.slice(2);
if (!vault) throw Error('Pass a running test vault with Still selected');
const css = candidate ? readFileSync(candidate, 'utf8') : null;
const code = `(${async function(css) {
  if (app.customCss.theme !== 'Still') throw Error('Select Still before running this regression');
  const results = [], pause = ms => new Promise(r => setTimeout(r, ms));
  const electron = require('electron').remote;
  const ids = new Set(electron.BrowserWindow.getAllWindows().map(w => w.id));
  const oldLeaf = app.workspace.activeLeaf;
  const leaf = app.workspace.openPopoutLeaf({width: 900, height: 520});
  let win, attached = false;
  try {
    for (let n = 0; n < 60 && leaf.view.containerEl.ownerDocument === document; n++) await pause(50);
    const doc = leaf.view.containerEl.ownerDocument, view = doc.defaultView;
    if (doc === document) throw Error('Popout unavailable');
    const still = [...doc.styleSheets].find(s => !s.disabled && !s.href && s.ownerNode.textContent.includes('Still —'));
    if (!still) throw Error('Still stylesheet is not loaded');
    // Keep the node: replacing its text detaches the old sheet from it.
    const stillNode = still.ownerNode;
    if (css) stillNode.textContent = css;
    for (const sheet of doc.styleSheets) if (!sheet.href && sheet.ownerNode !== stillNode) sheet.disabled = true;
    if (!stillNode.sheet || stillNode.sheet.disabled) throw Error('Still stylesheet was disabled');
    win = electron.BrowserWindow.getAllWindows().find(w => !ids.has(w.id));
    const dbg = win.webContents.debugger;
    if (!dbg.isAttached()) { dbg.attach('1.3'); attached = true; }
    await dbg.sendCommand('DOM.enable');
    await dbg.sendCommand('CSS.enable');
    const header = cls => '<div class="workspace-tabs mod-top ' + cls + '"><div class="workspace-tab-header-container"><div class="workspace-tab-header-container-inner"><div class="workspace-tab-header is-active"><div class="workspace-tab-header-inner">Tab</div></div></div><div class="workspace-tab-header-spacer"></div></div></div>';
    const host = doc.createElement('div');
    host.id = 'still-ribbon-drag';
    host.style.cssText = 'position:fixed;inset:0;z-index:1000;background:var(--background-primary)';
    host.innerHTML = '<div class="workspace" style="position:relative;height:100%;overflow:hidden;display:flex"><div class="workspace-ribbon side-dock-ribbon mod-primary"><div class="sidebar-toggle-button mod-primary mod-left"><div class="clickable-icon">◧</div></div><div class="side-dock-actions"><div class="side-dock-ribbon-action clickable-icon">A</div></div></div><div class="workspace-split mod-horizontal mod-sidedock mod-left-split"></div><div class="workspace-split mod-vertical mod-root" style="flex:1"></div></div>';
    doc.body.append(host);
    const ribbon = host.querySelector('.workspace-ribbon'), toggle = ribbon.querySelector('.sidebar-toggle-button');
    const side = host.querySelector('.mod-left-split'), root = host.querySelector('.mod-root');
    const nodeId = (await dbg.sendCommand('DOM.querySelector', {nodeId: (await dbg.sendCommand('DOM.getDocument')).root.nodeId, selector: '#still-ribbon-drag .workspace-ribbon'})).nodeId;
    const region = (el, pseudo) => {
      const cs = view.getComputedStyle(el, pseudo);
      const v = cs.getPropertyValue('app-region') || cs.getPropertyValue('-webkit-app-region');
      return v === 'drag' || v === 'no-drag' ? v : null;
    };
    // Absolute pseudo boxes resolve against the nearest positioned box,
    // which may be the element itself.
    const pseudoRect = (el, pseudo) => {
      const cs = view.getComputedStyle(el, pseudo);
      if (cs.content === 'none' || cs.display === 'none') return null;
      if (cs.position !== 'absolute') return null;
      let box = el;
      while (box.parentElement && view.getComputedStyle(box).position === 'static') box = box.parentElement;
      const r = box.getBoundingClientRect(), n = v => parseFloat(v) || 0;
      const left = r.left + n(cs.left), top = r.top + n(cs.top);
      return {left, top, right: left + n(cs.width), bottom: top + n(cs.height)};
    };
    // Electron folds regions in tree order: drag adds, no-drag subtracts.
    const effective = (x, y) => {
      let state = null, by = null;
      const inside = r => r && x >= r.left && x < r.right && y >= r.top && y < r.bottom;
      const visit = el => {
        for (const [pseudo, rect] of [['::before', pseudoRect(el, '::before')]]) {
          const v = region(el, pseudo); if (v && inside(rect)) { state = v; by = el.className + pseudo; }
        }
        const v = region(el); if (v && inside(el.getBoundingClientRect())) { state = v; by = el.className; }
        for (const child of el.children) visit(child);
        const a = region(el, '::after'); if (a && inside(pseudoRect(el, '::after'))) { state = a; by = el.className + '::after'; }
      };
      visit(doc.body);
      return {state, by};
    };
    const check = (name, points) => {
      const hits = points.map(([x, y]) => ({x, y, ...effective(x, y)}));
      results.push({name, pass: hits.every(h => h.state !== 'drag'), evidence: hits.filter(h => h.state === 'drag')});
    };
    for (const platform of ['mod-windows', 'mod-linux']) {
      for (const collapsed of [false, true]) {
        doc.body.className = [platform, 'theme-light', 'is-frameless', 'is-hidden-frameless', 'show-ribbon', 'still-peek-ribbon'].join(' ');
        // Core gives the top-left space to the left sidebar when it is open,
        // otherwise to the first note tabs.
        side.innerHTML = header(collapsed ? '' : 'mod-top-left-space');
        root.innerHTML = header(collapsed ? 'mod-top-left-space' : '');
        side.classList.toggle('is-sidedock-collapsed', collapsed);
        side.style.cssText = collapsed ? 'display:none;width:0' : 'width:240px';
        ribbon.classList.toggle('is-collapsed', collapsed);
        const state = collapsed ? 'collapsed' : 'open';
        await pause(400);
        const hh = parseFloat(view.getComputedStyle(doc.body).getPropertyValue('--header-height')) || 40;
        check(`${platform} / ${state} / parked corner can reveal the ribbon`, [[2, hh / 2], [4, 4]]);
        await dbg.sendCommand('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: ['hover']});
        // Before the peek delay ends: the open sidebar has not shifted yet.
        await pause(20);
        const early = toggle.getBoundingClientRect();
        check(`${platform} / ${state} / toggle clear while revealing`, [[early.left + early.width / 2, early.top + early.height / 2]]);
        await pause(700);
        const t = toggle.getBoundingClientRect(), r = ribbon.getBoundingClientRect();
        const cx = t.left + t.width / 2, cy = t.top + t.height / 2;
        check(`${platform} / ${state} / toggle clear once revealed`, [[cx, cy], [t.left + 2, t.top + 2], [t.right - 2, t.top + 2], [t.left + 2, t.bottom - 2], [t.right - 2, t.bottom - 2]]);
        check(`${platform} / ${state} / ribbon header row clear`, [[r.left + 2, hh / 2], [r.right - 2, hh / 2], [r.left + 2, 2], [r.right - 2, 2]]);
        if (!collapsed) {
          // The open sidebar shifts by less than the ribbon's width; without
          // translucency an opaque ribbon hid the file tree's left edge.
          const s = side.getBoundingClientRect(), contentLeft = s.left + parseFloat(view.getComputedStyle(side).paddingLeft);
          const bg = view.getComputedStyle(ribbon).backgroundColor;
          const clear = bg === 'transparent' || /^rgba\(.*,\s*0\)$/.test(bg);
          results.push({name: `${platform} / open / sidebar edge shows through the ribbon`, pass: r.right <= contentLeft || clear, evidence: {bg, ribbonRight: r.right, contentLeft}});
        }
        await dbg.sendCommand('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: []});
      }
    }
    // Away from the ribbon the headers must still move the window.
    await pause(400);
    const tab = root.querySelector('.workspace-tab-header-container').getBoundingClientRect();
    const away = effective(tab.right - 20, tab.top + tab.height / 2);
    results.push({name: 'note header still drags the window when the ribbon is parked', pass: away.state === 'drag', evidence: away});
    host.remove();
  } catch (error) {
    results.push({name: 'Harness', pass: false, error: String(error)});
  } finally {
    if (attached) try {win.webContents.debugger.detach();} catch {}
    leaf.detach();
    if (oldLeaf) app.workspace.setActiveLeaf(oldLeaf, {focus: true});
  }
  return JSON.stringify({vault: app.vault.getName(), theme: app.customCss.theme, candidate: !!css, coverage: 'Real Obsidian renderer and core CSS; simulated Windows/Linux classes; drag regions folded in tree order as Electron does', results, passed: results.filter(r => r.pass).length, total: results.length});
}})(${JSON.stringify(css)})`;
const run = spawnSync('obsidian', [`vault=${vault}`, 'eval', `code=${code}`], {encoding: 'utf8', timeout: 60000, maxBuffer: 1 << 26});
if (run.error) throw run.error;
const marker = run.stdout.lastIndexOf('=> ');
const report = JSON.parse((marker >= 0 ? run.stdout.slice(marker + 3) : run.stdout).trim());
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(`${report.passed}/${report.total} passed`);
for (const r of report.results) if (!r.pass) console.log(`FAIL ${r.name}: ${JSON.stringify(r.evidence ?? r.error)}`);
process.exitCode = report.passed === report.total ? 0 : 1;
