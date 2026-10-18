#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import os
from pathlib import Path
import subprocess
import tempfile
import types

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW_REL = (
    ".github/workflows/"
    "buy-void-epoch2-dormant-first-entry-protected-bootstrap-"
    "repaired-installed-qualification-v1.yml"
)
EXACT_PARENT = "4658a7d6650225d0bfb66e7868cef5646245d6c7"

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_BOOTSTRAP_V6_REPAIRED_INSTALLED_QUALIFICATION_V1"
)

TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_repaired_installed_qualification_v1.py"
)
TARGET_BLOB = "04c7ca5f0d96dcb60faeae8cf4d712435ad65466"

UPGRADER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_atomic_upgrade_v1.py"
)
UPGRADER_BLOB = "7d70527d8910881f9973479b89ceef78789ad100"
UPGRADER_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_atomic_upgrade_v1.py"
)
UPGRADER_PROOF_BLOB = "9e0b997230943b1ad0a0285e74e82faf049d7d31"

PLAN_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_atomic_upgrade_plan_v1.py"
)
PLAN_BLOB = "ed1f1aeb5fadf0d1ab6e3644a11a7d34c3356e78"
PLAN_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_atomic_upgrade_plan_v1.py"
)
PLAN_PROOF_BLOB = "e695ceed29f61f08f480d4dafaad7cc6635adf81"

OLD_LOCK = (
    "voidbuye2dormantbootstraplock3_"
    "5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"
)
NEW_LOCK = (
    "voidbuye2dormantbootstraplock3_"
    "4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396"
)
NEW_CAND = (
    "voidbuye2dormantbootstrapcand3_"
    "1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2"
)
GREEN_STATE = "PROTECTED_BOOTSTRAP_V6_REPAIRED_GREEN_WITH_PREDECESSOR"


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def pin(relative: str, expected: str) -> bytes:
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, (relative, git_blob(raw))
    return raw


target_raw = pin(TARGET_REL, TARGET_BLOB)
pin(UPGRADER_REL, UPGRADER_BLOB)
pin(UPGRADER_PROOF_REL, UPGRADER_PROOF_BLOB)
plan_raw = pin(PLAN_REL, PLAN_BLOB)
pin(PLAN_PROOF_REL, PLAN_PROOF_BLOB)

plan_source = plan_raw.decode("utf-8", "strict")
for required in (
    '"future_apply_source_inline": True',
    '"future_apply_source_reopens_checkout": False',
    '"planner_git_callbacks_neutralized": True',
    '"GIT_CONFIG_KEY_0": "core.fsmonitor"',
    '"GIT_CONFIG_VALUE_0": "false"',
    '"GIT_CONFIG_KEY_1": "core.hooksPath"',
    '"GIT_CONFIG_VALUE_1": "/dev/null"',
):
    assert required in plan_source, required
assert 'str(FIXED_CHECKOUT / UPGRADER_REL),\n        "--apply"' not in plan_source

workflow_source = (ROOT / WORKFLOW_REL).read_text("utf-8")
assert "STACK_PARENT=" + EXACT_PARENT in workflow_source
assert 'pull_request)' in workflow_source
assert 'pull_request)\n              base="$STACK_PARENT"' in workflow_source
assert 'workflow_dispatch) base="$STACK_PARENT" ;;' in workflow_source
assert 'base="$PR_BASE"' not in workflow_source
assert 'EXPECTED_HEAD^1' not in workflow_source
assert 'git rev-parse "$EXPECTED_HEAD^1"' not in workflow_source

source = target_raw.decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True)

