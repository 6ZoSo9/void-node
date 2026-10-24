#!/usr/bin/env python3
# Read-only closed-Python runtime census for custody V3 protected first entry.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_CLOSED_PYTHON_RUNTIME_CENSUS_V1"
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
        print("production_explicit_filesystem_write=false")
        print("protected_install_authorized=false")
        print("funds_movement=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_nobytecode_mode_required")

import argparse
import errno
import fcntl
import hashlib
import json
import os
from pathlib import Path
import stat
import struct
import subprocess
import tempfile
from typing import Any

MARKER = _BOOTSTRAP_MARKER
SCHEMA = "void_buy_void_custody_runtime_v3_closed_python_runtime_census_v1"
VERSION = 1
ROOT = Path(__file__).resolve().parents[2]

FIRST_ENTRY_LOCK_REL = (
    "ops/security/"
    "buy-void-allocation-custody-runtime-v3-installer-first-entry-lock-v2.json"
)
FIRST_ENTRY_LOCK_BLOB = "36d6c4a5ff825993371f109ee86a77b601e12d07"

RUNTIME_ROOT = Path("/opt/void-buy-void-v7-python-runtime-v1")
RUNTIME_BIN = RUNTIME_ROOT / "bin"
RUNTIME_LIB = RUNTIME_ROOT / "lib"
PYTHON = RUNTIME_BIN / "python3.12-static"
STDLIB_ZIP = RUNTIME_LIB / "python312.zip"

EXPECTED_ROOT_ENTRIES = ("bin", "lib")
EXPECTED_BIN_ENTRIES = ("python3.12-static",)
EXPECTED_LIB_ENTRIES = ("python312.zip",)

FS_IOC_MEASURE_VERITY = 0xC0046686
FS_VERITY_HASH_ALG_SHA256 = 1
MAX_LOCK_BYTES = 256 * 1024
MAX_PYTHON_BYTES = 256 * 1024 * 1024
MAX_STDLIB_BYTES = 128 * 1024 * 1024
MAX_PROBE_OUTPUT = 256 * 1024
MAX_DIR_ENTRIES = 16


class CensusHold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise CensusHold("custody_closed_python_runtime_" + reason)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


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


def _leaf_flags() -> int:
    required = (
        getattr(os, "O_RDONLY", None),
        getattr(os, "O_NOFOLLOW", None),
        getattr(os, "O_NONBLOCK", None),
        getattr(os, "O_CLOEXEC", 0),
    )
    if any(type(v) is not int for v in required):
        hold("descriptor_capability_invalid")
    return (
        os.O_RDONLY
        | os.O_NOFOLLOW
        | os.O_NONBLOCK
        | getattr(os, "O_CLOEXEC", 0)
    )


def _directory_flags() -> int:
    required = (
        getattr(os, "O_RDONLY", None),
        getattr(os, "O_DIRECTORY", None),
        getattr(os, "O_NOFOLLOW", None),
        getattr(os, "O_NONBLOCK", None),
        getattr(os, "O_CLOEXEC", 0),
    )
    if any(type(v) is not int for v in required):
        hold("descriptor_capability_invalid")
    return (
        os.O_RDONLY
        | os.O_DIRECTORY
        | os.O_NOFOLLOW
        | os.O_NONBLOCK
        | getattr(os, "O_CLOEXEC", 0)
    )


def _read_bound_regular(path: Path, maximum: int) -> tuple[bytes, os.stat_result]:
    before = os.stat(path, follow_symlinks=False)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_size < 1
        or before.st_size > maximum
    ):
        hold("regular_shape_invalid:" + path.name)
    fd = os.open(path, _leaf_flags())
    try:
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            hold("regular_rebound:" + path.name)
        raw = bytearray()
        while len(raw) <= maximum:
            remaining = maximum + 1 - len(raw)
            chunk = os.read(fd, min(65536, remaining))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > maximum:
            hold("regular_read_limit:" + path.name)
        if len(raw) != opened.st_size:
            hold("regular_size_changed:" + path.name)
        after = os.fstat(fd)
        visible = os.stat(path, follow_symlinks=False)
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("regular_generation_changed:" + path.name)
        return bytes(raw), after
    finally:
        os.close(fd)


