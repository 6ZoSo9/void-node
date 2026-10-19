#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import pathlib
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
BINDER = ROOT / "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v4.mjs"
PREENTRY = ROOT / "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v4.c"

BINDER_BLOB = "e93f917307ff12350a34395c6f87307232886ff9"
BINDER_SHA256 = "4c0f505403ca6cb0a788726d8daa1853acb39f13c1eb1c4943cc299bc8080dd5"
BINDER_BYTES = 43375
PREENTRY_BLOB = "026c59a1d7c389bcdf1a552de4828b7c1764743b"
RUNTIME_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"

CANDIDATE_REL = "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v4.json"
CANDIDATE_BLOB = "e569c9211e01f14c7c00dd1c5041d4dfb0817609"
DEPENDENCIES = {
    "ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v3r.py":
        "74c69fe8a95ed5f361a39971618f43f7c768c865",
    "ops/precision/void_buy_void_user_manager_credential_query_protected_replace_v3r.py":
        "98f8b9fda89e33c50e19008268d97655aad54e6d",
    "ops/precision/void_buy_void_user_manager_query_live_qualification_v6.py":
        "83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc",
    "ops/precision/void_buy_void_user_manager_query_protected_replace_v6.py":
        "f81d9fbead60593258d17dbb8720e1efc867b20f",
    "ops/security/buy-void-user-manager-credential-query-elf-lock-v3r.json":
        "c4870f3178aebc9a0bb6557562f663b8480cfefa",
    "ops/security/buy-void-user-manager-credential-query-elf-lock-v2.json":
        "b73415ce8fc95ff2d49cbde97a15d701ad5b7937",
    "ops/security/buy-void-user-manager-query-elf-lock-v6.json":
        "772945b639d138284fc18cc312f7b9115b10c748",
    "tools/void-buy-allocation-custody-host-evidence-v4.mjs":
        "223a8acf32f8c7961d61222b83c0db17075f86c6",
    "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs":
        "14cbe81e27d04fee77cbe75225ce308bf8561a7b",
}

