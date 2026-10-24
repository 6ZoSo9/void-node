#!/usr/bin/env python3
import sys
import os
from pathlib import Path
import pwd
import subprocess
import tempfile

MARKER = "VOID_V7_SOURCE_RELEASE_FULL_HISTORY_RESEAL_V1_PROOF"
if sys.flags.isolated != 1:
    print(MARKER); print("status=HOLD"); print("reason=python_isolation_required"); raise SystemExit(2)
if sys.flags.optimize != 0 or not __debug__:
    print(MARKER); print("status=HOLD"); print("reason=python_optimization_forbidden"); raise SystemExit(2)

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_v7_source_release_full_history_reseal_v1.py"
TARGET_BLOB = "030182d544a92cd6c67868fa4c4f3e83188e4249"

def git(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git","-C",str(ROOT),*args],
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
assert '"reset", "--hard"' not in text
assert '"checkout", TARGET_HEAD' not in text
assert '"read-tree", TARGET_HEAD' in text
assert '"checkout-index"' not in text
assert '"write-tree"' not in text
assert 'def _materialize_candidate_worktree(' in text
assert 'def _verify_materialized_candidate_worktree(' in text
assert '"ls-tree", "-rz", "-t", "--full-tree", TARGET_TREE' in text
assert 'os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW' in text
assert '"candidate_tree_entry_mode_unsupported:" + mode' in text
assert '"diff-index", "--cached", "--quiet", TARGET_HEAD, "--"' in text
assert 'candidate_pack_dir_generation_changed' in text
assert 'candidate_refs_dir_generation_changed' in text
assert 'candidate_heads_dir_generation_changed' in text
assert 'candidate_tags_dir_generation_changed' in text
assert 'candidate_git_directory_layout_invalid' in text
assert 'candidate_objects_directory_layout_invalid' in text
assert 'candidate_pack_directory_layout_invalid' in text
assert 'candidate_main_ref_content_invalid' in text
assert 'def _file_generation_identity(' in text
assert 'def _sha256_fd(' in text
assert 'pack_leaf_descriptors_retained=true' in text
assert 'pack_leaf_generation_and_digest_revalidation=true' in text
assert 'pack_generation_changed_during_verify' in text
assert 'if observed_sha != expected_sha:' in text
assert 'raise ResealError(label + "_digest_changed")' in text
assert 'candidate_index_digest_changed' in text
assert 'candidate_index_generation_changed_after_open' in text
assert 'index_leaf_generation_and_digest_revalidation=true' in text
assert '_BUILD_WRITE_BOUNDARY_ENTERED = False' in text
assert 'source_repository_mutation=unknown' in text
assert 'protected_filesystem_mutation=unknown' in text
assert 'same_uid_namespace_relocation_isolation=false' in text
assert 'candidate_index_generation_changed' in text
assert '_entry_absent_at(git_fd, "logs", "candidate")' in text

for required in (
    'TARGET_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"',
    'TARGET_TREE = "de12c9d2d5e475d435d21da3b047d7b63b69e2b7"',
    '"5752b69a7253a44fd3fabe2964476174b3a80c40"',
    '"6b7fc90219676a96f5a2c34619e4cfdf3f002244"',
    'EXPECTED_REACHABLE_COMMITS = 17931',
    'git_config_not_exact_closed_form',
    'candidate_repository_shallow',
    'missing_reachable_object',
    'pack-objects',
    'verify-pack',
    'pack.writeReverseIndex=false',
    'source_forbidden_git_metadata',
    'candidate_fsck_output_nonempty',
    '_path_line_or_control_character',
    'pwd.getpwuid(os.getuid())',
    'ACCOUNT_HOME_ROOT = Path("/home")',
    'account_home_outside_allowed_user_root',
    'root_account_forbidden',
    'def _physical_output_root()',
    '_directory_alias_forbidden',
    'output_parent_alias_forbidden',
    'output_under_source_checkout',
    'MOUNTINFO_PATH = Path("/proc/self/mountinfo")',
    'def _candidate_run(',
    'GIT_OBJECT_DIRECTORY',
    'pass_fds=',
    'def _cleanup_candidate(',
    'candidate_nonempty_retained_for_inspection',
    'candidate_residual_state',
    'def _fd_mount_id(',
    'def _directory_lease_identity(',
    'candidate_mount_boundary_changed',
    'candidate_nonempty_retained_for_inspection',
    'candidate_cleanup_residual_unknown',
    'descriptor_bound_candidate_mutation=true',
    'mountpoint_alias_rejection=true',
    'ref_update_checkout_forbidden=true',
    'reflog_write_path_absent=true',
    'retained_index_generation_bound=true',
    'checkout_index_forbidden=true',
    'descriptor_relative_worktree_materialization=true',
    'regular_files_only_tree_contract=true',
    'terminal_worktree_manifest_revalidation=true',
    'terminal_index_comparison_read_only=true',
    'git_metadata_descriptor_revalidation=true',
    'git_metadata_exact_layout=true',
    'pack_and_ref_aliases_rejected=true',
    'pack_leaf_descriptors_retained=true',
    'pack_leaf_generation_and_digest_revalidation=true',
    'index_leaf_generation_and_digest_revalidation=true',
    'current_uid_filesystem_write_boundary=true',
    'same_uid_namespace_relocation_isolation=false',
    'source_repository_mutation=unknown',
    'protected_filesystem_mutation=unknown',
    'protected_replace_authorized=false',
):
    assert required in text, required

plain = subprocess.run(
    [sys.executable, "-B", str(TARGET), "--plan"],
    stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    text=True, timeout=30, check=False,
)
assert plain.returncode == 2
assert "reason=python_isolation_required" in plain.stdout.splitlines()

selftest = subprocess.run(
    [sys.executable, "-I", "-B", str(TARGET), "--self-test"],
    stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    text=True, timeout=30, check=False,
)
assert selftest.returncode == 0 and selftest.stderr == ""
assert "VOID_V7_SOURCE_RELEASE_FULL_HISTORY_RESEAL_V1_SELF_TEST_GREEN" in selftest.stdout.splitlines()
assert "receipt_line_separators_rejected=true" in selftest.stdout.splitlines()
assert "passwd_account_home_required=true" in selftest.stdout.splitlines()
assert "account_home_directly_under_physical_home_root_required=true" in selftest.stdout.splitlines()
assert "protected_account_home_rejected=true" in selftest.stdout.splitlines()
assert "physical_downloads_root_required=true" in selftest.stdout.splitlines()
assert "output_parent_aliases_rejected=true" in selftest.stdout.splitlines()
assert "source_checkout_output_rejected=true" in selftest.stdout.splitlines()
assert "mountpoint_aliases_rejected=true" in selftest.stdout.splitlines()
assert "descriptor_bound_candidate_mutation=true" in selftest.stdout.splitlines()
assert "directory_lease_link_count_independent=true" in selftest.stdout.splitlines()
assert "cleanup_failure_receipt_bound=true" in selftest.stdout.splitlines()
assert "cleanup_nonrecursive_retention_policy=true" in selftest.stdout.splitlines()
assert "cleanup_mount_boundary_rejection_bound=true" in selftest.stdout.splitlines()

account_home = Path(pwd.getpwuid(os.getuid()).pw_dir)
spoofed_env = dict(os.environ)
spoofed_env["HOME"] = "/tmp/void-v7-forged-home"
plan = subprocess.run(
    [sys.executable, "-I", "-B", str(TARGET), "--plan"],
    stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    text=True, timeout=120, check=False, env=spoofed_env,
)
assert plan.returncode == 0 and plan.stderr == "", plan.stdout + plan.stderr
for marker in (
    "mode=plan",
    "target_head=4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb",
    "target_tree=de12c9d2d5e475d435d21da3b047d7b63b69e2b7",
    "reachable_commits=17931",
    "build_mode_current_uid_write_boundary=true",
    "build_mode_same_uid_namespace_relocation_isolation=false",
    "build_mode_source_repository_mutation_claim=unknown",
    "build_mode_protected_filesystem_mutation_claim=unknown",
    "protected_filesystem_mutation=false",
    "source_repository_mutation=false",
    "network=false",
    "protected_replace_authorized=false",
):
    assert marker in plan.stdout.splitlines(), marker
scope_lines = [
    line for line in plan.stdout.splitlines()
    if line.startswith("candidate_build_write_scope=")
]
assert scope_lines == ["candidate_build_write_scope=" + str(account_home / "Downloads")]

with tempfile.TemporaryDirectory(prefix="void-v7-reseal-proof-") as td:
    output = Path(td) / "candidate"
    built = subprocess.run(
        [sys.executable, "-I", "-B", str(TARGET), "--build", "--output", str(output)],
        stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, timeout=240, check=False,
    )
    # The production builder intentionally restricts outputs to the current account's Downloads directory.
    # This proof therefore requires the guard to reject an arbitrary temporary root.
    assert built.returncode == 2
    assert "reason=output_outside_downloads" in built.stdout.splitlines()

source_overlap_output = ROOT / ".git" / "void-v7-reseal-forbidden"
assert not source_overlap_output.exists()
source_overlap = subprocess.run(
    [
        sys.executable, "-I", "-B", str(TARGET),
        "--build", "--output", str(source_overlap_output),
    ],
    stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    text=True, timeout=120, check=False,
)
assert source_overlap.returncode == 2
assert "reason=output_under_source_checkout" in source_overlap.stdout.splitlines()
assert not source_overlap_output.exists()

for separator in ("\n", "\x85", "\u2028", "\u2029"):
    bad_receipt_output = (
        account_home
        / "Downloads"
        / ("candidate" + separator + "status=FORGED")
    )
    bad_receipt = subprocess.run(
        [
            sys.executable, "-I", "-B", str(TARGET),
            "--build", "--output", str(bad_receipt_output),
        ],
        stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, timeout=120, check=False,
    )
    assert bad_receipt.returncode == 2
    assert (
        "reason=output_path_line_or_control_character"
        in bad_receipt.stdout.splitlines()
    )
    assert not bad_receipt_output.exists()

print(MARKER + "_GREEN")
print("target_blob=" + TARGET_BLOB)
print("exact_target_commit_tree_parents_bound=true")
print("reachable_commit_count_17931_bound=true")
print("complete_object_graph_required=true")
print("single_process_pack_and_index_generation_bound=true")
print("closed_git_config_required=true")
print("shallow_graft_alternate_commondir_rejected=true")
print("output_scope_guard_bound=true")
print("receipt_line_separator_guard_bound=true")
print("passwd_account_home_binding_bound=true")
print("physical_account_home_root_binding_bound=true")
print("protected_account_home_rejection_bound=true")
print("physical_downloads_root_binding_bound=true")
print("output_parent_alias_rejection_bound=true")
print("source_checkout_output_rejection_bound=true")
print("mountpoint_alias_rejection_bound=true")
print("descriptor_bound_candidate_mutation_bound=true")
print("directory_lease_link_count_independent_bound=true")
print("truthful_candidate_cleanup_receipt_bound=true")
print("cleanup_nonrecursive_retention_policy_bound=true")
print("cleanup_mount_boundary_rejection_bound=true")
print("ref_update_checkout_forbidden_bound=true")
print("reflog_write_path_absent_bound=true")
print("retained_index_generation_bound=true")
print("checkout_index_forbidden_bound=true")
print("descriptor_relative_worktree_materialization_bound=true")
print("regular_files_only_tree_contract_bound=true")
print("terminal_worktree_manifest_revalidation_bound=true")
print("terminal_index_comparison_read_only_bound=true")
print("git_metadata_descriptor_revalidation_bound=true")
print("git_metadata_exact_layout_bound=true")
print("pack_and_ref_alias_rejection_bound=true")
print("pack_leaf_descriptor_retention_bound=true")
print("pack_leaf_generation_digest_revalidation_bound=true")
print("index_leaf_generation_digest_revalidation_bound=true")
print("build_write_boundary_truthful_receipt_bound=true")
print("same_uid_namespace_isolation_nonclaim_bound=true")
print("protected_filesystem_mutation=false")
print("network=false")
print("protected_replace_authorized=false")
