#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_installed_qualification_v1.py"
INSTALLER = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_v1.py"
)

TARGET_BLOB = "8a11fe23eafbc945b8f5a437b6eb27012ed5bae9"
INSTALLER_BLOB = "df3c27c57e0d413c7487189f1ddf6c141004d67c"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


target_raw = TARGET.read_bytes()
installer_raw = INSTALLER.read_bytes()
assert git_blob(target_raw) == TARGET_BLOB
assert git_blob(installer_raw) == INSTALLER_BLOB

source = target_raw.decode("utf-8")
for required in (
    'INSTALLER_SOURCE_GIT_BLOB_SHA1 = "df3c27c57e0d413c7487189f1ddf6c141004d67c"',
    '"PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V1"',
    "installed_snapshot(installer, expected_head)",
    "_run_bootstrap_self_test(",
    'f"/proc/self/fd/{fd}"',
    '"--self-test"',
    "pass_fds=(fd,)",
    '"protected_bootstrap_verified": True',
    '"installed_generation_stable": True',
    '"bootstrap_self_test_descriptor_bound": True',
    '"protected_installer_plan_execution": False',
    '"protected_installer_apply": False',
    '"credential_access": False',
    '"transaction": False',
    '"funds_movement": False',
    '"PROTECTED_BOOTSTRAP_INSTALLER_PLAN_V1"',
):
    assert required in source, required

for forbidden in (
    '"--installer-plan"',
    '"--installer-apply"',
    "LoadCredential",
    "CREDENTIALS_DIRECTORY",
    "eth_sendRawTransaction",
    "requests.",
    "urllib.request",
    "systemctl",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source)
collect_defs = [
    node for node in tree.body
    if isinstance(node, ast.FunctionDef) and node.name == "collect"
]
assert len(collect_defs) == 1
self_test_calls = [
    node for node in ast.walk(collect_defs[0])
    if isinstance(node, ast.Call)
    and isinstance(node.func, ast.Name)
    and node.func.id == "_run_bootstrap_self_test"
]
assert len(self_test_calls) == 2

run_defs = [
    node for node in tree.body
    if isinstance(node, ast.FunctionDef)
    and node.name == "_run_bootstrap_self_test"
]
assert len(run_defs) == 1
run_source = ast.get_source_segment(source, run_defs[0])
assert run_source is not None
assert "os.O_NOFOLLOW" in run_source
assert "_hash_retained_fd" in run_source
assert "pass_fds=(fd,)" in run_source
assert "visible_after = path.lstat()" in run_source
assert "bootstrap_generation_changed_during_self_test" in run_source

python = "/usr/bin/python3"
self_test = subprocess.run(
    [python, "-I", "-B", str(TARGET), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert self_test.returncode == 0, self_test.stderr
for line in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V1_SELF_TEST_GREEN",
    "installer_source_blob_bound=true",
    "accepted_bootstrap_lock_bound=true",
    "exact_installed_root_required=true",
    "root_python_policy_binding_required=true",
    "double_bootstrap_self_test_required=true",
    "descriptor_bound_bootstrap_self_test_required=true",
    "protected_installer_plan_execution=false",
    "protected_installer_apply=false",
    "credential_access=false",
    "transaction=false",
    "funds_movement=false",
):
    assert line in self_test.stdout.splitlines(), line

plan = subprocess.run(
    [python, "-I", "-B", str(TARGET), "--plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert plan.returncode == 0, plan.stderr
for line in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V1",
    "mode=plan",
    "root_required_for_run=true",
    "exact_expected_head_required=true",
    "installed_generation_verification_required=true",
    "checkout_generation_binding_required=true",
    "python_generation_binding_required=true",
    "double_bootstrap_self_test_required=true",
    "descriptor_bound_bootstrap_self_test_required=true",
    "bootstrap_self_test_execution=false",
    "protected_installer_plan_execution=false",
    "protected_installer_apply=false",
    "live_execution=false",
    "credential_access=false",
    "private_key_access=false",
    "signing=false",
    "transaction=false",
    "rpc_call=false",
    "funds_movement=false",
    "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_INSTALLED_READ_ONLY_QUALIFICATION_V1",
):
    assert line in plan.stdout.splitlines(), line

print(
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V1_PROOF_GREEN"
)
print("qualifier_source_blob_bound=true")
print("installer_source_blob_bound=true")
print("exact_installed_root_required=true")
print("root_python_policy_binding_required=true")
print("double_bootstrap_self_test_required=true")
print("descriptor_bound_bootstrap_self_test_required=true")
print("visible_generation_revalidated_after_self_test=true")
print("protected_installer_plan_execution=false")
print("protected_installer_apply=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("funds_movement=false")
