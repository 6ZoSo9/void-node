#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "ops/precision/"
      "void_buy_allocation_custody_runtime_v3_"
      "protected_all_process_installer_candidate_v1.py"
)
EXPECTED_SOURCE_BLOB = "d4500fdfb5e53e2e70a913f731ecbdd325406190"


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
    "PROTECTED_ALL_PROCESS_INSTALLER_CANDIDATE_V1"
)
assert module.SCHEMA == (
    "void_buy_void_custody_runtime_v3_"
    "protected_all_process_installer_candidate_v1"
)
assert module.PLAN_GIT_BLOB == (
    "d0d500d5a4715c9319e702350a8851884b4baff8"
)
assert module.PLAN_HEAD == (
    "47a6f1ae0b6f0cebbfa7d6b859436d1e5858eb97"
)
assert module.LOCK_GIT_BLOB == (
    "5ba0c8d7b1ab8e8384472bb867e0603e6986b9b1"
)
assert module.ACCEPTED_SOURCE_GIT_BLOB == (
    "33a7221cad37aec70474b97b26c2b10e2ef60f66"
)
assert module.ACCEPTED_SOURCE_BYTES == 74322
assert module.ACCEPTED_SOURCE_SHA256 == (
    "d5b91c7efa048eb40601d162185563a29916f1ff22a23638c7da5f330b92beba"
)
assert module.INSTALL_ROOT == Path(
    "/opt/void-buy-allocation-custody-procref-v1"
)
assert module.STAGE_ROOT == Path(
    "/opt/.void-buy-allocation-custody-procref-v1.stage-v1"
)
assert module.FINAL_ROOT_MODE == 0o555
assert module.FINAL_SOURCE_MODE == 0o444
assert module.RENAME_NOREPLACE == 1
assert module.PROTECTED_FIRST_ENTRY_REQUIRED is True
assert module.DIRECT_APPLY_CLI is False

source_raw = module.verify_repository_inputs()
assert len(source_raw) == module.ACCEPTED_SOURCE_BYTES
assert module.sha256(source_raw) == module.ACCEPTED_SOURCE_SHA256

plan = module.source_plan()
assert plan["candidate_contract"]["installer_algorithm_implemented"] is True
assert plan["candidate_contract"]["direct_apply_cli"] is False
assert plan["candidate_contract"]["protected_first_entry_required"] is True
assert plan["candidate_contract"]["create_only"] is True
assert plan["candidate_contract"]["kernel_rename_noreplace_required"] is True
assert plan["candidate_contract"]["destination_absent_required"] is True
assert plan["candidate_contract"]["stage_absent_required"] is True
assert plan["candidate_contract"]["same_filesystem_stage_required"] is True
assert plan["candidate_contract"]["truthful_post_publication_failure_receipt_required"] is True
assert plan["authority"]["protected_install_authorized"] is False
assert plan["authority"]["protected_source_installed"] is False
assert plan["authority"]["live_privileged_census_authorized"] is False
assert plan["authority"]["replacement_apply_authorized"] is False
assert plan["authority"]["payment_acceptance"] is False
assert plan["authority"]["public_presale_activation"] is False
assert plan["authority"]["funds_movement"] is False

module.self_test()

cmd = [sys.executable, "-I", "-B", str(TARGET)]

source_plan = subprocess.run(
    cmd + ["--source-plan"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert source_plan.returncode == 0, source_plan.stderr + source_plan.stdout
parsed = json.loads(source_plan.stdout)
assert parsed["candidate_contract"]["direct_apply_cli"] is False
assert parsed["candidate_contract"]["protected_first_entry_required"] is True
assert parsed["authority"]["protected_install_authorized"] is False
assert parsed["authority"]["funds_movement"] is False

apply_attempt = subprocess.run(
    cmd + ["--apply"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert apply_attempt.returncode != 0

without_b = subprocess.run(
    [sys.executable, "-I", str(TARGET), "--source-plan"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert without_b.returncode == 2
assert (
    "reason=python_isolated_unoptimized_no_bytecode_mode_required"
    in without_b.stdout
)

source = TARGET.read_text(encoding="utf-8")

for required in (
    "apply_create_only_algorithm",
    "_renameat2_noreplace",
    "RENAME_NOREPLACE",
    "destination_root_present",
    "staging_root_present",
    "stage_cross_filesystem",
    "os.O_CREAT",
    "os.O_EXCL",
    "os.O_NOFOLLOW",
    "os.fsync(file_fd)",
    "os.fsync(stage_fd)",
    "parent_fsync_fn(parent_fd)",
    "published_install_needs_inspection",
    "forced_rename_failure_cleanup_proven=true",
    "postpublication_failure_preserves_final_root=true",
    "direct_apply_cli",
    "protected_first_entry_required",
    "protected_installer_first_entry_verified",
    "protected_install_authorized",
    "live_privileged_census_authorized",
    "replacement_apply_authorized",
):
    assert required in source, required

for forbidden in (
    'group.add_argument("--apply"',
    'parser.add_argument("--apply"',
    "subprocess",
    "systemctl",
    "socket.",
    "requests.",
    "urllib",
    "wallet",
    "private_key",
    "eth_send",
):
    assert forbidden not in source, forbidden

assert source.index("os.fsync(file_fd)") < source.index(
    "rename_fn(parent_fd, stage_name, install_name)"
)
assert source.index("os.fsync(stage_fd)") < source.index(
    "rename_fn(parent_fd, stage_name, install_name)"
)
assert source.index(
    "rename_fn(parent_fd, stage_name, install_name)"
) < source.index("parent_fsync_fn(parent_fd)")
assert source.index("os.fchmod(stage_fd, 0o700)") < source.index(
    "os.unlink(source_name, dir_fd=stage_fd)"
)

print(
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
    "PROTECTED_ALL_PROCESS_INSTALLER_CANDIDATE_V1_PROOF_GREEN"
)
print("exact_source_blob_asserted=true")
print("accepted_plan_exact=true")
print("accepted_lock_exact=true")
print("accepted_source_exact=true")
print("installer_algorithm_implemented=true")
print("direct_apply_cli=false")
print("protected_first_entry_required=true")
print("create_only=true")
print("destination_collision_rejected=true")
print("forced_rename_failure_cleanup_proven=true")
print("kernel_rename_noreplace_required=true")
print("source_fsync_before_publication=true")
print("stage_directory_fsync_before_publication=true")
print("parent_fsync_after_publication=true")
print("exact_post_publication_verification_required=true")
print("truthful_post_publication_failure_receipt=true")
print("postpublication_failure_preserves_final_root=true")
print("without_dash_b_bootstrap_hold=true")
print("protected_install_authorized=false")
print("protected_source_installed=false")
print("live_privileged_census_authorized=false")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
