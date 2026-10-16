#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
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

TARGET_BLOB = "3a00cf67b550f0ea140c53c6b4c1f8adca7b7594"
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
print("native_mutation_authorized=false")
print("runner_mutation_authorized=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("rpc_call_authorized=false")
print("funds_movement_authorized=false")
