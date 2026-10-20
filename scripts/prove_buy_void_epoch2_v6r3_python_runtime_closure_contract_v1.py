#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import json
import os
from pathlib import Path
import stat

ROOT=Path(__file__).resolve().parents[1]
CONTRACT=ROOT/"ops/security/buy-void-epoch2-v6r3-python-runtime-closure-contract-v1.json"
BINARY_LOCK=ROOT/"ops/security/buy-void-epoch2-v6r3-plan-first-entry-binary-candidate-lock-v1.json"
PLANNER=ROOT/"ops/precision/void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3.py"

MARKER="VOID_BUY_VOID_EPOCH2_V6R3_PYTHON_RUNTIME_CLOSURE_CONTRACT_V1"
PREFIX="voidbuye2v6r3pyruntimecontract1_"
CONTRACT_ID="voidbuye2v6r3pyruntimecontract1_702512d9c813b4dd10f1e1ba4ae6bcbef300af6698cb102403a1e1d1ad2d1dc0"
BINARY_LOCK_BLOB="66bf48fd6477e0335b1eea6e2b7e8a7f297f8c57"
PLANNER_BLOB="19c6e1cdf9f2361cedfba4ea8d650a63eb5061ff"
PLANNER_SHA256="95d9dd865bc226a7436a67fff977215e43aad034ce40c2c9126ecc49c469d627"
PLANNER_BYTES=49025
EXPECTED_IMPORTS={"argparse","hashlib","json","os","pathlib","re","stat","subprocess","typing"}

def canonical(value:object)->bytes:
    return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=True).encode("ascii")

def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def git_blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw).hexdigest()

def exact(path:Path,maximum:int)->bytes:
    before=path.lstat()
    assert stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode)
    assert before.st_nlink==1 and 0<before.st_size<=maximum
    fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_NONBLOCK)
    try:
        opened=os.fstat(fd)
        fields=("st_dev","st_ino","st_mode","st_uid","st_gid","st_nlink","st_size","st_mtime_ns","st_ctime_ns")
        assert all(getattr(before,k)==getattr(opened,k) for k in fields)
        chunks=[];remaining=opened.st_size
        while remaining:
            chunk=os.read(fd,min(65536,remaining));assert chunk
            chunks.append(chunk);remaining-=len(chunk)
        assert os.read(fd,1)==b""
        after=os.fstat(fd);visible=path.lstat()
        assert all(getattr(opened,k)==getattr(after,k)==getattr(visible,k) for k in fields)
        return b"".join(chunks)
    finally:
        os.close(fd)

lock_raw=exact(BINARY_LOCK,128*1024)
assert git_blob(lock_raw)==BINARY_LOCK_BLOB
lock=json.loads(lock_raw)
assert lock["lock_id"]=="voidbuye2v6r3planfirstentrybinlock1_f6b452bb75542809454a0b68bae2f0049a4f2af6329e0b13075de1491bbbbc61"
assert lock["candidate_binary_identity_accepted"] is True
assert lock["candidate_report"]["binary"]["sha256"]=="986e860593a1aaef34dc6d1ffbd44f626a2bed9512d96be79f1fbcfdc176f2cd"
assert lock["candidate_report"]["binary"]["bytes"]==813064
for key in ("protected_install_authorized","installed_binary_identity_proven","host_plan_authorized","credential_access","signing","transaction","funds_movement"):
    assert lock[key] is False,key

planner_raw=exact(PLANNER,4*1024*1024)
assert git_blob(planner_raw)==PLANNER_BLOB
assert sha256(planner_raw)==PLANNER_SHA256 and len(planner_raw)==PLANNER_BYTES
def exact_import_contract(source:str)->set[str]:
    tree=ast.parse(source)
    imports:set[str]=set()
    future_nodes:list[ast.ImportFrom]=[]
    for node in tree.body:
        if isinstance(node,ast.Import):
            for alias in node.names:
                imports.add(alias.name.split(".",1)[0])
        elif isinstance(node,ast.ImportFrom):
            assert node.level==0,"relative_import_forbidden"
            assert node.module is not None
            if node.module=="__future__":
                future_nodes.append(node)
                continue
            imports.add(node.module.split(".",1)[0])
    assert len(future_nodes)==1,"future_directive_count_invalid"
    future=future_nodes[0]
    assert len(future.names)==1,"future_directive_feature_count_invalid"
    assert future.names[0].name=="annotations","future_directive_feature_invalid"
    assert future.names[0].asname is None,"future_directive_alias_invalid"
    return imports

