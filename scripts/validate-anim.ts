import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, basename } from 'node:path';
import { validateScript } from '../src/engine/schema.ts';
import { validateCatalog, EXPECTED_LESSON_IDS } from '../src/content/catalog.ts';
import { plainCaption } from '../src/engine/ruby.ts';
import type { Lesson } from '../src/content/types.ts';

const dataDir=fileURLToPath(new URL('../public/data/',import.meta.url));
const animDir=join(dataDir,'anim');
const failures:string[]=[];
const scripts=new Map<string,unknown>();
for(const filename of (await readdir(animDir)).filter(name=>name.endsWith('.json')).sort()) {
  try {
    const raw:unknown=JSON.parse(await readFile(join(animDir,filename),'utf8'));
    const errors=validateScript(raw);
    failures.push(...errors.map(error=>`${filename}: ${error}`));
    if(raw && typeof raw==='object' && 'id' in raw && typeof raw.id==='string') {
      if(raw.id!==basename(filename,'.json'))failures.push(`${filename}: 台本IDとファイル名が違います`);
      if(scripts.has(raw.id))failures.push(`${filename}: 台本IDが重複しています`);
      scripts.set(raw.id,raw);
    }
  }catch(error){failures.push(`${filename}: ${error instanceof Error?error.message:String(error)}`);}
}
try {
  const manifest=JSON.parse(await readFile(join(dataDir,'dev-manifest.json'),'utf8'));
  if(manifest.schemaVersion!==1 || !Array.isArray(manifest.lessons))throw new Error('manifestのschemaVersion/lessonsが不正です');
  const expected=['P-02','C-09','W-11'];
  const ids=new Set<string>();
  for(const lesson of manifest.lessons) {
    if(!lesson || typeof lesson!=='object') { failures.push('manifest: lesson objectが必要です'); continue; }
    if(ids.has(lesson.id))failures.push(`manifest: ${lesson.id}が重複しています`);
    ids.add(lesson.id);
    for(const field of ['id','title','anim','description','color'])if(typeof lesson[field]!=='string'||!lesson[field].trim())failures.push(`manifest: ${lesson.id}.${field}が必要です`);
    if(!/^#[a-f\d]{6}$/iu.test(lesson.color??''))failures.push(`manifest: ${lesson.id}.colorはHEX色です`);
    if(lesson.anim!==`anim/${lesson.id}.json`)failures.push(`manifest: ${lesson.id}のanim参照が違います`);
    if(!scripts.has(lesson.id))failures.push(`manifest: ${lesson.id}の台本がありません`);
  }
  if(ids.size!==expected.length || expected.some(id=>!ids.has(id)))failures.push('manifest: Phase 0の試作はP-02/C-09/W-11の3本です');
  if(scripts.size!==69 || EXPECTED_LESSON_IDS.some(id=>!scripts.has(id)))failures.push('anim: 全69レッスンの台本が必要です');
}catch(error){failures.push(`manifest: ${error instanceof Error?error.message:String(error)}`);}
try {
  const [lessonFile,challengeFile,setFile]=await Promise.all(['lessons.json','challenges.json','teacher-index.json'].map(async file=>JSON.parse(await readFile(join(dataDir,file),'utf8'))));
  for(const [name,value] of [['lessons',lessonFile],['challenges',challengeFile],['teacher-index',setFile]] as const)if(value.schemaVersion!==1)failures.push(`${name}: schemaVersionは1です`);
  const catalog={lessons:lessonFile.lessons,challenges:challengeFile.challenges,teacherSets:setFile.teacherSets};
  failures.push(...validateCatalog(catalog));
  for(const lesson of (catalog.lessons??[]) as Lesson[]) {
    if(!scripts.has(lesson.id))failures.push(`${lesson.id}: 台本が見つかりません`);
    const script=scripts.get(lesson.id) as {steps?:{caption:string;actions:unknown[]}[]};
    for(const [i,step] of (script?.steps??[]).entries()) {
      const max=lesson.level===1?24:32;
      if([...plainCaption(step.caption)].length>max || [...plainCaption(step.caption,true)].length>max)failures.push(`${lesson.id}.step${i+1}: ★${lesson.level}の字幕は${max}字以内です`);
    }
  }
  for(const challenge of catalog.challenges??[])for(const example of challenge.examples??[]) {
    try{const svg=await readFile(join(dataDir,'..',example.image),'utf8');if(!svg.startsWith('<svg')||!svg.includes('<desc>'))failures.push(`${example.id}: 作例SVGと図の説明が必要です`);}
    catch{failures.push(`${example.id}: 作例画像が見つかりません`);}
  }
}catch(error){failures.push(`catalog: ${error instanceof Error?error.message:String(error)}`);}
if(failures.length) { console.error(failures.join('\n')); process.exitCode=1; }
else console.log('69本の台本、教材本文、6チャレンジ・18作例、7逆引きセット: 時間・字幕・座標・参照・層競合・内容構造の検証に合格（dev-manifestは元の3試作を維持）');
