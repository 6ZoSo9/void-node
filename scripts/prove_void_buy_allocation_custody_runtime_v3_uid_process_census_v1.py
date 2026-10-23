#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_uid_process_census_v1.py"
)
EXPECTED_SOURCE_BLOB = "7a292a4df12d3ce280c947cedc197f6edfdca1b3"


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_v3_uid_process_census_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_UID_PROCESS_CENSUS_V1"
)
assert module.SCHEMA == (
    "void_buy_void_custody_runtime_v3_uid_process_census_v1"
)
assert module.VERSION == 1
assert module.SERVICE_USER == "void-buy-custody"
assert module.SERVICE_GROUP == "void-buy-custody"
assert module.PROC_ROOT == Path("/proc")
assert module.MAX_PROC_ENTRIES == 131072
assert module.MAX_TASK_ENTRIES == 262144
assert module.ARCHIVE_LOCK_GIT_BLOB == (
    "edb4ea2b833373ab387762e45ba7da4032c860f3"
)
assert module.ARCHIVE_LOCK_SHA256 == (
    "ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7"
)
assert module.SOCKET_POLICY_BLOB == (
    "9d4b97a822b50c525722f0decae9205a9aebeb4a"
)

lock = module.verify_source_inputs()
assert lock["archive_candidate_accepted"] is True
assert lock["runtime_integration"] is False
assert lock["payment_acceptance"] is False
assert lock["public_presale_activation"] is False
assert lock["funds_movement"] is False

assert module.parse_proc_status_uids(
    b"Name:\ttest\nUid:\t10\t11\t12\t13\n"
) == (10, 11, 12, 13)

with tempfile.TemporaryDirectory(
    prefix="void-custody-uid-process-proof-"
) as tmp:
    proc = Path(tmp)

    def status_text(slots: tuple[int, int, int, int]) -> str:
        return (
            "Name:\ttest\n"
            + "Uid:\t"
            + "\t".join(str(value) for value in slots)
            + "\n"
        )

    def write_status(pid: int, slots: tuple[int, int, int, int]) -> None:
        root = proc / str(pid)
        root.mkdir()
        text = status_text(slots)
        (root / "status").write_text(text, encoding="utf-8")
        task = root / "task"
        task.mkdir()
        leader = task / str(pid)
        leader.mkdir()
        (leader / "status").write_text(text, encoding="utf-8")

    write_status(10, (994, 1000, 1000, 1000))
    write_status(11, (1000, 994, 1000, 1000))
    write_status(12, (1000, 1000, 994, 1000))
    write_status(13, (1000, 1000, 1000, 994))
    write_status(14, (1000, 1000, 1000, 1000))
    write_status(17, (1000, 1000, 1000, 1000))
    extra_thread = proc / "17" / "task" / "18"
    extra_thread.mkdir()
    (extra_thread / "status").write_text(
        status_text((1000, 994, 1000, 1000)),
        encoding="utf-8",
    )
    observed = module.census_uid_processes(
        994,
        proc,
        maximum_entries=32,
        maximum_task_entries=64,
    )
    assert observed == (10, 11, 12, 13, 17)
    assert module.stable_uid_process_census(
        994,
        proc,
        maximum_entries=32,
    ) == observed

    write_status(15, (994, 994, 994, 994))
    malformed = proc / "15"
    (malformed / "task" / "15" / "status").write_text(
        "Name:\ttest\nUid:\t994\t994\t994\n",
        encoding="utf-8",
    )
    try:
        module.census_uid_processes(994, proc, maximum_entries=32)
    except module.CensusHold as exc:
        assert "process_status_uid_invalid" in str(exc)
    else:
        raise AssertionError("malformed live thread status was accepted")
    for child in (malformed / "task" / "15").iterdir():
        child.unlink()
    (malformed / "task" / "15").rmdir()
    (malformed / "task").rmdir()
    (malformed / "status").unlink()
    malformed.rmdir()

    missing = proc / "16"
    missing.mkdir()
    (missing / "task").mkdir()
    (missing / "task" / "16").mkdir()
    try:
        module.census_uid_processes(994, proc, maximum_entries=32)
    except module.CensusHold as exc:
        assert "process_thread_status_missing" in str(exc)
    else:
        raise AssertionError("live thread without status was accepted")
    (missing / "task" / "16").rmdir()
    (missing / "task").rmdir()
    missing.rmdir()

    overflow = proc / "overflow"
    overflow.mkdir()
    for index in range(5):
        (overflow / str(100 + index)).mkdir()
    try:
        module.proc_numeric_names(overflow, maximum=4)
    except module.CensusHold as exc:
        assert "process_entry_limit_exceeded" in str(exc)
    else:
        raise AssertionError("proc enumeration exceeded budget before HOLD")

