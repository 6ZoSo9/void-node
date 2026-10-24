#!/usr/bin/env python3
"""Source-only V2 role-separation proof bound to current #3715 installer bytes."""

from __future__ import annotations

import ast
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_REL = "ops/security/void_v7_v5_stage_role_separation_contract_v2.json"
SOURCE_REL = "ops/precision/void_buy_void_v7_v5_source_stage_install_v1.py"
RECEIPT_REL = "ops/precision/void_buy_void_v7_v5_receipt_stage_install_v1.py"
CONTRACT_BLOB = "4801caaca496baeb85c7842b5b8b4b47122582ab"
SOURCE_BLOB = "d88a9548ea34b8209ed7dcd53732fd25dd1371bf"
RECEIPT_BLOB = "b462696826b4f90fdf5f4938cd5467e5711addab"
SOURCE_PROOF_BLOB = "5b8e98eec6712efd4846a564f689161fb054338f"
RECEIPT_PROOF_BLOB = "7d968740c9e0c787c57bd493e5c51f5ed385eed1"
INSTALLER_DOC_BLOB = "02fa010cd66a50c5e2858b6cced9a7e08ee295af"
INSTALLER_WORKFLOW_BLOB = "af1a9afad2a39b96ee4022ba1b36ebf7534c818b"
UPSTREAM_HEAD = "ea2193709dab86ea3eb3c2235d08e8a6858a23c6"
MARKER = "VOID_V7_V5_STAGE_ROLE_SEPARATION_CONTRACT_V2_PROOF"


def git(*args: str) -> str:
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
    p = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=35,
        env=env,
    )
    assert p.returncode == 0, "git_failure:" + (args[0] if args else "")
    assert p.stderr == "", "git_stderr"
    return p.stdout.strip()


def read_exact(rel: str, maximum: int) -> bytes:
    path = ROOT / rel
    assert path.is_file() and not path.is_symlink(), "source_kind_invalid:" + rel
    before = path.stat()
    assert before.st_size <= maximum, "source_oversize:" + rel
    with path.open("rb") as f:
        data = f.read(maximum + 1)
        opened = os.fstat(f.fileno())
    after = path.stat()
    assert len(data) <= maximum, "source_oversize:" + rel
    fields = lambda st: (st.st_dev, st.st_ino, st.st_uid, st.st_gid, st.st_mode,
                         st.st_nlink, st.st_size, st.st_mtime_ns, st.st_ctime_ns)
    assert fields(before) == fields(opened) == fields(after), "source_generation_drift:" + rel
    return data


def unique_object(items):
    out = {}
    for key, value in items:
        if key in out:
            raise ValueError("duplicate_json_key:" + key)
        out[key] = value
    return out


def exact_blob(rel: str, blob: str) -> None:
    assert git("rev-parse", "HEAD:" + rel) == blob, "head_blob_drift:" + rel
    assert git("hash-object", "--no-filters", rel) == blob, "worktree_blob_drift:" + rel


def function_source(source: str, tree: ast.Module, name: str) -> str:
    nodes = [x for x in tree.body if isinstance(x, ast.FunctionDef) and x.name == name]
    assert len(nodes) == 1, "function_cardinality:" + name
    value = ast.get_source_segment(source, nodes[0])
    assert value, "function_source_unavailable:" + name
    return value


