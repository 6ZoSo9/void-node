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
CONTRACT_ID="voidbuye2v6r3pyruntimecontract1_6b88925643319fd7724f4fd66d115fd5ec9598a3c59a57cbc0a8c51737c8bae8"
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
tree=ast.parse(planner_raw.decode("utf-8","strict"))
imports=set()
for node in tree.body:
    if isinstance(node,ast.Import):
        for alias in node.names:
            imports.add(alias.name.split(".",1)[0])
    elif isinstance(node,ast.ImportFrom):
        assert node.level==0,"relative_import_forbidden"
        assert node.module is not None
        if node.module=="__future__":
            continue
        imports.add(node.module.split(".",1)[0])
assert imports==EXPECTED_IMPORTS,(imports,EXPECTED_IMPORTS)

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
h=value["host_census_requirements"]
for key in (
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
a=value["acceptance_requirements"]
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
print("future_directive_not_runtime_import=true")
print("python_flags_i_b_s_bound=true")
print("dynamic_loader_transitive_closure_required=true")
print("complete_python_sys_path_tree_inventory_required=true")
print("ld_so_preload_must_be_absent=true")
print("nonexistent_sys_path_absence_bound=true")
print("exact_import_probe_file_access_closure_required=true")
print("exact_import_probe_mapped_elf_closure_required=true")
print("native_dlopen_plugin_and_config_closure_required=true")
print("host_census_authorized=false")
print("python_runtime_closure_accepted=false")
print("protected_install_authorized=false")
print("host_plan_authorized=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("funds_movement=false")
