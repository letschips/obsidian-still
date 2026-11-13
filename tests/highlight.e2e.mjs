// Real Markdown highlight in a temporary Obsidian view. No note writes.
// Usage: node tests/highlight.e2e.mjs <vault> <report.json>
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const [vault,output]=process.argv.slice(2);
if(!vault||!output)throw Error('Pass a vault and report path');
async function probe(){
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),results=[];
 const check=(name,pass,evidence)=>results.push({name,pass,evidence});
 const oldLeaf=app.workspace.activeLeaf;let leaf,doc,saved;
 try{
  if(app.customCss.theme!=='Still')throw Error('Select Still first');
  leaf=app.workspace.openPopoutLeaf({width:800,height:800});
  const view=app.viewRegistry.viewByType.markdown(leaf);await leaf.open(view);
  doc=view.containerEl.ownerDocument;const win=doc.defaultView;
  saved=doc.body.className;view.setViewData('正文 ==高亮文字== 后续。\n\n==多行高亮文字用于验证样式==',true);
  for(let i=0;i<40&&!win.getComputedStyle(doc.body).getPropertyValue('--highlight-opacity').trim();i++)await pause(50);
  for(const palette of ['theme-light','theme-dark'])for(const mode of ['edit','read']){
   doc.body.classList.remove('theme-light','theme-dark','still-highlight-strong');doc.body.classList.add(palette);
   await view.setMode(mode==='edit'?view.editMode:view.previewMode);
   if(mode==='read')view.previewMode.rerender(true);
   for(let i=0;i<30;i++){const root=mode==='edit'?view.editMode.editorEl:view.previewMode.containerEl;if(root.querySelector(mode==='edit'?'.cm-highlight':'mark'))break;await pause(100)}
   const root=mode==='edit'?view.editMode.editorEl:view.previewMode.containerEl;
   const el=root.querySelector(mode==='edit'?'.cm-highlight':'mark');
   if(!el)throw Error('Highlight missing in '+mode);
   const measure=()=>({opacity:win.getComputedStyle(el).getPropertyValue('--highlight-opacity').trim(),background:win.getComputedStyle(el).backgroundColor,rect:el.getBoundingClientRect().toJSON()});
   const before=measure();doc.body.classList.add('still-highlight-strong');const after=measure();
   check(palette+' '+mode+' changes the highlight opacity',before.opacity==='30%'&&after.opacity===(palette==='theme-dark'?'45%':'60%')&&before.background!==after.background,{before,after});
   check(palette+' '+mode+' keeps text geometry',before.rect.width===after.rect.width&&before.rect.height===after.rect.height,{before:before.rect,after:after.rect});
   doc.body.classList.remove('still-highlight-strong');
   check(palette+' '+mode+' restores the original highlight',measure().background===before.background,measure());
  }
  return {results};
 }catch(e){return {error:String(e),stack:e.stack,results}}
 finally{if(saved)doc.body.className=saved;leaf?.detach();if(oldLeaf)app.workspace.setActiveLeaf(oldLeaf,{focus:false})}
}
const run=spawnSync('obsidian',[`vault=${vault}`,'eval',`code=(${probe.toString()})().then(r=>JSON.stringify(r))`],{encoding:'utf8',timeout:60000});
if(run.error)throw run.error;
const marker=run.stdout.lastIndexOf('=> ');const report=JSON.parse((marker>=0?run.stdout.slice(marker+3):run.stdout).trim());
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(`${report.results.filter(r=>r.pass).length}/${report.results.length} passed`);
for(const r of report.results)if(!r.pass)console.log('FAIL '+r.name+': '+JSON.stringify(r.evidence));
if(report.error)console.log(report.stack);
process.exitCode=report.error||report.results.some(r=>!r.pass)?1:0;
