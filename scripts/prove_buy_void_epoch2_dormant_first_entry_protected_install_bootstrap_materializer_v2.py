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
    "protected_install_bootstrap_v2.py"
)
LOCK = (
    ROOT / "ops/security/"
    "buy-void-epoch2-dormant-first-entry-protected-install-"
    "bootstrap-candidate-lock-v2.json"
)
CANDIDATE = (
    ROOT / "scripts/"
    "prove_buy_void_epoch2_dormant_first_entry_protected_install_"
    "bootstrap_candidate_v2.py"
)

TARGET_BLOB = "23c70c1910c41a69e2d5325b55d7020ac038dc93"
LOCK_BLOB = "90dfe7728fa56c8d41a396399578bd1b8c52c2f4"
CANDIDATE_BLOB = "4f9b5a2ca77b3aebc9e70ea835c92155601a1a06"


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
    '"BOOTSTRAP_MATERIALIZER_V2"',
    'CANDIDATE_MERGE = "917a6247973310c539a4186c59825b1474ce0251"',
    'CANDIDATE_BLOB = "4f9b5a2ca77b3aebc9e70ea835c92155601a1a06"',
    'EXPECTED_REPORT_BYTES = 4_789',
    '"f740e5e9194cbef3b967050ba215b83ccb442000ad549eccf342c5be2e7acb36"',
    '"a8acbc7a61ed1a5a59a29529b678e1473c044584a663bcdb1174756c29c71eb5"',
    'EXPECTED_BINARY_BYTES = 731_072',
    '"37a6979c274e93fa09860b26664804a9d912201a290db65deb9b4499e39aa276"',
    'EXPECTED_BINARY_GIT_BLOB = "45ca1ed7a6237fccbd6bb0b9d73ef5ff47c72d62"',
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
    'superseded_v1_lock_install_authority=false',
    'protected_bootstrap_install_authorized=false',
    'protected_installer_apply_authorized=false',
    'live_execution_authorized=false',
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
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_MATERIALIZER_V2_SELF_TEST_GREEN",
    "accepted_lock_bound=true",
    "candidate_merge_frozen=true",
    "candidate_source_blob_bound=true",
    "candidate_report_identity_bound=true",
    "bootstrap_binary_identity_accepted=true",
    "runtime_head_contract_accepted=true",
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
    "BOOTSTRAP_MATERIALIZER_V2_PROOF_GREEN"
)
print("materializer_blob_bound=true")
print("accepted_lock_blob_bound=true")
print("candidate_proof_blob_bound=true")
print("frozen_candidate_merge_required=true")
print("candidate_report_identity_required=true")
print("accepted_bootstrap_identity_required=true")
print("runtime_head_contract_required=true")
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