planner_text=planner_raw.decode("utf-8","strict")
imports=exact_import_contract(planner_text)
assert imports==EXPECTED_IMPORTS,(imports,EXPECTED_IMPORTS)
try:
    exact_import_contract("from __future__ import division\nimport argparse\n")
except AssertionError as exc:
    assert str(exc)=="future_directive_feature_invalid"
else:
    raise AssertionError("alternate_future_directive_accepted")

for required in (
    'FIXED_GIT=Path("/usr/bin/git")',
    '"GIT_CONFIG_NOSYSTEM":"1"',
    '"GIT_CONFIG_GLOBAL":"/dev/null',
    '"GIT_CONFIG_SYSTEM":"/dev/null',
    '"GIT_NO_REPLACE_OBJECTS":"1"',
    '"GIT_NO_LAZY_FETCH":"1"',
    '"GIT_TERMINAL_PROMPT":"0"',
    '"GIT_ASKPASS":"/bin/false',
    '"GIT_ALLOW_PROTOCOL":""',
    'pass_fds=(tool_fd,)',
):
    assert required in planner_text,required

raw=exact(CONTRACT,128*1024)
value=json.loads(raw)
assert value["schema"]=="void_buy_void_epoch2_v6r3_python_runtime_closure_contract_v1"
assert value["marker"]==MARKER and value["version"]==1 and value["repository"]=="6ZoSo9/void-node"
assert value["first_entry_binary_lock"]["git_blob_sha1"]==BINARY_LOCK_BLOB
assert value["planner"]=={
    "path":"ops/precision/void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3.py",
    "git_blob_sha1":PLANNER_BLOB,
    "sha256":PLANNER_SHA256,
    "bytes":PLANNER_BYTES,
    "sealed_fd_path":"/proc/self/fd/3",
    "python_flags":["-I","-B","-S"],
    "top_level_imports":sorted(EXPECTED_IMPORTS),
    "repository_local_imports":False,
}
assert value["runtime_process"]["uid"]==1000 and value["runtime_process"]["gid"]==1000
assert value["runtime_process"]["supplementary_groups_empty"] is True
assert value["runtime_process"]["no_new_privileges"] is True
assert value["runtime_process"]["caller_stdin_authority"] is False
# The diagnostic is a separate Draft PR generation, not the local checkout:
# bind exactly the reviewed hosted source+workflow run and its *observed*
# ordinary sealed-Python fexecve result, not a free-floating boolean.
DIAGNOSTIC_EVIDENCE={
    "repository":"6ZoSo9/void-node",
    "pull_request":3579,
    "exact_head":"bc59170b211c3bd2490446b0e1cd045b5d9d5925",
    "fixture_path":"scripts/prove_buy_void_epoch2_v6r3_postexec_dumpability_v1.py",
    "fixture_git_blob_sha1":"a946e81549fe12f61b61d17cad76a7eda40501ff",
    "workflow_path":".github/workflows/buy-void-epoch2-v6r3-postexec-dumpability-v1.yml",
    "workflow_git_blob_sha1":"e27aa4a81fbfe4ae122db5fa5cf906fbe1848e28",
    "run_id":39360364319,
    "job_id":118424883505,
    "conclusion":"success",
    "actual_sealed_memfd_fexecve":True,
    "observed_pre_exec_dumpable":0,
    "observed_post_exec_dumpable":1,
    "production_host_execution":False,
    "runtime_dumpability_accepted":False,
}
def assert_exact_diagnostic_evidence(candidate:dict)->None:
    assert candidate==DIAGNOSTIC_EVIDENCE,"post_exec_fixture_evidence_generation_mismatch"

