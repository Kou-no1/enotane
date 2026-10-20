import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';

async function harness(failInstall = false) {
  const listeners: Record<string, (event: any) => void> = {}, storage = new Map<string, Map<string, Response>>();
  storage.set('other-app-cache', new Map());
  let fail = failInstall, changed = false, savedFailure = false, skipCount = 0;
  const fetchMock = async (input: Request | URL | string) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (fail) throw new Error('offline');
    if (savedFailure && url.endsWith('/data/anim/W-11.json')) throw new Error('saved lesson unavailable');
    if (url.endsWith('precache.json')) return Response.json({ version: 'test', files: ['index.html', 'assets/app.js', 'data/lessons.json'], scripts: { 'data/anim/W-11.json': createHash('sha256').update('{}').digest('hex') } });
    if (url.endsWith('lessons.json')) return Response.json({ schemaVersion: 1, lessons: [{ id: 'W-11', anim: 'anim/W-11.json' }] });
    return new Response(url.endsWith('index.html') ? changed ? '<h1>new incompatible app</h1>' : '<h1>えのたね</h1>' : changed ? '{"newAction":true}' : '{}', { status: 200, headers: { Vary: 'Origin' } });
  };
  const cachesMock = {
    keys: async () => [...storage.keys()], delete: async (name: string) => storage.delete(name),
    open: async (name: string) => {
      if (!storage.has(name)) storage.set(name, new Map()); const cache = storage.get(name)!;
      const key = (request: Request | string) => typeof request === 'string' ? request : request.url;
      return { match: async (request: Request | string, options?: CacheQueryOptions) => {
        const response = cache.get(key(request));
        if (!options?.ignoreVary && response?.headers.get('Vary') === 'Origin' && typeof request !== 'string' && request.headers.get('Origin')) return undefined;
        return response?.clone();
      }, put: async (request: Request | string, response: Response) => { cache.set(key(request), response.clone()); }, keys: async () => [...cache.keys()].map(url => new Request(url)), addAll: async (urls: string[]) => { for (const url of urls) cache.set(url, await fetchMock(url)); } };
    },
  };
  const self = { registration: { scope: 'https://example.test/enotane/', active: null as object | null }, clients: { claim: async () => undefined }, skipWaiting: async () => { skipCount++; }, addEventListener: (name: string, callback: (event: any) => void) => { listeners[name] = callback; } };
  const source = (await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')).replace('__ENOTANE_VERSION__', 'test');
  runInNewContext(source, { self, caches: cachesMock, fetch: fetchMock, URL, Response, Set, crypto: webcrypto, Uint8Array });
  const event = (name: string, extra: object = {}) => { let pending: Promise<any> = Promise.resolve(); listeners[name]({ ...extra, waitUntil: (promise: Promise<any>) => { pending = promise; }, respondWith: (promise: Promise<any>) => { pending = promise; } }); return pending; };
  return { event, storage, offline: () => { fail = true; }, updateServer: () => { changed = true; }, activeVersion: () => { self.registration.active = {}; }, failSavedFetch: () => { savedFailure = true; }, skipCount: () => skipCount };
}
describe('offline app and explicitly saved lessons', () => {
  it('prepares updated saved lessons but keeps the active version until explicit activation', async () => {
    const app = await harness(); app.activeVersion();
    app.storage.set('enotane-shell-old', new Map());
    app.storage.set('enotane-lessons-old', new Map([['https://example.test/enotane/data/anim/W-11.json', new Response('{"old":true}')]]));
    await app.event('install'); expect(app.skipCount()).toBe(0); expect(app.storage.has('enotane-shell-old')).toBe(true);
    expect(await app.storage.get('enotane-lessons-test')?.get('https://example.test/enotane/data/anim/W-11.json')?.clone().text()).toBe('{}');
    await app.event('message', { data: { type: 'ACTIVATE_UPDATE' } }); expect(app.skipCount()).toBe(1);
    await app.event('activate'); expect(app.storage.has('enotane-shell-old')).toBe(false); expect(app.storage.has('enotane-lessons-old')).toBe(false); expect(app.storage.has('other-app-cache')).toBe(true);
  });
  it('removes an incomplete upgrade and preserves old shell and saved lessons on migration failure', async () => {
    const app = await harness(); app.activeVersion(); app.failSavedFetch();
    app.storage.set('enotane-shell-old', new Map());
    app.storage.set('enotane-lessons-old', new Map([['https://example.test/enotane/data/anim/W-11.json', new Response('{"old":true}')]]));
    await expect(app.event('install')).rejects.toThrow('saved lesson unavailable');
    expect(app.skipCount()).toBe(0); expect(app.storage.has('enotane-shell-test')).toBe(false); expect(app.storage.has('enotane-lessons-test')).toBe(false);
    expect(app.storage.has('enotane-shell-old')).toBe(true); expect(await app.storage.get('enotane-lessons-old')?.get('https://example.test/enotane/data/anim/W-11.json')?.clone().text()).toBe('{"old":true}');
  });
  it('serves precached crossorigin scripts despite the development server Vary: Origin header', async () => {
    const app = await harness(); await app.event('install'); app.offline();
    const request = new Request('https://example.test/enotane/assets/app.js', { headers: { Origin: 'https://example.test' } });
    expect((await app.event('fetch', { request })).status).toBe(200);
  });
  it('serves the app shell and saved lesson under a nested base path, explains missing lessons', async () => {
    const app = await harness(); await app.event('install'); let reply: { ok: boolean } | undefined;
    await app.event('message', { data: { type: 'SAVE_LESSON', lessonId: 'W-11' }, ports: [{ postMessage: (value: any) => { reply = value; } }] }); expect(reply?.ok).toBe(true);
    app.offline(); const navigate = { url: 'https://example.test/enotane/?lesson=W-11', method: 'GET', mode: 'navigate' };
    expect(await (await app.event('fetch', { request: navigate })).text()).toContain('えのたね');
    const request = new Request('https://example.test/enotane/data/anim/W-11.json'); expect((await app.event('fetch', { request })).status).toBe(200);
    const missing = await app.event('fetch', { request: new Request('https://example.test/enotane/data/anim/P-02.json') }); expect(missing.status).toBe(503); expect(await missing.text()).toContain('未保存');
  });
  it('deletes only this app lesson cache and keeps shell and unrelated caches', async () => {
    const app = await harness(); await app.event('install'); await app.event('message', { data: { type: 'SAVE_LESSON', lessonId: 'W-11' }, ports: [{ postMessage() {} }] });
    await app.event('message', { data: { type: 'CLEAR_LESSONS' }, ports: [{ postMessage() {} }] }); expect(app.storage.has('enotane-lessons-test')).toBe(false); expect(app.storage.has('enotane-shell-test')).toBe(true); expect(app.storage.has('other-app-cache')).toBe(true);
  });
  it('does not activate a partially installed version or remove older offline resources', async () => {
    const app = await harness(true); app.storage.set('enotane-shell-old', new Map()); await expect(app.event('install')).rejects.toThrow(); expect(app.storage.has('enotane-shell-old')).toBe(true); expect(app.storage.has('other-app-cache')).toBe(true);
  });
  it('rejects unknown IDs without saving arbitrary URLs', async () => {
    const app = await harness(); await app.event('install'); let reply: any;
    await app.event('message', { data: { type: 'SAVE_LESSON', lessonId: '../private' }, ports: [{ postMessage: (value: any) => { reply = value; } }] }); expect(reply.ok).toBe(false); expect(app.storage.has('enotane-lessons-test')).toBe(false);
  });
  it('keeps the active shell and rejects a new incompatible unsaved script until update', async () => {
    const app = await harness(); await app.event('install'); app.updateServer();
    const page = await app.event('fetch', { request: { url: 'https://example.test/enotane/', method: 'GET', mode: 'navigate' } });
    expect(await page.text()).toContain('えのたね');
    const script = await app.event('fetch', { request: new Request('https://example.test/enotane/data/anim/W-11.json') }); expect(script.status).toBe(503);
    let reply: any; await app.event('message', { data: { type: 'SAVE_LESSON', lessonId: 'W-11' }, ports: [{ postMessage: (value: any) => { reply = value; } }] }); expect(reply.ok).toBe(false);
  });
});
