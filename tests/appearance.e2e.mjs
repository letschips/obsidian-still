import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const vault=process.argv[2];
if(!vault)throw Error('Usage: node tests/appearance.e2e.mjs <vault> <report.json> [snippet directory]');
const candidate=readFileSync(new URL('../theme.css',import.meta.url),'utf8');
const snippetDirectory=process.argv[4];
const snippets=snippetDirectory?['still-translucent-window.v2.css','letschips-content.active.css'].map(name=>readFileSync(join(snippetDirectory,name),'utf8')):[];
const code=String.raw`(async()=>{
 const results=[],check=(name,pass,evidence)=>results.push({name,pass,evidence});
 const oldLeaf=app.workspace.activeLeaf;
 const leaf=app.workspace.openPopoutLeaf({width:920,height:760});
 let doc,stage='setup';
 try{
  for(let attempt=0;attempt<60&&leaf.view.containerEl.ownerDocument===document;attempt++)await new Promise(resolve=>setTimeout(resolve,50));
  doc=leaf.view.containerEl.ownerDocument;
  if(doc===document)throw Error('Popout unavailable');
  for(const sheet of doc.styleSheets)if(!sheet.href)sheet.disabled=true;
  const theme=doc.createElement('style');theme.textContent=CANDIDATE;doc.head.append(theme);
  const snippetStyles=SNIPPETS.map(text=>{const element=doc.createElement('style');element.textContent=text;doc.head.append(element);element.sheet.disabled=true;return element});
  const body=doc.body,view=doc.defaultView;
  body.removeAttribute('style');
  const host=doc.createElement('div');
  host.style.cssText='position:fixed;left:-10000px;top:0;width:900px;height:650px';
  host.innerHTML='<div class="workspace"><div class="workspace-split mod-root audit-root"><div class="workspace-tabs audit-tabs"><div class="workspace-tab-container"><div class="workspace-leaf audit-main-leaf"><div class="workspace-leaf-content is-read-mode"><div class="view-content"><div class="markdown-preview-view markdown-rendered audit-reading"><blockquote>Quote</blockquote><div class="markdown-embed">Embed</div><pre><code>const value = 1;</code></pre><div class="block-language-dataview"><pre>Dataview output</pre></div><div class="dataview-error">Dataview error</div><input type="text" class="audit-input"></div><div class="bases-view"><div class="bases-tbody">Base</div></div></div></div></div></div></div></div><div class="workspace-split mod-sidedock mod-left-split audit-side"><div class="workspace-tabs"><div class="workspace-leaf"><div class="workspace-leaf-content is-read-mode"><div class="view-content"><div class="markdown-preview-view markdown-rendered">Sidebar note</div></div></div></div></div><div class="workspace-sidedock-vault-profile"><div class="workspace-drawer-vault-switcher">Vault</div><div class="clickable-icon">Settings</div></div></div></div><div class="menu audit-menu">Menu</div><div class="audit-accent" style="background-color:var(--interactive-accent)">Accent</div><span class="audit-link" style="color:var(--text-accent)">Link</span><div class="audit-token"></div>';
  body.append(host);
  const element=selector=>host.querySelector(selector);
  const style=selector=>view.getComputedStyle(element(selector));
  const color=selector=>style(selector).backgroundColor;
  const same=(left,right)=>left.replace(/\s/g,'')===right.replace(/\s/g,'');
  const alpha=value=>{
   if(value==='transparent')return 0;
   const slash=value.match(/\/\s*([\d.]+)\)/);
   if(slash)return Number(slash[1]);
   const rgba=value.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
   return rgba?Number(rgba[1]):1;
  };
  const token=name=>{element('.audit-token').style.backgroundColor='var('+name+')';return color('.audit-token')};
  const state=(palette,preset,backdrop,...extra)=>{
   body.classList.remove('theme-light','theme-dark','is-translucent','is-mobile','is-popout-window','is-popout-modal',...[...body.classList].filter(name=>name.startsWith('still-')));
   body.classList.add(palette,backdrop,...extra);if(preset)body.classList.add('still-preset-'+preset);
   body.style.removeProperty('--still-backdrop-color');
   body.style.removeProperty('--still-page-color');
  };
  for(const palette of ['theme-light','theme-dark']){
   stage=palette+' whole-window blocks';
   for(const preset of ['paper','mist','sand','sage','graphite','night',null]){
    state(palette,preset,'still-backdrop-window');
    if(!preset)body.style.setProperty('--still-backdrop-color','#d6e2e8');
    const surfaces={quote:color('blockquote'),embed:color('.markdown-embed'),code:color('pre')};
    check(palette+' '+(preset??'custom')+': whole-window blocks keep texture and a distinct wash',Object.values(surfaces).every(value=>alpha(value)>0&&alpha(value)<1),surfaces);
    if(palette==='theme-dark')check(palette+' '+(preset??'custom')+': input preserves the window material',alpha(color('.audit-input'))>0&&alpha(color('.audit-input'))<1,{input:color('.audit-input')});
   }
   state(palette,'mist','still-backdrop-frame');
   check(palette+': Frame keeps ordinary solid blocks',alpha(color('blockquote'))===1&&alpha(color('pre'))===1,{quote:color('blockquote'),code:color('pre')});
   state(palette,'mist','still-backdrop-window','is-popout-window');
   check(palette+': a separate window keeps ordinary solid blocks',alpha(color('blockquote'))===1,{quote:color('blockquote')});
   state(palette,'mist','still-backdrop-window','is-mobile');
   check(palette+': mobile keeps ordinary solid blocks',alpha(color('blockquote'))===1&&alpha(color('pre'))===1,{quote:color('blockquote'),code:color('pre')});
   state(palette,'off','still-backdrop-off');
   const original={accent:color('.audit-accent'),link:style('.audit-link').color,menu:color('.audit-menu')};
   state(palette,null,'still-backdrop-off','still-preset-accent');
   const noPreset={accent:color('.audit-accent'),link:style('.audit-link').color};
   check(palette+': Preset accent with no palette class preserves Appearance',same(original.accent,noPreset.accent)&&same(original.link,noPreset.link),{original,noPreset});
   for(const preset of ['paper','sand','sage','night']){
    state(palette,preset,'still-backdrop-off');
    if(palette==='theme-light')check(preset+': light floating layers inherit the palette',color('.audit-menu')!=='rgb(255, 255, 255)'&&alpha(color('.audit-menu'))===1,{menu:color('.audit-menu'),page:token('--background-primary')});
   }
  }
  stage='whole-window selector bounds';
  state('theme-light','mist','still-backdrop-frame');
  const sidebarBaseline=color('.audit-side .markdown-preview-view');
  state('theme-light','mist','still-backdrop-window');
  check('Whole window clears the Bases body',alpha(color('.bases-tbody'))===0,{base:color('.bases-tbody')});
  check('Whole window leaves sidebar reading surfaces alone',same(color('.audit-side .markdown-preview-view'),sidebarBaseline)&&alpha(sidebarBaseline)===1,{sidebar:color('.audit-side .markdown-preview-view'),sidebarBaseline});
  element('.audit-tabs').classList.add('mod-stacked');
  check('Stacked panes keep the Bases body solid',alpha(color('.bases-tbody'))===1,{base:color('.bases-tbody')});
  element('.audit-tabs').classList.remove('mod-stacked');
  state('theme-light','mist','still-backdrop-window','still-peek-soft');
  element('.audit-side').classList.add('is-sidedock-collapsed');element('.audit-side').style.display='flex';
  const fade=parseFloat(style('.audit-side').getPropertyValue('--still-peek-fade'));
  check('Textured whole-window peek avoids a wide flat fade band',fade>0&&fade<=64,{fade,filter:view.getComputedStyle(element('.audit-side'),'::before').backdropFilter});
  element('.audit-side').classList.remove('is-sidedock-collapsed');element('.audit-side').style.removeProperty('display');
  if(snippetStyles.length){
   stage='ANKS snippet integration';snippetStyles.forEach(element=>element.sheet.disabled=false);
   for(const palette of ['theme-light','theme-dark']){
    state(palette,'off','still-backdrop-off','is-translucent');
    check(palette+': glass floats keep the default page tone without a preset',same(color('.audit-menu'),token('--background-primary')),{menu:color('.audit-menu'),page:token('--background-primary')});
    body.style.setProperty('--still-page-color',palette==='theme-light'?'#d6e2e8':'#343029');
    check(palette+': glass floats keep a custom page tone without a preset',same(color('.audit-menu'),token('--background-primary')),{menu:color('.audit-menu'),page:token('--background-primary')});
    for(const backdrop of ['off','frame','window']){
     state(palette,'mist','still-backdrop-'+backdrop,'is-translucent');
     const backgrounds={code:color('pre'),dataview:color('.block-language-dataview pre'),error:color('.dataview-error')};
     check(palette+' '+backdrop+': Dataview output and errors match ordinary code blocks',same(backgrounds.dataview,backgrounds.code)&&same(backgrounds.error,backgrounds.code)&&(backdrop!=='window'||alpha(backgrounds.code)>0&&alpha(backgrounds.code)<1),backgrounds);
    }
    state(palette,'mist','still-backdrop-window','is-translucent','is-mobile');
    const mobileBackgrounds={code:color('pre'),dataview:color('.block-language-dataview pre'),error:color('.dataview-error')};
    check(palette+': mobile Dataview output and errors keep the solid code background',Object.values(mobileBackgrounds).every(value=>same(value,mobileBackgrounds.code)&&alpha(value)===1),mobileBackgrounds);
    state(palette,'mist','still-backdrop-frame','is-translucent');
    check(palette+': glass snippet respects the Frame page',alpha(color('.audit-main-leaf'))===1,{leaf:color('.audit-main-leaf'),page:token('--background-primary')});
    state(palette,'mist','still-backdrop-window','is-translucent');
    check(palette+': content snippet resolves code background on body',same(color('pre'),token('--code-background')),{code:color('pre'),token:token('--code-background')});
    element('.audit-tabs').classList.add('mod-stacked');
    check(palette+': glass snippet keeps stacked pages and Bases solid',alpha(color('.audit-main-leaf'))===1&&alpha(color('.bases-tbody'))===1,{leaf:color('.audit-main-leaf'),base:color('.bases-tbody')});
    element('.audit-tabs').classList.remove('mod-stacked');
    state(palette,'paper','still-backdrop-window','is-translucent','still-hide-vault');
    check(palette+': hidden vault footer adds no fog patch',alpha(color('.workspace-sidedock-vault-profile'))===0,{footer:color('.workspace-sidedock-vault-profile')});
    const footerButton=element('.workspace-sidedock-vault-profile .clickable-icon');footerButton.tabIndex=0;footerButton.focus();
    check(palette+': vault footer keeps its focused surface',alpha(color('.workspace-sidedock-vault-profile'))>0,{footer:color('.workspace-sidedock-vault-profile')});
    footerButton.blur();
    check(palette+': glass floats use the theme raised surface',same(color('.audit-menu'),token('--still-raised')),{menu:color('.audit-menu'),raised:token('--still-raised')});
   }
  }
  return JSON.stringify({vault:app.vault.getName(),snippets:snippetStyles.length,passed:results.filter(result=>result.pass).length,total:results.length,results});
 }catch(error){
  return JSON.stringify({stage,error:String(error),stack:error.stack,results,passed:results.filter(result=>result.pass).length,total:results.length});
 }finally{leaf.detach();if(oldLeaf)app.workspace.setActiveLeaf(oldLeaf,{focus:false})}
})()`.replaceAll('CANDIDATE',()=>JSON.stringify(candidate)).replaceAll('SNIPPETS',()=>JSON.stringify(snippets));
const run=spawnSync('obsidian',[`vault=${vault}`,'eval',`code=${code}`],{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
if(run.error)throw run.error;
const marker=run.stdout.lastIndexOf('=> ');
const output=(marker>=0?run.stdout.slice(marker+3):run.stdout).trim();
let report;try{report=JSON.parse(output)}catch{throw Error(output||run.stderr)}
writeFileSync(process.argv[3]??'still-appearance-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} passed`);
for(const result of report.results)if(!result.pass)console.log(`FAIL ${result.name}: ${JSON.stringify(result.evidence)}`);
if(report.error)console.log(report.stage+': '+report.stack);
process.exitCode=!report.error&&report.passed===report.total?0:1;
