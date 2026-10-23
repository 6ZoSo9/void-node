#!/usr/bin/env python3
"""Source-only, exact-blob two-role staging contract proof. Never invokes an installer."""

from __future__ import annotations

import ast
import json
import os
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTRACT_REL = "ops/security/void_v7_v5_stage_role_separation_contract_v1.json"
SOURCE_REL = "ops/precision/void_buy_void_v7_v5_source_stage_install_v1.py"
CONTRACT_BLOB = "1dccc0f7fd1c74005b519113b0728ebd25477ad5"
SOURCE_BLOB = "b8b52649730cd1b1cf23ffc8c68878cef8ecfc5b"
UPSTREAM_HEAD = "555db189091321a727b98d5177c7428430fd23a1"
MARKER = "VOID_V7_V5_STAGE_ROLE_SEPARATION_CONTRACT_V1_PROOF"


def git(*arguments: str, quiet: bool = False) -> str:
    env = {
        "PATH": "/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
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
    process = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *arguments],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=35,
        env=env,
        text=True,
    )
    assert process.returncode == 0, "git_failure:" + (arguments[0] if arguments else "")
    assert not process.stderr, "git_warning"
    if quiet:
        assert not process.stdout, "unexpected_git_output"
    return process.stdout.strip()


def read_exact(path: str, maximum: int) -> bytes:
    absolute = ROOT / path
    assert absolute.is_file() and not absolute.is_symlink(), "source_shape_invalid"
    assert absolute.stat().st_size <= maximum, "source_oversized"
    with absolute.open("rb") as f:
        data = f.read(maximum + 1)
    assert len(data) <= maximum, "source_oversized"
    return data


def unique_object(items):
    out = {}
    for key, value in items:
        if key in out:
            raise ValueError("duplicate_json_key:" + key)
        out[key] = value
    return out


def function_source(source: str, tree: ast.Module, name: str) -> str:
    functions = [
        node for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        and node.name == name
    ]
    assert len(functions) == 1, "missing_or_duplicated_function:" + name
    result = ast.get_source_segment(source, functions[0])
    assert result, "source_segment_unavailable:" + name
    return result


def classify_role_pair(item: dict, contract: dict) -> str:
    owner = contract["candidate_owner"]
    reader = contract["stage_verifier"]
    if (item["candidate_uid"], item["candidate_gid"]) != (owner["uid"], owner["gid"]):
        return "HOLD_CANDIDATE_OWNER_DRIFT"
    if (item["copy_executor_uid"], item["copy_executor_gid"]) != (0, 0):
        return "HOLD_COPY_EXECUTOR_NOT_ROOT"
    if item["verifier_uid"] is None or item["verifier_gid"] is None:
        return "HOLD_VERIFIER_UNSELECTED"
    if type(item["verifier_uid"]) is not int or type(item["verifier_gid"]) is not int:
        return "HOLD_VERIFIER_IDENTITY_TYPE"
    if item["verifier_uid"] in reader["reserved_existing_uids"]:
        return "HOLD_VERIFIER_UID_COLLISION"
    if item["verifier_uid"] <= 0 or item["verifier_uid"] == owner["uid"]:
        return "HOLD_VERIFIER_UID_COLLISION"
    forbidden_gids = set(reader["reserved_existing_gids"]) | set(
        reader["current_login_supplementary_gids"]
    )
    if item["verifier_gid"] in forbidden_gids or item["verifier_gid"] <= 0:
        return "HOLD_VERIFIER_GID_COLLISION"
    if item["shell"] != reader["required_shell"]:
        return "HOLD_VERIFIER_LOGIN_SHELL"
    if item["supplementary_groups"] != []:
        return "HOLD_VERIFIER_SUPPLEMENTARY_GROUPS"
    if (item["private_stage_uid"], item["private_stage_gid"]) != (0, 0):
        return "HOLD_PRIVATE_STAGE_NOT_ROOT_CUSTODIED"
    if item["stage_writable_by_verifier"]:
        return "HOLD_VERIFIER_STAGE_WRITE"
    if item["candidate_owner_private_stage_acl"] or item["private_stage_world_readable"]:
        return "HOLD_PRIVATE_STAGE_OVEREXPOSED"
    if item["custody_ipc_access"]:
        return "HOLD_CUSTODY_IPC_ALIAS"
    if not item["candidate_authenticated_before_acl"]:
        return "HOLD_UNVERIFIED_INPUT_ACL"
    if not item["private_verified_before_acl_removal"]:
        return "HOLD_ACL_SEQUENCE"
    if not item["temporary_acl_removed_before_publication"]:
        return "HOLD_RESIDUAL_TEMPORARY_ACL"
    return "SYNTHETIC_ROLE_SHAPE_ONLY_NOT_HOST_ATTESTED"