def classify_synthetic(candidate: dict, contract: dict) -> str:
    owner = contract["candidate_owner"]
    verifier = contract["stage_verifier"]
    if (candidate["candidate_uid"], candidate["candidate_gid"]) != (owner["uid"], owner["gid"]):
        return "HOLD_CANDIDATE_OWNER_DRIFT"
    if (candidate["root_executor_uid"], candidate["root_executor_gid"]) != (0, 0):
        return "HOLD_PROTECTED_COPY_NOT_ROOT"
    if candidate["verifier_uid"] is None or candidate["verifier_gid"] is None:
        return "HOLD_STAGE_VERIFIER_UNSELECTED"
    if type(candidate["verifier_uid"]) is not int or type(candidate["verifier_gid"]) is not int:
        return "HOLD_STAGE_VERIFIER_TYPE"
    if candidate["verifier_uid"] <= 0 or candidate["verifier_uid"] in verifier["reserved_uids"]:
        return "HOLD_STAGE_VERIFIER_UID_COLLISION"
    if candidate["verifier_gid"] <= 0 or candidate["verifier_gid"] in verifier["reserved_gids"]:
        return "HOLD_STAGE_VERIFIER_GID_COLLISION"
    if candidate["shell"] != verifier["required_shell"] or candidate["supplementary_groups"] != []:
        return "HOLD_STAGE_VERIFIER_PROFILE"
    if candidate["custody_ipc_gid"] == verifier["custody_ipc_gid_forbidden"]:
        return "HOLD_CUSTODY_IPC_ALIAS"
    if candidate["private_stage_uid"] != 0 or candidate["private_stage_gid"] != 0:
        return "HOLD_PRIVATE_STAGE_CUSTODY"
    if candidate["private_stage_writable_by_verifier"]:
        return "HOLD_PRIVATE_STAGE_WRITE"
    if candidate["candidate_owner_private_stage_acl"] or candidate["world_or_group_private_stage_access"]:
        return "HOLD_PRIVATE_STAGE_OVEREXPOSED"
    if not candidate["candidate_digest_before_verifier_acl"]:
        return "HOLD_ACL_BEFORE_AUTHENTICATION"
    if not candidate["private_verified_before_acl_removal"]:
        return "HOLD_PRIVATE_VERIFY_SEQUENCE"
    if not candidate["temporary_acl_removed_before_publication"]:
        return "HOLD_RESIDUAL_PRIVATE_ACL"
    if candidate["historical_3754_account_plan_reused"]:
        return "HOLD_HISTORICAL_ACCOUNT_PLAN_REUSE"
    if not candidate["provider_aware_account_plan_accepted"]:
        return "HOLD_PROVIDER_AWARE_ACCOUNT_PLAN"
    if not candidate["final_stage_identity_explicitly_reviewed"]:
        return "HOLD_FINAL_STAGE_IDENTITY_POLICY"
    if candidate["candidate_owner_executes_protected_copy"]:
        return "HOLD_CANDIDATE_OWNER_PRIVILEGE_ESCALATION"
    return "SYNTHETIC_ROLE_SHAPE_ONLY_NOT_HOST_ATTESTED"


assert os.geteuid() != 0, "root_source_proof_forbidden"
assert git("merge-base", "--is-ancestor", UPSTREAM_HEAD, "HEAD") == ""
for rel, blob in (
    (CONTRACT_REL, CONTRACT_BLOB),
    (SOURCE_REL, SOURCE_BLOB),
    (RECEIPT_REL, RECEIPT_BLOB),
    ("scripts/prove_buy_void_v7_v5_source_stage_install_v1.py", SOURCE_PROOF_BLOB),
    ("scripts/prove_buy_void_v7_v5_receipt_stage_install_v1.py", RECEIPT_PROOF_BLOB),
    ("docs/operators/buy-void-v7-v5-source-receipt-stage-install-v1.md", INSTALLER_DOC_BLOB),
    (".github/workflows/buy-void-v7-v5-source-receipt-stage-install-v1.yml", INSTALLER_WORKFLOW_BLOB),
):
    exact_blob(rel, blob)

contract = json.loads(
    read_exact(CONTRACT_REL, 32768).decode("utf-8", "strict"),
    object_pairs_hook=unique_object,
)
assert contract["marker"] == "VOID_V7_V5_STAGE_ROLE_SEPARATION_CONTRACT_V2"
assert contract["schema"] == "void_v7_v5_stage_role_separation_contract_v2"
assert contract["lifecycle"] == "SOURCE_ONLY_CURRENT_3715_STAGE_VERIFIER_UNSELECTED"
source_generation = contract["source_generation"]
assert source_generation["exact_parent_pr"] == 3715
assert source_generation["exact_parent_head"] == UPSTREAM_HEAD
assert source_generation["source_installer_blob"] == SOURCE_BLOB
assert source_generation["receipt_installer_blob"] == RECEIPT_BLOB
assert source_generation["source_proof_blob"] == SOURCE_PROOF_BLOB
assert source_generation["receipt_proof_blob"] == RECEIPT_PROOF_BLOB
assert source_generation["installer_doc_blob"] == INSTALLER_DOC_BLOB
assert source_generation["installer_workflow_blob"] == INSTALLER_WORKFLOW_BLOB
assert source_generation["source_implementation_untouched"] is True
assert source_generation["receipt_implementation_untouched"] is True

