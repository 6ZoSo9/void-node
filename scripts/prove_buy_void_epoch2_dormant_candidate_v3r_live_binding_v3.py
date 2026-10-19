#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BINDER = ROOT / "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v3.mjs"
NATIVE = ROOT / "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v3.c"
COMPAT_V3 = ROOT / "ops/precision/void_buy_void_presale_epoch2_installed_generation_host_evidence_v3.py"
COMPAT_V2 = ROOT / "ops/precision/void_buy_void_presale_epoch2_installed_generation_host_evidence_v2.py"
COMPAT_V1 = ROOT / "ops/precision/void_buy_void_presale_epoch2_installed_generation_host_evidence_v1.py"

BINDER_BLOB = "bf45a1d4aea6c788d9baa5e481491aedab621e38"
NATIVE_BLOB = "95131a524a42d4e0bf548af8ffd2cc6dc04974e2"
COMPAT_V3_BLOB = "f9e3b1f5501a56e7ce1a191f12507186e79c28d4"
COMPAT_V2_BLOB = "a00fe6b094e97eb5c8bcf0eeb630d0d39e3498e2"
COMPAT_V1_BLOB = "6b2bf387bff5e5cd6ada048fd5c8fe4d28d66577"

SOURCE_HEAD = "0ada7fde0d90c3946b10693f4621cbd690bfcde6"
RUNTIME_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
RUNTIME_POLICY_SHA256 = "746cfbe2f031868fff3a75f8307986f25c62460085f41a4827e712702a2d6549"
CONFIRM = "RUN_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V3"

def git_blob(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()

def run(argv: list[str], *, input_text: str | None = None, timeout: int = 30) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        argv,
        input=input_text,
        stdin=subprocess.PIPE if input_text is not None else subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="strict",
        cwd=ROOT,
        env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C", "TZ": "UTC"},
        timeout=timeout,
        check=False,
    )

binder_raw = BINDER.read_bytes()
native_raw = NATIVE.read_bytes()
assert git_blob(binder_raw) == BINDER_BLOB
assert git_blob(native_raw) == NATIVE_BLOB
assert git_blob(COMPAT_V3.read_bytes()) == COMPAT_V3_BLOB
assert git_blob(COMPAT_V2.read_bytes()) == COMPAT_V2_BLOB
assert git_blob(COMPAT_V1.read_bytes()) == COMPAT_V1_BLOB
assert len(binder_raw) == 39086
assert len(native_raw) == 20700
assert hashlib.sha256(binder_raw).hexdigest() == "ed493ca65805f5e6549569a2d02d4e3d7e7178436c6a266fc89cceea69b1d30f"

binder = binder_raw.decode("utf-8")
native = native_raw.decode("utf-8")

for required in (
    'const SOURCE_HEAD="' + SOURCE_HEAD + '";',
    'const RUNTIME_HEAD="' + RUNTIME_HEAD + '";',
    'const RUNTIME_POLICY_SHA256=',
    '"746cfbe2f031868fff3a75f8307986f25c62460085f41a4827e712702a2d6549";',
    'const COMPAT_V3_BLOB="' + COMPAT_V3_BLOB + '";',
    'const COMPAT_V3_BYTES=27024;',
    "function validateQualification(q,sourceHead,runtimeHead){",
    "function runQualification(sourceHead,runtimeHead){",
    "function runNativeLive(runtimeHead){",
    "const candidate=loadCandidate(sourceHead);",
    "const before=runQualification(sourceHead,runtimeHead);",
    "const child=runNativeLive(runtimeHead);",
    "const after=runQualification(sourceHead,runtimeHead);",
    "revalidateBinderPreentry(binderProof,sourceHead,runtimeHead);",
    'binding_receipt_id:',
    '"voide2candbind3r3_"+sha256',
    "source_runtime_add_only_compatibility_exact:true",
    "runtime_policy_sha256:qualification.policy_sha256",
    'credential_or_wallet_access:false',
    'transaction_signing:false',
    'transaction_broadcast:false',
    'public_presale_activation:false',
    'wc_void_market_activation:false',
    'funds_movement:false',
):
    assert required in binder, required

