#!/usr/bin/env python3
"""One isolated primary/recovery worker. The parent owns mutation and manager RPC.

Only the exact admitted installer executes. OS subprocesses and real listeners
are denied after source admission. A worker result is telemetry until the parent
checks process status and actual filesystem/journal census.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import runpy
import sys


def load(path,name):
    spec=importlib.util.spec_from_file_location(name,path)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def rpc(kind,**fields):
    sys.stdout.write(json.dumps({'kind':kind,**fields},sort_keys=True,separators=(',',':'))+'\n'); sys.stdout.flush()
    line=sys.stdin.readline(2*1024*1024)
    if not line: raise RuntimeError('supervisor disconnected')
    reply=json.loads(line)
    if 'raise' in reply: raise OSError(reply['raise'])
    return reply.get('value')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--head',required=True)
    parser.add_argument('--root',type=Path,required=True)
    parser.add_argument('--phase',choices=['primary','recovery'],required=True)
    args=parser.parse_args()
    root=args.root.resolve()
    E=load(root/'ops/public/void_precision_web_install_evidence_v2.py','evidence')
    source=E.source_identity(root,args.head)
    runtime=E.runtime_identity()
    cfg=rpc('hello',source=source,runtime=runtime)
    home=Path.home().resolve()
    E.require(home==Path(cfg['home']).resolve(),'fixture home differs')
    legacy_path=root/E.FIXTURE/'void-precision-web-install-v1_1.py'
    proof_path=root/E.FIXTURE/'prove_void_precision_web_install_v1_1.py'
    sys.argv=[str(proof_path),'--source-checkout',str(root),'--installer',str(legacy_path)]
    L=runpy.run_path(str(proof_path),run_name='fixture_definitions')
    original=L['M']
    successor=load(root/'ops/public/void_precision_web_install_v2.py','installer_successor')
    successor.OPERATION_SOURCE=source
    successor.OPERATION_RUNTIME=runtime
    original_write=os.write; original_fsync=os.fsync; original_readlink=os.readlink; original_open=os.open
    opening={'dir_fd':None}
    def pathname(path,dir_fd=None):
        if isinstance(path,int): return original_readlink('/proc/self/fd/'+str(path))
        path=os.fsdecode(path)
        if os.path.isabs(path): return os.path.abspath(path)
        parent=(os.getcwd() if dir_fd in (None,-1) else original_readlink('/proc/self/fd/'+str(dir_fd)))
        return os.path.abspath(os.path.join(parent,path))
    def opened(path,flags,mode=0o777,*,dir_fd=None):
        old=opening['dir_fd']; opening['dir_fd']=dir_fd
        try: return original_open(path,flags,mode,dir_fd=dir_fd)
        finally: opening['dir_fd']=old
    os.open=opened
    audit_enabled=False
    def audit(event,values):
        if event in ('subprocess.Popen','os.system','os.exec','os.posix_spawn','socket.bind'):
            rpc('forbidden',event=event); raise RuntimeError('real process/listener forbidden in fixture')
        if not audit_enabled: return
        mutation=event in ('os.mkdir','os.remove','os.rename','os.rmdir','os.link','os.symlink','os.chmod','os.truncate')
        if event=='open':
            flags=values[2]; mutation=isinstance(flags,int) and bool(flags&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC))
        if mutation:
            if event=='open': paths=[pathname(values[0],opening['dir_fd'])]
            elif event in ('os.link','os.rename'):
                paths=[pathname(values[0],values[2]),pathname(values[1],values[3])]
            elif event=='os.symlink': paths=[pathname(values[1],values[2])]
            elif event in ('os.mkdir','os.chmod'): paths=[pathname(values[0],values[2])]
            elif event in ('os.remove','os.rmdir'): paths=[pathname(values[0],values[1])]
            else: paths=[pathname(values[0])]
            rpc('audit',event=event,paths=paths)
    sys.addaudithook(audit)
    for profile in cfg['profiles']:
        module=original if profile=='legacy' else successor
        L['Fixture'].setUp.__globals__['M']=module
        f=L['Fixture']('test_plan_has_no_target_or_manager_changes')
        rpc('profile',profile=profile)
        flags={'reloads':0,'after_listeners':False,'after_guard':False,'capturing':False}
        pending={}
        audit_enabled=True
        if args.phase=='primary':
            f.setUp(); f.tmp._finalizer.detach()
            rpc('paths',root=str(f.root),target=str(f.target),state=str(module.STATE))
        else:
            meta=cfg['metadata'][profile]
            f.root=Path(meta['root']); f.target=Path(meta['target']); f.patches=[]
            f.replace('TARGET',f.target); f.replace('STATE',Path(meta['state']))
            f.state=module.Directory(module.STATE)
            manifest=[{'path':'source/'+p,'sha256':module.sha(b)} for p,b in L['PAYLOADS'].items()]
            f.inventory=manifest.copy()
            f.context={'module':{'inventory':lambda bundle:(f.inventory,{})},'receipt':{'manifest':manifest},
                'units':L['UNITS'],'observation':{'http':[
                    {'port':4100,'path':'/app/','sha256':module.sha(b'app')},
                    {'port':4100,'path':'/app/assets/main.css','sha256':module.sha(b'css')}]}}
        def command(command_args,timeout=30):
            answer=rpc('manager',args=command_args)
            if command_args[2:]==['daemon-reload']: flags['reloads']+=1
            if flags['reloads']==2 and command_args==['/usr/bin/ss','-H','-ltn']:
                rpc('cut',cut='after_listeners'); flags['after_listeners']=True
            return answer
        f.replace('command',command); f.replace('fetch',f.fetch)
        old_current=module.Directory.current
        def current(directory):
            old_current(directory)
            if (args.phase=='primary' and flags['after_listeners'] and not flags['after_guard']
                    and directory.path==f.target/'default.target.wants'):
                flags['after_guard']=True; rpc('cut',cut='after_guard')
        def readlink(name,*a,**kw):
            value=original_readlink(name,*a,**kw)
            if (args.phase=='primary' and flags['reloads']==2 and not flags['capturing']
                    and name in module.NAMES):
                index=module.NAMES.index(name)
                rpc('cut',cut='after_readlink',entry=index)
                if index==2: rpc('cut',cut='before_listeners')
            return value
        def write(fd,data):
            count=original_write(fd,data)
            if args.phase=='primary' and isinstance(data,(bytes,bytearray)) and data.startswith(b'{'):
                try:
                    item=json.loads(data)
                    if item.get('event') in ('progress','sampled') and 'cut' in item:
                        pending[fd]=item['cut']
                except (ValueError,UnicodeError): pass
            if args.phase=='recovery': rpc('audit',event='os.write',paths=[pathname(fd)])
            return count
        def fsync(fd):
            original_fsync(fd)
            if fd in pending:
                cut=pending.pop(fd); rpc('cut',cut=cut)
        f.replace('os',module.os)
        # Patch actual Python syscall entry points used by both source versions.
        module.os.write=write; module.os.fsync=fsync; module.os.readlink=readlink
        module.Directory.current=current
        result=None
        try:
            if args.phase=='primary':
                f.record=module.plan(f.context)
                raw=module.canonical(f.record)+b'\n'; digest=module.sha(raw)
                filename='plan-'+f.record['nonce']+'.json'
                f.state.create(filename,raw)
                rpc('plan',filename=filename,digest=digest,nonce=f.record['nonce'])
                rpc('cut',cut='plan')
                result=module.apply(f.record,f.context,f.state,digest)
            elif profile=='legacy':
                meta=cfg['metadata'][profile]
                record=module.confirmed_plan(f.state,meta['filename'],meta['digest'])
                events=[module.strict(line) for line in f.state.read('attempt-'+record['nonce']+'.jsonl').splitlines()]
                result={'result':'CONTRADICTED_COMPLETE_QUARANTINED' if any(e['event']=='complete' for e in events)
                        else 'PARTIAL_OR_UNCERTAIN','current_enablement_authority':False,'mutations':0}
            else:
                meta=cfg['metadata'][profile]
                record=module.confirmed_plan(f.state,meta['filename'],meta['digest'])
                result=module.recover(record,f.context,f.state,meta['digest'])
        except Exception as error:
            result={'result':'PARTIAL_OR_UNCERTAIN','reason':str(error),'current_enablement_authority':False}
        finally:
            flags['capturing']=True
            module.os.write=original_write; module.os.fsync=original_fsync; module.os.readlink=original_readlink
            module.Directory.current=old_current
            f.state.close()
            for item in reversed(f.patches): item.stop()
            audit_enabled=False
        rpc('terminal',result=result)
    rpc('finished')


if __name__=='__main__':
    try: main()
    except Exception as error:
        sys.stderr.write(type(error).__name__+': '+str(error)+'\n')
        raise SystemExit(2)
