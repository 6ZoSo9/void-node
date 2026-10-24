#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
TARGET=ROOT/"ops/precision/void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3.py"
LOCK=ROOT/"ops/security/buy-void-epoch2-live-composition-runner-policy-candidate-lock-v6r3.json"
RUNNER=ROOT/"ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v4.mjs"

LOCK_ID="voidbuye2runnerpollock6r3_0633e059bfdfb1209b80b090adacddae61795ca610a6bf7f79059cc997148f52"
CANDIDATE_ID="voidbuye2runnerpolcand6r3_0a3bfc00032b0feeb253fb0f295b4dacc1e3e66af35013676351ed11e3c119e1"
LOCK_BLOB="d28ebbd3fe1d89a1940b039af64e10a6cb96065e"
RUNNER_BLOB="2fa028824d71a22f4d228cdb7fcda738bce7b409"
PLAN_BLOB="19c6e1cdf9f2361cedfba4ea8d650a63eb5061ff"
RUNNER_SHA256="9b8497c813fc3899b745736da01929380b5f28f988f70790def1e0a98b35a261"
RUNTIME_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"

def git_blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw).hexdigest()

assert git_blob(TARGET.read_bytes())==PLAN_BLOB
assert git_blob(LOCK.read_bytes())==LOCK_BLOB
assert git_blob(RUNNER.read_bytes())==RUNNER_BLOB
assert hashlib.sha256(RUNNER.read_bytes()).hexdigest()==RUNNER_SHA256

source=TARGET.read_text()
tree=ast.parse(source)
for name in (
    "source_snapshot","snapshot_host_file","build_policy","verify_generation",
    "verify_v4_predecessor","classify_state","_collect_plan_with_observers",
    "collect_plan","source_plan",
    "require_plan_identity","_directory_chain","_revalidate_chain",
    "_trusted_file_before","_revalidate_trusted_file","_open_verified_root_fd",
    "require_protected_leaf_nonwritable",
    "self_test","emit_plan",
):
    assert any(isinstance(node,ast.FunctionDef) and node.name==name for node in tree.body),name

for required in (
    'LOCK_ID="voidbuye2runnerpollock6r3_0633e059bfdfb1209b80b090adacddae61795ca610a6bf7f79059cc997148f52"',
    'CANDIDATE_ID="voidbuye2runnerpolcand6r3_0a3bfc00032b0feeb253fb0f295b4dacc1e3e66af35013676351ed11e3c119e1"',
    'RUNTIME_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"',
    'QUALIFIER_REPLACEMENT_BLOB="98f8b9fda89e33c50e19008268d97655aad54e6d"',
    'V6_QUALIFIER_BLOB="83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc"',
    'V6_REPLACEMENT_BLOB="f81d9fbead60593258d17dbb8720e1efc867b20f"',
    'CREDENTIAL_LOCK_V3R_BLOB="c4870f3178aebc9a0bb6557562f663b8480cfefa"',
    'CREDENTIAL_LOCK_V2_BLOB="b73415ce8fc95ff2d49cbde97a15d701ad5b7937"',
    'V6_LOCK_BLOB="772945b639d138284fc18cc312f7b9115b10c748"',
    'V4_PARSER_BLOB="223a8acf32f8c7961d61222b83c0db17075f86c6"',
    'SOURCE_RUNTIME_DEPENDENCY_SPECS=(',
    '"runtime_source_dependency_count":len(SOURCE_RUNTIME_DEPENDENCY_SPECS)',
    "def raw_commit_parents(oid:str)->list[str]:",
    "def require_actual_object_ancestry(source_head:str)->None:",
    'git(["cat-file","-t",oid])',
    'git(["cat-file","-p",oid],binary=True)',
    "source_runtime_actual_object_ancestry_not_found",
    "source_runtime_graft_ancestry_rejected=true",
    '"runtime_source_complete_dependency_set_bound":True',
    '"host_node_terminal_revalidated":True',
    '"protected_state_terminal_revalidated":True',
    '"host_root_descriptor_identity_required":True',
    '"host_ancestor_acl_nonwritability_required":True',
    'host_node_and_state_terminal_revalidation_required=true',
    'trusted_git_procfd_first_exec_fixture_green=true',
    'host_node_terminal_drift_rejected=true',
    'protected_state_terminal_drift_rejected=true',
    '"source_terminal_revalidated":True',
    'source_after=source_snapshot_fn()',
    'if source_after!=source_before:',
    'raise PlanError("source_generation_changed_during_plan")',
    'NEW_RUNNER_SHA256="9b8497c813fc3899b745736da01929380b5f28f988f70790def1e0a98b35a261"',
    'PREDECESSOR_V6R2_ROOT=',
    '"full_root_stage_required":True',
    '"atomic_root_exchange_required":True',
    '"rename_exchange_required":True',
    '"rename_noreplace_predecessor_required":True',
    '"predecessor_v6r2_retention_required":True',
    '"automatic_rollback_required":True',
    '"filesystem_write":False',
    '"runner_execution":False',
    '"native_execution":False',
    '"credential_access":False',
    '"signing":False',
    '"transaction":False',
    '"funds_movement":False',
    'RUNTIME_UID=1000',
    'RUNTIME_GID=1000',
    'def require_plan_identity()->None:',
    'def _directory_chain(path:Path)->list[tuple[Path,tuple[int,...]]]:',
    'os.access(ancestor,os.W_OK,effective_ids=True)',
    'os.O_NOFOLLOW|os.O_NONBLOCK|os.O_CLOEXEC',
    'pass_fds=(tool_fd,)',
    'os.listdir(root_fd)',
    'chain=require_root_dir(root)',
    'chain=require_root_dir(PREDECESSOR_V4_ROOT)',
    'parent_chain=require_root_dir(INSTALL_PARENT)',
    'require_plan_identity()',
    'protected_ancestor_acl_custody_required=true',
    'protected_directory_listing_fd_bound=true',
    'trusted_git_first_exec_retained_fd_required=true',
    '"retained_first_exec_lock_bound":True',
    'host_plan_exact_runtime_uid_gid_required=true',
    'protected_leaf_runtime_acl_nonwritability_required=true',
    'protected_leaf_acl_write_rejected=true',
    'protected_leaf_acl_unavailable_rejected=true',
):
    assert required in source,required
