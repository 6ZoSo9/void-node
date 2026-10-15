#!/usr/bin/env python3
from __future__ import annotations

import ast
import importlib.util
import json
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/"ops/xiphos/apollyon-custody-target-stop-propagation-update-v1.json"
INSTALLER=ROOT/"ops/xiphos/apollyon_custody_target_stop_propagation_update_v1.py"
TARGET=ROOT/"ops/xiphos/void-apollyon-authorization-custody-v1.target"

manifest=json.loads(MANIFEST.read_text())
assert manifest["marker"]=="VOID_APOLLYON_CUSTODY_TARGET_STOP_PROPAGATION_UPDATE_V1"

def git_blob(path:Path)->str:
    import hashlib
    data=path.read_bytes()
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()

assert git_blob(MANIFEST)=="a515adddc24791a5f8e0fba555b62f80eb3079cc"
assert manifest["old_blob_sha1"]=="d37ffefddb747d4c49f3ee70ea94a3612307a696"
assert manifest["new_blob_sha1"]=="9daceeb07933a8a5158bc93bbc2760027d79e2d8"
assert manifest["propagates_stop_to_service"] is True
assert manifest["restart_propagation"] is False
assert manifest["authority"]["service_action"] is False
assert manifest["authority"]["target_action"] is False

target=TARGET.read_text()
assert "Wants=void-apollyon-authorization-custody-v1.service\n" in target
assert "PropagatesStopTo=void-apollyon-authorization-custody-v1.service\n" in target
assert "After=void-apollyon-authorization-custody-v1.service\n" in target

source=INSTALLER.read_text()
tree=ast.parse(source)

spec=importlib.util.spec_from_file_location(
    "void_apollyon_custody_target_stop_propagation_update_v1",
    INSTALLER,
)
assert spec is not None and spec.loader is not None
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

SERVICE=module.SERVICE_UNIT
exact_target=(
    "LoadState=loaded\n"
    "ActiveState=inactive\n"
    "UnitFileState=disabled\n"
    f"Wants={SERVICE}\n"
    f"PropagatesStopTo={SERVICE}\n"
)
stale_target=(
    "LoadState=loaded\n"
    "ActiveState=inactive\n"
    "UnitFileState=disabled\n"
    f"Wants={SERVICE}\n"
    "PropagatesStopTo=\n"
)
service_exact=(
    "LoadState=loaded\n"
    "ActiveState=inactive\n"
    "RefuseManualStart=yes\n"
    "RefuseManualStop=yes\n"
)

assert module.classify_loaded_contract_observation(
    0,exact_target,0,service_exact
)[0]=="exact"
assert module.classify_loaded_contract_observation(
    0,stale_target,0,service_exact
)[0]=="reload_required"

assert module.classify_plan_action("old_exact",None)=="replace_and_reload"
assert module.classify_plan_action("new_exact","reload_required")=="reload_only"
assert module.classify_plan_action("new_exact","exact")=="already_exact"
assert module.mutation_profile("replace_and_reload")=={
    "replace_target":True,"daemon_reload":True,
}
assert module.mutation_profile("reload_only")=={
    "replace_target":False,"daemon_reload":True,
}
assert module.mutation_profile("already_exact")=={
    "replace_target":False,"daemon_reload":False,
}

# Synthetic failure/retry sequence:
# replace succeeds, daemon-reload fails, disk is now new_exact while manager
# still exposes the exact predecessor loaded shape, next plan becomes reload-only,
# and a successful reload makes the following plan already-exact.
sequence=[
    module.classify_plan_action("old_exact",None),
    module.classify_plan_action("new_exact","reload_required"),
    module.classify_plan_action("new_exact","exact"),
]
assert sequence==["replace_and_reload","reload_only","already_exact"]

def expect_hold(fn,reason:str)->None:
    try:
        fn()
    except module.Hold as exc:
        assert str(exc)==reason,(str(exc),reason)
    else:
        raise AssertionError("expected HOLD: "+reason)

expect_hold(
    lambda:module.classify_loaded_contract_observation(
        0,stale_target.replace(
            "PropagatesStopTo=\n",
            "PropagatesStopTo=other.service\n",
        ),
        0,service_exact,
    ),
    "target_stop_propagation_ambiguous",
)
expect_hold(
    lambda:module.classify_loaded_contract_observation(
        0,stale_target.replace(
            f"Wants={SERVICE}\n",
            f"Wants={SERVICE} other.service\n",
        ),
        0,service_exact,
    ),
    "target_wants_service_ambiguous",
)
expect_hold(
    lambda:module.classify_loaded_contract_observation(
        0,stale_target.replace("ActiveState=inactive","ActiveState=active"),
        0,service_exact,
    ),
    "target_not_exactly_inactive",
)
expect_hold(
    lambda:module.classify_loaded_contract_observation(
        0,stale_target,
        0,service_exact.replace("ActiveState=inactive","ActiveState=activating"),
    ),
    "custody_service_not_exactly_inactive",
)

