#!/usr/bin/env python3
from __future__ import annotations

import argparse
import errno
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import stat
import struct
import zipfile

MARKER = "VOID_BUY_VOID_V7_HOST_CAPABILITY_CENSUS_V1"
SCHEMA = "void_buy_void_v7_host_capability_census_v1"

EXPECTED_LAUNCHER_HEAD = "08356a62bdea145b716c9f4fe1ddbda8fe6800e4"
STATIC_LAUNCHER_SHA256 = "5e9a5d70b54632b3247184cd9d20df15e43f69ec3ebbd82d4444487d1cbb4a00"
LANDING_BASE_MAIN = "b6eeb1f0b8d80ab26df6d965a1b5f4f861e6a52a"
LIVE_SOURCE_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
DEFAULT_FSVERITY_PROBE = Path(
    "/opt/void-node-live/releases/" + LIVE_SOURCE_HEAD + "/package.json"
)
TARGET_PARENT = Path("/opt")

FS_IOC_MEASURE_VERITY = 0xC0046686
FS_VERITY_HASH_ALG_SHA256 = 1
MAX_CANDIDATE_BYTES = 512 * 1024 * 1024
MAX_ZIP_ENTRIES = 100_000
MAX_ZIP_CENTRAL_DIR_BYTES = 16 * 1024 * 1024

REQUIRED_STDLIB_PATHS = (
    "argparse.py",
    "ctypes/__init__.py",
    "hashlib.py",
    "json/__init__.py",
    "pathlib.py",
    "shutil.py",
    "stat.py",
    "subprocess.py",
    "tempfile.py",
    "typing.py",
)

class CensusError(RuntimeError):
    pass

def canonical(obj: object) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True)

def file_identity(st: os.stat_result) -> tuple[int, ...]:
    return (
        st.st_dev, st.st_ino, st.st_mode, st.st_uid, st.st_gid, st.st_nlink,
        st.st_size, st.st_mtime_ns, st.st_ctime_ns,
    )

def open_regular_readonly(path: Path, *, maximum: int) -> tuple[int, os.stat_result]:
    before = os.lstat(path)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink < 1
        or before.st_size < 0
        or before.st_size > maximum
    ):
        raise CensusError("candidate_regular_file_shape_invalid:" + os.fspath(path))
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        opened = os.fstat(fd)
        visible = os.lstat(path)
        if file_identity(opened) != file_identity(before) or file_identity(visible) != file_identity(before):
            raise CensusError("candidate_generation_rebound:" + os.fspath(path))
        return fd, before
    except BaseException:
        os.close(fd)
        raise

def hash_fd(fd: int, *, expected_size: int) -> str:
    os.lseek(fd, 0, os.SEEK_SET)
    h = hashlib.sha256()
    remaining = expected_size
    while remaining:
        chunk = os.read(fd, min(1024 * 1024, remaining))
        if not chunk:
            raise CensusError("candidate_short_read")
        h.update(chunk)
        remaining -= len(chunk)
    if os.read(fd, 1):
        raise CensusError("candidate_grew_during_hash")
    return h.hexdigest()

def revalidate(path: Path, fd: int, expected: os.stat_result) -> None:
    if (
        file_identity(os.fstat(fd)) != file_identity(expected)
        or file_identity(os.lstat(path)) != file_identity(expected)
    ):
        raise CensusError("candidate_generation_changed:" + os.fspath(path))

