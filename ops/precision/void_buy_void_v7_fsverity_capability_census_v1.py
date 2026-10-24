#!/usr/bin/env python3
from __future__ import annotations

import argparse
import gzip
import io
import json
import os
import pathlib
import re
import socket
import stat
import struct
import zlib
from typing import Any

MARKER = "VOID_BUY_VOID_V7_FSVERITY_CAPABILITY_CENSUS_V1"
EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810"
TARGET = pathlib.Path("/opt")
MAX_PROC_BYTES = 8 * 1024 * 1024
MAX_CONFIG_BYTES = 4 * 1024 * 1024
EXT4_SUPERBLOCK_OFFSET = 1024
EXT4_SUPERBLOCK_BYTES = 1024
EXT4_SUPER_MAGIC_OFFSET = 0x38
EXT4_LOG_BLOCK_SIZE_OFFSET = 0x18
EXT4_FEATURE_INCOMPAT_OFFSET = 0x60
EXT4_FEATURE_RO_COMPAT_OFFSET = 0x64
EXT4_SUPER_MAGIC = 0xEF53
EXT4_FEATURE_INCOMPAT_EXTENTS = 0x0040
EXT4_FEATURE_RO_COMPAT_VERITY = 0x8000
SUPPORTED_FS_TYPES = frozenset({"ext4", "f2fs", "btrfs"})


class CensusError(RuntimeError):
    pass


def _read_fd_bounded(path: pathlib.Path, maximum: int) -> bytes:
    flags = os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK
    fd = os.open(path, flags)
    try:
        chunks: list[bytes] = []
        total = 0
        while True:
            part = os.read(fd, min(256 * 1024, maximum + 1 - total))
            if not part:
                break
            chunks.append(part)
            total += len(part)
            if total > maximum:
                raise CensusError("bounded_read_limit_exceeded:" + os.fspath(path))
        return b"".join(chunks)
    finally:
        os.close(fd)


def _gzip_decompress_bounded(raw: bytes, maximum: int) -> bytes:
    try:
        with gzip.GzipFile(fileobj=io.BytesIO(raw), mode="rb") as stream:
            out = stream.read(maximum + 1)
            if len(out) > maximum:
                raise CensusError("kernel_config_uncompressed_limit")
            if stream.read(1):
                raise CensusError("kernel_config_uncompressed_limit")
            return out
    except zlib.error as exc:
        raise CensusError("kernel_config_decompression_invalid") from exc
    except MemoryError as exc:
        raise CensusError("kernel_config_decompression_memory_error") from exc


def _read_config_text() -> tuple[str | None, str]:
    release = os.uname().release
    boot = pathlib.Path("/boot") / ("config-" + release)
    if boot.exists():
        try:
            return _read_fd_bounded(boot, MAX_CONFIG_BYTES).decode("utf-8", "strict"), os.fspath(boot)
        except (OSError, UnicodeError, CensusError):
            pass

    proc = pathlib.Path("/proc/config.gz")
    if proc.exists():
        try:
            raw = _read_fd_bounded(proc, MAX_CONFIG_BYTES)
            text = _gzip_decompress_bounded(raw, MAX_CONFIG_BYTES)
            return text.decode("utf-8", "strict"), os.fspath(proc)
        except (OSError, UnicodeError, gzip.BadGzipFile, EOFError, CensusError):
            pass
    return None, "unavailable"


def _kernel_config_value(text: str | None, name: str) -> str:
    if text is None:
        return "unknown"
    enabled = name + "="
    disabled = "# " + name + " is not set"
    for line in text.splitlines():
        if line.startswith(enabled):
            value = line[len(enabled):]
            return value if value in {"y", "m", "n"} else "other"
        if line == disabled:
            return "n"
    return "unknown"


_MOUNT_ESCAPE = re.compile(r"\\([0-7]{3})")


def _decode_mount_field(value: str) -> str:
    return _MOUNT_ESCAPE.sub(lambda m: chr(int(m.group(1), 8)), value)


