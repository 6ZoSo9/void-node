#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PLAN_REL = "ops/security/buy-void-presale-custody-durability-rollback-challenge-plan-v1.json"
PLAN_BLOB = "bf2cd9350da1cbd3670f77d6cd4fab8532846b82"
PLAN_ID = "voidbuycustodychallengeplan1_d9a72732d690a09731e7d4d65f4024156acf4813e6550bf72e5f03d5b383d4d0"
MARKER = "VOID_BUY_VOID_PRESALE_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_PLAN_V1"

EXPECTED_FUTURE_EVIDENCE = (
    "allocation_ledger_unchanged_required",
    "challenge_entropy_and_unpredictability_required",
    "controlled_rollback_attempt_required",
    "customer_request_state_unchanged_required",
    "distinct_physical_storage_reobservation_required",
    "evidence_origin_authentication_required",
    "exact_current_policy_binding_required",
    "external_witness_post_challenge_append_required",
    "high_water_second_control_approval_required",
    "journal_and_high_water_sync_close_reopen_required",
    "live_high_water_advance_required",
    "live_journal_challenge_append_required",
    "non_customer_canary_domain_required",
    "operation_bound_authorization_required",
    "post_rollback_external_witness_continuity_required",
    "post_rollback_high_water_non_decrease_required",
    "post_test_policy_rebind_required",
    "reviewed_rollback_controller_required",
    "reviewed_source_generation_binding_required",
    "stale_journal_refusal_required",
)

EXPECTED_BLOBS = {
    "ops/security/buy-void-presale-host-evidence-collection-plan-v1.json":
        "ad68175e629fd1cf90180db3a904f84834314fdd",
    "ops/security/buy-void-presale-source-freeze-acceptance-v2.json":
        "174d536807f03fd7b6ff44820d4e378c7055150e",
    "ops/precision/void_buy_void_presale_allocation_custody_host_evidence_v1.ts":
        "216928e1810cb25ce1c331e2edfece629fff76cf",
    "scripts/prove_buy_void_presale_allocation_custody_host_evidence_v1.ts":
        "f2566d76972262db35f60d049f79ae6f2d34f47e",
    "docs/operators/buy-void-presale-allocation-custody-host-evidence-v1.md":
        "e346269a7cb74a849bd24ec88ed8d7bfee060be7",
    ".github/workflows/buy-void-presale-allocation-custody-host-evidence-v1.yml":
        "1c31cc09d750d14b0ae0fdef142d46f39b881f89",
    "tools/void-buy-allocation-custody-live-durability-rollback-contract-v1.mjs":
        "eef7c4e1db7401ba82fda96aa1e8da40c1981b7d",
    "scripts/prove_buy_void_allocation_custody_live_durability_rollback_contract_v1.mjs":
        "7ced5fb56a22cd546aab30c466021b01b1c6a84d",
    "docs/architecture/buy-void-allocation-custody-live-durability-rollback-contract-v1.md":
        "16a8a755888abd7b9ad4f0377468d6a403f80a70",
    ".github/workflows/buy-void-allocation-custody-live-durability-rollback-contract-v1.yml":
        "b3426f40577ff1ca1bbab8ca46232ae1ca0a8148",
}

FALSE_AUTHORITY = (
    "host_execution_authorized",
    "filesystem_read_authorized",
    "filesystem_write_authorized",
    "storage_mutation_authorized",
    "rollback_test_authorized",
    "service_mutation_authorized",
    "credential_access_authorized",
    "wallet_or_signer_access_authorized",
    "signing_authorized",
    "transaction_submission_authorized",
    "payment_acceptance_authorized",
    "public_presale_activation_authorized",
    "wc_void_market_activation_authorized",
    "treasury_or_liquidity_action_authorized",
    "funds_movement",
    "production_host_evidence_authority",
)

def canonical(value: object) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    ).encode("ascii")

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
        env={
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
        },
    )
    if cp.returncode != 0 or cp.stderr:
        raise AssertionError("git_failed:" + ":".join(args))
    return cp.stdout.strip()

