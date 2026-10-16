#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]

INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_native_protected_install_v1.py"
)
LOCK_REL = "ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v2.json"
NATIVE_SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c"
)
BINDER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
)

EXPECTED_BLOBS = {
    INSTALLER_REL: "3a986ca82651c777300bd1cceaf5ef2b24562b1f",
    LOCK_REL: "9e9661ded53116e2c3312108294a2675b6a6f900",
    NATIVE_SOURCE_REL: "4fdf3f627f407335b9d50800fbbc913d1edae523",
    BINDER_REL: "9c29eb4716077e459b9154f39d0f30cf2e56729f",
}

LOCK_ID = (
    "voidbuye2dormantbinderlock2_"
    "34df85425460aa9fc5192cee326de4b711deefbcb195dc6b7b6c3ebd23eb5597"
)
CANDIDATE_ID = (
    "voidbuye2dormantbindercand2_"
    "342712bbfdc6c999ca3c4bb132b02531df94356ffd1e5bb0b21d40c8f82d33ce"
)
NATIVE_SHA = "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
BINDER_SHA = "afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e"
CONFIRM = "INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V2_CREATE_ONLY"


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

source = (ROOT / INSTALLER_REL).read_text("utf-8")
compile(source, INSTALLER_REL, "exec", dont_inherit=True)

for token in (
    LOCK_ID,
    CANDIDATE_ID,
    NATIVE_SHA,
    BINDER_SHA,
    CONFIRM,
    'INSTALL_NAME = "void-buy-void-epoch2-dormant-v3r-binding-v2"',
    'STAGE_NAME = ".void-buy-void-epoch2-dormant-v3r-binding-v2.stage"',
    'NATIVE_NAME = "void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2"',
    'BINDER_NAME = "void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"',
    'READY_STATE = "DORMANT_BINDER_ROOT_ABSENT_READY_FOR_CREATE_ONLY"',
    'GREEN_STATE = "DORMANT_BINDER_NATIVE_PAIR_GREEN"',
    'raise InstallError("installer_git_object_stdin_required")',
    'if os.geteuid() == 0:',
    '"--clear-groups"',
    'elif os.geteuid() == RUNTIME_UID and os.getegid() == RUNTIME_GID:',
    'raise InstallError("git_query_identity_invalid")',
    "RENAME_NOREPLACE = 1",
    "_renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)",
    "expected_mode=0o555",
    "expected_mode=0o444",
    "atomic_root_publication_required=true",
    "rename_noreplace_required=true",
    "truthful_post_publication_failure_receipt=true",
    "PublishedInstallError",
    "_post_publication_checks",
    "_failure_receipt",
    "publication_state=published_verified",
    "published_needs_inspection",
    "post_publication_parent_fsync_failed",
    "post_publication_final_verification_failed",
    "automatic_stage_cleanup_attempted=true",
    "candidate_native_verified=",
    "binder_source_verified=",
    "native_execution=false",
    "binder_execution=false",
    "service_mutation=false",
    "systemd_mutation=false",
    "credential_access=false",
    "private_key_access=false",
    "signing=false",
    "transaction=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
):
    assert token in source, token

# Apply confirmation must precede stdin/root/candidate/checkout access.
apply_at = source.index("def apply(")
confirm_at = source.index("if confirm != CONFIRM_TOKEN", apply_at)
stdin_at = source.index("_require_apply_context()", confirm_at)
root_at = source.index('if os.geteuid() != 0:', stdin_at)
checkout_at = source.index("_verify_checkout(expected_head)", root_at)
candidate_at = source.index("native_raw = read_exact_candidate(native)", checkout_at)
state_at = source.index("state = protected_state()", candidate_at)
assert apply_at < confirm_at < stdin_at < root_at < checkout_at < candidate_at < state_at

# Stage is fully verified before its directory entry is published.
verify_stage = source.index("_verify_install_root(STAGE_ROOT)")
publish = source.index(
    "_renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)"
)
published_flag = source.index("published = True", publish)
post_checks = source.index("_post_publication_checks(opt_fd)", published_flag)
assert verify_stage < publish < published_flag < post_checks

# Create-only means no final-root unlink/rmdir/overwrite path.
for forbidden in (
    "os.unlink(INSTALL_NAME",
    "os.rmdir(INSTALL_NAME",
    "RENAME_EXCHANGE",
    "systemctl",
    "eth_send",
    "transaction_broadcast",
    "socket.socket",
):
    assert forbidden not in source, forbidden

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
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PROTECTED_INSTALL_V1_SELF_TEST_GREEN",
    "atomic_root_publication_required=true",
    "rename_noreplace_required=true",
    "truthful_post_publication_failure_receipt=true",
    "post_publication_fsync_failure_receipt_truthful=true",
    "post_publication_final_readback_failure_receipt_truthful=true",
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
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PROTECTED_INSTALL_V1",
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "accepted_lock_id=" + LOCK_ID,
    "create_only=true",
    "atomic_root_publication_required=true",
    "rename_noreplace_required=true",
    "native_execution=false",
    "binder_execution=false",
    "credential_access=false",
    "private_key_access=false",
    "signing=false",
    "transaction=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
):
    assert line in plan_lines, line

# Missing confirmation fails before candidate path / expected-head validity / host access.
missing_confirm = subprocess.run(
    cmd
    + [
        "--apply",
        "--native", "/definitely/not/a/native-candidate",
        "--expected-head", "0" * 40,
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
missing_lines = set(missing_confirm.stdout.splitlines())
assert "reason=explicit_create_only_confirmation_required" in missing_lines
assert "protected_install_performed=false" in missing_lines
assert "publication=false" in missing_lines

# Even with confirmation, direct mutable-worktree execution is not an apply path.
direct_apply = subprocess.run(
    cmd
    + [
        "--apply",
        "--native", "/definitely/not/a/native-candidate",
        "--expected-head", "0" * 40,
        "--confirm", CONFIRM,
    ],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert direct_apply.returncode == 2
direct_lines = set(direct_apply.stdout.splitlines())
assert "reason=installer_git_object_stdin_required" in direct_lines
assert "protected_install_performed=false" in direct_lines
assert "publication=false" in direct_lines

print("VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PROTECTED_INSTALL_V1_PROOF_GREEN")
print("accepted_dormant_binder_lock_bound=true")
print("exact_native_candidate_bound=true")
print("exact_binder_git_object_bound=true")
print("distinct_fixed_install_root=true")
print("root_git_object_stdin_required_for_apply=true")
print("create_only=true")
print("atomic_root_publication_required=true")
print("rename_noreplace_required=true")
print("native_mode_0555=true")
print("binder_mode_0444=true")
print("staging_cleanup_before_publication_failure=true")
print("explicit_apply_confirmation_required=true")
print("truthful_post_publication_failure_receipt=true")
print("post_publication_failure_requires_inspection=true")
print("native_execution=false")
print("binder_execution=false")
print("service_mutation=false")
print("systemd_mutation=false")
print("credential_access=false")
print("private_key_access=false")
print("signing=false")
print("transaction=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
print("production_host_evidence_authority=false")
