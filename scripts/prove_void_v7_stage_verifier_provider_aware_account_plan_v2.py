#!/usr/bin/env python3
"""Source-only provider-aware account plan proof. It never queries or mutates the host."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
PLAN_REL = "ops/security/void_v7_stage_verifier_provider_aware_account_plan_v2.json"
ROLE_REL = "ops/security/void_v7_v5_stage_role_separation_contract_v2.json"
SOURCE_REL = "ops/precision/void_buy_void_v7_v5_source_stage_install_v1.py"
RECEIPT_REL = "ops/precision/void_buy_void_v7_v5_receipt_stage_install_v1.py"
PLAN_BLOB = "6b8057f000b85876aa986dd58dc324b5377dd568"
ROLE_BLOB = "4801caaca496baeb85c7842b5b8b4b47122582ab"
SOURCE_BLOB = "d88a9548ea34b8209ed7dcd53732fd25dd1371bf"
RECEIPT_BLOB = "b462696826b4f90fdf5f4938cd5467e5711addab"
UPSTREAM_HEAD = "c90f2e89ef0b90a8a8852b72ffb9bf6ba9f22a22"
MARKER = "VOID_V7_STAGE_VERIFIER_PROVIDER_AWARE_ACCOUNT_PLAN_V2_PROOF"
ALLOWED_PROVIDERS = ("files", "systemd", "sss")


def git(*args: str) -> str:
    env = {
        "PATH": "/usr/bin:/bin", "HOME": "/nonexistent",
        "LANG": "C", "LC_ALL": "C", "TZ": "UTC",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_ASKPASS": "/bin/false",
        "GIT_ALLOW_PROTOCOL": "",
    }
    p = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
        stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, check=False, timeout=30, env=env,
    )
    assert p.returncode == 0, "git_error:" + (args[0] if args else "")
    assert p.stderr == "", "git_stderr"
    return p.stdout.strip()


def exact_blob(rel: str, blob: str) -> None:
    assert git("rev-parse", "HEAD:" + rel) == blob, "head_blob_mismatch:" + rel
    assert git("hash-object", "--no-filters", rel) == blob, "worktree_blob_mismatch:" + rel


def git_blob_id(data: bytes) -> str:
    header = ("blob " + str(len(data)) + "\0").encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def read_exact_bytes(rel: str, expected_blob: str, limit: int = 65536) -> bytes:
    p = ROOT / rel
    flags = os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK
    fd = os.open(p, flags)
    try:
        opened = os.fstat(fd)
        assert stat.S_ISREG(opened.st_mode), "source_not_regular:" + rel
        assert 0 <= opened.st_size <= limit, "source_oversize:" + rel
        data = bytearray()
        while len(data) < opened.st_size:
            chunk = os.read(fd, min(65536, opened.st_size - len(data)))
            assert chunk, "source_unexpected_eof:" + rel
            data.extend(chunk)
        assert os.read(fd, 1) == b"", "source_grew_during_read:" + rel
        terminal = os.fstat(fd)
        visible = os.lstat(p)
        fields = lambda s: (
            s.st_dev, s.st_ino, s.st_uid, s.st_gid, s.st_mode,
            s.st_nlink, s.st_size, s.st_mtime_ns, s.st_ctime_ns,
        )
        assert stat.S_ISREG(visible.st_mode), "source_visible_not_regular:" + rel
        assert fields(opened) == fields(terminal) == fields(visible), "source_generation_drift:" + rel
        out = bytes(data)
        assert git_blob_id(out) == expected_blob, "source_blob_mismatch:" + rel
        return out
    finally:
        os.close(fd)


def read_json(rel: str, expected_blob: str, limit: int = 65536) -> dict:
    data = read_exact_bytes(rel, expected_blob, limit)
    return json.loads(data.decode("utf-8", "strict"), object_pairs_hook=unique_object)


def self_test_descriptor_reads() -> None:
    with tempfile.TemporaryDirectory(prefix="void-v7-provider-account-read-") as tmp:
        root = Path(tmp)
        good = root / "good"
        payload = b'{"ok":true}\n'
        good.write_bytes(payload)
        expected = git_blob_id(payload)
        # Use the same descriptor logic, but on a disposable absolute-path helper.
        def read_path(path: Path) -> bytes:
            flags = os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK
            fd = os.open(path, flags)
            try:
                opened = os.fstat(fd)
                assert stat.S_ISREG(opened.st_mode)
                data = os.read(fd, opened.st_size)
                assert len(data) == opened.st_size
                assert os.read(fd, 1) == b""
                visible = os.lstat(path)
                terminal = os.fstat(fd)
                fields = lambda s: (
                    s.st_dev, s.st_ino, s.st_uid, s.st_gid, s.st_mode,
                    s.st_nlink, s.st_size, s.st_mtime_ns, s.st_ctime_ns,
                )
                assert fields(opened) == fields(terminal) == fields(visible)
                return data
            finally:
                os.close(fd)
        assert git_blob_id(read_path(good)) == expected

        fifo = root / "fifo"
        os.mkfifo(fifo, 0o600)
        started = time.monotonic()
        try:
            read_path(fifo)
        except (AssertionError, OSError):
            pass
        else:
            raise AssertionError("fifo_substitution_accepted")
        assert time.monotonic() - started < 2.0, "fifo_substitution_blocked"

        link = root / "link"
        link.symlink_to(good)
        try:
            read_path(link)
        except (AssertionError, OSError):
            pass
        else:
            raise AssertionError("symlink_substitution_accepted")


def unique_object(items):
    out = {}
    for key, value in items:
        if key in out:
            raise ValueError("duplicate_json_key:" + key)
        out[key] = value
    return out


def classify(candidate: dict) -> str:
    if candidate["user_present"] or candidate["group_present"]:
        return "HOLD_PREEXISTING_NAME"
    if type(candidate["uid"]) is not int or type(candidate["gid"]) is not int:
        return "HOLD_UID_GID_UNSELECTED"
    if candidate["uid"] <= 0 or candidate["gid"] <= 0:
        return "HOLD_INVALID_NUMERIC_ID"
    if candidate["uid"] in (0, 994, 995, 1000) or candidate["gid"] in (0, 980, 981, 982, 1000):
        return "HOLD_RESERVED_ID"
    if not candidate["provider_profile_bound"]:
        return "HOLD_PROVIDER_PROFILE_UNBOUND"
    passwd_route = candidate["passwd_route"]
    group_route = candidate["group_route"]
    if not isinstance(passwd_route, list) or not isinstance(group_route, list) or not passwd_route or not group_route:
        return "HOLD_PROVIDER_ROUTE_SHAPE"
    if passwd_route != group_route:
        return "HOLD_PROVIDER_ROUTE_MISMATCH"
    if len(set(passwd_route)) != len(passwd_route):
        return "HOLD_DUPLICATE_PROVIDER"
    if any(provider not in ALLOWED_PROVIDERS for provider in passwd_route):
        return "HOLD_UNSUPPORTED_PROVIDER"
    if not candidate["nss_action_policy_bound"]:
        return "HOLD_NSS_ACTION_POLICY"
    if candidate["provider_generation_changed"]:
        return "HOLD_PROVIDER_GENERATION_DRIFT"
    for provider in passwd_route:
        state = candidate["providers"].get(provider)
        if not isinstance(state, dict):
            return "HOLD_PROVIDER_STATE_MISSING"
        if not state.get("health"):
            return "HOLD_PROVIDER_UNHEALTHY:" + provider
        if not state.get("name_negative") or not state.get("uid_negative") or not state.get("gid_negative"):
            return "HOLD_PROVIDER_COLLISION_OR_AMBIGUITY:" + provider
        if provider == "files" and not state.get("local_files_generation_bound"):
            return "HOLD_FILES_GENERATION"
        if provider == "systemd" and not state.get("dynamic_user_census_bound"):
            return "HOLD_SYSTEMD_DYNAMIC_USER_CENSUS"
        if provider == "sss":
            if not state.get("domain_generation_bound"):
                return "HOLD_SSS_DOMAIN_GENERATION"
            if state.get("enumeration_only"):
                return "HOLD_SSS_ENUMERATION_ONLY"
    if not candidate["host_namespace_leases_bound"]:
        return "HOLD_NAMESPACE_LEASE"
    if not candidate["complete_procfs_census"]:
        return "HOLD_PROCFS_CENSUS"
    if candidate["uid"] in candidate["live_uid_slots"] or candidate["gid"] in candidate["live_gid_slots"]:
        return "HOLD_LIVE_PROCESS_COLLISION"
    if not candidate["mount_scope_generation_bound"]:
        return "HOLD_MOUNT_SCOPE"
    if not candidate["all_authority_mounts_inspectable"]:
        return "HOLD_UNINSPECTABLE_MOUNT"
    if not candidate["numeric_file_ownership_absent"]:
        return "HOLD_ORPHANED_FILE_OWNERSHIP"
    if not candidate["numeric_acl_references_absent"]:
        return "HOLD_ORPHANED_ACL_AUTHORITY"
    if not candidate["systemd_reservations_absent"]:
        return "HOLD_SYSTEMD_RESERVATION"
    if not candidate["fresh_before_group_create"]:
        return "HOLD_GROUP_CREATE_CENSUS_STALE"
    if not candidate["fresh_before_user_create"]:
        return "HOLD_USER_CREATE_CENSUS_STALE"
    if not candidate["root_first_entry"]:
        return "HOLD_ROOT_FIRST_ENTRY"
    if not candidate["owner_authorization"]:
        return "HOLD_OWNER_AUTHORIZATION"
    if candidate["shell"] != "/usr/sbin/nologin" or candidate["create_home"]:
        return "HOLD_LOGIN_SURFACE"
    if not candidate["password_locked"]:
        return "HOLD_PASSWORD_UNLOCKED"
    if candidate["supplementary_groups"] != [] or candidate["custody_ipc"]:
        return "HOLD_GROUP_AUTHORITY"
    if candidate["extra_admin_or_private_access"]:
        return "HOLD_EXTRA_AUTHORITY"
    if not candidate["create_only_receipt"]:
        return "HOLD_NO_CREATE_ONLY_RECEIPT"
    if not candidate["manual_partial_failure_policy"]:
        return "HOLD_RECOVERY_POLICY"
    return "SHAPE_ONLY_PROVIDER_AWARE_NOT_HOST_ATTESTED"


assert os.geteuid() != 0, "root_source_proof_forbidden"
assert git("merge-base", "--is-ancestor", UPSTREAM_HEAD, "HEAD") == ""
self_test_descriptor_reads()
for rel, blob in (
    (PLAN_REL, PLAN_BLOB), (ROLE_REL, ROLE_BLOB),
    (SOURCE_REL, SOURCE_BLOB), (RECEIPT_REL, RECEIPT_BLOB),
):
    exact_blob(rel, blob)

plan = read_json(PLAN_REL, PLAN_BLOB)
role = read_json(ROLE_REL, ROLE_BLOB)
assert plan["marker"] == "VOID_V7_STAGE_VERIFIER_PROVIDER_AWARE_ACCOUNT_PLAN_V2"
assert plan["schema"] == "void_v7_stage_verifier_provider_aware_account_plan_v2"
assert plan["lifecycle"] == "SOURCE_ONLY_PROVIDER_PROFILE_UNATTESTED_UID_GID_UNSELECTED"
assert plan["repository"] == "6ZoSo9/void-node"
assert plan["upstream"] == {
    "role_separation_pr": 3804,
    "role_separation_head": UPSTREAM_HEAD,
    "role_contract_path": ROLE_REL,
    "role_contract_blob": ROLE_BLOB,
    "current_source_stage_installer_blob": SOURCE_BLOB,
    "current_receipt_stage_installer_blob": RECEIPT_BLOB,
    "historical_account_plan_pr": 3754,
    "historical_account_plan_reusable": False,
}

obs = plan["prior_operator_observation"]
assert obs["evidence_kind"] == "UNAUTHENTICATED_HISTORICAL_OPERATOR_REPORT"
assert obs["proposed_name"] == "void-v7-stage-verifier"
assert obs["reported_nss_identity_routes_contain"] == ["files", "systemd", "sss"]
for key in ("effective_provider_order_authenticated", "provider_health_authenticated", "live_host_attestation"):
    assert obs[key] is False

identity = plan["proposed_identity"]
assert identity["user_name"] == identity["primary_group_name"] == "void-v7-stage-verifier"
assert identity["uid"] is identity["gid"] is None
assert identity["numeric_identity_selected"] is identity["account_provisioned"] is False
assert identity["required_shell"] == "/usr/sbin/nologin"
assert identity["password_locked_required"] is True
assert identity["create_home"] is False and identity["supplementary_groups"] == []
assert identity["custody_ipc_membership_forbidden"] is True

provider = plan["provider_policy"]
assert provider["authenticated_current_passwd_route"] is None
assert provider["authenticated_current_group_route"] is None
assert provider["supported_provider_families"] == list(ALLOWED_PROVIDERS)
for key in (
    "configured_provider_order_must_be_exactly_bound",
    "provider_health_must_be_positive_before_absence_is_accepted",
    "enumeration_only_is_insufficient",
    "name_and_numeric_negative_lookup_required_for_every_provider",
    "current_provider_profile_recheck_before_each_create_operation",
):
    assert provider[key] is True, key
assert provider["unknown_provider_or_action_clause_policy"] == "HOLD"
assert provider["provider_unavailable_or_timeout_policy"] == "HOLD"

requirements = plan["provider_requirements"]
assert set(requirements) == set(ALLOWED_PROVIDERS)
assert len(requirements["files"]) == len(requirements["systemd"]) == len(requirements["sss"]) == 4
assert len(plan["global_numeric_authority_requirements"]) == 12
assert len(plan["future_create_only_sequence"]) == 2
assert plan["future_create_only_sequence"][0]["operation"] == "create_exact_primary_group"
assert plan["future_create_only_sequence"][1]["operation"] == "create_exact_system_user"
assert all(step["implemented_here"] is False for step in plan["future_create_only_sequence"])
assert len(plan["post_create_requirements"]) == 9
assert role["stage_verifier"]["status"] == "UNSELECTED"
assert role["stage_verifier"]["uid"] is None and role["stage_verifier"]["gid"] is None
assert role["identity_selection_dependency"]["status"] == "HOLD_PROVIDER_AWARE_ACCOUNT_PLAN_REQUIRED"

partial = plan["partial_failure_policy"]
assert partial["status"] == "HOLD_NO_AUTOMATIC_ROLLBACK"
for key, value in partial.items():
    if key != "status":
        assert value is True, key

future = plan["required_future_host_artifact"]
assert all(value is False for value in future.values())
authority = plan["authority"]
assert authority["source_only"] is True
for key, value in authority.items():
    if key != "source_only":
        assert value is False, "authority_true:" + key

positive = {
    "user_present": False, "group_present": False,
    "uid": 123456789, "gid": 123456790,
    "provider_profile_bound": True,
    "passwd_route": ["files", "systemd", "sss"],
    "group_route": ["files", "systemd", "sss"],
    "nss_action_policy_bound": True,
    "provider_generation_changed": False,
    "providers": {
        "files": {"health": True, "name_negative": True, "uid_negative": True, "gid_negative": True,
                  "local_files_generation_bound": True},
        "systemd": {"health": True, "name_negative": True, "uid_negative": True, "gid_negative": True,
                    "dynamic_user_census_bound": True},
        "sss": {"health": True, "name_negative": True, "uid_negative": True, "gid_negative": True,
                "domain_generation_bound": True, "enumeration_only": False},
    },
    "host_namespace_leases_bound": True,
    "complete_procfs_census": True,
    "live_uid_slots": set(), "live_gid_slots": set(),
    "mount_scope_generation_bound": True,
    "all_authority_mounts_inspectable": True,
    "numeric_file_ownership_absent": True,
    "numeric_acl_references_absent": True,
    "systemd_reservations_absent": True,
    "fresh_before_group_create": True,
    "fresh_before_user_create": True,
    "root_first_entry": True,
    "owner_authorization": True,
    "shell": "/usr/sbin/nologin", "create_home": False,
    "password_locked": True, "supplementary_groups": [],
    "custody_ipc": False, "extra_admin_or_private_access": False,
    "create_only_receipt": True,
    "manual_partial_failure_policy": True,
}
assert classify(positive) == "SHAPE_ONLY_PROVIDER_AWARE_NOT_HOST_ATTESTED"

negative_cases = (
    ({"user_present": True}, "HOLD_PREEXISTING_NAME"),
    ({"group_present": True}, "HOLD_PREEXISTING_NAME"),
    ({"uid": None}, "HOLD_UID_GID_UNSELECTED"),
    ({"gid": True}, "HOLD_UID_GID_UNSELECTED"),
    ({"uid": 0}, "HOLD_INVALID_NUMERIC_ID"),
    ({"uid": 995}, "HOLD_RESERVED_ID"),
    ({"gid": 980}, "HOLD_RESERVED_ID"),
    ({"provider_profile_bound": False}, "HOLD_PROVIDER_PROFILE_UNBOUND"),
    ({"passwd_route": []}, "HOLD_PROVIDER_ROUTE_SHAPE"),
    ({"group_route": ["files"]}, "HOLD_PROVIDER_ROUTE_MISMATCH"),
    ({"passwd_route": ["files", "files"], "group_route": ["files", "files"]}, "HOLD_DUPLICATE_PROVIDER"),
    ({"passwd_route": ["files", "ldap"], "group_route": ["files", "ldap"]}, "HOLD_UNSUPPORTED_PROVIDER"),
    ({"nss_action_policy_bound": False}, "HOLD_NSS_ACTION_POLICY"),
    ({"provider_generation_changed": True}, "HOLD_PROVIDER_GENERATION_DRIFT"),
    ({"providers": {**positive["providers"], "files": {**positive["providers"]["files"], "health": False}}}, "HOLD_PROVIDER_UNHEALTHY:files"),
    ({"providers": {**positive["providers"], "systemd": {**positive["providers"]["systemd"], "uid_negative": False}}}, "HOLD_PROVIDER_COLLISION_OR_AMBIGUITY:systemd"),
    ({"providers": {**positive["providers"], "files": {**positive["providers"]["files"], "local_files_generation_bound": False}}}, "HOLD_FILES_GENERATION"),
    ({"providers": {**positive["providers"], "systemd": {**positive["providers"]["systemd"], "dynamic_user_census_bound": False}}}, "HOLD_SYSTEMD_DYNAMIC_USER_CENSUS"),
    ({"providers": {**positive["providers"], "sss": {**positive["providers"]["sss"], "domain_generation_bound": False}}}, "HOLD_SSS_DOMAIN_GENERATION"),
    ({"providers": {**positive["providers"], "sss": {**positive["providers"]["sss"], "enumeration_only": True}}}, "HOLD_SSS_ENUMERATION_ONLY"),
    ({"host_namespace_leases_bound": False}, "HOLD_NAMESPACE_LEASE"),
    ({"complete_procfs_census": False}, "HOLD_PROCFS_CENSUS"),
    ({"live_uid_slots": {123456789}}, "HOLD_LIVE_PROCESS_COLLISION"),
    ({"live_gid_slots": {123456790}}, "HOLD_LIVE_PROCESS_COLLISION"),
    ({"mount_scope_generation_bound": False}, "HOLD_MOUNT_SCOPE"),
    ({"all_authority_mounts_inspectable": False}, "HOLD_UNINSPECTABLE_MOUNT"),
    ({"numeric_file_ownership_absent": False}, "HOLD_ORPHANED_FILE_OWNERSHIP"),
    ({"numeric_acl_references_absent": False}, "HOLD_ORPHANED_ACL_AUTHORITY"),
    ({"systemd_reservations_absent": False}, "HOLD_SYSTEMD_RESERVATION"),
    ({"fresh_before_group_create": False}, "HOLD_GROUP_CREATE_CENSUS_STALE"),
    ({"fresh_before_user_create": False}, "HOLD_USER_CREATE_CENSUS_STALE"),
    ({"root_first_entry": False}, "HOLD_ROOT_FIRST_ENTRY"),
    ({"owner_authorization": False}, "HOLD_OWNER_AUTHORIZATION"),
    ({"shell": "/bin/bash"}, "HOLD_LOGIN_SURFACE"),
    ({"create_home": True}, "HOLD_LOGIN_SURFACE"),
    ({"password_locked": False}, "HOLD_PASSWORD_UNLOCKED"),
    ({"supplementary_groups": [980]}, "HOLD_GROUP_AUTHORITY"),
    ({"custody_ipc": True}, "HOLD_GROUP_AUTHORITY"),
    ({"extra_admin_or_private_access": True}, "HOLD_EXTRA_AUTHORITY"),
    ({"create_only_receipt": False}, "HOLD_NO_CREATE_ONLY_RECEIPT"),
    ({"manual_partial_failure_policy": False}, "HOLD_RECOVERY_POLICY"),
)
for mutation, expected in negative_cases:
    candidate = dict(positive)
    candidate.update(mutation)
    got = classify(candidate)
    assert got == expected, (mutation, expected, got)

print(MARKER + "_GREEN")
print("plan_blob=" + PLAN_BLOB)
print("role_contract_blob=" + ROLE_BLOB)
print("provider_families=files,systemd,sss")
print("provider_profile_authenticated=false")
print("stage_verifier_uid_gid_unselected=true")
print("synthetic_negative_cases=" + str(len(negative_cases)))
print("synthetic_positive_is_host_authority=false")
print("historical_3754_reusable=false")
print("account_group_creation=false")
print("protected_stage_apply=false")
print("presale_activation=false")
print("funds_movement=false")
