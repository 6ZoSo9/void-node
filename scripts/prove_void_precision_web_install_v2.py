#!/usr/bin/env python3
"""Supervisor for 504 fresh processes per Python runtime, no real host operations.

Each natural link primary runs the exact legacy control followed by the successor
in disjoint homes inside one process. Kill primaries run the successor. One fresh
recovery process classifies every attempted profile. This is 192 link + 312
interruption processes per runtime, 1,512 across the three required runtimes.
"""
import argparse
import ast
import base64
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import selectors
import signal
import stat
import subprocess
import sys
import tempfile
import time

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('evidence',ROOT/'ops/public/void_precision_web_install_evidence_v2.py')
E=importlib.util.module_from_spec(spec); spec.loader.exec_module(E)
NAMES=['void-web-recovery-'+n+'-v2-0390ccb559e9.service' for n in ('adapter','composition','frontdoor')]
PROPS=['Id','LoadState','ActiveState','SubState','FragmentPath','DropInPaths','MainPID','InvocationID']


def identity(s):
    return {'device':s.st_dev,'inode':s.st_ino,'mode':stat.S_IMODE(s.st_mode),'uid':s.st_uid,
            'gid':s.st_gid,'links':s.st_nlink,'size':s.st_size,'mtime_ns':s.st_mtime_ns,'ctime_ns':s.st_ctime_ns}


def census(root):
    rows={}
    if not os.path.lexists(root): return rows
    def walk(path,relative):
        E.require(len(rows)<256,'fixture census bound')
        s=path.lstat(); row=identity(s)
        if stat.S_ISLNK(s.st_mode): row.update(type='symlink',target=os.readlink(path))
        elif stat.S_ISREG(s.st_mode): row.update(type='file',sha256=E.sha(E.read(path)))
        elif stat.S_ISDIR(s.st_mode): row.update(type='directory')
        else: row.update(type='special')
        rows[relative]=row
        if row['type']=='directory':
            for child in sorted(path.iterdir()): walk(child,str(Path(relative)/child.name))
    walk(root,'.')
    return rows


