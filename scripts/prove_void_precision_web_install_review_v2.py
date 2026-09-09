#!/usr/bin/env python3
"""Bounded regression controls from the independent installer V2 review.

These additional controls are separate from the 1,512-process population.
All operation fixtures use a virtual manager and temporary files.
"""
import argparse
import copy
import importlib.util
import json
import os
from pathlib import Path
import runpy
import subprocess
import sys
import tempfile
from unittest.mock import patch
import zlib

ROOT=Path(__file__).resolve().parents[1]


def load(path,name):
    spec=importlib.util.spec_from_file_location(name,path)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--head',required=True)
    args=parser.parse_args()
    S=load(ROOT/'scripts/prove_void_precision_web_install_v2.py','review_supervisor')
    E=S.E; source=E.source_identity(ROOT,args.head); runtime=E.runtime_identity()
    M=load(ROOT/'ops/public/void_precision_web_install_v2.py','review_installer')
    checks=[]
    def reject(name,operation):
        try: operation()
        except (RuntimeError,ValueError,KeyError,OSError): checks.append(name)
        else: raise RuntimeError('negative control admitted: '+name)
    env={'PATH':'/usr/bin:/bin','HOME':str(Path.home()),'LANG':'C','GIT_CONFIG_NOSYSTEM':'1',
         'GIT_CONFIG_GLOBAL':'/dev/null','GIT_AUTHOR_NAME':'VOID fixture',
         'GIT_AUTHOR_EMAIL':'fixture@example.invalid','GIT_COMMITTER_NAME':'VOID fixture',
         'GIT_COMMITTER_EMAIL':'fixture@example.invalid'}
    def git(root,*argv,data=None):
        return subprocess.check_output(['/usr/bin/git','--no-replace-objects','-C',str(root),*argv],
                                       input=data,env=env,stderr=subprocess.PIPE,timeout=15)
    with tempfile.TemporaryDirectory(prefix='void-installer-review-',dir=Path.home()) as temp:
        base=Path(temp); root=base/'source'
        subprocess.run(['/usr/bin/git','clone','--shared','--no-checkout',str(ROOT),str(root)],
                       env=env,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=30)
        git(root,'checkout','--detach',args.head)
        names=['ops/public/void_precision_web_install_v2.py','ops/public/void_precision_web_install_evidence_v2.py']
        originals={n:(root/n).read_bytes() for n in names}
        for name in names: (root/name).write_bytes(originals[name]+b'\n# inert replacement-ref control\n')
        git(root,'add','--',*names)
        tree=git(root,'write-tree').decode().strip()
        replacement=git(root,'commit-tree',tree,'-p',args.head,data=b'review fixture\n').decode().strip()
        git(root,'replace',args.head,replacement)
        reject('replace_ref_altered_checkout',lambda:E.source_identity(root,args.head))
        E.require(M.git_blob_at_head(root,args.head,names[1])==originals[names[1]],'bootstrap followed replacement')
        checks.append('bootstrap_ignores_replace_ref')
        for name,data in originals.items(): (root/name).write_bytes(data)
        E.require(E.source_identity(root,args.head)==source,'replacement changed legitimate source identity')
        checks.append('original_source_under_replace_ref')
        commit=git(root,'cat-file','commit',args.head)
        def loose(kind,oid,data):
            path=root/'.git/objects'/oid[:2]/oid[2:]; path.parent.mkdir(exist_ok=True)
            path.write_bytes(zlib.compress(kind.encode()+b' '+str(len(data)).encode()+b'\0'+data))
        # Give Git exactly one object source. A shared clone can prefer a valid
        # packed/alternate copy over a corrupt loose duplicate at the same OID.
        objects={('commit',args.head):commit}; entries={}
        for name in E.PATHS:
            oid=source['tree']
            for part in name.split('/'):
                if oid not in entries:
                    objects[('tree',oid)]=git(root,'cat-file','tree',oid)
                    entries[oid]=E.tree_entries(root,oid)
                _,oid=entries[oid][part.encode()]
            objects[('blob',oid)]=git(root,'cat-file','blob',oid)
        E.require(not list((root/'.git/objects/pack').glob('*.pack')),'fixture unexpectedly has local packs')
        for (kind,oid),data in objects.items(): loose(kind,oid,data)
        (root/'.git/objects/info/alternates').unlink()
        E.require(E.source_identity(root,args.head)==source,'isolated object fixture baseline differs')
        corrupt_commit=commit+b'corrupt object control\n'
        loose('commit',args.head,corrupt_commit)
        E.require(git(root,'cat-file','commit',args.head)==corrupt_commit,'commit corruption was not observed')
        reject('raw_commit_identity',lambda:E.source_identity(root,args.head))
        reject('bootstrap_raw_commit_identity',lambda:M.git_blob_at_head(root,args.head,names[1]))
        loose('commit',args.head,commit)
        tree_data=git(root,'cat-file','tree',source['tree'])
        corrupt_tree=tree_data[:-1]+bytes([tree_data[-1]^1])
        loose('tree',source['tree'],corrupt_tree)
        E.require(git(root,'cat-file','tree',source['tree'])==corrupt_tree,'tree corruption was not observed')
        reject('raw_tree_identity',lambda:E.source_identity(root,args.head))
        reject('bootstrap_raw_tree_identity',lambda:M.git_blob_at_head(root,args.head,names[1]))

        case=next(c for c in E.manifests(ROOT)[0] if c['id']=='link-0-wrong_target-after_guard')
        work=base/'baseline'; work.mkdir()
        baseline=S.run_case(work,source,runtime,case,'natural')
        checks.append('natural_wrong_target_baseline')
        for label,terminal in [('v2_false_success',{'result':'ENABLE_LINKS_OBSERVED_AT_EXACT_SAMPLE',
                                                   'current_enablement_authority':False}),
                               ('enable_authority',dict(baseline['terminals']['primary']['successor'],
                                                        current_enablement_authority=True))]:
            row=copy.deepcopy(baseline); row['terminals']['primary']['successor']=terminal
            reject(label,lambda:E.case_observations(row))
        original_run=S.Supervisor.run
        def deleted_after_primary(supervisor,phase):
            result=original_run(supervisor,phase)
            if phase=='primary':
                wants=Path(supervisor.metadata['successor']['target'])/'default.target.wants'
                (wants/S.NAMES[0]).unlink(); (wants/'unrelated.marker').unlink()
            return result
        work=base/'deleted'; work.mkdir()
        with patch.object(S.Supervisor,'run',deleted_after_primary):
            reject('primary_deleted_foreign_and_unrelated',lambda:S.run_case(work,source,runtime,case,'natural'))
        row=copy.deepcopy(baseline)
        key=next(k for k in row['primary_census'] if k.endswith('unrelated.marker'))
        del row['primary_census'][key]; row['recovery_census']=copy.deepcopy(row['primary_census'])
        reject('receipt_deleted_protected_entry',lambda:E.case_observations(row))

    proof=ROOT/E.FIXTURE/'prove_void_precision_web_install_v1_1.py'
    sys.argv=[str(proof),'--source-checkout',str(ROOT),'--installer',str(ROOT/'ops/public/void_precision_web_install_v2.py')]
    L=runpy.run_path(str(proof),run_name='review_fixture_definitions'); M=L['M']
    M.OPERATION_SOURCE=source; M.OPERATION_RUNTIME=runtime
    active={'value':False}
    def audit(event,values):
        if active['value'] and event in ('subprocess.Popen','os.system','os.exec','os.posix_spawn','socket.bind','socket.connect'):
            raise RuntimeError('live operation forbidden in review fixture')
    sys.addaudithook(audit)
    def fixture(test):
        f=L['Fixture']('test_plan_has_no_target_or_manager_changes'); active['value']=True
        f.setUp()
        try: test(f)
        finally: f.tearDown(); active['value']=False
    def applied(f):
        record=M.plan(f.context); digest=M.sha(M.canonical(record)+b'\n')
        return record,digest,M.apply(record,f.context,f.state,digest)
    def transient(f):
        original=f.fetch; count={'n':0}
        def fetch(port,path,method='GET'):
            code,media,body=original(port,path,method)
            if path=='/__void/frontdoor/status.json':
                count['n']+=1
                if count['n']==1:
                    value=M.strict(body); value.update(ready=False,upstream_ready=False); body=M.canonical(value)
            return code,media,body
        f.replace('fetch',fetch)
        record,digest,result=applied(f)
        E.require(count['n']==2 and result['result']=='ENABLE_LINKS_OBSERVED_AT_EXACT_SAMPLE',
                  'transient canonical readiness was not retried')
        checks.append('transient_readiness_then_success')
        saved=copy.deepcopy(M.OPERATION_RUNTIME)
        try:
            M.OPERATION_RUNTIME=dict(saved,sha256='f'*64)
            E.require(M.recover(record,f.context,f.state,digest)['result']=='PARTIAL_OR_UNCERTAIN','runtime drift admitted')
            checks.append('operator_runtime_drift')
        finally: M.OPERATION_RUNTIME=saved
        path=f.target/M.NAMES[0]; path.write_bytes(b'changed installed unit\n')
        journal=Path(M.STATE)/('attempt-'+record['nonce']+'.jsonl')
        events=[M.strict(row) for row in journal.read_bytes().splitlines()]
        target=M.Directory(f.target)
        try: changed=M.entry(target,M.NAMES[0])
        finally: target.close()
        for event in events:
            if event['event']=='sampled':
                event['sample']['units'][M.NAMES[0]]=changed
                event['sample_sha256']=M.sha(M.canonical(event['sample']))
        journal.write_bytes(b''.join(M.canonical(e)+b'\n' for e in events))
        E.require(M.recover(record,f.context,f.state,digest)['result']=='CONTRADICTED_COMPLETE_QUARANTINED',
                  'rewritten sample overrode confirmed plan unit hash')
        checks.append('journal_cannot_redefine_unit_payload')
    fixture(transient)
    def malformed(f):
        original=f.fetch; count={'n':0}
        def fetch(port,path,method='GET'):
            code,media,body=original(port,path,method)
            if path=='/__void/frontdoor/status.json':
                count['n']+=1; value=M.strict(body); value['read_only']=False; body=M.canonical(value)
            return code,media,body
        f.replace('fetch',fetch); reject('wrong_read_only_is_terminal',lambda:applied(f))
        E.require(count['n']==1,'malformed readiness was retried')
    fixture(malformed)
    E.require(E.source_identity(ROOT,args.head)==source,'review proof source drift')
    print(json.dumps({'marker':'VOID_PRECISION_INSTALL_REVIEW_REGRESSIONS_V2','source_head':args.head,
        'runtime':runtime,'checks':checks,'count':len(checks),'host_execution':False,
        'independent_acceptance':False},sort_keys=True))


if __name__=='__main__': main()
