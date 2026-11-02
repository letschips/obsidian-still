// Real Obsidian renderer; no note/config writes. Platform/mobile CSS states are
// emulated, not native device coverage. Runs against a candidate CSS file in
// temporary windows and writes measurements + screenshots for replay.
// Failure cases: titlebar intercepts search/double inset; mobile surfaces disagree;
// overflow loses first action; monochrome links lose cues; sized images stretch;
// focus leaves a ribbon gap; peek intercepts window controls; floating foot bleeds;
// crowded tabs waste width; YAML is justified; translucent stacks expose text.
// Usage: node tests/uiux-audit.e2e.mjs <vault> <report.json> <theme.css> <snippet.css>
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const [vault,output,theme,snippet]=process.argv.slice(2);
if(!vault||!output||!theme||!snippet)throw Error('Pass vault, report, theme and snippet');
const report=resolve(output);mkdirSync(dirname(report),{recursive:true});
async function probe(themePath,snippetPath,out){
 const fs=require('fs'),electron=require('electron').remote,pause=ms=>new Promise(r=>setTimeout(r,ms));
 const results=[],check=(name,pass,evidence)=>results.push({name,pass,evidence});
 const oldLeaf=app.workspace.activeLeaf,settingsOpen=app.setting.isOpen,settingsTab=app.setting.activeTab?.id;
 const source=fs.readFileSync(themePath,'utf8'),glass=fs.readFileSync(snippetPath,'utf8');
 let leaf,ew,stage='settings',savedSettings;
 const isolate=doc=>{for(const s of doc.styleSheets)if(!s.href&&!s.ownerNode.textContent.startsWith('.ͼ'))s.disabled=true;let s=doc.getElementById('audit-candidate-css');if(!s){s=doc.createElement('style');s.id='audit-candidate-css';s.textContent=source;doc.head.append(s)}s.sheet.disabled=false;return s};
 try{
  app.setting.open();await pause(650);
  let doc=app.setting.win.document,win=doc.defaultView,cs=e=>win.getComputedStyle(e),rect=e=>e.getBoundingClientRect();
  savedSettings={doc,classes:doc.body.className,sheets:[...doc.styleSheets].map(s=>[s,s.disabled])};
  savedSettings.style=isolate(doc);
  const input=doc.querySelector('.vertical-tab-header input'),content=doc.querySelector('.vertical-tab-content:not(.setting-page)'),bar=doc.querySelector('.titlebar');
  for(const platform of ['mod-macos','mod-windows','mod-linux'])for(const frame of ['hidden','obsidian','native','fullscreen'])for(const palette of ['theme-light','theme-dark']){
   doc.body.className=[platform,palette,'is-popout-modal',frame!=='native'?'is-frameless':'',frame==='hidden'||frame==='fullscreen'?'is-hidden-frameless':'',frame==='fullscreen'?'is-fullscreen':''].join(' ');
   await pause(25);
   const r=rect(input),c=rect(content),b=rect(bar),hit=doc.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   const titleBottom=frame==='native'||frame==='fullscreen'?0:b.bottom;
   check(`${platform}/${frame}/${palette} settings search and one titlebar inset`,hit===input&&Math.abs(c.top-titleBottom)<=1&&Math.abs(c.bottom-win.innerHeight)<=1,{inputTop:r.top,hit:hit?.className,contentTop:c.top,contentBottom:c.bottom,titleBottom,height:win.innerHeight});
  }
  for(const device of ['is-phone','is-tablet'])for(const palette of ['theme-light','theme-dark','black']){
   doc.body.className=['is-mobile',device,palette==='theme-light'?'theme-light':'theme-dark',palette==='black'?'still-black-mobile':'','is-popout-modal'].join(' ');
   const modal=doc.querySelector('.modal'),bg=cs(modal).backgroundColor,child=cs(content).backgroundColor;
   check(`${device}/${palette} settings uses one surface`,bg===child&&(palette!=='black'||bg==='rgb(0, 0, 0)'),{modal:bg,content:child});
   if(device==='is-tablet'&&palette==='black')fs.writeFileSync(out+'/tablet-black-settings.png',(await win.electronWindow.webContents.capturePage()).toPNG());
  }
  doc.body.className=savedSettings.classes;savedSettings.style.remove();for(const[s,d]of savedSettings.sheets)s.disabled=d;savedSettings=null;
  if(!settingsOpen)app.setting.close();
  stage='community marketplace';
  app.setting.open();await pause(500);app.setting.openTabById('community-plugins');await pause(100);
  const ids=new Set(electron.BrowserWindow.getAllWindows().map(w=>w.id));
  const browse=[...app.setting.activeTab.containerEl.querySelectorAll('button')].find(e=>['浏览','Browse'].includes(e.textContent));
  if(!browse)throw Error('Community Browse unavailable');browse.click();await pause(900);
  const market=electron.BrowserWindow.getAllWindows().find(w=>!ids.has(w.id)&&/第三方插件|Community plugins/i.test(w.getTitle()));
  if(!market)throw Error('Community window unavailable');
  try{
   const inspect=async function(source){
    const pause=ms=>new Promise(r=>setTimeout(r,ms));
    for(const sheet of document.styleSheets)if(!sheet.href)sheet.disabled=true;
    const style=document.createElement('style');style.textContent=source;document.head.append(style);
    const out=[];
    for(const platform of ['mod-macos','mod-windows','mod-linux'])for(const frame of ['hidden','obsidian'])for(const palette of ['theme-light','theme-dark']){
     document.body.className=[platform,palette,'is-popout-modal','is-frameless',frame==='hidden'?'is-hidden-frameless':''].join(' ');await pause(40);
     const input=document.querySelector('input[type=search]'),search=document.querySelector('.community-modal-search'),r=input.getBoundingClientRect(),bar=document.querySelector('.titlebar').getBoundingClientRect();
     const margin=getComputedStyle(search).marginLeft,hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===input,top=document.querySelector('.modal').getBoundingClientRect().top+parseFloat(getComputedStyle(document.querySelector('.modal')).paddingTop);
     out.push({name:platform+'/'+frame+'/'+palette+' marketplace search aligned and clickable',pass:hit&&margin==='0px'&&Math.abs(top-bar.bottom)<=1,evidence:{hit,margin,top,titleBottom:bar.bottom,inputTop:r.top}});
    }
    return out;
   };
   results.push(...await market.webContents.executeJavaScript('('+inspect.toString()+')('+JSON.stringify(source)+')'));
   fs.writeFileSync(out+'/community-market.png',(await market.webContents.capturePage()).toPNG());
  }finally{market.close()}
  if(!settingsOpen)app.setting.close();
  stage='temporary content window';
  leaf=app.workspace.openPopoutLeaf({width:1000,height:820});
  const view=app.viewRegistry.viewByType.markdown(leaf);await leaf.open(view);
  doc=view.containerEl.doc;win=doc.defaultView;ew=win.electronWindow;ew.show();ew.focus();
  await pause(700);isolate(doc);doc.body.removeAttribute('style');cs=e=>win.getComputedStyle(e);rect=e=>e.getBoundingClientRect();
  const dbg=ew.webContents.debugger;if(!dbg.isAttached())dbg.attach('1.3');
  await dbg.sendCommand('DOM.enable');await dbg.sendCommand('CSS.enable');
  const force=async(selector,pseudo)=>{const root=(await dbg.sendCommand('DOM.getDocument')).root.nodeId;const {nodeId}=await dbg.sendCommand('DOM.querySelector',{nodeId:root,selector});if(!nodeId)throw Error('Missing '+selector);await dbg.sendCommand('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:pseudo})};
  const host=doc.createElement('div');host.id='audit-host';host.style.cssText='position:fixed;inset:60px 20px 20px;z-index:1000;background:var(--background-primary);overflow:auto';doc.body.append(host);
  const base=()=>{doc.body.className='mod-macos theme-light is-frameless is-hidden-frameless show-ribbon still-motion-off';host.innerHTML=''};
  stage='mobile dialogs';base();
  for(const device of ['is-phone','is-tablet'])for(const palette of ['theme-light','theme-dark','black']){
   doc.body.className=['is-mobile',device,palette==='theme-light'?'theme-light':'theme-dark',palette==='black'?'still-black-mobile':''].join(' ');
   host.innerHTML='<div class="modal-container mod-dim" style="position:relative"><div class="modal">Dialog</div></div>';
   const modal=host.querySelector('.modal'), token=doc.createElement('div');token.style.background='var(--modal-background)';host.append(token);
   const bg=cs(modal).backgroundColor,expected=cs(token).backgroundColor;
   check(`${device}/${palette} dialog respects modal surface`,bg===expected,{actual:bg,expected});
  }
  stage='toolbar';base();await dbg.sendCommand('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});doc.body.className='is-mobile is-phone theme-light still-quiet-nav still-motion-off';
  host.innerHTML='<div class="workspace-drawer" style="position:relative;inset:auto;width:300px;height:200px;transform:none;margin:0;flex-direction:column"><div class="nav-header"><div class="nav-buttons-container" id="audit-nav">'+Array.from({length:7},(_,i)=>'<div class="nav-action-button clickable-icon">'+(i+1)+'</div>').join('')+'</div></div></div>';
  await force('#audit-nav',['hover']);await pause(300);
  const nav=host.querySelector('#audit-nav'),first=nav.firstElementChild,last=nav.lastElementChild;
  nav.scrollLeft=0;const start=rect(first).left-rect(nav).left;nav.scrollLeft=nav.scrollWidth;const end=rect(last).right-rect(nav).right;
  check('phone overflow reaches first and last toolbar action',start>=0&&end<=1,{start,end,client:nav.clientWidth,scroll:nav.scrollWidth});
  nav.scrollLeft=0;await pause(100);fs.writeFileSync(out+'/phone-toolbar.png',(await ew.webContents.capturePage()).toPNG());
  await dbg.sendCommand('Emulation.clearDeviceMetricsOverride');stage='focus and edge';base();doc.body.classList.add('still-peek-ribbon','still-hide-vault');
  host.innerHTML='<div class="workspace" style="height:500px;position:relative"><div id="audit-ribbon" class="workspace-ribbon side-dock-ribbon mod-primary is-collapsed"><div class="side-dock-actions"><button>Ribbon</button></div></div><div id="audit-side" class="workspace-split mod-sidedock mod-left-split is-sidedock-collapsed" style="display:none;width:0"><div class="workspace-tabs"><input id="audit-search" value="Focused sidebar"></div><div class="workspace-sidedock-vault-profile" id="audit-foot"><div class="workspace-drawer-vault-switcher" tabindex="0">Vault name</div><div class="workspace-drawer-vault-actions"><button class="clickable-icon">Help</button><button class="clickable-icon">Settings</button></div></div></div></div>';
  const ribbon=host.querySelector('#audit-ribbon'),side=host.querySelector('#audit-side'),foot=host.querySelector('#audit-foot');
  ew.focus();host.querySelector('#audit-search').focus();await pause(550);
  check('sidebar focus keeps ribbon revealed',side.matches(':focus-within')&&cs(ribbon).opacity==='1',{focus:side.matches(':focus-within'),sideOpacity:cs(side).opacity,ribbonOpacity:cs(ribbon).opacity,padding:cs(side).paddingLeft});
  const trigger=win.getComputedStyle(side,'::after');
  check('peek trigger excludes header controls',parseFloat(trigger.top)>=parseFloat(cs(doc.body).getPropertyValue('--header-height')),{top:trigger.top,header:cs(doc.body).getPropertyValue('--header-height')});
  ew.focus();ribbon.querySelector('button').focus();await pause(550);check('ribbon keyboard focus reveals sidebar',cs(ribbon).opacity==='1'&&cs(side).opacity==='1',{ribbon:cs(ribbon).opacity,side:cs(side).opacity});
  ew.focus();foot.querySelector('button:last-child').focus();await pause(750);
  check('vault foot stays visible while keyboard focused',cs(foot.querySelector('.workspace-drawer-vault-switcher')).visibility==='visible',{visibility:cs(foot.querySelector('.workspace-drawer-vault-switcher')).visibility,focused:doc.hasFocus(),within:foot.matches(':focus-within'),active:doc.activeElement?.outerHTML});
  check('visible vault foot has opaque ground',cs(foot.querySelector('.workspace-drawer-vault-switcher')).backgroundColor.startsWith('rgb('),{background:cs(foot.querySelector('.workspace-drawer-vault-switcher')).backgroundColor});
  stage='tabs';base();
  const original=document.querySelector('.mod-root .workspace-tabs:not(.mod-stacked) .workspace-tab-header-container');
  if(!original)throw Error('No main window tab strip to clone');
  host.innerHTML='<div class="workspace"><div class="workspace-split mod-root"><div class="workspace-tabs mod-top-right-space" style="width:700px"></div></div></div>';
  const strip=original.cloneNode(true);host.querySelector('.workspace-tabs').append(strip);
  strip.querySelectorAll('.sidebar-toggle-button').forEach(e=>e.remove());
  const inner=strip.querySelector('.workspace-tab-header-container-inner');inner.style.transition='none';const tab=inner.querySelector('.workspace-tab-header').cloneNode(true);inner.innerHTML='';
  for(let i=0;i<6;i++){const t=tab.cloneNode(true);t.querySelector('.workspace-tab-header-inner-title').textContent='Long note title '+i;inner.append(t)}
  await pause(50);const gap=rect(inner.firstElementChild).left-rect(inner).left;
  check('crowded centered tabs reclaim leading balance space',gap<16,{gap,tabWidth:rect(inner.firstElementChild).width,inner:rect(inner).width});
  for(const fit of [false,true])for(const count of [1,2]){
   doc.body.classList.toggle('still-tabs-fit',fit);inner.innerHTML='';for(let i=0;i<count;i++)inner.append(tab.cloneNode(true));
   const center=()=>{const a=rect(inner.firstElementChild),b=rect(inner.lastElementChild);return(a.left+b.right)/2};
   const candidate=center(),reference=doc.createElement('style');reference.textContent='#audit-host .workspace-tab-header-container-inner::before{content:none}';doc.head.append(reference);inner.style.paddingInlineStart='96px';
   const previous=center(),refInfo={pad:cs(inner).paddingInlineStart,width:rect(inner).width,pseudo:win.getComputedStyle(inner,'::before').content,flex:cs(inner).flex};reference.remove();inner.style.removeProperty('padding-inline-start');
   check(`sparse tabs preserve center fit=${fit} count=${count}`,Math.abs(candidate-previous)<=1,{candidate,previous,delta:candidate-previous,refInfo,pad:cs(inner).paddingInlineStart,width:rect(inner).width});
  }
  stage='editor';host.remove();base();
  doc.body.classList.add('still-graphite','still-justify','still-media-fill');
  const text='---\ndescription: A long field that must keep its normal YAML alignment while editing\ncssclasses: [no-link-underline]\n---\n\n[[Missing target]] and [Web](https://example.com)\n\n![|200](data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22400%22%20height=%22100%22%3E%3Crect%20width=%22400%22%20height=%22100%22%20fill=%22gray%22/%3E%3C/svg%3E)\n\nPlain paragraph.\n';
  view.setViewData(text,true);await view.setState({mode:'source',source:true},{});view.setViewData(text,true);view.editor.setCursor({line:5,ch:5});view.editor.focus();await pause(450);isolate(doc);
  let root=view.editMode.editorEl.closest('.markdown-source-view');const links=[...root.querySelectorAll('.cm-line .cm-hmd-internal-link:not(.cm-formatting):not(:has(.cm-underline)),.cm-line .cm-link:not(.cm-formatting):not(:has(.cm-underline))')];
  check('graphite editing links retain underline despite note opt-out',links.length>0&&links.every(e=>cs(e).textDecorationLine.includes('underline')),links.map(e=>({text:e.textContent,line:cs(e).textDecorationLine,color:cs(e).color})));
  view.editor.setCursor({line:1,ch:5});await pause(180);isolate(doc);
  root=view.editMode.editorEl.closest('.markdown-source-view');const yaml=[...root.querySelectorAll('.HyperMD-frontmatter, .cm-line:has(.cm-hmd-frontmatter)')];
  check('YAML stays un-justified',yaml.length>0&&yaml.every(e=>cs(e).textAlign!=='justify'),{sheets:[...doc.styleSheets].filter(s=>!s.href).map(s=>({disabled:s.disabled,length:s.ownerNode.textContent.length,theme:s.ownerNode.textContent.includes('Still —'),candidate:s.ownerNode.textContent.includes(':not(:has(.cm-hmd-frontmatter))')})),yaml:yaml.map(e=>({text:e.textContent,align:cs(e).textAlign})),lines:[...root.querySelectorAll('.cm-line')].map(e=>({text:e.textContent,cls:e.className,html:e.innerHTML.slice(0,120)})),state:view.getState()});
  await view.setState({mode:'source',source:false},{});view.setViewData(text,true);view.editor.setCursor({line:9,ch:0});view.editor.focus();await pause(400);isolate(doc);
  root=view.editMode.editorEl.closest('.markdown-source-view');const img=[...root.querySelectorAll('.image-embed img[width]')].find(e=>rect(e).width>0),embed=img?.closest('.image-embed');
  const onWidth=embed&&rect(embed).width;doc.body.classList.remove('still-media-fill');const offWidth=embed&&rect(embed).width;doc.body.classList.add('still-media-fill');
  check('sized Markdown image wrapper does not fill the line',!!img&&onWidth===offWidth&&rect(img).width===200,{onWidth,offWidth,image:img&&rect(img).width,embed:embed&&rect(embed).width,outer:embed?.outerHTML.slice(0,650),matched:[...doc.styleSheets].filter(s=>!s.disabled).flatMap(s=>[...s.cssRules]).filter(r=>r.selectorText&&embed?.matches(r.selectorText)&&r.style?.width).map(r=>r.cssText)});
  fs.writeFileSync(out+'/editor.png',(await ew.webContents.capturePage()).toPNG());
  stage='translucent stack';doc.body.append(host);base();doc.body.classList.add('is-translucent');const glassStyle=doc.createElement('style');glassStyle.textContent=glass;doc.head.append(glassStyle);
  host.innerHTML='<div class="workspace"><div class="mod-root"><div class="workspace-tabs mod-stacked"><div class="workspace-tab-container"><div class="workspace-tab-header is-active">Spine</div><div class="workspace-leaf"><div class="workspace-leaf-content">Upper note</div></div></div></div></div></div>';
  for(const palette of ['theme-light','theme-dark']){
   doc.body.classList.remove('theme-light','theme-dark');doc.body.classList.add(palette);
   const card=host.querySelector('.workspace-leaf'),spine=host.querySelector('.workspace-tab-header'),bg=cs(card).backgroundColor,sbg=cs(spine).backgroundColor;
   check(`${palette} stacked cards and active spine are opaque`,bg.startsWith('rgb(')&&sbg.startsWith('rgb('),{card:bg,spine:sbg});
  }
  const manifest=JSON.parse(fs.readFileSync(themePath.replace(/theme\.css$/,'manifest.json'),'utf8'));
  check('CSS version header matches manifest',source.includes('Version '+manifest.version+' '),{version:manifest.version,header:source.split('\n')[2]});
 }catch(e){check('Run '+stage,false,{error:String(e),stack:e.stack})}
 finally{
  if(savedSettings){savedSettings.doc.body.className=savedSettings.classes;savedSettings.style?.remove();for(const[s,d]of savedSettings.sheets)s.disabled=d}
  if(!settingsOpen)app.setting.close();else if(settingsTab)app.setting.openTabById(settingsTab);
  if(leaf)leaf.detach();if(ew&&!ew.isDestroyed())ew.close();if(oldLeaf)app.workspace.setActiveLeaf(oldLeaf,{focus:false});
 }
 return {results,passed:results.filter(r=>r.pass).length,total:results.length};
}
const code=`(${probe.toString()})(${JSON.stringify(resolve(theme))},${JSON.stringify(resolve(snippet))},${JSON.stringify(dirname(report))}).then(JSON.stringify)`;
const r=spawnSync('obsidian',[`vault=${vault}`,'eval',`code=${code}`],{encoding:'utf8',timeout:60000});
if(r.error)throw r.error;const mark=r.stdout.lastIndexOf('=> ');const result=JSON.parse((mark<0?r.stdout:r.stdout.slice(mark+3)).trim());
writeFileSync(report,JSON.stringify(result,null,2)+'\n');console.log(`${result.passed}/${result.total} passed`);for(const r of result.results)if(!r.pass)console.log('FAIL '+r.name+': '+JSON.stringify(r.evidence));process.exitCode=result.passed===result.total?0:1;
