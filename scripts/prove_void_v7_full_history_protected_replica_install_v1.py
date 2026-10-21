#!/usr/bin/env python3
import sys
from pathlib import Path
import subprocess

MARKER = "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_INSTALL_V1_PROOF"
if sys.flags.isolated != 1 or sys.flags.optimize != 0 or not __debug__:
    print(MARKER)
    print("status=HOLD")
    print("reason=python_isolated_unoptimized_mode_required")
    raise SystemExit(2)

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_v7_full_history_protected_replica_install_v1.py"
TARGET_BLOB = "158df3f1d0fc0040bb10d2cb63df12ea788a1748"

def git(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=30,
        check=False,
    )
    if cp.returncode != 0 or cp.stderr:
        raise RuntimeError("git_failed:" + (args[0] if args else "unknown"))
    return cp.stdout.strip()

assert git("hash-object", str(TARGET)) == TARGET_BLOB

raw = TARGET.read_bytes()
compile(raw, str(TARGET), "exec", dont_inherit=True, optimize=0)
text = raw.decode("utf-8")
assert 'def _stream_regular_hashes_stable(' in text
assert 'byte_read_limit_too_large' in text
assert 'b"blob " + str(opened.st_size).encode("ascii") + b"\\0"' in text
assert '_stream_regular_hashes_stable(\n        git_dir / "index"' in text
assert '_stream_regular_hashes_stable(\n        git_dir / "objects" / "pack" / pack_name' in text
assert '_stream_regular_hashes_stable(\n                child, "worktree_file", git_blob=True' in text
assert '_stream_regular_hashes_stable(\n                    child, "tree_file", git_blob=False' in text
assert '_read_regular_stable(child, "worktree_file")' not in text
assert '_read_regular_stable(child, "tree_file")' not in text


