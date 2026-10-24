#!/usr/bin/env python3
# Read-only Precision candidate census for the expected custody Node binary.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = "VOID_BUY_VOID_CUSTODY_NODE_BINARY_LIVE_CENSUS_V1"
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
        print("production_census_explicit_filesystem_write=false")
        print("node_binary_identity_verified=false")
        print("funds_movement=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_nobytecode_mode_required")

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import tempfile
from typing import Any

MARKER = _BOOTSTRAP_MARKER
SCHEMA = "void_buy_void_custody_node_binary_live_census_v1"
VERSION = 1
ROOT = Path(__file__).resolve().parents[2]

PROFILE_REL = "tools/void-buy-allocation-custody-node-binary-profile-v1.mjs"
PROFILE_GIT_BLOB = "4d4d656bddf40de6f215be7b4b6e7cec62098036"

EXPECTED_HOST = "zoso-Precision-Tower-7810"
EXPECTED_PATH = Path("/usr/bin/node")
EXPECTED_BYTES = 124827920
EXPECTED_SHA256 = (
    "fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48"
)
EXPECTED_VERSION_STRING = "v22.23.3"
EXPECTED_UID = 0
EXPECTED_GID = 0
EXPECTED_MODE = 0o755
EXPECTED_NLINK = 1
MAX_PROFILE_BYTES = 512 * 1024
MAX_NODE_BYTES = 256 * 1024 * 1024

PARENT_EXPECTED = (
    ("/", 0, 0, 0o755),
    ("/usr", 0, 0, 0o755),
    ("/usr/bin", 0, 0, 0o755),
)


class CensusHold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise CensusHold("custody_node_binary_live_" + reason)


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
    return (
        os.O_RDONLY
        | os.O_DIRECTORY
        | os.O_NOFOLLOW
        | os.O_NONBLOCK
        | getattr(os, "O_CLOEXEC", 0)
    )


def _leaf_flags() -> int:
    values = (
        getattr(os, "O_RDONLY", None),
        getattr(os, "O_NOFOLLOW", None),
        getattr(os, "O_NONBLOCK", None),
    )
    if any(type(value) is not int for value in values):
        hold("descriptor_capability_invalid")
    return (
        os.O_RDONLY
        | os.O_NOFOLLOW
        | os.O_NONBLOCK
        | getattr(os, "O_CLOEXEC", 0)
    )


def _open_bound_directory(path: Path) -> tuple[int, os.stat_result]:
    absolute = Path(os.path.abspath(os.fspath(path)))
    parts = absolute.parts
    if (
        not absolute.is_absolute()
        or not parts
        or parts[0] != "/"
        or any(part in ("", ".", "..") for part in parts[1:])
        or "\x00" in str(absolute)
    ):
        hold("directory_path_invalid")

    fd = -1
    try:
        fd = os.open("/", _directory_flags())
        root_visible = os.stat("/", follow_symlinks=False)
        root_opened = os.fstat(fd)
        if (
            not stat.S_ISDIR(root_opened.st_mode)
            or _identity(root_visible) != _identity(root_opened)
        ):
            hold("filesystem_root_unbound")

        for component in parts[1:]:
            before = os.stat(component, dir_fd=fd, follow_symlinks=False)
            if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
                hold("directory_component_invalid:" + component)
            next_fd = os.open(component, _directory_flags(), dir_fd=fd)
            opened = os.fstat(next_fd)
            if _identity(before) != _identity(opened):
                os.close(next_fd)
                hold("directory_component_rebound:" + component)
            os.close(fd)
            fd = next_fd

        opened = os.fstat(fd)
        visible = os.stat(str(absolute), follow_symlinks=False)
        if _identity(opened) != _identity(visible):
            hold("directory_terminal_rebound")
        return fd, opened
    except BaseException:
        if fd >= 0:
            os.close(fd)
        raise


def _read_bound_regular(path: Path, maximum: int) -> bytes:
    absolute = Path(os.path.abspath(os.fspath(path)))
    parent_fd, _ = _open_bound_directory(absolute.parent)
    fd = -1
    try:
        before = os.stat(
            absolute.name,
            dir_fd=parent_fd,
            follow_symlinks=False,
        )
        if (
            not stat.S_ISREG(before.st_mode)
            or stat.S_ISLNK(before.st_mode)
            or before.st_size < 1
            or before.st_size > maximum
        ):
            hold("profile_source_shape_invalid")
        fd = os.open(absolute.name, _leaf_flags(), dir_fd=parent_fd)
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            hold("profile_source_rebound")
        raw = bytearray()
        while len(raw) <= maximum:
            chunk = os.read(fd, min(65536, maximum + 1 - len(raw)))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > maximum:
            hold("profile_source_too_large")
        after = os.fstat(fd)
        visible = os.stat(
            absolute.name,
            dir_fd=parent_fd,
            follow_symlinks=False,
        )
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("profile_source_generation_changed")
        return bytes(raw)
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent_fd)


