#!/usr/bin/env python3
"""Fixture proof only. Never runs systemctl, opens a listener, or accesses Precision.

Usage: python3 prove_void_precision_web_install_v1_1.py --source-checkout PATH
PATH supplies the pinned #1373 verifier and two public payloads. Only a verifier
with the exact embedded SHA is loaded. Actual filesystem publication is tested
inside a private temporary directory; the manager, inventory, and HTTP boundary
are simulated. These tests do not constitute host or independent acceptance.
"""
import argparse
import copy
import importlib.util
import inspect
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ARGS=argparse.ArgumentParser(description=__doc__)
ARGS.add_argument('--source-checkout',type=Path,required=True)
ARGS.add_argument('--installer',type=Path,default=Path(__file__).with_name('void-precision-web-install-v1_1.py'))
OPT=ARGS.parse_args()
SPEC=importlib.util.spec_from_file_location('installer_candidate',OPT.installer)
M=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(M)
VERIFIER=OPT.source_checkout/'ops/public/verify_void_precision_web_preparation_v2.py'
RAW=VERIFIER.read_bytes()
assert len(RAW)==21259 and M.sha(RAW)==M.VERIFIER_SHA
V={'__name__':'fixture_pinned_verifier','__file__':str(VERIFIER)}
exec(compile(RAW,str(VERIFIER),'exec'),V)
UNITS={Path(p).name:b for p,b in V['units'](M.BUNDLE,'/usr/bin/node',M.HEAD).items()}
assert [M.sha(b) for b in UNITS.values()]==[
    '7451df54166637e10ef5d5222c5a3d5a68790b0745cb36df5f250640927c9b2e',
    '4e644a0cb56c9b0950e71c230f7825c36c00794e1db314bcfdad6f9065e2553e',
    '7ea212e6136d79123bc7f8df56a4cfd8567f07f9c0860eb48d05ced9ab1eb8d2']
PAYLOADS={}
for path,digest in [
    ('public/public-node/datanet/index.json','350f12849f1ee24dc8efd5fa3722b13944f38a37a247f847d1f763a91c087e0e'),
    ('public/void-public-frontdoor-v1/index.html','ee48446b62c8ba56383118beb1438c7557e643d9b86f4f492247ed3870bb3df9')]:
    PAYLOADS[path]=(OPT.source_checkout/path).read_bytes()
    assert M.sha(PAYLOADS[path])==digest


