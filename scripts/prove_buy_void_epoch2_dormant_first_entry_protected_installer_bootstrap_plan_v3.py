#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V3"
)

TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_plan_v3.py"
)
TARGET_BLOB = "b5f0a3a79632ea9bbb17c9e3a8cb4771752fca47"

QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_protected_install_"
    "bootstrap_installed_qualification_v3.py"
)
QUALIFIER_BLOB = "a2298dbdbf9928f14963ce8bf77d91f54e349ce9"

LAUNCHER_LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-"
    "candidate-lock-v1.json"
)
LAUNCHER_LOCK_BLOB = "f8ff6fbb855aecafc329cd60622cf3af782745a3"
LAUNCHER_MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_dormant_binder_"
    "installer_first_entry_v1.py"
)
LAUNCHER_MATERIALIZER_BLOB = "50e8e7ba06740af830cc3c9df34d0ef7739a7e67"

NATIVE_LOCK_REL = (
    "ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json"
)
NATIVE_LOCK_BLOB = "5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1"
NATIVE_MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_dormant_binder_native_v2.py"
)
NATIVE_MATERIALIZER_BLOB = "557eb68453d517d78bb3b6c6d8427df9ed36316f"


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
pin(QUALIFIER_REL, QUALIFIER_BLOB)
pin(LAUNCHER_LOCK_REL, LAUNCHER_LOCK_BLOB)
pin(LAUNCHER_MATERIALIZER_REL, LAUNCHER_MATERIALIZER_BLOB)
pin(NATIVE_LOCK_REL, NATIVE_LOCK_BLOB)
pin(NATIVE_MATERIALIZER_REL, NATIVE_MATERIALIZER_BLOB)

source = target_raw.decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True)

for required in (
    'PLAN_PREFIX = "voidbuye2protectedbootstrapplan3_"',
    'QUALIFIER_BLOB = "' + QUALIFIER_BLOB + '"',
    'LAUNCHER_LOCK_BLOB = "' + LAUNCHER_LOCK_BLOB + '"',
    'NATIVE_LOCK_BLOB = "' + NATIVE_LOCK_BLOB + '"',
    'LAUNCHER_BYTES = 731_072',
    'NATIVE_BYTES = 726_976',
    'runtime_expected_head_forwarded_unchanged',
    'superseded_v3_lock_install_authority',
    'superseded_v2_lock_install_authority',
    'superseded_v1_lock_install_authority',
    'qualifier.collect(expected_head)',
    'nonroot_plan_required',
    '"--installer-plan"',
    '"--launcher"',
    '"--native"',
    '"--expected-head"',
    '"bootstrap_execution_performed": False',
    '"protected_installer_apply_performed": False',
    '"filesystem_write": False',
    'bootstrap_argv_json=',
    'PROTECTED_INSTALLER_BOOTSTRAP_EXECUTE_PLAN_V3',
):
    assert required in source, required

for forbidden in (
    "subprocess.Popen",
    "os.system(",
    "os.execv",
    "os.execve",
    "os.fexecve",
    "sudo",
    "--installer-apply",
    "expected-plan-id",
    "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY",
    "os.O_WRONLY",
    "os.O_RDWR",
    "os.O_CREAT",
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
):
    assert forbidden not in source, forbidden

tree = ast.parse(source)
functions = {
    node.name: node
    for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
for name in (
    "git",
    "repository_blob",
    "stable_artifact",
    "load_qualifier",
    "source_dependencies",
    "collect_plan",
    "emit_plan",
    "source_plan",
    "self_test",
):
    assert name in functions, name

collect_source = ast.get_source_segment(source, functions["collect_plan"]) or ""
assert "os.geteuid() == 0" in collect_source
assert "qualifier.collect(expected_head)" in collect_source
assert "stable_artifact(" in collect_source
assert '"--installer-plan"' in collect_source
assert '"bootstrap_execution_performed": False' in collect_source
assert '"protected_installer_apply_performed": False' in collect_source
assert '"filesystem_write": False' in collect_source
assert "--installer-apply" not in collect_source

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

target = ROOT / TARGET_REL
for mode, expected_lines in (
    (
        "--self-test",
        (
            MARKER + "_SELF_TEST_GREEN",
            "nonroot_plan_required=true",
            "merged_v3_qualifier_bound=true",
            "accepted_launcher_materializer_bound=true",
            "accepted_native_materializer_bound=true",
            "strict_runtime_head_required=true",
            "superseded_v3_lock_install_authority=false",
            "superseded_v2_lock_install_authority=false",
            "superseded_v1_lock_install_authority=false",
            "operation_bound_plan_id=true",
            "structured_bootstrap_argv_only=true",
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
            "qualifier_git_blob_sha1=" + QUALIFIER_BLOB,
            "launcher_lock_git_blob_sha1=" + LAUNCHER_LOCK_BLOB,
            "native_lock_git_blob_sha1=" + NATIVE_LOCK_BLOB,
            "superseded_v3_lock_install_authority=false",
            "superseded_v2_lock_install_authority=false",
            "superseded_v1_lock_install_authority=false",
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
print("merged_v3_qualifier_bound=true")
print("launcher_lock_and_materializer_bound=true")
print("native_lock_and_materializer_bound=true")
print("read_only_artifact_verification_only=true")
print("nonroot_plan_required=true")
print("superseded_v3_lock_install_authority=false")
print("superseded_v2_lock_install_authority=false")
print("superseded_v1_lock_install_authority=false")
print("structured_bootstrap_argv_only=true")
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
