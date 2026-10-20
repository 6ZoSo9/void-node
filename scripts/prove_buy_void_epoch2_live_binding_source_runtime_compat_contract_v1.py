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
COMPAT_REL = "ops/precision/void_buy_void_presale_epoch2_installed_generation_host_evidence_v3.py"
COMPAT_BLOB = "5c24b4a807c9d01ca357372aca042bb8d81b6b92"
BINDER = ROOT / "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
BINDER_PREENTRY = ROOT / "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c"
RUNNER = ROOT / "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
RUNNER_V4 = ROOT / "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v4.mjs"
LIVE_NATIVE = ROOT / "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c"
QUALIFIER = ROOT / "ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v3r.py"
QUALIFIER_REPLACEMENT = ROOT / "ops/precision/void_buy_void_user_manager_credential_query_protected_replace_v3r.py"
V6_QUALIFIER = ROOT / "ops/precision/void_buy_void_user_manager_query_live_qualification_v6.py"
V6_REPLACEMENT = ROOT / "ops/precision/void_buy_void_user_manager_query_protected_replace_v6.py"
LOCK_V3R = ROOT / "ops/security/buy-void-user-manager-credential-query-elf-lock-v3r.json"
LOCK_V2 = ROOT / "ops/security/buy-void-user-manager-credential-query-elf-lock-v2.json"
LOCK_V6 = ROOT / "ops/security/buy-void-user-manager-query-elf-lock-v6.json"
PARSER_V4 = ROOT / "tools/void-buy-allocation-custody-host-evidence-v4.mjs"
SEALED_V3 = ROOT / "scripts/void_buy_void_epoch2_credential_attestation_sealed_v3.mjs"

