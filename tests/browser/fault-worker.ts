import {generateTurns} from '../../src/lib/engine.ts';
import type {SearchRequest} from '../../src/lib/bot/types';

/** Deliberate faults live only in the browser test graph. */
self.onmessage=(event:MessageEvent<SearchRequest>)=>{
  const request=event.data;
  if(self.name==='crash')throw new Error('Deliberate worker smoke fault');
  if(self.name==='progress-only')self.postMessage({type:'progress',requestId:request.requestId,
    revision:request.revision,modelId:request.modelId,plan:generateTurns(request.state)[0],
    stats:{nodes:0,completedDepth:0,elapsedMs:0}});
  // Verify actual terminate(), not a cooperative cancellation acknowledgement.
  for(;;){}
};
