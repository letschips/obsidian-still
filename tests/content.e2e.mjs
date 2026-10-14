// Obsidian renderer E2E for Still's opt-in content options. Isolates Still
// (snippets off, opaque window) and restores classes, styles and the Bases
// tab it opens. No note or config writes.
// Breaks caught: images that ignore "fill the line width" (or stretch with it
// off), explicit widths overridden, colored headings that skip H4/H6 (Still
// keeps their --hN-color muted), a soft sidebar peek that still draws its shadow, tall images overflowing the window, list
// spacing slider ignored, CJK typography that leaks into code or overrides
// the line-height slider, PDF dimming in light mode, and Bases stripes that
// follow DOM order: virtualized rows are recycled while scrolling, so stripes
// must come from a row's position, checked here on captured pixels. Also
// headings and spacing sized off the root font size, which differs from the
// text size in popout windows (15px vs 17px) and with iOS text scaling, and
// card callouts whose last block (a nested callout) adds an extra gap below.
// Usage: node tests/content.e2e.mjs <vault> <report.json> [base path] [table view]
// The Bases stripe checks need a .base file with a table view long enough to
// scroll; without the last two arguments they are skipped.
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const VAULT=process.argv[2];if(!VAULT){console.error('Usage: node '+process.argv[1].split('/').pop()+' <vault name> <report.json> ...');process.exit(2)}
const basePath=process.argv[4]??null;
const baseView=process.argv[5]??null;
const code=String.raw`(async()=>{
 const results=[],check=(name,pass,evidence)=>results.push({name,pass,evidence});
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),wc=require('electron').remote.getCurrentWebContents();
 if(app.customCss.theme!=='Still')throw Error('Select Still first');
 const saved={classes:document.body.className,style:document.body.getAttribute('style'),html:document.documentElement.getAttribute('style'),leaf:app.workspace.activeLeaf};
 const sheets=app.customCss.extraStyleEls.map(e=>[e.sheet,e.sheet.disabled]);
 const opts=['still-media-fill','still-pdf-dim','still-bases-stripes','still-colored-headings','still-peek-soft','still-cjk','still-justify','still-img-dim','still-outline-guides','still-card-callouts'];
 let host,leaf,stage='setup';const probes=[];
 const toggle=(c,on)=>document.body.classList.toggle(c,on);
 const image=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').fillRect(0,0,w,h);return c.toDataURL()};
 try{
  for(const[s]of sheets)s.disabled=true;
  for(const c of [...opts,'is-translucent'])toggle(c,false);
  stage='media';
  host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:0;width:600px;z-index:-1';
  host.innerHTML='<div class="markdown-rendered"><span class="internal-embed image-embed"><img class="p-small"></span><span class="internal-embed image-embed" width="50"><img class="p-fixed" width="50"></span><span class="internal-embed image-embed"><img class="p-tall"></span><ul><li>one</li><li>two</li></ul></div>'+
   '<div class="markdown-source-view mod-cm6"><div class="cm-content" style="width:600px"><div class="internal-embed image-embed"><div class="image-wrapper"><img class="s-small"></div></div></div></div>'+
   '<div class="pdf-container"><div class="pdfViewer"><div class="page"></div></div></div>';
  document.body.append(host);
  const small=image(40,40),tall=image(40,4000);
  for(const[c,src]of [['.p-small',small],['.p-fixed',small],['.p-tall',tall],['.s-small',small]]){const i=host.querySelector(c);i.src=src;await i.decode()}
  const w=c=>Math.round(host.querySelector(c).getBoundingClientRect().width),h=c=>Math.round(host.querySelector(c).getBoundingClientRect().height);
  const off={reading:w('.p-small'),editing:w('.s-small'),fixed:w('.p-fixed')};
  toggle('still-media-fill',true);await pause(30);
  const on={reading:w('.p-small'),editing:w('.s-small'),fixed:w('.p-fixed'),tall:h('.p-tall'),limit:Math.round(innerHeight*.75)};
  toggle('still-media-fill',false);
  check('Images keep their size by default',off.reading===40&&off.editing===40,off);
  check('Fill option stretches images to the line width in both views',on.reading>=590&&on.editing>=590,on);
  check('Images with an explicit width keep it',on.fixed===50,on);
  check('Tall images stay within the window',on.tall<=on.limit+1,on);
  stage='headings';
  host.insertAdjacentHTML('beforeend','<div class="markdown-rendered">'+[1,2,3,4,5,6].map(n=>'<h'+n+' class="t'+n+'">x</h'+n+'>').join('')+'</div>');
  const hue=()=>[1,2,3,4,5,6].map(n=>getComputedStyle(host.querySelector('.t'+n)).color);
  const plainHeads=hue();toggle('still-colored-headings',true);const coloredHeads=hue();toggle('still-colored-headings',false);
  check('Headings keep the text color by default',plainHeads[0]===plainHeads[1]&&plainHeads[0]===plainHeads[2]&&plainHeads[0]===plainHeads[4],plainHeads);
  check('Colored headings give all six levels their own hue, H4 and H6 included',new Set(coloredHeads).size===6,coloredHeads);
  // CJK typography: a gap where Han meets Latin or digits with no space typed,
  // in reading and editing views; code keeps its exact characters; paragraph
  // ends avoid a lone character; a roomier default line height that still
  // yields to the Line height slider. Everything is unchanged with it off.
  stage='cjk';
  host.insertAdjacentHTML('beforeend','<div class="markdown-preview-view markdown-rendered cjk-read" style="width:600px"><p><span class="cjk-run" style="white-space:nowrap">applications人们低估了structured知识3个</span></p><p><code class="cjk-code">applications人们</code></p><pre><code class="cjk-pre">applications人们</code></pre><h2 class="cjk-h">skill graphs技能图谱</h2></div>'+
   '<div class="markdown-source-view mod-cm6"><div class="cm-content"><div class="cm-line cjk-line">applications人们<span class="cm-inline-code cjk-cm-code">code代码</span></div><div class="HyperMD-codeblock cm-line cjk-cm-block">code代码</div></div></div>');
  const cs=c=>getComputedStyle(host.querySelector(c));
  const cjk=()=>({run:Math.round(host.querySelector('.cjk-run').getBoundingClientRect().width*10)/10,read:cs('.cjk-read p').textAutospace,code:cs('.cjk-code').textAutospace,pre:cs('.cjk-pre').textAutospace,line:cs('.cjk-line').textAutospace,cmCode:cs('.cjk-cm-code').textAutospace,cmBlock:cs('.cjk-cm-block').textAutospace,wrap:cs('.cjk-read p').textWrapStyle,heading:cs('.cjk-h').textWrapStyle,trim:cs('.cjk-read p').textSpacingTrim,lineHeight:Math.round(parseFloat(cs('.cjk-read p').lineHeight)/parseFloat(cs('.cjk-read p').fontSize)*1000)/1000});
  const cjkOff=cjk();toggle('still-cjk',true);const cjkOn=cjk();
  document.body.style.setProperty('--still-line-height','1.5');const cjkSlider=cjk().lineHeight;document.body.style.removeProperty('--still-line-height');
  toggle('still-cjk',false);
  check('CJK typography is off by default',cjkOff.read==='no-autospace'&&cjkOff.line==='no-autospace'&&cjkOff.wrap!=='pretty'&&cjkOff.trim==='normal'&&cjkOff.lineHeight===1.625,cjkOff);
  check('CJK option spaces Han from Latin and digits in reading and editing views',cjkOn.read==='normal'&&cjkOn.line==='normal'&&cjkOn.run>cjkOff.run,{off:cjkOff.run,on:cjkOn.run,read:cjkOn.read,line:cjkOn.line});
  check('Code keeps its exact spacing with the CJK option on',[cjkOn.code,cjkOn.pre,cjkOn.cmCode,cjkOn.cmBlock].every(v=>v==='no-autospace'),cjkOn);
  check('CJK option keeps paragraph ends and headings from a lone character',cjkOn.wrap==='pretty'&&cjkOn.heading==='balance'&&cjkOn.trim==='trim-start',cjkOn);
  check('CJK option opens the line height but the slider still wins',cjkOn.lineHeight===1.75&&cjkSlider===1.5,{on:cjkOn.lineHeight,slider:cjkSlider});
  stage='peek';
  const dock=document.createElement('div');dock.className='mod-sidedock is-sidedock-collapsed mod-right-split';dock.style.display='none';document.body.append(dock);probes.push(dock);
  const slab=()=>{const b=getComputedStyle(dock,'::before');return {shadow:b.boxShadow,image:b.backgroundImage.slice(0,40),left:b.left}};
  const slabOff=slab();toggle('still-peek-soft',true);const slabOn=slab();toggle('still-peek-soft',false);
  check('Sidebar peek keeps its shadowed slab by default',slabOff.shadow!=='none'&&slabOff.image==='none',slabOff);
  check('Soft peek fades the page-facing edge with a gradient and no shadow',slabOn.shadow==='none'&&slabOn.image.startsWith('linear-gradient')&&parseFloat(slabOn.left)<0,slabOn);
  stage='lists';
  const gap=()=>Math.round(host.querySelector('li').getBoundingClientRect().height);
  document.body.style.setProperty('--still-list-spacing','0');const tight=gap();
  document.body.style.setProperty('--still-list-spacing','0.6');const loose=gap();
  document.body.style.removeProperty('--still-list-spacing');
  check('List spacing setting changes the space around items',loose>tight,{tight,loose});
  stage='pdf';
  const page=host.querySelector('.page'),opacity=()=>parseFloat(getComputedStyle(page).opacity);
  toggle('still-pdf-dim',true);toggle('theme-light',false);toggle('theme-dark',true);const dark=opacity();
  toggle('theme-dark',false);toggle('theme-light',true);const light=opacity();toggle('still-pdf-dim',false);
  check('PDF dimming applies in dark mode only',dark<1&&light===1,{dark,light});
  // Justified paragraphs: body text in both views; headings, code, table
  // rows and the note title keep their own alignment.
  stage='justify';
  host.insertAdjacentHTML('beforeend','<div class="markdown-preview-view markdown-rendered just-read"><p>正文</p><ul><li>列表</li></ul><h2>标题</h2></div>'+
   '<div class="markdown-source-view mod-cm6"><div class="inline-title">标题</div><div class="cm-content"><div class="cm-line just-line">正文</div><div class="cm-line HyperMD-header HyperMD-header-2 just-head">## 标题</div><div class="cm-line HyperMD-codeblock just-code">code</div><div class="cm-line HyperMD-table-row just-table">| a |</div></div></div>');
  const align=()=>Object.fromEntries([['p','.just-read p'],['li','.just-read li'],['h2','.just-read h2'],['line','.just-line'],['head','.just-head'],['code','.just-code'],['table','.just-table'],['title','.inline-title']].map(([k,s])=>[k,getComputedStyle(host.querySelector(s)).textAlign]));
  const alignOff=align();toggle('still-justify',true);const alignOn=align();toggle('still-justify',false);
  check('Paragraphs keep start alignment by default',alignOff.p==='start'&&alignOff.line==='start',alignOff);
  check('Justify option aligns body text in reading and editing views',['p','li','line'].every(k=>alignOn[k]==='justify'),alignOn);
  check('Justify option leaves headings, code, tables and the title alone',['h2','head','code','table','title'].every(k=>alignOn[k]!=='justify'),alignOn);
  // Dim images in dark mode: note images only; link favicons stay crisp.
  stage='image dim';
  host.insertAdjacentHTML('beforeend','<div class="markdown-rendered"><span class="internal-embed image-embed"><img class="dim-img"></span><a class="external-link"><img class="link-favicon dim-favicon"></a></div><div class="markdown-source-view mod-cm6"><div class="cm-content"><div class="internal-embed image-embed"><div class="image-wrapper"><img class="dim-src"></div></div></div></div>');
  const imgs=()=>['.dim-img','.dim-src','.dim-favicon'].map(s=>parseFloat(getComputedStyle(host.querySelector(s)).opacity));
  toggle('theme-light',false);toggle('theme-dark',true);const darkOff=imgs();toggle('still-img-dim',true);const darkOn=imgs();
  toggle('theme-dark',false);toggle('theme-light',true);const lightOn=imgs();toggle('still-img-dim',false);
  check('Images keep full opacity by default',darkOff.every(o=>o===1),darkOff);
  check('Image dimming applies to note images in dark mode only',darkOn[0]<1&&darkOn[1]<1&&lightOn.every(o=>o===1),{darkOn,lightOn});
  check('Image dimming leaves link favicons alone',darkOn[2]===1,{darkOn});
  // Outline guides: a hairline per level in the outline view only; the file
  // tree keeps Still's guide-free rows.
  stage='outline';
  host.insertAdjacentHTML('beforeend','<div class="workspace-leaf-content" data-type="outline"><div class="tree-item"><div class="tree-item-self">H2</div><div class="tree-item-children ol-children"><div class="tree-item"><div class="tree-item-self">H3</div></div></div></div></div>'+
   '<div class="workspace-leaf-content" data-type="file-explorer"><div class="tree-item"><div class="tree-item-self">dir</div><div class="tree-item-children fe-children"><div class="tree-item"><div class="tree-item-self">file</div></div></div></div></div>');
  const guides=()=>['.ol-children','.fe-children'].map(s=>{const c=getComputedStyle(host.querySelector(s));return parseFloat(c.borderInlineStartWidth)+'px '+c.borderInlineStartStyle});
  const guideOff=guides();toggle('still-outline-guides',true);const guideOn=guides();toggle('still-outline-guides',false);
  check('Outline has no guides by default',guideOff[0].startsWith('0px'),guideOff);
  check('Outline guides option draws one hairline per level in the outline only',guideOn[0]==='1px solid'&&guideOn[1].startsWith('0px'),guideOn);
  // Tables are hairline rows: no vertical rules, the outer edges included, in
  // reading view and in the editor's table widget.
  stage='table rules';
  const tbl='<table><thead><tr><th>a</th><th>b</th><th>c</th></tr></thead><tbody><tr><td>1</td><td>2</td><td>3</td></tr><tr><td>4</td><td>5</td><td>6</td></tr></tbody></table>';
  host.insertAdjacentHTML('beforeend','<div class="markdown-preview-view markdown-rendered tbl-read">'+tbl+'</div><div class="markdown-source-view mod-cm6"><div class="cm-content"><div class="cm-embed-block cm-table-widget markdown-rendered tbl-edit"><div class="table-wrapper">'+tbl.replace('<table>','<table class="table-editor">')+'</div></div></div></div>');
  const edges=s=>[...host.querySelectorAll(s+' :is(th, td)')].map(c=>{const cs=getComputedStyle(c);return [cs.borderLeftWidth,cs.borderRightWidth,cs.borderBottomWidth].map(parseFloat)});
  const tblRead=edges('.tbl-read'),tblEdit=edges('.tbl-edit');
  check('Tables have no vertical rules in reading view or the editor',[...tblRead,...tblEdit].every(([l,r])=>l===0&&r===0),{read:tblRead,edit:tblEdit});
  check('Tables keep a hairline under every row',[...tblRead,...tblEdit].every(([,,b])=>b>0),{read:tblRead,edit:tblEdit});
  // Per-note classes (cssclasses): "wide" and "max" widen one note's line in
  // both views; other notes keep the line width.
  stage='note widths';
  const notePage=c=>'<div class="markdown-preview-view markdown-rendered is-readable-line-width '+c+'" style="width:1600px"><div class="markdown-preview-sizer markdown-preview-section"><div><p>x</p></div></div></div><div class="markdown-source-view mod-cm6 is-readable-line-width '+c+'"></div>';
  const widthOf=c=>{const d=document.createElement('div');d.innerHTML=notePage(c);host.append(d);const r={read:Math.round(d.querySelector('.markdown-preview-sizer').getBoundingClientRect().width),edit:getComputedStyle(d.querySelector('.markdown-source-view')).getPropertyValue('--file-line-width').trim()};d.remove();return r};
  const lineWidth=parseFloat(getComputedStyle(document.body).getPropertyValue('--still-line-width'))||700;
  const widths={lineWidth,plain:widthOf(''),wide:widthOf('wide'),max:widthOf('max')};
  check('Notes without a class keep the line width',widths.plain.read===lineWidth,widths);
  check('A wide note gets a wider line in reading and editing views',widths.wide.read>widths.plain.read&&widths.wide.read<1500&&widths.wide.edit!==widths.plain.edit,widths);
  check('A max note fills the pane in reading and editing views',widths.max.read>=1500&&widths.max.edit==='100%',widths);
  // img-grid: images on consecutive lines (one paragraph) share a row in
  // reading view; a single image and notes without the class are unchanged.
  stage='image grid';
  const grid=c=>{const d=document.createElement('div');d.innerHTML='<div class="markdown-preview-view markdown-rendered '+c+'" style="width:700px"><div class="markdown-preview-sizer markdown-preview-section"><div><p><span class="internal-embed image-embed"><img class="g1"></span><br><span class="internal-embed image-embed"><img class="g2"></span><br><span class="internal-embed image-embed"><img class="g3"></span></p></div><div><p><span class="internal-embed image-embed"><img class="solo"></span></p></div><div><p>text <span class="internal-embed image-embed"><img class="inline"></span></p></div></div></div>';host.append(d);
   const pic=image(400,300);return Promise.all([...d.querySelectorAll('img')].map(i=>{i.src=pic;return i.decode()})).then(()=>{const b=s=>d.querySelector(s).getBoundingClientRect();const r={tops:['.g1','.g2','.g3'].map(s=>Math.round(b(s).top)),widths:['.g1','.g2','.g3'].map(s=>Math.round(b(s).width)),solo:Math.round(b('.solo').width),inline:Math.round(b('.inline').width)};d.remove();return r})};
  const gridOff=await grid(''),gridOn=await grid('img-grid');
  check('Images stack by default',new Set(gridOff.tops).size===3,gridOff);
  check('img-grid puts consecutive images on one row',new Set(gridOn.tops).size===1&&gridOn.widths.every(w=>w>150&&w<240),gridOn);
  check('img-grid leaves single and inline images alone',gridOn.solo===gridOff.solo&&gridOn.inline===gridOff.inline,{off:gridOff,on:gridOn});
  // Headings, the note title and block spacing follow the text size. Popout
  // windows set the root to 15px while the text stays 17px, and iOS scales
  // the root with the system text size, so rem-sized headings drift from
  // the body text: an H3 ends up smaller than a paragraph.
  stage='root size';
  host.insertAdjacentHTML('beforeend','<div class="markdown-preview-view markdown-rendered rs-read" style="width:600px"><div class="inline-title">T</div><h1>a</h1><h3>b</h3><h5>c</h5><p>x</p><ul><li>one</li><li>two</li></ul></div>'+
   '<div class="markdown-source-view mod-cm6"><div class="cm-content"><div class="cm-line HyperMD-header HyperMD-header-1 rs-cm-h1">a</div><div class="cm-line rs-cm-p">x</div></div></div>');
  const sizes=()=>{const g=(s,k='fontSize')=>Math.round(parseFloat(getComputedStyle(host.querySelector(s))[k])*100)/100;return {p:g('.rs-read p'),title:g('.rs-read .inline-title'),h1:g('.rs-read h1'),h3:g('.rs-read h3'),h5:g('.rs-read h5'),cmH1:g('.rs-cm-h1'),cmP:g('.rs-cm-p'),pGap:g('.rs-read p','marginBottom'),li:g('.rs-read li','marginBottom'),h1Gap:g('.rs-read h1','marginTop')}};
  const atRoot=sizes();document.documentElement.style.fontSize='15px';const atSmallRoot=sizes();
  if(saved.html===null)document.documentElement.removeAttribute('style');else document.documentElement.setAttribute('style',saved.html);
  check('Headings and spacing ignore the window root size',JSON.stringify(atRoot)===JSON.stringify(atSmallRoot),{root:atRoot,smallRoot:atSmallRoot});
  check('An H3 is never smaller than body text',atSmallRoot.h3>=atSmallRoot.p&&atSmallRoot.cmH1===atSmallRoot.h1,atSmallRoot);
  // Card callouts: a nested callout as the last block leaves the same gap
  // below as the card's padding above, and a collapsed callout's corner
  // icon stays inside it. Plain callouts keep core's spacing.
  stage='card callouts';
  const fold='<div class="callout is-collapsible is-collapsed" data-callout="info"><div class="callout-title"><div class="callout-icon"><svg class="svg-icon" viewBox="0 0 24 24" width="24" height="24"></svg></div><div class="callout-title-inner">Inner</div><div class="callout-fold is-collapsed"></div></div><div class="callout-content" style="display:none"><p>x</p></div></div>';
  host.insertAdjacentHTML('beforeend','<div class="markdown-preview-view markdown-rendered co-read" style="width:600px"><div class="callout" data-callout="warning"><div class="callout-title"><div class="callout-icon"><svg class="svg-icon" viewBox="0 0 24 24" width="24" height="24"></svg></div><div class="callout-title-inner">Outer</div></div><div class="callout-content"><p>Body</p>'+fold+'</div></div></div>');
  const card=()=>{const outer=host.querySelector('.co-read > .callout'),c=outer.querySelector(':scope > .callout-content'),inner=c.querySelector('.callout'),b=e=>e.getBoundingClientRect();return {top:Math.round(b(c.firstElementChild).top-b(c).top),bottom:Math.round(b(c).bottom-b(inner).bottom),iconOut:Math.round(b(inner.querySelector('.callout-icon')).bottom-b(inner).bottom)}};
  const plainCo=card();toggle('still-card-callouts',true);const cardCo=card();toggle('still-card-callouts',false);
  check('Card callouts leave no extra gap under a nested callout',cardCo.bottom<=cardCo.top+1,cardCo);
  check('A collapsed card callout keeps its corner icon inside',cardCo.iconOut<=0,cardCo);
  check('Plain callouts keep core spacing under a nested callout',plainCo.bottom>0,plainCo);
  host.remove();host=null;
  if(BASE_PATH){
  stage='bases';
  const file=app.vault.getAbstractFileByPath(BASE_PATH);if(!file)throw Error('Base not found: '+BASE_PATH);
  leaf=app.workspace.getLeaf('tab');await leaf.setViewState({type:'bases',state:{file:file.path,viewName:BASE_VIEW},active:true});
  app.workspace.setActiveLeaf(leaf,{focus:false});await pause(1200);
  const c=leaf.view.containerEl,body=c.querySelector('.bases-tbody');
  // Hide cell text so each row's sampled pixels show only its background.
  const mute=document.createElement('style');mute.textContent='[data-still-probe] .bases-td > *{visibility:hidden}';document.head.append(mute);c.dataset.stillProbe='';probes.push(mute);
  const scroller=[...c.querySelectorAll('*')].find(e=>e.scrollHeight>e.clientHeight+50&&/auto|scroll/.test(getComputedStyle(e).overflowY));
  if(!body||!scroller)throw Error('Need a Bases table long enough to scroll');
  async function stripes(){
   // Sample the middle of each row below the sticky header (cell text hidden).
   const b=body.getBoundingClientRect(),s=scroller.getBoundingClientRect(),head=c.querySelector('.bases-thead')?.getBoundingClientRect().bottom??s.top,rows=[...body.querySelectorAll(':scope > .bases-tr')].map(r=>r.getBoundingClientRect()).filter(r=>r.top>=Math.max(s.top,head)+2&&r.bottom<=s.bottom-2).sort((a,z)=>a.top-z.top).slice(0,6);
   const x=Math.round(Math.min(b.left,s.left)+Math.min(b.width,s.width)*0.5);
   const img=await wc.capturePage({x:x-1,y:Math.round(s.top),width:2,height:Math.round(s.height)}),bmp=img.toBitmap(),scale=img.getSize().height/Math.round(s.height),rowW=img.getSize().width;
   return rows.map(r=>{const y=Math.round((r.top+r.height/2-s.top)*scale),o=(y*rowW)*4;return {row:Math.round((r.top-b.top)/r.height),color:[bmp[o+2],bmp[o+1],bmp[o]].join(',')}});
  }
  const runs={};
  for(const on of [false,true]){
   toggle('still-bases-stripes',on);
   for(const f of [0,0.15,0.3,0.45,0.6,0.75,0.9,1]){scroller.scrollTop=Math.round((scroller.scrollHeight-scroller.clientHeight)*f);await pause(350);runs[(on?'on@':'off@')+f]=await stripes()}
  }
  toggle('still-bases-stripes',false);
  // A row keeps its color wherever it is scrolled to: even and odd rows each
  // have one color across every sample, and the two differ.
  const colors=on=>{const by=[new Set(),new Set()];for(const[k,a]of Object.entries(runs))if(k.startsWith(on?'on':'off'))for(const x of a)by[x.row%2].add(x.color);return by.map(s=>[...s])};
  const plain=colors(false),striped=colors(true);
  check('Bases rows are plain by default',plain[0].length===1&&plain[1].length===1&&plain[0][0]===plain[1][0],{even:plain[0],odd:plain[1]});
  check('Each Bases row keeps its stripe while scrolling',striped[0].length===1&&striped[1].length===1&&striped[0][0]!==striped[1][0],{even:striped[0],odd:striped[1],runs});
  }
  return JSON.stringify({vault:app.vault.getName(),theme:app.customCss.theme,results,passed:results.filter(r=>r.pass).length,total:results.length});
 }catch(e){return JSON.stringify({stage,error:String(e),stack:e.stack,results,passed:results.filter(r=>r.pass).length,total:results.length})}
 finally{
  host?.remove();for(const p of probes)p.remove();leaf?.detach();
  for(const[s,d]of sheets)try{s.disabled=d}catch{}
  if(saved.html===null)document.documentElement.removeAttribute('style');else document.documentElement.setAttribute('style',saved.html);
  document.body.className=saved.classes;if(saved.style===null)document.body.removeAttribute('style');else document.body.setAttribute('style',saved.style);
  if(saved.leaf)app.workspace.setActiveLeaf(saved.leaf,{focus:false});
 }
})()`.replaceAll('BASE_PATH',JSON.stringify(basePath)).replaceAll('BASE_VIEW',JSON.stringify(baseView));
const run=spawnSync('obsidian',[`vault=${VAULT}`,'eval',`code=${code}`],{encoding:'utf8',timeout:60000});
if(run.error)throw run.error;
const mark=run.stdout.lastIndexOf('=> ');const out=(mark>=0?run.stdout.slice(mark+3):run.stdout).trim();
let report;try{report=JSON.parse(out)}catch{throw Error(out||run.stderr)}
writeFileSync(process.argv[3]??'still-content-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} passed`);for(const r of report.results)if(!r.pass)console.log(`FAIL ${r.name}: ${JSON.stringify(r.evidence)}`);
if(report.error)console.log(report.stage+': '+report.stack);
process.exitCode=!report.error&&report.passed===report.total?0:1;
