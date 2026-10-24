// Real Markdown views, keyboard input and screenshots in a running Obsidian.
// Failure cases: invisible keyboard focus; mouse-only rings; a link option
// that misses either view or removes unresolved-link dots; an active-line
// wash that is on by default, stays after blur, paints inactive lines,
// changes code/quote grounds, shifts text, or overflows a narrow pane.
// No note writes. The temporary view and runtime state are restored.
// Usage: node tests/reading-aids.e2e.mjs <vault> <report.json>
import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';

const vault=process.argv[2];
if(!vault)throw Error('Pass a vault name');
const reportPath=resolve(process.argv[3]??'still-reading-aids.json');
mkdirSync(dirname(reportPath),{recursive:true});

async function probe(outputDir){
 const results=[],screenshots=[],pause=ms=>new Promise(r=>setTimeout(r,ms));
 const check=(name,pass,evidence)=>results.push({name,pass,evidence});
 const oldLeaf=app.workspace.activeLeaf;
 let leaf,doc,win,wc,saved,ownedDebug=false,stage='setup';
 try{
  if(app.customCss.theme!=='Still')throw Error('Select Still first');
  leaf=app.isMobile?app.workspace.getLeaf('tab'):app.workspace.openPopoutLeaf();
  const view=app.viewRegistry.viewByType.markdown(leaf);await leaf.open(view);
  doc=view.containerEl.doc;win=doc.defaultView;
  const ew=win.electronWindow??require('electron').remote.getCurrentWindow();
  wc=ew.webContents;
  saved={classes:doc.body.className,style:doc.body.getAttribute('style')};
  if(!wc.debugger.isAttached()){wc.debugger.attach('1.3');ownedDebug=true;}
  const text=['# 阅读与编辑 Reading aids','','正文链接：[Obsidian](https://obsidian.md) 和 [[Still missing target|未创建的笔记]]。','','普通正文，用于检查当前编辑行。','下一行保持安静。','','> 引用保留自己的底色。','','~~~js','const answer = 42;','~~~','','- [ ] 待办事项'].join('\n');
  view.setViewData(text,true);ew.show();ew.focus();
  await pause(250);
  const cs=e=>win.getComputedStyle(e),rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
  const toggle=(c,on)=>doc.body.classList.toggle(c,on);
  const mode=async m=>{await view.setMode(m==='read'?view.previewMode:view.editMode);if(m==='read')view.previewMode.rerender(true);await pause(220)};
  const key=async keyCode=>{wc.sendInputEvent({type:'keyDown',keyCode});wc.sendInputEvent({type:'keyUp',keyCode});await pause(80)};
  const shot=async name=>{const file=outputDir+'/'+name+'.png';require('fs').writeFileSync(file,(await wc.capturePage()).toPNG());screenshots.push(file)};
  for(const width of (app.isMobile?[390]:[1100,390])){
   await wc.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
   app.workspace.onResize();await pause(180);
   for(const palette of ['theme-light','theme-dark']){
    stage=width+' '+palette;
    doc.body.classList.remove('theme-light','theme-dark','still-active-line','still-link-underline','still-graphite');doc.body.classList.add(palette);
    await mode('read');
    const root=view.previewMode.containerEl;
    const link=root.querySelector('a.external-link'),missing=root.querySelector('a.is-unresolved');
    if(!link||!missing)throw Error('Real Markdown links did not render');
    const before={decoration:cs(link).textDecorationLine,rect:rect(link)};
    check(stage+' — default links stay quiet',before.decoration==='none',before);
    // Start immediately before the native link, then press Tab in Chromium.
    const start=doc.createElement('button');start.textContent='Keyboard start';link.before(start);start.focus();await key('Tab');
    const focused={active:doc.activeElement===link,visible:link.matches(':focus-visible'),outline:cs(link).outlineStyle,width:cs(link).outlineWidth};
    check(stage+' — Tab exposes a visible link focus ring',focused.active&&focused.visible&&focused.outline!=='none'&&parseFloat(focused.width)>=2,focused);
    start.remove();
    if(width===1100)await shot(palette+'-keyboard');
    // A physical mouse click on a non-link paragraph switches modality.
    const p=[...root.querySelectorAll('p')].find(p=>p.textContent.startsWith('普通正文'));
    const pr=rect(p);wc.sendInputEvent({type:'mouseDown',x:Math.round(pr.x+8),y:Math.round(pr.y+8),button:'left',clickCount:1});wc.sendInputEvent({type:'mouseUp',x:Math.round(pr.x+8),y:Math.round(pr.y+8),button:'left',clickCount:1});
    link.focus();await pause(50);
    check(stage+' — mouse modality does not draw the keyboard ring',!link.matches(':focus-visible')&&cs(link).outlineStyle==='none',{visible:link.matches(':focus-visible'),outline:cs(link).outlineStyle});
    toggle('still-link-underline',true);
    check(stage+' — reading links can stay underlined',cs(link).textDecorationLine.includes('underline'),cs(link).textDecorationLine);
    check(stage+' — unresolved links retain their dotted cue',cs(missing).textDecorationLine.includes('underline')&&cs(missing).textDecorationStyle==='dotted',{line:cs(missing).textDecorationLine,style:cs(missing).textDecorationStyle});
    check(stage+' — link underlines do not move text',JSON.stringify(rect(link))===JSON.stringify(before.rect),{before:before.rect,after:rect(link)});
    await mode('edit');view.editor.setCursor({line:4,ch:4});view.editor.focus();await pause(100);
    const er=view.editMode.editorEl,active=()=>er.querySelector('.cm-line.cm-active');
    const editLink=er.querySelector('.cm-link .cm-underline');
    check(stage+' — Live Preview links use the underline option',!!editLink&&cs(editLink).textDecorationLine.includes('underline'),editLink&&{html:editLink.outerHTML,line:cs(editLink).textDecorationLine});
    const off={bg:cs(active()).backgroundColor,rect:rect(active())};
    check(stage+' — active line is opt-in',off.bg==='rgba(0, 0, 0, 0)',off);
    const grounds=()=>[...er.querySelectorAll('.HyperMD-quote,.HyperMD-codeblock')].map(e=>cs(e).backgroundColor);
    const groundBefore=grounds();toggle('still-active-line',true);await pause(60);
    const on={bg:cs(active()).backgroundColor,rect:rect(active())};
    check(stage+' — focused active line has a wash',on.bg!=='rgba(0, 0, 0, 0)'&&on.bg!==off.bg,on);
    check(stage+' — highlighting does not move the line',JSON.stringify(off.rect)===JSON.stringify(on.rect),{off,on});
    const inactive=[...er.querySelectorAll('.cm-line')].find(e=>e.textContent.startsWith('下一行'));
    check(stage+' — inactive lines stay clear',cs(inactive).backgroundColor==='rgba(0, 0, 0, 0)',cs(inactive).backgroundColor);
    await shot(palette+'-'+width+'-editor'+(app.isMobile?'-mobile':''));
    // Move the real CodeMirror cursor into the styled blocks as well.
    view.editor.setCursor({line:7,ch:4});await pause(60);
    const quoteGrounds=grounds();view.editor.setCursor({line:10,ch:5});await pause(60);
    check(stage+' — quote and code grounds remain intact',JSON.stringify(groundBefore)===JSON.stringify(quoteGrounds)&&JSON.stringify(groundBefore)===JSON.stringify(grounds()),{before:groundBefore,quote:quoteGrounds,code:grounds()});
    view.editor.setCursor({line:4,ch:4});view.editor.focus();await pause(60);
    const blurTarget=doc.createElement('button');doc.body.append(blurTarget);blurTarget.focus();await pause(60);
    check(stage+' — wash disappears when the editor loses focus',cs(active()).backgroundColor===off.bg,{focused:er.querySelector('.cm-editor')?.className,bg:cs(active()).backgroundColor});blurTarget.remove();
    toggle('still-active-line',false);toggle('still-link-underline',false);
    check(stage+' — switching both options off restores defaults',cs(active()).backgroundColor===off.bg&&cs(editLink).textDecorationLine==='none',{line:cs(active()).backgroundColor,link:cs(editLink).textDecorationLine});
    const sc=er.querySelector('.cm-scroller');
    check(stage+' — narrow editor has no horizontal page overflow',sc.scrollWidth<=sc.clientWidth+1,{scroll:sc.scrollWidth,client:sc.clientWidth});
    await view.setState({...view.getState(),mode:'source',source:true},{history:false});
    view.editor.setCursor({line:4,ch:4});view.editor.focus();await pause(100);
    toggle('still-active-line',true);toggle('still-link-underline',true);
    const sourceLink=er.querySelector('.cm-link:not(.cm-formatting)'),sourceLine=active();
    check(stage+' — source mode keeps both reading aids',!er.closest('.markdown-source-view').classList.contains('is-live-preview')&&cs(sourceLine).backgroundColor!=='rgba(0, 0, 0, 0)'&&!!sourceLink&&cs(sourceLink).textDecorationLine.includes('underline'),{line:cs(sourceLine).backgroundColor,link:sourceLink&&cs(sourceLink).textDecorationLine});
    await view.setState({...view.getState(),mode:'source',source:false},{history:false});
    toggle('still-active-line',false);toggle('still-link-underline',false);
   }
  }
  return {vault:app.vault.getName(),theme:app.customCss.theme,host:require('electron').remote.app.getVersion(),mobile:app.isMobile,results,screenshots};
 }catch(e){return {stage,error:String(e),stack:e.stack,results,screenshots}}
 finally{
  try{await wc?.debugger.sendCommand('Emulation.clearDeviceMetricsOverride')}catch{}
  if(ownedDebug)try{wc.debugger.detach()}catch{}
  if(saved){doc.body.className=saved.classes;if(saved.style===null)doc.body.removeAttribute('style');else doc.body.setAttribute('style',saved.style)}
  leaf?.detach();if(oldLeaf)app.workspace.setActiveLeaf(oldLeaf,{focus:false});
 }
}
const run=spawnSync('obsidian',[`vault=${vault}`,'eval',`code=(${probe.toString()})(${JSON.stringify(dirname(reportPath))}).then(r=>JSON.stringify(r))`],{encoding:'utf8',timeout:60000});
if(run.error)throw run.error;
const marker=run.stdout.lastIndexOf('=> ');
const report=JSON.parse((marker>=0?run.stdout.slice(marker+3):run.stdout).trim());
report.passed=report.results.filter(r=>r.pass).length;report.total=report.results.length;
writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} passed`);
for(const r of report.results)if(!r.pass)console.log('FAIL '+r.name+': '+JSON.stringify(r.evidence));
if(report.error)console.log(report.stage+': '+report.stack);
process.exitCode=report.error||report.passed!==report.total?1:0;
