#!/usr/bin/env python3
from __future__ import annotations

import ast
import contextlib
import hashlib
import io
import json
from pathlib import Path
import subprocess
import types

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW_REL = (
    ".github/workflows/"
    "buy-void-epoch2-dormant-first-entry-protected-installer-"
    "bootstrap-plan-v7.yml"
)
EXACT_PARENT = "d5e535aa83a94002dbe732e0da2d47feddf434bf"

TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_plan_v7.py"
)
TARGET_BLOB = "ea276889645376bfa16c2dfac6b0e48d81cab42d"

PREDECESSOR_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_plan_v6.py"
)
PREDECESSOR_BLOB = "7c3ad1188fca114188a8f9876c7a1b7390280b56"
PREDECESSOR_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_plan_v6.py"
)
PREDECESSOR_PROOF_BLOB = "2c2c988891bfacf3d8cf937551a2971ca8a6e5fb"

QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_repaired_installed_qualification_v1.py"
)
QUALIFIER_BLOB = "a9cee971d3fd088821124b1349179fdd1cb27516"

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V7"
)
EXPECTED_HEAD = "a" * 40

EXPECTED_BOOTSTRAP_LOCK = (
    "voidbuye2dormantbootstraplock3_"
    "4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396"
)
EXPECTED_BOOTSTRAP_CANDIDATE = (
    "voidbuye2dormantbootstrapcand3_"
    "1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2"
)
EXPECTED_BOOTSTRAP_SHA256 = (
    "618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c"
)
EXPECTED_BOOTSTRAP_BLOB = "b577d70666f98ac59a75b84b3dab741fe7b93a4b"
EXPECTED_MANIFEST_SHA256 = (
    "8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9"
)
EXPECTED_GREEN_STATE = "PROTECTED_BOOTSTRAP_V6_REPAIRED_GREEN_WITH_PREDECESSOR"
EXPECTED_LAUNCHER_SHA256 = (
    "4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28"
)
EXPECTED_NATIVE_SHA256 = (
    "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
)

GIT_ENV = {
    "PATH": "/usr/bin:/bin",
    "HOME": "/nonexistent",
    "LANG": "C",
    "LC_ALL": "C",
    "TZ": "UTC",
    "GIT_CONFIG_NOSYSTEM": "1",
    "GIT_CONFIG_GLOBAL": "/dev/null",
    "GIT_CONFIG_SYSTEM": "/dev/null",
    "GIT_NO_REPLACE_OBJECTS": "1",
    "GIT_OPTIONAL_LOCKS": "0",
    "GIT_TERMINAL_PROMPT": "0",
}


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def git(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=20,
        env=GIT_ENV,
    )
    if cp.returncode != 0 or cp.stderr:
        raise AssertionError("git_failed:" + ":".join(args))
    return cp.stdout.strip()


def pin(relative: str, expected: str) -> bytes:
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, (relative, git_blob(raw), expected)
    assert git("rev-parse", "HEAD:" + relative) == expected, relative
    return raw


def function_sources(source: str) -> dict[str, str]:
    tree = ast.parse(source)
    result: dict[str, str] = {}
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            segment = ast.get_source_segment(source, node)
            assert segment is not None
            result[node.name] = segment
    return result


target_raw = pin(TARGET_REL, TARGET_BLOB)
predecessor_raw = pin(PREDECESSOR_REL, PREDECESSOR_BLOB)
pin(PREDECESSOR_PROOF_REL, PREDECESSOR_PROOF_BLOB)
qualifier_raw = pin(QUALIFIER_REL, QUALIFIER_BLOB)

workflow_source = (ROOT / WORKFLOW_REL).read_text("utf-8")
assert workflow_source.count('base="' + EXACT_PARENT + '"') == 2
assert 'pull_request)' in workflow_source
assert 'workflow_dispatch)' in workflow_source
assert 'base="$PR_BASE"' not in workflow_source
assert 'PR_BASE:' not in workflow_source
assert 'EXPECTED_HEAD^1' not in workflow_source
assert 'git rev-parse "$EXPECTED_HEAD^1"' not in workflow_source

target_source = target_raw.decode("utf-8", "strict")
predecessor_source = predecessor_raw.decode("utf-8", "strict")
compile(target_source, TARGET_REL, "exec", dont_inherit=True, optimize=0)

target_functions = function_sources(target_source)
predecessor_functions = function_sources(predecessor_source)

# V7 is allowed to change only qualifier-facing/planning functions. Everything
# below is inherited hardened V6 machinery and must remain exact.
unchanged_functions = (
    "sha256",
    "git_blob",
    "canonical",
    "_safe_relative_path",
    "_git_read_allowed",
    "git_bytes",
    "git",
    "_listing_records",
    "_parse_tree",
    "_parse_index",
    "_metadata",
    "_directory_identity",
    "_open_checkout_root",
    "repository_blob",
    "stable_artifact",
    "_safe_tool",
    "_checkout_refs",
    "checkout_snapshot",
    "source_dependencies",
    "plan_id_for_body",
)
for name in unchanged_functions:
    assert name in target_functions and name in predecessor_functions, name
    assert target_functions[name] == predecessor_functions[name], (
        "inherited_function_drift",
        name,
    )

