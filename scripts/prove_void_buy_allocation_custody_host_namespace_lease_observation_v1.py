#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_host_namespace_lease_observation_v1.py"
)
EXPECTED_SOURCE_BLOB = "073e1f1400def53831a089a3e9c14d6e1f311bf5"


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_host_namespace_lease_observation_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_BUY_VOID_CUSTODY_HOST_NAMESPACE_LEASE_OBSERVATION_V1"
)
assert module.SCHEMA == (
    "void_buy_void_custody_host_namespace_lease_observation_v1"
)
assert module.PROCESS_CENSUS_REL == (
    "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_process_reference_census_v1.py"
)
assert module.PROCESS_CENSUS_BLOB == (
    "6bf476e3383b7b18966320df13b4041da9c8c11f"
)
assert module.PROC == Path("/proc")

source_evidence = module.verify_process_census_source()
assert source_evidence["git_blob_sha1"] == module.PROCESS_CENSUS_BLOB

module.self_test()

assert module._verify_namespace_pair(
    (12, 34),
    (12, 34),
    mismatch_code="synthetic_namespace_mismatch",
) == (12, 34)
for code in (
    "not_in_pid1_pid_namespace",
    "not_in_pid1_mount_namespace",
):
    try:
        module._verify_namespace_pair(
            (12, 34),
            (12, 35),
            mismatch_code=code,
        )
    except module.CensusHold as exc:
        assert code in str(exc), str(exc)
    else:
        raise AssertionError(code + " mismatch was accepted")

visible = (
    b"42 1 0:1 / /proc rw,nosuid,nodev,noexec,relatime"
    b" - proc proc rw,hidepid=0\n"
)
hidden = (
    b"42 1 0:1 / /proc rw,nosuid,nodev,noexec,relatime"
    b" - proc proc rw,hidepid=2\n"
)
assert module._verify_proc_mountinfo(
    visible,
    42,
)["hidepid_restricted"] is False
try:
    module._verify_proc_mountinfo(hidden, 42)
except module.CensusHold as exc:
    assert "proc_visibility_restricted" in str(exc), str(exc)
else:
    raise AssertionError("hidepid-restricted procfs was accepted")

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
assert "production_filesystem_write=false" in without_b.stdout
assert "lease_authority=false" in without_b.stdout

source = TARGET.read_text(encoding="utf-8")
pre_self_test = source.split("def self_test()", 1)[0]

for forbidden in (
    "subprocess",
    "os.write(",
    "os.pwrite(",
    "os.unlink(",
    "os.rename(",
    "os.replace(",
    "os.chmod(",
    "os.chown(",
    "os.fchmod(",
    "os.fchown(",
    "socket.",
    "systemctl",
    "sudo ",
):
    assert forbidden not in pre_self_test, forbidden

for required in (
    "dont_write_bytecode",
    "_read_bounded_at",
    "_fd_mount_id",
    "_namespace_identity_at",
    "_verify_namespace_pair",
    "_boot_id_sha256",
    "boot_id_sha256",
    "same_boot_binding_observed",
    "self/ns/pid",
    "1/ns/pid",
    "self/ns/mnt",
    "1/ns/mnt",
    "not_in_pid1_pid_namespace",
    "not_in_pid1_mount_namespace",
    "hidepid=",
    "operator_observation_only",
    "operator_must_independently_know_host_context",
    "independent_host_context_attested",
    "lease_authority",
    "automatic_process_census_composition_authorized",
    "replacement_apply_authorized",
):
    assert required in source, required

print("VOID_BUY_VOID_CUSTODY_HOST_NAMESPACE_LEASE_OBSERVATION_V1_PROOF_GREEN")
print("exact_source_blob_asserted=true")
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
print("boot_id_same_boot_binding=true")
print("operator_observation_only=true")
print("operator_must_independently_know_host_context=true")
print("independent_host_context_attested=false")
print("lease_authority=false")
print("automatic_process_census_composition_authorized=false")
print("python_no_bytecode_mode_required=true")
print("without_dash_b_bootstrap_hold=true")
print("host_observation_not_executed_in_ci=true")
print("production_filesystem_write=false")
print("root_execution_forbidden=true")
print("service_mutation=false")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
