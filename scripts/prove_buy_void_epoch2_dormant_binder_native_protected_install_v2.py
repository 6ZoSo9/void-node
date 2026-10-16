#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import json
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
INSTALLER_REL = "ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
INSTALLER = ROOT / INSTALLER_REL
LOCK_REL = "ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json"
LOCK = ROOT / LOCK_REL
CANDIDATE_REL = "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_v2.py"
CANDIDATE = ROOT / CANDIDATE_REL

INSTALLER_BLOB = "7096622a69fc39cfab18f25d33bbb0b61caa1ac1"
LOCK_BLOB = "5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1"
CANDIDATE_BLOB = "f97cb8aff642f2f3e138fe8e087eece22223b934"

EXPECTED_LOCK_ID = (
    "voidbuye2dormantbinderlock3_"
    "a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a"
)
EXPECTED_CANDIDATE_ID = (
    "voidbuye2dormantbindercand2_"
    "8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d"
)
EXPECTED_NATIVE_SHA = (
    "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
)
EXPECTED_NATIVE_BYTES = 726_976
EXPECTED_BINDER_SHA = (
    "afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e"
)


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


installer_raw = INSTALLER.read_bytes()
lock_raw = LOCK.read_bytes()
candidate_raw = CANDIDATE.read_bytes()

assert git_blob(installer_raw) == INSTALLER_BLOB
assert git_blob(lock_raw) == LOCK_BLOB
assert git_blob(candidate_raw) == CANDIDATE_BLOB

lock = json.loads(lock_raw)
assert lock["lock_id"] == EXPECTED_LOCK_ID
assert lock["candidate_report"]["candidate_id"] == EXPECTED_CANDIDATE_ID
assert lock["candidate_report"]["native_binary_sha256"] == EXPECTED_NATIVE_SHA
assert lock["candidate_report"]["native_binary_bytes"] == EXPECTED_NATIVE_BYTES
assert lock["candidate_report"]["binder_sha256"] == EXPECTED_BINDER_SHA
assert lock["candidate_accepted"] is True
assert lock["native_binary_identity_accepted"] is True
for key in (
    "protected_install_authorized",
    "live_execution_authorized",
    "credential_access_authorized",
    "private_key_access_authorized",
    "signing_authorized",
    "transaction_authorized",
    "payment_acceptance_authorized",
    "public_presale_activation_authorized",
    "wc_void_market_activation_authorized",
    "treasury_liquidity_action_authorized",
    "funds_movement_authorized",
    "production_host_evidence_authority",
):
    assert lock[key] is False, key

source = installer_raw.decode("utf-8")
for required in (
    'MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PROTECTED_INSTALL_V2"',
    'CONFIRM_TOKEN = "INSTALL_EPOCH2_DORMANT_BINDER_NATIVE_V2"',
    'INSTALL_NAME = "void-buy-void-epoch2-dormant-v3r-binding-v2"',
    'NATIVE_NAME = "void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2"',
    'BINDER_NAME = "void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"',
    'NATIVE_SHA256 = "' + EXPECTED_NATIVE_SHA + '"',
    'NATIVE_BYTES = 726_976',
    'BINDER_SHA256 = "' + EXPECTED_BINDER_SHA + '"',
    'BINDER_BYTES = 39_391',
    "RENAME_NOREPLACE = 1",
    "publication_occurred = False",
    "publication_occurred = True",
    'print("publication_performed=" + str(publication_occurred).lower())',
    'print("mode=FINAL_FAILURE_RECEIPT")',
    'print("service_mutation=false")',
    'print("live_execution=false")',
    'print("transaction=false")',
    'print("funds_movement=false")',
):
    assert required in source, required

for forbidden in (
    "systemctl",
    "LoadCredential",
    "CREDENTIALS_DIRECTORY",
    "eth_sendRawTransaction",
    "sendRawTransaction",
    "wallet",
    "private key",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source)
apply_defs = [
    node for node in tree.body
    if isinstance(node, ast.FunctionDef) and node.name == "apply"
]
assert len(apply_defs) == 1
apply_source = ast.get_source_segment(source, apply_defs[0])
assert apply_source is not None
assert apply_source.index("if confirm != CONFIRM_TOKEN") < apply_source.index(
    "result = collect_plan"
)
assert apply_source.count("_renameat2(") >= 2
assert "publication_occurred = True" in apply_source
assert "rollback_attempted = True" in apply_source
assert "final_protected_state=" in apply_source

python = "/usr/bin/python3"
self_test = subprocess.run(
    [python, "-I", "-B", str(INSTALLER), "--self-test"],
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
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PROTECTED_INSTALL_V2_SELF_TEST_GREEN",
    "accepted_lock_bound=true",
    "candidate_identity_bound=true",
    "native_identity_bound=true",
    "binder_identity_bound=true",
    "create_only=true",
    "renameat2_noreplace_exercised=true",
    "automatic_cleanup_or_rollback_required=true",
    "failure_truth_final_receipt_required=true",
    "service_mutation=false",
    "live_execution=false",
    "credential_access=false",
    "transaction=false",
    "funds_movement=false",
):
    assert line in self_test.stdout.splitlines(), line

source_plan = subprocess.run(
    [python, "-I", "-B", str(INSTALLER), "--source-plan"],
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
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PROTECTED_INSTALL_V2",
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "lock_id=" + EXPECTED_LOCK_ID,
    "candidate_id=" + EXPECTED_CANDIDATE_ID,
    "native_sha256=" + EXPECTED_NATIVE_SHA,
    "native_bytes=726976",
    "binder_sha256=" + EXPECTED_BINDER_SHA,
    "binder_bytes=39391",
    "create_only=true",
    "atomic_publish_required=true",
    "automatic_cleanup_or_rollback_required=true",
    "protected_install_authorized=false",
    "service_mutation_authorized=false",
    "live_execution_authorized=false",
    "credential_access_authorized=false",
    "private_key_access_authorized=false",
    "signing_authorized=false",
    "transaction_authorized=false",
    "rpc_call_authorized=false",
    "funds_movement_authorized=false",
):
    assert line in source_plan.stdout.splitlines(), line

# Wrong confirmation must fail before collect_plan can inspect a candidate or /opt state.
with tempfile.TemporaryDirectory(prefix="void-e2-dormant-install-wrong-confirm-") as td:
    missing = pathlib.Path(td) / "does-not-exist"
    wrong = subprocess.run(
        [
            python, "-I", "-B", str(INSTALLER),
            "--apply",
            "--native", str(missing),
            "--expected-head", "0" * 40,
            "--expected-plan-id", "x",
            "--confirm", "WRONG",
        ],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
    )
    assert wrong.returncode == 2
    assert "reason=explicit_install_confirmation_required" in wrong.stdout
    assert "native_candidate_unavailable" not in wrong.stdout
    assert "directory_unavailable:/opt" not in wrong.stdout

print("VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PROTECTED_INSTALL_V2_PROOF_GREEN")
print("installer_blob_bound=true")
print("accepted_lock_v3_bound=true")
print("candidate_identity_bound=true")
print("native_binary_identity_bound=true")
print("binder_identity_bound=true")
print("wrong_confirmation_precedes_candidate_and_host_inspection=true")
print("create_only_install=true")
print("renameat2_noreplace_publish=true")
print("automatic_cleanup_or_rollback_required=true")
print("publication_truth_monotonic=true")
print("final_failure_receipt_required=true")
print("service_mutation=false")
print("live_execution=false")
print("credential_access=false")
print("private_key_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("funds_movement=false")
