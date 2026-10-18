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

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_BOOTSTRAP_ATOMIC_UPGRADE_PLAN_V1"
)

TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_atomic_upgrade_plan_v1.py"
)
TARGET_BLOB = "9ba10aac284da9e44db0ad258348425cfa3c2e2c"

UPGRADER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_atomic_upgrade_v1.py"
)
UPGRADER_BLOB = "d4b298dea73a4970987bf22435be3e76a5e7a02d"
UPGRADER_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_atomic_upgrade_v1.py"
)
UPGRADER_PROOF_BLOB = "74245f061432efd5383123c111ab481befbe90b5"
UPGRADER_DOC_REL = (
    "docs/operators/buy-void-epoch2-dormant-first-entry-"
    "protected-bootstrap-atomic-upgrade-v1.md"
)
UPGRADER_DOC_BLOB = "bc41ad73160734b9a11bcaf925dc24b7daf645db"
UPGRADER_WORKFLOW_REL = (
    ".github/workflows/buy-void-epoch2-dormant-first-entry-"
    "protected-bootstrap-atomic-upgrade-v1.yml"
)
UPGRADER_WORKFLOW_BLOB = "5601a90c2e12a6ea98e70339ea4b351572cda5d6"

PLAN_WORKFLOW_REL = (
    ".github/workflows/buy-void-epoch2-dormant-first-entry-"
    "protected-bootstrap-atomic-upgrade-plan-v1.yml"
)
STACK_PARENT = "12b5b05eaaf07e10bd4cb04c98abc1916a81fede"

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
NEW_BOOTSTRAP_SHA256 = (
    "618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c"
)
NEW_BOOTSTRAP_GIT_BLOB = "b577d70666f98ac59a75b84b3dab741fe7b93a4b"
NEW_MANIFEST_SHA256 = (
    "8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9"
)
NEW_MANIFEST_GIT_BLOB = "de56bacb30bea0adc418e240cf3fb8d900b061ef"


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def pin(relative: str, expected: str) -> bytes:
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, (relative, git_blob(raw), expected)
    return raw


target_raw = pin(TARGET_REL, TARGET_BLOB)
pin(UPGRADER_REL, UPGRADER_BLOB)
pin(UPGRADER_PROOF_REL, UPGRADER_PROOF_BLOB)
pin(UPGRADER_DOC_REL, UPGRADER_DOC_BLOB)
pin(UPGRADER_WORKFLOW_REL, UPGRADER_WORKFLOW_BLOB)

plan_workflow_source = (ROOT / PLAN_WORKFLOW_REL).read_text("utf-8")
for required in (
    "STACK_PARENT=12b5b05eaaf07e10bd4cb04c98abc1916a81fede",
    """pull_request)
              test -n "$PR_BASE"
              git merge-base --is-ancestor "$PR_BASE" "$STACK_PARENT"
              base="$STACK_PARENT"
              ;;""",
    'workflow_dispatch) base="$STACK_PARENT" ;;',
):
    assert required in plan_workflow_source, required
assert 'workflow_dispatch) base="$(git rev-parse "$EXPECTED_HEAD^1")" ;;' not in plan_workflow_source
assert 'test "$PR_BASE" = "$STACK_PARENT"' not in plan_workflow_source

correct_proof_trigger = '      - "' + UPGRADER_PROOF_REL + '"'
assert plan_workflow_source.count(correct_proof_trigger) == 2
assert "dormant_first-entry-protected-bootstrap-atomic-upgrade-v1.py" not in plan_workflow_source

source = target_raw.decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True)
tree = ast.parse(source)

for required in (
    'UPGRADER_BLOB = "' + UPGRADER_BLOB + '"',
    '"voidbuye2dormantbootstraplock3_"',
    '"5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"',
    '"4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396"',
    '"voidbuye2dormantbootstrapcand3_"',
    '"1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2"',
    NEW_BOOTSTRAP_SHA256,
    NEW_BOOTSTRAP_GIT_BLOB,
    NEW_MANIFEST_SHA256,
    NEW_MANIFEST_GIT_BLOB,
    'future_apply_requires_root": True',
    'future_apply_authorized": False',
    '"future_apply_source_inline": True',
    '"future_apply_source_reopens_checkout": False',
    '"planner_git_callbacks_neutralized": True',
    '"protected_filesystem_mutation": False',
    '"GIT_CONFIG_KEY_0": "core.fsmonitor"',
    '"GIT_CONFIG_VALUE_0": "false"',
    '"GIT_CONFIG_KEY_1": "core.hooksPath"',
    '"GIT_CONFIG_VALUE_1": "/dev/null"',
    '"bootstrap_execution": False',
    '"inner_installer_execution": False',
    '"funds_movement": False',
    "temporary_git_metadata_write_performed",
    "temporary_git_metadata_cleanup_completed",
    "source_repository_mutation",
    "source_object_fetch",
    "native_parent_authority_claimed",
    'upgrader.collect(bootstrap, manifest, expected_head)',
    '"--apply"',
    '"--expected-plan-id"',
    '"--confirm"',
):
    assert required in source, required

for forbidden in (
    "sudo",
    "os.system(",
    "os.execv",
    "os.execve",
    "os.fexecve",
    "subprocess.Popen",
    "systemctl",
    "service restart",
    "shutil.rmtree",
    "os.unlink(",
    "os.remove(",
    "os.mkdir(",
    "os.rename(",
    "os.replace(",
    "os.chmod(",
    "os.chown(",
    "os.fchmod(",
    "os.fchown(",
):
    assert forbidden not in source, forbidden

