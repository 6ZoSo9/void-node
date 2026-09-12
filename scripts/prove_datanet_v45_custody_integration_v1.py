#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
"""Disposable integration controls for the real V45 source supervisor and consumers.

The canonical controls producer runs against explicitly synthetic candidate input.
No storage campaign, package installation, service, credentials or network access.
"""
from __future__ import annotations
import argparse
import contextlib
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import types
import zipfile

ROOT=Path(__file__).resolve().parents[1]
MARKER='VOID_DATANET_V45_CUSTODY_INTEGRATION_V1_GREEN'
CASES=('normal','third-role-distinct','third-role-identical','unsupported-publication',
       'paired-substitution','identical-substitution','inplace-paired-change','manifest-substitution',
       'parent-replacement','after-lend-substitution','unsealed-input','missing-custody',
       'capsule-replacement','duplicate-log-commitment','stale-attempt')

def load(rel):
    p=ROOT/rel;module=types.ModuleType('v45_test_'+p.stem);module.__file__=str(p)
    exec(compile(p.read_bytes(),str(p),'exec'),module.__dict__);return module

def need(ok,code):
    if not ok:raise AssertionError(code)

def git(repo,*args):
    return subprocess.run(['git','-C',str(repo),*args],capture_output=True,check=True,text=True).stdout.strip()

def seed(c,sup,client,root,ctx):
    """A clearly synthetic fixture producer, not an accepted campaign candidate."""
    flags=('preallocation_static_runtime','candidate_aba_control','candidate','candidate_controls',
           'producer_substitution_control','terminal_aba_control','terminal_verifier','source_execution_supervision',
           'artifact_upload','cross_runtime_stale_attempt_control','cross_runtime_aggregate','custody_session',
           'custody_controls','capsule_export')
    candidate={'marker':'VOID_DATANET_V45_FULL_STACK_AGGREGATE_CANDIDATE_V1_GREEN','status':'GREEN',
        **ctx,'source':{'head':ctx['head'],'tree':ctx['tree']},'source_execution':{
            'run_id':ctx['run_id'],'run_attempt':ctx['run_attempt'],
            'source_inventory_and_execution_generation_bound':True,'external_source_generation_aba_control':True},
        'artifact_generation_bound':True,'source_inventory_and_execution_generation_bound':True,
        'external_source_generation_aba_control':True,'exact_phase_argv_allowlisted':True,
        'supervisor_owned_create_only_outputs':True,'relabeled_help_controls':True,
        'workflow_run_attempt_bound':True,'mutators_retired':True,'capabilities_released':True,
        'process_accounting':{'scope':'runner_subgraph_only','runner_subgraph':{'trace_complete_within_subgraph':True},
            'full_job_process_census':False,'untraced_phases':{k:{'trace_complete':False,'process_lifetimes':None,'successful_execve':None} for k in flags}},
        'input_inventory':{'synthetic-fixture-only':{'bytes':0,'sha256':hashlib.sha256(b'').hexdigest()}},
        'tiers':{'v44':{'direct_read_errno':5}},'production_runtime_touched':False,'synthetic_input':True}
    candidate=sup.sealed(candidate);candidate['candidate_sha256']=candidate.pop('receipt_sha256')
    # candidate self-hash uses candidate_sha256, not receipt_sha256.
    body=dict(candidate);body.pop('candidate_sha256');candidate['candidate_sha256']=c.digest(c.canon(body))
    aba=sup.sealed({'marker':'VOID_DATANET_V45_CANDIDATE_ABA_CONTROL_V1_GREEN','status':'GREEN',
                    'rejection':'HOLD_V45_ARTIFACT_GENERATION_CHANGED','production_runtime_touched':False})
    outputs=sup.OwnedOutputs({'CANDIDATE':root/'datanet-v45-candidate-22.json','ABA':root/'datanet-v45-candidate-aba-control-22.json'},root.parent)
    manifest=sup.OwnedOutputs({'RECEIPT':root/'synthetic-input-source-receipt.json'},root.parent)
    rows=[];fds=[];anchors=[]
    try:
        for group in (outputs,manifest):
            for role,path in group.paths.items():
                anchor=os.open(path.parent.parent,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC);anchors.append(anchor)
                rows.append({'role':role,'path':str(path)});fds.extend((group.fds[role],group.parent_fds[role],anchor))
        program='import os,sys; os.write(int(sys.argv[1]),os.pread(int(sys.argv[3]),1000000,0));os.write(int(sys.argv[2]),os.pread(int(sys.argv[4]),1000000,0))'
        a=c.sealed_fd(c.canon(candidate));b=c.sealed_fd(c.canon(aba))
        cmd=[sys.executable,'-I','-B','-c',program,str(outputs.fds['CANDIDATE']),str(outputs.fds['ABA']),str(a),str(b)]
        source_hash=c.digest(program.encode());argv_hash=c.digest(c.canon({'argv':cmd}))
        client.request('PREPARE',fds=fds,context=ctx,phase='synthetic-input-fixture',members=rows,kind='normal',argv_sha256=argv_hash,entrypoint_sha256=source_hash)
        proc=subprocess.Popen(cmd,pass_fds=tuple(outputs.pass_fds())+(a,b))
        producer={'pid':proc.pid,'argv_sha256':argv_hash,'source_sha256':source_hash}
        client.request('PRODUCER',producer=producer);need(proc.wait(timeout=10)==0,'fixture writer failed')
        os.close(a);os.close(b)
        created=[outputs.binding(role) for role in outputs.paths]
        obj=sup.sealed({'marker':'VOID_DATANET_V45_SOURCE_EXECUTION_V1_GREEN','status':'GREEN',**ctx,
                        'phase':'synthetic-input-fixture','producer':{**producer,'returncode':0},'child_returncode':0,
                        'created_output_bindings':created,'synthetic_input':True})
        sup.write_to_fd(manifest.fds['RECEIPT'],c.canon(obj));client.request('CHECK');outputs.publish();manifest.publish();client.request('COMMIT')
        return outputs.paths
    finally:
        for fd in anchors:os.close(fd)
        outputs.close();manifest.close()

