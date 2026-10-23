#!/usr/bin/env python3
# Read-only operator observation of host PID/mount namespace lease candidates.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = "VOID_BUY_VOID_CUSTODY_HOST_NAMESPACE_LEASE_OBSERVATION_V1"
if (
    _bootstrap_sys.flags.isolated != 1
    or not getattr(_bootstrap_sys.flags, "safe_path", False)
    or _bootstrap_sys.flags.dont_write_bytecode != 1
    or _bootstrap_sys.flags.optimize != 0
    or not __debug__
):
    if __name__ == "__main__":
        print(_BOOTSTRAP_MARKER)
        print("status=HOLD")
        print("reason=python_isolated_unoptimized_nobytecode_mode_required")
        print("production_filesystem_write=false")
        print("lease_authority=false")
        print("replacement_apply_authorized=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_nobytecode_mode_required")

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
from typing import Any

MARKER = _BOOTSTRAP_MARKER
SCHEMA = "void_buy_void_custody_host_namespace_lease_observation_v1"
VERSION = 1
ROOT = Path(__file__).resolve().parents[2]

PROCESS_CENSUS_REL = (
    "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_process_reference_census_v1.py"
)
PROCESS_CENSUS_BLOB = "ded737a228a627a241a84131113db6d3521f635c"

PROC = Path("/proc")
MAX_SOURCE_BYTES = 4 * 1024 * 1024
MAX_PROC_BYTES = 4 * 1024 * 1024


class CensusHold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise CensusHold("custody_host_namespace_lease_observation_" + reason)


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


def _identity(st: os.stat_result) -> tuple[int, int, int, int, int, int]:
    return (
        st.st_dev,
        st.st_ino,
        st.st_uid,
        st.st_gid,
        st.st_mode,
        st.st_nlink,
    )


def _generation(
    st: os.stat_result,
) -> tuple[int, int, int, int, int, int, int, int, int]:
    return _identity(st) + (st.st_size, st.st_mtime_ns, st.st_ctime_ns)


def _directory_flags() -> int:
    values = (
        getattr(os, "O_RDONLY", None),
        getattr(os, "O_DIRECTORY", None),
        getattr(os, "O_NOFOLLOW", None),
        getattr(os, "O_NONBLOCK", None),
    )
    if any(type(value) is not int for value in values):
        hold("descriptor_capability_invalid")
    return os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_NONBLOCK


def _leaf_flags() -> int:
    values = (
        getattr(os, "O_RDONLY", None),
        getattr(os, "O_NOFOLLOW", None),
        getattr(os, "O_NONBLOCK", None),
    )
    if any(type(value) is not int for value in values):
        hold("descriptor_capability_invalid")
    return os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK


def _read_bounded_path(
    path: Path,
    maximum: int,
    *,
    allow_zero_size: bool = False,
) -> bytes:
    if maximum < 1 or maximum > 16 * 1024 * 1024:
        hold("read_limit_invalid")
    before = os.stat(path, follow_symlinks=False)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or (not allow_zero_size and before.st_size < 1)
        or before.st_size > maximum
    ):
        hold("source_file_shape_invalid:" + path.name)
    fd = os.open(path, _leaf_flags())
    try:
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            hold("source_file_rebound:" + path.name)
        raw = bytearray()
        while len(raw) <= maximum:
            chunk = os.read(fd, min(65536, maximum + 1 - len(raw)))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > maximum:
            hold("source_file_too_large:" + path.name)
        after = os.fstat(fd)
        visible = os.stat(path, follow_symlinks=False)
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("source_file_generation_changed:" + path.name)
        return bytes(raw)
    finally:
        os.close(fd)


def _safe_relative(relative: str) -> tuple[str, ...]:
    if (
        not isinstance(relative, str)
        or not relative
        or "\x00" in relative
        or relative.startswith("/")
    ):
        hold("relative_path_invalid")
    parts = tuple(relative.split("/"))
    if any(part in ("", ".", "..") for part in parts):
        hold("relative_path_invalid")
    return parts


