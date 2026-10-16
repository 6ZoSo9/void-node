#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import pathlib
import subprocess
import sys
import types
import os

ROOT = pathlib.Path(__file__).resolve().parents[1]

INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
)
LOCK_REL = "ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json"
NATIVE_SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c"
)
BINDER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
)

EXPECTED_BLOBS = {
    INSTALLER_REL: "37f8b9269e91ac37c65a527e5e3f87b6e5b10213",
    LOCK_REL: "5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1",
    NATIVE_SOURCE_REL: "4fdf3f627f407335b9d50800fbbc913d1edae523",
    BINDER_REL: "9c29eb4716077e459b9154f39d0f30cf2e56729f",
}

LOCK_ID = (
    "voidbuye2dormantbinderlock3_"
    "a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a"
)
CANDIDATE_ID = (
    "voidbuye2dormantbindercand2_"
    "8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d"
)
NATIVE_SHA = "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
BINDER_SHA = "afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e"
CONFIRM = "INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V3_CREATE_ONLY"


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

module = types.ModuleType("void_e2_dormant_binder_install_v2_proof")
module.__file__ = str(ROOT / INSTALLER_REL)
module.__package__ = ""
exec(compile(source, INSTALLER_REL, "exec", dont_inherit=True), module.__dict__)
module.FIXED_CHECKOUT = ROOT
module.RUNTIME_UID = os.geteuid()
module.RUNTIME_GID = os.getegid()
head = subprocess.run(
    ["/usr/bin/git", "-C", str(ROOT), "rev-parse", "--verify", "HEAD"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=True,
    timeout=30,
).stdout.strip()
accepted = module.accepted_lock(head)
assert accepted["lock_id"] == LOCK_ID
assert accepted["candidate_report"]["candidate_id"] == CANDIDATE_ID
assert accepted["superseded_pre_3363_locks_install_authority"] is False
assert accepted["candidate_report"]["verified_helper_execution_bound"] is True
assert (
    accepted["candidate_report"]["merged_v1_helper_execution"][
        "executed_from_verified_bytes"
    ]
    is True
)
assert (
    accepted["candidate_report"]["merged_v1_helper_execution"][
        "mutable_path_import"
    ]
    is False
)

for token in (
    '"voidbuye2dormantbinderlock3_"',
    '"a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a"',
    '"voidbuye2dormantbindercand2_"',
    '"8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d"',
    NATIVE_SHA,
    BINDER_SHA,
    CONFIRM,
    'INSTALL_NAME = "void-buy-void-epoch2-dormant-v3r-binding-v2"',
    'STAGE_NAME = ".void-buy-void-epoch2-dormant-v3r-binding-v2.stage"',
    'NATIVE_NAME = "void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2"',
    'BINDER_NAME = "void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"',
    'READY_STATE = "DORMANT_BINDER_ROOT_ABSENT_READY_FOR_CREATE_ONLY"',
    'GREEN_STATE = "DORMANT_BINDER_NATIVE_PAIR_GREEN"',
    'raise InstallError("authenticated_first_entry_required")',
    '"VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_INSTALLER_FD"',
    '"VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_NATIVE_FD"',
    '"authenticated_first_entry_fd_contract_required_for_apply=true"',
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
    "operation_bound_plan_id_required=true",
    "authenticated_first_entry_fd_contract_required_for_apply=true",
    "prepublication_revalidation_required=true",
    "post_publication_rollback=false",
    "expected_plan_id_mismatch",
    "native_candidate_changed_before_publish",
    "binder_source_changed_before_publish",
    "truthful_post_publication_failure_receipt=true",
    "post_3363_verified_helper_generation_required=true",
    "superseded_pre_3363_locks_install_authority=false",
    "verified_helper_execution_bound",
    "accepted_lock_verified_helper_execution_invalid",
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

# Apply authority order: confirmation, plan-id shape, immutable entry/root,
# then exact plan recomputation.
tree = ast.parse(source)
functions = {
    node.name: node
    for node in tree.body
    if isinstance(node, ast.FunctionDef)
}
assert "apply" in functions
assert "_collect_plan" in functions
assert "_revalidate_before_publication" in functions
apply_source = ast.get_source_segment(source, functions["apply"])
collect_source = ast.get_source_segment(source, functions["_collect_plan"])
revalidate_source = ast.get_source_segment(
    source, functions["_revalidate_before_publication"]
)
assert apply_source is not None
assert collect_source is not None
assert revalidate_source is not None

confirm_at = apply_source.index("if confirm != CONFIRM_TOKEN")
plan_shape_at = apply_source.index("not expected_plan_id.startswith(PLAN_PREFIX)")
entry_at = apply_source.index("_require_apply_context(native)")
root_at = apply_source.index('if os.geteuid() != 0:')
collect_at = apply_source.index("result = _collect_plan(native, expected_head)")
plan_match_at = apply_source.index('result["plan_id"] != expected_plan_id')
assert confirm_at < plan_shape_at < entry_at < root_at < collect_at < plan_match_at

checkout_at = collect_source.index("_verify_checkout(expected_head)")
lock_at = collect_source.index("accepted_lock(expected_head)")
candidate_at = collect_source.index("native_raw = read_exact_candidate(native)")
binder_at = collect_source.index("binder_raw = _git_object(")
state_at = collect_source.index("state = protected_state()")
plan_id_at = collect_source.index('"plan_id": PLAN_PREFIX + sha256')
assert checkout_at < lock_at < candidate_at < binder_at < state_at < plan_id_at

assert "_verify_checkout(expected_head)" in revalidate_source
assert "accepted_lock(expected_head)" in revalidate_source
assert "read_exact_candidate(native) != native_raw" in revalidate_source
assert "current_binder = _git_object(" in revalidate_source
assert "current_binder != binder_raw" in revalidate_source

verify_stage = apply_source.index("_verify_install_root(STAGE_ROOT)")
revalidate_at = apply_source.index("_revalidate_before_publication(")
publish = apply_source.index(
    "_renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)"
)
published_flag = apply_source.index("published = True", publish)
post_checks = apply_source.index("_post_publication_checks(opt_fd)", published_flag)
assert verify_stage < revalidate_at < publish < published_flag < post_checks
assert apply_source.count("_renameat2(") == 1
assert "INSTALL_NAME, STAGE_NAME" not in apply_source

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
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PROTECTED_INSTALL_V2_SELF_TEST_GREEN",
    "atomic_root_publication_required=true",
    "rename_noreplace_required=true",
    "truthful_post_publication_failure_receipt=true",
    "post_publication_fsync_failure_receipt_truthful=true",
    "post_publication_final_readback_failure_receipt_truthful=true",
    "operation_bound_plan_id_required=true",
    "prepublication_revalidation_required=true",
    "post_publication_rollback=false",
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
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PROTECTED_INSTALL_V2",
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "accepted_lock_id=" + LOCK_ID,
    "post_3363_verified_helper_generation_required=true",
    "superseded_pre_3363_locks_install_authority=false",
    "create_only=true",
    "atomic_root_publication_required=true",
    "rename_noreplace_required=true",
    "operation_bound_plan_id_required=true",
    "prepublication_revalidation_required=true",
    "post_publication_rollback=false",
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

# Correct confirmation but malformed/missing plan id must fail before
# checkout, candidate, binder, or /opt access.
bad_plan = subprocess.run(
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
assert bad_plan.returncode == 2
bad_plan_lines = set(bad_plan.stdout.splitlines())
assert "reason=expected_plan_id_invalid" in bad_plan_lines
assert "candidate_lstat_failed" not in bad_plan.stdout
assert "checkout_head_mismatch" not in bad_plan.stdout
assert "trusted_directory_unavailable:/opt" not in bad_plan.stdout

# Even with confirmation, direct mutable-worktree execution is not an apply path.
direct_apply = subprocess.run(
    cmd
    + [
        "--apply",
        "--native", "/definitely/not/a/native-candidate",
        "--expected-head", "0" * 40,
        "--expected-plan-id", module.PLAN_PREFIX + "0" * 64,
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
assert "reason=authenticated_first_entry_required" in direct_lines
assert "protected_install_performed=false" in direct_lines
assert "publication=false" in direct_lines

print("VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PROTECTED_INSTALL_V2_PROOF_GREEN")
print("accepted_dormant_binder_v3_lock_bound=true")
print("post_3363_verified_helper_generation_bound=true")
print("accepted_v3_lock_parser_exercised=true")
print("superseded_pre_3363_locks_install_authority=false")
print("exact_native_candidate_bound=true")
print("exact_binder_git_object_bound=true")
print("distinct_fixed_install_root=true")
print("authenticated_first_entry_fd_contract_required_for_apply=true")
print("create_only=true")
print("atomic_root_publication_required=true")
print("rename_noreplace_required=true")
print("native_mode_0555=true")
print("binder_mode_0444=true")
print("staging_cleanup_before_publication_failure=true")
print("explicit_apply_confirmation_required=true")
print("operation_bound_plan_id_required=true")
print("plan_id_validation_precedes_host_access=true")
print("prepublication_revalidation_required=true")
print("post_publication_rollback=false")
print("single_final_root_publish_call=true")
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
print("next_gate=EPOCH2_DORMANT_BINDER_INSTALLED_READ_ONLY_QUALIFICATION_V2")
