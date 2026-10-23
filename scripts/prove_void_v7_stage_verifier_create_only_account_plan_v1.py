#!/usr/bin/env python3
"""Exact-source, strictly non-mutating account-provisioning DESIGN proof."""

import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PLAN_REL = "ops/security/void_v7_stage_verifier_create_only_account_plan_v1.json"
ROLE_REL = "ops/security/void_v7_v5_stage_role_separation_contract_v1.json"
SOURCE_REL = "ops/precision/void_buy_void_v7_v5_source_stage_install_v1.py"
PLAN_BLOB = "d48634d76ca277794090423d98da978a791d0e28"
ROLE_BLOB = "1dccc0f7fd1c74005b519113b0728ebd25477ad5"
SOURCE_BLOB = "b8b52649730cd1b1cf23ffc8c68878cef8ecfc5b"
UPSTREAM_HEAD = "eca1b2313f7c384b619151998613d9374fde1bc2"
MARKER = "VOID_V7_STAGE_VERIFIER_CREATE_ONLY_ACCOUNT_PLAN_V1_PROOF"


def git(*args):
    env = dict(
        PATH="/usr/bin:/bin",
        HOME="/nonexistent",
        LANG="C", LC_ALL="C", TZ="UTC",
        GIT_CONFIG_NOSYSTEM="1",
        GIT_CONFIG_SYSTEM="/dev/null",
        GIT_CONFIG_GLOBAL="/dev/null",
        GIT_NO_REPLACE_OBJECTS="1",
        GIT_NO_LAZY_FETCH="1",
        GIT_OPTIONAL_LOCKS="0",
        GIT_TERMINAL_PROMPT="0",
        GIT_ASKPASS="/bin/false",
        GIT_ALLOW_PROTOCOL="",
    )
    p = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
        env=env, check=False, stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30,
    )
    assert p.returncode == 0, "git_error:" + args[0]
    assert p.stderr == "", "git_stderr"
    return p.stdout.strip()


def read_bounded(rel, bound=32768):
    p = ROOT / rel
    assert p.is_file() and not p.is_symlink(), "source_kind"
    before = p.stat()
    assert before.st_size < bound, "source_oversize"
    with p.open("rb") as f:
        data = f.read(bound + 1)
        during = os.fstat(f.fileno())
    after = p.stat()
    assert len(data) <= bound, "source_oversize"
    assert (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) == (
        during.st_dev, during.st_ino, during.st_size, during.st_mtime_ns
    ) == (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns), "source_drift"
    return data


def unique_object(items):
    out = {}
    for k, v in items:
        if k in out:
            raise ValueError("duplicate_key:" + k)
        out[k] = v
    return out


def exact_source(rel, blob):
    assert git("rev-parse", "HEAD:" + rel) == blob, "HEAD_blob_mismatch:" + rel
    assert git("hash-object", "--no-filters", rel) == blob, "worktree_blob_mismatch:" + rel


def classify_synthetic(snapshot):
    # Test shape only, never an authorization decision.
    if snapshot["user_present"] or snapshot["group_present"]:
        return "HOLD_PREEXISTING_NAME"
    if type(snapshot["uid"]) is not int or type(snapshot["gid"]) is not int:
        return "HOLD_UID_GID_NOT_SELECTED"
    if snapshot["uid"] <= 0 or snapshot["gid"] <= 0:
        return "HOLD_ROOT_OR_INVALID_SLOT"
    if snapshot["uid"] in (994, 995, 1000) or snapshot["gid"] in (980, 981, 982, 1000):
        return "HOLD_RESERVED_ID"
    if snapshot["uid"] in snapshot["live_uid_slots"] or snapshot["gid"] in snapshot["live_gid_slots"]:
        return "HOLD_LIVE_PROCESS_COLLISION"
    if not snapshot["system_ranges_match"] or not snapshot["local_slot_empty"]:
        return "HOLD_SYSTEM_SLOT_COLLISION"
    if not snapshot["persistent_mount_scope_authenticated"]:
        return "HOLD_FILESYSTEM_SCOPE"
    if not snapshot["numeric_file_ownership_acl_collision_absent"]:
        return "HOLD_ORPHANED_FILESYSTEM_AUTHORITY"
    if snapshot["nss_profile"] != "PASSWD_FILES_GROUP_FILES":
        return "HOLD_NONLOCAL_NSS"
    if not snapshot["host_pid_initial_user_namespace_leases"]:
        return "HOLD_NAMESPACE_LEASE"
    if not snapshot["complete_full_procfs_census"]:
        return "HOLD_PROCFS_CENSUS"
    if not snapshot["account_db_stable_root_custody"]:
        return "HOLD_ACCOUNT_DB_CUSTODY"
    if not snapshot["fresh_immediately_before_creation"]:
        return "HOLD_STALE_GENERATION"
    if not snapshot["independent_first_entry"]:
        return "HOLD_FIRST_ENTRY_TRUST"
    if not snapshot["separate_owner_authorization"]:
        return "HOLD_OPERATOR_APPROVAL"
    if snapshot["shell"] != "/usr/sbin/nologin" or snapshot["create_home"]:
        return "HOLD_LOGIN_SURFACE"
    if not snapshot["password_locked"]:
        return "HOLD_PASSWORD_UNLOCKED"
    if snapshot["supplementary_groups"] != [] or snapshot["custody_ipc_access"]:
        return "HOLD_CUSTODY_OR_GROUP_ACCESS"
    if snapshot["root_stage_or_operator_home_write"]:
        return "HOLD_EXTRA_WRITES"
    if not snapshot["create_only_receipt_available"]:
        return "HOLD_NO_CREATE_ONLY_RECEIPT"
    if not snapshot["partial_creation_manual_recovery_policy"]:
        return "HOLD_RECOVERY_POLICY"
    return "SHAPE_ONLY_PENDING_SEPARATELY_REVIEWED_PROVISIONER"


