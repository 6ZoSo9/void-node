#!/usr/bin/env python3
from __future__ import annotations

import ast
import contextlib
import hashlib
import importlib.util
import io
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
TARGET = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_live_composition_policy_head_rebind_v1.py"
)
INSTALLER = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_protected_install_v5.py"
)

TARGET_BLOB = "37ab46ca5b77a642d84ad18c61388c30f4d63881"
INSTALLER_BLOB = "fd7a06490ccf6fb14831d8b0372a892e2764c9dc"


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


target_raw = TARGET.read_bytes()
installer_raw = INSTALLER.read_bytes()
assert git_blob(target_raw) == TARGET_BLOB
assert git_blob(installer_raw) == INSTALLER_BLOB

source = target_raw.decode("utf-8")
for required in (
    'MARKER = "VOID_BUY_VOID_EPOCH2_V6R2_POLICY_HEAD_REBIND_V1"',
    'CONFIRM_TOKEN = "ATOMIC_EXCHANGE_EPOCH2_V6R2_POLICY_HEAD_REBIND_V1"',
    'OLD_HEAD = "65b4515b78e467afb399b510037e8c64256e87a5"',
    'OLD_POLICY_SHA256 = "dd27149ac4faa950843b16a39824bb77ec88cdab63593d7ee836ca879ddc6cd9"',
    'STAGE_NAME = ".void-buy-void-epoch2-live-composition-v3.policy-rebind.stage"',
    '"policy-predecessor-65b4515b"',
    'READY_STATE = "EPOCH2_V6R2_POLICY_65B_READY_FOR_HEAD_REBIND"',
    'GREEN_STATE = "EPOCH2_V6R2_POLICY_HEAD_REBOUND_WITH_65B_POLICY_RETAINED"',
    "RENAME_NOREPLACE = 1",
    "RENAME_EXCHANGE = 2",
    "installer._verify_root_generation(",
    "installer._verify_predecessor_root(installer.PREDECESSOR_ROOT)",
    "installer.checkout_snapshot_with_tools(expected_head)",
    "installer.build_policy(expected_head, node)",
    "policy_atomic_exchange_required",
    "old_policy_retention_required",
    "automatic_rollback_required",
    "filesystem_mutation_performed_at_pre_mutation_boundary=false",
    '"authority_boundary": "FINAL_FAILURE_RECEIPT"',
    "policy_exchange_performed",
    "policy_publication_performed",
    "final_state_verified",
    "_failure_receipt(",
    "_emit_failure_receipt(",
    "native_mutation_authorized=false",
    "runner_mutation_authorized=false",
    "transaction_authorized=false",
    "funds_movement_authorized=false",
):
    assert required in source, required

for forbidden in (
    "systemctl",
    "eth_sendRawTransaction",
    "CREDENTIALS_DIRECTORY",
    "LoadCredential",
    "requests.",
    "urllib.request",
    "socket.",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source)
imports = {
    alias.name
    for node in ast.walk(tree)
    if isinstance(node, ast.Import)
    for alias in node.names
}
from_imports = {
    node.module
    for node in ast.walk(tree)
    if isinstance(node, ast.ImportFrom) and node.module is not None
}
assert "subprocess" not in imports
assert "socket" not in imports
assert "requests" not in imports
assert "urllib" not in imports
assert "subprocess" not in from_imports

apply_defs = [
    node for node in tree.body
    if isinstance(node, ast.FunctionDef) and node.name == "apply"
]
assert len(apply_defs) == 1
rename_calls = [
    node for node in ast.walk(apply_defs[0])
    if isinstance(node, ast.Call)
    and isinstance(node.func, ast.Name)
    and node.func.id == "_renameat2"
]
assert len(rename_calls) >= 4
except_handlers = [
    node for node in ast.walk(apply_defs[0])
    if isinstance(node, ast.ExceptHandler)
]
assert len(except_handlers) >= 3
apply_except_calls = {
    node.func.id
    for handler in except_handlers
    for node in ast.walk(handler)
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
}
for required_call in (
    "_classify_final_protected_state",
    "_failure_receipt",
    "_emit_failure_receipt",
):
    assert required_call in apply_except_calls, required_call

phase_values = {
    node.value.value
    for node in ast.walk(apply_defs[0])
    if isinstance(node, ast.Assign)
    and any(
        isinstance(target, ast.Name) and target.id == "failure_phase"
        for target in node.targets
    )
    and isinstance(node.value, ast.Constant)
    and isinstance(node.value.value, str)
}
for phase in (
    "pre_exchange",
    "stage_write",
    "pre_exchange_revalidation",
    "policy_exchanged",
    "post_exchange_verification",
    "backup_retained",
    "post_backup_revalidation",
):
    assert phase in phase_values, phase

assert 'print("filesystem_mutation_performed=false")' not in source
assert 'print("filesystem_mutation_performed_at_pre_mutation_boundary=false")' in source