def verify_profile_source() -> None:
    raw = _read_bound_regular(ROOT / PROFILE_REL, MAX_PROFILE_BYTES)
    if git_blob(raw) != PROFILE_GIT_BLOB:
        hold("profile_source_git_blob_mismatch")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        hold("profile_source_utf8_invalid:" + type(exc).__name__)
    for needle in (
        'host: "zoso-Precision-Tower-7810"',
        'path: "/usr/bin/node"',
        "bytes: 124827920",
        EXPECTED_SHA256,
        'version_string: "v22.23.3"',
        "live_at_use_reverification_required: true",
        "node_binary_identity_verified: false",
    ):
        if needle not in text:
            hold("profile_source_semantic_marker_missing")


def _validate_directory(
    st: os.stat_result,
    *,
    uid: int,
    gid: int,
    mode: int,
    code: str,
) -> None:
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != uid
        or st.st_gid != gid
        or stat.S_IMODE(st.st_mode) != mode
        or stat.S_IMODE(st.st_mode) & 0o022
    ):
        hold(code)


def _open_expected_ancestry() -> list[tuple[str, int, os.stat_result]]:
    leases: list[tuple[str, int, os.stat_result]] = []
    root_fd = os.open("/", _directory_flags())
    try:
        root_st = os.fstat(root_fd)
        root_visible = os.stat("/", follow_symlinks=False)
        if _identity(root_st) != _identity(root_visible):
            hold("node_ancestry_root_rebound")
        _validate_directory(
            root_st,
            uid=0,
            gid=0,
            mode=0o755,
            code="node_ancestry_root_invalid",
        )
        leases.append(("/", root_fd, root_st))

        usr_before = os.stat("usr", dir_fd=root_fd, follow_symlinks=False)
        usr_fd = os.open("usr", _directory_flags(), dir_fd=root_fd)
        usr_st = os.fstat(usr_fd)
        if _identity(usr_before) != _identity(usr_st):
            os.close(usr_fd)
            hold("node_ancestry_usr_rebound")
        leases.append(("/usr", usr_fd, usr_st))
        _validate_directory(
            usr_st,
            uid=0,
            gid=0,
            mode=0o755,
            code="node_ancestry_usr_invalid",
        )

        bin_before = os.stat("bin", dir_fd=usr_fd, follow_symlinks=False)
        bin_fd = os.open("bin", _directory_flags(), dir_fd=usr_fd)
        bin_st = os.fstat(bin_fd)
        if _identity(bin_before) != _identity(bin_st):
            os.close(bin_fd)
            hold("node_ancestry_bin_rebound")
        leases.append(("/usr/bin", bin_fd, bin_st))
        _validate_directory(
            bin_st,
            uid=0,
            gid=0,
            mode=0o755,
            code="node_ancestry_bin_invalid",
        )
        return leases
    except BaseException:
        for _name, fd, _st in reversed(leases):
            os.close(fd)
        if not leases:
            os.close(root_fd)
        raise


def _close_leases(leases: list[tuple[str, int, os.stat_result]]) -> None:
    for _name, fd, _st in reversed(leases):
        os.close(fd)


def _revalidate_ancestry(
    leases: list[tuple[str, int, os.stat_result]],
) -> None:
    if len(leases) != 3:
        hold("node_ancestry_lease_count_invalid")
    root_name, root_fd, root_st = leases[0]
    usr_name, usr_fd, usr_st = leases[1]
    bin_name, bin_fd, bin_st = leases[2]
    if (root_name, usr_name, bin_name) != ("/", "/usr", "/usr/bin"):
        hold("node_ancestry_lease_names_invalid")

    root_after = os.fstat(root_fd)
    usr_after = os.fstat(usr_fd)
    bin_after = os.fstat(bin_fd)
    root_visible = os.stat("/", follow_symlinks=False)
    usr_visible = os.stat("usr", dir_fd=root_fd, follow_symlinks=False)
    bin_visible = os.stat("bin", dir_fd=usr_fd, follow_symlinks=False)

    if (
        _generation(root_st) != _generation(root_after)
        or _generation(root_after) != _generation(root_visible)
    ):
        hold("node_ancestry_root_changed")
    if (
        _generation(usr_st) != _generation(usr_after)
        or _generation(usr_after) != _generation(usr_visible)
    ):
        hold("node_ancestry_usr_changed")
    if (
        _generation(bin_st) != _generation(bin_after)
        or _generation(bin_after) != _generation(bin_visible)
    ):
        hold("node_ancestry_bin_changed")


