#!/usr/bin/env python3
# Read-only Precision host namespace lease collector for custody V3 diagnostics.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_HOST_NAMESPACE_LEASE_CENSUS_V1"
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
        print("service_mutation=false")
        print("funds_movement=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_nobytecode_mode_required")

import argparse
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
import socket
import stat
import tempfile
from typing import Any

MARKER = _BOOTSTRAP_MARKER
SCHEMA = "void_buy_void_custody_runtime_v3_host_namespace_lease_census_v1"
VERSION = 1
ROOT = Path(__file__).resolve().parents[2]

DESIGNATED_HOST_POLICY_REL = (
    "ops/precision/"
    "void_economic_sponsored_runtime_storage_designated_host_plan_v3.py"
)
DESIGNATED_HOST_POLICY_BLOB = "4234379cb7e283e03c654e10d0d7fe8986e99897"

EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810"
EXPECTED_OPERATOR = "zoso"
EXPECTED_OPERATOR_UID = 1000
EXPECTED_MACHINE_ID_SHA256 = (
    "11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2"
)

MACHINE_ID = Path("/etc/machine-id")
PROC = Path("/proc")
MAX_POLICY_BYTES = 2 * 1024 * 1024
MAX_MOUNTINFO_BYTES = 4 * 1024 * 1024
MAX_BOOT_ID_BYTES = 4096
UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-"
    r"[0-9a-f]{4}-[0-9a-f]{12}$"
)


class CensusHold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise CensusHold("custody_runtime_v3_host_namespace_lease_" + reason)


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


def _read_regular_direct(
    path: Path,
    *,
    maximum: int,
    require_root_owned: bool,
    require_nonwritable: bool,
) -> bytes:
    before = os.stat(path, follow_symlinks=False)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > maximum
        or (require_root_owned and (before.st_uid != 0 or before.st_gid != 0))
        or (require_nonwritable and (stat.S_IMODE(before.st_mode) & 0o022) != 0)
    ):
        hold("regular_file_metadata_invalid:" + path.name)
    fd = os.open(path, _leaf_flags())
    try:
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            hold("regular_file_rebound:" + path.name)
        raw = bytearray()
        while len(raw) < opened.st_size:
            chunk = os.read(fd, min(65536, opened.st_size - len(raw)))
            if not chunk:
                hold("regular_file_short_read:" + path.name)
            raw.extend(chunk)
        if os.read(fd, 1):
            hold("regular_file_grew:" + path.name)
        after = os.fstat(fd)
        visible = os.stat(path, follow_symlinks=False)
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("regular_file_generation_changed:" + path.name)
        return bytes(raw)
    finally:
        os.close(fd)


def _read_bounded_at(
    directory_fd: int,
    relative: str,
    maximum: int,
    *,
    allow_zero_size: bool,
) -> bytes:
    if (
        not isinstance(relative, str)
        or not relative
        or relative.startswith("/")
        or "\x00" in relative
        or any(part in ("", ".", "..") for part in relative.split("/"))
    ):
        hold("bounded_read_relative_path_invalid")
    if maximum < 1 or maximum > 16 * 1024 * 1024:
        hold("bounded_read_limit_invalid")
    before = os.stat(relative, dir_fd=directory_fd, follow_symlinks=False)
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode):
        hold("bounded_read_shape_invalid:" + relative)
    if not allow_zero_size and (
        before.st_size < 1 or before.st_size > maximum
    ):
        hold("bounded_read_visible_size_invalid:" + relative)
    fd = os.open(relative, _leaf_flags(), dir_fd=directory_fd)
    try:
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            hold("bounded_read_rebound:" + relative)
        raw = bytearray()
        while len(raw) <= maximum:
            chunk = os.read(fd, min(65536, maximum + 1 - len(raw)))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > maximum:
            hold("bounded_read_ceiling_exceeded:" + relative)
        after = os.fstat(fd)
        visible = os.stat(
            relative, dir_fd=directory_fd, follow_symlinks=False
        )
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("bounded_read_identity_changed:" + relative)
        return bytes(raw)
    finally:
        os.close(fd)


