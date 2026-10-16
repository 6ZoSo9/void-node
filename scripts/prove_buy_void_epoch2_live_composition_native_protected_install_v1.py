#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]

INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_protected_install_v1.py"
)
LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-live-composition-native-candidate-lock-v3.json"
)
NATIVE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_preentry_v1.c"
)
RUNNER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs"
)
QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_user_manager_credential_query_installed_qualification_v1.py"
)
SEALED_REL = "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs"

EXPECTED_BLOBS = {
    INSTALLER_REL: "3f70620941a8ab2e5824c43b13b6aa03e20dac99",
    LOCK_REL: "57f965a944031eac90d69b4104b0f8f2473e66cc",
    NATIVE_REL: "4aa091e7835b32aa5c4e7b8e4059651c69a64eb3",
    RUNNER_REL: "92e8c8696ea7e2bb81b6ef089db8baa657188935",
    QUALIFIER_REL: "8dc5d53dfcc52c261a3da0ee692f3a4fcc0bfc4c",
    SEALED_REL: "14cbe81e27d04fee77cbe75225ce308bf8561a7b",
}

LOCK_ID = (
    "voidbuye2nativecandlock3_"
    "024c9e3818a40616fc8b198f605721bf76ed43d6d4f186bf02a202d46860a659"
)
NATIVE_SHA = "78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589"
NATIVE_BYTES = 726976
RUNNER_SHA = "2ba779e98b76cd24c6b24de38b77dfded5ce7dd35869b8dd99490d3aa653af73"
RUNNER_BYTES = 30103
CONFIRM = "INSTALL_ACCEPTED_EPOCH2_NATIVE_LIVE_COMPOSITION_V3_CREATE_ONLY"

def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()

def stable_read(relative: str) -> bytes:
    path = ROOT / relative
    before = path.lstat()
    assert stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode), relative
    assert before.st_nlink == 1 and before.st_size > 0, relative
    raw = path.read_bytes()
    after = path.lstat()
    for field in (
        "st_dev", "st_ino", "st_mode", "st_uid", "st_gid",
        "st_nlink", "st_size", "st_mtime_ns", "st_ctime_ns",
    ):
        assert getattr(before, field) == getattr(after, field), (
            "file_changed:" + relative + ":" + field
        )
    return raw

for relative, expected in EXPECTED_BLOBS.items():
    assert git_blob(stable_read(relative)) == expected, "blob_drift:" + relative

installer = stable_read(INSTALLER_REL).decode("utf-8")
compile(installer, INSTALLER_REL, "exec", dont_inherit=True)

for token in (
    LOCK_ID,
    NATIVE_SHA,
    RUNNER_SHA,
    CONFIRM,
    'INSTALL_NAME = "void-buy-void-epoch2-live-composition-v2"',
    'STAGE_NAME = ".void-buy-void-epoch2-live-composition-v2.stage"',
    'POLICY_NAME = "policy-v1.conf"',
    "schema=VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V1",
    "expected_head=",
    "runner_sha256=",
    "runner_bytes=",
    "node_sha256=",
    "node_bytes=",
    "RENAME_NOREPLACE = 1",
    "renameat2",
    "candidate_prepare_must_be_unprivileged",
    "fixed_repository_path_required",
    "fixed_node_metadata_invalid",
    "atomic_directory_publication=true",
    "explicit_create_only_confirmation_required",
    "published_needs_inspection",
    "protected_install_performed=true",
    "protected_install_performed=false",
    "live_execution=false",
    "credential_access=false",
    "private_key_access=false",
    "signing=false",
    "transaction=false",
    "service_mutation=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "funds_movement=false",
):
    assert token in installer, token

for forbidden in (
    "systemctl",
    "eth_sendRawTransaction",
    "eth_sendTransaction",
    "requests.",
    "urllib.request",
):
    assert forbidden not in installer, "forbidden_installer_token:" + forbidden

