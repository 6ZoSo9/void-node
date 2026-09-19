#!/usr/bin/env python3
"""DRAFT operator candidate: plan, then explicitly confirm three local web units.

Independent #1373 review and exact-operation authorization are prerequisites;
this script cannot infer them from receipts, CI, or its own successful checks.
No routing, DNS, packages, node update, wallet or economic operation. Failures
retain partial state for inspection; there is no automatic stop/unlink/rollback.
OS, operator account and systemd are trusted; locking is cooperative, not a
hostile same-UID custody boundary. --plan never changes systemd state.
"""
import argparse
import fcntl
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import secrets
import signal
import socket
import stat
import subprocess
import sys
import time

HEAD = '0390ccb559e9f69bb829fe139b80539145f7ed6a'
TREE = 'c9daff6513f172a70c5d487a4571dc9e2e4b551b'
RECEIPT_SHA = '445cf0a811c5f2a781f4ba85021be9f031fa0ef105d7abca72a22c5429d49cdb'
AGGREGATE_SHA = 'e2912ee3c508c3b8346524f8591da61f54ca17793e77260186f56462c0be3738'
VERIFIER_SHA = '2d9ebf8bd124dd679f410fc15edfc6c4076ed2e1b1c7147488506040c18b8906'
BUNDLE = Path('/home/zoso/dev/void-web-recovery-v2/pr1373-0390ccb559e9')
AGGREGATE = BUNDLE.parent / (BUNDLE.name + '-aggregate.json')
VERIFIER = BUNDLE / 'source/ops/public/verify_void_precision_web_preparation_v2.py'
TARGET = Path('/home/zoso/.config/systemd/user')
STATE = BUNDLE.parent / 'installation-v1'
NAMES = ['void-web-recovery-' + n + '-v2-0390ccb559e9.service' for n in ['adapter', 'composition', 'frontdoor']]
MARKER = 'VOID_PRECISION_WEB_INSTALL_V1_1'
PROPS = ['Id','LoadState','ActiveState','SubState','FragmentPath','DropInPaths','MainPID','InvocationID']
LIMIT = 4 * 1024 * 1024


def require(value, reason):
    if not value:
        raise RuntimeError(reason)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def strict(data):
    require(len(data) <= LIMIT, 'JSON size bound')
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, 'duplicate JSON member')
            result[key] = value
        return result
    return json.loads(data, object_pairs_hook=pairs,
                      parse_constant=lambda value: require(False, 'nonfinite JSON'))


