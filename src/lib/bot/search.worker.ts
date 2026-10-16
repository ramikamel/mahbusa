import {runSearchRequest} from './worker-runtime.ts';

self.onmessage=(event:MessageEvent<unknown>)=>runSearchRequest(event.data,reply=>self.postMessage(reply));
