#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_protected_installer_first_entry_plan_v1.py"
)
LOCK = (
    ROOT
    / "ops/security/"
    "buy-void-allocation-custody-runtime-v3-protected-all-process-installer-lock-v1.json"
)

EXPECTED_SOURCE_BLOB = "b92dd8ffb9cb35c5e8c362ea52d76abdd41c5969"
EXPECTED_LOCK_BLOB = "a1e1f4887787b408d313e73360966f93a63b2b58"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB
assert git_blob(LOCK.read_bytes()) == EXPECTED_LOCK_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_v3_protected_installer_first_entry_plan_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_INSTALLER_FIRST_ENTRY_PLAN_V1"
)
assert module.SCHEMA == (
    "void_buy_void_custody_runtime_v3_"
    "protected_installer_first_entry_plan_v1"
)
assert module.LOCK_GIT_BLOB == EXPECTED_LOCK_BLOB
assert module.LOCK_ID == (
    "voidbuycustodyprocrefinstallerlock1_"
    "9dd33f38fe4c89a5d2beacbc535380346eaea83b"
)
assert module.PARENT_LOCK_HEAD == (
    "329134210c56930e684b2ffdffb45a7ee55fbfb9"
)
assert module.ACCEPTED_INSTALLER_GIT_BLOB == (
    "9dd33f38fe4c89a5d2beacbc535380346eaea83b"
)
assert module.ACCEPTED_INSTALLER_BYTES == 38420
assert module.ACCEPTED_INSTALLER_SHA256 == (
    "e956c90ad9680680d0734466b632a58a4145ad74c8962e9e8960b186caeced01"
)
assert module.ACCEPTED_INSTALLER_ENTRYPOINT == (
    "install_accepted_source_create_only_after_protected_first_entry"
)
assert module.REPOSITORY_ROOT == Path("/home/zoso/dev/void-node")
assert module.FIRST_ENTRY_INSTALL_ROOT == Path(
    "/opt/void-buy-allocation-custody-procref-installer-first-entry-v1"
)
assert module.FIXED_PYTHON == Path("/usr/bin/python3")

lock = module.verify_lock()
assert lock["candidate_installer_source_accepted"] is True
assert lock["install_target_selected"] is True
assert lock["protected_install_authorized"] is False
assert lock["protected_source_installed"] is False

first = module.build_plan()
second = module.build_plan()
assert first == second
assert first["plan_id"].startswith(module.PLAN_PREFIX)
assert len(first["plan_id"]) == len(module.PLAN_PREFIX) + 64

contract = first["first_entry_contract"]
authority = first["authority"]

assert contract["mechanism_selected"] == (
    "STATIC_NATIVE_PREENTRY_SEALED_MEMFD_FIXED_PYTHON_V1"
)
for key in (
    "first_privileged_instruction_static_native_required",
    "mutable_checkout_python_first_instruction_forbidden",
    "native_source_candidate_required",
    "native_binary_candidate_required",
    "native_binary_reproducible_build_required",
    "native_binary_static_link_required",
    "native_binary_root_owned_protected_install_required",
    "native_binary_at_use_identity_reverification_required",
    "first_entry_install_target_selected",
    "installer_repository_source_descriptor_snapshot_required",
    "installer_repository_source_nofollow_required",
    "installer_repository_source_exact_blob_required",
    "installer_repository_source_exact_sha256_required",
    "installer_repository_source_generation_recheck_required",
    "sealed_installer_memfd_required",
    "memfd_allow_sealing_required",
    "memfd_seal_write_required",
    "memfd_seal_grow_required",
    "memfd_seal_shrink_required",
    "memfd_seal_seal_required",
    "installer_memfd_inherited_into_python_required",
    "python_generation_candidate_required",
    "python_root_owned_nonwritable_ancestry_required",
    "python_descriptor_bound_exec_required",
    "python_path_reopen_after_verification_forbidden",
    "python_isolated_flag_required",
    "python_no_site_flag_required",
    "python_no_bytecode_flag_required",
    "ambient_python_environment_cleared_required",
    "caller_stdin_devnull_required",
    "working_directory_root_required",
    "fixed_bridge_compiled_into_native_policy_required",
    "bridge_reads_only_sealed_installer_memfd_required",
    "bridge_rehashes_installer_memfd_required",
    "bridge_arbitrary_module_or_function_selection_forbidden",
    "installer_repository_inputs_reverified_at_use_required",
    "installer_fixed_destination_contract_reused",
    "installer_stage_unknown_recovery_contract_reused",
):
    assert contract[key] is True, key

