#!/usr/bin/env python3
"""Admit six externally pinned members, then replay the closed seven-file artifact."""
import argparse
import copy
import importlib.util
import json
import os
from pathlib import Path
import tempfile

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('install_evidence',Path(__file__).with_name('void_precision_web_install_evidence_v2.py'))
E=importlib.util.module_from_spec(spec); spec.loader.exec_module(E)


MINORS=['3.10','3.11','3.12']
NATURAL_FILES=['python'+m.replace('.','')+'.json' for m in MINORS]
REVIEW_FILES=['python'+m.replace('.','')+'-review.json' for m in MINORS]
DAG_IDS=['control-'+name for name,_ in E.REVIEW_CONTROLS]+[
    'missing-runtime-'+m for m in MINORS]+['duplicate-runtime-'+m for m in MINORS]+[
    'mixed-head','mixed-tree','mixed-source','runtime-executable-identity','stale-control-root',
    'reordered-controls','externally-repinned-noncanonical-member','natural-review-generation',
    'production-review-identity-reuse','unexpected-seventh-member']


def natural_members(inputs,source):
    E.require(len(inputs)==3,'exactly three externally pinned members required')
    rows=[E.member(E.read(path),digest,source,ROOT) for minor,path,digest in inputs]
    E.require([row['runtime']['minor'] for row in rows]==['3.10','3.11','3.12'],'runtime set/order differs')
    E.require([minor for minor,_,_ in inputs]==['3.10','3.11','3.12'],'external runtime labels differ')
    E.require(len({row['runtime']['sha256'] for row in rows})==3,'runtime executables duplicated')
    return rows


def review_members(inputs,source,natural):
    E.require(len(inputs)==3 and [minor for minor,_,_ in inputs]==MINORS,'review runtime set/order differs')
    rows=[E.review_member(E.read(path),digest,source,ROOT) for _,path,digest in inputs]
    E.require([r['runtime'] for r in rows]==[r['runtime'] for r in natural],'natural/review runtime identity differs')
    E.require(all(r['source']==source for r in natural),'natural/review generation differs')
    return rows


def aggregate(inputs,source,review_inputs):
    rows=natural_members(inputs,source); reviews=review_members(review_inputs,source,rows)
    E.require(len({str(path.resolve()) for _,path,_ in inputs+review_inputs})==6,'member path reused')
    return {'marker':'VOID_PRECISION_INSTALL_MATRIX_AGGREGATE_V2','source':source,
        'members':[{'kind':'natural','runtime':r['runtime'],'receipt_sha256':digest,'terminal_root':r['terminal_root']}
                   for r,(_,_,digest) in zip(rows,inputs)]+[{'kind':'review','runtime':r['runtime'],'receipt_sha256':digest,
            'control_set_root':r['control_set_root'],'outcome_root':r['outcome_root']}
            for r,(_,_,digest) in zip(reviews,review_inputs)],
        'runtime_member_count':6,'nominal_review_producers':3,'review_control_outcomes':48,
        'missing_review_outcomes':0,'duplicate_review_outcomes':0,
        'unexpected_review_admissions':0,'skipped_review_outcomes':0,
        'supervised_processes':sum(row['processes'] for row in rows),
        'legacy_false_greens':sum(row['legacy_false_greens'] for row in rows),
        'successor_false_greens':0,'recovery_mutations':0,'real_systemctl_calls':0,
        'host_execution':False,'independent_acceptance':False,'installation_authorized':False}


