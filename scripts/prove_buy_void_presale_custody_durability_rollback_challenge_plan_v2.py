#!/usr/bin/env python3
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PARENT_HEAD = "60a6fffc0fd8de576769f4bc090b3a12ca4ba526"
PARENT_TREE = "bb90a3caab421d811da6fe63f2d29967ab7e2e35"
PLAN_REL = "ops/security/buy-void-presale-custody-durability-rollback-challenge-plan-v2.json"
PLAN_BLOB = "edf66b204d2447c47b9decdd64ddd91d22922d9f"
PLAN_ID = "voidbuycustodychallengeplan2_dfbcd98e033afbcf931fd2120c6accf38673c7101a718a52bcbd6eb7006c16e0"
MARKER = "VOID_BUY_VOID_PRESALE_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_PLAN_V2"
OWNED_PATHS = (
    ".github/workflows/buy-void-presale-custody-durability-rollback-challenge-plan-v2.yml",
    "docs/operators/buy-void-presale-custody-durability-rollback-challenge-plan-v2.md",
    "ops/security/buy-void-presale-custody-durability-rollback-challenge-plan-v2.json",
    "scripts/prove_buy_void_presale_custody_durability_rollback_challenge_plan_v2.py",
)
V1_PLAN_REL = "ops/security/buy-void-presale-custody-durability-rollback-challenge-plan-v1.json"
V1_PLAN_BLOB = "5face2022dc2cbc573e32e99f88623f381a8a174"
V1_PLAN_ID = "voidbuycustodychallengeplan1_dd868e3fb6ebdbf894c1170d0ecc153d61e198d9c20279a05c3309957add9006"

V1_ARTIFACTS = {
    V1_PLAN_REL: V1_PLAN_BLOB,
    "scripts/prove_buy_void_presale_custody_durability_rollback_challenge_plan_v1.py":
        "ecc2b6e41b37521fdfe97a4df7136625c8be86e6",
    "docs/operators/buy-void-presale-custody-durability-rollback-challenge-plan-v1.md":
        "4906f0ca9e732a07ed90ddeccfe5c15d875fc124",
    ".github/workflows/buy-void-presale-custody-durability-rollback-challenge-plan-v1.yml":
        "29e4f5f411dfcbb6fded70291eb8a13279617da5",
}
CONTROLLER_ARTIFACTS = {
    "tools/void-buy-allocation-custody-rollback-controller-candidate-v1.mjs":
        "96d4ac3499d222841f1f7a3c53e14900b68ae8cf",
    "scripts/prove_buy_void_allocation_custody_rollback_controller_candidate_v1.mjs":
        "b196fcaa77a6bdc465baacb3387aa949f47bc956",
    "docs/architecture/buy-void-allocation-custody-rollback-controller-candidate-v1.md":
        "e5af9cc148ac53f3e08188770760ae9d264b5a5f",
    ".github/workflows/buy-void-allocation-custody-rollback-controller-candidate-v1.yml":
        "8b4295696529dfe770b631b5ac3e6e57c64f7c17",
}
EXPECTED_ADDITIONAL = (
    "authenticated_durable_one_time_authorization_claim_required",
    "authenticated_operation_wide_exclusive_lease_required",
    "canonical_controller_transcript_digest_binding_required",
    "exact_evidence_origin_digest_echo_required",
    "exact_lease_id_binding_every_challenge_phase_required",
    "injected_capabilities_authentication_required",
    "operation_bound_authorization_authentication_required",
    "operation_lease_exclusivity_proof_required",
    "post_rollback_authorization_claim_survival_revalidation_required",
    "same_authorization_replay_rejection_before_mutation_required",
    "terminal_operation_lease_revalidation_required",
)
EXPECTED_CLEANUP = (
    "cleanup_failure_holds_and_consumed_authorization_not_reusable",
    "deterministic_release_attempt_on_every_post_acquisition_exit_required",
    "green_requires_release_success_or_exact_kernel_auto_release_proof",
    "lease_loss_reacquire_aba_fencing_required",
    "release_forbidden_before_terminal_lease_revalidation_and_evidence_origin_authentication",
    "retained_lease_handle_owner_generation_required",
)
FALSE_AUTHORITY = [
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
  "protected_host_adapter_authorized",
  "live_challenge_authorized",
  "lease_release_authorized",
  "protected_adapter_build_authorized"
]

