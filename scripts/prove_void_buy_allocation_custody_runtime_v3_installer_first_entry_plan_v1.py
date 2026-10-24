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
    "void_buy_allocation_custody_runtime_v3_installer_first_entry_plan_v1.py"
)
EXPECTED_SOURCE_BLOB = "87f6f9766309bfe3d0b9c74625dbc48c6aa0e16d"


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_v3_installer_first_entry_plan_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_INSTALLER_FIRST_ENTRY_PLAN_V1"
)
assert module.SCHEMA == (
    "void_buy_void_custody_runtime_v3_installer_first_entry_plan_v1"
)
assert module.INSTALLER_LOCK_GIT_BLOB == (
    "a1e1f4887787b408d313e73360966f93a63b2b58"
)
assert module.INSTALLER_GIT_BLOB == (
    "9dd33f38fe4c89a5d2beacbc535380346eaea83b"
)
assert module.INSTALLER_BYTES == 38420
assert module.INSTALLER_SHA256 == (
    "e956c90ad9680680d0734466b632a58a4145ad74c8962e9e8960b186caeced01"
)
assert module.INSTALL_PLAN_GIT_BLOB == (
    "0fef4e6f76738dd474ea775985b1facdd922bb54"
)
assert module.SOURCE_LOCK_GIT_BLOB == (
    "5ba0c8d7b1ab8e8384472bb867e0603e6986b9b1"
)
assert module.PROTECTED_CENSUS_GIT_BLOB == (
    "33a7221cad37aec70474b97b26c2b10e2ef60f66"
)
assert module.PROTECTED_CENSUS_BYTES == 74322
assert module.PROTECTED_CENSUS_SHA256 == (
    "d5b91c7efa048eb40601d162185563a29916f1ff22a23638c7da5f330b92beba"
)

raw = module.read_bound_regular(
    ROOT / module.INSTALLER_LOCK_REL,
    module.MAX_READ,
)
lock = module.validate_installer_lock(raw)
body = module.plan_body(lock)

assert body["protected_source_snapshot"]["exact_file_count"] == 4
assert [row["path"] for row in body["protected_source_snapshot"]["files"]] == [
    module.INSTALLER_REL,
    module.INSTALL_PLAN_REL,
    module.SOURCE_LOCK_REL,
    module.PROTECTED_CENSUS_REL,
]
assert body["future_first_entry_layout"]["root"] == (
    "/opt/void-buy-allocation-custody-procref-installer-first-entry-v1"
)
assert body["native_first_instruction_contract"][
    "static_native_first_instruction_required"
] is True
assert body["native_first_instruction_contract"]["pt_interp_forbidden"] is True
assert body["native_first_instruction_contract"]["pt_dynamic_forbidden"] is True
assert body["native_first_instruction_contract"][
    "caller_selected_python_source_forbidden"
] is True
assert body["native_first_instruction_contract"][
    "caller_selected_installer_path_forbidden"
] is True
assert body["native_first_instruction_contract"][
    "caller_selected_destination_forbidden"
] is True
assert body["native_first_instruction_contract"]["exact_privileged_operation"] == (
    "--install-accepted-protected-census-source"
)
assert body["native_first_instruction_contract"]["exact_confirmation_token"] == (
    "INSTALL_ACCEPTED_VOID_CUSTODY_PROTECTED_PROCREF_SOURCE_V1_CREATE_ONLY"
)
assert body["native_first_instruction_contract"][
    "exact_privileged_argv_required"
] is True
assert body["native_first_instruction_contract"][
    "unknown_options_rejected_required"
] is True
assert body["native_first_instruction_contract"][
    "duplicate_options_rejected_required"
] is True
assert body["python_child_contract"]["python_flags_exact"] == [
    "-I", "-B", "-S", "-c"
]
assert body["python_child_contract"][
    "fixed_bootstrap_embedded_in_native_required"
] is True
assert body["python_child_contract"][
    "fixed_bootstrap_loads_only_retained_installer_required"
] is True
assert body["python_child_contract"]["closed_python_runtime_required"] is True
assert body["python_child_contract"]["python_runtime_identity_selected"] is False
assert body["python_child_contract"][
    "python_stdlib_import_closure_selected"
] is False
assert body["authority"]["first_entry_target_selected"] is True
for key in (
    "first_entry_native_source_authored",
    "first_entry_candidate_derived",
    "first_entry_candidate_accepted",
    "protected_installer_first_entry_installed",
    "protected_installer_first_entry_verified",
    "protected_install_authorized",
    "protected_source_installed",
    "live_privileged_census_authorized",
    "live_privileged_census_executed",
    "replacement_apply_authorized",
    "runtime_integration",
    "payment_acceptance",
    "public_presale_activation",
    "production_gate_ready",
    "funds_movement",
):
    assert body["authority"][key] is False, key

