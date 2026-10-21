#!/usr/bin/env python3
import sys

_EARLY_MARKER = "VOID_BUY_VOID_V7_POSTMERGE_SOURCE_RUNTIME_COMPAT_V1_PROOF"
if sys.flags.isolated != 1:
    print(_EARLY_MARKER)
    print("status=HOLD")
    print("reason=python_isolation_required")
    raise SystemExit(2)
if sys.flags.optimize != 0 or not __debug__:
    print(_EARLY_MARKER)
    print("status=HOLD")
    print("reason=python_optimization_forbidden")
    raise SystemExit(2)

import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_buy_void_v7_postmerge_source_runtime_compat_v1.py"
TARGET_BLOB = "231c5b37a79226f76f4a338cb3343dc04a79d24b"
MARKER = _EARLY_MARKER


def git_text(*args: str) -> str:
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


assert git_text("hash-object", str(TARGET)) == TARGET_BLOB
raw = TARGET.read_bytes()
compile(raw, str(TARGET), "exec", dont_inherit=True, optimize=0)
text = raw.decode("utf-8")

for required in (
    '_EARLY_MARKER = "VOID_BUY_VOID_V7_POSTMERGE_SOURCE_RUNTIME_COMPAT_V1"',
    'sys.flags.isolated != 1',
    'sys.flags.optimize != 0 or not __debug__',
    'reason=python_isolation_required',
    'reason=python_optimization_forbidden',
    'RUNTIME_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"',
    'SOURCE_BASE_HEAD = "4fd0351b5cff19a4e851ace4f91b249617033cbc"',
    'SOURCE_BASE_TREE = "3b8b91ee0af25039fd785d6aea725083849bc714"',
    'len(BASE_ADDITIONS) == 21',
    'len(BASE_MODIFICATIONS) == 16',
    'len(SELF_ADDITIONS) == 4',
    'len(RUNTIME_SENSITIVE_EQUAL) == 5',
    'runtime_source_exact_reviewed_delta',
    'tracked_source_checkout_exact',
    'terminal_index_generation_revalidation_required=true',
    'terminal_worktree_generation_revalidation_required=true',
    'retained_directory_fd_traversal_required=true',
    'terminal_ancestor_directory_generation_revalidation_required=true',
    'exact_git_toplevel_binding_required=true',
    'terminal_required_branch_revalidation_required=true',
    'terminal_exact_head_revalidation_required=true',
    'post_git_retained_root_worktree_revalidation_required=true',
    'post_final_git_raw_index_revalidation_required=true',
    '_require_index_unchanged(raw_index, _run_git(root, *index_query))',
    'def _require_expected_head(root: Path, expected_head: str, *, terminal: bool) -> None:',
    '_require_expected_head(root, expected_head, terminal=True)',
    'def _require_git_toplevel_exact(root: Path) -> None:',
    '"rev-parse", "--show-toplevel"',
    'def _require_branch(root: Path, require_main: bool, *, terminal: bool) -> None:',
    '_require_branch(root, require_main, terminal=True)',
    'def _open_directory_leases(root: Path) -> DirectoryLeases:',
    'def _leased_parent(',
    'os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW',
    'dir_fd=parent_fd',
    'worktree_filesystem_errors_normalized_to_hold=true',
    'git_timeout_normalized_to_hold=true',
    'git_exec_errors_normalized_to_hold=true',
    'git_ancestor_timeout_normalized_to_hold=true',
    'git_ancestor_exec_errors_normalized_to_hold=true',
    'except subprocess.TimeoutExpired as exc:',
    'except OSError as exc:',
    '_require_index_unchanged(raw_index, _run_git(root, *index_query))',
    '_terminal_revalidate_worktree(root, fingerprints, directory_leases)',
    'canonical_checkout_mutation_performed',
    'filesystem_write_performed',
    'public_presale_activation',
    'funds_movement',
):
    assert required in text, required

