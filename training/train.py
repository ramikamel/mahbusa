"""CPU outcome-value bootstrap or strategy-value distillation. No game rules, position encoding or promotion."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import platform
import struct
import subprocess
import sys
import time
import warnings

# NumPy is optional in PyTorch; this pipeline uses frombuffer/struct, never numpy.
warnings.filterwarnings('ignore', message="Failed to initialize NumPy: No module named 'numpy'.*")
import torch
from torch import nn
from data import INPUT_SIZE, SCHEMA, RULES, load_prepared
from checkpoints import environment, finite_tree, load_resume, load_warm_start, restore_adam, save_resume, split_history

ROOT = Path(__file__).resolve().parents[1]


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')


def metrics(model, data):
    with torch.no_grad():
        logits = model(data[:, :INPUT_SIZE]).flatten()
        target, weight = data[:, INPUT_SIZE], data[:, INPUT_SIZE + 1]
        bce = nn.functional.binary_cross_entropy_with_logits(logits, target, reduction='none')
        probability = torch.sigmoid(logits)
        result = {'bce': ((bce * weight).sum() / weight.sum()).item(),
                  'brier': (((probability - target).square() * weight).sum() / weight.sum()).item()}
        if not all(math.isfinite(v) for v in result.values()):
            raise ValueError('Training produced nonfinite metrics.')
        return result


def train(args):
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)
    manifest, data_hash, data = load_prepared(args.data)
    target_kind = manifest['teacher']['target'] if manifest.get('teacher') else 'round-outcome-v1'
    value_kind = 'heuristic' if manifest.get('teacher') else 'round-win-expectation'
    resume, warm = getattr(args, 'resume', None), getattr(args, 'warm_start', None)
    if resume and warm:
        raise ValueError('Resume and warm start are mutually exclusive.')
    restored, resume_from = load_resume(resume, data_hash) if resume else (None, None)
    for name, key, default in [('seed', 'seed', 20261017), ('batch_size', 'batchSize', 256), ('learning_rate', 'learningRate', .001)]:
        value = getattr(args, name)
        if restored and value is not None and value != restored['config'][key]:
            raise ValueError('Resume configuration cannot change: ' + name)
        setattr(args, name, restored['config'][key] if restored else default if value is None else value)
    first_epoch = restored['epoch'] if restored else 0
    total_epochs = first_epoch + args.epochs
    if total_epochs > 1000:
        raise ValueError('Cumulative epoch limit is 1000.')
    torch.manual_seed(args.seed)
    model = nn.Sequential(nn.Linear(INPUT_SIZE, 128), nn.ReLU(), nn.Linear(128, 128), nn.ReLU(), nn.Linear(128, 1))
    optimizer = torch.optim.Adam(model.parameters(), lr=args.learning_rate)
    generator = torch.Generator().manual_seed(args.seed)
    history = split_history(restored['splitHistory'] if restored else [], manifest['rounds'])
    initialization = restored['initialization'] if restored else {'mode': 'fresh'}
    if warm:
        history, initialization = load_warm_start(warm, model, manifest['rounds'])
    if restored:
        # Validate both states before claiming a new output directory.
        model.load_state_dict(restored['best_state'], strict=True)
        model.load_state_dict(restored['state_dict'], strict=True)
        batches = (len(data['train']) + args.batch_size - 1) // args.batch_size
        restore_adam(optimizer, restored['optimizer_state'], first_epoch, batches)
        generator.set_state(restored['generator_state'])
        torch.set_rng_state(restored['torch_rng_state'])
    out = Path(args.out).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.mkdir()  # Exclusive claim: never replace an earlier run.
    source_revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    source_dirty = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip())
    report = {'format': 'mahbusa-training-run', 'version': 1, 'status': 'running', 'device': 'cpu',
              'targetKind': target_kind, 'valueKind': value_kind, **({'teacher': manifest['teacher']} if manifest.get('teacher') else {}),
              'seed': args.seed, 'epochs': total_epochs, 'batchSize': args.batch_size, 'learningRate': args.learning_rate,
              'mode': 'resume' if restored else initialization['mode'], 'initialization': initialization,
              'splitHistory': history, **({'resumeFrom': resume_from} if restored else {}),
              'torchVersion': torch.__version__, 'pythonVersion': sys.version, 'platform': platform.platform(),
              'sourceRevision': source_revision, 'sourceDirty': source_dirty, 'preparedManifestSha256': data_hash,
              'sourceDatasetSha256': manifest['sourceDataset']['dataset']['sha256'],
              'splitSeed': manifest['splitSeed'], 'featureSchemaVersion': SCHEMA, 'rulesVersion': RULES,
              'trainRounds': manifest['train']['rounds'], 'validationRounds': manifest['validation']['rounds'],
              'trainExamples': manifest['train']['examples'], 'validationExamples': manifest['validation']['examples'],
              'history': restored['history'] if restored else []}
    began = time.monotonic()
    try:
        write_json(out / 'training.json', report)
        training, validation = data['train'], data['validation']
        mean_weight = training[:, INPUT_SIZE + 1].mean()
        report['initial'] = restored['initial'] if restored else {'train': metrics(model, training), 'validation': metrics(model, validation)}
        best_loss = restored['bestLoss'] if restored else report['initial']['validation']['bce']
        best = restored['best_state'] if restored else {k: v.detach().clone() for k, v in model.state_dict().items()}
        report['bestEpoch'] = restored['bestEpoch'] if restored else 0
        for epoch in range(first_epoch + 1, total_epochs + 1):
            order = torch.randperm(len(training), generator=generator)
            for start in range(0, len(training), args.batch_size):
                batch = training[order[start:start + args.batch_size]]
                optimizer.zero_grad(set_to_none=True)
                logits = model(batch[:, :INPUT_SIZE]).flatten()
                per_sample = nn.functional.binary_cross_entropy_with_logits(logits, batch[:, INPUT_SIZE], reduction='none')
                loss = (per_sample * batch[:, INPUT_SIZE + 1]).mean() / mean_weight
                if not torch.isfinite(loss):
                    raise ValueError('Nonfinite training loss.')
                loss.backward()
                optimizer.step()
            row = {'epoch': epoch, 'train': metrics(model, training), 'validation': metrics(model, validation)}
            report['history'].append(row)
            if row['validation']['bce'] < best_loss:
                best_loss = row['validation']['bce']
                best = {k: v.detach().clone() for k, v in model.state_dict().items()}
                report['bestEpoch'] = epoch
            snapshot = {'format': 'mahbusa-epoch-state', 'version': 1, 'epoch': epoch,
                        'preparedManifestSha256': data_hash, 'environment': environment(),
                        'config': {'seed': args.seed, 'batchSize': args.batch_size, 'learningRate': args.learning_rate},
                        'state_dict': model.state_dict(), 'optimizer_state': optimizer.state_dict(),
                        'generator_state': generator.get_state(), 'torch_rng_state': torch.get_rng_state(),
                        'best_state': best, 'bestEpoch': report['bestEpoch'], 'bestLoss': best_loss,
                        'initial': report['initial'], 'history': report['history'], 'splitHistory': history,
                        'initialization': initialization}
            finite_tree(snapshot)
            report['resumeCheckpoint'] = save_resume(out, snapshot)
            print(f"Epoch {epoch}/{total_epochs}: validation BCE {row['validation']['bce']:.6f}", file=sys.stderr)
        model.load_state_dict(best)
        model.eval()
        report['selected'] = {'train': metrics(model, training), 'validation': metrics(model, validation)}
        with torch.no_grad():
            prevalence = ((training[:, INPUT_SIZE] * training[:, INPUT_SIZE + 1]).sum() / training[:, INPUT_SIZE + 1].sum()).item()
            prevalence = min(1 - 1e-6, max(1e-6, prevalence))
            target, weight = validation[:, INPUT_SIZE], validation[:, INPUT_SIZE + 1]
            base_bce = -(target * math.log(prevalence) + (1 - target) * math.log(1 - prevalence))
            report['constantBaseline'] = {'probability': prevalence, 'validationBce': ((base_bce * weight).sum() / weight.sum()).item()}
            floats = [value for layer in [model[0], model[2], model[4]]
                      for tensor in [layer.weight, layer.bias] for value in tensor.flatten().tolist()]
            if len(floats) != 30081 or not all(math.isfinite(v) for v in floats):
                raise ValueError('Invalid export weights.')
            binary = struct.pack('<30081f', *floats)
            checksum = hashlib.sha256(binary).hexdigest()
            model_id = 'bootstrap-v1-' + checksum[:12]
            model_manifest = {'formatVersion': 1, 'id': model_id, 'rulesVersion': RULES, 'featureSchemaVersion': SCHEMA,
                              'valueKind': value_kind, 'inputSize': INPUT_SIZE, 'hiddenSizes': [128, 128], 'outputSize': 1,
                              'architecture': 'dense-relu-sigmoid-v1', 'byteLength': len(binary), 'status': 'experimental', 'sha256': checksum}
            indices = torch.linspace(0, len(validation) - 1, min(128, len(validation))).long()
            probes = torch.cat([validation[indices, :INPUT_SIZE], torch.zeros(1, INPUT_SIZE), torch.ones(1, INPUT_SIZE),
                                torch.rand(32, INPUT_SIZE, generator=torch.Generator().manual_seed(args.seed ^ 0x4D414842))])
            predictions = (2 * torch.sigmoid(model(probes).flatten()) - 1).tolist()
            (out / 'weights.bin').write_bytes(binary)
            write_json(out / 'model.json', model_manifest)
            write_json(out / 'parity.json', {'format': 'mahbusa-model-parity', 'version': 1,
                       'featureSchemaVersion': SCHEMA, 'modelSha256': checksum,
                       'probes': [{'features': x, 'value': y} for x, y in zip(probes.tolist(), predictions)]})
            torch.save({'state_dict': best, 'best_epoch': report['bestEpoch'], 'seed': args.seed}, out / 'checkpoint.pt')
        report.update(status='complete', modelId=model_id, modelSha256=checksum)
    except Exception as error:
        report.update(status='failed', error=str(error))
    report['elapsedSeconds'] = time.monotonic() - began
    write_json(out / 'training.tmp', report)
    (out / 'training.tmp').replace(out / 'training.json')
    print(json.dumps(report, allow_nan=False))
    if report['status'] != 'complete':
        raise RuntimeError(report['error'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--epochs', type=int, default=20)
    parser.add_argument('--batch-size', type=int)
    parser.add_argument('--seed', type=int)
    parser.add_argument('--learning-rate', type=float)
    continuation = parser.add_mutually_exclusive_group()
    continuation.add_argument('--resume')
    continuation.add_argument('--warm-start')
    args = parser.parse_args()
    if (not 1 <= args.epochs <= 1000 or (args.batch_size is not None and not 1 <= args.batch_size <= 65536)
            or (args.seed is not None and not 0 <= args.seed < 2**32)
            or (args.learning_rate is not None and (not math.isfinite(args.learning_rate) or not 0 < args.learning_rate <= 1))):
        parser.error('Invalid finite/bounded training option.')
    try:
        train(args)
    except Exception as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