for key in (
    "native_binary_source_derived",
    "native_binary_derived",
    "native_binary_accepted",
    "native_binary_installed",
    "native_binary_verified",
    "python_generation_selected",
    "protected_install_invocation_authorized",
    "live_privileged_census_invocation_authorized",
):
    assert contract[key] is False, key

assert contract["fixed_python_path"] == "/usr/bin/python3"
assert contract["bridge_installer_sha256"] == module.ACCEPTED_INSTALLER_SHA256
assert contract["bridge_installer_bytes"] == module.ACCEPTED_INSTALLER_BYTES
assert contract["bridge_compile_synthetic_filename"] == str(
    module.REPOSITORY_INSTALLER
)
assert contract["bridge_fixed_entrypoint"] == module.ACCEPTED_INSTALLER_ENTRYPOINT

for key in (
    "candidate_installer_source_accepted",
    "install_target_selected",
    "first_entry_install_target_selected",
):
    assert authority[key] is True, key

for key in (
    "native_first_entry_source_derived",
    "native_first_entry_binary_derived",
    "native_first_entry_binary_accepted",
    "native_first_entry_binary_installed",
    "native_first_entry_binary_verified",
    "first_entry_execution_authorized",
    "protected_installer_first_entry_installed",
    "protected_installer_first_entry_verified",
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

saved_uid = module.os.getuid
saved_euid = module.os.geteuid
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
    module.os.getuid = saved_uid
    module.os.geteuid = saved_euid

module.self_test()

cmd = [sys.executable, "-I", "-B", str(TARGET)]
plan_run = subprocess.run(
    cmd + ["--plan"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=20,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert plan_run.returncode == 0, plan_run.stderr + plan_run.stdout
assert json.loads(plan_run.stdout)["plan_id"] == first["plan_id"]

without_b = subprocess.run(
    [sys.executable, "-I", str(TARGET), "--plan"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=20,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert without_b.returncode == 2
assert (
    "reason=python_isolated_unoptimized_nobytecode_mode_required"
    in without_b.stdout
)

apply_attempt = subprocess.run(
    cmd + ["--apply"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=20,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert apply_attempt.returncode != 0

source = TARGET.read_text(encoding="utf-8")
pre_self_test = source.split("def self_test()", 1)[0]
for forbidden in (
    "subprocess",
    "os.write(",
    "os.pwrite(",
    "os.mkdir(",
    "os.makedirs(",
    "os.unlink(",
    "os.rmdir(",
    "os.rename(",
    "os.replace(",
    "os.chmod(",
    "os.chown(",
    "os.fchmod(",
    "os.fchown(",
    "socket.",
    "systemctl",
    "sudo ",
):
    assert forbidden not in pre_self_test, forbidden

for required in (
    "STATIC_NATIVE_PREENTRY_SEALED_MEMFD_FIXED_PYTHON_V1",
    "first_privileged_instruction_static_native_required",
    "sealed_installer_memfd_required",
    "python_descriptor_bound_exec_required",
    "python_no_site_flag_required",
    "fixed_bridge_compiled_into_native_policy_required",
    "bridge_compile_synthetic_filename",
    "installer_repository_inputs_reverified_at_use_required",
    "DERIVE_STATIC_NATIVE_FIRST_ENTRY_CANDIDATE",
):
    assert required in source, required

print(
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
    "PROTECTED_INSTALLER_FIRST_ENTRY_PLAN_V1_PROOF_GREEN"
)
print("exact_source_blob_asserted=true")
print("accepted_installer_lock_exact=true")
print("accepted_installer_identity_exact=true")
print("deterministic_plan_id_proven=true")
print("root_source_plan_execution_rejected=true")
print("without_dash_b_bootstrap_hold=true")
print("apply_mode_absent=true")
print("first_privileged_instruction_static_native_required=true")
print("mutable_checkout_python_first_instruction_forbidden=true")
print("sealed_installer_memfd_required=true")
print("python_descriptor_bound_exec_required=true")
print("python_isolated_no_site_no_bytecode_required=true")
print("fixed_bridge_compiled_into_native_policy_required=true")
print("synthetic_installer_filename_bound=true")
print("installer_repository_inputs_reverified_at_use_required=true")
print("first_entry_install_target_selected=true")
print("native_first_entry_source_derived=false")
print("native_first_entry_binary_derived=false")
print("native_first_entry_binary_accepted=false")
print("native_first_entry_binary_installed=false")
print("native_first_entry_binary_verified=false")
print("first_entry_execution_authorized=false")
print("protected_install_authorized=false")
print("protected_source_installed=false")
print("live_privileged_census_authorized=false")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("production_gate_ready=false")
print("funds_movement=false")
