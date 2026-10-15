// Quiet vault switcher, driven with synthetic pointer moves in the main window
// (popout windows ignore CDP moves for :hover). Needs the left sidebar open.
// Turns the option on for the run and restores it; does not move the real cursor.
// Usage: node tests/vault-foot.e2e.mjs <vault> <report.json>
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const VAULT=process.argv[2];if(!VAULT){console.error('Usage: node '+process.argv[1].split('/').pop()+' <vault name> <report.json>');process.exit(2)}
const code=String.raw`(async()=>{
 const results=[];const check=(name,pass,evidence)=>results.push({name,pass,evidence});
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const dbg=require('electron').remote.getCurrentWebContents().debugger;
 const hadOption=document.body.classList.contains('still-hide-vault');let attached=false,stage='setup';
 try{
  const profile=document.querySelector('.mod-left-split .workspace-sidedock-vault-profile');
  if(!profile||!profile.offsetWidth)throw Error('Open the left sidebar first');
  document.body.classList.add('still-hide-vault');
  if(!dbg.isAttached()){dbg.attach('1.3');attached=true}
  const switcher=profile.querySelector('.workspace-drawer-vault-switcher'),gearBox=profile.querySelector('.workspace-drawer-vault-actions .clickable-icon:last-child').getBoundingClientRect(),nameBox=switcher.getBoundingClientRect();
  const mouse=(x,y)=>dbg.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',x:Math.round(x),y:Math.round(y)});
  const nx=nameBox.left+nameBox.width/2,ny=nameBox.top+nameBox.height/2,gx=gearBox.left+gearBox.width/2,gy=gearBox.top+gearBox.height/2;
  const onName=()=>switcher.contains(document.elementFromPoint(Math.round(nx),Math.round(ny)));
  const away=async()=>{await mouse(nx,profile.getBoundingClientRect().top-60);await pause(700)};
  stage='rest';await away();const restHit=onName();await mouse(nx,ny);await pause(60);const restHover=profile.matches(':hover');
  check('Vault name stays hidden and out of the way at rest',!restHit&&!restHover,{restHit,restHover});
  stage='gap';await away();await mouse(gx,gy);await pause(60);const onGear=profile.matches(':hover'),lost=[];
  for(let x=gx-2;x>=nx;x-=2){await mouse(x,gy);await pause(8);if(!profile.matches(':hover'))lost.push(Math.round(x))}
  check('Vault name survives the gap from Settings',onGear&&lost.length===0&&nameBox.right<gearBox.left,{onGear,lost,name:[nameBox.left,nameBox.right],gear:[gearBox.left,gearBox.right]});
  stage='off line';await away();await mouse(gx,gy);await pause(60);await mouse(nameBox.right-30,gearBox.top+1);await pause(16);
  const offLine=profile.matches(':hover')&&onName();check('Vault name survives a slightly off line',offLine,{offLine});
  stage='linger';await mouse(nx,ny);await pause(60);await mouse(nx,profile.getBoundingClientRect().top-60);await pause(150);const lingering=onName();
  await mouse(nx,ny);await pause(16);const regained=profile.matches(':hover');
  await mouse(nx,profile.getBoundingClientRect().top-60);await pause(700);const gone=onName();
  check('Vault name lingers after the pointer leaves, then goes',lingering&&regained&&!gone,{lingering,regained,gone});
 }catch(e){check('Run '+stage,false,{error:String(e)})}finally{
  try{await dbg.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',x:Math.round(innerWidth/2),y:Math.round(innerHeight/2)})}catch{}
  if(attached)try{dbg.detach()}catch{}
  document.body.classList.toggle('still-hide-vault',hadOption);
 }
 return JSON.stringify({vault:app.vault.getName(),theme:app.customCss.theme,results,passed:results.filter(r=>r.pass).length,total:results.length});
})()`;
const run=spawnSync('obsidian',[`vault=${VAULT}`,'eval',`code=${code}`],{encoding:'utf8',timeout:30000});
if(run.error)throw run.error;
const marker=run.stdout.lastIndexOf('=> ');const out=(marker>=0?run.stdout.slice(marker+3):run.stdout).trim();
let report;try{report=JSON.parse(out)}catch{throw Error(out||run.stderr)}
writeFileSync(process.argv[3]??'still-vault-foot-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed}/${report.total} passed`);for(const r of report.results)if(!r.pass)console.log(`FAIL ${r.name}: ${JSON.stringify(r.evidence)}`);
process.exitCode=report.passed===report.total?0:1;