plan_raw = (ROOT / PLAN_REL).read_bytes()
assert git_blob(plan_raw) == PLAN_BLOB
assert git("rev-parse", "HEAD:" + PLAN_REL) == PLAN_BLOB
plan = json.loads(plan_raw)

assert plan["schema"] == "void_buy_void_presale_custody_durability_rollback_challenge_plan_v1"
assert plan["marker"] == MARKER
assert plan["version"] == 1
assert plan["repository"] == "6ZoSo9/void-node"
assert plan["plan_id"] == PLAN_ID
body = dict(plan)
body.pop("plan_id")
assert PLAN_ID == "voidbuycustodychallengeplan1_" + hashlib.sha256(canonical(body)).hexdigest()

for relative, expected in EXPECTED_BLOBS.items():
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, (relative, git_blob(raw))
    assert git("rev-parse", "HEAD:" + relative) == expected, relative

parent = plan["parent_host_evidence_plan"]
assert parent == {
    "path": "ops/security/buy-void-presale-host-evidence-collection-plan-v1.json",
    "git_blob_sha1": "ad68175e629fd1cf90180db3a904f84834314fdd",
    "plan_id": "voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab",
}

accepted = plan["accepted_presale_source"]
assert accepted["acceptance_id"] == "voidbuypresalefreezeaccept2_427988497e4789465dde1c193668bb140d017c4e3ba3748567ea4e3bacfadb57"
assert accepted["freeze_id"] == "voidbuypresalefreeze2_32bd552dc92df07fd391ee3571f92e5efd80cbb50bd79bc4b8952484511db7f1"
assert accepted["source_commit"] == "05614762b1b4638e05e539fd7d20cbf670e1570b"
assert accepted["source_tree"] == "4ade3faff2c3fd8e73f7ab8bf3ce0685e0d0d30e"
assert accepted["source_identity_acceptance_only"] is True
assert accepted["payment_rail_policy_accepted"] is False
assert accepted["host_install_qualified"] is False
assert accepted["public_presale_activation"] is False
assert accepted["funds_movement"] is False

collector = plan["read_only_prerequisite_collector"]
assert collector["review_head"] == "06c8262abb18ec13d256143ca500f09dbc3632ac"
assert collector["expected_success_status"] == "ALLOCATION_CUSTODY_PREREQUISITES_GREEN_CONTROLLED_CHALLENGE_REQUIRED"
assert collector["collector_receipt_required"] is True
assert collector["read_only_collection_sufficient"] is False

future = plan["durability_contract"]["required_future_evidence"]
assert tuple(sorted(future.keys())) == EXPECTED_FUTURE_EVIDENCE
assert all(value is True for value in future.values())

scope = plan["challenge_scope"]
assert scope == {
    "non_customer_canary_domain": True,
    "allocation_ledger_unchanged_required": True,
    "customer_request_state_unchanged_required": True,
    "challenge_entropy_generated_at_execution_required": True,
    "operation_bound_authorization_required": True,
    "exact_current_policy_binding_required": True,
    "reviewed_source_generation_binding_required": True,
    "challenge_plan_only": True,
}

authority = plan["authority"]
assert tuple(sorted(authority.keys())) == tuple(sorted(FALSE_AUTHORITY))
for key in FALSE_AUTHORITY:
    assert authority[key] is False, key

assert plan["next_gate"] == "SEPARATELY_AUTHORIZE_NONCUSTOMER_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_V1"

print(MARKER + "_PROOF_GREEN")
print("plan_id=" + PLAN_ID)
print("accepted_presale_source_bound=true")
print("read_only_prerequisite_collector_bound=true")
print("durability_contract_bound=true")
print("required_future_evidence_count=20")
print("non_customer_canary_domain_required=true")
print("allocation_ledger_unchanged_required=true")
print("customer_request_state_unchanged_required=true")
print("challenge_plan_only=true")
print("host_execution_authorized=false")
print("storage_mutation_authorized=false")
print("rollback_test_authorized=false")
print("payment_acceptance_authorized=false")
print("public_presale_activation_authorized=false")
print("funds_movement=false")
print("next_gate=SEPARATELY_AUTHORIZE_NONCUSTOMER_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_V1")
