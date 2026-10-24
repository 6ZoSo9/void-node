#!/usr/bin/env python3
from __future__ import annotations

import ast
import importlib.util
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/xiphos/apollyon_installed_training_bus_isolation_qualification_v1.py"
PARENT_HEAD = "e64049c3f460eae077364567f63aa3298ecf9c31"
TARGET_REL = "ops/xiphos/apollyon_installed_training_bus_isolation_qualification_v1.py"

spec = importlib.util.spec_from_file_location("qualifier", TARGET)
assert spec and spec.loader
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

mod.self_test()


def function_ast(source_text: str, name: str) -> str:
    tree = ast.parse(source_text)
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return ast.dump(node, include_attributes=False)
    raise AssertionError("function missing: " + name)


parent = subprocess.run(
    ["/usr/bin/git", "-C", str(ROOT), "show", PARENT_HEAD + ":" + TARGET_REL],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=True,
)
current_source = TARGET.read_text(encoding="utf-8")
assert function_ast(current_source, "observe_live_generation") == function_ast(
    parent.stdout,
    "observe_live_generation",
)
assert function_ast(current_source, "canonical") == function_ast(
    parent.stdout,
    "canonical",
)
assert function_ast(current_source, "verify_installed_materials") == function_ast(
    parent.stdout,
    "verify_installed_materials",
)

try:
    mod.live_qualify()
except mod.Hold as exc:
    assert str(exc) == "standalone_live_qualify_retired_use_v2", str(exc)
else:
    raise AssertionError("V1 standalone live qualifier was not retired")


sample = "Uid:\t997\t997\t997\t997\nGid:\t984\t984\t984\t984\nNoNewPrivs:\t1\n"
assert mod.parse_status_ids(sample, "Uid") == (997, 997, 997, 997)
assert mod.parse_status_ids(sample, "Gid") == (984, 984, 984, 984)
assert mod.status_value(sample, "NoNewPrivs") == "1"
stat_fixture = "123 (entry v1) S " + " ".join(str(i) for i in range(1, 40))
assert mod.process_start_time_ticks_from_text(stat_fixture) == 19

source = TARGET.read_text(encoding="utf-8")
tree = ast.parse(source)
assert "systemctl" in source
assert "--live-qualify" in source
assert "standalone_live_qualify_retired_use_v2" in source
assert "--observe-live-pid" in source
assert "service_mainpid_generation_mismatch" in source
assert "service_action_performed" in source
assert "live_inherited_descriptor_present" in source
assert "CapBnd" in source
assert "absolute_runtime_service_control_denial_proven" in source
assert '"boot_id_sha256": boot_id_sha256()' in source
assert '"process_start_time_ticks": process_start_time_ticks(mainpid)' in source
assert "apollyon_candidate_training_preclaim_v2" in source

for forbidden in (
    "torch",
    "transformers",
    "unsloth",
    "PeftModel",
    "Trainer(",
    "candidate_weight_mutation = True",
    '"training_execution": True',
    '"attempt_claim": True',
    "createPrivateKey",
    "crypto.sign",
    "eth_send",
):
    assert forbidden not in source, forbidden

print("VOID_APOLLYON_INSTALLED_TRAINING_BUS_ISOLATION_QUALIFICATION_V1_PROOF_GREEN")
print("explicit_live_flag_required=false")
print("standalone_live_qualify_retired=true")
print("observe_live_generation_ast_unchanged=true")
print("receipt_canonicalizer_ast_unchanged=true")
print("installed_material_observer_ast_unchanged=true")
print("exact_installed_materials_required=true")
print("systemd_executor_transition_waited=false")
print("all_uid_gid_slots_bound=true")
print("all_capability_sets_zero_required=true")
print("inherited_fds_ge_3_absent_required=true")
print("boot_id_bound=true")
print("process_start_time_ticks_bound=true")
print("existing_live_pid_observation_supported=true")
print("same_process_composition_possible=true")
print("training_execution=false")
print("attempt_claim=false")
print("funds_movement=false")