assert os.geteuid() != 0, "root_execution_forbidden"
assert git("merge-base", "--is-ancestor", UPSTREAM_HEAD, "HEAD") == ""
for path, blob in ((PLAN_REL, PLAN_BLOB), (ROLE_REL, ROLE_BLOB), (SOURCE_REL, SOURCE_BLOB)):
    exact_source(path, blob)
plan = json.loads(read_bounded(PLAN_REL).decode("utf-8", "strict"), object_pairs_hook=unique_object)
role = json.loads(read_bounded(ROLE_REL).decode("utf-8", "strict"), object_pairs_hook=unique_object)

assert plan["marker"] == "VOID_V7_STAGE_VERIFIER_CREATE_ONLY_ACCOUNT_PLAN_V1"
assert plan["schema"] == "void_v7_stage_verifier_create_only_account_plan_v1"
assert plan["lifecycle"] == "SOURCE_ONLY_NO_NUMERIC_ID_SELECTED"
assert plan["repository"] == "6ZoSo9/void-node"
assert plan["upstream"] == {
    "role_separation_pr": 3748,
    "role_separation_head": UPSTREAM_HEAD,
    "role_separation_contract_path": ROLE_REL,
    "role_separation_contract_blob": ROLE_BLOB,
    "canonical_stage_pr": 3726,
    "canonical_stage_installer_blob": SOURCE_BLOB,
    "source_implementation_untouched": True,
}

account = plan["proposed_identity"]
assert account["user_name"] == account["primary_group_name"] == "void-v7-stage-verifier"
assert account["uid"] is account["gid"] is None
assert account["uid_gid_numeric_slots_selected"] is False
assert account["passwd_entry_creation_authorized"] is False
assert account["group_entry_creation_authorized"] is False
assert account["system_account_required"] is True
assert account["login_shell"] == "/usr/sbin/nologin"
assert account["password_locked_required"] is True
assert account["home_directory_creation"] is False
assert account["supplementary_groups"] == []
for name in ("no_custody_IPC_membership", "no_sudo_or_polkit_authority",
             "no_operator_home_read_write", "no_wallet_signer_treasury_key_access"):
    assert account[name] is True, name
assert account["allowed_future_stage_access"] == "exact_named_user_read_search_acl_only_during_verified_private_stage"
assert role["stage_verifier"]["uid"] is None and role["stage_verifier"]["gid"] is None
assert role["stage_verifier"]["status"] == "UNSELECTED"
assert role["root_copier"]["owner_uid"] == 0
assert role["candidate_owner"]["uid"] == 1000

obs = plan["observation"]
assert obs["evidence_kind"] == "PRIOR_OPERATOR_REPORTED_UNAUTHENTICATED"
assert obs["observed_utc"] == "2026-10-23T15:14:09Z"
assert obs["proposed_user_absent_reported"] is obs["proposed_group_absent_reported"] is True
assert (obs["operator_uid"], obs["operator_gid"], obs["custody_ipc_gid"]) == (1000, 1000, 980)
assert obs["custody_ipc_group"] == "void-buy-custody-ipc"
assert obs["reserved_accounts"] == [
    {"name": "void-buy-custody", "uid": 994, "primary_gid": 981, "ipc_gid": 980},
    {"name": "void-buy-runtime", "uid": 995, "primary_gid": 982, "ipc_gid": 980},
]
for key in ("live_host_evidence_verified", "same_boot_host_process_census_verified",
            "NSS_local_only_authority_verified"):
    assert obs[key] is False, key