for forbidden in (
    "function live(expectedHead,confirm)",
    "function runNativeLive(expectedHead)",
    "runQualification(expectedHead)",
    "binder_preentry_expected_head_proof_mismatch",
    'next_action=SEPARATELY_AUTHORIZE_EPOCH2_V3R_DORMANT_CANDIDATE_LIVE_BINDING"',
):
    assert forbidden not in binder, forbidden

live_at = binder.index("function live(sourceHead,runtimeHead,confirm){")
preentry_at = binder.index("const binderProof=requireBinderPreentry(sourceHead,runtimeHead);", live_at)
checkout1_at = binder.index("requireExactCheckout(sourceHead);", preentry_at)
candidate_at = binder.index("const candidate=loadCandidate(sourceHead);", checkout1_at)
before_at = binder.index("const before=runQualification(sourceHead,runtimeHead);", candidate_at)
child_at = binder.index("const child=runNativeLive(runtimeHead);", before_at)
after_at = binder.index("const after=runQualification(sourceHead,runtimeHead);", child_at)
checkout2_at = binder.index("requireExactCheckout(sourceHead);", after_at)
revalidate_at = binder.index("revalidateBinderPreentry(binderProof,sourceHead,runtimeHead);", checkout2_at)
assert live_at < preentry_at < checkout1_at < candidate_at < before_at < child_at < after_at < checkout2_at < revalidate_at

for required in (
    '#define MARKER "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V3"',
    '#define FIXED_ROOT "/opt/void-buy-void-epoch2-dormant-v3r-binding-v3"',
    '#define CONFIRM "' + CONFIRM + '"',
    '#define PROOF_SCHEMA "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PARENT_PROOF_V3"',
    '#define BINDER_GIT_BLOB "' + BINDER_BLOB + '"',
    "#define BINDER_BYTES 39086U",
    "static void parse_args(int argc,char**argv,char source_head[41],char runtime_head[41])",
    'strcmp(argv[4],"--source-head")',
    'strcmp(argv[6],"--runtime-head")',
    'hold("binder_preentry_runtime_head_policy_mismatch")',
    '"source_head":',
    '"runtime_head":',
    '(char*)"--source-head",source_head',
    '(char*)"--runtime-head",policy.expected_head',
    "emit_proof(proof_pipe[1],child,source_head,policy.expected_head",
    'puts("source_runtime_two_head_contract=true")',
    'puts("runtime_policy_head_separate_from_source_head=true")',
):
    assert required in native, required

for forbidden in (
    "binder_preentry_expected_head_policy_mismatch",
    '(char*)"--expected-head",policy.expected_head',
    "#define BINDER_BYTES 39391U",
    "9c29eb4716077e459b9154f39d0f30cf2e56729f",
):
    assert forbidden not in native, forbidden

node = os.environ.get("NODE", "/usr/bin/node")
cc = os.environ.get("CC", "/usr/bin/cc")

syntax = run([node, "--check", str(BINDER)])
assert syntax.returncode == 0, syntax.stderr
assert syntax.stderr == ""

selftest = run([node, str(BINDER), "--self-test"])
assert selftest.returncode == 0, selftest.stderr or selftest.stdout
assert selftest.stderr == ""
self_lines = set(selftest.stdout.splitlines())
for line in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V3_SELF_TEST_GREEN",
    "source_runtime_two_head_contract=true",
    "source_head_exact=true",
    "runtime_head_exact=true",
    "runtime_policy_head_preserved=true",
    "compatibility_v3_installed_source_required=true",
    "native_binder_first_entry_required_for_live=true",
    "binder_parent_proof_binds_source_and_runtime_heads=true",
    "runtime_native_receives_runtime_policy_head_only=true",
    "canonical_checkout_rewind_performed=false",
    "installed_policy_mutation=false",
    "customer_safe_to_pay=false",
    "transaction=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "funds_movement=false",
):
    assert line in self_lines, line

