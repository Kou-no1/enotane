import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

function offlineBuild() {
  let output = '';
  return { name: 'enotane-offline-shell', apply: 'build' as const,
    configResolved(config: { build: { outDir: string }; root: string; mode: string }) { if (config.mode !== 'gallery') output = resolve(config.root, config.build.outDir); },
    async closeBundle() {
      if (!output) return;
      const assets = (await readdir(resolve(output, 'assets'))).filter(name => /\.(js|css)$/.test(name)).map(name => `assets/${name}`);
      const examples = (await readdir(resolve(output, 'assets/challenges'))).filter(name => name.endsWith('.svg')).sort().map(name => `assets/challenges/${name}`);
      const files = ['index.html', ...assets, 'data/lessons.json', 'data/challenges.json', 'data/teacher-index.json', ...examples];
      const hash = createHash('sha256');
      const worker = await readFile(resolve(output, 'sw.js'), 'utf8');
      // Worker-only fixes also need a separate cache, without mutating an active version.
      hash.update(worker);
      for (const file of files) hash.update(await readFile(resolve(output, file)));
      const scripts: Record<string, string> = {};
      for (const file of (await readdir(resolve(output, 'data/anim'))).filter(name => name.endsWith('.json')).sort()) {
        const bytes = await readFile(resolve(output, 'data/anim', file)); hash.update(bytes);
        scripts[`data/anim/${file}`] = createHash('sha256').update(bytes).digest('hex');
      }
      const version = hash.digest('hex').slice(0, 16);
      await writeFile(resolve(output, 'precache.json'), JSON.stringify({ version, files, scripts }));
      await writeFile(resolve(output, 'sw.js'), worker.replace('__ENOTANE_VERSION__', version));
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  publicDir: 'public',
  plugins: [offlineBuild()],
  esbuild: { jsx: 'automatic' },
  server: { host: '127.0.0.1', port: 5186, strictPort: true },
  build: {
    target: 'es2022',
    outDir: mode === 'gallery' ? 'dist-dev' : 'dist',
    rollupOptions: { input: resolve(import.meta.dirname, mode === 'gallery' ? 'dev.html' : 'index.html') },
  },
}));