def _validate_first_entry_lock() -> dict[str, Any]:
    raw, _ = _read_bound_regular(ROOT / FIRST_ENTRY_LOCK_REL, MAX_LOCK_BYTES)
    if git_blob(raw) != FIRST_ENTRY_LOCK_BLOB:
        hold("first_entry_lock_blob_mismatch")
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        hold("first_entry_lock_json_invalid:" + type(exc).__name__)
    if (
        type(value) is not dict
        or value.get("schema")
        != "void_buy_void_custody_runtime_v3_installer_first_entry_lock_v2"
        or value.get("marker")
        != "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_INSTALLER_FIRST_ENTRY_LOCK_V2"
        or value.get("first_entry_native_source_accepted") is not True
        or value.get("python_runtime_identity_selected") is not False
        or value.get("first_entry_candidate_derived") is not False
    ):
        hold("first_entry_lock_identity_invalid")
    for key in (
        "protected_installer_first_entry_installed",
        "protected_installer_first_entry_verified",
        "protected_install_authorized",
        "protected_source_installed",
        "live_privileged_census_authorized",
        "live_privileged_census_executed",
        "existing_target_replaced",
        "replacement_apply_authorized",
        "runtime_integration",
        "payment_acceptance",
        "public_presale_activation",
        "production_gate_ready",
        "funds_movement",
    ):
        if value.get(key) is not False:
            hold("first_entry_lock_authority_not_false:" + key)
    return value


def _verify_ancestor_chain(path: Path) -> list[dict[str, Any]]:
    absolute = Path(os.path.abspath(os.fspath(path)))
    if not absolute.is_absolute():
        hold("runtime_path_not_absolute")
    rows: list[dict[str, Any]] = []
    current = Path("/")
    for component in absolute.parts[1:]:
        current = current / component
        st = os.stat(current, follow_symlinks=False)
        if stat.S_ISLNK(st.st_mode):
            hold("runtime_symlink_ancestor:" + str(current))
        if current != PYTHON and current != STDLIB_ZIP:
            if not stat.S_ISDIR(st.st_mode):
                hold("runtime_ancestor_not_directory:" + str(current))
        if st.st_uid != 0 or st.st_gid != 0:
            hold("runtime_ancestor_not_root_owned:" + str(current))
        if stat.S_IMODE(st.st_mode) & 0o022:
            hold("runtime_ancestor_group_world_writable:" + str(current))
        rows.append({
            "path": str(current),
            "uid": st.st_uid,
            "gid": st.st_gid,
            "mode": format(stat.S_IMODE(st.st_mode), "04o"),
            "dev": st.st_dev,
            "ino": st.st_ino,
        })
    return rows


def _exact_dir(path: Path, expected: tuple[str, ...], mode: int) -> dict[str, Any]:
    st = os.stat(path, follow_symlinks=False)
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) != mode
    ):
        hold("runtime_directory_metadata_invalid:" + str(path))
    fd = os.open(path, _directory_flags())
    try:
        opened = os.fstat(fd)
        if _identity(st) != _identity(opened):
            hold("runtime_directory_rebound:" + str(path))
        names: list[str] = []
        with os.scandir(fd) as iterator:
            for entry in iterator:
                names.append(entry.name)
                if len(names) > MAX_DIR_ENTRIES:
                    hold("runtime_directory_entry_limit:" + str(path))
        names.sort()
        if tuple(names) != tuple(sorted(expected)):
            hold("runtime_directory_entries_invalid:" + str(path))
        final = os.fstat(fd)
        visible = os.stat(path, follow_symlinks=False)
        if (
            _generation(opened) != _generation(final)
            or _generation(final) != _generation(visible)
        ):
            hold("runtime_directory_generation_changed:" + str(path))
    finally:
        os.close(fd)
    return {
        "path": str(path),
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "dev": st.st_dev,
        "ino": st.st_ino,
        "entries": names,
    }


