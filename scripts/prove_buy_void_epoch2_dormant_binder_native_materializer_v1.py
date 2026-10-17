#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "scripts/materialize_buy_void_epoch2_dormant_binder_native_v2.py"
LOCK = ROOT / "ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json"
CANDIDATE = ROOT / "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_v2.py"

TARGET_BLOB = "575553c90fb8df1a8a56e8e9d5edf6fc7989b723"
LOCK_BLOB = "5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1"
CANDIDATE_BLOB = "f97cb8aff642f2f3e138fe8e087eece22223b934"


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw)
    return h.hexdigest()


target_raw = TARGET.read_bytes()
lock_raw = LOCK.read_bytes()
candidate_raw = CANDIDATE.read_bytes()

assert git_blob(target_raw) == TARGET_BLOB
assert git_blob(lock_raw) == LOCK_BLOB
assert git_blob(candidate_raw) == CANDIDATE_BLOB

source = target_raw.decode("utf-8")
for required in (
    'MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_MATERIALIZER_V1"',
    'CANDIDATE_MERGE = "2b76758851d550e8cbd5fc71412e4b85cfaa8791"',
    'CANDIDATE_BLOB = "f97cb8aff642f2f3e138fe8e087eece22223b934"',
    'EXPECTED_REPORT_SHA256 = "f21445a333a2c05d132692c29aa929a1de727d6f6f35ce2edac600a7cccfa4a2"',
    'EXPECTED_CANDIDATE_ID = (',
    '"8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d"',
    'EXPECTED_BINARY_BYTES = 726_976',
    'EXPECTED_BINARY_SHA256 = "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"',
    '"worktree", "add"',
    '"--detach"',
    'module.derive()',
    'os.O_EXCL',
    'os.O_NOFOLLOW',
    'os.fchmod(fd, 0o555)',
    'output_failure_destructive_cleanup=false',
    'protected_install_authorized=false',
    'native_or_binder_live_execution_authorized=false',
    'funds_movement=false',
):
    assert required in source, required

for forbidden in (
    "os.unlink(target",
    "target.unlink(",
    "shutil.rmtree(target",
    "systemctl",
    "eth_sendRawTransaction",
    "LoadCredential",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source)
write_defs = [
    node for node in tree.body
    if isinstance(node, ast.FunctionDef) and node.name == "write_create_only"
]
assert len(write_defs) == 1
calls = list(ast.walk(write_defs[0]))
assert any(
    isinstance(node, ast.Call)
    and isinstance(node.func, ast.Attribute)
    and node.func.attr == "open"
    for node in calls
)
assert not any(
    isinstance(node, ast.Call)
    and isinstance(node.func, ast.Attribute)
    and node.func.attr in {"unlink", "remove", "rmtree"}
    for node in calls
)

cp = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert cp.returncode == 0, cp.stderr
for line in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_MATERIALIZER_V1_SELF_TEST_GREEN",
    "accepted_lock_bound=true",
    "candidate_merge_frozen=true",
    "candidate_source_blob_bound=true",
    "candidate_report_identity_bound=true",
    "native_binary_identity_accepted=true",
    "create_only_output_required=true",
    "output_mode_0555=true",
    "protected_install_authorized=false",
    "native_or_binder_live_execution_authorized=false",
    "credential_access_authorized=false",
    "signing_authorized=false",
    "transaction_authorized=false",
    "funds_movement=false",
):
    assert line in cp.stdout.splitlines(), line

print("VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_MATERIALIZER_V1_PROOF_GREEN")
print("materializer_blob_bound=true")
print("accepted_lock_blob_bound=true")
print("candidate_proof_blob_bound=true")
print("frozen_candidate_merge_required=true")
print("candidate_report_identity_required=true")
print("accepted_native_identity_required=true")
print("detached_worktree_derivation_required=true")
print("create_only_output_required=true")
print("output_mode_0555_required=true")
print("destructive_output_cleanup_absent=true")
print("protected_install_authorized=false")
print("native_or_binder_live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("funds_movement=false")
