#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLAN = ROOT / "ops/security/buy-void-allocation-custody-runtime-v3-static-python-runtime-derivation-plan-v1.json"

EXPECTED_PLAN_BLOB = "cb3bc0bfa5dfa2b67b867f196cc220f5e20996bc"
EXPECTED_PLAN_ID = "voidbuycustodystaticpythonplan1_830b9c2a6f16b797f20cb491c9e34c19aaea6ea2e89788d5d8038ff2d996d6ae"

PARENT_SOURCE = ROOT / "ops/precision/void_buy_allocation_custody_runtime_v3_closed_python_runtime_census_v1.py"
PARENT_SOURCE_BLOB = "8914d9e8031377e3bcda4770194024e2f6fed2fd"
FIRST_ENTRY_LOCK = ROOT / "ops/security/buy-void-allocation-custody-runtime-v3-installer-first-entry-lock-v2.json"
FIRST_ENTRY_LOCK_BLOB = "36d6c4a5ff825993371f109ee86a77b601e12d07"
INSTALLER_LOCK = ROOT / "ops/security/buy-void-allocation-custody-runtime-v3-protected-all-process-installer-lock-v2.json"
INSTALLER_LOCK_BLOB = "486a6f6e1e2c594e60d6f9fe3fa32b03175630ae"
INSTALLER_SOURCE = ROOT / "ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v2.py"
INSTALLER_SOURCE_BLOB = "bd8728be0b59bce3db0f559d0ebd01692f9a5844"

MARKER = "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_STATIC_PYTHON_RUNTIME_DERIVATION_PLAN_V1_PROOF"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def canonical(value: object) -> bytes:
    return (
        json.dumps(
            value,
            sort_keys=True,
            ensure_ascii=True,
            separators=(",", ":"),
        )
        + "\n"
    ).encode("utf-8")


def exact_blob(path: Path, expected: str) -> None:
    raw = path.read_bytes()
    assert git_blob(raw) == expected, (path, git_blob(raw), expected)


exact_blob(PLAN, EXPECTED_PLAN_BLOB)
exact_blob(PARENT_SOURCE, PARENT_SOURCE_BLOB)
exact_blob(FIRST_ENTRY_LOCK, FIRST_ENTRY_LOCK_BLOB)
exact_blob(INSTALLER_LOCK, INSTALLER_LOCK_BLOB)
exact_blob(INSTALLER_SOURCE, INSTALLER_SOURCE_BLOB)

plan = json.loads(PLAN.read_text(encoding="utf-8"))
assert type(plan) is dict
assert plan["schema"] == "void_buy_void_custody_runtime_v3_static_python_runtime_derivation_plan_v1"
assert plan["marker"] == "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_STATIC_PYTHON_RUNTIME_DERIVATION_PLAN_V1"
assert plan["version"] == 1
assert plan["repository"] == "6ZoSo9/void-node"
assert plan["plan_id"] == EXPECTED_PLAN_ID
assert plan["plan_id_scope"] == "canonical_json_body_without_plan_id_or_plan_id_scope"

plan_body = {
    key: value
    for key, value in plan.items()
    if key not in ("plan_id", "plan_id_scope")
}
derived = "voidbuycustodystaticpythonplan1_" + hashlib.sha256(
    canonical(plan_body)
).hexdigest()
assert derived == EXPECTED_PLAN_ID, (derived, EXPECTED_PLAN_ID)

parent = plan["parent_closed_runtime"]
assert parent["head"] == "b0582a370a5f39b9f8f441c6c6bd59cfba4d2644"
assert parent["source_git_blob_sha1"] == PARENT_SOURCE_BLOB
assert parent["proof_git_blob_sha1"] == "ef859fcea64d9a9b84279f68674301401224aa55"
assert parent["document_git_blob_sha1"] == "529b5e46983b4d514f9088ca60eda6c122ced9c8"
assert parent["workflow_git_blob_sha1"] == "0f09e1b653fa98cd2b998ae38317e8cf6b4cdf1b"
assert parent["focused_ci_required_before_successor_pr"] is True

