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
    "void_buy_allocation_custody_runtime_v3_host_namespace_lease_census_v1.py"
)
EXPECTED_SOURCE_BLOB = "132c34244c795e886f5e2bc729e5e05697f06486"


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_v3_host_namespace_lease_census_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_HOST_NAMESPACE_LEASE_CENSUS_V1"
)
assert module.SCHEMA == (
    "void_buy_void_custody_runtime_v3_host_namespace_lease_census_v1"
)
assert module.DESIGNATED_HOST_POLICY_REL == (
    "ops/precision/"
    "void_economic_sponsored_runtime_storage_designated_host_plan_v3.py"
)
assert module.DESIGNATED_HOST_POLICY_BLOB == (
    "4234379cb7e283e03c654e10d0d7fe8986e99897"
)
assert module.EXPECTED_HOSTNAME == "zoso-Precision-Tower-7810"
assert module.EXPECTED_OPERATOR == "zoso"
assert module.EXPECTED_OPERATOR_UID == 1000
assert module.EXPECTED_MACHINE_ID_SHA256 == (
    "11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2"
)

module.verify_designated_host_policy()

assert module.verify_namespace_relationship(
    (12, 34), (12, 34), "pid_namespace"
) == (12, 34)
try:
    module.verify_namespace_relationship(
        (12, 34), (12, 35), "pid_namespace"
    )
except module.CensusHold as exc:
    assert "not_in_pid1_pid_namespace" in str(exc)
else:
    raise AssertionError("private PID namespace relationship accepted")

visible_mountinfo = (
    b"42 1 0:5 / /proc rw,nosuid,nodev,noexec,relatime"
    b" - proc proc rw,hidepid=0\n"
)
hidden_mountinfo = (
    b"42 1 0:5 / /proc rw,nosuid,nodev,noexec,relatime"
    b" - proc proc rw,hidepid=2\n"
)
fake = type("FakeStat", (), {"st_dev": __import__("os").makedev(0, 5)})()
assert module._parse_proc_mountinfo(
    visible_mountinfo, fake
)["hidepid_restricted"] is False
try:
    module._parse_proc_mountinfo(hidden_mountinfo, fake)
except module.CensusHold as exc:
    assert "proc_visibility_restricted" in str(exc)
else:
    raise AssertionError("restricted procfs visibility accepted")

module.self_test()

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

source = TARGET.read_text(encoding="utf-8")
pre_self_test = source.split("def self_test()", 1)[0]

for forbidden in (
    "subprocess",
    "systemctl",
    "sudo ",
    "os.write(",
    "os.pwrite(",
    "os.unlink(",
    "os.rename(",
    "os.replace(",
    "os.chmod(",
    "os.chown(",
    "os.fchmod(",
    "os.fchown(",
    "socket.socket(",
    ".connect(",
):
    assert forbidden not in pre_self_test, forbidden

for required in (
    "dont_write_bytecode",
    "verify_designated_host_policy",
    "DESIGNATED_HOST_POLICY_BLOB",
    "EXPECTED_HOSTNAME",
    "EXPECTED_OPERATOR_UID",
    "EXPECTED_MACHINE_ID_SHA256",
    "_machine_id_sha256",
    "verify_namespace_relationship",
    "self/ns/pid",
    "1/ns/pid",
    "self/ns/mnt",
    "1/ns/mnt",
    "_parse_proc_mountinfo",
    "hidepid=",
    "_boot_id_sha256",
    "retained_procfs_view_revalidated",
    "namespace_lease_is_install_authority",
    "namespace_lease_external_review_completed",
    "automatic_process_census_feed_authorized",
    "replacement_apply_authorized",
    "payment_acceptance",
    "public_presale_activation",
    "funds_movement",
):
    assert required in source, required

print("VOID_BUY_VOID_CUSTODY_RUNTIME_V3_HOST_NAMESPACE_LEASE_CENSUS_V1_PROOF_GREEN")
print("exact_source_blob_asserted=true")
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
print("python_no_bytecode_mode_required=true")
print("without_dash_b_bootstrap_hold=true")
print("host_collection_not_executed_in_ci=true")
print("production_filesystem_write=false")
print("test_fixture_filesystem_write=true")
print("namespace_lease_is_install_authority=false")
print("namespace_lease_external_review_completed=false")
print("automatic_process_census_feed_authorized=false")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
