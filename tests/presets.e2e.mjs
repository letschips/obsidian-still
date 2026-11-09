// Obsidian renderer E2E: presets and window background reach every surface
// that reads the sidebar tone (quotes, embeds, code, floats, form fields,
// sidebar peek), and the default palette stays exactly as before.
// Runs in a temporary popout; no note or config writes.
// Usage: node tests/presets.e2e.mjs <vault> <report.json>
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const VAULT=process.argv[2];if(!VAULT){console.error('Usage: node '+process.argv[1].split('/').pop()+' <vault name> <report.json>');process.exit(2)}
const code=String.raw`(async()=>{
 const results=[];const check=(name,pass,evidence)=>results.push({name,pass,evidence});
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const oldLeaf=app.workspace.activeLeaf;
 const leaf=app.workspace.openPopoutLeaf({width:620,height:660});
 let doc,host,stage='setup';
 try{
  for(let n=0;n<60&&leaf.view.containerEl.ownerDocument===document;n++)await pause(50);
  doc=leaf.view.containerEl.ownerDocument;
  if(doc===document)throw Error('Popout unavailable');
  for(const s of doc.styleSheets)if(!s.href&&!s.ownerNode.textContent.includes('Still —'))s.disabled=true;
  const body=doc.body,view=doc.defaultView;
  // The window background skips popouts; let this one stand in for the main window.
  body.classList.remove('is-translucent','is-popout-window','is-popout-modal','is-mobile');
  host=doc.createElement('div');host.style.cssText='position:fixed;inset:0;overflow:hidden;z-index:100';
  host.innerHTML='<div class="probe-page" style="background:var(--background-primary)"></div><div class="probe-side" style="background:var(--background-secondary)"></div><div class="markdown-rendered"><blockquote><p>Quote</p></blockquote><div class="markdown-embed">Embed</div><pre><code>code</code></pre></div><div class="menu" style="position:relative;inset:auto;width:200px"><div class="menu-item">Menu</div></div><input type="text" class="probe-input"><button class="probe-button">Button</button><div class="workspace-split mod-sidedock mod-left-split is-sidedock-collapsed" style="display:flex;position:relative;width:200px;height:40px"></div>';
  body.append(host);
  // color-mix() serializes as color(srgb 0-1); compare everything as rounded rgb.
  const norm=c=>{const m=c.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/);if(!m)return c;const [r,g,b]=m.slice(1,4).map(x=>Math.round(x*255));return m[4]===undefined?'rgb('+r+', '+g+', '+b+')':'rgba('+r+', '+g+', '+b+', '+m[4]+')'};
  const bg=(sel,pseudo)=>norm(view.getComputedStyle(host.querySelector(sel),pseudo).backgroundColor);
  const img=(sel,pseudo)=>view.getComputedStyle(host.querySelector(sel),pseudo).backgroundImage.replace(/color\(srgb [^)]*\)/g,norm);
  const lum=c=>{const [r,g,b]=c.match(/[\d.]+/g).map(Number);return 0.2126*r+0.7152*g+0.0722*b};
  const surfaces=()=>({page:bg('.probe-page'),side:bg('.probe-side'),quote:bg('blockquote'),embed:bg('.markdown-embed'),code:bg('pre'),menu:bg('.menu'),input:bg('.probe-input'),button:bg('.probe-button')});
  const presets=[...body.classList].filter(c=>c.startsWith('still-preset-')||c.startsWith('still-backdrop-'));
  const theme=[...body.classList].find(c=>c==='theme-light'||c==='theme-dark');
  // The vault's own peek options would change what the peek panel paints.
  const peek=['still-peek-soft','still-peek-off'].filter(c=>body.classList.contains(c));body.classList.remove(...peek);
  const set=(palette,...cls)=>{body.classList.remove('theme-light','theme-dark',...[...body.classList].filter(c=>/^still-(preset|backdrop)-/.test(c)));body.classList.add(palette,...cls)};
  try{
   stage='default light';set('theme-light','still-preset-off','still-backdrop-off');let s=surfaces();
   check('Default light: quote and embed stay #eaeaeb',s.quote==='rgb(234, 234, 235)'&&s.embed==='rgb(234, 234, 235)',s);
   stage='default dark';set('theme-dark','still-preset-off','still-backdrop-off');s=surfaces();
   check('Default dark: quote, embed and field stay #202020',[s.quote,s.embed,s.input].every(c=>c==='rgb(32, 32, 32)'),s);
   check('Default dark: menu stays #262626',s.menu==='rgb(38, 38, 38)',s);
   check('Default dark: button stays #292929',s.button==='rgb(41, 41, 41)',s);
   for(const [palette,preset] of [['theme-light','still-preset-paper'],['theme-light','still-preset-sand'],['theme-dark','still-preset-sand'],['theme-dark','still-preset-night']]){
    stage=palette+' '+preset;set(palette,preset,'still-backdrop-off');s=surfaces();
    check(palette+' '+preset+': quote, embed and code take the sidebar tone',[s.quote,s.embed,s.code].every(c=>c===s.side),s);
    if(palette==='theme-dark'){
     check(palette+' '+preset+': field takes the sidebar tone',s.input===s.side,s);
     check(palette+' '+preset+': menu and button sit above the page',lum(s.menu)>lum(s.page)&&lum(s.button)>lum(s.page),s);
    }
   }
   // Window color set alone: floats take it, opaque.
   stage='frame with window color';set('theme-light','still-preset-off','still-backdrop-frame');
   body.style.setProperty('--still-backdrop-color','rgba(242, 233, 205, 0.6)');await pause(30);
   s=surfaces();const panel=bg('.mod-sidedock','::before');
   check('Frame: sidebar tone follows the window color, opaque',s.side==='rgb(242, 233, 205)',s);
   check('Frame: collapsed sidebar peek takes the window color',panel==='rgb(242, 233, 205)',{panel});
   stage='whole window soft peek';set('theme-light','still-preset-off','still-backdrop-window','still-peek-soft');
   const soft=img('.mod-sidedock','::before');
   check('Whole window: soft peek fades from the window color',soft.includes('rgb(242, 233, 205)'),{soft});
   body.classList.remove('still-peek-soft');body.style.removeProperty('--still-backdrop-color');
   stage='frame with preset';set('theme-light','still-preset-paper','still-backdrop-frame');s=surfaces();
   check('Frame with Paper: peek and sidebar keep the preset sidebar',bg('.mod-sidedock','::before')==='rgb(242, 233, 205)'&&s.side==='rgb(242, 233, 205)',s);
   stage='mobile whole window';body.classList.add('is-mobile');
   set('theme-light','still-preset-paper','still-backdrop-window');s=surfaces();
   check('Phone Whole window with Paper: the page takes the ground',s.page==='rgb(242, 233, 205)',s);
   set('theme-light','still-preset-paper','still-backdrop-frame');s=surfaces();
   check('Phone Frame with Paper: the page keeps the preset page',s.page==='rgb(253, 248, 232)',s);
   body.classList.remove('is-mobile');
  }finally{body.style.removeProperty('--still-backdrop-color');body.classList.remove('is-mobile','still-peek-soft');set(theme??'theme-light',...presets);body.classList.add(...peek)}
  return JSON.stringify({vault:app.vault.getName(),theme:app.customCss.theme,results,passed:results.filter(r=>r.pass).length,total:results.length});
 }catch(e){return JSON.stringify({stage,error:String(e),stack:e.stack,results,passed:results.filter(r=>r.pass).length,total:results.length})}finally{
  host?.remove();leaf.detach();if(oldLeaf)app.workspace.setActiveLeaf(oldLeaf,{focus:false});
 }
})()`;
const run=spawnSync('obsidian',[`vault=${VAULT}`,'eval',`code=${code}`],{encoding:'utf8',timeout:30000});
if(run.error)throw run.error;
const marker=run.stdout.lastIndexOf('=> ');const out=(marker>=0?run.stdout.slice(marker+3):run.stdout).trim();
let report;try{report=JSON.parse(out)}catch{throw Error(out||run.stderr)}
writeFileSync(process.argv[3]??'still-presets-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} passed`);for(const r of report.results)if(!r.pass)console.log(`FAIL ${r.name}: ${JSON.stringify(r.evidence)}`);
if(report.error)console.log(report.stage+': '+report.stack);
process.exitCode=!report.error&&report.passed===report.total?0:1;