plan = run([node, str(BINDER), "--plan"])
assert plan.returncode == 0, plan.stderr or plan.stdout
assert plan.stderr == ""
plan_lines = set(plan.stdout.splitlines())
for line in (
    "mode=plan",
    "source_runtime_two_head_contract=true",
    "source_head=" + SOURCE_HEAD,
    "runtime_head=" + RUNTIME_HEAD,
    "runtime_policy_sha256=" + RUNTIME_POLICY_SHA256,
    "binder_parent_proof_binds_source_and_runtime_heads=true",
    "source_runtime_compatibility_qualification_before_after_required=true",
    "runtime_native_receives_runtime_policy_head_only=true",
    "canonical_checkout_rewind_performed=false",
    "installed_policy_mutation=false",
    "credential_content_access=false",
    "private_key_access=false",
    "signing=false",
    "transaction=false",
    "payment_acceptance=false",
    "customer_safe_to_pay=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
    "next_action=SEPARATELY_AUTHORIZE_EPOCH2_V3R_DORMANT_CANDIDATE_LIVE_BINDING_V3",
):
    assert line in plan_lines, line

direct = run([
    node, str(BINDER), "--run", "--confirm", CONFIRM,
    "--source-head", SOURCE_HEAD, "--runtime-head", RUNTIME_HEAD,
])
assert direct.returncode == 2, direct.stdout + direct.stderr
assert "binder_native_first_entry_required" in direct.stderr
assert '"transaction_constructed": false' in direct.stderr
assert '"payment_acceptance": false' in direct.stderr
assert '"funds_movement": false' in direct.stderr

stdin_live = run([
    node, "--input-type=module", "-", "--run", "--confirm", CONFIRM,
    "--source-head", SOURCE_HEAD, "--runtime-head", RUNTIME_HEAD,
], input_text=binder)
assert stdin_live.returncode == 2, stdin_live.stdout + stdin_live.stderr
assert "binder_native_parent_marker_required" in stdin_live.stderr
assert '"transaction_constructed": false' in stdin_live.stderr
assert '"funds_movement": false' in stdin_live.stderr

with tempfile.TemporaryDirectory(prefix="void-e2-v3r-two-head-preentry-") as td:
    binary = Path(td) / "preentry"
    build = run([
        cc, "-std=c11", "-O2", "-Wall", "-Wextra", "-Werror",
        str(NATIVE), "-o", str(binary),
    ])
    assert build.returncode == 0, build.stderr

    native_self = run([str(binary), "--self-test"])
    assert native_self.returncode == 0, native_self.stderr or native_self.stdout
    assert native_self.stderr == ""
    native_lines = set(native_self.stdout.splitlines())
    for line in (
        "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V3_SELF_TEST_GREEN",
        "native_first_instruction=true",
        "fixed_self_path=true",
        "fixed_binder_path=true",
        "binder_exact_sha256_bound=true",
        "binder_git_blob_provenance_bound=true",
        "private_parent_proof_channel=true",
        "source_runtime_two_head_contract=true",
        "runtime_policy_head_separate_from_source_head=true",
        "credential_content_access=false",
        "transaction=false",
        "public_presale_activation=false",
        "funds_movement=false",
    ):
        assert line in native_lines, line

    pre = run([str(binary), "--self-test-hold-pre-source"])
    assert pre.returncode == 2
    assert "binder_source_release_started=false" in pre.stderr
    assert "credential_content_access=false" in pre.stderr
    assert "private_key_access=false" in pre.stderr
    assert "signing=false" in pre.stderr
    assert "unproven_after_binder_source_release" not in pre.stderr

    post = run([str(binary), "--self-test-hold-post-source"])
    assert post.returncode == 2
    assert "binder_source_release_started=true" in post.stderr
    assert "credential_content_access=unproven_after_binder_source_release" in post.stderr
    assert "private_key_access=unproven_after_binder_source_release" in post.stderr
    assert "signing=unproven_after_binder_source_release" in post.stderr
    assert "credential_content_access=false" not in post.stderr

print("VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V3_PROOF_GREEN")
print("binder_blob_bound=true")
print("native_preentry_blob_bound=true")
print("compat_v3_v2_v1_blobs_bound=true")
print("source_runtime_two_head_contract=true")
print("source_head_candidate_authentication_bound=true")
print("runtime_head_policy_qualification_bound=true")
print("runtime_native_receives_runtime_policy_head_only=true")
print("binder_parent_proof_binds_source_and_runtime_heads=true")
print("native_first_entry_preserved=true")
print("direct_worktree_live_rejected=true")
print("stdin_without_native_parent_rejected=true")
print("pre_source_sensitive_authority_false=true")
print("post_source_sensitive_authority_unproven=true")
print("customer_safe_to_pay=false")
print("transaction=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
