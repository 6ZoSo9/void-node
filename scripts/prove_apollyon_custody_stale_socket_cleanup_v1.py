#!/usr/bin/env python3
from __future__ import annotations
import ast
import importlib.util
import os
import subprocess
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
HELPER=ROOT/"ops/xiphos/apollyon_custody_stale_socket_cleanup_v1.py"
UNIT=ROOT/"ops/xiphos/void-apollyon-authorization-custody-v1.service"

source=HELPER.read_text(encoding="utf-8")
ast.parse(source)
for required in (
    'SOCKET_PATH=SOCKET_PARENT/"custody.sock"',
    'HIDDEN_RE=re.compile(r"^\\.v[0-9a-f]{4}$")',
    'status==errno.ENOENT',
    'status!=errno.ECONNREFUSED',
    'hold("advertised_socket_still_listening")',
    'current.st_nlink==2 and len(hidden)!=1',
    'os.unlink(hidden[0])',
    'os.unlink(SOCKET_PATH)',
    'os.fsync(dfd)',
    'custody_uid_process_pids',
    'custody_uid_process_exclusivity_failed',
    'require_custody_uid_exclusive(uid)',
):
    assert required in source,required
cleanup_source=source[source.index("def cleanup()->dict:"):source.index("def self_test()->None:")]
assert cleanup_source.count("require_custody_uid_exclusive(uid)")==3
first_gate=cleanup_source.index("require_custody_uid_exclusive(uid)")
hidden_unlink=cleanup_source.index("os.unlink(hidden[0])")
second_gate=cleanup_source.index("require_custody_uid_exclusive(uid)",first_gate+1)
third_gate=cleanup_source.index("require_custody_uid_exclusive(uid)",second_gate+1)
socket_unlink=cleanup_source.index("os.unlink(SOCKET_PATH)")
assert first_gate<second_gate<hidden_unlink<third_gate<socket_unlink

spec=importlib.util.spec_from_file_location(
    "apollyon_custody_stale_socket_cleanup_v1",
    HELPER,
)
assert spec is not None and spec.loader is not None
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def write_status(
    proc_root:Path,
    pid:int,
    uids:tuple[int,int,int,int],
)->None:
    process_root=proc_root/str(pid)
    process_root.mkdir()
    (process_root/"status").write_text(
        "Name:\tsynthetic\n"
        + "Uid:\t"
        + "\t".join(str(value) for value in uids)
        + "\n",
        encoding="utf-8",
    )

def expect_hold(fn,reason:str)->None:
    try:
        fn()
    except module.Hold as exc:
        assert str(exc)==reason,(str(exc),reason)
    else:
        raise AssertionError("expected HOLD: "+reason)

custody_uid=4242
helper_pid=os.getpid()
second_pid=helper_pid+100000

with tempfile.TemporaryDirectory(prefix="apollyon-proc-helper-only-") as td:
    proc_root=Path(td)
    write_status(proc_root,helper_pid,(custody_uid,)*4)
    observed=module.custody_uid_process_pids(custody_uid,proc_root)
    assert observed=={helper_pid}
    assert module.exact_self_process_set(observed,helper_pid)
    original_census=module.custody_uid_process_pids
    try:
        module.custody_uid_process_pids=(
            lambda uid,proc_root=Path("/proc"): set(observed)
        )
        assert module.require_custody_uid_exclusive(custody_uid)=={helper_pid}
    finally:
        module.custody_uid_process_pids=original_census

with tempfile.TemporaryDirectory(prefix="apollyon-proc-second-") as td:
    proc_root=Path(td)
    write_status(proc_root,helper_pid,(custody_uid,)*4)
    write_status(proc_root,second_pid,(custody_uid,)*4)
    observed=module.custody_uid_process_pids(custody_uid,proc_root)
    assert observed=={helper_pid,second_pid}
    assert not module.exact_self_process_set(observed,helper_pid)
    original_census=module.custody_uid_process_pids
    try:
        module.custody_uid_process_pids=(
            lambda uid,proc_root=Path("/proc"): set(observed)
        )
        expect_hold(
            lambda:module.require_custody_uid_exclusive(custody_uid),
            "custody_uid_process_exclusivity_failed",
        )
    finally:
        module.custody_uid_process_pids=original_census

with tempfile.TemporaryDirectory(prefix="apollyon-proc-saved-fs-") as td:
    proc_root=Path(td)
    saved_pid=helper_pid+200000
    fs_pid=helper_pid+300000
    write_status(proc_root,saved_pid,(1,2,custody_uid,3))
    write_status(proc_root,fs_pid,(1,2,3,custody_uid))
    observed=module.custody_uid_process_pids(custody_uid,proc_root)
    assert observed=={saved_pid,fs_pid}

with tempfile.TemporaryDirectory(prefix="apollyon-proc-malformed-") as td:
    proc_root=Path(td)
    malformed_pid=helper_pid+400000
    process_root=proc_root/str(malformed_pid)
    process_root.mkdir()
    (process_root/"status").write_text(
        "Name:\tsynthetic\nUid:\t4242\t4242\n",
        encoding="utf-8",
    )
    expect_hold(
        lambda:module.custody_uid_process_pids(custody_uid,proc_root),
        "custody_process_status_uid_invalid",
    )

with tempfile.TemporaryDirectory(prefix="apollyon-proc-unreadable-") as td:
    proc_root=Path(td)
    unreadable_pid=helper_pid+500000
    process_root=proc_root/str(unreadable_pid)
    process_root.mkdir()
    (process_root/"status").write_bytes(b"\xff")
    expect_hold(
        lambda:module.custody_uid_process_pids(custody_uid,proc_root),
        "custody_process_status_unreadable:"+str(unreadable_pid),
    )

for forbidden in (
    "subprocess.","systemctl","service ","sudo ","PRIVATE KEY","eth_sendRawTransaction",
):
    assert forbidden not in source,forbidden

unit=UNIT.read_text(encoding="utf-8")
expected=(
    "ExecStopPost=/usr/bin/python3 -I -B "
    "/opt/void-apollyon-custody-lifecycle-v1/"
    "apollyon_custody_stale_socket_cleanup_v1.py --cleanup"
)
assert expected in unit
assert unit.count("ExecStopPost=")==1

r=subprocess.run(
    ["python3","-I","-B",str(HELPER),"--self-test"],
    cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=20,
)
assert r.returncode==0,r.stderr
for line in (
    "VOID_APOLLYON_CUSTODY_STALE_SOCKET_CLEANUP_V1_SELF_TEST_GREEN",
    "fixed_socket_path=true","same_inode_hidden_cleanup=true",
    "custody_uid_process_exclusivity_required=true",
    "second_custody_uid_process_rejected=true",
    "live_listener_refused=true","stale_socket_cleanup_external_fulfilled=true",
):
    assert line in r.stdout,line
print("VOID_APOLLYON_CUSTODY_STALE_SOCKET_CLEANUP_V1_PROOF_GREEN")
print("custody_uid_process_exclusivity_required=true")
print("custody_uid_process_census_executed=true")
print("helper_only_process_set_accepted=true")
print("second_custody_uid_process_rejected=true")
print("saved_fs_uid_slots_counted=true")
print("malformed_live_process_status_rejected=true")
print("unreadable_live_process_status_rejected=true")
