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
    "void_buy_allocation_custody_runtime_v3_process_reference_census_v1.py"
)
EXPECTED_SOURCE_BLOB = "86c493d7acbe539fe898024474ed3c8815760603"


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
    "feb6508133a1feda9bda793646a5c949f1fdc7f0"
)
assert module.ARCHIVE_LOCK_BLOB == (
    "edb4ea2b833373ab387762e45ba7da4032c860f3"
)
assert module.ARCHIVE_LOCK_SHA256 == (
    "ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7"
)
assert module.TARGET == Path("/opt/void-buy-allocation-custody-runtime-v1")
assert module.MAX_TARGET_ENTRIES == 4096
assert module.MAX_PIDS == 32768
assert module.MAX_FDS_PER_PROCESS == 65536
assert module.MAX_SCAN_ATTEMPTS == 3

lock = module.verify_source_inputs()
assert lock["archive_candidate_accepted"] is True
assert lock["existing_target_replaced"] is False
assert lock["runtime_integration"] is False
assert lock["payment_acceptance"] is False
assert lock["public_presale_activation"] is False
assert lock["funds_movement"] is False

module.self_test()

clean_row = {
    "pid": 101,
    "status": "scanned",
    "start_ticks": "10",
    "reference_count": 0,
    "references": {"cwd": 0, "root": 0, "exe": 0, "fd": 0, "maps": 0},
    "incomplete_observations": 0,
}
assert module.classify_attempt(
    [101], [101], 0, [clean_row]
)["current_uid_target_reference_absent_candidate"] is True
assert module.classify_attempt(
    [101], [101, 102], 0, [clean_row]
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
    fd_root = pid_root / "fd"
    fd_root.mkdir(parents=True, mode=0o700)

    fields = ["S"] + ["0"] * 18 + ["123"] + ["0"] * 5
    (pid_root / "stat").write_text(
        "101 (fixture process) " + " ".join(fields) + "\n",
        encoding="ascii",
    )

    major = os.major(target_st.st_dev)
    minor = os.minor(target_st.st_dev)
    (pid_root / "maps").write_text(
        "00400000-00401000 r--p 00000000 "
        + f"{major:02x}:{minor:02x} {target_st.st_ino} /ignored\n",
        encoding="utf-8",
    )

    (fd_root / "0").symlink_to(target_file)
    (pid_root / "cwd").symlink_to(nested)
    (pid_root / "root").symlink_to("/")
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

        pids, vanished = module._same_uid_pids(os.geteuid())
        assert pids == [101]
        assert vanished == 0

        classified = module.classify_attempt(pids, pids, 0, [row])
        assert classified["current_uid_target_reference_absent_candidate"] is False
        assert classified["referenced_process_count"] == 1
        assert classified["reference_count_by_kind"]["cwd"] == 1
        assert classified["reference_count_by_kind"]["fd"] == 1
        assert classified["reference_count_by_kind"]["maps"] == 1

        (fd_root / "0").unlink()
        (pid_root / "cwd").unlink()
        (pid_root / "cwd").symlink_to(base)
        (pid_root / "maps").write_text(
            "00400000-00401000 r--p 00000000 00:00 0 [anon]\n",
            encoding="utf-8",
        )
        clean_actual = module.scan_process(101, os.geteuid(), identities)
        assert clean_actual["status"] == "scanned"
        assert clean_actual["reference_count"] == 0
        assert clean_actual["incomplete_observations"] == 0
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
    "sudo ",
):
    assert forbidden not in pre_self_test, forbidden

for required in (
    "root_execution_forbidden_for_user_owned_diagnostic",
    "follow_symlinks=True",
    "os.makedev",
    "MAX_MAPS_BYTES",
    "MAX_FDS_PER_PROCESS",
    "current_uid_target_reference_absent_candidate",
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
    "replacement_apply_authorized",
):
    assert required in source, required

print("VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROCESS_REFERENCE_CENSUS_V1_PROOF_GREEN")
print("exact_source_blob_asserted=true")
print("prestate_source_exact=true")
print("archive_lock_exact=true")
print("target_identity_metadata_only=true")
print("current_uid_process_scope=true")
print("cwd_inode_reference_tested=true")
print("fd_inode_reference_tested=true")
print("mapped_inode_reference_tested=true")
print("clean_current_uid_fixture_tested=true")
print("pid_set_change_fail_closed=true")
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
print("host_census_not_executed_in_ci=true")
print("production_filesystem_write=false")
print("test_fixture_filesystem_write=true")
print("service_mutation=false")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