assert os.geteuid() != 0, "do_not_run_source_proof_as_root"
assert git("merge-base", "--is-ancestor", UPSTREAM_HEAD, "HEAD", quiet=True) == ""
assert git("rev-parse", "HEAD:" + SOURCE_REL) == SOURCE_BLOB
assert git("hash-object", "--no-filters", SOURCE_REL) == SOURCE_BLOB
assert git("rev-parse", "HEAD:" + CONTRACT_REL) == CONTRACT_BLOB
assert git("hash-object", "--no-filters", CONTRACT_REL) == CONTRACT_BLOB

contract = json.loads(
    read_exact(CONTRACT_REL, 32768).decode("utf-8", "strict"),
    object_pairs_hook=unique_object,
)
assert contract["marker"] == "VOID_V7_V5_STAGE_ROLE_SEPARATION_CONTRACT_V1"
assert contract["schema"] == "void_v7_v5_stage_role_separation_contract_v1"
assert contract["lifecycle"] == "SOURCE_ONLY_UNSELECTED_STAGE_VERIFIER_HOLD"
assert contract["repository"] == "6ZoSo9/void-node"
generation = contract["source_generation"]
assert generation == {
    "exact_parent_pr": 3726,
    "exact_parent_head": UPSTREAM_HEAD,
    "path": SOURCE_REL,
    "git_blob": SOURCE_BLOB,
    "current_installer_uses_shared_runtime_uid_gid": True,
    "source_still_unmodified": True,
}
owner, reader, copier = (
    contract["candidate_owner"],
    contract["stage_verifier"],
    contract["root_copier"],
)
assert owner == {
    "uid": 1000,
    "gid": 1000,
    "ownership": "operator-owned",
    "required_root_mode": "0700",
    "required_operations": ["collect_plan", "verify_candidate"],
    "must_not_receive_root_owned_private_stage_acl": True,
}
assert reader["status"] == "UNSELECTED"
assert reader["uid"] is None and reader["gid"] is None
assert reader["account_name"] is None
assert reader["required_shell"] == "/usr/sbin/nologin"
assert reader["required_supplementary_groups"] == []
assert reader["required_operations"] == ["verify_stage_private", "verify_stage"]
assert (reader["private_stage_owner_uid"], reader["private_stage_owner_gid"]) == (0, 0)
assert reader["acl_policy"] == "named_uid_read_and_search_only"
for flag in (
    "stage_write_allowed", "candidate_owner_access_to_private_stage",
    "custody_ipc_access_allowed",
):
    assert reader[flag] is False, flag
assert reader["current_login_uid"] == 1000
assert reader["current_login_primary_gid"] == 1000
assert reader["current_login_supplementary_gids"] == [4, 24, 27, 30, 46, 100, 114, 983, 984, 1000]
assert reader["reserved_existing_uids"] == [0, 994, 995, 1000]
assert reader["reserved_existing_gids"] == [0, 980, 981, 982, 1000]
assert copier["owner_uid"] == copier["owner_gid"] == 0
assert copier["required_precondition"] == "_require_privileged_source_custody"
assert copier["required_operations"] == [
    "_copy_candidate_to_stage", "_seal_verified_stage_for_publication"
]
assert copier["candidate_owner_executes_protected_copy"] is False
for name in (
    "nofollow_nonblocking_copy", "private_tree_digest_before_acl",
    "named_acl_only_after_private_digest",
    "private_verifier_digest_before_acl_removal",
    "all_temporary_acl_removed_before_final_publication",
    "atomically_publish_no_replace",
):
    assert copier[name] is True, name
