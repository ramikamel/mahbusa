import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
const generator = fileURLToPath(new URL('../scripts/offline.mjs', import.meta.url));
async function fixture(fn) {
  const cwd = await mkdtemp(join(tmpdir(), 'mahbusa-offline-'));
  try {
    await mkdir(join(cwd, 'dist/assets'), { recursive: true });
    await writeFile(join(cwd, 'dist/index.html'), '<html>Mahbusa</html>');
    await writeFile(join(cwd, 'dist/assets/app.js'), 'console.log("app")');
    await fn(cwd);
  } finally { await rm(cwd, { recursive: true, force: true }); }
}
function generate(cwd) { return spawnSync(process.execPath, [generator], { cwd, encoding: 'utf8' }); }
function runtime(source) {
  const handlers = {}; const added = []; const deleted = []; const fetched = []; const matches = [];
  const cache = { addAll: async urls => added.push(...urls), match: async (request, options) => {
    matches.push({ request, options });
    return { cached: typeof request === 'string' ? request : request.url };
  } };
  const self = { location: { origin: 'https://mahbusa.example' }, clients: { claim: async () => {} }, addEventListener: (name, fn) => handlers[name] = fn };
  runInNewContext(source, { self, URL, caches: { open: async () => cache, keys: async () => ['mahbusa-old', 'another-app'], delete: async key => deleted.push(key) }, fetch: async req => fetched.push(req) });
  return { handlers, added, deleted, fetched, matches };
}
test('offline build fingerprints content and excludes service worker itself', async () => fixture(async cwd => {
  assert.equal(generate(cwd).status, 0);
  const first = await readFile(join(cwd, 'dist/sw.js'), 'utf8');
  assert.equal(generate(cwd).status, 0);
  assert.equal(await readFile(join(cwd, 'dist/sw.js'), 'utf8'), first);
  await writeFile(join(cwd, 'dist/assets/app.js'), 'console.log("updated")');
  assert.equal(generate(cwd).status, 0);
  assert.notEqual(await readFile(join(cwd, 'dist/sw.js'), 'utf8'), first);
}));
test('immutable app assets match despite Origin header variance and query strings', async () => fixture(async cwd => {
  assert.equal(generate(cwd).status, 0);
  const { handlers, matches } = runtime(await readFile(join(cwd, 'dist/sw.js'), 'utf8'));
  let response;
  handlers.fetch({ request: { method: 'GET', url: 'https://mahbusa.example/assets/app.js?v=1', mode: 'cors' }, respondWith: p => response = p });
  assert.equal((await response).cached, '/assets/app.js');
  assert.equal(matches[0].options.ignoreVary, true);
}));
test('production build refuses development fixtures', async () => fixture(async cwd => {
  await writeFile(join(cwd, 'dist/assets/app.js'), 'const fixture = "mother-win"');
  const result = generate(cwd); assert.notEqual(result.status, 0); assert.match(result.stderr, /leaked into production/);
}));
for (const [file, marker] of [['lab.js', 'mahbusa-expert-lab'], ['lab.css', '.lab-workspace'], ['lab.js', 'Expert lab']]) {
  test('production build refuses expert lab marker ' + marker, async () => fixture(async cwd => {
    await writeFile(join(cwd, 'dist/assets', file), marker);
    const result = generate(cwd);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /leaked into production/);
  }));
}
test('worker caches app assets, cleans own old caches, defers updates', async () => fixture(async cwd => {
  assert.equal(generate(cwd).status, 0);
  const source = await readFile(join(cwd, 'dist/sw.js'), 'utf8');
  const { handlers, added, deleted } = runtime(source);
  let pending;
  handlers.install({ waitUntil: p => pending = p }); await pending;
  assert.deepEqual([...added], ['/assets/app.js', '/']);
  handlers.activate({ waitUntil: p => pending = p }); await pending;
  assert.deepEqual(deleted, ['mahbusa-old']);
  assert.ok(!source.includes('self.skipWaiting('));
}));
test('worker serves cached shell but does not cache foreign or arbitrary requests', async () => fixture(async cwd => {
  assert.equal(generate(cwd).status, 0);
  const { handlers } = runtime(await readFile(join(cwd, 'dist/sw.js'), 'utf8'));
  let response;
  const respondWith = p => response = p;
  handlers.fetch({ request: { method: 'GET', url: 'https://mahbusa.example/game', mode: 'navigate' }, respondWith });
  assert.equal((await response).cached, '/');
  response = undefined;
  handlers.fetch({ request: { method: 'GET', url: 'https://elsewhere.example/index.html' }, respondWith });
  assert.equal(response, undefined);
  handlers.fetch({ request: { method: 'POST', url: 'https://mahbusa.example/index.html' }, respondWith });
  assert.equal(response, undefined);
  handlers.fetch({ request: { method: 'GET', url: 'https://mahbusa.example/unlisted.json' }, respondWith });
  assert.equal(response, undefined);
}));
