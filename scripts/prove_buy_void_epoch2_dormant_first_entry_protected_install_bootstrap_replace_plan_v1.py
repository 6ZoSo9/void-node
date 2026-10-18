#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_REPLACE_PLAN_V1"
)

TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_replace_plan_v1.py"
)
TARGET_BLOB = "d43d2729819ae94f14b531d75368df042a5ee971"

HELPER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_v6.py"
)
HELPER_BLOB = "438b69e3c0da8549b77f7bdeaa7ed35e7d07ef84"

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json"
)
LOCK_BLOB = "f2ce1364dd776bfbf1aa1ef59ce999cb46037b73"

MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_dormant_first_entry_bootstrap_v6.py"
)
MATERIALIZER_BLOB = "c5d083cbf276f59f888aeb79b874bac4480f1506"

MANIFEST_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-source-generation-v3.conf"
)
MANIFEST_BLOB = "de56bacb30bea0adc418e240cf3fb8d900b061ef"

OLD_LOCK_ID = (
    "voidbuye2dormantbootstraplock3_"
    "5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"
)
NEW_LOCK_ID = (
    "voidbuye2dormantbootstraplock3_"
    "4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396"
)
NEW_CANDIDATE_ID = (
    "voidbuye2dormantbootstrapcand3_"
    "1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2"
)

OLD_BOOTSTRAP_SHA256 = (
    "c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b"
)
OLD_BOOTSTRAP_GIT_BLOB = "a91707c3e5803071fc73c3451c9bcb3b774f8b48"
OLD_MANIFEST_SHA256 = (
    "aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662"
)
OLD_MANIFEST_GIT_BLOB = "6e0630af72111bd9976dcc38cdcdada1904dd067"

NEW_BOOTSTRAP_SHA256 = (
    "618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c"
)
NEW_BOOTSTRAP_GIT_BLOB = "b577d70666f98ac59a75b84b3dab741fe7b93a4b"
NEW_MANIFEST_SHA256 = (
    "8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9"
)


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def pin(relative: str, expected: str) -> bytes:
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, (relative, git_blob(raw), expected)
    return raw


target_raw = pin(TARGET_REL, TARGET_BLOB)
helper_raw = pin(HELPER_REL, HELPER_BLOB)
lock_raw = pin(LOCK_REL, LOCK_BLOB)
materializer_raw = pin(MATERIALIZER_REL, MATERIALIZER_BLOB)
manifest_raw = pin(MANIFEST_REL, MANIFEST_BLOB)

source = target_raw.decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True)
tree = ast.parse(source, filename=TARGET_REL)

