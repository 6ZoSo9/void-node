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
import contextlib
import fcntl
import hashlib
import io
import json
import os
import re
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
INHERITED_STATIC_ENTRYPOINTS = {
    'v41-static': 'scripts/prove_datanet_v41_static_gate_v1.py',
    'v42-static': 'scripts/prove_datanet_v42_fsverity_clean_remount_v1.py',
    'v43-static': 'scripts/prove_datanet_v43_fsverity_sudden_loss_recovery_v1.py',
    'v44-static': 'scripts/prove_datanet_v44_fsverity_raw_corruption_detection_v1.py',
}
SELFTEST_ENTRYPOINT = 'scripts/prove_datanet_v45_custody_integration_v1.py'
RETAINED_STATIC_POLICY = 'OWNED_TREE_RETAINED_SNAPSHOT_SINGLE_EXEC_V1'
SELFTEST_POLICY = 'OWNED_ROOT_SELFTEST_SUBREAPER_V1'
SELFTEST_EXEC_OBSERVATION = 'PTRACE_OWNED_ROOT_SELFTEST_WITH_SUBREAPER_RETIREMENT_V1'
RUNNER_SOURCE_PROFILE = 'sealed-stdin-runner'
RUNNER_POLICY = 'OWNED_ROOT_PRIVILEGED_RUNNER_SUBREAPER_V1'
RUNNER_EXEC_OBSERVATION = 'PTRACE_OWNED_ROOT_RUNNER_WITH_SUBREAPER_RETIREMENT_V1'
RUNNER_TIMEOUT_MAX_MS = 4320000

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


ENV_HELPERS = 'VOID_V45_READONLY_HELPERS_FD'
HELPER_POLICY = 'OWNED_TREE_READONLY_HELPERS_V1'
HELPER_PLAN_FORMAT = 'VOID_V45_READONLY_HELPER_PLAN_V1'


def helper_requests(phase: str, root: str) -> list[list[str]]:
    """Closed, source-bound helper surface; no caller-defined command allowlist."""
    queries = [['git', 'rev-parse', 'HEAD'], ['git', 'rev-parse', 'HEAD^{tree}'],
               ['git', 'ls-tree', '-r', '--full-tree', 'HEAD']]
    control = ['git','rev-parse','HEAD:fixtures/datanet-v45-v43-v44-full-stack-evidence-composition-ext4-v1.json']
    if phase == 'v45-static':
        return [control, *queries, ['bash', '-n', str(Path(root)/'scripts/run_datanet_v45_full_stack_ext4_v1.sh')]]
    if phase == 'runtime':
        return [control, ['node', '--version'], *queries]
    return []


def executable_digest(fd: int) -> str:
    """Stream hash of a retained executable, bounded separately from evidence."""
    before = os.fstat(fd)
    require(stat.S_ISREG(before.st_mode) and 0 < before.st_size <= 256*1024*1024
            and not before.st_mode & 0o6000, 'HOLD_V45_HELPER_EXECUTABLE_SHAPE')
    h = hashlib.sha256(); offset = 0
    while offset < before.st_size:
        data = os.pread(fd, min(1024*1024, before.st_size-offset), offset)
        require(bool(data), 'HOLD_V45_HELPER_EXECUTABLE_READ'); h.update(data); offset += len(data)
    require(not os.pread(fd, 1, offset) and identity(before) == identity(os.fstat(fd)),
            'HOLD_V45_HELPER_EXECUTABLE_CHANGED')
    return h.hexdigest()


