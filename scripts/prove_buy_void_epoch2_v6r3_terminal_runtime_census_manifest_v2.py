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
SOURCE=ROOT/"ops/precision/void_buy_void_epoch2_v6r3_terminal_runtime_census_manifest_v2.py"
CONTRACT=ROOT/"ops/security/buy-void-epoch2-v6r3-python-runtime-closure-contract-v2.json"
FRESHNESS=ROOT/"ops/security/buy-void-epoch2-v6r3-python-runtime-closure-freshness-gate-v2.json"

SOURCE_BLOB="70727eb4a46890574fc3336e3f0931947b247257"
CONTRACT_BLOB="c56361ecaccb916a79591c016200b8dc02f5ca54"
FRESHNESS_BLOB="66c1e4da7800de930804b195db6b56d8fe29b8f4"
CONTRACT_ID="voidbuye2v6r3pyruntimecontract2_6fe0f7e5779d998659ffb67d64832e9ce5babac92584c88f43c1400cef3e4e50"
FRESHNESS_ID="voidbuye2v6r3pyclosurefreshness2_53653912534048b7be8b02aed429a28383edb9b419632e7e1d8fd32a19050414"
LOCK=ROOT/"ops/security/buy-void-epoch2-v6r3-plan-first-entry-binary-candidate-lock-v2.json"
LOCK_BLOB="14a3ff2eca0583d1355dc8b75bd54cc55115d946"
LOCK_ID="voidbuye2v6r3planfirstentrybinlock2_b5e1bbca28ed7aad579ac7f37a7575ed90eadd44f73d24edac79df3cc74664c1"
SOURCE_V1_BLOB="05458587b5743da09ed2f752e971ca67938cceac"
MARKER="VOID_BUY_VOID_EPOCH2_V6R3_TERMINAL_RUNTIME_CENSUS_MANIFEST_V2"

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
lock_raw=exact(LOCK,128*1024)
assert git_blob(contract_raw)==CONTRACT_BLOB
assert git_blob(fresh_raw)==FRESHNESS_BLOB
assert git_blob(lock_raw)==LOCK_BLOB
contract=json.loads(contract_raw)
fresh=json.loads(fresh_raw)
lock=json.loads(lock_raw)
assert contract["contract_id"]==CONTRACT_ID
assert fresh["gate_id"]==FRESHNESS_ID
assert lock["lock_id"]==LOCK_ID
assert contract["schema"]=="void_buy_void_epoch2_v6r3_python_runtime_closure_contract_v2"
assert fresh["schema"]=="void_buy_void_epoch2_v6r3_python_runtime_closure_freshness_gate_v2"
assert contract["first_entry_binary_lock"]["lock_id"]==LOCK_ID
assert contract["first_entry_binary_lock"]["git_blob_sha1"]==LOCK_BLOB
assert fresh["parent"]["closure_contract_id"]==CONTRACT_ID
assert fresh["parent"]["closure_contract_git_blob_sha1"]==CONTRACT_BLOB
assert fresh["parent"]["native_first_entry_lock_id"]==LOCK_ID
assert fresh["parent"]["native_first_entry_lock_git_blob_sha1"]==LOCK_BLOB
assert contract["authority"]["python_runtime_closure_accepted"] is False
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
assert isinstance(assignments["VERSION"],ast.Constant) and assignments["VERSION"].value==2
assert isinstance(assignments["HOST_EXECUTION_ENABLED"],ast.Constant)
assert assignments["HOST_EXECUTION_ENABLED"].value is False
for required in (
    'CONTRACT_ID="'+CONTRACT_ID+'"',
    'FRESHNESS_GATE_ID="'+FRESHNESS_ID+'"',
    'CONTRACT_BLOB="'+CONTRACT_BLOB+'"',
    'FRESHNESS_GATE_BLOB="'+FRESHNESS_BLOB+'"',
    'FIRST_ENTRY_LOCK_ID="'+LOCK_ID+'"',
    'FIRST_ENTRY_LOCK_BLOB="'+LOCK_BLOB+'"',
    'SOURCE_V1_BLOB="'+SOURCE_V1_BLOB+'"',
    '"git_subprocess_runtime_closure_accepted":False',
    '"installed_first_entry_binary_identity_proven":False',
    "git_subprocess_runtime_closure_overclaim_rejected=true",
    "installed_first_entry_binary_overclaim_rejected=true",
    "MAX_TREE_ENTRIES=100_000",
    "MAX_INPUT_PATH_BYTES=4096",
    "def require_manifest_input_budget(",
    "require_manifest_input_budget(sys_path,declared_absent,accessed_paths)",
    'raise Hold("manifest_input_path_count_exceeded")',
    'raise Hold("manifest_input_byte_budget_exceeded")',
    'raise Hold("manifest_input_path_length_exceeded")',
    'raise Hold("manifest_input_sequence_invalid")',
    'raise Hold("manifest_input_path_invalid")',
    "census_input_cardinality_and_byte_budget_pretraversal=true",
    "posixpath.normpath(display_path)!=display_path",
    "resolved=_contained_resolve(",
    'raise Hold("absence_intermediate_symlink_forbidden:"',
    'raise Hold("sys_path_not_inventoried_or_absent:"',
    'raise Hold("sys_path_special_or_symlink_authority:"',
    'raise Hold("sys_path_invalid_or_noncanonical")',
    "def _contained_resolve(",
    "symlink_resolution_hop_limit:",
    "symlink_target_outside_inventory_root:",
    "outside_intermediate_symlink_hop_accepted",
    "symlink_hop_limit_rejects_cycles=true",
    "symlink_missing_component_parent_reentry:",
    "missing_component.lstat()",
    "missing_component_out=missing_components",
    "missing_component_reentry_reported_existing_leaf",
    "contained_dangling_symlink_remains_absent=true",
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
assert "missing_component_out=missing_components" in source
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
        "symlink_missing_component_parent_reentry_rejected=true",
        "contained_dangling_symlink_remains_absent=true",
        "absence_intermediate_symlink_escape_rejected=true",
        "absence_parent_symlink_alias_rejected=true",
        "sys_path_must_be_inventoried_or_explicitly_absent=true",
        "census_input_cardinality_and_byte_budget_pretraversal=true",
        "census_unbounded_generator_and_oversize_path_rejected=true",
        "noncanonical_manifest_paths_rejected=true",
        "discovered_entry_budget_includes_queued_directories=true",
        "scandir_consumption_bounded_before_sort=true",
        "over_budget_synthetic_scandir_rejected=true",
        "terminal_manifest_drift_rejected=true",
        "post_exec_dumpability_overclaim_rejected=true",
        "git_subprocess_runtime_closure_overclaim_rejected=true",
        "installed_first_entry_binary_overclaim_rejected=true",
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
        "first_entry_lock_id="+LOCK_ID,
        "first_entry_lock_blob="+LOCK_BLOB,
        "source_v1_blob="+SOURCE_V1_BLOB,
        "host_execution_enabled=false",
        "host_census_authorized=false",
        "protected_install_authorized=false",
        "post_exec_dumpability_accepted=false",
        "git_subprocess_runtime_closure_accepted=false",
        "installed_first_entry_binary_identity_proven=false",
        "host_plan_authorized=false",
        "credential_access=false",
        "signing=false",
        "transaction=false",
        "funds_movement=false",
        "next_gate=source_authenticated_host_observer_adapter_v2",
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
print("v2_binary_identity_lock_bound=true")
print("v1_substrate_source_lineage_bound=true")
print("fixture_only_inventory_proven=true")
print("scandir_entry_bound_before_materialization_proven=true")
print("queued_directory_budget_proven=true")
print("symlink_hop_confinement_proven=true")
print("symlink_missing_parent_reentry_hold_proven=true")
print("absence_parent_and_sys_path_coverage_proven=true")
print("census_input_budget_pretraversal_proven=true")
print("host_execution_enabled=false")
print("host_census_authorized=false")
print("protected_install_authorized=false")
print("post_exec_dumpability_accepted=false")
print("host_plan_authorized=false")
print("funds_movement=false")