def _read_bounded_at(
    root_fd: int,
    relative: str,
    maximum: int,
    *,
    allow_zero_size: bool,
) -> bytes:
    _safe_relative(relative)
    if maximum < 1 or maximum > 16 * 1024 * 1024:
        hold("read_limit_invalid")

    before = os.stat(
        relative,
        dir_fd=root_fd,
        follow_symlinks=False,
    )
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode):
        hold("relative_file_shape_invalid:" + relative)
    if not allow_zero_size and before.st_size < 1:
        hold("relative_file_empty:" + relative)
    if before.st_size > maximum:
        hold("relative_file_too_large:" + relative)

    fd = os.open(relative, _leaf_flags(), dir_fd=root_fd)
    try:
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            hold("relative_file_rebound:" + relative)
        raw = bytearray()
        while len(raw) <= maximum:
            chunk = os.read(
                fd,
                min(65536, maximum + 1 - len(raw)),
            )
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > maximum:
            hold("relative_file_too_large:" + relative)

        after = os.fstat(fd)
        visible = os.stat(
            relative,
            dir_fd=root_fd,
            follow_symlinks=False,
        )
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("relative_file_generation_changed:" + relative)
        return bytes(raw)
    finally:
        os.close(fd)


def _fd_mount_id(fd: int) -> int:
    path = Path(f"/proc/self/fdinfo/{fd}")
    raw = _read_bounded_path(
        path,
        64 * 1024,
        allow_zero_size=True,
    )
    try:
        text = raw.decode("ascii")
    except UnicodeDecodeError:
        hold("mount_id_record_invalid")
    values: list[int] = []
    for line in text.splitlines():
        if line.startswith("mnt_id:"):
            value = line.split(":", 1)[1].strip()
            if value.isdigit():
                values.append(int(value))
    if len(values) != 1 or values[0] <= 0:
        hold("mount_id_missing_or_ambiguous")
    return values[0]


def _namespace_identity_at(proc_fd: int, relative: str) -> tuple[int, int]:
    _safe_relative(relative)
    try:
        st = os.stat(relative, dir_fd=proc_fd, follow_symlinks=True)
    except OSError as exc:
        hold("namespace_identity_unreadable:" + relative + ":" + str(exc.errno))
    dev = int(st.st_dev)
    ino = int(st.st_ino)
    if dev <= 0 or ino <= 0:
        hold("namespace_identity_invalid:" + relative)
    return dev, ino


def _lease_string(value: tuple[int, int]) -> str:
    return str(value[0]) + ":" + str(value[1])


def _verify_namespace_pair(
    self_identity: tuple[int, int],
    init_identity: tuple[int, int],
    *,
    mismatch_code: str,
) -> tuple[int, int]:
    if (
        len(self_identity) != 2
        or len(init_identity) != 2
        or any(
            not isinstance(value, int)
            or isinstance(value, bool)
            or value <= 0
            for value in (*self_identity, *init_identity)
        )
    ):
        hold("namespace_pair_identity_invalid")
    if self_identity != init_identity:
        hold(mismatch_code)
    return self_identity


def _verify_proc_mountinfo(raw: bytes, expected_mount_id: int) -> dict[str, Any]:
    try:
        text = raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        hold("proc_mountinfo_encoding_invalid:" + type(exc).__name__)

    matches: list[tuple[tuple[str, ...], tuple[str, ...]]] = []
    for line in text.splitlines():
        parts = line.split()
        try:
            separator = parts.index("-")
        except ValueError:
            hold("proc_mountinfo_row_invalid")
        if separator < 6 or separator + 3 >= len(parts):
            hold("proc_mountinfo_row_invalid")
        if not parts[0].isdigit():
            hold("proc_mountinfo_row_invalid")
        if int(parts[0], 10) != expected_mount_id:
            continue
        if parts[separator + 1] != "proc":
            hold("proc_mount_identity_not_procfs")
        mount_options = tuple(sorted(set(parts[5].split(","))))
        super_options = tuple(sorted(set(parts[separator + 3].split(","))))
        matches.append((mount_options, super_options))

    if len(matches) != 1:
        hold("proc_mount_selection_invalid")
    mount_options, super_options = matches[0]
    all_options = set(mount_options) | set(super_options)
    hidden = sorted(
        option
        for option in all_options
        if option.startswith("hidepid=") and option != "hidepid=0"
    )
    if hidden:
        hold("proc_visibility_restricted:" + ",".join(hidden))
    return {
        "mount_id": expected_mount_id,
        "mount_options": list(mount_options),
        "super_options": list(super_options),
        "hidepid_restricted": False,
    }


