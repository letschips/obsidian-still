// Requires running Obsidian desktop, enabled CLI, and `obsidian dev:debug on`.
// Run all, then activate the Obsidian main window and run focus.
// Opens only settings/browse windows; does not create or change vault notes.
// Usage: node tests/runtime.e2e.mjs <vault> <report.json> [regressions|all|focus]
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const VAULT=process.argv[2];if(!VAULT){console.error('Usage: node '+process.argv[1].split('/').pop()+' <vault name> <report.json> ...');process.exit(2)}
const scope=process.argv[4]??'all';
const code=String.raw`(async()=>{
 const results=[];const check=(name,pass,evidence)=>results.push({name,pass,evidence});
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const electron=require('electron').remote;
 const initialWindows=new Set(electron.BrowserWindow.getAllWindows().map(w=>w.id));
 const previousLeaf=app.workspace.activeLeaf,previousFocus=document.activeElement;
 const previousTab=app.setting.activeTab?.id;
 const wasOpen=app.setting.isOpen;
 if(SCOPE==='focus'){
  const previous=document.activeElement,status=document.querySelector('.status-bar'),item=status?.querySelector('button,[tabindex="0"]');
  item?.focus();await pause(350);
  check('Quiet status opens for keyboard focus',document.hasFocus()&&status.matches(':focus-within')&&status.offsetHeight>4&&getComputedStyle(item).opacity==='1',{windowFocused:document.hasFocus(),cssFocus:status.matches(':focus-within'),height:status.offsetHeight,opacity:getComputedStyle(item).opacity});
  previous?.focus();return JSON.stringify({vault:app.vault.getName(),theme:app.customCss.theme,scope:SCOPE,results,passed:results.filter(r=>r.pass).length,total:results.length});
 }
 const popupCheck=String.raw\`(()=>{
   const input=document.querySelector('input[type=search]')||document.querySelector('.search-input-container input');
   const r=input?.getBoundingClientRect();const hit=r&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   const title=document.querySelector('.titlebar')?.getBoundingClientRect();
   const controls=[...document.querySelectorAll('.community-modal-search button,.community-modal-controls .checkbox-container,.community-modal-grid-button-container button')];
   return {input:!!input,inputHit:!!input&&hit===input,inputY:r?.y,titleBottom:title?.bottom,
    controls:controls.map(e=>{const b=e.getBoundingClientRect();const h=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {cls:e.className,hit:!!h&&(e===h||e.contains(h)),y:b.y}}),
    opaque:getComputedStyle(document.querySelector('.modal')).backgroundColor};
 })()\`;
 async function inspect(w,label){
   const actual=await w.webContents.executeJavaScript(popupCheck);
   check(label+' search is clickable',actual.inputHit,actual);
   check(label+' controls are clickable',actual.controls.every(c=>c.hit),actual.controls);
   // A/B: exclude snippets and plugin style sheets while retaining core and Still.
   const clean=await w.webContents.executeJavaScript(\`(()=>{const changed=[];try{for(const s of document.styleSheets){if(!s.href&&!s.ownerNode.textContent.includes('Still —')){changed.push([s,s.disabled]);s.disabled=true}}return \${popupCheck}}finally{for(const [s,d] of changed)s.disabled=d}})()\`);
   check(label+' theme-only search is clickable',clean.inputHit,clean);
   check(label+' surface is opaque',!clean.opaque.endsWith(', 0)'),clean.opaque);
 }
 try{
   app.setting.open();await pause(600);app.setting.openTabById('community-plugins');await pause(100);
   const browse=[...app.setting.activeTab.containerEl.querySelectorAll('button')].find(e=>e.textContent==='浏览'||e.textContent==='Browse');
   if(!browse)throw Error('Community Plugins Browse button unavailable');browse.click();await pause(800);
   let popup=electron.BrowserWindow.getAllWindows().find(w=>!initialWindows.has(w.id)&&/第三方插件|Community plugins/i.test(w.getTitle()));
   popup??=electron.BrowserWindow.getAllWindows().find(w=>/第三方插件|Community plugins/i.test(w.getTitle()));
   if(!popup)throw Error('Plugin browser did not open');await inspect(popup,'Plugins');popup.close();await pause(150);
   app.setting.openTabById('appearance');await pause(100);
   const manage=[...app.setting.activeTab.containerEl.querySelectorAll('button')].find(e=>e.textContent==='管理'||e.textContent==='Manage');
   if(!manage)throw Error('Themes Manage button unavailable');manage.click();await pause(800);
   popup=electron.BrowserWindow.getAllWindows().find(w=>!initialWindows.has(w.id)&&/主题|Themes/i.test(w.getTitle()));
   if(!popup)throw Error('Theme browser did not open');await inspect(popup,'Themes');popup.close();await pause(150);
   if(SCOPE==='all'){
    const style=app.customCss.styleEl;
    const css=[...style.sheet.cssRules].filter(r=>r.selectorText).map(r=>r.selectorText);
    check('No body-wide relational selectors',!css.some(s=>/body[^\s,{>+~]*:has\(/.test(s)),{rules:css.length});
    check('No embedded fonts',!style.textContent.includes('data:font'),{});
    check('Core tab strip remains visible',[...document.querySelectorAll('.mod-root .workspace-tab-header')].filter(e=>e.offsetWidth>0&&e.offsetHeight>0).length>0,{});
    const base=[...document.styleSheets].find(s=>s.href?.endsWith('app.css'));
    const printRoot=document.createElement('div');printRoot.className='markdown-rendered';
    printRoot.style.cssText='position:fixed;left:500px;top:100px;width:500px;z-index:-1';
    printRoot.innerHTML='<table><tbody><tr><td>conducting arteries and continuous blood flow</td></tr></tbody></table><blockquote><p>Quote</p></blockquote>';
    document.body.append(printRoot);
    try{const cell=printRoot.querySelector('td');const cs=getComputedStyle(cell);check('Tables preserve whole words',cs.wordBreak!=='break-all'&&cs.overflowWrap!=='anywhere',{wordBreak:cs.wordBreak,overflowWrap:cs.overflowWrap});}finally{printRoot.remove()}
    const mobileRules=css.filter(s=>/is-mobile|is-phone/.test(s));
    check('Mobile drawers retain core gesture layout',!mobileRules.some(s=>/\.workspace-drawer/.test(s)&&/\.is-sidedock-collapsed/.test(s)),{mobileRules:mobileRules.length});
   }
 }finally{
   for(const w of electron.BrowserWindow.getAllWindows())if(!initialWindows.has(w.id))w.close();
   if(wasOpen&&previousTab){app.setting.open();await pause(600);app.setting.openTabById(previousTab)}else if(!wasOpen)app.setting.close();
   if(previousLeaf)app.workspace.setActiveLeaf(previousLeaf,{focus:false});previousFocus?.focus();
 }
 return JSON.stringify({vault:app.vault.getName(),theme:app.customCss.theme,scope:SCOPE,results,passed:results.filter(r=>r.pass).length,total:results.length});
})()` .replaceAll('\\`','`').replaceAll('\\${','${').replaceAll('SCOPE',JSON.stringify(scope));
const run=spawnSync('obsidian',[`vault=${VAULT}`,'eval',`code=${code}`],{encoding:'utf8',timeout:30000});
if(run.error)throw run.error;
const marker=run.stdout.lastIndexOf('=> ');
const out=(marker>=0?run.stdout.slice(marker+3):run.stdout).trim();
let report;try{report=JSON.parse(out)}catch{throw Error(out||run.stderr)}
writeFileSync(process.argv[3]??'still-runtime-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} passed`);
for(const r of report.results)if(!r.pass)console.log(`FAIL ${r.name}: ${JSON.stringify(r.evidence)}`);
process.exitCode=report.passed===report.total?0:1;
