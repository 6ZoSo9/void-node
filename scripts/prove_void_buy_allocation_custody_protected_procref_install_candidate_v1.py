#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_protected_procref_install_candidate_v1.py"
)
EXPECTED_SOURCE_BLOB = "e9d57aa3bb531eee4135af30c39ff7abf92ceac6"
PLAN = ROOT / "tools/void-buy-allocation-custody-protected-procref-install-plan-v1.mjs"
PLAN_BLOB = "a2431fffbee7be4de2ee1152b70e5fcccafd40c9"
LOCK = (
    ROOT
    / "ops/security/"
    "buy-void-allocation-custody-runtime-v3-"
    "protected-all-process-reference-census-lock-v4.json"
)
LOCK_BLOB = "29a5d9325468897c9b99d22d4a0376547a5e865e"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB
assert git_blob(PLAN.read_bytes()) == PLAN_BLOB
assert git_blob(LOCK.read_bytes()) == LOCK_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_protected_procref_install_candidate_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == "VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_CANDIDATE_V1"
assert module.SCHEMA == "void_buy_void_custody_protected_procref_install_candidate_v1"
assert module.VERSION == 1
assert module.PLAN_GIT_BLOB == PLAN_BLOB
assert module.LOCK_GIT_BLOB == LOCK_BLOB
assert module.LOCK_ID == (
    "voidbuycustodyallprocreflock4_"
    "2f22f0cf3e5c5ed56c2a31f0862f087cdbbe41a9"
)
assert module.REVIEWED_SOURCE_HEAD == "0eb763d8ecba723f5a80cccb24a297fbf5a010b7"
assert module.REVIEWED_SOURCE_GIT_BLOB == (
    "2f22f0cf3e5c5ed56c2a31f0862f087cdbbe41a9"
)
assert module.REVIEWED_SOURCE_BYTES == 74322
assert module.REVIEWED_SOURCE_SHA256 == (
    "79810ed2afa60d2e544e0f6f48ff8189"
    "dd26d5aaeb65208bfb1f562fda467a1c"
)
assert module.INSTALL_PARENT == Path("/opt")
assert module.INSTALL_NAME == "void-buy-allocation-custody-procref-v1"
assert module.STAGE_NAME == ".void-buy-allocation-custody-procref-v1.stage-v1"
assert module.PRODUCTION_APPLY_AUTHORIZED is False

lock = module.verify_inputs()
assert lock["candidate_source_accepted"] is True
for key in (
    "protected_install_authorized",
    "protected_source_installed",
    "live_privileged_census_authorized",
    "live_privileged_census_executed",
    "service_mutation",
    "systemd_mutation",
    "existing_target_replaced",
    "replacement_apply_authorized",
    "runtime_integration",
    "payment_acceptance",
    "public_presale_activation",
    "production_gate_ready",
    "funds_movement",
):
    assert lock[key] is False, key

source = TARGET.read_text(encoding="utf-8")
compile(source, str(TARGET), "exec", dont_inherit=True)

apply_block = source.split("def apply_production(", 1)[1].split(
    "def self_test(", 1
)[0]
guard = "if PRODUCTION_APPLY_AUTHORIZED is not True:"
assert guard in apply_block
guard_index = apply_block.index(guard)
for later in (
    "source_path is None",
    "os.geteuid()",
    "_read_exact_candidate(source_path)",
    "_open_production_parent()",
    "_publish_into_parent(",
):
    assert later in apply_block, later
    assert guard_index < apply_block.index(later), later

for required in (
    "RENAME_NOREPLACE = 1",
    "ctypes.CDLL(None, use_errno=True)",
    'getattr(libc, "renameat2", None)',
    "_revalidate_parent(",
    "_cleanup_stage(",
    "os.fsync(stage_fd)",
    "os.fsync(parent_fd)",
    "os.O_EXCL",
    "os.O_NOFOLLOW",
    "os.O_DIRECTORY",
    "stat.S_IMODE",
    "PRODUCTION_APPLY_AUTHORIZED = False",
    "production_apply_exposed=false",
    "production_apply_authorized=false",
    "install_receipt_external_review_required=true",
    "root_census_execution_authorized=false",
    "replacement_apply_authorized=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "funds_movement=false",
):
    assert required in source, required

for forbidden in (
    "subprocess",
    "systemctl",
    "socket.",
    "requests.",
    "urllib",
    "eth_send",
    "private_key",
    "wallet",
    "shutil.copy",
    "os.rename(",
    "os.replace(",
):
    assert forbidden not in source, forbidden

