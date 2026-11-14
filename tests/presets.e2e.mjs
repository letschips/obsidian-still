// Obsidian renderer E2E: presets and window background reach every surface
// that reads the sidebar tone (quotes, embeds, code, floats, form fields,
// sidebar peek), and the default palette stays exactly as before.
// Runs in a temporary popout; no note or config writes.
// Usage: node tests/presets.e2e.mjs <vault> <report.json>
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
  // The window background skips popouts; let this one stand in for the main window.
  body.classList.remove('is-translucent','is-popout-window','is-popout-modal','is-mobile');
  host=doc.createElement('div');host.style.cssText='position:fixed;inset:0;overflow:hidden;z-index:100';
  host.innerHTML='<div class="probe-page" style="background:var(--background-primary)"></div><div class="probe-side" style="background:var(--background-secondary)"></div><div class="markdown-rendered"><blockquote><p>Quote</p></blockquote><div class="markdown-embed">Embed</div><pre><code>code</code></pre></div><div class="menu" style="position:relative;inset:auto;width:200px"><div class="menu-item">Menu</div></div><input type="text" class="probe-input"><button class="probe-button">Button</button><span class="probe-muted" style="color:var(--text-muted)">m</span><span class="probe-faint" style="color:var(--text-faint)">f</span><span class="probe-link" style="color:var(--text-accent)">l</span><span class="probe-accent" style="background:var(--interactive-accent);color:var(--text-on-accent)">a</span><div class="workspace-split mod-sidedock mod-left-split is-sidedock-collapsed" style="display:flex;position:relative;width:200px;height:40px"></div>';
  body.append(host);
  // color-mix() serializes as color(srgb 0-1); compare everything as rounded rgb.
  const norm=c=>{const m=c.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/);if(!m)return c;const [r,g,b]=m.slice(1,4).map(x=>Math.round(x*255));return m[4]===undefined?'rgb('+r+', '+g+', '+b+')':'rgba('+r+', '+g+', '+b+', '+m[4]+')'};
  const bg=(sel,pseudo)=>norm(view.getComputedStyle(host.querySelector(sel),pseudo).backgroundColor);
  const img=(sel,pseudo)=>view.getComputedStyle(host.querySelector(sel),pseudo).backgroundImage.replace(/color\(srgb [^)]*\)/g,norm);
  const lum=c=>{const [r,g,b]=c.match(/[\d.]+/g).map(Number);return 0.2126*r+0.7152*g+0.0722*b};
  const surfaces=()=>({page:bg('.probe-page'),side:bg('.probe-side'),quote:bg('blockquote'),embed:bg('.markdown-embed'),code:bg('pre'),menu:bg('.menu'),input:bg('.probe-input'),button:bg('.probe-button')});
  const presets=[...body.classList].filter(c=>c.startsWith('still-preset-')||c.startsWith('still-backdrop-'));
  const textures=[...body.classList].filter(c=>c.startsWith('still-texture-'));body.classList.remove(...textures);
  const theme=[...body.classList].find(c=>c==='theme-light'||c==='theme-dark');
  // The vault's own peek options would change what the peek panel paints.
  const peek=['still-peek-soft','still-peek-off'].filter(c=>body.classList.contains(c));body.classList.remove(...peek);
  const set=(palette,...cls)=>{body.classList.remove('theme-light','theme-dark',...[...body.classList].filter(c=>/^still-(preset|backdrop)-/.test(c)));body.classList.add(palette,...cls)};
  try{
   stage='default light';set('theme-light','still-preset-off','still-backdrop-off');let s=surfaces();
   check('Default light: quote and embed stay #eaeaeb',s.quote==='rgb(234, 234, 235)'&&s.embed==='rgb(234, 234, 235)',s);
   stage='default dark';set('theme-dark','still-preset-off','still-backdrop-off');s=surfaces();
   check('Default dark: quote, embed and field stay #202020',[s.quote,s.embed,s.input].every(c=>c==='rgb(32, 32, 32)'),s);
   check('Default dark: menu stays #262626',s.menu==='rgb(38, 38, 38)',s);
   check('Default dark: button stays #292929',s.button==='rgb(41, 41, 41)',s);
   for(const [palette,preset] of [['theme-light','still-preset-paper'],['theme-light','still-preset-sand'],['theme-dark','still-preset-sand'],['theme-dark','still-preset-night']]){
    stage=palette+' '+preset;set(palette,preset,'still-backdrop-off');s=surfaces();
    check(palette+' '+preset+': quote, embed and code take the sidebar tone',[s.quote,s.embed,s.code].every(c=>c===s.side),s);
    if(palette==='theme-dark'){
     check(palette+' '+preset+': field takes the sidebar tone',s.input===s.side,s);
     check(palette+' '+preset+': menu and button sit above the page',lum(s.menu)>lum(s.page)&&lum(s.button)>lum(s.page),s);
    }
   }
   // Secondary and faint text, and the optional accent, per preset and mode.
   const fg=sel=>norm(view.getComputedStyle(host.querySelector(sel)).color);
   const rl=c=>{const [r,g,b]=c.match(/[\d.]+/g).slice(0,3).map(v=>{v=Number(v)/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*r+0.7152*g+0.0722*b};
   const cr=(a,b)=>{const x=rl(a),y=rl(b);return Math.round((Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)*100)/100};
   const inks=()=>({page:bg('.probe-page'),side:bg('.probe-side'),muted:fg('.probe-muted'),faint:fg('.probe-faint'),link:fg('.probe-link'),accent:bg('.probe-accent'),onAccent:fg('.probe-accent')});
   stage='default inks';set('theme-light','still-preset-off','still-backdrop-off');let k=inks();
   check('Default light: secondary and faint text stay #4d4d4d and #939393',k.muted==='rgb(77, 77, 77)'&&k.faint==='rgb(147, 147, 147)',k);
   set('theme-dark','still-preset-off','still-backdrop-off');k=inks();
   check('Default dark: secondary and faint text stay #ababab and #7a7a7a',k.muted==='rgb(171, 171, 171)'&&k.faint==='rgb(122, 122, 122)',k);
   const graphite=body.classList.contains('still-graphite'),accentOn=body.classList.contains('still-preset-accent');body.classList.remove('still-graphite','still-preset-accent');
   try{
    for(const palette of ['theme-light','theme-dark'])for(const name of ['paper','mist','sand','sage','graphite','night']){
     stage=palette+' '+name+' inks';set(palette,'still-preset-off','still-backdrop-off');const base=inks();
     set(palette,'still-preset-'+name,'still-backdrop-off');k=inks();
     const faintMin=palette==='theme-light'?2.9:3.7;
     const c={mutedPage:cr(k.muted,k.page),mutedSide:cr(k.muted,k.side),faintPage:cr(k.faint,k.page),faintSide:cr(k.faint,k.side)};
     check(palette+' '+name+': secondary text holds 7:1 and faint text '+faintMin+':1 on page and sidebar',c.mutedPage>=6.9&&c.mutedSide>=6.9&&c.faintPage>=faintMin&&c.faintSide>=faintMin,{...k,...c});
     check(palette+' '+name+': the accent follows Appearance until Preset accent is on',k.accent===base.accent&&k.link===base.link,{k,base});
     body.classList.add('still-preset-accent');const a=inks();
     const ac={label:cr(a.onAccent,a.accent),linkPage:cr(a.link,a.page),linkSide:cr(a.link,a.side)};
     check(palette+' '+name+': Preset accent sets a hue that holds 4.5:1 as a fill and as link text',a.accent!==base.accent&&ac.label>=4.45&&ac.linkPage>=4.45&&ac.linkSide>=4.45,{...a,...ac});
     body.classList.remove('still-preset-accent');
    }
    stage='graphite ink over preset accent';set('theme-light','still-preset-sand','still-backdrop-off');body.classList.add('still-preset-accent','still-graphite');k=inks();
    check('Graphite ink wins over Preset accent',k.accent===norm(view.getComputedStyle(body).color)||k.accent==='rgb(46, 36, 25)',k);
    set('theme-light','still-preset-off','still-backdrop-off');body.classList.remove('still-graphite');const off=inks();body.classList.remove('still-preset-accent');const plain=inks();
    check('Preset accent does nothing with the preset off',off.accent===plain.accent&&off.link===plain.link,{off,plain});
   }finally{body.classList.remove('still-graphite','still-preset-accent');if(graphite)body.classList.add('still-graphite');if(accentOn)body.classList.add('still-preset-accent')}
   // Preset texture: Smooth drops Paper's grain, Frosted lays one frost over any preset and keeps its gradient.
   const ground=()=>view.getComputedStyle(body,'::before').backgroundImage;
   const texture=(cls,palette,...rest)=>{body.classList.remove('still-texture-preset','still-texture-smooth','still-texture-frosted','still-texture-mottled');set(palette,...rest);if(cls)body.classList.add(cls);return ground()};
   try{
    stage='preset texture';
    const paper=texture(null,'theme-light','still-preset-paper','still-backdrop-window');
    check('Texture unset: Paper keeps its own grain',paper.includes("baseFrequency='.65'")&&!paper.includes("'.5'"),{paper});
    const paperPreset=texture('still-texture-preset','theme-light','still-preset-paper','still-backdrop-window');
    check('Texture Preset: Paper is unchanged',paperPreset===paper,{paperPreset});
    const mist=texture(null,'theme-light','still-preset-mist','still-backdrop-window');
    const paperSmooth=texture('still-texture-smooth','theme-light','still-preset-paper','still-backdrop-window');
    check('Smooth: Paper drops its grain',paperSmooth==='none',{paperSmooth});
    const mistSmooth=texture('still-texture-smooth','theme-light','still-preset-mist','still-backdrop-window');
    check('Smooth: Mist keeps its gradient',mistSmooth===mist&&mist.startsWith('linear-gradient'),{mist,mistSmooth});
    const paperFrost=texture('still-texture-frosted','theme-light','still-preset-paper','still-backdrop-window');
    check('Frosted light: Paper swaps its grain for a dark frost',paperFrost.startsWith('url(')&&paperFrost.includes("values='0 0 0 0 0 ")&&paperFrost!==paper&&paperFrost.endsWith(', none'),{paperFrost});
    const mistFrost=texture('still-texture-frosted','theme-light','still-preset-mist','still-backdrop-frame');
    check('Frosted light: the frost lies over Mist\'s gradient',mistFrost.startsWith('url(')&&mistFrost.endsWith(', '+mist),{mistFrost,mist});
    const nightDark=texture(null,'theme-dark','still-preset-night','still-backdrop-window');
    const nightFrost=texture('still-texture-frosted','theme-dark','still-preset-night','still-backdrop-window');
    check('Frosted dark: a light frost over Night\'s gradient',nightFrost.includes("values='0 0 0 0 1 ")&&nightFrost.endsWith(', '+nightDark),{nightFrost,nightDark});
    for(const [mode,imageList,base] of [['light',paperFrost,240],['dark',nightFrost,30]]){
     stage=mode+' frost pixels';
     const image=new view.Image();
     await new Promise((resolve,reject)=>{const timer=view.setTimeout(()=>reject(Error('Frost image load timed out')),2000);image.onload=()=>{view.clearTimeout(timer);resolve()};image.onerror=()=>{view.clearTimeout(timer);reject(Error('Frost image failed to load'))};image.src=imageList.match(/^url\("([^"]+)"\)/)[1]});
     const canvas=doc.createElement('canvas');canvas.width=512;canvas.height=512;
     const context=canvas.getContext('2d',{willReadFrequently:true});
     context.fillStyle=context.createPattern(image,'repeat');context.fillRect(0,0,512,512);
     const raw=context.getImageData(0,0,512,512).data;
     let visible=0;
     for(let offset=3;offset<raw.length;offset+=4)if(raw[offset])visible++;
     check('Frosted '+mode+': highlights do not form a full-surface veil',visible/(512*512)<=0.65,{coverage:visible/(512*512)});
     context.clearRect(0,0,512,512);context.fillStyle='rgb('+[base,base,base].join(',')+')';context.fillRect(0,0,512,512);
     context.fillStyle=context.createPattern(image,'repeat');context.fillRect(0,0,512,512);
     const pixels=context.getImageData(0,0,512,512).data,values=[];
     for(let offset=0;offset<pixels.length;offset+=4)values.push(pixels[offset]);
     const mean=values.reduce((sum,value)=>sum+value,0)/values.length;
     const deviation=Math.sqrt(values.reduce((sum,value)=>sum+(value-mean)**2,0)/values.length);
     check('Frosted '+mode+': subtle texture keeps the base tone',Math.abs(mean-base)<=3&&deviation>=1.4&&deviation<=2.5,{base,mean,deviation});
    }
    for(const palette of ['theme-light','theme-dark'])for(const name of ['paper','mist','sand','sage','graphite','night']){
     const smooth=texture('still-texture-smooth',palette,'still-preset-'+name,'still-backdrop-window');
     const frost=texture('still-texture-frosted',palette,'still-preset-'+name,'still-backdrop-window');
     const mottled=texture('still-texture-mottled',palette,'still-preset-'+name,'still-backdrop-window');
     check(palette+' '+name+': Mottled has its own material and keeps the smooth background',mottled.startsWith('url(')&&mottled!==frost&&mottled!==smooth&&mottled.endsWith(', '+smooth),{smooth,frost,mottled});
    }
    for(const palette of ['theme-light','theme-dark']){
     stage=palette+' mottled distribution';
     const material=texture('still-texture-mottled',palette,'still-preset-mist','still-backdrop-window');
     const image=new view.Image();
     await new Promise((resolve,reject)=>{const timer=view.setTimeout(()=>reject(Error('Mottled image load timed out')),2000);image.onload=()=>{view.clearTimeout(timer);resolve()};image.onerror=()=>{view.clearTimeout(timer);reject(Error('Mottled image failed to load'))};image.src=material.match(/^url\("([^"]+)"\)/)[1]});
     const canvas=doc.createElement('canvas');canvas.width=1536;canvas.height=1024;
     const context=canvas.getContext('2d',{willReadFrequently:true});
     context.fillStyle=context.createPattern(image,'repeat');context.fillRect(0,0,canvas.width,canvas.height);
     const pixels=context.getImageData(0,0,canvas.width,canvas.height).data,blocks=[];
     for(let top=0;top<canvas.height;top+=64)for(let left=0;left<canvas.width;left+=64){
      let alpha=0;
      for(let row=top;row<top+64;row++)for(let column=left;column<left+64;column++)alpha+=pixels[(row*canvas.width+column)*4+3];
      blocks.push(alpha/4096);
     }
     const clearRatio=blocks.filter(value=>value<0.25).length/blocks.length;
     const texturedRatio=blocks.filter(value=>value>1.5).length/blocks.length;
     check(palette+': Mottled leaves clean regions between textured patches',clearRatio>=0.30&&texturedRatio>=0.04,{clearRatio,texturedRatio});
     let peak=0;
     for(let offset=3;offset<pixels.length;offset+=4)peak=Math.max(peak,pixels[offset]);
     check(palette+': Mottled caps isolated specks at a soft opacity',peak>0&&peak<=18,{peak});
     let changed=0,samples=0;
     for(let row=0;row<canvas.height;row+=8)for(let column=0;column<canvas.width-512;column+=8){
      const offset=(row*canvas.width+column)*4+3;
      if(pixels[offset]!==pixels[offset+512*4])changed++;
      samples++;
     }
     check(palette+': Mottled avoids the old 512px repeating distribution',changed/samples>0.1,{differentRatio:changed/samples});
    }
    for(const windowMode of ['still-backdrop-frame','still-backdrop-window']){
     const plain=texture(null,'theme-light','still-preset-off',windowMode);
     const mottled=texture('still-texture-mottled','theme-light','still-preset-off',windowMode);
     check('Mottled '+windowMode+': custom background with no preset stays unchanged',mottled===plain,{plain,mottled});
    }
    for(const excluded of ['is-mobile','is-popout-window','is-popout-modal']){
     body.classList.add(excluded);
     try{
      const plain=texture(null,'theme-light','still-preset-paper','still-backdrop-window');
      const mottled=texture('still-texture-mottled','theme-light','still-preset-paper','still-backdrop-window');
      check('Mottled '+excluded+': no texture layer is drawn',mottled===plain&&mottled==='none',{plain,mottled});
     }finally{body.classList.remove(excluded)}
    }
    const backdropOff=texture('still-texture-mottled','theme-light','still-preset-paper','still-backdrop-off');
    check('Mottled with window background off: no texture layer is drawn',backdropOff==='none',{backdropOff});
    const offPlain=texture(null,'theme-light','still-preset-off','still-backdrop-window');
    const offFrost=texture('still-texture-frosted','theme-light','still-preset-off','still-backdrop-window');
    check('Frosted with the preset off: your own window background is untouched',offFrost===offPlain,{offPlain,offFrost});
    body.classList.add('is-mobile');
    const phone=texture('still-texture-frosted','theme-light','still-preset-mist','still-backdrop-window');
    check('Frosted on a phone: no CSS layer is drawn',phone==='none',{phone});
   }finally{body.classList.remove('is-mobile','still-texture-preset','still-texture-smooth','still-texture-frosted','still-texture-mottled')}
   // Window color set alone: floats take it, opaque.
   stage='frame with window color';set('theme-light','still-preset-off','still-backdrop-frame');
   body.style.setProperty('--still-backdrop-color','rgba(242, 233, 205, 0.6)');await pause(30);
   s=surfaces();const panel=bg('.mod-sidedock','::before');
   check('Frame: sidebar tone follows the window color, opaque',s.side==='rgb(242, 233, 205)',s);
   check('Frame: collapsed sidebar peek takes the window color',panel==='rgb(242, 233, 205)',{panel});
   stage='whole window soft peek';set('theme-light','still-preset-off','still-backdrop-window','still-peek-soft');
   const soft=img('.mod-sidedock','::before');
   check('Whole window: soft peek fades from the window color',soft.includes('rgb(242, 233, 205)'),{soft});
   body.classList.remove('still-peek-soft');body.style.removeProperty('--still-backdrop-color');
   stage='frame with preset';set('theme-light','still-preset-paper','still-backdrop-frame');s=surfaces();
   check('Frame with Paper: peek and sidebar keep the preset sidebar',bg('.mod-sidedock','::before')==='rgb(242, 233, 205)'&&s.side==='rgb(242, 233, 205)',s);
   stage='mobile whole window';body.classList.add('is-mobile');
   set('theme-light','still-preset-paper','still-backdrop-window');s=surfaces();
   check('Phone Whole window with Paper: the page takes the ground',s.page==='rgb(242, 233, 205)',s);
   set('theme-light','still-preset-paper','still-backdrop-frame');s=surfaces();
   check('Phone Frame with Paper: the page keeps the preset page',s.page==='rgb(253, 248, 232)',s);
   body.classList.remove('is-mobile');
  }finally{body.style.removeProperty('--still-backdrop-color');body.classList.remove('is-mobile','still-peek-soft','still-texture-preset','still-texture-smooth','still-texture-frosted','still-texture-mottled');set(theme??'theme-light',...presets);body.classList.add(...peek,...textures)}
  return JSON.stringify({vault:app.vault.getName(),theme:app.customCss.theme,results,passed:results.filter(r=>r.pass).length,total:results.length});
 }catch(e){return JSON.stringify({stage,error:String(e),stack:e.stack,results,passed:results.filter(r=>r.pass).length,total:results.length})}finally{
  host?.remove();leaf.detach();if(oldLeaf)app.workspace.setActiveLeaf(oldLeaf,{focus:false});
 }
})()`;
const run=spawnSync('obsidian',[`vault=${VAULT}`,'eval',`code=${code}`],{encoding:'utf8',timeout:30000});
if(run.error)throw run.error;
const marker=run.stdout.lastIndexOf('=> ');const out=(marker>=0?run.stdout.slice(marker+3):run.stdout).trim();
let report;try{report=JSON.parse(out)}catch{throw Error(out||run.stderr)}
writeFileSync(process.argv[3]??'still-presets-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} passed`);for(const r of report.results)if(!r.pass)console.log(`FAIL ${r.name}: ${JSON.stringify(r.evidence)}`);
if(report.error)console.log(report.stage+': '+report.stack);
process.exitCode=!report.error&&report.passed===report.total?0:1;
