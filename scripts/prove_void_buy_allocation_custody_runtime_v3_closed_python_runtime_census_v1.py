#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import stat
import tempfile
import time
import types

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_closed_python_runtime_census_v1.py"
)
EXPECTED_SOURCE_BLOB = "8914d9e8031377e3bcda4770194024e2f6fed2fd"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


MAX_TARGET_BYTES = 2 * 1024 * 1024


def _generation(st: os.stat_result) -> tuple[int, int, int, int, int, int, int, int, int]:
    return (
        st.st_dev,
        st.st_ino,
        st.st_uid,
        st.st_gid,
        st.st_mode,
        st.st_nlink,
        st.st_size,
        st.st_mtime_ns,
        st.st_ctime_ns,
    )


def read_bound_source(path: Path, expected_blob: str, maximum: int = MAX_TARGET_BYTES) -> bytes:
    before = os.stat(path, follow_symlinks=False)
    assert stat.S_ISREG(before.st_mode), "source_not_regular:" + path.name
    assert not stat.S_ISLNK(before.st_mode), "source_symlink:" + path.name
    assert before.st_nlink == 1, "source_link_count:" + path.name
    assert 0 < before.st_size <= maximum, "source_size_invalid:" + path.name

    flags = (
        os.O_RDONLY
        | getattr(os, "O_CLOEXEC", 0)
        | getattr(os, "O_NOFOLLOW", 0)
        | getattr(os, "O_NONBLOCK", 0)
    )
    fd = os.open(path, flags)
    try:
        opened = os.fstat(fd)
        assert stat.S_ISREG(opened.st_mode), "source_opened_not_regular:" + path.name
        assert _generation(before) == _generation(opened), "source_rebound_before_open:" + path.name

        data = bytearray()
        while len(data) < opened.st_size:
            chunk = os.read(fd, min(65536, opened.st_size - len(data)))
            assert chunk, "source_unexpected_eof:" + path.name
            data.extend(chunk)
        assert os.read(fd, 1) == b"", "source_grew_during_read:" + path.name

        terminal = os.fstat(fd)
        visible = os.stat(path, follow_symlinks=False)
        assert _generation(opened) == _generation(terminal) == _generation(visible), (
            "source_generation_changed:" + path.name
        )

        raw = bytes(data)
        assert git_blob(raw) == expected_blob, "source_blob_mismatch:" + path.name
        return raw
    finally:
        os.close(fd)


def self_test_source_capture() -> None:
    with tempfile.TemporaryDirectory(prefix="void-closed-python-proof-source-") as tmp:
        root = Path(tmp)
        good = root / "good.py"
        good_bytes = b"VALUE = 1\n"
        good.write_bytes(good_bytes)
        good_blob = git_blob(good_bytes)
        assert read_bound_source(good, good_blob, 4096) == good_bytes

        symlink = root / "symlink.py"
        symlink.symlink_to(good.name)
        try:
            read_bound_source(symlink, good_blob, 4096)
        except (AssertionError, OSError):
            pass
        else:
            raise AssertionError("symlink_source_accepted")

        victim = root / "victim.py"
        victim.write_bytes(good_bytes)
        original_open = os.open
        swapped = {"done": False}

        def fifo_swap_open(path_arg, flags, *args):
            if Path(path_arg) == victim and not swapped["done"]:
                swapped["done"] = True
                victim.unlink()
                os.mkfifo(victim, 0o600)
            return original_open(path_arg, flags, *args)

        os.open = fifo_swap_open
        started = time.monotonic()
        try:
            try:
                read_bound_source(victim, good_blob, 4096)
            except (AssertionError, OSError, BlockingIOError):
                pass
            else:
                raise AssertionError("fifo_swap_source_accepted")
        finally:
            os.open = original_open
        assert time.monotonic() - started < 2.0, "fifo_swap_source_blocked"

        captured_path = root / "captured.py"
        captured_path.write_bytes(good_bytes)
        captured = read_bound_source(captured_path, good_blob, 4096)
        captured_path.write_bytes(b"VALUE = 2\n")
        synthetic = types.ModuleType("captured_source_generation")
        synthetic.__file__ = str(captured_path)
        exec(compile(captured, str(captured_path), "exec"), synthetic.__dict__)
        assert synthetic.VALUE == 1