assert "--apply" not in source
assert "os.rename(" not in source
assert "renameat2" not in source
assert "subprocess.Popen" not in source
# The directory and first-exec custody constraints must not regress to
# unchecked pathname observations even if their hashes are reissued.
assert "os.listdir(root)" not in source
assert "os.listdir(PREDECESSOR_V4_ROOT)" not in source
assert 'str(FIXED_GIT),' not in source[source.index('def git('):source.index('MAX_ACTUAL_ANCESTRY_COMMITS')]
assert source.count('os.listdir(root_fd)')==2
assert source.count('require_protected_leaf_nonwritable(root_fd,name,')==2
assert 'name,os.W_OK,dir_fd=root_fd,effective_ids=True,' in source
assert source.count('_revalidate_chain(chain)')>=4
assert 'fd=os.open(name,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_NONBLOCK,dir_fd=root_fd)' in source
assert 'fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_NONBLOCK)' in source
assert 'chain=_directory_chain(path.parent)' in source

python=sys.executable
for mode in ("--self-test","--source-plan"):
    cp=subprocess.run(
        [python,"-I","-B",str(TARGET),mode],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,encoding="utf-8",errors="strict",
        env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC"},
        timeout=30,check=False,
    )
    assert cp.returncode==0,(mode,cp.stdout,cp.stderr)
    assert cp.stderr=="",(mode,cp.stderr)
    lines=set(cp.stdout.splitlines())
    if mode=="--self-test":
        for line in (
            "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_UPGRADE_PLAN_V6R3_SELF_TEST_GREEN",
            "runtime_policy_head_preserved=true",
            "accepted_v6r3_lock_bound=true",
            "native_v3_identity_reused=true",
            "runner_v4_identity_bound=true",
            "policy_node_identity_host_derived=true",
            "runtime_source_complete_dependency_set_bound=true",
            "source_runtime_actual_object_ancestry_required=true",
            "source_runtime_graft_ancestry_rejected=true",
            "runtime_source_dependency_count=9",
            "terminal_source_revalidation_required=true",
            "late_source_drift_rejected=true",
            "full_root_atomic_exchange_required=true",
            "host_plan_exact_runtime_uid_gid_required=true",
            "protected_leaf_runtime_acl_nonwritability_required=true",
            "protected_leaf_acl_write_rejected=true",
            "protected_leaf_acl_unavailable_rejected=true",
            "host_node_and_state_terminal_revalidation_required=true",
            "protected_ancestor_acl_custody_required=true",
            "protected_directory_listing_fd_bound=true",
            "trusted_git_first_exec_retained_fd_required=true",
            "host_node_nonblocking_fd_required=true",
            "writable_ancestor_rejected=true",
            "trusted_git_procfd_first_exec_fixture_green=true",
            "host_node_terminal_drift_rejected=true",
            "protected_state_terminal_drift_rejected=true",
            "v6r2_predecessor_retention_required=true",
            "filesystem_write=false",
            "credential_access=false",
            "transaction=false",
            "funds_movement=false",
        ):
            assert line in lines,line
    else:
        for line in (
            "mode=source-plan","source_only=true","host_read=false","host_write=false",
            "accepted_lock_id="+LOCK_ID,
            "accepted_candidate_id="+CANDIDATE_ID,
            "retained_first_exec_lock_bound=true",
            "runtime_head="+RUNTIME_HEAD,
            "native_reused=true",
            "runtime_source_dependency_count=9",
            "runtime_source_complete_dependency_set_bound=true",
            "terminal_source_revalidation_required=true",
            "atomic_root_exchange_required=true",
            "protected_ancestor_acl_custody_required=true",
            "protected_directory_listing_fd_bound=true",
            "trusted_git_first_exec_retained_fd_required=true",
            "protected_leaf_runtime_acl_nonwritability_required=true",
            "host_plan_exact_runtime_uid_gid_required=true",
            "host_node_and_state_terminal_revalidation_required=true",
            "filesystem_write=false",
            "credential_access=false",
            "transaction=false",
            "funds_movement=false",
            "next_action=SEPARATELY_AUTHORIZE_EPOCH2_V6R3_NONEXECUTING_HOST_PLAN",
        ):
            assert line in lines,line

