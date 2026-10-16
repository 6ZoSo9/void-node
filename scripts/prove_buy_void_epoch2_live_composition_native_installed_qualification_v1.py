#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
TARGET = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_installed_qualification_v1.py"
)
INSTALLER = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_protected_install_v1.py"
)

TARGET_BLOB = "4706caccc0be42f64b5fc6590a0b67e8a4b62d6a"
INSTALLER_BLOB = "f572868ea0edacbb3404771b793c4c60f9471abb"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


assert git_blob(TARGET.read_bytes()) == TARGET_BLOB
assert git_blob(INSTALLER.read_bytes()) == INSTALLER_BLOB

source = TARGET.read_text("utf-8")
for required in (
    "VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V1",
    "installed_generation_changed_during_qualification",
    "native_self_test_output_changed",
    "double_native_self_test_required=true",
    "native_self_test_execution=false",
    "runner_execution=false",
    "live_composition_execution=false",
    "credential_access=false",
    "private_key_access=false",
    "signing=false",
    "transaction=false",
    "funds_movement=false",
    "SEPARATELY_AUTHORIZE_EPOCH2_NATIVE_LIVE_COMPOSITION_V2",
):
    assert required in source, required

assert source.count("_run_native_self_test(installer)") == 2
assert "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V2" not in source
assert "void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs" not in source
assert "CREDENTIALS_DIRECTORY" not in source
assert "eth_sendRawTransaction" not in source

spec = importlib.util.spec_from_file_location("epoch2_native_installed_qualification_v1", TARGET)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.self_test()

self_cp = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--self-test"],
    cwd=ROOT,
    env={"PATH": "/usr/bin:/bin", "HOME": "/tmp", "LANG": "C", "LC_ALL": "C"},
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=True,
)
assert (
    "VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V1_SELF_TEST_GREEN"
    in self_cp.stdout.splitlines()
)

plan_cp = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--plan"],
    cwd=ROOT,
    env={"PATH": "/usr/bin:/bin", "HOME": "/tmp", "LANG": "C", "LC_ALL": "C"},
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=True,
)
plan_lines = set(plan_cp.stdout.splitlines())
for line in (
    "VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V1",
    "mode=plan",
    "root_required_for_run=true",
    "exact_expected_head_required=true",
    "installed_generation_verification_required=true",
    "node_generation_binding_required=true",
    "checkout_generation_binding_required=true",
    "double_native_self_test_required=true",
    "native_self_test_execution=false",
    "runner_execution=false",
    "live_composition_execution=false",
    "credential_access=false",
    "private_key_access=false",
    "signing=false",
    "transaction=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
    "next_action=SEPARATELY_AUTHORIZE_EPOCH2_NATIVE_INSTALLED_READ_ONLY_QUALIFICATION",
):
    assert line in plan_lines, line

print("VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V1_PROOF_GREEN")
print("installer_source_blob_bound=true")
print("exact_installed_root_required=true")
print("expected_head_policy_binding_required=true")
print("node_generation_binding_required=true")
print("checkout_generation_binding_required=true")
print("double_native_self_test_required=true")
print("runner_execution=false")
print("live_composition_execution=false")
print("credential_access=false")
print("private_key_access=false")
print("signing=false")
print("transaction=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
