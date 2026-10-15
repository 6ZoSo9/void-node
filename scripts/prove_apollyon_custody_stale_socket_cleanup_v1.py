#!/usr/bin/env python3
from __future__ import annotations
import ast
import subprocess
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
print("second_custody_uid_process_rejected=true")