def _static_elf(raw: bytes) -> dict[str, Any]:
    if len(raw) < 64 or raw[:4] != b"\x7fELF":
        hold("python_elf_header_invalid")
    if raw[4] != 2 or raw[5] != 1 or raw[6] != 1:
        hold("python_elf_class_data_version_invalid")
    e_type, e_machine, e_version = struct.unpack_from("<HHI", raw, 16)
    if e_type != 2 or e_machine != 62 or e_version != 1:
        hold("python_elf_identity_invalid")
    e_phoff = struct.unpack_from("<Q", raw, 32)[0]
    e_phentsize = struct.unpack_from("<H", raw, 54)[0]
    e_phnum = struct.unpack_from("<H", raw, 56)[0]
    if (
        e_phentsize != 56
        or e_phnum < 1
        or e_phnum > 128
        or e_phoff > len(raw)
        or e_phnum > (len(raw) - e_phoff) // e_phentsize
    ):
        hold("python_program_header_bounds_invalid")
    have_load = False
    have_interp = False
    have_dynamic = False
    for index in range(e_phnum):
        p_type = struct.unpack_from("<I", raw, e_phoff + index * e_phentsize)[0]
        if p_type == 1:
            have_load = True
        elif p_type == 3:
            have_interp = True
        elif p_type == 2:
            have_dynamic = True
    if not have_load or have_interp or have_dynamic:
        hold("python_not_static_et_exec")
    return {
        "elf64": True,
        "little_endian": True,
        "et_exec": True,
        "machine_x86_64": True,
        "pt_load_present": True,
        "pt_interp_absent": True,
        "pt_dynamic_absent": True,
    }


def _measure_verity_fd(fd: int) -> dict[str, Any]:
    buf = bytearray(4 + 64)
    struct.pack_into("<H", buf, 2, 64)
    try:
        fcntl.ioctl(fd, FS_IOC_MEASURE_VERITY, buf, True)
    except OSError as exc:
        if exc.errno in (
            errno.ENODATA,
            errno.ENOTTY,
            errno.EOPNOTSUPP,
            errno.ENOTSUP,
        ):
            return {
                "measured": False,
                "errno": errno.errorcode.get(exc.errno, str(exc.errno)),
                "algorithm": None,
                "digest_hex": None,
            }
        raise
    algorithm, size = struct.unpack_from("<HH", buf, 0)
    if size < 1 or size > 64:
        hold("fsverity_digest_size_invalid")
    digest = bytes(buf[4:4 + size]).hex()
    return {
        "measured": True,
        "errno": None,
        "algorithm": algorithm,
        "digest_hex": digest,
        "sha256_algorithm": algorithm == FS_VERITY_HASH_ALG_SHA256,
    }


def _read_runtime_file(
    path: Path,
    maximum: int,
) -> tuple[bytes, os.stat_result, dict[str, Any]]:
    before = os.stat(path, follow_symlinks=False)
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_size < 1
        or before.st_size > maximum
    ):
        hold("runtime_regular_shape_invalid:" + path.name)
    fd = os.open(path, _leaf_flags())
    try:
        opened = os.fstat(fd)
        if _generation(before) != _generation(opened):
            hold("runtime_regular_rebound:" + path.name)
        raw = bytearray()
        while len(raw) <= maximum:
            remaining = maximum + 1 - len(raw)
            chunk = os.read(fd, min(65536, remaining))
            if not chunk:
                break
            raw.extend(chunk)
        if len(raw) > maximum:
            hold("runtime_regular_read_limit:" + path.name)
        if len(raw) != opened.st_size:
            hold("runtime_regular_size_changed:" + path.name)
        verity = _measure_verity_fd(fd)
        after = os.fstat(fd)
        visible = os.stat(path, follow_symlinks=False)
        if (
            _generation(opened) != _generation(after)
            or _generation(after) != _generation(visible)
        ):
            hold("runtime_regular_generation_changed:" + path.name)
        return bytes(raw), after, verity
    finally:
        os.close(fd)