class Directory:
    """No-follow owned directory descriptor, with pathname rechecks before writes."""
    def __init__(self, path, create=False):
        self.path = Path(path)
        require(self.path.is_absolute() and '..' not in self.path.parts, 'invalid directory')
        self.fd = self.open(create)
        self.identity = self.identify(self.fd)

    @staticmethod
    def identify(fd):
        s = os.fstat(fd)
        return s.st_dev, s.st_ino, s.st_uid, stat.S_IMODE(s.st_mode)

    def open(self, create=False):
        fd = os.open('/', os.O_RDONLY | os.O_DIRECTORY)
        try:
            for part in self.path.parts[1:]:
                try:
                    child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
                except FileNotFoundError:
                    require(create, 'missing directory: ' + str(self.path))
                    os.mkdir(part, 0o700, dir_fd=fd)
                    child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
                os.close(fd); fd = child
                s = os.fstat(fd)
                require(s.st_uid in (0, os.getuid()) and not s.st_mode & 0o022,
                        'unsafe directory mode/owner: ' + str(self.path))
            require(os.fstat(fd).st_uid == os.getuid(), 'directory must belong to operator')
            result, fd = fd, None
            return result
        finally:
            if fd is not None:
                os.close(fd)

    def current(self):
        other = self.open()
        try:
            require(self.identify(other) == self.identity, 'directory generation changed')
        finally:
            os.close(other)

    @staticmethod
    def leaf(name):
        require(re.fullmatch(r'[A-Za-z0-9_.-]{1,160}', name) and name not in ('.','..'), 'invalid leaf')

    def absent(self, name):
        self.current(); self.leaf(name)
        try:
            os.stat(name, dir_fd=self.fd, follow_symlinks=False)
        except FileNotFoundError:
            return
        raise RuntimeError('destination exists: ' + name)

    def read(self, name):
        self.current(); self.leaf(name)
        fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=self.fd)
        try:
            before = os.fstat(fd)
            require(stat.S_ISREG(before.st_mode) and before.st_uid == os.getuid()
                    and before.st_nlink == 1 and stat.S_IMODE(before.st_mode) == 0o600
                    and before.st_size <= LIMIT, 'unsafe state/unit leaf')
            chunks = bytearray()
            for _ in range(66):
                data = os.read(fd, min(65536, LIMIT + 1 - len(chunks)))
                if not data: break
                chunks.extend(data)
                require(len(chunks) <= LIMIT, 'leaf grew beyond bound')
            else:
                raise RuntimeError('leaf work bound')
            after = os.fstat(fd)
            identity = lambda s: (s.st_dev,s.st_ino,s.st_uid,s.st_gid,s.st_mode,s.st_nlink,s.st_size,s.st_mtime_ns,s.st_ctime_ns)
            require(identity(before) == identity(after) and len(chunks) == before.st_size, 'leaf changed during read')
            self.current()
            return bytes(chunks)
        finally:
            os.close(fd)

    def create(self, name, data):
        require(len(data) <= LIMIT, 'publication size bound')
        self.absent(name)
        temporary = '.new-' + secrets.token_hex(12)
        fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=self.fd)
        try:
            view = memoryview(data)
            while view:
                count = os.write(fd, view)
                require(count > 0, 'write made no progress'); view = view[count:]
            os.fsync(fd)
            self.current()
            os.link(temporary, name, src_dir_fd=self.fd, dst_dir_fd=self.fd, follow_symlinks=False)
            os.fsync(self.fd)
        except BaseException:
            # Preserve the primary error. Never remove the published destination.
            try:
                os.close(fd)
                os.unlink(temporary, dir_fd=self.fd)
                os.fsync(self.fd)
            except OSError:
                pass
            raise
        else:
            os.close(fd)
            os.unlink(temporary, dir_fd=self.fd)
            os.fsync(self.fd)
        self.current()
        require(self.read(name) == data, 'publication bytes changed')

    def close(self):
        os.close(self.fd)


def command(args, timeout=30):
    env = {'PATH':'/usr/bin:/bin','LANG':'C','HOME':'/home/zoso',
           'XDG_RUNTIME_DIR':'/run/user/' + str(os.getuid()), 'SYSTEMD_PAGER':'cat'}
    p = subprocess.run(args, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                       timeout=timeout, env=env, check=False)
    require(p.returncode == 0, Path(args[0]).name + ' failed, exit ' + str(p.returncode))
    require(len(p.stdout) + len(p.stderr) <= LIMIT, 'command output bound')
    return p.stdout.decode().strip()


def status(name):
    require(name in [*NAMES, 'void-node-live.service'], 'unit outside operation')
    out = command(['/usr/bin/systemctl','--user','show',name,'--property=' + ','.join(PROPS)])
    rows = out.splitlines()
    result = dict(row.split('=',1) for row in rows if '=' in row)
    require(len(rows) == len(PROPS) and set(result) == set(PROPS) and result['Id'] == name, 'incomplete unit identity')
    return result


def node_guard():
    p = status('void-node-live.service')
    require(p['LoadState'] == 'loaded' and p['ActiveState'] == 'active' and p['SubState'] == 'running'
            and p['MainPID'].isdigit() and int(p['MainPID']) > 0
            and re.fullmatch('[a-f0-9]{32}', p['InvocationID']), 'live node unavailable')
    return p


def source(host=True):
    parent = Directory(VERIFIER.parent)
    try:
        # Source file has pinned 0644, so use its pinned bounded reader
        # only after an independent no-follow regular-file and hash admission.
        fd = os.open(VERIFIER.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent.fd)
        try:
            s = os.fstat(fd)
            require(stat.S_ISREG(s.st_mode) and s.st_uid == os.getuid() and s.st_nlink == 1
                    and stat.S_IMODE(s.st_mode) == 0o644 and s.st_size == 21259, 'unsafe verifier source')
            data = os.read(fd, 21260)
            require(len(data) == 21259 and sha(data) == VERIFIER_SHA, 'verifier digest mismatch')
            parent.current()
        finally:
            os.close(fd)
    finally:
        parent.close()
    module = {'__name__':'pinned_installer_preflight','__file__':str(VERIFIER)}
    exec(compile(data, str(VERIFIER), 'exec'), module)
    receipt = module['verify'](BUNDLE, HEAD, RECEIPT_SHA)
    aggregate = module['read_path'](AGGREGATE, LIMIT)
    require(sha(aggregate) == AGGREGATE_SHA and receipt['source_tree'] == TREE, 'host evidence generation drift')
    observation = module['observe_host'](receipt) if host else None
    units = module['units'](BUNDLE, receipt['node']['executable'], HEAD)
    require([Path(p).name for p in units] == NAMES, 'unit set/order drift')
    return {'module':module, 'receipt':receipt, 'observation':observation,
            'units':{Path(p).name:b for p,b in units.items()}}