module.self_test()

without_b = subprocess.run(
    [sys.executable, "-I", str(TARGET), "--self-test"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=10,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert without_b.returncode == 2, without_b
assert (
    "reason=python_isolated_unoptimized_nobytecode_mode_required"
    in without_b.stdout
), without_b.stdout

source = TARGET.read_text(encoding="utf-8")
pre_self_test = source.split("def self_test()", 1)[0]

for forbidden in (
    "subprocess",
    "os.write(",
    "os.pwrite(",
    "os.mkdir(",
    "os.unlink(",
    "os.rename(",
    "os.replace(",
    "os.chmod(",
    "os.chown(",
    "os.fchmod(",
    "os.fchown(",
    "os.link(",
    "os.symlink(",
    "shutil",
    "tarfile",
    "systemctl",
    "sudo ",
):
    assert forbidden not in pre_self_test, forbidden

for required in (
    "root_execution_forbidden_for_mutable_source_plan",
    "static_native_first_instruction_required",
    "elf64_x86_64_et_exec_required",
    "pt_interp_forbidden",
    "pt_dynamic_forbidden",
    "caller_selected_python_source_forbidden",
    "caller_selected_installer_path_forbidden",
    "caller_selected_destination_forbidden",
    "exact_privileged_argv_required",
    "unknown_options_rejected_required",
    "duplicate_options_rejected_required",
    "closed_python_runtime_required",
    "python_runtime_identity_selected",
    "python_stdlib_import_closure_selected",
    "first_entry_target_selected",
    "protected_install_authorized",
    "protected_source_installed",
    "replacement_apply_authorized",
):
    assert required in source, required

print("VOID_BUY_VOID_CUSTODY_RUNTIME_V3_INSTALLER_FIRST_ENTRY_PLAN_V1_PROOF_GREEN")
print("exact_source_blob_asserted=true")
print("installer_lock_exact=true")
print("accepted_installer_identity_bound=true")
print("protected_snapshot_exact_four_files=true")
print("static_native_first_instruction_required=true")
print("closed_python_runtime_required=true")
print("python_runtime_identity_selected=false")
print("python_stdlib_import_closure_selected=false")
print("caller_selected_python_source_forbidden=true")
print("caller_selected_installer_path_forbidden=true")
print("caller_selected_destination_forbidden=true")
print("closed_privileged_argv_required=true")
print("python_no_bytecode_mode_required=true")
print("without_dash_b_bootstrap_hold=true")
print("root_execution_of_mutable_plan_forbidden=true")
print("first_entry_target_selected=true")
print("first_entry_native_source_authored=false")
print("protected_install_authorized=false")
print("protected_source_installed=false")
print("live_privileged_census_authorized=false")
print("replacement_apply_authorized=false")
print("production_plan_explicit_filesystem_write=false")
print("production_plan_filesystem_write_free=false")
print("production_plan_atime_write_possible=true")
print("funds_movement=false")
