// Obsidian renderer E2E: temporary real popout; no note or config writes.
// Usage: node tests/surfaces.e2e.mjs <vault> <report.json> [targeted|all]
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const VAULT=process.argv[2];if(!VAULT){console.error('Usage: node '+process.argv[1].split('/').pop()+' <vault name> <report.json> ...');process.exit(2)}
const mode=process.argv[4]??'all';
const code=String.raw`(async()=>{
 const results=[];const check=(name,pass,evidence)=>results.push({name,pass,evidence});
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const electron=require('electron').remote,oldLeaf=app.workspace.activeLeaf;
 const ids=new Set(electron.BrowserWindow.getAllWindows().map(w=>w.id));
 const leaf=app.workspace.openPopoutLeaf({width:620,height:660});
 let win,doc,host,attached=false,stage='setup';
 try{
  for(let n=0;n<60&&leaf.view.containerEl.ownerDocument===document;n++)await pause(50);
  doc=leaf.view.containerEl.ownerDocument;
  if(doc===document)throw Error('Popout unavailable');
  win=electron.BrowserWindow.getAllWindows().find(w=>!ids.has(w.id));
  if(!win)throw Error('Native popout unavailable');
  if(!win.webContents.debugger.isAttached()){win.webContents.debugger.attach('1.3');attached=true}
  // Isolate Still without changing the active vault's loaded styles.
  for(const s of doc.styleSheets)if(!s.href&&!s.ownerNode.textContent.includes('Still —'))s.disabled=true;
  doc.body.classList.remove('is-translucent','is-popout-modal','still-motion-off');
  host=doc.createElement('div');host.style.cssText='position:fixed;inset:60px 20px 20px;overflow:auto;z-index:100;background:var(--background-primary)';
  host.innerHTML='<div class="menu" style="position:relative;inset:auto;width:260px"><div class="menu-item">Menu</div></div><div class="modal-container" style="position:relative;inset:auto"><div class="prompt" style="position:relative;inset:auto;width:260px">Prompt</div></div><div class="nav-folder-title"><span class="collapse-icon"><svg class="svg-icon"></svg></span></div><div class="checkbox-container"></div><div class="markdown-rendered"><blockquote><p>Directional quote</p><blockquote><p>Nested quote</p></blockquote></blockquote><table><tbody><tr><td>Continuous blood flow without broken words</td><td>中文内容与 English words</td></tr></tbody></table></div><style>.still-layer-probe::after{content:"";will-change:transform}</style><div class="workspace"><div class="still-layer-probe" style="will-change:transform"></div></div><div class="workspace-ribbon mod-primary"><div class="side-dock-actions"><div class="side-dock-ribbon-action clickable-icon"></div><div class="side-dock-ribbon-action clickable-icon"></div></div></div>';
  doc.body.append(host);
  const view=doc.defaultView,menu=host.querySelector('.menu'),prompt=host.querySelector('.prompt');
  const state=()=>({menu:view.getComputedStyle(menu).animationName,prompt:view.getComputedStyle(prompt).animationName,folder:view.getComputedStyle(host.querySelector('svg')).transitionDuration,toggle:view.getComputedStyle(host.querySelector('.checkbox-container'),'::after').transitionDuration});
  stage='media';await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await pause(60);
  const reduced=state();
  check('Reduced motion stops menu entrance',reduced.menu==='none',reduced);
  check('Reduced motion stops prompt entrance',reduced.prompt==='none',reduced);
  check('Reduced motion stops folder rotation',reduced.folder.split(',').every(x=>parseFloat(x)===0),reduced);
  check('Reduced motion stops toggle movement',reduced.toggle.split(',').every(x=>parseFloat(x)===0),reduced);
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  const reading=host.querySelector('.markdown-rendered');
  function quote(direction){reading.dir=direction;const outer=reading.querySelector('blockquote'),inner=outer.querySelector('blockquote');return [outer,inner].map(e=>{const s=view.getComputedStyle(e,'::before'),r=e.getBoundingClientRect();return {direction,left:parseFloat(s.left),right:parseFloat(s.right),width:r.width,markerWidth:parseFloat(s.width)}})}
  const ltr=quote('ltr');check('LTR quote markers stay at the reading edge',ltr[0].left===16&&ltr[1].left===0,ltr);
  const rtl=quote('rtl');check('RTL quote markers follow the reading edge',rtl[0].right===16&&rtl[1].right===0,rtl);
  reading.dir='ltr';
  // A promoted layer in a translucent window can keep stale frames (ghosted
  // tooltips, row highlights, text) after the element is gone.
  stage='translucent layers';const layer=host.querySelector('.still-layer-probe');
  doc.body.classList.remove('is-popout-window');doc.body.classList.add('is-translucent');
  const glass={element:view.getComputedStyle(layer).willChange,pseudo:view.getComputedStyle(layer,'::after').willChange};
  doc.body.classList.remove('is-translucent');doc.body.classList.add('is-popout-window');
  check('Translucent window drops will-change inside the workspace',glass.element==='auto'&&glass.pseudo==='auto',glass);
  const opaque=view.getComputedStyle(layer).willChange;check('Opaque windows keep will-change',opaque==='transform',{opaque});
  // A translucency snippet repaints .workspace-ribbon with !important, so a
  // ribbon that floats over the page (collapsed sidebar) needs its own surface
  // on a pseudo-element. Beside an open sidebar the sidebar makes room instead,
  // so the ribbon stays surface-free.
  stage='parked ribbon';const ribbon=host.querySelector('.workspace-ribbon'),surface=()=>{const c=view.getComputedStyle(ribbon,'::after');return {image:c.backgroundImage,position:c.position,zIndex:c.zIndex}};
  const had=['still-peek-ribbon','show-ribbon'].filter(c=>doc.body.classList.contains(c));
  doc.body.classList.remove('still-peek-ribbon','show-ribbon');const plain=surface();
  doc.body.classList.add('still-peek-ribbon','show-ribbon');const open=surface();
  ribbon.classList.add('is-collapsed');const parked=surface();
  // The ribbon surface takes the peek panel's color, so the two read as one drawer.
  const tone=v=>{const d=doc.createElement('div');d.style.background='var('+v+')';host.append(d);const c=view.getComputedStyle(d).backgroundColor;d.remove();return c};
  const hadSoft=doc.body.classList.contains('still-peek-soft');
  doc.body.classList.add('still-peek-soft');const soft=surface().image;doc.body.classList.remove('still-peek-soft');const solid=surface().image;doc.body.classList.toggle('still-peek-soft',hadSoft);
  ribbon.classList.remove('is-collapsed');
  doc.body.classList.remove('still-peek-ribbon','show-ribbon');doc.body.classList.add(...had);
  check('Floating ribbon matches the peek panel surface',soft.includes(tone('--background-primary'))&&solid.includes(tone('--background-secondary')),{soft,solid});
  check('Floating ribbon paints its own opaque surface',parked.image.startsWith('linear-gradient')&&parked.position==='absolute'&&parked.zIndex==='-1'&&plain.image==='none',{plain,parked});
  check('Ribbon beside an open sidebar has no surface',open.image==='none',{open});
  // Ribbon tiles: 32px hit areas, 4px apart, 12px from the window edge.
  stage='ribbon tiles';const tiles=[...host.querySelectorAll('.side-dock-ribbon-action')],box=tiles.map(t=>t.getBoundingClientRect()),actions=view.getComputedStyle(host.querySelector('.side-dock-actions'));
  check('Ribbon tiles are 32px with a 4px gap',box.every(b=>b.width===32&&b.height===32)&&actions.rowGap==='4px'&&view.getComputedStyle(ribbon).paddingLeft==='12px',{sizes:box.map(b=>[b.width,b.height]),gap:actions.rowGap,paddingLeft:view.getComputedStyle(ribbon).paddingLeft});
  // A leaf in a collapsed sidebar stays active after the pointer leaves; the
  // peek panel must still park, and stay open only while focus is inside.
  stage='peek focus';const dock=doc.createElement('div');dock.className='workspace-split mod-sidedock mod-right-split is-sidedock-collapsed';dock.style.cssText='display:none;width:0';
  dock.innerHTML='<div class="workspace-tabs mod-active"><input class="still-peek-probe"></div>';host.append(dock);
  const peek=()=>view.getComputedStyle(dock).pointerEvents,activeOnly=peek();dock.querySelector('input').focus();const focused=peek();dock.querySelector('input').blur();const blurred=peek();dock.remove();
  check('Peek panel parks while its leaf is merely active',activeOnly==='none'&&blurred==='none',{activeOnly,blurred});
  check('Peek panel stays open while focus is inside',focused==='auto',{focused});
  // With the auto-hide ribbon out, an open left sidebar shifts right and its
  // header gives the shift back, so the header must move on the sidebar's
  // timing. A translucency snippet can switch the sidebar's transition off
  // with !important; a header that still animated would jump and slide back.
  stage='sidebar shift';const shiftClasses=['still-peek-ribbon','show-ribbon','mod-macos','is-hidden-frameless'],hadShift=shiftClasses.filter(c=>doc.body.classList.contains(c));
  doc.body.classList.add(...shiftClasses);
  const side=doc.createElement('div');side.className='workspace-split mod-sidedock mod-left-split';
  side.innerHTML='<div class="workspace-tabs mod-top-left-space"><div class="workspace-tab-header-container"></div></div><style class="still-snippet-probe" media="not all">body.is-translucent .workspace-split,body.is-translucent .workspace-tabs{transition:none!important}</style>';host.append(side);
  const head=side.querySelector('.workspace-tab-header-container'),snippet=side.querySelector('.still-snippet-probe');
  const timing=e=>{const s=view.getComputedStyle(e);return s.transitionProperty+' '+s.transitionDuration};
  const shiftOpaque={side:timing(side),head:timing(head)};
  doc.body.classList.add('is-translucent');snippet.media='all';const shiftGlass={side:timing(side),head:timing(head)};snippet.media='not all';doc.body.classList.remove('is-translucent');
  check('Sidebar header shifts on the sidebar timing',shiftOpaque.side.includes('padding-left')&&shiftOpaque.head===shiftOpaque.side,shiftOpaque);
  check('Sidebar header jumps with a sidebar whose transition is switched off',shiftGlass.head===shiftGlass.side,shiftGlass);
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await pause(60);
  const shiftReduced={side:view.getComputedStyle(side).transitionDuration,head:view.getComputedStyle(head).transitionDuration};
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  side.remove();doc.body.classList.remove(...shiftClasses);doc.body.classList.add(...hadShift);
  check('Reduced motion stops the sidebar shift for the ribbon',[shiftReduced.side,shiftReduced.head].every(v=>v.split(',').every(x=>parseFloat(x)===0)),shiftReduced);
  // Hover lifts a dark button toward the text, as it darkens a light one.
  stage='button hover';const hadPalette=['theme-light','theme-dark'].filter(c=>doc.body.classList.contains(c));
  const luma=v=>{const d=doc.createElement('div');d.style.background='var('+v+')';host.append(d);const [r,g,b]=view.getComputedStyle(d).backgroundColor.match(/[\d.]+/g).map(Number);d.remove();return Math.round(0.2126*r+0.7152*g+0.0722*b)};
  doc.body.classList.remove('theme-light','theme-dark');doc.body.classList.add('theme-dark');
  const darkButton={normal:luma('--interactive-normal'),hover:luma('--interactive-hover')};
  doc.body.classList.remove('theme-dark');doc.body.classList.add(...hadPalette);
  check('Dark buttons lighten on hover',darkButton.hover>darkButton.normal,darkButton);
  if(MODE==='all'){stage='full surfaces';
   const normal=state();check('Normal motion keeps Still entrances',normal.menu==='still-pop'&&normal.prompt==='still-rise',normal);
   doc.body.classList.add('still-motion-off');const off=state();check('Entrance option stops Still animation',off.menu!=='still-pop'&&off.prompt!=='still-rise',off);doc.body.classList.remove('still-motion-off');
   for(const palette of ['theme-light','theme-dark']){
    doc.body.classList.remove('theme-light','theme-dark');doc.body.classList.add(palette);
    const s=view.getComputedStyle(menu),bg=s.backgroundColor;check(palette+' menu stays opaque',/^rgb\(/.test(bg),{bg});
   }
   const cell=reading.querySelector('td');const cs=view.getComputedStyle(cell);check('Table keeps natural word wrapping',cs.wordBreak==='normal'&&cs.overflowWrap==='normal',{wordBreak:cs.wordBreak,overflowWrap:cs.overflowWrap});
   stage='resize';win.setSize(380,660);await pause(100);const r=reading.getBoundingClientRect();check('Narrow reading area remains available',r.width>0&&r.width<=380,{width:r.width});
  }
  return JSON.stringify({vault:app.vault.getName(),theme:app.customCss.theme,mode:MODE,results,passed:results.filter(r=>r.pass).length,total:results.length});
 }catch(e){return JSON.stringify({stage,error:String(e),stack:e.stack,results,passed:results.filter(r=>r.pass).length,total:results.length})}finally{
  try{if(win&&!win.isDestroyed()){try{await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[]})}catch{}if(attached)win.webContents.debugger.detach()}}catch{}
  host?.remove();leaf.detach();if(oldLeaf)app.workspace.setActiveLeaf(oldLeaf,{focus:false});
 }
})()` .replaceAll('MODE',JSON.stringify(mode));
const run=spawnSync('obsidian',[`vault=${VAULT}`,'eval',`code=${code}`],{encoding:'utf8',timeout:30000});
if(run.error)throw run.error;
const marker=run.stdout.lastIndexOf('=> ');const out=(marker>=0?run.stdout.slice(marker+3):run.stdout).trim();
let report;try{report=JSON.parse(out)}catch{throw Error(out||run.stderr)}
writeFileSync(process.argv[3]??'still-surfaces-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} passed`);for(const r of report.results)if(!r.pass)console.log(`FAIL ${r.name}: ${JSON.stringify(r.evidence)}`);
if(report.error)console.log(report.stage+': '+report.stack);
process.exitCode=!report.error&&report.passed===report.total?0:1;