operations = plan["future_create_only_operations"]
assert len(operations) == 2
assert operations[0] == {
    "order": 1,
    "kind": "create_exact_group",
    "requires_preexisting_name_absent": True,
    "requires_reviewed_numeric_gid": True,
    "host_mutation_in_this_generation": False,
}
assert operations[1] == {
    "order": 2,
    "kind": "create_exact_system_user",
    "requires_preexisting_name_absent": True,
    "requires_reviewed_numeric_uid": True,
    "primary_group_must_equal_created_group": True,
    "locked_password": True,
    "login_shell": "/usr/sbin/nologin",
    "create_home": False,
    "supplementary_group_count": 0,
    "host_mutation_in_this_generation": False,
}

expected_host_gates = (
    "fresh_explicit_operator_host_authorization",
    "separately_authenticated_root_first_entry_and_manifest",
    "externally_reviewed_host_initial_user_namespace_lease",
    "externally_reviewed_host_pid_namespace_lease",
    "stable_root_owned_direct_local_nss_files",
    "require_passwd_and_group_files_only_nss_resolution",
    "validate_shadow_gshadow_nsswitch_login_defs_custody",
    "getent_user_group_names_absent_in_entire_nss_view",
    "exact_unused_uid_gid_within_reviewed_system_ranges",
    "reject_all_existing_login_custody_runtime_ipc_uid_gid",
    "full_procfs_host_pid_credential_census_not_hidepid",
    "exclude_all_four_live_uid_gid_slots_and_supplementary_groups",
    "exclude_deleted_account_live_process_ids_and_userns_collisions",
    "exclude_systemd_dynamic_user_or_service_id_reservations",
    "authenticated_approved_persistent_local_filesystem_mount_scope_and_generation",
    "exclude_preexisting_uid_gid_file_ownership_and_numeric_posix_acl_references",
    "repeat_complete_nss_and_live_process_census_immediately_before_each_creation",
    "create_only_group_then_create_only_user_no_modify_existing_entries",
    "bind_account_and_group_creation_to_exact_root_owned_host_receipt",
    "no_sudo_polkit_admin_custody_ipc_or_ssh_authorization_grants",
    "no_home_directory_shell_or_password_login_enabled",
    "post_create_verify_locked_shell_primary_gid_supplementary_groups_empty",
    "post_create_verify_no_process_and_no_stage_or_custody_access",
    "operator_approval_for_any_followup_acl_staging_or_service_operation",
)
assert plan["mandatory_fresh_provision_gates"] == list(expected_host_gates)
assert len(plan["required_post_provision_qualification"]) == 11
recov = plan["failure_and_recovery"]
assert recov["status"] == "HOLD_ON_PARTIAL_CREATION_NO_AUTOMATIC_ROLLBACK"
for key in (
    "require_exact_create_order", "no_overwrite_reuse_or_usermod",
    "no_unconditional_userdel_groupdel",
    "record_create_only_group_user_generation_before_next_step",
    "failure_preserves_existing_records_for_review",
    "rollback_requires_distinct_explicit_authorization",
    "rollback_requires_no_process_no_acl_no_group_membership_no_file_ownership",
    "rollback_requires_same_inode_and_account_generation_proof",
    "never_remove_preexisting_account_or_group",
    "future_host_provisioner_required_not_implemented",
):
    assert recov[key] is True, key
authority = plan["denied_authority"]
assert authority["source_only"] is True
assert len(authority) >= 15
for key, value in authority.items():
    if key != "source_only":
        assert value is False, "authority_true:" + key

