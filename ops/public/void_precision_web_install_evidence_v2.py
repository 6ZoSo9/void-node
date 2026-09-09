#!/usr/bin/env python3
"""Exact Git-source and externally pinned receipt admission for installer fixtures.

The CI runner, /usr/bin/git, Python and supervisor are trusted. A caller-supplied
digest is a trust input, not a signature. No receipt can authorize host actions.
"""
import hashlib
import itertools
import json
import os
from pathlib import Path
import re
import secrets
import stat
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[2]
FIXTURE='scripts/fixtures/precision-web-install-v2/'
CONTRACT='ops/public/precision-web-install-v2-contract.json'
SCHEMA='ops/public/precision-web-install-v2-receipt.schema.json'
REVIEW='scripts/prove_void_precision_web_install_review_v2.py'
REVIEW_MARKER='VOID_PRECISION_INSTALL_REVIEW_MEMBER_V2'
REVIEW_CONTROLS=[
    ('replace_ref_altered_checkout','REJECTED'),
    ('bootstrap_ignores_replace_ref','ACCEPTED'),
    ('original_source_under_replace_ref','ACCEPTED'),
    ('raw_commit_identity','REJECTED'),
    ('bootstrap_raw_commit_identity','REJECTED'),
    ('raw_tree_identity','REJECTED'),
    ('bootstrap_raw_tree_identity','REJECTED'),
    ('natural_wrong_target_baseline','ACCEPTED'),
    ('v2_false_success','REJECTED'),
    ('enable_authority','REJECTED'),
    ('primary_deleted_foreign_and_unrelated','REJECTED'),
    ('receipt_deleted_protected_entry','REJECTED'),
    ('transient_readiness_then_success','ACCEPTED'),
    ('operator_runtime_drift','PARTIAL_OR_UNCERTAIN'),
    ('journal_cannot_redefine_unit_payload','CONTRADICTED_COMPLETE_QUARANTINED'),
    ('wrong_read_only_is_terminal','REJECTED')]
PUBLICATION_CUTS=['before_create','after_write','after_file_fsync','after_link',
                  'after_unlink','after_directory_fsync']
REVIEW_CUTS=['source_bound',*[name for name,_ in REVIEW_CONTROLS],
             'controls_complete',*PUBLICATION_CUTS]
PATHS=sorted([
    'ops/public/void_precision_web_install_v2.py',
    'ops/public/void_precision_web_install_evidence_v2.py',
    'ops/public/verify_void_precision_web_install_matrix_v2.py',CONTRACT,SCHEMA,
    'scripts/prove_void_precision_web_install_v2.py','scripts/precision_web_install_fixture_v2.py',
    'scripts/prove_void_precision_web_install_review_v2.py',
    FIXTURE+'void-precision-web-install-v1_1.py',FIXTURE+'prove_void_precision_web_install_v1_1.py',
    FIXTURE+'link-cases.json',FIXTURE+'recovery-cases.json',
    '.github/workflows/void-precision-web-install-v2.yml','docs/operators/void-precision-web-install-v2.md',
    'ops/public/verify_void_precision_web_preparation_v2.py',
    'ops/public/prepare_void_precision_web_recovery_v2.py',
    'public/public-node/datanet/index.json','public/void-public-frontdoor-v1/index.html'])
LIMIT=16*1024*1024


def require(value,reason):
    if not value: raise RuntimeError(reason)


def sha(data): return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value,sort_keys=True,separators=(',',':'),allow_nan=False).encode()+b'\n'


def strict(data):
    require(len(data)<=LIMIT,'JSON byte limit')
    def pairs(items):
        out={}
        for key,value in items:
            require(key not in out,'duplicate JSON member'); out[key]=value
        return out
    value=json.loads(data,object_pairs_hook=pairs,parse_constant=lambda s:require(False,'nonfinite JSON'))
    require(canonical(value)==data,'noncanonical JSON')
    return value


