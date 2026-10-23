#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import os
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_protected_all_process_census_plan_v1.py"
)
EXPECTED_SOURCE_BLOB = "114b85775b45b06e4ff86bf32b59b96a31dcc995"


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_v3_protected_all_process_census_plan_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_CENSUS_PLAN_V1"
)
assert module.SCHEMA == (
    "void_buy_void_custody_runtime_v3_protected_all_process_census_plan_v1"
)
assert module.PARENT_HEAD == "5bfd56c850513c7b416fe0b2f854ee9b12e764e4"
assert module.PARENT_PROCESS_BLOB == (
    "ded737a228a627a241a84131113db6d3521f635c"
)
assert module.PRESTATE_HEAD == "836f5e704a603f67b77b2406aeec9174f640497e"
assert module.PRESTATE_BLOB == "4d9c6e5809a5cc64454626760f71e60ed99354bc"
assert module.QUIESCENCE_HEAD == "b52752700e44dea447c0fda76c61bcf32228416e"
assert module.QUIESCENCE_BLOB == "90358ef1df3ecfa3daeee39452ffd025e9a8d86e"
assert module.ARCHIVE_LOCK_BLOB == (
    "edb4ea2b833373ab387762e45ba7da4032c860f3"
)
assert module.PROTECTED_SOURCE_ROOT == (
    "/opt/void-buy-allocation-custody-process-reference-v3-reviewed-v1"
)

plan = module.build_plan()
assert plan["status"] == "SOURCE_ONLY_PROTECTED_ALL_PROCESS_CENSUS_PLAN"
assert plan["future_protected_source"]["installation_required_before_root_execution"] is True
assert plan["future_protected_source"]["mutable_checkout_root_execution_forbidden"] is True
assert plan["future_protected_source"]["sudo_python_checkout_forbidden"] is True
assert plan["future_host_scope"]["root_execution_required"] is True
assert plan["future_host_scope"]["host_user_namespace_external_lease_required"] is True
assert plan["future_host_scope"]["host_pid_namespace_external_lease_required"] is True
assert plan["future_host_scope"]["host_mount_namespace_external_lease_required"] is True
assert plan["future_host_scope"]["namespace_lease_provenance_external_review_required"] is True
assert plan["future_all_process_scan"]["all_numeric_pids_required"] is True
assert plan["future_all_process_scan"]["still_live_unreadable_process_holds"] is True
assert plan["future_all_process_scan"]["proc_cmdline_read"] is False
assert plan["future_all_process_scan"]["proc_environ_read"] is False
assert plan["future_all_process_scan"]["proc_fd_target_text_read"] is False
assert plan["future_all_process_scan"]["fd_table_stability_proven"] is False
assert plan["future_all_process_scan"]["mapping_set_stability_proven"] is False
assert plan["future_all_process_scan"]["live_at_use_reverification_required"] is True
assert plan["future_candidate_semantics"]["all_process_reference_absence_proven_by_plan"] is False
assert plan["future_candidate_semantics"]["replacement_apply_authorized"] is False
assert plan["authority"]["host_process_census_performed"] is False
assert plan["authority"]["protected_source_installed"] is False
assert plan["authority"]["filesystem_write"] is False
assert plan["authority"]["service_mutation"] is False
assert plan["authority"]["replacement_apply_authorized"] is False
assert plan["authority"]["payment_acceptance"] is False
assert plan["authority"]["public_presale_activation"] is False
assert plan["authority"]["funds_movement"] is False

original_uid = module.os.getuid
original_euid = module.os.geteuid
try:
    module.os.getuid = lambda: 0
    module.os.geteuid = lambda: 0
    try:
        module.build_plan()
    except module.PlanHold as exc:
        assert "root_execution_forbidden_for_source_plan" in str(exc)
    else:
        raise AssertionError("source plan accepted root execution")
finally:
    module.os.getuid = original_uid
    module.os.geteuid = original_euid

with tempfile.TemporaryDirectory(
    prefix="void-custody-all-process-plan-proof-"
) as tmp:
    fake_root = Path(tmp)
    for relative in (
        module.PARENT_PROCESS_REL,
        module.PRESTATE_REL,
        module.QUIESCENCE_REL,
        module.ARCHIVE_LOCK_REL,
    ):
        path = fake_root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"wrong\n")
    original_root = module.ROOT
    module.ROOT = fake_root
    try:
        try:
            module.verify_inputs()
        except module.PlanHold as exc:
            assert "source_blob_mismatch" in str(exc)
        else:
            raise AssertionError("drifted parent source accepted")
    finally:
        module.ROOT = original_root

module.self_test()

source = TARGET.read_text(encoding="utf-8")
pre_self_test = source.split("def self_test()", 1)[0]

for forbidden in (
    "subprocess",
    "socket.",
    "tempfile",
    "os.write(",
    "os.pwrite(",
    "os.unlink(",
    "os.rename(",
    "os.replace(",
    "os.chmod(",
    "os.chown(",
    "os.fchmod(",
    "os.fchown(",
    "systemctl",
    "sudo ",
    "requests",
    "urllib",
):
    assert forbidden not in pre_self_test, forbidden

assert 'group.add_argument("--plan"' in source
assert 'group.add_argument("--self-test"' in source
assert '"--run"' not in source
assert "root_execution_forbidden_for_source_plan" in source
assert "sudo_python_checkout_forbidden" in source
assert "host_user_namespace_external_lease_required" in source
assert "host_pid_namespace_external_lease_required" in source
assert "host_mount_namespace_external_lease_required" in source
assert "complete_numeric_pid_visibility_required" in source
assert "all_numeric_pids_required" in source
assert "still_live_unreadable_process_holds" in source
assert "all_process_reference_absence_proven_by_plan" in source
assert "replacement_apply_authorized" in source

print("VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_CENSUS_PLAN_V1_PROOF_GREEN")
print("exact_source_blob_asserted=true")
print("exact_parent_process_source_bound=true")
print("exact_current_prestate_source_bound=true")
print("exact_current_quiescence_source_bound=true")
print("exact_archive_lock_bound=true")
print("source_plan_only=true")
print("root_execution_forbidden_for_source_plan=true")
print("root_refusal_tested=true")
print("parent_source_drift_rejected=true")
print("protected_root_owned_source_required=true")
print("mutable_checkout_root_execution_forbidden=true")
print("sudo_python_checkout_forbidden=true")
print("host_user_namespace_external_lease_required=true")
print("host_pid_namespace_external_lease_required=true")
print("host_mount_namespace_external_lease_required=true")
print("complete_numeric_pid_visibility_required=true")
print("all_numeric_pids_required=true")
print("still_live_unreadable_process_holds=true")
print("proc_cmdline_read=false")
print("proc_environ_read=false")
print("proc_fd_target_text_read=false")
print("fd_table_stability_proven=false")
print("mapping_set_stability_proven=false")
print("live_at_use_reverification_required=true")
print("host_process_census_performed=false")
print("protected_source_installed=false")
print("filesystem_write=false")
print("service_mutation=false")
print("replacement_apply_authorized=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
print("test_fixture_filesystem_write=true")