assert installer.index("if confirm != CONFIRM") < installer.index("if os.geteuid() != 0")
assert installer.index("accepted_lock()") < installer.index("verify_repository(expected_head)")
assert installer.index("node_bytes, node_sha = node_identity()") < installer.index(
    "policy = policy_bytes(expected_head, node_bytes, node_sha)"
)
assert installer.index("write_stage_file(") < installer.index("renameat2")
assert "os.unlink(INSTALL_NAME" not in installer
assert "os.rmdir(INSTALL_NAME" not in installer

cmd = [sys.executable, "-I", "-B", str(ROOT / INSTALLER_REL)]

self_test = subprocess.run(
    cmd + ["--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert self_test.returncode == 0, self_test.stdout + self_test.stderr
self_lines = set(self_test.stdout.splitlines())
for line in (
    "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V1_SELF_TEST_GREEN",
    "candidate_lock_id=" + LOCK_ID,
    "create_only=true",
    "atomic_directory_publication=true",
    "exact_native_identity_required=true",
    "exact_runner_identity_required=true",
    "fixed_root_node_identity_policy_bound=true",
    "expected_source_head_policy_bound=true",
    "service_mutation=false",
    "credential_access=false",
    "signing=false",
    "funds_movement=false",
):
    assert line in self_lines, line

source_plan = subprocess.run(
    cmd + ["--source-plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert source_plan.returncode == 0, source_plan.stdout + source_plan.stderr
plan_lines = set(source_plan.stdout.splitlines())
for line in (
    "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V1",
    "mode=source-plan",
    "accepted_lock_id=" + LOCK_ID,
    "target_root=/opt/void-buy-void-epoch2-live-composition-v2",
    "create_only=true",
    "atomic_directory_publication=true",
    "host_read=false",
    "host_write=false",
    "live_execution=false",
    "credential_access=false",
    "signing=false",
    "funds_movement=false",
):
    assert line in plan_lines, line

missing_confirm = subprocess.run(
    cmd
    + [
        "--apply",
        "--native", "/nonexistent/native",
        "--runner", "/nonexistent/runner",
        "--expected-head", "a" * 40,
    ],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert missing_confirm.returncode == 2
assert "reason=explicit_create_only_confirmation_required" in missing_confirm.stdout
assert "protected_install_performed=false" in missing_confirm.stdout

with tempfile.TemporaryDirectory(prefix="void-e2-native-protected-install-proof-") as td:
    output = Path(td) / "prepared"
    prepared = subprocess.run(
        cmd + ["--prepare", "--output-dir", str(output)],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=180,
    )
    assert prepared.returncode == 0, prepared.stdout + prepared.stderr
    native = output / "void_buy_void_epoch2_live_composition_native_preentry_v1"
    runner = output / "void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs"
    native_raw = native.read_bytes()
    runner_raw = runner.read_bytes()
    assert len(native_raw) == NATIVE_BYTES
    assert hashlib.sha256(native_raw).hexdigest() == NATIVE_SHA
    assert len(runner_raw) == RUNNER_BYTES
    assert hashlib.sha256(runner_raw).hexdigest() == RUNNER_SHA
    assert stat.S_IMODE(native.stat().st_mode) == 0o500
    assert stat.S_IMODE(runner.stat().st_mode) == 0o400
    prepared_lines = set(prepared.stdout.splitlines())
    for line in (
        "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V1_PREPARE_GREEN",
        "native_sha256=" + NATIVE_SHA,
        "runner_sha256=" + RUNNER_SHA,
        "protected_install_performed=false",
        "live_execution=false",
        "credential_access=false",
        "signing=false",
        "funds_movement=false",
    ):
        assert line in prepared_lines, line

print("VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V1_PROOF_GREEN")
print("accepted_v3_lock_bound=true")
print("offhost_exact_candidate_preparation=true")
print("native_candidate_sha256_bound=true")
print("runner_candidate_sha256_bound=true")
print("create_only=true")
print("atomic_directory_publication=true")
print("root_node_identity_policy_bound=true")
print("expected_source_head_policy_bound=true")
print("explicit_apply_confirmation_required=true")
print("host_apply_executed=false")
print("live_execution=false")
print("credential_access=false")
print("private_key_access=false")
print("signing=false")
print("transaction=false")
print("service_mutation=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
