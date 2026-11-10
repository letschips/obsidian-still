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
  host.innerHTML='<div class="probe-page" style="background:var(--background-primary)"></div><div class="probe-side" style="background:var(--background-secondary)"></div><div class="markdown-rendered"><blockquote><p>Quote</p></blockquote><div class="markdown-embed">Embed</div><pre><code>code</code></pre></div><div class="menu" style="position:relative;inset:auto;width:200px"><div class="menu-item">Menu</div></div><input type="text" class="probe-input"><button class="probe-button">Button</button><span class="probe-muted" style="color:var(--text-muted)">m</span><span class="probe-faint" style="color:var(--text-faint)">f</span><span class="probe-link" style="color:var(--text-accent)">l</span><span class="probe-accent" style="background:var(--interactive-accent);color:var(--text-on-accent)">a</span><div class="workspace-split mod-sidedock mod-left-split is-sidedock-collapsed" style="display:flex;position:relative;width:200px;height:40px"></div>';
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
   // Secondary and faint text, and the optional accent, per preset and mode.
   const fg=sel=>norm(view.getComputedStyle(host.querySelector(sel)).color);
   const rl=c=>{const [r,g,b]=c.match(/[\d.]+/g).slice(0,3).map(v=>{v=Number(v)/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*r+0.7152*g+0.0722*b};
   const cr=(a,b)=>{const x=rl(a),y=rl(b);return Math.round((Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)*100)/100};
   const inks=()=>({page:bg('.probe-page'),side:bg('.probe-side'),muted:fg('.probe-muted'),faint:fg('.probe-faint'),link:fg('.probe-link'),accent:bg('.probe-accent'),onAccent:fg('.probe-accent')});
   stage='default inks';set('theme-light','still-preset-off','still-backdrop-off');let k=inks();
   check('Default light: secondary and faint text stay #4d4d4d and #939393',k.muted==='rgb(77, 77, 77)'&&k.faint==='rgb(147, 147, 147)',k);
   set('theme-dark','still-preset-off','still-backdrop-off');k=inks();
   check('Default dark: secondary and faint text stay #ababab and #7a7a7a',k.muted==='rgb(171, 171, 171)'&&k.faint==='rgb(122, 122, 122)',k);
   const graphite=body.classList.contains('still-graphite'),accentOn=body.classList.contains('still-preset-accent');body.classList.remove('still-graphite','still-preset-accent');
   try{
    for(const palette of ['theme-light','theme-dark'])for(const name of ['paper','mist','sand','sage','graphite','night']){
     stage=palette+' '+name+' inks';set(palette,'still-preset-off','still-backdrop-off');const base=inks();
     set(palette,'still-preset-'+name,'still-backdrop-off');k=inks();
     const faintMin=palette==='theme-light'?2.9:3.7;
     const c={mutedPage:cr(k.muted,k.page),mutedSide:cr(k.muted,k.side),faintPage:cr(k.faint,k.page),faintSide:cr(k.faint,k.side)};
     check(palette+' '+name+': secondary text holds 7:1 and faint text '+faintMin+':1 on page and sidebar',c.mutedPage>=6.9&&c.mutedSide>=6.9&&c.faintPage>=faintMin&&c.faintSide>=faintMin,{...k,...c});
     check(palette+' '+name+': the accent follows Appearance until Preset accent is on',k.accent===base.accent&&k.link===base.link,{k,base});
     body.classList.add('still-preset-accent');const a=inks();
     const ac={label:cr(a.onAccent,a.accent),linkPage:cr(a.link,a.page),linkSide:cr(a.link,a.side)};
     check(palette+' '+name+': Preset accent sets a hue that holds 4.5:1 as a fill and as link text',a.accent!==base.accent&&ac.label>=4.45&&ac.linkPage>=4.45&&ac.linkSide>=4.45,{...a,...ac});
     body.classList.remove('still-preset-accent');
    }
    stage='graphite ink over preset accent';set('theme-light','still-preset-sand','still-backdrop-off');body.classList.add('still-preset-accent','still-graphite');k=inks();
    check('Graphite ink wins over Preset accent',k.accent===norm(view.getComputedStyle(body).color)||k.accent==='rgb(46, 36, 25)',k);
    set('theme-light','still-preset-off','still-backdrop-off');body.classList.remove('still-graphite');const off=inks();body.classList.remove('still-preset-accent');const plain=inks();
    check('Preset accent does nothing with the preset off',off.accent===plain.accent&&off.link===plain.link,{off,plain});
   }finally{body.classList.remove('still-graphite','still-preset-accent');if(graphite)body.classList.add('still-graphite');if(accentOn)body.classList.add('still-preset-accent')}
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