def canonical(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")

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
            "PATH": "/usr/bin:/bin", "HOME": "/nonexistent",
            "LANG": "C", "LC_ALL": "C", "TZ": "UTC",
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

assert git("rev-parse", PARENT_HEAD + "^{tree}") == PARENT_TREE
assert git("merge-base", PARENT_HEAD, "HEAD") == PARENT_HEAD
scope = tuple(sorted(
    line for line in git("diff", "--name-status", PARENT_HEAD, "HEAD", "--").splitlines()
    if line
))
expected_scope = tuple(sorted("A\t" + path for path in OWNED_PATHS))
assert scope == expected_scope, ("source_scope_not_exact_four_add_only", scope)

plan_raw = (ROOT / PLAN_REL).read_bytes()
assert git_blob(plan_raw) == PLAN_BLOB
assert git("rev-parse", "HEAD:" + PLAN_REL) == PLAN_BLOB
plan = json.loads(plan_raw)
assert plan["schema"] == "void_buy_void_presale_custody_durability_rollback_challenge_plan_v2"
assert plan["marker"] == MARKER
assert plan["version"] == 2
assert plan["repository"] == "6ZoSo9/void-node"
assert plan["plan_id"] == PLAN_ID
body = dict(plan)
body.pop("plan_id")
assert PLAN_ID == "voidbuycustodychallengeplan2_" + hashlib.sha256(canonical(body)).hexdigest()

for relative, expected in {**V1_ARTIFACTS, **CONTROLLER_ARTIFACTS}.items():
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, relative
    assert git("rev-parse", "HEAD:" + relative) == expected, relative

v1 = json.loads((ROOT / V1_PLAN_REL).read_bytes())
assert v1["plan_id"] == V1_PLAN_ID
assert plan["predecessor_v1"]["immutable"] is True
assert plan["predecessor_v1"]["plan_id"] == V1_PLAN_ID
assert plan["predecessor_v1"]["required_future_evidence_count"] == 20
assert plan["preserved_v1_required_future_evidence"] == v1["durability_contract"]["required_future_evidence"]
assert len(plan["preserved_v1_required_future_evidence"]) == 20
assert all(plan["preserved_v1_required_future_evidence"].values())
assert plan["preserved_v1_challenge_scope"] == v1["challenge_scope"]

parent = plan["stack_parent"]
assert parent == {
    "pr_number": 3527,
    "review_head": PARENT_HEAD,
    "tree": PARENT_TREE,
}
controller = plan["controller_candidate"]
assert controller["capability_count"] == 16
assert controller["source_only"] is True
assert controller["distinct_review_satisfied"] is False

additional = plan["controller_additional_required_future_evidence"]
assert tuple(sorted(additional)) == EXPECTED_ADDITIONAL
assert all(additional.values())
cleanup = plan["lease_cleanup_contract"]
assert tuple(sorted(cleanup)) == EXPECTED_CLEANUP
assert all(cleanup.values())

authority = plan["authority"]
assert tuple(sorted(authority)) == tuple(sorted(FALSE_AUTHORITY))
for key in FALSE_AUTHORITY:
    assert authority[key] is False, key

EXPECTED_NEXT_GATE = "DISTINCTLY_REVIEW_CONTROLLER_CANDIDATE_AND_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_PLAN_V2_BEFORE_PROTECTED_HOST_ADAPTER_V1"
assert plan["next_gate"] == EXPECTED_NEXT_GATE

def assert_semantic_policy(candidate: dict) -> None:
    assert candidate["predecessor_v1"]["immutable"] is True
    assert candidate["predecessor_v1"]["plan_id"] == V1_PLAN_ID
    assert candidate["predecessor_v1"]["required_future_evidence_count"] == 20
    assert candidate["controller_candidate"]["distinct_review_satisfied"] is False
    assert (
        candidate["preserved_v1_required_future_evidence"]
        == v1["durability_contract"]["required_future_evidence"]
    )
    assert candidate["preserved_v1_challenge_scope"] == v1["challenge_scope"]
    assert all(candidate["controller_additional_required_future_evidence"].values())
    assert all(candidate["lease_cleanup_contract"].values())
    candidate_authority = candidate["authority"]
    assert tuple(sorted(candidate_authority)) == tuple(sorted(FALSE_AUTHORITY))
    for key in FALSE_AUTHORITY:
        assert candidate_authority[key] is False, key
    assert candidate["next_gate"] == EXPECTED_NEXT_GATE

assert_semantic_policy(plan)

def must_reject(mutator, label: str) -> None:
    candidate = copy.deepcopy(plan)
    mutator(candidate)
    try:
        assert_semantic_policy(candidate)
    except AssertionError:
        return
    raise AssertionError("semantic_negative_not_rejected:" + label)

must_reject(
    lambda candidate: candidate["authority"].__setitem__(
        "protected_host_adapter_authorized", True
    ),
    "adapter_authority",
)
must_reject(
    lambda candidate: candidate["controller_candidate"].__setitem__(
        "distinct_review_satisfied", True
    ),
    "controller_distinct_review_forged",
)
must_reject(
    lambda candidate: candidate["lease_cleanup_contract"].__setitem__(
        "release_forbidden_before_terminal_lease_revalidation_and_evidence_origin_authentication",
        False,
    ),
    "early_lease_release",
)
must_reject(
    lambda candidate: candidate["preserved_v1_required_future_evidence"].pop(
        "evidence_origin_authentication_required"
    ),
    "immutable_v1_requirement_removed",
)

print(MARKER + "_PROOF_GREEN")
print("plan_id=" + PLAN_ID)
print("predecessor_v1_plan_immutable=true")
print("preserved_v1_required_future_evidence_count=20")
print("controller_candidate_bound=true")
print("exact_four_add_only_scope=true")
print("semantic_authority_negative_fixture=true")
print("lease_cleanup_negative_fixture=true")
print("controller_distinct_review_negative_fixture=true")
print("immutable_v1_semantic_negative_fixture=true")
print("controller_capability_count=16")
print("controller_additional_requirement_count=11")
print("lease_cleanup_requirement_count=6")
print("deterministic_lease_release_cleanup_required=true")
print("lease_loss_reacquire_aba_fencing_required=true")
print("distinct_review_satisfied=false")
print("protected_host_adapter_authorized=false")
print("live_challenge_authorized=false")
print("storage_mutation_authorized=false")
print("payment_acceptance_authorized=false")
print("public_presale_activation_authorized=false")
print("funds_movement=false")
print("next_gate=DISTINCTLY_REVIEW_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_PLAN_V2_BEFORE_PROTECTED_HOST_ADAPTER_V1")
