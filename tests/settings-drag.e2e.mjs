// Settings runs in its own frameless window. Its floating titlebar must stay
// the window's drag region: a full-height no-drag modal cancels it. Chromium
// resolves drag regions natively, so this checks the styles that decide them;
// actually dragging the window remains a manual check.
// Usage: node tests/settings-drag.e2e.mjs <vault>
import {spawnSync} from 'node:child_process';
const vault = process.argv[2];
if (!vault) throw Error('Pass a running test vault with Still selected');
const code = `(${async function() {
  if (app.customCss.theme !== 'Still') throw Error('Select Still before running this regression');
  app.setting.close();
  app.setting.open();
  await new Promise(r => setTimeout(r, 800));
  const win = app.setting.win, doc = win.document, css = e => win.getComputedStyle(e);
  const modal = doc.querySelector('.modal.mod-settings');
  const bar = doc.querySelector('.titlebar').getBoundingClientRect();
  const content = doc.querySelector('.vertical-tab-content:not(.setting-page)');
  const box = content.getBoundingClientRect();
  return [
    ['titlebar is a drag region', css(doc.querySelector('.titlebar')).appRegion === 'drag'],
    ['modal does not cancel it', css(modal).appRegion !== 'no-drag'],
    ['search stays interactive', css(doc.querySelector('.vertical-tab-header input')).appRegion === 'no-drag'],
    ['content stops below the bar', box.top >= bar.bottom],
    ['content ends at the window edge', Math.abs(box.bottom - win.innerHeight) <= 1],
    ['content starts where it did', Math.abs(box.top + parseFloat(css(content).paddingTop) - 48) <= 1]
  ];
}})()`;
const run = spawnSync('obsidian', [`vault=${vault}`, 'eval', `code=${code}.then(JSON.stringify)`], {encoding: 'utf8', timeout: 30000});
if (run.error) throw run.error;
const marker = run.stdout.lastIndexOf('=> ');
const results = JSON.parse((marker >= 0 ? run.stdout.slice(marker + 3) : run.stdout).trim());
for (const [name, pass] of results) if (!pass) console.log(`FAIL ${name}`);
console.log(`${results.filter(r => r[1]).length}/${results.length} passed`);
process.exitCode = results.every(r => r[1]) ? 0 : 1;