candidate = {
    "user_present": False, "group_present": False,
    "uid": 65000, "gid": 65001,  # Synthetic only, NEVER a host selection.
    "live_uid_slots": set(), "live_gid_slots": set(),
    "system_ranges_match": True, "local_slot_empty": True,
    "persistent_mount_scope_authenticated": True,
    "numeric_file_ownership_acl_collision_absent": True,
    "nss_profile": "PASSWD_FILES_GROUP_FILES",
    "host_pid_initial_user_namespace_leases": True,
    "complete_full_procfs_census": True,
    "account_db_stable_root_custody": True,
    "fresh_immediately_before_creation": True,
    "independent_first_entry": True,
    "separate_owner_authorization": True,
    "shell": "/usr/sbin/nologin", "create_home": False,
    "password_locked": True, "supplementary_groups": [],
    "custody_ipc_access": False, "root_stage_or_operator_home_write": False,
    "create_only_receipt_available": True,
    "partial_creation_manual_recovery_policy": True,
}
assert classify_synthetic(candidate) == "SHAPE_ONLY_PENDING_SEPARATELY_REVIEWED_PROVISIONER"
negatives = (
    ({"user_present": True}, "HOLD_PREEXISTING_NAME"),
    ({"group_present": True}, "HOLD_PREEXISTING_NAME"),
    ({"uid": None}, "HOLD_UID_GID_NOT_SELECTED"),
    ({"gid": None}, "HOLD_UID_GID_NOT_SELECTED"),
    ({"uid": True}, "HOLD_UID_GID_NOT_SELECTED"),
    ({"uid": 0}, "HOLD_ROOT_OR_INVALID_SLOT"),
    ({"gid": 0}, "HOLD_ROOT_OR_INVALID_SLOT"),
    ({"uid": 995}, "HOLD_RESERVED_ID"),
    ({"uid": 994}, "HOLD_RESERVED_ID"),
    ({"uid": 1000}, "HOLD_RESERVED_ID"),
    ({"gid": 980}, "HOLD_RESERVED_ID"),
    ({"gid": 981}, "HOLD_RESERVED_ID"),
    ({"gid": 982}, "HOLD_RESERVED_ID"),
    ({"gid": 1000}, "HOLD_RESERVED_ID"),
    ({"live_uid_slots": {65000}}, "HOLD_LIVE_PROCESS_COLLISION"),
    ({"live_gid_slots": {65001}}, "HOLD_LIVE_PROCESS_COLLISION"),
    ({"system_ranges_match": False}, "HOLD_SYSTEM_SLOT_COLLISION"),
    ({"local_slot_empty": False}, "HOLD_SYSTEM_SLOT_COLLISION"),
    ({"persistent_mount_scope_authenticated": False}, "HOLD_FILESYSTEM_SCOPE"),
    ({"numeric_file_ownership_acl_collision_absent": False}, "HOLD_ORPHANED_FILESYSTEM_AUTHORITY"),
    ({"nss_profile": "passwd:sss"}, "HOLD_NONLOCAL_NSS"),
    ({"host_pid_initial_user_namespace_leases": False}, "HOLD_NAMESPACE_LEASE"),
    ({"complete_full_procfs_census": False}, "HOLD_PROCFS_CENSUS"),
    ({"account_db_stable_root_custody": False}, "HOLD_ACCOUNT_DB_CUSTODY"),
    ({"fresh_immediately_before_creation": False}, "HOLD_STALE_GENERATION"),
    ({"independent_first_entry": False}, "HOLD_FIRST_ENTRY_TRUST"),
    ({"separate_owner_authorization": False}, "HOLD_OPERATOR_APPROVAL"),
    ({"shell": "/bin/bash"}, "HOLD_LOGIN_SURFACE"),
    ({"create_home": True}, "HOLD_LOGIN_SURFACE"),
    ({"password_locked": False}, "HOLD_PASSWORD_UNLOCKED"),
    ({"supplementary_groups": [980]}, "HOLD_CUSTODY_OR_GROUP_ACCESS"),
    ({"custody_ipc_access": True}, "HOLD_CUSTODY_OR_GROUP_ACCESS"),
    ({"root_stage_or_operator_home_write": True}, "HOLD_EXTRA_WRITES"),
    ({"create_only_receipt_available": False}, "HOLD_NO_CREATE_ONLY_RECEIPT"),
    ({"partial_creation_manual_recovery_policy": False}, "HOLD_RECOVERY_POLICY"),
)
for mutation, expected in negatives:
    got = classify_synthetic({**candidate, **mutation})
    assert got == expected, (mutation, expected, got)
print(MARKER + "_GREEN")
print("plan_blob=" + PLAN_BLOB)
print("parent_role_contract_blob=" + ROLE_BLOB)
print("host_preprovision_gates=" + str(len(expected_host_gates)))
print("negative_synthetic_cases=" + str(len(negatives)))
print("simulated_positive_means_production_authority=false")
print("proposed_name_not_selected=true")
print("stage_verifier_uid_gid_unselected=true")
print("host_attestation=false")
print("account_group_creation=false")
print("source_stage_installer_unchanged=true")
print("systemd_service_mutation=false")
print("presale_activation=false")
print("funds_movement=false")
