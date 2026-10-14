// Real Obsidian Markdown preview: catches paragraph text becoming a grid
// cell, standard Markdown images being ignored, mixed image syntaxes and
// narrow panes overflowing. Transient renderer text has no file binding.
// Usage: node tests/image-grid.e2e.mjs <vault> <report.json> [theme.css] [fill]
import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
const vault=process.argv[2];
if(!vault)throw Error('Pass a running Obsidian vault with Still selected and a PNG attachment');
const css=process.argv[4]?readFileSync(process.argv[4],'utf8'):null;
const fill=process.argv[5]==='fill';
const code=String.raw`(async()=>{
 const results=[],check=(name,pass,evidence)=>results.push({name,pass,evidence});
 if(app.customCss.theme!=='Still')throw Error('Select Still first');
 const oldLeaf=app.workspace.activeLeaf,leaf=app.workspace.getLeaf('tab');
 const oldClasses=document.body.className;
 const view=app.viewRegistry.viewByType.markdown(leaf);
 const sheets=app.customCss.extraStyleEls.map(e=>[e.sheet,e.sheet.disabled]);
 const themeSheets=[...document.styleSheets].filter(s=>s.ownerNode?.textContent.includes('Still —')).map(s=>[s,s.disabled]);
 const host=document.createElement('div');
 host.style.cssText='position:fixed;left:30px;top:80px;width:700px;height:600px;z-index:9999;background:var(--background-primary)';
 let override;
 try{
  for(const[s]of sheets)s.disabled=true;
  if(FORCE_FILL)document.body.classList.add('still-media-fill');
  if(SOURCE_CSS){for(const[s]of themeSheets)s.disabled=true;override=document.createElement('style');override.textContent=SOURCE_CSS;document.head.append(override)}
  document.body.append(host);host.append(view.containerEl);view.load();view.previewMode.show();
  const renderer=view.previewMode.renderer;
  const png=app.vault.getFiles().find(f=>f.extension==='png');if(!png)throw Error('Need a PNG attachment');
  const canvas=document.createElement('canvas');canvas.width=400;canvas.height=300;
  canvas.getContext('2d').fillRect(0,0,400,300);
  const embed='![['+png.path+']]';
  const standard='![image]('+canvas.toDataURL()+')';
  const text='正文应该保持完整的一行，而不是变成图片网格中的窄列。';
  const layouts=[];
  for(const [name,md]of [
   ['attachments',[embed,embed,embed].join('\n')],
   ['standard Markdown',[standard,standard,standard].join('\n')],
   ['mixed image syntaxes',[embed,standard,embed].join('\n')],
   ['text with attachments',[text,embed,embed,text].join('\n')],
   ['text with standard images',[text,standard,standard,text].join('\n')],
   ['single image',standard]
  ]){
   renderer.set(md);renderer.onRender();await new Promise(r=>setTimeout(r,80));
   for(const img of renderer.previewEl.querySelectorAll('img'))await img.decode();
   const measure=()=>{
    const p=renderer.previewEl.querySelector('p'),b=p.getBoundingClientRect();
    return {paragraphWidth:b.width,images:[...p.querySelectorAll('img')].map(e=>{
     const r=e.getBoundingClientRect(),item=e.closest('.image-embed')??e;
     return {top:Math.round(r.top-b.top),rowTop:Math.round(item.getBoundingClientRect().top-b.top),left:r.left-b.left,width:r.width,height:r.height,ratio:e.naturalWidth/e.naturalHeight};
    }),text:[...p.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>{
     const range=document.createRange();range.selectNodeContents(n);
     return [...range.getClientRects()].map(r=>({width:r.width,left:r.left-b.left}));
    })};
   };
   renderer.previewEl.classList.remove('img-grid');const plain=measure();
   renderer.previewEl.classList.add('img-grid');const grid=measure();
   layouts.push({name,plain,grid});
   if(name.startsWith('text'))check(name+' keeps paragraph text at its original width',
    JSON.stringify(plain.text)===JSON.stringify(grid.text),{plain:plain.text,grid:grid.text});
   else if(name==='single image')check('A single image keeps its size',
    grid.images[0].width===plain.images[0].width,{plain,grid});
   else{
    check(name+' images share one row',new Set(grid.images.map(i=>i.rowTop)).size===1,{plain,grid});
    check(name+' images keep their aspect ratios',grid.images.every(i=>Math.abs(i.width/i.height-i.ratio)<0.02),grid);
    for(const width of [400,220]){
     host.style.width=width+'px';const narrow=measure();
     check(name+' fits a '+width+'px pane',narrow.images.every(i=>i.left>=-1&&i.left+i.width<=narrow.paragraphWidth+1),narrow);
    }
    host.style.width='700px';
   }
  }
  check('The test renderer has no dirty note',view.data===null&&!view.dirty,{data:view.data,dirty:view.dirty});
  return JSON.stringify({vault:app.vault.getName(),theme:app.customCss.theme,sourceOverride:!!SOURCE_CSS,mediaFill:!!FORCE_FILL,results,layouts,passed:results.filter(r=>r.pass).length,total:results.length});
 }finally{override?.remove();view.unload();host.remove();leaf.detach();for(const[s,d]of [...sheets,...themeSheets])s.disabled=d;document.body.className=oldClasses;if(oldLeaf)app.workspace.setActiveLeaf(oldLeaf,{focus:false})}
})()`.replaceAll('SOURCE_CSS',JSON.stringify(css)).replaceAll('FORCE_FILL',JSON.stringify(fill));
const run=spawnSync('obsidian',[`vault=${vault}`,'eval',`code=${code}`],{encoding:'utf8',timeout:30000});
if(run.error)throw run.error;
const mark=run.stdout.lastIndexOf('=> ');if(mark<0)throw Error(run.stdout||run.stderr);
const report=JSON.parse(run.stdout.slice(mark+3));
writeFileSync(process.argv[3]??'still-image-grid-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} passed`);
for(const r of report.results)if(!r.pass)console.log(`FAIL ${r.name}: ${JSON.stringify(r.evidence)}`);
process.exitCode=report.passed===report.total?0:1;
