#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
TARGET=ROOT/"ops/precision/void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3.py"
LOCK=ROOT/"ops/security/buy-void-epoch2-live-composition-runner-policy-candidate-lock-v6r3.json"
RUNNER=ROOT/"ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v4.mjs"

LOCK_ID="voidbuye2runnerpollock6r3_7d7410e17650b6112c2f238ea8b59b7510711d8bb4300434ce439332a93aebaf"
CANDIDATE_ID="voidbuye2runnerpolcand6r3_e8fd215f560d8bc0d33f36057967e03a3f3cd6bf90230a776c307e32271c3020"
LOCK_BLOB="4cc5f59fd50b6bfac532d057f361af8f819adfc0"
RUNNER_BLOB="9e4a87c7f1fda092f16dcd859241cced41960fb8"
PLAN_BLOB="7d7f4e7e00b77b5513c072421287a9219ec72381"
RUNNER_SHA256="a98c845855a8774d3a60835dabe2f1ec1c2d2e129134fdfc963f0f8cecfddd27"
RUNTIME_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"

def git_blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw).hexdigest()

assert git_blob(TARGET.read_bytes())==PLAN_BLOB
assert git_blob(LOCK.read_bytes())==LOCK_BLOB
assert git_blob(RUNNER.read_bytes())==RUNNER_BLOB
assert hashlib.sha256(RUNNER.read_bytes()).hexdigest()==RUNNER_SHA256

source=TARGET.read_text()
tree=ast.parse(source)
for name in (
    "source_snapshot","snapshot_host_file","build_policy","verify_generation",
    "verify_v4_predecessor","classify_state","_collect_plan_with_observers",
    "collect_plan","source_plan",
    "self_test","emit_plan",
):
    assert any(isinstance(node,ast.FunctionDef) and node.name==name for node in tree.body),name

for required in (
    'LOCK_ID="voidbuye2runnerpollock6r3_7d7410e17650b6112c2f238ea8b59b7510711d8bb4300434ce439332a93aebaf"',
    'CANDIDATE_ID="voidbuye2runnerpolcand6r3_e8fd215f560d8bc0d33f36057967e03a3f3cd6bf90230a776c307e32271c3020"',
    'RUNTIME_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"',
    'QUALIFIER_REPLACEMENT_BLOB="98f8b9fda89e33c50e19008268d97655aad54e6d"',
    'V6_QUALIFIER_BLOB="83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc"',
    'V6_REPLACEMENT_BLOB="f81d9fbead60593258d17dbb8720e1efc867b20f"',
    'CREDENTIAL_LOCK_V3R_BLOB="c4870f3178aebc9a0bb6557562f663b8480cfefa"',
    'CREDENTIAL_LOCK_V2_BLOB="b73415ce8fc95ff2d49cbde97a15d701ad5b7937"',
    'V6_LOCK_BLOB="772945b639d138284fc18cc312f7b9115b10c748"',
    'V4_PARSER_BLOB="223a8acf32f8c7961d61222b83c0db17075f86c6"',
    'SOURCE_RUNTIME_DEPENDENCY_SPECS=(',
    '"runtime_source_dependency_count":len(SOURCE_RUNTIME_DEPENDENCY_SPECS)',
    "def raw_commit_parents(oid:str)->list[str]:",
    "def require_actual_object_ancestry(source_head:str)->None:",
    'git(["cat-file","-t",oid])',
    'git(["cat-file","-p",oid],binary=True)',
    "source_runtime_actual_object_ancestry_not_found",
    "source_runtime_graft_ancestry_rejected=true",
    '"runtime_source_complete_dependency_set_bound":True',
    '"source_terminal_revalidated":True',
    'source_after=source_snapshot_fn()',
    'if source_after!=source_before:',
    'raise PlanError("source_generation_changed_during_plan")',
    'NEW_RUNNER_SHA256="a98c845855a8774d3a60835dabe2f1ec1c2d2e129134fdfc963f0f8cecfddd27"',
    'PREDECESSOR_V6R2_ROOT=',
    '"full_root_stage_required":True',
    '"atomic_root_exchange_required":True',
    '"rename_exchange_required":True',
    '"rename_noreplace_predecessor_required":True',
    '"predecessor_v6r2_retention_required":True',
    '"automatic_rollback_required":True',
    '"filesystem_write":False',
    '"runner_execution":False',
    '"native_execution":False',
    '"credential_access":False',
    '"signing":False',
    '"transaction":False',
    '"funds_movement":False',
):
    assert required in source,required