class Fixture(unittest.TestCase):
    def setUp(self):
        self.mask=os.umask(0o077)
        self.tmp=tempfile.TemporaryDirectory(prefix='void-install-fixture-',dir=Path.home())
        self.root=Path(self.tmp.name)
        self.target=self.root/'config/systemd/user'
        self.patches=[]
        self.replace('TARGET',self.target)
        self.replace('STATE',self.root/'state')
        self.state=M.Directory(M.STATE,create=True)
        self.mutations=[]; self.loaded=False; self.running=set(); self.overrides={}
        self.hook=lambda args: None
        self.live={'Id':'void-node-live.service','LoadState':'loaded','ActiveState':'active',
            'SubState':'running','FragmentPath':'/fixture/node.service','DropInPaths':'',
            'MainPID':'42','InvocationID':'a'*32}
        manifest=[{'path':'source/'+p,'sha256':M.sha(b)} for p,b in PAYLOADS.items()]
        self.inventory=copy.deepcopy(manifest)
        self.context={'module':{'inventory':lambda bundle:(self.inventory,{})},
            'receipt':{'manifest':manifest},'units':UNITS,'observation':{'http':[
                {'port':4100,'path':'/app/','sha256':M.sha(b'app')},
                {'port':4100,'path':'/app/assets/main.css','sha256':M.sha(b'css')}]}}
        self.replace('command',self.command)
        self.replace('fetch',self.fetch)
        self.record=M.plan(self.context)

    def replace(self,name,value):
        p=patch.object(M,name,value); p.start(); self.patches.append(p)

    def tearDown(self):
        self.state.close()
        for p in reversed(self.patches): p.stop()
        self.tmp.cleanup(); os.umask(self.mask)

    def command(self,args,timeout=30):
        if args[:3]==['/usr/bin/systemctl','--user','show']:
            name=args[3]
            if name=='void-node-live.service': p=self.live.copy()
            else:
                active=name in self.running
                p={'Id':name,'LoadState':'loaded' if self.loaded else 'not-found',
                    'ActiveState':'active' if active else 'inactive','SubState':'running' if active else 'dead',
                    'FragmentPath':str(self.target/name) if self.loaded else '', 'DropInPaths':'',
                    'MainPID':str(100+M.NAMES.index(name)) if active else '0',
                    'InvocationID':str(M.NAMES.index(name)+1)*32 if active else ''}
                p.update(self.overrides.get(name,{}))
            return '\n'.join(key+'='+p[key] for key in M.PROPS)
        if args==['/usr/bin/ss','-H','-ltn']:
            return '\n'.join('LISTEN 0 4096 127.0.0.1:'+str(port)+' 0.0.0.0:*'
                for name,port in zip(M.NAMES,(8080,8082,8083)) if name in self.running)
        assert args[:2]==['/usr/bin/systemctl','--user']
        assert args[2:]==['daemon-reload'] or (args[2]=='start' and len(args)==4 and args[3] in M.NAMES)
        self.mutations.append(args[2:])
        if args[2]=='daemon-reload': self.loaded=True
        else: self.running.add(args[3])
        self.hook(args)
        return ''

    def fetch(self,port,path,method='GET'):
        if method=='POST': return 405,'application/json',b'{}'
        if port==8080: return 200,'application/json',PAYLOADS['public/public-node/datanet/index.json']
        if path=='/': return 200,'text/html',PAYLOADS['public/void-public-frontdoor-v1/index.html']
        if path=='/__void/frontdoor/status.json':
            body={'marker':'VOID_PUBLIC_FRONTDOOR_V1','ready':True,'listener_ready':True,'read_only':True,
                'upstream_ready':True,'bind':'127.0.0.1','port':8083,'upstream':'http://127.0.0.1:8082'}
            return 200,'application/json',M.canonical(body)
        return 200,'text/html' if path=='/app/' else 'text/css',b'app' if path=='/app/' else b'css'

    def run_apply(self,record=None):
        return M.apply(record or self.record,self.context,self.state,'b'*64)

    def refuses(self,fn):
        with self.assertRaises((RuntimeError,OSError,ValueError,TypeError)): fn()

    def saved_plan(self,data=None,name=None):
        name=name or 'plan-'+self.record['nonce']+'.json'
        data=data if data is not None else M.canonical(self.record)+b'\n'
        self.state.create(name,data)
        return name,M.sha(data)

    def test_plan_has_no_target_or_manager_changes(self):
        self.assertFalse(self.target.exists()); self.assertEqual(self.mutations,[])
        self.assertEqual(set(self.record['units']),set(M.NAMES))

    def test_exact_success_order_bytes_modes_links_and_journal(self):
        result=self.run_apply()
        self.assertEqual(result['result'],'LOCAL_SERVICES_OBSERVED_PASS')
        self.assertEqual(self.mutations,[['daemon-reload'],*[['start',n] for n in M.NAMES],['daemon-reload']])
        for name,data in UNITS.items():
            self.assertEqual((self.target/name).read_bytes(),data)
            self.assertEqual(stat.S_IMODE((self.target/name).stat().st_mode),0o600)
            self.assertEqual(os.readlink(self.target/'default.target.wants'/name),'../'+name)
        events=[M.strict(line) for line in Path(result['journal']).read_bytes().splitlines()]
        self.assertEqual(events[0]['event'],'claimed'); self.assertEqual(events[-1]['event'],'complete')

    def test_existing_unit_preserved_without_manager_change(self):
        self.target.mkdir(parents=True); p=self.target/M.NAMES[0]; p.write_bytes(b'foreign')
        self.refuses(self.run_apply); self.assertEqual(p.read_bytes(),b'foreign'); self.assertEqual(self.mutations,[])

    def test_existing_enable_link_refused(self):
        wants=self.target/'default.target.wants'; wants.mkdir(parents=True)
        os.symlink('/foreign/missing',wants/M.NAMES[0])
        self.refuses(self.run_apply); self.assertEqual(self.mutations,[])
        self.assertEqual(os.readlink(wants/M.NAMES[0]),'/foreign/missing')

    def test_expired_and_future_plan_refused(self):
        for created in (int(M.time.time())-1801,int(M.time.time())+60):
            record=copy.deepcopy(self.record); record['created_at']=created
            self.refuses(lambda:self.run_apply(record))
        self.assertEqual(self.mutations,[]); self.assertFalse(self.target.exists())

    def test_plan_coordinate_drift_refused(self):
        for key in ('head','tree','receipt_sha256','aggregate_sha256','installer_sha256','target'):
            record=copy.deepcopy(self.record); record[key]='wrong'
            self.refuses(lambda:self.run_apply(record))
        self.assertEqual(self.mutations,[])

    def test_unknown_plan_member_refused(self):
        record=copy.deepcopy(self.record); record['extra']=True
        self.refuses(lambda:self.run_apply(record)); self.assertEqual(self.mutations,[])

    def test_claimed_attempt_cannot_replay(self):
        self.state.create('attempt-'+self.record['nonce']+'.jsonl',b'claimed\n')
        self.refuses(self.run_apply); self.assertFalse(self.target.exists()); self.assertEqual(self.mutations,[])

    def test_success_cannot_replay(self):
        self.run_apply(); count=len(self.mutations); self.refuses(self.run_apply)
        self.assertEqual(len(self.mutations),count)

    def test_confirmation_exact(self):
        name,digest=self.saved_plan(); self.assertEqual(M.confirmed_plan(self.state,name,digest),self.record)

    def test_confirmation_missing_or_wrong(self):
        name,_=self.saved_plan()
        for digest in (None,'','c'*64): self.refuses(lambda:M.confirmed_plan(self.state,name,digest))
        self.assertEqual(self.mutations,[])

    def test_noncanonical_and_duplicate_plan_json(self):
        for data in (json.dumps(self.record,indent=2).encode(),b'{"nonce":"a","nonce":"b"}'):
            name='plan-'+M.secrets.token_hex(16)+'.json'; _,digest=self.saved_plan(data,name)
            self.refuses(lambda:M.confirmed_plan(self.state,name,digest))

    def test_plan_filename_nonce_mismatch(self):
        name='plan-'+'d'*32+'.json'; _,digest=self.saved_plan(name=name)
        self.refuses(lambda:M.confirmed_plan(self.state,name,digest))

    def test_target_directory_replacement_refused(self):
        self.target.mkdir(parents=True); self.record=M.plan(self.context)
        self.target.rename(self.target.with_name('old')); self.target.mkdir()
        self.refuses(self.run_apply); self.assertEqual(self.mutations,[])

    def test_symlink_ancestor_refused(self):
        self.target.parent.mkdir(parents=True); os.symlink(self.root,self.target)
        self.refuses(self.run_apply); self.assertEqual(self.mutations,[])

    def test_group_writable_ancestor_refused(self):
        self.target.mkdir(parents=True); os.chmod(self.target.parent,0o775)
        self.refuses(self.run_apply); self.assertEqual(self.mutations,[])

    def test_directory_descriptor_replacement_refused(self):
        path=self.root/'owned'; path.mkdir(); d=M.Directory(path)
        try:
            path.rename(self.root/'old-owned'); path.mkdir()
            self.refuses(lambda:d.create('unit',b'x'))
            self.assertFalse((self.root/'old-owned/unit').exists())
        finally: d.close()

    def test_create_only_publication_preserves_existing(self):
        self.state.create('existing',b'original')
        self.refuses(lambda:self.state.create('existing',b'replacement'))
        self.assertEqual(self.state.read('existing'),b'original')

    def test_destination_arriving_at_publication_is_preserved(self):
        original=os.link
        def link(source,target,**kwargs):
            (M.STATE/target).write_bytes(b'foreign-arrival')
            return original(source,target,**kwargs)
        with patch.object(M.os,'link',link): self.refuses(lambda:self.state.create('race',b'candidate'))
        self.assertEqual(self.state.read('race'),b'foreign-arrival')
        self.assertFalse(any(p.name.startswith('.new-') for p in M.STATE.iterdir()))

    def test_publication_fsync_failure_preserves_published_file(self):
        original=os.fsync
        def fsync(fd):
            if fd==self.state.fd: raise OSError('fixture directory fsync failure')
            return original(fd)
        with patch.object(M.os,'fsync',fsync):
            with self.assertRaisesRegex(OSError,'fixture directory fsync failure'):
                self.state.create('partial',b'candidate')
        self.assertEqual(self.state.read('partial'),b'candidate')

    def test_symlink_hardlink_fifo_and_bad_mode_reads_refused(self):
        self.state.create('regular',b'x')
        os.symlink('regular',M.STATE/'symlink'); os.link(M.STATE/'regular',M.STATE/'hardlink')
        os.mkfifo(M.STATE/'fifo',0o600)
        (M.STATE/'bad-mode').write_bytes(b'x'); os.chmod(M.STATE/'bad-mode',0o664)
        for name in ('regular','hardlink','symlink','fifo','bad-mode'):
            self.refuses(lambda:self.state.read(name))

    def test_path_escape_refused(self):
        for name in ('../escape','/absolute','..','a/b'):
            self.refuses(lambda:self.state.create(name,b'x'))

    def test_bounded_publication_refused(self):
        self.refuses(lambda:self.state.create('large',b'x'*(M.LIMIT+1)))
        self.assertFalse((M.STATE/'large').exists())

    def test_cooperative_lock_exclusion(self):
        self.state.create('lock',b'')
        a=os.open(M.STATE/'lock',os.O_RDWR); b=os.open(M.STATE/'lock',os.O_RDWR)
        try:
            M.fcntl.flock(a,M.fcntl.LOCK_EX|M.fcntl.LOCK_NB)
            self.refuses(lambda:M.fcntl.flock(b,M.fcntl.LOCK_EX|M.fcntl.LOCK_NB))
        finally: os.close(b); os.close(a)

    def test_start_timeout_retains_units_and_records_partial(self):
        def hook(args):
            if args[2:]==['start',M.NAMES[1]]: raise subprocess.TimeoutExpired(args,30)
        self.hook=hook; self.refuses(self.run_apply)
        self.assertEqual(self.mutations,[['daemon-reload'],['start',M.NAMES[0]],['start',M.NAMES[1]]])
        self.assertTrue(all((self.target/n).exists() for n in M.NAMES))
        self.assertFalse((self.target/'default.target.wants').exists())
        journal=self.state.read('attempt-'+self.record['nonce']+'.jsonl')
        self.assertEqual(M.strict(journal.splitlines()[-1])['event'],'hold')

    def test_dropin_after_reload_prevents_start(self):
        self.hook=lambda args:self.overrides.update({M.NAMES[0]:{'DropInPaths':'/fixture/override.conf'}})
        self.refuses(self.run_apply); self.assertEqual(self.mutations,[['daemon-reload']])

    def test_fragment_mismatch_prevents_start(self):
        self.hook=lambda args:self.overrides.update({M.NAMES[0]:{'FragmentPath':'/foreign/unit'}})
        self.refuses(self.run_apply); self.assertEqual(self.mutations,[['daemon-reload']])

    def test_installed_byte_drift_prevents_start(self):
        self.hook=lambda args:(self.target/M.NAMES[0]).write_bytes(b'foreign')
        self.refuses(self.run_apply); self.assertEqual(self.mutations,[['daemon-reload']])
        self.assertEqual((self.target/M.NAMES[0]).read_bytes(),b'foreign')

    def test_live_node_drift_stops_progress(self):
        self.hook=lambda args:self.live.update({'MainPID':'43'})
        self.refuses(self.run_apply); self.assertEqual(self.mutations,[['daemon-reload']])

    def test_manifest_drift_stops_progress(self):
        self.hook=lambda args:self.inventory.append({'path':'unexpected'})
        self.refuses(self.run_apply); self.assertEqual(self.mutations,[['daemon-reload']])

    def test_prior_candidate_restart_prevents_enable(self):
        def hook(args):
            if args[2:]==['start',M.NAMES[2]]:
                self.overrides[M.NAMES[0]]={'InvocationID':'f'*32}
        self.hook=hook; self.refuses(self.run_apply)
        self.assertEqual(len(self.mutations),4); self.assertFalse((self.target/'default.target.wants').exists())

    def test_foreign_enable_link_appearing_is_preserved(self):
        def hook(args):
            if args[2:]==['start',M.NAMES[2]]:
                wants=self.target/'default.target.wants'; wants.mkdir()
                os.symlink('/foreign/unit',wants/M.NAMES[0])
        self.hook=hook; self.refuses(self.run_apply)
        self.assertEqual(os.readlink(self.target/'default.target.wants'/M.NAMES[0]),'/foreign/unit')
        self.assertEqual(len(self.mutations),4)

    def replace_wants_directory(self):
        wants=self.target/'default.target.wants'
        wants.rename(self.target/'former-default.target.wants')
        wants.mkdir()
        (wants/'foreign-marker').write_bytes(b'preserve-replacement')

    def assert_wants_hold(self, published, commands):
        current=self.target/'default.target.wants'
        former=self.target/'former-default.target.wants'
        self.assertEqual(sorted(p.name for p in current.iterdir()),['foreign-marker'])
        self.assertEqual((current/'foreign-marker').read_bytes(),b'preserve-replacement')
        self.assertEqual(len(list(former.iterdir())),published)
        self.assertEqual(len(self.mutations),commands)
        events=[M.strict(line) for line in self.state.read('attempt-'+self.record['nonce']+'.jsonl').splitlines()]
        self.assertEqual(events[-1]['event'],'hold')
        self.assertFalse(any(event['event']=='complete' for event in events))
        self.assertIn('directory generation changed',events[-1]['reason'])

    def test_enable_directory_replaced_after_first_link_holds(self):
        original=os.symlink
        def symlink(source,target,**kwargs):
            original(source,target,**kwargs)
            if target==M.NAMES[0]: self.replace_wants_directory()
        with patch.object(M.os,'symlink',symlink): self.refuses(self.run_apply)
        self.assert_wants_hold(1,4)

    def test_enable_directory_replaced_after_last_link_holds(self):
        original=os.symlink
        def symlink(source,target,**kwargs):
            original(source,target,**kwargs)
            if target==M.NAMES[2]: self.replace_wants_directory()
        with patch.object(M.os,'symlink',symlink): self.refuses(self.run_apply)
        self.assert_wants_hold(3,4)

    def test_enable_directory_replaced_during_final_reload_holds(self):
        def hook(args):
            if args[2:]==['daemon-reload'] and len(self.mutations)==5:
                self.replace_wants_directory()
        self.hook=hook; self.refuses(self.run_apply)
        self.assert_wants_hold(3,5)

    def test_enable_directory_mode_drift_during_reload_holds(self):
        def hook(args):
            if args[2:]==['daemon-reload'] and len(self.mutations)==5:
                os.chmod(self.target/'default.target.wants',0o775)
        self.hook=hook; self.refuses(self.run_apply)
        self.assertEqual(stat.S_IMODE((self.target/'default.target.wants').stat().st_mode),0o775)
        events=[M.strict(line) for line in self.state.read('attempt-'+self.record['nonce']+'.jsonl').splitlines()]
        self.assertEqual(events[-1]['event'],'hold')
        self.assertFalse(any(event['event']=='complete' for event in events))

    def test_removed_guard_control_reproduces_false_enabled_result(self):
        code=inspect.getsource(M.apply)
        missing='        if wants: wants.current()\n'
        self.assertEqual(code.count(missing),1)
        scope=dict(M.__dict__)
        exec(compile(code.replace(missing,''),'<fixture-removed-wants-guard>','exec'),scope)
        def hook(args):
            if args[2:]==['daemon-reload'] and len(self.mutations)==5:
                self.replace_wants_directory()
        self.hook=hook
        result=scope['apply'](self.record,self.context,self.state,'b'*64)
        self.assertEqual(result['result'],'LOCAL_SERVICES_OBSERVED_PASS')
        self.assertTrue(result['enabled_for_user_default_target'])
        self.assertEqual(list((self.target/'default.target.wants').glob('*.service')),[])

    def test_http_content_drift_prevents_next_start(self):
        self.replace('fetch',lambda *args:(200,'application/json',b'wrong'))
        self.refuses(self.run_apply); self.assertEqual(len(self.mutations),2)

    def test_public_bind_refused(self):
        original=self.command
        def command(args,timeout=30):
            result=original(args,timeout)
            return result.replace('127.0.0.1:8080','0.0.0.0:8080') if args[0]=='/usr/bin/ss' else result
        self.replace('command',command); self.refuses(self.run_apply)
        self.assertEqual(len(self.mutations),2)

    def test_unrelated_files_survive_success(self):
        self.target.mkdir(parents=True); (self.target/'unrelated.service').write_bytes(b'preserve')
        self.record=M.plan(self.context); self.run_apply()
        self.assertEqual((self.target/'unrelated.service').read_bytes(),b'preserve')

    def test_false_readiness_and_post_acceptance_refused(self):
        def unready(port,path,method='GET'):
            if path=='/__void/frontdoor/status.json': return 200,'application/json',b'{"ready":false}'
            return self.fetch(port,path,method)
        with patch.object(M,'fetch',unready): self.refuses(lambda:M.probes(2,self.context))
        def writable(port,path,method='GET'):
            if method=='POST': return 200,'application/json',b'{}'
            return self.fetch(port,path,method)
        with patch.object(M,'fetch',writable): self.refuses(lambda:M.probes(2,self.context))


if __name__=='__main__':
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(Fixture)
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    print(json.dumps({'marker':'VOID_PRECISION_WEB_INSTALL_V1_1_FIXTURE_PROOF',
        'tests':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),
        'installer_sha256':M.sha(OPT.installer.read_bytes()),'verifier_sha256':M.VERIFIER_SHA,
        'fixture_only':True,'systemctl_executed':False,'host_services_changed':False,
        'independent_acceptance':False},sort_keys=True))
    raise SystemExit(0 if result.wasSuccessful() else 1)