lock=json.loads(LOCK.read_bytes())
assert lock["version"]==8
assert lock["integration_pr"]==3546
assert lock["integration_base_head"]=="0ada7fde0d90c3946b10693f4621cbd690bfcde6"
assert lock["lock_id"]==LOCK_ID
assert lock["candidate_report"]["candidate_id"]==CANDIDATE_ID
assert lock["source_evidence_pr"]==3566
assert lock["integration_head"]=="8729f4ca54543228ee99d5a50afc6a394c77bb28"
assert lock["retained_first_exec_identity_accepted"] is True
sc=lock["candidate_report"]["source_compatibility"]
assert sc["retained_setpriv_descriptor_first_exec_required"] is True
assert sc["retained_python_descriptor_first_exec_required"] is True
assert sc["retained_git_descriptor_execution_required"] is True
assert sc["retained_node_descriptor_execution_required"] is True
assert sc["retained_procfd_portable_cwd_required"] is True
assert sc["retained_procfd_missing_cwd_errno_distinguished"] is True
assert lock["candidate_report"]["source_compatibility"]["actual_object_ancestry_required"] is True
assert lock["candidate_report"]["source_compatibility"]["revision_walk_metadata_authority"] is False
assert lock["candidate_report"]["source_compatibility"]["graft_ancestry_authority"] is False
assert lock["protected_install_authorized"] is False
assert lock["live_execution_authorized"] is False

print("VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_UPGRADE_PLAN_V6R3_PROOF_GREEN")
print("main_based_integration_lock_bound=true")
print("planner_git_blob_bound=true")
print("accepted_lock_blob_bound=true")
print("accepted_runner_blob_bound=true")
print("nonexecuting_plan_only=true")
print("no_apply_mode=true")
print("runtime_policy_head_preserved=true")
print("runtime_source_complete_dependency_set_bound=true")
print("runtime_source_dependency_count=9")
print("terminal_source_revalidation_required=true")
print("late_source_drift_rejected=true")
print("source_runtime_actual_object_ancestry_required=true")
print("source_runtime_graft_ancestry_rejected=true")
print("full_root_atomic_exchange_required=true")
print("v6r2_predecessor_retention_required=true")
print("protected_ancestor_acl_custody_required=true")
print("protected_directory_listing_fd_bound=true")
print("trusted_git_first_exec_retained_fd_required=true")
print("host_plan_exact_runtime_uid_gid_required=true")
print("protected_leaf_runtime_acl_nonwritability_bound=true")
print("host_node_and_state_terminal_revalidation_required=true")
print("filesystem_write=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("funds_movement=false")
