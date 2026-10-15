#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]

QUALIFIER_REL = "ops/precision/void_buy_void_user_manager_query_live_qualification_v6.py"
REPLACE_REL = "ops/precision/void_buy_void_user_manager_query_protected_replace_v6.py"
LOCK_REL = "ops/security/buy-void-user-manager-query-elf-lock-v6.json"
PARSER_REL = "tools/void-buy-allocation-custody-host-evidence-v4.mjs"
QUERY_REL = "ops/precision/void_buy_void_user_manager_private_unit_query_v1.c"
PREEXEC_REL = "ops/precision/void_buy_void_user_manager_private_unit_query_preexec_v1.c"
PEER_REL = "ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c"

EXPECTED_BLOBS = {
    QUALIFIER_REL: "83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc",
    REPLACE_REL: "f81d9fbead60593258d17dbb8720e1efc867b20f",
    LOCK_REL: "772945b639d138284fc18cc312f7b9115b10c748",
    PARSER_REL: "223a8acf32f8c7961d61222b83c0db17075f86c6",
    QUERY_REL: "fc1f640689b7da7278ff013669ef8a10cd8f6659",
    PREEXEC_REL: "f0fbfaae97df3294097a281100f06ada2ef157ff",
    PEER_REL: "d8b30ac499c3bb8a5d223dbc6be687dd175be611",
}

LOCK_ID = (
    "voidbuyumqelflock6_3627a98945579452b01c79b4d114c54d858122496f2b20a20ddfd7fae6b0307c"
)


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def read(relative: str) -> bytes:
    path = ROOT / relative
    before = path.lstat()
    assert path.is_file() and not path.is_symlink()
    assert before.st_nlink == 1 and before.st_size > 0
    raw = path.read_bytes()
    after = path.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        assert getattr(after, field) == getattr(before, field), (
            "file_changed:" + relative + ":" + field
        )
    return raw


for relative, expected in EXPECTED_BLOBS.items():
    assert git_blob(read(relative)) == expected, "blob_drift:" + relative

qualifier = (ROOT / QUALIFIER_REL).read_text("utf-8")
compile(qualifier, QUALIFIER_REL, "exec", dont_inherit=True)

for token in (
    LOCK_ID,
    "VOID_BUY_VOID_USER_MANAGER_QUERY_LIVE_QUALIFICATION_V6",
    "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_V1_GREEN",
    "V6_GREEN_WITH_V1_V2_PREDECESSORS",
    "V1_PREDECESSOR_TARGET",
    "V2_PREDECESSOR_TARGET",
    "double_authenticated_query_stable",
    "cap_last_cap_projection_contract_verified",
    "kernel_cap_last_cap_stable",
    "kernel_supported_capability_mask",
    "capability_bounding_set_kernel_match",
    "process_nonbounding_capabilities_zero",
    "KernelCapBnd",
    "CapabilityBoundingSet",
    "PrivateUsers",
    "query_execution",
    "host_mutation",
    "production_host_evidence_authority",
):
    assert token in qualifier, token

assert "BIND_V2_AUTHENTICATED_MAINPID_IN_REQUEST_ROOT_CENSUS" not in qualifier
assert "BIND_V6_AUTHENTICATED_MAINPID_IN_REQUEST_ROOT_CENSUS_SUCCESSOR" in qualifier

self_test = subprocess.run(
    [sys.executable, "-I", "-B", str(ROOT / QUALIFIER_REL), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert self_test.returncode == 0, self_test.stderr + self_test.stdout
assert (
    "VOID_BUY_VOID_USER_MANAGER_QUERY_LIVE_QUALIFICATION_V6_SELF_TEST_GREEN"
    in self_test.stdout.splitlines()
)

plan = subprocess.run(
    [sys.executable, "-I", "-B", str(ROOT / QUALIFIER_REL), "--plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert plan.returncode == 0, plan.stderr + plan.stdout
lines = set(plan.stdout.splitlines())
for line in (
    "VOID_BUY_VOID_USER_MANAGER_QUERY_LIVE_QUALIFICATION_V6",
    "mode=plan",
    "root_required_for_run=true",
    "accepted_lock_id=" + LOCK_ID,
    "protected_v6_generation_verification_required=true",
    "v1_predecessor_verification_required=true",
    "v2_predecessor_verification_required=true",
    "double_authenticated_query_required=true",
    "private_users_false_required=true",
    "kernel_active_capabilities_zero_required=true",
    "cap_last_cap_projection_contract_required=true",
    "kernel_cap_last_cap_runtime_read_required=true",
    "configured_kernel_bounding_set_equality_required=true",
    "query_execution=false",
    "host_mutation=false",
    "filesystem_write=false",
    "service_mutation=false",
    "systemd_mutation=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
    "next_action=SEPARATELY_AUTHORIZE_V6_READ_ONLY_LIVE_QUALIFICATION",
):
    assert line in lines, line

print("VOID_BUY_VOID_USER_MANAGER_QUERY_LIVE_QUALIFICATION_V6_PROOF_GREEN")
print("corrected_v6_lock_bound=true")
print("protected_v6_generation_required=true")
print("v1_predecessor_required=true")
print("v2_predecessor_required=true")
print("double_authenticated_query_required=true")
print("cap_last_cap_projection_contract_required=true")
print("kernel_cap_last_cap_runtime_read_required=true")
print("private_users_false_required=true")
print("kernel_active_capabilities_zero_required=true")
print("query_execution_in_plan=false")
print("host_mutation=false")
print("service_mutation=false")
print("systemd_mutation=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