assert_exact_diagnostic_evidence(value["post_exec_diagnostic_evidence"])
for key,bad in (
    ("exact_head","0"*40),
    ("fixture_git_blob_sha1","0"*40),
    ("workflow_git_blob_sha1","0"*40),
    ("run_id",0),
    ("job_id",0),
    ("conclusion","failure"),
    ("observed_pre_exec_dumpable",1),
    ("observed_post_exec_dumpable",0),
    ("runtime_dumpability_accepted",True),
    ("production_host_execution",True),
):
    adversary=dict(DIAGNOSTIC_EVIDENCE);adversary[key]=bad
    try:
        assert_exact_diagnostic_evidence(adversary)
    except AssertionError:
        pass
    else:
        raise AssertionError("unbound_diagnostic_evidence_accepted:"+key)

def verify_dumpability_evidence(process:dict)->None:
    assert "dumpable" not in process,"post_exec_dumpable_cannot_be_inferred_from_native_preexec"
    for key in (
        "pre_exec_dumpability_zero_required",
        "ordinary_sealed_python_fexecve_reset_observed_in_fixture",
    ):
        assert process[key] is True,key
    for key in ("post_exec_dumpability_verified","post_exec_dumpability_accepted"):
        assert process[key] is False,key


process=value["runtime_process"]
verify_dumpability_evidence(process)
# Actual negative verifier calls: neither a falsely accepted child nor a
# missing pre-exec gate can pass by inheriting the native pre-exec marker.
for key,bad in (
    ("post_exec_dumpability_accepted",True),
    ("post_exec_dumpability_verified",True),
    ("pre_exec_dumpability_zero_required",False),
    ("ordinary_sealed_python_fexecve_reset_observed_in_fixture",False),
    ("dumpable",False),
):
    negative=dict(process);negative[key]=bad
    try:
        verify_dumpability_evidence(negative)
    except AssertionError:
        pass
    else:
        raise AssertionError("invalid_dumpability_evidence_accepted:"+key)
h=value["host_census_requirements"]
for key in (
    "post_exec_pr_get_dumpable_observation_required",
    "post_exec_ptrace_procfs_policy_evidence_required",
    "pre_exec_dumpability_not_post_exec_authority",
    "python_loader_startup_exposure_must_be_reviewed",
    "python_link_and_realpath_root_custody_required",
    "runtime_uid_effective_nonwritability_required",
    "python_elf_sha256_and_size_required",
    "python_elf_pt_interp_required",
    "pt_interp_root_custody_and_identity_required",
    "ld_so_preload_must_be_absent",
    "ld_so_cache_identity_required_if_present",
    "nonexistent_sys_path_entries_absence_and_parent_custody_required",
    "exact_import_probe_file_access_closure_required",
    "exact_import_probe_mapped_elf_closure_required",
    "native_dlopen_plugin_and_config_closure_required",
    "observed_runtime_files_must_be_manifest_subset",
    "dynamic_needed_transitive_closure_required",
    "no_unresolved_dt_needed_allowed",
    "rpath_runpath_records_required",
    "resolved_dependency_paths_canonical_absolute",
    "dependency_resolution_ambiguity_holds",
    "sys_path_order_bound",
    "sys_path_entries_absolute_nonempty",
    "sys_path_cwd_forbidden",
    "user_site_disabled",
    "site_import_disabled",
    "sys_prefix_facts_bound",
    "implementation_cache_tag_and_soabi_bound",
    "complete_existing_sys_path_tree_inventory_required",
    "regular_file_sha256_and_metadata_required",
    "symlink_text_and_resolved_target_identity_required",
    "directory_and_ancestor_custody_required",
    "all_elf_files_in_python_roots_dependency_closed",
    "zip_import_roots_identity_required",
    "special_files_forbidden",
    "census_report_canonical_json_required",
    "census_report_source_only_unaccepted",
):
    assert h[key] is True,key