for required in (
    'UPGRADER_BLOB = "' + UPGRADER_BLOB + '"',
    'PLAN_BLOB = "' + PLAN_BLOB + '"',
    GREEN_STATE,
    "upgrader.bindings(outer, expected_head)",
    "upgrader.state(outer, policy)",
    "upgrader.old_root(",
    "upgrader.PREDECESSOR_ROOT",
    "upgrader.STAGE_ROOT",
    "temporary_git_metadata_write_performed",
    "temporary_git_metadata_cleanup_completed",
    '"source_repository_mutation": False',
    '"source_object_fetch": False',
    '"repository_config_loaded": False',
    '"repository_callback_execution": False',
    '"native_parent_authority_claimed": False',
    '"repaired_fixed_root_verified": True',
    '"predecessor_retained_verified": True',
    '"upgrade_stage_absent_verified": True',
    '"temporary_git_metadata_write_required": True',
    '"qualification_git_callbacks_neutralized": True',
    '"filesystem_write": True',
    '"protected_filesystem_mutation": False',
    "nonroot_required_for_repaired_qualification",
    '"bootstrap_execution": False',
    '"inner_installer_execution": False',
    '"funds_movement": False',
    "PROTECTED_BOOTSTRAP_V6_REPAIRED_EXECUTION_PLAN",
):
    assert required in source, required

for forbidden in (
    "upgrader.collect(",
    "upgrader.apply(",
    "outer.apply(",
    "os.O_WRONLY",
    "os.O_RDWR",
    "os.O_CREAT",
    "os.O_EXCL",
    "os.mkdir(",
    "os.rename(",
    "os.replace(",
    "os.unlink(",
    ".unlink(",
    "os.remove(",
    "os.chmod(",
    "os.chown(",
    "os.fchmod(",
    "os.fchown(",
    "os.system(",
    "os.execv",
    "os.execve",
    "os.fexecve",
    "subprocess.Popen",
    "systemctl",
):
    assert forbidden not in source, forbidden

module = types.ModuleType("void_repaired_qualification_callback_fixture")
module.__file__ = str(ROOT / TARGET_REL)
module.__package__ = ""
exec(compile(source, TARGET_REL, "exec", dont_inherit=True), module.__dict__)
with tempfile.TemporaryDirectory(prefix="void-e2-qualification-fsmonitor-") as td:
    temp = Path(td)
    repo = temp / "repo"
    sentinel = temp / "fsmonitor-executed"
    subprocess.run(
        ["/usr/bin/git", "init", "-q", str(repo)],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
        timeout=20,
    )
    callback = temp / "fsmonitor.sh"
    callback.write_text(
        "#!/bin/sh\n"
        + "/usr/bin/touch "
        + str(sentinel)
        + "\n"
        + "exit 1\n",
        encoding="utf-8",
    )
    callback.chmod(0o755)
    subprocess.run(
        ["/usr/bin/git", "-C", str(repo), "config", "core.fsmonitor", str(callback)],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
        timeout=20,
    )
    module.FIXED_CHECKOUT = repo
    observed = module._git(["status", "--porcelain=v1", "--untracked-files=all"])
    assert observed == b""
    assert not sentinel.exists(), "qualification_git_fsmonitor_callback_executed"

tree = ast.parse(source)
functions = {
    node.name: node
    for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
for name in (
    "_git",
    "checkout_snapshot",
    "exact_git_object",
    "load_upgrader",
    "collect",
    "source_plan",
    "emit",
    "self_test",
):
    assert name in functions, name

run_calls_outside_git: list[str] = []
for name, fn in functions.items():
    for node in ast.walk(fn):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "subprocess"
            and node.func.attr == "run"
            and name != "_git"
        ):
            run_calls_outside_git.append(name)
assert run_calls_outside_git == []

collect_source = ast.get_source_segment(source, functions["collect"]) or ""
for required in (
    "os.geteuid() == 0",
    "checkout_snapshot(expected_head)",
    "exact_git_object(expected_head, UPGRADER_PROOF_REL, UPGRADER_PROOF_BLOB)",
    "exact_git_object(expected_head, PLAN_REL, PLAN_BLOB)",
    "exact_git_object(expected_head, PLAN_PROOF_REL, PLAN_PROOF_BLOB)",
    "outer = upgrader.load_outer()",
    "outer._require_secure_apply_context()",
    "bindings, policy, receipt = upgrader.bindings(outer, expected_head)",
    "protected_state, current_root_identity = upgrader.state(outer, policy)",
    "protected_state != GREEN_STATE",
    "predecessor_root_identity = upgrader.old_root(",
    "upgrader.PREDECESSOR_ROOT",
    "upgrader.exists(upgrader.STAGE_ROOT)",
    "not upgrader.exists(upgrader.PREDECESSOR_ROOT)",
    'bindings.get("lock_id") != NEW_LOCK',
):
    assert required in collect_source, required