for required in (
    'BASE_HEAD = "e99772502c80fefafef3b6a836a408b66ddded76"',
    'BUILDER_BLOB = "030182d544a92cd6c67868fa4c4f3e83188e4249"',
    'V4_BLOB = "94112afa2f805e0a6ce881a490c1c64e31e0413e"',
    'ATOMIC_BLOB = "3fe1158a0fdf19fa4307c2a8122314b75ee36345"',
    'SOURCE_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"',
    'SOURCE_TREE = "de12c9d2d5e475d435d21da3b047d7b63b69e2b7"',
    '"5752b69a7253a44fd3fabe2964476174b3a80c40"',
    '"6b7fc90219676a96f5a2c34619e4cfdf3f002244"',
    'REACHABLE_COMMITS = 17931',
    'MAX_COPY_DEPTH = 128',
    'def _copy_candidate_tree_iterative(',
    'copy_node_limit',
    'copy_depth_limit',
    'candidate_copy_incremental_enumeration_required=true',
    'candidate_copy_iterative_depth_bound_required=true',
    'candidate_copy_operation_bound_node_budget_required=true',
    'candidate_copy_operation_bound_byte_budget_required=true',
    'candidate_copy_exact_planned_counts_required=true',
    'large_file_authentication_streamed=true',
    'byte_returning_reads_tiny_metadata_only=true',
    'def _planned_candidate_copy_limits(',
    'CANDIDATE = pathlib.Path("/home/zoso/Downloads/void-v7-full-history-candidate-6011fc")',
    'LIVE_RELEASE = pathlib.Path("/opt/void-node-live/releases/" + SOURCE_HEAD)',
    'TARGET_NAME = "void-v7-source-release-full-history-v1"',
    'STAGE_NAME = ".void-v7-source-release-full-history-v1.stage-v1"',
    'CONFIRM_TOKEN = "INSTALL_VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_V1_CREATE_ONLY"',
    'RENAME_NOREPLACE = 1',
    'def _verify_full_history_root(',
    'def _verify_live_shallow_release()',
    'def _copy_candidate_to_stage(',
    'def _rename_noreplace(',
    'def _reconcile_publication_receipt()',
    'def _require_privileged_source_custody()',
    'def _runtime_uid_child_call(',
    'def _collect_plan_for_apply(',
    'def _verify_stage_for_apply(',
    'root_required_for_runtime_uid_child',
    'PR_SET_NO_NEW_PRIVS = 38',
    'PR_CAP_AMBIENT = 47',
    'PR_CAP_AMBIENT_CLEAR_ALL = 4',
    'LINUX_CAPABILITY_VERSION_3 = 0x20080522',
    'SYS_CAPSET_X86_64 = 126',
    'def _clear_runtime_child_capabilities(',
    'def _drop_runtime_child_privileges()',
    'def _proc_self_status_security_fields()',
    'prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)',
    'runtime_uid_child_capability_clear_required=true',
    'runtime_uid_child_capability_status_zero_required=true',
    'os.getresuid() != (RUNTIME_UID, RUNTIME_UID, RUNTIME_UID)',
    'os.getresgid() != (RUNTIME_GID, RUNTIME_GID, RUNTIME_GID)',
    'runtime_uid_child_identity_drop_incomplete',
    'runtime_uid_child_no_new_privs_required=true',
    'apply_root_dynamic_git_exec=false',
    'termination_signal_reconciliation_required=true',
    'install_parent_publication_lease_required=true',
    'signal.SIGTERM',
    'signal.SIGHUP',
    'signal.SIGQUIT',
    'install_parent_descriptor_identity_mismatch',
    'install_parent_descriptor_generation_changed',
    'git_regular_leaf_metadata_invalid:',
    '"diff-index", "--cached", "--quiet", SOURCE_HEAD, "--"',
    'git_index_head_equality_required=true',
    'git_metadata_leaves_nonexecutable_required=true',
    'def _prepare_private_stage_for_runtime_verification()',
    'def _seal_verified_stage_for_publication()',
    'def _verify_private_stage_for_apply(',
    'private_stage_content_digest_mismatch',
    'private_stage_git_verified_digest_mismatch',
    'private_stage_git_verification_before_world_readable=true',
    'private_stage_named_runtime_uid_acl_required=true',
    'private_stage_acl_group_object_zero_required=true',
    'private_stage_acl_xattr_roundtrip_required=true',
    'candidate_utf8_path_components_required=true',
    'candidate_receipt_safe_path_components_required=true',
    'candidate_printable_path_components_required=true',
    'terminal_reason_line_sanitization_required=true',
    'terminal_reason_printable_sanitization_required=true',
    'def _receipt_safe_text(',
    'out.append(ch if ch.isprintable() else "_")',
    'if not all(ch.isprintable() for ch in name)',
    'copy_entry_name_control_forbidden',
    'print("reason=" + _receipt_safe_text(str(exc)))',
    'opened_generation_copy_budget_required=true',
    'write_boundary_precedes_first_stage_mutation=true',
    'runtime_uid_private_stage_writable',
    'runtime_uid_private_stage_not_readable',
    'POSIX_ACL_ACCESS_XATTR = "system.posix_acl_access"',
    'ACL_GROUP_OBJ = 0x04',
    'def _runtime_uid_read_acl_blob(',
    'def _set_runtime_uid_read_acl_fd(',
    'def _remove_runtime_uid_read_acl_fd(',
    'copy_entry_name_not_utf8',
    'stage_prepare_private_file_mode_invalid:',
    'stage_seal_verification_file_mode_invalid:',
    'private_stage_before_content_authentication=true',
    'os.setgid(RUNTIME_GID)',
    'os.setuid(RUNTIME_UID)',
    'def _copy_regular_at(',
    'os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW',
    'copy_candidate_root_rebound',
    'install_parent_stage_link_count_transition_invalid',
    'full_root_reachable_commit_count_mismatch',
    'full_root_missing_object',
    'full_root_fsck_output_nonempty',
    'live_release_parent_object_unexpectedly_present',
    'stage_content_digest_mismatch',
    'plan_binding_changed_before_publication',
    'final_protected_replica_not_green',
    'live_release_mutation=false',
    'trusted_root_launcher_required=true',
):
    assert required in text, required

# Privileged source apply must not become a supported mutable-checkout pattern.
assert 'root_required_for_privileged_apply' in text
assert 'privileged_source_ancestor_custody_invalid:' in text
assert 'privileged_source_ancestor_generation_changed:' in text
assert 'privileged_source_ancestor_generation_changed_terminal:' in text
assert 'privileged_source_owner_invalid:' in text
assert 'privileged_source_writable:' in text
apply_start = text.index("def apply(")
apply_end = text.index("def _termination_signal_handler(")
apply_text = text[apply_start:apply_end]
assert "_git_run(" not in apply_text
assert "git_text(" not in apply_text
assert "git_bytes(" not in apply_text
assert "_verify_full_history_root(" not in apply_text

