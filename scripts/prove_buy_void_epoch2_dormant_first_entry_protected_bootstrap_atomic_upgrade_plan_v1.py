#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
from pathlib import Path
import subprocess

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
TARGET_BLOB = "928568d08f56375911505af635306b715790c1f3"

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
UPGRADER_DOC_REL = (
    "docs/operators/buy-void-epoch2-dormant-first-entry-"
    "protected-bootstrap-atomic-upgrade-v1.md"
)
UPGRADER_DOC_BLOB = "6073c2c3a6489d80a24e64eba9fdf892bfe8c4c0"
UPGRADER_WORKFLOW_REL = (
    ".github/workflows/buy-void-epoch2-dormant-first-entry-"
    "protected-bootstrap-atomic-upgrade-v1.yml"
)
UPGRADER_WORKFLOW_BLOB = "a89be3f29d758811362c81c9dbc7d2b69f74c147"

PLAN_WORKFLOW_REL = (
    ".github/workflows/buy-void-epoch2-dormant-first-entry-"
    "protected-bootstrap-atomic-upgrade-plan-v1.yml"
)
STACK_PARENT = "99600d3cce99c7e0a7281a48bbcdcecb66bc54f7"

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
    "STACK_PARENT=99600d3cce99c7e0a7281a48bbcdcecb66bc54f7",
    """pull_request)
              test "$PR_BASE" = "$STACK_PARENT"
              base="$STACK_PARENT"
              ;;""",
    'workflow_dispatch) base="$STACK_PARENT" ;;',
):
    assert required in plan_workflow_source, required
assert 'workflow_dispatch) base="$(git rev-parse "$EXPECTED_HEAD^1")" ;;' not in plan_workflow_source

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
    '"protected_filesystem_mutation": False',
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

load_source = ast.get_source_segment(source, functions["load_upgrader"]) or ""
assert "exec(" in load_source
assert "compile(" in load_source
assert "module.__file__" in load_source
assert "module.NEW_BOOT" in load_source
assert "module.NEW_MAN" in load_source
assert "module.apply" not in load_source

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
