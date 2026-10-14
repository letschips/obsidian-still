// Actual Obsidian mobile emulation; run after `dev:mobile on` and selecting Still.
// Breaks caught: small touch targets, squeezed drawer names, clipped sheets,
// keyboard overlap, short tablet tabs, and pinned drawers with wasted margins.
// No note writes. Geometry checks plus screenshot artifacts; device gestures
// are attempted through Chrome touch input and remain distinct from real hardware.
// Usage: node tests/mobile.e2e.mjs <vault> <report.json> [targeted|all]
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as pause} from 'node:timers/promises';
const VAULT=process.argv[2];if(!VAULT){console.error('Usage: node '+process.argv[1].split('/').pop()+' <vault name> <report.json> ...');process.exit(2)}
const reportPath=resolve(process.argv[3]??'still-mobile-results.json');mkdirSync(dirname(reportPath),{recursive:true});
const scope=process.argv[4]??'all';const palette=process.argv[5]??'theme-light';
// Core chooses phone/tablet when the window loads. A CDP viewport resize
// alone cannot switch that choice, so initialize each native layout first.
if(scope==='all'||scope==='targeted'){
 const cli=(...args)=>spawnSync('obsidian',[`vault=${VAULT}`,...args],{encoding:'utf8',timeout:15000});
 const evaluate=js=>{const r=cli('eval',`code=${js}`),n=r.stdout.lastIndexOf('=> ');if(n<0)throw Error(r.stdout||r.stderr);return JSON.parse(r.stdout.slice(n+3))};
 const saved=evaluate('JSON.stringify({bounds:require("electron").remote.getCurrentWindow().getBounds(),mobile:app.isMobile})');
 if(!saved.mobile)throw Error('Enable actual Obsidian mobile emulation first');
 async function prepare(width,height){
  const resize=cli('eval',`code=require('electron').remote.getCurrentWindow().setSize(${width},${height})`);if(resize.error)throw resize.error;
  cli('reload');let ready=false;
  for(let n=0;n<30&&!ready;n++){await pause(200);cli('dev:debug','on');try{const state=evaluate('JSON.stringify({mobile:app.isMobile,phone:document.body.classList.contains("is-phone"),tablet:document.body.classList.contains("is-tablet")})');ready=state.mobile&&(width<600?state.phone:state.tablet)}catch{}}
  if(!ready)throw Error('Mobile window did not finish reloading');
 }
 const parts=[];
 try{
  for(const[kind,width,height]of [['phone',390,844],['tablet',820,1180]]){
   await prepare(width,height);
   const partPath=reportPath.replace(/\.json$/,'')+'-'+kind+'.json';
   const run=spawnSync(process.execPath,[fileURLToPath(import.meta.url),VAULT,partPath,scope==='targeted'?kind+'-targeted':kind,palette],{encoding:'utf8',timeout:60000});
   if(run.error)throw run.error;
   process.stdout.write(run.stdout);if(run.stderr)process.stderr.write(run.stderr);
   parts.push(JSON.parse(readFileSync(partPath,'utf8')));
  }
 }finally{
  cli('eval',`code=require('electron').remote.getCurrentWindow().setBounds(${JSON.stringify(saved.bounds)})`);
  cli('reload');await pause(500);cli('dev:debug','on');
 }
 const report={vault:VAULT,theme:'Still',scope,palette,profiles:parts.flatMap(p=>p.profiles),results:parts.flatMap(p=>p.results),passed:parts.reduce((n,p)=>n+p.passed,0),total:parts.reduce((n,p)=>n+p.total,0),errors:parts.filter(p=>p.error).map(p=>({stage:p.stage,error:p.error}))};
 writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
 console.log(`${report.passed}/${report.total} passed across native phone and tablet layouts`);
 process.exit(report.errors.length||report.passed!==report.total?1:0);
}
const code=String.raw`(async()=>{
 const results=[],profiles=[],check=(name,pass,evidence)=>results.push({name,pass,evidence});
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),electron=require('electron').remote;
 const wc=electron.getCurrentWebContents(),debug=wc.debugger,win=electron.getCurrentWindow();
 if(!app.isMobile||app.customCss.theme!=='Still')throw Error('Select Still and enable actual Obsidian mobile emulation first');
 const saved={style:document.body.getAttribute('style'),classes:document.body.className,bounds:win.getBounds(),leaf:app.workspace.activeLeaf,left:app.workspace.leftSplit.collapsed,right:app.workspace.rightSplit.collapsed,leftPinned:app.workspace.leftSplit.isPinned,rightPinned:app.workspace.rightSplit.isPinned};
 const sheets=app.customCss.extraStyleEls.map(e=>[e.sheet,e.sheet.disabled]);
 let menu,stage='setup';
 const rect=e=>e.getBoundingClientRect().toJSON();
 async function viewport(width,height){
  document.activeElement?.blur();app.workspace.leftSplit.setPinned(false);app.workspace.rightSplit.setPinned(false);app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();
  await debug.sendCommand('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await pause(180);app.workspace.onResize();await pause(80);
  return {width:innerWidth,height:innerHeight,body:document.body.className};
 }
 async function menuCtor(){
  if(window.__stillMobileMenuCtor)return window.__stillMobileMenuCtor;
  const view=app.workspace.activeLeaf.view,orig=view.onPaneMenu;let captured;
  view.onPaneMenu=function(m,...args){captured=m;return orig.call(this,m,...args)};
  try{view.moreOptionsButtonEl.click();await pause(70);if(!captured)throw Error('Native pane menu unavailable');return captured.constructor}finally{view.onPaneMenu=orig;captured?.hide()}
 }
 async function treeStep(drawer){
  // Indent between a top-level folder and its children, measured on the text.
  const view=app.workspace.getLeavesOfType('file-explorer')[0]?.view;if(!view)return{step:Infinity};
  const item=Object.values(view.fileItems).find(i=>i.file.children?.length&&i.file.parent?.isRoot());
  const was=item.collapsed;if(was){item.setCollapsed(false);await pause(250)}
  const text=e=>e.querySelector('.tree-item-inner').getBoundingClientRect().left;
  const child=Object.values(view.fileItems).find(i=>i.file.parent===item.file&&i.selfEl.offsetHeight&&!i.selfEl.style.translate)?.selfEl;
  const r={folder:item.file.path,parent:text(item.selfEl),child:child&&text(child)};r.step=child?r.child-r.parent:Infinity;
  if(was){item.setCollapsed(true);await pause(150)}
  return r;
 }
 function contentRadius(){
  // Touch chrome is rounder on mobile; reading content keeps the desktop corners.
  const host=document.createElement('div');host.className='markdown-rendered';host.style.cssText='position:fixed;left:0;top:0;width:300px;z-index:-1';
  host.innerHTML='<pre><code>x</code></pre><p><code>inline</code></p><div class="callout"></div><blockquote><p>q</p></blockquote><div class="markdown-embed"></div><div class="internal-embed image-embed"><img width="40" height="40"></div>';
  document.body.append(host);const r=e=>getComputedStyle(host.querySelector(e)).borderTopLeftRadius;
  const k=parseFloat(getComputedStyle(document.body).getPropertyValue('--still-r')),block=8*k+'px';
  const out={actual:{pre:r('pre'),code:r('p code'),callout:r('.callout'),quote:r('blockquote'),embed:r('.markdown-embed'),image:r('img')},expected:{pre:block,code:4*k+'px',callout:block,quote:block,embed:block,image:block}};
  host.remove();return out;
 }
 function blackMobile(drawer){
  // OLED option: black page and drawer in dark mode only; code keeps a lift.
  const saved=document.body.className,set=(dark,on)=>{document.body.classList.toggle('theme-dark',dark);document.body.classList.toggle('theme-light',!dark);document.body.classList.toggle('still-black-mobile',on)};
  const read=()=>{const host=document.createElement('div');host.className='markdown-rendered';host.innerHTML='<pre><code>x</code></pre>';document.body.append(host);const r={page:getComputedStyle(document.body).getPropertyValue('--background-primary').trim(),drawer:getComputedStyle(drawer).backgroundColor,code:getComputedStyle(host.querySelector('pre')).backgroundColor};host.remove();return r};
  set(true,true);const black=read();set(true,false);const dark=read();set(false,true);const light=read();
  document.body.className=saved;return{black,dark,light};
 }
 async function shot(name){
  const im=await Promise.race([debug.sendCommand('Page.captureScreenshot',{format:'png',captureBeyondViewport:true}),pause(8000).then(()=>{throw Error('Screenshot timed out')})]);
  require('fs').writeFileSync(ARTIFACT_DIR+'/'+name+'-'+PALETTE+'.png',Buffer.from(im.data,'base64'));
 }
 try{
  for(const [s]of sheets)s.disabled=true;
  document.body.classList.remove('is-translucent','theme-light','theme-dark');document.body.classList.add(PALETTE);
  await debug.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  const Menu=await menuCtor();
  const phones=SCOPE.startsWith('tablet')?[]:SCOPE.endsWith('targeted')?[[390,844]]:[[320,740],[390,844],[430,932],[844,390]];
  for(const[w,h]of phones){
   stage='phone '+w+'x'+h;const device=await viewport(w,h);profiles.push(device);check(stage+' uses native phone layout',document.body.classList.contains('is-phone'),device);
   document.body.style.setProperty('--safe-area-inset-top',h>w?'47px':'0px');document.body.style.setProperty('--safe-area-inset-bottom','34px');
   app.workspace.leftSplit.expand();await pause(300);
   const drawer=document.querySelector('.workspace-drawer.mod-left');
   const searchLeaf=app.workspace.getLeavesOfType('search')[0],fileLeaf=app.workspace.getLeavesOfType('file-explorer')[0];
   if(searchLeaf){app.workspace.leftSplit.selectTab(searchLeaf);app.workspace.setActiveLeaf(searchLeaf,{focus:false});await searchLeaf.loadIfDeferred();app.workspace.leftSplit.expand();await pause(200)}
   const search=searchLeaf?.view.containerEl.querySelector('input[type=search]');const target=search&&rect(search);
   if(fileLeaf){await fileLeaf.loadIfDeferred();app.workspace.leftSplit.selectTab(fileLeaf);app.workspace.setActiveLeaf(fileLeaf,{focus:false});app.workspace.leftSplit.expand();await pause(200)}check(stage+' search touch height',!!target&&target.height>=44,{target});
   const buttons=[...drawer.querySelectorAll('.nav-action-button')].filter(e=>e.offsetWidth&&e.offsetHeight).map(rect);
   check(stage+' toolbar touch targets',buttons.length>0&&buttons.every(b=>b.width>=44&&b.height>=44),buttons);
   const name=drawer.querySelector('.workspace-drawer-header-name-text'),info=drawer.querySelector('.workspace-drawer-header-info');
   const n=rect(name),i=rect(info);check(stage+' name has its own readable row',(name.scrollWidth<=name.clientWidth+1||n.width>=rect(drawer).width*.55)&&i.top>=n.bottom-1,{name:n,info:i,drawer:rect(drawer)});
   const tree=await treeStep(drawer);check(stage+' nested rows keep the drawer width',tree.step<=12,tree);
   if(w===390){const b=blackMobile(drawer),k='rgb(0, 0, 0)';check('pure black option is black in dark mode only, code keeps a lift',b.black.page==='#000000'&&b.black.drawer===k&&b.black.code!==k&&b.dark.page!=='#000000'&&b.light.page!=='#000000',b)}
   if(w===390){const radius=contentRadius();check('reading content keeps desktop corners',Object.keys(radius.expected).every(k=>radius.actual[k]===radius.expected[k]),radius)}
   if(w===390)await shot('phone-drawer-390');
   app.workspace.leftSplit.collapse();await pause(300);
   for(const keyboard of [0,Math.min(280,Math.floor(h*.35))]){
    document.body.style.setProperty('--keyboard-height',keyboard+'px');
    menu=new Menu();for(let n=0;n<16;n++){if(n===8)menu.addSeparator();menu.addItem(item=>item.setTitle('Action '+(n+1)).setIcon('check'))}
    menu.showAtPosition({x:w/2,y:h-10});await pause(350);
    const el=document.querySelector('body > .menu'),sc=el.querySelector('.menu-scroll');const bounds=rect(sc);
    check(stage+' sheet fits available height keyboard='+keyboard,bounds.height<=Math.max(0,h-keyboard-(h>w?47:0)-34)+1,{scroll:bounds,height:h,keyboard});
    const first=el.querySelector('.menu-group .menu-item'),group=first.parentElement;const rounded=Math.max(parseFloat(getComputedStyle(first).borderTopLeftRadius)||0,parseFloat(getComputedStyle(group).borderTopLeftRadius)||0);
    check(stage+' grouped menu has rounded boundaries keyboard='+keyboard,rounded>0,{rounded});
    sc.scrollTop=sc.scrollHeight;await pause(30);const last=[...el.querySelectorAll('.menu-item')].at(-1),l=rect(last),s=rect(sc);
    check(stage+' final menu action is reachable keyboard='+keyboard,l.bottom<=s.bottom+1&&l.top>=s.top-1,{last:l,scroll:s,overflow:getComputedStyle(sc).overflowY});
    if(w===390&&keyboard===0)await shot('phone-menu-390');
    menu.hide();menu=null;
   }
   document.body.style.setProperty('--keyboard-height','0px');
   const navbar=document.querySelector('.mobile-navbar'),nav=rect(navbar);
   check(stage+' bottom navigation stays in viewport',nav.left>=-1&&nav.right<=w+1,{nav,width:w,hidden:document.body.classList.contains('is-hidden-nav')});
  }
  const tablets=SCOPE.startsWith('phone')?[]:SCOPE.endsWith('targeted')?[[820,1180]]:[[600,900],[820,1180],[1194,834],[1366,1024]];
  for(const[w,h]of tablets){
   stage='tablet '+w+'x'+h;const device=await viewport(w,h);profiles.push(device);check(stage+' uses native tablet layout',document.body.classList.contains('is-tablet'),device);
   document.body.style.setProperty('--safe-area-inset-top','24px');document.body.style.setProperty('--safe-area-inset-bottom','20px');
   const tabs=[...document.querySelectorAll('.mod-root .workspace-tab-header')].filter(e=>e.offsetWidth&&e.offsetHeight).map(rect);
   check(stage+' tab touch height',tabs.length>0&&tabs.every(b=>b.height>=44),tabs);
   app.workspace.leftSplit.setPinned(true);app.workspace.rightSplit.setPinned(true);await pause(300);
   const left=rect(document.querySelector('.workspace-drawer.mod-left')),right=rect(document.querySelector('.workspace-drawer.mod-right')),root=rect(app.workspace.rootSplit.containerEl);
   check(stage+' pinned drawers have no overlay margins',left.top<=25&&right.top<=25&&left.height>=h-30&&right.height>=h-30,{left,right,root});
   check(stage+' both drawers preserve reading width',root.width>=w*.35,{left,right,root,width:w});
   const vaultName=document.querySelector('.workspace-drawer.mod-left .workspace-drawer-header-name-text'),nameRect=rect(vaultName),line=parseFloat(getComputedStyle(vaultName).lineHeight);
   check(stage+' pinned vault name stays on one line',nameRect.height<=line+1,{name:nameRect,line,whiteSpace:getComputedStyle(vaultName).whiteSpace});
   if(w===1194)await shot('tablet-pinned-1194');
   app.workspace.leftSplit.setPinned(false);app.workspace.rightSplit.setPinned(false);await pause(350);app.workspace.leftSplit.expand();await pause(350);
   const floating=rect(document.querySelector('.workspace-drawer.mod-left'));
   check(stage+' floating drawer clears safe edges',floating.top>=24&&floating.bottom<=h-19,{floating,height:h});
   const floatingDrawer=document.querySelector('.workspace-drawer.mod-left'),fname=rect(floatingDrawer.querySelector('.workspace-drawer-header-name-text')),finfo=floatingDrawer.querySelector('.workspace-drawer-header-info'),fi=rect(finfo),fline=parseFloat(getComputedStyle(finfo).lineHeight);
   check(stage+' floating drawer counts keep one line of their own',fi.height<=fline+1&&fi.top>=fname.bottom-1,{name:fname,info:fi,line:fline});
   if(w===820)await shot('tablet-drawer-820');
  }
  return JSON.stringify({vault:app.vault.getName(),theme:app.customCss.theme,scope:SCOPE,palette:PALETTE,profiles,results,passed:results.filter(r=>r.pass).length,total:results.length});
 }catch(e){return JSON.stringify({stage,error:String(e),stack:e.stack,profiles,results,passed:results.filter(r=>r.pass).length,total:results.length})}
 finally{
  menu?.hide();document.activeElement?.blur();
  app.workspace.leftSplit.setPinned(false);app.workspace.rightSplit.setPinned(false);app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();
  await debug.sendCommand('Emulation.clearDeviceMetricsOverride');await debug.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false});
  if(saved.style===null)document.body.removeAttribute('style');else document.body.setAttribute('style',saved.style);
  for(const[s,d]of sheets)try{s.disabled=d}catch{}
  for(const c of ['theme-light','theme-dark','is-translucent'])document.body.classList.toggle(c,saved.classes.split(' ').includes(c));
  if(saved.leaf)app.workspace.setActiveLeaf(saved.leaf,{focus:false});
  if(saved.leftPinned)app.workspace.leftSplit.setPinned(true);else if(!saved.left)app.workspace.leftSplit.expand();
  if(saved.rightPinned)app.workspace.rightSplit.setPinned(true);else if(!saved.right)app.workspace.rightSplit.expand();
 }
})()` .replaceAll('SCOPE',JSON.stringify(scope)).replaceAll('ARTIFACT_DIR',JSON.stringify(dirname(reportPath))).replaceAll('PALETTE',JSON.stringify(palette));
const run=spawnSync('obsidian',[`vault=${VAULT}`,'eval',`code=${code}`],{encoding:'utf8',timeout:60000});
if(run.error)throw run.error;const mark=run.stdout.lastIndexOf('=> ');const out=(mark>=0?run.stdout.slice(mark+3):run.stdout).trim();let report;
try{report=JSON.parse(out)}catch{throw Error(out||run.stderr)}writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} passed`);for(const r of report.results)if(!r.pass)console.log(`FAIL ${r.name}: ${JSON.stringify(r.evidence)}`);if(report.error)console.log(report.stage+': '+report.stack);
process.exitCode=!report.error&&report.passed===report.total?0:1;
