// Real CodeMirror renderer benchmark in an ephemeral Obsidian popout.
// No file binding or vault writes. Failure modes: lost input, missing editor,
// slow dispatch/layout, or dropped frames. Metrics do not certify Windows/iOS.
// Usage: node tests/typing.e2e.mjs <vault> <report.json>
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const VAULT=process.argv[2];if(!VAULT){console.error('Usage: node '+process.argv[1].split('/').pop()+' <vault name> <report.json> ...');process.exit(2)}
const code=String.raw`(async()=>{
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),oldLeaf=app.workspace.activeLeaf;
 const markdown=app.workspace.getLeavesOfType('markdown')[0];if(!markdown)throw Error('Open a Markdown tab to supply the installed CodeMirror constructor');
 await markdown.loadIfDeferred();const originalCM=markdown.view.editMode.cm;
 const EditorView=originalCM.constructor,EditorState=originalCM.state.constructor;
 const leaf=app.workspace.openPopoutLeaf({width:700,height:650});let host,editor;
 try{
  for(let n=0;n<60&&leaf.view.containerEl.ownerDocument===document;n++)await pause(50);
  const doc=leaf.view.containerEl.ownerDocument;if(doc===document)throw Error('Popout unavailable');
  const view=doc.defaultView,theme=[...doc.styleSheets].find(s=>!s.href&&s.ownerNode.textContent.includes('Still —'));
  if(!theme)throw Error('Still not loaded in popout');
  for(const s of doc.styleSheets)if(!s.href&&s!==theme)s.disabled=true;
  doc.body.classList.remove('is-translucent');
  host=doc.createElement('div');host.className='markdown-source-view mod-cm6';host.style.cssText='position:fixed;inset:60px 20px 20px;overflow:auto;background:var(--background-primary)';doc.body.append(host);
  const text=Array.from({length:2000},(_,i)=>'Line '+i+' — content for incremental editing.').join('\n');
  const samples=[],sort=x=>[...x].sort((a,b)=>a-b),p95=x=>sort(x)[Math.floor((x.length-1)*.95)];
  // Alternating order avoids attributing simple warm-up to either style.
  for(const palette of ['Default','Still','Still','Default']){
   theme.disabled=palette==='Default';editor=new EditorView({state:EditorState.create({doc:text}),parent:host});await pause(80);
   const intervals=[],costs=[];let last=view.performance.now(),running=true;
   const frame=now=>{if(!running)return;intervals.push(now-last);last=now;view.requestAnimationFrame(frame)};view.requestAnimationFrame(frame);
   const start=view.performance.now();
   for(let n=0;n<80;n++){const t=view.performance.now();editor.dispatch({changes:{from:editor.state.doc.length,insert:'abcd'}});void editor.dom.offsetHeight;costs.push(view.performance.now()-t);await pause(8)}
   running=false;const duration=view.performance.now()-start;
   samples.push({palette,inserted:editor.state.doc.length-text.length,expected:320,dispatchLayoutP95Ms:p95(costs),dispatchLayoutMaxMs:Math.max(...costs),frameP95Ms:p95(intervals),frameMaxMs:Math.max(...intervals),elapsedMs:duration});
   editor.destroy();editor=null;
  }
  return JSON.stringify({vault:app.vault.getName(),theme:app.customCss.theme,scope:'macOS incremental CodeMirror dispatch/layout; no file binding',samples,passed:samples.filter(s=>s.inserted===s.expected).length,total:samples.length});
 }finally{editor?.destroy();host?.remove();leaf.detach();if(oldLeaf)app.workspace.setActiveLeaf(oldLeaf,{focus:false})}
})()`;
const run=spawnSync('obsidian',[`vault=${VAULT}`,'eval',`code=${code}`],{encoding:'utf8',timeout:30000});
if(run.error)throw run.error;
const marker=run.stdout.lastIndexOf('=> ');const out=(marker>=0?run.stdout.slice(marker+3):run.stdout).trim();
let report;try{report=JSON.parse(out)}catch{throw Error(out||run.stderr)}
writeFileSync(process.argv[3]??'still-typing-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} input delivery checks passed`);for(const s of report.samples)console.log(`${s.palette}: dispatch/layout p95 ${s.dispatchLayoutP95Ms.toFixed(2)} ms; frame p95 ${s.frameP95Ms.toFixed(2)} ms`);
process.exitCode=report.passed===report.total?0:1;
