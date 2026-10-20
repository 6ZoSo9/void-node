#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_buy_void_v7_postmerge_source_runtime_compat_v1.py"
TARGET_BLOB = "a129e9645458a54417dff448703d7c314c1bdeff"
MARKER = "VOID_BUY_VOID_V7_POSTMERGE_SOURCE_RUNTIME_COMPAT_V1_PROOF"


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
    'MARKER = "VOID_BUY_VOID_V7_POSTMERGE_SOURCE_RUNTIME_COMPAT_V1"',
    'RUNTIME_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"',
    'SOURCE_BASE_HEAD = "fd8131500330d8f8d51caa8275db456338c0a878"',
    'SOURCE_BASE_TREE = "ff80027780ba8a037a56e0a322849420dae88565"',
    'len(BASE_ADDITIONS) == 21',
    'len(BASE_MODIFICATIONS) == 3',
    'len(SELF_ADDITIONS) == 4',
    'len(RUNTIME_SENSITIVE_EQUAL) == 5',
    'runtime_source_exact_reviewed_delta',
    'tracked_source_checkout_exact',
    'terminal_index_generation_revalidation_required=true',
    'terminal_worktree_generation_revalidation_required=true',
    'worktree_filesystem_errors_normalized_to_hold=true',
    '_require_index_unchanged(raw_index, _run_git(root, *index_query))',
    '_terminal_revalidate_worktree(root, fingerprints)',
    'canonical_checkout_mutation_performed',
    'filesystem_write_performed',
    'public_presale_activation',
    'funds_movement',
):
    assert required in text, required

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
    "runtime_to_source_base_exact_21_add_3_modify_required=true",
    "compatibility_self_scope_exact_four_additions_required=true",
    "runtime_sensitive_five_path_identity_equality_required=true",
    "tracked_source_checkout_exact_required=true",
    "terminal_index_generation_revalidation_required=true",
    "terminal_worktree_generation_revalidation_required=true",
    "worktree_filesystem_errors_normalized_to_hold=true",
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
assert '"base_added_path_count":21' in plan.stdout
assert '"base_modified_path_count":3' in plan.stdout
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
assert '"base_added_path_count":21' in verify.stdout
assert '"base_modified_path_count":3' in verify.stdout
assert '"compatibility_self_added_path_count":4' in verify.stdout
assert '"runtime_sensitive_equal_path_count":5' in verify.stdout
assert '"tracked_source_checkout_exact":true' in verify.stdout
assert '"runtime_source_exact_reviewed_delta":true' in verify.stdout
assert '"filesystem_write_performed":false' in verify.stdout
assert '"payment_acceptance":false' in verify.stdout
assert '"funds_movement":false' in verify.stdout

print(MARKER + "_GREEN")
print("target_blob=" + TARGET_BLOB)
print("runtime_to_source_base_exact_21_add_3_modify_bound=true")
print("compatibility_self_scope_exact_four_additions_bound=true")
print("runtime_sensitive_five_path_identity_equality_bound=true")
print("full_tracked_worktree_bytes_bound=true")
print("terminal_index_generation_revalidation_bound=true")
print("terminal_worktree_generation_revalidation_bound=true")
print("worktree_filesystem_errors_normalized_to_hold=true")
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