def target_snapshot():
    # Admit existing ancestors; missing directories are only proposed in plan.
    existing = TARGET
    while not os.path.lexists(existing): existing = existing.parent
    d = Directory(existing)
    try:
        result = {'existing_ancestor':str(existing), 'identity':list(d.identity), 'target_exists':existing == TARGET}
        if existing == TARGET:
            for name in NAMES: d.absent(name)
            wants = TARGET / 'default.target.wants'
            if os.path.lexists(wants):
                w = Directory(wants)
                try:
                    for name in NAMES: w.absent(name)
                finally: w.close()
        return result
    finally: d.close()


def plan(context):
    return {'marker':MARKER,'action':'install_start_verify_enable_three_loopback_web_units',
            'head':HEAD,'tree':TREE,'receipt_sha256':RECEIPT_SHA,'aggregate_sha256':AGGREGATE_SHA,
            'installer_sha256':sha(Path(__file__).read_bytes()),'created_at':int(time.time()),
            'nonce':secrets.token_hex(16), 'target':str(TARGET),'target_snapshot':target_snapshot(),
            'units':{name:sha(data) for name,data in context['units'].items()},'live_node':node_guard(),
            'automatic_rollback':False,'funnel_changed':False,'dns_changed':False,'funds_action':False}


def fetch(port, path, method='GET'):
    require(port in (8080,8082,8083) and method in ('GET','POST') and path.startswith('/'), 'invalid probe')
    connection = http.client.HTTPConnection('127.0.0.1',port,timeout=2)
    def expired(signum, frame): raise TimeoutError('probe absolute deadline')
    old = signal.signal(signal.SIGALRM, expired); signal.setitimer(signal.ITIMER_REAL,4)
    try:
        connection.request(method,path,headers={'Connection':'close','Accept-Encoding':'identity'})
        response = connection.getresponse(); data = response.read(1048577)
        require(len(data) <= 1048576, 'probe body exceeds bound')
        return response.status, response.getheader('Content-Type',''), data
    finally:
        connection.close(); signal.setitimer(signal.ITIMER_REAL,0); signal.signal(signal.SIGALRM,old)


def probes(index, context):
    expected = context['observation']['http']
    observed = []
    def checked(port,path,expected_sha=None):
        code,media,body = fetch(port,path)
        require(code == 200 and body, 'HTTP probe failed: ' + str(port) + path)
        if expected_sha: require(sha(body) == expected_sha, 'HTTP body differs: ' + path)
        observed.append({'port':port,'path':path,'status':code,'bytes':len(body),'sha256':sha(body),'content_type':media})
        return body
    if index == 0:
        row = next(r for r in context['receipt']['manifest'] if r['path'] == 'source/public/public-node/datanet/index.json')
        checked(8080,'/public-node/datanet/index.json',row['sha256'])
    elif index == 1:
        checked(8082,'/app/')
    else:
        row = next(r for r in context['receipt']['manifest'] if r['path'] == 'source/public/void-public-frontdoor-v1/index.html')
        checked(8083,'/',row['sha256'])
        ready = strict(checked(8083,'/__void/frontdoor/status.json'))
        require(ready == {'marker':'VOID_PUBLIC_FRONTDOOR_V1','ready':True,'listener_ready':True,
            'read_only':True,'upstream_ready':True,'bind':'127.0.0.1','port':8083,'upstream':'http://127.0.0.1:8082'}, 'frontdoor is not canonical/ready/read-only')
        checked(8083,'/app/')
        for row in expected[1:]:
            if row['port'] == 4100: checked(8083,row['path'],row['sha256'])
        code,_,_ = fetch(8083,'/','POST')
        require(code == 405, 'frontdoor read-only method guard failed')
        observed.append({'port':8083,'path':'/','method':'POST','status':405})
    return observed