class ReadOnlyHelperPlan:
    """Custodian-created per-phase command plan, retained before producer launch.

    Admits five exact read-only requests, once each and in source-defined order.
    Tool identity is the locally retained executable object, not a path label.
    Bash receives a sealed copy of the admitted syntax input. This is not a
    general launcher, an environment sandbox, or full executable dependency proof.
    """
    def __init__(self, phase: str, environment: dict, cwd_fd: int):
        import shutil
        self.rows = []; self.fds = []; self.map_fd = None
        self.phase = phase; self.cwd_key = identity(os.fstat(cwd_fd))[:2]
        root = environment.get('VOID_V45_SOURCE_ROOT')
        require(type(root) is str and Path(root).is_absolute()
                and identity(os.stat(root))[:2] == self.cwd_key, 'HOLD_V45_HELPER_ROOT')
        requests = helper_requests(phase, root)
        require(len(requests) == 5, 'HOLD_V45_HELPER_PHASE')
        try:
            executables = {}
            for index, request in enumerate(requests):
                name = request[0]
                if name not in executables:
                    found = shutil.which(name, path=environment.get('PATH', os.defpath))
                    require(found is not None, 'HOLD_V45_HELPER_EXECUTABLE_MISSING')
                    resolved = Path(found).resolve()
                    fd = os.open(resolved, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
                    self.fds.append(fd)
                    executables[name] = (fd, identity(os.fstat(fd)), executable_digest(fd))
                fd, key, sha = executables[name]
                args = [f'/proc/self/fd/{fd}', *request[1:]]
                inputs = []
                pass_fds = [fd]
                if name == 'bash':
                    syntax_fd = os.open(request[2], os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
                    try: syntax = read_fd(syntax_fd)
                    finally: os.close(syntax_fd)
                    sealed = sealed_fd(syntax, 'void-v45-bash-syntax-source')
                    self.fds.append(sealed); pass_fds.append(sealed)
                    args[2] = f'/proc/self/fd/{sealed}'
                    inputs = [{'fd': sealed, 'sha256': digest(syntax), 'bytes': len(syntax), 'seals': 15,
                               'identity': identity(os.fstat(sealed))}]
                self.rows.append({'index': index, 'requested_argv': request, 'executed_argv': args,
                    'executable_fd': fd, 'executable_identity': key, 'executable_sha256': sha,
                    'input_bindings': inputs, 'pass_fds': pass_fds})
            self.map_fd = sealed_fd(canon({'format': HELPER_PLAN_FORMAT, 'phase': phase, 'rows': self.rows}),
                                    'void-v45-readonly-helpers')
            self.fds.append(self.map_fd)
        except BaseException:
            self.close(); raise

    def stable(self) -> None:
        for row in self.rows:
            require(identity(os.fstat(row['executable_fd'])) == row['executable_identity']
                    and executable_digest(row['executable_fd']) == row['executable_sha256'],
                    'HOLD_V45_HELPER_EXECUTABLE_CHANGED')
            for item in row['input_bindings']:
                require(fcntl.fcntl(item['fd'], fcntl.F_GET_SEALS) == 15
                        and identity(os.fstat(item['fd'])) == item['identity']
                        and digest(read_fd(item['fd'])) == item['sha256'], 'HOLD_V45_HELPER_INPUT_CHANGED')

    def close(self):
        for fd in self.fds:
            try: os.close(fd)
            except OSError: pass
        self.fds.clear()


def run_bound_helper(argv: list[str], **kwargs):
    """Use only the custodian's sealed execution plan in an observed helper phase."""
    import subprocess
    raw = os.environ.get(ENV_HELPERS)
    if raw is None:
        return subprocess.run(argv, **kwargs)
    require(raw.isdecimal() and int(raw) >= 3, 'HOLD_V45_HELPER_MAP_FD')
    plan = read_sealed(int(raw))
    require(plan.get('format') == HELPER_PLAN_FORMAT
            and plan.get('phase') == os.environ.get('VOID_V45_SOURCE_EXECUTION_PHASE'),
            'HOLD_V45_HELPER_MAP_CONTEXT')
    matches = [row for row in plan['rows'] if row['requested_argv'] == argv]
    require(len(matches) == 1 and not ({'executable','shell','env','cwd','pass_fds','preexec_fn'} & set(kwargs)),
            'HOLD_V45_HELPER_REQUEST')
    row = matches[0]
    env = dict(os.environ)
    # Read-only Git queries must not depend on user/system Git configuration.
    if argv[0] == 'git':
        env.update(GIT_CONFIG_NOSYSTEM='1', GIT_CONFIG_GLOBAL='/dev/null',
                   GIT_CONFIG_SYSTEM='/dev/null', GIT_OPTIONAL_LOCKS='0')
    return subprocess.run(row['executed_argv'], pass_fds=tuple(row['pass_fds']), env=env, **kwargs)


class Custodian:
    def __init__(self, context: dict, *, capture_resources=False, resource_limits=None):
        require(type(capture_resources) is bool, 'HOLD_V45_RESOURCE_CAPTURE_OPTION')
        # Local/coordinator launch setting, never caller-controlled RPC fields.
        self.capture_resources = capture_resources
        self.resource_limits = None if resource_limits is None else dict(resource_limits)
        if self.resource_limits is not None:
            require(capture_resources, 'HOLD_V45_RESOURCE_CAPTURE_OPTION')
            OwnedSyscallLedger(self.resource_limits)
        checked_context(context); self.context = context
        self.members: dict[str, Member] = {}; self.pending = None; self.phases = []; self.serial = 0
    def current(self) -> None:
        total = 0
        for member in self.members.values():
            total += len(member.verify()); require(total <= MAX_TOTAL, 'HOLD_V45_CUSTODY_TOTAL_SIZE')
    def prepare(self, msg: dict, fds: list[int]) -> dict:
        require(set(msg) == {'op','context','phase','members','kind','argv_sha256','entrypoint_sha256'}
                and msg['op'] == 'PREPARE' and msg['kind'] in ('normal','control')
                and type(msg['phase']) is str and 0 < len(msg['phase']) <= 80
                and all(type(msg[k]) is str and re.fullmatch(r'[0-9a-f]{64}', msg[k])
                        for k in ('argv_sha256','entrypoint_sha256')), 'HOLD_V45_CUSTODY_PREPARE_SCHEMA')
        require(self.pending is None and msg['context'] == self.context, 'HOLD_V45_CUSTODY_PHASE_ORDER')
        self.current()
        rows = msg['members']; require(type(rows) is list and 1 <= len(rows) <= 8 and len(fds) == 3 * len(rows), 'HOLD_V45_CUSTODY_PREBIND_MEMBERS')
        require(all(type(r) is dict and set(r) == {'role','path'} and type(r['path']) is str
                    and type(r['role']) is str and re.fullmatch(r'[A-Z][A-Z0-9_]*',r['role'])
                    for r in rows), 'HOLD_V45_CUSTODY_PREPARE_ROW')
        require(len({r['path'] for r in rows}) == len(rows)
                and len({r['role'] for r in rows}) == len(rows), 'HOLD_V45_CUSTODY_DUPLICATE_MEMBER')
        require(msg['kind'] != 'control' or (len(rows) == 1 and rows[0]['role'] == 'RECEIPT'),
                'HOLD_V45_CUSTODY_CONTROL_SHAPE')
        members = []; sinks = {}
        try:
            for i, row in enumerate(rows):
                require(set(row) == {'role', 'path'} and row['path'] not in self.members,
                        'HOLD_V45_CUSTODY_MEMBER_REUSE')
                if msg['kind'] == 'normal' and row['role'] != 'RECEIPT':
                    require((fcntl.fcntl(fds[3*i], fcntl.F_GETFL) & os.O_ACCMODE) == os.O_RDWR,
                            'HOLD_V45_CUSTODY_SINK_ACCESS')
                    sinks[row['role']] = os.dup(fds[3*i])
                readonly = os.open(f'/proc/self/fd/{fds[3*i]}', os.O_RDONLY | os.O_CLOEXEC)
                require(identity(os.fstat(readonly)) == identity(os.fstat(fds[3*i])), 'HOLD_V45_CUSTODY_READONLY_HANDOFF')
                os.close(fds[3*i]); fds[3*i] = readonly
                member = Member(row['path'], *fds[3*i:3*i+3], empty=True)
                member.phase = msg['phase']; members.append(member)
            self.serial += 1
            self.pending = {'serial': self.serial, 'phase': msg['phase'], 'rows': rows, 'members': members,
                            'producer': None, 'checked': None, 'expected_argv_sha256': msg['argv_sha256'],
                            'entrypoint_sha256': msg['entrypoint_sha256'], 'kind': msg['kind'],
                            'sinks': sinks, 'observation': None, 'observed_payloads': None}
            require(rows[-1]['role'] == 'RECEIPT', 'HOLD_V45_CUSTODY_RECEIPT_LAST')
            return {'status': 'READY', 'serial': self.serial, 'verifier_pid': os.getpid(), 'prebound_members': len(rows)}
        except BaseException:
            # The request loop owns received descriptors until PREPARE succeeds.
            for fd in sinks.values(): os.close(fd)
            self.pending = None; raise
    def producer(self, msg: dict) -> dict:
        # Legacy self-reported identities can never authorize CHECK or COMMIT.
        raise CustodyHold('HOLD_V45_CUSTODY_CALLER_PRODUCER_FORBIDDEN')

    def launch(self, msg: dict, fds: list[int]) -> tuple[dict, int]:
        """Own a direct Python producer. Wrapper/runner profiles have no fallback.

        Source admission/phase choice is still a trusted-coordinator decision;
        execution, output pipes, child retirement, and captured bytes are observed
        here. A reported PID or a submitted observation is never an input.
        """
        p = self.pending
        require(p is not None and p['kind'] == 'normal' and p['producer'] is None
                and p['checked'] is None, 'HOLD_V45_CUSTODY_LAUNCH_ORDER')
        launch_keys = {'op', 'argv_tail', 'environment', 'timeout_ms', 'stdout_role'}
        allowed_key_sets = (launch_keys, launch_keys | {'source_profile'},
                            launch_keys | {'stderr_role'}, launch_keys | {'source_profile','stderr_role'})
        require(set(msg) in allowed_key_sets and msg['op'] == 'LAUNCH',
                'HOLD_V45_CUSTODY_LAUNCH_SCHEMA')
        source_profile = msg.get('source_profile', 'sealed-copy')
        require(source_profile in ('sealed-copy', 'retained-static', 'retained-selftest', RUNNER_SOURCE_PROFILE),
                'HOLD_V45_CUSTODY_LAUNCH_SOURCE_PROFILE')
        expected_profile = ('retained-static' if p['phase'] in INHERITED_STATIC_ENTRYPOINTS
                            else 'retained-selftest' if p['phase'] == 'custody-selftest'
                            else RUNNER_SOURCE_PROFILE if p['phase'] == 'runner'
                            else 'sealed-copy')
        require(source_profile == expected_profile, 'HOLD_V45_CUSTODY_LAUNCH_SOURCE_PROFILE')
        if source_profile in ('sealed-copy', RUNNER_SOURCE_PROFILE):
            require(len(fds) == 2, 'HOLD_V45_CUSTODY_LAUNCH_SCHEMA')
            source_fd, cwd_fd = fds
            require(fcntl.fcntl(source_fd, fcntl.F_GET_SEALS) == 15,
                    'HOLD_V45_CUSTODY_LAUNCH_SOURCE')
            require((source_profile == RUNNER_SOURCE_PROFILE) == (p['phase'] == 'runner'),
                    'HOLD_V45_CUSTODY_LAUNCH_SOURCE_PROFILE')
        else:
            require(len(fds) == 3 and (p['phase'] in INHERITED_STATIC_ENTRYPOINTS
                                      or p['phase'] == 'custody-selftest'),
                    'HOLD_V45_CUSTODY_LAUNCH_SCHEMA')
            source_fd, parent_fd, cwd_fd = fds
            rel = (INHERITED_STATIC_ENTRYPOINTS[p['phase']]
                   if p['phase'] in INHERITED_STATIC_ENTRYPOINTS else SELFTEST_ENTRYPOINT)
            parts = Path(rel).parts
            source_stat = os.fstat(source_fd)
            parent_stat = os.fstat(parent_fd)
            cwd_stat = os.fstat(cwd_fd)
            require(len(parts) == 2 and parts[0] == 'scripts'
                    and stat.S_ISREG(source_stat.st_mode) and source_stat.st_nlink == 1
                    and (fcntl.fcntl(source_fd, fcntl.F_GETFL) & os.O_ACCMODE) == os.O_RDONLY
                    and stat.S_ISDIR(parent_stat.st_mode) and stat.S_ISDIR(cwd_stat.st_mode),
                    'HOLD_V45_CUSTODY_RETAINED_SOURCE_SHAPE')
            require(identity(os.stat('scripts', dir_fd=cwd_fd, follow_symlinks=False)) == identity(parent_stat)
                    and identity(os.stat(parts[1], dir_fd=parent_fd, follow_symlinks=False)) == identity(source_stat),
                    'HOLD_V45_CUSTODY_RETAINED_SOURCE_BINDING')
        require(digest(read_fd(source_fd)) == p['entrypoint_sha256'],
                'HOLD_V45_CUSTODY_LAUNCH_SOURCE')
        require(stat.S_ISDIR(os.fstat(cwd_fd).st_mode), 'HOLD_V45_CUSTODY_LAUNCH_CWD')
        tail = msg['argv_tail']
        require(type(tail) is list and all(type(a) is str for a in tail), 'HOLD_V45_CUSTODY_LAUNCH_ARGV')
        runner_profile = source_profile == RUNNER_SOURCE_PROFILE
        template = tail if runner_profile else ['python3', '-I', '-S', '-B', '@ENTRYPOINT@', *tail]
        require(digest(canon({'argv': template})) == p['expected_argv_sha256'],
                'HOLD_V45_CUSTODY_LAUNCH_ARGV')
        roles = {r['role']: r['path'] for r in p['rows'][:-1]}
        stderr_role = msg.get('stderr_role')
        require(msg['stdout_role'] is None or msg['stdout_role'] in roles,
                'HOLD_V45_CUSTODY_LAUNCH_STDOUT')
        require(stderr_role is None or stderr_role in roles,
                'HOLD_V45_CUSTODY_LAUNCH_STDERR')
        require(msg['stdout_role'] != stderr_role or msg['stdout_role'] is None,
                'HOLD_V45_CUSTODY_LAUNCH_STREAM_ROLES')
        environment = msg['environment']
        allowed = {'PATH', 'LANG', 'LC_ALL', 'GIT_DIR', 'GIT_WORK_TREE', 'RUNNER_TEMP',
                   'VOID_V45_SOURCE_ROOT', 'VOID_V45_SOURCE_INVENTORY_SHA256',
                   'VOID_V45_SOURCE_EXECUTION_PHASE', 'VOID_V45_RUN_ID', 'VOID_V45_RUN_ATTEMPT'}
        require(type(environment) is dict and set(environment) <= allowed
                and all(type(v) is str and '\0' not in v and len(v) <= 16384 for v in environment.values()),
                'HOLD_V45_CUSTODY_LAUNCH_ENV')
        timeout_max = RUNNER_TIMEOUT_MAX_MS if runner_profile else 600000
        require(type(msg['timeout_ms']) is int and 100 <= msg['timeout_ms'] <= timeout_max,
                'HOLD_V45_CUSTODY_LAUNCH_LIMIT')
        self.current()
        if runner_profile:
            owner = ObservedRunnerProducer()
            observation = owner.run({'context': self.context, 'phase': p['phase'],
                    'source_sha256': p['entrypoint_sha256'], 'argv': template,
                    'timeout_ms': msg['timeout_ms'], 'max_output_bytes': MAX_TOTAL,
                    'wrapper_paths':['/usr/bin/sudo','/usr/bin/strace','/usr/bin/env','/usr/bin/bash']}, source_fd,
                phase_io={'output_paths': roles, 'stdout_role': msg['stdout_role'],
                          'stderr_role': stderr_role, 'env': dict(environment), 'cwd_fd': cwd_fd})
            payloads = owner.take()
        else:
            # Lend the custodian's own original read-only descriptions, not the
            # caller's numeric FD map. Create a sealed map in this process's namespace.
            envelope = {'format': 'VOID_V45_LIVE_CUSTODY_INPUT_V1', 'context': self.context,
                        'members': {path: {**m.record(), 'fd': m.fd} for path,m in self.members.items()},
                        'custodian_pid': os.getpid(), 'phase_count': len(self.phases)}
            input_fd = sealed_fd(canon(envelope))
            helper_plan = None
            try:
                environment = dict(environment)
                environment.update(VOID_V45_CUSTODY_INPUT_FD=str(input_fd), PYTHONDONTWRITEBYTECODE='1')
                # The existing trusted CI service supplies its token to the daemon;
                # it is never accepted over this protocol or recorded in receipts.
                if p['phase'] == 'cross-runtime-aggregate' and 'GITHUB_TOKEN' in os.environ:
                    environment['GITHUB_TOKEN'] = os.environ['GITHUB_TOKEN']
                if p['phase'] in ('v45-static', 'runtime'):
                    helper_plan = ReadOnlyHelperPlan(p['phase'], environment, cwd_fd)
                owner = ObservedStreamProducer()
                observation = owner.run({'context': self.context, 'phase': p['phase'],
                        'source_sha256': p['entrypoint_sha256'], 'argv_tail': tail,
                        'timeout_ms': msg['timeout_ms'], 'max_output_bytes': MAX_TOTAL}, source_fd,
                    inherited_fds=(input_fd, *tuple(m.fd for m in self.members.values())),
                    phase_io={'output_paths': roles, 'stdout_role': msg['stdout_role'],
                              'env': environment, 'cwd_fd': cwd_fd}, helper_plan=helper_plan,
                    **({'resource_capture': True, 'resource_limits': self.resource_limits}
                       if self.capture_resources else {}))
                payloads = owner.take()
            finally:
                os.close(input_fd)
                if helper_plan is not None: helper_plan.close()
        require(all(observation.get(k) is True for k in (
                    'producer_identity_independently_verified', 'producer_exec_observed',
                    'producer_output_capability_coupled', 'producer_subtree_retired',
                    'producer_exec_lifetime_verified', 'output_streams_retired', 'cleanup_complete')), 'HOLD_V45_CUSTODY_OBSERVATION_INCOMPLETE')
        expected = {role: payloads[observation['role_streams'][role]] for role in roles}
        require(all(len(data) <= MAX_FILE for data in expected.values()), 'HOLD_V45_CUSTODY_OUTPUT_SIZE')
        # Do not populate even provisional regular outputs until every writer
        # has retired. The private sink is never in the producer's inherited set.
        for role, data in expected.items():
            fd = p['sinks'][role]
            require(os.fstat(fd).st_size == 0, 'HOLD_V45_CUSTODY_SINK_PREWRITTEN')
            offset = 0
            while offset < len(data):
                n = os.write(fd, data[offset:]); require(n > 0, 'HOLD_V45_CUSTODY_SINK_WRITE'); offset += n
            os.fsync(fd)
        for fd in p['sinks'].values(): os.close(fd)
        p['sinks'].clear()
        p['producer'] = {'pid': observation['producer']['pid'],
                         'argv_sha256': observation['argv_sha256'],
                         'source_sha256': observation['source_sha256']}
        p['observation'] = observation
        p['observed_payloads'] = expected
        stdout_fd = sealed_fd(payloads['stdout'], 'void-v45-observed-stdout')
        return {'status': 'EXECUTED', 'serial': p['serial'], 'producer': p['producer'],
                'observation': observation, 'stdout_bytes': len(payloads['stdout']),
                'stdout_sha256': digest(payloads['stdout'])}, stdout_fd

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
            require(p['observation'] is not None and receipt.get('producer_observation') == p['observation'],
                    'HOLD_V45_CUSTODY_RECEIPT_OBSERVATION')
            require(all(data[i] == p['observed_payloads'][row['role']]
                        for i, row in enumerate(p['rows'][:-1])), 'HOLD_V45_CUSTODY_UNOBSERVED_OUTPUT')
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
        require(p['kind'] != 'normal' or (p['observation'] is not None and p['observed_payloads'] is not None),
                'HOLD_V45_CUSTODY_COMMIT_WITHOUT_OBSERVATION')
        for member, data in zip(p['members'], p['checked']): member.latch(data)
        for member in p['members']: self.members[member.path] = member
        result = {'phase': p['phase'], 'serial': p['serial'], 'producer': p['producer'],
                  'producer_observation': p['observation'],
                  'supervisor_reported_producer_metadata': None,
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
            for fd in self.pending.get('sinks', {}).values(): os.close(fd)
            for m in self.pending['members']: m.close()
        self.members.clear(); self.pending=None

# Direct V45 Python phase execution is wired through LAUNCH.
# Runner/nested-source profiles and full-workflow accounting remain unsupported.
class OwnedSyscallLedger:
    """Bounded, read-only syscall telemetry for an already owned trace tree.

    This is not a second tracer: the existing owner supplies its kernel stops.
    Only PTRACE_GET_SYSCALL_INFO is used; no process memory/register reads or
    writes, arbitrary attachment, or syscall modification. Capture starts at
    the initial admitted exec stop. Observer/setup/cleanup and unrelated stream
    holders are excluded. FD observations are samples, never exact global peaks.
    """
    FORMAT = 'VOID_V45_OWNED_SYSCALL_LEDGER_V1'
    ARCH = 0xc000003e  # Linux AUDIT_ARCH_X86_64. Other ABIs fail closed.
    DEFAULT_LIMITS = {'syscall_stops': 200000, 'tasks': 64,
                      'fd_sample': 4096, 'returned_io_bytes': 1073741824}
    READ_CALLS = frozenset((0, 17, 19, 45, 47, 295, 327))
    WRITE_CALLS = frozenset((1, 18, 20, 44, 46, 296, 328))
    # Counts for these are visible in the histogram; transferred descriptor
    # counts inside sendmsg/recvmsg are NOT inferred from payload byte counts.
    RELEVANT = {0:'read',1:'write',2:'open',3:'close',17:'pread64',18:'pwrite64',
                19:'readv',20:'writev',22:'pipe',32:'dup',33:'dup2',41:'socket',
                43:'accept',44:'sendto',45:'recvfrom',46:'sendmsg',47:'recvmsg',
                53:'socketpair',56:'clone',57:'fork',58:'vfork',59:'execve',
                60:'exit',72:'fcntl',231:'exit_group',257:'openat',288:'accept4',
                292:'dup3',293:'pipe2',295:'preadv',296:'pwritev',299:'recvmmsg',
                307:'sendmmsg',319:'memfd_create',322:'execveat',327:'preadv2',
                328:'pwritev2',434:'pidfd_open',435:'clone3',436:'close_range',
                437:'openat2',438:'pidfd_getfd'}

    def __init__(self, limits=None):
        import time
        self.limits = dict(self.DEFAULT_LIMITS if limits is None else limits)
        require(set(self.limits) == set(self.DEFAULT_LIMITS)
                and all(type(v) is int and 1 <= v <= self.DEFAULT_LIMITS[k]
                        for k,v in self.limits.items()), 'HOLD_V45_RESOURCE_LIMIT_SCHEMA')
        self.started_ns = time.monotonic_ns()
        self.tasks = {}
        self.stops = 0
        self.returned_io = 0
        self.event_peak = 0
        self.current = 0
        self.failure = None
        self._hash = hashlib.sha256()
        self.sequence = 0

    def event(self, kind, **fields):
        self.sequence += 1
        self._hash.update(canon({'sequence':self.sequence,'kind':kind,**fields}))

    def limit(self, name, value):
        if value > self.limits[name]:
            self.failure = {'metric':name,'observed':value,'limit':self.limits[name]}
            raise CustodyHold('HOLD_V45_RESOURCE_' + name.upper())

    def sample_fds(self, pid):
        # The already-owned task is at a kernel stop. This does not sample other
        # tasks or claim simultaneous/kernel-internal FD-table maxima.
        with os.scandir(f'/proc/{pid}/fd') as items:
            count = 0
            for item in items:
                require(item.name.isdecimal(), 'HOLD_V45_RESOURCE_FD_ENTRY')
                count += 1
                self.limit('fd_sample',count)
        row = self.tasks[pid]
        row['fd_samples'] += 1
        row['fd_sample_peak'] = max(row['fd_sample_peak'],count)
        return count

    def birth(self, identity, parent_pid, *, initial=False):
        pid = identity['pid']
        require(type(pid) is int and pid not in self.tasks,
                'HOLD_V45_RESOURCE_TASK_REUSE')
        self.limit('tasks',len(self.tasks)+1)
        row = {'pid':pid,'starttime_ticks':identity['starttime_ticks'],
               'parent_pid':parent_pid,'initial_root':initial,'exited':False,
               'successful_execs':0,'syscall_entries':0,'syscall_exits':0,
               'entry_without_exit_at_termination':0,'inherited_return_stops':0,
               'fd_samples':0,'fd_sample_peak':0,'syscalls':{},'pending':None,
               'allow_initial_return':True}
        self.tasks[pid] = row
        self.current += 1
        self.event_peak = max(self.event_peak,self.current)
        self.event('birth',pid=pid,starttime_ticks=row['starttime_ticks'],parent_pid=parent_pid)
        self.sample_fds(pid)

    def exec(self,pid):
        self.tasks[pid]['successful_execs'] += 1
        self.event('exec',pid=pid)
        self.sample_fds(pid)

    def stop(self, libc, pid):
        import ctypes,struct
        buffer = ctypes.create_string_buffer(88)
        ctypes.set_errno(0)
        count = libc.ptrace(0x420e,pid,ctypes.c_void_p(88),ctypes.cast(buffer,ctypes.c_void_p))
        require(count >= 33, 'HOLD_V45_RESOURCE_SYSCALL_INFO_UNAVAILABLE')
        raw = buffer.raw
        op = raw[0]
        arch = struct.unpack_from('=I',raw,4)[0]
        require(arch == self.ARCH and op in (1,2), 'HOLD_V45_RESOURCE_SYSCALL_ABI')
        self.stops += 1
        self.limit('syscall_stops',self.stops)
        row = self.tasks[pid]
        if op == 1:
            require(count >= 80 and row['pending'] is None,
                    'HOLD_V45_RESOURCE_SYSCALL_PAIR')
            nr = struct.unpack_from('=Q',raw,24)[0]
            require(nr < 0x40000000, 'HOLD_V45_RESOURCE_SYSCALL_ABI')
            row['pending'] = nr
            row['allow_initial_return'] = False
            row['syscall_entries'] += 1
            bucket = row['syscalls'].setdefault(str(nr),{'entries':0,'exits':0,
                       'errors':0,'read_return_bytes':0,'write_return_bytes':0})
            bucket['entries'] += 1
            self.event('enter',pid=pid,nr=nr)
        else:
            retval = struct.unpack_from('=q',raw,24)[0]
            error = raw[32]
            require(error in (0,1), 'HOLD_V45_RESOURCE_SYSCALL_ERROR')
            if row['pending'] is None:
                # The root's initial exec (capture began at its exec event),
                # or the newborn's return from its parent's fork/vfork.
                require(row['allow_initial_return'] and retval == 0 and error == 0,
                        'HOLD_V45_RESOURCE_UNPAIRED_EXIT')
                row['allow_initial_return'] = False
                row['inherited_return_stops'] += 1
                self.event('boundary-return',pid=pid)
            else:
                nr = row['pending'];row['pending'] = None
                row['syscall_exits'] += 1
                bucket = row['syscalls'][str(nr)]
                bucket['exits'] += 1;bucket['errors'] += error
                read = retval if not error and retval > 0 and nr in self.READ_CALLS else 0
                write = retval if not error and retval > 0 and nr in self.WRITE_CALLS else 0
                bucket['read_return_bytes'] += read
                bucket['write_return_bytes'] += write
                self.returned_io += read + write
                self.limit('returned_io_bytes',self.returned_io)
                self.event('return',pid=pid,nr=nr,value=retval,error=error)
            self.sample_fds(pid)

    def exit(self,pid,status):
        row = self.tasks[pid]
        require(not row['exited'], 'HOLD_V45_RESOURCE_DUPLICATE_EXIT')
        row['exited'] = True;row['wait_status'] = status
        row['entry_without_exit_at_termination'] = int(row['pending'] is not None)
        row['pending_at_exit'] = row.pop('pending')
        self.current -= 1
        self.event('exit',pid=pid,status=status)

    def report(self, *, terminal, stream_bindings, cleanup_complete):
        import copy,time
        rows = copy.deepcopy(list(self.tasks.values()))
        # Entries still pending on HOLD are retained as partial, not invented exits.
        complete = terminal == 'VERIFIED' and cleanup_complete and self.current == 0
        fields = ('syscall_entries','syscall_exits','entry_without_exit_at_termination',
                  'inherited_return_stops','successful_execs')
        totals = {k:sum(r[k] for r in rows) for k in fields}
        histogram = {}
        for row in rows:
            for nr,bucket in row['syscalls'].items():
                target = histogram.setdefault(nr,{k:0 for k in bucket})
                for key,value in bucket.items():target[key] += value
        totals.update(task_lifetimes=len(rows),task_exits=sum(r['exited'] for r in rows),
            syscall_stops=self.stops,read_return_bytes=sum(r['read_return_bytes'] for r in histogram.values()),
            write_return_bytes=sum(r['write_return_bytes'] for r in histogram.values()),
            captured_stream_bytes=sum(b['bytes'] for b in stream_bindings.values()),
            task_event_outstanding_peak=self.event_peak,
            max_task_fd_sample=max((r['fd_sample_peak'] for r in rows),default=0))
        out = {'format':self.FORMAT,'scope':'owned_tree_from_initial_exec_stop_to_terminal_wait',
               'capture_complete_for_scope':complete,'whole_case_complete':False,
               'full_job_process_census':False,'exact_peak_live_processes':None,
               'exact_peak_live_fds':None,'scm_rights_descriptor_transfers':None,
               'whole_case_retry_count':None,'whole_case_syscalls':None,
               'syscall_arch':'linux-x86_64','tasks':rows,'totals':totals,
               'syscall_histogram':histogram,'limits':self.limits,
               'refusal':self.failure,'elapsed_ns':time.monotonic_ns()-self.started_ns,
               'ordered_event_count':self.sequence,'ordered_event_sha256':self._hash.hexdigest(),
               'stream_bindings':stream_bindings,
               'excluded':['pre-initial-exec setup','observer/custodian','supervisor',
                           'test driver and consumers','external stream holders','cleanup after refusal'],
               'fd_measurement':'per_task_stopped_samples_not_global_peak',
               'byte_measurement':'successful_scalar_io_syscall_return_bytes_not_unique_bytes_or_storage_io'}
        out['ledger_sha256'] = digest(canon(out))
        return out



class OuterCaseSyscallLedger(OwnedSyscallLedger):
    """Disjoint outer-task accounting; a delegated producer is never traced here."""
    FORMAT = 'VOID_V45_OUTER_CASE_SYSCALL_LEDGER_V1'
    DEFAULT_LIMITS = {'syscall_stops': 1000000, 'tasks': 512,
                      'fd_sample': 4096, 'returned_io_bytes': 1073741824}


class StaticCaseResourceCapture:
    """Observe only a freshly launched, fixed local static-proof program.

    This opt-in review capture is not an alternate custody authority. It traces
    the driver/supervisor/consumers, read-only source queries and the actual
    custodian. At the verified custodian exec it disables automatic fork tracing:
    that custodian, not this recorder, owns the producer's existing tracer.
    Successful fork returns then create independently pinned delegation records.
    A final join must account for each delegation in the inner retained ledger.

    No arbitrary PID or command input, ATTACH/SEIZE, memory/register inspection,
    syscall modification, network, installation or operator-host operation.
    The outer recorder itself and pre-root-exec setup remain outside the scope.
    Kernel syscall-stop observation is not a sandbox or a kernel resource quota.
    """
    def __init__(self):
        self.used = False

    def run(self, repo: Path, output_directory: Path, *, limits=None, timeout_ms=90000):
        import contextlib
        with contextlib.ExitStack() as fd_owner:
            return self._capture(repo, output_directory, limits=limits,
                                 timeout_ms=timeout_ms, fd_owner=fd_owner)

    def _capture(self, repo, output_directory, *, limits, timeout_ms, fd_owner):
        def own(fd):
            fd_owner.callback(os.close,fd)
            return fd
        import ctypes, errno, select, signal, struct, time
        require(not self.used, 'HOLD_V45_OUTER_REPLAY'); self.used = True
        require(type(timeout_ms) is int and 100 <= timeout_ms <= 120000,
                'HOLD_V45_OUTER_DEADLINE_SCHEMA')
        repo = Path(repo); work = Path(output_directory)
        require(repo.is_absolute() and repo.is_dir() and work.is_absolute()
                and work.is_dir() and not any(work.iterdir()), 'HOLD_V45_OUTER_PATHS')
        ledger = OuterCaseSyscallLedger(limits)
        source_path = repo / 'scripts/prove_datanet_v45_custody_integration_v1.py'
        custody_path = repo / 'scripts/datanet_v45_custody_session_v1.py'
        source = source_path.read_bytes(); custody_source = custody_path.read_bytes()
        require(len(source) <= MAX_TOTAL and len(custody_source) <= MAX_TOTAL,
                'HOLD_V45_OUTER_SOURCE_SIZE')
        source_fd = own(sealed_fd(source, 'void-v45-outer-fixed-driver'))
        executable = own(os.open(str(Path(sys.executable).resolve()), os.O_RDONLY | os.O_CLOEXEC))
        import shutil
        git_path = shutil.which('git')
        require(git_path is not None, 'HOLD_V45_OUTER_GIT_MISSING')
        git_fd = own(os.open(str(Path(git_path).resolve()), os.O_RDONLY | os.O_CLOEXEC))
        exe_key = identity(os.fstat(executable)); git_key = identity(os.fstat(git_fd))
        executable_hash=executable_digest(executable);git_hash=executable_digest(git_fd)
        static_output = work / 'static.json'
        argv = [str(Path(sys.executable).resolve()), '-I', '-S', '-B', f'/proc/self/fd/{source_fd}',
                '--real-static-resource-profile', '--output', str(static_output)]
        # No inherited credentials or runtime configuration enter the fixed proof.
        env = {'PATH': os.environ.get('PATH', '/usr/bin:/bin'), 'LANG': 'C.UTF-8',
               'HOME': str(work), 'TMPDIR': str(work), 'PYTHONDONTWRITEBYTECODE': '1',
               'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null',
               'GIT_CONFIG_SYSTEM': '/dev/null', 'GIT_OPTIONAL_LOCKS': '0',
               'VOID_V45_SOURCE_ROOT': str(repo)}
        libc = ctypes.CDLL(None, use_errno=True)
        libc.ptrace.restype = ctypes.c_long
        libc.ptrace.argtypes = (ctypes.c_uint, ctypes.c_uint, ctypes.c_void_p, ctypes.c_void_p)
        def trace(op, pid, value=0):
            ctypes.set_errno(0)
            require(libc.ptrace(op,pid,None,ctypes.c_void_p(value)) != -1,
                    'HOLD_V45_OUTER_TRACE_UNAVAILABLE')
        def ident(pid):
            raw=Path(f'/proc/{pid}/stat').read_bytes(); tail=raw[raw.rfind(b')')+2:].split()
            require(len(tail)>=20,'HOLD_V45_OUTER_PROC_STAT')
            return {'pid':pid,'ppid':int(tail[1]),'starttime_ticks':int(tail[19])}
        def message(pid):
            value=ctypes.c_ulong();trace(0x4201,pid,ctypes.addressof(value));return value.value
        def cmdline(pid):
            data=Path(f'/proc/{pid}/cmdline').read_bytes()
            require(0<len(data)<=32768 and data.endswith(b'\0'),'HOLD_V45_OUTER_ARGV')
            return [a.decode('utf-8') for a in data[:-1].split(b'\0')]
        def foreign_source(pid, arg):
            require(arg.startswith('/proc/self/fd/') and arg[14:].isdecimal(),
                    'HOLD_V45_OUTER_CUSTODIAN_SOURCE')
            fd=os.open(f'/proc/{pid}/fd/{int(arg[14:])}',os.O_RDONLY|os.O_CLOEXEC)
            try:
                require(fcntl.fcntl(fd,fcntl.F_GET_SEALS)==15,'HOLD_V45_OUTER_CUSTODIAN_SEALS')
                require(digest(read_fd(fd))==digest(custody_source),
                        'HOLD_V45_OUTER_CUSTODIAN_SOURCE')
            finally:os.close(fd)
        events=[]; tasks={}; delegations=[]; early={}; handles=[]; failure=None; root=None
        started=time.monotonic_ns(); deadline=started+timeout_ms*1000000
        follow=1|2|4|8|16|0x00100000
        nofork=1|16|0x00100000
        stderr=own(os.open(work/'driver.stderr.log',os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC,0o600))
        stdout=own(os.open(work/'driver.stdout.log',os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC,0o600))
        devnull=own(os.open('/dev/null',os.O_RDONLY|os.O_CLOEXEC))
        initial_fds=[int(n) for n in os.listdir('/proc/self/fd') if n.isdecimal()]
        def event(kind,**fields):
            require(len(events)<8192,'HOLD_V45_OUTER_EVENT_LIMIT')
            events.append({'sequence':len(events)+1,'event':kind,**fields})
        def add_task(pid,parent,initial=False):
            require(pid not in tasks,'HOLD_V45_OUTER_DUPLICATE_TASK')
            row=ident(pid);require(row['ppid']==parent,'HOLD_V45_OUTER_PARENT')
            handle=own(os.pidfd_open(pid,0));handles.append(handle)
            tasks[pid]={'identity':row,'parent_pid':parent,'role':None,'pidfd':handle,
                        'exited':False,'start_stop':initial,'execs':0}
            ledger.birth(row,parent,initial=initial);event('OUTER_TASK',**row)
        def at_stop(pid,status):
            row=tasks[pid];ev=status>>16;sig=os.WSTOPSIG(status)
            require(ident(pid)['starttime_ticks']==row['identity']['starttime_ticks'],
                    'HOLD_V45_OUTER_GENERATION')
            if sig==(signal.SIGTRAP|0x80) and ev==0:
                pending=ledger.tasks[pid].get('pending')
                ledger.stop(libc,pid)
                if row['role']=='custodian' and pending in (56,57,58,435) and ledger.tasks[pid].get('pending') is None:
                    buf=ctypes.create_string_buffer(88)
                    n=libc.ptrace(0x420e,pid,ctypes.c_void_p(88),ctypes.cast(buf,ctypes.c_void_p))
                    require(n>=33 and buf.raw[0]==2,'HOLD_V45_OUTER_FORK_RETURN')
                    born=struct.unpack_from('=q',buf.raw,24)[0]
                    if born>0 and buf.raw[32]==0:
                        child=ident(born);require(child['ppid']==pid,'HOLD_V45_OUTER_DELEGATION_PARENT')
                        require(not any(d['pid']==born for d in delegations),'HOLD_V45_OUTER_DELEGATION_REUSE')
                        handle=own(os.pidfd_open(born,0));handles.append(handle)
                        delegations.append({**child,'owner_starttime_ticks':row['identity']['starttime_ticks'],
                            'birth_syscall':pending,'pidfd':handle,'birth_observed':True})
                        event('INNER_SCOPE_DELEGATED',**child)
                trace(24,pid);return
            if ev in (1,2,3):
                born=message(pid)
                require(ev!=3,'HOLD_V45_OUTER_THREAD_UNSUPPORTED')
                add_task(born,pid)
                trace(24,pid)
                if born in early:at_stop(born,early.pop(born))
                return
            if ev==4:
                ledger.exec(pid);row['execs']+=1
                args=cmdline(pid);actual=identity(os.stat(f'/proc/{pid}/exe'))
                require(identity(os.fstat(executable))==exe_key and identity(os.fstat(git_fd))==git_key,
                        'HOLD_V45_OUTER_EXECUTABLE_GENERATION')
                if pid==root:
                    require(row['execs']==1 and args==argv and actual==exe_key,'HOLD_V45_OUTER_ROOT_EXEC')
                    row['role']='driver_supervisor_consumers'
                elif actual==git_key:
                    require(row['execs']==1 and args[:3]==['git','-C',str(repo)],'HOLD_V45_OUTER_GIT_ARGV')
                    tail=args[3:]
                    allowed=tail in (['rev-parse','HEAD'],['rev-parse','HEAD^{tree}'])
                    allowed=allowed or (len(tail)==4 and tail[:3]==['ls-tree','-r','--full-tree']
                                        and re.fullmatch('[0-9a-f]{40}',tail[3]) is not None)
                    allowed=allowed or (len(tail)==3 and tail[:2]==['cat-file','blob']
                                        and re.fullmatch('[0-9a-f]{40}',tail[2]) is not None)
                    require(allowed,'HOLD_V45_OUTER_GIT_COMMAND');row['role']='source_query'
                elif actual==exe_key:
                    require(row['execs']==1 and row['parent_pid']==root and len(args)==12
                        and args[1:4]==['-I','-S','-B'] and args[5]=='--capture-resources'
                        and args[6]=='--channel-fd' and args[8]=='--context-fd' and args[10]=='--source-fd'
                        and all(args[k].isdecimal() for k in (7,9,11)), 'HOLD_V45_OUTER_CUSTODIAN_ARGV')
                    foreign_source(pid,args[4]);require(args[4]==f'/proc/self/fd/{args[11]}','HOLD_V45_OUTER_CUSTODIAN_SOURCE')
                    row['role']='custodian';trace(0x4200,pid,nofork)
                else:
                    event('UNEXPECTED_EXECUTABLE',pid=pid,executable_path=os.readlink(f'/proc/{pid}/exe'),actual_identity=actual,expected_python_identity=exe_key)
                    raise CustodyHold('HOLD_V45_OUTER_UNEXPECTED_EXECUTABLE')
                event('OUTER_EXEC',pid=pid,role=row['role'],argv_sha256=digest(canon({'argv':args})))
                trace(24,pid);return
            if sig==signal.SIGSTOP and not row['start_stop']:
                row['start_stop']=True;trace(24,pid);return
            require(sig!=signal.SIGTRAP,'HOLD_V45_OUTER_UNEXPECTED_STOP')
            trace(24,pid,sig)
        cleanup_complete=False
        previous_alarm=signal.getsignal(signal.SIGALRM)
        alarm_installed=False
        def deadline_alarm(signum, frame):
            raise CustodyHold('HOLD_V45_OUTER_DEADLINE')
        try:
            require(len(list(Path('/proc/self/task').iterdir()))==1,'HOLD_V45_OUTER_THREADS_PRESENT')
            try:os.waitid(os.P_ALL,0,os.WEXITED|os.WNOHANG|os.WNOWAIT)
            except ChildProcessError:pass
            else:raise CustodyHold('HOLD_V45_OUTER_PREEXISTING_CHILD')
            require(signal.getitimer(signal.ITIMER_REAL)==(0.0,0.0),'HOLD_V45_OUTER_TIMER_PRESENT')
            root=os.fork()
            if root==0:
                try:
                    os.dup2(devnull,0);os.dup2(stdout,1);os.dup2(stderr,2);os.chdir(repo)
                    for fd in initial_fds:
                        if fd not in (0,1,2,source_fd,executable):
                            try:os.close(fd)
                            except OSError:pass
                    os.set_inheritable(source_fd,True)
                    trace(0,0);os.kill(os.getpid(),signal.SIGSTOP);os.execve(executable,argv,env)
                except BaseException:os._exit(126)
            signal.signal(signal.SIGALRM,deadline_alarm)
            signal.setitimer(signal.ITIMER_REAL,timeout_ms/1000);alarm_installed=True
            handle=own(os.pidfd_open(root,0));handles.append(handle)
            while True:
                require(time.monotonic_ns()<deadline,'HOLD_V45_OUTER_DEADLINE')
                pid,status=os.waitpid(root,os.WUNTRACED)
                if pid:break
                time.sleep(.0002)
            require(os.WIFSTOPPED(status) and os.WSTOPSIG(status)==signal.SIGSTOP,'HOLD_V45_OUTER_START')
            trace(0x4200,root,follow);trace(7,root)
            while True:
                require(time.monotonic_ns()<deadline,'HOLD_V45_OUTER_DEADLINE')
                pid,status=os.waitpid(root,os.WUNTRACED)
                if pid:break
                time.sleep(.0002)
            require(os.WIFSTOPPED(status) and status>>16==4,'HOLD_V45_OUTER_INITIAL_EXEC')
            add_task(root,os.getpid(),True);at_stop(root,status)
            while any(not r['exited'] for r in tasks.values()):
                require(time.monotonic_ns()<deadline,'HOLD_V45_OUTER_DEADLINE')
                try:pid,status=os.waitpid(-1,0x40000000)
                except ChildProcessError:raise CustodyHold('HOLD_V45_OUTER_MISSING_WAIT')
                if pid==0:time.sleep(.0001);continue
                if pid not in tasks:
                    require(os.WIFSTOPPED(status) and len(early)<512,'HOLD_V45_OUTER_UNKNOWN_WAIT')
                    early[pid]=status;continue
                if os.WIFEXITED(status) or os.WIFSIGNALED(status):
                    ledger.exit(pid,status);tasks[pid]['exited']=True;event('OUTER_EXIT',pid=pid,status=status)
                    good_exit=os.WIFEXITED(status) and os.WEXITSTATUS(status)==0
                    fixture_shutdown=(tasks[pid]['role']=='custodian' and os.WIFSIGNALED(status)
                                      and os.WTERMSIG(status)==signal.SIGTERM)
                    require(good_exit or fixture_shutdown,'HOLD_V45_OUTER_NONZERO_EXIT')
                else:at_stop(pid,status)
            require(not early,'HOLD_V45_OUTER_UNMATCHED_BIRTH')
            require(all(select.select([d['pidfd']],[],[],0)[0] for d in delegations),'HOLD_V45_OUTER_DELEGATED_LIVE')
            cleanup_complete=True
        except (CustodyHold,OSError,ValueError) as exc:
            failure=exc.code if isinstance(exc,CustodyHold) else 'HOLD_V45_OUTER_SYSTEM_ERROR'
        finally:
            if alarm_installed:
                signal.setitimer(signal.ITIMER_REAL,0)
                signal.signal(signal.SIGALRM,previous_alarm)
            if root is None:cleanup_complete=True
            if not cleanup_complete:
                # Signal only kernel-owned traced/delegated tasks through retained
                # pidfds. Never signal a numeric PID obtained from caller input.
                for fd in handles:
                    try:signal.pidfd_send_signal(fd,signal.SIGKILL)
                    except OSError:pass
                cleanup_end=time.monotonic()+5
                while time.monotonic()<cleanup_end:
                    try:pid,status=os.waitpid(-1,os.WNOHANG|0x40000000)
                    except ChildProcessError:cleanup_complete=True;break
                    if not pid:time.sleep(.001);continue
                    if pid in tasks and not tasks[pid]['exited'] and (os.WIFEXITED(status) or os.WIFSIGNALED(status)):
                        if pid in ledger.tasks:ledger.exit(pid,status)
                        tasks[pid]['exited']=True
                    elif os.WIFSTOPPED(status):
                        try:trace(7,pid,signal.SIGKILL)
                        except CustodyHold:pass
            delegated_records=[]
            for d in delegations:
                entry={k:v for k,v in d.items() if k!='pidfd'}
                entry['pidfd_terminal_observed']=bool(select.select([d['pidfd']],[],[],0)[0])
                delegated_records.append(entry)
        raw=ledger.report(terminal='VERIFIED' if failure is None else 'HOLD',stream_bindings={},cleanup_complete=cleanup_complete)
        raw['scope']='outer_fixed_static_case_excluding_delegated_producer_and_collector'
        raw['excluded']=['collector process','collector/bootstrap setup before initial root exec',
                         'delegated producer subtree','cleanup after refusal']
        raw.pop('ledger_sha256',None);raw['ledger_sha256']=digest(canon(raw))
        out={'format':'VOID_V45_STATIC_OUTER_CAPTURE_V1','status':'CAPTURED' if failure is None else 'HOLD',
             'rejection':failure,'source_sha256':digest(source),'custodian_source_sha256':digest(custody_source),
             'interpreter_sha256':executable_hash,'git_sha256':git_hash,
             'outer_ledger':raw,'task_roles':[{**r['identity'],'role':r['role'],'execs':r['execs'],
                                            'exited':r['exited']} for r in tasks.values()],
             'delegations':delegated_records,'events':events,'elapsed_ns':time.monotonic_ns()-started,
             'deadline_ms':timeout_ms,'automatic_retries':0,'cleanup_complete':cleanup_complete,
             'whole_case_complete':False,'full_job_process_census':False,'full_campaign_accepted':False}
        out['capture_sha256']=digest(canon(out))
        return out



class ObservedRunnerProducer:
    """Observe the exact privileged runner root without double-ptracing descendants.

    The admitted shell source is a sealed descriptor connected to stdin.  Only
    the owned timeout root is ptraced through its initial exec and terminal
    wait.  Descendant exec transitions remain the responsibility of the
    source-defined inner strace command.  This custodian is a Linux child
    subreaper and requires the owned descendant set to be empty before admitting
    stdout/stderr.  That proves terminal retirement, not a full descendant exec
    census or nested-writer prebinding.
    """
    _WALL = 0x40000000

    def __init__(self):
        self.state='NEW'
        self.report={'status':'UNSTARTED',
            'producer_identity_independently_verified':False,
            'producer_exec_observed':False,
            'producer_output_capability_coupled':False,
            'producer_subtree_retired':False,
            'output_streams_retired':False,
            'producer_exec_lifetime_verified':False,
            'unadmitted_exec_count':0,
            'trace_policy':RUNNER_POLICY,
            'source_profile':RUNNER_SOURCE_PROFILE,
            'descendant_execs_observed_by_outer_custodian':False,
            'terminal_subreaper_retirement_required':True,
            'observed_subtree_exec_count_scope':'outer_owned_root_only',
            'full_job_process_census':False,
            'nested_producer_prebinding_proved':False,
            'full_campaign_accepted':False,
            'workflow_integration_complete':False,
            'production_runtime_touched':False,
            'local_stream_take_permitted':False,
            'cleanup_complete':False,'events':[]}
        self._payloads=None

    def _need(self,ok,code):
        if not ok:raise CustodyHold(code)

    def _event(self,event,**fields):
        self.report['events'].append({'sequence':len(self.report['events'])+1,'event':event,**fields})

    def take(self):
        self._need(self.state=='VERIFIED' and self.report['local_stream_take_permitted'],
                   'HOLD_V45_OBSERVED_NOT_VERIFIED')
        self.state='TAKEN';result=self._payloads;self._payloads=None;return result

    def run(self, request, source_fd, *, phase_io):
        import ctypes,selectors,signal,time
        self._need(self.state=='NEW','HOLD_V45_OBSERVED_REPLAY');self.state='RUNNING'
        libc=ctypes.CDLL(None,use_errno=True)
        libc.ptrace.restype=ctypes.c_long
        libc.ptrace.argtypes=(ctypes.c_uint,ctypes.c_uint,ctypes.c_void_p,ctypes.c_void_p)
        libc.prctl.restype=ctypes.c_int
        libc.prctl.argtypes=(ctypes.c_int,ctypes.c_ulong,ctypes.c_ulong,ctypes.c_ulong,ctypes.c_ulong)
        child=None;pidfd=None;root_reaped=False;selector=None;read_ends={};write_ends=[]
        owned=[];failure=None;trace_wait_count=0;reaped=[];root_exit_at=None;diagnostic_nonzero_rc=None

        def ptrace(op,pid,data=0):
            ctypes.set_errno(0)
            if libc.ptrace(op,pid,None,ctypes.c_void_p(data))==-1:
                raise CustodyHold('HOLD_V45_RUNNER_PTRACE_UNAVAILABLE')

        def close(fd):
            try:os.close(fd)
            except OSError:pass

        def proc_identity(pid):
            raw=Path(f'/proc/{pid}/stat').read_bytes()
            tail=raw[raw.rfind(b')')+2:].split()
            self._need(len(tail)>=20,'HOLD_V45_RUNNER_PROC_STAT')
            return {'pid':pid,'ppid':int(tail[1]),'starttime_ticks':int(tail[19])}

        def children_empty():
            for _ in range(256):
                try:
                    pid,status=os.waitpid(-1,os.WNOHANG|self._WALL)
                except ChildProcessError:
                    return True
                if pid==0:
                    return False
                reaped.append({'pid':pid,'wait_status':status})
                self._event('RUNNER_ADOPTED_DESCENDANT_REAPED',pid=pid,wait_status=status)
            raise CustodyHold('HOLD_V45_RUNNER_REAP_BOUND')

        def cleanup_descendants():
            # The owned root creates a fresh process group while remaining in
            # the inherited login session. timeout --foreground keeps the fixed
            # wrapper chain in that owned group for exact killpg cleanup. This is
            # process-group ownership, not a claim that the session is isolated.
            if child is not None:
                try:os.killpg(child,signal.SIGKILL)
                except (ProcessLookupError,PermissionError):pass
            end=time.monotonic()+1.0
            while time.monotonic()<end:
                if children_empty():return True
                time.sleep(0.002)
            return children_empty()

        try:
            self._need(type(request) is dict and set(request)=={
                'context','phase','source_sha256','argv','timeout_ms','max_output_bytes','wrapper_paths'},
                'HOLD_V45_RUNNER_REQUEST_SCHEMA')
            checked_context(request['context'])
            self._need(request['phase']=='runner','HOLD_V45_RUNNER_PHASE')
            argv=request['argv']
            self._need(type(argv) is list and 8<=len(argv)<=64
                and all(type(a) is str and '\0' not in a for a in argv)
                and sum(len(a.encode()) for a in argv)<=65536,
                'HOLD_V45_RUNNER_ARGV')
            self._need(argv[0]=='/usr/bin/timeout' and argv[1]=='--foreground'
                       and argv[-2:]==['/usr/bin/bash','-s'],
                       'HOLD_V45_RUNNER_ARGV_SHAPE')
            try:sudo_index=argv.index('/usr/bin/sudo')
            except ValueError:raise CustodyHold('HOLD_V45_RUNNER_ARGV_SHAPE')
            self._need(sudo_index+2<len(argv) and argv[sudo_index+1]=='-n'
                       and argv[sudo_index+2]=='/usr/bin/strace',
                       'HOLD_V45_RUNNER_SUDO_NONINTERACTIVE')
            timeout_ms=request['timeout_ms'];cap=request['max_output_bytes']
            self._need(type(timeout_ms) is int and 100<=timeout_ms<=RUNNER_TIMEOUT_MAX_MS
                and type(cap) is int and 1<=cap<=MAX_TOTAL,'HOLD_V45_RUNNER_LIMITS')
            self._need(type(source_fd) is int and source_fd>=3
                and fcntl.fcntl(source_fd,fcntl.F_GET_SEALS)==15,
                'HOLD_V45_RUNNER_SOURCE')
            source=read_fd(source_fd)
            self._need(digest(source)==request['source_sha256'],'HOLD_V45_RUNNER_SOURCE_DIGEST')
            self._need(type(phase_io) is dict and set(phase_io)=={
                'output_paths','stdout_role','stderr_role','env','cwd_fd'},
                'HOLD_V45_RUNNER_PHASE_IO')
            roles=phase_io['output_paths'];stdout_role=phase_io['stdout_role'];stderr_role=phase_io['stderr_role']
            self._need(type(roles) is dict and set(roles)=={stdout_role,stderr_role}
                and stdout_role!=stderr_role,'HOLD_V45_RUNNER_STREAM_ROLES')
            self._need(stat.S_ISDIR(os.fstat(phase_io['cwd_fd']).st_mode),'HOLD_V45_RUNNER_CWD')
            environment=phase_io['env']
            self._need(type(environment) is dict and all(type(k) is str and type(v) is str for k,v in environment.items()),
                       'HOLD_V45_RUNNER_ENV')
            self._need(len(list(Path('/proc/self/task').iterdir()))==1,'HOLD_V45_RUNNER_THREADS_PRESENT')
            self._need(signal.getsignal(signal.SIGCHLD)==signal.SIG_DFL,'HOLD_V45_RUNNER_SIGCHLD_POLICY')
            try:os.waitid(os.P_ALL,0,os.WEXITED|os.WNOHANG|os.WNOWAIT)
            except ChildProcessError:pass
            else:raise CustodyHold('HOLD_V45_RUNNER_PREEXISTING_CHILD')
            self._need(libc.prctl(36,1,0,0,0)==0,'HOLD_V45_RUNNER_SUBREAPER_UNAVAILABLE')
            flag=ctypes.c_int()
            self._need(libc.prctl(37,ctypes.addressof(flag),0,0,0)==0 and flag.value==1,
                       'HOLD_V45_RUNNER_SUBREAPER_UNAVAILABLE')

            def hash_executable(fd):
                before=os.fstat(fd)
                self._need(stat.S_ISREG(before.st_mode) and 0<before.st_size<=256*1024*1024,
                           'HOLD_V45_RUNNER_EXECUTABLE_SHAPE')
                h=hashlib.sha256();offset=0
                while offset<before.st_size:
                    chunk=os.pread(fd,min(1024*1024,before.st_size-offset),offset)
                    self._need(bool(chunk),'HOLD_V45_RUNNER_EXECUTABLE_READ')
                    h.update(chunk);offset+=len(chunk)
                self._need(not os.pread(fd,1,offset) and identity(before)==identity(os.fstat(fd)),
                           'HOLD_V45_RUNNER_EXECUTABLE_CHANGED')
                return h.hexdigest()

            source_copy=sealed_fd(source,'void-v45-runner-stdin-source');owned.append(source_copy)
            self._need(os.lseek(source_copy,0,os.SEEK_SET)==0,'HOLD_V45_RUNNER_STDIN_SEEK')
            root_exec=os.open('/usr/bin/timeout',os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW);owned.append(root_exec)
            root_key=identity(os.fstat(root_exec));root_hash=hash_executable(root_exec)
            self._need(stat.S_ISREG(root_key[2]) and not root_key[2]&0o6000,'HOLD_V45_RUNNER_ROOT_EXECUTABLE')

            # Prebind every fixed absolute executable used by the privileged
            # wrapper. This is source evidence of stable local objects, not a
            # claim that descendant exec transitions are observed by this tracer.
            wrapper_paths=request['wrapper_paths']
            self._need(type(wrapper_paths) is list and 1<=len(wrapper_paths)<=8
                and len(wrapper_paths)==len(set(wrapper_paths))
                and all(type(value) is str and value.startswith('/usr/bin/') and value in argv
                        for value in wrapper_paths),'HOLD_V45_RUNNER_WRAPPER_ARGV')
            wrappers=[]
            for value in wrapper_paths:
                fd=os.open(value,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW);owned.append(fd)
                st=os.fstat(fd)
                self._need(stat.S_ISREG(st.st_mode),'HOLD_V45_RUNNER_WRAPPER_EXECUTABLE')
                wrappers.append({'path':value,'identity':identity(st),'sha256':hash_executable(fd),
                                 'setid_bits':stat.S_IMODE(st.st_mode)&0o6000,'fd':fd})

            role_streams={stdout_role:'stdout',stderr_role:'stderr'}
            for label in ('stdout','stderr'):
                r,w=os.pipe2(os.O_CLOEXEC);read_ends[label]=r;write_ends.append(w);os.set_blocking(r,False)
            output_keys=[identity(os.fstat(fd))[:2] for fd in write_ends]
            self.report.update(context=request['context'],phase='runner',executed_argv=argv,
                role_streams=role_streams,source_sha256=digest(source),
                argv_sha256=digest(canon({'argv':argv})),
                root_executable={'path':'/usr/bin/timeout','identity':root_key,'sha256':root_hash},
                prebound_wrapper_executables=[{k:v for k,v in row.items() if k!='fd'} for row in wrappers])

            inherited_snapshot=[int(n) for n in os.listdir('/proc/self/fd') if n.isdecimal()]
            deadline=time.monotonic()+timeout_ms/1000
            child=os.fork()
            if child==0:
                try:
                    os.setpgid(0,0)
                    os.dup2(source_copy,0);os.dup2(write_ends[0],1);os.dup2(write_ends[1],2)
                    os.fchdir(phase_io['cwd_fd'])
                    keep={0,1,2,root_exec}
                    for fd in inherited_snapshot:
                        if fd not in keep:close(fd)
                    ptrace(0,0);os.kill(os.getpid(),signal.SIGSTOP)
                    os.execve(root_exec,argv,environment)
                except BaseException:os._exit(126)
            for fd in write_ends:close(fd)
            write_ends.clear()
            pidfd=os.pidfd_open(child,0)
            initial=proc_identity(child)
            self._need(initial['ppid']==os.getpid(),'HOLD_V45_RUNNER_PARENT')
            self.report.update(producer=initial,custodian_pid=os.getpid(),
                producer_identity_independently_verified=True)
            self._event('RUNNER_PIDFD_RETAINED_BEFORE_EXEC',**initial)

            # Initial stop.
            status=None
            while time.monotonic()<deadline:
                pid,st=os.waitpid(child,os.WNOHANG|os.WUNTRACED)
                if pid:status=st;break
                time.sleep(0.002)
            self._need(status is not None and os.WIFSTOPPED(status)
                and os.WSTOPSIG(status)==signal.SIGSTOP,'HOLD_V45_RUNNER_INITIAL_STOP')
            self._need(os.getpgid(child)==child and os.getsid(child)==os.getsid(0),
                       'HOLD_V45_RUNNER_PROCESS_GROUP')
            self.report['isolated_process_group_same_session']=True
            self.report['sudo_ticket_session_preserved']=True
            ptrace(0x4200,child,0x10|0x00100000) # TRACEEXEC | EXITKILL; no fork tracing.
            ptrace(7,child)
            status=None
            while time.monotonic()<deadline:
                pid,st=os.waitpid(child,os.WNOHANG|os.WUNTRACED)
                if pid:status=st;break
                time.sleep(0.002)
            self._need(status is not None and os.WIFSTOPPED(status)
                and os.WSTOPSIG(status)==signal.SIGTRAP and status>>16==4,
                'HOLD_V45_RUNNER_EXEC_EVENT')
            self._need(proc_identity(child)==initial,'HOLD_V45_RUNNER_IDENTITY_CHANGED')
            self._need(identity(os.stat(f'/proc/{child}/exe'))==root_key,'HOLD_V45_RUNNER_EXECUTABLE_CHANGED')
            self._need(Path(f'/proc/{child}/cmdline').read_bytes()==b'\0'.join(a.encode() for a in argv)+b'\0',
                       'HOLD_V45_RUNNER_EXEC_ARGV')
            self._need(identity(os.stat(f'/proc/{child}/fd/0'))==identity(os.fstat(source_copy)),
                       'HOLD_V45_RUNNER_STDIN_SOURCE')
            for stream_fd,expected in zip((1,2),output_keys):
                self._need(identity(os.stat(f'/proc/{child}/fd/{stream_fd}'))[:2]==expected,
                           'HOLD_V45_RUNNER_STREAM_COUPLING')
            self.report.update(producer_exec_observed=True,producer_output_capability_coupled=True,
                exec_observation=RUNNER_EXEC_OBSERVATION)
            self._event('RUNNER_ROOT_EXEC_AND_STREAMS_OBSERVED')
            ptrace(7,child)

            selector=selectors.DefaultSelector()
            for label,fd in read_ends.items():selector.register(fd,selectors.EVENT_READ,label)
            payloads={label:bytearray() for label in read_ends};eofs=set()
            while True:
                now=time.monotonic();self._need(now<deadline,'HOLD_V45_RUNNER_EXECUTION_DEADLINE')
                for _ in range(256):
                    try:pid,status=os.waitpid(-1,os.WNOHANG|self._WALL)
                    except ChildProcessError:break
                    if pid==0:break
                    trace_wait_count+=1;self._need(trace_wait_count<=8192,'HOLD_V45_RUNNER_WAIT_EVENT_LIMIT')
                    if pid!=child:
                        self._need(os.WIFEXITED(status) or os.WIFSIGNALED(status),
                                   'HOLD_V45_RUNNER_UNEXPECTED_DESCENDANT_STOP')
                        reaped.append({'pid':pid,'wait_status':status})
                        self._event('RUNNER_ADOPTED_DESCENDANT_REAPED',pid=pid,wait_status=status)
                        continue
                    if os.WIFSTOPPED(status):
                        event=status>>16;signo=os.WSTOPSIG(status)
                        if event==4:
                            self.report['unadmitted_exec_count']+=1
                            raise CustodyHold('HOLD_V45_RUNNER_ROOT_REEXEC')
                        self._need(event==0 and signo not in (
                            signal.SIGSTOP,signal.SIGTSTP,signal.SIGTTIN,signal.SIGTTOU,signal.SIGTRAP),
                            'HOLD_V45_RUNNER_UNADMITTED_SIGNAL_STOP')
                        ptrace(7,child,signo)
                    elif os.WIFEXITED(status) or os.WIFSIGNALED(status):
                        root_reaped=True;root_exit_at=time.monotonic()
                        rc=os.waitstatus_to_exitcode(status);self.report['producer_returncode']=rc
                        self._event('RUNNER_ROOT_REAPED',pid=child,exit_status=rc)
                        if rc!=0:diagnostic_nonzero_rc=rc
                    else:raise CustodyHold('HOLD_V45_RUNNER_WAIT_STATUS')
                if root_reaped:
                    empty=children_empty()
                    self._need(empty,'HOLD_V45_RUNNER_LIVE_DESCENDANT')
                    if len(eofs)==2 and time.monotonic()>=root_exit_at+0.05:
                        # Require a short stable terminal window after root exit so
                        # descendant reparenting cannot race an empty first wait.
                        self._need(children_empty(),'HOLD_V45_RUNNER_LIVE_DESCENDANT')
                        self.report['producer_subtree_retired']=True
                        self.report['terminal_subreaper_empty']=True
                        break
                    self._need(time.monotonic()<root_exit_at+1.0,'HOLD_V45_RUNNER_WRITABLE_STREAM_RETAINED')
                for key,_ in selector.select(max(0,min(0.01,deadline-time.monotonic()))):
                    label=key.data
                    try:part=os.read(key.fd,65536)
                    except BlockingIOError:continue
                    if not part:
                        eofs.add(label);selector.unregister(key.fd);close(key.fd);read_ends.pop(label)
                        self._event('RUNNER_STREAM_EOF',stream=label)
                    else:
                        payloads[label].extend(part)
                        self._need(sum(map(len,payloads.values()))<=cap,'HOLD_V45_RUNNER_OUTPUT_LIMIT')

            for row in wrappers:
                self._need(identity(os.stat(row['path'],follow_symlinks=False))==row['identity']
                    and hash_executable(row['fd'])==row['sha256'],
                    'HOLD_V45_RUNNER_WRAPPER_CHANGED')
            self._need(identity(os.stat('/usr/bin/timeout',follow_symlinks=False))==root_key
                and hash_executable(root_exec)==root_hash,'HOLD_V45_RUNNER_ROOT_CHANGED')
            self.report.update(producer_exec_lifetime_verified=True,trace_wait_events=trace_wait_count,
                observed_task_count=1,observed_task_exits=1,observed_subtree_exec_count=1,
                output_streams_retired=True,stream_bindings={
                    k:{'bytes':len(v),'sha256':digest(bytes(v))} for k,v in payloads.items()},
                adopted_children_reaped=reaped)
            self._payloads={k:bytes(v) for k,v in payloads.items()}
            self._event('RUNNER_ROOT_AND_SUBTREE_TERMINAL')
            if diagnostic_nonzero_rc is not None:
                stdout_raw=bytes(payloads['stdout']);stderr_raw=bytes(payloads['stderr'])
                print(json.dumps({'marker':'VOID_PR1505_RUNNER_FAILURE_DIAGNOSTIC_V1',
                    'returncode':diagnostic_nonzero_rc,
                    'stdout_bytes':len(stdout_raw),'stdout_sha256':digest(stdout_raw),
                    'stderr_bytes':len(stderr_raw),'stderr_sha256':digest(stderr_raw),
                    'stdout_tail':stdout_raw[-32768:].decode('utf-8',errors='replace'),
                    'stderr_tail':stderr_raw[-131072:].decode('utf-8',errors='replace'),
                    'producer_subtree_retired':self.report['producer_subtree_retired'],
                    'terminal_subreaper_empty':self.report['terminal_subreaper_empty'],
                    'output_streams_retired':self.report['output_streams_retired'],
                    'cleanup_complete_before_refusal':True,'diagnostic_only':False,
                    'full_campaign_accepted':False},sort_keys=True),file=sys.stderr,flush=True)
                raise CustodyHold('HOLD_V45_RUNNER_NONZERO_EXIT')
            self.state='VERIFIED'
        except (CustodyHold,OSError,ValueError,TypeError,KeyError) as exc:
            failure=exc if isinstance(exc,CustodyHold) else CustodyHold('HOLD_V45_RUNNER_OS_OR_INPUT')
            self.state='HOLD';self._payloads=None
            self.report.update(status='HOLD',code=failure.code,local_stream_take_permitted=False)
        finally:
            if selector is not None:selector.close()
            for fd in [*read_ends.values(),*write_ends]:close(fd)
            if failure is not None:
                if child is not None:
                    try:os.killpg(child,signal.SIGKILL)
                    except (ProcessLookupError,PermissionError):pass
                if pidfd is not None and not root_reaped:
                    try:signal.pidfd_send_signal(pidfd,signal.SIGKILL)
                    except ProcessLookupError:pass
                cleanup_descendants()
            if pidfd is not None:close(pidfd)
            for fd in owned:close(fd)
            if libc.prctl(36,0,0,0,0)!=0 and failure is None:
                failure=CustodyHold('HOLD_V45_RUNNER_SUBREAPER_RESTORE')
                self.state='HOLD';self._payloads=None
                self.report.update(status='HOLD',code=failure.code,local_stream_take_permitted=False)
            self.report['cleanup_complete']=children_empty()
            if failure is None:
                self.report.update(status='VERIFIED',local_stream_take_permitted=True)
        if failure is not None:
            failure.observation=self.report
            raise failure
        return self.report

class ObservedStreamProducer:
    """Observe the owned process tree through exit under a single-exec policy.

    Run only in a fresh, single-threaded disposable custodian with no children.
    No caller-supplied PID is accepted. Only our own fork is traced (no ATTACH,
    memory/register access, injection, or external-process signaling). The
    admitted Python source is sealed before fork; its output is anonymous pipes,
    never an evidence-file writable descriptor. A retained/queued SCM_RIGHTS
    copy of a writer prevents EOF and therefore prevents admission.

    This is not a sandbox against arbitrary same-UID/root control. It observes
    every exec transition of its traced process tree. Only the initial root
    executable is admitted by default. The separate closed read-only helper
    profile admits its exact direct-child commands; all other execs and thread
    clones still fail closed.
    This is not Python code-origin attestation, external-writer provenance,
    a full process/syscall/FD/byte census, or a storage campaign. The optional
    inherited descriptors are explicit fixture/readonly-input capabilities, not
    access to a named socket or a production service.
    """
    REQUEST_KEYS = frozenset(('context', 'phase', 'source_sha256', 'argv_tail',
                              'timeout_ms', 'max_output_bytes'))
    _WALL = 0x40000000

    def __init__(self):
        self.state = 'NEW'
        self.report = {'status': 'UNSTARTED', 'producer_identity_independently_verified': False,
                       'producer_exec_observed': False, 'producer_output_capability_coupled': False,
                       'producer_subtree_retired': False, 'output_streams_retired': False,
                       'producer_exec_lifetime_verified': False,
                       'unadmitted_exec_count': 0, 'trace_policy': 'OWNED_TREE_SINGLE_EXEC_V1',
                       'observed_task_limit': 64, 'observed_event_limit': 4096,
                       'full_job_process_census': False, 'nested_producer_prebinding_proved': False,
                       'full_campaign_accepted': False, 'workflow_integration_complete': False,
                       'production_runtime_touched': False, 'local_stream_take_permitted': False,
                       'cleanup_complete': False, 'events': []}
        self._payloads = None

    def _need(self, ok, code):
        if not ok:
            raise CustodyHold(code)

    def _event(self, event, **fields):
        self.report['events'].append({'sequence': len(self.report['events']) + 1,
                                      'event': event, **fields})

    def take(self):
        """Return one local stream bundle, never a V45 aggregate/capsule."""
        self._need(self.state == 'VERIFIED' and self.report['local_stream_take_permitted'],
                   'HOLD_V45_OBSERVED_NOT_VERIFIED')
        self.state = 'TAKEN'
        result = self._payloads
        self._payloads = None
        return result

    def run(self, request, source_fd, *, inherited_fds=(), phase_io=None, helper_plan=None,
            resource_capture=False, resource_limits=None):
        import ctypes
        import errno
        import selectors
        import signal
        import time
        self._need(self.state == 'NEW', 'HOLD_V45_OBSERVED_REPLAY')
        self.state = 'RUNNING'
        libc = ctypes.CDLL(None, use_errno=True)
        libc.ptrace.restype = ctypes.c_long
        libc.ptrace.argtypes = (ctypes.c_uint, ctypes.c_uint,
                                ctypes.c_void_p, ctypes.c_void_p)
        libc.prctl.restype = ctypes.c_int
        libc.prctl.argtypes = (ctypes.c_int, ctypes.c_ulong, ctypes.c_ulong,
                               ctypes.c_ulong, ctypes.c_ulong)
        child = None
        pidfd = None
        root_reaped = False
        read_ends = {}
        write_ends = []
        owned = []
        selector = None
        subreaper = False
        reaped = []
        failure = None
        tracees = {}
        early_stops = {}
        trace_wait_count = 0
        helper_execs = []
        ledger = OwnedSyscallLedger(resource_limits) if resource_capture else None
        stream_counts = {}

        def trace(op, pid, data=0):
            ctypes.set_errno(0)
            if libc.ptrace(op, pid, None, ctypes.c_void_p(data)) == -1:
                raise CustodyHold('HOLD_V45_OBSERVED_EXEC_OBSERVER_UNAVAILABLE')

        def event_message(pid):
            value = ctypes.c_ulong()
            trace(0x4201, pid, ctypes.addressof(value))  # GETEVENTMSG, owned tracees only.
            return value.value

        def close(fd):
            try:
                os.close(fd)
            except OSError:
                pass

        def children_empty():
            for _ in range(64):
                try:
                    pid, status = os.waitpid(-1, os.WNOHANG | self._WALL)
                except ChildProcessError:
                    return True
                if pid == 0:
                    return False
                reaped.append({'pid': pid, 'wait_status': status})
            raise CustodyHold('HOLD_V45_OBSERVED_REAP_BOUND')

        def wait_stop(deadline):
            nonlocal root_reaped
            while time.monotonic() < deadline:
                pid, status = os.waitpid(child, os.WNOHANG | os.WUNTRACED)
                if pid:
                    if os.WIFEXITED(status) or os.WIFSIGNALED(status):
                        root_reaped = True
                    return status
                time.sleep(0.002)
            raise CustodyHold('HOLD_V45_OBSERVED_START_DEADLINE')

        def proc_identity(pid):
            raw = Path(f'/proc/{pid}/stat').read_bytes()
            tail = raw[raw.rfind(b')')+2:].split()
            self._need(len(tail) >= 20, 'HOLD_V45_OBSERVED_PROC_STAT')
            return {'pid': pid, 'ppid': int(tail[1]), 'starttime_ticks': int(tail[19])}

        try:
            # Validate before forking. Neither fake, dead, nor real foreign PIDs
            # are a supported input to this admission path.
            self._need(type(request) is dict and set(request) == self.REQUEST_KEYS,
                       'HOLD_V45_OBSERVED_REQUEST_SCHEMA')
            checked_context(request['context'])
            self._need(type(request['phase']) is str and 0 < len(request['phase']) <= 80,
                       'HOLD_V45_OBSERVED_PHASE')
            tail = request['argv_tail']
            self._need(type(tail) is list and len(tail) <= 32 and
                       all(type(a) is str and '\0' not in a for a in tail) and
                       sum(len(a.encode()) for a in tail) <= 16384,
                       'HOLD_V45_OBSERVED_ARGV')
            timeout_ms = request['timeout_ms']
            cap = request['max_output_bytes']
            self._need(type(timeout_ms) is int and 100 <= timeout_ms <= (600000 if phase_io is not None else 10000) and
                       type(cap) is int and 1 <= cap <= (MAX_TOTAL if phase_io is not None else 8*1024*1024),
                       'HOLD_V45_OBSERVED_LIMITS')
            source_profile = ('retained-static'
                              if request['phase'] in INHERITED_STATIC_ENTRYPOINTS
                              else 'retained-selftest' if request['phase'] == 'custody-selftest'
                              else 'sealed-copy')
            selftest_profile = request['phase'] == 'custody-selftest'
            self._need(type(source_fd) is int and source_fd >= 3,
                       'HOLD_V45_OBSERVED_SOURCE_PROFILE')
            if source_profile == 'sealed-copy':
                self._need(fcntl.fcntl(source_fd, fcntl.F_GET_SEALS) == 15,
                           'HOLD_V45_OBSERVED_SOURCE_UNSEALED')
            else:
                source_stat = os.fstat(source_fd)
                retained_phase = (request['phase'] in INHERITED_STATIC_ENTRYPOINTS
                                  or (source_profile == 'retained-selftest'
                                      and request['phase'] == 'custody-selftest'))
                self._need(retained_phase
                           and stat.S_ISREG(source_stat.st_mode) and source_stat.st_nlink == 1
                           and (fcntl.fcntl(source_fd, fcntl.F_GETFL) & os.O_ACCMODE) == os.O_RDONLY,
                           'HOLD_V45_OBSERVED_RETAINED_SOURCE')
            source = read_fd(source_fd)
            self._need(digest(source) == request['source_sha256'],
                       'HOLD_V45_OBSERVED_SOURCE_DIGEST')
            self.report['source_profile'] = source_profile
            if source_profile == 'retained-static':
                self.report['trace_policy'] = RETAINED_STATIC_POLICY
            elif selftest_profile:
                self.report['trace_policy'] = SELFTEST_POLICY
                self.report['descendant_execs_observed_by_outer_custodian'] = False
                self.report['terminal_subreaper_retirement_required'] = True
            self._need(len(list(Path('/proc/self/task').iterdir())) == 1,
                       'HOLD_V45_OBSERVED_THREADS_PRESENT')
            self._need(signal.getsignal(signal.SIGCHLD) == signal.SIG_DFL,
                       'HOLD_V45_OBSERVED_SIGCHLD_POLICY')
            try:
                os.waitid(os.P_ALL, 0, os.WEXITED | os.WNOHANG | os.WNOWAIT)
            except ChildProcessError:
                pass
            else:
                raise CustodyHold('HOLD_V45_OBSERVED_PREEXISTING_CHILD')
            self._need(libc.prctl(36, 1, 0, 0, 0) == 0,
                       'HOLD_V45_OBSERVED_SUBREAPER_UNAVAILABLE')
            flag = ctypes.c_int()
            self._need(libc.prctl(37, ctypes.addressof(flag), 0, 0, 0) == 0 and flag.value == 1,
                       'HOLD_V45_OBSERVED_SUBREAPER_UNAVAILABLE')
            subreaper = True
            self._need(type(inherited_fds) is tuple and len(inherited_fds) <= (MAX_FDS - 8 if phase_io is not None else 16) and
                       len(set(inherited_fds)) == len(inherited_fds),
                       'HOLD_V45_OBSERVED_INPUT_FDS')
            for fd in inherited_fds:
                self._need(type(fd) is int and fd >= 3 and fd != source_fd,
                           'HOLD_V45_OBSERVED_INPUT_FDS')
                st = os.fstat(fd)
                access = fcntl.fcntl(fd, fcntl.F_GETFL) & os.O_ACCMODE
                self._need(stat.S_ISSOCK(st.st_mode) or
                           (stat.S_ISREG(st.st_mode) and (access == os.O_RDONLY or
                            (st.st_nlink == 0 and fcntl.fcntl(fd, fcntl.F_GET_SEALS) == 15))),
                           'HOLD_V45_OBSERVED_WRITABLE_REGULAR_INPUT')
            # Direct V45 producers execute a custodian-made sealed copy. The
            # four inherited static gates instead execute a duplicate of the
            # already-bound retained snapshot description so __file__.resolve()
            # remains inside the admitted source tree. No pathname reopen occurs.
            if source_profile == 'sealed-copy':
                source_copy = sealed_fd(source, 'void-v45-observed-source')
            else:
                source_copy = os.dup(source_fd)
                self._need(identity(os.fstat(source_copy)) == identity(os.fstat(source_fd)),
                           'HOLD_V45_OBSERVED_RETAINED_SOURCE_CHANGED')
            owned.append(source_copy)
            interpreter = os.open(str(Path(sys.executable).resolve()), os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
            owned.append(interpreter)
            interpreter_key = identity(os.fstat(interpreter))
            interpreter_hash = digest(read_fd(interpreter))
            devnull = os.open('/dev/null', os.O_RDONLY | os.O_CLOEXEC)
            owned.append(devnull)
            role_paths = {} if phase_io is None else phase_io['output_paths']
            stdout_role = None if phase_io is None else phase_io['stdout_role']
            role_streams = {role: ('stdout' if role == stdout_role else 'role:' + role)
                            for role in role_paths}
            stream_labels = ['stdout', 'stderr', *[v for v in role_streams.values() if v != 'stdout']]
            for label in stream_labels:
                r, w = os.pipe2(os.O_CLOEXEC)
                read_ends[label] = r
                write_ends.append(w)
                os.set_blocking(r, False)
            output_keys = [identity(os.fstat(fd))[:2] for fd in write_ends]
            argv = [sys.executable, '-I', '-S', '-B', f'/proc/self/fd/{source_copy}', *tail]
            env = {'PATH': os.defpath, 'LC_ALL': 'C.UTF-8', 'PYTHONDONTWRITEBYTECODE': '1'}
            extra_writers = tuple(write_ends[2:])
            if phase_io is not None:
                self._need(set(phase_io) == {'output_paths', 'stdout_role', 'env', 'cwd_fd'},
                           'HOLD_V45_OBSERVED_PHASE_IO')
                self._need(stat.S_ISDIR(os.fstat(phase_io['cwd_fd']).st_mode),
                           'HOLD_V45_OBSERVED_CWD')
                argv = ['python3', '-I', '-S', '-B', f'/proc/self/fd/{source_copy}', *tail]
                env.update(phase_io['env'])
                writers = dict(zip(stream_labels, write_ends))
                mapping = {path: (1 if role == stdout_role else writers[role_streams[role]])
                           for role, path in role_paths.items()}
                env.update(VOID_V45_OUTPUT_CUSTODY_V1='1', VOID_V45_OUTPUT_STREAMS_V1='1',
                           VOID_V45_OUTPUT_FDS=json.dumps(mapping, sort_keys=True, separators=(',', ':')))
                env.pop(ENV_CHANNEL, None)
            if helper_plan is not None:
                self._need(isinstance(helper_plan, ReadOnlyHelperPlan)
                           and phase_io is not None and helper_plan.phase == request['phase']
                           and helper_plan.cwd_key == identity(os.fstat(phase_io['cwd_fd']))[:2],
                           'HOLD_V45_HELPER_PLAN_CONTEXT')
                helper_plan.stable()
                env[ENV_HELPERS] = str(helper_plan.map_fd)
                inherited_fds = (*inherited_fds, *tuple(helper_plan.fds))
                self._need(len(inherited_fds) <= MAX_FDS, 'HOLD_V45_HELPER_FD_LIMIT')
                self.report.update(trace_policy=HELPER_POLICY,
                                   helper_plan={'format': HELPER_PLAN_FORMAT, 'phase': helper_plan.phase,
                                                'rows': helper_plan.rows},
                                   helper_plan_sha256=digest(canon({'format': HELPER_PLAN_FORMAT,
                                       'phase': helper_plan.phase, 'rows': helper_plan.rows})),
                                   helper_execs=helper_execs)
            self.report['executed_argv'] = argv
            self.report['entrypoint_fd'] = source_copy
            self.report['role_streams'] = role_streams
            # Capture all descriptors before fork in this single-threaded owner.
            inherited_snapshot = [int(n) for n in os.listdir('/proc/self/fd') if n.isdecimal()]
            deadline = time.monotonic() + timeout_ms/1000
            child = os.fork()
            if child == 0:
                try:
                    os.dup2(devnull, 0)
                    os.dup2(write_ends[0], 1)
                    os.dup2(write_ends[1], 2)
                    keep = {0, 1, 2, source_copy, interpreter, *inherited_fds, *extra_writers}
                    if phase_io is not None:
                        os.fchdir(phase_io['cwd_fd'])
                    for fd in inherited_snapshot:
                        if fd not in keep:
                            close(fd)
                    for fd in (source_copy, *inherited_fds, *extra_writers):
                        os.set_inheritable(fd, True)
                    # Only this owned child requests tracing by its direct parent.
                    trace(0, 0)  # PTRACE_TRACEME
                    os.kill(os.getpid(), signal.SIGSTOP)
                    os.execve(interpreter, argv, env)
                except BaseException:
                    os._exit(126)
            for fd in write_ends:
                close(fd)
            write_ends.clear()
            pidfd = os.pidfd_open(child, 0)
            initial = proc_identity(child)
            self._need(initial['ppid'] == os.getpid(), 'HOLD_V45_OBSERVED_PARENT')
            self.report.update(context=request['context'], phase=request['phase'],
                               producer=initial, custodian_pid=os.getpid(),
                               source_sha256=digest(source), argv_sha256=digest(canon({'argv': argv})),
                               interpreter_sha256=interpreter_hash,
                               producer_identity_independently_verified=True)
            self._event('PIDFD_RETAINED_BEFORE_EXEC', **initial)
            status = wait_stop(deadline)
            self._need(os.WIFSTOPPED(status) and os.WSTOPSIG(status) == signal.SIGSTOP,
                       'HOLD_V45_OBSERVED_INITIAL_STOP')
            # Auto-trace all fork/vfork/clone descendants before they can run.
            # Every tracee inherits TRACEEXEC and EXITKILL. No ATTACH/DETACH.
            trace_options = 0x10 | 0x00100000  # TRACEEXEC | EXITKILL
            if not selftest_profile:
                trace_options |= 0x02 | 0x04 | 0x08  # VFORK | CLONE | FORK
            if ledger is not None:
                self._need(not selftest_profile, 'HOLD_V45_SELFTEST_RESOURCE_PROFILE_UNSUPPORTED')
                trace_options |= 0x01  # TRACESYSGOOD
            trace(0x4200, child, trace_options)
            tracees[child] = {'identity': initial, 'pidfd': pidfd, 'stopped_once': True,
                              'exited': False, 'parent_pid': os.getpid()}
            self.report['initial_exec_count'] = 1
            trace(7, child)  # CONT
            status = wait_stop(deadline)
            self._need(os.WIFSTOPPED(status) and os.WSTOPSIG(status) == signal.SIGTRAP and
                       status >> 16 == 4, 'HOLD_V45_OBSERVED_EXEC_EVENT')
            self._need(proc_identity(child) == initial, 'HOLD_V45_OBSERVED_IDENTITY_CHANGED')
            self._need(identity(os.stat(f'/proc/{child}/exe')) == interpreter_key,
                       'HOLD_V45_OBSERVED_INTERPRETER_CHANGED')
            self._need(Path(f'/proc/{child}/cmdline').read_bytes() ==
                       b'\0'.join(a.encode() for a in argv) + b'\0',
                       'HOLD_V45_OBSERVED_EXEC_ARGV')
            for stream_fd, expected in zip((1, 2, *extra_writers), output_keys):
                actual = identity(os.stat(f'/proc/{child}/fd/{stream_fd}'))[:2]
                self._need(actual == expected, 'HOLD_V45_OBSERVED_STREAM_COUPLING')
            self._need(identity(os.stat(f'/proc/{child}/fd/{source_copy}')) == identity(os.fstat(source_copy)),
                       'HOLD_V45_OBSERVED_EXEC_SOURCE_FD')
            self.report.update(producer_exec_observed=True,
                               producer_output_capability_coupled=True,
                               exec_observation=('PTRACE_OWNED_TREE_UNTIL_EXIT_READONLY_HELPERS_V1'
                                                 if helper_plan is not None
                                                 else SELFTEST_EXEC_OBSERVATION
                                                 if selftest_profile
                                                 else 'PTRACE_OWNED_TREE_UNTIL_EXIT_RETAINED_SNAPSHOT_SINGLE_EXEC_V1'
                                                 if source_profile == 'retained-static'
                                                 else 'PTRACE_OWNED_TREE_UNTIL_EXIT_SINGLE_EXEC_V1'))
            self._event('EXEC_AND_STREAM_CAPABILITIES_OBSERVED')
            if ledger is not None:
                ledger.birth(initial, os.getpid(), initial=True)
                ledger.exec(child)
            trace(24 if ledger else 7, child)  # Same owner, syscall stops only in explicit capture mode.
            selector = selectors.DefaultSelector()
            for label, fd in read_ends.items():
                selector.register(fd, selectors.EVENT_READ, label)
            payloads = {label: bytearray() for label in stream_labels}
            eofs = set()
            root_exit_at = None

            def stopped(pid, status):
                """Consume kernel stops only for this owner's registered tree."""
                row = tracees[pid]
                event = status >> 16
                signo = os.WSTOPSIG(status)
                if event == 0 and signo == (signal.SIGTRAP | 0x80) and ledger is not None:
                    ledger.stop(libc, pid)
                    trace(24, pid)
                    return
                if event == 4:
                    if ledger is not None: ledger.exec(pid)
                    # Root re-exec, grandchild exec and any duplicate/extra helper
                    # remain refusals. Only a direct child gets its one exact exec.
                    if helper_plan is None or pid == child or row['parent_pid'] != child:
                        self.report['unadmitted_exec_count'] += 1
                        self._event('UNADMITTED_EXEC_STOP', pid=pid,
                                    parent_pid=row['parent_pid'], root_task=pid == child)
                        raise CustodyHold('HOLD_V45_OBSERVED_UNADMITTED_EXEC')
                    self._need(not row.get('helper_exec') and len(helper_execs) < len(helper_plan.rows),
                               'HOLD_V45_HELPER_EXEC_COUNT')
                    plan = helper_plan.rows[len(helper_execs)]
                    self._need(proc_identity(pid)['starttime_ticks'] == row['identity']['starttime_ticks'],
                               'HOLD_V45_OBSERVED_TRACE_GENERATION')
                    self._need(identity(os.stat(f'/proc/{pid}/exe')) == plan['executable_identity']
                               and executable_digest(plan['executable_fd']) == plan['executable_sha256'],
                               'HOLD_V45_HELPER_EXECUTABLE_MISMATCH')
                    self._need(Path(f'/proc/{pid}/cmdline').read_bytes() ==
                               b'\0'.join(a.encode() for a in plan['executed_argv']) + b'\0',
                               'HOLD_V45_HELPER_ARGV_MISMATCH')
                    self._need(identity(os.stat(f'/proc/{pid}/cwd'))[:2] == helper_plan.cwd_key,
                               'HOLD_V45_HELPER_CWD_MISMATCH')
                    for item in plan['input_bindings']:
                        self._need(identity(os.stat(f'/proc/{pid}/fd/{item["fd"]}')) == item['identity'],
                                   'HOLD_V45_HELPER_INPUT_MISMATCH')
                    expected_env = dict(env)
                    if plan['requested_argv'][0] == 'git':
                        expected_env.update(GIT_CONFIG_NOSYSTEM='1', GIT_CONFIG_GLOBAL='/dev/null',
                                            GIT_CONFIG_SYSTEM='/dev/null', GIT_OPTIONAL_LOCKS='0')
                    raw_env = Path(f'/proc/{pid}/environ').read_bytes()
                    self._need(len(raw_env) <= 128*1024 and raw_env.endswith(b'\0'),
                               'HOLD_V45_HELPER_ENVIRONMENT')
                    actual_pairs = raw_env[:-1].split(b'\0')
                    expected_pairs = [(key+'='+value).encode() for key,value in expected_env.items()]
                    self._need(sorted(actual_pairs) == sorted(expected_pairs), 'HOLD_V45_HELPER_ENVIRONMENT')
                    record = {'index': plan['index'], 'pid': pid, 'parent_pid': child,
                              'starttime_ticks': row['identity']['starttime_ticks'],
                              'executable_sha256': plan['executable_sha256'],
                              'argv_sha256': digest(canon({'argv': plan['executed_argv']})),
                              'environment_sha256': digest(canon(expected_env)),
                              'returncode': None}
                    row['helper_exec'] = record; helper_execs.append(record)
                    self._event('READONLY_HELPER_EXEC_OBSERVED', **{k:v for k,v in record.items() if k != 'returncode'})
                    trace(24 if ledger else 7, pid)
                    return
                self._need(proc_identity(pid)['starttime_ticks'] == row['identity']['starttime_ticks'],
                           'HOLD_V45_OBSERVED_TRACE_GENERATION')
                if event in (1, 2, 3):  # FORK, VFORK, CLONE
                    born = event_message(pid)
                    self._need(born > 0 and born not in tracees,
                               'HOLD_V45_OBSERVED_TRACE_BIRTH')
                    if event == 3:
                        # Thread/non-SIGCHLD clone profiles need their own contract.
                        # They remain stopped, never silently allowed to write.
                        self._event('UNADMITTED_CLONE_STOP', pid=pid, child_pid=born)
                        raise CustodyHold('HOLD_V45_OBSERVED_CLONE_PROFILE')
                    handle = os.pidfd_open(born, 0)
                    identity_row = proc_identity(born)
                    tracees[born] = {'identity': identity_row, 'pidfd': handle,
                                    'stopped_once': False, 'exited': False, 'parent_pid': pid}
                    self._need(identity_row['ppid'] == pid, 'HOLD_V45_OBSERVED_TRACE_PARENT')
                    self._need(len(tracees) <= 64, 'HOLD_V45_OBSERVED_TRACE_TASK_LIMIT')
                    if ledger is not None: ledger.birth(identity_row, pid)
                    self._event('OWNED_TASK_BIRTH', pid=born, parent_pid=pid,
                                starttime_ticks=identity_row['starttime_ticks'], kind=event)
                    if born in early_stops:
                        pending = early_stops.pop(born)
                        stopped(born, pending)
                    trace(24 if ledger else 7, pid)
                elif event != 0:
                    raise CustodyHold('HOLD_V45_OBSERVED_UNEXPECTED_TRACE_EVENT')
                elif not row['stopped_once']:
                    self._need(signo == signal.SIGSTOP, 'HOLD_V45_OBSERVED_CHILD_INITIAL_STOP')
                    row['stopped_once'] = True
                    trace(24 if ledger else 7, pid)
                else:
                    # Conservative handling of group-stop/trap semantics. Ordinary
                    # signal-delivery stops are forwarded, never silently dropped.
                    self._need(signo not in (signal.SIGSTOP, signal.SIGTSTP, signal.SIGTTIN,
                                             signal.SIGTTOU, signal.SIGTRAP),
                               'HOLD_V45_OBSERVED_UNADMITTED_SIGNAL_STOP')
                    trace(24 if ledger else 7, pid, signo)

            while True:
                now = time.monotonic()
                self._need(now < deadline, 'HOLD_V45_OBSERVED_EXECUTION_DEADLINE')
                # Drain kernel lifecycle events before considering output admission.
                for _ in range(256):
                    try:
                        pid, status = os.waitpid(-1, os.WNOHANG | self._WALL)
                    except ChildProcessError:
                        self._need(all(row['exited'] for row in tracees.values()),
                                   'HOLD_V45_OBSERVED_TRACE_LOST')
                        break
                    if pid == 0:
                        break
                    if not (ledger is not None and os.WIFSTOPPED(status)
                            and os.WSTOPSIG(status) == (signal.SIGTRAP | 0x80) and status >> 16 == 0):
                        trace_wait_count += 1
                    self._need(trace_wait_count <= 4096, 'HOLD_V45_OBSERVED_TRACE_EVENT_LIMIT')
                    if pid not in tracees:
                        if selftest_profile and (os.WIFEXITED(status) or os.WIFSIGNALED(status)):
                            reaped.append({'pid': pid, 'wait_status': status})
                            self._event('SELFTEST_ADOPTED_DESCENDANT_REAPED', pid=pid, wait_status=status)
                            continue
                        # The child's automatic stop may be reported before the
                        # parent's birth event. Never resume it until that birth
                        # binds its identity and parent under this owned tree.
                        self._need(os.WIFSTOPPED(status) and os.WSTOPSIG(status) == signal.SIGSTOP
                                   and status >> 16 == 0 and pid not in early_stops
                                   and len(early_stops) < 64, 'HOLD_V45_OBSERVED_UNBOUND_TRACE_TASK')
                        early_stops[pid] = status
                        continue
                    row = tracees[pid]
                    self._need(not row['exited'], 'HOLD_V45_OBSERVED_TRACE_REUSE')
                    if os.WIFSTOPPED(status):
                        stopped(pid, status)
                    elif os.WIFEXITED(status) or os.WIFSIGNALED(status):
                        if ledger is not None: ledger.exit(pid, status)
                        row['exited'] = True
                        row['wait_status'] = status
                        self._event('OWNED_TASK_EXIT', pid=pid, wait_status=status)
                        if row.get('helper_exec'):
                            row['helper_exec']['returncode'] = os.waitstatus_to_exitcode(status)
                            self._need(row['helper_exec']['returncode'] == 0, 'HOLD_V45_HELPER_NONZERO_EXIT')
                        if pid == child:
                            root_reaped = True
                            root_exit_at = time.monotonic()
                            returncode = os.waitstatus_to_exitcode(status)
                            self.report['producer_returncode'] = returncode
                            self._event('ROOT_REAPED', pid=pid, exit_status=returncode)
                            self._need(returncode == 0, 'HOLD_V45_OBSERVED_NONZERO_EXIT')
                    else:
                        raise CustodyHold('HOLD_V45_OBSERVED_UNEXPECTED_WAIT_STATUS')
                if root_reaped:
                    self._need(not early_stops and all(row['exited'] for row in tracees.values()),
                               'HOLD_V45_OBSERVED_LIVE_DESCENDANT')
                    self._need(children_empty(), 'HOLD_V45_OBSERVED_LIVE_DESCENDANT')
                    self.report['producer_subtree_retired'] = True
                    if selftest_profile:
                        self.report['terminal_subreaper_empty'] = True
                        self._event('SELFTEST_TERMINAL_SUBREAPER_EMPTY')
                    if len(eofs) == len(stream_labels):
                        break
                    self._need(time.monotonic() < root_exit_at + 0.25,
                               'HOLD_V45_OBSERVED_WRITABLE_STREAM_RETAINED')
                for key, _ in selector.select(max(0, min(0.00005 if ledger else 0.005, deadline-time.monotonic()))):
                    label = key.data
                    try:
                        part = os.read(key.fd, 65536)
                    except BlockingIOError:
                        continue
                    if not part:
                        eofs.add(label)
                        selector.unregister(key.fd)
                        close(key.fd)
                        read_ends.pop(label)
                        self._event('STREAM_EOF', stream=label)
                    else:
                        stream_counts[label] = stream_counts.get(label, 0) + len(part)
                        payloads[label].extend(part)
                        self._need(sum(map(len, payloads.values())) <= cap,
                                   'HOLD_V45_OBSERVED_OUTPUT_LIMIT')
            if helper_plan is not None:
                self._need(len(helper_execs) == len(helper_plan.rows)
                           and len(tracees) == 1 + len(helper_execs)
                           and all(item['returncode'] == 0 for item in helper_execs),
                           'HOLD_V45_HELPER_PLAN_INCOMPLETE')
                helper_plan.stable()
                self.report['readonly_helper_plan_completed'] = True
            self.report['producer_exec_lifetime_verified'] = True
            self.report['trace_wait_events'] = trace_wait_count
            self.report['observed_task_count'] = len(tracees)
            self.report['observed_task_exits'] = len(tracees)
            self.report['observed_subtree_exec_count'] = 1 + len(helper_execs)
            if selftest_profile:
                self.report['observed_subtree_exec_count_scope'] = 'outer_owned_root_only'
            self._event('OWNED_TREE_TRACE_COMPLETE', tasks=len(tracees), admitted_execs=1 + len(helper_execs))
            self.report['output_streams_retired'] = True
            self.report['stream_bindings'] = {k: {'bytes': len(v), 'sha256': digest(bytes(v))}
                                              for k, v in payloads.items()}
            self._payloads = {k: bytes(v) for k, v in payloads.items()}
            self.report['adopted_children_reaped'] = reaped
            self._event('SUBTREE_EMPTY_AND_STREAMS_CLOSED')
            self.state = 'VERIFIED'
        except (CustodyHold, OSError, ValueError, TypeError, KeyError) as exc:
            failure = exc if isinstance(exc, CustodyHold) else CustodyHold('HOLD_V45_OBSERVED_OS_OR_INPUT')
            self.state = 'HOLD'
            self._payloads = None
            self.report.update(status='HOLD', code=failure.code, local_stream_take_permitted=False)
        finally:
            if selector is not None:
                selector.close()
            for fd in [*read_ends.values(), *write_ends]:
                close(fd)
            # Every process handle below came from our fork or a kernel birth
            # event. Close the tree on refusal before reaping the root.
            if failure is not None:
                for row in tracees.values():
                    if not row['exited']:
                        try: signal.pidfd_send_signal(row['pidfd'], signal.SIGKILL)
                        except ProcessLookupError: pass
            # Kill only a process anchored by our own retained pidfd. An input
            # PID, a process group, or an SCM_RIGHTS receiver is never signaled.
            if pidfd is not None and not root_reaped:
                try:
                    signal.pidfd_send_signal(pidfd, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                end = time.monotonic() + 1.0
                while time.monotonic() < end:
                    try:
                        pid, status = os.waitpid(child, os.WNOHANG | self._WALL)
                    except ChildProcessError:
                        root_reaped = True
                        break
                    if pid and (os.WIFEXITED(status) or os.WIFSIGNALED(status)):
                        root_reaped = True
                        break
                    time.sleep(0.002)
            if pidfd is not None:
                close(pidfd)
            # A subreaper owns any surviving descendants. Pin and verify each
            # adopted direct child before signaling; never use an unbound PID.
            empty = child is None
            if subreaper:
                end = time.monotonic() + 1.0
                while time.monotonic() < end:
                    try:
                        if children_empty():
                            empty = True
                            break
                        # The proc task/children file is optional on kernels
                        # without CONFIG_CHECKPOINT_RESTORE. Enumeration here
                        # discovers cleanup candidates only; waitid below is
                        # the child-relation authority, and ECHILD above is the
                        # retirement authority. A /proc snapshot is not a census.
                        direct = []
                        seen = 0
                        with os.scandir('/proc') as entries:
                            for entry in entries:
                                if not entry.name.isdecimal():
                                    continue
                                seen += 1
                                self._need(seen <= 2048, 'HOLD_V45_OBSERVED_CLEANUP_SCAN_BOUND')
                                try:
                                    relation = proc_identity(int(entry.name))
                                except (FileNotFoundError, ProcessLookupError, PermissionError):
                                    continue
                                if relation['ppid'] == os.getpid():
                                    direct.append(entry.name)
                        self._need(len(direct) <= 64, 'HOLD_V45_OBSERVED_CLEANUP_BOUND')
                        for item in direct:
                            handle = None
                            try:
                                handle = os.pidfd_open(int(item), 0)
                                # waitid is a kernel child-relation check before kill.
                                os.waitid(os.P_PIDFD, handle, os.WEXITED | os.WNOHANG | os.WNOWAIT)
                                signal.pidfd_send_signal(handle, signal.SIGKILL)
                            except (ProcessLookupError, ChildProcessError):
                                pass
                            finally:
                                if handle is not None:
                                    close(handle)
                    except (OSError, CustodyHold) as cleanup_exc:
                        self.report['cleanup_error'] = {'type': type(cleanup_exc).__name__, 'errno': getattr(cleanup_exc, 'errno', None), 'code': getattr(cleanup_exc, 'code', None)}
                        break
                    time.sleep(0.002)
            for pid, row in tracees.items():
                if pid != child:
                    close(row['pidfd'])
            for fd in owned:
                close(fd)
            self.report['cleanup_complete'] = empty
            if not empty:
                self.state = 'HOLD'
                self._payloads = None
                failure = CustodyHold('HOLD_V45_OBSERVED_CLEANUP_INCOMPLETE')
                self.report.update(status='HOLD', code=failure.code, local_stream_take_permitted=False)
            elif self.state == 'VERIFIED':
                self.report.update(status='VERIFIED', local_stream_take_permitted=True)
        if ledger is not None:
            self.report['resource_ledger'] = ledger.report(terminal=self.state,
                stream_bindings=self.report.get('stream_bindings',
                    {k:{'bytes':v,'sha256':None} for k,v in stream_counts.items()}),
                cleanup_complete=self.report.get('cleanup_complete',False))
        if failure is not None:
            failure.observation = self.report
            raise failure
        return dict(self.report)


def serve(ns) -> int:
    context = read_sealed(ns.context_fd); expected_source = context.pop('custodian_source_sha256')
    require(digest(read_fd(ns.source_fd)) == expected_source and fcntl.fcntl(ns.source_fd,fcntl.F_GET_SEALS)==15,
            'HOLD_V45_CUSTODY_SOURCE_BINDING')
    custodian = Custodian(context, capture_resources=bool(getattr(ns, 'capture_resources', False))); sock = socket.socket(fileno=ns.channel_fd); sock.settimeout(5400)
    try:
        send(sock, {'status':'STARTED','pid':os.getpid(),'context':context})
        while True:
            msg,fds=receive(sock); transferred=False
            try:
                op=msg.get('op')
                if op=='PREPARE': result=custodian.prepare(msg,fds); transferred=True; send(sock,result)
                elif op=='LAUNCH':
                    result,fd=custodian.launch(msg,fds)
                    try:send(sock,result,[fd])
                    finally:os.close(fd)
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
        previous_timeout=self.sock.gettimeout()
        try:
            if op=='LAUNCH':
                requested=fields.get('timeout_ms',600000)
                self.sock.settimeout(max(630,min(RUNNER_TIMEOUT_MAX_MS,requested)/1000+30))
            send(self.sock,{'op':op,**fields},fds);msg,returned=receive(self.sock)
        finally:self.sock.settimeout(previous_timeout)
        if msg.get('status')=='HOLD':
            for fd in returned:os.close(fd)
            raise CustodyHold(msg.get('code','HOLD_V45_CUSTODY_REJECTED'))
        return msg,returned
    def close(self):self.sock.close()


_STREAM_WRITES = set()

def write_stream_output(path: Path, data: bytes) -> None:
    """Write a declared pipe once; no seek/fsync or evidence pathname fallback."""
    require(os.environ.get('VOID_V45_OUTPUT_STREAMS_V1') == '1', 'HOLD_V45_STREAM_MODE_REQUIRED')
    mapping = strict(os.environ['VOID_V45_OUTPUT_FDS'].encode())
    fd = mapping.get(str(path))
    require(type(fd) is int and fd >= 1 and str(path) not in _STREAM_WRITES, 'HOLD_V45_STREAM_OUTPUT_CONTRACT')
    st = os.fstat(fd)
    require(stat.S_ISFIFO(st.st_mode) and (fcntl.fcntl(fd, fcntl.F_GETFL) & os.O_ACCMODE) == os.O_WRONLY,
            'HOLD_V45_STREAM_OUTPUT_SHAPE')
    require(type(data) is bytes and len(data) <= MAX_FILE, 'HOLD_V45_STREAM_OUTPUT_SIZE')
    _STREAM_WRITES.add(str(path))
    at = 0
    while at < len(data):
        n = os.write(fd, data[at:]); require(n > 0, 'HOLD_V45_STREAM_OUTPUT_WRITE'); at += n
    require(identity(os.fstat(fd))[:2] == identity(st)[:2], 'HOLD_V45_STREAM_OUTPUT_CHANGED')

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


# Explicit local journal-worker boundary. The observer follows the worker's
# two mandatory source-generation Git queries. For the two bookkeeping focus
# scenarios it retains process-creation tracing through root retirement and
# rejects any post-query child, proving a complete descendant census there.
# Other scenarios still drop TRACEFORK/VFORK before scenario execution so
# nested custody owners remain authoritative for later producer processes.
WORKER_OBSERVER_FORMAT = 'VOID_V45_JOURNAL_WORKER_OBSERVATION_V3'
WORKER_OBSERVER_PROFILE = 'OWNED_CASE_ROOT_THREADS_SOURCE_QUERIES_AND_FOCUS_CHILD_CENSUS_V3'


def invocation_observer_trace_start():
    """Offer this fixed observer to its launching parent before case setup."""
    import ctypes, signal
    require(sys.platform == 'linux' and os.uname().machine == 'x86_64',
            'HOLD_V45_OBSERVER_TRACE_PLATFORM')
    parent = os.getppid()
    lib = ctypes.CDLL(None, use_errno=True)
    require(lib.prctl(1, signal.SIGKILL, 0, 0, 0) == 0 and os.getppid() == parent,
            'HOLD_V45_OBSERVER_TRACE_PARENT')
    require(lib.ptrace(0, 0, None, None) == 0, 'HOLD_V45_OBSERVER_TRACE_TRACEME')
    os.kill(os.getpid(), signal.SIGSTOP)


class InvocationExitDescriptors:
    """Metadata for local FD-table entries at a stopped process's exit syscall.

    Device/inode/type/access mode identify the referenced object metadata, not
    a unique open file description or copies retained by another process.
    """
    @staticmethod
    def binding(fd, slot):
        st=os.fstat(fd)
        return {'fd':slot,'device':st.st_dev,'inode':st.st_ino,
                'file_type':stat.S_IFMT(st.st_mode),
                'access_mode':fcntl.fcntl(fd,fcntl.F_GETFL)&os.O_ACCMODE}

    @classmethod
    def standard(cls, stdin_fd, stdout_fd, stderr_fd):
        return [cls.binding(fd,slot) for slot,fd in enumerate((stdin_fd,stdout_fd,stderr_fd))]

    @classmethod
    def inherited_standard(cls):
        import errno
        # scandir's own descriptor is present while enumeration is open. It
        # must be the only fourth entry and must be closed before fork.
        names=[]
        with os.scandir('/proc/self/fd') as entries:
            for entry in entries:
                require(entry.name.isdecimal() and len(names)<64,'HOLD_V45_EXIT_FD_INHERITANCE')
                names.append(int(entry.name))
        require(len(names)==4 and {0,1,2}.issubset(names),'HOLD_V45_EXIT_FD_INHERITANCE')
        scanner=next(iter(set(names)-{0,1,2}))
        try:os.fstat(scanner)
        except OSError as exc:
            require(exc.errno==errno.EBADF,'HOLD_V45_EXIT_FD_ENUMERATION_CLOSE')
        else:raise CustodyHold('HOLD_V45_EXIT_FD_ENUMERATION_CLOSE')
        return cls.standard(0,1,2)

    @staticmethod
    def read_small(path):
        with path.open('rb') as stream:raw=stream.read(8193)
        require(len(raw)<=8192,'HOLD_V45_EXIT_FD_PROCFS_SIZE')
        return raw.decode('utf-8',errors='strict')

    @classmethod
    def snapshot(cls, identity, expected, syscall):
        import time
        require(type(identity) is dict and type(identity.get('pid')) is int and identity['pid']>0
                and syscall in (60,231) and type(expected) is list and len(expected)==3,
                'HOLD_V45_EXIT_FD_REQUEST')
        started=time.monotonic_ns();root=Path('/proc')/str(identity['pid'])
        def process():
            raw=cls.read_small(root/'stat');fields=raw[raw.rfind(')')+2:].split()
            return {'pid':int(raw.split(' ',1)[0]),'parent_pid':int(fields[1]),'starttime_ticks':int(fields[19])}
        def stopped():
            fields=dict(line.split(':',1) for line in cls.read_small(root/'status').splitlines() if ':' in line)
            require(int(fields['TracerPid'])==os.getpid() and int(fields['Threads'])==1
                    and fields['State'].split()[0]=='t','HOLD_V45_EXIT_FD_NOT_SINGLE_TRACEE')
        def numbers():
            values=[]
            with os.scandir(root/'fd') as entries:
                for entry in entries:
                    require(entry.name.isdecimal() and len(values)<64,'HOLD_V45_EXIT_FD_TABLE_LIMIT')
                    values.append(int(entry.name))
            return sorted(values)
        require(process()==identity,'HOLD_V45_EXIT_FD_GENERATION');stopped()
        before=numbers();require(before==[0,1,2],'HOLD_V45_EXIT_FD_UNEXPECTED_ENTRY')
        rows=[]
        for fd in before:
            st=os.stat(root/'fd'/str(fd))
            fields=dict(line.split(':',1) for line in cls.read_small(root/'fdinfo'/str(fd)).splitlines() if ':' in line)
            rows.append({'fd':fd,'device':st.st_dev,'inode':st.st_ino,'file_type':stat.S_IFMT(st.st_mode),
                         'access_mode':int(fields['flags'].strip(),8)&os.O_ACCMODE})
        require(rows==expected,'HOLD_V45_EXIT_FD_OBJECT_CHANGED')
        require(numbers()==before and process()==identity,'HOLD_V45_EXIT_FD_SNAPSHOT_CHANGED');stopped()
        record={'format':'VOID_V45_EXIT_DESCRIPTOR_SNAPSHOT_V1','process':identity,'syscall':syscall,
            'snapshot_started_ns':started,'snapshot_completed_ns':time.monotonic_ns(),'descriptors':rows,
            'scope':'single_stopped_process_fd_table_at_exit_syscall_entry',
            'table_complete_at_stop':True,'open_file_description_identity_proved':False,
            'other_process_copies_retired':False,'kernel_close_duration_ns':None,'exact_fd_peak':None,
            'complete_descriptor_ledger':False}
        record['snapshot_sha256']=digest(canon(record))
        return record


class InvocationObserverTrace:
    """Recorder-side telemetry for its one Popen observer, never its worker.

    The child opts in through TRACEME. There is no attach, memory/register
    access, descendant tracing, or command/PID input exposed to an operator.
    Interpreter startup and the recorder's own syscalls remain outside scope.
    """
    LIMIT = 600000
    SIGNAL_LIMIT = 200000
    EVENT_BYTES_LIMIT = 32*1024*1024
    # Exact FD-table accounting is deliberately restricted to the syscall
    # surface observed in these two bookkeeping cases. An unexpected syscall
    # refuses the proof instead of inheriting an unreviewed FD effect.
    FD_ADD_ONE = frozenset((2,32,41,43,85,213,240,253,257,283,284,288,290,291,294,298,300,304,319,323,425,428,430,432,433,434,437,438,447))
    FD_ADD_TWO = frozenset((22,53,293))
    FD_RESYNC = frozenset((16,33,47,56,72,282,289,292,299,317,321,435,436,444))
    FD_NEUTRAL = frozenset((0,1,5,7,8,9,10,11,12,13,14,17,38,39,44,46,51,55,57,58,61,63,74,83,89,98,101,102,110,157,217,230,231,262,270,318))
    FD_ALLOWED = FD_ADD_ONE | FD_ADD_TWO | FD_RESYNC | FD_NEUTRAL | frozenset((3,))

    def __init__(self, request, launch_ns):
        import ctypes
        self.request = request
        self.expected_exit_descriptors = self.exit_snapshot = None
        self.launch_ns = launch_ns
        self.proc = self.pidfd = self.observer = self.worker = None
        self.started_ns = self.terminal_ns = self.wait_status = self.usage = None
        self.pending = None
        self.entries = self.exits = self.leading_exits = self.stops = 0
        self.histogram = {}; self.signals = {}; self.signal_count = 0
        self.signal_senders = {}; self.last_stop = None
        self.refusal = None; self.aborted = False
        self.sequence = 0; self.hash = hashlib.sha256()
        self.event_stream = None; self.event_bytes = 0; self.event_hash = hashlib.sha256()
        self.events_closed = False; self.kernel_identity = None; self.wait_receipts = 0
        self.fd_count_initial = self.fd_current = None; self.fd_sample_count = 0; self.fd_peak = 0
        self.lib = ctypes.CDLL(None, use_errno=True)
        self.lib.ptrace.argtypes = (ctypes.c_uint, ctypes.c_int, ctypes.c_void_p, ctypes.c_void_p)
        self.lib.ptrace.restype = ctypes.c_long

    def bind(self, proc):
        require(self.proc is None, 'HOLD_V45_OBSERVER_TRACE_REUSE')
        self.proc = proc  # Retain ownership even if pidfd acquisition fails.
        self.pidfd = os.pidfd_open(proc.pid)

    def trace(self, op, addr=0, data=0):
        import ctypes
        ctypes.set_errno(0)
        value = self.lib.ptrace(op, self.proc.pid, ctypes.c_void_p(addr), ctypes.c_void_p(data))
        require(value >= 0, 'HOLD_V45_OBSERVER_TRACE_PTRACE')
        return value

    @staticmethod
    def process(pid):
        raw = Path(f'/proc/{pid}/stat').read_text()
        fields = raw[raw.rfind(')')+2:].split()
        require(int(raw.split(' ', 1)[0]) == pid, 'HOLD_V45_OBSERVER_TRACE_PROCFS')
        return {'pid':pid, 'parent_pid':int(fields[1]), 'starttime_ticks':int(fields[19])}

    def sample_fds(self):
        # /proc is used only for the initial table and successful syscalls whose
        # exact FD delta depends on arguments or returned control messages. All
        # other changes are replayed arithmetically from syscall returns.
        require(self.observer is not None and self.proc is not None
                and self.process(self.proc.pid) == self.observer,
                'HOLD_V45_OBSERVER_FD_SAMPLE_PROCESS')
        count = 0
        with os.scandir(f'/proc/{self.proc.pid}/fd') as entries:
            for entry in entries:
                require(entry.name.isdecimal() and count < 256,
                        'HOLD_V45_OBSERVER_FD_SAMPLE_LIMIT')
                count += 1
        require(count >= 3, 'HOLD_V45_OBSERVER_FD_SAMPLE_MINIMUM')
        self.fd_sample_count += 1
        if self.fd_count_initial is None:
            self.fd_count_initial = count
        self.fd_current = count
        self.fd_peak = max(self.fd_peak, count)
        return count

    def account_fd_return(self, nr, value, error):
        require(self.fd_current is not None and nr in self.FD_ALLOWED,
                'HOLD_V45_OBSERVER_FD_ACCOUNTING_SYSCALL')
        if error:
            return self.fd_current, False
        if nr == 3:
            self.fd_current -= 1
        elif nr in self.FD_ADD_ONE:
            self.fd_current += 1
        elif nr in self.FD_ADD_TWO:
            self.fd_current += 2
        elif nr in self.FD_RESYNC:
            return self.sample_fds(), True
        else:
            require(nr in self.FD_NEUTRAL, 'HOLD_V45_OBSERVER_FD_ACCOUNTING_CLASS')
        require(3 <= self.fd_current <= 256, 'HOLD_V45_OBSERVER_FD_ACCOUNTING_RANGE')
        self.fd_peak = max(self.fd_peak, self.fd_current)
        return self.fd_current, False

    def open_events(self, path, kernel_identity):
        require(self.proc is not None and self.event_stream is None and self.event_bytes == 0,
                'HOLD_V45_OBSERVER_EVENTS_REUSE')
        require(path.name == 'observer-events.jsonl', 'HOLD_V45_OBSERVER_EVENTS_PATH')
        # Called after Popen: this recorder-owned writer is never inherited.
        self.event_stream = path.open('xb')
        self.kernel_identity = kernel_identity
        self.write_event_bytes(canon({'format':'VOID_V45_OBSERVER_EVENTS_V3',
            'request':self.request,'observer_pid':self.proc.pid,'launch_ns':self.launch_ns,
            'kernel_identity':kernel_identity}))

    def write_event_bytes(self, raw):
        require(self.event_stream is not None and not self.events_closed
                and len(raw)<=8192 and self.event_bytes+len(raw)<=self.EVENT_BYTES_LIMIT,
                'HOLD_V45_OBSERVER_EVENTS_LIMIT')
        require(self.event_stream.write(raw)==len(raw), 'HOLD_V45_OBSERVER_EVENTS_WRITE')
        self.event_bytes += len(raw); self.event_hash.update(raw)

    def event(self, kind, **fields):
        import time
        raw=canon({'sequence':self.sequence+1,'kind':kind,'recorded_ns':time.monotonic_ns(),**fields})
        self.write_event_bytes(raw)
        self.sequence += 1; self.hash.update(raw)

    def finish_events(self):
        if self.event_stream is None:
            return
        stream=self.event_stream;self.event_stream=None
        try:
            stream.flush();os.fsync(stream.fileno())
        finally:
            stream.close()
        self.events_closed=True

    def pump(self):
        """Consume at most one stop; the recorder also services report/fixture IO."""
        import ctypes, signal, struct, time
        if self.proc is None or self.wait_status is not None:
            return False
        try:
            pid, status, usage = os.wait4(self.proc.pid, os.WNOHANG)
            if pid == 0:
                return False
            require(pid == self.proc.pid, 'HOLD_V45_OBSERVER_TRACE_WAIT_PID')
            waited_ns=time.monotonic_ns()
            if os.WIFEXITED(status) or os.WIFSIGNALED(status):
                # Consume the wait before callbacks/validation; never reap twice.
                self.wait_status = status; self.usage = usage
                self.terminal_ns = waited_ns
                self.proc.returncode = os.waitstatus_to_exitcode(status)
                self.event('wait',wait_status=status,wait_ns=waited_ns);self.wait_receipts+=1
                self.event('terminal', wait_status=status, time_ns=self.terminal_ns)
                return True
            self.event('wait',wait_status=status,wait_ns=waited_ns);self.wait_receipts+=1
            require(os.WIFSTOPPED(status), 'HOLD_V45_OBSERVER_TRACE_WAIT')
            stop = os.WSTOPSIG(status)
            self.last_stop = {'signal':stop, 'ptrace_event':status>>16, 'wait_status':status}
            if self.started_ns is None:
                require(stop == signal.SIGSTOP and status>>16 == 0, 'HOLD_V45_OBSERVER_TRACE_INITIAL_STOP')
                self.observer = self.process(pid)
                require(self.observer['parent_pid'] == os.getpid(), 'HOLD_V45_OBSERVER_TRACE_PARENT')
                # Never inherit tracing into the observer's worker.
                self.trace(0x4200, data=0x1|0x100000)
                self.started_ns = time.monotonic_ns()
                fd_count = self.sample_fds()
                self.event('initial-stop', observer=self.observer, time_ns=self.started_ns,
                           fd_count=fd_count)
            elif stop != signal.SIGTRAP|0x80 or status>>16 != 0:
                require(status>>16 == 0 and stop in (signal.SIGCHLD, signal.SIGALRM),
                        'HOLD_V45_OBSERVER_TRACE_SIGNAL')
                info = ctypes.create_string_buffer(128)
                self.trace(0x4202, data=ctypes.addressof(info))
                signo, error, code = struct.unpack_from('=iii', info.raw)
                sender, uid, child_status = struct.unpack_from('=iIi', info.raw, 16)
                require(signo == stop and error == 0 and self.signal_count < self.SIGNAL_LIMIT,
                        'HOLD_V45_OBSERVER_TRACE_SIGNAL_INFO')
                if stop == signal.SIGCHLD:
                    require(self.worker is not None and code in (1,2,3,4,5,6) and uid == os.getuid(),
                            'HOLD_V45_OBSERVER_TRACE_CHILD_SIGNAL')
                    if sender not in self.signal_senders:
                        if sender == self.worker['pid']:
                            self.signal_senders[sender] = {**self.worker,'thread_group_id':sender}
                        else:
                            # A traced worker thread or one of the two bounded
                            # direct source-query processes can notify its tracer.
                            # Bind only an inspectable traced generation. The
                            # final worker observation independently reconciles
                            # any direct-process sender to its measured handoff.
                            require(code == 4 and len(self.signal_senders) < 67,
                                    'HOLD_V45_OBSERVER_TRACE_SIGNAL_TASK')
                            identity = self.process(sender)
                            fields = dict(line.split(':',1) for line in Path(f'/proc/{sender}/status').read_text().splitlines() if ':' in line)
                            tgid = int(fields['Tgid']); tracer = int(fields['TracerPid'])
                            direct = (tgid == sender and identity['parent_pid'] == self.worker['pid'])
                            thread = (tgid == self.worker['pid'])
                            direct_seen = sum(v['pid'] != self.worker['pid'] and v['thread_group_id'] == v['pid']
                                              for v in self.signal_senders.values())
                            require(tracer == pid and self.process(sender) == identity
                                    and (thread or direct) and (not direct or direct_seen < 2),
                                    'HOLD_V45_OBSERVER_TRACE_SIGNAL_TASK')
                            self.signal_senders[sender] = {**identity,'thread_group_id':tgid}
                else:
                    require(code == 128 and sender == 0, 'HOLD_V45_OBSERVER_TRACE_ALARM')
                self.trace(24, data=stop)  # Preserve delivery; counts stay separate.
                self.signal_count += 1
                key = f'{stop}:{code}:{sender}:{child_status}'
                self.signals[key] = self.signals.get(key,0)+1
                self.event('signal', signal=stop, code=code, sender=sender, child_status=child_status,
                           uid=uid,sender_identity=self.signal_senders.get(sender),delivery_preserved=True)
                return True
            else:
                require(self.stops < self.LIMIT, 'HOLD_V45_OBSERVER_TRACE_LIMIT')
                buffer = ctypes.create_string_buffer(128)
                count = self.trace(0x420e, addr=128, data=ctypes.addressof(buffer))
                op = buffer.raw[0]
                require(33 <= count <= 128 and op in (1,2) and struct.unpack_from('=I',buffer.raw,4)[0] == 0xc000003e,
                        'HOLD_V45_OBSERVER_TRACE_ABI')
                if op == 1:
                    require(count >= 80 and self.pending is None, 'HOLD_V45_OBSERVER_TRACE_PAIR')
                    nr = struct.unpack_from('=Q',buffer.raw,24)[0]
                    require(nr < 0x40000000 and nr in self.FD_ALLOWED, 'HOLD_V45_OBSERVER_TRACE_ABI')
                    require(str(nr) in self.histogram or len(self.histogram)<1024,
                            'HOLD_V45_OBSERVER_TRACE_HISTOGRAM')
                    self.pending = nr; self.entries += 1
                    self.histogram.setdefault(str(nr),{'entries':0,'exits':0,'errors':0})['entries'] += 1
                    self.event('enter', nr=nr,info_bytes=count,audit_arch=0xc000003e)
                    if nr in (60,231):
                        require(self.exit_snapshot is None,'HOLD_V45_OBSERVER_EXIT_FD_REUSE')
                        self.exit_snapshot=InvocationExitDescriptors.snapshot(self.observer,self.expected_exit_descriptors,nr)
                        self.event('exit-descriptors',snapshot_sha256=self.exit_snapshot['snapshot_sha256'])
                else:
                    returned = struct.unpack_from('=q',buffer.raw,24)[0]; error = buffer.raw[32]
                    nr = self.pending
                    require(error in (0,1), 'HOLD_V45_OBSERVER_TRACE_RETURN')
                    if self.pending is None:
                        require(self.stops == 0 and self.leading_exits == 0 and returned == 0 and error == 0,
                                'HOLD_V45_OBSERVER_TRACE_UNPAIRED_RETURN')
                        self.leading_exits = 1
                    else:
                        nr = self.pending; self.pending = None; self.exits += 1
                        self.histogram[str(nr)]['exits'] += 1
                        self.histogram[str(nr)]['errors'] += error
                        if nr in (56,57,58,435) and error == 0 and returned > 0:
                            require(self.worker is None, 'HOLD_V45_OBSERVER_TRACE_EXTRA_CHILD')
                            identity = self.process(returned)
                            require(identity['parent_pid'] == pid, 'HOLD_V45_OBSERVER_TRACE_WORKER_PARENT')
                            self.worker = identity
                            self.event('worker-return', worker=identity)
                    if nr is None:
                        require(self.fd_current is not None, 'HOLD_V45_OBSERVER_FD_ACCOUNTING_INITIAL')
                        fd_count, fd_resync = self.fd_current, False
                    else:
                        fd_count, fd_resync = self.account_fd_return(nr,returned,error)
                    self.event('return', nr=nr, value=returned, error=error,info_bytes=count,
                               audit_arch=0xc000003e,fd_count=fd_count,fd_resync=fd_resync)
                self.stops += 1
            self.trace(24)
            return True
        except (CustodyHold, OSError, ValueError, KeyError) as exc:
            self.refusal = getattr(exc,'code','HOLD_V45_OBSERVER_TRACE_IO')
            raise

    def terminal(self, deadline_ns):
        import time
        while self.wait_status is None:
            require(time.monotonic_ns() < deadline_ns, 'HOLD_V45_OBSERVER_TRACE_DEADLINE')
            if not self.pump():
                time.sleep(0.0001)
        return self.wait_status, self.usage, self.terminal_ns

    def abort(self):
        """Terminate/reap only our launched observer; no subtree claim."""
        import signal, time
        if self.proc is None or self.wait_status is not None:
            return
        self.aborted = True
        try:
            if self.pidfd is not None:
                signal.pidfd_send_signal(self.pidfd,signal.SIGKILL)
            else:
                os.kill(self.proc.pid,signal.SIGKILL)
        except ProcessLookupError:
            pass
        deadline = time.monotonic_ns()+3_000_000_000
        while self.wait_status is None:
            require(time.monotonic_ns()<deadline, 'HOLD_V45_OBSERVER_TRACE_ABORT_DEADLINE')
            got,status,usage = os.wait4(self.proc.pid,os.WNOHANG)
            if not got:
                time.sleep(0.0001);continue
            require(got == self.proc.pid, 'HOLD_V45_OBSERVER_TRACE_ABORT_PID')
            if os.WIFEXITED(status) or os.WIFSIGNALED(status):
                self.wait_status=status;self.usage=usage;self.terminal_ns=time.monotonic_ns()
                self.proc.returncode=os.waitstatus_to_exitcode(status)
            elif os.WIFSTOPPED(status):
                self.trace(7,data=signal.SIGKILL)
            else:
                raise CustodyHold('HOLD_V45_OBSERVER_TRACE_ABORT_WAIT')

    def report(self):
        expected_fd_samples = 1 + sum(row['exits']-row['errors'] for nr,row in self.histogram.items()
                                      if int(nr) in self.FD_RESYNC)
        complete = (self.started_ns is not None and self.wait_status is not None and
                    self.proc.returncode == 0 and self.refusal is None and not self.aborted
                    and self.pending in (60,231) and self.entries == self.exits+1 and self.exit_snapshot is not None
                    and self.fd_count_initial is not None
                    and self.fd_sample_count == expected_fd_samples
                    and self.fd_peak >= self.fd_count_initial >= 3 and self.fd_current == 3
                    and self.events_closed)
        out = {'format':'VOID_V45_OBSERVER_SYSCALL_WINDOW_V5', **self.request,
            'kernel_identity':self.kernel_identity,
            'event_stream':{'format':'VOID_V45_OBSERVER_EVENTS_V3','path':'observer-events.jsonl',
                'bytes':self.event_bytes,'sha256':self.event_hash.hexdigest(),'closed':self.events_closed,
                'wait_receipts':self.wait_receipts},
            'scope':'observer_initial_protocol_stop_through_terminal_wait',
            'observer':self.observer,'worker_excluded':self.worker,
            'expected_exit_descriptors':self.expected_exit_descriptors,'exit_descriptor_snapshot':self.exit_snapshot,
            'process_local_exit_fds_retired':complete,
            'launch_ns':self.launch_ns,'initial_stop_ns':self.started_ns,'terminal_ns':self.terminal_ns,
            'wait_status':self.wait_status,'syscall_entries':self.entries,'syscall_exits':self.exits,
            'syscall_stops':self.stops,'initial_unpaired_exit':self.leading_exits,
            'terminal_syscall_entry':self.pending,'histogram':self.histogram,
            'signal_stops':self.signal_count,'signal_histogram':self.signals,
            'signal_senders':list(self.signal_senders.values()),'signal_delivery_preserved':True,
            'capture_complete_for_scope':complete,'refusal':self.refusal,'aborted':self.aborted,
            'last_stop':self.last_stop,'ordered_event_count':self.sequence,'ordered_event_sha256':self.hash.hexdigest(),
            'pre_initial_stop_syscalls':None,'recorder_syscalls':None,
            'fd_count_initial':self.fd_count_initial,'fd_count_at_terminal_entry':self.fd_current,
            'fd_sample_count':self.fd_sample_count,
            'fd_measurement':'exact_single_process_fd_table_peak_from_traced_fd_transitions_with_proc_resync',
            'exact_fd_peak':self.fd_peak if complete else None,
            'worker_syscalls_included':False,'nested_syscalls_included':False,
            'complete_resource_ledger':False,'whole_case_complete':False,'full_campaign_accepted':False}
        out['window_sha256']=digest(canon(out))
        return out

    def close(self):
        try:
            self.finish_events()
        finally:
            if self.pidfd is not None:
                fd=self.pidfd;self.pidfd=None;os.close(fd)


class InvocationObserverChannel:
    """Framed local stream with scoped ownership of every received descriptor.

    This is only the recorder/observer channel. The existing custody protocol
    and case fixture transports are unchanged. Stream EOF is unambiguous;
    a zero-length sequenced packet cannot stand in for an empty receive queue.
    """
    def __init__(self, sock):
        require(sock.family == socket.AF_UNIX and
                sock.getsockopt(socket.SOL_SOCKET, socket.SO_TYPE) == socket.SOCK_STREAM,
                'HOLD_V45_OBSERVER_CHANNEL_TRANSPORT')
        self.sock = sock
        self.messages = self.received_fds = self.closed_fds = 0
        self.eof_ns = None

    def _adopt(self, ancillary, fds):
        valid = True
        # Take ownership of all returned rights before rejecting any other cmsg.
        for level, kind, raw in ancillary:
            if (level, kind) == (socket.SOL_SOCKET, socket.SCM_RIGHTS):
                values = array.array('i')
                values.frombytes(raw[:len(raw)-len(raw)%values.itemsize])
                fds.extend(values)
                self.received_fds += len(values)
                valid = valid and len(raw)%values.itemsize == 0
            else:
                valid = False
        return valid

    def _release(self, fds):
        failure = None
        for fd in fds:
            try:
                os.close(fd)
                self.closed_fds += 1
            except OSError as exc:
                failure = exc
        fds.clear()
        if failure is not None:
            raise failure

    def send(self, obj, fds=()):
        require(self.eof_ns is None, 'HOLD_V45_OBSERVER_CHANNEL_RETIRED')
        raw = canon(obj)
        require(0 < len(raw) <= MAX_PACKET and len(fds) <= MAX_FDS,
                'HOLD_V45_OBSERVER_CHANNEL_SIZE')
        frame = len(raw).to_bytes(4, 'big') + raw
        ancillary = [(socket.SOL_SOCKET, socket.SCM_RIGHTS, array.array('i', fds))] if fds else []
        self.sock.settimeout(5)
        sent = self.sock.sendmsg([frame], ancillary)
        require(0 < sent <= len(frame), 'HOLD_V45_OBSERVER_CHANNEL_SEND')
        # SCM_RIGHTS accompanies only the first positive write, never a retry.
        self.sock.sendall(frame[sent:])

    @contextlib.contextmanager
    def receive(self, deadline_ns, progress=None):
        import time
        require(self.eof_ns is None, 'HOLD_V45_OBSERVER_CHANNEL_RETIRED')
        fds = []
        reads = 0
        def exact(size):
            nonlocal reads
            out = bytearray()
            while len(out) < size:
                remaining = deadline_ns-time.monotonic_ns()
                require(remaining > 0, 'HOLD_V45_OBSERVER_CHANNEL_DEADLINE')
                if progress is not None:
                    import select
                    if not select.select([self.sock],[],[],0)[0]:
                        progress()
                    if not select.select([self.sock],[],[],0.0001)[0]:
                        continue
                self.sock.settimeout(min(5, remaining/1_000_000_000))
                raw, ancillary, flags, _ = self.sock.recvmsg(size-len(out),
                    socket.CMSG_SPACE(MAX_FDS*array.array('i').itemsize), socket.MSG_CMSG_CLOEXEC)
                valid = self._adopt(ancillary, fds)
                require(valid and not flags & (socket.MSG_TRUNC|socket.MSG_CTRUNC)
                        and len(fds) <= MAX_FDS and (reads == 0 or not ancillary),
                        'HOLD_V45_OBSERVER_CHANNEL_ANCILLARY')
                require(bool(raw), 'HOLD_V45_OBSERVER_CHANNEL_INCOMPLETE_FRAME')
                reads += 1
                out.extend(raw)
            return bytes(out)
        try:
            length = int.from_bytes(exact(4), 'big')
            require(0 < length <= MAX_PACKET, 'HOLD_V45_OBSERVER_CHANNEL_SIZE')
            value = strict(exact(length))
            statuses = ('SPAWNED', 'OBSERVATION', 'CLEANUP')
            keys = ({'status','observer','worker','argv_sha256','request_sha256'},
                    {'status','observation_sha256'}, {'status','cleanup'})
            require(self.messages < 3 and value.get('status') == statuses[self.messages]
                    and set(value) == keys[self.messages]
                    and len(fds) == int(self.messages == 1),
                    'HOLD_V45_OBSERVER_CHANNEL_MESSAGE')
            self.messages += 1
            yield value, fds
        finally:
            self._release(fds)

    def require_input_eof(self):
        import time
        require(self.eof_ns is None, 'HOLD_V45_OBSERVER_CHANNEL_RETIRED')
        fds = []
        timeout = self.sock.gettimeout()
        self.sock.setblocking(False)
        try:
            try:
                raw, ancillary, flags, _ = self.sock.recvmsg(1,
                    socket.CMSG_SPACE(MAX_FDS*array.array('i').itemsize), socket.MSG_CMSG_CLOEXEC)
            except BlockingIOError as exc:
                raise CustodyHold('HOLD_V45_OBSERVER_CHANNEL_INPUT_OPEN') from exc
            valid = self._adopt(ancillary, fds)
            require(valid and not flags & (socket.MSG_TRUNC|socket.MSG_CTRUNC)
                    and not raw and not ancillary, 'HOLD_V45_OBSERVER_CHANNEL_PENDING_INPUT')
            self.eof_ns = time.monotonic_ns()
        finally:
            self._release(fds)
            self.sock.settimeout(timeout)
        require(self.messages == 3 and self.received_fds == self.closed_fds == 1,
                'HOLD_V45_OBSERVER_CHANNEL_CENSUS')
        return {'format':'VOID_V45_OBSERVER_CHANNEL_RETIREMENT_V1',
            'scope':'one_recorder_observer_stream_receive_side_only',
            'messages_received':self.messages, 'descriptors_received':self.received_fds,
            'descriptors_closed':self.closed_fds, 'input_eof':True, 'eof_observed_ns':self.eof_ns,
            'all_process_capabilities_retired':False, 'complete_resource_ledger':False}

    def close(self):
        self.sock.close()


class InvocationWorkerLedger(OwnedSyscallLedger):
    FORMAT = 'VOID_V45_INVOCATION_WORKER_SYSCALL_LEDGER_V1'

    def event(self, kind, **fields):
        super().event(kind, **fields)
        # The callback sees an already paired successful creation return in the
        # owned worker. It never attaches to the returned child or reads memory.
        if (kind == 'return' and fields['nr'] in (56, 57, 58, 435)
                and fields['error'] == 0 and fields['value'] > 0):
            callback = getattr(self, 'creation_callback', None)
            if callback is not None:
                callback(fields['pid'], fields['nr'], fields['value'], self.sequence)

    def report(self, *, terminal, stream_bindings, cleanup_complete):
        out = super().report(terminal=terminal, stream_bindings=stream_bindings,
                             cleanup_complete=cleanup_complete)
        out.pop('ledger_sha256')
        out['scope'] = 'case_root_threads_and_two_source_queries_from_preexec_sync_stop_through_terminal_wait'
        out['excluded'] = ['fork-to-synchronization-stop instructions',
            'journal recorder and its bootstrap', 'independent worker observer',
            'worker process children outside the two admitted source queries and external descriptor holders',
            'kernel-internal and memory-mapped I/O', 'post-observer and full-subtree cleanup']
        out['ledger_sha256'] = digest(canon(out))
        return out


class InvocationObserverInputs:
    """Own only the declared inherited inputs in this observer's FD table.

    Closing these copies says nothing about copies in the worker, recorder or
    other processes. A failed close is never retried against a reusable number.
    """
    ROLES = ('source','worker','request','cwd','log')

    @staticmethod
    def binding(fd):
        require(type(fd) is int and fd > 2, 'HOLD_V45_OBSERVER_INPUT_FD')
        st = os.fstat(fd)
        return {'fd':fd,'device':st.st_dev,'inode':st.st_ino,
                'file_type':stat.S_IFMT(st.st_mode),
                'access_mode':fcntl.fcntl(fd, fcntl.F_GETFL) & os.O_ACCMODE}

    @classmethod
    def bindings(cls, descriptors, channel_fd):
        require(type(descriptors) is dict and set(descriptors) in
                (set(cls.ROLES), set(cls.ROLES)|{'fixture'})
                and type(channel_fd) is int and channel_fd > 2,
                'HOLD_V45_OBSERVER_INPUT_ROLES')
        values = list(descriptors.values())
        require(all(type(fd) is int and fd > 2 for fd in values)
                and len(values) == len(set(values)) and channel_fd not in values,
                'HOLD_V45_OBSERVER_INPUT_ALIAS')
        return {role:cls.binding(fd) for role, fd in descriptors.items()}

    def __init__(self, ns):
        descriptors = {role:getattr(ns, role+'_fd') for role in self.ROLES}
        if ns.fixture_fd is not None:
            descriptors['fixture'] = ns.fixture_fd
        self.initial = self.bindings(descriptors, ns.channel_fd)
        self.pending = dict(self.initial)
        self.records = []
        self.failure = None
        self.receipt = None

    def close_role(self, role, phase):
        import errno, time
        require(role in self.pending and phase in
                ('after_worker_spawn','post_report_cleanup','failure_cleanup'),
                'HOLD_V45_OBSERVER_INPUT_STATE')
        binding = self.pending.pop(role)
        started = time.monotonic_ns()
        try:
            require(self.binding(binding['fd']) == binding,
                    'HOLD_V45_OBSERVER_INPUT_REPLACED')
            os.close(binding['fd'])
            closed = time.monotonic_ns()
            try:
                os.fstat(binding['fd'])
            except OSError as exc:
                require(exc.errno == errno.EBADF, 'HOLD_V45_OBSERVER_INPUT_CLOSE_CHECK')
            else:
                raise CustodyHold('HOLD_V45_OBSERVER_INPUT_STILL_OPEN')
            self.records.append({'role':role,'binding':binding,'phase':phase,
                'close_started_ns':started,'close_returned_ns':closed,
                'closed_checked_ns':time.monotonic_ns(),'close_succeeded':True})
        except BaseException as exc:
            self.failure = exc
            raise

    def close_remaining(self, phase='failure_cleanup'):
        # Attempt every still-owned descriptor even if an earlier close fails.
        for role in tuple(self.pending):
            try:
                self.close_role(role, phase)
            except BaseException:
                pass
        if self.failure is not None:
            raise self.failure

    def retire(self):
        import time
        require(self.receipt is None, 'HOLD_V45_OBSERVER_INPUT_STATE')
        self.close_remaining('post_report_cleanup')
        require(len(self.records) == len(self.initial), 'HOLD_V45_OBSERVER_INPUT_CENSUS')
        self.receipt = {'format':'VOID_V45_OBSERVER_INPUT_RETIREMENT_V1',
            'scope':'observer_copies_of_declared_launch_inputs_only',
            'records':list(self.records),'inherited_descriptors':len(self.initial),
            'closed_descriptors':len(self.records),'retired_ns':time.monotonic_ns(),
            'all_process_capabilities_retired':False,'complete_cleanup_ledger':False,
            'syscall_count':None,'exact_fd_peak':None}
        return self.receipt

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close_remaining()


def own_invocation_fd(cleanup, fd):
    """Register one locally opened FD for an at-most-once close attempt."""
    require(type(fd) is int and fd > 2, 'HOLD_V45_OBSERVER_OWNED_FD')
    pending = [fd]
    def close():
        # Consume ownership before close: even an error must not cause a retry
        # against a descriptor number the kernel may already have reused.
        if pending:
            os.close(pending.pop())
    cleanup.callback(close)
    return close


def observe_invocation_worker(ns) -> int:
    # Ownership spans validation, launch, reporting and exceptional unwinding.
    with InvocationObserverInputs(ns) as inputs, contextlib.ExitStack() as cleanup:
        return _observe_invocation_worker(ns, inputs, cleanup)


def retire_invocation_worker(root_pid, pidfd, root_status, live, pending_threads,
                             record_exit, trace, timeout_s=3):
    """Bound cleanup of our forked root and already announced traced tasks.

    Only internal fork/clone results may reach this helper. A missing pidfd
    permits numeric signaling only while our own child remains unreaped.
    Missing wait evidence leaves the caller's task sets unresolved. Untraced
    descendants and a complete task census remain outside this cleanup scope.
    """
    import signal, time
    require(type(root_pid) is int and root_pid > 0 and 0 < timeout_s <= 3,
            'HOLD_V45_WORKER_OBSERVER_CLEANUP_ARGUMENT')
    deadline = time.monotonic() + timeout_s
    refusal = None
    try:
        if pidfd is not None:
            signal.pidfd_send_signal(pidfd, signal.SIGKILL)
        elif root_status is None:
            os.kill(root_pid, signal.SIGKILL)
    except ProcessLookupError:
        pass  # A raced exit still requires its terminal wait below.
    except OSError:
        refusal = 'HOLD_V45_WORKER_OBSERVER_CLEANUP_SIGNAL'
    waiting = set(live) | set(pending_threads)
    if root_status is None: waiting.add(root_pid)
    while waiting:
        if time.monotonic() >= deadline:
            return root_status, refusal or 'HOLD_V45_WORKER_OBSERVER_CLEANUP_DEADLINE'
        for pid in sorted(waiting):
            if time.monotonic() >= deadline: break
            try:
                got, status = os.waitpid(pid, os.WNOHANG | 0x40000000)
            except InterruptedError:
                continue
            except (ChildProcessError, OSError):
                # Do not treat ECHILD (or an I/O error) as proof of reaping.
                waiting.remove(pid)
                refusal = refusal or 'HOLD_V45_WORKER_OBSERVER_CLEANUP_WAIT'
                continue
            if got == 0: continue
            if got != pid:
                waiting.remove(pid)
                refusal = refusal or 'HOLD_V45_WORKER_OBSERVER_CLEANUP_WAIT'
                continue
            if os.WIFEXITED(status) or os.WIFSIGNALED(status):
                # Consume the wait before reporting: a failing ledger/event
                # callback must never make this reaped PID signalable again.
                if got == root_pid: root_status = status
                live.discard(got); pending_threads.discard(got); waiting.remove(got)
                try: record_exit(got, status)
                except (CustodyHold, OSError, ValueError):
                    refusal = refusal or 'HOLD_V45_WORKER_OBSERVER_CLEANUP_RECORD'
            elif os.WIFSTOPPED(status):
                try: trace(7, got, signal.SIGKILL)
                except (CustodyHold, OSError):
                    refusal = refusal or 'HOLD_V45_WORKER_OBSERVER_CLEANUP_RESUME'
            else:
                refusal = refusal or 'HOLD_V45_WORKER_OBSERVER_CLEANUP_WAIT'
        if waiting:
            time.sleep(min(0.001, max(0, deadline - time.monotonic())))
    return root_status, refusal


def _observe_invocation_worker(ns, inputs, cleanup) -> int:
    """Own one sealed, fixed-protocol case worker and observe it until retirement.

    A separate executable from the recorder; no external PID or command is
    accepted. Parent authorization of the source/plan remains trusted. ptrace
    observes the root, its threads, and the two direct process children used
    for mandatory Git source-generation checks. For the two bookkeeping focus
    scenarios, process-creation tracing remains active through root retirement
    and any later process creation is refused; other scenarios drop it before
    scenario execution. No arbitrary attach, register or process-memory
    operation, or syscall rewrite is used.
    """
    import ctypes, select, signal, time
    require(sys.platform == 'linux' and os.uname().machine == 'x86_64',
            'HOLD_V45_WORKER_OBSERVER_PLATFORM')
    require(len(os.listdir('/proc/self/task')) == 1, 'HOLD_V45_WORKER_OBSERVER_THREADS')
    lib = ctypes.CDLL(None, use_errno=True)
    lib.ptrace.argtypes = (ctypes.c_uint, ctypes.c_int, ctypes.c_void_p, ctypes.c_void_p)
    lib.ptrace.restype = ctypes.c_long

    def trace(op, pid, data=0):
        ctypes.set_errno(0)
        require(lib.ptrace(op, pid, None, ctypes.c_void_p(data)) >= 0,
                'HOLD_V45_WORKER_OBSERVER_PTRACE')

    def process(pid):
        raw = Path(f'/proc/{pid}/stat').read_text()
        fields = raw[raw.rfind(')')+2:].split()
        return {'pid':pid,'starttime_ticks':int(fields[19]),'parent_pid':int(fields[1])}

    def checked_sealed(fd, wanted=None):
        require(fcntl.fcntl(fd, fcntl.F_GET_SEALS) == 15 and os.fstat(fd).st_nlink == 0,
                'HOLD_V45_WORKER_OBSERVER_UNSEALED')
        data = read_fd(fd)
        if wanted is not None:
            require(digest(data) == wanted, 'HOLD_V45_WORKER_OBSERVER_SOURCE')
        return data

    observer = process(os.getpid())
    # Bound parent death, not permission to signal unrelated processes.
    require(lib.prctl(1, signal.SIGKILL, 0, 0, 0) == 0 and
            os.getppid() == observer['parent_pid'], 'HOLD_V45_WORKER_OBSERVER_PARENT')
    request_raw = checked_sealed(ns.request_fd)
    request = strict(request_raw)
    require(set(request) == {'invocation_id','scenario_id','source','runtime'},
            'HOLD_V45_WORKER_OBSERVER_REQUEST')
    require(re.fullmatch('[0-9a-f]{64}', request['invocation_id']) is not None and
            re.fullmatch('[a-z-]+/[a-z0-9_-]+', request['scenario_id']) is not None,
            'HOLD_V45_WORKER_OBSERVER_REQUEST')
    source, runtime = request['source'], request['runtime']
    checked_sealed(ns.source_fd, source['observer_sha256'])
    checked_sealed(ns.worker_fd, source['worker_sha256'])
    require(stat.S_ISDIR(os.fstat(ns.cwd_fd).st_mode), 'HOLD_V45_WORKER_OBSERVER_CWD')
    root = Path(os.readlink(f'/proc/self/fd/{ns.cwd_fd}'))
    require(root.is_absolute() and root.is_dir(), 'HOLD_V45_WORKER_OBSERVER_CWD')
    executable = os.open(runtime['executable'], os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW)
    close_executable = own_invocation_fd(cleanup, executable)
    require(executable_digest(executable) == runtime['executable_sha256'] and
            identity(os.stat('/proc/self/exe')) == identity(os.fstat(executable)),
            'HOLD_V45_WORKER_OBSERVER_INTERPRETER')
    command = [runtime['executable'],'-I','-S','-B',f'/proc/self/fd/{ns.worker_fd}',
               '--invocation-case',request['scenario_id'],'--invocation-request-fd',str(ns.request_fd),
               '--output',ns.output]
    fixture_required = request['scenario_id'].split('/')[0] in ('owned','primitive') and '/scm-rights-' in request['scenario_id']
    require((ns.fixture_fd is not None) == fixture_required, 'HOLD_V45_WORKER_OBSERVER_FIXTURE')
    if fixture_required:
        require(stat.S_ISSOCK(os.fstat(ns.fixture_fd).st_mode), 'HOLD_V45_WORKER_OBSERVER_FIXTURE')
        command += ['--observed-fixture-socket',str(ns.fixture_fd)]
    env = {'PATH':os.environ.get('PATH','/usr/bin:/bin'),'LANG':'C.UTF-8',
           'HOME':str(Path(ns.output).parent),'GIT_CONFIG_NOSYSTEM':'1',
           'GIT_CONFIG_GLOBAL':'/dev/null','PYTHONDONTWRITEBYTECODE':'1',
           'VOID_V45_SOURCE_ROOT':str(root)}
    require(type(ns.deadline_ns) is int and 1 <= ns.deadline_ns <= 120000000000,
            'HOLD_V45_WORKER_OBSERVER_DEADLINE')
    channel = InvocationObserverChannel(socket.socket(fileno=ns.channel_fd))
    cleanup.callback(channel.close)
    ledger = InvocationWorkerLedger()
    events = []; known = {}; live = set(); pending_tasks = set(); pending_task_kind = {}; signal_stops = {}
    source_query_commands = [
        ['git','-C',str(root),'rev-parse','HEAD'],
        ['git','-C',str(root),'rev-parse','HEAD^{tree}'],
    ]
    source_query_children = {}; source_query_execs = set(); source_query_retired = set()
    source_query_announced = 0; source_query_options_active = True; source_query_disable_pending = False
    complete_child_census = request['scenario_id'] in ('journal/success','journal/schema-controls')
    root_exec_count = 0
    import resource as _resource
    def _self_rusage():
        r=_resource.getrusage(_resource.RUSAGE_SELF)
        return {'user_us':int(round(r.ru_utime*1000000)),'system_us':int(round(r.ru_stime*1000000)),
            'maxrss_kib':int(r.ru_maxrss),'minor_faults':int(r.ru_minflt),'major_faults':int(r.ru_majflt),
            'block_inputs':int(r.ru_inblock),'block_outputs':int(r.ru_oublock),
            'voluntary_context_switches':int(r.ru_nvcsw),'involuntary_context_switches':int(r.ru_nivcsw)}
    def _rusage_delta(a,b):
        return {k:b[k]-a[k] for k in a if k!='maxrss_kib'} | {'maxrss_before_kib':a['maxrss_kib'],'maxrss_after_kib':b['maxrss_kib']}
    started = time.monotonic_ns(); observer_rusage_before=_self_rusage(); observer_fd_before=len(os.listdir('/proc/self/fd'))
    root_pid = None; pidfd = None; close_pidfd = None
    root_status = None; admitted = False; refusal = None; exec_count = 0
    startup_entries = None; terminating = False; outcome = 'HOLD'
    fork_started_ns=None; initial_stop_ns=None

    handoffs = []; handoff_fds = []

    def capture_creation(caller_pid, nr, child_pid, telemetry_sequence):
        # Retain one witness for EVERY positive creation return. Missing proc
        # identity is explicit unresolved evidence, never a PID-only join.
        require(len(handoffs) < 512, 'HOLD_V45_WORKER_HANDOFF_LIMIT')
        record = {'ordinal': len(handoffs) + 1, 'creator': dict(known[caller_pid]),
            'syscall_number': nr, 'telemetry_sequence': telemetry_sequence,
            'child_pid': child_pid, 'observed_ns': time.monotonic_ns(),
            'classification': 'UNRESOLVED', 'child': None, 'tgid': None,
            'pidfd_retained': False, 'terminal_at_report': None,
            'nested_exec_observed': False, 'nested_resources_measured': False}
        handoffs.append(record)
        fd = None; close_fd = None
        try:
            first = process(child_pid)
            status_text = Path(f'/proc/{child_pid}/status').read_text()
            tgid = int(next(x.split(':', 1)[1] for x in status_text.splitlines()
                            if x.startswith('Tgid:')))
            if tgid == root_pid:
                # This thread is already in this observer's task partition.
                record.update(classification='THREAD', child=first, tgid=tgid)
                return
            require(first['parent_pid'] == root_pid and tgid == child_pid,
                    'HOLD_V45_WORKER_HANDOFF_PARENT')
            fd = os.pidfd_open(child_pid)
            close_fd = own_invocation_fd(cleanup, fd)
            require(process(child_pid) == first, 'HOLD_V45_WORKER_HANDOFF_GENERATION')
            measured = (child_pid in ledger.tasks and
                        ledger.tasks[child_pid]['starttime_ticks'] == first['starttime_ticks'])
            record.update(classification='PROCESS', child=first, tgid=tgid,
                          pidfd_retained=True,
                          nested_exec_observed=(measured and ledger.tasks[child_pid]['successful_execs'] > 0),
                          nested_resources_measured=measured)
            handoff_fds.append((record, fd, close_fd)); close_fd = None
        except (OSError, ValueError, StopIteration, CustodyHold):
            # A disappeared or reparented child remains unresolved; do not
            # fabricate a lifetime or silently drop its successful fork return.
            pass
        finally:
            if close_fd is not None: close_fd()

    ledger.creation_callback = capture_creation

    def event(kind, **data):
        require(len(events) < 1024, 'HOLD_V45_WORKER_OBSERVER_EVENTS')
        events.append({'sequence':len(events)+1,'time_ns':time.monotonic_ns(),'kind':kind,**data})

    def alarm(signum, frame):
        raise CustodyHold('HOLD_V45_WORKER_OBSERVER_DEADLINE')

    old_alarm = signal.signal(signal.SIGALRM, alarm)
    try:
        # The child requests tracing itself, before descriptor/cwd/exec setup.
        # Retain the observer-side fork-call-to-initial-stop interval explicitly;
        # it is timing evidence, not a syscall ledger for child instructions.
        fork_started_ns=time.monotonic_ns()
        root_pid = os.fork()
        if root_pid == 0:
            try:
                signal.setitimer(signal.ITIMER_REAL, 0)
                signal.signal(signal.SIGALRM, signal.SIG_DFL)
                trace(0, 0)
                os.kill(os.getpid(), signal.SIGSTOP)
                os.setsid(); os.fchdir(ns.cwd_fd)
                null = os.open('/dev/null',os.O_RDONLY|os.O_CLOEXEC)
                os.dup2(null,0); os.dup2(ns.log_fd,1); os.dup2(ns.log_fd,2)
                keep={0,1,2,ns.request_fd,ns.worker_fd}
                if ns.fixture_fd is not None:keep.add(ns.fixture_fd)
                for fd in keep:
                    if fd>2:os.set_inheritable(fd,True)
                for name in os.listdir('/proc/self/fd'):
                    fd=int(name)
                    if fd not in keep:
                        try:os.close(fd)
                        except OSError:pass
                os.execve(runtime['executable'], command, env)
            except BaseException:os._exit(126)
        pidfd = os.pidfd_open(root_pid)
        close_pidfd = own_invocation_fd(cleanup, pidfd)
        signal.setitimer(signal.ITIMER_REAL, ns.deadline_ns/1000000000)
        got, status = os.waitpid(root_pid, 0)
        if got == root_pid and (os.WIFEXITED(status) or os.WIFSIGNALED(status)):
            root_status = status
        require(got == root_pid and os.WIFSTOPPED(status) and os.WSTOPSIG(status)==signal.SIGSTOP,
                'HOLD_V45_WORKER_OBSERVER_INITIAL_STOP')
        initial_stop_ns=time.monotonic_ns()
        root_identity = process(root_pid)
        require(root_identity['parent_pid'] == os.getpid(), 'HOLD_V45_WORKER_OBSERVER_PARENT')
        known[root_pid] = root_identity;live.add(root_pid)
        ledger.birth(root_identity, os.getpid(), initial=True)
        event('SPAWN',identity=root_identity)
        # Follow the two mandatory source-generation subprocesses. Their argv
        # is verified at exec. Focus bookkeeping cases retain creation tracing
        # through root retirement; other scenarios remove it after both retire.
        trace(0x4200,root_pid,0x1|0x2|0x4|0x8|0x10|0x100000)
        channel.send({'status':'SPAWNED','observer':observer,'worker':root_identity,
                      'argv_sha256':digest(canon(command)),'request_sha256':digest(request_raw)})
        if ns.fixture_fd is not None:inputs.close_role('fixture','after_worker_spawn')
        trace(24,root_pid)
        while live:
            got,status=os.waitpid(-1,0x40000000)
            if got not in known:
                require(got in pending_tasks and os.WIFSTOPPED(status),
                        'HOLD_V45_WORKER_OBSERVER_UNKNOWN_TASK')
                announced = pending_task_kind.pop(got); pending_tasks.remove(got)
                ident=process(got)
                tgid=int(next(x.split(':',1)[1] for x in Path(f'/proc/{got}/status').read_text().splitlines() if x.startswith('Tgid:')))
                if announced['kind'] == 'THREAD':
                    require(tgid==root_pid,'HOLD_V45_WORKER_OBSERVER_NONTHREAD_CLONE')
                    event_kind='THREAD'; birth_parent=root_pid
                    event_data={'identity':ident,'tgid':tgid}
                else:
                    require(tgid==got and ident['parent_pid']==root_pid and announced['source_query_ordinal'] in (1,2),
                            'HOLD_V45_WORKER_OBSERVER_SOURCE_QUERY_CHILD')
                    source_query_children[got]=announced['source_query_ordinal']
                    event_kind='PROCESS'; birth_parent=root_pid
                    event_data={'identity':ident,'tgid':tgid,'source_query_ordinal':announced['source_query_ordinal']}
                known[got]=ident;live.add(got)
                ledger.birth(ident,birth_parent)
                event(event_kind,**event_data)
                trace(24,got);continue
            if os.WIFEXITED(status) or os.WIFSIGNALED(status):
                if got==root_pid:root_status=status
                live.remove(got)
                ledger.exit(got,status);event('EXIT',pid=got,wait_status=status)
                if got in source_query_children:
                    require(got in source_query_execs,'HOLD_V45_WORKER_OBSERVER_SOURCE_QUERY_EXEC')
                    source_query_retired.add(got)
                    if len(source_query_retired)==2:
                        if complete_child_census:
                            # Keep TRACEFORK/VFORK active through root retirement.
                            # Any later process creation is an explicit refusal.
                            source_query_options_active=False
                            event('SOURCE_QUERY_SCOPE_CLOSED',measured_processes=2,
                                  process_creation_trace_retained=True)
                        else:
                            source_query_disable_pending=True
                continue
            require(os.WIFSTOPPED(status),'HOLD_V45_WORKER_OBSERVER_WAIT')
            stop=os.WSTOPSIG(status);kind=status>>16
            if got==root_pid and source_query_disable_pending and source_query_options_active:
                # PTRACE_SYSCALL guarantees a root stop after the second vfork
                # returns and before the root can issue a later scenario fork.
                require(kind not in (1,2),'HOLD_V45_WORKER_OBSERVER_SOURCE_QUERY_SCOPE')
                trace(0x4200,root_pid,0x1|0x8|0x10|0x100000)
                source_query_options_active=False
                event('SOURCE_QUERY_SCOPE_CLOSED',measured_processes=2,
                      process_creation_trace_retained=False)
            if kind==4:
                exec_count+=1;ledger.exec(got)
                event('EXEC',pid=got,ordinal=exec_count)
                if got==root_pid:
                    root_exec_count+=1
                    require(root_exec_count==1,'HOLD_V45_WORKER_OBSERVER_REEXEC')
                    require(identity(os.stat(f'/proc/{root_pid}/exe'))==identity(os.fstat(executable)),
                            'HOLD_V45_WORKER_OBSERVER_EXECUTABLE')
                    argv=Path(f'/proc/{root_pid}/cmdline').read_bytes()
                    require(argv==b'\0'.join(x.encode() for x in command)+b'\0',
                            'HOLD_V45_WORKER_OBSERVER_ARGV')
                    # Bounded metadata/object inspection at our owned exec stop.
                    for fd,want in ((ns.worker_fd,source['worker_sha256']), (ns.request_fd,digest(request_raw))):
                        opened=os.open(f'/proc/{root_pid}/fd/{fd}',os.O_RDONLY|os.O_CLOEXEC)
                        try:checked_sealed(opened,want)
                        finally:os.close(opened)
                    require(identity(os.stat(f'/proc/{root_pid}/cwd'))[:2]==identity(os.fstat(ns.cwd_fd))[:2],
                            'HOLD_V45_WORKER_OBSERVER_CWD')
                    # Hash comparison only; environments contain the explicit clean map.
                    actual_env=Path(f'/proc/{root_pid}/environ').read_bytes().split(b'\0')
                    require(sorted(x for x in actual_env if x)==sorted((k+'='+v).encode() for k,v in env.items()),
                            'HOLD_V45_WORKER_OBSERVER_ENV')
                    for fd in (1,2):
                        require(identity(os.stat(f'/proc/{root_pid}/fd/{fd}'))[:2]==identity(os.fstat(ns.log_fd))[:2],
                                'HOLD_V45_WORKER_OBSERVER_LOG')
                    startup_entries=ledger.tasks[root_pid]['syscall_entries'];admitted=True
                    event('ADMITTED',source_sha256=source['worker_sha256'],argv_sha256=digest(canon(command)),
                          executable_sha256=runtime['executable_sha256'])
                else:
                    require(got in source_query_children and got not in source_query_execs,
                            'HOLD_V45_WORKER_OBSERVER_UNADMITTED_EXEC')
                    ordinal=source_query_children[got]
                    expected=source_query_commands[ordinal-1]
                    argv=Path(f'/proc/{got}/cmdline').read_bytes()
                    require(argv==b'\0'.join(x.encode() for x in expected)+b'\0',
                            'HOLD_V45_WORKER_OBSERVER_SOURCE_QUERY_ARGV')
                    exe_fd=os.open(f'/proc/{got}/exe',os.O_RDONLY|os.O_CLOEXEC)
                    try: exe_sha=executable_digest(exe_fd)
                    finally: os.close(exe_fd)
                    source_query_execs.add(got)
                    event('SOURCE_QUERY',pid=got,ordinal=ordinal,argv=expected,executable_sha256=exe_sha)
                    for record in handoffs:
                        if record['child_pid']==got and record['classification']=='PROCESS':
                            record['nested_exec_observed']=True; record['nested_resources_measured']=True
                trace(24,got)
            elif kind in (1,2,3):
                msg=ctypes.c_ulonglong()
                require(lib.ptrace(0x4201,got,None,ctypes.cast(ctypes.byref(msg),ctypes.c_void_p))>=0,
                        'HOLD_V45_WORKER_OBSERVER_EVENT')
                child=msg.value
                require(child not in known and child not in pending_tasks,'HOLD_V45_WORKER_OBSERVER_DUPLICATE_TASK')
                if kind==3:
                    # After the two source queries, the focus scenarios admit no
                    # new clone-created task of any kind. A process clone would
                    # also fail the TGID check when its initial stop is consumed.
                    if complete_child_census and not source_query_options_active:
                        raise CustodyHold('HOLD_V45_WORKER_OBSERVER_POST_QUERY_TASK')
                    pending_task_kind[child]={'kind':'THREAD'}
                else:
                    require(got==root_pid and source_query_options_active and source_query_announced<2,
                            'HOLD_V45_WORKER_OBSERVER_SOURCE_QUERY_SCOPE')
                    source_query_announced+=1
                    pending_task_kind[child]={'kind':'PROCESS','source_query_ordinal':source_query_announced}
                pending_tasks.add(child);trace(24,got)
            elif stop==signal.SIGTRAP|0x80:
                ledger.stop(lib,got);trace(24,got)
            else:
                require(not kind,'HOLD_V45_WORKER_OBSERVER_EVENT')
                key=str(stop);signal_stops[key]=signal_stops.get(key,0)+1
                require(sum(signal_stops.values())<=250000,'HOLD_V45_WORKER_OBSERVER_SIGNAL_LIMIT')
                trace(24,got,stop)
        require(not pending_tasks and root_status is not None
                and source_query_announced==2 and len(source_query_children)==2
                and len(source_query_execs)==2 and len(source_query_retired)==2
                and source_query_options_active is False,
                'HOLD_V45_WORKER_OBSERVER_TERMINAL')
        outcome='OBSERVED'
    except (CustodyHold,OSError,ValueError) as exc:
        refusal=getattr(exc,'code','HOLD_V45_WORKER_OBSERVER_IO')
    finally:
        signal.setitimer(signal.ITIMER_REAL,0)
        cleanup_refusal = None
        try:
            if root_pid is not None and (root_status is None or live or pending_tasks):
                terminating=True
                def record_cleanup_exit(pid, status):
                    if pid in ledger.tasks and not ledger.tasks[pid]['exited']:
                        ledger.exit(pid,status)
                    event('EXIT',pid=pid,wait_status=status)
                root_status, cleanup_refusal = retire_invocation_worker(
                    root_pid, pidfd, root_status, live, pending_tasks, record_cleanup_exit, trace)
                if cleanup_refusal is not None:
                    outcome='HOLD';refusal=cleanup_refusal
        finally:
            signal.signal(signal.SIGALRM,old_alarm)
        ended=time.monotonic_ns()
        terminal=cleanup_refusal is None and root_status is not None and not live and not pending_tasks
        if pidfd is not None:
            poll=select.poll();poll.register(pidfd,select.POLLIN)
            terminal=terminal and bool(poll.poll(0))
        for record, fd, _ in handoff_fds:
            poll_child = select.poll(); poll_child.register(fd, select.POLLIN)
            record['terminal_at_report'] = bool(poll_child.poll(0))
        for record in handoffs:
            if record['classification'] == 'THREAD':
                record['terminal_at_report'] = bool(
                    record['child']['pid'] in ledger.tasks
                    and ledger.tasks[record['child']['pid']]['exited'])
            elif record['classification'] == 'PROCESS' and record['child'] is not None:
                row=ledger.tasks.get(record['child']['pid'])
                if row is not None and row['starttime_ticks']==record['child']['starttime_ticks']:
                    record['nested_resources_measured']=True
                    record['nested_exec_observed']=row['successful_execs']>0
        process_handoffs=[x for x in handoffs if x['classification']=='PROCESS']
        complete_nested_tree = (complete_child_census and terminal
            and not any(x['classification']=='UNRESOLVED' for x in handoffs)
            and all(x['terminal_at_report'] is True for x in handoffs))
        child_handoffs = {'format': 'VOID_V45_DIRECT_CHILD_HANDOFFS_V2',
            'scope': 'successful_worker_creation_returns_only',
            'records': handoffs, 'successful_creation_returns': len(handoffs),
            'process_records': len(process_handoffs),
            'thread_records': sum(x['classification'] == 'THREAD' for x in handoffs),
            'unresolved_records': sum(x['classification'] == 'UNRESOLVED' for x in handoffs),
            'complete_nested_tree': complete_nested_tree,
            'nested_resources_measured': bool(process_handoffs) and all(x['nested_resources_measured'] for x in process_handoffs),
            'pidfd_terminal_is_not_reaping_or_capability_retirement': True}
        child_handoffs['handoff_sha256'] = digest(canon(child_handoffs))
        led=ledger.report(terminal='VERIFIED' if terminal else 'HOLD',stream_bindings={},cleanup_complete=terminal)
        observer_rusage_after=_self_rusage(); observer_fd_at_report=len(os.listdir('/proc/self/fd'))
        observer_window={'scope':'observer_from_before_worker_fork_through_worker_terminal_processing',
            'rusage_delta':_rusage_delta(observer_rusage_before,observer_rusage_after),
            'fd_count_before':observer_fd_before,'fd_count_at_report':observer_fd_at_report,
            'elapsed_ns':ended-started,'fork_started_ns':fork_started_ns,'initial_stop_ns':initial_stop_ns,
            'fork_to_initial_stop_ns':(initial_stop_ns-fork_started_ns if fork_started_ns is not None and initial_stop_ns is not None else None),
            'syscall_count':None,'exact_fd_peak':None,'cleanup_after_report_included':False,
            'worker_resources_included':False,'nested_resources_included':False,'whole_case_complete':False}
        report={'format':WORKER_OBSERVER_FORMAT,'profile':WORKER_OBSERVER_PROFILE,
                'source':source,'runtime':runtime,'invocation_id':request['invocation_id'],
                'scenario_id':request['scenario_id'],'request_sha256':digest(request_raw),
                'observer':observer,'worker':known.get(root_pid),'argv_sha256':digest(canon(command)),
                'status':outcome,'refusal':refusal,'initial_exec_admitted':admitted,
                'exec_events':exec_count,'root_wait_status':root_status,
                'root_returncode':os.waitstatus_to_exitcode(root_status) if root_status is not None else None,
                'root_and_threads_retired':terminal,'pidfd_terminal':terminal,
                'termination_requested':terminating,'started_ns':started,'ended_ns':ended,
                'deadline_ns':ns.deadline_ns,'startup_syscall_entries_before_initial_exec':startup_entries,
                'events':events,'signal_stops':signal_stops,'worker_ledger':led,'whole_case_complete':False,
                'direct_child_handoffs': child_handoffs,'observer_resource_window':observer_window,
                'nested_processes_observed':any(x['nested_resources_measured'] for x in process_handoffs),'observer_resources_measured':True,
                'hard_execution_resource_ceiling':False}
        report['observation_sha256']=digest(canon(report))
        result_fd=sealed_fd(canon(report),'void-worker-observation')
        report_sent_ns=time.monotonic_ns()
        try:channel.send({'status':'OBSERVATION','observation_sha256':report['observation_sha256']},(result_fd,))
        finally:os.close(result_fd)
        # Retire witnesses and this observer's inherited input copies before the
        # self-usage sample. Its reporting channel and standard streams still
        # have their own later closure/exit windows.
        for _, _, close_fd in handoff_fds: close_fd()
        handoff_fds.clear()
        if close_pidfd is not None:close_pidfd();pidfd=None
        close_executable();executable=None
        input_retirement=inputs.retire()
        # RUSAGE_SELF is observer-only. The parent's terminal wait4 is not:
        # Linux also propagates waited descendant usage into that result.
        self_sample_started_ns=time.monotonic_ns()
        cleanup_rusage_after=_self_rusage()
        self_sample_ended_ns=time.monotonic_ns()
        cleanup_fd_count=len(os.listdir('/proc/self/fd'))
        cleanup_ended_ns=time.monotonic_ns()
        cleanup={'format':'VOID_V45_WORKER_OBSERVER_POST_REPORT_CLEANUP_V3',
            'invocation_id':request['invocation_id'],'scenario_id':request['scenario_id'],
            'observer_pid':observer['pid'],'observer_starttime_ticks':observer['starttime_ticks'],
            'report_sent_ns':report_sent_ns,'cleanup_ended_ns':cleanup_ended_ns,
            'elapsed_after_report_ns':cleanup_ended_ns-report_sent_ns,
            'rusage_delta_after_report':_rusage_delta(observer_rusage_after,cleanup_rusage_after),
            'fd_count_at_report':observer_fd_at_report,'fd_count_after_internal_cleanup':cleanup_fd_count,
            'self_rusage_at_cleanup':cleanup_rusage_after,
            'self_sample_started_ns':self_sample_started_ns,'self_sample_ended_ns':self_sample_ended_ns,
            'self_rusage_scope':'observer_process_lifetime_through_cleanup_sample',
            'self_rusage_includes_waited_descendants':False,'post_sample_exit_tail_measured':False,
            'worker_pidfd_closed':True,'direct_child_pidfds_closed':True,'executable_fd_closed':True,
            'inherited_input_retirement':input_retirement,
            'report_channel_closes_after_cleanup_receipt':True,'syscall_count':None,'exact_fd_peak':None,
            'complete_cleanup_ledger':False}
        cleanup['cleanup_sha256']=digest(canon(cleanup))
        channel.send({'status':'CLEANUP','cleanup':cleanup})
        channel.close()
    return 0 if outcome=='OBSERVED' else 2


def invocation_observer_main(args) -> int:
    p=argparse.ArgumentParser()
    for key in ('channel','request','source','worker','cwd','log'):
        p.add_argument('--'+key+'-fd',type=int,required=True)
    p.add_argument('--fixture-fd',type=int)
    p.add_argument('--output',required=True);p.add_argument('--deadline-ns',type=int,required=True)
    ns=p.parse_args(args)
    invocation_observer_trace_start()
    return observe_invocation_worker(ns)


if __name__=='__main__':
    if sys.argv[1:2] == ['--local-invocation-observer']:
        raise SystemExit(invocation_observer_main(sys.argv[2:]))
    p=argparse.ArgumentParser();p.add_argument('--channel-fd',type=int,required=True)
    p.add_argument('--capture-resources', action='store_true')
    p.add_argument('--context-fd',type=int,required=True);p.add_argument('--source-fd',type=int,required=True)
    try:raise SystemExit(serve(p.parse_args()))
    except (CustodyHold,OSError,ValueError,KeyError,TypeError):raise SystemExit(2)