for required in (
    "PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V7",
    "voidbuye2protectedbootstrapplan7_",
    QUALIFIER_BLOB,
    '"version": 7',
    '"nonroot_execution_required": True',
    '"root_execution_required": False',
    '"protected_state_read_only_required": True',
    '"temporary_git_metadata_write_required": True',
    '"temporary_git_metadata_cleanup_required": True',
    '"filesystem_write": True',
    '"protected_filesystem_mutation": False',
    '"bootstrap_execution": False',
    '"inner_installer_execution": False',
    '"bootstrap_execution_performed": False',
    '"protected_installer_apply_performed": False',
    '"--installer-plan"',
    '"--launcher"',
    '"--native"',
    '"--expected-head"',
    "qualification_contract_json=",
    "bootstrap_argv_json=",
    "plan_body_json=",
):
    assert required in target_source, required

for forbidden in (
    "bootstrap_installed_qualification_v6.py",
    "5f7321725b306184567111c0a7831d08243ad052",
    '"root_execution_required": True',
    '"bootstrap_self_test_execution": True',
    '"bootstrap_self_test_count": 2',
    "qualifier.collect(",
    "--installer-apply",
    "sudo",
    "os.system(",
    "os.execv",
    "os.execve",
    "os.fexecve",
):
    assert forbidden not in target_source, forbidden

module = types.ModuleType("void_e2_repaired_plan_v7_fixture")
module.__file__ = str(ROOT / TARGET_REL)
module.__package__ = None
exec(
    compile(target_source, TARGET_REL, "exec", dont_inherit=True, optimize=0),
    module.__dict__,
)

qualifier = types.ModuleType("void_e2_repaired_qualifier_fixture")
qualifier.__file__ = str(ROOT / QUALIFIER_REL)
qualifier.__package__ = None
exec(
    compile(qualifier_raw, QUALIFIER_REL, "exec", dont_inherit=True, optimize=0),
    qualifier.__dict__,
)

assert qualifier.MARKER == (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_BOOTSTRAP_V6_REPAIRED_INSTALLED_QUALIFICATION_V1"
)
assert qualifier.NEW_LOCK == EXPECTED_BOOTSTRAP_LOCK
assert qualifier.NEW_CAND == EXPECTED_BOOTSTRAP_CANDIDATE
assert tuple(qualifier.NEW_BOOT) == (
    874_608,
    EXPECTED_BOOTSTRAP_SHA256,
    EXPECTED_BOOTSTRAP_BLOB,
)
assert qualifier.NEW_MAN[1] == EXPECTED_MANIFEST_SHA256
assert qualifier.GREEN_STATE == EXPECTED_GREEN_STATE

# Exercise the actual V7 loader with exact qualifier bytes without touching Git.
original_repository_blob = module.repository_blob
module.repository_blob = lambda relative, expected: (
    qualifier_raw
    if (relative, expected) == (QUALIFIER_REL, QUALIFIER_BLOB)
    else (_ for _ in ()).throw(AssertionError("unexpected_repository_blob"))
)
loaded = module.load_qualifier()
assert loaded.NEW_LOCK == EXPECTED_BOOTSTRAP_LOCK
assert loaded.NEW_CAND == EXPECTED_BOOTSTRAP_CANDIDATE
assert tuple(loaded.NEW_BOOT) == tuple(qualifier.NEW_BOOT)
module.repository_blob = original_repository_blob

# Collect-plan contract with inert host observations.
module.checkout_snapshot = lambda head: {
    "head": head,
    "tree": "b" * 40,
    "branch": "main",
    "generation_sha256": "c" * 64,
}
module.source_dependencies = lambda: {
    "launcher_lock": {"fixture": True},
    "native_lock": {"fixture": True},
}
module.load_qualifier = lambda: qualifier

artifact_counter = 10


def fake_artifact(
    value: Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_git_blob: str | None,
    label: str,
) -> dict[str, object]:
    global artifact_counter
    artifact_counter += 1
    return {
        "path": str(value),
        "bytes": expected_bytes,
        "sha256": expected_sha256,
        "git_blob_sha1": expected_git_blob or "f" * 40,
        "mode": "0555",
        "uid": 1000,
        "gid": 1000,
        "dev": 1,
        "ino": artifact_counter,
    }


module.stable_artifact = fake_artifact
module._safe_tool = lambda value, label, maximum: {
    "path": str(value),
    "resolved_path": str(value),
    "bytes": 123 if label == "qualification_python" else 456,
    "sha256": "1" * 64 if label == "qualification_python" else "2" * 64,
    "mode": "0755",
    "uid": 0,
    "gid": 0,
    "dev": 4,
    "ino": 5 if label == "qualification_python" else 6,
}
module.os.geteuid = lambda: 1000

