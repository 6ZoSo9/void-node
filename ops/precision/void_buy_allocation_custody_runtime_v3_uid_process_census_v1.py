#!/usr/bin/env python3
# Read-only dedicated-custody UID process census for Precision.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_UID_PROCESS_CENSUS_V1"
if (
    _bootstrap_sys.flags.isolated != 1
    or not getattr(_bootstrap_sys.flags, "safe_path", False)
    or _bootstrap_sys.flags.optimize != 0
    or not __debug__
):
    if __name__ == "__main__":
        print(_BOOTSTRAP_MARKER)
        print("status=HOLD")
        print("reason=python_isolated_unoptimized_mode_required")
        print("process_signal=false")
        print("service_mutation=false")
        print("filesystem_write=false")
        print("funds_movement=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_mode_required")

import argparse
import grp
import hashlib
import json
import os
from pathlib import Path
import pwd
from typing import Any

MARKER = _BOOTSTRAP_MARKER
SCHEMA = "void_buy_void_custody_runtime_v3_uid_process_census_v1"
VERSION = 1
ROOT = Path(__file__).resolve().parents[2]

ARCHIVE_LOCK_REL = (
    "ops/security/"
    "buy-void-allocation-custody-runtime-install-archive-lock-v3.json"
)
ARCHIVE_LOCK_GIT_BLOB = "edb4ea2b833373ab387762e45ba7da4032c860f3"
ARCHIVE_LOCK_SHA256 = (
    "ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7"
)
SOCKET_POLICY_REL = (
    "tools/void-buy-allocation-custody-socket-runtime-directory-policy-v1.mjs"
)
SOCKET_POLICY_BLOB = "9d4b97a822b50c525722f0decae9205a9aebeb4a"

SERVICE_USER = "void-buy-custody"
SERVICE_GROUP = "void-buy-custody"
PROC_ROOT = Path("/proc")
MAX_PROC_ENTRIES = 131072
MAX_STATUS_BYTES = 64 * 1024
MAX_REPO_FILE = 2 * 1024 * 1024


class CensusHold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise CensusHold("custody_runtime_v3_uid_process_" + reason)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


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


def read_repo_file(path: Path, maximum: int = MAX_REPO_FILE) -> bytes:
    absolute = Path(os.path.abspath(os.fspath(path)))
    if not absolute.is_absolute() or "\x00" in str(absolute):
        hold("repo_path_invalid")
    flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
    fd = os.open(absolute, flags)
    try:
        before = os.fstat(fd)
        if before.st_size < 1 or before.st_size > maximum:
            hold("repo_file_size_invalid:" + absolute.name)
        raw = bytearray()
        while len(raw) < before.st_size:
            chunk = os.read(fd, min(65536, before.st_size - len(raw)))
            if not chunk:
                hold("repo_file_short_read:" + absolute.name)
            raw.extend(chunk)
        if os.read(fd, 1):
            hold("repo_file_grew:" + absolute.name)
        after = os.fstat(fd)
        if (
            before.st_dev != after.st_dev
            or before.st_ino != after.st_ino
            or before.st_size != after.st_size
            or before.st_mtime_ns != after.st_mtime_ns
            or before.st_ctime_ns != after.st_ctime_ns
        ):
            hold("repo_file_generation_changed:" + absolute.name)
        return bytes(raw)
    finally:
        os.close(fd)


