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
  // Ribbon tiles: 32px hit areas, 4px apart, centred in the ribbon.
  stage='ribbon tiles';const tiles=[...host.querySelectorAll('.side-dock-ribbon-action')],box=tiles.map(t=>t.getBoundingClientRect()),actions=view.getComputedStyle(host.querySelector('.side-dock-actions')),ribbonStyle=view.getComputedStyle(ribbon);
  check('Ribbon tiles are 32px with a 4px gap, centred',box.every(b=>b.width===32&&b.height===32)&&actions.rowGap==='4px'&&ribbonStyle.paddingLeft==='6px'&&ribbonStyle.paddingRight==='6px',{sizes:box.map(b=>[b.width,b.height]),gap:actions.rowGap,paddingLeft:ribbonStyle.paddingLeft,paddingRight:ribbonStyle.paddingRight});
  // Without a hidden title bar core puts the left sidebar toggle inside the
  // ribbon at top 0, meant for the corner above it. The auto-hide ribbon is
  // positioned, so that top lands on the first tile unless the ribbon makes
  // room. A ribbon without the toggle (macOS hidden frame) keeps its top.
  stage='ribbon toggle';const hadToggle=['still-peek-ribbon','show-ribbon'].filter(c=>doc.body.classList.contains(c));
  const frame=doc.createElement('div');frame.style.cssText='position:relative;height:240px';
  frame.innerHTML='<div class="workspace-ribbon side-dock-ribbon mod-primary"><div class="sidebar-toggle-button mod-left"><div class="clickable-icon"></div></div><div class="side-dock-actions"><div class="side-dock-ribbon-action clickable-icon"></div></div></div>';host.append(frame);
  doc.body.classList.add('still-peek-ribbon','show-ribbon');
  const tg=frame.querySelector('.sidebar-toggle-button').getBoundingClientRect(),tile=frame.querySelector('.side-dock-ribbon-action').getBoundingClientRect(),bare=view.getComputedStyle(ribbon).paddingTop;
  frame.remove();doc.body.classList.remove('still-peek-ribbon','show-ribbon');doc.body.classList.add(...hadToggle);
  check('Auto-hide ribbon keeps the sidebar toggle above its first tile',tg.height>0&&tg.bottom<=tile.top,{toggle:[tg.top,tg.bottom],tile:tile.top});
  check('Auto-hide ribbon without the toggle keeps its top',bare==='0px',{paddingTop:bare});
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
  // Phones with the floating navigation draw the header buttons, navbar,
  // toolbar and prompt field as raised pills over the page. Without core's
  // frosted glass they still need an opaque surface of their own, or icons
  // sit on the text scrolling underneath.
  stage='phone chrome';const phoneClasses=['is-mobile','is-phone','is-floating-nav','is-ios','still-cjk','still-black-mobile'],hadPhone=phoneClasses.filter(c=>doc.body.classList.contains(c)),hadTone=['theme-light','theme-dark'].filter(c=>doc.body.classList.contains(c));
  doc.body.classList.remove(...phoneClasses);doc.body.classList.add('is-mobile','is-phone','is-floating-nav','is-ios');
  const phone=doc.createElement('div');
  phone.innerHTML='<div class="view-actions mod-raised" style="width:80px;height:40px"></div><div class="prompt" style="position:relative;inset:auto;top:0;height:auto;max-height:none"><div class="prompt-input-container mod-raised"><input class="prompt-input" type="text"></div><div class="prompt-results"><div class="suggestion-item">crisp-asr</div></div></div><div class="markdown-rendered"><p class="still-wrap-probe">x</p></div>';
  host.append(phone);
  const raisedEl=phone.querySelector('.mod-raised'),raised=()=>{const s=view.getComputedStyle(raisedEl);return {bg:s.backgroundColor,page:tone('--background-primary'),blur:s.backdropFilter}};
  const tones={};
  for(const [name,classes] of [['light',['theme-light']],['dark',['theme-dark']],['black',['theme-dark','still-black-mobile']]]){
   doc.body.classList.remove('theme-light','theme-dark','still-black-mobile');doc.body.classList.add(...classes);tones[name]=raised();
  }
  doc.body.classList.remove('theme-light','theme-dark','still-black-mobile');doc.body.classList.add(...hadTone);
  check('Phone raised controls keep an opaque surface apart from the page',Object.values(tones).every(t=>/^rgb\(/.test(t.bg)&&t.bg!==t.page),tones);
  check('Phone raised controls draw no backdrop blur',Object.values(tones).every(t=>t.blur==='none'),tones);
  const item=phone.querySelector('.suggestion-item'),list=phone.querySelector('.prompt-results');
  const row={height:Math.round(item.getBoundingClientRect().height),padX:parseFloat(view.getComputedStyle(item).paddingLeft),inset:parseFloat(view.getComputedStyle(list).paddingLeft)};
  check('Phone prompt rows are touch-sized with a readable inset',row.height>=44&&row.padX>=16&&row.inset>=8,row);
  doc.body.classList.add('still-cjk');const probe=phone.querySelector('.still-wrap-probe'),wrapIos=view.getComputedStyle(probe).textWrapStyle;
  doc.body.classList.remove('is-ios');const wrapOther=view.getComputedStyle(probe).textWrapStyle;
  check('CJK paragraphs skip WebKit pretty wrapping on iOS only',wrapIos!=='pretty'&&wrapOther==='pretty',{ios:wrapIos,other:wrapOther});
  phone.remove();doc.body.classList.remove(...phoneClasses);doc.body.classList.add(...hadPhone);
  // Core 1.14 overrides Still from higher-specificity rules: mobile blur on
  // menus, prompts and suggestions, frosted embed buttons, a dimmed dialog's
  // shadow, the mobile dark ladder and tag tint, and the editor's inline code
  // radius and link underline color.
  stage='core overrides';
  const ov=doc.createElement('div');ov.style.cssText='position:fixed;left:0;top:0;width:400px;z-index:-1';
  ov.innerHTML='<div class="suggestion-container">s</div><div class="modal-container mod-dim"><div class="modal">m</div></div><div class="markdown-rendered"><div class="internal-embed image-embed"><div class="embed-actions">a</div></div><a class="tag">#t</a></div><div class="markdown-source-view mod-cm6 cm-s-obsidian"><div class="cm-content"><div class="cm-line"><span class="cm-inline-code">c</span> <span class="cm-hmd-internal-link"><span class="cm-underline">l</span></span></div></div></div>';
  doc.body.append(ov);const oq=x=>ov.querySelector(x),ocs=(e,k)=>view.getComputedStyle(e)[k];
  const ovClasses=['is-mobile','is-phone','is-tablet','theme-light','theme-dark','still-plain-tags','still-black-mobile','still-graphite'],hadOv=ovClasses.filter(c=>doc.body.classList.contains(c));
  const ovSet=(...c)=>{doc.body.classList.remove(...ovClasses);doc.body.classList.add(...c)};
  ovSet('theme-dark');
  const dlg={shadow:ocs(oq('.modal'),'boxShadow'),embed:[ocs(oq('.embed-actions'),'backdropFilter'),ocs(oq('.embed-actions'),'backgroundColor')]};
  check('Dimmed dialogs keep the Still shadow',dlg.shadow.includes('72px'),dlg);
  check('Embed buttons are opaque without blur',dlg.embed[0]==='none'&&!/\/ 0\./.test(dlg.embed[1]),dlg);
  const mob={};
  for(const form of ['is-phone','is-tablet']){ovSet('theme-dark','is-mobile',form);mob[form]=[menu,prompt,oq('.suggestion-container')].map(e=>[ocs(e,'backdropFilter'),ocs(e,'backgroundColor')])}
  check('Mobile menus, prompts and suggestions are opaque without blur',Object.values(mob).flat().every(([f,bg])=>f==='none'&&!/\/ 0\./.test(bg)),mob);
  ovSet('theme-dark','is-mobile','is-phone');const bs=view.getComputedStyle(doc.body),ladder=['--color-base-00','--color-base-05','--color-base-10','--color-base-20'].map(k=>bs.getPropertyValue(k).trim()),tagTint=ocs(oq('a.tag'),'backgroundColor');
  ovSet('theme-dark','is-mobile','is-phone','still-plain-tags');const plainTag=ocs(oq('a.tag'),'backgroundColor');
  check('Mobile dark keeps a climbing base ladder',JSON.stringify(ladder)===JSON.stringify(['#161616','#191919','#1d1d1d','#202020']),ladder);
  check('Plain tags stay plain in mobile dark',plainTag==='rgba(0, 0, 0, 0)'&&tagTint!==plainTag,{tagTint,plainTag});
  ovSet('theme-light','still-graphite');
  const ed={editor:ocs(oq('.cm-inline-code'),'borderTopLeftRadius'),underline:ocs(oq('.cm-underline'),'textDecorationColor')};
  const readCode=doc.createElement('code');oq('.markdown-rendered').append(readCode);ed.read=ocs(readCode,'borderTopLeftRadius');
  check('Inline code has the same radius in the editor and reading view',ed.editor===ed.read,ed);
  check('Graphite links keep the hairline underline in the editor',ed.underline!==ocs(oq('.cm-underline'),'color'),ed);
  ov.remove();doc.body.classList.remove(...ovClasses);doc.body.classList.add(...hadOv);
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
