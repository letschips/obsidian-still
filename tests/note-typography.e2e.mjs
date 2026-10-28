// Real Markdown views in a running Obsidian: per-note typography classes.
// cjk / no-cjk, justify / no-justify and link-underline / no-link-underline
// in a note's cssclasses turn the matching Style Settings option on or off
// for that note, in reading view and Live Preview, whatever the global
// switch says. Failure cases: a class that misses either view, a global
// option a no- class cannot turn off, the CJK line height or code spacing
// leaking out of its note, an embed that opts out but inherits the host's
// spacing, and no-link-underline erasing the underline graphite relies on.
// No note writes. Embeds are probed with a nested DOM inside the real view.
// Usage: node tests/note-typography.e2e.mjs <vault> <report.json>
import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';

const vault=process.argv[2];
if(!vault)throw Error('Pass a vault name');
const reportPath=resolve(process.argv[3]??'still-note-typography.json');
mkdirSync(dirname(reportPath),{recursive:true});

async function probe(){
 const results=[],pause=ms=>new Promise(r=>setTimeout(r,ms));
 const check=(name,pass,evidence)=>results.push({name,pass,evidence});
 const oldLeaf=app.workspace.activeLeaf;
 let leaf,doc,saved,stage='setup';
 try{
  if(app.customCss.theme!=='Still')throw Error('Select Still first');
  leaf=app.workspace.getLeaf('tab');
  const view=app.viewRegistry.viewByType.markdown(leaf);await leaf.open(view);app.workspace.setActiveLeaf(leaf,{focus:true});
  doc=view.containerEl.doc;const win=doc.defaultView;
  saved={classes:doc.body.className};
  const cs=e=>win.getComputedStyle(e),ratio=e=>Math.round(parseFloat(cs(e).lineHeight)/parseFloat(cs(e).fontSize)*1000)/1000;
  const slider=parseFloat(cs(doc.body).getPropertyValue('--still-line-height'))||null;
  const ios=doc.body.classList.contains('is-ios');
  const opts=['cjk','justify','link-underline'];
  const note=classes=>(classes.length?'---\ncssclasses:\n'+classes.map(c=>'  - '+c).join('\n')+'\n---\n\n':'')+
   '# 标题 Heading\n\n中文段落里有 English 单词和 2026 年的数字，还有 `code 代码` 和 [Obsidian](https://obsidian.md) 链接。这一段要足够长，才能折成好几行，用来检查两端对齐和行高。中文段落里有 English 单词和 2026 年的数字。\n\n- 列表项 item\n';
  // Reading view renders lazily; wait for the paragraph rather than a fixed time.
  const mode=async m=>{
   await view.setMode(m==='read'?view.previewMode:view.editMode);if(m==='read')view.previewMode.rerender(true);
   const root=()=>m==='read'?view.previewMode.containerEl:view.editMode.editorEl;
   for(let i=0;i<40&&![...root().querySelectorAll(m==='read'?'p':'.cm-line')].some(e=>e.textContent.startsWith('中文段落'));i++)await pause(100);
   await pause(150);
  };
  const measure=m=>{
   if(m==='read'){
    const root=view.previewMode.containerEl.querySelector('.markdown-preview-view');
    const p=[...root.querySelectorAll('p')].find(e=>e.textContent.startsWith('中文段落')),h=root.querySelector('h1'),code=p.querySelector('code'),link=p.querySelector('a.external-link');
    return {root,p,cjk:cs(p).textAutospace==='normal',wrap:cs(p).textWrapStyle,line:ratio(p),code:cs(code).textAutospace,justify:cs(p).textAlign==='justify',heading:cs(h).textAlign,underline:cs(link).textDecorationLine.includes('underline'),title:cs(root.querySelector('.inline-title')??h).textAutospace};
   }
   const root=view.editMode.editorEl.closest('.markdown-source-view'),content=root.querySelector('.cm-content');
   const line=[...root.querySelectorAll('.cm-line')].find(e=>e.textContent.startsWith('中文段落')),h=root.querySelector('.HyperMD-header'),link=root.querySelector('.cm-link .cm-underline');
   return {root,cjk:cs(content).textAutospace==='normal',line:ratio(line),justify:cs(line).textAlign==='justify',heading:h&&cs(h).textAlign,underline:!!link&&cs(link).textDecorationLine.includes('underline'),title:cs(root.querySelector('.inline-title')??content).textAutospace};
  };
  const lineFor=on=>slider??(on?1.75:1.625);
  for(const global of [false,true])for(const cls of ['none','on','off']){
   doc.body.classList.remove('still-graphite',...opts.map(o=>'still-'+o));
   if(global)doc.body.classList.add(...opts.map(o=>'still-'+o));
   view.setViewData(note(cls==='none'?[]:opts.map(o=>cls==='on'?o:'no-'+o)),true);await pause(200);
   const want=cls==='on'||(cls==='none'&&global);
   for(const m of ['read','edit']){
    stage=(global?'global on':'global off')+', class '+cls+', '+m;
    await mode(m);const r=measure(m);
    check(stage+' — CJK spacing '+(want?'on':'off'),r.cjk===want&&r.title===(want?'normal':'no-autospace'),{cjk:r.cjk,title:r.title});
    check(stage+' — CJK line height',Math.abs(r.line-lineFor(want))<0.01,{line:r.line,expected:lineFor(want),slider});
    check(stage+' — justify '+(want?'on':'off'),r.justify===want&&r.heading!=='justify',{justify:r.justify,heading:r.heading});
    check(stage+' — link underline '+(want?'on':'off'),r.underline===want,{underline:r.underline});
    if(m==='read'){
     check(stage+' — inline code keeps its spacing',r.code==='no-autospace',r.code);
     if(!ios)check(stage+' — reading wrap follows CJK',r.wrap===(want?'pretty':'auto'),r.wrap);
     if(want){
      // An embed that opts out reads as its own note, not as its host.
      const embed=doc.createElement('div');embed.className='internal-embed markdown-embed';
      embed.innerHTML='<div class="markdown-embed-content"><div class="markdown-preview-view markdown-rendered '+opts.map(o=>'no-'+o).join(' ')+'"><p>嵌入 embed 段落 <a class="external-link" href="https://obsidian.md">link</a></p></div></div>';
      r.p.after(embed);const ep=embed.querySelector('p');
      const e={cjk:cs(ep).textAutospace,line:ratio(ep),justify:cs(ep).textAlign,underline:cs(ep.querySelector('a')).textDecorationLine,wrap:cs(ep).textWrapStyle};
      embed.remove();
      check(stage+' — an embed with no- classes opts out inside an opted-in note',e.cjk==='no-autospace'&&Math.abs(e.line-lineFor(false))<0.01&&e.justify!=='justify'&&!e.underline.includes('underline')&&e.wrap==='auto',e);
     }
     if(cls==='off'){
      // Off wins: an embed asking for the options inside an opted-out note stays off.
      const embed=doc.createElement('div');embed.className='internal-embed markdown-embed';
      embed.innerHTML='<div class="markdown-embed-content"><div class="markdown-preview-view markdown-rendered '+opts.join(' ')+'"><p>嵌入 embed 段落</p></div></div>';
      r.p.after(embed);const ep=embed.querySelector('p');
      const e={cjk:cs(ep).textAutospace,justify:cs(ep).textAlign,line:ratio(ep)};
      embed.remove();
      check(stage+' — inside an opted-out note, the opt-out wins over an embed',e.cjk==='no-autospace'&&e.justify!=='justify'&&Math.abs(e.line-lineFor(false))<0.01,e);
     }
    }
   }
  }
  stage='graphite';
  doc.body.classList.remove(...opts.map(o=>'still-'+o));doc.body.classList.add('still-graphite');
  view.setViewData(note(['no-link-underline']),true);await pause(200);
  for(const m of ['read','edit']){await mode(m);const r=measure(m);check('graphite, no-link-underline, '+m+' — links stay underlined',r.underline,{underline:r.underline})}
  return {vault:app.vault.getName(),theme:app.customCss.theme,host:require('electron').remote.app.getVersion(),mobile:app.isMobile,slider,results};
 }catch(e){return {stage,error:String(e),stack:e.stack,results}}
 finally{
  if(saved)doc.body.className=saved.classes;
  leaf?.detach();if(oldLeaf)app.workspace.setActiveLeaf(oldLeaf,{focus:false});
 }
}
const run=spawnSync('obsidian',[`vault=${vault}`,'eval',`code=(${probe.toString()})().then(r=>JSON.stringify(r))`],{encoding:'utf8',timeout:90000});
if(run.error)throw run.error;
const marker=run.stdout.lastIndexOf('=> ');
const report=JSON.parse((marker>=0?run.stdout.slice(marker+3):run.stdout).trim());
report.passed=report.results.filter(r=>r.pass).length;report.total=report.results.length;
writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} passed`);
for(const r of report.results)if(!r.pass)console.log('FAIL '+r.name+': '+JSON.stringify(r.evidence));
if(report.error)console.log(report.stage+': '+report.stack);
process.exitCode=report.error||report.passed!==report.total?1:0;
