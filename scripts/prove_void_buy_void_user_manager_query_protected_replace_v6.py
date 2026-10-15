#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE_REL = "ops/precision/void_buy_void_user_manager_query_protected_replace_v6.py"
SOURCE = ROOT / SOURCE_REL
LOCK_REL = "ops/security/buy-void-user-manager-query-elf-lock-v6.json"
LOCK = ROOT / LOCK_REL
CANDIDATE_REL = "ops/security/buy-void-user-manager-query-elf-candidate-v6.json"
CANDIDATE = ROOT / CANDIDATE_REL
HISTORICAL_REPLACE_REL = (
    "ops/precision/void_buy_void_user_manager_query_protected_replace_v2.py"
)
HISTORICAL_REPLACE = ROOT / HISTORICAL_REPLACE_REL

QUERY_SOURCE_REL = "ops/precision/void_buy_void_user_manager_private_unit_query_v1.c"
PREEXEC_SOURCE_REL = (
    "ops/precision/void_buy_void_user_manager_private_unit_query_preexec_v1.c"
)
PEER_SOURCE_REL = "ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c"

EXPECTED_BLOBS = {
    SOURCE_REL: "f81d9fbead60593258d17dbb8720e1efc867b20f",
    LOCK_REL: "772945b639d138284fc18cc312f7b9115b10c748",
    CANDIDATE_REL: "a341112695b1abbc61e0b4d88db9675b4fa15d83",
    HISTORICAL_REPLACE_REL: "25753737ac7719b0ceddc759904c81db0f7a1cae",
    QUERY_SOURCE_REL: "fc1f640689b7da7278ff013669ef8a10cd8f6659",
    PREEXEC_SOURCE_REL: "f0fbfaae97df3294097a281100f06ada2ef157ff",
    PEER_SOURCE_REL: "d8b30ac499c3bb8a5d223dbc6be687dd175be611",
}

LOCK_ID = (
    "voidbuyumqelflock6_3627a98945579452b01c79b4d114c54d858122496f2b20a20ddfd7fae6b0307c"
)
INSTALLED_V2_LOCK_ID = (
    "voidbuyumqelflock2_c643213ce46d6f2b4dfe04675a7fbbcaad2b6aea40418cb921586362a054f474"
)
INSTALLED_V2_SHA = (
    "d11304cb35be20dd4775677a2d5bf41c09f0f0b7a747ec7a8fea952e4bc8639c"
)
V6_SHA = "e791944bfa025a510d3693093668d71a9d122de8c581a924a1b45b4331ab43a6"
APPLY_TOKEN = "ATOMIC_EXCHANGE_ACCEPTED_USER_MANAGER_QUERY_V2_TO_V6"
ROLLBACK_TOKEN = "ATOMIC_EXCHANGE_ROLLBACK_USER_MANAGER_QUERY_V6_TO_V2"


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

source = SOURCE.read_text("utf-8")
compile(source, SOURCE_REL, "exec", dont_inherit=True)

for token in (
    LOCK_ID,
    INSTALLED_V2_LOCK_ID,
    INSTALLED_V2_SHA,
    V6_SHA,
    APPLY_TOKEN,
    ROLLBACK_TOKEN,
    'READY_STATE = "V2_GREEN_WITH_V1_PREDECESSOR_READY_FOR_V6"',
    'GREEN_STATE = "V6_GREEN_WITH_V1_V2_PREDECESSORS"',
    "V1_PREDECESSOR_NAME",
    "V2_PREDECESSOR_NAME",
    "RENAME_EXCHANGE = 2",
    "RENAME_NOREPLACE = 1",
    "_renameat2(dir_fd, STAGING_NAME, QUERY_NAME, RENAME_EXCHANGE)",
    "V2_PREDECESSOR_NAME,\n            RENAME_NOREPLACE",
    "automatic_rollback_attempted=true",
    "live_diagnostic_observed",
    "disposable_live_probe_observed",
    "superseded_by_v6_candidate_generation",
    "v1_predecessor_retained=true",
    "v2_predecessor_retained=true",
    "preexec_replacement=false",
    "query_execution=false",
    "service_mutation=false",
    "systemd_mutation=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "funds_movement=false",
):
    assert token in source, token

assert source.count('pathlib.Path("/opt/void-buy-void-user-manager-query-v1")') == 1
assert "os.unlink(V2_PREDECESSOR_NAME, dir_fd=dir_fd)" in source
assert "os.unlink(V1_PREDECESSOR_NAME" not in source
assert "os.unlink(PREEXEC_NAME" not in source
assert "os.unlink(QUERY_NAME" not in source

cmd = [sys.executable, "-I", "-B", str(SOURCE), "--self-test"]
self_test = subprocess.run(
    cmd,
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert self_test.returncode == 0, self_test.stderr + self_test.stdout
for line in (
    "VOID_BUY_VOID_USER_MANAGER_QUERY_PROTECTED_REPLACE_V6_SELF_TEST_GREEN",
    "renameat2_exchange_available=true",
    "preexec_replacement=false",
    "v1_predecessor_required=true",
    "v1_predecessor_preserved=true",
    "v2_predecessor_retained_after_success=true",
    "automatic_failure_rollback=true",
):
    assert line in self_test.stdout.splitlines(), line

plan = subprocess.run(
    [sys.executable, "-I", "-B", str(SOURCE), "--source-plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert plan.returncode == 0, plan.stderr + plan.stdout
plan_lines = set(plan.stdout.splitlines())
for line in (
    "VOID_BUY_VOID_USER_MANAGER_QUERY_PROTECTED_REPLACE_V6",
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "preexec_replacement=false",
    "v1_predecessor_required=true",
    "v1_predecessor_preserved=true",
    "v2_predecessor_retained_after_success=true",
    "query_atomic_exchange_required=true",
    "query_execution=false",
    "service_mutation=false",
    "systemd_mutation=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "funds_movement=false",
):
    assert line in plan_lines, line

missing_apply = subprocess.run(
    [
        sys.executable,
        "-I",
        "-B",
        str(SOURCE),
        "--apply",
        "--query",
        "/nonexistent/v6-query",
    ],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert missing_apply.returncode == 2
assert "reason=explicit_atomic_exchange_confirmation_required" in (
    missing_apply.stdout.splitlines()
)

missing_rollback = subprocess.run(
    [sys.executable, "-I", "-B", str(SOURCE), "--rollback"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert missing_rollback.returncode == 2
assert "reason=explicit_rollback_confirmation_required" in (
    missing_rollback.stdout.splitlines()
)

print("VOID_BUY_VOID_USER_MANAGER_QUERY_PROTECTED_REPLACE_V6_PROOF_GREEN")
print("accepted_v6_lock_bound=true")
print("corrected_v6_lock_truth_bound=true")
print("installed_v2_identity_bound=true")
print("fixed_preexec_unchanged=true")
print("v1_predecessor_preserved=true")
print("v2_predecessor_retained=true")
print("atomic_query_exchange_required=true")
print("automatic_failure_rollback=true")
print("explicit_apply_confirmation_required=true")
print("explicit_rollback_confirmation_required=true")
print("query_execution=false")
print("service_mutation=false")
print("systemd_mutation=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