def verify_designated_host_policy() -> None:
    raw = _read_regular_direct(
        ROOT / DESIGNATED_HOST_POLICY_REL,
        maximum=MAX_POLICY_BYTES,
        require_root_owned=False,
        require_nonwritable=False,
    )
    if git_blob(raw) != DESIGNATED_HOST_POLICY_BLOB:
        hold("designated_host_policy_blob_mismatch")
    try:
        text = raw.decode("utf-8", "strict")
    except UnicodeDecodeError:
        hold("designated_host_policy_non_utf8")
    for needle in (
        'EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810"',
        'EXPECTED_OPERATOR = "zoso"',
        "EXPECTED_OPERATOR_UID = 1000",
        '"11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2"',
    ):
        if needle not in text:
            hold("designated_host_policy_semantic_marker_missing")


def _machine_id_sha256() -> str:
    raw = _read_regular_direct(
        MACHINE_ID,
        maximum=4096,
        require_root_owned=True,
        require_nonwritable=True,
    )
    try:
        machine = raw.decode("ascii", "strict").strip()
    except UnicodeDecodeError:
        hold("machine_id_invalid")
    if len(machine) != 32 or any(
        ch not in "0123456789abcdef" for ch in machine
    ):
        hold("machine_id_invalid")
    return sha256(machine.encode("ascii"))


def verify_designated_host() -> dict[str, Any]:
    if os.getuid() != EXPECTED_OPERATOR_UID or os.geteuid() != EXPECTED_OPERATOR_UID:
        hold("operator_uid_mismatch")
    if socket.gethostname() != EXPECTED_HOSTNAME:
        hold("hostname_mismatch")
    try:
        by_uid = pwd.getpwuid(EXPECTED_OPERATOR_UID)
        by_name = pwd.getpwnam(EXPECTED_OPERATOR)
    except KeyError:
        hold("operator_account_missing")
    if (
        by_uid.pw_name != EXPECTED_OPERATOR
        or by_name.pw_uid != EXPECTED_OPERATOR_UID
        or by_name.pw_name != EXPECTED_OPERATOR
    ):
        hold("operator_account_mismatch")
    machine_hash = _machine_id_sha256()
    if machine_hash != EXPECTED_MACHINE_ID_SHA256:
        hold("machine_id_mismatch")
    return {
        "hostname": EXPECTED_HOSTNAME,
        "operator": EXPECTED_OPERATOR,
        "operator_uid": EXPECTED_OPERATOR_UID,
        "machine_id_sha256": machine_hash,
        "designated_host_identity_verified": True,
    }


def _namespace_identity(
    proc_fd: int,
    relative: str,
    code: str,
) -> tuple[int, int]:
    try:
        st = os.stat(relative, dir_fd=proc_fd, follow_symlinks=True)
    except OSError as exc:
        hold(code + "_unreadable:" + str(exc.errno))
    value = (int(st.st_dev), int(st.st_ino))
    if value[0] <= 0 or value[1] <= 0:
        hold(code + "_invalid")
    return value


def verify_namespace_relationship(
    self_value: tuple[int, int],
    init_value: tuple[int, int],
    code: str,
) -> tuple[int, int]:
    if self_value != init_value:
        hold("not_in_pid1_" + code)
    return self_value


def _parse_proc_mountinfo(
    raw: bytes,
    proc_st: os.stat_result,
) -> dict[str, Any]:
    try:
        text = raw.decode("utf-8", "strict")
    except UnicodeDecodeError:
        hold("proc_mountinfo_non_utf8")
    expected_dev = f"{os.major(proc_st.st_dev)}:{os.minor(proc_st.st_dev)}"
    matches: list[dict[str, Any]] = []
    for line in text.splitlines():
        parts = line.split()
        try:
            sep = parts.index("-")
        except ValueError:
            hold("proc_mountinfo_row_invalid")
        if sep < 6 or sep + 3 >= len(parts):
            hold("proc_mountinfo_row_invalid")
        if parts[2] != expected_dev or parts[4] != "/proc":
            continue
        if parts[sep + 1] != "proc":
            hold("proc_mount_not_procfs")
        mount_options = tuple(sorted(set(parts[5].split(","))))
        super_options = tuple(sorted(set(parts[sep + 3].split(","))))
        matches.append({
            "mount_id": parts[0],
            "mount_options": mount_options,
            "super_options": super_options,
        })
    if len(matches) != 1:
        hold("proc_mount_selection_invalid")
    selected = matches[0]
    all_options = set(selected["mount_options"]) | set(selected["super_options"])
    hidden = sorted(
        option for option in all_options
        if option.startswith("hidepid=") and option != "hidepid=0"
    )
    if hidden:
        hold("proc_visibility_restricted:" + ",".join(hidden))
    return {
        "mount_id": selected["mount_id"],
        "mount_options": list(selected["mount_options"]),
        "super_options": list(selected["super_options"]),
        "hidepid_restricted": False,
    }


