// Real renderer regression: native translucency without the companion snippet.
// Usage: node tests/header-translucency.e2e.mjs <vault> <report.json> [theme.css]
// Replaces only the in-memory theme during the probe; restores it and all state.
import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';

const vault=process.argv[2];
if(!vault)throw Error('A vault name is required');
const candidate=readFileSync(process.argv[4]??new URL('../theme.css',import.meta.url),'utf8');
const code=String.raw`(()=>{
 const results=[],check=(name,pass,evidence)=>results.push({name,pass,evidence});
 const theme=app.customCss.styleEl,original=theme.textContent;
 if(app.customCss.theme!=='Still'||!original.includes('Still —'))throw Error('Still must be loaded');
 const classes=['theme-light','theme-dark','is-translucent','is-mobile','is-popout-window','is-popout-modal','still-backdrop-frame','still-backdrop-window'];
 const saved=classes.filter(c=>document.body.classList.contains(c));
 const sheets=[...document.styleSheets].filter(s=>!s.href&&/Still translucent window|baseline-translucent-window/.test(s.ownerNode?.textContent??''));
 const disabled=sheets.map(s=>s.disabled);
 const host=document.createElement('div');
 host.style.cssText='position:fixed;left:-10000px;top:0;width:500px;height:200px;visibility:hidden;--file-header-background:rgb(12,34,56);--file-header-background-focused:rgb(23,45,67)';
 host.innerHTML='<div class="workspace"><div class="workspace-split mod-root"><div class="workspace-tabs mod-active"><div class="workspace-leaf mod-active"><div class="workspace-leaf-content"><div class="view-header">Active</div><div class="view-content"></div></div></div><div class="workspace-leaf"><div class="workspace-leaf-content"><div class="view-header">Inactive</div></div></div></div></div></div>';
 const state=(palette,extra=[])=>{document.body.classList.remove(...classes);document.body.classList.add(palette,...extra)};
 const paint=e=>{const s=getComputedStyle(e);return {bg:s.backgroundColor,image:s.backgroundImage,color:s.color,border:s.borderBottom,shadow:s.boxShadow}};
 const headers=()=>[...host.querySelectorAll('.view-header')].map(paint);
 const transparent=v=>v==='rgba(0, 0, 0, 0)';
 try{
  sheets.forEach(s=>s.disabled=true);document.body.append(host);
  const real=document.querySelector('.mod-root .workspace-leaf.mod-active .view-header');
  if(!real)throw Error('An active main-window view header is required');
  const controls=()=>[...real.querySelectorAll('.clickable-icon')].map(e=>({html:e.innerHTML,paint:paint(e),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
  const surfaces=[...document.querySelectorAll('.app-container,.workspace,.workspace-split,.workspace-ribbon,.workspace-tab-header-container,.workspace-tab-container,.workspace-leaf-content,.view-content,.status-bar,.menu,.modal')];
  const scenarios=[['opaque',[]],['mobile',['is-translucent','is-mobile']],['popout',['is-translucent','is-popout-window']],['settings',['is-translucent','is-popout-modal']]];
  for(const palette of ['theme-light','theme-dark']){
   theme.textContent=original;state(palette,['is-translucent']);
   const before=surfaces.map(paint),beforeControls=controls(),height=real.getBoundingClientRect().height;
   theme.textContent=CANDIDATE;
   const actual=headers(),realBg=getComputedStyle(real).backgroundColor;
   check(palette+' active and inactive headers are transparent',actual.every(s=>transparent(s.bg)),actual);
   check(palette+' real view header is transparent',transparent(realBg),{background:realBg});
   check(palette+' other surfaces keep their appearance',JSON.stringify(before)===JSON.stringify(surfaces.map(paint)),{surfaces:surfaces.length});
   check(palette+' header controls and height stay unchanged',JSON.stringify(beforeControls)===JSON.stringify(controls())&&height===real.getBoundingClientRect().height,{controls:beforeControls.length,height});
   for(const [name,extra] of scenarios){
    state(palette,extra);theme.textContent=original;const before=headers();
    theme.textContent=CANDIDATE;const after=headers();
    check(palette+' '+name+' headers keep their opaque background',after.every(s=>['rgb(12, 34, 56)','rgb(23, 45, 67)'].includes(s.bg)),after);
    check(palette+' '+name+' headers retain their original appearance',JSON.stringify(before)===JSON.stringify(after),{before,after});
   }
  }
 }finally{
  theme.textContent=original;document.body.classList.remove(...classes);document.body.classList.add(...saved);
  sheets.forEach((s,i)=>s.disabled=disabled[i]);host.remove();
 }
 check('Theme, body state and snippets restored',theme.textContent===original&&classes.every(c=>document.body.classList.contains(c)===saved.includes(c))&&sheets.every((s,i)=>s.disabled===disabled[i]),{});
 return JSON.stringify({vault:app.vault.getName(),theme:app.customCss.theme,results,passed:results.filter(r=>r.pass).length,total:results.length});
})()`.replaceAll('CANDIDATE',()=>JSON.stringify(candidate));
const run=spawnSync('obsidian',[`vault=${vault}`,'eval',`code=${code}`],{encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024});
if(run.error)throw run.error;
const marker=run.stdout.lastIndexOf('=> ');
const out=(marker>=0?run.stdout.slice(marker+3):run.stdout).trim();
let report;try{report=JSON.parse(out)}catch{throw Error(out||run.stderr)}
writeFileSync(process.argv[3]??'still-header-translucency-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} passed`);
for(const r of report.results)if(!r.pass)console.log(`FAIL ${r.name}: ${JSON.stringify(r.evidence)}`);
process.exitCode=report.passed===report.total?0:1;
