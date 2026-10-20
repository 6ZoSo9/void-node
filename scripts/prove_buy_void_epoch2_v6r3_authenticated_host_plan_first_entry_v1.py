#!/usr/bin/env python3
"""Source-only proof for the future root-custodied Epoch-2 plan entry.

Nothing in this proof installs the entry, runs a host plan, or accesses credentials.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ops/precision/void_buy_void_epoch2_v6r3_authenticated_host_plan_first_entry_v1.py"
PLANNER = ROOT / "ops/precision/void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3.py"
MARKER = "VOID_BUY_VOID_EPOCH2_V6R3_AUTHENTICATED_HOST_PLAN_FIRST_ENTRY_V1"
ENTRY_BLOB = "af5d52a13f25effef04a5a801bc79e5f0125dbf6"
PLANNER_BLOB = "19c6e1cdf9f2361cedfba4ea8d650a63eb5061ff"
PLANNER_SHA256 = "95d9dd865bc226a7436a67fff977215e43aad034ce40c2c9126ecc49c469d627"
PLANNER_BYTES = 49025


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()


entry_raw = ENTRY.read_bytes()
planner_raw = PLANNER.read_bytes()
assert git_blob(entry_raw) == ENTRY_BLOB, "entry_source_identity_mismatch"
assert git_blob(planner_raw) == PLANNER_BLOB, "planner_source_identity_mismatch"
assert hashlib.sha256(planner_raw).hexdigest() == PLANNER_SHA256
assert len(planner_raw) == PLANNER_BYTES
source = entry_raw.decode("utf-8", "strict")
required = (
    'ENTRY = Path("/opt/void-buy-void-epoch2-v6r3-host-plan-entry-v1/entry.py")',
    'PYTHON = Path("/usr/bin/python3.12")',
    'PLANNER_GIT_BLOB = "' + PLANNER_BLOB + '"',
    'PLANNER_SHA256 = "' + PLANNER_SHA256 + '"',
    'PLANNER_BYTES = 49025',
    "installed_entry_gate()",
    "root_leaf(ENTRY, executable=False, required_mode=0o444)",
    "os.getuid() != RUNTIME_UID or os.geteuid() != RUNTIME_UID",
    "os.getgid() != RUNTIME_GID or os.getegid() != RUNTIME_GID",
    "not sys.flags.isolated or not sys.dont_write_bytecode or not sys.flags.no_site",
    'os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK | os.O_CLOEXEC',
    "os.MFD_CLOEXEC | os.MFD_ALLOW_SEALING",
    "fcntl.fcntl(writer, fcntl.F_ADD_SEALS, SEALS)",
    "fcntl.F_SEAL_WRITE | fcntl.F_SEAL_GROW | fcntl.F_SEAL_SHRINK | fcntl.F_SEAL_SEAL",
    '"-I", "-B", "-S",',
    "pass_fds=(python_fd, script_fd)",
    "validate_plan(result.stdout)",
    "any(body.get(key) is not False for key in FORBIDDEN)",
    '"--host-plan"',
    'raise Hold("separately_installed_root_custodied_entry_required")',
    "os.mkfifo(fifo, 0o600)",
    "source.write_bytes(b'print",
)
for marker in required:
    assert marker in source, "required_source_contract_missing:" + marker
for forbidden in ("--apply", "shell=True", "pickle.", "eval(", "exec("):
    assert forbidden not in source, "forbidden_source_token:" + forbidden
assert "ENTRY = Path(" in source and "PLANNER = Path(" in source
assert source.count("os.memfd_create(") == 1
assert source.count("subprocess.run(") == 1

env = {"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C", "TZ": "UTC"}
for mode in ("--self-test", "--source-plan"):
    result = subprocess.run(
        [sys.executable, "-I", "-B", "-S", str(ENTRY), mode],
        stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        cwd=str(ROOT), env=env, check=False, timeout=20,
        text=True, encoding="utf-8", errors="strict",
    )
    assert result.returncode == 0, (mode, result.returncode, result.stdout, result.stderr)
    assert result.stderr == "", (mode, result.stderr)
    lines = set(result.stdout.splitlines())
    if mode == "--self-test":
        for marker in (
            MARKER + "_SELF_TEST_GREEN",
            "sealed_source_bytes_executed=true",
            "checkout_mutation_does_not_change_executed_snapshot=true",
            "source_symlink_and_fifo_rejected=true",
            "checkout_host_plan_authority_rejected=true",
            "installed_launcher_qualification_required=true",
            "credential_access=false", "signing=false",
            "transaction=false", "funds_movement=false",
        ):
            assert marker in lines, marker
    else:
        for marker in (
            MARKER, "mode=source-plan", "source_only=true",
            "separately_installed_root_custodied_entry_required=true",
            "exact_uid_gid_1000_required=true", "isolated_python_required=true",
            "python_site_import_disabled_required=true",
            "trusted_python_retained_descriptor_first_exec_required=true",
            "planner_git_blob=" + PLANNER_BLOB,
            "planner_sha256=" + PLANNER_SHA256,
            "planner_bytes=" + str(PLANNER_BYTES),
            "sealed_memfd_sha256_and_git_blob_required=true",
            "sealed_memfd_retained_execution_required=true",
            "host_plan_executed=false", "host_plan_authorized=false",
            "protected_install_authorized=false",
            "credential_access=false", "signing=false",
            "transaction=false", "payment_acceptance=false",
            "public_presale_activation=false", "wc_void_market_activation=false",
            "funds_movement=false",
        ):
            assert marker in lines, marker

# Negative host-plan invocation must HOLD before accessing source or protected host.
result = subprocess.run(
    [sys.executable, "-I", "-B", "-S", str(ENTRY), "--host-plan"],
    stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    cwd=str(ROOT), env=env, check=False, timeout=10,
    text=True, encoding="utf-8", errors="strict",
)
assert result.returncode == 2, (result.returncode, result.stdout, result.stderr)
assert result.stderr == "", result.stderr
lines = set(result.stdout.splitlines())
assert MARKER in lines and "status=HOLD" in lines
assert "host_plan_authorized=false" in lines
assert "credential_access=false" in lines
assert "funds_movement=false" in lines
assert MARKER + "_HOST_PLAN_GREEN" not in lines
print(MARKER + "_PROOF_GREEN")
print("sealed_memfd_fixture_green=true")
print("exact_git_blob_and_sha256_bound=true")
print("checkout_host_plan_denied_before_execution=true")
print("installed_root_custody_required=true")
print("production_host_plan_executed=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("funds_movement=false")
