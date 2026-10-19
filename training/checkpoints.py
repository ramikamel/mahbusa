"""Checked epoch recovery and selected-model initialization; no game rules."""
import hashlib
import io
import json
import math
import os
from pathlib import Path
import platform
import subprocess
import sys

import torch
from data import digest, integer

ROOT = Path(__file__).resolve().parents[1]


def sha(content):
    return hashlib.sha256(content).hexdigest()


def environment():
    return {'torchVersion': str(torch.__version__), 'pythonVersion': sys.version, 'platform': platform.platform()}


def atomic_json(path, value):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')
    temporary.replace(path)


def split_history(previous, rounds):
    if not isinstance(previous, list) or len(previous) > 100000:
        raise ValueError('Invalid split history; legacy exports must be recreated before warm start.')
    seen = {}
    for row in previous:
        if not isinstance(row, dict) or not digest(row.get('seed')) or row.get('split') not in ['train', 'validation'] or row['seed'] in seen:
            raise ValueError('Invalid duplicate split history.')
        seen[row['seed']] = row['split']
    for row in rounds:
        if row['seed'] in seen and seen[row['seed']] != row['split']:
            raise ValueError('Round cannot move across training/validation split history.')
        seen[row['seed']] = row['split']
    if len(seen) > 100000:
        raise ValueError('Split history limit exceeded.')
    return [{'seed': seed, 'split': seen[seed]} for seed in sorted(seen)]


def finite_tree(value):
    if isinstance(value, torch.Tensor):
        if not torch.isfinite(value).all():
            raise ValueError('Nonfinite checkpoint tensor.')
    elif isinstance(value, float) and not math.isfinite(value):
        raise ValueError('Nonfinite checkpoint number.')
    elif isinstance(value, dict):
        for item in value.values():
            finite_tree(item)
    elif isinstance(value, (list, tuple)):
        for item in value:
            finite_tree(item)


def save_resume(out, state):
    directory = out / 'resume'
    directory.mkdir(exist_ok=True)
    relative = f"resume/epoch-{state['epoch']:06d}.pt"
    target = out / relative
    temporary = target.with_suffix('.pt.tmp')
    torch.save(state, temporary)
    temporary.replace(target)
    raw = target.read_bytes()
    pointer = {'format': 'mahbusa-training-resume', 'version': 1, 'status': 'complete', 'path': relative,
               'epoch': state['epoch'], 'bytes': len(raw), 'sha256': sha(raw),
               'preparedManifestSha256': state['preparedManifestSha256'], 'config': state['config'], 'environment': state['environment']}
    atomic_json(out / 'resume.json', pointer)
    return pointer


def load_resume(directory, data_hash):
    directory = Path(directory)
    pointer_bytes = (directory / 'resume.json').read_bytes()
    p = json.loads(pointer_bytes)
    if (p.get('format') != 'mahbusa-training-resume' or p.get('version') != 1 or p.get('status') != 'complete'
            or not integer(p.get('epoch'), 1, 1000) or p.get('path') != f"resume/epoch-{p['epoch']:06d}.pt"
            or not integer(p.get('bytes'), 1, 16 * 1024 * 1024) or not digest(p.get('sha256'))
            or p.get('preparedManifestSha256') != data_hash or p.get('environment') != environment()):
        raise ValueError('Invalid or incompatible resume data/environment/pointer.')
    raw = (directory / p['path']).read_bytes()
    if len(raw) != p['bytes'] or sha(raw) != p['sha256']:
        raise ValueError('Resume checkpoint checksum mismatch.')
    state = torch.load(io.BytesIO(raw), map_location='cpu', weights_only=True)
    if (not isinstance(state, dict) or state.get('format') != 'mahbusa-epoch-state' or state.get('version') != 1
            or state.get('epoch') != p['epoch'] or state.get('preparedManifestSha256') != data_hash
            or state.get('environment') != p['environment'] or state.get('config') != p.get('config')):
        raise ValueError('Resume state does not match its pointer.')
    config = state['config']
    if (not isinstance(config, dict) or not integer(config.get('seed'), 0, 2**32-1)
            or not integer(config.get('batchSize'), 1, 65536) or not isinstance(config.get('learningRate'), (float, int))
            or not 0 < config['learningRate'] <= 1):
        raise ValueError('Invalid resume configuration.')
    finite_tree(state)
    history, initial = state.get('history'), state.get('initial')
    if not isinstance(history, list) or len(history) != p['epoch'] or not isinstance(initial, dict):
        raise ValueError('Invalid resume metric history.')
    losses = []
    for index, row in enumerate([{'epoch': 0, **initial}, *history]):
        if row.get('epoch') != index:
            raise ValueError('Invalid resume epoch history.')
        for split in ['train', 'validation']:
            metrics = row.get(split, {})
            if any(type(metrics.get(key)) not in (float, int) or not math.isfinite(metrics[key]) or metrics[key] < 0 for key in ['bce', 'brier']):
                raise ValueError('Invalid resume metrics.')
        losses.append(row['validation']['bce'])
    best = min(range(len(losses)), key=losses.__getitem__)
    if state.get('bestEpoch') != best or state.get('bestLoss') != losses[best]:
        raise ValueError('Resume best checkpoint does not match history.')
    state['splitHistory'] = split_history(state.get('splitHistory'), [])
    return state, {'checkpointSha256': p['sha256'], 'pointerSha256': sha(pointer_bytes), 'epoch': p['epoch']}


