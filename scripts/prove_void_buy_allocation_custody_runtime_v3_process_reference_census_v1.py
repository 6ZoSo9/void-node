#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_process_reference_census_v1.py"
)
EXPECTED_SOURCE_BLOB = "4de1cb35a43045a0d9568b3bf4c10904c3653d34"


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_v3_process_reference_census_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROCESS_REFERENCE_CENSUS_V1"
)
assert module.SCHEMA == (
    "void_buy_void_custody_runtime_v3_process_reference_census_v1"
)
assert module.PRESTATE_SOURCE_BLOB == (
    "e32ebd94ad09cd80e03489079e74657aab159d7a"
)
assert module.ARCHIVE_LOCK_BLOB == (
    "edb4ea2b833373ab387762e45ba7da4032c860f3"
)
assert module.ARCHIVE_LOCK_SHA256 == (
    "ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7"
)
assert module.TARGET == Path("/opt/void-buy-allocation-custody-runtime-v1")
assert module.MAX_TARGET_ENTRIES == 32768
assert module.MAX_PIDS == 32768
assert module.MAX_STATUS_BYTES == 64 * 1024
assert module.MAX_FDS_PER_PROCESS == 65536
assert module.MAX_THREADS_PER_PROCESS == 65536
assert module.MAX_THREAD_FD_OBSERVATIONS_PER_PROCESS == 262144
assert module.MAX_SCAN_ATTEMPTS == 3

lock = module.verify_source_inputs()
assert lock["archive_candidate_accepted"] is True
assert lock["existing_target_replaced"] is False
assert lock["runtime_integration"] is False
assert lock["payment_acceptance"] is False
assert lock["public_presale_activation"] is False
assert lock["funds_movement"] is False

assert module.parse_proc_uid_slots(
    b"Name:\tfixture\nUid:\t1000\t1001\t1002\t1003\n"
) == (1000, 1001, 1002, 1003)

assert module.parse_dev_ino_lease("12:34") == (12, 34)
for bad in ("", "0:34", "12:0", "12", "12:34:56", "x:y"):
    try:
        module.parse_dev_ino_lease(bad)
    except module.CensusHold as exc:
        assert "host_pid_namespace_lease_invalid" in str(exc)
    else:
        raise AssertionError("invalid host PID namespace lease accepted: " + bad)
    try:
        module.parse_dev_ino_lease(
            bad,
            "host_mount_namespace_lease_invalid",
        )
    except module.CensusHold as exc:
        assert "host_mount_namespace_lease_invalid" in str(exc)
    else:
        raise AssertionError("invalid host mount namespace lease accepted: " + bad)

fake_self = type("FakeStat", (), {"st_dev": 12, "st_ino": 34})()
assert module.verify_pid_namespace_lease_stats(
    fake_self, (12, 34)
) == (12, 34)
try:
    module.verify_pid_namespace_lease_stats(
        type("FakeStat", (), {"st_dev": 12, "st_ino": 35})(),
        (12, 34),
    )
except module.CensusHold as exc:
    assert "host_pid_namespace_lease_mismatch" in str(exc)
else:
    raise AssertionError("private PID namespace lease mismatch accepted")

assert module.verify_mount_namespace_lease_stats(
    fake_self, (12, 34)
) == (12, 34)
try:
    module.verify_mount_namespace_lease_stats(
        type("FakeStat", (), {"st_dev": 12, "st_ino": 35})(),
        (12, 34),
    )
except module.CensusHold as exc:
    assert "host_mount_namespace_lease_mismatch" in str(exc)
else:
    raise AssertionError("private mount namespace lease mismatch accepted")

live_pid_ns = os.stat("/proc/self/ns/pid")
assert module.verify_pid_namespace_lease_stats(
    live_pid_ns,
    (int(live_pid_ns.st_dev), int(live_pid_ns.st_ino)),
) == (int(live_pid_ns.st_dev), int(live_pid_ns.st_ino))
live_mount_ns = os.stat("/proc/self/ns/mnt")
assert module.verify_mount_namespace_lease_stats(
    live_mount_ns,
    (int(live_mount_ns.st_dev), int(live_mount_ns.st_ino)),
) == (int(live_mount_ns.st_dev), int(live_mount_ns.st_ino))

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
    raise AssertionError("restricted procfs visibility accepted")

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
assert "production_census_read_only=true" in without_b.stdout
assert "production_census_explicit_filesystem_write=false" in without_b.stdout
assert "production_census_filesystem_write_free=false" in without_b.stdout
assert "production_census_atime_write_possible=true" in without_b.stdout