functions = {
    node.name: node
    for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
for name in (
    "load_helper",
    "parse_policy",
    "read_installed_policy",
    "verify_predecessor_root",
    "auxiliary_roots_absent",
    "collect_plan",
    "plan",
    "source_plan",
    "self_test",
):
    assert name in functions, name
assert "apply" not in functions

string_constants = {
    node.value
    for node in ast.walk(tree)
    if isinstance(node, ast.Constant) and isinstance(node.value, str)
}
assert "--apply" not in string_constants

forbidden_os_calls = {
    "mkdir", "rename", "replace", "unlink", "rmdir",
    "fchmod", "fchown", "write", "pwrite",
}
observed_mutations = []
for node in ast.walk(tree):
    if (
        isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id == "os"
        and node.func.attr in forbidden_os_calls
    ):
        observed_mutations.append(node.func.attr)
assert observed_mutations == []

for forbidden in (
    "subprocess.Popen",
    "subprocess.run",
    "os.system(",
    "os.execv",
    "os.execve",
    "os.fexecve",
    "systemctl",
):
    assert forbidden not in source, forbidden

for required in (
    'HELPER_BLOB = "' + HELPER_BLOB + '"',
    OLD_LOCK_ID,
    NEW_LOCK_ID,
    NEW_CANDIDATE_ID,
    OLD_BOOTSTRAP_SHA256,
    OLD_BOOTSTRAP_GIT_BLOB,
    OLD_MANIFEST_SHA256,
    OLD_MANIFEST_GIT_BLOB,
    NEW_BOOTSTRAP_SHA256,
    NEW_BOOTSTRAP_GIT_BLOB,
    NEW_MANIFEST_SHA256,
    'REPLACE_STAGE_NAME = "." + INSTALL_NAME + ".repair-mtimes.stage"',
    'PREDECESSOR_NAME = "." + INSTALL_NAME + ".predecessor-precruft"',
    '"atomic_root_exchange_required": True',
    '"predecessor_retention_required": True',
    '"automatic_rollback_required": True',
    '"replacement_apply_authorized": False',
    '"protected_filesystem_mutation": False',
    "predecessor_policy_not_current_tool_generation",
    "target_manifest_not_canonical_git_object",
    "legacy_create_only_stage_present",
    "replacement_stage_present",
    "replacement_predecessor_present",
    "SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_",
    "PROTECTED_BOOTSTRAP_V6_ATOMIC_REPLACEMENT_V1",
):
    assert required in source, required

collect_source = ast.get_source_segment(source, functions["collect_plan"]) or ""
for required in (
    "helper._RepositorySnapshot(expected_head)",
    "helper.accepted_lock(expected_head, repository=repository)",
    "helper.checkout_snapshot(expected_head, repository=repository)",
    "verify_predecessor_root(helper, python, git_tool)",
    "auxiliary_roots_absent(helper)",
    "helper._read_exact_path(",
    "helper._git_object(",
    "helper.build_policy(python, git_tool)",
    '"policy_preserved_across_replacement": True',
):
    assert required in collect_source, required

lock = json.loads(lock_raw.decode("utf-8", "strict"))
assert lock["lock_id"] == NEW_LOCK_ID
assert lock["candidate_report"]["candidate_id"] == NEW_CANDIDATE_ID
assert lock["candidate_accepted"] is True
assert lock["native_binary_identity_accepted"] is True
assert lock["source_generation_identity_accepted"] is True
assert lock["native_binary"]["bytes"] == 874_608
assert lock["native_binary"]["sha256"] == NEW_BOOTSTRAP_SHA256
assert lock["source_generation"]["manifest_git_blob_sha1"] == MANIFEST_BLOB
assert lock["source_generation"]["manifest_sha256"] == NEW_MANIFEST_SHA256
assert lock["superseded_sourcegen3_lock"] == OLD_LOCK_ID
assert lock["superseded_sourcegen3_lock_git_blob_sha1"] == (
    "f5b03c6b81016edf21f605099e0ef8976f40e107"
)
assert lock["superseded_sourcegen3_lock_install_authority"] is False
for key in (
    "protected_install_authorized",
    "live_execution_authorized",
    "credential_access_authorized",
    "private_key_access_authorized",
    "signing_authorized",
    "transaction_authorized",
    "rpc_call_authorized",
    "payment_acceptance_authorized",
    "public_presale_activation_authorized",
    "wc_void_market_activation_authorized",
    "treasury_liquidity_action_authorized",
    "funds_movement_authorized",
    "production_host_evidence_authority",
):
    assert lock[key] is False, key

materializer = materializer_raw.decode("utf-8", "strict")
for required in (
    'LOCK_BLOB="' + LOCK_BLOB + '"',
    'LOCK_ID="' + NEW_LOCK_ID + '"',
    'MANIFEST_BLOB="' + MANIFEST_BLOB + '"',
    'MANIFEST_SHA256="' + NEW_MANIFEST_SHA256 + '"',
    'EXPECTED_BINARY_SHA256="' + NEW_BOOTSTRAP_SHA256 + '"',
    'EXPECTED_BINARY_GIT_BLOB="' + NEW_BOOTSTRAP_GIT_BLOB + '"',
):
    assert required in materializer, required

manifest = manifest_raw.decode("ascii", "strict")
assert (
    "bootstrap_source_blob_sha1=560726bcae6ea0738502cb5e74b65f9116bd447d"
    in manifest
)
assert (
    "bootstrap_source_sha256="
    "ac8673f51e4325e3ed1912a4f628cc3715c7199cda1c3cbdacbbcb710ae6b145"
    in manifest
)

helper = helper_raw.decode("utf-8", "strict")
assert 'POLICY_SCHEMA = (' in helper
assert '"PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6"' in helper
assert "def _RepositorySnapshot" in helper
assert "def _read_exact_path" in helper
assert "def _verify_file" in helper
assert "def build_policy" in helper
assert "RENAME_NOREPLACE = 1" in helper

target = ROOT / TARGET_REL
for mode, expected_lines in (
    (
        "--self-test",
        (
            MARKER + "_SELF_TEST_GREEN",
            "plan_only=true",
            "predecessor_generation_exact=true",
            "target_repaired_generation_exact=true",
            "policy_preservation_required=true",
            "atomic_root_exchange_required=true",
            "predecessor_retention_required=true",
            "automatic_rollback_required=true",
            "replacement_apply_authorized=false",
            "protected_filesystem_mutation=false",
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
            "helper_blob=" + HELPER_BLOB,
            "predecessor_bootstrap_sha256=" + OLD_BOOTSTRAP_SHA256,
            "target_bootstrap_sha256=" + NEW_BOOTSTRAP_SHA256,
            "accepted_repaired_lock_id=" + NEW_LOCK_ID,
            "create_only=false",
            "atomic_root_exchange_required=true",
            "predecessor_retention_required=true",
            "automatic_rollback_required=true",
            "replacement_apply_authorized=false",
            "protected_filesystem_mutation=false",
            "bootstrap_execution=false",
            "inner_installer_execution=false",
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
    assert cp.returncode == 0, (mode, cp.stdout, cp.stderr)
    assert cp.stderr == "", (mode, cp.stderr)
    lines = set(cp.stdout.splitlines())
    for expected in expected_lines:
        assert expected in lines, (mode, expected)

print(MARKER + "_PROOF_GREEN")
print("target_blob_bound=true")
print("merged_v6_install_helper_bound=true")
print("repaired_candidate_lock_bound=true")
print("repaired_materializer_bound=true")
print("precruft_predecessor_identity_bound=true")
print("repaired_target_identity_bound=true")
print("predecessor_policy_current_tool_match_required=true")
print("canonical_target_manifest_required=true")
print("plan_only_no_apply_entry=true")
print("protected_root_mutation_calls_absent=true")
print("atomic_root_exchange_required=true")
print("predecessor_retention_required=true")
print("automatic_rollback_required=true")
print("replacement_apply_authorized=false")
print("bootstrap_execution=false")
print("inner_installer_execution=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("funds_movement=false")
