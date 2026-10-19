import hashlib
import json
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'training'))

class RankingIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory(prefix='mahbusa-ranking-');cls.base=Path(cls.temp.name)
        for cmd in [
            ['node','scripts/self-play-bot.mjs','--seed','prep-fixture','--rounds','6','--record-turns','true','--out',str(cls.base/'source')],
            ['node','scripts/prepare-training.mjs','--dataset',str(cls.base/'source'),'--out',str(cls.base/'data'),'--seed','fixture-split','--teacher','strategy','--turns-per-round','8','--ranking','true'],
        ]:
            p=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,timeout=60)
            if p.returncode:raise AssertionError(p.stderr)

    @classmethod
    def tearDownClass(cls):cls.temp.cleanup()

    def test_actual_pair_shards_are_checked_against_groups_targets_and_round_weights(self):
        from data import load_prepared
        m,_,data=load_prepared(self.base/'data')
        self.assertEqual(m['version'],3)
        for split in ['train','validation']:
            pairs=data['pairs'][split]
            self.assertGreater(len(pairs['indices']),0)
            self.assertEqual(pairs['indices'].shape[1],2)
            self.assertTrue((pairs['values'][:,2]>0).all())
            self.assertTrue((pairs['indices']<len(data[split])).all())

    def test_rehashed_pair_index_sign_gap_weight_and_group_corruption_are_refused(self):
        from data import load_prepared
        for kind in ['index','cross-group','sign','gap','nonfinite','weight','group','format']:
            data=self.base/('bad-'+kind);shutil.copytree(self.base/'data',data)
            path=data/'manifest.json';m=json.loads(path.read_text());meta=m['pairs']['train'];bpath=data/meta['path'];raw=bytearray(bpath.read_bytes())
            if kind=='index':struct.pack_into('<I',raw,0,m['train']['examples'])
            elif kind=='cross-group':struct.pack_into('<I',raw,0,len(m['rounds'][0]['groups'][0]['signs']))
            elif kind=='nonfinite':struct.pack_into('<f',raw,16,float('nan'))
            elif kind=='sign':struct.pack_into('<f',raw,8,-struct.unpack_from('<f',raw,8)[0])
            elif kind=='gap':struct.pack_into('<f',raw,16,-1)
            elif kind=='weight':struct.pack_into('<f',raw,20,1)
            elif kind=='group':m['rounds'][0]['groups'][0]['signs'].append(1)
            else:m['pairs']['format']='unknown'
            bpath.write_bytes(raw);meta['sha256']=hashlib.sha256(raw).hexdigest();path.write_text(json.dumps(m))
            with self.assertRaises(ValueError,msg=kind):load_prepared(data)

    def run_train(self,name,*flags,data=None,epochs=1):
        return subprocess.run([sys.executable,'-B','training/train.py','--data',str(data or self.base/'data'),
            '--out',str(self.base/name),'--epochs',str(epochs),*flags],cwd=ROOT,capture_output=True,text=True,timeout=60)

    def test_preference_loss_gradient_uses_root_perspective_and_gap_weights(self):
        import torch
        import ranking
        self.assertTrue(callable(getattr(ranking,'preference_loss',None)),'Missing ranking loss')
        values=torch.tensor([[-1.,-1.,1.,1.]])
        zero=torch.zeros((1,2),requires_grad=True)
        loss=ranking.preference_loss(zero,values);loss.backward()
        self.assertGreater(zero.grad[0,0].item(),0);self.assertLess(zero.grad[0,1].item(),0)
        good=ranking.preference_loss(torch.tensor([[-1.,1.]]),values)
        bad=ranking.preference_loss(torch.tensor([[1.,-1.]]),values)
        self.assertLess(good,loss);self.assertLess(loss,bad)
        mixed=torch.zeros((1,2),requires_grad=True);ranking.preference_loss(mixed,torch.tensor([[1.,-1.,.4,1.]])).backward()
        self.assertTrue((mixed.grad<0).all())
        logits=torch.tensor([[.2,.4],[-.1,.8]])
        values=torch.tensor([[1.,-1.,1.,.5],[-1.,-1.,.1,1.]])
        importance=values[:,2]*values[:,3]
        delta=(logits*values[:,:2]*torch.tensor([1.,-1.])).sum(1)
        expected=(torch.nn.functional.softplus(values[:,2]-delta)*importance).sum()/importance.sum()
        self.assertTrue(torch.allclose(ranking.preference_loss(logits,values),expected))

    def test_actual_ranking_training_and_zero_weight_legacy_control(self):
        result=self.run_train('ranked','--seed','123','--ranking-weight','1',epochs=2)
        self.assertEqual(result.returncode,0,result.stderr);r=json.loads(result.stdout)
        self.assertEqual(r['rankingWeight'],1);self.assertEqual(r['valueKind'],'heuristic')
        self.assertLess(r['history'][-1]['train']['objective'],r['initial']['train']['objective'])
        losses=[r['initial']['validation']['objective']]+[h['validation']['objective'] for h in r['history']]
        self.assertEqual(r['bestEpoch'],min(range(len(losses)),key=losses.__getitem__))
        checked=subprocess.run(['node','scripts/check-teacher-ranking.mjs','--data',str(self.base/'data'),'--model',str(self.base/'ranked')],cwd=ROOT,capture_output=True,text=True,timeout=30)
        self.assertEqual(checked.returncode,0,checked.stderr)
        legacy=self.base/'legacy'
        p=subprocess.run(['node','scripts/prepare-training.mjs','--dataset',str(self.base/'source'),'--out',str(legacy),'--seed','fixture-split','--teacher','strategy','--turns-per-round','8'],cwd=ROOT,capture_output=True,text=True,timeout=30)
        self.assertEqual(p.returncode,0,p.stderr)
        a=self.run_train('control','--seed','123','--ranking-weight','0',epochs=2)
        b=self.run_train('legacy-control','--seed','123',data=legacy,epochs=2)
        for p in [a,b]:self.assertEqual(p.returncode,0,p.stderr)
        self.assertEqual((self.base/'control/weights.bin').read_bytes(),(self.base/'legacy-control/weights.bin').read_bytes())
        invalid=self.run_train('legacy-invalid','--ranking-weight','1',data=legacy)
        self.assertNotEqual(invalid.returncode,0);self.assertFalse((self.base/'legacy-invalid').exists())
        warm=self.run_train('rank-warm','--warm-start',str(self.base/'ranked'),'--ranking-weight','0')
        self.assertEqual(warm.returncode,0,warm.stderr)
        self.assertEqual(json.loads(warm.stdout)['initial']['train']['bce'],r['selected']['train']['bce'])

    def test_exact_ranking_resume_retains_best_before_last_and_refuses_changed_weight(self):
        first=self.run_train('resume-parent','--seed','123','--learning-rate','.1','--ranking-weight','1')
        self.assertEqual(first.returncode,0,first.stderr);parent=json.loads(first.stdout)
        self.assertLess(parent['bestEpoch'],parent['epochs'])
        resumed=self.run_train('resumed','--resume',str(self.base/'resume-parent'))
        full=self.run_train('full','--seed','123','--learning-rate','.1','--ranking-weight','1',epochs=2)
        for p in [resumed,full]:self.assertEqual(p.returncode,0,p.stderr)
        self.assertEqual(json.loads(resumed.stdout)['rankingWeight'],1)
        self.assertEqual(json.loads(resumed.stdout)['history'],json.loads(full.stdout)['history'])
        self.assertEqual((self.base/'resumed/weights.bin').read_bytes(),(self.base/'full/weights.bin').read_bytes())
        import torch
        def snapshot(name):
            pointer=json.loads((self.base/name/'resume.json').read_text())
            return torch.load(self.base/name/pointer['path'],weights_only=True,map_location='cpu')
        a,b=snapshot('resumed'),snapshot('full')
        for key in ['pair_generator_state','generator_state']:
            self.assertTrue(torch.equal(a[key],b[key]),key)
        for key in a['state_dict']:self.assertTrue(torch.equal(a['state_dict'][key],b['state_dict'][key]),key)
        for kind in ['missing-pair-rng','objective']:
            parent=self.base/kind;shutil.copytree(self.base/'resume-parent',parent)
            pointer=json.loads((parent/'resume.json').read_text());path=parent/pointer['path']
            state=torch.load(path,weights_only=True,map_location='cpu')
            if kind=='missing-pair-rng':del state['pair_generator_state']
            else:state['initial']['validation']['objective']+=1
            torch.save(state,path);raw=path.read_bytes();pointer.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
            (parent/'resume.json').write_text(json.dumps(pointer))
            refused=self.run_train('bad-'+kind,'--resume',str(parent))
            self.assertNotEqual(refused.returncode,0);self.assertFalse((self.base/('bad-'+kind)).exists())
        changed=self.run_train('changed','--resume',str(self.base/'resume-parent'),'--ranking-weight','0')
        self.assertNotEqual(changed.returncode,0);self.assertFalse((self.base/'changed').exists())
        for value in ['nan','-1','11']:
            p=self.run_train('invalid-'+value,'--ranking-weight',value)
            self.assertNotEqual(p.returncode,0);self.assertFalse((self.base/('invalid-'+value)).exists())

    def test_interrupted_ranked_epoch_restores_previous_pair_rng_and_exact_last_state(self):
        import argparse,contextlib,io
        from unittest.mock import patch
        import train
        first=self.run_train('crash-parent','--seed','321','--ranking-weight','1')
        self.assertEqual(first.returncode,0,first.stderr)
        out=self.base/'crashed'
        args=argparse.Namespace(data=self.base/'data',out=out,epochs=2,batch_size=None,seed=None,learning_rate=None,ranking_weight=None,resume=self.base/'crash-parent',warm_start=None)
        real_save=train.torch.save
        def save(value,path,*args,**kwargs):
            if 'epoch-000003' in str(path):raise OSError('injected ranked epoch failure')
            return real_save(value,path,*args,**kwargs)
        with patch.object(train.torch,'save',side_effect=save),contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(RuntimeError,'ranked epoch failure'):train.train(args)
        self.assertEqual(json.loads((out/'resume.json').read_text())['epoch'],2)
        recovered=self.run_train('crash-recovered','--resume',str(out))
        full=self.run_train('crash-full','--seed','321','--ranking-weight','1',epochs=3)
        for p in [recovered,full]:self.assertEqual(p.returncode,0,p.stderr)
        self.assertEqual(json.loads(recovered.stdout)['history'],json.loads(full.stdout)['history'])
        def state(name):
            p=json.loads((self.base/name/'resume.json').read_text())
            return train.torch.load(self.base/name/p['path'],weights_only=True,map_location='cpu')
        a,b=state('crash-recovered'),state('crash-full')
        self.assertTrue(train.torch.equal(a['pair_generator_state'],b['pair_generator_state']))
        for key in a['state_dict']:self.assertTrue(train.torch.equal(a['state_dict'][key],b['state_dict'][key]))