assert len(contract["required_next_versioned_implementation"]) == 12
assert contract["authority"]["reviewer_design_only"] is True
for key, value in contract["authority"].items():
    if key != "reviewer_design_only":
        assert value is False, "unexpected_source_authority:" + key

source = read_exact(SOURCE_REL, 256000).decode("utf-8", "strict")
tree = ast.parse(source, filename=SOURCE_REL)
source_lines = source.splitlines()
sites = contract["site_plan"]
assert len(sites) == 13, "unexpected_site_inventory_length"
assert [item["line"] for item in sites] == sorted(item["line"] for item in sites)
for item in sites:
    number, fragment = item["line"], item["fragment"]
    assert isinstance(number, int) and 1 <= number <= len(source_lines)
    assert fragment in source_lines[number - 1], "source_site_mismatch:" + str(number)
    assert item["future_role"] in (
        "split_declarations", "stage_verifier", "candidate_owner",
        "operation_scoped_child", "stage_verifier_fixture",
    )
observed_shared_role_lines = [
    index + 1 for index, line in enumerate(source_lines)
    if re.search(r"\bRUNTIME_(?:UID|GID)\b", line)
]
assert observed_shared_role_lines == [row["line"] for row in sites], "untracked_shared_role_site"

candidate = function_source(source, tree, "verify_candidate")
copy = function_source(source, tree, "_copy_candidate_to_stage")
child = function_source(source, tree, "_runtime_uid_child_call")
apply = function_source(source, tree, "apply")
root_custody = function_source(source, tree, "_require_privileged_source_custody")
assert 'if os.geteuid() != 0 or os.getuid() != 0:' in root_custody
assert 'raise InstallError("root_required_for_privileged_apply")' in root_custody
assert apply.find("_require_privileged_source_custody()") >= 0
assert apply.find("_copy_candidate_to_stage(") > apply.find("_require_privileged_source_custody()")
assert "_copy_candidate_to_stage(" not in child, "copy_must_not_run_under_candidate_child"
drop = function_source(source, tree, "_drop_runtime_child_privileges")
acl = function_source(source, tree, "_runtime_uid_read_acl_blob")
stage = function_source(source, tree, "_prepare_private_stage_for_runtime_verification")
cleanup = function_source(source, tree, "_seal_verified_stage_for_publication")
assert "CANDIDATE, RUNTIME_UID, RUNTIME_GID, 0o700" in candidate
assert "candidate_before.st_uid != RUNTIME_UID" in copy
assert "candidate_before.st_gid != RUNTIME_GID" in copy
assert '(ACL_USER, runtime_perm, RUNTIME_UID)' in acl
assert "(ACL_GROUP_OBJ, 0, ACL_UNDEFINED_ID)" in acl
assert "(ACL_OTHER, 0, ACL_UNDEFINED_ID)" in acl
assert 'operation == "collect_plan"' in child
assert 'operation == "verify_stage_private"' in child
assert 'operation == "verify_stage"' in child
for check in ("os.setgroups([])", "os.setgid(RUNTIME_GID)", "os.setuid(RUNTIME_UID)", "os.getresuid()", "os.getresgid()"):
    assert check in drop, "credential_drop_drift:" + check
assert "_set_runtime_uid_read_acl_fd(" in stage
assert "_remove_runtime_uid_read_acl_fd(" in cleanup
markers = (
    "private_digest,",
    "_prepare_private_stage_for_runtime_verification()",
    "_verify_private_stage_for_apply(",
    "_seal_verified_stage_for_publication()",
    "_verify_stage_for_apply(",
)
positions = [copy.find(m) for m in markers]
assert all(n >= 0 for n in positions) and positions == sorted(positions), "stage_ordering_drift"
assert "ctypes.CDLL(None" in source, "legacy_native_abi_no_longer_present_recheck_contract"