first = plan["accepted_first_entry"]
assert first["lock_git_blob_sha1"] == FIRST_ENTRY_LOCK_BLOB
assert first["first_entry_native_source_accepted"] is True
assert first["python_runtime_identity_selected"] is False
assert first["first_entry_candidate_derived"] is False

installer = plan["accepted_installer"]
assert installer["lock_git_blob_sha1"] == INSTALLER_LOCK_BLOB
assert installer["source_git_blob_sha1"] == INSTALLER_SOURCE_BLOB
assert installer["source_bytes"] == 46939
assert installer["source_sha256"] == "75934d38e5b89eed904be7738c82de6cd586ac11afc28e075cc44a4e7fb9d715"
assert installer["candidate_installer_source_accepted"] is True
assert installer["ctypes_free_builtin_voidfs_boundary_accepted"] is True

bridge = plan["reviewed_voidfs_bridge"]
assert bridge == {
    "implementation_merge_commit": "cfc77165cdff35dd02090c1137473dadd385e8f4",
    "source_path": "ops/precision/void_v7_static_rename_noreplace_bridge_v1.c",
    "source_git_blob_sha1": "34e32a5b77e0bd82138aa47ad4f8645fc93c0b9c",
    "proof_path": "scripts/prove_void_v7_static_rename_noreplace_bridge_v1.py",
    "proof_git_blob_sha1": "51dede10966f91d27399363c876da4ef3372f501",
    "document_path": "docs/operators/void-v7-static-rename-noreplace-bridge-v1.md",
    "document_git_blob_sha1": "7795d06f316385ddcf21fa06fc1e7c16403ba81b",
    "module_name": "_voidfs",
    "public_surface": ["rename_noreplace"],
    "direct_syscall_renameat2_required": True,
    "rename_noreplace_flag_required": True,
    "external_landed_provenance_required": True,
}

seal = plan["reviewed_create_only_seal"]
assert seal["plan_merge_commit"] == "b186cb73b26ca50d73fb6f5c2326ead7ea59ed8d"
assert seal["plan_git_blob_sha1"] == "9dde5523dca6ab240626430ce1c2b82f1cfe7f20"
assert seal["document_git_blob_sha1"] == "73534f9316834ac0cd6c912d6b1e39d6857b9ed4"
assert seal["plan_id"] == "voidv7createonlysealplan1_80486c8e43751493d1480ebdf8be63a26195e465e96f3e1d29b1d7b4765773cc"
assert seal["historical_precision_opt_measure_verity_result"] == "ENOTSUP"
assert seal["fresh_precision_capability_recheck_required"] is True
assert seal["v3_create_only_seal_adopted"] is False

runtime = plan["runtime_contract"]
assert runtime["python_major"] == 3
assert runtime["python_minor"] == 12
assert runtime["architecture"] == "x86_64"
assert runtime["elf_class"] == "ELF64"
assert runtime["endianness"] == "little"
assert runtime["elf_type"] == "ET_EXEC"
assert runtime["pt_load_required"] is True
assert runtime["pt_interp_forbidden"] is True
assert runtime["pt_dynamic_forbidden"] is True
assert runtime["runtime_root"] == "/opt/void-buy-void-v7-python-runtime-v1"
assert runtime["python_path"] == "/opt/void-buy-void-v7-python-runtime-v1/bin/python3.12-static"
assert runtime["stdlib_path"] == "/opt/void-buy-void-v7-python-runtime-v1/lib/python312.zip"
assert runtime["sys_path_exact_stdlib_zip_only"] is True
assert runtime["voidfs_builtin_required"] is True
assert runtime["voidfs_origin"] == "built-in"
assert runtime["voidfs_public_surface"] == ["rename_noreplace"]
assert runtime["ctypes_forbidden"] is True
assert runtime["_ctypes_required"] is False
assert runtime["libffi_required"] is False
assert runtime["lib_dynload_forbidden"] is True
assert runtime["extension_dso_forbidden"] is True
assert runtime["external_module_origin_forbidden"] is True