def negatives(raw,digest,source):
    original=E.strict(raw); count=0
    def rejects(value,external=None):
        nonlocal count
        data=E.canonical(value)
        try: E.member(data,external or E.sha(data),source,ROOT)
        except (RuntimeError,ValueError,TypeError,KeyError): count+=1
        else: raise RuntimeError('forged member admitted')
    for field,value in [('processes',502),('legacy_false_greens',47),('successor_false_greens',1),
                        ('real_systemctl_calls',1),('recovery_mutations',1),('host_execution',True),
                        ('independent_acceptance',True),('marker','PR_BODY_ONLY')]:
        row=copy.deepcopy(original); row[field]=value; rejects(row)
    row=copy.deepcopy(original); row['source']['head']='f'*40; rejects(row)
    row=copy.deepcopy(original); row['preparation']['receipt_sha256']='f'*64; rejects(row)
    row=copy.deepcopy(original); row['legacy_cases']=row['legacy_cases'][:-1]; rejects(row)
    for action in ('missing','duplicate','stale','mixed-runtime','substituted-expectation'):
        row=copy.deepcopy(original)
        if action=='missing': row['cases'].pop()
        elif action=='duplicate': row['cases'][1]=row['cases'][0]
        elif action=='stale': row['cases'][0]['source_head']='f'*40
        elif action=='mixed-runtime': row['cases'][0]['runtime']['sha256']='f'*64
        else: row['cases'][0]['legacy_false_green']=False
        row['terminal_root']=E.sha(E.canonical(row['cases'])); rejects(row)
    row=copy.deepcopy(original); row['extra']='not admitted'; rejects(row)
    row=copy.deepcopy(original); row['cases'][0]['recovery_ticks']=65
    row['terminal_root']=E.sha(E.canonical(row['cases'])); rejects(row)
    row=copy.deepcopy(original)
    row['cases'][0]['terminals']['primary']['successor']={'result':'ENABLE_LINKS_OBSERVED_AT_EXACT_SAMPLE',
                                                       'current_enablement_authority':False}
    row['terminal_root']=E.sha(E.canonical(row['cases'])); rejects(row)
    row=copy.deepcopy(original); first=row['cases'][0]
    key=next(k for k in first['primary_census'] if k.endswith('unrelated.marker'))
    del first['primary_census'][key]; first['recovery_census']=copy.deepcopy(first['primary_census'])
    first['primary_census_sha256']=E.sha(E.canonical(first['primary_census']))
    first['recovery_census_sha256']=first['primary_census_sha256']
    row['terminal_root']=E.sha(E.canonical(row['cases'])); rejects(row)
    # Self-consistent forged observations must still fail the external byte pin.
    row=copy.deepcopy(original)
    first=row['cases'][0]
    first['primary_census']['.']['mtime_ns']+=1
    first['recovery_census']=copy.deepcopy(first['primary_census'])
    first['primary_census_sha256']=E.sha(E.canonical(first['primary_census']))
    first['recovery_census_sha256']=first['primary_census_sha256']
    row['terminal_root']=E.sha(E.canonical(row['cases']))
    forged=E.canonical(row)
    # Confirm internal consistency, then retain the real producer's trust input.
    E.member(forged,E.sha(forged),source,ROOT)
    rejects(row,digest)
    from unittest.mock import patch
    original_read=E.read
    for target in ('ops/public/void_precision_web_install_v2.py',E.CONTRACT,E.FIXTURE+'link-cases.json'):
        def altered(path,limit=E.LIMIT):
            data=original_read(path,limit)
            return data+b' ' if Path(path)==ROOT/target else data
        with patch.object(E,'read',altered):
            try: E.source_identity(ROOT,source['head'])
            except RuntimeError: count+=1
            else: raise RuntimeError('substituted source admitted')
    return count



def review_negatives(inputs,source,natural):
    """Exercise the same review admission edge used by aggregate, with real pins."""
    E.require(len(DAG_IDS)==32 and len(set(DAG_IDS))==32,'review rejection population differs')
    passed=[]; original=E.strict(E.read(inputs[0][1]))
    def rejects(name,values,paired=natural):
        try: review_members(values,source,paired)
        except (RuntimeError,ValueError,TypeError,KeyError,OSError): passed.append(name)
        else: raise RuntimeError('invalid review DAG admitted: '+name)
    with tempfile.TemporaryDirectory(prefix='void-review-dag-') as temp:
        path=Path(temp)/'mutated.json'
        def changed(name,row,raw=None):
            data=E.canonical(row) if raw is None else raw
            path.write_bytes(data)
            rejects(name,[(inputs[0][0],path,E.sha(data)),*inputs[1:]])
        for i,(name,_) in enumerate(E.REVIEW_CONTROLS):
            row=copy.deepcopy(original)
            if i%2: row['controls'][i]['observed']='UNEXPECTED_ADMISSION'
            else: row['controls'].pop(i)
            row['outcome_root']=E.sha(E.canonical(row['controls']))
            changed('control-'+name,row)
        for i,minor in enumerate(MINORS): rejects('missing-runtime-'+minor,inputs[:i]+inputs[i+1:])
        for i,minor in enumerate(MINORS):
            values=list(inputs); values[(i+1)%3]=values[i]
            rejects('duplicate-runtime-'+minor,values)
        for name,key in [('mixed-head','head'),('mixed-tree','tree')]:
            row=copy.deepcopy(original); row['source'][key]='f'*40; changed(name,row)
        row=copy.deepcopy(original); row['source']['members'][E.REVIEW]['sha256']='f'*64
        changed('mixed-source',row)
        row=copy.deepcopy(original); row['runtime']['sha256']='f'*64
        changed('runtime-executable-identity',row)
        row=copy.deepcopy(original); row['control_set_root']='f'*64; changed('stale-control-root',row)
        row=copy.deepcopy(original); row['controls'].reverse()
        row['outcome_root']=E.sha(E.canonical(row['controls'])); changed('reordered-controls',row)
        # Even supplying a NEW matching pin cannot make noncanonical bytes admissible.
        # This is semantic rejection, not authentication against replacement of a trusted pin.
        changed('externally-repinned-noncanonical-member',original,E.canonical(original)+b' ')
        paired=copy.deepcopy(natural); paired[0]['source']['head']='f'*40
        rejects('natural-review-generation',inputs,paired)
        row=copy.deepcopy(original); row['identities']['review_fixture']=row['identities']['production']
        changed('production-review-identity-reuse',row)
        rejects('unexpected-seventh-member',inputs+[inputs[0]])
    E.require(passed==DAG_IDS,'review rejection vector differs')
    return passed


