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
EXPECTED_SOURCE_BLOB = "2f22f0cf3e5c5ed56c2a31f0862f087cdbbe41a9"


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
    "acace7d9051126b07f71ecf1a50fdeaf64a0c24f"
)
assert module.PARENT_CURRENT_UID_SOURCE_BLOB == (
    "ded737a228a627a241a84131113db6d3521f635c"
)
assert module.PRESTATE_HEAD == (
    "836f5e704a603f67b77b2406aeec9174f640497e"
)
assert module.PRESTATE_SOURCE_BLOB == (
    "4d9c6e5809a5cc64454626760f71e60ed99354bc"
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
assert module.MAX_TARGET_ENTRIES == 32768
assert module.MAX_PIDS == 32768
assert module.MAX_FDS_PER_PROCESS == 65536
assert module.MAX_TASKS_PER_PROCESS == 65536
assert module.MAX_TOTAL_TASKS == 262144
assert module.MAX_SCAN_ATTEMPTS == 3
assert module.MAX_MOUNTINFO_BYTES == 4 * 1024 * 1024

module.self_test()

assert module.parse_dev_ino_lease(
    "12:34", "test_host_namespace_lease_invalid"
) == (12, 34)
fake_self = type("FakeStat", (), {"st_dev": 12, "st_ino": 34})()
fake_init = type("FakeStat", (), {"st_dev": 12, "st_ino": 34})()
assert module.verify_pid_namespace_lease_stats(
    fake_self, fake_init, (12, 34)
) == (12, 34)
assert module.verify_mount_namespace_lease_stats(
    fake_self, fake_init, (12, 34)
) == (12, 34)
assert module.verify_user_namespace_lease_stats(
    fake_self, fake_init, (12, 34)
) == (12, 34)
for fn, wrong, marker in (
    (
        module.verify_pid_namespace_lease_stats,
        type("FakeStat", (), {"st_dev": 12, "st_ino": 35})(),
        "not_in_pid1_namespace",
    ),
    (
        module.verify_mount_namespace_lease_stats,
        type("FakeStat", (), {"st_dev": 12, "st_ino": 35})(),
        "not_in_pid1_mount_namespace",
    ),
    (
        module.verify_user_namespace_lease_stats,
        type("FakeStat", (), {"st_dev": 12, "st_ino": 35})(),
        "not_in_pid1_user_namespace",
    ),
):
    try:
        fn(fake_self, wrong, (12, 34))
    except module.CensusHold as exc:
        assert marker in str(exc)
    else:
        raise AssertionError("private namespace accepted: " + marker)

try:
    module.verify_user_namespace_lease_stats(
        fake_self, fake_init, (12, 35)
    )
except module.CensusHold as exc:
    assert "host_user_namespace_lease_mismatch" in str(exc)
else:
    raise AssertionError("host user namespace lease mismatch accepted")

assert module.verify_host_filesystem_root_stats(
    fake_self, fake_init
) == (12, 34)
try:
    module.verify_host_filesystem_root_stats(
        fake_self,
        type("FakeStat", (), {"st_dev": 12, "st_ino": 35})(),
    )
except module.CensusHold as exc:
    assert "not_in_pid1_filesystem_root" in str(exc)
else:
    raise AssertionError("private/chroot filesystem root accepted")

visible_mountinfo = (
    b"42 1 0:1 / /proc rw,nosuid,nodev,noexec,relatime"
    b" - proc proc rw,hidepid=0\n"
)
hidden_mountinfo = (
    b"42 1 0:1 / /proc rw,nosuid,nodev,noexec,relatime"
    b" - proc proc rw,hidepid=2\n"
)
assert module.verify_complete_proc_visibility(
    visible_mountinfo, 42
)["hidepid_restricted"] is False
try:
    module.verify_complete_proc_visibility(hidden_mountinfo, 42)
except module.CensusHold as exc:
    assert "proc_visibility_restricted" in str(exc)
else:
    raise AssertionError("restricted procfs accepted")

clean_rows = [
    {
        "pid": 10,
        "status": "scanned",
        "start_ticks": "100",
        "task_count": 1,
        "live_task_count": 1,
        "task_inventory_stable": True,
        "task_mount_namespace_inventory_stable": True,
        "task_generation_digest": "0" * 64,
        "reference_count": 0,
        "references": {"cwd": 0, "root": 0, "exe": 0, "fd": 0, "maps": 0},
        "incomplete_observations": 0,
    },
    {"pid": 11, "status": "kernel_thread_skipped"},
]
clean = module.classify_attempt([10, 11], [10, 11], clean_rows, True)
assert clean["host_scoped_target_reference_absent_candidate"] is True
assert clean["all_process_target_reference_absent_observed"] is False
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

# Synthetic procfs fixture: only a non-leader TID retains the target FD.
# The protected all-process scan must detect it even though the TGID leader
# has a clean fd/fs view.
with tempfile.TemporaryDirectory(
    prefix="void-custody-protected-hostroot-proof-"
) as tmp:
    base = Path(tmp)
    retained_root = base / "retained-host-root"
    host_target = retained_root / "opt" / module.TARGET.name
    host_target.mkdir(parents=True, mode=0o700)
    (host_target / "host-only").write_bytes(b"host")
    root_fd = os.open(retained_root, module._directory_flags())
    try:
        snap = module.target_snapshot(
            module.TARGET,
            host_root_fd=root_fd,
        )
        host_st = host_target.stat()
        assert snap["root_dev"] == host_st.st_dev
        assert snap["root_ino"] == host_st.st_ino
        assert snap["entry_count"] == 1
    finally:
        os.close(root_fd)

with tempfile.TemporaryDirectory(
    prefix="void-custody-protected-threadref-proof-"
) as tmp:
    base = Path(tmp)
    target = base / "target"
    target.mkdir(mode=0o700)
    target_file = target / "held"
    target_file.write_bytes(b"held")
    target_snap = module.target_snapshot(target)

    proc = base / "proc"
    pid_dir = proc / "100"
    task_root = pid_dir / "task"
    task_100 = task_root / "100"
    task_101 = task_root / "101"
    for task in (task_100, task_101):
        (task / "fd").mkdir(parents=True, mode=0o700)

    other_dir = base / "elsewhere"
    other_dir.mkdir(mode=0o700)
    other_file = other_dir / "exe"
    other_file.write_bytes(b"x")

    host_mount_ns = base / "host-mount-namespace"
    private_mount_ns = base / "private-mount-namespace"
    host_mount_ns.write_bytes(b"host")
    private_mount_ns.write_bytes(b"private")
    expected_host_mount_namespace = (
        host_mount_ns.stat().st_dev,
        host_mount_ns.stat().st_ino,
    )

    def stat_line(pid: int, start_ticks: int, state: str = "S") -> str:
        fields = [state] + ["0"] * 19
        fields[6] = "0"
        fields[19] = str(start_ticks)
        return f"{pid} (fixture) " + " ".join(fields) + "\n"

    (pid_dir / "stat").write_text(stat_line(100, 1000), encoding="ascii")
    (task_100 / "stat").write_text(stat_line(100, 1000), encoding="ascii")
    (task_101 / "stat").write_text(stat_line(101, 1001), encoding="ascii")
    (pid_dir / "maps").write_text("", encoding="utf-8")
    (pid_dir / "exe").symlink_to(other_file)
    for task in (task_100, task_101):
        (task / "cwd").symlink_to(other_dir)
        (task / "root").symlink_to(other_dir)
        (task / "ns").mkdir()
        (task / "ns" / "mnt").symlink_to(host_mount_ns)
    (task_101 / "fd" / "3").symlink_to(target_file)

    original_proc = module.PROC
    module.PROC = proc
    try:
        row = module.scan_process(
            100,
            target_snap["identities"],
            expected_host_mount_namespace,
        )
        assert row["status"] == "scanned", row
        assert row["task_count"] == 2
        assert row["task_inventory_stable"] is True
        assert row["task_mount_namespace_inventory_stable"] is True
        assert row["reference_count"] == 1, row
        assert row["references"]["fd"] == 1, row
        assert row["references"]["cwd"] == 0
        assert row["references"]["root"] == 0

        # A live TID in a private mount namespace cannot contribute to a clean
        # host-scoped candidate even if its fd/cwd/root view is otherwise quiet.
        task_101_mnt = task_101 / "ns" / "mnt"
        task_101_mnt.unlink()
        task_101_mnt.symlink_to(private_mount_ns)
        private_ns_row = module.scan_process(
            100,
            target_snap["identities"],
            expected_host_mount_namespace,
        )
        assert private_ns_row["status"] == "task_mount_namespace_diverged"
        assert private_ns_row["divergent_tid"] == 101
        assert module.classify_attempt(
            [100], [100], [private_ns_row], True
        )["host_scoped_target_reference_absent_candidate"] is False
        task_101_mnt.unlink()
        task_101_mnt.symlink_to(host_mount_ns)

        # Also exercise a namespace switch after the first mount-namespace
        # inventory but before the terminal inventory.
        original_scan_task_fds = module._scan_task_fds
        switched = [False]

        def scan_task_fds_then_switch(*args, **kwargs):
            result = original_scan_task_fds(*args, **kwargs)
            tid = args[1] if len(args) > 1 else kwargs.get("tid")
            if tid == 101 and not switched[0]:
                switched[0] = True
                task_101_mnt.unlink()
                task_101_mnt.symlink_to(private_mount_ns)
            return result

        module._scan_task_fds = scan_task_fds_then_switch
        try:
            churn_row = module.scan_process(
                100,
                target_snap["identities"],
                expected_host_mount_namespace,
            )
        finally:
            module._scan_task_fds = original_scan_task_fds
            if task_101_mnt.exists() or task_101_mnt.is_symlink():
                task_101_mnt.unlink()
            task_101_mnt.symlink_to(host_mount_ns)
        assert switched[0]
        assert churn_row["status"] == "task_mount_namespace_diverged", churn_row
        assert churn_row["divergent_tid"] == 101

        first_inventory = module._task_inventory(100)
        assert first_inventory is not None and set(first_inventory) == {100, 101}
        (task_101 / "stat").write_text(stat_line(101, 2001), encoding="ascii")
        second_inventory = module._task_inventory(100)
        assert second_inventory is not None
        assert second_inventory != first_inventory

        # A zombie TGID leader is not dead while a worker thread survives.
        # Keep the worker's target FD and make only the leader/task leader Z.
        (pid_dir / "stat").write_text(
            stat_line(100, 1000, state="Z"), encoding="ascii"
        )
        (task_100 / "stat").write_text(
            stat_line(100, 1000, state="Z"), encoding="ascii"
        )
        (task_101 / "stat").write_text(
            stat_line(101, 1001, state="S"), encoding="ascii"
        )
        zombie_row = module.scan_process(
            100,
            target_snap["identities"],
            expected_host_mount_namespace,
        )
        assert zombie_row["status"] == "zombie_leader_with_live_tasks", zombie_row
        assert zombie_row["live_task_count"] == 1
        zombie_classification = module.classify_attempt(
            [100], [100], [zombie_row], True
        )
        assert (
            zombie_classification[
                "host_scoped_target_reference_absent_candidate"
            ]
            is False
        )
    finally:
        module.PROC = original_proc

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
    "regular_file_mount_id_checked",
    "host_pid_namespace_external_lease_required",
    "host_pid_namespace_lease_verified",
    "host_mount_namespace_external_lease_required",
    "host_mount_namespace_lease_verified",
    "host_user_namespace_external_lease_required",
    "host_user_namespace_lease_verified",
    "verify_user_namespace_lease_stats",
    "verify_host_filesystem_root_stats",
    "open_retained_host_root",
    "revalidate_retained_host_root",
    "_open_bound_directory_from_root",
    "host_filesystem_root_matches_pid1",
    "target_resolved_via_retained_host_root",
    "retained_host_root_used",
    "complete_proc_visibility_verified",
    "retained_procfs_view_used",
    "retained_procfs_view_revalidated_after_census",
    "target_resolved_in_host_mount_namespace",
    "host_namespace_lease_provenance_authenticated_by_census",
    "separately_reviewed_host_namespace_lease_required",
    "def _all_pids(proc_fd:",
    "def _task_inventory(",
    "def scan_process(",
    "task_inventory_generation_stability_required",
    "zombie_leader_with_live_tasks",
    "per_thread_files_fs_reference_scan_required",
    "per_thread_host_mount_namespace_required",
    "task_mount_namespace_generation_stability_required",
    "private_task_mount_namespace_rejected",
    "def _task_mount_namespace(",
    "def _task_mount_namespace_inventory(",
    "MAX_TASKS_PER_PROCESS",
    "MAX_TOTAL_TASKS",
    "host_scoped_target_reference_absent_candidate",
    "all_process_target_reference_absent_observed",
    "all_process_reference_absence_proven",
    "fd_table_stability_proven",
    "mapping_set_stability_proven",
    "mount_namespace_reference_scan_performed",
    "mount_namespace_reference_absence_proven",
    "process_reference_snapshot_race_free",
    "live_at_use_reverification_required",
    "python_runtime_closure_verified",
    "replacement_apply_authorized",
):
    assert required in source, required