def _runtime_probe(stdlib_sha256: str) -> dict[str, Any]:
    probe = (
        "import sys;"
        "z=" + repr(str(STDLIB_ZIP)) + ";"
        "sys.path[:]=[z];"
        "import argparse,hashlib,importlib.machinery,importlib.util,json as j,"
        "os,pathlib,stat,tempfile,typing;"
        "v=[];"
        "\nfor n,m in sorted(sys.modules.items()):"
        "\n o=getattr(getattr(m,'__spec__',None),'origin',None);"
        "\n f=getattr(m,'__file__',None);"
        "\n p=o if isinstance(o,str) else f if isinstance(f,str) else None;"
        "\n if p not in (None,'built-in','frozen') and not p.startswith(z+'/'): v.append([n,p]);"
        "\nq=__import__('_voidfs');"
        "\nout={'version':sys.version.split()[0],'path':sys.path,"
        "'voidfs_builtin':'_voidfs' in sys.builtin_module_names,"
        "'voidfs_origin':getattr(q.__spec__,'origin',None),"
        "'voidfs_loader_builtin':getattr(q.__spec__,'loader',None) is importlib.machinery.BuiltinImporter and getattr(q,'__loader__',None) is importlib.machinery.BuiltinImporter,"
        "'voidfs_surface':sorted(x for x in dir(q) if not x.startswith('__')),"
        "'external_module_origins':v,'stdlib_sha256':" + repr(stdlib_sha256) + "};"
        "\nprint(json.dumps(out,sort_keys=True,separators=(',',':')))"
    )
    completed = subprocess.run(
        [str(PYTHON), "-I", "-B", "-S", "-c", probe],
        cwd="/",
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=15,
        env={},
    )
    if (
        len(completed.stdout.encode("utf-8")) > MAX_PROBE_OUTPUT
        or len(completed.stderr.encode("utf-8")) > MAX_PROBE_OUTPUT
    ):
        hold("runtime_probe_output_too_large")
    if completed.returncode != 0 or completed.stderr:
        hold("runtime_probe_failed:" + str(completed.returncode))
    try:
        result = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        hold("runtime_probe_json_invalid:" + type(exc).__name__)
    if (
        type(result) is not dict
        or result.get("path") != [str(STDLIB_ZIP)]
        or result.get("voidfs_builtin") is not True
        or result.get("voidfs_origin") != "built-in"
        or result.get("voidfs_loader_builtin") is not True
        or result.get("voidfs_surface") != ["rename_noreplace"]
        or result.get("external_module_origins") != []
        or result.get("stdlib_sha256") != stdlib_sha256
    ):
        hold("runtime_probe_contract_invalid")
    version = result.get("version")
    if not isinstance(version, str) or not version.startswith("3.12."):
        hold("runtime_python_version_invalid")
    return result


def _file_receipt(
    path: Path,
    mode: int,
    maximum: int,
    *,
    parse_elf: bool,
) -> dict[str, Any]:
    raw, st, verity = _read_runtime_file(path, maximum)
    if (
        st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) != mode
        or st.st_nlink != 1
    ):
        hold("runtime_file_metadata_invalid:" + str(path))
    receipt: dict[str, Any] = {
        "path": str(path),
        "bytes": len(raw),
        "sha256": sha256(raw),
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "nlink": st.st_nlink,
        "dev": st.st_dev,
        "ino": st.st_ino,
        "fsverity": verity,
    }
    if parse_elf:
        receipt["elf"] = _static_elf(raw)
    return receipt


def census() -> dict[str, Any]:
    if os.getuid() == 0 or os.geteuid() == 0:
        hold("root_execution_forbidden_for_mutable_source_census")
    lock = _validate_first_entry_lock()
    ancestry = _verify_ancestor_chain(RUNTIME_ROOT)
    root = _exact_dir(RUNTIME_ROOT, EXPECTED_ROOT_ENTRIES, 0o555)
    bin_dir = _exact_dir(RUNTIME_BIN, EXPECTED_BIN_ENTRIES, 0o555)
    lib_dir = _exact_dir(RUNTIME_LIB, EXPECTED_LIB_ENTRIES, 0o555)
    python = _file_receipt(PYTHON, 0o555, MAX_PYTHON_BYTES, parse_elf=True)
    stdlib = _file_receipt(STDLIB_ZIP, 0o444, MAX_STDLIB_BYTES, parse_elf=False)
    probe = _runtime_probe(stdlib["sha256"])
    verity_ready = (
        python["fsverity"].get("measured") is True
        and python["fsverity"].get("sha256_algorithm") is True
        and stdlib["fsverity"].get("measured") is True
        and stdlib["fsverity"].get("sha256_algorithm") is True
    )
    body = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": VERSION,
        "first_entry_lock": {
            "path": FIRST_ENTRY_LOCK_REL,
            "git_blob_sha1": FIRST_ENTRY_LOCK_BLOB,
            "lock_id": lock["lock_id"],
            "first_entry_native_source_accepted": True,
        },
        "runtime_namespace": {
            "root": root,
            "bin": bin_dir,
            "lib": lib_dir,
            "ancestry": ancestry,
            "closed_tree": True,
        },
        "python": python,
        "stdlib_zip": stdlib,
        "probe": probe,
        "runtime_identity_candidate": True,
        "python_runtime_identity_selected": False,
        "python_stdlib_import_closure_selected": False,
        "fsverity_ready_for_protected_use": verity_ready,
        "protected_runtime_accepted": False,
        "first_entry_candidate_derived": False,
        "first_entry_candidate_accepted": False,
        "protected_installer_first_entry_installed": False,
        "protected_install_authorized": False,
        "protected_source_installed": False,
        "live_privileged_census_authorized": False,
        "replacement_apply_authorized": False,
        "runtime_integration": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "production_gate_ready": False,
        "funds_movement": False,
        "production_read_only": True,
        "production_explicit_filesystem_write": False,
        "production_filesystem_write_free": False,
        "production_atime_write_possible": True,
        "unprivileged_runtime_probe_executed": True,
    }
    return {
        **body,
        "candidate_id": "voidbuycustodyclosedpython1_" + sha256(canonical(body)),
    }


