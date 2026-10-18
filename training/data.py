"""Verify encoded shards. Game rules and feature generation stay in TypeScript."""
import hashlib
import json
from pathlib import Path
import sys

import torch

INPUT_SIZE = 104
RECORD_SIZE = 106
SCHEMA = 'mahbusa-pre-roll-v1'
RULES = 'mahbusa-engine-v1'


def sha(content):
    return hashlib.sha256(content).hexdigest()


def integer(value, minimum=0, maximum=2**53-1):
    return type(value) is int and minimum <= value <= maximum


def digest(value):
    return isinstance(value, str) and len(value) == 64 and all(c in '0123456789abcdef' for c in value)


def load_prepared(directory):
    if sys.byteorder != 'little':
        raise ValueError('This training reader requires a little-endian CPU.')
    directory = Path(directory)
    raw_manifest = (directory / 'manifest.json').read_bytes()
    m = json.loads(raw_manifest)
    if (m.get('format') != 'mahbusa-training-data' or m.get('version') != 1 or m.get('status') != 'complete'
            or m.get('featureSchemaVersion') != SCHEMA or m.get('rulesVersion') != RULES
            or m.get('inputSize') != INPUT_SIZE or m.get('recordSize') != RECORD_SIZE
            or m.get('endian') != 'little' or m.get('splitVersion') != 'round-sha256-v1'
            or not isinstance(m.get('splitSeed'), str) or not 1 <= len(m['splitSeed']) <= 256):
        raise ValueError('Invalid or incomplete prepared training manifest.')
    source = m.get('sourceDataset', {})
    if (source.get('status') != 'complete' or source.get('rulesVersion') != RULES
            or not digest(source.get('manifestSha256')) or not digest(source.get('dataset', {}).get('sha256'))):
        raise ValueError('Invalid dataset provenance.')
    rounds = m.get('rounds')
    if not isinstance(rounds, list) or not 2 <= len(rounds) <= 10000:
        raise ValueError('Invalid round assignments.')
    seen = set()
    for index, row in enumerate(rounds):
        if (row.get('index') != index or not digest(row.get('seed')) or row['seed'] in seen
                or row.get('split') not in ['train', 'validation'] or not integer(row.get('examples'), 1, 100000)):
            raise ValueError('Invalid or duplicate round identity.')
        seen.add(row['seed'])
        packed = json.dumps(['training-split-v1', m['splitSeed'], row['seed']], separators=(',', ':'), ensure_ascii=False).encode()
        fraction = int.from_bytes(hashlib.sha256(packed).digest()[:4], 'big') / 2**32
        if row['split'] != ('validation' if fraction < .2 else 'train'):
            raise ValueError('Round split does not match its seed.')
    data = {}
    for split in ['train', 'validation']:
        meta = m[split]
        selected = [row for row in rounds if row['split'] == split]
        count = sum(row['examples'] for row in selected)
        if (not selected or meta.get('path') != split + '.f32' or meta.get('examples') != count
                or meta.get('rounds') != len(selected) or meta.get('bytes') != count * RECORD_SIZE * 4
                or not digest(meta.get('sha256'))):
            raise ValueError('Invalid shard counts or missing split.')
        raw = (directory / meta['path']).read_bytes()
        if len(raw) != meta['bytes'] or sha(raw) != meta['sha256']:
            raise ValueError('Encoded shard checksum mismatch.')
        tensor = torch.frombuffer(bytearray(raw), dtype=torch.float32).clone().reshape(count, RECORD_SIZE)
        if (not torch.isfinite(tensor).all() or not ((tensor[:, :INPUT_SIZE] >= 0) & (tensor[:, :INPUT_SIZE] <= 1)).all()
                or not ((tensor[:, INPUT_SIZE] == 0) | (tensor[:, INPUT_SIZE] == 1)).all()):
            raise ValueError('Invalid encoded features or labels.')
        offset = 0
        for row in selected:
            weights = tensor[offset:offset + row['examples'], INPUT_SIZE + 1]
            if not torch.allclose(weights, torch.full_like(weights, 1 / row['examples']), rtol=1e-6, atol=1e-9):
                raise ValueError('Round weights do not match round length.')
            offset += row['examples']
        data[split] = tensor
    return m, sha(raw_manifest), data