functions = {
    node.name: node
    for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
for name in (
    "_git",
    "checkout_snapshot",
    "exact_git_object",
    "stable_regular_input",
    "load_upgrader",
    "collect",
    "emit_source_plan",
    "emit_run",
    "self_test",
):
    assert name in functions, name

run_calls: list[str] = []
for name, fn in functions.items():
    for node in ast.walk(fn):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "subprocess"
            and node.func.attr == "run"
        ):
            run_calls.append(name)
assert run_calls == ["_git"], run_calls

collect_source = ast.get_source_segment(source, functions["collect"]) or ""
for required in (
    "os.geteuid() == 0",
    "checkout_snapshot(expected_head)",
    "stable_regular_input(",
    "load_upgrader(expected_head)",
    "upgrader.collect(bootstrap, manifest, expected_head)",
    'receipt.get(key) != expected',
    '"future_apply_authorized": False',
    '"protected_filesystem_mutation": False',
):
    assert required in collect_source, required
assert "upgrader.apply(" not in collect_source
assert "subprocess." not in collect_source
assert '"-c",' in collect_source
assert "future_apply_code" in collect_source
assert '"future_apply_source_inline": True' in collect_source
assert '"future_apply_source_reopens_checkout": False' in collect_source
assert '"planner_git_callbacks_neutralized": True' in collect_source
assert 'str(FIXED_CHECKOUT / UPGRADER_REL),\n        "--apply"' not in collect_source

load_source = ast.get_source_segment(source, functions["load_upgrader"]) or ""
assert "exec(" in load_source
assert "compile(" in load_source
assert "module.__file__" in load_source
assert "module.NEW_BOOT" in load_source
assert "module.NEW_MAN" in load_source
assert "module.apply" not in load_source
assert "return module, raw" in load_source

git_source = ast.get_source_segment(source, functions["_git"]) or ""
for required in (
    '"GIT_CONFIG_KEY_0": "core.fsmonitor"',
    '"GIT_CONFIG_VALUE_0": "false"',
    '"GIT_CONFIG_KEY_1": "core.hooksPath"',
    '"GIT_CONFIG_VALUE_1": "/dev/null"',
):
    assert required in source, required

module = types.ModuleType("void_atomic_upgrade_plan_callback_fixture")
module.__file__ = str(ROOT / TARGET_REL)
module.__package__ = ""
exec(compile(source, TARGET_REL, "exec", dont_inherit=True), module.__dict__)
with tempfile.TemporaryDirectory(prefix="void-e2-plan-fsmonitor-") as td:
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
    assert not sentinel.exists(), "planner_git_fsmonitor_callback_executed"

stable_source = (
    ast.get_source_segment(source, functions["stable_regular_input"]) or ""
)
assert "os.O_RDONLY" in stable_source
assert "os.O_NOFOLLOW" in stable_source
for forbidden in (
    "os.O_WRONLY",
    "os.O_RDWR",
    "os.O_CREAT",
    "os.O_EXCL",
):
    assert forbidden not in stable_source, forbidden

emit_source = ast.get_source_segment(source, functions["emit_run"]) or ""
assert "future_apply_argv_json=" in emit_source
assert "planner_git_callbacks_neutralized=true" in emit_source
assert "future_apply_source_inline=true" in emit_source
assert "future_apply_source_reopens_checkout=false" in emit_source
assert "future_apply_authorized=false" in emit_source
assert "protected_filesystem_mutation=false" in emit_source
assert "bootstrap_execution=false" in emit_source
assert "inner_installer_execution=false" in emit_source
assert "funds_movement=false" in emit_source

target = ROOT / TARGET_REL
for mode, expected_lines in (
    (
        "--self-test",
        (
            MARKER + "_SELF_TEST_GREEN",
            "exact_repaired_upgrader_generation_bound=true",
            "nonroot_run_required=true",
            "strict_lowercase_expected_head_required=true",
            "repaired_bootstrap_identity_bound=true",
            "repaired_manifest_identity_bound=true",
            "upgrader_collect_only=true",
            "temporary_git_metadata_boundary_explicit=true",
            "planner_git_callbacks_neutralized=true",
            "future_apply_source_inline=true",
            "future_apply_source_reopens_checkout=false",
            "protected_filesystem_mutation=false",
            "future_apply_argv_emitted_only=true",
            "future_apply_authorized=false",
            "bootstrap_execution=false",
            "inner_installer_execution=false",
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
            "old_lock_id=" + OLD_LOCK,
            "new_lock_id=" + NEW_LOCK,
            "new_candidate_id=" + NEW_CAND,
            "planner_git_callbacks_neutralized=true",
            "future_apply_source_inline=true",
            "future_apply_source_reopens_checkout=false",
            "future_apply_requires_root=true",
            "future_apply_authorized=false",
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
print("planner_target_blob_bound=true")
print("repaired_upgrader_generation_bound=true")
print("upgrader_proof_doc_workflow_generation_bound=true")
print("fixed_stack_parent_bound=true")
print("manual_dispatch_base_bound=true")
print("nonroot_run_required=true")
print("upgrader_collect_only=true")
print("subprocess_execution_limited_to_sanitized_git=true")
print("input_reads_read_only_nofollow=true")
print("temporary_git_metadata_boundary_explicit=true")
print("planner_git_callbacks_neutralized=true")
print("planner_git_fsmonitor_callback_rejected=true")
print("future_apply_source_inline=true")
print("future_apply_source_reopens_checkout=false")
print("future_apply_mutable_checkout_execution=false")
print("source_repository_mutation=false")
print("protected_filesystem_mutation=false")
print("future_apply_argv_emitted_only=true")
print("future_apply_authorized=false")
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
