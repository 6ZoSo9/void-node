#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"ops/precision/void_buy_void_epoch2_v6r3_terminal_runtime_census_manifest_v1.py"
CONTRACT=ROOT/"ops/security/buy-void-epoch2-v6r3-python-runtime-closure-contract-v1.json"
FRESHNESS=ROOT/"ops/security/buy-void-epoch2-v6r3-python-runtime-closure-freshness-gate-v1.json"

SOURCE_BLOB="99a2d7337af52fbfadce48e98a0499b57f9507e8"
CONTRACT_BLOB="c70dfd9da29c75b348a3619f6df7329381e939cf"
FRESHNESS_BLOB="9657fff243e44135e1f992b1ef5b8e0d977b8b65"
CONTRACT_ID="voidbuye2v6r3pyruntimecontract1_cdb98f511f04a3c798200e304481ec14d94373fdbdf6ec30cf88b0e281b0eb4f"
FRESHNESS_ID="voidbuye2v6r3pyclosurefreshness1_66f0fc4c608ab2874e75620e0e4037c9a672369fbd460b12a35a0b0600398a66"
MARKER="VOID_BUY_VOID_EPOCH2_V6R3_TERMINAL_RUNTIME_CENSUS_MANIFEST_V1"

def git_blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw).hexdigest()

def exact(path:Path,maximum:int)->bytes:
    st=path.lstat()
    assert stat.S_ISREG(st.st_mode) and not stat.S_ISLNK(st.st_mode)
    assert st.st_nlink==1 and 0<st.st_size<=maximum
    fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_NONBLOCK)
    try:
        opened=os.fstat(fd)
        fields=("st_dev","st_ino","st_mode","st_uid","st_gid","st_nlink","st_size","st_mtime_ns","st_ctime_ns")
        assert all(getattr(st,k)==getattr(opened,k) for k in fields)
        chunks=[];remaining=opened.st_size
        while remaining:
            chunk=os.read(fd,min(65536,remaining));assert chunk
            chunks.append(chunk);remaining-=len(chunk)
        assert os.read(fd,1)==b""
        after=os.fstat(fd);visible=path.lstat()
        assert all(getattr(opened,k)==getattr(after,k)==getattr(visible,k) for k in fields)
        return b"".join(chunks)
    finally:
        os.close(fd)

source_raw=exact(SOURCE,1024*1024)
assert git_blob(source_raw)==SOURCE_BLOB
contract_raw=exact(CONTRACT,128*1024)
fresh_raw=exact(FRESHNESS,128*1024)
assert git_blob(contract_raw)==CONTRACT_BLOB
assert git_blob(fresh_raw)==FRESHNESS_BLOB
contract=json.loads(contract_raw)
fresh=json.loads(fresh_raw)
assert contract["contract_id"]==CONTRACT_ID
assert fresh["gate_id"]==FRESHNESS_ID
assert contract["authority"]["host_census_authorized"] is False
assert contract["runtime_process"]["post_exec_dumpability_accepted"] is False
assert fresh["authority"]["host_census_authorized"] is False
assert fresh["mandatory_live_gate"]["installed_enforcement_source_proven"] is False
assert fresh["mandatory_live_gate"]["installed_post_exec_dumpability_enforcement_source_proven"] is False

source=source_raw.decode("utf-8","strict")
tree=ast.parse(source)
assignments={
    node.targets[0].id:node.value
    for node in tree.body
    if isinstance(node,ast.Assign)
    and len(node.targets)==1
    and isinstance(node.targets[0],ast.Name)
}
assert isinstance(assignments["HOST_EXECUTION_ENABLED"],ast.Constant)
assert assignments["HOST_EXECUTION_ENABLED"].value is False
for required in (
    'CONTRACT_ID="'+CONTRACT_ID+'"',
    'FRESHNESS_GATE_ID="'+FRESHNESS_ID+'"',
    'CONTRACT_BLOB="'+CONTRACT_BLOB+'"',
    'FRESHNESS_GATE_BLOB="'+FRESHNESS_BLOB+'"',
    "MAX_TREE_ENTRIES=100_000",
    "def _contained_resolve(",
    "symlink_resolution_hop_limit:",
    "symlink_target_outside_inventory_root:",
    "outside_intermediate_symlink_hop_accepted",
    "symlink_hop_limit_rejects_cycles=true",
    "discovered_count=1",
    "with os.scandir(current) as iterator:",
    "discovered_count+=1",
    "if discovered_count>MAX_TREE_ENTRIES:",
    "entries.append(entry)",
    'entries.sort(key=lambda e:e.name,reverse=True)',
    "observed[0]==2",
    "MAX_REGULAR_FILE_BYTES=512*1024*1024",
    "MAX_REPORT_BYTES=16*1024*1024",
    "os.O_NOFOLLOW|os.O_NONBLOCK",
    'raise Hold("special_file_forbidden:"',
    'raise Hold("declared_absence_materialized:"',
    'raise Hold("unaccepted_runtime_file_access")',
    'raise Hold("terminal_manifest_changed")',
    'raise Hold("directory_generation_changed_during_inventory:"',
    'raise Hold("symlink_generation_changed_after_resolution:"',
    'raise Hold("symlink_target_outside_inventory_root:"',
    'raise Hold("symlink_resolved_special_file_forbidden:"',
    '"post_exec_dumpability_verified":False',
    '"post_exec_dumpability_accepted":False',
    'print("host_execution_enabled=false")',
    'print("host_census_authorized=false")',
):
    assert required in source,required