def parse_static_elf64_x86_64(fd: int, size: int) -> dict[str, object]:
    if size < 64:
        raise CensusError("python_elf_too_small")
    header = os.pread(fd, 64, 0)
    if len(header) != 64:
        raise CensusError("python_elf_header_short")
    fields = struct.unpack("<16sHHIQQQIHHHHHH", header)
    ident = fields[0]
    e_type = fields[1]
    e_machine = fields[2]
    e_phoff = fields[5]
    e_ehsize = fields[8]
    e_phentsize = fields[9]
    e_phnum = fields[10]
    if (
        ident[:4] != b"\x7fELF"
        or ident[4] != 2
        or ident[5] != 1
        or e_type != 2
        or e_machine != 62
        or e_ehsize != 64
        or e_phentsize != 56
        or e_phnum < 1
    ):
        raise CensusError("python_static_elf_identity_invalid")
    end = e_phoff + e_phentsize * e_phnum
    if e_phoff < 64 or end > size:
        raise CensusError("python_elf_program_headers_out_of_bounds")
    types: list[int] = []
    for index in range(e_phnum):
        raw = os.pread(fd, 56, e_phoff + index * 56)
        if len(raw) != 56:
            raise CensusError("python_elf_program_header_short")
        types.append(struct.unpack_from("<I", raw, 0)[0])
    if 1 not in types:
        raise CensusError("python_elf_pt_load_required")
    if 3 in types:
        raise CensusError("python_elf_pt_interp_forbidden")
    if 2 in types:
        raise CensusError("python_elf_pt_dynamic_forbidden")
    return {
        "elf64": True,
        "machine": "x86_64",
        "type": "ET_EXEC",
        "pt_load": True,
        "pt_interp": False,
        "pt_dynamic": False,
        "program_header_count": e_phnum,
    }

def normalize_zip_name(name: str) -> str:
    if "\\" in name or "\x00" in name or name.startswith("/"):
        raise CensusError("stdlib_zip_path_invalid")
    p = PurePosixPath(name)
    # PurePosixPath removes ./, repeated separators and trailing slashes.
    # Reject those raw spellings rather than counting renamed ZIP entries.
    if (
        not name
        or name != p.as_posix()
        or any(part in ("", ".", "..") for part in name.split("/"))
    ):
        raise CensusError("stdlib_zip_path_invalid")
    return name

def canonical_zip_member(info: zipfile.ZipInfo) -> str:
    original = info.orig_filename
    visible = info.filename
    if original != visible:
        raise CensusError("stdlib_zip_filename_sanitized_or_truncated")
    raw_name = original[:-1] if info.is_dir() and original.endswith("/") else original
    return normalize_zip_name(raw_name)

def inspect_stdlib_zip_infos(infos: list[zipfile.ZipInfo]) -> dict[str, object]:
    if not infos or len(infos) > MAX_ZIP_ENTRIES:
        raise CensusError("stdlib_zip_entry_count_invalid")
    names: set[str] = set()
    regular_files: set[str] = set()
    duplicate = False
    symlink = False
    lib_dynload = False
    for info in infos:
        name = canonical_zip_member(info)
        if name in names:
            duplicate = True
        names.add(name)
        unix_mode = (info.external_attr >> 16) & 0xFFFF
        if stat.S_ISLNK(unix_mode):
            symlink = True
        elif info.is_dir():
            # A trailing slash alone does not prove the encoded type is a
            # directory. Reject a FIFO/device/socket or explicit regular file
            # masquerading as a directory entry.
            if stat.S_IFMT(unix_mode) not in (0, stat.S_IFDIR):
                raise CensusError("stdlib_zip_nonregular_file_forbidden")
        else:
            # ZIPs may omit the type bits; absent type or regular is allowed.
            # All other explicit types are refused. A directory suffix never
            # counts as a required .py file.
            if stat.S_IFMT(unix_mode) not in (0, stat.S_IFREG):
                raise CensusError("stdlib_zip_nonregular_file_forbidden")
            regular_files.add(name)
        if name == "lib-dynload" or name.startswith("lib-dynload/"):
            lib_dynload = True
    missing = [name for name in REQUIRED_STDLIB_PATHS if name not in regular_files]
    if duplicate:
        raise CensusError("stdlib_zip_duplicate_path")
    if symlink:
        raise CensusError("stdlib_zip_symlink_forbidden")
    if lib_dynload:
        raise CensusError("stdlib_zip_lib_dynload_forbidden")
    return {
        "entry_count": len(names),
        "required_paths_present": not missing,
        "missing_required_paths": missing,
        "lib_dynload_absent": True,
        "symlinks_absent": True,
        "duplicates_absent": True,
    }

