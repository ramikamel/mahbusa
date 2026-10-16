export function createSearchWorker(){
  return new Worker(new URL('./search.worker.ts',import.meta.url),{type:'module'});
}