assert h["python_probe_exact_flags"]==["-I","-B","-S"]
assert h["tree_object_types_allowed"]==["directory","regular","symlink"]
assert h["max_tree_entries"]==100000
assert h["max_regular_file_bytes"]==536870912
assert h["census_report_max_bytes"]==16777216
g=value["planner_subprocess_closure"]["git"]
assert g["requested_path"]=="/usr/bin/git"
for key in (
    "retained_fd_execution_required",
    "realpath_sha256_and_size_required",
    "root_custody_and_runtime_uid_nonwritability_required",
    "pt_interp_and_transitive_dt_needed_closure_required",
    "rpath_runpath_records_required",
    "runtime_helpers_plugins_and_config_file_access_closure_required",
    "mapped_elf_closure_required",
    "terminal_generation_revalidation_required",
    "adversarial_dependency_or_helper_substitution_must_hold",
):
    assert g[key] is True,key
assert g["observed_builtin_commands"]==["branch","cat-file","rev-parse","show","status"]
assert all(v is True for v in g["repository_metadata_closure_required"].values())
assert g["clean_environment"]=={
    "PATH":"/usr/bin:/bin","HOME":"/home/zoso","LANG":"C","LC_ALL":"C","TZ":"UTC",
    "GIT_CONFIG_NOSYSTEM":"1","GIT_CONFIG_GLOBAL":"/dev/null","GIT_CONFIG_SYSTEM":"/dev/null",
    "GIT_NO_REPLACE_OBJECTS":"1","GIT_OPTIONAL_LOCKS":"0","GIT_NO_LAZY_FETCH":"1",
    "GIT_TERMINAL_PROMPT":"0","GIT_ASKPASS":"/bin/false","GIT_PROTOCOL_FROM_USER":"0",
    "GIT_ALLOW_PROTOCOL":"","GIT_PAGER":"",
}
a=value["acceptance_requirements"]
assert a["post_exec_dumpability_protection_or_isolation_gate_required"] is True
assert a["post_exec_diagnostic_exact_generation_and_observation_required"] is True
assert all(v is True for v in a.values())
authority=value["authority"]
assert authority["source_contract_only"] is True
for key,v in authority.items():
    if key=="source_contract_only": continue
    assert v is False,key
assert value["next_gate"]=="void_buy_void_epoch2_v6r3_python_runtime_closure_census_v1"

material=dict(value);observed=material.pop("contract_id")
assert observed==CONTRACT_ID==PREFIX+sha256(canonical(material))

print(MARKER+"_PROOF_GREEN")
print("contract_id="+CONTRACT_ID)
print("first_entry_binary_lock_bound=true")
print("planner_exact_import_set_bound=true")
print("future_directive_annotations_exact=true")
print("alternate_future_directive_rejected=true")
print("python_flags_i_b_s_bound=true")
print("native_pre_exec_dumpability_not_child_authority=true")
print("post_exec_dumpability_accepted=false")
print("invalid_post_exec_dumpability_claims_rejected=true")
print("exact_sealed_fexecve_diagnostic_evidence_bound=true")
print("diagnostic_source_workflow_and_job_mutations_rejected=true")
print("post_exec_pr_get_dumpable_required=true")
print("post_exec_ptrace_procfs_isolation_evidence_required=true")
print("post_exec_loader_window_review_required=true")
print("dynamic_loader_transitive_closure_required=true")
print("complete_python_sys_path_tree_inventory_required=true")
print("ld_so_preload_must_be_absent=true")
print("nonexistent_sys_path_absence_bound=true")
print("exact_import_probe_file_access_closure_required=true")
print("exact_import_probe_mapped_elf_closure_required=true")
print("native_dlopen_plugin_and_config_closure_required=true")
print("git_subprocess_runtime_closure_required=true")
print("git_repository_metadata_closure_required=true")
print("git_dependency_or_helper_substitution_must_hold=true")
print("host_census_authorized=false")
print("python_runtime_closure_accepted=false")
print("protected_install_authorized=false")
print("host_plan_authorized=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("funds_movement=false")