def listeners(count):
    rows = command(['/usr/bin/ss','-H','-ltn']).splitlines()
    selected = []
    for row in rows:
        fields = row.split()
        require(len(fields) >= 5, 'listener output malformed')
        local = fields[3]
        if local.rsplit(':',1)[-1] in ('8080','8082','8083'):
            selected.append(local)
    require(sorted(selected) == sorted(['127.0.0.1:' + str(p) for p in (8080,8082,8083)[:count]]),
            'recovery listener set/bind differs')


def confirmed_plan(state, name, digest):
    require(re.fullmatch(r'plan-[a-f0-9]{32}\.json',name), 'invalid plan filename')
    require(isinstance(digest,str) and re.fullmatch('[a-f0-9]{64}',digest), 'exact plan confirmation required')
    data=state.read(name)
    require(sha(data)==digest, 'confirmation digest mismatch')
    record=strict(data)
    require(isinstance(record,dict) and canonical(record)+b'\n'==data, 'noncanonical plan')
    require(name=='plan-'+record.get('nonce','')+'.json', 'plan filename/nonce mismatch')
    return record


def apply(record, context, state, plan_sha):
    expected = plan(context)
    require(isinstance(record,dict) and set(record) == set(expected), 'plan schema drift')
    for field in expected:
        if field not in ('nonce','created_at'): require(record[field] == expected[field], 'plan coordinate drift: ' + field)
    require(type(record['created_at']) is int and 0 <= time.time()-record['created_at'] <= 1800,
            'plan expired or future-dated')
    require(re.fullmatch('[a-f0-9]{32}',record['nonce']), 'invalid plan nonce')
    name = 'attempt-' + record['nonce'] + '.jsonl'
    state.create(name,b'')  # create-only replay refusal before any unit/service mutation
    journal = os.open(name,os.O_WRONLY | os.O_APPEND | os.O_NOFOLLOW,dir_fd=state.fd)
    def event(kind, **fields):
        state.current()
        data = canonical({'event':kind,'plan_sha256':plan_sha,**fields})+b'\n'
        require(os.write(journal,data) == len(data),'journal short write'); os.fsync(journal)
    target = wants = None
    def guard():
        state.current()
        if target: target.current()
        if wants: wants.current()
        require(node_guard() == record['live_node'], 'live node identity/state changed')
        require(context['module']['inventory'](BUNDLE)[0] == context['receipt']['manifest'], 'source bundle drift')
    def loaded(unit, active):
        require(target.read(unit) == context['units'][unit], 'installed unit bytes differ')
        p=status(unit)
        require(p['LoadState']=='loaded' and p['FragmentPath']==str(TARGET/unit)
                and not p['DropInPaths'], 'unit fragment/drop-in mismatch')
        require((p['ActiveState'],p['SubState']) == (('active','running') if active else ('inactive','dead')), 'unexpected candidate lifecycle')
        if active: require(int(p['MainPID'])>0 and re.fullmatch('[a-f0-9]{32}',p['InvocationID']), 'candidate invocation missing')
        return p
    try:
        event('claimed')
        guard()
        event('intent',action='create unit directory and three fixed unit files')
        target = Directory(TARGET,create=True)
        for unit,data in context['units'].items(): guard(); target.create(unit,data)
        event('units_published')
        guard(); event('intent',command=['systemctl','--user','daemon-reload'])
        command(['/usr/bin/systemctl','--user','daemon-reload'])
        for unit in NAMES: loaded(unit,False)
        observations=[]; invocations=[]
        for index,unit in enumerate(NAMES):
            guard(); loaded(unit,False)
            event('intent',command=['systemctl','--user','start',unit])
            command(['/usr/bin/systemctl','--user','start',unit])
            event('start_returned',unit=unit)
            deadline=time.monotonic()+15
            for _ in range(75):
                invocation=loaded(unit,True)
                try:
                    evidence=probes(index,context); break
                except (OSError,http.client.HTTPException):
                    if time.monotonic()>=deadline: raise
                    time.sleep(0.2)
            else:
                raise RuntimeError('startup probe attempt bound')
            require(loaded(unit,True) == invocation, 'candidate invocation changed during probes')
            listeners(index+1)
            invocations.append(invocation); observations.extend(evidence)
            guard(); event('unit_observed',unit=unit,invocation=invocation,probes=evidence)
        for index,unit in enumerate(NAMES):
            require(loaded(unit,True) == invocations[index], 'candidate invocation changed before enable')
        guard(); event('intent',action='create three default.target.wants links')
        wants=Directory(TARGET/'default.target.wants',create=True)
        for unit in NAMES:
            guard(); wants.absent(unit)
            os.symlink('../'+unit,unit,dir_fd=wants.fd); os.fsync(wants.fd)
        event('enable_links_published')
        guard(); event('intent',command=['systemctl','--user','daemon-reload'])
        command(['/usr/bin/systemctl','--user','daemon-reload'])
        for index,unit in enumerate(NAMES):
            require(loaded(unit,True)==invocations[index], 'candidate invocation changed during enable')
            require(os.readlink(unit,dir_fd=wants.fd)=='../'+unit,'enable link changed')
        listeners(3)
        guard(); event('complete',result='LOCAL_SERVICES_OBSERVED_PASS')
        return {'marker':MARKER,'result':'LOCAL_SERVICES_OBSERVED_PASS','plan_sha256':plan_sha,
            'head':HEAD,'units':invocations,'http':observations,'journal':str(state.path/name),
            'enabled_for_user_default_target':True,'source_changed':False,'node_service_restarted':False,
            'funnel_changed':False,'dns_changed':False,'funds_action':False,'public_reachability_proven':False}
    except Exception as error:
        try: event('hold',reason=str(error),automatic_rollback=False)
        except Exception: pass
        raise RuntimeError('PARTIAL_OR_UNCERTAIN; inspect '+str(state.path/name)+'; '+str(error)) from error
    finally:
        os.close(journal)
        if wants: wants.close()
        if target: target.close()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--plan',action='store_true')
    group.add_argument('--apply',metavar='PLAN_FILENAME')
    group.add_argument('--inspect',metavar='ATTEMPT_FILENAME')
    parser.add_argument('--confirm-sha256')
    args=parser.parse_args()
    require(socket.gethostname().lower()=='zoso-precision-tower-7810' and str(Path.home())=='/home/zoso'
            and os.getuid()!=0,'run only as zoso on Precision')
    os.umask(0o077)
    state=Directory(STATE,create=True)
    lock=os.open('lock',os.O_RDWR|os.O_CREAT|os.O_NOFOLLOW|os.O_NONBLOCK,0o600,dir_fd=state.fd)
    try:
        s=os.fstat(lock)
        require(stat.S_ISREG(s.st_mode) and s.st_uid==os.getuid() and s.st_nlink==1
                and stat.S_IMODE(s.st_mode)==0o600,'unsafe lock')
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        if args.inspect:
            require(re.fullmatch(r'attempt-[a-f0-9]{32}\.jsonl',args.inspect),'invalid attempt filename')
            events=[strict(line) for line in state.read(args.inspect).splitlines()]
            print(canonical({'marker':MARKER,'result':'OBSERVATIONS_ONLY','events':events,
                             'services':[status(n) for n in ['void-node-live.service',*NAMES]]}).decode())
            return
        context=source(host=True)
        if args.plan:
            require(args.confirm_sha256 is None,'confirmation is for apply only')
            record=plan(context); data=canonical(record)+b'\n'
            name='plan-'+record['nonce']+'.json'; state.create(name,data)
            print(canonical({'marker':MARKER,'result':'INSTALLATION_PLAN_ONLY','plan':record,
                'plan_file':str(state.path/name),'plan_sha256':sha(data),'service_changed':False,
                'independent_acceptance_inferred':False}).decode())
        else:
            record=confirmed_plan(state,args.apply,args.confirm_sha256)
            print(canonical(apply(record,context,state,args.confirm_sha256)).decode())
    finally:
        os.close(lock); state.close()


if __name__=='__main__':
    try: main()
    except Exception as error:
        print(canonical({'marker':MARKER,'result':'HOLD','reason':str(error),
            'automatic_rollback':False,'funnel_changed':False,'dns_changed':False,'funds_action':False}).decode())
        raise SystemExit(2)
