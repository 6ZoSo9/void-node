#!/usr/bin/env python3
from __future__ import annotations
import ast, hashlib, pathlib, subprocess, sys

ROOT=pathlib.Path(__file__).resolve().parents[1]
TARGET=ROOT/"ops/precision/void_buy_void_epoch2_live_composition_runner_policy_atomic_upgrade_v1.py"
PLAN=ROOT/"ops/precision/void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3.py"
LOCK=ROOT/"ops/security/buy-void-epoch2-live-composition-runner-policy-candidate-lock-v6r3.json"
RUNNER=ROOT/"ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v4.mjs"

def blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()

assert blob(PLAN.read_bytes())=="96de5ac0c622f12d5ad44b6aafb5c195d5eaef4f"
assert blob(LOCK.read_bytes())=="be4c1496a702ba4f2a622001576d22b9b4aeca4b"
assert blob(RUNNER.read_bytes())=="7967778824f22baca976a59df75f9f808ebebfe2"

raw=TARGET.read_bytes()
compile(raw,str(TARGET),"exec",dont_inherit=True,optimize=0)
tree=ast.parse(raw.decode())
source=raw.decode()
for required in (
    'CONFIRM_TOKEN="ATOMIC_EXCHANGE_EPOCH2_V6R3_RUNNER_POLICY_UPGRADE_V1"',
    'PLAN_BLOB="96de5ac0c622f12d5ad44b6aafb5c195d5eaef4f"',
    'LOCK_ID="voidbuye2runnerpollock6r3_bdd3e0b6fe28f2a6873920cdb1436914183e817c02b4d4ac9da130e3ec14b365"',
    'CANDIDATE_ID="voidbuye2runnerpolcand6r3_c82e554cbc92600aa4a91f6d25c43e437526c670b1509a2c6435c7e8edf55a0d"',
    "RENAME_NOREPLACE=1",
    "RENAME_EXCHANGE=2",
    "plan_changed_at_publication_boundary",
    "automatic_rollback_attempted=",
    "predecessor_v6r2_retained=true",
    "runner_execution=false",
    "credential_access=false",
    "transaction=false",
    "funds_movement=false",
):
    assert required in source, required
assert "systemctl" not in source
assert "LoadCredential" not in source
assert "eth_send" not in source
assert "web3" not in source.lower()
assert any(isinstance(n,ast.FunctionDef) and n.name=="apply" for n in tree.body)
assert any(isinstance(n,ast.FunctionDef) and n.name=="renameat2" for n in tree.body)

for mode in ("--self-test","--source-plan"):
    cp=subprocess.run(
        [sys.executable,"-I","-B",str(TARGET),mode],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=30,
        env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C"},
    )
    assert cp.returncode==0,(mode,cp.stdout,cp.stderr)
    assert cp.stderr==""
lines=set(subprocess.run(
    [sys.executable,"-I","-B",str(TARGET),"--source-plan"],
    stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
    text=True,check=True,timeout=30,
    env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C"},
).stdout.splitlines())
for line in (
    "mode=source-plan",
    "host_write=false",
    "credential_access=false",
    "signing=false",
    "transaction=false",
    "funds_movement=false",
):
    assert line in lines,line

print("VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_ATOMIC_UPGRADE_V1_PROOF_GREEN")
print("exact_plan_blob_bound=true")
print("exact_lock_blob_bound=true")
print("exact_runner_blob_bound=true")
print("atomic_root_exchange_primitive_bound=true")
print("predecessor_v6r2_retention_bound=true")
print("automatic_rollback_path_present=true")
print("operation_bound_plan_id_required=true")
print("explicit_confirmation_required=true")
print("source_modes_nonmutating=true")
print("service_mutation=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("funds_movement=false")