copy_start = text.index("def _copy_candidate_to_stage(")
copy_end = text.index("def _rename_noreplace(", copy_start)
copy_text = text[copy_start:copy_end]
assert copy_text.index("_WRITE_BOUNDARY_ENTERED = True") < copy_text.index(
    "os.mkdir(STAGE_NAME"
)
assert copy_text.index("_prepare_private_stage_for_runtime_verification()") < copy_text.index(
    "_verify_private_stage_for_apply("
)
assert copy_text.index("_verify_private_stage_for_apply(") < copy_text.index(
    "_seal_verified_stage_for_publication()"
)
assert "_copy_candidate_tree_iterative(" in copy_text
assert "_planned_candidate_copy_limits(" in copy_text
assert "node_limit=planned_nodes" in copy_text
assert "total_limit=planned_regular_file_bytes" in copy_text
assert 'raise InstallError("copy_planned_node_count_mismatch")' in copy_text
assert 'raise InstallError("copy_planned_regular_file_bytes_mismatch")' in copy_text
assert copy_text.index("_planned_candidate_copy_limits(") < copy_text.index(
    "_WRITE_BOUNDARY_ENTERED = True"
)
assert "def recurse(" not in copy_text
assert "sorted(os.listdir" not in copy_text
assert "total += st.st_size" not in copy_text
assert "copy_entry_name_not_utf8" in text

walker_start = text.index("def _copy_candidate_tree_iterative(")
walker_end = text.index("def _copy_candidate_to_stage(", walker_start)
walker_text = text[walker_start:walker_end]
assert "os.scandir(src_root_fd)" in walker_text
assert "entry = next(iterator)" in walker_text
assert walker_text.index("nodes += 1") < walker_text.index("name = entry.name")
assert "if nodes > node_limit:" in walker_text
assert "if child_depth > depth_limit:" in walker_text
assert "_require_utf8_copy_component(name)" in walker_text
assert "sorted(os.listdir" not in walker_text
assert "def recurse(" not in walker_text
assert "_copy_candidate_tree_iterative(" not in walker_text[walker_text.index("while stack:"):]

limits_start = text.index("def _planned_candidate_copy_limits(")
limits_end = text.index("def _copy_candidate_to_stage(", limits_start)
limits_text = text[limits_start:limits_end]
assert "type(nodes) is not int" in limits_text
assert "nodes < 0 or nodes > MAX_NODES" in limits_text
assert "type(regular_file_bytes) is not int" in limits_text
assert "regular_file_bytes < 0" in limits_text
assert "regular_file_bytes > MAX_TOTAL_BYTES" in limits_text
assert "return nodes, regular_file_bytes" in limits_text
assert "os.fchown(fd, 0, RUNTIME_GID)" not in text
assert "stage_prepare_named_runtime_uid_acl" not in text
assert "private_stage_named_runtime_uid_acl_required=true" in text
assert "private_stage_acl_group_object_zero_required=true" in text
assert "candidate_utf8_path_components_required=true" in text

copy_regular_start = text.index("def _copy_regular_at(")
copy_regular_end = text.index(
    "def _prepare_private_stage_for_runtime_verification()", copy_regular_start
)
copy_regular_text = text[copy_regular_start:copy_regular_end]
assert "remaining_budget: int" in copy_regular_text
assert "before.st_size > remaining_budget" in copy_regular_text
assert "_metadata_identity(before) != expected_source" in copy_regular_text
assert "_metadata_identity(opened) != expected_source" in copy_regular_text
assert "return opened.st_size" in copy_regular_text

drop_start = text.index("def _drop_runtime_child_privileges()")
drop_end = text.index("def _runtime_uid_child_call(", drop_start)
drop_text = text[drop_start:drop_end]
assert drop_text.index(
    "prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)"
) < drop_text.index("os.setgroups([])")
assert drop_text.index("os.setgroups([])") < drop_text.index(
    "os.setgid(RUNTIME_GID)"
) < drop_text.index("os.setuid(RUNTIME_UID)")
assert drop_text.index("os.setuid(RUNTIME_UID)") < drop_text.index(
    "_clear_runtime_child_capabilities(libc, prctl)"
)
assert "os.getresuid() != (RUNTIME_UID, RUNTIME_UID, RUNTIME_UID)" in drop_text
assert "os.getresgid() != (RUNTIME_GID, RUNTIME_GID, RUNTIME_GID)" in drop_text

