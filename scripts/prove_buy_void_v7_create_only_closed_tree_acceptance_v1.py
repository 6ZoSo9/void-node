#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
MARKER = "VOID_BUY_VOID_V7_CREATE_ONLY_CLOSED_TREE_ACCEPTANCE_V1_PROOF"
SOURCE_BASE = "1d8c8804d75fa12e1fa9fcfffe7bc93940fbd56c"
ACCEPTANCE_REL = "ops/security/buy-void-v7-create-only-closed-tree-acceptance-v1.json"
ACCEPTANCE_BLOB = "919db72903a5fcff59dec7635a4288f41d1753d9"
PLAN_REL = "ops/security/buy-void-v7-create-only-persistent-seal-plan-v1.json"
PLAN_BLOB = "9dde5523dca6ab240626430ce1c2b82f1cfe7f20"
BOOTSTRAP_REL = "ops/precision/void_buy_void_v7_create_only_closed_tree_bootstrap_v1.c"
BOOTSTRAP_BLOB = "2a8397c85d698d168f2257ec801557281b73c04d"
BOOTSTRAP_PROOF_REL = "scripts/prove_buy_void_v7_create_only_closed_tree_bootstrap_v1.py"
BOOTSTRAP_PROOF_BLOB = "2bec40bb30b26f229e5a9a290ce262cd40e344c5"
EXPECTED_ID = "voidv7closedtreeaccept1_19ac8c5b09377162ff42048535352a15b5dc75020701c9402c1ebc6ba73fc4b3"

def git(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null",
            "GIT_NO_REPLACE_OBJECTS": "1",
            "GIT_OPTIONAL_LOCKS": "0",
            "GIT_TERMINAL_PROMPT": "0",
            "GIT_ASKPASS": "/bin/false",
        },
        timeout=30,
        check=False,
    )
    if cp.returncode != 0 or cp.stderr:
        raise RuntimeError("git_failed:" + (args[0] if args else "unknown"))
    return cp.stdout.strip()

def canonical(value: object) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    ).encode("ascii")

if sys.flags.isolated != 1:
    raise RuntimeError("python_isolated_mode_required")

head = git("rev-parse", "HEAD")
if git("branch", "--show-current") != "main":
    raise RuntimeError("main_required")
if git("status", "--porcelain=v1", "--untracked-files=all") != "":
    raise RuntimeError("clean_checkout_required")
if git("rev-parse", "--is-shallow-repository") != "false":
    raise RuntimeError("full_history_checkout_required")
ancestor = subprocess.run(
    ["/usr/bin/git", "-C", str(ROOT), "merge-base", "--is-ancestor", SOURCE_BASE, head],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
    timeout=20,
    check=False,
)
if ancestor.returncode != 0:
    raise RuntimeError("source_base_not_ancestor")

for rel, expected in {
    ACCEPTANCE_REL: ACCEPTANCE_BLOB,
    PLAN_REL: PLAN_BLOB,
    BOOTSTRAP_REL: BOOTSTRAP_BLOB,
    BOOTSTRAP_PROOF_REL: BOOTSTRAP_PROOF_BLOB,
}.items():
    if git("rev-parse", "HEAD:" + rel) != expected:
        raise RuntimeError("blob_mismatch:" + rel)

raw = (ROOT / ACCEPTANCE_REL).read_bytes()
if not raw.endswith(b"\n"):
    raise RuntimeError("acceptance_final_lf_required")
doc = json.loads(raw)
if not isinstance(doc, dict):
    raise RuntimeError("acceptance_shape_invalid")
if doc.get("acceptance_id") != EXPECTED_ID:
    raise RuntimeError("acceptance_id_mismatch")
if doc.get("schema") != "VOID_BUY_VOID_V7_CREATE_ONLY_CLOSED_TREE_ACCEPTANCE_V1":
    raise RuntimeError("acceptance_schema_mismatch")
if doc.get("version") != 1 or doc.get("source_base") != SOURCE_BASE:
    raise RuntimeError("acceptance_generation_mismatch")

body = dict(doc)
body.pop("acceptance_id", None)
recomputed = "voidv7closedtreeaccept1_" + hashlib.sha256(canonical(body)).hexdigest()
if recomputed != EXPECTED_ID:
    raise RuntimeError("acceptance_id_recompute_mismatch")