raw = read_bound_source(TARGET, EXPECTED_SOURCE_BLOB)
self_test_source_capture()

module = types.ModuleType(
    "void_buy_allocation_custody_runtime_v3_closed_python_runtime_census_v1"
)
module.__file__ = str(TARGET)
module.__package__ = ""
exec(compile(raw, str(TARGET), "exec", dont_inherit=True, optimize=0), module.__dict__)

assert module.MARKER == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_CLOSED_PYTHON_RUNTIME_CENSUS_V1"
)
assert module.SCHEMA == (
    "void_buy_void_custody_runtime_v3_closed_python_runtime_census_v1"
)
assert module.FIRST_ENTRY_LOCK_BLOB == (
    "36d6c4a5ff825993371f109ee86a77b601e12d07"
)
assert module.RUNTIME_ROOT == Path("/opt/void-buy-void-v7-python-runtime-v1")
assert module.PYTHON == Path(
    "/opt/void-buy-void-v7-python-runtime-v1/bin/python3.12-static"
)
assert module.STDLIB_ZIP == Path(
    "/opt/void-buy-void-v7-python-runtime-v1/lib/python312.zip"
)

lock = module._validate_first_entry_lock()
assert lock["first_entry_native_source_accepted"] is True
assert lock["python_runtime_identity_selected"] is False
assert lock["first_entry_candidate_derived"] is False
assert lock["protected_install_authorized"] is False
assert lock["replacement_apply_authorized"] is False
assert lock["funds_movement"] is False

module.self_test()

with tempfile.TemporaryDirectory(
    prefix="void-custody-closed-python-proof-"
) as tmp:
    sample = Path(tmp) / "runtime-file"
    sample.write_bytes(b"runtime-bytes")
    seen: list[tuple[int, int]] = []
    original_measure = module._measure_verity_fd

    def fake_measure(fd: int):
        st = os.fstat(fd)
        seen.append((st.st_dev, st.st_ino))
        return {
            "measured": True,
            "errno": None,
            "algorithm": module.FS_VERITY_HASH_ALG_SHA256,
            "digest_hex": "aa" * 32,
            "sha256_algorithm": True,
        }

    module._measure_verity_fd = fake_measure
    try:
        observed_raw, observed_st, observed_verity = module._read_runtime_file(
            sample,
            1024,
        )
    finally:
        module._measure_verity_fd = original_measure

    assert observed_raw == b"runtime-bytes"
    assert seen == [(observed_st.st_dev, observed_st.st_ino)]
    assert observed_verity["measured"] is True
    assert observed_verity["sha256_algorithm"] is True

    receipt = {
        "dev": observed_st.st_dev,
        "ino": observed_st.st_ino,
        "uid": observed_st.st_uid,
        "gid": observed_st.st_gid,
        "mode": format(module.stat.S_IMODE(observed_st.st_mode), "04o"),
        "nlink": observed_st.st_nlink,
        "bytes": observed_st.st_size,
        "mtime_ns": observed_st.st_mtime_ns,
        "ctime_ns": observed_st.st_ctime_ns,
    }
    module._revalidate_file_receipt(sample, receipt)

    replacement = Path(tmp) / "replacement"
    replacement.write_bytes(b"runtime-bytes")
    os.replace(replacement, sample)
    try:
        module._revalidate_file_receipt(sample, receipt)
    except module.CensusHold as exc:
        assert "runtime_generation_changed_after_probe" in str(exc), exc
    else:
        raise AssertionError("post_probe_same_path_replacement_accepted")

    probe_python = Path(tmp) / "probe-python"
    probe_python.write_bytes(b"synthetic-python")
    probe_python.chmod(0o555)
    probe_st = probe_python.stat()
    probe_receipt = {
        "dev": probe_st.st_dev,
        "ino": probe_st.st_ino,
        "uid": probe_st.st_uid,
        "gid": probe_st.st_gid,
        "mode": format(module.stat.S_IMODE(probe_st.st_mode), "04o"),
        "nlink": probe_st.st_nlink,
        "bytes": probe_st.st_size,
        "mtime_ns": probe_st.st_mtime_ns,
        "ctime_ns": probe_st.st_ctime_ns,
    }
    fake_stdlib = Path(tmp) / "python312.zip"
    captured: dict[str, object] = {}
    original_python = module.PYTHON
    original_stdlib = module.STDLIB_ZIP
    original_run = module.subprocess.run

    class _FixtureCompleted:
        returncode = 0
        stderr = ""

        def __init__(self, stdout: str):
            self.stdout = stdout

    def fake_run(argv, **kwargs):
        executable = kwargs.get("executable")
        passed = kwargs.get("pass_fds")
        assert isinstance(executable, str)
        assert isinstance(passed, tuple) and len(passed) == 1
        retained_fd = passed[0]
        assert executable == "/proc/self/fd/" + str(retained_fd)
        retained_st = os.fstat(retained_fd)
        assert (retained_st.st_dev, retained_st.st_ino) == (
            probe_st.st_dev,
            probe_st.st_ino,
        )
        assert argv[0] == str(probe_python)
        assert kwargs.get("env") == {}
        assert kwargs.get("close_fds") is True
        captured["retained_fd"] = retained_fd
        payload = {
            "version": "3.12.15",
            "path": [str(fake_stdlib)],
            "voidfs_builtin": True,
            "voidfs_origin": "built-in",
            "voidfs_loader_builtin": True,
            "voidfs_surface": ["rename_noreplace"],
            "external_module_origins": [],
            "stdlib_sha256": "11" * 32,
        }
        return _FixtureCompleted(module.json.dumps(payload))

    module.PYTHON = probe_python
    module.STDLIB_ZIP = fake_stdlib
    module.subprocess.run = fake_run
    try:
        probe_result = module._runtime_probe("11" * 32, probe_receipt)
    finally:
        module.PYTHON = original_python
        module.STDLIB_ZIP = original_stdlib
        module.subprocess.run = original_run

    assert probe_result["retained_python_descriptor_exec"] is True
    assert isinstance(captured.get("retained_fd"), int)