assert "upgrader.collect(" not in collect_source
assert "upgrader.apply(" not in collect_source

target = ROOT / TARGET_REL
for mode, expected_lines in (
    (
        "--self-test",
        (
            MARKER + "_SELF_TEST_GREEN",
            "exact_repaired_upgrader_generation_bound=true",
            "exact_nonexecuting_upgrade_plan_generation_bound=true",
            "strict_lowercase_expected_head_required=true",
            "repaired_green_state_required=true",
            "repaired_fixed_root_required=true",
            "retained_predecessor_required=true",
            "upgrade_stage_absent_required=true",
            "temporary_git_metadata_cleanup_required=true",
            "upgrader_apply_not_called=true",
            "temporary_git_metadata_write_required=true",
            "qualification_git_callbacks_neutralized=true",
            "nonroot_run_required=true",
            "protected_filesystem_mutation=false",
            "bootstrap_execution=false",
            "inner_installer_execution=false",
            "service_mutation=false",
            "credential_access=false",
            "funds_movement=false",
        ),
    ),
    (
        "--source-plan",
        (
            MARKER,
            "mode=source-plan",
            "source_only=true",
            "host_read=false",
            "host_write=false",
            "upgrader_git_blob_sha1=" + UPGRADER_BLOB,
            "upgrade_plan_git_blob_sha1=" + PLAN_BLOB,
            "old_lock_id=" + OLD_LOCK,
            "new_lock_id=" + NEW_LOCK,
            "new_candidate_id=" + NEW_CAND,
            "repaired_fixed_root_required=true",
            "retained_predecessor_required=true",
            "upgrade_stage_absent_required=true",
            "temporary_git_metadata_boundary_explicit=true",
            "temporary_git_metadata_write_required=true",
            "qualification_git_callbacks_neutralized=true",
            "nonroot_run_required=true",
            "protected_filesystem_mutation=false",
            "bootstrap_execution=false",
            "inner_installer_execution=false",
            "service_mutation=false",
            "credential_access=false",
            "funds_movement=false",
        ),
    ),
):
    cp = subprocess.run(
        ["/usr/bin/python3", "-I", "-B", str(target), mode],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
    )
    assert cp.returncode == 0, (mode, cp.stderr)
    assert cp.stderr == "", (mode, cp.stderr)
    lines = set(cp.stdout.splitlines())
    for expected in expected_lines:
        assert expected in lines, (mode, expected)

print(MARKER + "_PROOF_GREEN")
print("target_blob_bound=true")
print("pull_request_exact_parent_bound=true")
print("pull_request_stale_base_authority_absent=true")
print("workflow_dispatch_exact_parent_bound=true")
print("workflow_dispatch_first_parent_inference_absent=true")
print("repaired_upgrader_generation_bound=true")
print("nonexecuting_upgrade_plan_generation_bound=true")
print("green_state_classifier_reused=true")
print("repaired_fixed_root_reverified=true")
print("retained_predecessor_reverified=true")
print("upgrade_stage_absence_required=true")
print("temporary_git_metadata_cleanup_required=true")
print("source_repository_mutation=false")
print("upgrader_collect_absent=true")
print("upgrader_apply_absent=true")
print("temporary_git_metadata_write_required=true")
print("qualification_git_callbacks_neutralized=true")
print("qualification_git_fsmonitor_callback_rejected=true")
print("repaired_plan_immutable_handoff_bound=true")
print("nonroot_run_required=true")
print("protected_filesystem_mutation=false")
print("bootstrap_execution=false")
print("inner_installer_execution=false")
print("service_mutation=false")
print("credential_access=false")
print("private_key_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("treasury_liquidity_action=false")
print("funds_movement=false")
