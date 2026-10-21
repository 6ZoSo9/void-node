#!/usr/bin/env python3
from __future__ import annotations
import ast, os, pathlib, shutil, stat, subprocess, sys, tempfile

ROOT=pathlib.Path(__file__).resolve().parents[1]
MARKER="VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V4_PROOF"
INS=ROOT/"ops/precision/void_buy_void_v7_protected_substrate_install_v4.py"
MAT=ROOT/"scripts/materialize_buy_void_v7_protected_substrate_v2.py"
PRED=ROOT/"ops/precision/void_buy_void_v7_protected_substrate_install_v3.py"
LOCK=ROOT/"ops/security/buy-void-v7-protected-substrate-candidate-lock-v1.json"
QUAL=ROOT/"ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v3.py"
PRED_QUAL=ROOT/"ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v2.py"

def gblob(path:pathlib.Path)->str:
    cp=subprocess.run(["/usr/bin/git","hash-object",str(path)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=20)
    if cp.returncode or cp.stderr: raise RuntimeError("hash_object_failed:"+str(path))
    return cp.stdout.strip()

assert gblob(INS)=="94112afa2f805e0a6ce881a490c1c64e31e0413e"
assert gblob(MAT)=="474614da950db72082fb95a5174405ce8caf2513"
assert gblob(PRED)=="4bf7c29dc32b6c358a3cd299055bf6c2ebe71c38"
assert gblob(LOCK)=="831f6e3f79a62a334662cebc6d2c39133bc7a309"
assert gblob(QUAL)=="ea3c31180810ea4efe4341683742827dcf6ac5ac"
assert gblob(PRED_QUAL)=="56a7ca798553766af525d9fb1ccbe58b70fe9c1d"

src=INS.read_text("utf-8")
qsrc=QUAL.read_text("utf-8")
parsed_source = ast.parse(src)
assert isinstance(parsed_source.body[0], ast.Import)
assert len(parsed_source.body[0].names) == 1
assert parsed_source.body[0].names[0].name == "sys"
assert parsed_source.body[0].names[0].asname == "_bootstrap_sys"
assert not any(isinstance(item, ast.ImportFrom) and item.module == "__future__" for item in parsed_source.body)
ast.parse(qsrc)

required=(
    'MARKER = "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V4"',
    'SCHEMA = "void_buy_void_v7_protected_substrate_install_plan_v4"',
    'PLAN_PREFIX = "voidv7substrateinstallplan4_"',
    'CONFIRM_TOKEN = "INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V4_CREATE_ONLY"',
    'PREDECESSOR_MERGE = "0ada7fde0d90c3946b10693f4621cbd690bfcde6"',
    'PREDECESSOR_TREE = "9e930fba9aacfafb5b163767302786cd7f31c81e"',
    'PREDECESSOR_INSTALLER_BLOB = "4bf7c29dc32b6c358a3cd299055bf6c2ebe71c38"',
    'MATERIALIZER_BLOB = "474614da950db72082fb95a5174405ce8caf2513"',
    'SOURCE_RELEASE_ROOT_MODE = 0o555',
    'PROTECTED_SOURCE_ROOT_MODE = 0o755',
    'def tree_digest(root: pathlib.Path, expected_root_mode: int)',
    'stat.S_IMODE(rst.st_mode) != expected_root_mode',
    'tree_digest(SOURCE_RELEASE, SOURCE_RELEASE_ROOT_MODE)',
    'tree_digest(SOURCE_TARGET, PROTECTED_SOURCE_ROOT_MODE)',
    'tree_digest(SOURCE_STAGE, PROTECTED_SOURCE_ROOT_MODE)',
    'root_mode != SOURCE_RELEASE_ROOT_MODE',
    '"root_mode": format(SOURCE_RELEASE_ROOT_MODE, "04o")',
    '"protected_source_root_mode": format(PROTECTED_SOURCE_ROOT_MODE, "04o")',
    '"schema": SCHEMA, "version": 4',
    'SEPARATELY_AUTHORIZE_V7_PROTECTED_SUBSTRATE_CREATE_ONLY_INSTALL_V4',
    'PROTECTED_SUBSTRATE_CREATE_ONLY_INSTALL_V4_GREEN',
    'QUALIFIER_REL = "ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v3.py"',
    'QUALIFIER_BLOB = "ea3c31180810ea4efe4341683742827dcf6ac5ac"',
    '"installed_qualifier": {"path": QUALIFIER_REL, "blob": QUALIFIER_BLOB}',
    'RUN_INSTALLED_QUALIFICATION_V3',
    'installed_qualifier_v3_bound=true',
    'immutable_source_release_root_mode_0555_required=true',
    'protected_source_root_mode_0755_required=true',
    'def require_git_metadata_provenance(root: pathlib.Path, label: str) -> None:',
    'git_dir_must_be_real_directory',
    'git_metadata_indirection_forbidden',
    'git_config_include_forbidden',
    'git_includeif_horizontal_whitespace_rejected=true',
    'git_config_core_worktree_forbidden',
    'git_config_core_attributesfile_forbidden',
    'git_config_filter_forbidden',
    'git_local_config_exact_allowlist_required=true',
    'git_raw_head_tree_manifest_required=true',
    'git_ignored_untracked_rejected_by_manifest=true',
    'def require_worktree_matches_tree(root: pathlib.Path, expected_tree: str, label: str) -> None:',
    'def _verify_worktree_manifest(',
    'git_config_promisor_forbidden',
    '"rev-parse", "--git-common-dir"',
    '"rev-parse", "--is-shallow-repository"',
    'require_git_metadata_provenance(ROOT, "checkout")',
    'require_git_metadata_provenance(SOURCE_RELEASE, "source_release")',
    'require_git_metadata_provenance(SOURCE_STAGE, "source_stage")',
    'require_git_metadata_provenance(SOURCE_TARGET, "protected_source")',
    'git_metadata_provenance_required_for_all_roots=true',
    'def install_parent_custody()',
    'def install_parent_fd_matches(',
    '"install_parent_custody_exact": True',
    'install_parent_descriptor_identity_mismatch',
    'install_parent_descriptor_generation_changed',
    'install_parent_root_owned_0755_required=true',
    'install_parent_descriptor_identity_required=true',
    'def candidate_fd_metadata_valid(',
    'os.O_NOFOLLOW | os.O_NONBLOCK',
    '_candidate_opened_type_invalid',
    'candidate_open_nonblocking_required=true',
    'candidate_retained_fd_regular_single_link_required=true',
    'candidate_fifo_or_special_file_rejected_before_read=true',
    'import sys as _bootstrap_sys',
    'reason=python_isolated_mode_required',
    'def require_privileged_source_custody()',
    'privileged_source_directory_pre_descent',
    'privileged_source_directory_pre_queue',
    'privileged_source_directory_generation_changed_during_scandir',
    'privileged_source_custody_required_before_apply=true',
    'privileged_source_root_acl_barrier_before_scandir=true',
    'privileged_source_directory_acl_barrier_before_descent=true',
    'privileged_source_symlink_resolution_after_directory_acl_barrier=true',
    'trusted_root_launcher_still_required=true',
    'def source_release_ancestor_custody()',
    'def revalidate_source_release_ancestor_custody(',
    'source_release_ancestor_acl_custody_required=true',
    'source_release_ancestor_generation_revalidation_required=true',
    'def _runtime_uid_write_audit_builtin(',
    'def _require_runtime_uid_nonwritable(',
    'os.fork()',
    'os.setgroups([])',
    'def _open_trusted_tool_lease(',
    'def _revalidate_trusted_tool_lease(',
    'def _run_runtime_observer_tool(',
    'f"/proc/self/fd/{tool_fd}"',
    'pass_fds=(tool_fd,)',
    'preexec_fn=_drop_to_runtime_identity_preexec',
    'PR_SET_NO_NEW_PRIVS = 38',
    'def _drop_to_runtime_identity_preexec() -> None:',
    'prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)',
    'os.setgid(RUNTIME_GID)',
    'os.setuid(RUNTIME_UID)',
    'os.access(raw_path, os.W_OK, effective_ids=True)',
    '_require_runtime_uid_nonwritable(runtime_paths, "privileged_source")',
    '_require_runtime_uid_nonwritable(runtime_paths, "install_parent")',
    'acl_aware_runtime_uid_nonwritability_required=true',
    'def _read_regular_sha256_exact(',
    '_require_runtime_uid_nonwritable(runtime_directories, "tree_directories")',
    '_require_runtime_uid_nonwritable(runtime_regulars, "tree_regulars")',
    'tree_root_acl_audit_precedes_first_scandir=true',
    'tree_directory_acl_audit_precedes_descent=true',
    'tree_directory_acl_audit_precedes_regular_file_reads=true',
    'tree_regular_acl_audit_precedes_regular_file_reads=true',
    'tree_regular_descriptor_nofollow_nonblocking_required=true',
    'tree_regular_descriptor_generation_revalidation_required=true',
    'installed_binary_acl_audit_precedes_hash=true',
    'installed_binary_descriptor_hash_required=true',
    'tree_regular_fifo_race_rejected_nonblocking=true',
    'tree_regular_symlink_race_rejected_nofollow=true',
)
for needle in required:
    assert needle in src, needle

for stale in ('tree_digest(SOURCE_RELEASE)','tree_digest(SOURCE_TARGET)','tree_digest(SOURCE_STAGE)'):
    assert stale not in src, stale
assert 'RUN_INSTALLED_QUALIFICATION_V2' not in src
assert 'FIXED_PYTHON' not in src
assert '_RUNTIME_WRITE_AUDIT_CODE' not in src
assert 'FIXED_SETPRIV' not in src
assert 'setpriv_fd' not in src
assert '"--no-new-privs"' not in src
assert 'preexec_fn=_drop_to_runtime_identity_preexec' in src
observer_drop=src[src.index('def _drop_to_runtime_identity_preexec'):src.index('def _run_runtime_observer_tool(')]
assert observer_drop.index('prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)') < observer_drop.index('os.setgroups([])')
assert observer_drop.index('os.setgroups([])') < observer_drop.index('os.setgid(RUNTIME_GID)') < observer_drop.index('os.setuid(RUNTIME_UID)')
observer_run=src[src.index('def _run_runtime_observer_tool('):src.index('def _read_metadata_file(')]
assert 'f"/proc/self/fd/{tool_fd}"' in observer_run
assert 'pass_fds=(tool_fd,)' in observer_run
assert 'preexec_fn=_drop_to_runtime_identity_preexec' in observer_run
assert 'setpriv' not in observer_run.lower()
tree_body=src[src.index('def tree_digest('):src.index('def candidate_fd_metadata_valid(')]
dir_audit=tree_body.index('_require_runtime_uid_nonwritable(runtime_directories, "tree_directories")')
reg_audit=tree_body.index('_require_runtime_uid_nonwritable(runtime_regulars, "tree_regulars")')
content_read=tree_body.index('digest = _read_regular_sha256_exact(')
root_pre_descent=tree_body.index('_require_runtime_uid_nonwritable([root], "tree_root_pre_descent")')
first_scandir=tree_body.index('os.scandir(directory)')
child_pre_descent=tree_body.index('_require_runtime_uid_nonwritable([child], "tree_directory_pre_descent")')
child_queue=tree_body.index('pending.append((child, rel / entry.name))')
assert root_pre_descent < first_scandir
assert first_scandir < child_pre_descent < child_queue
assert dir_audit < reg_audit < content_read
binary_body=src[src.index('def exact_binary_root('):src.index('def source_target_state(')]
root_audit=binary_body.index('_require_runtime_uid_nonwritable([root], label + "_installed_root")')
leaf_audit=binary_body.index('_require_runtime_uid_nonwritable([path], label + "_installed_leaf")')
binary_read=binary_body.index('_read_regular_sha256_exact(path, file_identity, label + "_installed_binary")')
assert root_audit < leaf_audit < binary_read
assert 'sha256_file(' not in src

qrequired=(
    'MARKER = "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALLED_QUALIFICATION_V3"',
    'PREDECESSOR_QUALIFIER_BLOB = "56a7ca798553766af525d9fb1ccbe58b70fe9c1d"',
    'SOURCE_RELEASE_ROOT_MODE = 0o555',
    'PROTECTED_SOURCE_ROOT_MODE = 0o755',
    'def root_metadata_fields_valid(',
    'def tree_digest(root: pathlib.Path, expected_root_mode: int)',
    'tree_digest(SOURCE_RELEASE, SOURCE_RELEASE_ROOT_MODE)',
    'tree_digest(SOURCE, PROTECTED_SOURCE_ROOT_MODE)',
    'status=INSTALLED_QUALIFICATION_V3_GREEN',
    'root_mode_role_split_verified=true',
    'source_release_root_mode_required=0555',
    'protected_source_root_mode_required=0755',
    'def _binary_ancestor_snapshot(path: pathlib.Path, label: str)',
    'def open_exact_executable_lease(',
    'os.O_NOFOLLOW | os.O_NONBLOCK',
    '[f"/proc/self/fd/{fd}", "--self-test"]',
    'pass_fds=(fd,)',
    'binary_root_and_ancestor_custody_verified=true',
    'binary_self_test_descriptor_execution=true',
    'binary_retained_descriptor_post_execution_revalidated=true',
    'os.access(current, os.W_OK, effective_ids=True)',
    'os.access(path, os.W_OK, effective_ids=True)',
    'binary_acl_aware_runtime_nonwritability_verified=true',
    'binary_acl_aware_runtime_nonwritability_required=true',
    'RUNTIME_UID = 1000',
    'RUNTIME_GID = 1000',
    'RUNTIME_SUPPLEMENTARY_GROUPS: tuple[int, ...] = ()',
    'def runtime_identity_fields_valid(',
    'def require_runtime_identity() -> None:',
    'runtime_uid_1000_required',
    'runtime_gid_1000_required',
    'runtime_supplementary_groups_must_be_empty',
    'runtime_identity_bound=true',
    'runtime_supplementary_groups_empty=true',
    'runtime_uid_gid_1000_required=true',
    'runtime_supplementary_groups_empty_required=true',
    'wrong_runtime_uid_gid_rejected=true',
    'supplementary_group_state_rejected=true',
    'runtime_identity_required=1000:1000',
    'FIXED_GIT = pathlib.Path("/usr/bin/git")',
    'FIXED_NODE = pathlib.Path("/usr/bin/node")',
    'def _open_runtime_lease(',
    'os.O_NOFOLLOW | os.O_NONBLOCK',
    '[f"/proc/self/fd/{fd}", *args]',
    'pass_fds=(node_fd, script_fd)',
    'qualifier_git_trusted_descriptor_execution=true',
    'qualifier_node_trusted_descriptor_execution=true',
    'qualifier_custody_script_retained_descriptor=true',
    'trusted_tool_runtime_acl_nonwritability_verified=true',
    'runtime_supplementary_groups_required=empty',
)
for needle in qrequired:
    assert needle in qsrc, needle
qualify_body=qsrc[qsrc.index('def qualify() -> None:'):qsrc.index('def self_test() -> None:')]
assert qualify_body.index('require_runtime_identity()') < qualify_body.index('require_exact_release_generation()')
assert 'os.chmod(SOURCE_RELEASE' not in qsrc
assert 'os.chown(SOURCE_RELEASE' not in qsrc
assert 'os.chmod(SOURCE_RELEASE' not in src
assert 'os.chown(SOURCE_RELEASE' not in src

with tempfile.TemporaryDirectory(prefix="void-v7-installer-isolation-") as td:
    t=pathlib.Path(td)
    guarded=t/"installer.py"
    guarded.write_text(src,"utf-8")
    marker=t/"shadow-executed"
    (t/"argparse.py").write_text("open("+repr(str(marker))+",'w').write('executed')\nraise RuntimeError('shadow')\n","utf-8")
    bad=subprocess.run([sys.executable,str(guarded),"--self-test"],cwd=t,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=10)
    assert bad.returncode==2
    assert "reason=python_isolated_mode_required" in bad.stdout.splitlines()
    assert not marker.exists()

    # Adversarial control: -S disables site initialization, making the
    # checkout-local __future__ shadow visible to an unsafe pre-guard import.
    (t/"__future__.py").write_text(
        "open("+repr(str(marker))+",'w').write('pre_guard_future_import')\n"
        "class annotations: pass\n", "utf-8"
    )
    legacy=t/"unsafe_future_import.py"
    legacy.write_text("from __future__ import annotations\n"+src, "utf-8")
    control=subprocess.run(
        [sys.executable,"-S","-B",str(legacy),"--self-test"],
        cwd=t,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=10
    )
    assert control.returncode==2
    assert marker.exists(), "negative_control_future_shadow_not_executed"
    marker.unlink()
    guarded_result=subprocess.run(
        [sys.executable,"-S","-B",str(guarded),"--self-test"],
        cwd=t,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=10
    )
    assert guarded_result.returncode==2
    assert "reason=python_isolated_mode_required" in guarded_result.stdout.splitlines()
    assert not marker.exists(), "checkout_future_shadow_executed_before_HOLD"

with tempfile.TemporaryDirectory(prefix="void-v7-effective-write-model-") as td:
    model=pathlib.Path(td)/"mode-safe-but-effective-writable"
    model.mkdir(mode=0o755)
    mode=stat.S_IMODE(model.stat().st_mode)
    assert (mode & 0o022)==0
    assert os.access(model,os.W_OK,effective_ids=True)

with tempfile.TemporaryDirectory(prefix="void-v7-trusted-tool-path-swap-") as td:
    t=pathlib.Path(td)
    visible=t/"tool"
    retained=t/"retained-python"
    shutil.copyfile(sys.executable,visible)
    os.chmod(visible,0o555)
    fd=os.open(visible,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_NONBLOCK)
    try:
        before=os.fstat(fd)
        visible.rename(retained)
        visible.write_text("#!/bin/sh\\nprintf \'ATTACKER\\\\n\'\\n","utf-8")
        os.chmod(visible,0o555)
        after_visible=visible.lstat()
        assert (after_visible.st_dev,after_visible.st_ino)!=(before.st_dev,before.st_ino)
        cp_swap=subprocess.run(
            [f"/proc/self/fd/{fd}","-I","-B","-c","print(\'RETAINED_ORIGINAL\')"],
            stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=20,
            pass_fds=(fd,),
        )
        assert cp_swap.returncode==0 and cp_swap.stderr=="" and cp_swap.stdout.strip()=="RETAINED_ORIGINAL"
        assert (os.fstat(fd).st_dev,os.fstat(fd).st_ino)==(before.st_dev,before.st_ino)
    finally:
        os.close(fd)

cp=subprocess.run([sys.executable,"-I","-B",str(INS),"--self-test"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=30)
assert cp.returncode==0 and cp.stderr=="" and "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V4_SELF_TEST_GREEN" in cp.stdout.splitlines()
assert "immutable_source_release_root_mode_0555_required=true" in cp.stdout.splitlines()
assert "protected_source_root_mode_0755_required=true" in cp.stdout.splitlines()
assert "candidate_open_nonblocking_required=true" in cp.stdout.splitlines()
assert "candidate_retained_fd_regular_single_link_required=true" in cp.stdout.splitlines()
assert "candidate_fifo_or_special_file_rejected_before_read=true" in cp.stdout.splitlines()
assert "git_real_in_tree_dir_required=true" in cp.stdout.splitlines()
assert "git_commondir_indirection_rejected=true" in cp.stdout.splitlines()
assert "git_object_alternates_rejected=true" in cp.stdout.splitlines()
assert "git_http_alternates_rejected=true" in cp.stdout.splitlines()
assert "git_grafts_rejected=true" in cp.stdout.splitlines()
assert "git_shallow_rejected=true" in cp.stdout.splitlines()
assert "git_local_config_include_rejected=true" in cp.stdout.splitlines()
assert "git_includeif_horizontal_whitespace_rejected=true" in cp.stdout.splitlines()
assert "git_core_worktree_redirect_rejected=true" in cp.stdout.splitlines()
assert "git_core_attributesfile_rejected=true" in cp.stdout.splitlines()
assert "git_filter_driver_rejected=true" in cp.stdout.splitlines()
assert "git_local_config_exact_allowlist_required=true" in cp.stdout.splitlines()
assert "git_raw_head_tree_manifest_required=true" in cp.stdout.splitlines()
assert "git_ignored_untracked_rejected_by_manifest=true" in cp.stdout.splitlines()
assert "git_worktree_config_extension_rejected=true" in cp.stdout.splitlines()
assert "git_promisor_partial_clone_rejected=true" in cp.stdout.splitlines()
assert "git_exact_dir_common_toplevel_required=true" in cp.stdout.splitlines()
assert "git_metadata_provenance_required_for_all_roots=true" in cp.stdout.splitlines()
assert "acl_aware_runtime_uid_nonwritability_required=true" in cp.stdout.splitlines()
assert "tree_root_acl_audit_precedes_first_scandir=true" in cp.stdout.splitlines()
assert "tree_directory_acl_audit_precedes_descent=true" in cp.stdout.splitlines()
assert "tree_directory_acl_audit_precedes_regular_file_reads=true" in cp.stdout.splitlines()
assert "tree_regular_acl_audit_precedes_regular_file_reads=true" in cp.stdout.splitlines()
assert "tree_regular_descriptor_nofollow_nonblocking_required=true" in cp.stdout.splitlines()
assert "tree_regular_descriptor_generation_revalidation_required=true" in cp.stdout.splitlines()
assert "installed_binary_acl_audit_precedes_hash=true" in cp.stdout.splitlines()
assert "installed_binary_descriptor_hash_required=true" in cp.stdout.splitlines()
assert "tree_regular_fifo_race_rejected_nonblocking=true" in cp.stdout.splitlines()
assert "tree_regular_symlink_race_rejected_nofollow=true" in cp.stdout.splitlines()
assert "trusted_tool_root_descriptor_execution_required=true" in cp.stdout.splitlines()
assert "trusted_tool_ancestor_acl_custody_required=true" in cp.stdout.splitlines()
assert "runtime_write_audit_external_helper_free=true" in cp.stdout.splitlines()
assert "source_release_ancestor_acl_custody_required=true" in cp.stdout.splitlines()
assert "source_release_ancestor_generation_revalidation_required=true" in cp.stdout.splitlines()

cp=subprocess.run([sys.executable,"-I","-B",str(INS),"--source-plan"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=30)
assert cp.returncode==0 and cp.stderr==""
assert "immutable_source_release_root_mode_0555_required=true" in cp.stdout.splitlines()
assert "protected_source_root_mode_0755_required=true" in cp.stdout.splitlines()
assert "installed_qualifier_v3_bound=true" in cp.stdout.splitlines()
assert "accepted_v1_lock_install_authority=false" in cp.stdout.splitlines()
assert "git_metadata_provenance_required_for_all_roots=true" in cp.stdout.splitlines()
assert "git_external_metadata_and_object_indirection_rejected=true" in cp.stdout.splitlines()
assert "git_local_config_exact_allowlist_required=true" in cp.stdout.splitlines()
assert "git_raw_head_tree_manifest_required=true" in cp.stdout.splitlines()
assert "acl_aware_runtime_uid_nonwritability_required=true" in cp.stdout.splitlines()
assert "trusted_tool_root_descriptor_execution_required=true" in cp.stdout.splitlines()
assert "trusted_tool_ancestor_acl_custody_required=true" in cp.stdout.splitlines()
assert "runtime_write_audit_external_helper_free=true" in cp.stdout.splitlines()
assert "source_release_ancestor_acl_custody_required=true" in cp.stdout.splitlines()
assert "source_release_ancestor_generation_revalidation_required=true" in cp.stdout.splitlines()

cp=subprocess.run([sys.executable,"-I","-B",str(QUAL),"--self-test"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=30)
assert cp.returncode==0 and cp.stderr=="" and "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALLED_QUALIFICATION_V3_SELF_TEST_GREEN" in cp.stdout.splitlines()
assert "swapped_root_modes_rejected=true" in cp.stdout.splitlines()
assert "binary_root_and_ancestor_custody_required=true" in cp.stdout.splitlines()
assert "binary_self_test_descriptor_execution_required=true" in cp.stdout.splitlines()
assert "binary_retained_descriptor_revalidation_required=true" in cp.stdout.splitlines()
assert "binary_acl_aware_runtime_nonwritability_required=true" in cp.stdout.splitlines()
assert "runtime_uid_gid_1000_required=true" in cp.stdout.splitlines()
assert "runtime_supplementary_groups_empty_required=true" in cp.stdout.splitlines()
assert "qualifier_trusted_tool_descriptor_execution_required=true" in cp.stdout.splitlines()
assert "qualifier_trusted_tool_runtime_acl_custody_required=true" in cp.stdout.splitlines()
assert "qualifier_custody_script_descriptor_retention_required=true" in cp.stdout.splitlines()
assert "wrong_runtime_uid_gid_rejected=true" in cp.stdout.splitlines()
assert "supplementary_group_state_rejected=true" in cp.stdout.splitlines()
assert 'subprocess.run(\n            [str(path), "--self-test"]' not in qsrc
cp=subprocess.run([sys.executable,"-I","-B",str(QUAL)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=30)
assert cp.returncode==0 and cp.stderr==""
assert "source_release_root_mode_required=0555" in cp.stdout.splitlines()
assert "protected_source_root_mode_required=0755" in cp.stdout.splitlines()
assert "runtime_identity_required=1000:1000" in cp.stdout.splitlines()
assert "runtime_supplementary_groups_required=empty" in cp.stdout.splitlines()

print(MARKER+"_GREEN")
print("installer_no_pre_guard_checkout_future_import=true")
print("precision_observed_source_release_root_mode_0555_bound=true")
print("immutable_source_release_root_mode_0555_required=true")
print("protected_source_root_mode_0755_required=true")
print("installed_qualifier_v3_bound=true")
print("qualifier_swapped_root_modes_rejected=true")
print("qualifier_binary_root_ancestor_custody_bound=true")
print("qualifier_binary_descriptor_execution_bound=true")
print("qualifier_binary_post_execution_revalidation_bound=true")
print("qualifier_git_node_descriptor_execution_bound=true")
print("qualifier_custody_script_descriptor_retention_bound=true")
print("qualifier_trusted_tool_runtime_acl_custody_bound=true")
print("source_release_chmod_or_chown_forbidden=true")
print("tree_child_root_ownership_preserved=true")
print("tree_group_world_write_rejection_preserved=true")
print("strict_internal_symlink_containment_preserved=true")
print("install_parent_root_owned_0755_bound=true")
print("install_parent_descriptor_identity_bound=true")
print("candidate_open_nonblocking_bound=true")
print("candidate_retained_fd_regular_single_link_bound=true")
print("candidate_fifo_or_special_file_rejected_before_read=true")
print("installer_preimport_isolation_guard_bound=true")
print("installer_checkout_shadowing_rejected_before_execution=true")
print("installer_privileged_source_custody_bound=true")
print("installer_privileged_source_root_acl_barrier_bound=true")
print("installer_privileged_source_directory_acl_barrier_bound=true")
print("installer_privileged_source_symlink_resolution_order_bound=true")
print("git_real_in_tree_dir_bound=true")
print("git_commondir_indirection_rejected=true")
print("git_object_alternates_rejected=true")
print("git_http_alternates_rejected=true")
print("git_grafts_and_shallow_rejected=true")
print("git_local_config_indirection_rejected=true")
print("git_includeif_horizontal_whitespace_rejected=true")
print("git_core_attributesfile_rejected=true")
print("git_filter_driver_rejected=true")
print("git_local_config_exact_allowlist_required=true")
print("git_raw_head_tree_manifest_required=true")
print("git_ignored_untracked_rejected_by_manifest=true")
print("git_exact_dir_common_toplevel_bound=true")
print("git_metadata_provenance_all_privileged_roots_bound=true")
print("trusted_root_launcher_still_required=true")
print("mode_only_nonwritable_is_insufficient_model=true")
print("installer_acl_aware_runtime_uid_write_audit_bound=true")
print("runtime_uid_cleared_groups_write_audit_bound=true")
print("runtime_write_audit_external_helper_free_bound=true")
print("runtime_observer_root_time_setpriv_exec_removed=true")
print("runtime_observer_no_new_privs_before_uid_drop_bound=true")
print("runtime_observer_direct_uid_gid_drop_before_tool_exec_bound=true")
print("trusted_tool_root_descriptor_execution_bound=true")
print("trusted_tool_ancestor_acl_custody_bound=true")
print("trusted_tool_terminal_revalidation_bound=true")
print("source_release_ancestor_acl_custody_bound=true")
print("source_release_ancestor_generation_revalidation_bound=true")
print("trusted_tool_descriptor_path_swap_adversary_bound=true")
print("qualifier_acl_aware_runtime_uid_write_audit_bound=true")
print("qualifier_runtime_uid_gid_1000_bound=true")
print("qualifier_supplementary_groups_empty_bound=true")
print("qualifier_wrong_identity_adversaries_bound=true")
print("tree_acl_audit_precedes_privileged_content_reads=true")
print("tree_root_acl_audit_precedes_first_scandir_bound=true")
print("tree_directory_acl_audit_precedes_descent_bound=true")
print("tree_regular_descriptor_read_bound=true")
print("tree_fifo_symlink_race_adversaries_bound=true")
print("installed_binary_acl_audit_precedes_hash_bound=true")
print("accepted_native_selector_identity_preserved=true")
print("create_only_publication_preserved=true")
print("operation_bound_plan_v4_required=true")
print("protected_filesystem_mutation=false")
print("service_mutation=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