cap_start = text.index("def _clear_runtime_child_capabilities(")
cap_end = text.index("def _drop_runtime_child_privileges()", cap_start)
cap_text = text[cap_start:cap_end]
assert "PR_CAP_AMBIENT_CLEAR_ALL" in cap_text
assert "SYS_CAPSET_X86_64" in cap_text
assert 'for key in ("CapInh", "CapPrm", "CapEff", "CapAmb")' in cap_text
assert 'runtime_uid_child_capability_not_zero:' in cap_text
assert 'runtime_uid_child_no_new_privs_status_invalid' in cap_text

runtime_child_start = text.index("def _runtime_uid_child_call(")
runtime_child_end = text.index("def _collect_plan_for_apply(", runtime_child_start)
runtime_child_text = text[runtime_child_start:runtime_child_end]
assert 'operation == "verify_stage_private"' in runtime_child_text
assert runtime_child_text.index("_drop_runtime_child_privileges()") < runtime_child_text.index(
    'if operation == "collect_plan":'
)
assert "_verify_full_history_root(" in runtime_child_text
assert "STAGE, 0, 0, 0o750" in runtime_child_text
assert "runtime_uid_private_stage_writable" in runtime_child_text
assert "runtime_uid_private_stage_not_readable" in runtime_child_text
assert "STAGE, 0, RUNTIME_GID, 0o550" not in runtime_child_text

# No live-root replacement primitive is allowed in this create-only lane.
assert "RENAME_EXCHANGE" not in text
assert 'os.unlink(LIVE_RELEASE' not in text
assert 'shutil.rmtree(LIVE_RELEASE' not in text
assert 'os.rename(LIVE_RELEASE' not in text
assert "UnicodeError," in text
assert 'copy_entry_name_not_utf8' in text
assert 'copy_entry_name_control_forbidden' in text
assert 'def _receipt_safe_text(' in text
assert 'out.append(ch if ch.isprintable() else "_")' in text
assert 'if not all(ch.isprintable() for ch in name)' in text
assert 'print("reason=" + _receipt_safe_text(str(exc)))' in text
assert 'os.setxattr(acl_fd, POSIX_ACL_ACCESS_XATTR, acl_blob)' in text
assert 'os.getxattr(acl_fd, POSIX_ACL_ACCESS_XATTR)' in text
assert 'runtime_uid_acl_mode_projection_invalid' in text

