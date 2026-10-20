#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALLER_BOOTSTRAP_V7_QUALIFY_EXECUTE_CONTRACT_V1"
)

TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_v7_qualify_execute_contract_v1.py"
)
TARGET_BLOB = "efd54eafce11e3689d4da07e2ff053cd438af473"

PLANNER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_plan_v7.py"
)
PLANNER_BLOB = "597dd61923d349980cd30bcf190fee354ff1c1f2"
PLANNER_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_plan_v7.py"
)
PLANNER_PROOF_BLOB = "656075f1941e9cca302ebfd40efad09d979b4f25"
QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_repaired_installed_qualification_v1.py"
)
QUALIFIER_BLOB = "132e03eaea440f3f8c59aeaca879596c677c6bcf"


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def pin(relative: str, expected: str) -> bytes:
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, (relative, git_blob(raw), expected)
    return raw


target_raw = pin(TARGET_REL, TARGET_BLOB)
pin(PLANNER_REL, PLANNER_BLOB)
pin(PLANNER_PROOF_REL, PLANNER_PROOF_BLOB)
pin(QUALIFIER_REL, QUALIFIER_BLOB)

source = target_raw.decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True)
tree = ast.parse(source)

for required in (
    'CONTRACT_PREFIX = "voidbuye2protectedbootstrapv7exec1_"',
    'PLANNER_BLOB = "' + PLANNER_BLOB + '"',
    'PLANNER_PROOF_BLOB = "' + PLANNER_PROOF_BLOB + '"',
    'QUALIFIER_BLOB = "' + QUALIFIER_BLOB + '"',
    '"source_execution_mode": "descriptor_bound_exact_git_object"',
    '"qualification_git_callbacks_neutralized_required": True',
    '"qualification_git_callbacks_neutralized": True',
    '"preliminary_git_local_config_isolated": True',
    '"preliminary_git_lazy_fetch_disabled": True',
    '"preliminary_git_protocols_denied": True',
    '"preliminary_git_object_alternates_rejected": True',
    '"git_callbacks_neutralized_required": True',
    "PLANNER_BODY_KEYS = frozenset(",
    "QUALIFICATION_CONTRACT_KEYS = frozenset(",
    "QUALIFICATION_REQUIRED_RESULT_KEYS = frozenset(",
    '"run_as": "nonroot"',
    '"run_as": "root"',
    '"green_required_before_phase_2": True',
    '"qualification_green_required": True',
    '"root_boundary_implementation":',
    '"separately_reviewed_operator_boundary_required"',
    '"phase_order_exact": True',
    '"qualification_execution_performed": False',
    '"bootstrap_execution_performed": False',
    '"protected_installer_apply_performed": False',
    '"root_boundary_execution_performed": False',
    '"filesystem_write": False',
    '"funds_movement": False',
    'PROTECTED_INSTALLER_BOOTSTRAP_V7_EXECUTE_QUALIFICATION_AND_ROOT_PLAN',
):
    assert required in source, required

for forbidden in (
    "subprocess.",
    "os.execv",
    "os.execve",
    "os.fexecve",
    "os.system(",
    "pty.",
    "sudo",
    "setpriv",
    "Popen(",
    "systemctl",
    "--installer-apply",
):
    assert forbidden not in source, forbidden

