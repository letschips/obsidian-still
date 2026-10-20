// Quiet status bar, driven with synthetic pointer moves in the main window
// (popout windows ignore CDP moves for :hover). Turns the option on for the run
// and restores it; does not move the real cursor.
// Usage: node tests/status-bar.e2e.mjs <vault> <report.json>
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const VAULT=process.argv[2];if(!VAULT){console.error('Usage: node '+process.argv[1].split('/').pop()+' <vault name> <report.json>');process.exit(2)}
const code=String.raw`(async()=>{
 const results=[];const check=(name,pass,evidence)=>results.push({name,pass,evidence});
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const dbg=require('electron').remote.getCurrentWebContents().debugger;
 const hadOption=document.body.classList.contains('still-quiet-status');let attached=false,stage='setup';
 try{
  document.body.classList.add('still-quiet-status');
  if(!dbg.isAttached()){dbg.attach('1.3');attached=true}
  const bar=document.querySelector('.status-bar');
  const mouse=(x,y)=>dbg.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',x:Math.round(x),y:Math.round(y)});
  const cx=innerWidth/2,away=async()=>{await mouse(cx,innerHeight/2);await pause(1200)};
  const alpha=c=>{const m=c.match(/[\d.]+(?=\))/);return c.startsWith('rgba')||c.includes('/')?Number(m?.[0]??1):1};
  const surface=()=>getComputedStyle(bar,'::before').backgroundColor;
  const width=()=>bar.getBoundingClientRect().width;

  stage='rest';await away();const line=bar.getBoundingClientRect(),restSurface=surface();
  check('Resting line is painted even when the bar background is cleared',alpha(restSurface)>0&&line.width<=160&&line.height<=4,{restSurface,line:[line.width,line.height],barBackground:getComputedStyle(bar).backgroundColor});

  stage='reach';await mouse(cx+100,line.top-18);await pause(150);const near=bar.matches(':hover');
  await away();await mouse(cx,line.top-60);await pause(150);const far=bar.matches(':hover');
  check('Pointer near the line opens the bar; farther up it does not',near&&!far,{near,far,lineTop:line.top});

  stage='open';await mouse(cx,line.top-18);await pause(400);const openSurface=surface(),openWidth=width();
  const item=[...bar.children].find(e=>e.offsetWidth),ib=item.getBoundingClientRect();
  const hit=document.elementFromPoint(Math.round(ib.left+ib.width/2),Math.round(ib.top+ib.height/2));
  check('Open pill is opaque and its items stay on top',alpha(openSurface)===1&&openWidth>160&&item.contains(hit),{openSurface,openWidth,hit:hit?.className});

  stage='linger';await mouse(cx,innerHeight/2);await pause(250);const lingerWidth=width(),lingerOpacity=getComputedStyle(item).opacity;
  await pause(1000);const goneWidth=width(),goneOpacity=getComputedStyle(item).opacity;
  check('Pill lingers after the pointer leaves, then folds',lingerWidth===openWidth&&lingerOpacity==='1'&&goneWidth<=160&&goneOpacity==='0',{lingerWidth,lingerOpacity,goneWidth,goneOpacity});
 }catch(e){check('Run '+stage,false,{error:String(e)})}finally{
  try{await dbg.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',x:Math.round(innerWidth/2),y:Math.round(innerHeight/2)})}catch{}
  if(attached)try{dbg.detach()}catch{}
  document.body.classList.toggle('still-quiet-status',hadOption);
 }
 return JSON.stringify({vault:app.vault.getName(),theme:app.customCss.theme,translucent:document.body.classList.contains('is-translucent'),results,passed:results.filter(r=>r.pass).length,total:results.length});
})()`;
const run=spawnSync('obsidian',[`vault=${VAULT}`,'eval',`code=${code}`],{encoding:'utf8',timeout:30000});
if(run.error)throw run.error;
const marker=run.stdout.lastIndexOf('=> ');const out=(marker>=0?run.stdout.slice(marker+3):run.stdout).trim();
let report;try{report=JSON.parse(out)}catch{throw Error(out||run.stderr)}
writeFileSync(process.argv[3]??'still-status-bar-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} passed`);for(const r of report.results)if(!r.pass)console.log(`FAIL ${r.name}: ${JSON.stringify(r.evidence)}`);
process.exitCode=report.passed===report.total?0:1;