plain = subprocess.run(
    [sys.executable, "-B", str(TARGET), "--source-plan"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=30,
    check=False,
)
assert plain.returncode == 2
assert "reason=python_isolated_unoptimized_mode_required" in plain.stdout.splitlines()

selftest = subprocess.run(
    [sys.executable, "-I", "-B", str(TARGET), "--self-test"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=30,
    check=False,
)
assert selftest.returncode == 0, selftest.stdout + selftest.stderr
assert selftest.stderr == ""
for marker in (
    "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_INSTALL_V1_SELF_TEST_GREEN",
    "create_only_target=true",
    "live_release_mutation=false",
    "full_history_candidate_reauthentication_required=true",
    "live_shallow_runtime_cross_binding_required=true",
    "root_owned_immutable_stage_required=true",
    "private_stage_named_runtime_uid_acl_required=true",
    "private_stage_acl_group_object_zero_required=true",
    "private_stage_acl_xattr_roundtrip_required=true",
    "runtime_uid_child_capability_clear_required=true",
    "runtime_uid_child_capability_status_zero_required=true",
    "candidate_copy_incremental_enumeration_required=true",
    "candidate_copy_iterative_depth_bound_required=true",
    "large_file_authentication_streamed=true",
    "byte_returning_reads_tiny_metadata_only=true",
    "candidate_utf8_path_components_required=true",
    "candidate_receipt_safe_path_components_required=true",
    "candidate_printable_path_components_required=true",
    "terminal_reason_line_sanitization_required=true",
    "terminal_reason_printable_sanitization_required=true",
    "rename_noreplace_publication_required=true",
    "trusted_root_launcher_required=true",
    "service_mutation=false",
    "credential_access=false",
    "transaction=false",
    "funds_movement=false",
):
    assert marker in selftest.stdout.splitlines(), marker

source_plan = subprocess.run(
    [sys.executable, "-I", "-B", str(TARGET), "--source-plan"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=30,
    check=False,
)
assert source_plan.returncode == 0, source_plan.stdout + source_plan.stderr
assert source_plan.stderr == ""
for marker in (
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "candidate_path=/home/zoso/Downloads/void-v7-full-history-candidate-6011fc",
    "live_release_path=/opt/void-node-live/releases/4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb",
    "protected_replica_target=/opt/void-v7-source-release-full-history-v1",
    "create_only=true",
    "live_release_mutation=false",
    "trusted_root_launcher_required=true",
    "apply_plan_runtime_uid_drop_required=true",
    "runtime_uid_child_no_new_privs_required=true",
    "runtime_uid_child_capability_clear_required=true",
    "runtime_uid_child_capability_status_zero_required=true",
    "candidate_copy_descriptor_relative=true",
    "candidate_copy_incremental_enumeration_required=true",
    "candidate_copy_iterative_depth_bound_required=true",
    "candidate_copy_operation_bound_node_budget_required=true",
    "candidate_copy_operation_bound_byte_budget_required=true",
    "candidate_copy_exact_planned_counts_required=true",
    "large_file_authentication_streamed=true",
    "byte_returning_reads_tiny_metadata_only=true",
    "apply_root_dynamic_git_exec=false",
    "termination_signal_reconciliation_required=true",
    "install_parent_publication_lease_required=true",
    "git_index_head_equality_required=true",
    "git_metadata_leaves_nonexecutable_required=true",
    "private_stage_before_content_authentication=true",
    "private_stage_git_verification_before_world_readable=true",
    "private_stage_named_runtime_uid_acl_required=true",
    "private_stage_acl_group_object_zero_required=true",
    "candidate_utf8_path_components_required=true",
    "candidate_receipt_safe_path_components_required=true",
    "candidate_printable_path_components_required=true",
    "terminal_reason_line_sanitization_required=true",
    "terminal_reason_printable_sanitization_required=true",
    "opened_generation_copy_budget_required=true",
    "write_boundary_precedes_first_stage_mutation=true",
    "service_mutation=false",
    "credential_access=false",
    "transaction=false",
    "funds_movement=false",
):
    assert marker in source_plan.stdout.splitlines(), marker

print(MARKER + "_GREEN")
print("target_blob=" + TARGET_BLOB)
print("exact_reseal_dependency_bound=true")
print("full_history_candidate_contract_bound=true")
print("live_shallow_runtime_cross_binding_bound=true")
print("create_only_rename_noreplace_bound=true")
print("publication_reconciliation_bound=true")
print("direct_mutable_checkout_privileged_apply_forbidden=true")
print("apply_plan_runtime_uid_drop_bound=true")
print("runtime_uid_child_no_new_privs_bound=true")
print("runtime_uid_child_capability_clear_bound=true")
print("runtime_uid_child_capability_status_zero_bound=true")
print("candidate_copy_descriptor_relative_bound=true")
print("candidate_copy_incremental_enumeration_bound=true")
print("candidate_copy_iterative_depth_bound=true")
print("candidate_copy_operation_bound_node_budget_bound=true")
print("candidate_copy_operation_bound_byte_budget_bound=true")
print("candidate_copy_exact_planned_counts_bound=true")
print("large_file_authentication_streamed_bound=true")
print("byte_returning_reads_tiny_metadata_only_bound=true")
print("install_parent_stage_transition_bound=true")
print("root_dynamic_git_exec_forbidden_bound=true")
print("termination_signal_reconciliation_bound=true")
print("install_parent_publication_lease_bound=true")
print("git_index_head_equality_bound=true")
print("git_metadata_leaves_nonexecutable_bound=true")
print("private_stage_content_authentication_bound=true")
print("private_stage_git_verification_before_world_readable_bound=true")
print("private_stage_named_runtime_uid_acl_bound=true")
print("private_stage_acl_group_object_zero_bound=true")
print("private_stage_acl_xattr_roundtrip_bound=true")
print("candidate_utf8_path_components_bound=true")
print("candidate_receipt_safe_path_components_bound=true")
print("candidate_printable_path_components_bound=true")
print("terminal_reason_line_sanitization_bound=true")
print("terminal_reason_printable_sanitization_bound=true")
print("opened_generation_copy_budget_bound=true")
print("write_boundary_precedes_first_stage_mutation_bound=true")
print("live_release_replacement_forbidden=true")
print("source_plan_inert=true")
print("service_mutation=false")
print("credential_access=false")
print("transaction=false")
print("funds_movement=false")
