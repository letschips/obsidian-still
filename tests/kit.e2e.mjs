// Obsidian renderer E2E: first-line indent, Chinese font pairing, compact
// interface and callout spacing. Runs in a temporary popout on probe
// elements; no note or config writes.
// Usage: node tests/kit.e2e.mjs <vault> <report.json>
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const VAULT=process.argv[2];if(!VAULT){console.error('Usage: node '+process.argv[1].split('/').pop()+' <vault name> <report.json>');process.exit(2)}
const code=String.raw`(async()=>{
 const results=[];const check=(name,pass,evidence)=>results.push({name,pass,evidence});
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const oldLeaf=app.workspace.activeLeaf;
 const leaf=app.workspace.openPopoutLeaf({width:620,height:660});
 let doc,host,stage='setup';
 try{
  for(let n=0;n<60&&leaf.view.containerEl.ownerDocument===document;n++)await pause(50);
  doc=leaf.view.containerEl.ownerDocument;
  if(doc===document)throw Error('Popout unavailable');
  for(const s of doc.styleSheets)if(!s.href&&!s.ownerNode.textContent.includes('Still —'))s.disabled=true;
  const body=doc.body,view=doc.defaultView;
  const mine=['still-indent','still-compact','still-fonts-off','still-fonts-hei','still-fonts-song','is-mobile'];
  const had=mine.filter(c=>body.classList.contains(c));body.classList.remove(...mine);
  host=doc.createElement('div');host.style.cssText='position:fixed;inset:0;overflow:auto;z-index:100;font-size:16px';
  const reading=cls=>'<div class="markdown-preview-view markdown-rendered '+cls+'"><div class="markdown-preview-sizer"><div class="el-h1"><h1>Title</h1></div><div class="el-p"><p class="plain">Body <span class="inl" style="display:inline-block">x</span></p></div><div class="el-p"><p class="pic"><img alt=""> caption</p></div><div class="el-p"><p class="emb"><span class="internal-embed">embed</span></p></div><div class="el-ul"><ul><li><p class="inlist">Item</p></li></ul></div><div class="el-blockquote"><blockquote><p class="inquote">Quote</p></blockquote></div><div class="el-div"><div class="callout"><div class="callout-title">T</div><div class="callout-content"><p class="incallout">Call</p></div></div></div></div></div>';
  const editor=cls=>'<div class="markdown-source-view mod-cm6 is-live-preview cm-s-obsidian '+cls+'"><div class="cm-content"><div class="cm-line plain">Body <span class="inl" style="display:inline-block">x</span></div><div class="cm-line HyperMD-header HyperMD-header-1 head">Title</div><div class="cm-line HyperMD-list-line list">Item</div><div class="cm-line HyperMD-quote quote">Quote</div><div class="cm-line pic"><img alt=""></div></div></div>';
  host.innerHTML='<div class="r-plain">'+reading('')+'</div><div class="r-on">'+reading('indent')+'</div><div class="r-off">'+reading('no-indent')+'</div><div class="e-plain">'+editor('')+'</div><div class="e-on">'+editor('indent')+'</div><div class="e-off">'+editor('no-indent')+'</div><div class="menu" style="position:relative;inset:auto;width:200px"><div class="menu-item">Menu</div></div>';
  body.append(host);
  const cs=(sel,prop)=>view.getComputedStyle(host.querySelector(sel))[prop];
  const ind=sel=>cs(sel,'textIndent');
  const row=g=>({plain:ind(g+' .plain'),inline:ind(g+' .plain .inl'),pic:ind(g+' .pic')});
  const rest=g=>['.emb','.inlist','.inquote','.incallout'].map(s=>ind(g+' '+s));
  stage='indent off';
  check('Indent is off by default',[row('.r-plain'),row('.e-plain')].every(r=>r.plain==='0px'),{reading:row('.r-plain'),editor:row('.e-plain')});
  check('A note opts in with indent',row('.r-on').plain==='32px'&&row('.e-on').plain==='32px',{reading:row('.r-on'),editor:row('.e-on')});
  stage='indent on';body.classList.add('still-indent');
  let r=row('.r-plain'),e=row('.e-plain');
  check('Plain paragraphs indent two characters in both views',r.plain==='32px'&&e.plain==='32px',{r,e});
  check('Inline blocks inside an indented paragraph start from zero',r.inline==='0px'&&e.inline==='0px',{r,e});
  check('Image-led and embed paragraphs, lists, quotes and callouts stay flush',r.pic==='0px'&&e.pic==='0px'&&rest('.r-plain').every(v=>v==='0px')&&['.head','.list','.quote'].every(s=>ind('.e-plain '+s)==='0px'),{r,e,rest:rest('.r-plain'),lines:['.head','.list','.quote'].map(s=>ind('.e-plain '+s))});
  check('A note opts out with no-indent',row('.r-off').plain==='0px'&&row('.e-off').plain==='0px',{reading:row('.r-off'),editor:row('.e-off')});
  body.classList.remove('still-indent');
  stage='fonts';const fam=sel=>cs(sel,'fontFamily');
  const before={p:fam('.r-plain .plain'),h:fam('.r-plain h1'),q:fam('.r-plain blockquote')};
  check('No pairing by default',!/Songti|Kaiti|PingFang SC/.test(before.p+before.h+before.q),before);
  body.classList.add('still-fonts-song');
  const song={p:fam('.r-plain .plain'),h:fam('.r-plain h1'),q:fam('.r-plain blockquote'),eq:fam('.e-plain .quote'),el:fam('.e-plain .plain')};
  check('Song: body in Song with a Latin serif first',/Iowan Old Style.*Songti SC.*SimSun/.test(song.p)&&/Songti SC/.test(song.el),song);
  check('Song: headings stay in the interface sans',!/Songti|Kaiti|serif,/.test(song.h.split('sans-serif')[0])&&/Inter/.test(song.h),{song,before});
  check('Song: quotes in Kai in both views',/Kaiti SC.*KaiTi/.test(song.q)&&/Kaiti SC/.test(song.eq),song);
  body.classList.replace('still-fonts-song','still-fonts-hei');
  const hei={p:fam('.r-plain .plain'),ui:fam('.menu-item')};
  check('Hei: text and interface pin Simplified Chinese sans faces',/PingFang SC.*Microsoft YaHei/.test(hei.p)&&/PingFang SC.*Microsoft YaHei/.test(hei.ui),hei);
  body.classList.remove('still-fonts-hei');
  stage='compact';const dens=()=>({header:view.getComputedStyle(body).getPropertyValue('--header-height').trim(),input:view.getComputedStyle(body).getPropertyValue('--input-height').trim(),nav:view.getComputedStyle(body).getPropertyValue('--nav-item-padding').trim(),menu:cs('.menu-item','paddingTop'),ribbon:view.getComputedStyle(body).getPropertyValue('--ribbon-width').trim()});
  const roomy=dens();body.classList.add('still-compact');const tight=dens();
  check('Default density keeps the 45px header and 5px menu rows',roomy.header==='45px'&&roomy.menu==='5px'&&roomy.input==='32px',roomy);
  check('Compact: 40px header, 28px fields, closer menu and sidebar rows',tight.header==='40px'&&tight.input==='28px'&&tight.menu==='3px'&&tight.nav==='4px 12px 4px 24px',tight);
  check('Compact leaves the ribbon width alone',tight.ribbon===roomy.ribbon,{tight,roomy});
  body.classList.add('is-mobile');const touch=dens();body.classList.remove('is-mobile');
  check('Compact is desktop only',touch.header!=='40px'&&touch.menu!=='3px',touch);
  body.classList.remove('still-compact');
  stage='callout';
  check('The last block in a callout adds no gap under it',cs('.r-plain .incallout','marginBottom')==='0px',{mb:cs('.r-plain .incallout','marginBottom')});
  body.classList.add(...had);
  return JSON.stringify({vault:app.vault.getName(),theme:app.customCss.theme,results,passed:results.filter(r=>r.pass).length,total:results.length});
 }catch(e){return JSON.stringify({stage,error:String(e),stack:e.stack,results,passed:results.filter(r=>r.pass).length,total:results.length})}finally{
  host?.remove();leaf.detach();if(oldLeaf)app.workspace.setActiveLeaf(oldLeaf,{focus:false});
 }
})()`;
const run=spawnSync('obsidian',[`vault=${VAULT}`,'eval',`code=${code}`],{encoding:'utf8',timeout:30000});
if(run.error)throw run.error;
const marker=run.stdout.lastIndexOf('=> ');const out=(marker>=0?run.stdout.slice(marker+3):run.stdout).trim();
let report;try{report=JSON.parse(out)}catch{throw Error(out||run.stderr)}
writeFileSync(process.argv[3]??'still-kit-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} passed`);for(const r of report.results)if(!r.pass)console.log(`FAIL ${r.name}: ${JSON.stringify(r.evidence)}`);
if(report.error)console.log(report.stage+': '+report.stack);
process.exitCode=!report.error&&report.passed===report.total?0:1;
