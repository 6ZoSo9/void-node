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

LOCK_ID="voidbuye2runnerpollock6r3_20603b85f690336180fd024c3ae632e01025e511cf893b04055967cdd0a59d67"
CANDIDATE_ID="voidbuye2runnerpolcand6r3_7efa1fbe6ea7d457fa8ea0ae59e5b528010957aa914a05b456b8c5443b5c0c6d"
LOCK_BLOB="84aed3b9c1f0f3f540c7d12b4cc33d0c132a74f0"
RUNNER_BLOB="62029fafa7073ab3768fec01f2147a7f4eefce2b"
RUNNER_SHA256="0f87747439b82887033295cf04022c9a2a491c726f8d6acad8b0efc2e8dcdc71"
RUNTIME_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"

def git_blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw).hexdigest()

assert git_blob(LOCK.read_bytes())==LOCK_BLOB
assert git_blob(RUNNER.read_bytes())==RUNNER_BLOB
assert hashlib.sha256(RUNNER.read_bytes()).hexdigest()==RUNNER_SHA256

source=TARGET.read_text()
tree=ast.parse(source)
for name in (
    "source_snapshot","snapshot_host_file","build_policy","verify_generation",
    "verify_v4_predecessor","classify_state","collect_plan","source_plan",
    "self_test","emit_plan",
):
    assert any(isinstance(node,ast.FunctionDef) and node.name==name for node in tree.body),name

for required in (
    'LOCK_ID="voidbuye2runnerpollock6r3_20603b85f690336180fd024c3ae632e01025e511cf893b04055967cdd0a59d67"',
    'CANDIDATE_ID="voidbuye2runnerpolcand6r3_7efa1fbe6ea7d457fa8ea0ae59e5b528010957aa914a05b456b8c5443b5c0c6d"',
    'RUNTIME_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"',
    'NEW_RUNNER_SHA256="0f87747439b82887033295cf04022c9a2a491c726f8d6acad8b0efc2e8dcdc71"',
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
            "atomic_root_exchange_required=true",
            "filesystem_write=false",
            "credential_access=false",
            "transaction=false",
            "funds_movement=false",
            "next_action=SEPARATELY_AUTHORIZE_EPOCH2_V6R3_NONEXECUTING_HOST_PLAN",
        ):
            assert line in lines,line

lock=json.loads(LOCK.read_bytes())
assert lock["lock_id"]==LOCK_ID
assert lock["candidate_report"]["candidate_id"]==CANDIDATE_ID
assert lock["protected_install_authorized"] is False
assert lock["live_execution_authorized"] is False

print("VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_UPGRADE_PLAN_V6R3_PROOF_GREEN")
print("accepted_lock_blob_bound=true")
print("accepted_runner_blob_bound=true")
print("nonexecuting_plan_only=true")
print("no_apply_mode=true")
print("runtime_policy_head_preserved=true")
print("full_root_atomic_exchange_required=true")
print("v6r2_predecessor_retention_required=true")
print("filesystem_write=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("funds_movement=false")