def git_blob(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()

def git_text(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", *args],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
    )
    assert cp.returncode == 0, (args, cp.stdout, cp.stderr)
    assert cp.stderr == "", (args, cp.stderr)
    return cp.stdout.strip()

binder_raw = BINDER.read_bytes()
preentry_raw = PREENTRY.read_bytes()
assert git_blob(binder_raw) == BINDER_BLOB
assert hashlib.sha256(binder_raw).hexdigest() == BINDER_SHA256
assert len(binder_raw) == BINDER_BYTES
assert git_blob(preentry_raw) == PREENTRY_BLOB
binder = binder_raw.decode("ascii")
preentry = preentry_raw.decode("ascii")

for forbidden in (
    'const SOURCE_HEAD=',
    'const SOURCE_TREE=',
    'COMPAT_V3_BLOB',
    'FIXED_COMPAT_V3',
    'void_buy_void_presale_epoch2_installed_generation_host_evidence_v3.py',
    'source_runtime_added_path_count:15',
    ');\\n  console.log(',
    'NEXT_ACTIfunction',
    'VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V3";',
    '/^voide2livecomp3_',
    'RUNTIME_POLICY_SHA256',
    'protected_v6r2_generation_verified:true',
    'retained_v4_predecessor_verified:true',
):
    assert forbidden not in binder, forbidden

for required in (
    'VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V4',
    'RUN_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V4',
    'const CANONICAL_GIT_DIR=ROOT+"/.git";',
    '"--git-dir="+CANONICAL_GIT_DIR',
    '"--work-tree="+ROOT',
    '"-c","core.worktree="+ROOT',
    'GIT_NO_LAZY_FETCH:"1"',
    'GIT_PROTOCOL_FROM_USER:"0"',
    'GIT_ALLOW_PROTOCOL:""',
    'function requireActualObjectAncestry(',
    'gitFn(["cat-file","-t",oid])',
    'gitFn(["cat-file","-p",oid])',
    'function sourceCompatibility(',
    'SOURCE_RUNTIME_DEPENDENCY_SPECS.length!==9',
    'source_runtime_actual_object_ancestry:true',
    'source_runtime_complete_dependency_set_bound:true',
    'tracked_source_checkout_exact:true',
    'untracked_paths_enumerated:false',
    'untracked_paths_source_authority:false',
    'source_runtime_revision_walk_metadata_authority=false',
    'historical_compat_v3_source_authority=false',
    'const before=sourceCompatibility(runtimeHead);',
    'const after=sourceCompatibility(runtimeHead);',
    'source_generation_changed_across_sensitive_sequence',
    'binder_preentry_source_head_not_current',
    'voide2candbind3r4_',
    'VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V4',
    'AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V4_GREEN_SOURCE_RUNTIME_COMPATIBILITY_EXACT',
    '/^voide2livecomp4_[0-9a-f]{64}$/u',
    'source_checkout_head:compatibility.source_head',
    'source_checkout_tree:compatibility.source_tree',
    'child_runner_v4_receipt_bound:true',
    'child_runner_v4_source_checkout_bound:true',
    'const child=runNativeLive(runtimeHead,before);',
    'runner_v4_child_source_checkout_drift_rejected=true',
    'runtime_policy_authenticated_by_native_preentry:true',
    'runtime_policy_runtime_head:RUNTIME_HEAD',
    'runtime_policy_sha256_compile_constant_absent=true',
    'runtime_policy_authenticated_by_native_preentry_required=true',
    'native_parent_installed_generation_bound:true',
    'runner_v4_source_checkout_bound:true',
):
    assert required in binder, required

for relative, blob in DEPENDENCIES.items():
    assert git_text("rev-parse", f"{RUNTIME_HEAD}:{relative}") == blob
    assert git_text("rev-parse", f"HEAD:{relative}") == blob
assert git_text("rev-parse", f"HEAD:{CANDIDATE_REL}") == CANDIDATE_BLOB

for required in (
    'VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V4',
    'RUN_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V4',
    '#define BINDER_GIT_BLOB "' + BINDER_BLOB + '"',
    '#define BINDER_BYTES 43375U',
    'void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v4.mjs',
    'VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PARENT_PROOF_V4',
    '(char*)"--source-head",source_head',
    '(char*)"--runtime-head",policy.expected_head',
):
    assert required in preentry, required

node = shutil.which("node")
gcc = shutil.which("gcc")
assert node is not None
assert gcc is not None

cp = subprocess.run(
    [node, "--check", str(BINDER)],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert cp.returncode == 0, (cp.stdout, cp.stderr)
assert cp.stderr == "", cp.stderr

for mode in ("--self-test", "--plan"):
    cp = subprocess.run(
        [node, str(BINDER), mode],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
        env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C"},
    )
    assert cp.returncode == 0, (mode, cp.stdout, cp.stderr)
    assert cp.stderr == "", (mode, cp.stderr)
    lines = set(cp.stdout.splitlines())
    if mode == "--self-test":
        for line in (
            "VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V4_SELF_TEST_GREEN",
            "source_head_compile_constant_absent=true",
            "source_tree_compile_constant_absent=true",
            "source_head_runtime_observed=true",
            "source_tree_runtime_observed=true",
            "runtime_policy_head_preserved=true",
            "runtime_policy_sha256_compile_constant_absent=true",
            "runtime_policy_authenticated_by_native_preentry=true",
            "source_runtime_actual_object_ancestry_required=true",
            "source_runtime_graft_only_ancestry_rejected=true",
            "source_runtime_dependency_count=9",
            "source_runtime_complete_dependency_set_bound=true",
            "historical_compat_v3_source_authority=false",
            "runner_v4_child_receipt_required=true",
            "runner_v4_child_source_checkout_crosscheck=true",
            "runner_v4_child_source_checkout_drift_rejected=true",
            "transaction=false",
            "public_presale_activation=false",
            "funds_movement=false",
        ):
            assert line in lines, line
    else:
        for line in (
            "mode=plan",
            "source_head_runtime_observed=true",
            "source_tree_runtime_observed=true",
            "source_runtime_actual_object_ancestry_required=true",
            "source_runtime_revision_walk_metadata_authority=false",
            "source_runtime_dependency_count=9",
            "source_runtime_complete_dependency_set_bound=true",
            "tracked_source_checkout_exact_required=true",
            "untracked_paths_enumerated=false",
            "untracked_paths_source_authority=false",
            "historical_compat_v3_source_authority=false",
            "runner_v4_child_receipt_required=true",
            "runner_v4_child_source_checkout_crosscheck_required=true",
            "runtime_policy_sha256_compile_constant_absent=true",
            "runtime_policy_authenticated_by_native_preentry_required=true",
            "credential_content_access=false",
            "signing=false",
            "transaction=false",
            "payment_acceptance=false",
            "public_presale_activation=false",
            "funds_movement=false",
        ):
            assert line in lines, line

with tempfile.TemporaryDirectory(prefix="void-dormant-binding-v4-proof-") as td:
    binary = pathlib.Path(td) / "preentry"
    cp = subprocess.run(
        [gcc, "-std=c11", "-O2", "-Wall", "-Wextra", str(PREENTRY), "-o", str(binary)],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=60,
    )
    assert cp.returncode == 0, (cp.stdout, cp.stderr)
    cp = subprocess.run(
        [str(binary), "--self-test"],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=10,
    )
    assert cp.returncode == 0, (cp.stdout, cp.stderr)
    assert cp.stderr == "", cp.stderr
    lines = set(cp.stdout.splitlines())
    for line in (
        "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V4_SELF_TEST_GREEN",
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
        assert line in lines, line

print("VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V4_PROOF_GREEN")
print("binder_blob=" + BINDER_BLOB)
print("binder_sha256=" + BINDER_SHA256)
print("binder_bytes=" + str(BINDER_BYTES))
print("preentry_blob=" + PREENTRY_BLOB)
print("source_head_compile_constant_absent=true")
print("source_tree_compile_constant_absent=true")
print("source_head_runtime_observed=true")
print("source_tree_runtime_observed=true")
print("source_runtime_actual_object_ancestry_required=true")
print("source_runtime_graft_only_ancestry_rejected=true")
print("source_runtime_dependency_count=9")
print("source_runtime_complete_dependency_set_bound=true")
print("historical_compat_v3_source_authority=false")
print("runner_v4_child_receipt_required=true")
print("runner_v4_child_source_checkout_crosscheck_bound=true")
print("runner_v4_child_source_checkout_drift_rejected=true")
print("runtime_policy_sha256_compile_constant_absent=true")
print("runtime_policy_authenticated_by_native_preentry=true")
print("historical_generation_overclaim_absent=true")
print("native_preentry_binds_exact_binder_bytes=true")
print("host_execution=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