owner = contract["candidate_owner"]
assert owner == {
    "uid": 1000,
    "gid": 1000,
    "ownership": "operator-owned",
    "required_candidate_root_mode": "0700",
    "required_operations": ["collect_plan", "verify_candidate"],
    "candidate_metadata_must_remain_1000_1000": True,
    "protected_copy_execution_allowed": False,
    "private_stage_named_acl_allowed": False,
}
copier = contract["root_copier"]
assert (copier["uid"], copier["gid"]) == (0, 0)
assert copier["required_precondition"] == "_require_privileged_source_custody"
assert copier["protected_mutation_operations"] == [
    "_copy_candidate_to_stage",
    "_prepare_private_stage_for_runtime_verification",
    "_seal_verified_stage_for_publication",
    "_rename_noreplace",
]
for key in (
    "verifies_candidate_owner_metadata",
    "private_stage_digest_before_any_verifier_acl",
    "all_temporary_verifier_acl_removed_before_publication",
    "atomic_no_replace_publication",
    "parent_fsync_required",
):
    assert copier[key] is True, key
assert (copier["private_stage_owner_uid"], copier["private_stage_owner_gid"]) == (0, 0)

verifier = contract["stage_verifier"]
assert verifier["status"] == "UNSELECTED"
assert verifier["account_name"] is None and verifier["uid"] is None and verifier["gid"] is None
assert verifier["numeric_identity_selected"] is False
assert verifier["required_shell"] == "/usr/sbin/nologin"
assert verifier["required_supplementary_groups"] == []
assert verifier["custody_ipc_gid_forbidden"] == 980
assert verifier["reserved_uids"] == [0, 994, 995, 1000]
assert verifier["reserved_gids"] == [0, 980, 981, 982, 1000]
assert verifier["private_stage_acl"] == "named_user_read_search_only"
assert verifier["private_stage_write_allowed"] is False
assert verifier["candidate_owner_acl_alias_forbidden"] is True
assert verifier["required_private_operation"] == "verify_stage_private"
assert verifier["final_stage_operation"] == "verify_stage"
assert verifier["final_stage_identity_policy"] == "EXPLICIT_REVIEW_REQUIRED"

dependency = contract["identity_selection_dependency"]
assert dependency == {
    "status": "HOLD_PROVIDER_AWARE_ACCOUNT_PLAN_REQUIRED",
    "historical_plan_pr": 3754,
    "historical_plan_head": "843759e6bdccc77f722eb0a365d93e1213e4a5cf",
    "historical_plan_reuse_for_current_source_forbidden": True,
    "historical_plan_numeric_identity_selected": False,
    "historical_plan_files_only_nss_assumption_not_portable": True,
    "provider_aware_current_generation_plan_accepted": False,
    "numeric_uid_gid_selected": False,
    "account_provisioned": False,
}

authority = contract["authority"]
assert authority["source_contract_only"] is True
for key, value in authority.items():
    if key != "source_contract_only":
        assert value is False, "unexpected_authority:" + key

source = read_exact(SOURCE_REL, 256000).decode("utf-8", "strict")
tree = ast.parse(source, filename=SOURCE_REL)
lines = source.splitlines()
sites = contract["site_plan"]
assert len(sites) == 13
assert [x["line"] for x in sites] == sorted(x["line"] for x in sites)
for site in sites:
    assert site["fragment"] in lines[site["line"] - 1], "site_drift:" + str(site["line"])
