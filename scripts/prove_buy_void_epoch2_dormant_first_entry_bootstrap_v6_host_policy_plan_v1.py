#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "BOOTSTRAP_V6_HOST_POLICY_PLAN_V1"
)
TARGET_REL = (
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_"
    "bootstrap_v6_host_policy_plan_v1.py"
)
TARGET_BLOB = "0a3be74df4574107defd75852c3c799a332f588f"

PINS = {
    "scripts/materialize_buy_void_epoch2_dormant_first_entry_bootstrap_v6.py":
        "3a937c756a91ad2565897f1ae5d881f9fa2f41c6",
    "scripts/prove_buy_void_epoch2_dormant_first_entry_bootstrap_v6_materializer_v1.py":
        "58ae5cb2c3c4f47aa56744e4202c0b45db1416ef",
    "docs/operators/buy-void-epoch2-dormant-first-entry-bootstrap-v6-materializer-v1.md":
        "0d141b39670de03cba791504d1d27ee56f588db5",
    ".github/workflows/buy-void-epoch2-dormant-first-entry-bootstrap-v6-materializer-v1.yml":
        "5347246d7aec42377a366058c5156f3d7e8cc2d9",
    "ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json":
        "f5b03c6b81016edf21f605099e0ef8976f40e107",
    "scripts/prove_buy_void_epoch2_dormant_first_entry_bootstrap_v6_candidate_v1.py":
        "b963ac9ef0b9c8ac685763b3a82375f970ef12df",
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6.c":
        "a317d3dce324337f107909bd6e33e98622b3ef09",
    "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v3.conf":
        "6e0630af72111bd9976dcc38cdcdada1904dd067",
}

POLICY_SCHEMA = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6"
)


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def pin(relative: str, expected: str) -> bytes:
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, relative
    return raw


target_raw = pin(TARGET_REL, TARGET_BLOB)
for relative, expected in PINS.items():
    pin(relative, expected)

source = target_raw.decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True)
tree = ast.parse(source)

for required in (
    'PLAN_PREFIX = "voidbuye2dormantbootstraphostplan1_"',
    'POLICY_SCHEMA = (',
    'MATERIALIZER_BLOB = "3a937c756a91ad2565897f1ae5d881f9fa2f41c6"',
    'LOCK_BLOB = "f5b03c6b81016edf21f605099e0ef8976f40e107"',
    'BOOTSTRAP_BYTES = 874_608',
    'MANIFEST_BYTES = 2382',
    'FIXED_PYTHON = Path("/usr/bin/python3")',
    'FIXED_GIT = Path("/usr/bin/git")',
    'INSTALL_ROOT = Path(',
    '"create_only": True',
    '"overwrite_authorized": False',
    '"replace_authorized": False',
    '"bootstrap_execution_performed": False',
    '"protected_installer_apply_performed": False',
    '"filesystem_write": False',
    'nonroot_plan_required',
    'policy_text_json=',
    'SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_',
):
    assert required in source, required

for forbidden in (
    "subprocess.Popen",
    "os.system(",
    "os.execv",
    "os.execve",
    "os.fexecve",
    "sudo",
    "os.O_WRONLY",
    "os.O_RDWR",
    "os.O_CREAT",
    "os.mkdir(",
    "os.makedirs(",
    "os.rename(",
    "os.replace(",
    "os.unlink(",
    ".unlink(",
    "os.remove(",
    "os.chmod(",
    "os.chown(",
    "os.fchmod(",
    "os.fchown(",
    "os.write(",
):
    assert forbidden not in source, forbidden

functions = {
    node.name: node
    for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
for name in (
    "repository_snapshot",
    "tool_identity",
    "stable_artifact",
    "source_dependencies",
    "policy_bytes",
    "require_install_root_absent",
    "collect_plan",
    "emit_plan",
    "source_plan",
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
assert run_calls == ["git"], run_calls

collect_source = ast.get_source_segment(source, functions["collect_plan"]) or ""
assert "os.geteuid() == 0" in collect_source
assert "repository_snapshot(expected_head)" in collect_source
assert "source_dependencies()" in collect_source
assert 'tool_identity(FIXED_PYTHON, "python3")' in collect_source
assert 'tool_identity(FIXED_GIT, "git")' in collect_source
assert "policy_bytes(python_identity, git_identity)" in collect_source
assert "require_install_root_absent()" in collect_source
assert '"filesystem_write": False' in collect_source
assert '"bootstrap_execution_performed": False' in collect_source

policy_source = ast.get_source_segment(source, functions["policy_bytes"]) or ""
for row in (
    '"schema=" + POLICY_SCHEMA + "\\n"',
    '"python_sha256="',
    '"python_bytes="',
    '"git_sha256="',
    '"git_bytes="',
):
    assert row in policy_source, row

target = ROOT / TARGET_REL
for mode, expected_lines in (
    (
        "--self-test",
        (
            MARKER + "_SELF_TEST_GREEN",
            "accepted_bootstrap_v6_materializer_bound=true",
            "accepted_bootstrap_v6_lock_bound=true",
            "source_generation_v3_bound=true",
            "precision_python_generation_plan_bound=true",
            "precision_git_generation_plan_bound=true",
            "host_policy_exact_order_bound=true",
            "create_only_install_plan=true",
            "nonroot_plan_required=true",
            "bootstrap_execution_performed=false",
            "protected_installer_apply_performed=false",
            "filesystem_write=false",
            "service_mutation=false",
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
            "materializer_git_blob_sha1=3a937c756a91ad2565897f1ae5d881f9fa2f41c6",
            "materializer_proof_git_blob_sha1=58ae5cb2c3c4f47aa56744e4202c0b45db1416ef",
            "materializer_workflow_git_blob_sha1=5347246d7aec42377a366058c5156f3d7e8cc2d9",
            "accepted_lock_git_blob_sha1=f5b03c6b81016edf21f605099e0ef8976f40e107",
            "policy_schema=" + POLICY_SCHEMA,
            "fixed_python=/usr/bin/python3",
            "fixed_git=/usr/bin/git",
            "create_only=true",
            "bootstrap_execution_performed=false",
            "protected_installer_apply_performed=false",
            "filesystem_write=false",
            "service_mutation=false",
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
print("materializer_generation_bound=true")
print("accepted_bootstrap_v6_lock_bound=true")
print("bootstrap_v6_source_bound=true")
print("source_generation_v3_bound=true")
print("read_only_host_tool_measurement_only=true")
print("precision_python_generation_plan_bound=true")
print("precision_git_generation_plan_bound=true")
print("host_policy_exact_order_bound=true")
print("create_only_install_plan=true")
print("nonroot_plan_required=true")
print("subprocess_execution_limited_to_git_read_only=true")
print("bootstrap_execution_absent=true")
print("protected_installer_apply_absent=true")
print("filesystem_write=false")
print("service_mutation=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