def _boot_id_sha256(proc_fd: int) -> str:
    raw = _read_bounded_at(
        proc_fd,
        "sys/kernel/random/boot_id",
        MAX_BOOT_ID_BYTES,
        allow_zero_size=True,
    )
    try:
        value = raw.decode("ascii", "strict").strip().lower()
    except UnicodeDecodeError:
        hold("boot_id_invalid")
    if not UUID_RE.fullmatch(value):
        hold("boot_id_invalid")
    return sha256(value.encode("ascii"))


def collect_proc_namespace_snapshot() -> dict[str, Any]:
    before = os.stat(PROC, follow_symlinks=False)
    if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
        hold("proc_root_not_direct_directory")
    fd = os.open(PROC, _directory_flags())
    try:
        opened = os.fstat(fd)
        visible = os.stat(PROC, follow_symlinks=False)
        if (
            _identity(before) != _identity(opened)
            or _identity(opened) != _identity(visible)
        ):
            hold("proc_root_rebound")

        self_pid = _namespace_identity(fd, "self/ns/pid", "self_pid_namespace")
        init_pid = _namespace_identity(fd, "1/ns/pid", "pid1_pid_namespace")
        pid_value = verify_namespace_relationship(
            self_pid, init_pid, "pid_namespace"
        )

        self_mnt = _namespace_identity(fd, "self/ns/mnt", "self_mount_namespace")
        init_mnt = _namespace_identity(fd, "1/ns/mnt", "pid1_mount_namespace")
        mnt_value = verify_namespace_relationship(
            self_mnt, init_mnt, "mount_namespace"
        )

        mountinfo = _read_bounded_at(
            fd,
            "self/mountinfo",
            MAX_MOUNTINFO_BYTES,
            allow_zero_size=True,
        )
        proc_mount = _parse_proc_mountinfo(mountinfo, opened)
        boot_hash = _boot_id_sha256(fd)

        terminal = os.fstat(fd)
        terminal_visible = os.stat(PROC, follow_symlinks=False)
        if (
            _identity(opened) != _identity(terminal)
            or _identity(terminal) != _identity(terminal_visible)
        ):
            hold("proc_root_generation_changed")

        self_pid_after = _namespace_identity(
            fd, "self/ns/pid", "self_pid_namespace"
        )
        init_pid_after = _namespace_identity(
            fd, "1/ns/pid", "pid1_pid_namespace"
        )
        self_mnt_after = _namespace_identity(
            fd, "self/ns/mnt", "self_mount_namespace"
        )
        init_mnt_after = _namespace_identity(
            fd, "1/ns/mnt", "pid1_mount_namespace"
        )
        if (
            self_pid_after != pid_value
            or init_pid_after != pid_value
            or self_mnt_after != mnt_value
            or init_mnt_after != mnt_value
        ):
            hold("namespace_generation_changed")
        if _boot_id_sha256(fd) != boot_hash:
            hold("boot_id_changed")

        return {
            "pid_namespace_dev_ino": f"{pid_value[0]}:{pid_value[1]}",
            "mount_namespace_dev_ino": f"{mnt_value[0]}:{mnt_value[1]}",
            "proc_root_dev": opened.st_dev,
            "proc_root_ino": opened.st_ino,
            "proc_mount": proc_mount,
            "boot_id_sha256": boot_hash,
            "pid1_pid_namespace_matches_self": True,
            "pid1_mount_namespace_matches_self": True,
            "retained_procfs_view_revalidated": True,
            "same_boot_binding_observed": True,
        }
    finally:
        os.close(fd)