actual_identity_lines = [
    index + 1 for index, line in enumerate(lines)
    if re.search(r"\bRUNTIME_(?:UID|GID)\b", line)
]
assert actual_identity_lines == [x["line"] for x in sites], "untracked_identity_site"

acl = function_source(source, tree, "_runtime_uid_read_acl_blob")
verify_candidate = function_source(source, tree, "verify_candidate")
drop = function_source(source, tree, "_drop_runtime_child_privileges")
child = function_source(source, tree, "_runtime_uid_child_call")
prepare = function_source(source, tree, "_prepare_private_stage_for_runtime_verification")
seal = function_source(source, tree, "_seal_verified_stage_for_publication")
copy = function_source(source, tree, "_copy_candidate_to_stage")
root_guard = function_source(source, tree, "_require_privileged_source_custody")
apply = function_source(source, tree, "apply")

assert '(ACL_USER, runtime_perm, RUNTIME_UID)' in acl
assert "(ACL_GROUP_OBJ, 0, ACL_UNDEFINED_ID)" in acl
assert "(ACL_OTHER, 0, ACL_UNDEFINED_ID)" in acl
assert "CANDIDATE, RUNTIME_UID, RUNTIME_GID, 0o700" in verify_candidate
for token in (
    "os.setgroups([])", "os.setgid(RUNTIME_GID)", "os.setuid(RUNTIME_UID)",
    "os.getresuid()", "os.getresgid()",
):
    assert token in drop, "credential_drop_drift:" + token
for op in ('operation == "collect_plan"', 'operation == "verify_stage_private"', 'operation == "verify_stage"'):
    assert op in child, "operation_dispatch_drift:" + op
assert "_copy_candidate_to_stage(" not in child
assert 'raise InstallError("root_required_for_privileged_apply")' in root_guard
assert apply.find("_require_privileged_source_custody()") >= 0
assert apply.find("_copy_candidate_to_stage(") > apply.find("_require_privileged_source_custody()")
assert "_set_runtime_uid_read_acl_fd(" in prepare
assert "_remove_runtime_uid_read_acl_fd(" in seal
order_tokens = (
    "private_digest,",
    "_prepare_private_stage_for_runtime_verification()",
    "_verify_private_stage_for_apply(",
    "_seal_verified_stage_for_publication()",
    "_verify_stage_for_apply(",
)
positions = [copy.find(x) for x in order_tokens]
assert all(x >= 0 for x in positions) and positions == sorted(positions), "private_stage_order_drift"
assert apply.find("_verify_stage_for_apply(") < apply.find("_rename_noreplace("), "final_verify_before_publication_drift"
assert "ctypes.CDLL(None" in source, "native_abi_changed_reaudit_contract"
assert contract["child_dispatch_rebind"]["split_required_before_host_apply"] is True
assert len(contract["required_next_versioned_implementation"]) == 14