synthetic = {
    "candidate_uid": 1000,
    "candidate_gid": 1000,
    "copy_executor_uid": 0,
    "copy_executor_gid": 0,
    "verifier_uid": 65000,
    "verifier_gid": 65001,
    "shell": "/usr/sbin/nologin",
    "supplementary_groups": [],
    "private_stage_uid": 0,
    "private_stage_gid": 0,
    "stage_writable_by_verifier": False,
    "candidate_owner_private_stage_acl": False,
    "private_stage_world_readable": False,
    "custody_ipc_access": False,
    "candidate_authenticated_before_acl": True,
    "private_verified_before_acl_removal": True,
    "temporary_acl_removed_before_publication": True,
}
assert classify_role_pair(synthetic, contract) == "SYNTHETIC_ROLE_SHAPE_ONLY_NOT_HOST_ATTESTED"
negatives = (
    ({"verifier_uid": None}, "HOLD_VERIFIER_UNSELECTED"),
    ({"verifier_uid": True}, "HOLD_VERIFIER_IDENTITY_TYPE"),
    ({"verifier_uid": 1000}, "HOLD_VERIFIER_UID_COLLISION"),
    ({"verifier_uid": 994}, "HOLD_VERIFIER_UID_COLLISION"),
    ({"verifier_uid": 995}, "HOLD_VERIFIER_UID_COLLISION"),
    ({"verifier_gid": 1000}, "HOLD_VERIFIER_GID_COLLISION"),
    ({"verifier_gid": 980}, "HOLD_VERIFIER_GID_COLLISION"),
    ({"verifier_gid": 983}, "HOLD_VERIFIER_GID_COLLISION"),
    ({"candidate_uid": 65000}, "HOLD_CANDIDATE_OWNER_DRIFT"),
    ({"copy_executor_uid": 1000}, "HOLD_COPY_EXECUTOR_NOT_ROOT"),
    ({"copy_executor_gid": 1000}, "HOLD_COPY_EXECUTOR_NOT_ROOT"),
    ({"shell": "/bin/bash"}, "HOLD_VERIFIER_LOGIN_SHELL"),
    ({"supplementary_groups": [980]}, "HOLD_VERIFIER_SUPPLEMENTARY_GROUPS"),
    ({"private_stage_uid": 1000}, "HOLD_PRIVATE_STAGE_NOT_ROOT_CUSTODIED"),
    ({"stage_writable_by_verifier": True}, "HOLD_VERIFIER_STAGE_WRITE"),
    ({"candidate_owner_private_stage_acl": True}, "HOLD_PRIVATE_STAGE_OVEREXPOSED"),
    ({"private_stage_world_readable": True}, "HOLD_PRIVATE_STAGE_OVEREXPOSED"),
    ({"custody_ipc_access": True}, "HOLD_CUSTODY_IPC_ALIAS"),
    ({"candidate_authenticated_before_acl": False}, "HOLD_UNVERIFIED_INPUT_ACL"),
    ({"private_verified_before_acl_removal": False}, "HOLD_ACL_SEQUENCE"),
    ({"temporary_acl_removed_before_publication": False}, "HOLD_RESIDUAL_TEMPORARY_ACL"),
)
for changed, expected in negatives:
    assert classify_role_pair(dict(synthetic, **changed), contract) == expected, "negative_model_failed:" + expected

print(MARKER + "_GREEN")
print("exact_source_git_blob=" + SOURCE_BLOB)
print("exact_contract_git_blob=" + CONTRACT_BLOB)
print("legacy_shared_identity_sites=13")
print("root_only_copy_precondition_and_call_order=GREEN")
print("candidate_owner_is_not_protected_copy_executor=true")
print("source_ordering_and_acl_checks=GREEN")
print("synthetic_negative_models=" + str(len(negatives)))
print("synthetic_role_shape_eligible_but_not_attested=true")
print("real_stage_verifier_selected=false")
print("candidate_owner_uid=1000")
print("stage_verifier_uid=UNSELECTED")
print("source_stage_installer_modified=false")
print("source_v2_implemented=false")
print("protected_stage_apply=false")
print("account_or_acl_mutation=false")
print("credential_access=false")
print("presale_activation=false")
print("funds_movement=false")
