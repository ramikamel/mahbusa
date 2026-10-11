import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(e => e.isDirectory() ? files(`${dir}/${e.name}`) : `${dir}/${e.name}`));
  return nested.flat().filter(p => !p.endsWith('/sw.js'));
}
const assets = (await files('dist')).sort();
const hash = createHash('sha256');
for (const path of assets) {
  const data = await readFile(path); hash.update(path); hash.update(data);
  if (path.endsWith('.js') && /pin-and-release|mother-win|Development scenarios/.test(data.toString())) {
    throw new Error('Development fixtures leaked into production.');
  }
}
const version = hash.digest('hex').slice(0, 16);
const urls = assets.map(p => '/' + p.slice('dist/'.length));
await writeFile('dist/sw.js', `// Generated asset cache. Never stores game state.\nconst CACHE = 'mahbusa-${version}';\nconst ASSETS = ${JSON.stringify(urls)};\nself.addEventListener('install', event => {\n  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));\n  // No skipWaiting: leave active games on their current app version.\n});\nself.addEventListener('activate', event => {\n  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('mahbusa-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));\n});\nself.addEventListener('fetch', event => {\n  const request = event.request;\n  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;\n  if (request.mode === 'navigate') {\n    event.respondWith(caches.open(CACHE).then(cache => cache.match('/index.html')).then(cached => cached || fetch(request)));\n  } else if (ASSETS.includes(new URL(request.url).pathname)) {\n    event.respondWith(caches.open(CACHE).then(cache => cache.match(request, { ignoreSearch: true })).then(cached => cached || fetch(request)));\n  }\n});\n`);
console.log(`Offline shell: ${urls.length} assets, version ${version}`);