assert plan["installer_direct_imports"] == [
    "argparse",
    "hashlib",
    "importlib.machinery",
    "importlib.util",
    "json",
    "os",
    "pathlib",
    "stat",
    "tempfile",
    "typing",
]

requirements = set(plan["derivation_requirements"])
for required in (
    "select_exact_cpython_3_12_source_identity",
    "select_exact_c_compiler_linker_and_binutils_identities",
    "define_reproducible_fully_static_cpython_build_recipe",
    "compile_reviewed_voidfs_bridge_into_sys_builtin_module_names",
    "forbid_ctypes__ctypes_libffi_dlopen_dlsym_dependency",
    "derive_deterministic_sorted_pure_python_stdlib_zip",
    "bind_complete_direct_and_transitive_installer_import_closure",
    "perform_two_clean_builds_and_require_byte_identical_python_and_stdlib",
    "snapshot_candidate_python_and_stdlib_into_same_uid_resistant_immutable_execution_views",
    "execute_exact_accepted_installer_v2_self_test_under_candidate_runtime",
    "retain_landlock_seccomp_or_equivalent_candidate_escape_denial",
    "derive_candidate_receipt_without_installing_to_opt",
    "keep_persistent_host_seal_as_separate_later_gate",
    "if_fsverity_unavailable_require_separately_accepted_v3_binding_of_create_only_closed_tree_v1",
    "do_not_accept_historical_v7_ctypes_runtime_generator_as_v3_candidate",
):
    assert required in requirements, required

historical = plan["historical_v7_runtime_generator"]
assert historical["source_git_blob_sha1"] == "18299de23193f0ab98dca0a2fe50e55376f3b1b1"
assert historical["architecture_reference_only"] is True
assert historical["candidate_reuse_forbidden"] is True

selection = plan["selection_state"]
assert selection and all(value is False for value in selection.values())

authority = plan["authority"]
assert authority["plan_only"] is True
for key, value in authority.items():
    if key == "plan_only":
        continue
    assert value is False, key

assert plan["next_gate"] == (
    "IMPLEMENT_SOURCE_ONLY_V3_STATIC_PYTHON_RUNTIME_GENERATOR_AND_HOSTED_CANDIDATE_PROOF"
)

plan_text = PLAN.read_text(encoding="utf-8")
for forbidden in (
    '"candidate_build_execution_authorized": true',
    '"candidate_runtime_execution_authorized": true',
    '"root_execution": true',
    '"package_installation": true',
    '"opt_runtime_install": true',
    '"fsverity_enablement": true',
    '"protected_runtime_accepted": true',
    '"protected_install_authorized": true',
    '"replacement_apply_authorized": true',
    '"runtime_integration": true',
    '"payment_acceptance": true',
    '"public_presale_activation": true',
    '"funds_movement": true',
):
    assert forbidden not in plan_text, forbidden

print(MARKER + "_GREEN")
print("plan_id=" + EXPECTED_PLAN_ID)
print("parent_closed_runtime_exact=true")
print("accepted_first_entry_exact=true")
print("accepted_installer_exact=true")
print("external_voidfs_merge_bound=true")
print("external_create_only_seal_merge_bound=true")
print("ctypes_runtime_candidate_reuse_forbidden=true")
print("python312_static_et_exec_required=true")
print("voidfs_builtin_exact_surface_required=true")
print("deterministic_pure_python_stdlib_zip_required=true")
print("two_clean_build_byte_identity_required=true")
print("same_uid_resistant_execution_snapshot_required=true")
print("persistent_host_seal_separate_gate=true")
print("historical_opt_fsverity_enotsup_not_current_capability_claim=true")
print("plan_only=true")
print("candidate_build_execution_authorized=false")
print("candidate_runtime_execution_authorized=false")
print("root_execution=false")
print("package_installation=false")
print("opt_runtime_install=false")
print("fsverity_enablement=false")
print("protected_runtime_accepted=false")
print("protected_install_authorized=false")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
