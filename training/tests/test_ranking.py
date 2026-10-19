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
