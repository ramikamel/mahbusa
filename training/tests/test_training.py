import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
NODE = os.environ.get('NODE', 'node')


class TrainingIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix='mahbusa-training-')
        cls.base = Path(cls.temporary.name)
        source = cls.base / 'source'
        for args in [
            [NODE, str(ROOT / 'scripts/self-play-bot.mjs'), '--seed', 'prep-fixture', '--rounds', '6', '--out', str(source)],
            [NODE, str(ROOT / 'scripts/prepare-training.mjs'), '--dataset', str(source), '--out', str(cls.base / 'data'), '--seed', 'fixture-split'],
        ]:
            result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, timeout=60)
            if result.returncode:
                raise AssertionError(result.stderr)

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def run_train(self, out, *args, data=None):
        return subprocess.run([sys.executable, '-B', str(ROOT / 'training/train.py'), '--data', str(data or self.base / 'data'),
                               '--out', str(out), '--epochs', '2', '--seed', '123', *args],
                              cwd=ROOT, capture_output=True, text=True, timeout=60)

    def test_actual_cpu_training_exports_checked_weights_with_repeatable_hash_and_ts_parity(self):
        a, b = self.base / 'run-a', self.base / 'run-b'
        result = self.run_train(a)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['status'], 'complete')
        self.assertEqual(report['device'], 'cpu')
        self.assertEqual(len(report['history']), 2)
        self.assertLess(report['history'][-1]['train']['bce'], report['initial']['train']['bce'])
        self.assertLessEqual(report['selected']['validation']['bce'], report['initial']['validation']['bce'])
        self.assertIn(report['bestEpoch'], [0, 1, 2])
        self.assertEqual(report['trainRounds'], 4)
        self.assertEqual(report['validationRounds'], 2)
        manifest = json.loads((a / 'model.json').read_text())
        weights = (a / 'weights.bin').read_bytes()
        self.assertEqual(len(weights), 120324)
        self.assertEqual(hashlib.sha256(weights).hexdigest(), manifest['sha256'])
        self.assertEqual(manifest['status'], 'experimental')
        self.assertEqual(manifest['hiddenSizes'], [128, 128])
        parity = subprocess.run([NODE, str(ROOT / 'scripts/verify-model-parity.mjs'), '--model', str(a)], cwd=ROOT,
                                capture_output=True, text=True, timeout=20)
        self.assertEqual(parity.returncode, 0, parity.stderr)
        checked = json.loads(parity.stdout)
        self.assertGreater(checked['count'], 10)
        self.assertLessEqual(checked['maxAbsoluteError'], 0.00005)
        # An actual exported network must become an opponent, not only a predictor.
        benchmark = subprocess.run([NODE, str(ROOT / 'scripts/benchmark-bot.mjs'), '--pairs', '1', '--max-turns', '1',
                                    '--a', 'model', '--a-model', str(a)], cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(benchmark.returncode, 2, benchmark.stderr)
        self.assertEqual(json.loads(benchmark.stdout)['policies'][0], 'nn-greedy-v1/' + manifest['sha256'])
        dataset = self.base / 'model-cutoff'
        self_play = subprocess.run([NODE, str(ROOT / 'scripts/self-play-bot.mjs'), '--rounds', '1', '--max-turns', '1',
                                    '--policy', 'model', '--model', str(a), '--out', str(dataset)],
                                   cwd=ROOT, capture_output=True, text=True, timeout=30)
        self.assertEqual(self_play.returncode, 2, self_play.stderr)
        self.assertEqual(json.loads(self_play.stdout)['modelArtifact']['weightsSha256'], manifest['sha256'])
        self.assertEqual((dataset / 'rounds.jsonl').read_bytes(), b'')
        repeated = self.run_train(b)
        self.assertEqual(repeated.returncode, 0, repeated.stderr)
        self.assertEqual((b / 'weights.bin').read_bytes(), weights)
        self.assertEqual(json.loads((b / 'training.json').read_text())['history'], report['history'])
        refused = self.run_train(a)
        self.assertNotEqual(refused.returncode, 0)
        self.assertEqual((a / 'weights.bin').read_bytes(), weights)

    def test_refuses_corrupt_or_incomplete_encoded_data(self):
        import shutil
        for kind in ['status', 'checksum', 'schema', 'split']:
            data = self.base / ('bad-data-' + kind)
            shutil.copytree(self.base / 'data', data)
            manifest = json.loads((data / 'manifest.json').read_text())
            if kind == 'status':
                manifest['status'] = 'running'
            elif kind == 'schema':
                manifest['featureSchemaVersion'] = 'unknown'
            elif kind == 'split':
                manifest['rounds'][-1]['seed'] = manifest['rounds'][0]['seed']
            else:
                path = data / 'train.f32'
                content = bytearray(path.read_bytes())
                content[0] ^= 1
                path.write_bytes(content)
            (data / 'manifest.json').write_text(json.dumps(manifest))
            out = self.base / ('invalid-run-' + kind)
            result = self.run_train(out, data=data)
            self.assertNotEqual(result.returncode, 0, kind)
            self.assertFalse((out / 'model.json').exists())

    def test_validates_finite_bounded_options(self):
        for args in [('--epochs', '0'), ('--batch-size', '0'), ('--learning-rate', 'nan'), ('--learning-rate', '2'), ('--seed', '-1')]:
            out = self.base / ('bad-options-' + args[0][2:])
            self.assertNotEqual(self.run_train(out, *args).returncode, 0)

    def test_export_failure_marks_partial_files_failed_and_parity_refuses_them(self):
        import argparse
        import contextlib
        import io
        from unittest.mock import patch
        sys.path.insert(0, str(ROOT / 'training'))
        import train
        out = self.base / 'failed-export'
        args = argparse.Namespace(data=self.base / 'data', out=out, epochs=1, batch_size=256, seed=123, learning_rate=.001)
        real_save = train.torch.save
        def save(value, path, *args, **kwargs):
            if Path(path).name == 'checkpoint.pt':
                raise OSError('injected export write failure')
            return real_save(value, path, *args, **kwargs)
        with patch.object(train.torch, 'save', side_effect=save):
            with contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaisesRegex(RuntimeError, 'export write failure'):
                    train.train(args)
        self.assertEqual(json.loads((out / 'training.json').read_text())['status'], 'failed')
        self.assertTrue((out / 'model.json').exists())
        result = subprocess.run([NODE, str(ROOT / 'scripts/verify-model-parity.mjs'), '--model', str(out)],
                                capture_output=True, text=True, timeout=20)
        self.assertNotEqual(result.returncode, 0)


if __name__ == '__main__':
    unittest.main()
