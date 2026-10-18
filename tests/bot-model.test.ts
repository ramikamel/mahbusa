import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {encodePreRoll,FEATURE_SCHEMA_VERSION,INPUT_SIZE} from '../src/lib/bot/encoding';
import {loadDenseModel} from '../src/lib/bot/dense-model';
import {botFixtures,mirrored,turnFixture} from './helpers/bot-fixtures';

function artifact(weights=new Float32Array(30081)){
  const bytes=new Uint8Array(120324),view=new DataView(bytes.buffer);
  weights.forEach((weight,i)=>view.setFloat32(i*4,weight,true));
  const sha256=createHash('sha256').update(bytes).digest('hex');
  return {bytes,manifest:{formatVersion:1,id:'bootstrap-v1-'+sha256.slice(0,12),rulesVersion:'mahbusa-engine-v1',
    featureSchemaVersion:'mahbusa-pre-roll-v1',inputSize:104,hiddenSizes:[128,128],outputSize:1,
    architecture:'dense-relu-sigmoid-v1',byteLength:120324,status:'experimental',sha256}};
}
describe('authoritative canonical model encoding',()=>{
  it('encodes literal pin/count/top/off/score values in active-home distance order',()=>{
    const input={...turnFixture([[1,3,1,0],[2,0,2],[23,12,0]],[0,12],[2,4]),score:[2,1] as [number,number]};
    const result=encodePreRoll(input);
    expect(result).toHaveLength(104);expect(INPUT_SIZE).toBe(104);expect(FEATURE_SCHEMA_VERSION).toBe('mahbusa-pre-roll-v1');
    expect([...result.slice(0,4)]).toEqual([0,0,0,0]);
    expect([...result.slice(4,8)]).toEqual([Math.fround(3/15),Math.fround(1/15),1,0]);
    expect([...result.slice(8,12)]).toEqual([0,Math.fround(2/15),0,1]);
    expect([...result.slice(92,96)]).toEqual([Math.fround(12/15),0,1,0]);
    expect([...result.slice(96)]).toEqual([0,Math.fround(12/15),0,0,1,0,1,0]);
    expect([...result.slice(12,92)].every(n=>n===0)).toBe(true);
  });
  it('is identical after reflection/color and score swap, without dice or caller aliasing',()=>{
    const input={...botFixtures.pinRetention(),score:[1,2] as [number,number]},before=structuredClone(input);
    const reflected={...mirrored(input),score:[2,1] as [number,number]};
    expect(encodePreRoll(input)).toEqual(encodePreRoll(reflected));
    const otherDice={...input,remaining:[6,6,6,6]};
    expect(encodePreRoll(otherDice)).toEqual(encodePreRoll(input));
    const encoded=encodePreRoll(input);encoded.fill(99);expect(input).toEqual(before);
    expect(encodePreRoll(input).every(n=>n>=0&&n<=1)).toBe(true);
  });
  it('rejects malformed, sparse and terminal states before encoding',()=>{
    for(const state of [{...botFixtures.opening(),score:[3,0]},
      {...botFixtures.opening(),score:Array(2)},
      {...botFixtures.opening(),score:[0,0],active:2},
      {...botFixtures.opening(),score:[0,0],position:{points:[],off:[0,0]}}])expect(()=>encodePreRoll(state as never)).toThrow();
  });
});
describe('checked typed-array inference',()=>{
  it('decodes row-major little-endian layers with ReLU/bias and sigmoid',async()=>{
    const w=new Float32Array(30081);
    w[7*104+13]=2;w[13312+7]=.5;
    w[13440+11*128+7]=3;w[29824+11]=-1;
    w[29952+11]=4;w[30080]=-1;
    const {bytes,manifest}=artifact(w),model=await loadDenseModel(manifest,bytes),x=new Float32Array(104);
    x[13]=.25;
    expect(model.predict(x)).toBeCloseTo(2/(1+Math.exp(-7))-1,6);
    expect(model.predict(new Float32Array(104))).toBeCloseTo(2/(1+Math.exp(-1))-1,6);
    const state={...botFixtures.opening(),score:[0,0] as [number,number]};
    expect(model.evaluate(state)).toEqual({kind:'round-win-expectation',value:model.predict(encodePreRoll(state))});
  });
  it('owns loaded bytes/manifest and saturates finite logits safely',async()=>{
    const w=new Float32Array(30081);w[30080]=-1000;
    const {bytes,manifest}=artifact(w),model=await loadDenseModel(manifest,bytes);
    bytes.fill(0);manifest.id='changed';manifest.hiddenSizes[0]=1;
    expect(model.id).not.toBe('changed');expect(model.predict(new Float32Array(104))).toBe(-1);
  });
  it('rejects unsupported versions/layout/dimensions/status and checksum corruption',async()=>{
    const {bytes,manifest}=artifact();
    for(const change of [{formatVersion:2},{rulesVersion:'other'},{featureSchemaVersion:'other'},{inputSize:1},
      {hiddenSizes:[128,64]},{outputSize:2},{architecture:'unknown'},{byteLength:4},{status:'qualified'},{sha256:'0'.repeat(64)},{id:''}]){
      await expect(loadDenseModel({...manifest,...change},bytes)).rejects.toThrow();
    }
    await expect(loadDenseModel(manifest,bytes.slice(4))).rejects.toThrow();
    const tampered=bytes.slice();tampered[0]=1;await expect(loadDenseModel(manifest,tampered)).rejects.toThrow(/checksum/i);
  });
  it('rejects nonfinite weights/features or overflowing math rather than inventing values',async()=>{
    const badWeights=new Float32Array(30081);badWeights[0]=NaN;
    const a=artifact(badWeights);await expect(loadDenseModel(a.manifest,a.bytes)).rejects.toThrow(/finite/i);
    const clean=artifact(),model=await loadDenseModel(clean.manifest,clean.bytes);
    for(const x of [new Float32Array(103),new Float32Array(104).fill(NaN),new Float32Array(104).fill(2)])expect(()=>model.predict(x)).toThrow();
    const huge=new Float32Array(30081).fill(3e38),b=artifact(huge),overflow=await loadDenseModel(b.manifest,b.bytes);
    expect(()=>overflow.predict(new Float32Array(104).fill(1))).toThrow(/finite|overflow/i);
  });
});