census_block = pre_self_test.split("def census(", 1)[1]
protected_index = census_block.index("_protected_source_admission()")
python_index = census_block.index("_python_runtime_observation()")
process_index = census_block.index("all_process_census(")
assert protected_index < python_index < process_index
assert "expected_host_pid_namespace_dev_ino" in census_block
assert "expected_host_mount_namespace_dev_ino" in census_block
assert "expected_host_user_namespace_dev_ino" in census_block

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
print("protected_admission_precedes_privileged_scan=true")
print("target_identity_metadata_only=true")
print("all_numeric_pids_scope=true")
print("kernel_thread_explicit_skip=true")
print("pid_generation_recheck=true")
print("host_pid_namespace_external_lease_required=true")
print("private_pid_namespace_rejected=true")
print("host_pid_namespace_lease_mismatch_rejected=true")
print("host_mount_namespace_external_lease_required=true")
print("private_mount_namespace_rejected=true")
print("host_mount_namespace_lease_mismatch_rejected=true")
print("host_user_namespace_external_lease_required=true")
print("private_user_namespace_rejected=true")
print("host_user_namespace_lease_mismatch_rejected=true")
print("host_filesystem_root_matches_pid1=true")
print("retained_host_root_target_resolution_tested=true")
print("target_resolved_via_retained_host_root=true")
print("retained_host_root_used=true")
print("retained_host_root_revalidated_after_census=true")
print("chroot_filesystem_root_mismatch_rejected=true")
print("complete_proc_visibility_required=true")
print("hidepid_restricted_proc_holds=true")
print("retained_procfs_view_required=true")
print("retained_procfs_view_descriptor_relative=true")
print("retained_procfs_view_revalidated_after_census=true")
print("target_resolved_in_host_mount_namespace=true")
print("host_namespace_lease_provenance_authenticated_by_census=false")
print("separately_reviewed_host_namespace_lease_required=true")
print("host_scoped_target_reference_absent_candidate_only=true")
print("all_process_target_reference_absent_observed=false")
print("task_inventory_generation_stability_required=true")
print("per_thread_files_fs_reference_scan_required=true")
print("per_thread_host_mount_namespace_required=true")
print("task_mount_namespace_generation_stability_required=true")
print("private_task_mount_namespace_rejected=true")
print("bounded_task_inventory_required=true")
print("nonleader_thread_fd_reference_detected=true")
print("private_task_mount_namespace_adversary_rejected=true")
print("task_mount_namespace_churn_detected=true")
print("zombie_leader_live_worker_rejected=true")
print("task_generation_churn_detected=true")
print("regular_file_mount_id_checked=true")
print("target_pre_post_identity_recheck=true")
print("proc_cmdline_read=false")
print("proc_environ_read=false")
print("proc_fd_target_text_read=false")
print("proc_maps_path_text_retained=false")
print("all_process_reference_absence_proven=false")
print("fd_table_stability_proven=false")
print("mapping_set_stability_proven=false")
print("mount_namespace_reference_scan_performed=false")
print("mount_namespace_reference_absence_proven=false")
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