plan = doc.get("reviewed_plan")
bootstrap = doc.get("reviewed_bootstrap")
decision = doc.get("review_decision")
required = doc.get("required_next_source_properties")
if not isinstance(plan, dict) or not isinstance(bootstrap, dict) or not isinstance(decision, dict):
    raise RuntimeError("acceptance_sections_invalid")
if plan != {
    "plan_id": "voidv7createonlysealplan1_80486c8e43751493d1480ebdf8be63a26195e465e96f3e1d29b1d7b4765773cc",
    "plan_blob": PLAN_BLOB,
    "requirement_count": 70,
    "seal_mode": "CREATE_ONLY_CLOSED_TREE_V1",
}:
    raise RuntimeError("reviewed_plan_binding_invalid")
if bootstrap != {
    "source_blob": BOOTSTRAP_BLOB,
    "proof_blob": BOOTSTRAP_PROOF_BLOB,
    "production_apply_enabled": False,
    "production_payload_manifest_lock_bound": False,
}:
    raise RuntimeError("reviewed_bootstrap_binding_invalid")

true_fields = {
    "alternative_seal_accepted_for_source_implementation",
    "new_launcher_generation_source_implementation_authorized",
    "bootstrap_manifest_lock_candidate_generation_authorized",
    "bootstrap_source_revision_for_manifest_lock_candidate_only_authorized",
}
for key in true_fields:
    if decision.get(key) is not True:
        raise RuntimeError("required_source_authority_missing:" + key)

false_fields = {
    "production_payload_manifest_accepted",
    "bootstrap_candidate_accepted",
    "new_launcher_generation_host_accepted",
    "root_execution_authorized",
    "protected_filesystem_mutation_authorized",
    "launcher_install_authorized",
    "protected_v5_apply_authorized",
    "service_mutation_authorized",
    "credential_access_authorized",
    "private_key_access_authorized",
    "signing_authorized",
    "transaction_authorized",
    "payment_acceptance_authorized",
    "public_presale_activation_authorized",
    "wc_void_market_activation_authorized",
    "treasury_liquidity_action_authorized",
    "funds_movement_authorized",
}
for key in false_fields:
    if decision.get(key) is not False:
        raise RuntimeError("production_authority_not_false:" + key)

expected_required = {
    "launcher_v3_must_preserve_v2_first_instruction_static_native_boundary",
    "launcher_v3_must_preserve_v5_operation_argument_binding",
    "launcher_v3_policy_must_select_exactly_one_reviewed_seal_mode",
    "launcher_v3_must_verify_closed_tree_receipt_before_python_exec",
    "launcher_v3_must_rebind_receipt_bound_inode_hash_mode_nlink_for_privileged_files",
    "launcher_v3_must_keep_static_python_and_stdlib_content_hash_binding",
    "launcher_v3_must_not_claim_arbitrary_malicious_root_resistance",
    "bootstrap_manifest_lock_candidate_must_bind_complete_payload_and_source_generation",
    "bootstrap_manifest_lock_candidate_must_remain_source_only_until_separately_accepted",
    "host_install_and_v5_apply_require_distinct_future_authorization",
}
if not isinstance(required, list) or set(required) != expected_required or len(required) != len(expected_required):
    raise RuntimeError("required_next_source_properties_invalid")
if doc.get("next_gate") != "SOURCE_IMPLEMENT_LAUNCHER_V3_AND_BOOTSTRAP_MANIFEST_LOCK_CANDIDATE":
    raise RuntimeError("next_gate_invalid")

print(MARKER + "_GREEN")
print("acceptance_id=" + EXPECTED_ID)
print("source_base=" + SOURCE_BASE)
print("current_head=" + head)
print("reviewed_plan_blob=" + PLAN_BLOB)
print("reviewed_bootstrap_blob=" + BOOTSTRAP_BLOB)
print("launcher_v3_source_implementation_authorized=true")
print("bootstrap_manifest_lock_candidate_generation_authorized=true")
print("production_payload_manifest_accepted=false")
print("bootstrap_candidate_accepted=false")
print("root_execution_authorized=false")
print("protected_filesystem_mutation_authorized=false")
print("launcher_install_authorized=false")
print("protected_v5_apply_authorized=false")
print("funds_movement_authorized=false")
