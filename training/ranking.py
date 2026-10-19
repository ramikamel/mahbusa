"""Checked numeric preference pairs and loss; no board rules or encoding."""
import hashlib
import math
from pathlib import Path
import struct

import torch


def load_pairs(manifest, directory, data):
    descriptor=manifest.get('pairs', {})
    if descriptor.get('format')!='best-turn-pairs-v1' or descriptor.get('recordBytes')!=24:
        raise ValueError('Invalid preference pair format.')
    result={}
    for split in ['train','validation']:
        rows=[r for r in manifest['rounds'] if r['split']==split]
        meta=descriptor.get(split,{})
        count=sum(r.get('pairs',-1) for r in rows)
        if (type(count) is not int or not 1<=count<=len(data[split]) or meta.get('count')!=count
                or meta.get('path')!=split+'-pairs.bin' or meta.get('bytes')!=count*24):
            raise ValueError('Invalid preference pair counts/path.')
        raw=(Path(directory)/meta['path']).read_bytes()
        if len(raw)!=meta['bytes'] or hashlib.sha256(raw).hexdigest()!=meta.get('sha256'):
            raise ValueError('Preference pair checksum mismatch.')
        offset=0;expected=bytearray()
        for row in rows:
            groups=row.get('groups')
            if not isinstance(groups,list) or len(groups)!=min(row['sourceTurns'],manifest['teacher']['turnsPerRound']):
                raise ValueError('Invalid turn group count.')
            pairs=[];begin=offset
            for group in groups:
                if (not isinstance(group,dict) or set(group)!={'signs','terminal'} or type(group['terminal']) is not bool
                        or not isinstance(group['signs'],list) or any(type(s) is not int or s not in [-1,1] for s in group['signs'])
                        or offset+len(group['signs'])>begin+row['examples'] or not group['signs'] and not group['terminal']):
                    raise ValueError('Invalid preference group/signs.')
                signs=group['signs'];n=len(signs)
                if n and not group['terminal']:
                    targets=data[split][offset:offset+n,104].tolist()
                    values=[sign*(2*target-1) for sign,target in zip(signs,targets)]
                    best=max(range(n),key=values.__getitem__)
                    for i in range(n):
                        gap=struct.unpack('<f',struct.pack('<f',values[best]-values[i]))[0]
                        if gap>1e-7:pairs.append((offset+best,offset+i,signs[best],signs[i],gap))
                offset+=n
            if offset!=begin+row['examples'] or len(pairs)!=row.get('pairs'):
                raise ValueError('Preference groups do not cover their round.')
            for pair in pairs:expected.extend(struct.pack('<IIffff',*pair,1/len(pairs)))
        if bytes(expected)!=raw:
            raise ValueError('Preference pairs disagree with turn groups/targets/weights.')
        indices=torch.frombuffer(bytearray(raw),dtype=torch.int32).reshape(count,6)[:,:2].clone().long()
        values=torch.frombuffer(bytearray(raw),dtype=torch.float32).reshape(count,6)[:,2:].clone()
        result[split]={'indices':indices,'values':values}
    return result


def preference_loss(pair_logits, values, normalizer=None):
    """Gap-weighted logistic preference in the original chooser's perspective."""
    delta=pair_logits[:,0]*values[:,0]-pair_logits[:,1]*values[:,1]
    importance=values[:,2]*values[:,3]
    normalizer=importance.mean() if normalizer is None else normalizer
    return (torch.nn.functional.softplus(values[:,2]-delta)*importance).mean()/normalizer