def _measure_regular_at(
    parent_fd: int,
    name: str,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_uid: int,
    expected_gid: int,
    expected_mode: int,
    expected_nlink: int,
    require_elf: bool,
) -> dict[str, Any]:
    before = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != expected_uid
        or before.st_gid != expected_gid
        or stat.S_IMODE(before.st_mode) != expected_mode
        or before.st_nlink != expected_nlink
        or before.st_size != expected_bytes
        or before.st_size < 1
        or before.st_size > MAX_NODE_BYTES
    ):
        hold("node_binary_metadata_mismatch")

    fd = os.open(name, _leaf_flags(), dir_fd=parent_fd)
    try:
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            hold("node_binary_rebound")

        digest = hashlib.sha256()
        total = 0
        prefix = bytearray()
        while total < opened.st_size:
            chunk = os.read(fd, min(1024 * 1024, opened.st_size - total))
            if not chunk:
                hold("node_binary_short_read")
            if len(prefix) < 4:
                prefix.extend(chunk[: 4 - len(prefix)])
            digest.update(chunk)
            total += len(chunk)
        if os.read(fd, 1):
            hold("node_binary_grew")
        if total != expected_bytes:
            hold("node_binary_byte_count_mismatch")
        measured_sha = digest.hexdigest()
        if measured_sha != expected_sha256:
            hold("node_binary_sha256_mismatch")
        if require_elf and bytes(prefix) != b"\x7fELF":
            hold("node_binary_elf_magic_mismatch")

        after = os.fstat(fd)
        visible = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("node_binary_generation_changed")

        return {
            "dev": opened.st_dev,
            "ino": opened.st_ino,
            "uid": opened.st_uid,
            "gid": opened.st_gid,
            "mode": format(stat.S_IMODE(opened.st_mode), "04o"),
            "nlink": opened.st_nlink,
            "bytes": total,
            "sha256": measured_sha,
            "elf": bytes(prefix) == b"\x7fELF",
            "stable_during_observation": True,
        }
    finally:
        os.close(fd)


def measure_expected_node() -> dict[str, Any]:
    leases = _open_expected_ancestry()
    try:
        bin_fd = leases[-1][1]
        measured = _measure_regular_at(
            bin_fd,
            "node",
            expected_bytes=EXPECTED_BYTES,
            expected_sha256=EXPECTED_SHA256,
            expected_uid=EXPECTED_UID,
            expected_gid=EXPECTED_GID,
            expected_mode=EXPECTED_MODE,
            expected_nlink=EXPECTED_NLINK,
            require_elf=True,
        )
        _revalidate_ancestry(leases)
        measured["path"] = str(EXPECTED_PATH)
        measured["parent_chain_exact"] = True
        return measured
    finally:
        _close_leases(leases)


def _assert_unprivileged() -> None:
    if os.getuid() == 0 or os.geteuid() == 0:
        hold("root_execution_forbidden_for_mutable_checkout_census")


def census() -> dict[str, Any]:
    _assert_unprivileged()
    verify_profile_source()
    hostname = os.uname().nodename
    if hostname != EXPECTED_HOST:
        hold("designated_host_mismatch")
    measured = measure_expected_node()

    body = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": VERSION,
        "profile_source": {
            "path": PROFILE_REL,
            "git_blob_sha1": PROFILE_GIT_BLOB,
        },
        "expected": {
            "host": EXPECTED_HOST,
            "path": str(EXPECTED_PATH),
            "bytes": EXPECTED_BYTES,
            "sha256": EXPECTED_SHA256,
            "version_string": EXPECTED_VERSION_STRING,
            "uid": EXPECTED_UID,
            "gid": EXPECTED_GID,
            "mode": "0755",
            "nlink": EXPECTED_NLINK,
        },
        "observed": {
            "host": hostname,
            **measured,
        },
        "live_node_binary_identity_match_candidate": True,
        "node_binary_identity_verified": False,
        "source_execution_protected": False,
        "operator_evidence_authenticated": False,
        "observation_time_bound": False,
        "point_in_time_observation": True,
        "live_at_use_reverification_required": True,
        "node_binary_execution_performed": False,
        "version_command_executed": False,
        "production_census_read_only": True,
        "production_census_explicit_filesystem_write": False,
        "production_census_filesystem_write_free": False,
        "production_census_atime_write_possible": True,
        "service_mutation": False,
        "systemd_mutation": False,
        "install_or_package_mutation": False,
        "replacement_apply_authorized": False,
        "runtime_integration": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "production_gate_ready": False,
        "funds_movement": False,
    }
    return {
        **body,
        "census_id": "voidbuycustodynodelive1_" + sha256(canonical(body)),
    }