assert "os.unlink(INSTALL_NAME" not in source
assert "os.rmdir(INSTALL_NAME" not in source

publish_block = source.split("def _publish_into_parent(", 1)[1].split(
    "def source_plan(", 1
)[0]
assert publish_block.index("_revalidate_parent(") < publish_block.index(
    "_rename_noreplace("
)
assert publish_block.index("_rename_noreplace(") < publish_block.index(
    "os.fsync(parent_fd)"
)
assert publish_block.index("os.fsync(parent_fd)") < publish_block.rindex(
    "_verify_root_at("
)

cmd = [sys.executable, "-I", "-B", str(TARGET)]

self_test = subprocess.run(
    cmd + ["--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert self_test.returncode == 0, self_test.stderr + self_test.stdout
self_lines = set(self_test.stdout.splitlines())
for line in (
    "VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_CANDIDATE_V1_SELF_TEST_GREEN",
    "exact_v4_source_lock_bound=true",
    "exact_reviewed_source_bytes_bound=true",
    "renameat2_noreplace_fixture_green=true",
    "create_only_no_clobber_fixture_green=true",
    "retained_parent_descriptor_fixture_green=true",
    "parent_mount_id_revalidation_fixture_green=true",
    "same_mount_stage_fixture_green=true",
    "exact_single_entry_stage_fixture_green=true",
    "source_file_mode_0444_fixture_green=true",
    "stage_fsync_fixture_green=true",
    "install_parent_fsync_fixture_green=true",
    "post_publication_exact_reverification_fixture_green=true",
    "prepublication_stage_cleanup_fixture_green=true",
    "install_parent_drift_rejected=true",
    "production_apply_exposed=false",
    "production_apply_authorized=false",
    "root_census_execution_authorized=false",
    "host_write=false",
    "replacement_apply_authorized=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "funds_movement=false",
):
    assert line in self_lines, line

plan = subprocess.run(
    cmd + ["--source-plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=15,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert plan.returncode == 0, plan.stderr + plan.stdout
plan_lines = set(plan.stdout.splitlines())
for line in (
    "mode=source-plan",
    "source_candidate_only=true",
    "production_apply_exposed=false",
    "production_apply_authorized=false",
    "create_only=true",
    "atomic_renameat2_noreplace=true",
    "install_parent_descriptor_retained=true",
    "same_mount_staging_required=true",
    "post_publication_exact_reverification_required=true",
    "install_receipt_external_review_required=true",
    "root_census_execution_authorized=false",
    "host_write=false",
    "replacement_apply_authorized=false",
    "funds_movement=false",
):
    assert line in plan_lines, line

apply_hold = subprocess.run(
    cmd + ["--apply", "--source-file", "/nonexistent/never-read"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=15,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert apply_hold.returncode == 2, apply_hold
hold_lines = set(apply_hold.stdout.splitlines())
assert (
    "reason=custody_procref_install_candidate_protected_install_apply_not_authorized"
    in hold_lines
)
for line in (
    "production_apply_authorized=false",
    "root_census_execution_authorized=false",
    "host_write=false",
    "replacement_apply_authorized=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "funds_movement=false",
):
    assert line in hold_lines, line

without_b = subprocess.run(
    [sys.executable, "-I", str(TARGET), "--apply", "--source-file", "/nonexistent"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=15,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert without_b.returncode == 2
assert "reason=python_isolated_unoptimized_nobytecode_mode_required" in (
    without_b.stdout.splitlines()
)
assert "host_write=false" in without_b.stdout.splitlines()

print("VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_CANDIDATE_V1_PROOF_GREEN")
print("exact_installer_source_blob_asserted=true")
print("exact_v4_source_lock_bound=true")
print("exact_v4_install_plan_bound=true")
print("exact_reviewed_source_identity_bound=true")
print("production_apply_guard_precedes_host_access=true")
print("apply_nonexistent_candidate_not_read=true")
print("python_no_bytecode_mode_required=true")
print("without_dash_b_bootstrap_hold=true")
print("renameat2_noreplace_fixture_green=true")
print("create_only_no_clobber_fixture_green=true")
print("parent_descriptor_and_mount_revalidation_fixture_green=true")
print("prepublication_stage_cleanup_fixture_green=true")
print("post_publication_exact_reverification_fixture_green=true")
print("production_apply_exposed=false")
print("production_apply_authorized=false")
print("root_census_execution_authorized=false")
print("host_write=false")
print("service_mutation=false")
print("systemd_mutation=false")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
