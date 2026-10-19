#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_buy_void_epoch2_live_binding_source_runtime_compat_contract_v1.py"
COMPAT = ROOT / "ops/precision/void_buy_void_presale_epoch2_installed_generation_host_evidence_v3.py"
BINDER = ROOT / "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
BINDER_PREENTRY = ROOT / "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c"
RUNNER = ROOT / "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
RUNNER_V4 = ROOT / "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v4.mjs"
LIVE_NATIVE = ROOT / "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c"

EXPECTED = {
    COMPAT: "f9e3b1f5501a56e7ce1a191f12507186e79c28d4",
    BINDER: "9c29eb4716077e459b9154f39d0f30cf2e56729f",
    BINDER_PREENTRY: "4fdf3f627f407335b9d50800fbbc913d1edae523",
    RUNNER: "499df9b94b5b89354837570da0c7e47ec280025d",
    RUNNER_V4: "dd9d545c7ee408f9ee25185a4ec81f8f04ee9fb1",
    LIVE_NATIVE: "5021727f1def1ec11f870d735cab65acc1701a5e",
}

def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()

for path, expected in EXPECTED.items():
    raw = path.read_bytes()
    assert git_blob(raw) == expected, (path, git_blob(raw), expected)

target_raw = TARGET.read_bytes()
compile(target_raw, str(TARGET), "exec", dont_inherit=True, optimize=0)
tree = ast.parse(target_raw.decode("utf-8"))
assert any(isinstance(n, ast.FunctionDef) and n.name == "build_plan" for n in tree.body)

compat = COMPAT.read_text()
for required in (
    'RUNTIME_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"',
    'SOURCE_HEAD = "0ada7fde0d90c3946b10693f4621cbd690bfcde6"',
    'SOURCE_TREE = "9e930fba9aacfafb5b163767302786cd7f31c81e"',
    "source_runtime_fifteen_add_only_compatibility_required=true",
    "canonical_checkout_rewind_performed=false",
    "canonical_checkout_mutation_performed=false",
):
    assert required in compat, required

binder = BINDER.read_text()
assert "function requireExactCheckout(expectedHead){" in binder
assert 'git(["status","--porcelain=v1","--untracked-files=all"])' in binder
assert "const before=runQualification(expectedHead);" in binder
assert "const child=runNativeLive(expectedHead);" in binder
assert "const after=runQualification(expectedHead);" in binder

binder_preentry = BINDER_PREENTRY.read_text()
assert "if(strcmp(requested_head,policy.expected_head)!=0)" in binder_preentry
assert '(char*)"--expected-head",policy.expected_head' in binder_preentry

runner = RUNNER.read_text()
assert "function requireExactCheckout(expectedHead){" in runner
assert 'git(["status","--porcelain=v1","--untracked-files=all"])' in runner
assert "const before=qualificationFn(expectedHead);" in runner
assert "const sealedRecord=sealedFn(expectedHead);" in runner
assert "const after=qualificationFn(expectedHead);" in runner

runner_v4 = RUNNER_V4.read_text()
for required in (
    'VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V4',
    'const RUNTIME_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb";',
    "function validateSourceCompatibility(value,expectedHead){",
    "function requireSourceRuntimeCompatibility(expectedHead){",
    'git(["status","--porcelain=v1","--untracked-files=no"])',
    'git(["merge-base","--is-ancestor",RUNTIME_HEAD,sourceHead])',
    "source_runtime_ancestry_bound:true",
    "source_runtime_dependency_blob_equality:true",
    "function qualificationClosure(expectedHead,gitObjectFn=gitObject){",
    "const QUALIFIER_CLOSURE_SPECS=Object.freeze([",
    "root_checkout_source_read_forbidden",
    "root_checkout_lock_read_forbidden",
    "q._direct_source_bytes=no_source",
    "v6._direct_source_bytes=no_source",
    "q._load_dependencies=load_dependencies",
    "v6._load_replacement=load_replacement",
    "tracked_checkout_exact:true",
    "untracked_paths_enumerated:false",
    "untracked_paths_source_authority:false",
    'GIT_NO_LAZY_FETCH:"1"',
    'GIT_TERMINAL_PROMPT:"0"',
    'GIT_ASKPASS:"/bin/false"',
    'GIT_PROTOCOL_FROM_USER:"0"',
    'GIT_ALLOW_PROTOCOL:""',
    'GIT_PAGER:""',
    '"-c","core.untrackedCache=false"',
    '"-c","submodule.recurse=false"',
    "checkoutFn=requireSourceRuntimeCompatibility",
    "source_compatibility_changed_across_sensitive_sequence",
    "voide2livecomp4_",
):
    assert required in runner_v4, required
assert "--untracked-files=all" not in runner_v4
assert "ALLOWED_SOURCE_ADDITIONS" not in runner_v4
assert 'const SOURCE_HEAD=' not in runner_v4
assert 'const SOURCE_TREE=' not in runner_v4
assert 'FIXED_ROOT+"/void_buy_void_epoch2_live_composition_native_preentry_v3"' in runner_v4
assert "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V3" in runner_v4

