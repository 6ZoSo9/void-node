#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]

INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_user_manager_credential_query_protected_install_v1.py"
)
LOCK_REL = "ops/security/buy-void-user-manager-credential-query-elf-lock-v1.json"
CANDIDATE_REL = (
    "ops/security/buy-void-user-manager-credential-query-elf-candidate-v1.json"
)
QUERY_REL = (
    "ops/precision/"
    "void_buy_void_user_manager_private_credential_unit_query_v1.c"
)
PREEXEC_REL = (
    "ops/precision/"
    "void_buy_void_user_manager_private_credential_unit_query_preexec_v1.c"
)
QUERY_PROOF_REL = (
    "scripts/prove_void_buy_user_manager_private_credential_unit_query_v1.mjs"
)
PREEXEC_PROOF_REL = (
    "scripts/"
    "prove_void_buy_void_user_manager_private_credential_unit_query_preexec_v1.mjs"
)

EXPECTED_BLOBS = {
    INSTALLER_REL: "e497ee1239865888303db56d0ff0ffeceb583516",
    LOCK_REL: "a434fa671c5a1ca3237efcb51f16223cc27cf4fa",
    CANDIDATE_REL: "beedebce690b8ed26422f3bc579f90d6d1405936",
    QUERY_REL: "e12e0b16df6e6eb5fd912a6dbf6ae970673246f9",
    PREEXEC_REL: "0ccd2d07a951389d85a9fc56ec892a774d9dd681",
    QUERY_PROOF_REL: "ec3803e766fd679eb53c84cc0b3d7069e33c2932",
    PREEXEC_PROOF_REL: "58df08ca966f4629893c3885f1df37c837762520",
}

LOCK_ID = (
    "voidbuyumqcredelflock1_"
    "65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c"
)
PREEXEC_SHA = (
    "67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c"
)
QUERY_SHA = (
    "7b968a20f1507215477f43a59c5d82b9e9adca918ce5f2df566292d8380b4cb1"
)
CONFIRM = "INSTALL_ACCEPTED_USER_MANAGER_CREDENTIAL_QUERY_PAIR_CREATE_ONLY_V1"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def read(relative: str) -> bytes:
    path = ROOT / relative
    before = path.lstat()
    assert path.is_file() and not path.is_symlink(), relative
    assert before.st_nlink == 1 and before.st_size > 0, relative
    raw = path.read_bytes()
    after = path.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        assert getattr(after, field) == getattr(before, field), (
            "file_changed:" + relative + ":" + field
        )
    return raw


for relative, expected in EXPECTED_BLOBS.items():
    assert git_blob(read(relative)) == expected, "blob_drift:" + relative

installer = (ROOT / INSTALLER_REL).read_text("utf-8")
compile(installer, INSTALLER_REL, "exec", dont_inherit=True)

for token in (
    LOCK_ID,
    PREEXEC_SHA,
    QUERY_SHA,
    CONFIRM,
    'INSTALL_NAME = "void-buy-void-user-manager-credential-query-v1"',
    'STAGE_NAME = ".void-buy-void-user-manager-credential-query-v1.stage"',
    'READY_STATE = "CREDENTIAL_QUERY_ROOT_ABSENT_READY_FOR_CREATE_ONLY"',
    'GREEN_STATE = "CREDENTIAL_QUERY_PAIR_GREEN"',
    "RENAME_NOREPLACE = 1",
    "_renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)",
    "atomic_root_publication_required=true",
    "rename_noreplace_required=true",
    "candidate_pair_verified=",
    "automatic_stage_cleanup_attempted=true",
    "automatic_stage_cleanup_green=",
    "query_execution=false",
    "service_mutation=false",
    "systemd_mutation=false",
    "credential_contents_read=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "transaction=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
):
    assert token in installer, token

for forbidden in (
    "subprocess",
    "systemctl",
    "socket.",
    "requests.",
    "urllib",
    "eth_send",
    "wallet",
    "private_key",
):
    assert forbidden not in installer, "forbidden_source_token:" + forbidden

assert installer.count("os.mkdir(STAGE_NAME, 0o755, dir_fd=opt_fd)") == 1
assert installer.count("_verify_pair_root(STAGE_ROOT)") == 1
assert installer.index("_verify_pair_root(STAGE_ROOT)") < installer.index(
    "_renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)"
)
assert "os.unlink(INSTALL_NAME" not in installer
assert "os.rmdir(INSTALL_NAME" not in installer

cmd = [
    sys.executable,
    "-I",
    "-B",
    str(ROOT / INSTALLER_REL),
]

self_test = subprocess.run(
    cmd + ["--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert self_test.returncode == 0, self_test.stderr + self_test.stdout
self_lines = set(self_test.stdout.splitlines())
for line in (
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_INSTALL_V1_SELF_TEST_GREEN",
    "atomic_root_publication_required=true",
    "rename_noreplace_required=true",
):
    assert line in self_lines, line

source_plan = subprocess.run(
    cmd + ["--source-plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert source_plan.returncode == 0, source_plan.stderr + source_plan.stdout
plan_lines = set(source_plan.stdout.splitlines())
for line in (
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_INSTALL_V1",
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "accepted_lock_id=" + LOCK_ID,
    "create_only=true",
    "atomic_root_publication_required=true",
    "rename_noreplace_required=true",
    "query_execution=false",
    "service_mutation=false",
    "systemd_mutation=false",
    "credential_contents_read=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "transaction=false",
    "funds_movement=false",
):
    assert line in plan_lines, line

# Confirmation must be checked before candidate paths, root identity, or host state.
missing_confirm = subprocess.run(
    cmd
    + [
        "--apply",
        "--preexec",
        "/nonexistent/preexec",
        "--query",
        "/nonexistent/query",
    ],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert missing_confirm.returncode == 2
assert "reason=explicit_create_only_confirmation_required" in (
    missing_confirm.stdout.splitlines()
)
assert "protected_install_performed=false" in missing_confirm.stdout.splitlines()

print(
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_INSTALL_V1_PROOF_GREEN"
)
print("accepted_credential_lock_bound=true")
print("exact_candidate_pair_bound=true")
print("distinct_fixed_install_root=true")
print("create_only=true")
print("atomic_root_publication_required=true")
print("rename_noreplace_required=true")
print("staging_cleanup_before_publication_failure=true")
print("explicit_apply_confirmation_required=true")
print("query_execution=false")
print("service_mutation=false")
print("systemd_mutation=false")
print("credential_contents_read=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("transaction=false")
print("funds_movement=false")