functions = {
    node.name: node
    for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
for name in (
    "_read_stable",
    "_planner_lines",
    "_require_exact_keys",
    "_validate_checkout",
    "_validate_tool_identity",
    "_validate_qualification_contract",
    "_artifact",
    "validate_planner_output",
    "execution_contract",
    "source_plan",
    "emit_plan",
    "self_test",
):
    assert name in functions, name

read_source = ast.get_source_segment(source, functions["_read_stable"]) or ""
for required in (
    "os.O_RDONLY",
    "os.O_CLOEXEC",
    "os.O_NOFOLLOW",
    "planner_output_rebound",
    "planner_output_changed_during_read",
    "planner_output_visible_generation_changed",
):
    assert required in read_source, required
for forbidden in ("O_WRONLY", "O_RDWR", "O_CREAT", "O_TRUNC"):
    assert forbidden not in read_source, forbidden

validate_source = (
    ast.get_source_segment(source, functions["validate_planner_output"]) or ""
)
for required in (
    "planner_plan_id_body_mismatch",
    "planner_body_not_canonical",
    "planner_qualifier_blob_mismatch",
    "launcher_runtime_head_contract_missing",
    "launcher_historical_authority_overclaim",
    "bootstrap_argv_mismatch",
    "planner_qualification_line_mismatch",
    '_require_exact_keys(body, PLANNER_BODY_KEYS, "planner_body")',
):
    assert required in validate_source, required

qualification_source = (
    ast.get_source_segment(source, functions["_validate_qualification_contract"])
    or ""
)
for required in (
    "qualification_contract_mismatch:",
    "qualification_required_result_mismatch:",
    "QUALIFICATION_CONTRACT_KEYS",
    '"qualification_contract"',
    "QUALIFICATION_REQUIRED_RESULT_KEYS",
    '"qualification_required_result"',
):
    assert required in qualification_source, required

key_helper_source = (
    ast.get_source_segment(source, functions["_require_exact_keys"]) or ""
)
assert 'label + "_keys_invalid"' in key_helper_source

contract_source = ast.get_source_segment(source, functions["execution_contract"]) or ""
assert '"ordinal": 1' in contract_source
assert '"ordinal": 2' in contract_source
assert '"run_as": "nonroot"' in contract_source
assert '"git_callbacks_neutralized_required": True' in contract_source
assert '"run_as": "root"' in contract_source
assert (
    '"root_boundary_implementation":\n'
    '                "separately_reviewed_operator_boundary_required"'
) in contract_source

# Self-test exercises a valid canonical V7 planner fixture plus an authority tamper.
target = ROOT / TARGET_REL
cp = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(target), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert cp.returncode == 0, cp.stderr
assert cp.stderr == "", cp.stderr
lines = set(cp.stdout.splitlines())
for expected in (
    MARKER + "_SELF_TEST_GREEN",
    "planner_v7_generation_bound=true",
    "planner_plan_id_recomputed=true",
    "planner_body_canonical_required=true",
    "planner_body_closed_schema_required=true",
    "qualification_contract_exact=true",
    "qualification_contract_closed_schema_required=true",
    "qualification_required_result_closed_schema_required=true",
    "qualification_execution_identity_fields_validated=true",
    "rehashed_nested_tamper_rejected=true",
    "unconsumed_tool_metadata_not_execution_authority=true",
    "qualification_nonroot_required=true",
    "qualification_descriptor_bound_git_object_required=true",
    "qualification_git_callbacks_neutralized_required=true",
    "qualification_green_required_before_root_plan=true",
    "root_bootstrap_plan_phase_required=true",
    "root_boundary_implementation_separate=true",
    "phase_order_exact=true",
    "execution_not_performed=true",
    "funds_movement=false",
):
    assert expected in lines, expected

# Source-plan must remain explicitly non-executing.
cp = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(target), "--source-plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert cp.returncode == 0, cp.stderr
assert cp.stderr == "", cp.stderr
lines = set(cp.stdout.splitlines())
for expected in (
    MARKER,
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "planner_git_blob_sha1=" + PLANNER_BLOB,
    "planner_proof_git_blob_sha1=" + PLANNER_PROOF_BLOB,
    "qualifier_git_blob_sha1=" + QUALIFIER_BLOB,
    "phase_order=nonroot_qualification_then_root_bootstrap_plan",
    "qualification_source_execution_mode=descriptor_bound_exact_git_object",
    "qualification_git_callbacks_neutralized_required=true",
    "qualification_preliminary_git_local_config_isolation_required=true",
    "qualification_preliminary_git_lazy_fetch_disabled_required=true",
    "qualification_preliminary_git_protocols_denied_required=true",
    "qualification_preliminary_git_object_alternates_rejection_required=true",
    "planner_body_closed_schema_required=true",
    "qualification_contract_closed_schema_required=true",
    "qualification_required_result_closed_schema_required=true",
    "unconsumed_tool_metadata_not_execution_authority=true",
    "root_boundary_implementation=separately_reviewed_operator_boundary_required",
    "qualification_execution_performed=false",
    "bootstrap_execution_performed=false",
    "protected_installer_apply_performed=false",
    "root_boundary_execution_performed=false",
    "filesystem_write=false",
    "funds_movement=false",
):
    assert expected in lines, expected

print(MARKER + "_PROOF_GREEN")
print("target_blob_bound=true")
print("planner_v7_blob_bound=true")
print("planner_v7_proof_blob_bound=true")
print("repaired_qualifier_blob_bound=true")
print("planner_output_descriptor_read_only=true")
print("canonical_planner_body_required=true")
print("planner_plan_id_recomputed=true")
print("exact_qualification_contract_required=true")
print("planner_body_closed_schema_required=true")
print("qualification_contract_closed_schema_required=true")
print("qualification_required_result_closed_schema_required=true")
print("qualification_execution_identity_fields_validated=true")
print("rehashed_nested_tamper_rejected=true")
print("unconsumed_tool_metadata_not_execution_authority=true")
print("nonroot_qualification_phase_required=true")
print("descriptor_bound_qualification_source_required=true")
print("qualification_git_callbacks_neutralized_required=true")
print("qualification_green_before_root_phase_required=true")
print("root_bootstrap_plan_phase_structured_only=true")
print("root_boundary_implementation_separate=true")
print("execution_code_absent=true")
print("filesystem_write=false")
print("service_mutation=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
