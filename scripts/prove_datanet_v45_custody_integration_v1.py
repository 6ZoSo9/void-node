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

ROOT=(Path(os.environ["VOID_V45_SOURCE_ROOT"]) if "VOID_V45_SOURCE_ROOT" in os.environ else Path(__file__).resolve().parents[1])
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
        # Explicit synthetic candidate input, emitted by an owned fixture
        # producer through role pipes, never via caller-supplied writable files.
        program = ("import json,os\nm=json.loads(os.environ['VOID_V45_OUTPUT_FDS'])\n"
                   + "os.write(m[" + repr(str(outputs.paths['CANDIDATE'])) + "], " + repr(c.canon(candidate)) + ")\n"
                   + "os.write(m[" + repr(str(outputs.paths['ABA'])) + "], " + repr(c.canon(aba)) + ")\n")
        source_fd=c.sealed_fd(program.encode());cwd_fd=os.open(root,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC)
        cmd=['python3','-I','-S','-B','@ENTRYPOINT@']
        source_hash=c.digest(program.encode());argv_hash=c.digest(c.canon({'argv':cmd}))
        try:
            client.request('PREPARE',fds=fds,context=ctx,phase='synthetic-input-fixture',members=rows,kind='normal',argv_sha256=argv_hash,entrypoint_sha256=source_hash)
            result, returned=client.request('LAUNCH',fds=(source_fd,cwd_fd),argv_tail=[],environment={},timeout_ms=10000,stdout_role=None)
            for fd in returned:os.close(fd)
            need(result.get('status')=='EXECUTED','fixture owned writer failed')
            producer=result['producer'];observation=result['observation']
        finally:
            os.close(source_fd);os.close(cwd_fd)
        created=[outputs.binding(role) for role in outputs.paths]
        obj=sup.sealed({'marker':'VOID_DATANET_V45_SOURCE_EXECUTION_V1_GREEN','status':'GREEN',**ctx,
                        'phase':'synthetic-input-fixture','producer':{**producer,'returncode':0},'producer_observation':observation,'child_returncode':0,
                        'created_output_bindings':created,'synthetic_input':True})
        sup.write_to_fd(manifest.fds['RECEIPT'],c.canon(obj));client.request('CHECK');outputs.publish();manifest.publish();client.request('COMMIT')
        return outputs.paths
    finally:
        for fd in anchors:os.close(fd)
        outputs.close();manifest.close()