class Supervisor:
    def __init__(self,root,source,runtime,case,termination):
        self.root=root; self.source=source; self.runtime=runtime; self.case=case; self.termination=termination
        self.metadata={}; self.states={}; self.profile=None; self.terminals={}; self.mutations={}
        self.audits=[]; self.manager_commands=[]; self.cut_fired=set(); self.real_calls=0
        self.initial_units={}; self.initial_links={}; self.sample_checks={}
        self.protected={}
        self.home=root/'home'; self.home.mkdir(mode=0o700)

    def protect(self,path):
        for relative,row in census(path).items():
            self.protected[str(path if relative=='.' else path/relative)]=row

    def protected_now(self):
        return {path:census(Path(path)).get('.',{'type':'missing'}) for path in self.protected}

    def verify_protected(self):
        observed=self.protected_now()
        E.require(observed==self.protected,'primary changed protected entries')
        return observed

    def manager(self,args):
        state=self.states[self.profile]; meta=self.metadata[self.profile]
        if args==['/usr/bin/ss','-H','-ltn']:
            return '\n'.join('LISTEN 0 4096 127.0.0.1:'+str(port)+' 0.0.0.0:*'
                for name,port in zip(NAMES,(8080,8082,8083)) if name in state['running'])
        E.require(args[:2]==['/usr/bin/systemctl','--user'],'manager command outside fixture')
        if args[2]=='show':
            E.require(len(args)==5 and args[4]=='--property='+','.join(PROPS),'manager property set drift')
            name=args[3]; E.require(name in [*NAMES,'void-node-live.service'],'unknown service')
            if name=='void-node-live.service':
                p={'Id':name,'LoadState':'loaded','ActiveState':'active','SubState':'running',
                    'FragmentPath':'/fixture/node.service','DropInPaths':'','MainPID':'42','InvocationID':'a'*32}
            else:
                active=name in state['running']
                p={'Id':name,'LoadState':'loaded' if state['loaded'] else 'not-found',
                    'ActiveState':'active' if active else 'inactive','SubState':'running' if active else 'dead',
                    'FragmentPath':str(Path(meta['target'])/name) if state['loaded'] else '', 'DropInPaths':'',
                    'MainPID':str(100+NAMES.index(name)) if active else '0',
                    'InvocationID':str(NAMES.index(name)+1)*32 if active else ''}
                p.update(state['overrides'].get(name,{}))
            return '\n'.join(k+'='+p[k] for k in PROPS)
        E.require(self.phase=='primary','recovery attempted manager mutation')
        E.require(args[2:]==['daemon-reload'] or len(args)==4 and args[2]=='start' and args[3] in NAMES,
                  'unsupported manager mutation')
        self.manager_commands.append({'profile':self.profile,'args':args})
        if args[2]=='daemon-reload': state['loaded']=True
        else: state['running'].add(args[3])
        return ''

    def mutate_link(self):
        meta=self.metadata[self.profile]; directory=Path(meta['target'])/'default.target.wants'
        before=census(directory); name=NAMES[self.case['entry']]
        fd=os.open(directory,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
        try:
            E.require(name in before,'mutation entry absent before cut')
            parent=identity(os.fstat(fd)); os.unlink(name,dir_fd=fd)
            mutation=self.case['mutation']
            if mutation in ('wrong_target','aba'):
                os.symlink('/foreign/unit' if mutation=='wrong_target' else '../'+name,name,dir_fd=fd)
            elif mutation=='regular':
                leaf=os.open(name,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600,dir_fd=fd)
                try: os.write(leaf,b'foreign-entry'); os.fsync(leaf)
                finally: os.close(leaf)
            os.fsync(fd)
            after=census(directory)
            E.require(parent['inode']==after['.']['inode'] and parent['mode']==after['.']['mode'],'parent replaced by mutation')
            E.require(before.get(name)!=after.get(name),'mutation did not change entry generation')
            for key in before:
                if key not in ('.',name): E.require(before[key]==after[key],'unrelated entry changed')
            self.mutations[self.profile]={'entry':name,'expected_target':'../'+name,'before':before.get(name),
                'after':after.get(name,{'type':'missing'}),'parent_before':parent,'parent_after':after['.'],
                'protected_census':after,'fsynced':True}
            self.protect(directory)
        finally: os.close(fd)

    def cut(self,request,process):
        if self.phase!='primary': return None
        if self.profile=='successor':
            cut=request['cut']; meta=self.metadata[self.profile]; target=Path(meta['target'])
            if cut.startswith('unit_'):
                name=NAMES[int(cut[-1])]; self.initial_units[name]=census(target)[name]
            elif cut.startswith('link_'):
                name=NAMES[int(cut[-1])]; self.initial_links[name]=census(target/'default.target.wants')[name]
            elif cut=='sampled':
                units=census(target); links=census(target/'default.target.wants')
                expected_hashes=['7451df54166637e10ef5d5222c5a3d5a68790b0745cb36df5f250640927c9b2e',
                    '4e644a0cb56c9b0950e71c230f7825c36c00794e1db314bcfdad6f9065e2553e',
                    '7ea212e6136d79123bc7f8df56a4cfd8567f07f9c0860eb48d05ced9ab1eb8d2']
                for name,digest in zip(NAMES,expected_hashes):
                    E.require(units.get(name)==self.initial_units.get(name) and units[name].get('sha256')==digest,
                              'premature/substituted unit sample')
                    E.require(links.get(name)==self.initial_links.get(name) and links[name]['type']=='symlink'
                              and links[name]['target']=='../'+name and links[name]['links']==1,
                              'premature/substituted link sample')
                commands=[item['args'][2:] for item in self.manager_commands if item['profile']=='successor']
                E.require(commands==[['daemon-reload'],*[['start',n] for n in NAMES],['daemon-reload']],
                          'sample before exact manager sequence')
                E.require(self.states['successor']['running']==set(NAMES),'sample without three ready services')
                self.sample_checks={'unit_identities_verified':3,'link_identities_verified':3,
                                    'service_identities_verified':3,'manager_mutations_verified':5}
        if self.profile in self.cut_fired: return None
        wanted=self.case['cut']
        if request['cut']!=wanted: return None
        if self.case['id'].startswith('link-') and wanted=='after_readlink' and request.get('entry')!=self.case['entry']:
            return None
        self.cut_fired.add(self.profile)
        if self.case['id'].startswith('link-'): self.mutate_link()
        if self.termination=='kill':
            process.kill(); return 'killed'
        if self.termination=='error': return {'raise':'supervisor injected OSError after '+wanted}
        return None

    def run(self,phase):
        self.phase=phase; self.phase_terminals={}; ticks=0; buffer=bytearray(); terminal_seen=False
        profiles=(['legacy','successor'] if self.case['id'].startswith('link-') and self.termination=='natural' else ['successor'])
        cfg={'home':str(self.home),'profiles':profiles,'metadata':self.metadata}
        p=subprocess.Popen([str(Path(sys.executable).resolve()),'-I','-B',
            str(ROOT/'scripts/precision_web_install_fixture_v2.py'),'--head',self.source['head'],
            '--root',str(ROOT),'--phase',phase],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
            env={'PATH':'/usr/bin:/bin','LANG':'C','HOME':str(self.home)},start_new_session=True)
        selector=selectors.DefaultSelector(); selector.register(p.stdout,selectors.EVENT_READ)
        deadline=time.monotonic()+30
        try:
            while True:
                E.require(time.monotonic()<deadline,'child absolute deadline')
                ready=selector.select(0.1)
                if not ready:
                    if p.poll() is not None: break
                    continue
                chunk=os.read(p.stdout.fileno(),65536)
                if not chunk: break
                buffer.extend(chunk); E.require(len(buffer)<=2*1024*1024,'protocol output bound')
                while b'\n' in buffer:
                    line,_,tail=buffer.partition(b'\n'); buffer=bytearray(tail)
                    request=json.loads(line); ticks+=1
                    E.require(ticks<=(64 if phase=='recovery' else 2048),'supervisor tick bound')
                    kind=request['kind']; value=None; response=None
                    if kind=='hello':
                        E.require(request['source']==self.source and request['runtime']==self.runtime,'worker generation/runtime drift'); value=cfg
                    elif kind=='profile':
                        self.profile=request['profile']; E.require(self.profile in profiles,'unknown profile')
                        if phase=='primary': self.states[self.profile]={'loaded':False,'running':set(),'overrides':{}}
                    elif kind=='paths':
                        E.require(phase=='primary','recovery changed paths')
                        for key in ('root','target','state'):
                            E.require(Path(request[key]).is_relative_to(self.home),'worker path outside fixture home')
                        self.metadata[self.profile]={k:request[k] for k in ('root','target','state')}
                        # A real unrelated entry makes preservation non-vacuous.
                        wants=Path(request['target'])/'default.target.wants'
                        wants.mkdir(parents=True,mode=0o700)
                        with (wants/'unrelated.marker').open('xb') as stream: stream.write(b'preserve-unrelated')
                        self.protect(wants/'unrelated.marker')
                    elif kind=='plan':
                        E.require(phase=='primary','recovery published plan')
                        meta=self.metadata[self.profile]; meta.update({k:request[k] for k in ('filename','digest','nonce')})
                        raw=E.read(Path(meta['state'])/meta['filename'])
                        E.require(E.sha(raw)==meta['digest'] and json.loads(raw)['nonce']==meta['nonce'],'plan census differs')
                    elif kind=='manager': value=self.manager(request['args'])
                    elif kind=='audit':
                        self.audits.append({'phase':phase,'profile':self.profile,'event':request['event'],
                                            'paths':request['paths']})
                        E.require(phase=='primary','recovery syscall mutation')
                        for path in request['paths']:
                            mutation_path=Path(path)
                            E.require(mutation_path.is_absolute() and (mutation_path.parent.resolve()/mutation_path.name).is_relative_to(self.home),
                                      'primary mutation outside fixture home')
                            E.require(not any(mutation_path==Path(guarded) or Path(guarded).is_relative_to(mutation_path)
                                              or mutation_path.is_relative_to(Path(guarded))
                                              for guarded in self.protected), 'primary mutation targets protected entry')
                        if request['event']=='os.remove':
                            E.require(all(Path(p).name.startswith('.new-') for p in request['paths']),
                                      'primary unlink outside temporary publication cleanup')
                    elif kind=='forbidden':
                        self.real_calls+=1; raise RuntimeError('worker attempted real process/listener')
                    elif kind=='cut':
                        response=self.cut(request,p)
                        if response=='killed': break
                    elif kind=='terminal': self.phase_terminals[self.profile]=request['result']
                    elif kind=='finished': terminal_seen=True
                    else: raise RuntimeError('unknown protocol message')
                    reply=response if isinstance(response,dict) else {'value':value}
                    p.stdin.write(json.dumps(reply,separators=(',',':')).encode()+b'\n'); p.stdin.flush()
                if p.poll() is not None: break
            code=p.wait(timeout=5); error=p.stderr.read(65537).decode(errors='replace')
            expected=-signal.SIGKILL if phase=='primary' and self.termination=='kill' else 0
            E.require(code==expected,'worker exit '+str(code)+': '+error)
            if code==0: E.require(terminal_seen,'worker omitted terminal protocol')
            self.terminals[phase]=copy.deepcopy(self.phase_terminals)
            return code,ticks
        finally:
            if p.poll() is None: p.kill(); p.wait(timeout=5)
            selector.close(); p.stdin.close(); p.stdout.close(); p.stderr.close()

    def residual(self):
        if self.case['id'].startswith('link-'): return
        meta=self.metadata['successor']; target=Path(meta['target']); state=Path(meta['state'])
        residue=self.case['residue']; cut=self.case['cut']
        if residue!='exact':
            if residue=='foreign':
                if cut=='plan': path=target/NAMES[0]
                elif cut in ('unit_0','unit_1'): path=target/NAMES[int(cut[-1])+1]
                elif cut=='unit_2' or cut in ('ready_0','ready_1'):
                    index=0 if cut=='unit_2' else int(cut[-1])+1
                    path=target/(NAMES[index]+'.d')/'foreign.conf'
                    self.states['successor']['overrides'][NAMES[index]]={'DropInPaths':str(path)}
                elif cut=='ready_2': path=target/'default.target.wants'/NAMES[0]
                elif cut in ('link_0','link_1'): path=target/'default.target.wants'/NAMES[int(cut[-1])+1]
                else: path=target/'default.target.wants/void-web-recovery-foreign-v2.service'
            elif cut=='plan': path=state/meta['filename']
            elif cut.startswith('ready_'):
                index=int(cut[-1]); self.states['successor']['overrides'][NAMES[index]]={'InvocationID':'f'*32}; path=None
            elif any(os.path.lexists(target/'default.target.wants'/n) for n in NAMES):
                path=next(target/'default.target.wants'/n for n in NAMES if os.path.lexists(target/'default.target.wants'/n))
            else: path=next((target/n for n in reversed(NAMES) if os.path.lexists(target/n)),state/meta['filename'])
            if path is not None:
                path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
                if os.path.lexists(path): path.unlink()
                fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
                try: os.write(fd,b'foreign-residue'); os.fsync(fd)
                finally: os.close(fd)
                parent=os.open(path.parent,os.O_RDONLY|os.O_DIRECTORY)
                try: os.fsync(parent)
                finally: os.close(parent)
        if self.case['intent']=='different':
            # A separately materialized, self-consistent but wrong generation.
            original=json.loads(E.read(state/meta['filename'])) if residue=='exact' or cut!='plan' else None
            if original is None:
                meta['digest']='0'*64; return
            original['installer_source']=dict(original['installer_source'],head='f'*40)
            original['nonce']='d'*32
            raw=json.dumps(original,sort_keys=True,separators=(',',':')).encode()+b'\n'
            filename='plan-'+original['nonce']+'.json'
            with (state/filename).open('xb') as stream: stream.write(raw)
            os.chmod(state/filename,0o600)
            meta.update(filename=filename,nonce=original['nonce'],digest=E.sha(raw))


def run_case(home,source,runtime,case,termination):
    s=Supervisor(home,source,runtime,case,termination)
    primary_exit,_=s.run('primary')
    protected_after=s.verify_protected()
    E.require('successor' in s.cut_fired,'required successor cutpoint not reached')
    legacy=False
    if case['id'].startswith('link-') and termination=='natural':
        E.require('legacy' in s.cut_fired,'legacy falsifier cutpoint not reached')
        result=s.terminals['primary']['legacy']; meta=s.metadata['legacy']
        journal=E.read(Path(meta['state'])/('attempt-'+meta['nonce']+'.jsonl'))
        events=[json.loads(line) for line in journal.splitlines()]
        legacy=result.get('result')=='LOCAL_SERVICES_OBSERVED_PASS' and result.get('enabled_for_user_default_target') is True
        E.require(legacy and any(e['event']=='complete' for e in events),'required exact V1.1 false-green control absent')
    result=s.terminals['primary'].get('successor',{})
    false_green=result.get('enabled_for_user_default_target') is True or result.get('result')=='LOCAL_SERVICES_OBSERVED_PASS'
    E.require(not false_green,'successor emitted enable authority')
    if case['id'].startswith('link-'):
        meta=s.metadata['successor']; path=Path(meta['state'])/('attempt-'+meta['nonce']+'.jsonl')
        events=[json.loads(line) for line in E.read(path).splitlines()]
        E.require(not any(e['event'] in ('complete','sampled') for e in events),'successor published success after link drift')
    s.residual()
    before=census(s.home); command_count=len(s.manager_commands); audit_count=len(s.audits)
    journals={}
    for profile,meta in s.metadata.items():
        journal=Path(meta['state'])/('attempt-'+meta['nonce']+'.jsonl')
        journals[profile]=[] if not journal.exists() else [
            {k:e[k] for k in ('event','cut','plan_sha256','sample_sha256') if k in e}
            for e in [json.loads(line) for line in E.read(journal).splitlines()]]
    recovery_exit,ticks=s.run('recovery')
    after=census(s.home)
    E.require(before==after and len(s.manager_commands)==command_count and len(s.audits)==audit_count,
              'recovery mutated residual namespace/manager')
    recovered=s.terminals['recovery']['successor']['result']
    expected='PARTIAL_OR_UNCERTAIN'
    if case['id'].startswith('recovery-') and case['cut']=='sampled' and case['intent']=='same':
        expected='ALREADY_OBSERVED_AT_REVALIDATED_SAMPLE' if case['residue']=='exact' else 'CONTRADICTED_COMPLETE_QUARANTINED'
    E.require(recovered==expected,'recovery classification mismatch: '+recovered+' expected '+expected)
    row={'id':case['id']+('-'+termination if case['id'].startswith('link-') else ''),
        'source_head':source['head'],'runtime':runtime,'processes':2,'primary_exit':primary_exit,'recovery_exit':recovery_exit,
        'recovery_ticks':ticks,'recovery_mutations':0,'legacy_false_green':legacy,'successor_false_green':False,
        'mutation_observed':bool(s.mutations),'mutation_fsynced':all(x['fsynced'] for x in s.mutations.values()),
        'mutation_evidence':s.mutations,'primary_census_sha256':E.sha(E.canonical(before)),
        'recovery_census_sha256':E.sha(E.canonical(after)),'manager_commands':s.manager_commands,
        'primary_census':before,'recovery_census':after,'journal_census':journals,'sample_checks':s.sample_checks,
        'fixture_home':str(s.home),'protected_before':s.protected,'protected_after':protected_after,
        'primary_mutation_audit':s.audits,
        'syscall_counts':{'primary':audit_count,'recovery':len(s.audits)-audit_count},
        'plan_generations':s.metadata,'terminals':s.terminals,'passed':True}
    E.case_observations(row)
    return row


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--head',required=True); parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--case',help='single-case diagnostic; cannot emit a matrix member')
    args=parser.parse_args()
    source=E.source_identity(ROOT,args.head); runtime=E.runtime_identity()
    contract=E.strict(E.read(ROOT/E.CONTRACT)); links,recovery=E.manifests(ROOT)
    E.require(runtime['minor'] in contract['python'],'unsupported Python runtime')
    # Execute all original 41 cases in this supervisor process with actual source
    # bytes; these are additional unit checks, not counted as supervised children.
    import runpy,unittest
    proof=ROOT/E.FIXTURE/'prove_void_precision_web_install_v1_1.py'
    sys.argv=[str(proof),'--source-checkout',str(ROOT),'--installer',str(ROOT/E.FIXTURE/'void-precision-web-install-v1_1.py')]
    legacy=runpy.run_path(str(proof),run_name='legacy_unit_wall')
    ids=sorted(unittest.defaultTestLoader.getTestCaseNames(legacy['Fixture']))
    E.require(ids==contract['legacy_cases'],'legacy case IDs changed')
    result=unittest.TextTestRunner(verbosity=0).run(unittest.defaultTestLoader.loadTestsFromTestCase(legacy['Fixture']))
    E.require(result.wasSuccessful() and result.testsRun==41,'legacy 41-case wall failed')
    cases=[]
    with tempfile.TemporaryDirectory(prefix='void-installer-supervisor-',dir=Path.home()) as temporary:
        base=Path(temporary)
        schedules=[(c,t) for c in links for t in ('natural','kill')]+[(c,c['termination']) for c in recovery]
        if args.case: schedules=[(c,t) for c,t in schedules if (c['id']+'-'+t if c['id'].startswith('link-') else c['id'])==args.case]
        E.require(schedules,'unknown diagnostic case')
        for index,(case,termination) in enumerate(schedules):
            directory=base/str(index); directory.mkdir(mode=0o700)
            cases.append(run_case(directory,source,runtime,case,termination))
            if index%24==0: print(json.dumps({'completed_pairs':index+1,'total_pairs':len(schedules)}),flush=True)
    E.require(E.source_identity(ROOT,args.head)==source and E.runtime_identity()==runtime,'post-proof source/runtime drift')
    if args.case:
        print(json.dumps({'diagnostic_only':True,'cases':cases},sort_keys=True)); return
    receipt={'marker':'VOID_PRECISION_INSTALL_MATRIX_MEMBER_V2','source':source,'runtime':runtime,
        'preparation':contract['preparation'],'legacy_cases':ids,'cases':cases,'processes':504,
        'legacy_false_greens':sum(c['legacy_false_green'] for c in cases),'successor_false_greens':0,
        'real_systemctl_calls':0,'recovery_mutations':0,'terminal_root':E.sha(E.canonical(cases)),
        'host_execution':False,'independent_acceptance':False}
    raw=E.canonical(receipt); digest=E.sha(raw)
    E.member(raw,digest,source,ROOT)
    with args.output.open('xb') as stream: stream.write(raw)
    print(json.dumps({'marker':receipt['marker'],'source_head':args.head,'runtime':runtime,
        'processes':504,'legacy_false_greens':48,'successor_false_greens':0,
        'receipt':str(args.output),'receipt_sha256':digest},sort_keys=True))


if __name__=='__main__': main()