assert "--apply" not in source
assert "os.rename(" not in source
assert "renameat2" not in source
assert "subprocess.Popen" not in source

python=sys.executable
for mode in ("--self-test","--source-plan"):
    cp=subprocess.run(
        [python,"-I","-B",str(TARGET),mode],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,encoding="utf-8",errors="strict",
        env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC"},
        timeout=30,check=False,
    )
    assert cp.returncode==0,(mode,cp.stdout,cp.stderr)
    assert cp.stderr=="",(mode,cp.stderr)
    lines=set(cp.stdout.splitlines())
    if mode=="--self-test":
        for line in (
            "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_UPGRADE_PLAN_V6R3_SELF_TEST_GREEN",
            "runtime_policy_head_preserved=true",
            "accepted_v6r3_lock_bound=true",
            "native_v3_identity_reused=true",
            "runner_v4_identity_bound=true",
            "policy_node_identity_host_derived=true",
            "runtime_source_complete_dependency_set_bound=true",
            "source_runtime_actual_object_ancestry_required=true",
            "source_runtime_graft_ancestry_rejected=true",
            "runtime_source_dependency_count=9",
            "terminal_source_revalidation_required=true",
            "late_source_drift_rejected=true",
            "full_root_atomic_exchange_required=true",
            "v6r2_predecessor_retention_required=true",
            "filesystem_write=false",
            "credential_access=false",
            "transaction=false",
            "funds_movement=false",
        ):
            assert line in lines,line
    else:
        for line in (
            "mode=source-plan","source_only=true","host_read=false","host_write=false",
            "accepted_lock_id="+LOCK_ID,
            "accepted_candidate_id="+CANDIDATE_ID,
            "runtime_head="+RUNTIME_HEAD,
            "native_reused=true",
            "runtime_source_dependency_count=9",
            "runtime_source_complete_dependency_set_bound=true",
            "terminal_source_revalidation_required=true",
            "atomic_root_exchange_required=true",
            "filesystem_write=false",
            "credential_access=false",
            "transaction=false",
            "funds_movement=false",
            "next_action=SEPARATELY_AUTHORIZE_EPOCH2_V6R3_NONEXECUTING_HOST_PLAN",
        ):
            assert line in lines,line

lock=json.loads(LOCK.read_bytes())
assert lock["version"]==5
assert lock["integration_pr"]==3546
assert lock["integration_base_head"]=="0ada7fde0d90c3946b10693f4621cbd690bfcde6"
assert lock["integration_head"]=="a82f93fd11ecc76990cb73c844ec90b9503e8b9a"
assert lock["stacked_source_head_superseded_for_current_authority"]=="cb8554553dcc97e4abb5a9f8f15a26a487773fb5"
assert lock["lock_id"]==LOCK_ID
assert lock["candidate_report"]["candidate_id"]==CANDIDATE_ID
assert lock["candidate_report"]["source_compatibility"]["actual_object_ancestry_required"] is True
assert lock["candidate_report"]["source_compatibility"]["revision_walk_metadata_authority"] is False
assert lock["candidate_report"]["source_compatibility"]["graft_ancestry_authority"] is False
assert lock["protected_install_authorized"] is False
assert lock["live_execution_authorized"] is False

print("VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_UPGRADE_PLAN_V6R3_PROOF_GREEN")
print("main_based_integration_lock_bound=true")
print("planner_git_blob_bound=true")
print("accepted_lock_blob_bound=true")
print("accepted_runner_blob_bound=true")
print("nonexecuting_plan_only=true")
print("no_apply_mode=true")
print("runtime_policy_head_preserved=true")
print("runtime_source_complete_dependency_set_bound=true")
print("runtime_source_dependency_count=9")
print("terminal_source_revalidation_required=true")
print("late_source_drift_rejected=true")
print("source_runtime_actual_object_ancestry_required=true")
print("source_runtime_graft_ancestry_rejected=true")
print("full_root_atomic_exchange_required=true")
print("v6r2_predecessor_retention_required=true")
print("filesystem_write=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("funds_movement=false")
