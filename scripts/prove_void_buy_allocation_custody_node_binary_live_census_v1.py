#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_node_binary_live_census_v1.py"
)
EXPECTED_SOURCE_BLOB = "4255a8154b6817283f7eded7c79896124ee97d25"


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_node_binary_live_census_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == "VOID_BUY_VOID_CUSTODY_NODE_BINARY_LIVE_CENSUS_V1"
assert module.SCHEMA == "void_buy_void_custody_node_binary_live_census_v1"
assert module.VERSION == 1
assert module.PROFILE_REL == (
    "tools/void-buy-allocation-custody-node-binary-profile-v1.mjs"
)
assert module.PROFILE_GIT_BLOB == (
    "4d4d656bddf40de6f215be7b4b6e7cec62098036"
)
assert module.EXPECTED_HOST == "zoso-Precision-Tower-7810"
assert module.EXPECTED_PATH == Path("/usr/bin/node")
assert module.EXPECTED_BYTES == 124827920
assert module.EXPECTED_SHA256 == (
    "fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48"
)
assert module.EXPECTED_VERSION_STRING == "v22.23.3"
assert module.EXPECTED_UID == 0
assert module.EXPECTED_GID == 0
assert module.EXPECTED_MODE == 0o755
assert module.EXPECTED_NLINK == 1
assert module.PARENT_EXPECTED == (
    ("/", 0, 0, 0o755),
    ("/usr", 0, 0, 0o755),
    ("/usr/bin", 0, 0, 0o755),
)

module.verify_profile_source()
module.self_test()

fd_dir = Path("/proc/self/fd")
if fd_dir.is_dir():
    before_fds = len(list(fd_dir.iterdir()))
    original_validate = module._validate_directory
    validation_calls = {"count": 0}

    def forced_validation_hold(st, *, uid, gid, mode, code):
        validation_calls["count"] += 1
        if validation_calls["count"] == 2:
            raise module.CensusHold("forced_usr_validation_hold")
        return original_validate(
            st,
            uid=uid,
            gid=gid,
            mode=mode,
            code=code,
        )

    module._validate_directory = forced_validation_hold
    try:
        try:
            module._open_expected_ancestry()
        except module.CensusHold as exc:
            assert "forced_usr_validation_hold" in str(exc)
        else:
            raise AssertionError("forced ancestry validation HOLD was not raised")
    finally:
        module._validate_directory = original_validate
    after_fds = len(list(fd_dir.iterdir()))
    assert after_fds == before_fds, (before_fds, after_fds)

saved_getuid = module.os.getuid
saved_geteuid = module.os.geteuid
module.os.getuid = lambda: 0
module.os.geteuid = lambda: 0
try:
    try:
        module._assert_unprivileged()
    except module.CensusHold as exc:
        assert "root_execution_forbidden_for_mutable_checkout_census" in str(exc)
    else:
        raise AssertionError("root execution was accepted")
finally:
    module.os.getuid = saved_getuid
    module.os.geteuid = saved_geteuid

without_b = subprocess.run(
    [sys.executable, "-I", str(TARGET), "--self-test"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=10,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert without_b.returncode == 2, without_b
assert (
    "reason=python_isolated_unoptimized_nobytecode_mode_required"
    in without_b.stdout
), without_b.stdout
assert "node_binary_identity_verified=false" in without_b.stdout
assert "production_census_explicit_filesystem_write=false" in without_b.stdout

source = TARGET.read_text(encoding="utf-8")
pre_self_test = source.split("def self_test()", 1)[0]

for required in (
    "O_NOFOLLOW",
    "O_NONBLOCK",
    "_open_expected_ancestry",
    "_revalidate_ancestry",
    "_measure_regular_at",
    "node_binary_sha256_mismatch",
    "node_binary_generation_changed",
    "node_binary_elf_magic_mismatch",
    "root_execution_forbidden_for_mutable_checkout_census",
    "designated_host_mismatch",
    "production_census_read_only",
    "production_census_explicit_filesystem_write",
    "production_census_filesystem_write_free",
    "production_census_atime_write_possible",
    "live_node_binary_identity_match_candidate",
    "node_binary_identity_verified",
    "source_execution_protected",
    "live_at_use_reverification_required",
    "replacement_apply_authorized",
    "funds_movement",
):
    assert required in source, required

for forbidden in (
    "subprocess",
    "os.system(",
    "os.write(",
    "os.pwrite(",
    "os.unlink(",
    "os.rename(",
    "os.replace(",
    "os.chmod(",
    "os.chown(",
    "os.fchmod(",
    "os.fchown(",
    "shutil",
    "tarfile",
    "systemctl",
    "sudo ",
    "socket.",
):
    assert forbidden not in pre_self_test, forbidden

assert '"node_binary_execution_performed": False' in source
assert '"version_command_executed": False' in source
assert '"node_binary_identity_verified": False' in source
assert '"source_execution_protected": False' in source
assert '"replacement_apply_authorized": False' in source
assert '"runtime_integration": False' in source
assert '"payment_acceptance": False' in source
assert '"public_presale_activation": False' in source
assert '"production_gate_ready": False' in source
assert '"funds_movement": False' in source

print("VOID_BUY_VOID_CUSTODY_NODE_BINARY_LIVE_CENSUS_V1_PROOF_GREEN")
print("exact_source_blob_asserted=true")
print("profile_source_exact=true")
print("profile_expected_identity_bound=true")
print("fixed_node_path_bound=true")
print("descriptor_bound_binary_read=true")
print("ancestor_descriptor_revalidation=true")
print("ancestor_validation_hold_fd_cleanup=true")
print("exact_sha256_required=true")
print("exact_byte_count_required=true")
print("exact_uid_gid_mode_nlink_required=true")
print("elf_magic_required=true")
print("root_execution_forbidden=true")
print("without_dash_b_bootstrap_hold=true")
print("node_binary_execution_performed=false")
print("version_command_executed=false")
print("live_node_binary_identity_match_candidate_only=true")
print("node_binary_identity_verified=false")
print("source_execution_protected=false")
print("operator_evidence_authenticated=false")
print("live_at_use_reverification_required=true")
print("host_census_not_executed_in_ci=true")
print("production_census_read_only=true")
print("production_census_explicit_filesystem_write=false")
print("production_census_filesystem_write_free=false")
print("production_census_atime_write_possible=true")
print("test_fixture_filesystem_write=true")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("production_gate_ready=false")
print("funds_movement=false")