def recovery_controls(source):
    spec=importlib.util.spec_from_file_location('portable_review_producer',ROOT/E.REVIEW)
    R=importlib.util.module_from_spec(spec); spec.loader.exec_module(R)
    runtime=E.runtime_identity(); rows=[]
    with tempfile.TemporaryDirectory(prefix='void-review-reconstruction-') as temp:
        base=Path(temp)
        for i,cut in enumerate(E.REVIEW_CUTS):
            old=base/('crashed-'+str(i)); old.mkdir(); output=old/'review.json'
            crashed=R.supervise(source,runtime,output,'reconstruction-control',cut)
            E.require(crashed['result']=='HOLD' and crashed['producer_exit']==-9,'crashed producer admitted')
            names=sorted(p.name for p in old.iterdir())
            staging=[n for n in names if n.startswith('.receipt-')]
            final='review.json' in names
            if cut in ('after_write','after_file_fsync'):
                E.require(len(staging)==1 and len(names)==1,'staging crash population differs')
                final_state='absent'
            elif cut=='after_link':
                E.require(len(staging)==1 and len(names)==2 and final,'linked crash population differs')
                try: E.read(output)
                except RuntimeError: pass
                else: raise RuntimeError('multiply linked crash output admitted')
                final_state='multiple_links_rejected'
            elif cut in ('after_unlink','after_directory_fsync'):
                E.require(names==['review.json'],'complete crash population differs')
                data=E.read(output); E.review_member(data,E.sha(data),source,ROOT,'reconstruction-control')
                # Complete bytes still cannot replace a successful producer exit.
                final_state='complete_without_successful_exit'
            else:
                E.require(not names,'pre-publication crash left output'); final_state='absent'
            retry=None
            if final:
                before={p.name:(p.read_bytes(),p.stat().st_nlink) for p in old.iterdir()}
                retry=R.supervise(source,runtime,output,'reconstruction-control')
                E.require(retry=={'result':'HOLD','ticks':1,'producer_exit':None,'control_ids':[],
                    'reason':'preexisting_destination'},'existing crash destination resumed')
                E.require(before=={p.name:(p.read_bytes(),p.stat().st_nlink) for p in old.iterdir()},
                          'existing crash evidence mutated')
            fresh=base/('reconstructed-'+str(i)); fresh.mkdir()
            recovered=R.supervise(source,runtime,fresh/'review.json','reconstruction-control')
            E.require(recovered['result']=='COMPLETE','fresh reconstruction did not complete')
            raw=E.read(fresh/'review.json'); receipt=E.review_member(raw,recovered['receipt_sha256'],source,ROOT,'reconstruction-control')
            rows.append({'cut':cut,'crash':crashed,'crash_output':final_state,
                         'same_destination':retry,'reconstruction':recovered,'receipt':receipt})
    result={'runtime':runtime,'cuts':rows,'diagnostic_producers':48,'crashes':24,'reconstructions':24,
            'partial_admissions':0,'max_ticks':max(max(r['crash']['ticks'],r['reconstruction']['ticks']) for r in rows)}
    check_recovery(result,source)
    return result