assert "sorted(os.scandir(current)" not in source
assert "entries=sorted(os.scandir(current)" not in source
assert "os.path.realpath(path)" not in source[source.index("def symlink_record("):source.index("def _display(")]
assert "resolved=_contained_resolve(path,real_root,display_path)" in source
# The over-budget sentinel must be rejected before any queued/stat/read work.
body=source[source.index("with os.scandir(current) as iterator:"):source.index("for entry in entries:")]
assert body.index("if discovered_count>MAX_TREE_ENTRIES:") < body.index("entries.append(entry)")
assert body.index("entries.append(entry)") < body.index("entries.sort(")

for forbidden in (
    "import subprocess","subprocess.","os.system(","os.popen(","sudo",
    "rm -rf","/opt/","--host-census","--run","--apply",
):
    assert forbidden not in source,forbidden

# This candidate exposes only fixture self-test and source-plan CLI modes.
assert 'modes.add_argument("--self-test"' in source
assert 'modes.add_argument("--source-plan"' in source
assert source.count("modes.add_argument(")==2

env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC"}
for mode,required_lines in (
    ("--self-test",(
        MARKER+"_SELF_TEST_GREEN",
        "bounded_no_follow_regular_hashing=true",
        "complete_directory_regular_symlink_inventory=true",
        "declared_absence_parent_identity_bound=true",
        "special_files_rejected=true",
        "symlink_intermediate_outside_root_rejected=true",
        "symlink_hop_limit_rejects_cycles=true",
        "discovered_entry_budget_includes_queued_directories=true",
        "scandir_consumption_bounded_before_sort=true",
        "over_budget_synthetic_scandir_rejected=true",
        "terminal_manifest_drift_rejected=true",
        "post_exec_dumpability_overclaim_rejected=true",
        "host_execution_enabled=false",
        "host_census_authorized=false",
        "host_plan_authorized=false",
        "funds_movement=false",
    )),
    ("--source-plan",(
        MARKER,
        "mode=source-plan",
        "contract_id="+CONTRACT_ID,
        "freshness_gate_id="+FRESHNESS_ID,
        "contract_blob="+CONTRACT_BLOB,
        "freshness_gate_blob="+FRESHNESS_BLOB,
        "host_execution_enabled=false",
        "host_census_authorized=false",
        "protected_install_authorized=false",
        "post_exec_dumpability_accepted=false",
        "host_plan_authorized=false",
        "credential_access=false",
        "signing=false",
        "transaction=false",
        "funds_movement=false",
        "next_gate=source_authenticated_host_observer_adapter",
    )),
):
    cp=subprocess.run(
        [sys.executable,"-I","-B","-S",str(SOURCE),mode],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,encoding="utf-8",errors="strict",env=env,timeout=30,check=False,
    )
    assert cp.returncode==0,(mode,cp.stdout,cp.stderr)
    assert cp.stderr=="",(mode,cp.stderr)
    lines=set(cp.stdout.splitlines())
    for line in required_lines:
        assert line in lines,(mode,line)

print(MARKER+"_PROOF_GREEN")
print("source_blob="+SOURCE_BLOB)
print("corrected_contract_bound=true")
print("freshness_gate_bound=true")
print("fixture_only_inventory_proven=true")
print("scandir_entry_bound_before_materialization_proven=true")
print("queued_directory_budget_proven=true")
print("symlink_hop_confinement_proven=true")
print("host_execution_enabled=false")
print("host_census_authorized=false")
print("protected_install_authorized=false")
print("post_exec_dumpability_accepted=false")
print("host_plan_authorized=false")
print("funds_movement=false")