def verify_process_census_source() -> dict[str, Any]:
    raw = _read_bounded_path(ROOT / PROCESS_CENSUS_REL, MAX_SOURCE_BYTES)
    observed = git_blob(raw)
    if observed != PROCESS_CENSUS_BLOB:
        hold("process_census_source_blob_mismatch")
    return {
        "path": PROCESS_CENSUS_REL,
        "git_blob_sha1": observed,
        "bytes": len(raw),
        "sha256": sha256(raw),
    }


def _assert_unprivileged() -> int:
    if os.getuid() == 0 or os.geteuid() == 0:
        hold("root_execution_forbidden_for_operator_observation")
    return os.geteuid()


def observe_host_namespace_candidates() -> dict[str, Any]:
    uid = _assert_unprivileged()
    source = verify_process_census_source()

    before = os.stat(PROC, follow_symlinks=False)
    if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
        hold("proc_root_not_direct_directory")

    proc_fd = os.open(PROC, _directory_flags())
    try:
        opened = os.fstat(proc_fd)
        visible = os.stat(PROC, follow_symlinks=False)
        if (
            not stat.S_ISDIR(opened.st_mode)
            or _identity(before) != _identity(opened)
            or _identity(opened) != _identity(visible)
        ):
            hold("proc_root_rebound")

        mount_id = _fd_mount_id(proc_fd)
        mountinfo = _read_bounded_at(
            proc_fd,
            "self/mountinfo",
            MAX_PROC_BYTES,
            allow_zero_size=True,
        )
        visibility = _verify_proc_mountinfo(mountinfo, mount_id)

        self_pid = _namespace_identity_at(proc_fd, "self/ns/pid")
        init_pid = _namespace_identity_at(proc_fd, "1/ns/pid")
        self_mnt = _namespace_identity_at(proc_fd, "self/ns/mnt")
        init_mnt = _namespace_identity_at(proc_fd, "1/ns/mnt")

        self_pid = _verify_namespace_pair(
            self_pid,
            init_pid,
            mismatch_code="not_in_pid1_pid_namespace",
        )
        self_mnt = _verify_namespace_pair(
            self_mnt,
            init_mnt,
            mismatch_code="not_in_pid1_mount_namespace",
        )

        terminal_pid = _namespace_identity_at(proc_fd, "self/ns/pid")
        terminal_init_pid = _namespace_identity_at(proc_fd, "1/ns/pid")
        terminal_mnt = _namespace_identity_at(proc_fd, "self/ns/mnt")
        terminal_init_mnt = _namespace_identity_at(proc_fd, "1/ns/mnt")
        terminal_mountinfo = _read_bounded_at(
            proc_fd,
            "self/mountinfo",
            MAX_PROC_BYTES,
            allow_zero_size=True,
        )
        terminal_visibility = _verify_proc_mountinfo(
            terminal_mountinfo,
            mount_id,
        )
        terminal_opened = os.fstat(proc_fd)
        terminal_visible = os.stat(PROC, follow_symlinks=False)

        if (
            terminal_pid != self_pid
            or terminal_init_pid != init_pid
            or terminal_mnt != self_mnt
            or terminal_init_mnt != init_mnt
            or terminal_visibility != visibility
            or _identity(terminal_opened) != _identity(opened)
            or _identity(terminal_visible) != _identity(opened)
        ):
            hold("host_namespace_observation_changed")

        body = {
            "schema": SCHEMA,
            "marker": MARKER,
            "version": VERSION,
            "effective_uid": uid,
            "process_census_source": source,
            "host_pid_namespace_dev_ino_candidate": _lease_string(self_pid),
            "host_mount_namespace_dev_ino_candidate": _lease_string(self_mnt),
            "pid1_pid_namespace_matches_self": True,
            "pid1_mount_namespace_matches_self": True,
            "proc_root_dev": opened.st_dev,
            "proc_root_ino": opened.st_ino,
            "proc_mount_id": mount_id,
            "proc_visibility": visibility,
            "retained_procfs_view": True,
            "retained_procfs_view_revalidated": True,
            "operator_observation_only": True,
            "operator_must_independently_know_host_context": True,
            "independent_host_context_attested": False,
            "lease_authority": False,
            "automatic_process_census_composition_authorized": False,
            "read_only": True,
            "production_filesystem_write": False,
            "root_execution_forbidden": True,
            "process_environment_read": False,
            "process_arguments_read": False,
            "service_mutation": False,
            "systemd_mutation": False,
            "replacement_apply_authorized": False,
            "runtime_integration": False,
            "payment_acceptance": False,
            "public_presale_activation": False,
            "funds_movement": False,
        }
        return {
            **body,
            "observation_id": (
                "voidbuycustodynsleaseobs1_" + sha256(canonical(body))
            ),
        }
    finally:
        os.close(proc_fd)


