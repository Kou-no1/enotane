/**
 * Offline fallback for this workstation: copy only exact lockfile packages from
 * the existing parent install. Does not fetch, run install scripts, or delete files.
 * Prefer npm ci on a machine with a complete cache or a working npm connection.
 */
import { readFile, lstat, mkdir, cp, realpath, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, isAbsolute, join } from 'node:path';

const appRoot=fileURLToPath(new URL('../',import.meta.url));
const parentRoot=resolve(appRoot,'..');
const sourceModules=join(parentRoot,'node_modules');
const targetModules=join(appRoot,'node_modules');
const lockFile=join(appRoot,'package-lock.json');
const packageFile=join(appRoot,'package.json');

function contained(root,path) {
  const part=relative(root,path);
  return part!=='' && !isAbsolute(part) && part!=='..' && !part.startsWith(`..\\`) && !part.startsWith('../');
}
function platformMatches(list,value) {
  if(!list || list.length===0)return true;
  if(!Array.isArray(list))throw new Error('Invalid platform list in lockfile');
  if(list.includes(`!${value}`))return false;
  const positive=list.filter(item=>!item.startsWith('!'));
  return positive.length===0 || positive.includes(value);
}
async function exists(path) {try{return await lstat(path);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
function die(message) {throw new Error(message);}

const lockText=await readFile(lockFile,'utf8');
const packageText=await readFile(packageFile,'utf8');
const lock=JSON.parse(lockText);
if(lock.lockfileVersion!==3 || !lock.packages)die('package-lock.json version 3 is required');
const parentReal=await realpath(sourceModules);
if(!contained(parentRoot,parentReal))die('Parent node_modules must be a local directory inside the parent project');
const rootTarget=await exists(targetModules);
if(rootTarget?.isSymbolicLink())die('Refusing to write through a node_modules junction or symlink');

const plans=[];
const skipped=[];
for(const [key,entry] of Object.entries(lock.packages)) {
  if(key==='')continue;
  if(!key.startsWith('node_modules/') || key.includes('..') || key.includes('\\') || isAbsolute(key))die(`Unsafe package key: ${key}`);
  const source=resolve(parentRoot,key);
  const target=resolve(appRoot,key);
  if(!contained(sourceModules,source) || !contained(targetModules,target))die(`Package path leaves node_modules: ${key}`);
  const matches=platformMatches(entry.os,process.platform)&&platformMatches(entry.cpu,process.arch);
  if(!matches) {
    if(!entry.optional)die(`A required package is incompatible with this platform: ${key}`);
    skipped.push({package:key,reason:'foreign platform'});continue;
  }
  const status=await exists(source);
  if(!status) {
    if(entry.optional){skipped.push({package:key,reason:'optional package not installed in parent'});continue;}
    die(`Required exact package is missing in the parent install: ${key}@${entry.version}`);
  }
  if(!status.isDirectory() && !status.isSymbolicLink())die(`Package is not a directory: ${source}`);
  const sourceReal=await realpath(source);
  if(!contained(parentReal,sourceReal))die(`Package resolves outside parent node_modules: ${key}`);
  const sourcePackage=JSON.parse(await readFile(join(sourceReal,'package.json'),'utf8'));
  if(sourcePackage.version!==entry.version)die(`Version mismatch: ${key}: expected ${entry.version}, found ${sourcePackage.version}`);
  const destination=await exists(target);
  if(destination?.isSymbolicLink())die(`Refusing to overwrite a destination symlink: ${key}`);
  if(destination) {
    const targetPackage=await exists(join(target,'package.json'));
    if(targetPackage) {
      const installed=JSON.parse(await readFile(join(target,'package.json'),'utf8'));
      if(installed.version!==entry.version)die(`Existing local package has a different version: ${key}`);
    }
  }
  plans.push({key,version:entry.version,source:sourceReal,target});
}

const keys=new Set(plans.map(plan=>plan.key));
const esbuildHost=`node_modules/@esbuild/${process.platform}-${process.arch}`;
if(keys.has('node_modules/esbuild')&&!keys.has(esbuildHost))die(`Required esbuild platform binary is missing: ${esbuildHost}`);
if(process.platform==='win32'&&process.arch==='x64'&&keys.has('node_modules/rollup') && !keys.has('node_modules/@rollup/rollup-win32-x64-msvc')&&!keys.has('node_modules/@rollup/rollup-win32-x64-gnu'))die('Rollup Windows x64 native binary is missing');

const shims=[];
for(const name of ['vite','tsc','vitest']) {
  for(const extension of ['','.cmd','.ps1']) {
    const filename=name+extension;
    const source=join(sourceModules,'.bin',filename);
    if(!await exists(source))die(`Required parent command shim is missing: ${filename}`);
    const contents=await readFile(source,'utf8');
    if(contents.toLowerCase().includes(parentRoot.toLowerCase()))die(`Command shim contains an absolute parent path: ${filename}`);
    const target=join(targetModules,'.bin',filename);
    if((await exists(target))?.isSymbolicLink())die(`Refusing to overwrite a command symlink: ${filename}`);
    shims.push({source,target,filename});
  }
}

// Preflight finishes before the first package is written. Copying is additive;
// parent packages, cache directories, lockfile, and package.json stay untouched.
await mkdir(targetModules,{recursive:true});
for(const plan of plans) {
  await mkdir(resolve(plan.target,'..'),{recursive:true});
  await cp(plan.source,plan.target,{recursive:true,dereference:true,force:true,errorOnExist:false});
  const localPackage=JSON.parse(await readFile(join(plan.target,'package.json'),'utf8'));
  if(localPackage.version!==plan.version)die(`Post-copy version check failed: ${plan.key}`);
}
await mkdir(join(targetModules,'.bin'),{recursive:true});
for(const shim of shims)await cp(shim.source,shim.target,{dereference:true,force:true});
if(await readFile(lockFile,'utf8')!==lockText||await readFile(packageFile,'utf8')!==packageText)die('package.json or lockfile changed during preparation');
const summary={platform:process.platform,arch:process.arch,copied:plans.length,skipped:skipped.length,shims:shims.map(shim=>shim.filename),packages:plans.map(plan=>({path:plan.key,version:plan.version})),excluded:skipped};
await writeFile(join(targetModules,'.enotane-local-preparation.json'),JSON.stringify(summary,null,2)+'\n');
console.log(`Local preparation complete: ${plans.length} exact packages, ${skipped.length} platform/optional exclusions, ${shims.length} command shims. Parent install and manifests unchanged.`);