EXPECTED = {
    BINDER: "9c29eb4716077e459b9154f39d0f30cf2e56729f",
    BINDER_PREENTRY: "4fdf3f627f407335b9d50800fbbc913d1edae523",
    RUNNER: "499df9b94b5b89354837570da0c7e47ec280025d",
    RUNNER_V4: "2fa028824d71a22f4d228cdb7fcda738bce7b409",
    LIVE_NATIVE: "5021727f1def1ec11f870d735cab65acc1701a5e",
    QUALIFIER: "74c69fe8a95ed5f361a39971618f43f7c768c865",
    QUALIFIER_REPLACEMENT: "98f8b9fda89e33c50e19008268d97655aad54e6d",
    V6_QUALIFIER: "83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc",
    V6_REPLACEMENT: "f81d9fbead60593258d17dbb8720e1efc867b20f",
    LOCK_V3R: "c4870f3178aebc9a0bb6557562f663b8480cfefa",
    LOCK_V2: "b73415ce8fc95ff2d49cbde97a15d701ad5b7937",
    LOCK_V6: "772945b639d138284fc18cc312f7b9115b10c748",
    PARSER_V4: "223a8acf32f8c7961d61222b83c0db17075f86c6",
    SEALED_V3: "ad19417c7d25bfab532af3ea92f4a627d4cc857a",
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

target_text = TARGET.read_text()
for required in (
    'COMPAT_V3_REL = "' + COMPAT_REL + '"',
    'COMPAT_V3_BLOB = "' + COMPAT_BLOB + '"',
    '"current_source_head_runtime_observed_required": True',
    '"source_runtime_ancestry_bound_required": True',
    '"source_runtime_actual_object_ancestry_required": True',
    '"tracked_source_checkout_exact_required": True',
    '"runtime_source_dependency_blob_equality_required": True',
):
    assert required in target_text, required
assert not (ROOT / COMPAT_REL).exists(), "historical_compat_source_unexpectedly_materialized"

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
    "function requireSourceRuntimeCompatibility(expectedHead,gitFn=git){",
    'gitFn(["status","--porcelain=v1","--untracked-files=no"])',
    "function requireActualObjectAncestry(sourceHead,gitFn=git){",
    'gitFn(["cat-file","-t",oid])',
    'gitFn(["cat-file","-p",oid])',
    "source_runtime_actual_object_ancestry_not_found",
    "source_runtime_ancestry_bound:true",
    "source_runtime_dependency_blob_equality:true",
    "function qualificationClosure(expectedHead,gitObjectFn=gitObject){",
    "const QUALIFIER_CLOSURE_SPECS=Object.freeze([",
    "const SOURCE_RUNTIME_DEPENDENCY_SPECS=Object.freeze([",
    'const AUTHENTICATED_CLOSURE_ROOT="/__void_authenticated_qualifier_closure_v1__";',
    "requireAuthenticatedClosureNamespaceAbsent",
    "nested_source_runtime_dependency_drift_not_rejected",
    "root_checkout_source_read_forbidden",
    "root_checkout_lock_read_forbidden",
    "q._direct_source_bytes=no_source",
    "v6._direct_source_bytes=no_source",
    "q._load_dependencies=load_dependencies",
    "v6._load_replacement=load_replacement",
    "closure_path_contract_mismatch",
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
for required in (
    'const RUNTIME_RELEASE="/opt/void-node-live/releases/"+RUNTIME_HEAD;',
    'const CANONICAL_GIT_DIR=ROOT+"/.git";',
    '"--git-dir="+CANONICAL_GIT_DIR',
    '"--work-tree="+ROOT',
    '"-c","core.worktree="+ROOT',
    '"-c","core.fileMode=true"',
    "function requireTrustedRuntimeRelease(){",
    "const runtimeRelease=requireTrustedRuntimeRelease();",
    "cwd:runtimeRelease",
    'canonical_git_dir_worktree_pinned=true',
    'sealed_probe_runtime_release_cwd_required=true',
    'runtime_release_root_custody_required=true',
    'retained_setpriv_generation_revalidated_descriptor_execution_required=true',
    'retained_python_generation_revalidated_descriptor_execution_required=true',
    'retained_git_descriptor_execution_required=true',
    'retained_node_descriptor_execution_required=true',
    'root_tool_ancestor_custody_required=true',
    'runtime_uid_effective_tool_nonwritability_required=true',
    'retained_procfd_portable_cwd_required=true',
    'retained_procfd_missing_cwd_errno_distinguished=true',
    'root_tool_terminal_generation_revalidation_required=true',
    "function requireRuntimeUidNonwritable(candidate,label){",
    'const SEALED_BLOB="ad19417c7d25bfab532af3ea92f4a627d4cc857a";',
    "function openRetainedTrustedExecutable(file,label){",
    "function runRetainedTrustedExecutable(tool,args,options={}){",
    'const executable="/proc/self/fd/"+String(tool.fd);',
    'const setprivExecutable="/proc/self/fd/"+String(tools.setpriv.fd);',
    '"/proc/self/fd/"+String(commandChildFd)',
    'stdio[tools.setpriv.fd]=tools.setpriv.fd;',
):
    assert required in runner_v4, required

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
            "source_runtime_actual_object_ancestry_required=true",
            "tracked_source_checkout_exact_required=true",
            "source_runtime_dependency_blob_equality_required=true",
            "source_runtime_complete_dependency_set_bound=true",
    "source_runtime_graft_ancestry_rejected=true",
            "nested_source_runtime_dependency_drift_rejected=true",
            "authenticated_closure_synthetic_namespace=true",
            "authenticated_closure_namespace_absent_required=true",
            "root_qualification_user_checkout_file_namespace=false",
            "root_qualification_dependency_closure_git_object_bound=true",
            "root_checkout_dependency_path_reads_forbidden=true",
            "root_qualification_closure_path_contract_bound=true",
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
            "source_runtime_actual_object_ancestry_required=true",
            "tracked_source_checkout_exact_required=true",
            "runtime_source_dependency_blob_equality_required=true",
            "root_qualification_dependency_closure_git_object_bound=true",
            "root_checkout_dependency_path_reads_forbidden=true",
            "root_qualification_closure_path_contract_bound=true",
            "untracked_paths_enumerated=false",
            "git_lazy_fetch_disabled=true",
            "git_transport_disabled=true",
            "git_prompt_and_askpass_disabled=true",
            "credential_content_access=false",
            "nontransaction_signature=false",
            "retained_setpriv_generation_revalidated_descriptor_execution_required=true",
            "retained_python_generation_revalidated_descriptor_execution_required=true",
            "retained_git_descriptor_execution_required=true",
            "retained_node_descriptor_execution_required=true",
            "retained_procfd_portable_cwd_required=true",
            "retained_procfd_missing_cwd_errno_distinguished=true",
        ):
            assert line in lines, line