def self_test() -> None:
    verify_process_census_source()

    if _lease_string((12, 34)) != "12:34":
        hold("self_test_lease_format_invalid")
    if _verify_namespace_pair(
        (12, 34),
        (12, 34),
        mismatch_code="synthetic_namespace_mismatch",
    ) != (12, 34):
        hold("self_test_namespace_pair_positive_invalid")
    for code in (
        "not_in_pid1_pid_namespace",
        "not_in_pid1_mount_namespace",
    ):
        try:
            _verify_namespace_pair((12, 34), (12, 35), mismatch_code=code)
        except CensusHold as exc:
            if code not in str(exc):
                raise
        else:
            hold("self_test_namespace_pair_mismatch_accepted")

    visible = (
        b"42 1 0:1 / /proc rw,nosuid,nodev,noexec,relatime"
        b" - proc proc rw,hidepid=0\n"
    )
    hidden = (
        b"42 1 0:1 / /proc rw,nosuid,nodev,noexec,relatime"
        b" - proc proc rw,hidepid=2\n"
    )
    if _verify_proc_mountinfo(visible, 42)["hidepid_restricted"] is not False:
        hold("self_test_proc_visibility_invalid")
    try:
        _verify_proc_mountinfo(hidden, 42)
    except CensusHold as exc:
        if "proc_visibility_restricted" not in str(exc):
            raise
    else:
        hold("self_test_hidden_proc_accepted")

    proc_fd = os.open(PROC, _directory_flags())
    try:
        probe = _read_bounded_at(
            proc_fd,
            "self/stat",
            4096,
            allow_zero_size=True,
        )
        if not probe:
            hold("self_test_descriptor_relative_read_empty")
        if _fd_mount_id(proc_fd) <= 0:
            hold("self_test_mount_id_invalid")
    finally:
        os.close(proc_fd)

    print(MARKER + "_SELF_TEST_GREEN")
    print("process_census_source_exact=true")
    print("pid_namespace_candidate_format=true")
    print("mount_namespace_candidate_format=true")
    print("pid1_namespace_match_required=true")
    print("mount_namespace_match_required=true")
    print("pid_namespace_mismatch_rejected=true")
    print("mount_namespace_mismatch_rejected=true")
    print("complete_proc_visibility_required=true")
    print("hidepid_restricted_proc_holds=true")
    print("descriptor_relative_bounded_reader_tested=true")
    print("proc_self_intermediate_symlink_supported=true")
    print("proc_fdinfo_zero_size_reader_tested=true")
    print("proc_mount_id_reader_tested=true")
    print("operator_observation_only=true")
    print("operator_must_independently_know_host_context=true")
    print("independent_host_context_attested=false")
    print("lease_authority=false")
    print("automatic_process_census_composition_authorized=false")
    print("python_no_bytecode_mode_required=true")
    print("production_filesystem_write=false")
    print("root_execution_forbidden=true")
    print("service_mutation=false")
    print("replacement_apply_authorized=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true")
    group.add_argument("--observe", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        self_test()
        return 0
    if args.observe:
        print(
            json.dumps(
                observe_host_namespace_candidates(),
                sort_keys=True,
                separators=(",", ":"),
            )
        )
        return 0
    return 2


if __name__ == "__main__":
    try:
        raise SystemExit(main(_bootstrap_sys.argv[1:]))
    except (CensusHold, OSError, ValueError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("operator_observation_only=true")
        print("independent_host_context_attested=false")
        print("lease_authority=false")
        print("automatic_process_census_composition_authorized=false")
        print("production_filesystem_write=false")
        print("root_execution_forbidden=true")
        print("replacement_apply_authorized=false")
        print("service_mutation=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
