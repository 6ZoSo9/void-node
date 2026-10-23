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
    "void_buy_allocation_custody_runtime_v3_"
      "protected_all_process_reference_census_v1.py"
)
EXPECTED_SOURCE_BLOB = "0567991abb05c121722d47485ab9e7410b8b8126"


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_v3_protected_all_process_reference_census_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_V1"
)
assert module.PARENT_CURRENT_UID_HEAD == (
    "a42153631b0523fcefca12b9ed40a9a743c2fadd"
)
assert module.PARENT_CURRENT_UID_SOURCE_BLOB == (
    "86c493d7acbe539fe898024474ed3c8815760603"
)
assert module.PRESTATE_SOURCE_BLOB == (
    "feb6508133a1feda9bda793646a5c949f1fdc7f0"
)
assert module.ARCHIVE_LOCK_BLOB == (
    "edb4ea2b833373ab387762e45ba7da4032c860f3"
)
assert module.PROTECTED_ROOT == Path(
    "/opt/void-buy-allocation-custody-procref-v1"
)
assert module.PROTECTED_SOURCE == Path(
    "/opt/void-buy-allocation-custody-procref-v1/"
    "void_buy_allocation_custody_runtime_v3_"
    "protected_all_process_reference_census_v1.py"
)
assert module.TARGET == Path(
    "/opt/void-buy-allocation-custody-runtime-v1"
)
assert module.MAX_TARGET_ENTRIES == 4096
assert module.MAX_PIDS == 32768
assert module.MAX_FDS_PER_PROCESS == 65536
assert module.MAX_SCAN_ATTEMPTS == 3

module.self_test()

clean_rows = [
    {
        "pid": 10,
        "status": "scanned",
        "start_ticks": "100",
        "reference_count": 0,
        "references": {"cwd": 0, "root": 0, "exe": 0, "fd": 0, "maps": 0},
        "incomplete_observations": 0,
    },
    {"pid": 11, "status": "kernel_thread_skipped"},
]
clean = module.classify_attempt([10, 11], [10, 11], clean_rows, True)
assert clean["all_process_target_reference_absent_observed"] is True
assert clean["all_process_reference_absence_proven"] is False
assert clean["fd_table_stability_proven"] is False
assert clean["mapping_set_stability_proven"] is False
assert clean["process_reference_snapshot_race_free"] is False
assert clean["live_at_use_reverification_required"] is True

referenced = {
    **clean_rows[0],
    "reference_count": 1,
    "references": {"cwd": 0, "root": 0, "exe": 0, "fd": 1, "maps": 0},
}
assert module.classify_attempt([10], [10], [referenced], True)[
    "all_process_target_reference_absent_observed"
] is False
assert module.classify_attempt([10], [10, 12], [clean_rows[0]], True)[
    "all_process_target_reference_absent_observed"
] is False
assert module.classify_attempt([10], [10], [clean_rows[0]], False)[
    "all_process_target_reference_absent_observed"
] is False

original_ids = (
    module.os.getuid,
    module.os.geteuid,
    module.os.getgid,
    module.os.getegid,
)
try:
    module.os.getuid = lambda: 1000
    module.os.geteuid = lambda: 1000
    module.os.getgid = lambda: 1000
    module.os.getegid = lambda: 1000
    try:
        module._protected_source_admission()
    except module.CensusHold as exc:
        assert "root_execution_required" in str(exc)
    else:
        raise AssertionError("unprivileged protected-source admission accepted")

    module.os.getuid = lambda: 0
    module.os.geteuid = lambda: 0
    module.os.getgid = lambda: 0
    module.os.getegid = lambda: 0
    try:
        module._protected_source_admission()
    except module.CensusHold as exc:
        assert "protected_source_fixed_path_required" in str(exc)
    else:
        raise AssertionError("checkout path accepted for root census")
finally:
    (
        module.os.getuid,
        module.os.geteuid,
        module.os.getgid,
        module.os.getegid,
    ) = original_ids

with tempfile.TemporaryDirectory(
    prefix="void-custody-protected-allprocref-proof-"
) as tmp:
    root = Path(tmp) / "target"
    nested = root / "nested"
    nested.mkdir(parents=True, mode=0o700)
    (root / "one").write_bytes(b"one")
    snap1 = module.target_snapshot(root)
    snap2 = module.target_snapshot(root)
    assert snap1["metadata_sha256"] == snap2["metadata_sha256"]
    assert snap1["identity_count"] == 3

source = TARGET.read_text(encoding="utf-8")
pre_self_test = source.split("def self_test()", 1)[0]

for forbidden in (
    '"/cmdline"',
    '"/environ"',
    "subprocess",
    "os.write(",
    "os.pwrite(",
    "os.unlink(",
    "os.rename(",
    "os.replace(",
    "os.chmod(",
    "os.chown(",
    "os.fchmod(",
    "os.fchown(",
    "socket.",
):
    assert forbidden not in pre_self_test, forbidden

for required in (
    "root_execution_required",
    "protected_source_fixed_path_required",
    "protected_source_ancestor_custody_invalid",
    "protected_source_leaf_custody_invalid",
    "root_owned_nonwritable_ancestry_verified",
    "PF_KTHREAD",
    "kernel_thread_skipped",
    "target_pre_post_identity_recheck",
    "all_process_target_reference_absent_observed",
    "all_process_reference_absence_proven",
    "fd_table_stability_proven",
    "mapping_set_stability_proven",
    "process_reference_snapshot_race_free",
    "live_at_use_reverification_required",
    "python_runtime_closure_verified",
    "replacement_apply_authorized",
):
    assert required in source, required

census_block = pre_self_test.split("def census()", 1)[1]
assert census_block.index("_protected_source_admission()") < census_block.index(
    "all_process_census()"
)

print(
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
    "PROTECTED_ALL_PROCESS_REFERENCE_CENSUS_V1_PROOF_GREEN"
)
print("exact_source_blob_asserted=true")
print("parent_current_uid_generation_bound=true")
print("protected_source_fixed_path_required=true")
print("root_owned_nonwritable_ancestry_required=true")
print("root_execution_required=true")
print("mutable_checkout_privileged_execution_rejected=true")
print("target_identity_metadata_only=true")
print("all_numeric_pids_scope=true")
print("kernel_thread_explicit_skip=true")
print("pid_generation_recheck=true")
print("target_pre_post_identity_recheck=true")
print("proc_cmdline_read=false")
print("proc_environ_read=false")
print("proc_fd_target_text_read=false")
print("proc_maps_path_text_retained=false")
print("all_process_reference_absence_proven=false")
print("fd_table_stability_proven=false")
print("mapping_set_stability_proven=false")
print("process_reference_snapshot_race_free=false")
print("live_at_use_reverification_required=true")
print("protected_source_installed_in_ci=false")
print("host_census_not_executed_in_ci=true")
print("production_filesystem_write=false")
print("test_fixture_filesystem_write=true")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