spec = importlib.util.spec_from_file_location("policy_rebind_v1", TARGET)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

receipt = module._failure_receipt(
    failure_phase="policy_exchanged",
    policy_exchange_performed=True,
    rollback_attempted=True,
    rollback_green=True,
    final_state_verified=True,
    final_state=module.READY_STATE,
)
assert receipt["policy_publication_performed"] is True
assert receipt["final_state_verified"] is True
emitted = io.StringIO()
with contextlib.redirect_stdout(emitted):
    module._emit_failure_receipt(receipt)
emitted_lines = emitted.getvalue().splitlines()
assert "authority_boundary=FINAL_FAILURE_RECEIPT" in emitted_lines
assert "policy_exchange_performed=true" in emitted_lines
assert "policy_publication_performed=true" in emitted_lines
assert "automatic_rollback_attempted=true" in emitted_lines
assert "automatic_rollback_green=true" in emitted_lines
assert "final_state_verified=true" in emitted_lines
assert (
    "filesystem_mutation_performed=false" not in emitted_lines
)

receipt = module._failure_receipt(
    failure_phase="backup_retained",
    policy_exchange_performed=True,
    rollback_attempted=True,
    rollback_green=True,
    final_state_verified=True,
    final_state=module.READY_STATE,
)
assert receipt["policy_exchange_performed"] is True

receipt = module._failure_receipt(
    failure_phase="post_backup_revalidation",
    policy_exchange_performed=True,
    rollback_attempted=True,
    rollback_green=False,
    final_state_verified=False,
    final_state="UNKNOWN",
)
assert receipt["policy_publication_performed"] is True
assert receipt["automatic_rollback_green"] is False
assert receipt["final_state_verified"] is False

python = "/usr/bin/python3"
self_test = subprocess.run(
    [python, "-I", "-B", str(TARGET), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert self_test.returncode == 0, self_test.stderr
for line in (
    "VOID_BUY_VOID_EPOCH2_V6R2_POLICY_HEAD_REBIND_V1_SELF_TEST_GREEN",
    "installer_source_blob_bound=true",
    "atomic_cross_directory_policy_exchange_exercised=true",
    "old_policy_identity_bound=true",
    "native_mutation_authorized=false",
    "runner_mutation_authorized=false",
    "old_policy_retention_required=true",
    "automatic_rollback_required=true",
    "publication_aware_failure_receipt=true",
    "post_exchange_failure_reports_publication=true",
    "rollback_failure_final_state_uncertain=true",
    "pre_mutation_authority_scoped=true",
    "live_execution_authorized=false",
    "credential_access_authorized=false",
    "transaction_authorized=false",
    "funds_movement_authorized=false",
):
    assert line in self_test.stdout.splitlines(), line

source_plan = subprocess.run(
    [python, "-I", "-B", str(TARGET), "--source-plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert source_plan.returncode == 0, source_plan.stderr
for line in (
    "VOID_BUY_VOID_EPOCH2_V6R2_POLICY_HEAD_REBIND_V1",
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "installer_source_blob=fd7a06490ccf6fb14831d8b0372a892e2764c9dc",
    "old_head=65b4515b78e467afb399b510037e8c64256e87a5",
    "old_policy_sha256=dd27149ac4faa950843b16a39824bb77ec88cdab63593d7ee836ca879ddc6cd9",
    "old_policy_bytes=305",
    "native_mutation_authorized=false",
    "runner_mutation_authorized=false",
    "policy_atomic_exchange_required=true",
    "old_policy_retention_required=true",
    "automatic_rollback_required=true",
    "live_execution_authorized=false",
    "credential_access_authorized=false",
    "private_key_access_authorized=false",
    "signing_authorized=false",
    "transaction_authorized=false",
    "rpc_call_authorized=false",
    "funds_movement_authorized=false",
):
    assert line in source_plan.stdout.splitlines(), line

print("VOID_BUY_VOID_EPOCH2_V6R2_POLICY_HEAD_REBIND_V1_PROOF_GREEN")
print("target_blob_bound=true")
print("installer_blob_bound=true")
print("old_installed_policy_identity_bound=true")
print("new_policy_expected_head_derived=true")
print("exact_v6r2_native_runner_generation_required=true")
print("exact_v4_predecessor_generation_required=true")
print("atomic_cross_directory_policy_exchange_required=true")
print("old_policy_retention_required=true")
print("automatic_rollback_required=true")
print("publication_aware_failure_receipt=true")
print("post_exchange_failure_reports_publication=true")
print("apply_exception_path_emits_final_failure_receipt=true")
print("post_exchange_failure_transcript_monotonic=true")
print("rollback_failure_final_state_uncertain=true")
print("pre_mutation_authority_scoped=true")
print("native_mutation_authorized=false")
print("runner_mutation_authorized=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("rpc_call_authorized=false")
print("funds_movement_authorized=false")