class Session:
    def __init__(self,c,ctx,*,capture_resources=False):
        self.c=c;self.ctx=ctx;self.left,right=socket.socketpair(socket.AF_UNIX,socket.SOCK_SEQPACKET)
        data=(ROOT/'scripts/datanet_v45_custody_session_v1.py').read_bytes()
        self.source=c.sealed_fd(data);self.context=c.sealed_fd(c.canon({**ctx,'custodian_source_sha256':c.digest(data)}))
        self.process=subprocess.Popen([sys.executable,'-I','-S','-B',f'/proc/self/fd/{self.source}',
            *(['--capture-resources'] if capture_resources else []),
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
            consumer_checks=observed_consumer_controls(json.loads(receipt.read_bytes()))
            return {'case':name,'status':'PASS','real_controls_producer':True,'source_receipt_published':True,
                    'custody_retained_after_supervisor_return':True,'capsule_sha256':exported['capsule_sha256'],
                    'observed_provenance_consumers':consumer_checks,
                    'source_execution_receipt':json.loads(receipt.read_bytes()),
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

# Same-lane candidate controls. No call to the canonical workflow is added.
OBSERVED_CASES = (
    'normal', 'waited-child', 'fake-pid', 'dead-pid', 'foreign-pid',
    'wrong-source-hash', 'unsealed-source', 'nonzero-exit', 'output-overflow',
    'execution-deadline', 'surviving-writer', 'detached-surviving-writer',
    'surviving-no-writer', 'scm-rights-held', 'scm-rights-queued',
    'scm-rights-closed', 'writable-regular-input', 'bool-limit',
    'threaded-caller', 'preexisting-child', 'forged-observation', 'nul-argument',
)


def observed_worker(case, output, fixture_socket=None):
    """One isolated custodian; the SCM fixture receiver is outside its subtree."""
    c = load('scripts/datanet_v45_custody_session_v1.py')
    context = {'head': '5521cc244915fda0ecc55a60848674e12181a9ec',
               'tree': 'ccad534ec07f27438fafbf0d60d613b9d12f4066',
               'node_major': 22, 'run_id': 77, 'run_attempt': 1}
    # This context is explicitly a synthetic baseline label, not a hosted run
    # or an attestation that these candidate bytes have that Git head.
    programs = {
        'normal': 'import os\nos.write(1,b"observed-output\\n")\n',
        'waited-child': ('import os\np=os.fork()\nif p==0:\n os.write(1,b"child\\n");os._exit(0)\n'
                         'os.waitpid(p,0)\nos.write(1,b"parent\\n")\n'),
        'nonzero-exit': 'import os\nos.write(1,b"not-admissible\\n")\nos._exit(7)\n',
        'output-overflow': 'import os\nos.write(1,b"x"*8192)\n',
        'execution-deadline': 'import time\ntime.sleep(10)\n',
        'surviving-writer': ('import os,time\np=os.fork()\nif p==0:\n time.sleep(10);os._exit(0)\n'
                             'os.write(1,b"root-exited\\n")\nos._exit(0)\n'),
        'detached-surviving-writer': ('import os,time\np=os.fork()\nif p==0:\n os.setsid();time.sleep(10);os._exit(0)\n'
                                     'os.write(1,b"root-exited\\n")\nos._exit(0)\n'),
        'surviving-no-writer': ('import os,time\np=os.fork()\nif p==0:\n os.close(1);os.close(2);time.sleep(10);os._exit(0)\n'
                                'os.write(1,b"root-exited\\n")\nos._exit(0)\n'),
    }
    if case.startswith('scm-rights-'):
        need(fixture_socket is not None, 'fixture socket missing')
        programs[case] = ('import os,socket,array\ns=socket.socket(fileno='+str(fixture_socket)+')\n'
                          'os.write(1,b"transferred\\n")\n'
                          's.sendmsg([b"fixture-writer"],[(socket.SOL_SOCKET,socket.SCM_RIGHTS,array.array("i",[1]))])\n'
                          's.close()\n')
    raw = programs.get(case, programs['normal']).encode()
    source = c.sealed_fd(raw)
    inherited = ()
    owned = [source]
    request = {'context': context, 'phase': 'local-observed-producer-fixture',
               'source_sha256': c.digest(raw), 'argv_tail': [],
               'timeout_ms': 3000, 'max_output_bytes': 65536}
    expected = None
    unrelated_writer = False
    guard_thread = None
    guard_event = None
    guard_child = None
    guard_pipe = None
    if case in ('fake-pid', 'dead-pid', 'foreign-pid'):
        # Valid bytes from another, fully retired process are insufficient to
        # admit any caller-supplied identity. This is not a legacy-COMMIT test.
        r, w = os.pipe2(os.O_CLOEXEC)
        child = os.fork()
        if child == 0:
            os.close(r);os.write(w, b'observed-output\n');os._exit(0)
        os.close(w)
        need(os.read(r, 100) == b'observed-output\n', 'fixture bytes')
        os.close(r)
        need(os.waitpid(child, 0)[1] == 0, 'fixture writer exit')
        unrelated_writer = True
        request['producer'] = {'pid': 999999999999 if case == 'fake-pid' else
                               (child if case == 'dead-pid' else os.getppid())}
        expected = 'HOLD_V45_OBSERVED_REQUEST_SCHEMA'
    elif case == 'wrong-source-hash':
        request['source_sha256'] = '0'*64
        expected = 'HOLD_V45_OBSERVED_SOURCE_DIGEST'
    elif case == 'unsealed-source':
        os.close(source);owned.clear()
        source = os.memfd_create('void-unsealed-fixture', os.MFD_CLOEXEC | os.MFD_ALLOW_SEALING)
        owned.append(source);os.write(source, raw)
        expected = 'HOLD_V45_OBSERVED_SOURCE_UNSEALED'
    elif case == 'nonzero-exit':
        expected = 'HOLD_V45_OBSERVED_NONZERO_EXIT'
    elif case == 'output-overflow':
        request['max_output_bytes'] = 1024
        expected = 'HOLD_V45_OBSERVED_OUTPUT_LIMIT'
    elif case == 'execution-deadline':
        request['timeout_ms'] = 350
        expected = 'HOLD_V45_OBSERVED_EXECUTION_DEADLINE'
    elif case in ('surviving-writer', 'detached-surviving-writer', 'surviving-no-writer'):
        expected = 'HOLD_V45_OBSERVED_LIVE_DESCENDANT'
    elif case.startswith('scm-rights-'):
        inherited = (fixture_socket,)
        if case != 'scm-rights-closed':
            expected = 'HOLD_V45_OBSERVED_WRITABLE_STREAM_RETAINED'
    elif case == 'writable-regular-input':
        extra = os.memfd_create('void-writable-fixture', os.MFD_CLOEXEC)
        owned.append(extra);inherited=(extra,)
        expected = 'HOLD_V45_OBSERVED_WRITABLE_REGULAR_INPUT'
    elif case == 'bool-limit':
        request['timeout_ms'] = True
        expected = 'HOLD_V45_OBSERVED_LIMITS'
    elif case == 'threaded-caller':
        import threading
        guard_event = threading.Event()
        guard_thread = threading.Thread(target=guard_event.wait)
        guard_thread.start()
        expected = 'HOLD_V45_OBSERVED_THREADS_PRESENT'
    elif case == 'preexisting-child':
        r, w = os.pipe2(os.O_CLOEXEC)
        guard_child = os.fork()
        if guard_child == 0:
            os.close(w);os.read(r, 1);os._exit(0)
        os.close(r);guard_pipe = w
        expected = 'HOLD_V45_OBSERVED_PREEXISTING_CHILD'
    elif case == 'forged-observation':
        request['producer_identity_independently_verified'] = True
        expected = 'HOLD_V45_OBSERVED_REQUEST_SCHEMA'
    elif case == 'nul-argument':
        request['argv_tail'] = ['bad\0argument']
        expected = 'HOLD_V45_OBSERVED_ARGV'
    observer = c.ObservedStreamProducer()
    result = None
    rejected = None
    try:
        try:
            result = observer.run(request, source, inherited_fds=inherited)
        except c.CustodyHold as exc:
            rejected = exc.code
            result = observer.report
        need(rejected == expected, f'{case}: expected {expected}, got {rejected}; {result}')
        need(result['cleanup_complete'], f'{case}: cleanup incomplete')
        need(result['full_campaign_accepted'] is False and
             result['full_job_process_census'] is False and
             result['workflow_integration_complete'] is False, 'overclaimed acceptance')
        if expected:
            need(result['local_stream_take_permitted'] is False, 'HOLD permitted admission')
            try:
                observer.take()
            except c.CustodyHold as exc:
                need(exc.code == 'HOLD_V45_OBSERVED_NOT_VERIFIED', 'wrong withheld-byte gate')
            else:
                raise AssertionError('HOLD exposed output bytes')
        else:
            payloads = observer.take()
            need(all(result[k] is True for k in ('producer_identity_independently_verified',
                 'producer_exec_observed', 'producer_output_capability_coupled',
                 'producer_subtree_retired', 'output_streams_retired')), 'missing positive observation')
            expected_stdout = (b'child\nparent\n' if case == 'waited-child' else
                               b'transferred\n' if case == 'scm-rights-closed' else b'observed-output\n')
            need(payloads == {'stdout': expected_stdout, 'stderr': b''}, 'positive bytes changed')
            try:
                observer.take()
            except c.CustodyHold as exc:
                need(exc.code == 'HOLD_V45_OBSERVED_NOT_VERIFIED', 'wrong replay gate')
            else:
                raise AssertionError('bundle admitted twice')
        try:
            observer.run(request, source, inherited_fds=inherited)
        except c.CustodyHold as exc:
            need(exc.code == 'HOLD_V45_OBSERVED_REPLAY', 'wrong repeat-run gate')
        else:
            raise AssertionError('observer ran a second time')
        if guard_child is not None:
            need(os.waitpid(guard_child, os.WNOHANG)[0] == 0, 'unowned preexisting child was touched')
        out = {'case': case, 'status': 'PASS', 'expected_rejection': expected,
               'replay_rejected': True, 'preexisting_child_preserved': guard_child is not None,
               'actual_rejection': rejected, 'unrelated_writer_completed': unrelated_writer,
               'capsule_emitted': False, 'per_runtime_aggregate_emitted': False,
               'cross_runtime_aggregate_emitted': False, 'observation': result}
        Path(output).write_bytes(c.canon(out))
        return 0
    finally:
        if guard_thread is not None:
            guard_event.set();guard_thread.join(timeout=2)
        if guard_pipe is not None:
            os.close(guard_pipe)
        if guard_child is not None:
            os.waitpid(guard_child, 0)
        for fd in owned:
            os.close(fd)


def observed_controls(output):
    import array
    import select
    import time
    c = load('scripts/datanet_v45_custody_session_v1.py')
    results = []
    before = set(os.listdir('/proc/self/fd'))
    with tempfile.TemporaryDirectory(prefix='void-v45-observed-controls-') as work:
        for case in OBSERVED_CASES:
            target = Path(work)/(case+'.json')
            cmd = [sys.executable, '-I', '-S', '-B', str(Path(__file__).resolve()),
                   '--observed-producer-case', case, '--output', str(target)]
            left = right = None
            received = []
            queued_payload = False
            proc = None
            started = time.monotonic()
            try:
                if case.startswith('scm-rights-'):
                    left, right = socket.socketpair(socket.AF_UNIX, socket.SOCK_SEQPACKET)
                    cmd += ['--observed-fixture-socket', str(right.fileno())]
                proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                        pass_fds=(right.fileno(),) if right else ())
                if right:
                    right.close();right=None
                if left and case != 'scm-rights-queued':
                    need(bool(select.select([left], [], [], 4)[0]), 'fixture transfer timed out')
                    data, anc, flags, _ = left.recvmsg(100, socket.CMSG_SPACE(16), socket.MSG_CMSG_CLOEXEC)
                    need(data == b'fixture-writer' and not flags & (socket.MSG_TRUNC | socket.MSG_CTRUNC), 'fixture transfer bad')
                    for level, kind, raw in anc:
                        need((level, kind) == (socket.SOL_SOCKET, socket.SCM_RIGHTS), 'fixture ancillary')
                        vals = array.array('i');vals.frombytes(raw);received.extend(vals)
                    need(len(received) == 1, 'fixture writer absent')
                    if case == 'scm-rights-closed':
                        os.close(received.pop())
                stdout, stderr = proc.communicate(timeout=7)
                need(proc.returncode == 0, case+': '+stderr.decode(errors='replace')[-12000:])
                if left and case == 'scm-rights-queued':
                    # Kept queued until after the observer rejected admission.
                    data, anc, flags, _ = left.recvmsg(100, socket.CMSG_SPACE(16), socket.MSG_CMSG_CLOEXEC)
                    need(data == b'fixture-writer' and not flags & (socket.MSG_TRUNC | socket.MSG_CTRUNC), 'queued fixture missing')
                    for level, kind, raw in anc:
                        need((level, kind) == (socket.SOL_SOCKET, socket.SCM_RIGHTS), 'queued ancillary')
                        vals = array.array('i');vals.frombytes(raw);received.extend(vals)
                    need(len(received) == 1, 'queued writer absent')
                    queued_payload = True
                row = json.loads(target.read_bytes())
                row['fixture_writer_held_outside_producer_subtree'] = case in ('scm-rights-held', 'scm-rights-queued')
                row['scm_rights_reference_still_queued_at_hold'] = queued_payload
                row['elapsed_ms'] = round((time.monotonic()-started)*1000)
                results.append(row)
            finally:
                if proc is not None and proc.poll() is None:
                    proc.kill();proc.wait(timeout=3)
                for fd in received:
                    os.close(fd)
                if left:left.close()
                if right:right.close()
        need(set(os.listdir('/proc/self/fd')) == before, 'harness FD leak')
    result = {'marker': 'VOID_V45_OBSERVED_STREAM_PRODUCER_CONTROLS_V1_GREEN',
              'status': 'GREEN', 'cases': results, 'case_count': len(results),
              'negative_cases': sum(x['actual_rejection'] is not None for x in results),
              'positive_cases': sum(x['actual_rejection'] is None for x in results),
              'synthetic_context': True, 'synthetic_run_id': 77,
              'baseline_head': '5521cc244915fda0ecc55a60848674e12181a9ec',
              'candidate_source_sha256': hashlib.sha256((ROOT/'scripts/datanet_v45_custody_session_v1.py').read_bytes()).hexdigest(),
              'controls_source_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'workflow_integration_complete': False, 'caller_producer_registration_forbidden': True,
              'nested_producer_prebinding_proved': False, 'full_job_process_census': False,
              'full_campaign_accepted': False, 'host_storage_campaign_executed': False,
              'production_runtime_touched': False, 'harness_fd_baseline_restored': True}
    Path(output).write_bytes(c.canon(result))
    print(json.dumps({k:v for k,v in result.items() if k != 'cases'}, sort_keys=True))
    return 0


# These controls exercise the actual Custodian state machine, not a parallel
# acceptance model. An explicit fixture-only inherited socket tests a foreign
# holder; the production RPC never accepts an arbitrary extra descriptor.
OWNED_COMMIT_CASES = ('normal', 'waited-child', 'fake-pid', 'dead-pid', 'foreign-pid',
    'forged-launch-observation', 'duplicate-role', 'invalid-kind', 'nonzero-exit',
    'surviving-writer', 'detached-surviving-writer', 'surviving-no-writer',
    'scm-rights-held', 'scm-rights-queued', 'scm-rights-closed',
    'forged-receipt-observation', 'unobserved-output',
    'same-pid-reexec', 'child-fork-exec', 'grandchild-exec', 'thread-clone',
    'closed-stream-reexec')


def observed_consumer_controls(receipt):
    modules = [load('scripts/'+p) for p in (
        'prove_datanet_v45_full_stack_evidence_composition_v1.py',
        'prove_datanet_v45_full_stack_terminal_verifier_v1.py',
        'prove_datanet_v45_cross_runtime_aggregate_v1.py')]
    for mod in modules:mod.verify_observed_producer_receipt(receipt)
    mutations=[]
    for key in ('producer_identity_independently_verified','producer_exec_observed',
                'producer_output_capability_coupled','producer_subtree_retired'):
        mutations.append(('receipt-'+key, (key,),False))
        mutations.append(('observation-'+key, ('producer_observation',key),False))
    mutations.extend([
        ('lifetime-false',('producer_observation','producer_exec_lifetime_verified'),False),
        ('old-initial-only-scope',('producer_observation','exec_observation'),'PTRACE_EVENT_EXEC_INITIAL_ONLY'),
        ('wrong-trace-policy',('producer_observation','trace_policy'),'initial-only'),
        ('unexpected-exec-count',('producer_observation','unadmitted_exec_count'),1),
        ('extra-admitted-exec',('producer_observation','observed_subtree_exec_count'),2),
        ('bool-task-count',('producer_observation','observed_task_count'),True),
        ('unfinished-traced-task',('producer_observation','observed_task_exits'),0),
        ('zero-trace-events',('producer_observation','trace_wait_events'),0),
        ('missing-observation',('producer_observation',),None),
        ('wrong-pid',('producer_observation','producer','pid'),999999999999),
        ('wrong-parent',('producer_observation','producer','ppid'),999999999999),
        ('wrong-source',('producer_observation','source_sha256'),'0'*64),
        ('wrong-argv',('producer_observation','argv_sha256'),'0'*64),
        ('wrong-context',('producer_observation','context','run_attempt'),2),
        ('wrong-scope',('producer_observation_scope',),'all-writers'),
        ('self-report',('supervisor_reported_producer_metadata',),{'pid':1}),
        ('false-capture-authority',('stdout_captured_by_supervisor',),True),
        ('live-stream',('producer_observation','output_streams_retired'),False),
        ('incomplete-cleanup',('producer_observation','cleanup_complete'),False),
        ('wrong-role-stream',('producer_observation','role_streams','OUTPUT'),'missing'),
        ('changed-stream-bytes',('producer_observation','stream_bindings','stdout','bytes'),1),
        ('overstated-census',('producer_observation','full_job_process_census'),True),
        ('overstated-nested-origin',('producer_observation','nested_producer_prebinding_proved'),True)])
    records=[]
    for name,path,value in mutations:
        altered=copy.deepcopy(receipt);target=altered
        for key in path[:-1]:target=target[key]
        target[path[-1]]=value
        body=dict(altered);body.pop('receipt_sha256',None)
        altered['receipt_sha256']=hashlib.sha256((json.dumps(body,sort_keys=True,separators=(',',':'))+'\n').encode()).hexdigest()
        for mod in modules:
            try:mod.verify_observed_producer_receipt(altered)
            except Exception as exc:
                need(getattr(exc,'code',None)=='HOLD_V45_SOURCE_OBSERVED_PRODUCER',f'{name}: wrong provenance refusal {exc}')
                records.append({'mutation':name,'consumer':Path(mod.__file__).name,'rejection':exc.code})
            else:raise AssertionError('altered provenance accepted: '+name)
    return {'positive_consumers':3,'mutation_count':len(mutations),'rejections':records,
            'semantic_internal_consistency_only':True,'external_custody_still_required':True}


def owned_commit_worker(case, output, fixture_socket=None):
    c=load('scripts/datanet_v45_custody_session_v1.py')
    sup=load('scripts/prove_datanet_v45_source_execution_v1.py')
    ctx={'head':git(ROOT,'rev-parse','HEAD'),'tree':git(ROOT,'rev-parse','HEAD^{tree}'),
         'node_major':22,'run_id':77,'run_attempt':1}
    with tempfile.TemporaryDirectory(prefix='void-v45-owned-commit-') as tmp:
        work=Path(tmp);root=work/'evidence';root.mkdir()
        outputs=sup.OwnedOutputs({'OUTPUT':root/'output.json','AUX':root/'aux.json'},work)
        manifest=sup.OwnedOutputs({'RECEIPT':root/'receipt.json'},work)
        owner=c.Custodian(ctx);anchors=[];handoff=[];source_fd=cwd_fd=returned=None
        original_run=c.ObservedStreamProducer.run;code=None;cleanup=True;observed=None
        try:
            rows=[]
            for group in (outputs,manifest):
                for role,path in group.paths.items():
                    anchor=os.open(path.parent.parent,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC);anchors.append(anchor)
                    rows.append({'role':role,'path':str(path)})
                    handoff.extend(os.dup(fd) for fd in (group.fds[role],group.parent_fds[role],anchor))
            prelude="import os,json,time\nm=json.loads(os.environ['VOID_V45_OUTPUT_FDS'])\nfds=list(m.values())\n"
            ending="\nfor fd in fds:os.write(fd,b'owned-output\\n')\n"
            middle=''
            if case=='waited-child':middle='p=os.fork()\nif p==0:os._exit(0)\nos.waitpid(p,0)\n'
            if case in ('surviving-writer','detached-surviving-writer','surviving-no-writer'):
                child='os.setsid()\n' if case=='detached-surviving-writer' else ''
                if case=='surviving-no-writer':child+='for fd in [1,2,*fds]:\n    try:os.close(fd)\n    except OSError:pass\n'
                child+='time.sleep(5)\nos._exit(0)\n'
                middle='p=os.fork()\nif p==0:\n'+''.join('    '+line+'\n' for line in child.splitlines())
            if case=='nonzero-exit':ending+='os._exit(7)\n'
            if case in ('same-pid-reexec','child-fork-exec','grandchild-exec','closed-stream-reexec'):
                # Harmless replacement fixture: it would emit the same expected
                # role bytes. Only the hardened owned-tree path executes here.
                replacement="import os,json\nfor fd in json.loads(os.environ['VOID_V45_OUTPUT_FDS']).values():os.write(fd,b'owned-output\\n')\n"
                command="import sys\nos.execve(sys.executable,[sys.executable,'-I','-S','-B','-c',"+repr(replacement)+"],dict(os.environ))\n"
                if case=='child-fork-exec':
                    middle='p=os.fork()\nif p==0:\n'+''.join('    '+line+'\n' for line in command.splitlines())+'os.waitpid(p,0)\n'
                elif case=='grandchild-exec':
                    nested='q=os.fork()\nif q==0:\n'+''.join('    '+line+'\n' for line in command.splitlines())+'os.waitpid(q,0)\nos._exit(0)\n'
                    middle='p=os.fork()\nif p==0:\n'+''.join('    '+line+'\n' for line in nested.splitlines())+'os.waitpid(p,0)\n'
                else:
                    middle=command
                    if case=='closed-stream-reexec':
                        middle='for fd in [1,2,*fds]:\n    try:os.close(fd)\n    except OSError:pass\n'+middle
                ending=''
            if case=='thread-clone':
                middle='import threading\nt=threading.Thread(target=lambda:None)\nt.start()\nt.join()\n'

            tail=[]
            if case.startswith('scm-rights-'):
                need(fixture_socket is not None,'fixture socket required')
                middle=("import socket,array,sys\ns=socket.socket(fileno=int(sys.argv[1]))\n"
                    "s.sendmsg([b'fixture-writer'],[(socket.SOL_SOCKET,socket.SCM_RIGHTS,array.array('i',[fds[0]]))])\ns.close()\n")
                tail=[str(fixture_socket)]
                def fixture_run(self,request,fd,*,inherited_fds=(),phase_io=None,helper_plan=None):
                    return original_run(self,request,fd,inherited_fds=(*inherited_fds,fixture_socket),phase_io=phase_io,helper_plan=helper_plan)
                c.ObservedStreamProducer.run=fixture_run
            program=(prelude+middle+ending).encode()
            source_fd=c.sealed_fd(program);cwd_fd=os.open(root,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC)
            prep={'op':'PREPARE','context':ctx,'phase':'owned-commit-fixture','members':rows,'kind':'normal',
                  'argv_sha256':c.digest(c.canon({'argv':['python3','-I','-S','-B','@ENTRYPOINT@',*tail]})),
                  'entrypoint_sha256':c.digest(program)}
            if case=='duplicate-role':prep['members'][1]['role']='OUTPUT'
            if case=='invalid-kind':prep['kind']='unobserved'
            try:
                owner.prepare(prep,handoff);handoff=[]
                if case in ('fake-pid','dead-pid','foreign-pid'):
                    # Writer executes normally, but claimed identity is never accepted.
                    if case=='dead-pid':
                        p=subprocess.Popen([sys.executable,'-I','-S','-B','-c','pass']);p.wait();pid=p.pid
                    else:pid=999999999999 if case=='fake-pid' else os.getppid()
                    owner.producer({'op':'PRODUCER','producer':{'pid':pid,'argv_sha256':prep['argv_sha256'],
                                                             'source_sha256':prep['entrypoint_sha256']}})
                request={'op':'LAUNCH','argv_tail':tail,'environment':{},'timeout_ms':2000,'stdout_role':None}
                if case=='forged-launch-observation':request['observation']={'pid':999999999999,'status':'VERIFIED'}
                result,returned=owner.launch(request,[source_fd,cwd_fd]);os.close(returned);returned=None
                need(result['status']=='EXECUTED','missing owned execution')
                created=[outputs.binding(role) for role in outputs.paths]
                receipt={'marker':'VOID_DATANET_V45_SOURCE_EXECUTION_V1_GREEN','status':'GREEN',**ctx,
                    'phase':'owned-commit-fixture','producer':{**result['producer'],'returncode':0},
                    'producer_observation':copy.deepcopy(result['observation']),'child_returncode':0,
                    'created_output_bindings':created,'synthetic_input':True}
                if case=='forged-receipt-observation':receipt['producer_observation']['producer']['pid']=999999999999
                if case=='unobserved-output':
                    os.ftruncate(outputs.fds['OUTPUT'],0);os.lseek(outputs.fds['OUTPUT'],0,0)
                    os.write(outputs.fds['OUTPUT'],b'unobserved-bytes\n')
                receipt=sup.sealed(receipt);sup.write_to_fd(manifest.fds['RECEIPT'],c.canon(receipt))
                owner.check({'op':'CHECK'});outputs.publish();manifest.publish();owner.commit()
            except c.CustodyHold as exc:
                code=exc.code
                if hasattr(exc,'observation'):
                    observed=exc.observation
                    cleanup=observed.get('cleanup_complete') is True
            valid=case in ('normal','waited-child','scm-rights-closed')
            expected={
              'fake-pid':'HOLD_V45_CUSTODY_CALLER_PRODUCER_FORBIDDEN','dead-pid':'HOLD_V45_CUSTODY_CALLER_PRODUCER_FORBIDDEN',
              'foreign-pid':'HOLD_V45_CUSTODY_CALLER_PRODUCER_FORBIDDEN',
              'forged-launch-observation':'HOLD_V45_CUSTODY_LAUNCH_SCHEMA',
              'duplicate-role':'HOLD_V45_CUSTODY_DUPLICATE_MEMBER','invalid-kind':'HOLD_V45_CUSTODY_PREPARE_SCHEMA',
              'nonzero-exit':'HOLD_V45_OBSERVED_NONZERO_EXIT',
              'surviving-writer':'HOLD_V45_OBSERVED_LIVE_DESCENDANT',
              'detached-surviving-writer':'HOLD_V45_OBSERVED_LIVE_DESCENDANT',
              'surviving-no-writer':'HOLD_V45_OBSERVED_LIVE_DESCENDANT',
              'scm-rights-held':'HOLD_V45_OBSERVED_WRITABLE_STREAM_RETAINED',
              'scm-rights-queued':'HOLD_V45_OBSERVED_WRITABLE_STREAM_RETAINED',
              'forged-receipt-observation':'HOLD_V45_CUSTODY_RECEIPT_OBSERVATION',
              'unobserved-output':'HOLD_V45_CUSTODY_UNOBSERVED_OUTPUT',
              'same-pid-reexec':'HOLD_V45_OBSERVED_UNADMITTED_EXEC',
              'child-fork-exec':'HOLD_V45_OBSERVED_UNADMITTED_EXEC',
              'grandchild-exec':'HOLD_V45_OBSERVED_UNADMITTED_EXEC',
              'closed-stream-reexec':'HOLD_V45_OBSERVED_UNADMITTED_EXEC',
              'thread-clone':'HOLD_V45_OBSERVED_CLONE_PROFILE'}
            need(code==(None if valid else expected[case]),f'{case}: wrong rejection {code}')
            need(cleanup,'owned cleanup incomplete')
            if valid:
                commitment,fd=owner.export(str(root),'owned-commit-fixture')
                try:need(c.digest(c.read_fd(fd))==commitment['capsule_sha256'],'export digest')
                finally:os.close(fd)
                need(all(p.exists() for p in (*outputs.paths.values(),*manifest.paths.values())),'missing valid publication')
                row={'case':case,'status':'PASS','canonical_custodian_commit':True,'canonical_custodian_export':True,
                     'observation':result['observation']}
            else:
                need(not owner.phases,'phase accepted after rejection')
                need(not any(p.exists() for p in (*outputs.paths.values(),*manifest.paths.values())),'publication on rejection')
                for operation in (owner.commit,lambda:owner.export(str(root),'owned-commit-fixture')):
                    try:operation()
                    except c.CustodyHold:pass
                    else:raise AssertionError('commit or capsule admitted after rejection')
                row={'case':case,'status':'PASS','rejection':code,'canonical_custodian_commit':False,
                     'canonical_custodian_export':False,'canonical_consumers':denied_consumers(work)}
                if case not in ('forged-receipt-observation','unobserved-output'):
                    need(all(os.fstat(fd).st_size==0 for fd in outputs.fds.values()),'sink populated before retirement')
                    row['regular_outputs_still_empty']=True
            if observed is not None:
                row['observation']=observed
            if case in ('same-pid-reexec','child-fork-exec','grandchild-exec','closed-stream-reexec'):
                need(observed is not None and observed['unadmitted_exec_count']==1,
                     'exec transition not observed')
                stops=[e for e in observed['events'] if e['event']=='UNADMITTED_EXEC_STOP']
                need(len(stops)==1 and stops[0]['root_task'] == (case in ('same-pid-reexec','closed-stream-reexec')),
                     'wrong exec owner observed')
                row['kernel_exec_stop_before_replacement_execution']=True
            row.update(synthetic_context=True,fixture_extra_socket=case.startswith('scm-rights-'),
                       cleanup_complete=cleanup,full_campaign_accepted=False)
            Path(output).write_bytes(c.canon(row))
        finally:
            c.ObservedStreamProducer.run=original_run;owner.close()
            for fd in [*handoff,*anchors,source_fd,cwd_fd,returned]:
                if fd is not None:
                    try:os.close(fd)
                    except OSError:pass
            outputs.close();manifest.close()
    return 0


def owned_rpc_identity_controls(case_filter=None):
    c=load('scripts/datanet_v45_custody_session_v1.py');sup=load('scripts/prove_datanet_v45_source_execution_v1.py')
    ctx={'head':git(ROOT,'rev-parse','HEAD'),'tree':git(ROOT,'rev-parse','HEAD^{tree}'),
         'node_major':22,'run_id':77,'run_attempt':1}
    records=[]
    need(case_filter is None or case_filter in ('fake-pid','dead-pid','foreign-pid'), 'unknown identity case')
    for kind in ((case_filter,) if case_filter else ('fake-pid','dead-pid','foreign-pid')):
        with tempfile.TemporaryDirectory(prefix='void-v45-rpc-identity-') as tmp:
            work=Path(tmp);root=work/'evidence';root.mkdir();session=Session(c,ctx)
            outputs=sup.OwnedOutputs({'OUTPUT':root/'output.json'},work)
            manifest=sup.OwnedOutputs({'RECEIPT':root/'receipt.json'},work);anchors=[]
            try:
                rows=[];fds=[]
                for group in (outputs,manifest):
                    for role,path in group.paths.items():
                        anchor=os.open(path.parent.parent,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC);anchors.append(anchor)
                        rows.append({'role':role,'path':str(path)});fds.extend((group.fds[role],group.parent_fds[role],anchor))
                session.client.request('PREPARE',fds=fds,context=ctx,phase='rpc-identity-fixture',members=rows,
                    kind='normal',argv_sha256='0'*64,entrypoint_sha256='0'*64)
                pid=999999999999 if kind=='fake-pid' else os.getpid()
                if kind=='dead-pid':
                    child=subprocess.Popen([sys.executable,'-I','-S','-B','-c','pass']);child.wait(timeout=3);pid=child.pid
                try:session.client.request('PRODUCER',producer={'pid':pid,'argv_sha256':'0'*64,'source_sha256':'0'*64})
                except c.CustodyHold as exc:need(exc.code=='HOLD_V45_CUSTODY_CALLER_PRODUCER_FORBIDDEN','RPC identity refusal')
                else:raise AssertionError('RPC identity accepted')
                need(session.process.wait(timeout=3)!=0,'failed RPC session did not terminate')
                need(not any(path.exists() for path in (root/'output.json',root/'receipt.json')),'RPC failure publication')
                records.append({'case':kind,'status':'PASS','rejection':'HOLD_V45_CUSTODY_CALLER_PRODUCER_FORBIDDEN',
                                'actual_serve_client_protocol':True,'custodian_session_terminated':True,
                                'output_published':False,'capsule_emitted':False})
            finally:
                for fd in anchors:os.close(fd)
                session.close();outputs.close();manifest.close()
    return records


def owned_commit_controls(output):
    # The earlier fixture harness retains a foreign writer either in this parent
    # or in the anonymous socket queue. Reuse its transport, not its verifier.
    import array,select,time
    c=load('scripts/datanet_v45_custody_session_v1.py');results=[]
    baseline=set(os.listdir('/proc/self/fd'))
    with tempfile.TemporaryDirectory(prefix='void-v45-owned-commit-controls-') as tmp:
        for case in OWNED_COMMIT_CASES:
            target=Path(tmp)/(case+'.json');left=right=None;held=[];proc=None
            cmd=[sys.executable,'-I','-S','-B',str(Path(__file__).resolve()),'--owned-commit-case',case,'--output',str(target)]
            try:
                if case.startswith('scm-rights-'):
                    left,right=socket.socketpair(socket.AF_UNIX,socket.SOCK_SEQPACKET)
                    cmd+=['--observed-fixture-socket',str(right.fileno())]
                proc=subprocess.Popen(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,pass_fds=(right.fileno(),) if right else ())
                if right:right.close();right=None
                def receive_writer():
                    need(bool(select.select([left],[],[],4)[0]),'fixture socket timeout')
                    data,anc,flags,_=left.recvmsg(100,socket.CMSG_SPACE(16),socket.MSG_CMSG_CLOEXEC)
                    need(data==b'fixture-writer' and not flags&(socket.MSG_TRUNC|socket.MSG_CTRUNC),'fixture transfer bad')
                    for level,kind,raw in anc:
                        need((level,kind)==(socket.SOL_SOCKET,socket.SCM_RIGHTS),'fixture ancillary')
                        values=array.array('i');values.frombytes(raw);held.extend(values)
                    need(len(held)==1,'fixture writer absent')
                if left and case!='scm-rights-queued':
                    receive_writer()
                    if case=='scm-rights-closed':os.close(held.pop())
                out,err=proc.communicate(timeout=10)
                need(proc.returncode==0,case+': '+err.decode(errors='replace')[-8000:])
                if case=='scm-rights-queued':receive_writer()
                row=json.loads(target.read_bytes());row['scm_rights_reference_queued_through_hold']=case=='scm-rights-queued'
                results.append(row)
            finally:
                if proc and proc.poll() is None:proc.kill();proc.wait(timeout=3)
                for fd in held:os.close(fd)
                if left:left.close()
                if right:right.close()
    need(set(os.listdir('/proc/self/fd'))==baseline,'owned controls FD leak')
    rpc_cases=owned_rpc_identity_controls()
    result={'rpc_identity_cases':rpc_cases,'marker':'VOID_V45_OWNED_PRODUCER_COMMIT_CONTROLS_V1_GREEN','status':'GREEN','cases':results,
        'case_count':len(results),'positive_cases':3,'rejection_cases':len(results)-3,
        'actual_custodian_state_machine':True,'fixture_only_socket_adapter':True,
        'source_sha256':c.digest((ROOT/'scripts/datanet_v45_custody_session_v1.py').read_bytes()),
        'controls_sha256':c.digest(Path(__file__).read_bytes()),'head':git(ROOT,'rev-parse','HEAD'),
        'synthetic_context':True,'full_workflow_integration_complete':False,'full_campaign_accepted':False,
        'harness_fd_baseline_restored':True}
    Path(output).write_bytes(c.canon(result));print(json.dumps({k:v for k,v in result.items() if k!='cases'},sort_keys=True))
    return 0


def required_control_consumer_checks(receipt):
    modules = [load('scripts/'+name) for name in (
        'prove_datanet_v45_full_stack_evidence_composition_v1.py',
        'prove_datanet_v45_full_stack_terminal_verifier_v1.py',
        'prove_datanet_v45_cross_runtime_aggregate_v1.py')]
    for mod in modules:mod.verify_custody_control_result(receipt)
    mutations=[('missing-required-controls',None,None),
               ('wrong-case-count',('case_count',),21),
               ('wrong-positive-count',('positive_cases',),4),
               ('wrong-control-authority',('actual_custodian_state_machine',),False)]
    for i,row in enumerate(receipt['owned_producer_controls']['cases']):
        mutations.append((row['case']+'-not-passed',('cases',i,'status'),'SKIPPED'))
        if row['canonical_custodian_commit'] is False:
            mutations.append((row['case']+'-commit-accepted',('cases',i,'canonical_custodian_commit'),True))
    records=[]
    for name,path,value in mutations:
        obj=copy.deepcopy(receipt)
        if path is None:obj.pop('owned_producer_controls')
        else:
            target=obj['owned_producer_controls']
            for part in path[:-1]:target=target[part]
            target[path[-1]]=value
        for mod in modules:
            try:mod.verify_custody_control_result(obj)
            except Exception as exc:
                need(getattr(exc,'code',None)=='HOLD_V45_REQUIRED_OWNED_CONTROLS',
                     name+': incorrect required-control refusal '+str(exc))
                records.append({'mutation':name,'consumer':Path(mod.__file__).name,'rejection':exc.code})
            else:raise AssertionError('required control alteration accepted: '+name)
    return {'positive_consumers':3,'mutation_count':len(mutations),'rejection_count':len(records),'rejections':records}



HELPER_CASES = ('normal-static','normal-runtime','normal-candidate-aba','normal-candidate',
                'normal-producer-control','normal-terminal-aba','normal-finalizer',
                'wrong-argv','wrong-executable','out-of-order','duplicate-helper','missing-helper',
                'extra-helper','root-helper-reexec','grandchild-helper','changed-environment',
                'changed-cwd','substituted-input')
HELPER_REFUSALS = {
    'wrong-argv':'HOLD_V45_HELPER_ARGV_MISMATCH',
    'wrong-executable':'HOLD_V45_HELPER_EXECUTABLE_MISMATCH',
    'out-of-order':'HOLD_V45_HELPER_ARGV_MISMATCH',
    'duplicate-helper':'HOLD_V45_HELPER_ARGV_MISMATCH',
    'missing-helper':'HOLD_V45_HELPER_PLAN_INCOMPLETE',
    'extra-helper':'HOLD_V45_HELPER_EXEC_COUNT',
    'root-helper-reexec':'HOLD_V45_OBSERVED_UNADMITTED_EXEC',
    'grandchild-helper':'HOLD_V45_OBSERVED_UNADMITTED_EXEC',
    'changed-environment':'HOLD_V45_HELPER_ENVIRONMENT',
    'changed-cwd':'HOLD_V45_HELPER_CWD_MISMATCH',
    'substituted-input':'HOLD_V45_HELPER_INPUT_MISMATCH',
}


def helper_profile_worker(case, output):
    """Real custodian COMMIT gate, synthetic root writer and real read-only tools."""
    c=load('scripts/datanet_v45_custody_session_v1.py');sup=load('scripts/prove_datanet_v45_source_execution_v1.py')
    ctx={'head':git(ROOT,'rev-parse','HEAD'),'tree':git(ROOT,'rev-parse','HEAD^{tree}'),
         'node_major':22,'run_id':77,'run_attempt':1}
    phase={'normal-runtime':'runtime','normal-candidate-aba':'candidate-aba',
           'normal-candidate':'candidate','normal-producer-control':'producer-control',
           'normal-terminal-aba':'terminal-aba','normal-finalizer':'finalizer'}.get(case,'v45-static')
    with tempfile.TemporaryDirectory(prefix='void-v45-readonly-helpers-') as tmp:
        work=Path(tmp);root=work/'evidence';root.mkdir()
        outputs=sup.OwnedOutputs({'OUTPUT':root/'output.json'},work)
        manifest=sup.OwnedOutputs({'RECEIPT':root/'receipt.json'},work)
        owner=c.Custodian(ctx);anchors=[];handoff=[];source_fd=cwd_fd=returned=None
        code=None;observation=None
        try:
            rows=[]
            for group in (outputs,manifest):
                for role,path in group.paths.items():
                    anchor=os.open(path.parent.parent,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC);anchors.append(anchor)
                    rows.append({'role':role,'path':str(path)})
                    handoff.extend(os.dup(fd) for fd in (group.fds[role],group.parent_fds[role],anchor))
            program="import os,json,subprocess,types\nfrom pathlib import Path\n"
            program+="p=Path(os.environ['VOID_V45_SOURCE_ROOT'])/'scripts/datanet_v45_custody_session_v1.py'\n"
            program+="c=types.ModuleType('fixture_access');c.__file__=str(p);exec(compile(p.read_bytes(),str(p),'exec'),c.__dict__)\n"
            program+="plan=c.read_sealed(int(os.environ[c.ENV_HELPERS]));rows=plan['rows']\n"
            program+="def good(i):return c.run_bound_helper(rows[i]['requested_argv'],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)\n"
            program+="def raw(i,args=None,env=None,cwd=None,alter_input=False):\n"
            program+="    row=rows[i];args=row['executed_argv'] if args is None else args;e=dict(os.environ) if env is None else env\n"
            program+="    if row['requested_argv'][0]=='git':e.update(GIT_CONFIG_NOSYSTEM='1',GIT_CONFIG_GLOBAL='/dev/null',GIT_CONFIG_SYSTEM='/dev/null',GIT_OPTIONAL_LOCKS='0')\n"
            program+="    def alter():\n        fd=os.open('/dev/null',os.O_RDONLY);os.dup2(fd,row['input_bindings'][0]['fd']);os.close(fd)\n"
            program+="    return subprocess.run(args,pass_fds=tuple(row['pass_fds']),env=e,cwd=cwd,preexec_fn=alter if alter_input else None,stdout=subprocess.PIPE,stderr=subprocess.PIPE)\n"
            actions={
                'normal-static':'for i in range(len(rows)):good(i)\n',
                'normal-runtime':'for i in range(len(rows)):good(i)\n',
                'normal-candidate-aba':'for i in range(len(rows)):good(i)\n',
                'normal-candidate':'for i in range(len(rows)):good(i)\n',
                'normal-producer-control':'for i in range(len(rows)):good(i)\n',
                'normal-terminal-aba':'for i in range(len(rows)):good(i)\n',
                'normal-finalizer':'for i in range(len(rows)):good(i)\n',
                'wrong-argv':"raw(0,[rows[0]['executed_argv'][0],'rev-parse','--verify','HEAD'])\n",
                'wrong-executable':"raw(4)\n",
                'out-of-order':'raw(1)\n',
                'duplicate-helper':'good(0);raw(0)\n',
                'missing-helper':'pass\n',
                'extra-helper':'for i in range(5):good(i)\nraw(0)\n',
                'root-helper-reexec':"row=rows[0]\nos.execve(row['executable_fd'],row['executed_argv'],dict(os.environ))\n",
                'grandchild-helper':"p=os.fork()\nif p==0:\n    raw(0);os._exit(0)\nos.waitpid(p,0)\n",
                'changed-environment':"raw(0,env={**os.environ,'VOID_FIXTURE_UNADMITTED':'1'})\n",
                'changed-cwd':"raw(0,cwd='/')\n",
                'substituted-input':'for i in range(4):good(i)\nraw(4,alter_input=True)\n',
            }
            program+=actions[case]
            program+="\nfor fd in json.loads(os.environ['VOID_V45_OUTPUT_FDS']).values():os.write(fd,b'fixture-output\\n')\nprint('fixture-complete')\n"
            source_fd=c.sealed_fd(program.encode());cwd_fd=os.open(ROOT,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC)
            prep={'op':'PREPARE','context':ctx,'phase':phase,'members':rows,'kind':'normal',
                  'argv_sha256':c.digest(c.canon({'argv':['python3','-I','-S','-B','@ENTRYPOINT@']})),
                  'entrypoint_sha256':c.digest(program.encode())}
            # Under the retained-selftest profile ROOT is the immutable source
            # snapshot, intentionally without repository metadata. Preserve the
            # coordinator-admitted Git metadata when it is present. `ctx` above
            # was resolved through the same inherited environment, binding these
            # paths to the already-accepted head/tree. Direct standalone controls
            # retain the historical ROOT/.git fallback.
            inherited_git_dir=os.environ.get('GIT_DIR')
            inherited_git_work_tree=os.environ.get('GIT_WORK_TREE')
            need((inherited_git_dir is None)==(inherited_git_work_tree is None),
                 'helper git source environment pair')
            if inherited_git_dir is None:
                helper_git_dir=str(ROOT/'.git')
                helper_git_work_tree=str(ROOT)
            else:
                need(Path(inherited_git_dir).is_absolute() and Path(inherited_git_work_tree).is_absolute(),
                     'helper git source environment absolute')
                helper_git_dir=inherited_git_dir
                helper_git_work_tree=inherited_git_work_tree
            env={'PATH':os.environ.get('PATH',os.defpath),'VOID_V45_SOURCE_ROOT':str(ROOT),
                 'VOID_V45_SOURCE_EXECUTION_PHASE':phase,
                 'GIT_DIR':helper_git_dir,'GIT_WORK_TREE':helper_git_work_tree}
            try:
                owner.prepare(prep,handoff);handoff=[]
                result,returned=owner.launch({'op':'LAUNCH','argv_tail':[], 'environment':env,
                      'timeout_ms':10000,'stdout_role':None},[source_fd,cwd_fd])
                stdout=c.read_fd(returned);os.close(returned);returned=None
                observation=result['observation']
                created=[outputs.binding(role) for role in outputs.paths]
                receipt=sup.sealed({'marker':'VOID_DATANET_V45_SOURCE_EXECUTION_V1_GREEN','status':'GREEN',**ctx,
                    'phase':phase,'producer':{**result['producer'],'returncode':0},'producer_observation':observation,
                    'child_returncode':0,'created_output_bindings':created,
                    'producer_identity_independently_verified':True,'producer_exec_observed':True,
                    'producer_output_capability_coupled':True,'producer_subtree_retired':True,
                    'supervisor_reported_producer_metadata':None,
                    'producer_observation_scope':'direct_v45_python_readonly_helpers_owned_tree_and_stream_retirement',
                    'stdout_captured_by_supervisor':False,'stdout_captured_by_custodian':True,
                    'custody_verifier_pid':os.getpid(),'resolved_argv_sha256':observation['argv_sha256'],
                    'entrypoint':{'sha256':c.digest(program.encode())},
                    'stdout_binding':{'bytes':len(stdout),'sha256':c.digest(stdout)},'synthetic_input':True})
                sup.write_to_fd(manifest.fds['RECEIPT'],c.canon(receipt));owner.check({'op':'CHECK'})
                outputs.publish();manifest.publish();owner.commit()
            except c.CustodyHold as exc:
                code=exc.code;observation=getattr(exc,'observation',observation)
            positive=case.startswith('normal-')
            need(code == (None if positive else HELPER_REFUSALS[case]),f'{case}: wrong helper refusal {code}; observation={observation}')
            if positive:
                commitment,fd=owner.export(str(root),phase)
                try:need(c.digest(c.read_fd(fd))==commitment['capsule_sha256'],'helper capsule mismatch')
                finally:os.close(fd)
                modules=[load('scripts/'+name) for name in ('prove_datanet_v45_full_stack_evidence_composition_v1.py',
                    'prove_datanet_v45_full_stack_terminal_verifier_v1.py','prove_datanet_v45_cross_runtime_aggregate_v1.py')]
                for mod in modules:mod.verify_observed_producer_receipt(receipt)
                row={'case':case,'status':'PASS','canonical_custodian_commit':True,'canonical_custodian_export':True,
                     'positive_consumers':3,'source_receipt':receipt}
            else:
                need(not owner.phases and not any(path.exists() for path in (*outputs.paths.values(),*manifest.paths.values())),
                     'helper refusal published evidence')
                need(all(os.fstat(fd).st_size==0 for fd in outputs.fds.values()),'helper refusal filled sinks')
                for op in (owner.commit,lambda:owner.export(str(root),phase)):
                    try:op()
                    except c.CustodyHold:pass
                    else:raise AssertionError('helper refusal admitted commit/export')
                row={'case':case,'status':'PASS','rejection':code,'canonical_custodian_commit':False,
                     'canonical_custodian_export':False,'regular_outputs_still_empty':True,
                     'canonical_consumers':denied_consumers(work)}
            need(observation is not None and observation.get('cleanup_complete') is True,'helper cleanup incomplete')
            row.update(observation=observation,synthetic_root_writer=True,actual_readonly_executables=True,
                       full_campaign_accepted=False)
            Path(output).write_bytes(c.canon(row))
        finally:
            owner.close()
            for fd in [*handoff,*anchors,source_fd,cwd_fd,returned]:
                if fd is not None:
                    try:os.close(fd)
                    except OSError:pass
            outputs.close();manifest.close()
    return 0




def helper_consumer_mutations(result):
    """Reseal alterations so failures exercise plan semantics, not just JSON hashes."""
    modules=[load('scripts/'+name) for name in ('prove_datanet_v45_full_stack_evidence_composition_v1.py',
        'prove_datanet_v45_full_stack_terminal_verifier_v1.py','prove_datanet_v45_cross_runtime_aggregate_v1.py')]
    receipt=result['cases'][0]['source_receipt']
    mods=[('not-completed',('readonly_helper_plan_completed',),False),
          ('short-plan',('helper_plan','rows'),receipt['producer_observation']['helper_plan']['rows'][:-1]),
          ('short-observations',('helper_execs',),receipt['producer_observation']['helper_execs'][:-1]),
          ('wrong-count',('observed_subtree_exec_count',),1),
          ('wrong-task-count',('observed_task_count',),1),
          ('arbitrary-command',('helper_plan','rows',0,'requested_argv'),['git','status']),
          ('changed-command',('helper_plan','rows',0,'executed_argv'),['git','status']),
          ('bool-index',('helper_plan','rows',0,'index'),False),
          ('wrong-executable-observation',('helper_execs',0,'executable_sha256'),'0'*64),
          ('wrong-argv-observation',('helper_execs',0,'argv_sha256'),'0'*64),
          ('wrong-parent',('helper_execs',0,'parent_pid'),999999999),
          ('duplicate-pid',('helper_execs',1,'pid'),receipt['producer_observation']['helper_execs'][0]['pid']),
          ('helper-failed',('helper_execs',0,'returncode'),7),
          ('missing-sealed-input',('helper_plan','rows',4,'input_bindings'),[]),
          ('wrong-sealed-input',('helper_plan','rows',4,'input_bindings',0,'sha256'),'0'*64),
          ('named-input',('helper_plan','rows',4,'input_bindings',0,'identity',3),1),
          ('unsealed-input',('helper_plan','rows',4,'input_bindings',0,'seals'),0),
          ('no-exec-events',('events',),[e for e in receipt['producer_observation']['events'] if e['event']!='READONLY_HELPER_EXEC_OBSERVED']),
          ('downgraded-policy',('trace_policy',),'OWNED_TREE_SINGLE_EXEC_V1')]
    rejections=[]
    for label,path,value in mods:
        obj=copy.deepcopy(receipt);target=obj['producer_observation']
        for part in path[:-1]:target=target[part]
        target[path[-1]]=value
        obs=obj['producer_observation'];obs['helper_plan_sha256']=hashlib.sha256((json.dumps(obs['helper_plan'],sort_keys=True,separators=(',',':'))+'\n').encode()).hexdigest()
        body=dict(obj);body.pop('receipt_sha256',None);obj['receipt_sha256']=hashlib.sha256((json.dumps(body,sort_keys=True,separators=(',',':'))+'\n').encode()).hexdigest()
        for mod in modules:
            try:mod.verify_observed_producer_receipt(obj)
            except Exception as exc:
                need(getattr(exc,'code',None)=='HOLD_V45_SOURCE_OBSERVED_PRODUCER',f'{label}: wrong helper evidence rejection {exc}')
                rejections.append({'mutation':label,'consumer':Path(mod.__file__).name,'rejection':exc.code})
            else:raise AssertionError('helper evidence alteration accepted '+label)
    variants=[('missing',None),('short-cases',{**result,'cases':result['cases'][:-1]}),
              ('not-green',{**result,'status':'SKIPPED'})]
    for i,row in enumerate(result['cases']):
        changed=copy.deepcopy(result);changed['cases'][i]['status']='SKIPPED';variants.append((row['case']+'-skipped',changed))
        if not row['canonical_custodian_commit']:
            changed=copy.deepcopy(result);changed['cases'][i]['canonical_custodian_commit']=True;variants.append((row['case']+'-committed',changed))
    required=[]
    for label,value in variants:
        for mod in modules:
            try:mod.verify_readonly_helper_controls(value)
            except Exception as exc:
                need(getattr(exc,'code',None)=='HOLD_V45_REQUIRED_READONLY_HELPERS',f'{label}: wrong helper control rejection {exc}')
                required.append({'mutation':label,'consumer':Path(mod.__file__).name,'rejection':exc.code})
            else:raise AssertionError('helper result alteration accepted '+label)
    for mod in modules:mod.verify_readonly_helper_controls(result)
    return {'positive_consumers':3,'observation_mutations':len(mods),'observation_rejections':rejections,
            'required_result_mutations':len(variants),'required_result_rejections':required}

def helper_profile_controls(output):
    results=[]
    with tempfile.TemporaryDirectory(prefix='void-v45-helper-controls-') as tmp:
        for case in HELPER_CASES:
            path=Path(tmp)/(case+'.json')
            command=[sys.executable,'-I','-S','-B',str(ROOT/'scripts/prove_datanet_v45_custody_integration_v1.py'),
                     '--helper-profile-case',case,'--output',str(path)]
            result=subprocess.run(command,cwd=ROOT,capture_output=True,timeout=20)
            need(result.returncode==0,f'{case} failed: '+result.stderr.decode(errors='replace')[-12000:])
            results.append(json.loads(path.read_bytes()))
    out={'marker':'VOID_V45_READONLY_HELPER_CONTROLS_V1_GREEN','status':'GREEN','cases':results,
         'case_count':len(results),'positive_cases':4,'rejection_cases':len(HELPER_REFUSALS),
         'actual_custodian_state_machine':True,'full_campaign_accepted':False,
         'full_workflow_integration_complete':False,'synthetic_context':True}
    out['consumer_mutations']=helper_consumer_mutations(out)
    Path(output).write_bytes((json.dumps(out,sort_keys=True,separators=(',',':'))+'\n').encode())
    print(json.dumps({'status':'GREEN','helper_cases':len(results),'output':str(output)}));return 0




def real_static_helper_profile(output, *, capture_resources=False):
    """Run the actual exact-source V45 static phase through LAUNCH/COMMIT/export."""
    c=load('scripts/datanet_v45_custody_session_v1.py');sup=load('scripts/prove_datanet_v45_source_execution_v1.py')
    repo=Path(os.environ.get('GIT_WORK_TREE',str(ROOT)))
    ctx={'head':git(repo,'rev-parse','HEAD'),'tree':git(repo,'rev-parse','HEAD^{tree}'),
         'node_major':22,'run_id':77,'run_attempt':1}
    with tempfile.TemporaryDirectory(prefix='void-v45-real-static-') as tmp:
        work=Path(tmp);root=work/'evidence';root.mkdir();session=Session(c,ctx,capture_resources=capture_resources);supervisor_fd=None
        saved={key:os.environ.get(key) for key in (c.ENV_CHANNEL,c.ENV_INPUT)}
        try:
            os.environ[c.ENV_CHANNEL]=str(session.left.fileno());os.environ.pop(c.ENV_INPUT,None)
            source=(ROOT/'scripts/prove_datanet_v45_source_execution_v1.py').read_bytes()
            supervisor_fd=c.sealed_fd(source)
            data_path=root/'v45-static-22.jsonl';receipt_path=root/'datanet-v45-source-execution-v45-static-22.json'
            ns=argparse.Namespace(supervisor_fd=supervisor_fd,bootstrap_supervisor_blob=sup.git_blob(source),repo_root=str(repo),
                expected_head=ctx['head'],expected_tree=ctx['tree'],node_major=22,run_id=77,run_attempt=1,
                phase='v45-static',entrypoint='scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py',
                receipt=str(receipt_path),snapshot_parent=str(work),owned_output=['OUTPUT='+str(data_path)],
                bind_output=['OUTPUT'],stdout_output='OUTPUT',stderr_output=None,path_token=[],
                entrypoint_stdin=False,expect_generation_hold=False,expect_hold=None,control_ready=None,
                control_continue=None,control_target=None,command=sup.phase_spec('v45-static',22)['argv'])
            sup.run(ns)
            data=json.loads(data_path.read_bytes());receipt=json.loads(receipt_path.read_bytes())
            need(data.get('marker')=='VOID_DATANET_V45_FULL_STACK_EVIDENCE_COMPOSITION_STATIC_V1_GREEN'
                 and data.get('source_wall_entry_count')==97,'real static phase did not verify source wall')
            for name in ('prove_datanet_v45_full_stack_evidence_composition_v1.py',
                         'prove_datanet_v45_full_stack_terminal_verifier_v1.py','prove_datanet_v45_cross_runtime_aggregate_v1.py'):
                load('scripts/'+name).verify_observed_producer_receipt(receipt)
            exported,fds=session.client.request('EXPORT',root=str(root),terminal_phase='v45-static')
            try:
                need(len(fds)==1,'static capsule missing')
                capsule=c.read_fd(fds[0]);need(c.digest(capsule)==exported['capsule_sha256'],'static capsule mismatch')
                capsule_path=Path(output).with_suffix('.capsule.zip')
                with capsule_path.open('xb') as retained:retained.write(capsule)
            finally:
                for fd in fds:os.close(fd)
            out={'marker':'VOID_V45_REAL_STATIC_HELPER_HANDOFF_V1_GREEN','status':'GREEN',
                 'context':ctx,'static_result':data,'source_receipt':receipt,'capsule_commitment':exported,
                 'actual_supervisor_and_custodian':True,'actual_static_source':True,'positive_consumers':3,
                 'full_campaign_accepted':False,'hosted_matrix_executed':False}
            Path(output).write_bytes(c.canon(out))
        finally:
            if supervisor_fd is not None:os.close(supervisor_fd)
            session.close()
            for key,value in saved.items():
                if value is None:os.environ.pop(key,None)
                else:os.environ[key]=value
    print(json.dumps({'status':'GREEN','actual_static_handoff':True,'output':str(output)}));return 0

def verify_owned_resource_ledger(ledger: dict, *, outer: bool=False) -> None:
    """Recompute recorded scoped totals; never promote samples to a full census."""
    code = 'HOLD_V45_RESOURCE_LEDGER_INVALID'
    def check(ok):
        if not ok: raise ValueError(code)
    def integer(v):return type(v) is int and v >= 0
    check(type(ledger) is dict)
    expected_keys = {'format','scope','capture_complete_for_scope','whole_case_complete',
        'full_job_process_census','exact_peak_live_processes','exact_peak_live_fds',
        'scm_rights_descriptor_transfers','whole_case_retry_count','whole_case_syscalls',
        'syscall_arch','tasks','totals','syscall_histogram','limits','refusal','elapsed_ns',
        'ordered_event_count','ordered_event_sha256','stream_bindings','excluded',
        'fd_measurement','byte_measurement','ledger_sha256'}
    check(set(ledger) == expected_keys)
    check(type(outer) is bool)
    check(ledger['format']==('VOID_V45_OUTER_CASE_SYSCALL_LEDGER_V1' if outer else 'VOID_V45_OWNED_SYSCALL_LEDGER_V1')
        and ledger['scope']==('outer_fixed_static_case_excluding_delegated_producer_and_collector' if outer else 'owned_tree_from_initial_exec_stop_to_terminal_wait')
        and ledger['syscall_arch']=='linux-x86_64'
        and type(ledger['capture_complete_for_scope']) is bool
        and ledger['whole_case_complete'] is False and ledger['full_job_process_census'] is False)
    check(all(ledger[k] is None for k in ('exact_peak_live_processes','exact_peak_live_fds',
        'scm_rights_descriptor_transfers','whole_case_retry_count','whole_case_syscalls')))
    expected_excluded=(['collector process','collector/bootstrap setup before initial root exec',
                        'delegated producer subtree','cleanup after refusal'] if outer else
        ['pre-initial-exec setup','observer/custodian','supervisor','test driver and consumers',
         'external stream holders','cleanup after refusal'])
    check(ledger['excluded']==expected_excluded)
    check(ledger['fd_measurement']=='per_task_stopped_samples_not_global_peak'
        and ledger['byte_measurement']=='successful_scalar_io_syscall_return_bytes_not_unique_bytes_or_storage_io')
    def h(value):return hashlib.sha256((json.dumps(value,sort_keys=True,separators=(',',':'),allow_nan=False)+'\n').encode()).hexdigest()
    body=dict(ledger);seal=body.pop('ledger_sha256');check(type(seal) is str and seal==h(body))
    check(integer(ledger['elapsed_ns']) and integer(ledger['ordered_event_count'])
        and type(ledger['ordered_event_sha256']) is str
        and len(ledger['ordered_event_sha256'])==64
        and all(ch in '0123456789abcdef' for ch in ledger['ordered_event_sha256']))
    tasks=ledger['tasks'];totals=ledger['totals'];limits=ledger['limits'];streams=ledger['stream_bindings']
    check(type(tasks) is list and len(tasks)<=(512 if outer else 64) and type(totals) is dict
        and type(limits) is dict and type(streams) is dict)
    maximum={'syscall_stops':1000000 if outer else 200000,'tasks':512 if outer else 64,'fd_sample':4096,'returned_io_bytes':1073741824}
    check(set(limits)==set(maximum) and all(type(v) is int and 1<=v<=maximum[k] for k,v in limits.items()))
    histogram={};pids=set();root=0
    fields=('syscall_entries','syscall_exits','entry_without_exit_at_termination',
            'inherited_return_stops','successful_execs')
    sums={k:0 for k in fields}
    pending=0
    for row in tasks:
        check(type(row) is dict)
        core={'pid','starttime_ticks','parent_pid','initial_root','exited','successful_execs',
            'syscall_entries','syscall_exits','entry_without_exit_at_termination','inherited_return_stops',
            'fd_samples','fd_sample_peak','syscalls','allow_initial_return'}
        check(type(row.get('exited')) is bool)
        check(set(row)==core|({'wait_status','pending_at_exit'} if row['exited'] else {'pending'}))
        check(type(row['pid']) is int and row['pid']>0 and row['pid'] not in pids
            and type(row['starttime_ticks']) is int and row['starttime_ticks']>0
            and type(row['parent_pid']) is int and row['parent_pid']>0)
        check(type(row['initial_root']) is bool and type(row['allow_initial_return']) is bool)
        root+=row['initial_root'];pids.add(row['pid'])
        check(all(integer(row[k]) for k in (*fields,'fd_samples','fd_sample_peak')))
        check(row['inherited_return_stops']<=1)
        check(type(row['syscalls']) is dict)
        local_entries=local_exits=0
        for nr,bucket in row['syscalls'].items():
            check(type(nr) is str and nr.isdecimal() and str(int(nr))==nr and int(nr)<0x40000000)
            check(type(bucket) is dict and set(bucket)=={'entries','exits','errors','read_return_bytes','write_return_bytes'}
                and all(integer(x) for x in bucket.values())
                and bucket['errors']<=bucket['exits']<=bucket['entries'])
            local_entries+=bucket['entries'];local_exits+=bucket['exits']
            target=histogram.setdefault(nr,{k:0 for k in bucket})
            for k,v in bucket.items():target[k]+=v
        check(local_entries==row['syscall_entries'] and local_exits==row['syscall_exits'])
        open_nr=row['pending_at_exit'] if row['exited'] else row['pending']
        check(open_nr is None or integer(open_nr))
        check(row['syscall_entries']==row['syscall_exits']+int(open_nr is not None))
        check(row['entry_without_exit_at_termination']==(int(open_nr is not None) if row['exited'] else 0))
        if not row['exited']:pending+=int(open_nr is not None)
        if row['exited']:check(integer(row['wait_status']))
        for k in fields:sums[k]+=row[k]
    check(root==int(bool(tasks)))
    check(all(r['initial_root'] or r['parent_pid'] in pids for r in tasks))
    check(histogram==ledger['syscall_histogram'])
    for stream,binding in streams.items():
        check(type(stream) is str and type(binding) is dict and set(binding)=={'bytes','sha256'} and integer(binding['bytes']))
        check(binding['sha256'] is None or (type(binding['sha256']) is str and len(binding['sha256'])==64
            and all(ch in '0123456789abcdef' for ch in binding['sha256'])))
    derived={**sums,'task_lifetimes':len(tasks),'task_exits':sum(r['exited'] for r in tasks),
        'read_return_bytes':sum(b['read_return_bytes'] for b in histogram.values()),
        'write_return_bytes':sum(b['write_return_bytes'] for b in histogram.values()),
        'captured_stream_bytes':sum(b['bytes'] for b in streams.values()),
        'max_task_fd_sample':max((r['fd_sample_peak'] for r in tasks),default=0)}
    check(set(totals)==set(derived)|{'syscall_stops','task_event_outstanding_peak'}
        and all(integer(v) for v in totals.values()) and all(totals[k]==v for k,v in derived.items()))
    check(int(bool(tasks))<=totals['task_event_outstanding_peak']<=len(tasks))
    accounted=sums['syscall_entries']+sums['syscall_exits']+sums['inherited_return_stops']
    refusal=ledger['refusal']
    check(refusal is None or type(refusal) is dict)
    # A limit-triggering syscall stop is counted before its detailed bucket is
    # processed. It is explicit partial telemetry, not a silently lost event.
    check(totals['syscall_stops']==accounted+int(refusal is not None and refusal.get('metric')=='syscall_stops'))
    if refusal is not None:
        check(type(refusal) is dict and set(refusal)=={'metric','observed','limit'}
            and refusal['metric'] in limits and type(refusal['observed']) is int
            and refusal['observed']>refusal['limit']==limits[refusal['metric']])
    if ledger['capture_complete_for_scope']:
        check(refusal is None and all(r['exited'] for r in tasks) and bool(tasks)
            and all(b['sha256'] is not None for b in streams.values()))
        check(totals['syscall_stops']<=limits['syscall_stops'] and len(tasks)<=limits['tasks']
            and totals['max_task_fd_sample']<=limits['fd_sample']
            and totals['read_return_bytes']+totals['write_return_bytes']<=limits['returned_io_bytes'])


RESOURCE_CASES = ('normal','waited-child','syscall-max-plus-one','task-max-plus-one',
                  'fd-max-plus-one','io-return-overflow','deadline','nonzero-exit',
                  'rpc-option-injection','fake-registration')


def resource_ledger_worker(case, output):
    """Real custodian admission with scoped telemetry, not a full-case census."""
    c=load('scripts/datanet_v45_custody_session_v1.py')
    sup=load('scripts/prove_datanet_v45_source_execution_v1.py')
    ctx={'head':git(ROOT,'rev-parse','HEAD'),'tree':git(ROOT,'rev-parse','HEAD^{tree}'),
         'node_major':22,'run_id':77,'run_attempt':1}
    limits=dict(c.OwnedSyscallLedger.DEFAULT_LIMITS)
    if case=='syscall-max-plus-one':limits['syscall_stops']=100
    if case=='task-max-plus-one':limits['tasks']=1
    if case=='fd-max-plus-one':limits['fd_sample']=1
    if case=='io-return-overflow':limits['returned_io_bytes']=1
    with tempfile.TemporaryDirectory(prefix='void-v45-resource-case-') as tmp:
        work=Path(tmp);root=work/'evidence';root.mkdir()
        outputs=sup.OwnedOutputs({'OUTPUT':root/'output.json','AUX':root/'aux.json'},work)
        manifest=sup.OwnedOutputs({'RECEIPT':root/'receipt.json'},work)
        owner=c.Custodian(ctx,capture_resources=True,resource_limits=limits)
        anchors=[];handoff=[];source_fd=cwd_fd=returned=None;observation=None;code=None
        try:
            rows=[]
            for group in (outputs,manifest):
                for role,path in group.paths.items():
                    anchor=os.open(path.parent.parent,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC);anchors.append(anchor)
                    rows.append({'role':role,'path':str(path)})
                    handoff.extend(os.dup(fd) for fd in (group.fds[role],group.parent_fds[role],anchor))
            program="import os,json,time\nm=json.loads(os.environ['VOID_V45_OUTPUT_FDS'])\n"
            if case in ('waited-child','task-max-plus-one'):
                program+='p=os.fork()\nif p==0:os._exit(0)\nos.waitpid(p,0)\n'
            if case=='deadline':program+='time.sleep(5)\n'
            program+="for fd in m.values():os.write(fd,b'resource-output\\n')\n"
            if case=='nonzero-exit':program+='os._exit(7)\n'
            raw=program.encode();source_fd=c.sealed_fd(raw);cwd_fd=os.open(root,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC)
            prep={'op':'PREPARE','context':ctx,'phase':'resource-fixture','members':rows,'kind':'normal',
                'argv_sha256':c.digest(c.canon({'argv':['python3','-I','-S','-B','@ENTRYPOINT@']})),
                'entrypoint_sha256':c.digest(raw)}
            owner.prepare(prep,handoff);handoff=[]
            request={'op':'LAUNCH','argv_tail':[],'environment':{},'timeout_ms':5000,'stdout_role':None}
            if case=='deadline':request['timeout_ms']=350
            if case=='rpc-option-injection':request['capture_resources']=False
            try:
                if case=='fake-registration':owner.producer({'op':'PRODUCER','producer':{'pid':999999999999}})
                result,returned=owner.launch(request,[source_fd,cwd_fd]);os.close(returned);returned=None
                observation=result['observation']
                verify_owned_resource_ledger(observation['resource_ledger'])
                created=[outputs.binding(role) for role in outputs.paths]
                obj=sup.sealed({'marker':'VOID_DATANET_V45_SOURCE_EXECUTION_V1_GREEN','status':'GREEN',**ctx,
                    'phase':'resource-fixture','producer':{**result['producer'],'returncode':0},
                    'producer_observation':observation,'child_returncode':0,
                    'created_output_bindings':created,'synthetic_input':True})
                sup.write_to_fd(manifest.fds['RECEIPT'],c.canon(obj))
                owner.check({'op':'CHECK'});outputs.publish();manifest.publish();owner.commit()
            except c.CustodyHold as exc:
                code=exc.code;observation=getattr(exc,'observation',None)
            expected={'syscall-max-plus-one':'HOLD_V45_RESOURCE_SYSCALL_STOPS',
                'task-max-plus-one':'HOLD_V45_RESOURCE_TASKS',
                'fd-max-plus-one':'HOLD_V45_RESOURCE_FD_SAMPLE',
                'io-return-overflow':'HOLD_V45_RESOURCE_RETURNED_IO_BYTES',
                'deadline':'HOLD_V45_OBSERVED_EXECUTION_DEADLINE',
                'nonzero-exit':'HOLD_V45_OBSERVED_NONZERO_EXIT',
                'rpc-option-injection':'HOLD_V45_CUSTODY_LAUNCH_SCHEMA',
                'fake-registration':'HOLD_V45_CUSTODY_CALLER_PRODUCER_FORBIDDEN'}.get(case)
            need(code==expected,f'{case}: expected {expected}, got {code}')
            ledger=None if observation is None else observation['resource_ledger']
            if ledger is not None:
                verify_owned_resource_ledger(ledger)
                need(observation['cleanup_complete'],'resource case cleanup failed')
            if expected is None:
                need(ledger['capture_complete_for_scope'],'positive capture incomplete')
                commit,fd=owner.export(str(root),'resource-fixture')
                try:need(c.digest(c.read_fd(fd))==commit['capsule_sha256'],'capsule hash')
                finally:os.close(fd)
                need(ledger['totals']['captured_stream_bytes']==32,'role byte accounting')
            else:
                need(not owner.phases,'failed capture committed phase')
                need(not any(p.exists() for p in (*outputs.paths.values(),*manifest.paths.values())),'publication on refusal')
                need(all(os.fstat(fd).st_size==0 for fd in outputs.fds.values()),'sink populated on refusal')
                for op in (owner.commit,lambda:owner.export(str(root),'resource-fixture')):
                    try:op()
                    except c.CustodyHold:pass
                    else:raise AssertionError('failed capture admitted capsule')
                denied_consumers(work)
                if ledger is not None:need(ledger['capture_complete_for_scope'] is False,'partial capture overclaimed')
                if case in ('syscall-max-plus-one','task-max-plus-one','fd-max-plus-one'):
                    need(ledger['refusal']['observed']==ledger['refusal']['limit']+1,'not exact max+1')
            out={'case':case,'status':'PASS','rejection':code,'actual_custodian_commit':expected is None,
                'capsule_emitted':expected is None,'provisional_outputs_empty_on_refusal':expected is not None,
                'ledger':ledger,'observation':observation,'whole_case_resource_ledger_closed':False,
                'full_job_process_census':False,'full_campaign_accepted':False,'context':ctx}
            Path(output).write_bytes(c.canon(out))
        finally:
            owner.close()
            for fd in [*handoff,*anchors,source_fd,cwd_fd,returned]:
                if fd is not None:
                    try:os.close(fd)
                    except OSError:pass
            outputs.close();manifest.close()
    return 0


def resource_ledger_controls(output):
    """Every number declares its measured scope; unknown quantities stay null."""
    import time
    c=load('scripts/datanet_v45_custody_session_v1.py');start=time.monotonic_ns()
    results=[];wrappers=[]
    with tempfile.TemporaryDirectory(prefix='void-v45-resource-suite-') as tmp:
        for case in RESOURCE_CASES:
            path=Path(tmp)/(case+'.json')
            cmd=[sys.executable,'-I','-S','-B',str(ROOT/'scripts/prove_datanet_v45_custody_integration_v1.py'),
                 '--resource-ledger-case',case,'--output',str(path)]
            begun=time.monotonic_ns()
            child=subprocess.Popen(cmd,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
            pid=child.pid
            stdout,stderr=child.communicate(timeout=15)
            elapsed=time.monotonic_ns()-begun
            need(child.returncode==0,case+': '+stderr.decode(errors='replace')[-8000:])
            row=json.loads(path.read_bytes());need(row['status']=='PASS','missing resource result')
            results.append(row)
            wrappers.append({'case':case,'pid':pid,'returncode':child.returncode,
                'elapsed_ns':elapsed,'deadline_ns':15000000000,'explicit_launch_attempts':1,
                'automatic_retries':0,'scope':'suite_direct_worker_launch_only',
                'unobserved_worker_startup_syscalls':None})
    normal=results[0]['ledger'];variants=[]
    def variant(name,fn):
        value=copy.deepcopy(normal);fn(value)
        value.pop('ledger_sha256',None);value['ledger_sha256']=c.digest(c.canon(value));variants.append((name,value))
    variant('promote-full-census',lambda v:v.update(full_job_process_census=True))
    variant('promote-whole-case',lambda v:v.update(whole_case_complete=True))
    variant('sample-as-fd-peak',lambda v:v.update(exact_peak_live_fds=v['totals']['max_task_fd_sample']))
    variant('sample-as-process-peak',lambda v:v.update(exact_peak_live_processes=v['totals']['task_event_outstanding_peak']))
    variant('invent-scm-count',lambda v:v.update(scm_rights_descriptor_transfers=0))
    variant('invent-syscalls',lambda v:v.update(whole_case_syscalls=0))
    variant('invent-retries',lambda v:v.update(whole_case_retry_count=0))
    variant('drop-excluded-scope',lambda v:v.update(excluded=[]))
    variant('wrong-architecture',lambda v:v.update(syscall_arch='any-linux'))
    variant('extra-field',lambda v:v.update(verified=True))
    variant('negative-elapsed',lambda v:v.update(elapsed_ns=-1))
    variant('bad-event-hash',lambda v:v.update(ordered_event_sha256='z'*64))
    for field in normal['totals']:
        variant('wrong-total-'+field,lambda v,f=field:v['totals'].__setitem__(f,v['totals'][f]+1))
    variant('missing-task',lambda v:v.update(tasks=[]))
    variant('duplicate-task',lambda v:v['tasks'].append(copy.deepcopy(v['tasks'][0])))
    variant('false-exit',lambda v:v['tasks'][0].update(exited=False))
    variant('missing-syscall-histogram',lambda v:v.update(syscall_histogram={}))
    modules=[load('scripts/'+name) for name in (
        'prove_datanet_v45_full_stack_evidence_composition_v1.py',
        'prove_datanet_v45_full_stack_terminal_verifier_v1.py','prove_datanet_v45_cross_runtime_aggregate_v1.py')]
    for mod in modules:mod.verify_owned_resource_ledger(normal)
    consumer_rejections=[]
    rejected=[]
    for name,value in variants:
        try:verify_owned_resource_ledger(value)
        except (ValueError,KeyError,TypeError):rejected.append(name)
        else:raise AssertionError('resource mutation accepted: '+name)
        for mod in modules:
            try:mod.verify_owned_resource_ledger(value)
            except (ValueError,KeyError,TypeError):consumer_rejections.append({'mutation':name,'consumer':Path(mod.__file__).name})
            else:raise AssertionError('consumer accepted resource mutation: '+name)
    boundaries=[]
    for name,maximum in c.OwnedSyscallLedger.DEFAULT_LIMITS.items():
        item=c.OwnedSyscallLedger();item.limit(name,maximum)
        try:item.limit(name,maximum+1)
        except c.CustodyHold as exc:
            need(exc.code=='HOLD_V45_RESOURCE_'+name.upper(),'wrong resource bound')
            boundaries.append({'metric':name,'limit':maximum,'accepted_at_limit':True,
                'rejected_at':maximum+1,'rejection':exc.code,'scope':'arithmetic_guard_unit_control'})
        else:raise AssertionError('max+1 admitted')
    complete=[r['ledger'] for r in results if r['ledger'] and r['ledger']['capture_complete_for_scope']]
    additive=('task_lifetimes','task_exits','successful_execs','syscall_entries','syscall_exits',
        'syscall_stops','read_return_bytes','write_return_bytes','captured_stream_bytes')
    totals={k:sum(row['totals'][k] for row in complete) for k in additive}
    out={'marker':'VOID_V45_SCOPED_RESOURCE_CAPTURE_CONTROLS_V1_GREEN','status':'GREEN',
        'cases':results,'case_count':len(results),'worker_launches':wrappers,
        'unit_max_plus_one_controls':boundaries,'resealed_ledger_rejections':rejected,
        'resource_consumer_rejections':consumer_rejections,
        'complete_capture_totals':totals,'complete_capture_cases':[r['case'] for r in results
            if r['ledger'] and r['ledger']['capture_complete_for_scope']],
        'totals_scope':'only_complete_producer_captures_not_workers_or_full_suite',
        'partial_capture_count':sum(r['ledger'] is not None and not r['ledger']['capture_complete_for_scope'] for r in results),
        'no_producer_capture_count':sum(r['ledger'] is None for r in results),
        'suite_elapsed_ns':time.monotonic_ns()-start,'whole_case_resource_ledger_closed':False,
        'full_job_process_census':False,'full_campaign_accepted':False,'source_pushed':False}
    Path(output).write_bytes(c.canon(out))
    print(json.dumps({'status':'GREEN','cases':len(results),'resealed_rejections':len(rejected),
        'output':str(output),'whole_case_resource_ledger_closed':False}));return 0



def case_resource_join(outer: dict, static: dict) -> dict:
    """Reconcile two measured scopes; never sum peaks or pretend gaps are zero."""
    def check(ok):
        if not ok:raise ValueError('HOLD_V45_CASE_RESOURCE_JOIN_INVALID')
    def seal(value, key):
        check(type(value) is dict and type(value.get(key)) is str)
        body=dict(value);actual=body.pop(key)
        check(actual==hashlib.sha256((json.dumps(body,sort_keys=True,separators=(',',':'),allow_nan=False)+'\n').encode()).hexdigest())
    seal(outer,'capture_sha256')
    check(set(outer)=={'format','status','rejection','source_sha256','custodian_source_sha256',
        'interpreter_sha256','git_sha256','outer_ledger','task_roles','delegations','events','elapsed_ns',
        'deadline_ms','automatic_retries','cleanup_complete','whole_case_complete',
        'full_job_process_census','full_campaign_accepted','capture_sha256'})
    for key in ('source_sha256','custodian_source_sha256','interpreter_sha256','git_sha256'):
        check(type(outer[key]) is str and len(outer[key])==64 and all(c in '0123456789abcdef' for c in outer[key]))
    check(outer.get('format')=='VOID_V45_STATIC_OUTER_CAPTURE_V1' and outer.get('status')=='CAPTURED'
        and outer.get('rejection') is None and outer.get('cleanup_complete') is True)
    check(outer.get('whole_case_complete') is False and outer.get('full_job_process_census') is False
        and outer.get('full_campaign_accepted') is False and outer.get('automatic_retries')==0)
    check(type(outer.get('elapsed_ns')) is int and type(outer.get('deadline_ms')) is int
        and 0 < outer['elapsed_ns'] <= outer['deadline_ms']*1000000)
    check(static.get('marker')=='VOID_V45_REAL_STATIC_HELPER_HANDOFF_V1_GREEN' and static.get('status')=='GREEN'
        and static.get('actual_supervisor_and_custodian') is True and static.get('actual_static_source') is True
        and static.get('full_campaign_accepted') is False and static.get('hosted_matrix_executed') is False)
    receipt=static['source_receipt'];seal(receipt,'receipt_sha256')
    context=static['context'];o=receipt['producer_observation'];inner=o['resource_ledger'];outer_ledger=outer['outer_ledger']
    check(all(receipt.get(k)==context[k] and o['context'].get(k)==context[k]
              for k in ('head','tree','node_major','run_id','run_attempt')))
    check(o.get('status')=='VERIFIED' and o.get('phase')=='v45-static'
        and o.get('producer_subtree_retired') is True and o.get('output_streams_retired') is True)
    verify_owned_resource_ledger(inner);verify_owned_resource_ledger(outer_ledger,outer=True)
    check(inner['capture_complete_for_scope'] is True and outer_ledger['capture_complete_for_scope'] is True)
    for name in ('prove_datanet_v45_full_stack_evidence_composition_v1.py',
                 'prove_datanet_v45_full_stack_terminal_verifier_v1.py','prove_datanet_v45_cross_runtime_aggregate_v1.py'):
        load('scripts/'+name).verify_observed_producer_receipt(receipt)
    outer_tasks={r['pid']:r for r in outer_ledger['tasks']};inner_tasks={r['pid']:r for r in inner['tasks']}
    check(not (set(outer_tasks)&set(inner_tasks)))
    roles=outer['task_roles'];check(type(roles) is list and len(roles)==len(outer_tasks))
    rolemap={r['pid']:r for r in roles};check(set(rolemap)==set(outer_tasks))
    for pid,r in rolemap.items():
        t=outer_tasks[pid]
        check(set(r)=={'pid','ppid','starttime_ticks','role','execs','exited'})
        check(r['starttime_ticks']==t['starttime_ticks'] and r['ppid']==t['parent_pid']
            and r['execs']==t['successful_execs']==1 and r['exited'] is True
            and r['role'] in ('driver_supervisor_consumers','source_query','custodian'))
    owners=[r for r in roles if r['role']=='custodian'];drivers=[r for r in roles if r['role']=='driver_supervisor_consumers']
    check(len(owners)==len(drivers)==1);owner=owners[0];driver=drivers[0]
    check(owner['pid']==o['custodian_pid'] and owner['ppid']==driver['pid'])
    # Static source structure: two driver queries plus source_tree's four + N.
    count=static['static_result']['source_wall_entry_count']
    check(type(count) is int and count==97)
    check(sum(r['role']=='source_query' for r in roles)==count+6)
    check(len(outer_tasks)==count+8)
    delegations=outer['delegations'];roots=[r for r in inner['tasks'] if r['initial_root']]
    check(type(delegations) is list and len(delegations)==len(roots)==1)
    d=delegations[0];r=roots[0]
    check(set(d)=={'pid','ppid','starttime_ticks','owner_starttime_ticks','birth_syscall',
                  'birth_observed','pidfd_terminal_observed'})
    check(type(d['pid']) is int and d['pid']==r['pid']==o['producer']['pid']
        and d['ppid']==r['parent_pid']==owner['pid']
        and d['starttime_ticks']==r['starttime_ticks']==o['producer']['starttime_ticks']
        and d['owner_starttime_ticks']==owner['starttime_ticks']
        and d['birth_syscall'] in (56,57,58,435)
        and d['birth_observed'] is True and d['pidfd_terminal_observed'] is True)
    # Replay lifecycle events separately from totals, including order and all exits.
    events=outer['events'];check(type(events) is list and len(events)<=8192)
    states={};seen_delegations=0;outstanding=0;peak=0
    for seq,e in enumerate(events,1):
        check(e.get('sequence')==seq and type(e.get('pid')) is int);pid=e['pid'];kind=e['event']
        if kind=='OUTER_TASK':
            check(pid in outer_tasks and pid not in states)
            t=outer_tasks[pid];check(e['starttime_ticks']==t['starttime_ticks'] and e['ppid']==t['parent_pid'])
            check(pid==driver['pid'] or states.get(e['ppid'])=='EXECUTED');states[pid]='BORN'
            outstanding+=1;peak=max(peak,outstanding)
        elif kind=='OUTER_EXEC':
            check(states.get(pid)=='BORN' and e['role']==rolemap[pid]['role']);states[pid]='EXECUTED'
            check(type(e['argv_sha256']) is str and len(e['argv_sha256'])==64
                and all(c in '0123456789abcdef' for c in e['argv_sha256']))
        elif kind=='OUTER_EXIT':
            check(states.get(pid)=='EXECUTED' and e['status']==outer_tasks[pid]['wait_status']);states[pid]='EXITED'
            check(e['status']==0 or (pid==owner['pid'] and e['status']==15))
            outstanding-=1;check(outstanding>=0)
        elif kind=='INNER_SCOPE_DELEGATED':
            check(states.get(owner['pid'])=='EXECUTED' and pid==d['pid']
                and e['ppid']==d['ppid'] and e['starttime_ticks']==d['starttime_ticks']);seen_delegations+=1
        else:check(False)
    check(len(states)==len(outer_tasks) and all(s=='EXITED' for s in states.values()) and seen_delegations==1)
    check(outstanding==0 and peak==outer_ledger['totals']['task_event_outstanding_peak'])
    fields=('task_lifetimes','task_exits','successful_execs','syscall_entries','syscall_exits',
            'entry_without_exit_at_termination','inherited_return_stops','syscall_stops',
            'read_return_bytes','write_return_bytes')
    totals={k:outer_ledger['totals'][k]+inner['totals'][k] for k in fields}
    check(totals['task_lifetimes']==totals['task_exits']==len(outer_tasks)+len(inner_tasks))
    check(totals['syscall_entries']==totals['syscall_exits']+totals['entry_without_exit_at_termination'])
    check(totals['syscall_stops']==totals['syscall_entries']+totals['syscall_exits']+totals['inherited_return_stops'])
    out={'format':'VOID_V45_DISJOINT_STATIC_CASE_RESOURCE_JOIN_V1','status':'SCOPED_JOIN_GREEN',
         'context':context,'outer_capture_sha256':outer['capture_sha256'],
         'source_receipt_sha256':receipt['receipt_sha256'],
         'outer_ledger_sha256':outer_ledger['ledger_sha256'],'producer_ledger_sha256':inner['ledger_sha256'],
         'process_partition':{'outer':len(outer_tasks),'producer_and_helpers':len(inner_tasks),
                              'overlap':0,'unmatched_delegations':0},'measured_totals':totals,
         'driver_supervisor_consumers_share_one_process':True,'lifecycle_partition_complete_for_fixed_case':True,
         'recorded_scope_arithmetic_conserved':True,'whole_case_complete':False,
         'full_job_process_census':False,'full_campaign_accepted':False,
         'exact_peak_live_processes':None,'exact_peak_live_fds':None,'whole_case_syscalls':None,
         'scm_rights_descriptor_transfers':None,'whole_case_retry_count':None,
         'automatic_capture_retries':0,'elapsed_ns':outer['elapsed_ns'],'deadline_ms':outer['deadline_ms'],
         'unmeasured':['outer collector and its bootstrap','delegated producer pre-initial-exec setup',
                       'global simultaneous process/FD peaks','descriptor transfer counts',
                       'other test cases and whole-suite conservation'],
         'byte_scope':'sum_of_disjoint_task_scalar_returns_not_unique_bytes_or_physical_io'}
    out['join_sha256']=hashlib.sha256((json.dumps(out,sort_keys=True,separators=(',',':'))+'\n').encode()).hexdigest()
    return out


def case_resource_mutations(outer,static):
    """All payload seals are recomputed; arithmetic/coverage checks must reject."""
    c=load('scripts/datanet_v45_custody_session_v1.py')
    alterations=[]
    def add(name, change):alterations.append((name,change))
    add('missing-delegation',lambda a,b:a['delegations'].clear())
    add('duplicate-delegation',lambda a,b:a['delegations'].append(copy.deepcopy(a['delegations'][0])))
    add('wrong-delegated-generation',lambda a,b:a['delegations'][0].update(starttime_ticks=1))
    add('wrong-owner-generation',lambda a,b:a['delegations'][0].update(owner_starttime_ticks=1))
    add('unretired-delegation',lambda a,b:a['delegations'][0].update(pidfd_terminal_observed=False))
    add('unobserved-delegation',lambda a,b:a['delegations'][0].update(birth_observed=False))
    add('fake-delegation-pid',lambda a,b:a['delegations'][0].update(pid=999999999))
    add('wrong-delegation-parent',lambda a,b:a['delegations'][0].update(ppid=1))
    add('missing-outer-task',lambda a,b:a['outer_ledger']['tasks'].pop())
    add('duplicate-outer-task',lambda a,b:a['outer_ledger']['tasks'].append(copy.deepcopy(a['outer_ledger']['tasks'][0])))
    add('wrong-role-generation',lambda a,b:a['task_roles'][0].update(starttime_ticks=1))
    add('duplicate-role',lambda a,b:a['task_roles'].append(copy.deepcopy(a['task_roles'][0])))
    add('invented-supervisor-process',lambda a,b:a['task_roles'][0].update(role='supervisor'))
    add('missing-exit-event',lambda a,b:a['events'].pop())
    add('reordered-events',lambda a,b:a['events'].reverse())
    add('wrong-event-generation',lambda a,b:a['events'][0].update(starttime_ticks=1))
    add('wrong-exec-count',lambda a,b:a['outer_ledger']['totals'].__setitem__('successful_execs',1))
    add('wrong-syscall-total',lambda a,b:a['outer_ledger']['totals'].__setitem__('syscall_entries',1))
    add('wrong-read-byte-total',lambda a,b:a['outer_ledger']['totals'].__setitem__('read_return_bytes',1))
    add('missing-histogram',lambda a,b:a['outer_ledger']['syscall_histogram'].clear())
    add('outer-scope-downgrade',lambda a,b:a['outer_ledger'].update(scope='owned_tree_from_initial_exec_stop_to_terminal_wait'))
    add('invented-global-fd-peak',lambda a,b:a['outer_ledger'].update(exact_peak_live_fds=1))
    add('invented-scm-count',lambda a,b:a['outer_ledger'].update(scm_rights_descriptor_transfers=0))
    add('promote-outer-whole-case',lambda a,b:a['outer_ledger'].update(whole_case_complete=True))
    add('promote-capture-whole-case',lambda a,b:a.update(whole_case_complete=True))
    add('promote-census',lambda a,b:a.update(full_job_process_census=True))
    add('capture-retry',lambda a,b:a.update(automatic_retries=1))
    add('invented-completeness-field',lambda a,b:a.update(complete_resource_ledger=True))
    add('wrong-outer-event-peak',lambda a,b:a['outer_ledger']['totals'].update(task_event_outstanding_peak=2))
    add('elapsed-over-deadline',lambda a,b:a.update(elapsed_ns=a['deadline_ms']*1000000+1))
    add('context-mismatch',lambda a,b:b['context'].update(run_attempt=2))
    add('producer-pid-mismatch',lambda a,b:b['source_receipt']['producer_observation']['producer'].update(pid=1))
    rejected=[]
    for name,change in alterations:
        a=copy.deepcopy(outer);b=copy.deepcopy(static);change(a,b)
        for row,key in ((a['outer_ledger'],'ledger_sha256'),(a,'capture_sha256'),
                        (b['source_receipt'],'receipt_sha256')):
            row.pop(key,None);row[key]=c.digest(c.canon(row))
        try:case_resource_join(a,b)
        except (ValueError,AssertionError,KeyError,TypeError):rejected.append(name)
        else:raise AssertionError('case join accepted altered evidence: '+name)
    # Create an otherwise coherent outer task under an inner PID. Recompute
    # hashes and update role/events; totals stay consistent. The disjoint-scope
    # rule, not an incidental broken count, must refuse this double attribution.
    a=copy.deepcopy(outer);b=copy.deepcopy(static);inner=b['source_receipt']['producer_observation']['resource_ledger']
    producer=inner['tasks'][0]
    query=next(r for r in a['task_roles'] if r['role']=='source_query');old_pid=query['pid']
    for row in [*a['outer_ledger']['tasks'],*a['task_roles'],*a['events']]:
        if row.get('pid')==old_pid:
            row['pid']=producer['pid']
            if 'starttime_ticks' in row:row['starttime_ticks']=producer['starttime_ticks']
    for row,key in ((a['outer_ledger'],'ledger_sha256'),(a,'capture_sha256')):
        row.pop(key,None);row[key]=c.digest(c.canon(row))
    verify_owned_resource_ledger(a['outer_ledger'],outer=True)
    try:case_resource_join(a,b)
    except (ValueError,AssertionError,KeyError,TypeError):rejected.append('coherent-overlapping-producer-task')
    else:raise AssertionError('overlapping producer accepted')
    return {'cases':len(rejected),'rejected':rejected,'resealed_inputs':True,
            'independent_live_observer':False}


def real_static_case_resource(output):
    c=load('scripts/datanet_v45_custody_session_v1.py')
    work=Path(tempfile.mkdtemp(prefix='void-v45-case-resource-'))
    outer=c.StaticCaseResourceCapture().run(ROOT,work)
    (work/'outer.json').write_bytes(c.canon(outer))
    need(outer['status']=='CAPTURED','outer scope HOLD; evidence '+str(work))
    static=json.loads((work/'static.json').read_bytes())
    joined=case_resource_join(outer,static)
    mutations=case_resource_mutations(outer,static)
    out={'marker':'VOID_V45_STATIC_CASE_RESOURCE_RECONCILIATION_V1_GREEN','status':'GREEN',
         'evidence_directory':str(work),'join':joined,'mutation_controls':mutations,
         'whole_case_complete':False,'full_campaign_accepted':False}
    with Path(output).open('xb') as f:f.write(c.canon(out))
    print(json.dumps({'status':'SCOPED_JOIN_GREEN','processes':joined['process_partition'],
                     'output':str(output),'evidence_directory':str(work)}));return 0


# Retain refusal telemetry instead of replacing it with a PASS summary. This is
# a bounded validation contract for partial records, not whole-case accounting.
OUTER_LIMIT_CASES = ('syscall_stops', 'tasks', 'fd_sample', 'deadline', 'preexisting-child')


def verify_outer_refusal_capture(record: dict, metric: str, source: dict) -> None:
    code = 'HOLD_V45_OUTER_REFUSAL_RECORD_INVALID'
    def check(ok):
        if not ok: raise ValueError(code)
    def seal(obj, key):
        check(type(obj) is dict and key in obj)
        body = dict(obj); value = body.pop(key)
        check(type(value) is str and value == hashlib.sha256(
            (json.dumps(body, sort_keys=True, separators=(',', ':'), allow_nan=False)+'\n').encode()).hexdigest())
    check(metric in OUTER_LIMIT_CASES)
    check(type(record) is dict and set(record) == {
        'format','status','rejection','source_sha256','custodian_source_sha256',
        'interpreter_sha256','git_sha256','outer_ledger','task_roles','delegations',
        'events','elapsed_ns','deadline_ms','automatic_retries','cleanup_complete',
        'whole_case_complete','full_job_process_census','full_campaign_accepted','capture_sha256'})
    seal(record, 'capture_sha256')
    expected = ('HOLD_V45_RESOURCE_'+metric.upper() if metric in OUTER_LIMIT_CASES[:3]
                else 'HOLD_V45_OUTER_'+('DEADLINE' if metric == 'deadline' else 'PREEXISTING_CHILD'))
    check(record['format'] == 'VOID_V45_STATIC_OUTER_CAPTURE_V1' and record['status'] == 'HOLD'
          and record['rejection'] == expected and record['cleanup_complete'] is True)
    check(all(record[k] is False for k in ('whole_case_complete','full_job_process_census','full_campaign_accepted')))
    check(record['source_sha256'] == source['controls_sha256']
          and record['custodian_source_sha256'] == source['custody_sha256'])
    check(all(type(record[k]) is str and len(record[k]) == 64 and
              all(ch in '0123456789abcdef' for ch in record[k])
              for k in ('interpreter_sha256','git_sha256')))
    check(type(record['elapsed_ns']) is int and record['elapsed_ns'] >= 0
          and type(record['deadline_ms']) is int
          and record['deadline_ms'] == (100 if metric == 'deadline' else 90000)
          and type(record['automatic_retries']) is int and record['automatic_retries'] == 0)
    ledger = record['outer_ledger']
    verify_owned_resource_ledger(ledger, outer=True)
    check(ledger['capture_complete_for_scope'] is False and ledger['stream_bindings'] == {})
    if metric in OUTER_LIMIT_CASES[:3]:
        check(ledger['refusal'] == {'metric':metric,'observed':2,'limit':1})
    else:
        check(ledger['refusal'] is None)
    roles = record['task_roles']; events = record['events']
    check(type(roles) is list and type(events) is list and len(roles) <= 513 and len(events) <= 8192)
    generations = {}
    for row in roles:
        check(type(row) is dict and set(row) == {'pid','ppid','starttime_ticks','role','execs','exited'})
        check(all(type(row[k]) is int and row[k] > 0 for k in ('pid','ppid','starttime_ticks')))
        check(type(row['execs']) is int and row['execs'] >= 0 and row['exited'] is True
              and row['role'] in (None,'driver_supervisor_consumers','source_query','custodian'))
        check(row['pid'] not in generations); generations[row['pid']] = row
    for task in ledger['tasks']:
        role = generations.get(task['pid'])
        check(role is not None and role['starttime_ticks'] == task['starttime_ticks']
              and role['ppid'] == task['parent_pid'] and role['exited'] == task['exited'])
    # A task-limit refusal occurs after birth is observed but before birth is
    # debited into the bounded ledger. Keep that generation, never count it as 0.
    unmetered = set(generations) - {r['pid'] for r in ledger['tasks']}
    check(len(unmetered) == (1 if metric == 'tasks' else 0))
    check(record['delegations'] == [])
    for i,event in enumerate(events,1):
        check(type(event) is dict and type(event.get('sequence')) is int and event['sequence'] == i)
        check(event.get('event') in ('OUTER_TASK','OUTER_EXEC','OUTER_EXIT'))
        check(event.get('pid') in generations)
    if metric == 'preexisting-child':
        check(roles == [] and events == [] and ledger['tasks'] == [])


def verify_outer_resource_control_result(result: dict, source: dict) -> None:
    def check(ok):
        if not ok: raise ValueError('HOLD_V45_OUTER_CONTROL_RESULT_INVALID')
    check(type(result) is dict and result.get('marker') == 'VOID_V45_OUTER_RESOURCE_BOUND_CONTROLS_V1_GREEN')
    check(result.get('status') == 'GREEN' and result.get('whole_case_complete') is False
          and result.get('complete_resource_ledger') is False
          and result.get('hard_execution_resource_ceiling') is False
          and result.get('source_binding') == source)
    rows = result.get('cases')
    check(type(rows) is list and [r.get('metric') for r in rows] == list(OUTER_LIMIT_CASES))
    check(type(result.get('retained_capture_count')) is int and result['retained_capture_count'] == len(rows)
          and result.get('arithmetic_max_plus_one_cases') == 4)
    for row in rows:
        check(row.get('status') == 'PASS' and row.get('raw_capture_retained') is True)
        verify_outer_refusal_capture(row.get('capture'), row['metric'], source)
        check(row.get('rejection') == row['capture']['rejection'])
        if row['metric'] == 'preexisting-child': check(row.get('preexisting_child_untouched') is True)
        else: check(row.get('cleanup_complete') is True and row.get('success_artifacts_absent') is True)


def outer_refusal_record_mutations(result: dict, source: dict) -> dict:
    """Reject inconsistent rehashed telemetry; never execute a modified producer."""
    verify_outer_resource_control_result(result, source)
    changes = (
        ('missing-capture', ('cases',0,'capture'), None),
        ('reported-only-capture', ('cases',0,'raw_capture_retained'), False),
        ('missing-case', ('cases',), result['cases'][:-1]),
        ('duplicate-case', ('cases',), [result['cases'][0], *result['cases'][0:4]]),
        ('wrong-source', ('cases',0,'capture','source_sha256'), '0'*64),
        ('wrong-custodian', ('cases',0,'capture','custodian_source_sha256'), '0'*64),
        ('success-instead-of-hold', ('cases',0,'capture','status'), 'CAPTURED'),
        ('wrong-refusal', ('cases',0,'capture','rejection'), 'HOLD_OTHER'),
        ('cleanup-unverified', ('cases',0,'capture','cleanup_complete'), False),
        ('whole-case-promoted', ('cases',0,'capture','whole_case_complete'), True),
        ('whole-job-promoted', ('cases',0,'capture','full_job_process_census'), True),
        ('scope-promoted', ('cases',0,'capture','outer_ledger','capture_complete_for_scope'), True),
        ('null-peak-invented', ('cases',0,'capture','outer_ledger','exact_peak_live_fds'), 0),
        ('stop-total-changed', ('cases',0,'capture','outer_ledger','totals','syscall_stops'), 123),
        ('limit-changed', ('cases',0,'capture','outer_ledger','refusal','observed'), 3),
        ('retry-hidden', ('cases',0,'capture','automatic_retries'), 1),
        ('bad-deadline', ('cases',3,'capture','deadline_ms'), 101),
        ('generation-changed', ('cases',0,'capture','task_roles',0,'starttime_ticks'), 1),
        ('unmetered-generation-dropped', ('cases',1,'capture','task_roles'), result['cases'][1]['capture']['task_roles'][:-1]),
        ('foreign-child-unprotected', ('cases',4,'preexisting_child_untouched'), False),
        ('retention-count-changed', ('retained_capture_count',), 6),
        ('hard-ceiling-invented', ('hard_execution_resource_ceiling',), True),
    )
    rejected=[]
    for name,path,value in changes:
        altered=copy.deepcopy(result); cursor=altered
        for part in path[:-1]:cursor=cursor[part]
        cursor[path[-1]]=copy.deepcopy(value)
        for row in altered.get('cases',[]):
            capture=row.get('capture')
            if type(capture) is dict:
                ledger=capture.get('outer_ledger')
                if type(ledger) is dict:
                    ledger.pop('ledger_sha256',None)
                    ledger['ledger_sha256']=hashlib.sha256((json.dumps(ledger,sort_keys=True,separators=(',',':'))+'\n').encode()).hexdigest()
                capture.pop('capture_sha256',None)
                capture['capture_sha256']=hashlib.sha256((json.dumps(capture,sort_keys=True,separators=(',',':'))+'\n').encode()).hexdigest()
        try:verify_outer_resource_control_result(altered,source)
        except (ValueError,TypeError,KeyError):rejected.append(name)
        else:raise AssertionError('changed refusal telemetry accepted: '+name)
    return {'rejected':rejected,'case_count':len(rejected),'resealed_inputs':True,
            'producer_executed':False,'independent_live_observer':False}


def outer_resource_limit_case(metric: str) -> dict:
    """One existing negative scenario; no successful static replay is selected."""
    c=load('scripts/datanet_v45_custody_session_v1.py')
    need(metric in OUTER_LIMIT_CASES, 'outer scenario not declared')
    if metric in ('syscall_stops','tasks','fd_sample'):
        with tempfile.TemporaryDirectory(prefix='void-v45-outer-bound-') as tmp:
            limits=dict(c.OuterCaseSyscallLedger.DEFAULT_LIMITS);limits[metric]=1
            before=len(os.listdir('/proc/self/fd'))
            record=c.StaticCaseResourceCapture().run(ROOT,Path(tmp),limits=limits)
            need(record['status']=='HOLD' and record['rejection']=='HOLD_V45_RESOURCE_'+metric.upper(),
                 'wrong outer limit refusal')
            need(record['cleanup_complete'] and len(os.listdir('/proc/self/fd'))==before,'outer cleanup failed')
            need(not (Path(tmp)/'static.json').exists() and not (Path(tmp)/'static.capsule.zip').exists(),
                 'limited outer case emitted success artifacts')
            failure=record['outer_ledger']['refusal']
            need(failure['observed']==2 and failure['limit']==1,'not exact max+1')
            row={'metric':metric,'status':'PASS','refusal':failure,
                 'rejection':record['rejection'],'cleanup_complete':True,
                 'success_artifacts_absent':True,'raw_capture_retained':True,'capture':record}
    elif metric=='deadline':
        with tempfile.TemporaryDirectory(prefix='void-v45-outer-deadline-') as tmp:
            record=c.StaticCaseResourceCapture().run(ROOT,Path(tmp),timeout_ms=100)
            need(record['status']=='HOLD' and record['rejection']=='HOLD_V45_OUTER_DEADLINE'
                 and record['cleanup_complete'],'wrong outer deadline refusal')
            need(not (Path(tmp)/'static.json').exists() and not (Path(tmp)/'static.capsule.zip').exists(),
                 'deadline emitted success artifacts')
            row={'metric':metric,'status':'PASS','rejection':record['rejection'],'cleanup_complete':True,
                 'success_artifacts_absent':True,'raw_capture_retained':True,'capture':record}
    else:
        with tempfile.TemporaryDirectory(prefix='void-v45-outer-unrelated-') as tmp:
            import signal,time
            child=os.fork()
            if child==0:
                time.sleep(5);os._exit(0)
            try:
                record=c.StaticCaseResourceCapture().run(ROOT,Path(tmp))
                need(record['status']=='HOLD' and record['rejection']=='HOLD_V45_OUTER_PREEXISTING_CHILD',
                     'preexisting-child admission was not refused')
                need(os.waitpid(child,os.WNOHANG)==(0,0),'collector reaped or killed a preexisting child')
                row={'metric':metric,'status':'PASS','rejection':record['rejection'],'preexisting_child_untouched':True,
                     'raw_capture_retained':True,'capture':record}
            finally:
                os.kill(child,signal.SIGKILL);os.waitpid(child,0)
    source={'head':git(ROOT,'rev-parse','HEAD'),'tree':git(ROOT,'rev-parse','HEAD^{tree}'),
            'controls_sha256':c.digest(Path(__file__).read_bytes()),
            'custody_sha256':c.digest((ROOT/'scripts/datanet_v45_custody_session_v1.py').read_bytes())}
    verify_outer_refusal_capture(row['capture'],metric,source)
    return row


def invocation_schema_controls(source: dict, runtime: dict) -> dict:
    """Data-only counterexamples. Synthetic events do not count as executions."""
    p=load('scripts/prove_datanet_v45_source_execution_v1.py')
    plan=['journal/success','journal/success'];session='1'*32;rows=[]
    def add(kind,data):rows.append({'kind':kind,'data':data,'time_ns':len(rows)*100+100})
    def encode(items):
        previous='0'*64;output=[]
        for i,item in enumerate(items,1):
            value={**copy.deepcopy(item),'sequence':i,'previous_sha256':previous}
            value.pop('event_sha256',None)
            value['event_sha256']=p.sha256(p.invocation_canon(value));previous=value['event_sha256']
            output.append(p.invocation_canon(value))
        return b''.join(output)
    add('SESSION',{'format':p.INVOCATION_FORMAT,'session_id':session,'source':source,'runtime':runtime,
                  'plan':plan,'owner_pid':1234,'scope':'selected_local_case_root_invocations_only'})
    for ordinal,scenario in enumerate(plan,1):
        ident=p.sha256(p.invocation_canon([session,source,scenario,ordinal,ordinal]))
        add('BEGIN',{'invocation_id':ident,'scenario_id':scenario,'ordinal':ordinal,'attempt':ordinal,
            'deadline_ns':10000,'source':source,'runtime':runtime,'argv_sha256':'a'*64})
        begin=rows[-1]['time_ns']
        add('SPAWN',{'invocation_id':ident,'pid':2000+ordinal,'starttime_ticks':3000+ordinal,'parent_pid':1234})
        endtime=len(rows)*100+100
        add('END',{'invocation_id':ident,'state':'COMPLETED','returncode':0,'root_reaped':True,
            'elapsed_ns':endtime-begin,'result_sha256':str(ordinal)*64,'log_sha256':'a'*64,
            'ledger_refs':[],'automatic_retries':0,'descendant_cleanup_verified':False,'fixture_transfer':None})
    add('CLOSE',{'started_invocations':2})
    def verify(items, expected_plan=plan):
        return p.verify_invocation_journal(encode(items),source,runtime,expected_plan=expected_plan)
    accepted=[];rejected=[]
    base=verify(rows);need(base['completed_invocations']==2 and base['spawned_roots']==2,'baseline count')
    accepted.append('two-explicit-attempts-two-unique-identities')
    pending=verify(rows[:3]);need(pending['unfinished_invocations']==1 and pending['completed_invocations']==0
                                and not pending['journal_closed'],'unfinished lost')
    accepted.append('unfinished-kept-out-of-completed-total')
    timed=copy.deepcopy(rows);timed[1]['data']['deadline_ns']=1;timed[3]['data']['state']='TIMEOUT'
    need(verify(timed)['completed_invocations']==1,'timeout counted complete');accepted.append('timeout-not-completed')
    ledger={'object_sha256':'c'*64,'ledger_sha256':'d'*64,'format':'VOID_V45_OWNED_SYSCALL_LEDGER_V1',
            'paths':['/payload/ledger','/payload/observation/ledger']}
    alias=copy.deepcopy(rows);alias[3]['data']['ledger_refs']=[ledger]
    need(verify(alias)['unique_resource_objects']==1,'alias inflated');accepted.append('two-alias-paths-one-object')
    def refuse(name,change):
        altered=copy.deepcopy(rows);change(altered)
        try:verify(altered)
        except (p.SourceHold,ValueError,TypeError,KeyError):rejected.append(name)
        else:raise AssertionError('invocation mutation accepted: '+name)
    refuse('duplicate-invocation-id',lambda v:v[4]['data'].update(invocation_id=v[1]['data']['invocation_id']))
    refuse('duplicate-ordinal',lambda v:v[4]['data'].update(ordinal=1))
    refuse('boolean-ordinal',lambda v:v[1]['data'].update(ordinal=True))
    refuse('reused-attempt',lambda v:v[4]['data'].update(attempt=1))
    refuse('changed-scenario',lambda v:v[4]['data'].update(scenario_id='outer/tasks'))
    refuse('cross-source-head',lambda v:v[4]['data']['source'].update(head='f'*40))
    refuse('cross-source-tree',lambda v:v[4]['data']['source'].update(tree='e'*40))
    refuse('changed-runtime',lambda v:v[4]['data']['runtime'].update(version='0.0.0'))
    refuse('unobserved-process',lambda v:v.pop(2))
    refuse('duplicate-generation',lambda v:v[5]['data'].update(pid=v[2]['data']['pid'],starttime_ticks=v[2]['data']['starttime_ticks']))
    refuse('wrong-parent',lambda v:v[2]['data'].update(parent_pid=9999))
    refuse('nonzero-marked-completed',lambda v:v[3]['data'].update(returncode=7))
    refuse('unreaped-marked-completed',lambda v:v[3]['data'].update(root_reaped=False))
    refuse('missing-completed-result',lambda v:v[3]['data'].update(result_sha256=None))
    refuse('after-deadline-marked-completed',lambda v:v[1]['data'].update(deadline_ns=1))
    refuse('bad-elapsed',lambda v:v[3]['data'].update(elapsed_ns=201))
    refuse('boolean-returncode',lambda v:v[3]['data'].update(returncode=False))
    refuse('hidden-retry',lambda v:v[3]['data'].update(automatic_retries=1))
    refuse('unknown-terminal',lambda v:v[3]['data'].update(state='GREEN'))
    refuse('unfinished-sealed',lambda v:v.pop(6))
    refuse('missing-planned-attempt',lambda v:v.__setitem__(slice(4,7),[]))
    refuse('changed-plan-to-hide-omission',lambda v:(v.__setitem__(slice(4,7),[]),v[0]['data'].update(plan=['journal/success']),v[-1]['data'].update(started_invocations=1)))
    refuse('false-close-count',lambda v:v[-1]['data'].update(started_invocations=3))
    refuse('additional-after-close',lambda v:v.append(copy.deepcopy(v[1])))
    refuse('alias-counted-as-two-objects',lambda v:v[3]['data'].update(ledger_refs=[ledger,ledger]))
    refuse('same-ledger-two-invocations',lambda v:(v[3]['data'].update(ledger_refs=[ledger]),v[6]['data'].update(ledger_refs=[ledger])))
    refuse('duplicate-alias-path',lambda v:v[3]['data'].update(ledger_refs=[{**ledger,'paths':['/x','/x']}]))
    refuse('invent-subtree-cleanup',lambda v:v[3]['data'].update(descendant_cleanup_verified=True))
    refuse('extra-acceptance-field',lambda v:v[3]['data'].update(full_campaign_accepted=True))
    # Serialization corruption is rejected before replaying any totals.
    for name,raw in [('truncated-last-line',encode(rows)[:-1]),
                     ('broken-chain',encode(rows).replace(b'"previous_sha256":"',b'"previous_sha256":"f',1)),
                     ('duplicate-json-key',encode(rows).replace(b'"kind":"SESSION"',b'"kind":"SESSION","kind":"SESSION"',1))]:
        try:p.verify_invocation_journal(raw,source,runtime,expected_plan=plan)
        except (p.SourceHold,ValueError,TypeError,KeyError):rejected.append(name)
        else:raise AssertionError('serialization control accepted')
    return {'status':'PASS','positive_checks':accepted,'rejected_mutations':rejected,
            'all_mutation_hashes_recalculated_except_serialization_controls':True,
            'scope':'data_only_assertions_not_additional_process_invocations',
            'full_campaign_accepted':False}


def invocation_worker(scenario: str, request_fd: int, output: str, fixture_socket: int | None = None) -> int:
    """Execute exactly one declared case; the separate parent owns its journal.

    No caller command, imported historical receipt, or arbitrary PID is accepted.
    This request binds bookkeeping context, not independent kernel provenance.
    """
    import fcntl, signal, time
    parent=load('scripts/prove_datanet_v45_source_execution_v1.py')
    need(scenario in parent.INVOCATION_SCENARIOS, 'undeclared invocation scenario')
    need(fcntl.fcntl(request_fd,1034)==15, 'invocation request not sealed')
    st=os.fstat(request_fd);need(st.st_size<=16384, 'invocation request too large')
    request=parent.invocation_json(os.pread(request_fd,st.st_size,0));os.close(request_fd)
    need(type(request) is dict and set(request)=={'invocation_id','scenario_id','source','runtime'},'invocation request schema')
    need(request['scenario_id']==scenario and type(request['invocation_id']) is str
         and len(request['invocation_id'])==64,'invocation binding')
    source=request['source']
    need(source['head']==git(ROOT,'rev-parse','HEAD') and source['tree']==git(ROOT,'rev-parse','HEAD^{tree}'),
         'invocation source generation differs')
    need(source['worker_sha256']==hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
         and source['supervisor_sha256']==hashlib.sha256((ROOT/parent.SUPERVISOR_REL).read_bytes()).hexdigest(),
         'invocation executing source differs')
    need(request['runtime']==parent.invocation_runtime(),'invocation runtime differs')
    family,name=scenario.split('/',1)
    required_socket = family in ('owned','primitive') and name.startswith('scm-rights-')
    need((fixture_socket is not None) == required_socket, 'unexpected or missing invocation fixture socket')
    if family in ('owned','primitive','helper','resource'):
        # Each named case runs directly in this identified root, not through a
        # second unjournaled case launcher. Its internal producer remains distinct.
        worker = {'owned':owned_commit_worker,'primitive':observed_worker,
                  'helper':helper_profile_worker,'resource':resource_ledger_worker}[family]
        with tempfile.TemporaryDirectory(prefix='void-v45-identified-case-') as tmp:
            target=Path(tmp)/'payload.json'
            rc=(worker(name,target,fixture_socket) if family in ('owned','primitive') else worker(name,target))
            need(rc == 0, 'identified case did not complete')
            payload=parent.invocation_json(parent.invocation_file(target,parent.INVOCATION_LIMITS['result_bytes']))
            need(type(payload) is dict and payload.get('case')==name and payload.get('status')=='PASS',
                 'identified case result mismatch')
    elif family=='identity':
        rows=owned_rpc_identity_controls(case_filter=name)
        need(len(rows)==1 and rows[0]['case']==name, 'identity selection mismatch')
        payload=rows[0]
    elif family=='outer':payload=outer_resource_limit_case(name)
    elif family=='primary':
        ctx={'head':source['head'],'tree':source['tree'],'node_major':22,'run_id':77,'run_attempt':1}
        payload=run_case(name,ROOT,ctx)
    elif family=='cross-runtime':
        need(load('scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py').selftest()==0,'cross-runtime selftest failed')
        payload={'case':'selftest','status':'PASS','synthetic_context':True,'full_campaign_accepted':False}
    elif family=='journal':
        if name=='no-result':return 0
        if name=='signal':os.kill(os.getpid(),signal.SIGTERM)
        payload=(invocation_schema_controls(source,request['runtime']) if name=='schema-controls' else
                 {'case':name,'status':'PASS','fixture_only':True,'resource_ledger':None})
    else:raise AssertionError('unimplemented invocation')
    result={'format':'VOID_V45_INVOCATION_RESULT_V1',**request,'status':'PASS','payload':payload}
    parent.write_exclusive(Path(output),parent.invocation_canon(result))
    if scenario=='journal/reexec':
        # Harmless negative fixture: PASS exists, but an unadmitted replacement
        # image must not execute or turn this into a completed invocation.
        os.execv(sys.executable,[sys.executable,'-I','-S','-B','-c',
                                 "print('UNADMITTED_WORKER_IMAGE_RAN')"])
    if scenario=='journal/nonzero':return 7
    if scenario=='journal/timeout':time.sleep(10)
    return 0


def outer_resource_limit_controls(output):
    c=load('scripts/datanet_v45_custody_session_v1.py')
    rows=[outer_resource_limit_case(metric) for metric in OUTER_LIMIT_CASES]
    # Inclusive-bound tests do not need to spawn any additional process.
    for metric,value in c.OuterCaseSyscallLedger.DEFAULT_LIMITS.items():
        led=c.OuterCaseSyscallLedger();led.limit(metric,value)
        try:led.limit(metric,value+1)
        except c.CustodyHold:pass
        else:raise AssertionError('outer max+1 arithmetic accepted')
    out={'marker':'VOID_V45_OUTER_RESOURCE_BOUND_CONTROLS_V1_GREEN','status':'GREEN',
         'cases':rows,'arithmetic_max_plus_one_cases':4,'whole_case_complete':False,
         'retained_capture_count':len(rows),'complete_resource_ledger':False,
         'hard_execution_resource_ceiling':False,'source_binding':{
             'head':git(ROOT,'rev-parse','HEAD'),'tree':git(ROOT,'rev-parse','HEAD^{tree}'),
             'controls_sha256':c.digest(Path(__file__).read_bytes()),
             'custody_sha256':c.digest((ROOT/'scripts/datanet_v45_custody_session_v1.py').read_bytes())}}
    out['retention_controls']=outer_refusal_record_mutations(out,out['source_binding'])
    with Path(output).open('xb') as f:f.write(c.canon(out))
    print(json.dumps({'status':'GREEN','output':str(output),'live_bound_cases':len(rows)}));return 0


def main():
    p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--case',choices=CASES)
    p.add_argument('--real-static-helper-profile',action='store_true')
    p.add_argument('--helper-profile-controls', action='store_true')
    p.add_argument('--helper-profile-case', choices=HELPER_CASES)
    p.add_argument('--owned-commit-controls', action='store_true')
    p.add_argument('--owned-commit-case', choices=OWNED_COMMIT_CASES)
    p.add_argument('--observed-producer-controls', action='store_true')
    p.add_argument('--observed-producer-case', choices=OBSERVED_CASES)
    p.add_argument('--observed-fixture-socket', type=int)
    p.add_argument('--real-static-resource-profile', action='store_true')
    p.add_argument('--resource-ledger-controls', action='store_true')
    p.add_argument('--resource-ledger-case', choices=RESOURCE_CASES)
    p.add_argument('--real-static-case-resource-profile',action='store_true')
    p.add_argument('--outer-resource-limit-controls',action='store_true')
    p.add_argument('--invocation-case')
    p.add_argument('--invocation-request-fd',type=int)
    ns=p.parse_args()
    if ns.invocation_case is not None:
        need(ns.invocation_request_fd is not None, 'invocation request missing')
        return invocation_worker(ns.invocation_case, ns.invocation_request_fd, ns.output, ns.observed_fixture_socket)
    need(ns.invocation_request_fd is None, 'unexpected invocation request')
    if ns.real_static_case_resource_profile:return real_static_case_resource(ns.output)
    if ns.outer_resource_limit_controls:return outer_resource_limit_controls(ns.output)
    if ns.real_static_resource_profile:return real_static_helper_profile(ns.output,capture_resources=True)
    if ns.resource_ledger_case:return resource_ledger_worker(ns.resource_ledger_case,ns.output)
    if ns.resource_ledger_controls:return resource_ledger_controls(ns.output)
    if ns.real_static_helper_profile:
        return real_static_helper_profile(ns.output)
    if ns.helper_profile_case:
        return helper_profile_worker(ns.helper_profile_case,ns.output)
    if ns.helper_profile_controls:
        return helper_profile_controls(ns.output)
    if ns.owned_commit_case:
        return owned_commit_worker(ns.owned_commit_case, ns.output, ns.observed_fixture_socket)
    if ns.owned_commit_controls:
        return owned_commit_controls(ns.output)
    if ns.observed_producer_case:
        return observed_worker(ns.observed_producer_case, ns.output, ns.observed_fixture_socket)
    if ns.observed_producer_controls:
        return observed_controls(ns.output)
    repo=Path(os.environ.get('GIT_WORK_TREE',str(ROOT)))
    ctx={'head':git(repo,'rev-parse','HEAD'),'tree':git(repo,'rev-parse','HEAD^{tree}'),'node_major':22,'run_id':77,'run_attempt':1}
    results=[run_case(name,repo,ctx) for name in ((ns.case,) if ns.case else CASES)]
    owned_result=None
    helper_result=None
    if ns.case is None:
        with tempfile.TemporaryDirectory(prefix='void-v45-required-owned-controls-') as tmp:
            result_path=Path(tmp)/'owned-controls.json'
            owned_commit_controls(result_path)
            owned_result=json.loads(result_path.read_bytes())
            helper_path=Path(tmp)/'helper-controls.json'
            helper_profile_controls(helper_path)
            helper_result=json.loads(helper_path.read_bytes())
    out={'marker':MARKER,'status':'GREEN','cases':results,'canonical_controls_source_sha256':hashlib.sha256((ROOT/'scripts/prove_datanet_v45_full_stack_aggregate_controls_v1.py').read_bytes()).hexdigest(),
         'real_supervisor_run_exercised':True,'synthetic_inputs':True,'storage_campaign_executed':False,
         'full_campaign_accepted':False,'production_runtime_touched':False}
    if ns.case is None:
        out['owned_producer_controls']=owned_result
        out['readonly_helper_controls']=helper_result
        out['required_control_consumers']=required_control_consumer_checks(out)
    raw=(json.dumps(out,sort_keys=True,separators=(',',':'))+'\n').encode()
    if os.environ.get('VOID_V45_OUTPUT_STREAMS_V1')=='1':
        load('scripts/datanet_v45_custody_session_v1.py').write_stream_output(Path(ns.output),raw)
    elif os.environ.get('VOID_V45_OUTPUT_CUSTODY_V1')=='1':
        fd=json.loads(os.environ['VOID_V45_OUTPUT_FDS'])[ns.output];need(os.fstat(fd).st_size==0,'prewritten test output');os.write(fd,raw);os.fsync(fd)
    else:
        fd=os.open(ns.output,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC|os.O_NOFOLLOW,0o600)
        try:os.write(fd,raw);os.fsync(fd)
        finally:os.close(fd)
    print(raw.decode(),end='');return 0

if __name__=='__main__':raise SystemExit(main())
