#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
TARGET = (
    ROOT / "scripts/"
    "materialize_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v3.py"
)
LOCK = (
    ROOT / "ops/security/"
    "buy-void-epoch2-dormant-first-entry-protected-install-"
    "bootstrap-candidate-lock-v4.json"
)
CANDIDATE = (
    ROOT / "scripts/"
    "prove_buy_void_epoch2_dormant_first_entry_protected_install_"
    "bootstrap_candidate_v3.py"
)

TARGET_BLOB = "a62dc7c4e7ac4cde63c3473d0040c355aa28508e"
LOCK_BLOB = "57ecc08d465fe2a3c395546d349864312cd08a3f"
CANDIDATE_BLOB = "1c49abf74e464b3d509a33e2fa3f1a9acc42c771"


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
    'MARKER = (',
    '"BOOTSTRAP_MATERIALIZER_V3"',
    'CANDIDATE_MERGE = "78875f7379c2dd995e1b545dd0543c934e59907a"',
    'CANDIDATE_BLOB = "1c49abf74e464b3d509a33e2fa3f1a9acc42c771"',
    'EXPECTED_REPORT_BYTES = 4_789',
    '"90f70f1dbabd71bc97860608a3650331b1ed6efb007c64f2257e4523e2362050"',
    '"9e914f52eb3cde5a5fef42fbdf065b375f89fdabb768034b09615861bba67ce3"',
    'EXPECTED_BINARY_BYTES = 731_072',
    '"904e6b05df45bc9212be7689ea0617ccfbf65d5edf8535a381abcbb588f236cd"',
    'EXPECTED_BINARY_GIT_BLOB = "69e3bf6db7baf614eb0b7d8c5e93aafce0deab46"',
    '"worktree"',
    '"add"',
    '"--detach"',
    'module.derive()',
    'os.O_RDWR',
    'os.O_EXCL',
    'os.O_NOFOLLOW',
    'os.fchmod(fd, 0o555)',
    'output_failure_destructive_cleanup=false',
    'runtime_head_contract_accepted=true',
    'canonical_main_candidate_authority=true',
    'superseded_v3_lock_install_authority=false',
    'superseded_v2_lock_install_authority=false',
    'superseded_v1_lock_install_authority=false',
    'protected_bootstrap_install_authorized=false',
    'protected_installer_apply_authorized=false',
    'live_execution_authorized=false',
    'next_gate=void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_install_v3',
    'funds_movement=false',
):
    assert required in source, required

for forbidden in (
    "os.unlink(target",
    "target.unlink(",
    "os.remove(target",
    "shutil.rmtree",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source)
write_defs = [
    node
    for node in tree.body
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
assert any(
    isinstance(node, ast.Attribute) and node.attr == "O_EXCL"
    for node in calls
)
assert any(
    isinstance(node, ast.Attribute) and node.attr == "O_NOFOLLOW"
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
assert cp.stderr == ""
for line in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_MATERIALIZER_V3_SELF_TEST_GREEN",
    "accepted_lock_bound=true",
    "candidate_merge_frozen=true",
    "candidate_source_blob_bound=true",
    "candidate_report_identity_bound=true",
    "bootstrap_binary_identity_accepted=true",
    "runtime_head_contract_accepted=true",
    "canonical_main_candidate_authority=true",
    "superseded_v3_lock_install_authority=false",
    "superseded_v2_lock_install_authority=false",
    "superseded_v1_lock_install_authority=false",
    "create_only_output_required=true",
    "output_mode_0555=true",
    "protected_bootstrap_install_authorized=false",
    "protected_installer_apply_authorized=false",
    "live_execution_authorized=false",
    "credential_access_authorized=false",
    "signing_authorized=false",
    "transaction_authorized=false",
    "rpc_call_authorized=false",
    "funds_movement=false",
):
    assert line in cp.stdout.splitlines(), line

print(
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_"
    "BOOTSTRAP_MATERIALIZER_V3_PROOF_GREEN"
)
print("materializer_blob_bound=true")
print("accepted_lock_blob_bound=true")
print("candidate_proof_blob_bound=true")
print("frozen_candidate_merge_required=true")
print("candidate_report_identity_required=true")
print("accepted_bootstrap_identity_required=true")
print("runtime_head_contract_required=true")
print("canonical_main_candidate_authority=true")
print("superseded_v3_lock_install_authority=false")
print("superseded_v2_lock_install_authority=false")
print("superseded_v1_lock_install_authority=false")
print("detached_worktree_derivation_required=true")
print("create_only_output_required=true")
print("output_mode_0555_required=true")
print("descriptor_readback_required=true")
print("destructive_output_cleanup_absent=true")
print("protected_bootstrap_install_authorized=false")
print("protected_installer_apply_authorized=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("rpc_call_authorized=false")
print("funds_movement=false")