def verify_source_inputs() -> dict[str, Any]:
    lock_raw = read_repo_file(ROOT / ARCHIVE_LOCK_REL, 128 * 1024)
    if git_blob(lock_raw) != ARCHIVE_LOCK_GIT_BLOB:
        hold("archive_lock_blob_mismatch")
    if sha256(lock_raw) != ARCHIVE_LOCK_SHA256:
        hold("archive_lock_sha256_mismatch")
    try:
        lock = json.loads(lock_raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("archive_lock_json_invalid:" + type(exc).__name__)
    if (
        type(lock) is not dict
        or lock.get("archive_candidate_accepted") is not True
        or lock.get("immutable_root_install") is not False
        or lock.get("install_target_selected") is not False
        or lock.get("existing_target_replaced") is not False
        or lock.get("runtime_integration") is not False
        or lock.get("payment_acceptance") is not False
        or lock.get("public_presale_activation") is not False
        or lock.get("funds_movement") is not False
    ):
        hold("archive_lock_authority_invalid")

    policy_raw = read_repo_file(ROOT / SOCKET_POLICY_REL)
    if git_blob(policy_raw) != SOCKET_POLICY_BLOB:
        hold("socket_policy_blob_mismatch")
    try:
        policy_text = policy_raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        hold("socket_policy_encoding_invalid:" + type(exc).__name__)
    for needle in (
        'service_user: "void-buy-custody"',
        'service_group: "void-buy-custody"',
        'systemd_manager: "system"',
    ):
        if needle not in policy_text:
            hold("socket_policy_semantic_marker_missing")
    return lock


def resolve_service_identity() -> dict[str, Any]:
    try:
        user = pwd.getpwnam(SERVICE_USER)
    except KeyError:
        return {
            "state": "user_absent",
            "user": SERVICE_USER,
            "group": SERVICE_GROUP,
            "uid": None,
            "gid": None,
            "primary_group_match": False,
        }
    try:
        group = grp.getgrnam(SERVICE_GROUP)
    except KeyError:
        hold("service_primary_group_missing")

    if user.pw_gid != group.gr_gid:
        hold("service_primary_group_mismatch")
    if user.pw_uid < 0 or user.pw_gid < 0:
        hold("service_identity_numeric_invalid")
    return {
        "state": "present",
        "user": SERVICE_USER,
        "group": SERVICE_GROUP,
        "uid": int(user.pw_uid),
        "gid": int(user.pw_gid),
        "primary_group_match": True,
    }


def parse_proc_status_uids(raw: bytes) -> tuple[int, int, int, int]:
    if len(raw) > MAX_STATUS_BYTES:
        hold("process_status_too_large")
    try:
        text = raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        hold("process_status_encoding_invalid:" + type(exc).__name__)
    rows = [line for line in text.splitlines() if line.startswith("Uid:")]
    if len(rows) != 1:
        hold("process_status_uid_invalid")
    parts = rows[0].split()
    if len(parts) != 5 or parts[0] != "Uid:":
        hold("process_status_uid_invalid")
    try:
        values = tuple(int(value, 10) for value in parts[1:])
    except ValueError as exc:
        hold("process_status_uid_invalid:" + type(exc).__name__)
    if len(values) != 4 or any(value < 0 for value in values):
        hold("process_status_uid_invalid")
    return values  # type: ignore[return-value]


def read_proc_status_uid_slots(
    process_root: Path,
    *,
    maximum: int = MAX_STATUS_BYTES,
) -> tuple[int, int, int, int]:
    status = process_root / "status"
    flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
    fd = -1
    try:
        fd = os.open(status, flags)
        raw = bytearray()
        while len(raw) <= maximum:
            chunk = os.read(fd, min(4096, maximum + 1 - len(raw)))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > maximum:
            hold("process_status_too_large")
        return parse_proc_status_uids(bytes(raw))
    finally:
        if fd >= 0:
            os.close(fd)


def proc_numeric_names(
    proc_root: Path,
    *,
    maximum: int = MAX_PROC_ENTRIES,
) -> list[str]:
    if (
        not isinstance(maximum, int)
        or isinstance(maximum, bool)
        or maximum < 1
        or maximum > MAX_PROC_ENTRIES
    ):
        hold("process_entry_limit_invalid")
    names: list[str] = []
    try:
        with os.scandir(proc_root) as entries:
            for entry in entries:
                name = entry.name
                if not name.isdecimal():
                    continue
                names.append(name)
                if len(names) > maximum:
                    hold("process_entry_limit_exceeded")
    except OSError as exc:
        hold("process_census_unavailable:" + str(exc.errno))
    names.sort(key=lambda value: int(value, 10))
    return names


def census_uid_processes(
    uid: int,
    proc_root: Path = PROC_ROOT,
    *,
    maximum_entries: int = MAX_PROC_ENTRIES,
) -> tuple[int, ...]:
    if not isinstance(uid, int) or isinstance(uid, bool) or uid < 0:
        hold("service_uid_invalid")
    observed: list[int] = []
    for name in proc_numeric_names(proc_root, maximum=maximum_entries):
        process_root = proc_root / name
        try:
            slots = read_proc_status_uid_slots(process_root)
        except FileNotFoundError:
            if process_root.exists():
                hold("process_status_missing:" + name)
            continue
        except OSError as exc:
            if not process_root.exists():
                continue
            hold("process_status_unreadable:" + name + ":" + str(exc.errno))
        if uid in slots:
            observed.append(int(name, 10))
    return tuple(observed)


def stable_uid_process_census(
    uid: int,
    proc_root: Path = PROC_ROOT,
    *,
    maximum_entries: int = MAX_PROC_ENTRIES,
) -> tuple[int, ...]:
    first = census_uid_processes(
        uid,
        proc_root,
        maximum_entries=maximum_entries,
    )
    second = census_uid_processes(
        uid,
        proc_root,
        maximum_entries=maximum_entries,
    )
    if first != second:
        hold("custody_uid_process_set_changed")
    return first


def census() -> dict[str, Any]:
    lock = verify_source_inputs()
    identity = resolve_service_identity()

    if identity["state"] == "present":
        processes = stable_uid_process_census(identity["uid"])
        pid_digest = sha256(canonical(list(processes)))
        process_count = len(processes)
        zero_uid_processes_observed = process_count == 0
        dedicated_uid_quiescence_candidate = zero_uid_processes_observed
    else:
        processes = ()
        pid_digest = None
        process_count = None
        zero_uid_processes_observed = False
        dedicated_uid_quiescence_candidate = False

    body = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": VERSION,
        "archive_lock": {
            "git_blob_sha1": ARCHIVE_LOCK_GIT_BLOB,
            "sha256": ARCHIVE_LOCK_SHA256,
            "archive_candidate_accepted": lock["archive_candidate_accepted"],
        },
        "policy": {
            "socket_runtime_policy_git_blob_sha1": SOCKET_POLICY_BLOB,
            "service_user": SERVICE_USER,
            "service_group": SERVICE_GROUP,
        },
        "service_identity": identity,
        "process_observation": {
            "proc_root": str(PROC_ROOT),
            "uid_slots_examined": [
                "real",
                "effective",
                "saved_set",
                "filesystem",
            ],
            "process_count": process_count,
            "pid_set_sha256": pid_digest,
            "zero_uid_processes_observed": zero_uid_processes_observed,
            "dedicated_uid_process_quiescence_candidate":
                dedicated_uid_quiescence_candidate,
            "dedicated_uid_process_quiescence_proven": False,
            "global_runtime_reference_quiescence_proven": False,
        },
        "read_only": True,
        "proc_status_uid_only": True,
        "process_cmdline_read": False,
        "process_environment_read": False,
        "process_executable_read": False,
        "process_fd_read": False,
        "process_signal": False,
        "service_mutation": False,
        "filesystem_write": False,
        "request_history_read": False,
        "custody_data_read": False,
        "credential_access": False,
        "wallet_or_signer_access": False,
        "install_target_selected": False,
        "existing_target_replaced": False,
        "runtime_integration": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "funds_movement": False,
    }
    return {
        **body,
        "census_id": "voidbuycustodyuidproc1_" + sha256(canonical(body)),
    }