def self_test() -> None:
    lock = _validate_first_entry_lock()
    if lock["first_entry_native_source_accepted"] is not True:
        hold("self_test_source_lock_invalid")

    # Minimal synthetic static ELF64 x86-64 ET_EXEC with one PT_LOAD.
    raw = bytearray(64 + 56)
    raw[:4] = b"\x7fELF"
    raw[4] = 2
    raw[5] = 1
    raw[6] = 1
    struct.pack_into("<HHI", raw, 16, 2, 62, 1)
    struct.pack_into("<Q", raw, 32, 64)
    struct.pack_into("<H", raw, 54, 56)
    struct.pack_into("<H", raw, 56, 1)
    struct.pack_into("<I", raw, 64, 1)
    result = _static_elf(bytes(raw))
    if result["pt_load_present"] is not True:
        hold("self_test_static_elf_positive_failed")

    dynamic = bytearray(raw)
    struct.pack_into("<I", dynamic, 64, 2)
    try:
        _static_elf(bytes(dynamic))
    except CensusHold:
        pass
    else:
        hold("self_test_dynamic_elf_accepted")

    with tempfile.TemporaryDirectory(
        prefix="void-custody-closed-python-selftest-"
    ) as tmp:
        root = Path(tmp)
        target = root / "regular"
        target.write_bytes(b"abc")
        _read_bound_regular(target, 16)
        symlink = root / "symlink"
        symlink.symlink_to("regular")
        try:
            _read_bound_regular(symlink, 16)
        except (CensusHold, OSError):
            pass
        else:
            hold("self_test_symlink_accepted")
        fifo = root / "fifo"
        os.mkfifo(fifo, 0o600)
        try:
            _read_bound_regular(fifo, 16)
        except (CensusHold, OSError):
            pass
        else:
            hold("self_test_fifo_accepted")

    print(MARKER + "_SELF_TEST_GREEN")
    print("first_entry_lock_exact=true")
    print("closed_runtime_tree_contract=true")
    print("runtime_root_mode_0555_required=true")
    print("python_mode_0555_required=true")
    print("stdlib_mode_0444_required=true")
    print("trusted_files_single_link_required=true")
    print("static_python_elf64_x86_64_required=true")
    print("pt_interp_forbidden=true")
    print("pt_dynamic_forbidden=true")
    print("voidfs_builtin_required=true")
    print("stdlib_only_sys_path_required=true")
    print("external_module_origin_forbidden=true")
    print("fsverity_measurement_observed_not_assumed=true")
    print("runtime_identity_candidate_only=true")
    print("python_runtime_identity_selected=false")
    print("python_stdlib_import_closure_selected=false")
    print("first_entry_candidate_derived=false")
    print("protected_install_authorized=false")
    print("replacement_apply_authorized=false")
    print("production_read_only=true")
    print("production_explicit_filesystem_write=false")
    print("production_filesystem_write_free=false")
    print("production_atime_write_possible=true")
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
    except (CensusHold, OSError, ValueError, subprocess.SubprocessError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("runtime_identity_candidate=false")
        print("python_runtime_identity_selected=false")
        print("python_stdlib_import_closure_selected=false")
        print("first_entry_candidate_derived=false")
        print("protected_install_authorized=false")
        print("replacement_apply_authorized=false")
        print("funds_movement=false")
        raise SystemExit(2)
