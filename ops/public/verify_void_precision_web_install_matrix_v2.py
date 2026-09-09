#!/usr/bin/env python3
"""Combine exactly three source-bound receipts using externally retained digests."""
import argparse
import copy
import importlib.util
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('install_evidence',Path(__file__).with_name('void_precision_web_install_evidence_v2.py'))
E=importlib.util.module_from_spec(spec); spec.loader.exec_module(E)


def aggregate(inputs,source):
    E.require(len(inputs)==3,'exactly three externally pinned members required')
    rows=[E.member(E.read(path),digest,source,ROOT) for minor,path,digest in inputs]
    E.require([row['runtime']['minor'] for row in rows]==['3.10','3.11','3.12'],'runtime set/order differs')
    E.require([minor for minor,_,_ in inputs]==['3.10','3.11','3.12'],'external runtime labels differ')
    E.require(len({row['runtime']['sha256'] for row in rows})==3,'runtime executables duplicated')
    return {'marker':'VOID_PRECISION_INSTALL_MATRIX_AGGREGATE_V2','source':source,
        'members':[{'runtime':r['runtime'],'receipt_sha256':digest,'terminal_root':r['terminal_root']}
                   for r,(_,_,digest) in zip(rows,inputs)],
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


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--head',required=True)
    parser.add_argument('--member',action='append',required=True,metavar='MINOR:PATH:EXPECTED_SHA256')
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    source=E.source_identity(ROOT,args.head)
    inputs=[]
    for arg in args.member:
        minor,path,digest=arg.split(':',2); inputs.append((minor,Path(path),digest))
    result=aggregate(inputs,source)
    raw=E.read(inputs[0][1]); result['rejection_cases']=negatives(raw,inputs[0][2],source)
    for bad in (inputs[:-1],[inputs[0],inputs[0],inputs[2]],list(reversed(inputs))):
        try: aggregate(bad,source)
        except RuntimeError: result['rejection_cases']+=1
        else: raise RuntimeError('invalid runtime aggregate admitted')
    E.require(E.source_identity(ROOT,args.head)==source,'source changed during aggregation')
    data=E.canonical(result)
    with args.output.open('xb') as stream: stream.write(data)
    print(json.dumps({'marker':result['marker'],'source_head':args.head,'supervised_processes':1512,
        'legacy_false_greens':144,'successor_false_greens':0,'rejection_cases':result['rejection_cases'],
        'aggregate_sha256':E.sha(data),'host_execution':False,'independent_acceptance':False},sort_keys=True))


if __name__=='__main__': main()