source = raw.decode("utf-8")
pre_self_test = source.split("def self_test()", 1)[0]

for required in (
    "FS_IOC_MEASURE_VERITY",
    "FS_VERITY_HASH_ALG_SHA256",
    'RUNTIME_ROOT = Path("/opt/void-buy-void-v7-python-runtime-v1")',
    'PYTHON = RUNTIME_BIN / "python3.12-static"',
    'STDLIB_ZIP = RUNTIME_LIB / "python312.zip"',
    "EXPECTED_ROOT_ENTRIES = (\"bin\", \"lib\")",
    "EXPECTED_BIN_ENTRIES = (\"python3.12-static\",)",
    "EXPECTED_LIB_ENTRIES = (\"python312.zip\",)",
    "def _static_elf(",
    "def _measure_verity_fd(",
    "def _read_runtime_file(",
    "_measure_verity_fd(fd)",
    "def _revalidate_file_receipt(",
    "_revalidate_file_receipt(PYTHON, python)",
    "_revalidate_file_receipt(STDLIB_ZIP, stdlib)",
    "def _runtime_probe(",
    "executable=executable",
    "pass_fds=(python_fd,)",
    "close_fds=True",
    "retained_python_descriptor_exec",
    '"-I", "-B", "-S", "-c"',
    "sys.path[:]=[z]",
    "__import__('_voidfs')",
    "voidfs_loader_builtin",
    "external_module_origins",
    "runtime_identity_candidate",
    "python_runtime_identity_selected",
    "python_stdlib_import_closure_selected",
    "first_entry_candidate_derived",
    "protected_runtime_accepted",
    "protected_install_authorized",
    "replacement_apply_authorized",
):
    assert required in source, required

runtime_reader = pre_self_test.split("def _read_runtime_file(", 1)[1].split(
    "def _runtime_probe(", 1
)[0]
assert "_measure_verity_fd(fd)" in runtime_reader
assert "os.open(path, _leaf_flags())" in runtime_reader
assert "return bytes(raw), after, verity" in runtime_reader
assert "def _measure_verity(path" not in pre_self_test

for forbidden in (
    "os.write(",
    "os.pwrite(",
    "os.unlink(",
    "os.rename(",
    "os.replace(",
    "os.chmod(",
    "os.chown(",
    "os.fchmod(",
    "os.fchown(",
    "shutil.",
    "tarfile.",
    "sudo ",
    "systemctl",
):
    assert forbidden not in pre_self_test, forbidden

