import {build} from 'vite';
import {resolve,join} from 'node:path';
import {readdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const outDir=resolve(root,'.local/worker-smoke-build');
await build({configFile:false,root,publicDir:false,worker:{format:'es'},build:{outDir,emptyOutDir:true,
  rollupOptions:{input:resolve(root,'tests/browser/worker.html')}}});
const assets=await readdir(join(outDir,'assets'));
if(!assets.some(name=>name.startsWith('search.worker-')))throw Error('Real search worker was not emitted.');
for(const name of assets.filter(name=>name.endsWith('.js'))){
  const source=await readFile(join(outDir,'assets',name),'utf8');
  if(/['"]node:|__vite-browser-external/.test(source))throw Error('Node dependency leaked into browser worker bundle.');
}
console.log('Worker smoke bundle verified; excluded from public dist/.');