missing_lease = subprocess.run(
    [sys.executable, "-I", "-B", str(TARGET), "--census"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=10,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert missing_lease.returncode == 2, missing_lease
assert (
    "reason=custody_runtime_v3_process_reference_"
    "expected_host_pid_namespace_lease_required"
    in missing_lease.stdout
), missing_lease.stdout
assert "host_pid_namespace_external_lease_required=true" in missing_lease.stdout
assert "host_pid_namespace_lease_verified=false" in missing_lease.stdout
assert "retained_procfs_view_used=false" in missing_lease.stdout

missing_mount_lease = subprocess.run(
    [
        sys.executable,
        "-I",
        "-B",
        str(TARGET),
        "--census",
        "--expected-host-pid-namespace-dev-ino",
        "12:34",
    ],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=10,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert missing_mount_lease.returncode == 2, missing_mount_lease
assert (
    "reason=custody_runtime_v3_process_reference_"
    "expected_host_mount_namespace_lease_required"
    in missing_mount_lease.stdout
), missing_mount_lease.stdout
assert "host_mount_namespace_external_lease_required=true" in missing_mount_lease.stdout
assert "host_mount_namespace_lease_verified=false" in missing_mount_lease.stdout
assert "target_resolved_in_host_mount_namespace=false" in missing_mount_lease.stdout

clean_row = {
    "pid": 101,
    "status": "scanned",
    "start_ticks": "10",
    "reference_count": 0,
    "references": {"cwd": 0, "root": 0, "exe": 0, "fd": 0, "maps": 0},
    "incomplete_observations": 0,
}
assert module.classify_attempt(
    [101], [101], 0, [clean_row], True
)["current_uid_target_reference_absent_candidate"] is True
assert module.classify_attempt(
    [101], [101, 102], 0, [clean_row], True
)["current_uid_target_reference_absent_candidate"] is False

with tempfile.TemporaryDirectory(
    prefix="void-custody-procref-proof-"
) as tmp:
    base = Path(tmp)
    target = base / "target"
    nested = target / "nested"
    nested.mkdir(parents=True, mode=0o700)
    target_file = target / "one"
    target_file.write_bytes(b"one")
    outside = base / "outside"
    outside.write_bytes(b"outside")

    target_info = module.target_identity_set(target)
    identities = target_info["identities"]
    target_st = target_file.stat()
    assert (target_st.st_dev, target_st.st_ino) in identities

    fake_proc = base / "proc"
    pid_root = fake_proc / "101"
    pid_root.mkdir(parents=True, mode=0o700)
    task_root = pid_root / "task"
    leader_task = task_root / "101"
    worker_task = task_root / "102"
    leader_fd_root = leader_task / "fd"
    worker_fd_root = worker_task / "fd"
    leader_fd_root.mkdir(parents=True, mode=0o700)
    worker_fd_root.mkdir(parents=True, mode=0o700)

    def write_stat(path, pid_value, start_ticks):
        fields = ["S"] + ["0"] * 18 + [start_ticks] + ["0"] * 5
        path.write_text(
            str(pid_value) + " (fixture process) " + " ".join(fields) + "\n",
            encoding="ascii",
        )

    write_stat(pid_root / "stat", 101, "123")
    write_stat(leader_task / "stat", 101, "123")
    write_stat(worker_task / "stat", 102, "124")

    uid = os.geteuid()
    (pid_root / "status").write_text(
        "Name:\tfixture-process\n"
        + "Uid:\t"
        + "\t".join([str(uid)] * 4)
        + "\n",
        encoding="utf-8",
    )

    major = os.major(target_st.st_dev)
    minor = os.minor(target_st.st_dev)
    (pid_root / "maps").write_text(
        "00400000-00401000 r--p 00000000 "
        + f"{major:02x}:{minor:02x} {target_st.st_ino} /ignored\n",
        encoding="utf-8",
    )

    (leader_task / "cwd").symlink_to(nested)
    (leader_task / "root").symlink_to("/")
    (worker_task / "cwd").symlink_to(base)
    (worker_task / "root").symlink_to("/")
    (worker_fd_root / "7").symlink_to(target_file)
    (pid_root / "exe").symlink_to(outside)

    original_proc = module.PROC
    module.PROC = fake_proc
    try:
        row = module.scan_process(101, os.geteuid(), identities)
        assert row["status"] == "scanned"
        assert row["reference_count"] == 3
        assert row["references"] == {
            "cwd": 1,
            "root": 0,
            "exe": 0,
            "fd": 1,
            "maps": 1,
        }
        assert row["incomplete_observations"] == 0
        assert row["thread_count"] == 2
        assert row["thread_fd_observation_count"] == 1
        assert row["thread_inventory_stable"] is True

        pids, vanished = module._same_uid_pids(os.geteuid())
        assert pids == [101]
        assert vanished == 0

        classified = module.classify_attempt(pids, pids, 0, [row], True)
        assert classified["current_uid_target_reference_absent_candidate"] is False
        assert classified["referenced_process_count"] == 1
        assert classified["reference_count_by_kind"]["cwd"] == 1
        assert classified["reference_count_by_kind"]["fd"] == 1
        assert classified["reference_count_by_kind"]["maps"] == 1

        (worker_fd_root / "7").unlink()
        (leader_task / "cwd").unlink()
        (leader_task / "cwd").symlink_to(base)
        (pid_root / "maps").write_text(
            "00400000-00401000 r--p 00000000 00:00 0 [anon]\n",
            encoding="utf-8",
        )
        clean_actual = module.scan_process(101, os.geteuid(), identities)
        assert clean_actual["status"] == "scanned"
        assert clean_actual["reference_count"] == 0
        assert clean_actual["incomplete_observations"] == 0
        assert clean_actual["thread_count"] == 2
        assert clean_actual["thread_inventory_stable"] is True
    finally:
        module.PROC = original_proc

    parent_fd, _ = module._open_bound_directory(target)
    try:
        before_file = os.stat("one", dir_fd=parent_fd, follow_symlinks=False)
        wrong_mount_id = module._fd_mount_id(parent_fd) + 1
        try:
            module._observe_target_regular_at(
                parent_fd,
                "one",
                before_file,
                wrong_mount_id,
            )
        except module.CensusHold as exc:
            assert "target_cross_mount_file_forbidden" in str(exc)
        else:
            raise AssertionError("file mount-id mismatch was accepted")
    finally:
        os.close(parent_fd)

    before_snapshot = module.target_identity_set(target)
    replacement = base / "replacement-file"
    replacement.write_bytes(b"replacement")
    os.replace(replacement, target_file)
    after_snapshot = module.target_identity_set(target)
    assert before_snapshot["snapshot_id"] != after_snapshot["snapshot_id"]
    target_changed = module.classify_attempt(
        [101],
        [101],
        0,
        [clean_row],
        False,
    )
    assert target_changed["target_snapshot_stable"] is False
    assert (
        target_changed["current_uid_target_reference_absent_candidate"]
        is False
    )

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
    "sudo ",
):
    assert forbidden not in pre_self_test, forbidden

for required in (
    "root_execution_forbidden_for_user_owned_diagnostic",
    "dont_write_bytecode",
    "follow_symlinks=True",
    "os.makedev",
    "MAX_MAPS_BYTES",
    "MAX_FDS_PER_PROCESS",
    "MAX_THREADS_PER_PROCESS",
    "MAX_THREAD_FD_OBSERVATIONS_PER_PROCESS",
    "_task_ids(",
    "_task_generations(",
    "thread_inventory_stable",
    "current_uid_target_reference_absent_candidate",
    "target_snapshot_stable",
    "target_rescan_each_attempt",
    "target_snapshot_stable_required",
    "_observe_target_regular_at",
    "target_cross_mount_file_forbidden",
    "snapshot_matches_selected_attempt",
    "all_process_reference_absence_proven",
    "privileged_all_process_scan",
    "custody_principal_process_scan_performed",
    "fd_table_stability_proven",
    "mapping_set_stability_proven",
    "live_at_use_reverification_required",
    "proc_cmdline_read",
    "proc_environ_read",
    "proc_fd_target_text_read",
    "proc_maps_path_text_retained",
    "production_census_read_only",
    "production_census_explicit_filesystem_write",
    "production_census_filesystem_write_free",
    "production_census_atime_write_possible",
    "replacement_apply_authorized",
    "parse_dev_ino_lease",
    "verify_pid_namespace_lease_stats",
    "verify_mount_namespace_lease_stats",
    "verify_complete_proc_visibility",
    "open_pinned_proc_view",
    "revalidate_pinned_proc_view",
    "_read_bounded_at",
    "host_pid_namespace_external_lease_required",
    "pid1_namespace_direct_read",
    "host_mount_namespace_external_lease_required",
    "pid1_mount_namespace_direct_read",
    "host_namespace_lease_provenance_authenticated_by_census",
    "host_mount_namespace_lease_verified",
    "host_mount_namespace_lease_revalidated_after_census",
    "target_resolved_in_host_mount_namespace",
    "retained_procfs_view_used",
    "retained_procfs_view_revalidated_after_census",
    "parse_proc_uid_slots",
    "_proc_uid_slots",
    "proc_status_effective_uid_classification",
    "process_uid_slots_stable_during_reference_scan",
):
    assert required in source, required

target_scan_source = pre_self_test.split("def _scan_target_dir(", 1)[1].split(
    "def target_identity_set(", 1
)[0]
assert "with os.scandir(fd) as iterator:" in target_scan_source
assert "names: list[str]" not in target_scan_source
assert "names.sort()" not in target_scan_source
assert target_scan_source.index('totals["entries"] += 1') < target_scan_source.index(
    "_scan_target_dir("
)

proc_scan_source = pre_self_test.split("def _same_uid_pids(", 1)[1].split(
    "def classify_attempt(", 1
)[0]
assert "os.scandir(PROC if proc_fd is None else proc_fd)" in proc_scan_source
assert "dir_fd=proc_fd" in proc_scan_source
assert "_read_bounded_at(" in proc_scan_source
assert "_proc_uid_slots(" in proc_scan_source
assert "st.st_uid == uid" not in proc_scan_source
assert "uid_slots_after != uid_slots_before" in proc_scan_source
assert "_pinned_proc_root(" not in pre_self_test
assert '"1/ns/pid"' not in pre_self_test
assert '"1/ns/mnt"' not in pre_self_test

print("VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROCESS_REFERENCE_CENSUS_V1_PROOF_GREEN")
print("exact_source_blob_asserted=true")
print("prestate_source_exact=true")
print("archive_lock_exact=true")
print("target_identity_metadata_only=true")
print("current_uid_process_scope=true")
print("proc_status_effective_uid_classification=true")
print("process_uid_slots_stable_during_reference_scan=true")
print("host_pid_namespace_external_lease_required=true")
print("private_pid_namespace_rejected=true")
print("host_pid_namespace_lease_mismatch_rejected=true")
print("pid1_namespace_direct_read=false")
print("host_mount_namespace_external_lease_required=true")
print("private_mount_namespace_rejected=true")
print("pid1_mount_namespace_direct_read=false")
print("host_namespace_lease_provenance_authenticated_by_census=false")
print("host_mount_namespace_lease_mismatch_rejected=true")
print("target_resolved_in_host_mount_namespace=true")
print("complete_proc_visibility_required=true")
print("hidepid_restricted_proc_holds=true")
print("descriptor_relative_bounded_reader_tested=true")
print("retained_procfs_view_required=true")
print("retained_procfs_view_descriptor_relative=true")
print("retained_procfs_view_revalidated_after_census=true")
print("missing_host_pid_namespace_lease_holds=true")
print("missing_host_mount_namespace_lease_holds=true")
print("target_streaming_entry_budget=true")
print("cwd_inode_reference_tested=true")
print("fd_inode_reference_tested=true")
print("mapped_inode_reference_tested=true")
print("clean_current_uid_fixture_tested=true")
print("pid_set_change_fail_closed=true")
print("target_snapshot_change_fail_closed=true")
print("target_replacement_race_regression=true")
print("target_rescan_each_attempt=true")
print("target_snapshot_stable_required=true")
print("regular_file_mount_id_checked=true")
print("receipt_target_bound_to_selected_attempt=true")
print("legacy_tree_entry_limit=32768")
print("python_no_bytecode_mode_required=true")
print("without_dash_b_bootstrap_hold=true")
print("proc_cmdline_read=false")
print("proc_environ_read=false")
print("proc_fd_target_text_read=false")
print("proc_maps_path_text_retained=false")
print("root_execution_forbidden=true")
print("all_process_reference_absence_proven=false")
print("privileged_all_process_scan=false")
print("fd_table_stability_proven=false")
print("mapping_set_stability_proven=false")
print("live_at_use_reverification_required=true")
print("nonleader_thread_fd_reference_tested=true")
print("per_thread_cwd_root_fd_scan=true")
print("thread_set_and_generation_stability_required=true")
print("thread_fd_observation_budget_per_process=262144")
print("host_census_not_executed_in_ci=true")
print("production_census_read_only=true")
print("production_census_explicit_filesystem_write=false")
print("production_census_filesystem_write_free=false")
print("production_census_atime_write_possible=true")
print("test_fixture_filesystem_write=true")
print("service_mutation=false")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
