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
    "void_buy_allocation_custody_runtime_v3_closed_python_runtime_census_v1.py"
)
EXPECTED_SOURCE_BLOB = "1dc88905c55efafaca9431fd5d6372a9bf664d44"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


raw = TARGET.read_bytes()
assert git_blob(raw) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_v3_closed_python_runtime_census_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

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
assert census_block.index("probe = _runtime_probe(stdlib[\"sha256\"])") < census_block.index(
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