def collect() -> dict[str, Any]:
    verify_designated_host_policy()
    host_before = verify_designated_host()
    namespace = collect_proc_namespace_snapshot()
    host_after = verify_designated_host()
    if host_after != host_before:
        hold("designated_host_identity_changed")
    body = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": VERSION,
        "designated_host_policy": {
            "path": DESIGNATED_HOST_POLICY_REL,
            "git_blob_sha1": DESIGNATED_HOST_POLICY_BLOB,
        },
        "host": host_before,
        "namespace": namespace,
        "read_only": True,
        "production_filesystem_write": False,
        "root_execution": False,
        "sudo_used": False,
        "service_state_checked": False,
        "service_mutation": False,
        "systemd_mutation": False,
        "process_environment_read": False,
        "process_arguments_read": False,
        "namespace_lease_is_install_authority": False,
        "replacement_apply_authorized": False,
        "runtime_integration": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "funds_movement": False,
    }
    return {
        **body,
        "namespace_lease_id": (
            "voidbuycustodynslease1_" + sha256(canonical(body))
        ),
    }


def self_test() -> None:
    verify_designated_host_policy()

    if verify_namespace_relationship((12, 34), (12, 34), "pid_namespace") != (
        12,
        34,
    ):
        hold("self_test_namespace_relationship_invalid")
    try:
        verify_namespace_relationship((12, 34), (12, 35), "mount_namespace")
    except CensusHold as exc:
        if "not_in_pid1_mount_namespace" not in str(exc):
            raise
    else:
        hold("self_test_private_mount_namespace_accepted")

    visible_mountinfo = (
        b"42 1 0:5 / /proc rw,nosuid,nodev,noexec,relatime"
        b" - proc proc rw,hidepid=0\n"
    )
    hidden_mountinfo = (
        b"42 1 0:5 / /proc rw,nosuid,nodev,noexec,relatime"
        b" - proc proc rw,hidepid=2\n"
    )
    fake = type("FakeStat", (), {"st_dev": os.makedev(0, 5)})()
    parsed = _parse_proc_mountinfo(visible_mountinfo, fake)
    if parsed["hidepid_restricted"] is not False:
        hold("self_test_visible_proc_rejected")
    try:
        _parse_proc_mountinfo(hidden_mountinfo, fake)
    except CensusHold as exc:
        if "proc_visibility_restricted" not in str(exc):
            raise
    else:
        hold("self_test_hidden_proc_accepted")

    with tempfile.TemporaryDirectory(
        prefix="void-custody-nslease-readat-selftest-"
    ) as tmp:
        root = Path(tmp)
        leaf = root / "probe"
        leaf.write_bytes(b"namespace-lease-probe")
        directory_fd = os.open(root, _directory_flags())
        try:
            observed = _read_bounded_at(
                directory_fd,
                "probe",
                4096,
                allow_zero_size=False,
            )
            if observed != b"namespace-lease-probe":
                hold("self_test_descriptor_relative_read_invalid")
        finally:
            os.close(directory_fd)

    print(MARKER + "_SELF_TEST_GREEN")
    print("designated_host_policy_exact=true")
    print("precision_hostname_bound=true")
    print("precision_operator_uid_bound=true")
    print("precision_machine_id_sha256_bound=true")
    print("pid1_pid_namespace_equality_required=true")
    print("pid1_mount_namespace_equality_required=true")
    print("procfs_type_required=true")
    print("complete_proc_visibility_required=true")
    print("hidepid_restricted_proc_holds=true")
    print("boot_id_same_boot_binding=true")
    print("descriptor_relative_bounded_reader_tested=true")
    print("production_filesystem_write=false")
    print("self_test_temporary_filesystem_write=true")
    print("namespace_lease_is_install_authority=false")
    print("replacement_apply_authorized=false")
    print("runtime_integration=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true")
    group.add_argument("--collect", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        self_test()
        return 0
    if args.collect:
        print(json.dumps(collect(), sort_keys=True, separators=(",", ":")))
        return 0
    return 2


if __name__ == "__main__":
    try:
        raise SystemExit(main(_bootstrap_sys.argv[1:]))
    except (CensusHold, OSError, KeyError, ValueError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("read_only=true")
        print("production_filesystem_write=false")
        print("namespace_lease_is_install_authority=false")
        print("replacement_apply_authorized=false")
        print("service_mutation=false")
        print("runtime_integration=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
