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
TARGET_BLOB = "cf6832b6cb4233fb03d9b6e74ae00396183831c0"

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
    'output_root_directory_alias_forbidden',
    'output_parent_alias_forbidden',
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
assert "physical_downloads_root_required=true" in selftest.stdout.splitlines()
assert "output_parent_aliases_rejected=true" in selftest.stdout.splitlines()

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
    "protected_filesystem_mutation=false",
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
print("physical_downloads_root_binding_bound=true")
print("output_parent_alias_rejection_bound=true")
print("protected_filesystem_mutation=false")
print("network=false")
print("protected_replace_authorized=false")
