// Obsidian renderer E2E for Still's block styles: task states, per-note
// table classes, footnotes, keys, Canvas and print. Isolates Still (snippets
// off) on probe elements shaped like Obsidian 1.14's own DOM, then restores
// classes, styles and emulated media. No note or config writes.
// Breaks caught: indentation guides hidden although Obsidian's setting is
// on, table-wide moving the text or pushing tables past the pane, alternate task characters ([>], [-], [/] …) drawn as done
// (core fills the box and checks it for any character), state marks missing
// in either view (reading view tags the list item, the editor tags the
// checkbox), unknown characters or [x] losing core's check, cancelled tasks
// left unstruck, table classes that reach only one view, row numbers drawn
// over the cell text, footnote markers opening up the line, Canvas text
// cards painted with the note-embed wash, the dot grid ignoring the plain
// option, and print breaking a heading from its text or clipping code.
// Usage: node tests/blocks.e2e.mjs <vault> <report.json>
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const VAULT=process.argv[2];if(!VAULT){console.error('Usage: node '+process.argv[1].split('/').pop()+' <vault name> <report.json>');process.exit(2)}
const code=String.raw`(async()=>{
 const results=[],check=(name,pass,evidence)=>results.push({name,pass,evidence});
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),wc=require('electron').remote.getCurrentWebContents();
 if(app.customCss.theme!=='Still')throw Error('Select Still first');
 const saved={classes:document.body.className,style:document.body.getAttribute('style')};
 const sheets=app.customCss.extraStyleEls.map(e=>[e.sheet,e.sheet.disabled]);
 let host,popLeaf,stage='setup',attached=false;
 const toggle=(c,on)=>document.body.classList.toggle(c,on);
 const cs=(e,p)=>getComputedStyle(e,p);
 try{
  for(const[s]of sheets)s.disabled=true;
  for(const c of ['still-keep-done-tasks','still-canvas-plain','is-translucent'])toggle(c,false);
  host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:0;width:700px;z-index:-1';document.body.append(host);
  // Task states, in both views. Reading view: li[data-task] > input.
  // Editor: .HyperMD-task-line[data-task] … input[data-task].
  stage='tasks';
  const chars=[' ','x','>','<','?','!','*','-','/','b'];
  const attr=c=>c.replace('"','&quot;');
  host.insertAdjacentHTML('beforeend','<div class="markdown-preview-view markdown-rendered tk-read"><ul class="contains-task-list">'+chars.map(c=>'<li data-task="'+attr(c)+'" class="task-list-item'+(c===' '?'':' is-checked')+'"><input type="checkbox" class="task-list-item-checkbox"'+(c===' '?'':' checked')+'>t</li>').join('')+'</ul></div>'+
   '<div class="markdown-source-view mod-cm6 is-live-preview tk-edit"><div class="cm-content">'+chars.map(c=>'<div class="cm-line HyperMD-list-line HyperMD-list-line-1 HyperMD-task-line" data-task="'+attr(c)+'"><label class="task-list-label"><input class="task-list-item-checkbox" type="checkbox" data-task="'+attr(c)+'"'+(c===' '?'':' checked')+'></label><span class="cm-list-1"> t</span></div>').join('')+'</div></div>');
  const box=(view,c)=>{const i=host.querySelectorAll('.'+view+' .task-list-item-checkbox')[chars.indexOf(c)],s=cs(i),a=cs(i,'::after');return {bg:s.backgroundColor,image:s.backgroundImage.slice(0,15),mark:a.webkitMaskImage.slice(0,30),after:a.display,host:cs(i.closest('li, .cm-line')).textDecorationLine}};
  const filled=b=>b.bg!=='rgba(0, 0, 0, 0)';
  for(const view of ['tk-read','tk-edit']){
   const b=Object.fromEntries(chars.map(c=>[c,box(view,c)])),label=view==='tk-read'?'reading view':'the editor';
   check('Done and unknown states keep core\'s filled check in '+label,filled(b.x)&&filled(b.b)&&b.x.mark===b.b.mark&&b.x.mark.includes('utf8'),{x:b.x,b:b.b});
   check('Alternate states keep an open frame with their own mark in '+label,['>','<','?','!','*','-'].every(c=>!filled(b[c])&&b[c].mark.startsWith('url("data:image/svg+xml,<svg')&&b[c].mark!==b.x.mark),b);
   check('Each alternate state has a distinct mark in '+label,new Set(['>','<','?','!','*','-'].map(c=>b[c].mark+cs(host.querySelectorAll('.'+view+' .task-list-item-checkbox')[chars.indexOf(c)],'::after').webkitMaskImage.length)).size===6,b);
   check('In progress fills the box halfway in '+label,b['/'].image.startsWith('linear-gradient')&&b['/'].after==='none'&&!filled(b['/']),b['/']);
   check('Only done and cancelled lines are struck in '+label,b['-'].host.includes('line-through')&&['>','<','?','!','*','/','b'].every(c=>!b[c].host.includes('line-through')),Object.fromEntries(Object.entries(b).map(([k,v])=>[k,v.host])));
  }
  toggle('still-keep-done-tasks',true);
  const keep=[box('tk-read','x').host,box('tk-read','-').host];toggle('still-keep-done-tasks',false);
  check('"Don\'t strike completed tasks" leaves cancelled tasks struck',!keep[0].includes('line-through')&&keep[1].includes('line-through'),keep);
  // Per-note table classes, in reading view and the editor's table widget.
  stage='tables';
  const rows='<thead><tr><th>a</th><th>b</th><th>c</th></tr></thead><tbody><tr><td>1</td><td>2</td><td>a long cell that would wrap in a narrow table</td></tr><tr><td>4</td><td>5</td><td>6</td></tr></tbody>';
  const wrapCells=html=>html.replace(/<(t[hd])>([^<]*)<\/t[hd]>/g,'<$1><div class="table-cell-wrapper">$2</div></$1>');
  const page=c=>'<div class="markdown-preview-view markdown-rendered tb-read '+c+'" style="width:600px"><table>'+rows+'</table></div><div class="markdown-source-view mod-cm6 is-live-preview tb-edit '+c+'" style="width:600px"><div class="cm-content"><div class="cm-embed-block cm-table-widget markdown-rendered"><div class="table-wrapper"><table class="table-editor">'+wrapCells(rows)+'</table></div></div></div></div>';
  const tbl=c=>{const d=document.createElement('div');d.innerHTML=page(c);host.append(d);const out={};for(const v of ['tb-read','tb-edit']){const t=d.querySelector('.'+v+' table'),td=t.querySelector('tbody td'),long=t.querySelector('tbody td:nth-child(3)'),first=t.querySelector('tbody tr'),num=cs(td,'::before');const text=v==='tb-read'?td:td.querySelector('.table-cell-wrapper');const r=document.createRange();r.selectNodeContents(text);out[v]={size:parseFloat(cs(td).fontSize),ws:cs(long).whiteSpace,rowBg:cs(first).backgroundColor,mid:parseFloat(cs(td).borderRightWidth),edge:parseFloat(cs(td).borderLeftWidth),num:num.content,textLeft:Math.round(r.getBoundingClientRect().left-td.getBoundingClientRect().left)}}d.remove();return out};
  const base=tbl(''),small=tbl('table-small'),tiny=tbl('table-tiny'),nowrap=tbl('table-nowrap'),alt=tbl('row-alt'),cols=tbl('col-lines'),lines=tbl('table-lines'),nums=tbl('table-numbers');
  const both=f=>['tb-read','tb-edit'].every(v=>f(v));
  check('Tables without a class keep Still\'s defaults',both(v=>base[v].ws==='break-spaces'&&base[v].rowBg==='rgba(0, 0, 0, 0)'&&base[v].mid===0&&base[v].edge===0&&base[v].num==='none'),base);
  check('table-small and table-tiny step the text down in both views',both(v=>small[v].size<base[v].size&&tiny[v].size<small[v].size),{base,small,tiny});
  check('table-nowrap keeps cells on one line in both views',both(v=>nowrap[v].ws==='nowrap'),nowrap);
  check('row-alt washes alternate rows in both views',both(v=>alt[v].rowBg!=='rgba(0, 0, 0, 0)'),alt);
  check('col-lines draws rules between columns only',both(v=>cols[v].mid>0&&cols[v].edge===0),cols);
  check('table-lines draws a full grid with an outer frame',both(v=>lines[v].mid>0&&lines[v].edge>0),lines);
  check('table-numbers numbers rows and moves the cell text clear of them',both(v=>nums[v].num==='counter(still-row)'&&nums[v].textLeft>base[v].textLeft+15),{base,nums});
  // table-wide, in a real popout note (reading view and Live Preview):
  // tables take a wider block than the text, centred on it and capped at
  // the pane; the text keeps its width; a narrow table lines up with it.
  stage='table-wide';
  popLeaf=app.workspace.openPopoutLeaf();const view=app.viewRegistry.viewByType.markdown(popLeaf);await popLeaf.open(view);
  const ew=view.containerEl.win.electronWindow;ew.setBounds({width:1100,height:700});ew.show();ew.focus();await pause(500);
  const row=n=>'| '+Array.from({length:n},(_,i)=>'Column '+i).join(' | ')+' |\n|'+'---|'.repeat(n)+'\n| '+Array.from({length:n},(_,i)=>'value '+i).join(' | ')+' |\n';
  view.setViewData('A paragraph long enough to fill the text column from one edge to the other, so its box shows the line.\n\n'+row(2)+'\ntext\n\n'+row(14)+'\ntext\n',true);
  const R=e=>{const b=e.getBoundingClientRect();return [Math.round(b.left),Math.round(b.right)]};
  const measure=async(mode,cls)=>{await view.setMode(mode==='read'?view.previewMode:view.editMode);if(mode==='read')view.previewMode.rerender(true);await pause(700);
   const root=mode==='read'?view.previewMode.containerEl.querySelector('.markdown-preview-view'):view.editMode.editorEl.closest('.markdown-source-view');
   for(let i=0;i<30&&root.querySelectorAll('table').length<2;i++)await pause(100);root.classList.toggle('table-wide',cls);await pause(300);
   const sc=mode==='read'?root:root.querySelector('.cm-scroller'),pad=parseFloat(cs(sc).paddingLeft),b=sc.getBoundingClientRect();
   const r={pane:[Math.round(b.left+pad),Math.round(b.right-pad)],text:R(root.querySelector(mode==='read'?'p':'.cm-line')),tables:[...root.querySelectorAll('table')].map(R),blocks:[...root.querySelectorAll(mode==='read'?'.el-table':'.cm-table-widget')].map(e=>{const[l,r]=R(e),g=mode==='read'?0:parseFloat(cs(e).paddingLeft);return [l+g,r-g]}),pageScroll:sc.scrollWidth>sc.clientWidth+1};root.classList.remove('table-wide');return r};
  const wOff={read:await measure('read',false),edit:await measure('edit',false)},wOn={read:await measure('read',true),edit:await measure('edit',true)};
  popLeaf.detach();popLeaf=null;
  const inPane=(t,p)=>t[0]>=p[0]-1&&t[1]<=p[1]+1;
  check('table-wide keeps the text column where it was',['read','edit'].every(k=>JSON.stringify(wOn[k].text)===JSON.stringify(wOff[k].text)),{off:wOff,on:wOn});
  check('table-wide lines a narrow table up with the text',Object.values(wOn).every(o=>Math.abs(o.tables[0][0]-o.text[0])<=1&&Math.abs(o.tables[0][1]-o.text[1])<=1),wOn);
  check('table-wide widens a wide table to both sides, within the pane',Object.values(wOn).every(o=>o.blocks[1][0]<o.text[0]-10&&o.blocks[1][1]>o.text[1]+10&&inPane(o.blocks[1],o.pane)&&!o.pageScroll&&Math.abs((o.blocks[1][0]+o.blocks[1][1])-(o.text[0]+o.text[1]))<=2),wOn);
  // Indentation guides follow Obsidian's own setting: core only renders
  // them (the reading class, the editor's indent spans) when it is on.
  stage='indentation guides';
  host.insertAdjacentHTML('beforeend','<div class="markdown-rendered show-indentation-guide"><ul><li>a<ul class="ig-read"><li>b</li></ul></li></ul></div><div class="markdown-source-view mod-cm6 is-live-preview"><div class="cm-content"><div class="cm-line"><span class="cm-indent ig-edit">\t</span><span class="cm-indent cm-active-indent ig-active">\t</span></div></div></div>');
  const guide=s=>cs(host.querySelector(s),'::before').borderInlineEndWidth;
  const ig={read:guide('.ig-read'),edit:guide('.ig-edit'),active:guide('.ig-active')};
  check('Indentation guides show when Obsidian\'s setting turns them on',Object.values(ig).every(w=>parseFloat(w)>0),ig);
  check('The file tree keeps no indentation guides',parseFloat(cs(document.body).getPropertyValue('--nav-indentation-guide-width'))===0,cs(document.body).getPropertyValue('--nav-indentation-guide-width'));
  // Footnote markers sit on the line without opening up its leading.
  stage='footnotes';
  host.insertAdjacentHTML('beforeend','<div class="markdown-preview-view markdown-rendered fn-read" style="width:600px"><p class="fn-plain">Line one<br>line two</p><p class="fn-ref">Line one<sup data-footnote-id="fnref-1" class="footnote-ref"><a class="footnote-link" href="#fn-1">[1]</a></sup><br>line two</p><section class="footnotes"><hr><ol><li id="fn-1"><p>Note.</p></li></ol></section></div>');
  const hPlain=host.querySelector('.fn-plain').getBoundingClientRect().height,hRef=host.querySelector('.fn-ref').getBoundingClientRect().height;
  check('Footnote markers leave the line height alone',Math.abs(hRef-hPlain)<0.5,{plain:hPlain,withMarker:hRef});
  const muted=document.createElement('span');muted.style.color='var(--text-muted)';host.append(muted);
  const fnColor={notes:cs(host.querySelector('.fn-read .footnotes')).color,muted:cs(muted).color};muted.remove();
  check('Footnotes read as muted end matter',fnColor.notes===fnColor.muted,fnColor);
  // Keys get a framed cap in reading view and in the editor's HTML embeds.
  stage='keys';
  host.insertAdjacentHTML('beforeend','<div class="markdown-rendered"><kbd class="k-read">K</kbd></div><div class="markdown-source-view mod-cm6"><div class="cm-content"><div class="cm-line"><span class="cm-html-embed"><kbd class="k-edit">K</kbd></span></div></div></div>');
  const key=s=>{const k=cs(host.querySelector(s));return [k.borderTopWidth,k.boxShadow.includes('inset')]};
  check('Keys are framed caps in both views',[key('.k-read'),key('.k-edit')].every(([w,inset])=>w==='1px'&&inset),{read:key('.k-read'),edit:key('.k-edit')});
  // Canvas: text cards take the card ground, the grid follows the option.
  stage='canvas';
  host.insertAdjacentHTML('beforeend','<div class="canvas-wrapper" style="position:relative;width:400px;height:300px"><svg class="canvas-background"><circle class="cv-dot" r="1"></circle></svg><div class="canvas"><div class="canvas-node"><div class="canvas-node-container cv-plain"><div class="canvas-node-content markdown-embed cv-text"></div></div></div><div class="canvas-node is-themed mod-canvas-color-4"><div class="canvas-node-container cv-themed"></div></div></div></div>');
  const dot=()=>cs(host.querySelector('.cv-dot')).fill;
  const ref=document.createElement('div');ref.style.borderRadius='var(--still-content-radius)';host.append(ref);
  const cv={text:cs(host.querySelector('.cv-text')).backgroundColor,radius:cs(host.querySelector('.cv-plain')).borderTopLeftRadius,content:cs(ref).borderTopLeftRadius,dot:dot()};ref.remove();
  toggle('still-canvas-plain',true);cv.plainDot=dot();toggle('still-canvas-plain',false);
  check('Canvas text cards take the card ground, not the embed wash',cv.text==='rgba(0, 0, 0, 0)',cv);
  check('Canvas cards round to the reading radius',cv.radius===cv.content,cv);
  check('Plain Canvas option hides the dot grid',cv.dot!=='rgba(0, 0, 0, 0)'&&cv.plainDot==='rgba(0, 0, 0, 0)',cv);
  // Print: headings stay with what follows and code wraps at the paper edge.
  stage='print';
  host.insertAdjacentHTML('beforeend','<div class="markdown-preview-view markdown-rendered pr-read"><h2>H</h2><pre><code>x</code></pre></div>');
  const pr=()=>({h:cs(host.querySelector('.pr-read h2')).breakAfter,pre:cs(host.querySelector('.pr-read pre')).whiteSpace,wrap:cs(host.querySelector('.pr-read pre')).overflowWrap});
  const screen=pr();wc.debugger.attach('1.3');attached=true;await wc.debugger.sendCommand('Emulation.setEmulatedMedia',{media:'print'});await pause(50);const print=pr();
  check('Print keeps headings with what follows and wraps code',screen.h==='auto'&&screen.wrap!=='anywhere'&&print.h==='avoid'&&print.pre==='pre-wrap'&&print.wrap==='anywhere',{screen,print});
  return JSON.stringify({vault:app.vault.getName(),theme:app.customCss.theme,results,passed:results.filter(r=>r.pass).length,total:results.length});
 }catch(e){return JSON.stringify({stage,error:String(e),stack:e.stack,results,passed:results.filter(r=>r.pass).length,total:results.length})}
 finally{
  if(attached){try{await wc.debugger.sendCommand('Emulation.setEmulatedMedia',{media:''})}catch{}try{wc.debugger.detach()}catch{}}
  host?.remove();popLeaf?.detach();
  for(const[s,d]of sheets)try{s.disabled=d}catch{}
  document.body.className=saved.classes;if(saved.style===null)document.body.removeAttribute('style');else document.body.setAttribute('style',saved.style);
 }
})()`;
const run=spawnSync('obsidian',[`vault=${VAULT}`,'eval',`code=${code}`],{encoding:'utf8',timeout:60000});
if(run.error)throw run.error;
const mark=run.stdout.lastIndexOf('=> ');const out=(mark>=0?run.stdout.slice(mark+3):run.stdout).trim();
let report;try{report=JSON.parse(out)}catch{throw Error(out||run.stderr)}
writeFileSync(process.argv[3]??'still-blocks-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} passed`);for(const r of report.results)if(!r.pass)console.log(`FAIL ${r.name}: ${JSON.stringify(r.evidence)}`);
if(report.error)console.log(report.stage+': '+report.stack);
process.exitCode=!report.error&&report.passed===report.total?0:1;