def _parse_mountinfo(text: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for raw in text.splitlines():
        if not raw:
            continue
        parts = raw.split()
        try:
            sep = parts.index("-")
        except ValueError as exc:
            raise CensusError("mountinfo_separator_missing") from exc
        if sep < 6 or len(parts) < sep + 4:
            raise CensusError("mountinfo_row_short")
        mount_point = _decode_mount_field(parts[4])
        rows.append({
            "mount_id": parts[0],
            "parent_id": parts[1],
            "major_minor": parts[2],
            "root": _decode_mount_field(parts[3]),
            "mount_point": mount_point,
            "mount_options": tuple(parts[5].split(",")),
            "optional_fields": tuple(parts[6:sep]),
            "fstype": parts[sep + 1],
            "source": _decode_mount_field(parts[sep + 2]),
            "super_options": tuple(parts[sep + 3].split(",")),
        })
    return rows


def _target_identity(st: os.stat_result) -> tuple[int, int, int, int, int, int, int]:
    return (
        st.st_dev,
        st.st_ino,
        st.st_mode,
        st.st_uid,
        st.st_gid,
        st.st_mtime_ns,
        st.st_ctime_ns,
    )


def _canonical_target(
    target: pathlib.Path,
) -> tuple[pathlib.Path, tuple[int, int, int, int, int, int, int]]:
    raw = pathlib.Path(os.path.abspath(os.fspath(target)))
    try:
        before = os.lstat(raw)
    except OSError as exc:
        raise CensusError(
            "target_path_unavailable_errno_"
            + str(exc.errno if exc.errno is not None else "unknown")
        ) from exc
    if stat.S_ISLNK(before.st_mode):
        raise CensusError("target_symlink_forbidden")
    if not stat.S_ISDIR(before.st_mode):
        raise CensusError("target_not_directory")
    try:
        resolved = raw.resolve(strict=True)
        after = os.lstat(raw)
    except OSError as exc:
        raise CensusError(
            "target_path_resolution_failed_errno_"
            + str(exc.errno if exc.errno is not None else "unknown")
        ) from exc
    if resolved != raw:
        raise CensusError("target_path_alias_forbidden")
    identity = _target_identity(before)
    if _target_identity(after) != identity:
        raise CensusError("target_generation_changed")
    return raw, identity


def _mount_for_target(
    rows: list[dict[str, Any]],
    target: pathlib.Path,
    expected_dev: int | None = None,
) -> dict[str, Any]:
    target_s = os.path.abspath(os.fspath(target))
    matches: list[dict[str, Any]] = []
    for row in rows:
        mount_point = os.path.normpath(str(row["mount_point"]))
        if mount_point == "/":
            matches.append(row)
            continue
        if target_s == mount_point or target_s.startswith(mount_point.rstrip("/") + "/"):
            matches.append(row)
    if not matches:
        raise CensusError("target_mount_not_found")

    longest = max(len(os.path.normpath(str(row["mount_point"]))) for row in matches)
    finalists = [
        row
        for row in matches
        if len(os.path.normpath(str(row["mount_point"]))) == longest
    ]
    if expected_dev is not None:
        expected_major_minor = (os.major(expected_dev), os.minor(expected_dev))
        device_matches = [
            row
            for row in finalists
            if _parse_major_minor(str(row["major_minor"])) == expected_major_minor
        ]
        if not device_matches:
            raise CensusError("target_mount_device_mismatch")
        finalists = device_matches
    if len(finalists) != 1:
        raise CensusError("target_mount_selection_ambiguous")
    return finalists[0]


def _proc_filesystems() -> set[str]:
    raw = _read_fd_bounded(pathlib.Path("/proc/filesystems"), MAX_PROC_BYTES)
    result: set[str] = set()
    for line in raw.decode("utf-8", "strict").splitlines():
        fields = line.split()
        if fields:
            result.add(fields[-1])
    return result


def _parse_major_minor(value: str) -> tuple[int, int]:
    fields = value.split(":")
    if len(fields) != 2 or not all(field.isdigit() for field in fields):
        raise CensusError("mount_major_minor_invalid")
    return int(fields[0]), int(fields[1])


def _source_block_device(
    source: str,
    expected_major_minor: tuple[int, int],
) -> tuple[pathlib.Path | None, str]:
    if not source.startswith("/"):
        return None, "mount_source_not_absolute"
    try:
        resolved = pathlib.Path(os.path.realpath(source))
        st = resolved.lstat()
    except OSError as exc:
        return None, "mount_source_unavailable_errno_" + str(exc.errno)
    if not stat.S_ISBLK(st.st_mode):
        return None, "mount_source_not_block_device"
    if not os.fspath(resolved).startswith("/dev/"):
        return None, "mount_source_outside_dev"
    if (os.major(st.st_rdev), os.minor(st.st_rdev)) != expected_major_minor:
        return None, "mount_source_device_number_mismatch"
    return resolved, "ok"


def _read_ext4_superblock(
    device: pathlib.Path,
    expected_major_minor: tuple[int, int],
) -> dict[str, Any]:
    flags = os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK
    fd = os.open(device, flags)
    try:
        st_before = os.fstat(fd)
        if not stat.S_ISBLK(st_before.st_mode):
            raise CensusError("ext4_source_not_block_device")
        if (os.major(st_before.st_rdev), os.minor(st_before.st_rdev)) != expected_major_minor:
            raise CensusError("ext4_opened_device_number_mismatch")
        raw = os.pread(fd, EXT4_SUPERBLOCK_BYTES, EXT4_SUPERBLOCK_OFFSET)
        st_after = os.fstat(fd)
        if (
            st_before.st_dev != st_after.st_dev
            or st_before.st_ino != st_after.st_ino
            or st_before.st_rdev != st_after.st_rdev
            or st_before.st_mode != st_after.st_mode
        ):
            raise CensusError("ext4_source_generation_changed")
    finally:
        os.close(fd)

    if len(raw) != EXT4_SUPERBLOCK_BYTES:
        raise CensusError("ext4_superblock_short_read")
    magic = struct.unpack_from("<H", raw, EXT4_SUPER_MAGIC_OFFSET)[0]
    log_block_size = struct.unpack_from("<I", raw, EXT4_LOG_BLOCK_SIZE_OFFSET)[0]
    incompat = struct.unpack_from("<I", raw, EXT4_FEATURE_INCOMPAT_OFFSET)[0]
    ro_compat = struct.unpack_from("<I", raw, EXT4_FEATURE_RO_COMPAT_OFFSET)[0]
    block_size = 1024 << log_block_size if log_block_size <= 6 else 0
    return {
        "magic": magic,
        "magic_valid": magic == EXT4_SUPER_MAGIC,
        "block_size": block_size,
        "feature_incompat": incompat,
        "feature_ro_compat": ro_compat,
        "extents_enabled": bool(incompat & EXT4_FEATURE_INCOMPAT_EXTENTS),
        "verity_feature_enabled": bool(ro_compat & EXT4_FEATURE_RO_COMPAT_VERITY),
    }


def _synthetic_ext4_superblock(*, verity: bool, extents: bool) -> bytes:
    raw = bytearray(EXT4_SUPERBLOCK_BYTES)
    struct.pack_into("<H", raw, EXT4_SUPER_MAGIC_OFFSET, EXT4_SUPER_MAGIC)
    struct.pack_into("<I", raw, EXT4_LOG_BLOCK_SIZE_OFFSET, 2)
    struct.pack_into(
        "<I",
        raw,
        EXT4_FEATURE_INCOMPAT_OFFSET,
        EXT4_FEATURE_INCOMPAT_EXTENTS if extents else 0,
    )
    struct.pack_into(
        "<I",
        raw,
        EXT4_FEATURE_RO_COMPAT_OFFSET,
        EXT4_FEATURE_RO_COMPAT_VERITY if verity else 0,
    )
    return bytes(raw)


def _parse_ext4_superblock_bytes(raw: bytes) -> dict[str, Any]:
    if len(raw) != EXT4_SUPERBLOCK_BYTES:
        raise CensusError("synthetic_ext4_superblock_size")
    magic = struct.unpack_from("<H", raw, EXT4_SUPER_MAGIC_OFFSET)[0]
    log_block_size = struct.unpack_from("<I", raw, EXT4_LOG_BLOCK_SIZE_OFFSET)[0]
    incompat = struct.unpack_from("<I", raw, EXT4_FEATURE_INCOMPAT_OFFSET)[0]
    ro_compat = struct.unpack_from("<I", raw, EXT4_FEATURE_RO_COMPAT_OFFSET)[0]
    return {
        "magic_valid": magic == EXT4_SUPER_MAGIC,
        "block_size": 1024 << log_block_size if log_block_size <= 6 else 0,
        "extents_enabled": bool(incompat & EXT4_FEATURE_INCOMPAT_EXTENTS),
        "verity_feature_enabled": bool(ro_compat & EXT4_FEATURE_RO_COMPAT_VERITY),
    }



def _classify_ext4_dax_policy(
    mount_options: tuple[str, ...],
    super_options: tuple[str, ...],
) -> dict[str, Any]:
    tokens = tuple(
        option
        for option in (*mount_options, *super_options)
        if option == "dax" or option.startswith("dax=")
    )
    modes: list[str] = []
    unknown = False
    for option in tokens:
        if option == "dax" or option == "dax=always":
            modes.append("always")
        elif option == "dax=never":
            modes.append("never")
        elif option == "dax=inode":
            modes.append("inode")
        else:
            unknown = True

    if unknown:
        policy = "unknown"
    elif not modes:
        policy = "inode"
    elif len(set(modes)) != 1:
        policy = "ambiguous"
    else:
        policy = modes[0]

    return {
        "tokens": tokens,
        "policy": policy,
        "policy_source": "default" if not tokens else "explicit",
        "disabled_proven": policy == "never",
        "forced": policy == "always",
    }

def collect() -> dict[str, Any]:
    if socket.gethostname() != EXPECTED_HOSTNAME:
        raise CensusError("wrong_host")
    if os.getuid() == 0 or os.geteuid() == 0:
        raise CensusError("root_execution_forbidden_for_untrusted_checkout_census")

    target_path, target_identity = _canonical_target(TARGET)
    mountinfo = _read_fd_bounded(pathlib.Path("/proc/self/mountinfo"), MAX_PROC_BYTES)
    rows = _parse_mountinfo(mountinfo.decode("utf-8", "strict"))
    mount = _mount_for_target(rows, target_path, target_identity[0])
    fstype = str(mount["fstype"])
    source = str(mount["source"])
    expected_major_minor = _parse_major_minor(str(mount["major_minor"]))
    mount_options = tuple(str(x) for x in mount["mount_options"])
    super_options = tuple(str(x) for x in mount["super_options"])
    read_only_mount = "ro" in mount_options or "ro" in super_options
    dax = _classify_ext4_dax_policy(mount_options, super_options)
    dax_requested = bool(dax["tokens"])
    dax_policy = str(dax["policy"])
    dax_disabled_proven = bool(dax["disabled_proven"])

    config_text, config_source = _read_config_text()
    config_fs_verity = _kernel_config_value(config_text, "CONFIG_FS_VERITY")
    fsverity_module_present = pathlib.Path("/sys/module/fsverity").is_dir()
    kernel_support_observed = config_fs_verity == "y" or (
        config_fs_verity == "m" and fsverity_module_present
    )
    filesystems = _proc_filesystems()
    fs_driver_present = fstype in filesystems
    documented_fs_class = fstype in SUPPORTED_FS_TYPES

    device, device_status = _source_block_device(source, expected_major_minor)
    ext4: dict[str, Any] = {
        "applicable": fstype == "ext4",
        "source_device_status": device_status,
        "source_device": os.fspath(device) if device is not None else None,
        "magic_valid": False,
        "block_size": None,
        "extents_enabled": False,
        "verity_feature_enabled": False,
        "feature_probe_error": None,
    }
    if fstype == "ext4" and device is not None:
        try:
            observed = _read_ext4_superblock(device, expected_major_minor)
            ext4.update({
                "magic_valid": bool(observed["magic_valid"]),
                "block_size": int(observed["block_size"]),
                "extents_enabled": bool(observed["extents_enabled"]),
                "verity_feature_enabled": bool(observed["verity_feature_enabled"]),
            })
        except PermissionError as exc:
            ext4["source_device_status"] = "permission_denied_read"
            ext4["feature_probe_error"] = "errno_" + str(exc.errno)
        except (OSError, CensusError) as exc:
            ext4["feature_probe_error"] = str(exc)

    closing_target_path, closing_target_identity = _canonical_target(TARGET)
    target_generation_stable = (
        closing_target_path == target_path
        and closing_target_identity == target_identity
    )
    closing_mountinfo = _read_fd_bounded(
        pathlib.Path("/proc/self/mountinfo"), MAX_PROC_BYTES
    )
    closing_rows = _parse_mountinfo(closing_mountinfo.decode("utf-8", "strict"))
    closing_mount = _mount_for_target(
        closing_rows, closing_target_path, closing_target_identity[0]
    )
    mount_generation_stable = target_generation_stable and mount == closing_mount

    authoritative_ext4_ready = (
        fstype == "ext4"
        and target_generation_stable
        and mount_generation_stable
        and not read_only_mount
        and dax_disabled_proven
        and kernel_support_observed
        and fs_driver_present
        and ext4["source_device_status"] == "ok"
        and ext4["magic_valid"] is True
        and ext4["extents_enabled"] is True
        and ext4["verity_feature_enabled"] is True
    )

    reasons: list[str] = []
    if not target_generation_stable:
        reasons.append("target_path_generation_changed")
    if not mount_generation_stable:
        reasons.append("target_mount_generation_changed")
    if fstype != "ext4":
        reasons.append("authoritative_v1_probe_supports_ext4_only")
    if read_only_mount:
        reasons.append("target_mount_read_only")
    if fstype == "ext4" and not dax_disabled_proven:
        if dax_policy == "always":
            reasons.append("ext4_dax_forced_always")
        elif dax_policy == "inode":
            reasons.append("ext4_dax_inode_policy_unproven")
        elif dax_policy == "ambiguous":
            reasons.append("ext4_dax_policy_ambiguous")
        else:
            reasons.append("ext4_dax_policy_unknown")
    if not kernel_support_observed:
        reasons.append("kernel_fsverity_support_not_proven")
    if not fs_driver_present:
        reasons.append("mounted_filesystem_driver_not_listed")
    if fstype == "ext4":
        if ext4["source_device_status"] != "ok" or ext4["feature_probe_error"] is not None:
            reasons.append("ext4_source_block_device_not_readable_unprivileged")
        if ext4["magic_valid"] is not True:
            reasons.append("ext4_superblock_magic_not_proven")
        if ext4["extents_enabled"] is not True:
            reasons.append("ext4_extents_feature_not_proven")
        if ext4["verity_feature_enabled"] is not True:
            reasons.append("ext4_verity_feature_not_enabled")

    return {
        "marker": MARKER,
        "host": {
            "hostname": socket.gethostname(),
            "hostname_matches_precision": True,
            "uid": os.getuid(),
            "euid": os.geteuid(),
        },
        "kernel": {
            "release": os.uname().release,
            "config_source": config_source,
            "config_fs_verity": config_fs_verity,
            "fsverity_module_present": fsverity_module_present,
            "fsverity_support_observed": kernel_support_observed,
        },
        "target": {
            "path": os.fspath(TARGET),
            "canonical_path": os.fspath(target_path),
            "canonical_path_required": True,
            "target_generation_stable": target_generation_stable,
            "mount_point": mount["mount_point"],
            "fstype": fstype,
            "source": source,
            "mount_options": mount_options,
            "super_options": super_options,
            "read_only": read_only_mount,
            "dax_requested": dax_requested,
            "dax_options": dax["tokens"],
            "dax_policy": dax_policy,
            "dax_policy_source": dax["policy_source"],
            "dax_disabled_proven": dax_disabled_proven,
            "documented_fsverity_filesystem_class": documented_fs_class,
            "filesystem_driver_present": fs_driver_present,
            "mount_generation_stable": mount_generation_stable,
            "major_minor": mount["major_minor"],
        },
        "ext4": ext4,
        "host_fsverity_capability_green": authoritative_ext4_ready,
        "hold_reasons": tuple(reasons),
    }


def _emit_false_authority() -> None:
    print("read_only=true")
    print("filesystem_write=false")
    print("mount_mutation=false")
    print("permission_mutation=false")
    print("block_device_write=false")
    print("fsverity_enablement=false")
    print("protected_host_install=false")
    print("protected_v4_apply=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_or_liquidity_action=false")
    print("funds_movement=false")


def plan() -> int:
    print(MARKER)
    print("mode=--plan")
    _emit_false_authority()
    print("designated_host=" + EXPECTED_HOSTNAME)
    print("target=/opt")
    print("sudo_required=false")
    print("root_execution_forbidden=true")
    print("target_canonical_path_required=true")
    print("terminal_target_generation_revalidation_required=true")
    print("external_subprocess=false")
    print("ioctl_invocation=false")
    print("ext4_superblock_read_only_feature_probe=true")
    print("dax_admission_requires_explicit_never=true")
    print("next_action=RUN_UNPRIVILEGED_READ_ONLY_FSVERITY_CAPABILITY_CENSUS_ON_PRECISION")
    return 0


def run() -> int:
    try:
        result = collect()
    except (OSError, UnicodeError, CensusError) as exc:
        print(MARKER)
        print("mode=--run")
        _emit_false_authority()
        print("status=HOLD")
        print("reason=" + str(exc))
        return 2

    print(MARKER)
    print("mode=--run")
    _emit_false_authority()
    print("status=" + ("GREEN" if result["host_fsverity_capability_green"] else "HOLD"))
    print("kernel_release=" + result["kernel"]["release"])
    print("kernel_config_source=" + result["kernel"]["config_source"])
    print("kernel_config_fs_verity=" + result["kernel"]["config_fs_verity"])
    print("kernel_fsverity_support_observed=" + str(result["kernel"]["fsverity_support_observed"]).lower())
    print("target_canonical_path=" + str(result["target"]["canonical_path"]))
    print("target_generation_stable=" + str(result["target"]["target_generation_stable"]).lower())
    print("mount_point=" + str(result["target"]["mount_point"]))
    print("mount_fstype=" + result["target"]["fstype"])
    print("mount_source=" + result["target"]["source"])
    print("mount_read_only=" + str(result["target"]["read_only"]).lower())
    print("mount_dax_requested=" + str(result["target"]["dax_requested"]).lower())
    print("mount_dax_policy=" + str(result["target"]["dax_policy"]))
    print("mount_dax_policy_source=" + str(result["target"]["dax_policy_source"]))
    print("mount_dax_disabled_proven=" + str(result["target"]["dax_disabled_proven"]).lower())
    print("filesystem_driver_present=" + str(result["target"]["filesystem_driver_present"]).lower())
    print("mount_major_minor=" + str(result["target"]["major_minor"]))
    print("mount_generation_stable=" + str(result["target"]["mount_generation_stable"]).lower())
    print("documented_fsverity_filesystem_class=" + str(result["target"]["documented_fsverity_filesystem_class"]).lower())
    print("ext4_source_device_status=" + result["ext4"]["source_device_status"])
    print("ext4_source_device=" + str(result["ext4"]["source_device"]))
    print("ext4_superblock_magic_valid=" + str(result["ext4"]["magic_valid"]).lower())
    print("ext4_block_size=" + str(result["ext4"]["block_size"]))
    print("ext4_extents_feature_enabled=" + str(result["ext4"]["extents_enabled"]).lower())
    print("ext4_verity_feature_enabled=" + str(result["ext4"]["verity_feature_enabled"]).lower())
    print("host_fsverity_capability_green=" + str(result["host_fsverity_capability_green"]).lower())
    print("hold_reasons_json=" + json.dumps(result["hold_reasons"], separators=(",", ":")))
    print(
        "next_action="
        + (
            "REVIEW_CENSUS_THEN_PREPARE_SEPARATE_FSVERITY_HOST_INSTALLER"
            if result["host_fsverity_capability_green"]
            else (
                "HOLD_PRIVILEGED_FEATURE_PROBE_REQUIRES_TRUSTED_FIRST_INSTRUCTION"
                if result["target"]["fstype"] == "ext4"
                and (
                    result["ext4"]["source_device_status"] != "ok"
                    or result["ext4"]["feature_probe_error"] is not None
                )
                else "HOLD_REVIEW_FSVERITY_CAPABILITY"
            )
        )
    )
    return 0 if result["host_fsverity_capability_green"] else 2


def self_test() -> int:
    mountinfo = (
        "36 25 8:2 / / rw,relatime shared:1 - ext4 /dev/sda2 rw,errors=remount-ro\n"
        "40 36 8:3 / /opt rw,nosuid,nodev - ext4 /dev/sda3 rw\n"
    )
    rows = _parse_mountinfo(mountinfo)
    row = _mount_for_target(
        rows, pathlib.Path("/opt/example"), os.makedev(8, 3)
    )
    assert row["mount_point"] == "/opt"
    assert row["fstype"] == "ext4"
    assert row["source"] == "/dev/sda3"

    stacked = _parse_mountinfo(
        "36 25 8:2 / / rw,relatime shared:1 - ext4 /dev/sda2 rw,errors=remount-ro\n"
        "40 36 8:3 / /opt rw,nosuid,nodev - ext4 /dev/sda3 rw\n"
        "41 36 0:42 / /opt rw,nosuid,nodev - tmpfs tmpfs rw\n"
    )
    visible = _mount_for_target(
        stacked, pathlib.Path("/opt/example"), os.makedev(0, 42)
    )
    assert visible["mount_id"] == "41"
    assert visible["fstype"] == "tmpfs"

    ambiguous = _parse_mountinfo(
        "36 25 8:2 / / rw - ext4 /dev/sda2 rw\n"
        "40 36 8:3 / /opt rw - ext4 /dev/sda3 rw\n"
        "41 36 8:3 / /opt rw - ext4 /dev/sda3 rw\n"
    )
    try:
        _mount_for_target(
            ambiguous, pathlib.Path("/opt/example"), os.makedev(8, 3)
        )
    except CensusError as exc:
        assert str(exc) == "target_mount_selection_ambiguous"
    else:
        raise AssertionError("stacked_mount_ambiguity_not_rejected")
    assert _parse_major_minor(row["major_minor"]) == (8, 3)
    try:
        _parse_major_minor("bad")
    except CensusError:
        pass
    else:
        raise AssertionError("invalid_major_minor_not_rejected")

    good = _parse_ext4_superblock_bytes(
        _synthetic_ext4_superblock(verity=True, extents=True)
    )
    assert good["magic_valid"] is True
    assert good["block_size"] == 4096
    assert good["verity_feature_enabled"] is True
    assert good["extents_enabled"] is True

    no_verity = _parse_ext4_superblock_bytes(
        _synthetic_ext4_superblock(verity=False, extents=True)
    )
    assert no_verity["verity_feature_enabled"] is False
    assert no_verity["extents_enabled"] is True

    assert _kernel_config_value("CONFIG_FS_VERITY=y\n", "CONFIG_FS_VERITY") == "y"
    assert _kernel_config_value("# CONFIG_FS_VERITY is not set\n", "CONFIG_FS_VERITY") == "n"
    assert _decode_mount_field("/a\\040b") == "/a b"

    assert _classify_ext4_dax_policy((), ()) == {
        "tokens": (),
        "policy": "inode",
        "policy_source": "default",
        "disabled_proven": False,
        "forced": False,
    }
    assert _classify_ext4_dax_policy(("rw", "dax=never"), ("rw",)) == {
        "tokens": ("dax=never",),
        "policy": "never",
        "policy_source": "explicit",
        "disabled_proven": True,
        "forced": False,
    }
    assert _classify_ext4_dax_policy(("dax",), ())["policy"] == "always"
    assert _classify_ext4_dax_policy(("dax=always",), ())["forced"] is True
    assert _classify_ext4_dax_policy(("dax=inode",), ())["policy"] == "inode"
    assert _classify_ext4_dax_policy(("dax=never",), ("dax=always",))["policy"] == "ambiguous"
    assert _classify_ext4_dax_policy(("dax=future",), ())["policy"] == "unknown"

    print(MARKER + "_SELF_TEST_GREEN")
    print("target_canonical_path_required=true")
    print("terminal_target_generation_revalidation_required=true")
    print("target_mount_st_dev_binding_required=true")
    print("stacked_mount_ambiguity_rejected=true")
    print("mountinfo_longest_prefix_selection_proven=true")
    print("mountinfo_escape_decoding_proven=true")
    print("mountinfo_device_number_binding_required=true")
    print("terminal_mountinfo_revalidation_required=true")
    print("ext4_superblock_magic_bound=true")
    print("ext4_verity_ro_compat_bit_bound=true")
    print("ext4_extents_incompat_bit_bound=true")
    print("kernel_config_fsverity_parser_bound=true")
    print("ext4_dax_policy_fail_closed=true")
    print("kernel_config_gzip_output_bounded=true")
    print("kernel_config_malformed_deflate_hold=true")
    print("external_subprocess=false")
    print("ioctl_invocation=false")
    _emit_false_authority()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(add_help=True)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--plan", action="store_true")
    group.add_argument("--run", action="store_true")
    group.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.plan:
        return plan()
    if args.run:
        return run()
    return self_test()


if __name__ == "__main__":
    raise SystemExit(main())
