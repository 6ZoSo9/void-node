#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "ops/precision/"
      "void_buy_allocation_custody_runtime_v3_"
      "protected_all_process_install_plan_v1.py"
)
EXPECTED_SOURCE_BLOB = "0fef4e6f76738dd474ea775985b1facdd922bb54"


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_v3_protected_all_process_install_plan_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_INSTALL_PLAN_V1"
)
assert module.SCHEMA == (
    "void_buy_void_custody_runtime_v3_"
    "protected_all_process_install_plan_v1"
)
assert module.LOCK_GIT_BLOB == (
    "5ba0c8d7b1ab8e8384472bb867e0603e6986b9b1"
)
assert module.LOCK_ID == (
    "voidbuycustodyallprocreflock6_"
    "33a7221cad37aec70474b97b26c2b10e2ef60f66"
)
assert module.ACCEPTED_SOURCE_BLOB == (
    "33a7221cad37aec70474b97b26c2b10e2ef60f66"
)
assert module.ACCEPTED_SOURCE_BYTES == 74322
assert module.ACCEPTED_SOURCE_SHA256 == (
    "d5b91c7efa048eb40601d162185563a29916f1ff22a23638c7da5f330b92beba"
)
assert module.INSTALL_ROOT == Path(
    "/opt/void-buy-allocation-custody-procref-v1"
)
assert module.INSTALL_SOURCE == Path(
    "/opt/void-buy-allocation-custody-procref-v1/"
    "void_buy_allocation_custody_runtime_v3_"
    "protected_all_process_reference_census_v1.py"
)
assert module.FINAL_ROOT_MODE == "0555"
assert module.FINAL_SOURCE_MODE == "0444"

lock = module.verify_lock()
assert lock["candidate_source_accepted"] is True
assert lock["protected_install_authorized"] is False
assert lock["protected_source_installed"] is False
assert lock["live_privileged_census_authorized"] is False
assert lock["replacement_apply_authorized"] is False
assert lock["funds_movement"] is False

plan = module.build_plan()
contract = plan["install_contract"]
authority = plan["authority"]

assert contract["create_only"] is True
assert contract["destination_root_absent_required"] is True
assert contract["stage_root_absent_required"] is True
assert contract["same_filesystem_private_stage_required"] is True
assert contract["kernel_noreplace_publication_required"] is True
assert contract["existing_destination_replacement_forbidden"] is True
assert contract["recursive_existing_destination_delete_forbidden"] is True
assert contract["post_publish_exact_source_identity_required"] is True
assert contract["post_publish_python_i_b_required"] is True
assert contract["host_namespace_lease_provenance_still_required"] is True
assert contract["live_at_use_reverification_required"] is True
assert contract["installed_execution_authorized"] is False
assert contract["live_privileged_census_authorized"] is False

assert authority["install_target_selected"] is True

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
    assert authority[key] is False, key

body = {key: value for key, value in plan.items() if key != "plan_id"}
assert plan["plan_id"] == module.PLAN_PREFIX + module.sha256(module.canonical(body))

module.self_test()

saved_getuid = module.os.getuid
saved_geteuid = module.os.geteuid
try:
    module.os.getuid = lambda: 0
    module.os.geteuid = lambda: 0
    try:
        module.build_plan()
    except module.PlanHold as exc:
        assert "root_execution_forbidden_for_source_plan" in str(exc)
    else:
        raise AssertionError("root source-plan execution was accepted")
finally:
    module.os.getuid = saved_getuid
    module.os.geteuid = saved_geteuid

with tempfile.TemporaryDirectory(
    prefix="void-custody-procref-install-plan-proof-"
) as tmp:
    fixture = Path(tmp)
    lock_path = fixture / module.LOCK_REL
    lock_path.parent.mkdir(parents=True, mode=0o700)
    original_lock = (ROOT / module.LOCK_REL).read_bytes()
    lock_path.write_bytes(original_lock + b"\n")

    original_root = module.ROOT
    module.ROOT = fixture
    try:
        try:
            module.verify_lock()
        except module.PlanHold as exc:
            assert "lock_git_blob_mismatch" in str(exc)
        else:
            raise AssertionError("tampered source lock was accepted")
    finally:
        module.ROOT = original_root

without_b = subprocess.run(
    [sys.executable, "-I", str(TARGET), "--plan"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=10,
    cwd="/",
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert without_b.returncode == 2, without_b
assert (
    "reason=python_isolated_unoptimized_no_bytecode_mode_required"
    in without_b.stdout
)

apply_attempt = subprocess.run(
    [sys.executable, "-I", "-B", str(TARGET), "--apply"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=10,
    cwd="/",
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert apply_attempt.returncode != 0
assert "--apply" not in TARGET.read_text(encoding="utf-8")

source = TARGET.read_text(encoding="utf-8")
pre_main = source.split("def self_test()", 1)[0]

for forbidden in (
    "subprocess",
    "shutil",
    "tempfile",
    "os.write(",
    "os.pwrite(",
    "os.mkdir(",
    "os.makedirs(",
    "os.unlink(",
    "os.remove(",
    "os.rename(",
    "os.replace(",
    "os.chmod(",
    "os.chown(",
    "os.fchmod(",
    "os.fchown(",
    "os.link(",
    "os.symlink(",
    "sudo ",
    "systemctl",
    "--apply",
):
    assert forbidden not in pre_main, forbidden

for required in (
    "destination_root_absent_required",
    "stage_root_absent_required",
    "same_filesystem_private_stage_required",
    "kernel_noreplace_publication_required",
    "existing_destination_replacement_forbidden",
    "fsync_source_before_publish_required",
    "fsync_stage_directory_before_publish_required",
    "fsync_install_parent_after_publish_required",
    "post_publish_exact_source_identity_required",
    "post_publish_root_owned_nonwritable_ancestry_required",
    "host_namespace_lease_provenance_still_required",
    "live_at_use_reverification_required",
    "install_target_selected",
    "protected_install_authorized",
    "live_privileged_census_authorized",
    "replacement_apply_authorized",
):
    assert required in source, required

print("VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_INSTALL_PLAN_V1_PROOF_GREEN")
print("exact_source_blob_asserted=true")
print("accepted_lock_exact=true")
print("accepted_source_exact=true")
print("fixed_protected_install_path_bound=true")
print("deterministic_plan_id_proven=true")
print("tampered_lock_rejected=true")
print("root_source_plan_execution_rejected=true")
print("without_dash_b_bootstrap_hold=true")
print("apply_mode_absent=true")
print("create_only_plan=true")
print("kernel_noreplace_publication_required=true")
print("existing_destination_replacement_forbidden=true")
print("post_publish_exact_source_identity_required=true")
print("host_namespace_lease_provenance_still_required=true")
print("live_at_use_reverification_required=true")
print("production_plan_explicit_filesystem_write=false")
print("production_plan_filesystem_write_free=false")
print("production_plan_atime_write_possible=true")
print("install_target_selected=true")
print("proof_fixture_filesystem_write=true")
print("protected_install_authorized=false")
print("protected_source_installed=false")
print("live_privileged_census_authorized=false")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
