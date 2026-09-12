#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
"""Retain V45 phase objects through verification; no named control socket or keys.

The coordinator, this prestarted custodian, inherited channel and kernel are the
trusted boundary. The adversary in this bounded proof can change the evidence
namespace, not process memory, inherited descriptors or the CI log service.
No producer/candidate semantic-verification code is imported here.
"""
from __future__ import annotations
import argparse
import array
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path
import socket
import stat
import sys
import zipfile

MAX_PACKET = 128 * 1024
MAX_FDS = 200
MAX_FILE = 64 * 1024 * 1024
MAX_TOTAL = 256 * 1024 * 1024
ENV_INPUT = 'VOID_V45_CUSTODY_INPUT_FD'
ENV_CHANNEL = 'VOID_V45_CUSTODY_CHANNEL_FD'
COMMIT_MARKER = 'VOID_DATANET_V45_CUSTODY_CAPSULE_COMMITMENT_V1'
CONTEXT_KEYS = ('head', 'tree', 'node_major', 'run_id', 'run_attempt')

class CustodyHold(AssertionError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code

def require(ok: bool, code: str) -> None:
    if not ok:
        raise CustodyHold(code)

def canon(obj: object) -> bytes:
    return (json.dumps(obj, sort_keys=True, separators=(',', ':'), allow_nan=False) + '\n').encode()

def strict(raw: bytes) -> dict:
    def pairs(items):
        out = {}
        for k, v in items:
            require(k not in out, 'HOLD_V45_CUSTODY_DUPLICATE_KEY')
            out[k] = v
        return out
    value = json.loads(raw.decode('utf-8'), object_pairs_hook=pairs,
                       parse_constant=lambda _: (_ for _ in ()).throw(CustodyHold('HOLD_V45_CUSTODY_JSON_CONSTANT')))
    require(type(value) is dict, 'HOLD_V45_CUSTODY_JSON_OBJECT')
    return value

def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def identity(st: os.stat_result) -> list[int]:
    return [st.st_dev, st.st_ino, st.st_mode, st.st_nlink, st.st_uid, st.st_gid,
            st.st_size, st.st_mtime_ns, st.st_ctime_ns]

def read_fd(fd: int) -> bytes:
    before = os.fstat(fd)
    require(stat.S_ISREG(before.st_mode) and 0 <= before.st_size <= MAX_FILE,
            'HOLD_V45_CUSTODY_FILE_SHAPE')
    out = bytearray()
    while len(out) < before.st_size:
        part = os.pread(fd, min(1024 * 1024, before.st_size - len(out)), len(out))
        require(bool(part), 'HOLD_V45_CUSTODY_SHORT_READ')
        out.extend(part)
    require(not os.pread(fd, 1, len(out)) and identity(before) == identity(os.fstat(fd)),
            'HOLD_V45_CUSTODY_CHANGED_DURING_READ')
    return bytes(out)

def sealed_fd(data: bytes, label: str = 'void-v45-custody') -> int:
    require(len(data) <= MAX_FILE, 'HOLD_V45_CUSTODY_SEAL_SIZE')
    fd = os.memfd_create(label, os.MFD_CLOEXEC | os.MFD_ALLOW_SEALING)
    try:
        at = 0
        while at < len(data):
            n = os.write(fd, data[at:]); require(n > 0, 'HOLD_V45_CUSTODY_SEAL_WRITE'); at += n
        fcntl.fcntl(fd, fcntl.F_ADD_SEALS, 15)
        require(fcntl.fcntl(fd, fcntl.F_GET_SEALS) == 15, 'HOLD_V45_CUSTODY_SEALS')
        return fd
    except BaseException:
        os.close(fd); raise

def read_sealed(fd: int) -> dict:
    require(os.fstat(fd).st_nlink == 0 and fcntl.fcntl(fd, fcntl.F_GET_SEALS) == 15,
            'HOLD_V45_CUSTODY_INPUT_UNSEALED')
    return strict(read_fd(fd))

def send(sock: socket.socket, obj: dict, fds: tuple[int, ...] | list[int] = ()) -> None:
    raw = canon(obj)
    require(len(raw) <= MAX_PACKET and len(fds) <= MAX_FDS, 'HOLD_V45_CUSTODY_PACKET_SIZE')
    ancillary = [(socket.SOL_SOCKET, socket.SCM_RIGHTS, array.array('i', fds))] if fds else []
    require(sock.sendmsg([raw], ancillary) == len(raw), 'HOLD_V45_CUSTODY_SEND')

def receive(sock: socket.socket) -> tuple[dict, list[int]]:
    raw, anc, flags, _ = sock.recvmsg(MAX_PACKET, socket.CMSG_SPACE(MAX_FDS * array.array('i').itemsize), socket.MSG_CMSG_CLOEXEC)
    fds = []
    try:
        for level, kind, data in anc:
            require(level == socket.SOL_SOCKET and kind == socket.SCM_RIGHTS, 'HOLD_V45_CUSTODY_ANCILLARY')
            values = array.array('i'); values.frombytes(data[:len(data) - len(data) % values.itemsize]); fds.extend(values)
        require(not flags & (socket.MSG_TRUNC | socket.MSG_CTRUNC) and len(fds) <= MAX_FDS,
                'HOLD_V45_CUSTODY_PACKET_TRUNCATED')
        require(bool(raw), 'HOLD_V45_CUSTODY_CHANNEL_CLOSED')
        return strict(raw), fds
    except BaseException:
        for fd in fds: os.close(fd)
        raise

def checked_context(context: dict) -> None:
    require(set(context) == set(CONTEXT_KEYS), 'HOLD_V45_CUSTODY_CONTEXT_SCHEMA')
    require(all(type(context[k]) is int and context[k] > 0 for k in ('run_id', 'run_attempt')),
            'HOLD_V45_CUSTODY_RUN_IDENTITY')
    require(type(context['node_major']) is int and context['node_major'] in (0, 22, 24, 26), 'HOLD_V45_CUSTODY_NODE')
    for field in ('head', 'tree'):
        value = context[field]
        require(type(value) is str and len(value) == 40 and all(c in '0123456789abcdef' for c in value), 'HOLD_V45_CUSTODY_SOURCE_IDENTITY')

class Member:
    """An original descriptor plus its anchored terminal name, never a later trust open."""
    def __init__(self, path: str, fd: int, parent_fd: int, anchor_fd: int, *, empty: bool):
        p = Path(path)
        require(p.is_absolute() and p.name not in ('', '.', '..') and '..' not in p.parts, 'HOLD_V45_CUSTODY_PATH')
        self.path = path; self.name = p.name; self.parent_name = p.parent.name
        self.fd = fd; self.parent_fd = parent_fd; self.anchor_fd = anchor_fd
        self.initial = identity(os.fstat(fd)); self.parent_key = identity(os.fstat(parent_fd))[:2]
        self.expected = None; self.sha256 = None; self.phase = None; self.origin = 'prebound'
        require(stat.S_ISREG(self.initial[2]) and self.initial[3] == 1, 'HOLD_V45_CUSTODY_REGULAR')
        if empty:
            require(self.initial[6] == 0 and stat.S_IMODE(self.initial[2]) == 0o400,
                    'HOLD_V45_CUSTODY_NOT_EMPTY_BEFORE_WRITER')
        self.anchor()
    def anchor(self) -> None:
        visible = os.stat(self.parent_name, dir_fd=self.anchor_fd, follow_symlinks=False)
        require(stat.S_ISDIR(visible.st_mode) and identity(visible)[:2] == self.parent_key
                and identity(os.fstat(self.parent_fd))[:2] == self.parent_key, 'HOLD_V45_CUSTODY_PARENT_REPLACED')
    def read(self) -> bytes:
        self.anchor(); data = read_fd(self.fd)
        now = identity(os.fstat(self.fd))
        require(now[:6] == self.initial[:6], 'HOLD_V45_CUSTODY_ORIGINAL_OBJECT_CHANGED')
        return data
    def verify(self) -> bytes:
        data = self.read(); now = identity(os.fstat(self.fd))
        require(now == self.expected and digest(data) == self.sha256, 'HOLD_V45_CUSTODY_COMMITTED_OBJECT_CHANGED')
        require(identity(os.stat(self.name, dir_fd=self.parent_fd, follow_symlinks=False)) == now,
                'HOLD_V45_CUSTODY_FINAL_NAME_CHANGED')
        return data
    def latch(self, expected_data: bytes) -> None:
        data = self.read()
        require(data == expected_data, 'HOLD_V45_CUSTODY_PUBLICATION_BYTES_CHANGED')
        now = identity(os.fstat(self.fd))
        require(identity(os.stat(self.name, dir_fd=self.parent_fd, follow_symlinks=False)) == now,
                'HOLD_V45_CUSTODY_FINAL_NAME_CHANGED')
        self.expected = now; self.sha256 = digest(data)
    def record(self) -> dict:
        return {'identity': self.expected, 'sha256': self.sha256, 'bytes': self.expected[6],
                'phase': self.phase, 'origin': self.origin}
    def close(self):
        for fd in (self.fd, self.parent_fd, self.anchor_fd):
            try: os.close(fd)
            except OSError: pass


def bounded_files(root: Path) -> dict[str, Path]:
    require(root.is_absolute() and not root.is_symlink(), 'HOLD_V45_CUSTODY_ENUM_ROOT')
    result = {}; entries = 0
    def visit(directory: Path, depth: int):
        nonlocal entries
        with os.scandir(directory) as it:
            for item in it:
                entries += 1
                require(entries <= 160, 'HOLD_V45_CUSTODY_ENUM_LIMIT')
                require(not item.is_symlink(), 'HOLD_V45_CUSTODY_ENUM_SYMLINK')
                path = directory/item.name
                if item.is_dir(follow_symlinks=False):
                    require(depth == 0, 'HOLD_V45_CUSTODY_ENUM_DEPTH')
                    visit(path, depth+1)
                else:
                    require(item.is_file(follow_symlinks=False), 'HOLD_V45_CUSTODY_ENUM_SHAPE')
                    result[path.relative_to(root).as_posix()] = path
    visit(root,0)
    return result

class Custodian:
    def __init__(self, context: dict):
        checked_context(context); self.context = context
        self.members: dict[str, Member] = {}; self.pending = None; self.phases = []; self.serial = 0
    def current(self) -> None:
        total = 0
        for member in self.members.values():
            total += len(member.verify()); require(total <= MAX_TOTAL, 'HOLD_V45_CUSTODY_TOTAL_SIZE')
    def prepare(self, msg: dict, fds: list[int]) -> dict:
        require(self.pending is None and msg['context'] == self.context, 'HOLD_V45_CUSTODY_PHASE_ORDER')
        self.current()
        rows = msg['members']; require(type(rows) is list and 1 <= len(rows) <= 8 and len(fds) == 3 * len(rows), 'HOLD_V45_CUSTODY_PREBIND_MEMBERS')
        require(len({r['path'] for r in rows}) == len(rows), 'HOLD_V45_CUSTODY_DUPLICATE_MEMBER')
        members = []
        try:
            for i, row in enumerate(rows):
                require(set(row) == {'role', 'path'} and row['path'] not in self.members,
                        'HOLD_V45_CUSTODY_MEMBER_REUSE')
                readonly = os.open(f'/proc/self/fd/{fds[3*i]}', os.O_RDONLY | os.O_CLOEXEC)
                require(identity(os.fstat(readonly)) == identity(os.fstat(fds[3*i])), 'HOLD_V45_CUSTODY_READONLY_HANDOFF')
                os.close(fds[3*i]); fds[3*i] = readonly
                member = Member(row['path'], *fds[3*i:3*i+3], empty=True)
                member.phase = msg['phase']; members.append(member)
            self.serial += 1
            self.pending = {'serial': self.serial, 'phase': msg['phase'], 'rows': rows, 'members': members,
                            'producer': None, 'checked': None, 'expected_argv_sha256': msg['argv_sha256'],
                            'entrypoint_sha256': msg['entrypoint_sha256'], 'kind': msg['kind']}
            require(rows[-1]['role'] == 'RECEIPT', 'HOLD_V45_CUSTODY_RECEIPT_LAST')
            return {'status': 'READY', 'serial': self.serial, 'verifier_pid': os.getpid(), 'prebound_members': len(rows)}
        except BaseException:
            # The request loop owns received descriptors until PREPARE succeeds.
            self.pending = None; raise
    def producer(self, msg: dict) -> dict:
        p = self.pending
        require(p is not None and p['checked'] is None and p['producer'] is None, 'HOLD_V45_CUSTODY_PRODUCER_ORDER')
        producer = msg['producer']
        require(type(producer.get('pid')) is int and producer['pid'] > 0 and producer['pid'] != os.getpid()
                and producer.get('argv_sha256') == p['expected_argv_sha256']
                and producer.get('source_sha256') == p['entrypoint_sha256'], 'HOLD_V45_CUSTODY_PRODUCER_BINDING')
        p['producer'] = producer
        return {'status': 'BOUND', 'serial': p['serial']}
    def check(self, msg: dict) -> dict:
        p = self.pending; require(p is not None and p['checked'] is None, 'HOLD_V45_CUSTODY_CHECK_ORDER')
        self.current()
        data = [m.read() for m in p['members']]
        receipt = strict(data[-1]); body = dict(receipt); claim = body.pop('receipt_sha256', None)
        require(claim == digest(canon(body)), 'HOLD_V45_CUSTODY_RECEIPT_SEAL')
        require(all(receipt.get(k) == v for k,v in self.context.items()) and receipt.get('phase') == p['phase'],
                'HOLD_V45_CUSTODY_RECEIPT_CONTEXT')
        if p['kind'] == 'normal':
            producer = p['producer']
            require(producer is not None and receipt.get('producer') == {**producer, 'returncode': 0}
                    and receipt.get('child_returncode') == 0, 'HOLD_V45_CUSTODY_RECEIPT_PRODUCER')
            require(receipt.get('marker') == 'VOID_DATANET_V45_SOURCE_EXECUTION_V1_GREEN', 'HOLD_V45_CUSTODY_RECEIPT_KIND')
            expected = [{'role': r['role'], 'name': Path(r['path']).name, 'bytes': len(d), 'sha256': digest(d),
                         'mode': 0o400, 'created_empty_before_child': True} for r,d in zip(p['rows'][:-1],data[:-1])]
            require(receipt.get('created_output_bindings') == expected, 'HOLD_V45_CUSTODY_OUTPUT_BINDINGS')
        else:
            require(len(data) == 1 and receipt.get('child_started') is False and receipt.get('status') == 'GREEN',
                    'HOLD_V45_CUSTODY_CONTROL_RECEIPT')
        p['checked'] = data
        return {'status': 'VERIFIED', 'serial': p['serial'], 'receipt_sha256': digest(data[-1])}
    def commit(self) -> dict:
        p = self.pending; require(p is not None and p['checked'] is not None, 'HOLD_V45_CUSTODY_COMMIT_ORDER')
        self.current()
        for member, data in zip(p['members'], p['checked']): member.latch(data)
        for member in p['members']: self.members[member.path] = member
        result = {'phase': p['phase'], 'serial': p['serial'], 'producer': p['producer'],
                  'members': [m.path for m in p['members']], 'receipt_sha256': p['members'][-1].sha256}
        self.phases.append(result); self.pending = None
        return {'status': 'COMMITTED', **result}
    def adopt(self, msg: dict, fds: list[int]) -> dict:
        """Import nested runner artifacts at the supervised runner boundary, not earlier."""
        require(self.pending is None and self.phases and self.phases[-1]['phase'] == 'runner', 'HOLD_V45_CUSTODY_ADOPTION_ORDER')
        self.current(); rows = msg['members']
        require(type(rows) is list and 0 < len(rows) <= 64 and len(fds) == len(rows)*3, 'HOLD_V45_CUSTODY_ADOPTION_COUNT')
        new = []
        for i,row in enumerate(rows):
            require(row['path'] not in self.members, 'HOLD_V45_CUSTODY_MEMBER_REUSE')
            member = Member(row['path'], *fds[3*i:3*i+3], empty=False)
            member.phase = 'runner'; member.origin = 'nested_runner_boundary'
            member.latch(member.read()); new.append(member)
        for member in new: self.members[member.path] = member
        return {'status': 'ADOPTED', 'members': len(new), 'nested_producer_prebinding_proved': False}
    def lend(self) -> tuple[dict, list[int]]:
        require(self.pending is None, 'HOLD_V45_CUSTODY_LEND_DURING_WRITE'); self.current()
        rows = {}; fds = []
        for path, m in sorted(self.members.items()):
            rows[path] = {**m.record(), 'fd_index': len(fds)}; fds.append(m.fd)
        envelope = {'format': 'VOID_V45_LIVE_CUSTODY_INPUT_V1', 'context': self.context, 'members': rows,
                    'custodian_pid': os.getpid(), 'phase_count': len(self.phases)}
        meta = sealed_fd(canon(envelope))
        return {'status': 'INPUTS', 'members': len(rows)}, [meta, *fds]
    def export(self, root: str, terminal_phase: str) -> tuple[dict, int]:
        require(self.pending is None and self.phases and self.phases[-1]['phase'] == terminal_phase,
                'HOLD_V45_CUSTODY_EXPORT_ORDER')
        self.current(); base = Path(root)
        require(base.is_absolute(), 'HOLD_V45_CUSTODY_EXPORT_ROOT')
        payloads = {}
        for path,m in self.members.items():
            try: rel = Path(path).relative_to(base).as_posix()
            except ValueError: continue
            payloads[rel] = m.verify()
        actual = set(bounded_files(base))
        require(actual == set(payloads), 'HOLD_V45_CUSTODY_EXPORT_MEMBERSHIP')
        summary = {'format':'VOID_V45_CUSTODY_SESSION_SUMMARY_V1', **self.context,
                   'members': {n:{'bytes':len(d),'sha256':digest(d)} for n,d in sorted(payloads.items())},
                   'object_bindings': {str(Path(path).relative_to(base)):m.record() for path,m in self.members.items()
                                       if Path(path).is_relative_to(base)},
                   'phases': self.phases, 'supervisor_to_verifier_custody': True,
                   'nested_producer_prebinding_proved':False, 'full_campaign_accepted':False}
        payloads['datanet-v45-custody-session.json'] = canon(summary)
        out = io.BytesIO()
        with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
            for name, data in sorted(payloads.items()):
                info = zipfile.ZipInfo(name, (1980,1,1,0,0,0)); info.external_attr = (stat.S_IFREG|0o400)<<16
                info.compress_type = zipfile.ZIP_DEFLATED; z.writestr(info,data)
        self.current(); raw = out.getvalue(); fd = sealed_fd(raw,'void-v45-capsule')
        return {'status':'EXPORTED','marker':COMMIT_MARKER, **self.context,
                'capsule_sha256':digest(raw),'capsule_bytes':len(raw),'members':len(payloads)}, fd
    def close(self):
        for m in self.members.values(): m.close()
        if self.pending:
            for m in self.pending['members']: m.close()
        self.members.clear(); self.pending=None

def serve(ns) -> int:
    context = read_sealed(ns.context_fd); expected_source = context.pop('custodian_source_sha256')
    require(digest(read_fd(ns.source_fd)) == expected_source and fcntl.fcntl(ns.source_fd,fcntl.F_GET_SEALS)==15,
            'HOLD_V45_CUSTODY_SOURCE_BINDING')
    custodian = Custodian(context); sock = socket.socket(fileno=ns.channel_fd); sock.settimeout(5400)
    try:
        send(sock, {'status':'STARTED','pid':os.getpid(),'context':context})
        while True:
            msg,fds=receive(sock); transferred=False
            try:
                op=msg.get('op')
                if op=='PREPARE': result=custodian.prepare(msg,fds); transferred=True; send(sock,result)
                elif op=='PRODUCER': require(not fds,'HOLD_V45_CUSTODY_FD_COUNT');send(sock,custodian.producer(msg))
                elif op=='CHECK': require(not fds,'HOLD_V45_CUSTODY_FD_COUNT');send(sock,custodian.check(msg))
                elif op=='COMMIT': require(not fds,'HOLD_V45_CUSTODY_FD_COUNT');send(sock,custodian.commit())
                elif op=='ADOPT': result=custodian.adopt(msg,fds);transferred=True;send(sock,result)
                elif op=='LEND':
                    require(not fds,'HOLD_V45_CUSTODY_FD_COUNT'); result,borrowed=custodian.lend()
                    try: send(sock,result,borrowed)
                    finally: os.close(borrowed[0])
                elif op=='EXPORT':
                    require(not fds,'HOLD_V45_CUSTODY_FD_COUNT'); result,fd=custodian.export(msg['root'],msg['terminal_phase'])
                    try:send(sock,result,[fd])
                    finally:os.close(fd)
                elif op=='CLOSE': require(not fds,'HOLD_V45_CUSTODY_FD_COUNT');send(sock,{'status':'CLOSED'});return 0
                else:raise CustodyHold('HOLD_V45_CUSTODY_UNKNOWN_OPERATION')
            finally:
                if not transferred:
                    for fd in fds:os.close(fd)
    except (CustodyHold,OSError,ValueError,KeyError,TypeError) as exc:
        code=exc.code if isinstance(exc,CustodyHold) else 'HOLD_V45_CUSTODY_PROTOCOL_OR_IO'
        try:send(sock,{'status':'HOLD','code':code})
        except OSError:pass
        return 2
    finally:custodian.close();sock.close()

class Client:
    def __init__(self, fd: int):
        self.sock=socket.socket(fileno=os.dup(fd));self.sock.settimeout(120)
    def request(self, op: str, *, fds=(), **fields):
        send(self.sock,{'op':op,**fields},fds);msg,returned=receive(self.sock)
        if msg.get('status')=='HOLD':
            for fd in returned:os.close(fd)
            raise CustodyHold(msg.get('code','HOLD_V45_CUSTODY_REJECTED'))
        return msg,returned
    def close(self):self.sock.close()

_INPUT_CACHE=None

def input_envelope() -> dict:
    global _INPUT_CACHE
    if _INPUT_CACHE is None:
        raw=os.environ.get(ENV_INPUT)
        require(raw is not None and raw.isdecimal(),'HOLD_V45_CUSTODY_REQUIRED')
        obj=read_sealed(int(raw));require(obj.get('format')=='VOID_V45_LIVE_CUSTODY_INPUT_V1','HOLD_V45_CUSTODY_INPUT_FORMAT')
        checked_context(obj['context']);require(type(obj.get('members')) is dict,'HOLD_V45_CUSTODY_INPUT_MEMBERS')
        _INPUT_CACHE=obj
    return _INPUT_CACHE

def borrowed_open(path: Path, *, control_snapshot: bool=False) -> int:
    if control_snapshot:
        return os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW)
    row=input_envelope()['members'].get(str(path))
    require(type(row) is dict,'HOLD_V45_CUSTODY_INPUT_NOT_ADMITTED')
    fd=row.get('fd');require(type(fd) is int and fd>=3,'HOLD_V45_CUSTODY_INPUT_FD')
    require(identity(os.fstat(fd))==row['identity'],'HOLD_V45_CUSTODY_INPUT_IDENTITY')
    # Open an independent read-only file description of the retained object;
    # never reopen the evidence pathname and never share seek offsets.
    result=os.open(f'/proc/self/fd/{fd}',os.O_RDONLY|os.O_CLOEXEC)
    try:
        require(identity(os.fstat(result))==row['identity'] and digest(read_fd(result))==row['sha256'],
                'HOLD_V45_CUSTODY_INPUT_BYTES')
        require(identity(os.lstat(path))==row['identity'],'HOLD_V45_CUSTODY_INPUT_NAME')
        return result
    except BaseException:os.close(result);raise

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--channel-fd',type=int,required=True)
    p.add_argument('--context-fd',type=int,required=True);p.add_argument('--source-fd',type=int,required=True)
    try:raise SystemExit(serve(p.parse_args()))
    except (CustodyHold,OSError,ValueError,KeyError,TypeError):raise SystemExit(2)
