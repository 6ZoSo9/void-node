#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json

MARKER = "VOID_BUY_VOID_EPOCH2_LIVE_BINDING_SOURCE_RUNTIME_COMPAT_CONTRACT_V1"
SCHEMA = "void_buy_void_epoch2_live_binding_source_runtime_compat_contract_v1"
VERSION = 1
PLAN_PREFIX = "voidbuye2livebindcompat1_"

RUNTIME_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
RUNTIME_TREE = "de12c9d2d5e475d435d21da3b047d7b63b69e2b7"
SOURCE_HEAD = "0ada7fde0d90c3946b10693f4621cbd690bfcde6"
SOURCE_TREE = "9e930fba9aacfafb5b163767302786cd7f31c81e"
SOURCE_RUNTIME_ADDED_PATH_COUNT = 15
RUNTIME_POLICY_SHA256 = "746cfbe2f031868fff3a75f8307986f25c62460085f41a4827e712702a2d6549"
SOURCE_HEAD_POLICY_SHA256 = "e2abc327cca40f0233eb344609f1db01f790c35af443e86afa1f69a6b671ae06"

COMPAT_V3_REL = "ops/precision/void_buy_void_presale_epoch2_installed_generation_host_evidence_v3.py"
COMPAT_V3_BLOB = "f9e3b1f5501a56e7ce1a191f12507186e79c28d4"
BINDER_V2_REL = "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
BINDER_V2_BLOB = "9c29eb4716077e459b9154f39d0f30cf2e56729f"
BINDER_PREENTRY_V2_REL = "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c"
BINDER_PREENTRY_V2_BLOB = "4fdf3f627f407335b9d50800fbbc913d1edae523"
RUNNER_V3_REL = "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
RUNNER_V3_BLOB = "499df9b94b5b89354837570da0c7e47ec280025d"
LIVE_NATIVE_V3_REL = "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c"
LIVE_NATIVE_V3_BLOB = "5021727f1def1ec11f870d735cab65acc1701a5e"

REQUIRED_SUCCESSORS = (
    "epoch2_authenticated_credential_live_composition_source_runtime_compat_v4",
    "epoch2_live_composition_v6r3_runner_policy_candidate_lock_install_qualification",
    "epoch2_dormant_candidate_v3r_live_binding_source_runtime_compat_v3",
    "epoch2_dormant_binder_native_preentry_v3_candidate_lock_install_qualification",
)

class ContractError(RuntimeError):
    pass

def canonical(value: object) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    ).encode("ascii")

def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

def build_plan() -> dict[str, object]:
    body: dict[str, object] = {
        "schema": SCHEMA,
        "version": VERSION,
        "runtime_head": RUNTIME_HEAD,
        "runtime_tree": RUNTIME_TREE,
        "source_head": SOURCE_HEAD,
        "source_tree": SOURCE_TREE,
        "source_runtime_add_only_compatibility_required": True,
        "source_runtime_added_path_count": SOURCE_RUNTIME_ADDED_PATH_COUNT,
        "compatibility_host_evidence_v3_rel": COMPAT_V3_REL,
        "compatibility_host_evidence_v3_blob": COMPAT_V3_BLOB,
        "runtime_policy_sha256": RUNTIME_POLICY_SHA256,
        "source_head_policy_sha256": SOURCE_HEAD_POLICY_SHA256,
        "runtime_policy_rewrite_to_source_head_forbidden": True,
        "runtime_policy_head_preservation_required": True,
        "binder_v2_rel": BINDER_V2_REL,
        "binder_v2_blob": BINDER_V2_BLOB,
        "binder_preentry_v2_rel": BINDER_PREENTRY_V2_REL,
        "binder_preentry_v2_blob": BINDER_PREENTRY_V2_BLOB,
        "runner_v3_rel": RUNNER_V3_REL,
        "runner_v3_blob": RUNNER_V3_BLOB,
        "live_native_v3_rel": LIVE_NATIVE_V3_REL,
        "live_native_v3_blob": LIVE_NATIVE_V3_BLOB,
        "existing_binder_single_head_contract": True,
        "existing_binder_preentry_policy_head_equality_required": True,
        "existing_runner_single_head_checkout_contract": True,
        "live_native_v3_runtime_policy_binding_preserved": True,
        "live_native_v3_binary_replacement_required_for_runner_compat": False,
        "runner_bytes_and_policy_upgrade_required": True,
        "binder_bytes_and_binder_native_preentry_upgrade_required": True,
        "source_head_and_runtime_head_must_be_distinct": True,
        "runtime_sensitive_credential_and_sealed_evidence_head": RUNTIME_HEAD,
        "canonical_source_checkout_head": SOURCE_HEAD,
        "required_successors": list(REQUIRED_SUCCESSORS),
        "implementation_order": [
            REQUIRED_SUCCESSORS[0],
            REQUIRED_SUCCESSORS[1],
            REQUIRED_SUCCESSORS[2],
            REQUIRED_SUCCESSORS[3],
        ],
        "host_execution_authorized": False,
        "filesystem_mutation_authorized": False,
        "canonical_checkout_mutation_authorized": False,
        "installed_policy_mutation_authorized": False,
        "service_mutation_authorized": False,
        "credential_access_authorized": False,
        "private_key_access_authorized": False,
        "signing_authorized": False,
        "transaction_authorized": False,
        "rpc_call_authorized": False,
        "payment_acceptance_authorized": False,
        "public_presale_activation_authorized": False,
        "wc_void_market_activation_authorized": False,
        "treasury_liquidity_action_authorized": False,
        "funds_movement_authorized": False,
        "production_host_evidence_authority": False,
    }
    return {
        "plan_id": PLAN_PREFIX + sha256(canonical(body)),
        "body": body,
    }