def preflight_zip_central_directory(fd: int, size: int) -> int:
    # zipfile.ZipFile eagerly materializes *every* central-directory entry.
    # Validate the archive structure and count by bounded descriptor reads
    # BEFORE constructing any ZipInfo objects.
    if size < 22:
        raise CensusError("stdlib_zip_end_record_invalid")
    tail_size = min(size, 22 + 65535)
    tail = os.pread(fd, tail_size, size - tail_size)
    at = tail.rfind(b"PK\x05\x06")
    if at < 0 or at + 22 > len(tail):
        raise CensusError("stdlib_zip_end_record_invalid")
    (_, disk, cd_disk, disk_entries, entries,
     cd_size, cd_offset, comment_bytes) = struct.unpack_from("<4s4H2IH", tail, at)
    if (
        at + 22 + comment_bytes != len(tail)
        or disk != 0 or cd_disk != 0 or disk_entries != entries
    ):
        raise CensusError("stdlib_zip_end_record_invalid")
    # This census intentionally refuses ZIP64/multidisk/huge directories.
    # Those features are unnecessary for the bounded static stdlib candidate.
    if (
        entries < 1 or entries > MAX_ZIP_ENTRIES or entries == 65535
        or cd_size > MAX_ZIP_CENTRAL_DIR_BYTES
        or cd_size == 0xFFFFFFFF or cd_offset == 0xFFFFFFFF
    ):
        raise CensusError("stdlib_zip_directory_bounds_invalid")
    eocd_offset = size - tail_size + at
    if cd_size < 46 * entries or cd_offset + cd_size != eocd_offset:
        raise CensusError("stdlib_zip_directory_bounds_invalid")
    pos = cd_offset
    for _ in range(entries):
        if pos + 46 > eocd_offset:
            raise CensusError("stdlib_zip_directory_bounds_invalid")
        header = os.pread(fd, 46, pos)
        if len(header) != 46 or header[:4] != b"PK\x01\x02":
            raise CensusError("stdlib_zip_directory_entry_invalid")
        name_bytes, extra_bytes, comment_size = struct.unpack_from("<HHH", header, 28)
        disk_start = struct.unpack_from("<H", header, 34)[0]
        if name_bytes == 0 or disk_start != 0:
            raise CensusError("stdlib_zip_directory_entry_invalid")
        pos += 46 + name_bytes + extra_bytes + comment_size
        if pos > eocd_offset:
            raise CensusError("stdlib_zip_directory_bounds_invalid")
    if pos != eocd_offset:
        raise CensusError("stdlib_zip_directory_count_invalid")
    return entries

def inspect_stdlib_zip(path: Path, fd: int, expected: os.stat_result) -> dict[str, object]:
    expected_entries = preflight_zip_central_directory(fd, expected.st_size)
    file_obj = os.fdopen(os.dup(fd), "rb", closefd=True)
    with file_obj:
        try:
            with zipfile.ZipFile(file_obj, "r") as zf:
                result = inspect_stdlib_zip_infos(zf.infolist())
        except (zipfile.BadZipFile, UnicodeError, NotImplementedError) as exc:
            # ZIP central-directory names are untrusted. A UTF-8-flagged
            # member with invalid bytes raises UnicodeDecodeError before
            # in-tree member validation; normalize it to machine-readable
            # HOLD instead of leaking a traceback.
            raise CensusError("stdlib_zip_invalid") from exc
    if result["entry_count"] != expected_entries:
        raise CensusError("stdlib_zip_directory_count_invalid")
    revalidate(path, fd, expected)
    return result