plain_plan = subprocess.run(
    [sys.executable, "-B", str(TARGET), "--plan"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=30,
    check=False,
)
assert plain_plan.returncode == 2 and plain_plan.stderr == ""
assert "status=HOLD" in plain_plan.stdout.splitlines()
assert "reason=python_isolation_required" in plain_plan.stdout.splitlines()

optimized_plan = subprocess.run(
    [sys.executable, "-I", "-B", "-O", str(TARGET), "--plan"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=30,
    check=False,
)
assert optimized_plan.returncode == 2 and optimized_plan.stderr == ""
assert "status=HOLD" in optimized_plan.stdout.splitlines()
assert "reason=python_optimization_forbidden" in optimized_plan.stdout.splitlines()

self_test = subprocess.run(
    [sys.executable, "-I", "-B", str(TARGET), "--self-test"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=30,
    check=False,
)
assert self_test.returncode == 0 and self_test.stderr == ""
self_lines = self_test.stdout.splitlines()
for line in (
    "VOID_BUY_VOID_V7_POSTMERGE_SOURCE_RUNTIME_COMPAT_V1_SELF_TEST_GREEN",
    "python_isolated_execution_required=true",
    "python_unoptimized_execution_required=true",
    "runtime_to_source_base_exact_21_add_16_modify_required=true",
    "compatibility_self_scope_exact_four_additions_required=true",
    "runtime_sensitive_five_path_identity_equality_required=true",
    "tracked_source_checkout_exact_required=true",
    "terminal_index_generation_revalidation_required=true",
    "terminal_worktree_generation_revalidation_required=true",
    "retained_directory_fd_traversal_required=true",
    "terminal_ancestor_directory_generation_revalidation_required=true",
    "exact_git_toplevel_binding_required=true",
    "terminal_required_branch_revalidation_required=true",
    "terminal_exact_head_revalidation_required=true",
    "post_git_retained_root_worktree_revalidation_required=true",
    "post_final_git_raw_index_revalidation_required=true",
    "worktree_filesystem_errors_normalized_to_hold=true",
    "git_timeout_normalized_to_hold=true",
    "git_exec_errors_normalized_to_hold=true",
    "git_ancestor_timeout_normalized_to_hold=true",
    "git_ancestor_exec_errors_normalized_to_hold=true",
    "canonical_checkout_mutation_authorized=false",
    "filesystem_write_authorized=false",
    "credential_access_authorized=false",
    "payment_acceptance_authorized=false",
    "public_presale_activation_authorized=false",
    "funds_movement_authorized=false",
):
    assert line in self_lines, line

plan = subprocess.run(
    [sys.executable, "-I", "-B", str(TARGET), "--plan"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=30,
    check=False,
)
assert plan.returncode == 0 and plan.stderr == ""
assert "mode=plan" in plan.stdout.splitlines()
assert "source_only=true" in plan.stdout.splitlines()
assert '"python_isolated_execution_required":true' in plan.stdout
assert '"python_unoptimized_execution_required":true' in plan.stdout
assert '"base_added_path_count":21' in plan.stdout
assert '"base_modified_path_count":16' in plan.stdout
assert '"filesystem_write_authorized":false' in plan.stdout
assert '"payment_acceptance_authorized":false' in plan.stdout
assert '"funds_movement_authorized":false' in plan.stdout

head = git_text("rev-parse", "HEAD")
verify = subprocess.run(
    [
        sys.executable, "-I", "-B", str(TARGET),
        "--verify", "--checkout", str(ROOT), "--expected-head", head,
    ],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=120,
    check=False,
)
assert verify.returncode == 0 and verify.stderr == "", verify.stdout + verify.stderr
verify_lines = verify.stdout.splitlines()
assert "VOID_BUY_VOID_V7_POSTMERGE_SOURCE_RUNTIME_COMPAT_V1" in verify_lines
assert "status=GREEN" in verify_lines
assert '"python_isolated_execution":true' in verify.stdout
assert '"python_unoptimized_execution":true' in verify.stdout
assert '"base_added_path_count":21' in verify.stdout
assert '"base_modified_path_count":16' in verify.stdout
assert '"compatibility_self_added_path_count":4' in verify.stdout
assert '"runtime_sensitive_equal_path_count":5' in verify.stdout
assert '"tracked_source_checkout_exact":true' in verify.stdout
assert '"runtime_source_exact_reviewed_delta":true' in verify.stdout
assert '"filesystem_write_performed":false' in verify.stdout
assert '"payment_acceptance":false' in verify.stdout
assert '"funds_movement":false' in verify.stdout

print(MARKER + "_GREEN")
print("target_blob=" + TARGET_BLOB)
print("python_isolated_execution_bound=true")
print("python_unoptimized_execution_bound=true")
print("runtime_to_source_base_exact_21_add_16_modify_bound=true")
print("compatibility_self_scope_exact_four_additions_bound=true")
print("runtime_sensitive_five_path_identity_equality_bound=true")
print("full_tracked_worktree_bytes_bound=true")
print("terminal_index_generation_revalidation_bound=true")
print("terminal_worktree_generation_revalidation_bound=true")
print("retained_directory_fd_traversal_bound=true")
print("terminal_ancestor_directory_generation_revalidation_bound=true")
print("exact_git_toplevel_binding_bound=true")
print("terminal_required_branch_revalidation_bound=true")
print("terminal_exact_head_revalidation_bound=true")
print("post_git_retained_root_worktree_revalidation_bound=true")
print("post_final_git_raw_index_revalidation_bound=true")
print("worktree_filesystem_errors_normalized_to_hold=true")
print("git_subprocess_failures_normalized_to_hold=true")
print("canonical_checkout_mutation_performed=false")
print("filesystem_write_performed=false")
print("service_mutation=false")
print("credential_access=false")
print("signing=false")
print("transaction_submission=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