def self_test() -> None:
    assert len(RUNTIME_HEAD) == 40
    assert len(RUNTIME_TREE) == 40
    assert len(SOURCE_HEAD) == 40
    assert len(SOURCE_TREE) == 40
    assert RUNTIME_HEAD != SOURCE_HEAD
    assert RUNTIME_POLICY_SHA256 != SOURCE_HEAD_POLICY_SHA256
    assert SOURCE_RUNTIME_ADDED_PATH_COUNT == 15
    assert len(REQUIRED_SUCCESSORS) == 4
    result = build_plan()
    assert str(result["plan_id"]).startswith(PLAN_PREFIX)
    assert len(str(result["plan_id"])) == len(PLAN_PREFIX) + 64
    body = result["body"]
    assert isinstance(body, dict)
    assert body["runtime_policy_rewrite_to_source_head_forbidden"] is True
    assert body["live_native_v3_binary_replacement_required_for_runner_compat"] is False
    assert body["credential_access_authorized"] is False
    assert body["funds_movement_authorized"] is False
    print(MARKER + "_SELF_TEST_GREEN")
    print("two_head_contract_required=true")
    print("runtime_policy_head_preservation_required=true")
    print("runtime_policy_rewrite_to_source_head_forbidden=true")
    print("credential_native_preentry_v3_preserved=true")
    print("runner_v4_source_runtime_compat_required=true")
    print("binder_v3_source_runtime_compat_required=true")
    print("binder_native_preentry_v3_required=true")
    print("credential_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("funds_movement_authorized=false")

def emit_plan() -> None:
    result = build_plan()
    body = result["body"]
    print(MARKER)
    print("mode=plan")
    print("source_only=true")
    print("plan_id=" + str(result["plan_id"]))
    print("runtime_head=" + RUNTIME_HEAD)
    print("runtime_tree=" + RUNTIME_TREE)
    print("source_head=" + SOURCE_HEAD)
    print("source_tree=" + SOURCE_TREE)
    print("source_runtime_added_path_count=" + str(SOURCE_RUNTIME_ADDED_PATH_COUNT))
    print("runtime_policy_sha256=" + RUNTIME_POLICY_SHA256)
    print("source_head_policy_sha256=" + SOURCE_HEAD_POLICY_SHA256)
    print("runtime_policy_head_preservation_required=true")
    print("runtime_policy_rewrite_to_source_head_forbidden=true")
    print("existing_binder_single_head_contract=true")
    print("existing_runner_single_head_checkout_contract=true")
    print("credential_native_preentry_v3_preserved=true")
    print("runner_bytes_and_policy_upgrade_required=true")
    print("binder_bytes_and_binder_native_preentry_upgrade_required=true")
    print("host_execution_authorized=false")
    print("installed_policy_mutation_authorized=false")
    print("credential_access_authorized=false")
    print("private_key_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("wc_void_market_activation_authorized=false")
    print("funds_movement_authorized=false")
    print("production_host_evidence_authority=false")
    print("plan_body_json=" + canonical(body).decode("ascii"))
    print("next_action=IMPLEMENT_EPOCH2_CREDENTIAL_RUNNER_V4_SOURCE_RUNTIME_COMPAT_SOURCE_ONLY")

def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--plan", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    emit_plan()
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ContractError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        raise SystemExit(2)