def read(path,limit=LIMIT):
    fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
    try:
        before=os.fstat(fd)
        require(stat.S_ISREG(before.st_mode) and before.st_nlink==1 and before.st_size<=limit,'file admission')
        chunks=bytearray()
        for _ in range(limit//65536+2):
            data=os.read(fd,min(65536,limit+1-len(chunks)))
            if not data: break
            chunks.extend(data); require(len(chunks)<=limit,'file grew beyond limit')
        else: raise RuntimeError('read-call budget')
        after=os.fstat(fd)
        fields=lambda s:(s.st_dev,s.st_ino,s.st_mode,s.st_nlink,s.st_size,s.st_mtime_ns,s.st_ctime_ns)
        require(fields(before)==fields(after) and len(chunks)==before.st_size,'file changed during read')
        return bytes(chunks)
    finally: os.close(fd)


def git(root,*args):
    p=subprocess.run(['/usr/bin/git','--no-replace-objects','-C',str(root),*args],stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=15,check=False,
        env={'PATH':'/usr/bin:/bin','HOME':str(Path.home()),'LANG':'C','GIT_CONFIG_NOSYSTEM':'1',
             'GIT_CONFIG_GLOBAL':'/dev/null','GIT_NO_REPLACE_OBJECTS':'1','GIT_TERMINAL_PROMPT':'0'})
    require(p.returncode==0 and len(p.stdout)<=LIMIT,'Git source lookup failed')
    return p.stdout


def git_object(root,kind,oid):
    data=git(root,'cat-file',kind,oid)
    require(hashlib.sha1(kind.encode()+b' '+str(len(data)).encode()+b'\0'+data).hexdigest()==oid,
            'Git raw object identity differs')
    return data


def tree_entries(root,oid):
    data=git_object(root,'tree',oid); offset=0; entries={}
    while offset<len(data):
        end=data.index(b'\0',offset); mode,name=data[offset:end].split(b' ',1)
        require(name not in entries and end+21<=len(data),'malformed source tree')
        entries[name]=(mode.decode(),data[end+1:end+21].hex()); offset=end+21
    return entries


def source_identity(root,head):
    root=Path(root).resolve()
    require(re.fullmatch('[a-f0-9]{40}',head),'explicit full source head required')
    require(git(root,'rev-parse','HEAD').decode().strip()==head,'checkout head differs')
    require(git(root,'rev-parse','--show-toplevel').decode().strip()==str(root),'checkout root differs')
    commit=git_object(root,'commit',head)
    match=re.match(rb'tree ([a-f0-9]{40})\n',commit)
    require(match is not None,'commit root tree missing')
    tree=match[1].decode(); trees={}
    rows=git(root,'ls-tree','-r','-z',head,'--',*PATHS).split(b'\0')
    identities={}
    for row in rows:
        if not row: continue
        meta,name=row.split(b'\t',1); mode,kind,blob=meta.decode().split(); name=name.decode()
        require(name in PATHS and kind=='blob' and mode in ('100644','100755'),'source tree member shape')
        oid=tree
        for index,part in enumerate(name.split('/')):
            if oid not in trees: trees[oid]=tree_entries(root,oid)
            require(part.encode() in trees[oid],'raw tree member missing')
            raw_mode,oid=trees[oid][part.encode()]
            if index<len(name.split('/'))-1: require(raw_mode=='40000','raw tree ancestor type differs')
        require((raw_mode,oid)==(mode,blob),'resolved member differs from raw source chain')
        path=root/name
        require(not any(p.is_symlink() for p in [path,*path.parents] if p!=root.parent),'source symlink')
        data=read(path)
        actual_mode='100755' if path.stat().st_mode&0o111 else '100644'
        require(actual_mode==mode and hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==blob,
                'source bytes/mode differ: '+name)
        identities[name]={'blob':blob,'mode':mode,'bytes':len(data),'sha256':sha(data)}
    require(sorted(identities)==PATHS,'source closure missing member')
    require(git(root,'rev-parse','HEAD').decode().strip()==head,'source head changed')
    contract=strict(read(root/CONTRACT))
    require(identities[FIXTURE+'void-precision-web-install-v1_1.py']['sha256']==contract['legacy_installer_sha256']
            and identities[FIXTURE+'prove_void_precision_web_install_v1_1.py']['sha256']==contract['legacy_proof_sha256'],
            'legacy control substituted')
    require(identities['ops/public/verify_void_precision_web_preparation_v2.py']['sha256']==contract['preparation']['verifier_sha256']
            and identities['ops/public/prepare_void_precision_web_recovery_v2.py']['sha256']==contract['preparation']['preparer_sha256'],
            'accepted preparation tools changed')
    return {'head':head,'tree':tree,'members':identities,'preparation':contract['preparation']}


def runtime_identity():
    path=Path(sys.executable).resolve()
    return {'executable':str(path),'version':sys.version.split()[0],
            'minor':'.'.join(map(str,sys.version_info[:2])),'sha256':sha(read(path,64*1024*1024))}


def manifests(root):
    links=strict(read(root/FIXTURE/'link-cases.json'))
    recovery=strict(read(root/FIXTURE/'recovery-cases.json'))
    expected=[{'id':f'link-{i}-{mutation}-{cut}','entry':i,'mutation':mutation,'cut':cut,
               'expected_legacy':'FALSE_ENABLED','expected_successor':'NO_ENABLE_AUTHORITY'}
        for i,mutation,cut in itertools.product(range(3),['unlink','wrong_target','regular','aba'],
            ['after_readlink','before_listeners','after_listeners','after_guard'])]
    require(links==expected,'link case population or expectations substituted')
    expected=[{'id':f'recovery-{cut}-{residue}-{termination}-{intent}','cut':cut,'residue':residue,
               'termination':termination,'intent':intent}
        for cut,residue,termination,intent in itertools.product(
            ['plan','unit_0','unit_1','unit_2','ready_0','ready_1','ready_2','link_0','link_1','link_2','reload','verified','sampled'],
            ['exact','foreign','drift'],['error','kill'],['same','different'])]
    require(recovery==expected,'recovery case population substituted')
    return links,recovery


def schema_check(value,schema):
    """Closed subset used by the committed schema; unknown keywords reject."""
    require(set(schema)<={'type','properties','required','additionalProperties','items','enum','const','$defs'},'schema keyword')
    kind=schema.get('type')
    types={'object':dict,'array':list,'string':str,'integer':int,'boolean':bool}
    if kind: require(type(value) is types[kind],'receipt schema type')
    if 'enum' in schema: require(value in schema['enum'],'receipt schema enum')
    if 'const' in schema: require(canonical(value)==canonical(schema['const']),'receipt schema constant')
    if kind=='object':
        require(set(schema.get('required',[]))<=set(value),'receipt missing field')
        if schema.get('additionalProperties') is False:
            require(set(value)<=set(schema.get('properties',{})),'receipt extra field')
        for key,child in schema.get('properties',{}).items():
            if key in value: schema_check(value[key],child)
    if kind=='array' and 'items' in schema:
        for item in value: schema_check(item,schema['items'])


def case_observations(row):
    """Closed outcomes and protected-entry facts, also checked on receipt replay."""
    primary=row['terminals']['primary'].get('successor',{})
    if row['primary_exit']==-9:
        require(primary=={},'killed primary supplied terminal')
    else:
        require(set(primary)=={'result','reason','current_enablement_authority'}
                and primary['result']=='PARTIAL_OR_UNCERTAIN'
                and isinstance(primary['reason'],str) and primary['current_enablement_authority'] is False,
                'primary terminal violates interrupted schedule')
    recovery=row['terminals']['recovery']['successor']
    expected='PARTIAL_OR_UNCERTAIN'
    if row['id'].startswith('recovery-sampled-') and row['id'].endswith('-same'):
        expected=('ALREADY_OBSERVED_AT_REVALIDATED_SAMPLE' if '-exact-' in row['id']
                  else 'CONTRADICTED_COMPLETE_QUARANTINED')
    require(recovery.get('result')==expected and recovery.get('current_enablement_authority') is False
            and set(recovery)<={'marker','result','plan_sha256','mutations','current_enablement_authority',
                               'reason','sample_sha256'},'recovery terminal violates schedule')
    if expected=='ALREADY_OBSERVED_AT_REVALIDATED_SAMPLE':
        samples=[e for e in row['journal_census']['successor'] if e['event']=='sampled']
        require(len(samples)==1 and recovery.get('sample_sha256')==samples[0]['sample_sha256'],
                'recovery terminal lacks matching durable sample')
    require(row['protected_before']==row['protected_after'] and row['protected_before'],
            'primary changed protected entries')
    for path,observed in row['protected_before'].items():
        key=str(Path(path).relative_to(row['fixture_home']))
        require(row['primary_census'].get(key)==observed,'primary census lost protected entry')
    for profile,evidence in row['mutation_evidence'].items():
        meta=row['plan_generations'][profile]
        # Census keys are relative to the common fixture home recorded by producer.
        prefix=str(Path(meta['target']).relative_to(row['fixture_home'])/'default.target.wants')
        for name,observed in evidence['protected_census'].items():
            key=prefix if name=='.' else str(Path(prefix)/name)
            require(row['primary_census'].get(key)==observed,'primary census contradicts injected residue')


def member(raw,expected_sha,source,root):
    require(re.fullmatch('[a-f0-9]{64}',expected_sha) and sha(raw)==expected_sha,'external member digest mismatch')
    data=strict(raw); schema_check(data,strict(read(root/SCHEMA)))
    contract=strict(read(root/CONTRACT)); links,recovery=manifests(root)
    require(data['source']==source and data['preparation']==contract['preparation'],'mixed source/preparation')
    require(data['runtime']['minor'] in contract['python'] and re.fullmatch('[a-f0-9]{64}',data['runtime']['sha256']),
            'runtime identity invalid')
    require(data['legacy_cases']==contract['legacy_cases'],'legacy case IDs/expectations missing')
    expected=[c['id']+'-'+term for c in links for term in ['natural','kill']]+[c['id'] for c in recovery]
    require([c['id'] for c in data['cases']]==expected,'missing/duplicate/reordered schedule')
    require(data['processes']==504 and data['legacy_false_greens']==48 and data['successor_false_greens']==0
            and data['real_systemctl_calls']==0 and data['recovery_mutations']==0,'matrix totals invalid')
    require(data['terminal_root']==sha(canonical(data['cases'])),'terminal root mismatch')
    for row in data['cases']:
        case_observations(row)
        require(row['source_head']==source['head'] and row['runtime']==data['runtime'],'mixed case generation/runtime')
        require(row['processes']==2 and 0<row['recovery_ticks']<=64 and row['recovery_mutations']==0,'case recovery bound')
        require(row['passed'] is True and row['primary_exit'] in (0,-9) and row['recovery_exit']==0,'case process status')
        if row['id'].startswith('link-'):
            require(row['mutation_observed'] is True and row['mutation_fsynced'] is True,'link mutation not supervised')
            require(row['legacy_false_green']==row['id'].endswith('-natural'),'legacy RED population missing')
            require(row['successor_false_green'] is False,'successor false green')
        require(re.fullmatch('[a-f0-9]{64}',row['primary_census_sha256']) and
                re.fullmatch('[a-f0-9]{64}',row['recovery_census_sha256']),'census root invalid')
        require(row['primary_census']==row['recovery_census'] and
                sha(canonical(row['primary_census']))==row['primary_census_sha256'] and
                sha(canonical(row['recovery_census']))==row['recovery_census_sha256'],'census bytes/root differ')
        if row['id'].startswith('recovery-sampled-'):
            require(row['sample_checks']=={'unit_identities_verified':3,'link_identities_verified':3,
                'service_identities_verified':3,'manager_mutations_verified':5},'sample not independently checked')
    return data


def review_vector():
    return [{'id':name,'expected':verdict,'observed':verdict} for name,verdict in REVIEW_CONTROLS]


def review_bindings(source,root):
    definition=strict(read(root/SCHEMA))['$defs']['review_member']
    identities=source['members']
    paths={'production':'ops/public/void_precision_web_install_v2.py',
           'supervisor':'scripts/prove_void_precision_web_install_v2.py','review_fixture':REVIEW}
    return {
        'receipt_schema':{'path':SCHEMA,'definition':'$defs/review_member',
            **identities[SCHEMA],'definition_sha256':sha(canonical(definition))},
        'identities':{role:{'path':path,**identities[path]} for role,path in paths.items()},
        'control_set_root':sha(canonical([{'id':n,'expected':v} for n,v in REVIEW_CONTROLS]))}


def review_receipt(source,runtime,controls,root,purpose='nominal'):
    require(controls==review_vector(),'review outcomes incomplete or altered')
    return {'marker':REVIEW_MARKER,'source':source,'runtime':runtime,
        **review_bindings(source,root),'purpose':purpose,'controls':controls,
        'control_count':16,'expected_outcomes_observed':16,'missing':0,'duplicates':0,
        'unexpected_admission':0,'skipped':0,'outcome_root':sha(canonical(controls)),
        'host_execution':False,'installation_authorized':False,'independent_acceptance':False}


def review_member(raw,expected_sha,source,root,purpose='nominal'):
    require(re.fullmatch('[a-f0-9]{64}',expected_sha) and sha(raw)==expected_sha,'external review digest mismatch')
    data=strict(raw)
    schema_check(data,strict(read(root/SCHEMA))['$defs']['review_member'])
    require(data['source']==source and len(source['members'])==18,'mixed review source generation')
    runtime=data['runtime']
    require(runtime['minor'] in ('3.10','3.11','3.12') and Path(runtime['executable']).is_absolute()
            and re.fullmatch(re.escape(runtime['minor'])+r'\.\d+',runtime['version'])
            and re.fullmatch('[a-f0-9]{64}',runtime['sha256']),'review runtime identity invalid')
    require(data==review_receipt(source,runtime,review_vector(),root,purpose),'review member binding differs')
    require(len({v['blob'] for v in data['identities'].values()})==3
            and len({v['sha256'] for v in data['identities'].values()})==3,'production/supervisor/review identity reuse')
    return data


def publish_receipt(output,raw,checkpoint=lambda name:None):
    """Atomic complete bytes, create-only destination; no resumption or overwrite.

    Named staging is owned by this invocation. Crashes may leave staging or a
    complete destination, neither of which supplies authority to a later run.
    Only successful producer exit plus retained external pins admits evidence.
    """
    output=Path(output)
    require(output.name not in ('','.','..') and output.parent.resolve()==output.parent,
            'receipt output parent must be an explicit real directory')
    parent=os.open(output.parent,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
    staging='.receipt-'+secrets.token_hex(16); fd=None; created=False
    try:
        require(output.name not in os.listdir(parent),'receipt destination already exists')
        checkpoint('before_create')
        fd=os.open(staging,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600,dir_fd=parent)
        created=True
        with os.fdopen(fd,'wb',closefd=False) as stream:
            stream.write(raw); stream.flush()
            checkpoint('after_write')
            os.fsync(fd); checkpoint('after_file_fsync')
        os.link(staging,output.name,src_dir_fd=parent,dst_dir_fd=parent,follow_symlinks=False)
        checkpoint('after_link')
        os.unlink(staging,dir_fd=parent); created=False
        checkpoint('after_unlink')
        os.fsync(parent); checkpoint('after_directory_fsync')
    finally:
        try:
            if fd is not None: os.close(fd)
            # Never remove a destination, including a complete one after fsync failure.
            if created: os.unlink(staging,dir_fd=parent)
        finally: os.close(parent)