def check_recovery(report,source):
    E.require(set(report)=={'runtime','cuts','diagnostic_producers','crashes','reconstructions','partial_admissions','max_ticks'},
              'recovery report shape differs')
    E.require([r['cut'] for r in report['cuts']]==E.REVIEW_CUTS,'recovery cuts/order differ')
    ids=[n for n,_ in E.REVIEW_CONTROLS]; terminal_ticks=len(E.REVIEW_CUTS)+1
    for i,row in enumerate(report['cuts']):
        E.require(set(row)=={'cut','crash','crash_output','same_destination','reconstruction','receipt'},'recovery row shape differs')
        E.require(row['crash']=={'result':'HOLD','ticks':i+2,'producer_exit':-9,
            'control_ids':ids[:min(16,max(0,i))],'reason':'supervised_crash'},'crash observation differs')
        cut=row['cut']; state=('multiple_links_rejected' if cut=='after_link' else
            'complete_without_successful_exit' if cut in ('after_unlink','after_directory_fsync') else 'absent')
        E.require(row['crash_output']==state,'crash publication state differs')
        retry=({'result':'HOLD','ticks':1,'producer_exit':None,'control_ids':[],
                'reason':'preexisting_destination'} if state!='absent' else None)
        E.require(row['same_destination']==retry,'same destination HOLD differs')
        raw=E.canonical(row['receipt']); digest=E.sha(raw)
        receipt=E.review_member(raw,digest,source,ROOT,'reconstruction-control')
        E.require(receipt['runtime']==report['runtime'],'reconstruction runtime differs')
        E.require(row['reconstruction']=={'result':'COMPLETE','ticks':terminal_ticks,'producer_exit':0,
            'control_ids':ids,'receipt_sha256':digest},'reconstruction observation differs')
    E.require(report['diagnostic_producers']==48 and report['crashes']==24 and report['reconstructions']==24
              and report['partial_admissions']==0 and report['max_ticks']==terminal_ticks<=64,
              'reconstruction population/budget differs')


def artifact_directory(inputs,reviews,output,complete):
    directory=output.parent
    E.require(directory.is_absolute() and directory.resolve()==directory,'artifact directory must be explicit and real')
    E.require([p for _,p,_ in inputs]==[directory/n for n in NATURAL_FILES]
              and [p for _,p,_ in reviews]==[directory/n for n in REVIEW_FILES]
              and output==directory/'aggregate.json','artifact path/order differs')
    expected=set(NATURAL_FILES+REVIEW_FILES+(['aggregate.json'] if complete else []))
    E.require(set(os.listdir(directory))==expected,'unexpected, missing or preexisting artifact member')
    for name in expected: E.read(directory/name)


def replay(inputs,reviews,source,output,expected_sha):
    artifact_directory(inputs,reviews,output,True)
    data=E.read(output); E.require(E.sha(data)==expected_sha,'external aggregate digest mismatch')
    recorded=E.strict(data); expected=aggregate(inputs,source,reviews)
    E.require(set(recorded)==set(expected)|{'rejection_cases','review_dag_rejections','review_recovery','admission_guards'},
              'aggregate shape differs')
    E.require(recorded['rejection_cases']==27 and recorded['review_dag_rejections']==DAG_IDS
              and recorded['admission_guards']==GUARD_IDS,'aggregate rejection population differs')
    check_recovery(recorded['review_recovery'],source)
    E.require(recorded['review_recovery']['runtime']==expected['members'][5]['runtime'],
              'reconstruction runtime is not the admitted Python 3.12 identity')
    expected.update({k:recorded[k] for k in ('rejection_cases','review_dag_rejections','review_recovery','admission_guards')})
    E.require(recorded==expected,'aggregate/member mismatch')
    E.require(E.source_identity(ROOT,source['head'])==source,'source changed during replay')
    return recorded


GUARD_IDS=['missing-output','partial-output','noncanonical-output','preexisting-destination',
           'unexpected-artifact-file','aggregate-digest-mismatch','aggregate-member-mismatch']


