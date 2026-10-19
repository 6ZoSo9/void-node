#!/usr/bin/env python3
from __future__ import annotations
import ast, hashlib, pathlib, subprocess, sys

ROOT=pathlib.Path(__file__).resolve().parents[1]
TARGET=ROOT/"ops/precision/void_buy_void_epoch2_live_composition_v6r3_installed_qualification_v1.py"
EXECUTOR=ROOT/"ops/precision/void_buy_void_epoch2_live_composition_runner_policy_atomic_upgrade_v1.py"
PLAN=ROOT/"ops/precision/void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3.py"

def blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()

assert blob(EXECUTOR.read_bytes())=="f0a992c0d4880268ff4ad8f180f73109477dd90d"
assert blob(PLAN.read_bytes())=="96de5ac0c622f12d5ad44b6aafb5c195d5eaef4f"

raw=TARGET.read_bytes(); source=raw.decode()
compile(raw,str(TARGET),"exec",dont_inherit=True,optimize=0)
tree=ast.parse(source)
for required in (
    'MARKER="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_V6R3_INSTALLED_QUALIFICATION_V1"',
    'EXECUTOR_BLOB="f0a992c0d4880268ff4ad8f180f73109477dd90d"',
    'PLAN_BLOB="96de5ac0c622f12d5ad44b6aafb5c195d5eaef4f"',
    "before=snapshot(executor,expected_source_head)",
    "middle=snapshot(executor,expected_source_head)",
    "after=snapshot(executor,expected_source_head)",
    "run_native_self_test(executor,before",
    "run_native_self_test(executor,middle",
    "predecessor_v6r2_retained",
    "predecessor_v4_retained",
    '"runner_execution":False',
    '"credential_access":False',
    '"transaction":False',
    '"funds_movement":False',
):
    assert required in source,required
assert any(isinstance(n,ast.FunctionDef) and n.name=="collect" for n in tree.body)
assert "systemctl" not in source
assert "eth_send" not in source
assert "web3" not in source.lower()

for mode in ("--self-test","--plan"):
    cp=subprocess.run(
        [sys.executable,"-I","-B",str(TARGET),mode],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=30,
        env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C"},
    )
    assert cp.returncode==0,(mode,cp.stdout,cp.stderr)
    assert cp.stderr==""

lines=set(subprocess.run(
    [sys.executable,"-I","-B",str(TARGET),"--plan"],
    stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
    text=True,check=True,timeout=30,
    env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C"},
).stdout.splitlines())
for line in (
    "mode=plan","read_only=true","root_required_for_run=true",
    "triple_installed_snapshot_required=true",
    "double_descriptor_bound_native_self_test_required=true",
    "runner_execution=false","credential_access=false","signing=false",
    "transaction=false","funds_movement=false",
    "production_host_evidence_authority=false",
):
    assert line in lines,line

print("VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_V6R3_INSTALLED_QUALIFICATION_V1_PROOF_GREEN")
print("exact_executor_blob_bound=true")
print("exact_plan_blob_bound=true")
print("triple_snapshot_contract_bound=true")
print("double_descriptor_native_self_test_bound=true")
print("v6r2_predecessor_retention_bound=true")
print("v4_predecessor_retention_bound=true")
print("runner_execution=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("funds_movement=false")
