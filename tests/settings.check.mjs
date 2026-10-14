// Static check of the Style Settings block in theme.css; no Obsidian needed.
// Style Settings shows `title.<lang>` / `description.<lang>` when Obsidian's
// language matches, so every option needs a Chinese title, and a Chinese
// description wherever it has an English one. Also catches duplicate ids.
// Usage: node tests/settings.check.mjs [theme.css]
import {readFileSync} from 'node:fs';
const css=readFileSync(process.argv[2]??new URL('../theme.css',import.meta.url),'utf8');
const block=css.match(/\/\*\s*@settings\s*\n([\s\S]*?)\*\//)?.[1];
if(!block)throw Error('No @settings block');
const items=[];let item=null;
for(const line of block.split('\n')){
 if(/^\s*-\s*$/.test(line)){item={};items.push(item);continue}
 const m=line.match(/^\s+([\w.-]+):\s*(.*)$/);if(item&&m)item[m[1]]=m[2];
}
const failures=[],ids=new Set();
for(const i of items){
 if(ids.has(i.id))failures.push(`duplicate id ${i.id}`);ids.add(i.id);
 if(i.title&&!i['title.zh'])failures.push(`${i.id}: no title.zh`);
 if(i.description&&!i['description.zh'])failures.push(`${i.id}: no description.zh`);
 for(const k of ['title.zh','description.zh'])if(i[k]!==undefined&&!/[一-鿿]/.test(i[k]))failures.push(`${i.id}: ${k} has no Chinese`);
}
console.log(`${items.length} settings, ${failures.length} problems`);
for(const f of failures)console.log('FAIL '+f);
process.exitCode=failures.length?1:0;