for required in (
    'MANIFEST_BLOB="a515adddc24791a5f8e0fba555b62f80eb3079cc"',
    'OLD_TARGET_BLOB="d37ffefddb747d4c49f3ee70ea94a3612307a696"',
    'NEW_TARGET_BLOB="9daceeb07933a8a5158bc93bbc2760027d79e2d8"',
    'classify_loaded_contract_observation',
    'classify_plan_action',
    'mutation_profile',
    '"reload_recovery_required"',
    '"reload_recovery_performed"',
    '"target_file_replaced":profile["replace_target"]',
    '"target_changed_before_manager_recheck"',
    '"target_changed_during_manager_recheck"',
    '"APPLY_DAEMON_RELOAD_RECOVERY"',
    'os.replace(temp,TARGET_PATH)',
    'run(["/usr/bin/systemctl","daemon-reload"])',
    '"service_action":False',
    '"target_action":False',
    'dormant_observation_valid',
):
    assert required in source,required

assert '"is-active"' not in source
assert source.count('os.replace(temp,TARGET_PATH)')==1
assert source.count('run(["/usr/bin/systemctl","daemon-reload"])')==1

def function(name:str)->ast.FunctionDef:
    matches=[
        node for node in tree.body
        if isinstance(node,ast.FunctionDef) and node.name==name
    ]
    assert len(matches)==1,name
    return matches[0]

def profile_test(node:ast.AST,key:str)->bool:
    return (
        isinstance(node,ast.Subscript)
        and isinstance(node.value,ast.Name)
        and node.value.id=="profile"
        and isinstance(node.slice,ast.Constant)
        and node.slice.value==key
    )

apply_fn=function("apply")
top_ifs=[node for node in apply_fn.body if isinstance(node,ast.If)]
replace_if=[node for node in top_ifs if profile_test(node.test,"replace_target")]
reload_if=[node for node in top_ifs if profile_test(node.test,"daemon_reload")]
assert len(replace_if)==1
assert len(reload_if)==1

replace_calls=[
    node for node in ast.walk(replace_if[0])
    if isinstance(node,ast.Call)
    and isinstance(node.func,ast.Attribute)
    and isinstance(node.func.value,ast.Name)
    and node.func.value.id=="os"
    and node.func.attr=="replace"
]
assert len(replace_calls)==1

reload_calls=[
    node for node in ast.walk(reload_if[0])
    if isinstance(node,ast.Call)
    and isinstance(node.func,ast.Name)
    and node.func.id=="run"
]
assert any(
    isinstance(call.args[0],ast.List)
    and any(
        isinstance(item,ast.Constant) and item.value=="daemon-reload"
        for item in call.args[0].elts
    )
    for call in reload_calls
)

result=subprocess.run(
    ["python3","-I","-B",str(INSTALLER),"--self-test"],
    cwd=ROOT,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert result.returncode==0,result.stderr
for line in (
    "VOID_APOLLYON_CUSTODY_TARGET_STOP_PROPAGATION_UPDATE_V1_SELF_TEST_GREEN",
    "target_start_indirect_via_wants=true",
    "target_stop_propagates_to_service=true",
    "direct_service_start_stop_refused=true",
    "dormant_state_fail_closed=true",
    "reload_failure_resume_supported=true",
    "new_exact_stale_manager_reload_only=true",
    "reload_only_target_file_rewrite=false",
    "target_revalidated_before_and_after_manager_recheck=true",
    "ambiguous_loaded_contract_fails_closed=true",
    "extra_loaded_wants_fails_closed=true",
    "service_action=false",
    "target_action=false",
    "training_execution=false",
    "durable_attempt_claim=false",
):
    assert line in result.stdout,line

print("VOID_APOLLYON_CUSTODY_TARGET_STOP_PROPAGATION_UPDATE_V1_PROOF_GREEN")
print("reload_failure_resume_supported=true")
print("new_exact_stale_manager_reload_only=true")
print("reload_only_target_file_rewrite=false")
print("target_revalidated_before_and_after_manager_recheck=true")
print("ambiguous_loaded_contract_fails_closed=true")
print("extra_loaded_wants_fails_closed=true")
print("service_action=false")
print("target_action=false")
print("training_execution=false")
print("durable_attempt_claim=false")