def self_test() -> None:
    verify_profile_source()

    with tempfile.TemporaryDirectory(
        prefix="void-custody-node-live-selftest-"
    ) as tmp:
        root = Path(tmp)
        file = root / "node"
        raw = b"\x7fELF" + b"fixture-node-binary\n"
        file.write_bytes(raw)
        file.chmod(0o600)
        st = file.stat()
        parent_fd = os.open(root, _directory_flags())
        try:
            measured = _measure_regular_at(
                parent_fd,
                "node",
                expected_bytes=len(raw),
                expected_sha256=sha256(raw),
                expected_uid=st.st_uid,
                expected_gid=st.st_gid,
                expected_mode=0o600,
                expected_nlink=1,
                require_elf=True,
            )
            if (
                measured["sha256"] != sha256(raw)
                or measured["bytes"] != len(raw)
                or measured["elf"] is not True
            ):
                hold("self_test_positive_measurement_invalid")

            link = root / "node-link"
            link.symlink_to(file)
            try:
                _measure_regular_at(
                    parent_fd,
                    "node-link",
                    expected_bytes=len(raw),
                    expected_sha256=sha256(raw),
                    expected_uid=st.st_uid,
                    expected_gid=st.st_gid,
                    expected_mode=0o600,
                    expected_nlink=1,
                    require_elf=True,
                )
            except (CensusHold, OSError):
                pass
            else:
                hold("self_test_symlink_leaf_accepted")

            file.write_bytes(b"\x7fELF" + b"changed-node-binary")
            try:
                changed_st = file.stat()
                _measure_regular_at(
                    parent_fd,
                    "node",
                    expected_bytes=changed_st.st_size,
                    expected_sha256="0" * 64,
                    expected_uid=changed_st.st_uid,
                    expected_gid=changed_st.st_gid,
                    expected_mode=0o600,
                    expected_nlink=1,
                    require_elf=True,
                )
            except CensusHold as exc:
                if "node_binary_sha256_mismatch" not in str(exc):
                    raise
            else:
                hold("self_test_wrong_hash_accepted")
        finally:
            os.close(parent_fd)

    print(MARKER + "_SELF_TEST_GREEN")
    print("profile_source_exact=true")
    print("fixed_node_path_bound=true")
    print("descriptor_bound_binary_read=true")
    print("ancestor_descriptor_revalidation=true")
    print("exact_sha256_required=true")
    print("exact_byte_count_required=true")
    print("exact_uid_gid_mode_nlink_required=true")
    print("elf_magic_required=true")
    print("symlink_leaf_rejected=true")
    print("wrong_hash_rejected=true")
    print("root_execution_forbidden=true")
    print("node_binary_execution_performed=false")
    print("version_command_executed=false")
    print("live_node_binary_identity_match_candidate_only=true")
    print("node_binary_identity_verified=false")
    print("source_execution_protected=false")
    print("operator_evidence_authenticated=false")
    print("live_at_use_reverification_required=true")
    print("production_census_read_only=true")
    print("production_census_explicit_filesystem_write=false")
    print("production_census_filesystem_write_free=false")
    print("production_census_atime_write_possible=true")
    print("self_test_temporary_filesystem_write=true")
    print("replacement_apply_authorized=false")
    print("runtime_integration=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("production_gate_ready=false")
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
        print("node_binary_identity_verified=false")
        print("source_execution_protected=false")
        print("live_at_use_reverification_required=true")
        print("production_census_read_only=true")
        print("production_census_explicit_filesystem_write=false")
        print("production_census_filesystem_write_free=false")
        print("production_census_atime_write_possible=true")
        print("replacement_apply_authorized=false")
        print("runtime_integration=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("production_gate_ready=false")
        print("funds_movement=false")
        raise SystemExit(2)