def classify_verity_errno(code: int) -> dict[str, object]:
    if code == errno.ENODATA:
        return {
            "state": "supported_not_enabled_on_probe",
            "supported": True,
            "probe_verity_enabled": False,
            "errno": "ENODATA",
        }
    if code == errno.ENOTTY:
        return {
            "state": "filesystem_does_not_implement_fsverity",
            "supported": False,
            "probe_verity_enabled": False,
            "errno": "ENOTTY",
        }
    if code == errno.EOPNOTSUPP:
        return {
            "state": "kernel_or_superblock_fsverity_unavailable",
            "supported": False,
            "probe_verity_enabled": False,
            "errno": "EOPNOTSUPP",
        }
    if code == errno.EOVERFLOW:
        return {
            "state": "verity_digest_larger_than_probe_buffer",
            "supported": True,
            "probe_verity_enabled": True,
            "errno": "EOVERFLOW",
        }
    return {
        "state": "verity_measure_unexpected_error",
        "supported": False,
        "probe_verity_enabled": False,
        "errno": errno.errorcode.get(code, "ERRNO_" + str(code)),
    }

def measure_verity(fd: int) -> dict[str, object]:
    buffer = bytearray(4 + 64)
    struct.pack_into("=HH", buffer, 0, 0, 64)
    try:
        fcntl.ioctl(fd, FS_IOC_MEASURE_VERITY, buffer, True)
    except OSError as exc:
        return classify_verity_errno(exc.errno if exc.errno is not None else -1)
    algorithm, digest_size = struct.unpack_from("=HH", buffer, 0)
    if digest_size > 64:
        raise CensusError("verity_digest_size_invalid")
    digest = bytes(buffer[4:4 + digest_size])
    return {
        "state": "probe_verity_enabled",
        "supported": True,
        "probe_verity_enabled": True,
        "algorithm": algorithm,
        "algorithm_is_sha256": algorithm == FS_VERITY_HASH_ALG_SHA256,
        "digest_size": digest_size,
        "digest_hex": digest.hex(),
    }

def mount_unescape(value: str) -> str:
    return (
        value.replace("\\040", " ")
        .replace("\\011", "\t")
        .replace("\\012", "\n")
        .replace("\\134", "\\")
    )

def parse_mountinfo(text: str, target: Path) -> dict[str, str]:
    target_text = os.path.abspath(os.fspath(target))
    best: tuple[int, dict[str, str]] | None = None
    for line in text.splitlines():
        left, sep, right = line.partition(" - ")
        if not sep:
            continue
        fields = left.split()
        after = right.split()
        if len(fields) < 6 or len(after) < 3:
            continue
        mountpoint = mount_unescape(fields[4])
        try:
            common = os.path.commonpath([target_text, mountpoint])
        except ValueError:
            continue
        if common != mountpoint:
            continue
        row = {
            "mountpoint": mountpoint,
            "fstype": after[0],
            "source": mount_unescape(after[1]),
            "mount_options": fields[5],
            "super_options": after[2],
        }
        score = len(mountpoint)
        if best is None or score > best[0]:
            best = (score, row)
    if best is None:
        raise CensusError("target_mount_not_found")
    return best[1]