class Session:
    def __init__(self,c,ctx):
        self.c=c;self.ctx=ctx;self.left,right=socket.socketpair(socket.AF_UNIX,socket.SOCK_SEQPACKET)
        data=(ROOT/'scripts/datanet_v45_custody_session_v1.py').read_bytes()
        self.source=c.sealed_fd(data);self.context=c.sealed_fd(c.canon({**ctx,'custodian_source_sha256':c.digest(data)}))
        self.process=subprocess.Popen([sys.executable,'-I','-B',f'/proc/self/fd/{self.source}',
            '--channel-fd',str(right.fileno()),'--context-fd',str(self.context),'--source-fd',str(self.source)],
            pass_fds=(right.fileno(),self.context,self.source),stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        right.close();self.left.settimeout(30);msg,fds=c.receive(self.left)
        need(msg.get('status')=='STARTED' and not fds,'custodian did not start');self.client=c.Client(self.left.fileno())
    def close(self):
        self.client.close();self.left.close()
        if self.process.poll() is None:self.process.terminate()
        try:self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:self.process.kill();self.process.wait()
        self.process.stderr.close();os.close(self.source);os.close(self.context)

def denied_consumers(root):
    saved={k:os.environ.pop(k,None) for k in ('VOID_V45_CUSTODY_INPUT_FD',)}
    output=root/'forbidden-aggregate.json';results={}
    try:
        for file,fn in [('prove_datanet_v45_full_stack_evidence_composition_v1.py','candidate_mode'),
                        ('prove_datanet_v45_full_stack_terminal_verifier_v1.py','finalize'),
                        ('prove_datanet_v45_cross_runtime_aggregate_v1.py','aggregate')]:
            mod=load('scripts/'+file)
            ns=argparse.Namespace(run_id=77,run_attempt=1,output=str(output))
            try:getattr(mod,fn)(ns)
            except Exception as exc:
                need(getattr(exc,'code',None)=='HOLD_V45_CUSTODY_REQUIRED',f'wrong consumer rejection {fn}: {exc}')
                results[fn]=exc.code
            else:raise AssertionError('consumer accepted missing custody')
            need(not output.exists(),'aggregate emitted on failed custody')
        return results
    finally:
        for k,v in saved.items():
            if v is not None:os.environ[k]=v

def run_case(name,repo,ctx):
    sup=load('scripts/prove_datanet_v45_source_execution_v1.py');c=load('scripts/datanet_v45_custody_session_v1.py')
    with tempfile.TemporaryDirectory(prefix='void-v45-custody-integration-') as tmp:
        work=Path(tmp);root=work/'evidence';root.mkdir();other=work/'controls';other.mkdir()
        session=Session(c,ctx);env={k:os.environ.get(k) for k in ('VOID_V45_CUSTODY_CHANNEL_FD','VOID_V45_CUSTODY_INPUT_FD')}
        extra=[];supervisor_fd=None
        try:
            paths=seed(c,sup,session.client,root,ctx)
            os.environ[c.ENV_CHANNEL]=str(session.left.fileno());os.environ.pop(c.ENV_INPUT,None)
            supervisor_data=(ROOT/'scripts/prove_datanet_v45_source_execution_v1.py').read_bytes()
            supervisor_fd=c.sealed_fd(supervisor_data)
            outputs={'OUTPUT':root/'datanet-v45-controls-22.json','SUBSTITUTE_CANDIDATE':other/'substitute-candidate.json','SUBSTITUTE_CONTROLS':other/'substitute-controls.json'}
            receipt=root/'datanet-v45-source-execution-controls-22.json'
            source_blob=sup.git_blob(supervisor_data)
            ns=argparse.Namespace(supervisor_fd=supervisor_fd,bootstrap_supervisor_blob=source_blob,repo_root=str(repo),
                expected_head=ctx['head'],expected_tree=ctx['tree'],node_major=22,run_id=77,run_attempt=1,
                phase='controls',entrypoint='scripts/prove_datanet_v45_full_stack_aggregate_controls_v1.py',
                receipt=str(receipt),snapshot_parent=str(work),owned_output=[k+'='+str(p) for k,p in outputs.items()],
                bind_output=['OUTPUT'],stdout_output=None,stderr_output=None,
                path_token=['CANDIDATE='+str(paths['CANDIDATE']),'CANDIDATE_ABA_RECEIPT='+str(paths['ABA'])],
                entrypoint_stdin=False,expect_generation_hold=False,expect_hold=None,control_ready=None,
                control_continue=None,control_target=None,command=sup.phase_spec('controls',22)['argv'])
            original=sup.rename_noreplace;calls=[];sentinel={}
            def cut(src,dst,*,src_dir_fd,dst_dir_fd):
                calls.append(dst)
                if name=='unsupported-publication':raise sup.SourceHold('HOLD_V45_OUTPUT_NOREPLACE_UNSUPPORTED')
                if name in ('third-role-distinct','third-role-identical') and len(calls)==3:
                    data=b'foreign sentinel\n'
                    if name=='third-role-identical':
                        fd=os.open(src,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW,dir_fd=src_dir_fd)
                        try:data=c.read_fd(fd)
                        finally:os.close(fd)
                    fd=os.open(dst,os.O_RDWR|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC,0o400,dir_fd=dst_dir_fd)
                    try:os.write(fd,data);os.fsync(fd);sentinel.update(identity=c.identity(os.fstat(fd)),sha256=c.digest(data))
                    finally:os.close(fd)
                original(src,dst,src_dir_fd=src_dir_fd,dst_dir_fd=dst_dir_fd)
            sup.rename_noreplace=cut
            captured=io.StringIO();error=None
            try:
                with contextlib.redirect_stderr(captured):sup.run(ns)
            except Exception as exc:error=exc
            finally:sup.rename_noreplace=original
            if name in ('third-role-distinct','third-role-identical','unsupported-publication'):
                expected='HOLD_V45_OUTPUT_NOREPLACE_UNSUPPORTED' if name=='unsupported-publication' else 'HOLD_V45_OUTPUT_PREEXISTING'
                need(getattr(error,'code',None)==expected,f'wrong publication result: {error}')
                need(not receipt.exists(),'success receipt published for failed bundle')
                if sentinel:
                    path=outputs['SUBSTITUTE_CONTROLS'];need(c.identity(os.stat(path))==sentinel['identity'] and c.digest(path.read_bytes())==sentinel['sha256'],'foreign sentinel changed')
                    need(outputs['OUTPUT'].exists() and outputs['SUBSTITUTE_CANDIDATE'].exists(),'did not reach third role')
                try:session.client.request('LEND')
                except Exception as exc:need(getattr(exc,'code',None)=='HOLD_V45_CUSTODY_LEND_DURING_WRITE','failed bundle was lendable')
                else:raise AssertionError('partial bundle lent')
                return {'case':name,'status':'PASS','rejection':expected,'success_receipt':False,
                        'published_provisional_outputs':2 if sentinel else 0,'sentinel_preserved':bool(sentinel),
                        'canonical_consumers':denied_consumers(work)}
            need(error is None,f'real controls phase failed: {error}; {captured.getvalue()}')
            data=outputs['OUTPUT'].read_bytes();before=c.identity(os.stat(outputs['OUTPUT']))
            def replace(path,payload):
                new=path.with_name(path.name+'.test-replacement');new.write_bytes(payload);new.chmod(0o400);os.replace(new,path)
            if name in ('paired-substitution','identical-substitution','after-lend-substitution','inplace-paired-change','manifest-substitution','parent-replacement'):
                if name=='after-lend-substitution':
                    input_fd,borrowed=sup.borrow_custody_inputs(c,session.client);extra=[input_fd,*borrowed]
                replacement=b'{"substituted":true}\n'
                if name in ('identical-substitution','after-lend-substitution'):replacement=data
                if name=='parent-replacement':
                    root.rename(work/'original-evidence');root.mkdir()
                elif name=='manifest-substitution':replace(receipt,receipt.read_bytes())
                elif name=='inplace-paired-change':
                    obj=json.loads(receipt.read_bytes());obj['created_output_bindings'][0]['sha256']=c.digest(replacement)
                    obj['created_output_bindings'][0]['bytes']=len(replacement);obj=sup.sealed(obj)
                    for path,raw in ((outputs['OUTPUT'],replacement),(receipt,c.canon(obj))):
                        path.chmod(0o600);path.write_bytes(raw);path.chmod(0o400)
                else:
                    if name=='paired-substitution':
                        obj=json.loads(receipt.read_bytes());obj['created_output_bindings'][0]['sha256']=c.digest(replacement)
                        obj['created_output_bindings'][0]['bytes']=len(replacement);replace(receipt,c.canon(sup.sealed(obj)))
                    replace(outputs['OUTPUT'],replacement)
                if name=='after-lend-substitution':
                    os.environ[c.ENV_INPUT]=str(input_fd)
                    mod=load('scripts/prove_datanet_v45_full_stack_aggregate_controls_v1.py')
                    try:mod.read_object(outputs['OUTPUT'])
                    except Exception as exc:code=getattr(exc,'code',None);need(code in ('HOLD_V45_CUSTODY_INPUT_IDENTITY','HOLD_V45_CUSTODY_INPUT_NAME'),'borrowed reader accepted replacement')
                    else:raise AssertionError('borrowed consumer accepted replacement')
                else:
                    try:session.client.request('LEND')
                    except Exception as exc:code=getattr(exc,'code',None);need(code in ('HOLD_V45_CUSTODY_ORIGINAL_OBJECT_CHANGED','HOLD_V45_CUSTODY_COMMITTED_OBJECT_CHANGED','HOLD_V45_CUSTODY_PARENT_REPLACED','HOLD_V45_CUSTODY_FINAL_NAME_CHANGED'),f'wrong substitution refusal: {exc}')
                    else:raise AssertionError('substitution accepted')
                return {'case':name,'status':'PASS','rejection':code,'canonical_consumers':denied_consumers(work)}
            if name=='missing-custody':return {'case':name,'status':'PASS','canonical_consumers':denied_consumers(work)}
            if name=='unsealed-input':
                fd=os.memfd_create('unsealed-test',os.MFD_CLOEXEC);extra=[fd];os.write(fd,b'{}\n');os.environ[c.ENV_INPUT]=str(fd)
                mod=load('scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py')
                try:mod.finalize(argparse.Namespace())
                except Exception as exc:need(getattr(exc,'code',None)=='HOLD_V45_CUSTODY_INPUT_UNSEALED',f'wrong seal rejection {exc}')
                else:raise AssertionError('unsealed input accepted')
                return {'case':name,'status':'PASS','rejection':'HOLD_V45_CUSTODY_INPUT_UNSEALED'}
            if name=='stale-attempt':
                mod=load('scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py')
                try:mod.aggregate(argparse.Namespace(run_id=77,run_attempt=2))
                except Exception as exc:need(getattr(exc,'code',None)=='HOLD_V45_MATRIX_STALE_ATTEMPT','stale attempt not first gate')
                else:raise AssertionError('stale attempt accepted')
                return {'case':name,'status':'PASS','rejection':'HOLD_V45_MATRIX_STALE_ATTEMPT'}
            exported,fds=session.client.request('EXPORT',root=str(root),terminal_phase='controls');extra.extend(fds)
            need(exported.get('status')=='EXPORTED' and len(fds)==1,'no capsule export')
            capsule=c.read_fd(fds[0]);need(c.digest(capsule)==exported['capsule_sha256'],'capsule mismatch')
            mod=load('scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py')
            line=('2026-09-12T00:00:00.0000000Z '+c.COMMIT_MARKER+' '+c.canon(exported).decode()).encode()
            if name=='duplicate-log-commitment':
                try:mod.capsule_log_commitment(line+line,22,ctx['head'],ctx['tree'],77,1)
                except Exception as exc:need(getattr(exc,'code',None)=='HOLD_V45_CAPSULE_LOG_COMMITMENT_COUNT','duplicate log accepted')
                else:raise AssertionError('duplicate commitment accepted')
                return {'case':name,'status':'PASS','rejection':'HOLD_V45_CAPSULE_LOG_COMMITMENT_COUNT'}
            binding=mod.capsule_log_commitment(line,22,ctx['head'],ctx['tree'],77,1)
            if name=='capsule-replacement':
                outer=io.BytesIO()
                with zipfile.ZipFile(outer,'w') as z:z.writestr('capsule.zip',b'replaced capsule')
                try:mod.checked_capsule_members(outer.getvalue(),binding)
                except Exception as exc:need(getattr(exc,'code',None)=='HOLD_V45_CAPSULE_LOG_DIGEST','capsule substitution accepted')
                else:raise AssertionError('capsule substitution accepted')
                return {'case':name,'status':'PASS','rejection':'HOLD_V45_CAPSULE_LOG_DIGEST'}
            need(name=='normal','unhandled test')
            return {'case':name,'status':'PASS','real_controls_producer':True,'source_receipt_published':True,
                    'custody_retained_after_supervisor_return':True,'capsule_sha256':exported['capsule_sha256'],
                    'full_campaign_accepted':False}
        finally:
            for fd in extra:
                try:os.close(fd)
                except OSError:pass
            if supervisor_fd is not None:os.close(supervisor_fd)
            session.close()
            for k,v in env.items():
                if v is None:os.environ.pop(k,None)
                else:os.environ[k]=v

def main():
    p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--case',choices=CASES)
    ns=p.parse_args();repo=Path(os.environ.get('GIT_WORK_TREE',str(ROOT)))
    ctx={'head':git(repo,'rev-parse','HEAD'),'tree':git(repo,'rev-parse','HEAD^{tree}'),'node_major':22,'run_id':77,'run_attempt':1}
    results=[run_case(name,repo,ctx) for name in ((ns.case,) if ns.case else CASES)]
    out={'marker':MARKER,'status':'GREEN','cases':results,'canonical_controls_source_sha256':hashlib.sha256((ROOT/'scripts/prove_datanet_v45_full_stack_aggregate_controls_v1.py').read_bytes()).hexdigest(),
         'real_supervisor_run_exercised':True,'synthetic_inputs':True,'storage_campaign_executed':False,
         'full_campaign_accepted':False,'production_runtime_touched':False}
    raw=(json.dumps(out,sort_keys=True,separators=(',',':'))+'\n').encode()
    if os.environ.get('VOID_V45_OUTPUT_CUSTODY_V1')=='1':
        fd=json.loads(os.environ['VOID_V45_OUTPUT_FDS'])[ns.output];need(os.fstat(fd).st_size==0,'prewritten test output');os.write(fd,raw);os.fsync(fd)
    else:
        fd=os.open(ns.output,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC|os.O_NOFOLLOW,0o600)
        try:os.write(fd,raw);os.fsync(fd)
        finally:os.close(fd)
    print(raw.decode(),end='');return 0

if __name__=='__main__':raise SystemExit(main())
