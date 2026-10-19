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
    "protected_install_bootstrap_v1.py"
)
LOCK = (
    ROOT / "ops/security/"
    "buy-void-epoch2-dormant-first-entry-protected-install-"
    "bootstrap-candidate-lock-v1.json"
)
CANDIDATE = (
    ROOT / "scripts/"
    "prove_buy_void_epoch2_dormant_first_entry_protected_install_"
    "bootstrap_candidate_v1.py"
)

TARGET_BLOB = "a445ce8f0172a4f09a03afdf86ebc767aec65ada"
LOCK_BLOB = "a96dee99c89ef386a6cbd05609b8f4a764caada8"
CANDIDATE_BLOB = "d1417455330837c4d584f7bf36f932a869c903cb"


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
    '"BOOTSTRAP_MATERIALIZER_V1"',
    'CANDIDATE_MERGE = "0ea097a3fa43dc95a1a0a5272c61afe570361fc7"',
    'CANDIDATE_BLOB = "d1417455330837c4d584f7bf36f932a869c903cb"',
    'EXPECTED_REPORT_BYTES = 4_705',
    '"b3f909c391ce617b7a8e796749bb57ce69f95b27259dd9da1c0fae849d6e74f7"',
    '"24d4c84d307c525cc4e28f010c7f2258db2e55256af7d8cf0cb303cf1c4ee851"',
    'EXPECTED_BINARY_BYTES = 731_072',
    '"1b570f704841f8b833707de2c85ca66d2a344f3a77b5d1979ab29eaae2ec1189"',
    'EXPECTED_BINARY_GIT_BLOB = "5d35e762fa4b510baeb89b2840d5287cc4fd6716"',
    '"worktree"',
    '"add"',
    '"--detach"',
    'module.derive()',
    'os.O_RDWR',
    'os.O_EXCL',
    'os.O_NOFOLLOW',
    'os.fchmod(fd, 0o555)',
    'output_failure_destructive_cleanup=false',
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
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_MATERIALIZER_V1_SELF_TEST_GREEN",
    "accepted_lock_bound=true",
    "candidate_merge_frozen=true",
    "candidate_source_blob_bound=true",
    "candidate_report_identity_bound=true",
    "bootstrap_binary_identity_accepted=true",
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
    "BOOTSTRAP_MATERIALIZER_V1_PROOF_GREEN"
)
print("materializer_blob_bound=true")
print("accepted_lock_blob_bound=true")
print("candidate_proof_blob_bound=true")
print("frozen_candidate_merge_required=true")
print("candidate_report_identity_required=true")
print("accepted_bootstrap_identity_required=true")
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