def inspect_candidate(path: Path, *, kind: str) -> dict[str, object]:
    fd, st = open_regular_readonly(path, maximum=MAX_CANDIDATE_BYTES)
    try:
        digest = hash_fd(fd, expected_size=st.st_size)
        revalidate(path, fd, st)
        result: dict[str, object] = {
            "path": os.path.abspath(os.fspath(path)),
            "bytes": st.st_size,
            "sha256": digest,
            "uid": st.st_uid,
            "gid": st.st_gid,
            "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        }
        if kind == "python":
            result["static_elf"] = parse_static_elf64_x86_64(fd, st.st_size)
        elif kind == "stdlib":
            result["zip"] = inspect_stdlib_zip(path, fd, st)
        else:
            raise CensusError("candidate_kind_invalid")
        revalidate(path, fd, st)
        return result
    finally:
        os.close(fd)

def self_test() -> None:
    synthetic = bytearray(64 + 56)
    ident = bytearray(16)
    ident[:4] = b"\x7fELF"
    ident[4] = 2
    ident[5] = 1
    synthetic[:64] = struct.pack(
        "<16sHHIQQQIHHHHHH",
        bytes(ident), 2, 62, 1, 0, 64, 0, 0, 64, 56, 1, 0, 0, 0,
    )
    synthetic[64:120] = struct.pack("<IIQQQQQQ", 1, 5, 0, 0, 0, 0, 0, 0)
    fd = os.memfd_create("void-v7-census-selftest", os.MFD_CLOEXEC)
    try:
        os.write(fd, synthetic)
        parsed = parse_static_elf64_x86_64(fd, len(synthetic))
        assert parsed["pt_interp"] is False and parsed["pt_dynamic"] is False
    finally:
        os.close(fd)

    mount = parse_mountinfo(
        "1 0 8:1 / / rw - ext4 /dev/root rw\n"
        "2 1 8:2 / /opt rw - ext4 /dev/data rw,verity\n",
        Path("/opt/test"),
    )
    assert mount["mountpoint"] == "/opt" and mount["fstype"] == "ext4"
    assert classify_verity_errno(errno.ENODATA)["supported"] is True
    assert classify_verity_errno(errno.ENOTTY)["supported"] is False
    assert classify_verity_errno(errno.EOPNOTSUPP)["supported"] is False

    assert normalize_zip_name("json/__init__.py") == "json/__init__.py"
    for bad in ("../x", "/x", "a\\b"):
        try:
            normalize_zip_name(bad)
        except CensusError:
            pass
        else:
            raise AssertionError("invalid_zip_path_accepted:" + bad)

    truncated = zipfile.ZipInfo("argparse.py\x00../../x")
    assert truncated.orig_filename != truncated.filename
    try:
        canonical_zip_member(truncated)
    except CensusError as exc:
        assert str(exc) == "stdlib_zip_filename_sanitized_or_truncated"
    else:
        raise AssertionError("sanitized_zip_filename_accepted")

    normal = zipfile.ZipInfo("json/__init__.py")
    assert canonical_zip_member(normal) == "json/__init__.py"

    # Adversaries that previously passed required file-name presence checks.
    for malformed in ("./argparse.py", "json//__init__.py", "json/./__init__.py"):
        try:
            canonical_zip_member(zipfile.ZipInfo(malformed))
        except CensusError as exc:
            assert str(exc) == "stdlib_zip_path_invalid"
        else:
            raise AssertionError("noncanonical_zip_member_accepted:" + malformed)

    valid_file = zipfile.ZipInfo("argparse.py")
    directory_only = zipfile.ZipInfo("argparse.py/")
    assert "argparse.py" not in inspect_stdlib_zip_infos(
        [valid_file]
    )["missing_required_paths"]
    assert "argparse.py" in inspect_stdlib_zip_infos(
        [directory_only]
    )["missing_required_paths"]

    special_file = zipfile.ZipInfo("argparse.py")
    special_file.external_attr = (stat.S_IFDIR | 0o755) << 16
    try:
        inspect_stdlib_zip_infos([special_file])
    except CensusError as exc:
        assert str(exc) == "stdlib_zip_nonregular_file_forbidden"
    else:
        raise AssertionError("special_zip_member_accepted_as_regular")

    # The reverse mismatch must also be rejected: ZipInfo.is_dir() derives
    # solely from '/', while external_attr can advertise a FIFO or device.
    valid_directory = zipfile.ZipInfo("docs/")
    valid_directory.external_attr = (stat.S_IFDIR | 0o755) << 16
    assert inspect_stdlib_zip_infos([valid_directory])["entry_count"] == 1
    malformed_directory = zipfile.ZipInfo("docs/")
    malformed_directory.external_attr = (stat.S_IFIFO | 0o644) << 16
    try:
        inspect_stdlib_zip_infos([malformed_directory])
    except CensusError as exc:
        assert str(exc) == "stdlib_zip_nonregular_file_forbidden"
    else:
        raise AssertionError("special_zip_member_accepted_as_directory")

    # Construct a corrupt UTF-8-flagged central-directory filename entirely
    # in memory. No candidate file, ZIP payload or code is executed.
    utf8_archive = io.BytesIO()
    with zipfile.ZipFile(utf8_archive, "w", compression=zipfile.ZIP_STORED) as zf:
        zf.writestr("argparse.py", "synthetic")
    def expect_zip_hold(data: bytes | bytearray, expected_reason: str) -> None:
        archive_fd = os.memfd_create("void-v7-census-zip-adversary", os.MFD_CLOEXEC)
        try:
            os.write(archive_fd, data)
            try:
                inspect_stdlib_zip(
                    Path("/proc/self/fd/" + str(archive_fd)),
                    archive_fd,
                    os.fstat(archive_fd),
                )
            except CensusError as exc:
                assert str(exc) == expected_reason, str(exc)
            else:
                raise AssertionError("malformed_zip_escaped_hold:" + expected_reason)
        finally:
            os.close(archive_fd)

    good_zip = utf8_archive.getvalue()
    preflight_fd = os.memfd_create("void-v7-census-zip-positive", os.MFD_CLOEXEC)
    try:
        os.write(preflight_fd, good_zip)
        assert preflight_zip_central_directory(preflight_fd, len(good_zip)) == 1
    finally:
        os.close(preflight_fd)

    invalid_utf8 = bytearray(good_zip)
    central = invalid_utf8.find(b"PK\x01\x02")
    assert central >= 0
    flags = struct.unpack_from("<H", invalid_utf8, central + 8)[0]
    struct.pack_into("<H", invalid_utf8, central + 8, flags | 0x800)
    assert invalid_utf8[central + 46] == ord("a")
    invalid_utf8[central + 46] = 0xff
    expect_zip_hold(invalid_utf8, "stdlib_zip_invalid")

    unsupported_version = bytearray(good_zip)
    unsupported_version[central + 6] = 99
    expect_zip_hold(unsupported_version, "stdlib_zip_invalid")

    # Lying EOCD counts must fail before zipfile materializes ZipInfo objects.
    two_members = io.BytesIO()
    with zipfile.ZipFile(two_members, "w", compression=zipfile.ZIP_STORED) as zf:
        zf.writestr("argparse.py", "one")
        zf.writestr("hashlib.py", "two")
    miscounted = bytearray(two_members.getvalue())
    eocd = miscounted.rfind(b"PK\x05\x06")
    assert eocd >= 0
    struct.pack_into("<H", miscounted, eocd + 8, 1)
    struct.pack_into("<H", miscounted, eocd + 10, 1)
    expect_zip_hold(miscounted, "stdlib_zip_directory_count_invalid")

    oversized_directory = bytearray(good_zip)
    eocd = oversized_directory.rfind(b"PK\x05\x06")
    assert eocd >= 0
    struct.pack_into(
        "<I", oversized_directory, eocd + 12, MAX_ZIP_CENTRAL_DIR_BYTES + 1
    )
    expect_zip_hold(oversized_directory, "stdlib_zip_directory_bounds_invalid")

    print(MARKER + "_SELF_TEST_GREEN")
    print("unsanitized_zip_member_name_required=true")
    print("stdlib_zip_canonical_raw_components_required=true")
    print("stdlib_zip_required_regular_files_only=true")
    print("stdlib_zip_directory_suffix_mode_checked=true")
    print("stdlib_zip_invalid_utf8_names_hold=true")
    print("stdlib_zip_unsupported_versions_hold=true")
    print("stdlib_zip_directory_preflight_bounded=true")
    print("runtime_import_closure_proof_required=true")
    print("filesystem_write=false")
    print("protected_filesystem_mutation=false")
    print("fsverity_enablement=false")
    print("candidate_execution=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("signing=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")

def run(args: argparse.Namespace) -> int:
    target = Path(args.target_parent)
    probe = Path(args.fsverity_probe)
    result: dict[str, object] = {
        "schema": SCHEMA,
        "read_only": True,
        "expected_launcher_head": EXPECTED_LAUNCHER_HEAD,
        "static_launcher_sha256": STATIC_LAUNCHER_SHA256,
        "landing_base_main": LANDING_BASE_MAIN,
        "target_parent": os.path.abspath(os.fspath(target)),
        "fsverity_probe": os.path.abspath(os.fspath(probe)),
        "filesystem_write": False,
        "protected_filesystem_mutation": False,
        "fsverity_enablement": False,
        "candidate_execution": False,
        "service_mutation": False,
        "credential_access": False,
        "signing": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "funds_movement": False,
    }
    reasons: list[str] = []
    fsverity_supported = False
    python_shape_ok = False
    stdlib_shape_ok = False

    try:
        target_st = os.lstat(target)
        if not stat.S_ISDIR(target_st.st_mode) or stat.S_ISLNK(target_st.st_mode):
            raise CensusError("target_parent_not_physical_directory")
        with open("/proc/self/mountinfo", "r", encoding="utf-8", errors="strict") as stream:
            result["target_mount"] = parse_mountinfo(stream.read(), target)

        probe_fd, probe_st = open_regular_readonly(probe, maximum=MAX_CANDIDATE_BYTES)
        try:
            if probe_st.st_dev != target_st.st_dev:
                raise CensusError("fsverity_probe_not_on_target_filesystem")
            verity = measure_verity(probe_fd)
            result["fsverity"] = verity
        finally:
            os.close(probe_fd)
        fsverity_supported = bool(verity["supported"])
        if not fsverity_supported:
            reasons.append("target_filesystem_fsverity_unavailable")
    except (OSError, CensusError) as exc:
        result["fsverity_probe_error"] = str(exc)
        reasons.append("fsverity_probe_unavailable")

    if args.python_candidate:
        try:
            result["python_candidate"] = inspect_candidate(
                Path(args.python_candidate), kind="python"
            )
            python_shape_ok = True
        except (OSError, CensusError) as exc:
            result["python_candidate_error"] = str(exc)
            reasons.append("python_candidate_invalid")
    else:
        reasons.append("python_candidate_required")

    if args.stdlib_candidate:
        try:
            stdlib = inspect_candidate(Path(args.stdlib_candidate), kind="stdlib")
            result["stdlib_candidate"] = stdlib
            zip_info = stdlib.get("zip")
            if not isinstance(zip_info, dict) or not bool(zip_info.get("required_paths_present")):
                reasons.append("stdlib_required_paths_missing")
            else:
                stdlib_shape_ok = True
        except (OSError, CensusError) as exc:
            result["stdlib_candidate_error"] = str(exc)
            reasons.append("stdlib_candidate_invalid")
    else:
        reasons.append("stdlib_candidate_required")

    shape_observation_complete = (
        fsverity_supported and python_shape_ok and stdlib_shape_ok and not reasons
    )
    result["candidate_shape_observation_complete"] = shape_observation_complete
    result["runtime_import_closure_established"] = False
    if shape_observation_complete:
        reasons.append("static_python_runtime_generation_proof_required")

    result["reasons"] = sorted(set(reasons))
    result["status"] = "HOLD"
    result["next_action"] = (
        "DERIVE_V7_STATIC_PYTHON_RUNTIME_GENERATION_PROOF"
        if result["reasons"] == ["static_python_runtime_generation_proof_required"]
        else "SATISFY_V7_HOST_CAPABILITY_HOLDS"
    )

    print(MARKER)
    print("status=HOLD")
    print("result_json=" + canonical(result))
    return 2

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--target-parent", default=os.fspath(TARGET_PARENT))
    parser.add_argument("--fsverity-probe", default=os.fspath(DEFAULT_FSVERITY_PROBE))
    parser.add_argument("--python-candidate")
    parser.add_argument("--stdlib-candidate")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    return run(args)

if __name__ == "__main__":
    raise SystemExit(main())