def _write_status(path: Path, uids: tuple[int, int, int, int]) -> None:
    path.mkdir()
    (path / "status").write_text(
        "Name:\ttest\n"
        + "Uid:\t"
        + "\t".join(str(value) for value in uids)
        + "\n",
        encoding="utf-8",
    )


def self_test() -> None:
    verify_source_inputs()
    if parse_proc_status_uids(
        b"Name:\ttest\nUid:\t123\t124\t125\t126\n"
    ) != (123, 124, 125, 126):
        hold("self_test_uid_parse_invalid")

    import tempfile
    with tempfile.TemporaryDirectory(
        prefix="void-custody-uid-process-selftest-"
    ) as tmp:
        proc = Path(tmp)
        _write_status(proc / "101", (1000, 1000, 1000, 1000))
        _write_status(proc / "102", (994, 994, 994, 994))
        _write_status(proc / "103", (1000, 994, 1000, 1000))
        _write_status(proc / "104", (1000, 1000, 994, 1000))
        _write_status(proc / "105", (1000, 1000, 1000, 994))
        (proc / "self").mkdir()
        observed = census_uid_processes(994, proc, maximum_entries=16)
        if observed != (102, 103, 104, 105):
            hold("self_test_all_uid_slots_not_classified")
        stable = stable_uid_process_census(994, proc, maximum_entries=16)
        if stable != observed:
            hold("self_test_stable_scan_invalid")

        malformed = proc / "106"
        malformed.mkdir()
        (malformed / "status").write_text(
            "Name:\ttest\nUid:\t994\t994\t994\n",
            encoding="utf-8",
        )
        try:
            census_uid_processes(994, proc, maximum_entries=16)
        except CensusHold as exc:
            if "process_status_uid_invalid" not in str(exc):
                raise
        else:
            hold("self_test_malformed_status_accepted")
        for child in malformed.iterdir():
            child.unlink()
        malformed.rmdir()

        overflow = Path(tmp) / "overflow"
        overflow.mkdir()
        for index in range(4):
            (overflow / str(200 + index)).mkdir()
        try:
            proc_numeric_names(overflow, maximum=3)
        except CensusHold as exc:
            if "process_entry_limit_exceeded" not in str(exc):
                raise
        else:
            hold("self_test_proc_entry_budget_not_enforced")

    print(MARKER + "_SELF_TEST_GREEN")
    print("archive_lock_exact=true")
    print("socket_runtime_policy_exact=true")
    print("four_uid_slots_classified=true")
    print("malformed_live_status_holds=true")
    print("proc_entry_budget_enforced_before_sort=true")
    print("two_pass_uid_process_set_stability=true")
    print("dedicated_uid_process_quiescence_proven=false")
    print("global_runtime_reference_quiescence_proven=false")
    print("proc_status_uid_only=true")
    print("process_cmdline_read=false")
    print("process_environment_read=false")
    print("process_executable_read=false")
    print("process_fd_read=false")
    print("process_signal=false")
    print("service_mutation=false")
    print("filesystem_write=false")
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


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true")
    group.add_argument("--census", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        self_test()
        return 0
    if args.census:
        print(json.dumps(census(), sort_keys=True, separators=(",", ":")))
        return 0
    return 2


if __name__ == "__main__":
    try:
        raise SystemExit(main(_bootstrap_sys.argv[1:]))
    except (CensusHold, OSError, ValueError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("read_only=true")
        print("proc_status_uid_only=true")
        print("process_cmdline_read=false")
        print("process_environment_read=false")
        print("process_executable_read=false")
        print("process_fd_read=false")
        print("process_signal=false")
        print("service_mutation=false")
        print("filesystem_write=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