def load_warm_start(directory, model, rounds):
    directory = Path(directory).resolve()
    report_raw = (directory / 'training.json').read_bytes()
    manifest_raw = (directory / 'model.json').read_bytes()
    report, manifest = json.loads(report_raw), json.loads(manifest_raw)
    checked = subprocess.run([os.environ.get('NODE', 'node'), str(ROOT / 'scripts/verify-model-parity.mjs'), '--model', str(directory)],
                             cwd=ROOT, capture_output=True, text=True, timeout=30)
    if checked.returncode:
        raise ValueError('Warm-start model failed the artifact/parity gate: ' + checked.stderr)
    if (report.get('status') != 'complete' or report.get('modelSha256') != manifest.get('sha256')
            or json.loads(checked.stdout)['modelId'] != manifest.get('id')):
        raise ValueError('Warm-start model identity mismatch.')
    history = split_history(report.get('splitHistory'), rounds)
    raw = (directory / 'weights.bin').read_bytes()
    if len(raw) != 120324 or sha(raw) != manifest['sha256']:
        raise ValueError('Warm-start weights changed or corrupted.')
    values = torch.frombuffer(bytearray(raw), dtype=torch.float32).clone()
    if not torch.isfinite(values).all():
        raise ValueError('Nonfinite warm-start weights.')
    state, offset = {}, 0
    for key, tensor in model.state_dict().items():
        state[key] = values[offset:offset + tensor.numel()].reshape(tensor.shape)
        offset += tensor.numel()
    model.load_state_dict(state, strict=True)
    return history, {'mode': 'warm-start', 'parentModelSha256': manifest['sha256'],
                     'parentTrainingReportSha256': sha(report_raw), 'parentManifestSha256': sha(manifest_raw)}


def restore_adam(optimizer, raw, epoch, batches_per_epoch):
    expected = optimizer.state_dict()
    if (not isinstance(raw, dict) or set(raw) != {'state', 'param_groups'}
            or raw['param_groups'] != expected['param_groups'] or not isinstance(raw['state'], dict)):
        raise ValueError('Resume optimizer configuration changed.')
    identities = expected['param_groups'][0]['params']
    if any(type(key) is not int for key in raw['state']) or set(raw['state']) != set(identities):
        raise ValueError('Resume optimizer must cover every parameter exactly.')
    # CPU Adam uses a Float32 scalar counter; repeated +1 saturates at 2**24.
    expected_step = min(epoch * batches_per_epoch, 2**24)
    for identity, parameter in zip(identities, optimizer.param_groups[0]['params']):
        state = raw['state'][identity]
        if not isinstance(state, dict) or set(state) != {'step', 'exp_avg', 'exp_avg_sq'}:
            raise ValueError('Incomplete Adam parameter state.')
        step = state['step']
        if (not isinstance(step, torch.Tensor) or step.dtype != torch.float32 or step.ndim != 0
                or step.item() != expected_step):
            raise ValueError('Adam step does not match completed epochs/minibatches.')
        for key in ['exp_avg', 'exp_avg_sq']:
            value = state[key]
            if (not isinstance(value, torch.Tensor) or value.shape != parameter.shape or value.dtype != parameter.dtype
                    or not torch.isfinite(value).all() or (key == 'exp_avg_sq' and (value < 0).any())):
                raise ValueError('Invalid Adam moment tensor.')
    optimizer.load_state_dict(raw)
