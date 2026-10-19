import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[2]

class TeacherIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory(prefix='mahbusa-teacher-')
        cls.base=Path(cls.temp.name)
        for command in [
            ['node','scripts/self-play-bot.mjs','--seed','prep-fixture','--rounds','6','--out',str(cls.base/'source')],
            ['node','scripts/prepare-training.mjs','--dataset',str(cls.base/'source'),'--out',str(cls.base/'data'),'--seed','fixture-split','--teacher','strategy','--turns-per-round','3'],
        ]:
            p=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=60)
            if p.returncode: raise AssertionError(p.stderr)

    @classmethod
    def tearDownClass(cls): cls.temp.cleanup()

    def run_train(self,name,*flags,data=None,epochs=1):
        return subprocess.run([sys.executable,'-B','training/train.py','--data',str(data or self.base/'data'),'--out',str(self.base/name),'--epochs',str(epochs),*flags],cwd=ROOT,capture_output=True,text=True,timeout=60)

    def test_soft_teacher_trains_resumes_exactly_and_exports_heuristic_parity(self):
        parent=self.run_train('parent','--seed','42')
        self.assertEqual(parent.returncode,0,parent.stderr)
        report=json.loads(parent.stdout)
        self.assertEqual(report['targetKind'],'strategy-soft-value-v1')
        self.assertEqual(report['valueKind'],'heuristic')
        self.assertEqual(report['teacher']['id'],'strategy-v1')
        self.assertEqual(json.loads((self.base/'parent/model.json').read_text())['valueKind'],'heuristic')
        self.assertLess(report['history'][-1]['train']['bce'],report['initial']['train']['bce'])
        resumed=self.run_train('resumed','--resume',str(self.base/'parent'))
        full=self.run_train('full','--seed','42',epochs=2)
        for p in [resumed,full]: self.assertEqual(p.returncode,0,p.stderr)
        self.assertEqual(json.loads(resumed.stdout)['history'],json.loads(full.stdout)['history'])
        self.assertEqual((self.base/'resumed/weights.bin').read_bytes(),(self.base/'full/weights.bin').read_bytes())
        checked=subprocess.run(['node','scripts/check-teacher-ranking.mjs','--data',str(self.base/'data'),'--model',str(self.base/'resumed')],cwd=ROOT,capture_output=True,text=True,timeout=30)
        self.assertEqual(checked.returncode,0,checked.stderr)
        ranking=json.loads(checked.stdout)
        self.assertEqual(ranking['turns'],6)
        self.assertEqual(ranking['rounds'],2)
        self.assertGreaterEqual(ranking['meanTeacherRegret'],0)
        self.assertEqual(ranking['modelArtifact']['weightsSha256'],json.loads(full.stdout)['modelSha256'])
        warm=self.run_train('warm','--warm-start',str(self.base/'parent'))
        self.assertEqual(warm.returncode,0,warm.stderr)
        self.assertEqual(json.loads(warm.stdout)['initial'],report['selected'])
        report['splitHistory'][0]['split']='train'
        validation_seed=json.loads((self.base/'data/manifest.json').read_text())['rounds'][4]['seed']
        report['splitHistory'].append({'seed':validation_seed,'split':'train'})
        (self.base/'parent/training.json').write_text(json.dumps(report))
        leaked=subprocess.run(['node','scripts/check-teacher-ranking.mjs','--data',str(self.base/'data'),'--model',str(self.base/'parent')],cwd=ROOT,capture_output=True,text=True,timeout=30)
        self.assertNotEqual(leaked.returncode,0)
        self.assertIn('used to train',leaked.stderr)

    def test_invalid_teacher_and_soft_outcome_schema_fail_before_output(self):
        for kind in ['teacher','version','audit','audit-round']:
            data=self.base/('data-'+kind);shutil.copytree(self.base/'data',data)
            path=data/'manifest.json';m=json.loads(path.read_text())
            if kind=='teacher': m['teacher']['id']='unregistered'
            elif kind=='version':
                m['version']=1;del m['teacher'];del m['validationTurns']
            elif kind=='audit': (data/m['validationTurns']['path']).write_text('corrupted')
            else:
                audit=data/m['validationTurns']['path'];rows=[json.loads(line) for line in audit.read_text().splitlines()]
                rows[0]['roundIndex']=0
                raw=('\n'.join(json.dumps(r) for r in rows)+'\n').encode();audit.write_bytes(raw)
                m['validationTurns'].update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
            path.write_text(json.dumps(m))
            p=self.run_train('bad-'+kind,data=data)
            self.assertNotEqual(p.returncode,0,kind);self.assertFalse((self.base/('bad-'+kind)).exists())