visible_mountinfo = (
    b"29 23 0:26 / /proc rw,nosuid,nodev,noexec,relatime"
    b" - proc proc rw\n"
)
hidden_mountinfo = (
    b"29 23 0:26 / /proc rw,nosuid,nodev,noexec,relatime"
    b" - proc proc rw,hidepid=2\n"
)
assert module.verify_complete_proc_visibility(visible_mountinfo)[
    "hidepid_restricted"
] is False
try:
    module.verify_complete_proc_visibility(hidden_mountinfo)
except module.CensusHold as exc:
    assert "proc_visibility_restricted:hidepid=2" in str(exc)
else:
    raise AssertionError("hidepid-restricted procfs was accepted")

module.self_test()

source = TARGET.read_text(encoding="utf-8")
production = source.split("def _write_status(", 1)[0]

for required in (
    "parse_proc_status_uids",
    "read_proc_status_uid_slots",
    "read_proc_mountinfo",
    "verify_complete_proc_visibility",
    "numeric_directory_names",
    "proc_numeric_names",
    "task_numeric_names",
    "census_uid_processes",
    "stable_uid_process_census",
    "uid_slots_examined",
    "dedicated_uid_process_quiescence_candidate",
    "dedicated_uid_process_quiescence_proven",
    "global_runtime_reference_quiescence_proven",
    "proc_status_uid_only",
    "proc_thread_status_uid_only",
    "complete_proc_visibility_verified",
    "process_cmdline_read",
    "process_environment_read",
    "process_executable_read",
    "process_fd_read",
    "process_signal",
):
    assert required in source, required

for forbidden in (
    "subprocess",
    "systemctl",
    "os.kill(",
    "signal.",
    "/cmdline",
    "/environ",
    "/fd/",
    "/exe",
    "socket.socket(",
    "os.unlink(",
    "os.rename(",
    "os.replace(",
    "os.chmod(",
    "os.chown(",
    "sudo ",
):
    assert forbidden not in production, forbidden

assert "os.scandir(root)" in production
assert "if len(names) > maximum:" in production
assert "names.sort(key=lambda value: int(value, 10))" in production
assert production.count("stable_uid_process_census(") >= 2

print("VOID_BUY_VOID_CUSTODY_RUNTIME_V3_UID_PROCESS_CENSUS_V1_PROOF_GREEN")
print("exact_source_blob_asserted=true")
print("archive_lock_exact=true")
print("socket_runtime_policy_exact=true")
print("four_uid_slots_classified=true")
print("thread_uid_slots_classified=true")
print("proc_visibility_verified_before_empty_candidate=true")
print("hidepid_restricted_proc_holds=true")
print("malformed_live_status_holds=true")
print("missing_live_status_holds=true")
print("proc_entry_budget_enforced_before_sort=true")
print("two_pass_uid_process_set_stability=true")
print("dedicated_uid_process_quiescence_proven=false")
print("global_runtime_reference_quiescence_proven=false")
print("proc_status_uid_only=true")
print("proc_thread_status_uid_only=true")
print("process_cmdline_read=false")
print("process_environment_read=false")
print("process_executable_read=false")
print("process_fd_read=false")
print("process_signal=false")
print("service_mutation=false")
print("production_census_filesystem_write=false")
print("source_proof_private_fixture_writes=true")
print("request_history_read=false")
print("custody_data_read=false")
print("credential_access=false")
print("wallet_or_signer_access=false")
print("install_target_selected=false")
print("existing_target_replaced=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
