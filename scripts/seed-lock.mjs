// Reuse exact, verified versions already present in this workspace's lockfile.
// This helper avoids refreshing registry metadata; it does not change the parent.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const source = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../package-lock.json'), 'utf8'));
const project = JSON.parse(readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf8'));
const packages = { '': { name: project.name, version: project.version, dependencies: project.dependencies, devDependencies: project.devDependencies } };
function locate(name, parent = '') {
  let current = parent;
  while (true) {
    const candidate = current ? `${current}/node_modules/${name}` : `node_modules/${name}`;
    if (source.packages[candidate]) return candidate;
    if (!current) return null;
    const position = current.lastIndexOf('/node_modules/');
    current = position < 0 ? '' : current.slice(0, position);
  }
}
const queue = Object.keys({ ...project.dependencies, ...project.devDependencies }).map(name => {
  const key = locate(name);
  if (!key) throw new Error(`Workspace lockfile does not contain ${name}`);
  const expected = project.dependencies?.[name] ?? project.devDependencies[name];
  if (source.packages[key].version !== expected) throw new Error(`Version mismatch for ${name}`);
  return key;
});
while (queue.length) {
  const key = queue.shift();
  if (packages[key]) continue;
  const entry = source.packages[key];
  packages[key] = entry;
  const peerNames = Object.keys(entry.peerDependencies ?? {}).filter(name => !entry.peerDependenciesMeta?.[name]?.optional || project.dependencies?.[name] || project.devDependencies?.[name]);
  const names = new Set([...Object.keys(entry.dependencies ?? {}), ...Object.keys(entry.optionalDependencies ?? {}), ...peerNames]);
  for (const name of names) {
    const target = locate(name, key);
    if (target) queue.push(target);
    else if (entry.dependencies?.[name] && !entry.optionalDependencies?.[name]) throw new Error(`Missing dependency ${name} for ${key}`);
  }
}
writeFileSync(resolve(import.meta.dirname, '../package-lock.json'), JSON.stringify({ name: project.name, version: project.version, lockfileVersion: 3, requires: true, packages }, null, 2) + '\n');
console.log(`Locked ${Object.keys(packages).length - 1} installed dependency entries from the workspace.`);
