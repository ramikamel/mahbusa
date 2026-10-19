import argparse
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import shlex
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
NODE = os.environ.get('NODE', 'node')


class UnsafeCheckpoint:
    def __init__(self, marker):
        self.marker = marker

    def __reduce__(self):
        return os.system, ('touch ' + shlex.quote(str(self.marker)),)


class ContinuationIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix='mahbusa-continuation-')
        cls.base = Path(cls.temporary.name)
        cls.data = cls.base / 'data'
        cls.parent = cls.base / 'parent'
        for command in [
            [NODE, 'scripts/self-play-bot.mjs', '--seed', 'prep-fixture', '--rounds', '6', '--out', str(cls.base / 'source')],
            [NODE, 'scripts/prepare-training.mjs', '--dataset', str(cls.base / 'source'), '--out', str(cls.data), '--seed', 'fixture-split'],
            [sys.executable, '-B', 'training/train.py', '--data', str(cls.data), '--out', str(cls.parent), '--epochs', '1', '--seed', '123'],
        ]:
            result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=60)
            if result.returncode:
                raise AssertionError(result.stderr)

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def run_train(self, name, *flags, epochs=1, data=None):
        return subprocess.run([sys.executable, '-B', 'training/train.py', '--data', str(data or self.data),
                               '--out', str(self.base / name), '--epochs', str(epochs), *flags],
                              cwd=ROOT, capture_output=True, text=True, timeout=60)

    def test_exact_resume_restores_last_state_rng_and_best_history(self):
        parent = json.loads((self.parent / 'training.json').read_text())
        self.assertLess(parent['bestEpoch'], parent['epochs'])  # Last weights differ from the selected best.
        resumed = self.run_train('resumed', '--resume', str(self.parent))
        self.assertEqual(resumed.returncode, 0, resumed.stderr)
        full = self.run_train('full', '--seed', '123', epochs=2)
        self.assertEqual(full.returncode, 0, full.stderr)
        a, b = json.loads(resumed.stdout), json.loads(full.stdout)
        self.assertEqual(a['seed'], 123)  # Inherit, not the fresh default seed.
        self.assertEqual(a['mode'], 'resume')
        self.assertEqual(a['epochs'], 2)
        self.assertEqual(a['history'], b['history'])
        self.assertEqual(a['bestEpoch'], b['bestEpoch'])
        self.assertEqual(a['initial'], b['initial'])
        self.assertEqual((self.base / 'resumed/weights.bin').read_bytes(), (self.base / 'full/weights.bin').read_bytes())
        pointer = json.loads((self.base / 'resumed/resume.json').read_text())
        checkpoint = (self.base / 'resumed' / pointer['path']).read_bytes()
        self.assertEqual(pointer['epoch'], 2)
        self.assertEqual(pointer['sha256'], hashlib.sha256(checkpoint).hexdigest())

    def test_warm_start_uses_selected_weights_with_fresh_optimizer_and_split_history(self):
        result = self.run_train('warm', '--warm-start', str(self.parent), '--seed', '456')
        self.assertEqual(result.returncode, 0, result.stderr)
        report, parent = json.loads(result.stdout), json.loads((self.parent / 'training.json').read_text())
        self.assertEqual(report['mode'], 'warm-start')
        self.assertEqual(report['initial'], parent['selected'])
        self.assertEqual(report['epochs'], 1)
        self.assertEqual(len(report['history']), 1)
        self.assertEqual(report['initialization']['parentModelSha256'], parent['modelSha256'])
        self.assertEqual(report['splitHistory'], parent['splitHistory'])
        self.assertNotEqual(self.run_train('both-flags', '--resume', str(self.parent), '--warm-start', str(self.parent)).returncode, 0)
        self.assertFalse((self.base / 'both-flags').exists())

    def test_refuses_changed_data_config_environment_and_corrupt_checkpoint(self):
        for name, flags in [('seed', ['--seed', '456']), ('batch', ['--batch-size', '8']), ('lr', ['--learning-rate', '.01'])]:
            result = self.run_train('bad-' + name, '--resume', str(self.parent), *flags)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse((self.base / ('bad-' + name)).exists())
        data = self.base / 'changed-data'
        shutil.copytree(self.data, data)
        manifest = json.loads((data / 'manifest.json').read_text())
        manifest['sourceDirty'] = not manifest['sourceDirty']
        (data / 'manifest.json').write_text(json.dumps(manifest))
        self.assertNotEqual(self.run_train('bad-data', '--resume', str(self.parent), data=data).returncode, 0)
        self.assertFalse((self.base / 'bad-data').exists())
        for kind in ['checksum', 'environment', 'path']:
            parent = self.base / ('parent-' + kind)
            shutil.copytree(self.parent, parent)
            pointer = json.loads((parent / 'resume.json').read_text())
            if kind == 'checksum':
                (parent / pointer['path']).write_bytes(b'corrupt')
            elif kind == 'environment':
                pointer['environment']['torchVersion'] = 'different'
            else:
                pointer['path'] = '../parent/resume.json'
            (parent / 'resume.json').write_text(json.dumps(pointer))
            result = self.run_train('bad-' + kind, '--resume', str(parent))
            self.assertNotEqual(result.returncode, 0, kind)
            self.assertFalse((self.base / ('bad-' + kind)).exists())

    def test_warm_start_refuses_a_round_moving_across_train_validation(self):
        other = self.base / 'other-split'
        prepared = subprocess.run([NODE, 'scripts/prepare-training.mjs', '--dataset', str(self.base / 'source'),
                                   '--out', str(other), '--seed', 'other-fixture-split'], cwd=ROOT,
                                  capture_output=True, text=True, timeout=30)
        self.assertEqual(prepared.returncode, 0, prepared.stderr)
        result = self.run_train('leaked-split', '--warm-start', str(self.parent), data=other)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('split', result.stderr.lower())
        self.assertFalse((self.base / 'leaked-split').exists())

    def test_failed_next_epoch_retains_previous_pointer_and_recovers_exactly(self):
        sys.path.insert(0, str(ROOT / 'training'))
        import train
        out = self.base / 'failed-epoch'
        args = argparse.Namespace(data=self.data, out=out, epochs=2, batch_size=None, seed=None, learning_rate=None,
                                  resume=self.parent, warm_start=None)
        real_save = train.torch.save
        def save(value, path, *args, **kwargs):
            if 'epoch-000003' in str(path):
                raise OSError('injected next epoch write failure')
            return real_save(value, path, *args, **kwargs)
        with patch.object(train.torch, 'save', side_effect=save), contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(RuntimeError, 'next epoch write failure'):
                train.train(args)
        self.assertEqual(json.loads((out / 'training.json').read_text())['status'], 'failed')
        pointer = json.loads((out / 'resume.json').read_text())
        self.assertEqual(pointer['epoch'], 2)
        self.assertEqual(hashlib.sha256((out / pointer['path']).read_bytes()).hexdigest(), pointer['sha256'])
        recovered = self.run_train('recovered', '--resume', str(out))
        full = self.run_train('full-three', '--seed', '123', epochs=3)
        self.assertEqual(recovered.returncode, 0, recovered.stderr)
        self.assertEqual(full.returncode, 0, full.stderr)
        self.assertEqual(json.loads(recovered.stdout)['history'], json.loads(full.stdout)['history'])
        self.assertEqual((self.base / 'recovered/weights.bin').read_bytes(), (self.base / 'full-three/weights.bin').read_bytes())

    def test_refuses_object_loading_without_executing_pickle_payload(self):
        import torch
        parent = self.base / 'unsafe-parent'
        shutil.copytree(self.parent, parent)
        pointer = json.loads((parent / 'resume.json').read_text())
        marker = self.base / 'must-not-execute'
        torch.save(UnsafeCheckpoint(marker), parent / pointer['path'])
        raw = (parent / pointer['path']).read_bytes()
        pointer.update(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
        (parent / 'resume.json').write_text(json.dumps(pointer))
        result = self.run_train('unsafe-output', '--resume', str(parent))
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(marker.exists(), 'Checkpoint object code executed.')
        self.assertFalse((self.base / 'unsafe-output').exists())

    def test_pool_outcomes_reach_actual_warm_start_learner(self):
        pool = self.base / 'pool.json'
        pool.write_text(json.dumps({'format': 'mahbusa-opponent-pool', 'version': 1,
            'entrants': [{'key': 'strategy', 'policy': 'strategy'}, {'key': 'current', 'policy': 'model', 'model': 'parent'}],
            'matchups': [{'a': 'strategy', 'b': 'strategy', 'weight': 1}, {'a': 'strategy', 'b': 'current', 'weight': 1}]}))
        source, prepared = self.base / 'pool-source', self.base / 'pool-data'
        for command in [
            [NODE, 'scripts/self-play-bot.mjs', '--pool', str(pool), '--seed', 'pool-fixture', '--rounds', '6', '--out', str(source)],
            [NODE, 'scripts/prepare-training.mjs', '--dataset', str(source), '--out', str(prepared), '--seed', 'fixture-split'],
        ]:
            result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=60)
            self.assertEqual(result.returncode, 0, result.stderr)
        result = self.run_train('pool-candidate', '--warm-start', str(self.parent), data=prepared)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(len(report['splitHistory']), 12)
        self.assertEqual(report['validationRounds'], 2)
        self.assertEqual(json.loads((prepared / 'manifest.json').read_text())['sourceDataset']['version'], 2)


if __name__ == '__main__':
    unittest.main()