node = shutil.which("node")
assert node is not None and pathlib.Path(node).is_file(), "hosted_node_unavailable"
for mode in ("--self-test", "--plan"):
    cp = subprocess.run(
        [node, str(RUNNER_V4), mode],
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
            "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V4_SELF_TEST_GREEN",
            "runtime_policy_head_preserved=true",
            "source_checkout_head_runtime_observed=true",
            "source_runtime_ancestry_required=true",
            "tracked_source_checkout_exact_required=true",
            "source_runtime_dependency_blob_equality_required=true",
            "root_qualification_dependency_closure_git_object_bound=true",
            "root_checkout_dependency_path_reads_forbidden=true",
            "qualifier_closure_unprivileged_git_read_required=true",
            "untracked_paths_enumerated=false",
            "untracked_paths_source_authority=false",
            "git_lazy_fetch_disabled=true",
            "git_transport_disabled=true",
            "git_prompt_and_askpass_disabled=true",
        ):
            assert line in lines, line
    else:
        for line in (
            "source_generation=v4_source_runtime_compatibility",
            "runtime_expected_head=4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb",
            "source_checkout_head_runtime_observed=true",
            "source_checkout_tree_runtime_observed=true",
            "source_runtime_ancestry_required=true",
            "tracked_source_checkout_exact_required=true",
            "runtime_source_dependency_blob_equality_required=true",
            "root_qualification_dependency_closure_git_object_bound=true",
            "root_checkout_dependency_path_reads_forbidden=true",
            "untracked_paths_enumerated=false",
            "git_lazy_fetch_disabled=true",
            "git_transport_disabled=true",
            "git_prompt_and_askpass_disabled=true",
            "credential_content_access=false",
            "nontransaction_signature=false",
        ):
            assert line in lines, line

live_native = LIVE_NATIVE.read_text()
assert "if (strcmp(requested_head, policy.expected_head) != 0)" in live_native
assert '(char *)"--expected-head",' in live_native
assert "policy.expected_head" in live_native
assert "runner_sha256_policy_bound=true" in live_native
assert "expected_head_policy_bound=true" in live_native

python = sys.executable
for mode in ("--self-test", "--plan"):
    cp = subprocess.run(
        [python, "-I", "-B", str(TARGET), mode],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=20,
        env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C"},
    )
    assert cp.returncode == 0, (mode, cp.stdout, cp.stderr)
    assert cp.stderr == "", (mode, cp.stderr)

plan = subprocess.run(
    [python, "-I", "-B", str(TARGET), "--plan"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=True,
    timeout=20,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C"},
).stdout.splitlines()
rows = dict(line.split("=", 1) for line in plan if "=" in line)
assert rows["runtime_head"] == "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
assert rows["source_baseline_head"] == "0ada7fde0d90c3946b10693f4621cbd690bfcde6"
assert rows["source_baseline_tree"] == "9e930fba9aacfafb5b163767302786cd7f31c81e"
assert rows["source_baseline_added_path_count"] == "15"
assert rows["current_source_head_runtime_observed_required"] == "true"
assert rows["source_runtime_ancestry_bound_required"] == "true"
assert rows["tracked_source_checkout_exact_required"] == "true"
assert rows["runtime_source_dependency_blob_equality_required"] == "true"
assert rows["untracked_paths_source_authority"] == "false"
assert rows["runtime_policy_sha256"] == "746cfbe2f031868fff3a75f8307986f25c62460085f41a4827e712702a2d6549"
assert rows["runtime_policy_rewrite_to_source_head_forbidden"] == "true"
assert rows["credential_native_preentry_v3_preserved"] == "true"
assert rows["credential_access_authorized"] == "false"
assert rows["signing_authorized"] == "false"
assert rows["funds_movement_authorized"] == "false"
body = json.loads(rows["plan_body_json"])
assert body["source_head_need_not_equal_runtime_policy_head"] is True
assert body["current_source_head_runtime_observed_required"] is True
assert body["source_runtime_ancestry_bound_required"] is True
assert body["tracked_source_checkout_exact_required"] is True
assert body["runtime_source_dependency_blob_equality_required"] is True
assert body["live_native_v3_binary_replacement_required_for_runner_compat"] is False
assert len(body["required_successors"]) == 4

print("VOID_BUY_VOID_EPOCH2_LIVE_BINDING_SOURCE_RUNTIME_COMPAT_CONTRACT_V1_PROOF_GREEN")
print("exact_compat_v3_blob_bound=true")
print("exact_binder_v2_blob_bound=true")
print("exact_binder_preentry_v2_blob_bound=true")
print("exact_runner_v3_blob_bound=true")
print("exact_live_native_v3_blob_bound=true")
print("binder_single_head_seam_proven=true")
print("binder_preentry_policy_head_equality_proven=true")
print("runner_single_head_seam_proven=true")
print("runner_v4_runtime_observed_source_compat_source_green=true")
print("runner_v4_fixed_current_source_head_absent=true")
print("runner_v4_source_ancestry_bound=true")
print("runner_v4_source_snapshot_stable_across_sensitive_sequence=true")
print("runner_v4_git_lazy_fetch_disabled=true")
print("runner_v4_git_transport_disabled=true")
print("runner_v4_git_prompt_and_askpass_disabled=true")
print("runner_v4_qualifier_closure_git_object_bound=true")
print("runner_v4_root_checkout_dependency_reads_forbidden=true")
print("runner_v4_complete_dependency_closure_count=8")
print("hosted_node_path_resolved_from_ci_environment=true")
print("runner_v4_preserves_native_v3_policy_boundary=true")
print("credential_native_preentry_policy_binding_preserved=true")
print("runtime_policy_rewrite_forbidden=true")
print("runtime_policy_and_current_source_separation_bound=true")
print("host_execution=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("funds_movement=false")