launcher = Path("/tmp/accepted-launcher-v2")
native = Path("/tmp/accepted-native-v2")
result = module.collect_plan(launcher, native, EXPECTED_HEAD)
body = result["body"]

assert result["plan_id"].startswith("voidbuye2protectedbootstrapplan7_")
assert body["version"] == 7
assert body["expected_head"] == EXPECTED_HEAD
assert body["expected_installed_bootstrap"]["lock_id"] == EXPECTED_BOOTSTRAP_LOCK
assert body["expected_installed_bootstrap"]["candidate_id"] == EXPECTED_BOOTSTRAP_CANDIDATE
assert body["expected_installed_bootstrap"]["sha256"] == EXPECTED_BOOTSTRAP_SHA256
assert body["accepted_launcher"]["sha256"] == EXPECTED_LAUNCHER_SHA256
assert body["accepted_native"]["sha256"] == EXPECTED_NATIVE_SHA256
assert body["installed_qualification_performed"] is False
assert body["bootstrap_execution_performed"] is False
assert body["protected_installer_apply_performed"] is False
assert body["filesystem_write"] is False
assert body["protected_filesystem_mutation"] is False

contract = body["qualification_contract"]
assert contract["qualifier_git_blob_sha1"] == QUALIFIER_BLOB
assert contract["root_execution_required"] is False
assert contract["nonroot_execution_required"] is True
assert contract["protected_state_read_only_required"] is True
assert contract["temporary_git_metadata_write_required"] is True
assert contract["temporary_git_metadata_cleanup_required"] is True
assert contract["descriptor_bound_source_execution_required"] is True

required_result = contract["required_result"]
assert required_result["protected_state"] == EXPECTED_GREEN_STATE
assert required_result["new_lock_id"] == EXPECTED_BOOTSTRAP_LOCK
assert required_result["new_candidate_id"] == EXPECTED_BOOTSTRAP_CANDIDATE
assert required_result["repaired_fixed_root_verified"] is True
assert required_result["predecessor_retained_verified"] is True
assert required_result["upgrade_stage_absent_verified"] is True
assert required_result["temporary_git_metadata_write_required"] is True
assert required_result["temporary_git_metadata_write_performed"] is True
assert required_result["temporary_git_metadata_cleanup_completed"] is True
assert required_result["source_repository_mutation"] is False
assert required_result["filesystem_write"] is True
assert required_result["protected_filesystem_mutation"] is False
assert required_result["bootstrap_execution"] is False
assert required_result["inner_installer_execution"] is False

expected_bootstrap_path = str(module.BOOTSTRAP_PATH)
assert body["bootstrap_argv"] == [
    expected_bootstrap_path,
    "--installer-plan",
    "--launcher",
    str(launcher),
    "--native",
    str(native),
    "--expected-head",
    EXPECTED_HEAD,
]

# Complete body is content-addressed and emitted verbatim.
stream = io.StringIO()
with contextlib.redirect_stdout(stream):
    module.emit_plan(result)
lines = stream.getvalue().splitlines()
fields = {}
for line in lines:
    if "=" in line:
        key, value = line.split("=", 1)
        fields[key] = value
assert fields["mode"] == "plan"
assert fields["read_only"] == "true"
assert fields["nonroot_required"] == "true"
assert fields["plan_body_json"] == module.canonical(body).decode("ascii")
assert fields["plan_id"] == result["plan_id"]
assert json.loads(fields["bootstrap_argv_json"]) == body["bootstrap_argv"]
assert json.loads(fields["qualification_contract_json"]) == contract
assert fields["qualification_nonroot_execution_required"] == "true"
assert fields["qualification_protected_state_read_only_required"] == "true"
assert fields["qualification_temporary_git_metadata_write_required"] == "true"

# Root planner invocation must fail closed before host observations.
module.os.geteuid = lambda: 0
try:
    module.collect_plan(launcher, native, EXPECTED_HEAD)
except module.PlanError as exc:
    assert str(exc) == "nonroot_plan_required"
else:
    raise AssertionError("root_planner_execution_accepted")

print(MARKER + "_PROOF_GREEN")
print("target_blob_bound=true")
print("workflow_pull_request_exact_parent_bound=true")
print("workflow_dispatch_exact_parent_bound=true")
print("workflow_dispatch_first_parent_inference_absent=true")
print("predecessor_v6_plan_bound=true")
print("predecessor_v6_proof_bound=true")
print("inherited_hardened_functions_unchanged=true")
print("repaired_qualifier_blob_bound=true")
print("repaired_qualifier_contract_loaded=true")
print("qualification_nonroot_execution_required=true")
print("qualification_protected_state_read_only_required=true")
print("qualification_temporary_git_metadata_write_required=true")
print("qualification_temporary_git_metadata_cleanup_required=true")
print("qualification_bootstrap_self_test_absent=true")
print("complete_plan_body_content_addressed=true")
print("structured_bootstrap_argv_only=true")
print("bootstrap_execution_performed=false")
print("protected_installer_apply_performed=false")
print("planner_filesystem_write=false")
print("planner_protected_filesystem_mutation=false")
print("funds_movement=false")