synthetic = {
    "candidate_uid": 1000,
    "candidate_gid": 1000,
    "root_executor_uid": 0,
    "root_executor_gid": 0,
    # Deliberately absurd proof-only values, never host candidates.
    "verifier_uid": 123456789,
    "verifier_gid": 123456790,
    "shell": "/usr/sbin/nologin",
    "supplementary_groups": [],
    "custody_ipc_gid": None,
    "private_stage_uid": 0,
    "private_stage_gid": 0,
    "private_stage_writable_by_verifier": False,
    "candidate_owner_private_stage_acl": False,
    "world_or_group_private_stage_access": False,
    "candidate_digest_before_verifier_acl": True,
    "private_verified_before_acl_removal": True,
    "temporary_acl_removed_before_publication": True,
    "historical_3754_account_plan_reused": False,
    "provider_aware_account_plan_accepted": True,
    "final_stage_identity_explicitly_reviewed": True,
    "candidate_owner_executes_protected_copy": False,
}
assert classify_synthetic(synthetic, contract) == "SYNTHETIC_ROLE_SHAPE_ONLY_NOT_HOST_ATTESTED"
negatives = (
    ({"candidate_uid": 123456789}, "HOLD_CANDIDATE_OWNER_DRIFT"),
    ({"root_executor_uid": 1000}, "HOLD_PROTECTED_COPY_NOT_ROOT"),
    ({"root_executor_gid": 1000}, "HOLD_PROTECTED_COPY_NOT_ROOT"),
    ({"verifier_uid": None}, "HOLD_STAGE_VERIFIER_UNSELECTED"),
    ({"verifier_gid": None}, "HOLD_STAGE_VERIFIER_UNSELECTED"),
    ({"verifier_uid": True}, "HOLD_STAGE_VERIFIER_TYPE"),
    ({"verifier_uid": 994}, "HOLD_STAGE_VERIFIER_UID_COLLISION"),
    ({"verifier_uid": 995}, "HOLD_STAGE_VERIFIER_UID_COLLISION"),
    ({"verifier_uid": 1000}, "HOLD_STAGE_VERIFIER_UID_COLLISION"),
    ({"verifier_gid": 980}, "HOLD_STAGE_VERIFIER_GID_COLLISION"),
    ({"verifier_gid": 981}, "HOLD_STAGE_VERIFIER_GID_COLLISION"),
    ({"verifier_gid": 982}, "HOLD_STAGE_VERIFIER_GID_COLLISION"),
    ({"verifier_gid": 1000}, "HOLD_STAGE_VERIFIER_GID_COLLISION"),
    ({"shell": "/bin/bash"}, "HOLD_STAGE_VERIFIER_PROFILE"),
    ({"supplementary_groups": [980]}, "HOLD_STAGE_VERIFIER_PROFILE"),
    ({"custody_ipc_gid": 980}, "HOLD_CUSTODY_IPC_ALIAS"),
    ({"private_stage_uid": 1000}, "HOLD_PRIVATE_STAGE_CUSTODY"),
    ({"private_stage_writable_by_verifier": True}, "HOLD_PRIVATE_STAGE_WRITE"),
    ({"candidate_owner_private_stage_acl": True}, "HOLD_PRIVATE_STAGE_OVEREXPOSED"),
    ({"world_or_group_private_stage_access": True}, "HOLD_PRIVATE_STAGE_OVEREXPOSED"),
    ({"candidate_digest_before_verifier_acl": False}, "HOLD_ACL_BEFORE_AUTHENTICATION"),
    ({"private_verified_before_acl_removal": False}, "HOLD_PRIVATE_VERIFY_SEQUENCE"),
    ({"temporary_acl_removed_before_publication": False}, "HOLD_RESIDUAL_PRIVATE_ACL"),
    ({"historical_3754_account_plan_reused": True}, "HOLD_HISTORICAL_ACCOUNT_PLAN_REUSE"),
    ({"provider_aware_account_plan_accepted": False}, "HOLD_PROVIDER_AWARE_ACCOUNT_PLAN"),
    ({"final_stage_identity_explicitly_reviewed": False}, "HOLD_FINAL_STAGE_IDENTITY_POLICY"),
    ({"candidate_owner_executes_protected_copy": True}, "HOLD_CANDIDATE_OWNER_PRIVILEGE_ESCALATION"),
)
for mutation, expected in negatives:
    observed = classify_synthetic({**synthetic, **mutation}, contract)
    assert observed == expected, (mutation, expected, observed)

print(MARKER + "_GREEN")
print("current_parent_pr=3715")
print("current_parent_head=" + UPSTREAM_HEAD)
print("current_source_installer_blob=" + SOURCE_BLOB)
print("current_receipt_installer_blob=" + RECEIPT_BLOB)
print("current_identity_lines=13")
print("root_only_protected_copy=GREEN")
print("candidate_owner_uid_gid=1000:1000")
print("stage_verifier_identity=UNSELECTED")
print("historical_3754_account_plan_reusable=false")
print("provider_aware_account_plan_accepted=false")
print("negative_role_models=" + str(len(negatives)))
print("synthetic_verifier_numbers_are_not_host_candidates=true")
print("source_installer_modified=false")
print("receipt_installer_modified=false")
print("root_execution=false")
print("account_or_acl_mutation=false")
print("protected_stage_apply=false")
print("presale_activation=false")
print("funds_movement=false")
