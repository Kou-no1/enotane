/* App caches contain only static resources from this same origin. */
const SHELL_PREFIX = 'enotane-shell-';
const SHELL_VERSION = '__ENOTANE_VERSION__';
const LESSON_PREFIX = 'enotane-lessons-';
const LESSON_CACHE = LESSON_PREFIX + SHELL_VERSION;
const ROOT = new URL('./', self.registration.scope);
const shellName = SHELL_PREFIX + SHELL_VERSION;
// Static, public files share one representation. Vite's Vary: Origin must not
// make crossorigin script requests miss files precached without an Origin header.
const STATIC_MATCH = { ignoreVary: true };
async function verifyScript(response, url, manifest) {
  const path = new URL(url).pathname.slice(ROOT.pathname.length);
  if (!/^data\/anim\/[PCWMKZO]-\d{2}\.json$/.test(path) || !response.ok) return response;
  const expected = manifest.scripts?.[path];
  if (!expected) throw new Error('Unknown lesson version');
  const digest = await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer());
  const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== expected) throw new Error('Lesson version changed; update the app first');
  return response;
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const manifest = await fetch(new URL('precache.json', ROOT), { cache: 'no-store' }).then(response => { if (!response.ok) throw new Error('Cache manifest unavailable'); return response.json(); });
    if (!manifest.version || !Array.isArray(manifest.files)) throw new Error('Invalid cache manifest');
    if (manifest.version !== SHELL_VERSION) throw new Error('Cache version mismatch');
    const cache = await caches.open(shellName);
    try {
      await cache.addAll(manifest.files.map(file => new URL(file, ROOT).href));
      await cache.put(new URL('precache.json', ROOT).href, Response.json(manifest));
      const savedURLs = new Set();
      for (const name of await caches.keys()) if (name.startsWith(LESSON_PREFIX) && name !== LESSON_CACHE) {
        for (const request of await (await caches.open(name)).keys()) savedURLs.add(request.url);
      }
      if (savedURLs.size) {
        const updated = await Promise.all([...savedURLs].map(async url => [url, await verifyScript(await fetch(url, { cache: 'reload' }), url, manifest)]));
        const lessons = await caches.open(LESSON_CACHE);
        for (const [url, response] of updated) { if (!response.ok) throw new Error('Saved lesson unavailable'); await lessons.put(url, response); }
      }
    }
    catch (error) { await caches.delete(shellName); await caches.delete(LESSON_CACHE); throw error; }
    // A first installation can start immediately; upgrades wait for the user.
    if (!self.registration.active) await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if ((name.startsWith(SHELL_PREFIX) && name !== shellName) || (name.startsWith(LESSON_PREFIX) && name !== LESSON_CACHE)) await caches.delete(name);
  await self.clients.claim();
})()));
async function shell() {
  return caches.open(shellName);
}
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  event.respondWith((async () => {
    const cache = await shell();
    if (event.request.mode === 'navigate') {
      const page = await cache?.match(new URL('index.html', ROOT).href, STATIC_MATCH);
      // Keep HTML, JavaScript and catalog data on the installed version until an update is accepted.
      if (page) return page;
      try { const response = await fetch(event.request); if (response.ok) return response; } catch { /* The installed shell is unavailable. */ }
      return new Response('接続を確認して、えのたねをもう一度開いてください。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    const saved = await (await caches.open(LESSON_CACHE)).match(event.request, STATIC_MATCH);
    if (saved) return saved;
    const asset = await cache?.match(event.request, STATIC_MATCH);
    if (asset) return asset;
    try {
      const response = await fetch(event.request);
      const manifest = await cache.match(new URL('precache.json', ROOT).href, STATIC_MATCH).then(value => value.json());
      return await verifyScript(response, event.request.url, manifest);
    }
    catch { return new Response(JSON.stringify({ error: 'この教材は未保存です。ネットにつないで開いてください。' }), { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } }); }
  })());
});
self.addEventListener('message', event => {
  const reply = data => event.ports[0]?.postMessage(data);
  const message = event.data ?? {};
  if (message.type === 'ACTIVATE_UPDATE') { event.waitUntil(self.skipWaiting()); return; }
  if (message.type === 'CLEAR_LESSONS') { event.waitUntil(caches.delete(LESSON_CACHE).then(() => reply({ ok: true }))); return; }
  if (message.type !== 'SAVE_LESSON' || !/^(P|C|W|M|K|Z|O)-\d{2}$/.test(message.lessonId)) { reply({ ok: false, error: '保存する教材を確認できませんでした。' }); return; }
  event.waitUntil((async () => {
    try {
      const shellCache = await shell();
      const catalog = await shellCache.match(new URL('data/lessons.json', ROOT).href, STATIC_MATCH).then(response => { if (!response?.ok) throw new Error(); return response.json(); });
      const manifest = await shellCache.match(new URL('precache.json', ROOT).href, STATIC_MATCH).then(response => response.json());
      const lesson = catalog.lessons.find(item => item.id === message.lessonId);
      if (!lesson || lesson.anim !== `anim/${lesson.id}.json`) throw new Error();
      const urls = [new URL(`data/${lesson.anim}`, ROOT).href];
      const responses = await Promise.all(urls.map(async url => { const response = await fetch(url, { cache: 'reload' }); if (!response.ok) throw new Error(); return verifyScript(response, url, manifest); }));
      const cache = await caches.open(LESSON_CACHE);
      await Promise.all(responses.map((response, i) => cache.put(urls[i], response)));
      reply({ ok: true, count: responses.length });
    } catch { reply({ ok: false, error: '教材を保存できませんでした。ネットにつないで、もう一度おためしください。' }); }
  })());
});