probe = pre_self_test.split("def _runtime_probe(", 1)[1].split(
    "def _file_receipt(", 1
)[0]
assert "subprocess.run(" in probe
assert 'executable = "/proc/self/fd/" + str(python_fd)' in probe
assert "executable=executable" in probe
assert "pass_fds=(python_fd,)" in probe
assert "close_fds=True" in probe
assert '"import sys;"' in probe
assert '"import json,sys;"' not in probe
assert '"import argparse,hashlib,importlib.machinery,importlib.util,json as j,"' in probe
assert '"\\nprint(j.dumps(out,sort_keys=True,separators=(\',\',\':\')))"' in probe
assert '"\\nprint(json.dumps(' not in probe
assert probe.index('"sys.path[:]=[z];"') < probe.index('"import argparse,hashlib')
assert "[str(PYTHON), \"-I\", \"-B\", \"-S\", \"-c\", probe]" in probe
assert "shell=True" not in probe
assert "env={}" in probe
assert "stdout=subprocess.PIPE" in probe
assert "stderr=subprocess.PIPE" in probe
assert "timeout=15" in probe

assert "runtime_identity_candidate\": True" in source
assert "python_runtime_identity_selected\": False" in source
assert "python_stdlib_import_closure_selected\": False" in source
assert "protected_runtime_accepted\": False" in source
assert "first_entry_candidate_derived\": False" in source
assert "protected_install_authorized\": False" in source
assert "replacement_apply_authorized\": False" in source
assert "production_explicit_filesystem_write\": False" in source
assert "production_filesystem_write_free\": False" in source
assert "production_atime_write_possible\": True" in source

census_block = pre_self_test.split("def census()", 1)[1]
assert census_block.index("probe = _runtime_probe(stdlib[\"sha256\"], python)") < census_block.index(
    "_revalidate_file_receipt(PYTHON, python)"
)
assert census_block.index("_revalidate_file_receipt(PYTHON, python)") < census_block.index(
    "_revalidate_file_receipt(STDLIB_ZIP, stdlib)"
)
assert census_block.index("_revalidate_file_receipt(STDLIB_ZIP, stdlib)") < census_block.index(
    "verity_ready = ("
)

print("VOID_BUY_VOID_CUSTODY_RUNTIME_V3_CLOSED_PYTHON_RUNTIME_CENSUS_V1_PROOF_GREEN")
print("exact_source_blob_asserted=true")
print("source_proof_descriptor_capture=true")
print("source_proof_fifo_symlink_race_rejected=true")
print("source_proof_executes_captured_bytes=true")
print("first_entry_lock_exact=true")
print("fixed_runtime_namespace_bound=true")
print("closed_tree_contract_bound=true")
print("static_elf_parser_bound=true")
print("pt_interp_rejected=true")
print("pt_dynamic_rejected=true")
print("fsverity_measurement_observed_not_assumed=true")
print("runtime_hash_and_verity_same_descriptor=true")
print("post_probe_runtime_generation_revalidated=true")
print("post_probe_same_path_replacement_rejected=true")
print("isolated_stdlib_only_probe_bound=true")
print("sys_path_closed_before_stdlib_imports=true")
print("path_closed_json_binding_used=true")
print("voidfs_builtin_required=true")
print("voidfs_builtin_loader_identity_required=true")
print("external_module_origin_forbidden=true")
print("runtime_probe_shell_false=true")
print("runtime_probe_environment_empty=true")
print("retained_python_descriptor_exec_bound=true")
print("canonical_python_argv0_preserved=true")
print("host_census_not_executed_in_ci=true")
print("runtime_identity_candidate_only=true")
print("python_runtime_identity_selected=false")
print("python_stdlib_import_closure_selected=false")
print("first_entry_candidate_derived=false")
print("protected_runtime_accepted=false")
print("protected_install_authorized=false")
print("replacement_apply_authorized=false")
print("production_read_only=true")
print("production_explicit_filesystem_write=false")
print("production_filesystem_write_free=false")
print("production_atime_write_possible=true")
print("funds_movement=false")