def admission_guards(inputs,reviews,source,output,result):
    """Additional I/O/replay guards; separate from the exactly 32 review DAG cases."""
    passed=[]
    def reject(name,operation):
        try: operation()
        except (RuntimeError,ValueError,TypeError,KeyError,OSError): passed.append(name)
        else: raise RuntimeError('admission guard failed: '+name)
    with tempfile.TemporaryDirectory(prefix='void-review-admission-') as temp:
        base=Path(temp); path=base/'probe.json'
        reject('missing-output',lambda:E.read(path))
        valid=E.read(reviews[0][1]); path.write_bytes(valid[:len(valid)//2])
        reject('partial-output',lambda:E.review_member(E.read(path),E.sha(path.read_bytes()),source,ROOT))
        path.write_bytes(valid+b' ')
        reject('noncanonical-output',lambda:E.review_member(E.read(path),E.sha(path.read_bytes()),source,ROOT))
        before=path.read_bytes(); reject('preexisting-destination',lambda:E.publish_receipt(path,valid))
        E.require(path.read_bytes()==before,'preexisting destination changed')
        local_inputs=[]; local_reviews=[]
        for origin,target in ((inputs,local_inputs),(reviews,local_reviews)):
            for minor,member,digest in origin:
                dest=base/member.name; dest.write_bytes(E.read(member)); target.append((minor,dest,digest))
        reject('unexpected-artifact-file',lambda:artifact_directory(local_inputs,local_reviews,base/'aggregate.json',False))
        path.unlink(); data=E.canonical(result); (base/'aggregate.json').write_bytes(data)
        reject('aggregate-digest-mismatch',lambda:replay(local_inputs,local_reviews,source,base/'aggregate.json','f'*64))
        forged=copy.deepcopy(result); forged['review_control_outcomes']=47
        changed=E.canonical(forged); (base/'aggregate.json').write_bytes(changed)
        reject('aggregate-member-mismatch',lambda:replay(local_inputs,local_reviews,source,base/'aggregate.json',E.sha(changed)))
    E.require(passed==GUARD_IDS,'admission guard population differs')
    return passed


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--head',required=True)
    parser.add_argument('--member',action='append',required=True,metavar='MINOR:PATH:EXPECTED_SHA256')
    parser.add_argument('--review-member',action='append',required=True,metavar='MINOR:PATH:EXPECTED_SHA256')
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--verify-sha256',help='Replay the existing seven-file artifact against this external aggregate pin')
    args=parser.parse_args(); source=E.source_identity(ROOT,args.head)
    def parse(values):
        rows=[]
        for arg in values:
            minor,path,digest=arg.split(':',2); rows.append((minor,Path(path),digest))
        return rows
    inputs=parse(args.member); reviews=parse(args.review_member)
    if args.verify_sha256:
        result=replay(inputs,reviews,source,args.output,args.verify_sha256)
        print(json.dumps({'marker':'PORTABLE_REPAIR_CONTROL_RECEIPT_RECOVERY_GREEN','source_head':args.head,
            'aggregate_sha256':args.verify_sha256,'runtime_members':6,'artifact_files':7,
            'review_control_outcomes':48,'review_dag_rejections':32,'recovery_cuts':24,
            'max_review_ticks':result['review_recovery']['max_ticks'],'host_execution':False,
            'installation_authorized':False,'independent_acceptance':False},sort_keys=True))
        return
    artifact_directory(inputs,reviews,args.output,False)
    result=aggregate(inputs,source,reviews)
    result['rejection_cases']=negatives(E.read(inputs[0][1]),inputs[0][2],source)
    for bad in (inputs[:-1],[inputs[0],inputs[0],inputs[2]],list(reversed(inputs))):
        try: aggregate(bad,source,reviews)
        except RuntimeError: result['rejection_cases']+=1
        else: raise RuntimeError('invalid runtime aggregate admitted')
    E.require(result['rejection_cases']==27,'natural rejection population differs')
    result['review_dag_rejections']=review_negatives(reviews,source,natural_members(inputs,source))
    result['review_recovery']=recovery_controls(source)
    result['admission_guards']=GUARD_IDS
    result['admission_guards']=admission_guards(inputs,reviews,source,args.output,result)
    E.require(E.source_identity(ROOT,args.head)==source,'source changed during aggregation')
    artifact_directory(inputs,reviews,args.output,False)
    data=E.canonical(result); E.publish_receipt(args.output,data)
    artifact_directory(inputs,reviews,args.output,True)
    print(json.dumps({'marker':result['marker'],'source_head':args.head,'supervised_processes':1512,
        'legacy_false_greens':144,'successor_false_greens':0,'rejection_cases':result['rejection_cases'],
        'review_control_outcomes':48,'review_dag_rejections':32,'recovery_cuts':24,
        'aggregate_sha256':E.sha(data),'host_execution':False,'independent_acceptance':False,
        'installation_authorized':False},sort_keys=True))


if __name__=='__main__': main()