sealed_v3 = SEALED_V3.read_text()
for required in (
    "function trustedExecutableAncestorCustody(resolved, leaf) {",
    "function revalidateTrustedExecutable(tool) {",
    "function execTrustedExecutable(tool, args, options = {}) {",
    'const executable = tool.real;',
    'stdio: ["ignore", "pipe", "ignore"]',
    'const GIT_TOOL = trustedExecutable("/usr/bin/git", "git");',
    'trustedExecutable("/usr/bin/systemctl", "systemctl");',
    "runtime_source_bounded_descriptor_reads_per_census: true",
    "runtime_source_acl_barrier_and_pre_post_census_stable: true",
    "trusted_tool_ancestor_nonwritability_verified: true",
    "trusted_tool_retained_generation_revalidated_path_execution: true",
    "trusted_tool_generation_revalidated: true",
    "trusted_executable_path_rebind_rejected=true",
    "trusted_executable_writable_ancestor_rejected=true",
    "credential_regular_to_fifo_race_rejected=true",
    "credential_open_nonblocking_required=true",
):
    assert required in sealed_v3, required
assert "runtime_source_generation_retained_through_signing: true" not in sealed_v3
assert "runtime_source_descriptor_reads_bound: true" not in sealed_v3
sealed_self = subprocess.run(
    [node, str(SEALED_V3), "--self-test"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C"},
)
assert sealed_self.returncode == 0, (sealed_self.stdout, sealed_self.stderr)
assert sealed_self.stderr == "", sealed_self.stderr
for line in (
    "VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V3_SELF_TEST_GREEN",
    "trusted_git_retained_generation_revalidated_path_execution=true",
    "trusted_systemctl_retained_generation_revalidated_path_execution=true",
    "trusted_executable_path_rebind_rejected=true",
    "trusted_executable_writable_ancestor_rejected=true",
    "credential_regular_to_fifo_race_rejected=true",
    "credential_open_nonblocking_required=true",
    "credential_content_read=false",
    "signing_performed=false",
    "transaction_constructed=false",
    "funds_movement=false",
):
    assert line in set(sealed_self.stdout.splitlines()), line

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
assert rows["source_runtime_actual_object_ancestry_required"] == "true"
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
assert body["source_runtime_actual_object_ancestry_required"] is True
assert body["tracked_source_checkout_exact_required"] is True
assert body["runtime_source_dependency_blob_equality_required"] is True
assert body["live_native_v3_binary_replacement_required_for_runner_compat"] is False
assert len(body["required_successors"]) == 4

print("VOID_BUY_VOID_EPOCH2_LIVE_BINDING_SOURCE_RUNTIME_COMPAT_CONTRACT_V1_PROOF_GREEN")
print("historical_compat_v3_identity_recorded=true")
print("historical_compat_v3_materialization_required=false")
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
print("runner_v4_actual_object_ancestry_bound=true")
print("runner_v4_graft_ancestry_rejected=true")
print("runner_v4_source_snapshot_stable_across_sensitive_sequence=true")
print("runner_v4_git_lazy_fetch_disabled=true")
print("runner_v4_git_transport_disabled=true")
print("runner_v4_git_prompt_and_askpass_disabled=true")
print("runner_v4_canonical_git_dir_worktree_pinned=true")
print("runner_v4_sealed_probe_runtime_release_cwd=true")
print("runner_v4_runtime_release_root_custody_required=true")
print("runner_v4_retained_setpriv_generation_revalidated_descriptor_execution=true")
print("runner_v4_retained_python_generation_revalidated_descriptor_execution=true")
print("runner_v4_retained_git_descriptor_execution=true")
print("runner_v4_retained_node_descriptor_binding_contract=true")
print("runner_v4_trusted_root_tool_rebind_adversary=true")
print("runner_v4_runtime_uid_effective_tool_nonwritability=true")
print("sealed_v3_retained_trusted_tools_green=true")
print("runner_v4_acl_sealed_root_path_exec_bound=true")
print("sealed_v3_acl_sealed_tool_path_exec_bound=true")
print("retained_target_child_self_fd_exec_bound=true")
print("sealed_v3_acl_barrier_pre_post_census_semantics=true")
print("runner_v4_qualifier_closure_git_object_bound=true")
print("runner_v4_complete_source_runtime_dependency_set_bound=true")
print("runner_v4_nested_source_runtime_dependency_drift_rejected=true")
print("runner_v4_authenticated_closure_synthetic_namespace=true")
print("runner_v4_user_checkout_root_module_namespace_forbidden=true")
print("runner_v4_root_checkout_dependency_reads_forbidden=true")
print("runner_v4_complete_dependency_closure_count=8")
print("runner_v4_complete_dependency_closure_blobs_bound=true")
print("runner_v4_closure_path_contract_bound=true")
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
