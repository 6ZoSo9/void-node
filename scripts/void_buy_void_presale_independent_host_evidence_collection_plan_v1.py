#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
from typing import Any

MARKER = "VOID_BUY_VOID_PRESALE_INDEPENDENT_HOST_EVIDENCE_COLLECTION_PLAN_V1"
SCHEMA = "void_buy_void_presale_independent_host_evidence_collection_plan_v1"
VERSION = 1
REPOSITORY = "6ZoSo9/void-node"
PARENT_HEAD = "45813f0de04ccccb8d12e0f0283096cb2b05843c"

HOST_QUALIFIER_REL = (
    "scripts/void_buy_void_presale_source_freeze_host_install_qualification_v2.py"
)
HOST_QUALIFIER_BLOB = "1c8299cb38e3a02c5e65c3d38d4863e8ee0c1005"
HOST_QUALIFIER_PROOF_REL = (
    "scripts/prove_buy_void_presale_source_freeze_host_install_qualification_v2.py"
)
HOST_QUALIFIER_PROOF_BLOB = "15813299b38ac146dd4b82b109fef72fbfb868c3"

LIVE_PLAN_REL = (
    "ops/precision/"
    "void_buy_void_source_finality_live_process_v2_collection_plan_v1.ts"
)
LIVE_PLAN_BLOB = "d47a6f99870f385c1bc938adbef74535b78eba1f"
DEPLOYMENT_VERIFIER_REL = (
    "src/economic/buy_void_source_finality_generation_provenance_v7.ts"
)
DEPLOYMENT_VERIFIER_BLOB = "390ff1a2ff0437cd8c8693e7807c12275df42573"
LIVE_BINDING_VERIFIER_REL = (
    "src/economic/buy_void_source_finality_live_process_binding_v2.ts"
)
LIVE_BINDING_VERIFIER_BLOB = "987c97568a4d1b9814218603df48a65dbfeed18f"
DEPLOYMENT_RECEIPT_PATH = "/var/lib/void-source-finality-v7/deployment-receipt.json"
LIVE_BINDING_RECEIPT_PATH = (
    "/var/lib/void-source-finality-v7/live-process-binding-v2.json"
)

CUSTODY_COLLECTOR_REL = "tools/void-buy-allocation-custody-host-evidence-v1.mjs"
CUSTODY_COLLECTOR_BLOB = "ce2892d50a1e5e2a31fc1dd7d8b9974a9034a712"
CUSTODY_DOC_REL = "docs/architecture/buy-void-allocation-custody-host-evidence-v1.md"
CUSTODY_DOC_BLOB = "10a95c941da517a0ba2e071c6845b17cebf0f708"
CUSTODY_CONFIG_ENV = "VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_CONFIG_JSON"
CUSTODY_CONFIG_KEYS = (
    "repo_root",
    "ledger_root",
    "custody_root",
    "runtime_user",
    "custody_user",
    "ipc_group",
    "socket_path",
    "service_unit",
    "runtime_service_unit",
)

EPOCH2_QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py"
)
EPOCH2_QUALIFIER_BLOB = "a04c2e7665294cdd142426e9eb01ee27c5292b8d"
EPOCH2_QUALIFIER_PROOF_REL = (
    "scripts/"
    "prove_void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py"
)
EPOCH2_QUALIFIER_PROOF_BLOB = "c14ec00acffbc55630aa68db0013d97cac068ab3"

SHA40 = re.compile(r"^[0-9a-f]{40}$")
UINT = re.compile(r"^[1-9][0-9]*$")


def canonical(value: object) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def positive(value: str, label: str) -> int:
    if UINT.fullmatch(value) is None:
        raise ValueError(label + "_invalid")
    parsed = int(value, 10)
    if parsed <= 0 or parsed > 9_007_199_254_740_991:
        raise ValueError(label + "_invalid")
    return parsed


def build(expected_head: str, runtime_uid: int, runtime_gid: int) -> dict[str, Any]:
    if SHA40.fullmatch(expected_head) is None:
        raise ValueError("expected_head_invalid")
    if runtime_uid <= 0 or runtime_gid <= 0:
        raise ValueError("runtime_identity_invalid")

    body: dict[str, Any] = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": VERSION,
        "repository": REPOSITORY,
        "parent_source_head": PARENT_HEAD,
        "expected_host": "zoso-Precision-Tower-7810",
        "expected_repository_head": expected_head,
        "inputs": {
            "runtime_uid": runtime_uid,
            "runtime_gid": runtime_gid,
            "allocation_custody_config_env": CUSTODY_CONFIG_ENV,
            "allocation_custody_config_required_keys": list(CUSTODY_CONFIG_KEYS),
        },
        "receipt_live_process_evidence": {
            "collection_source_path": LIVE_PLAN_REL,
            "collection_source_git_blob_sha1": LIVE_PLAN_BLOB,
            "deployment_verifier_source_path": DEPLOYMENT_VERIFIER_REL,
            "deployment_verifier_git_blob_sha1": DEPLOYMENT_VERIFIER_BLOB,
            "live_binding_verifier_source_path": LIVE_BINDING_VERIFIER_REL,
            "live_binding_verifier_git_blob_sha1": LIVE_BINDING_VERIFIER_BLOB,
            "deployment_receipt_path": DEPLOYMENT_RECEIPT_PATH,
            "live_process_binding_receipt_path": LIVE_BINDING_RECEIPT_PATH,
            "logical_invocation": [
                "npx",
                "tsx",
                LIVE_PLAN_REL,
                "--runtime-uid",
                str(runtime_uid),
                "--runtime-gid",
                str(runtime_gid),
            ],
            "host_root_required": True,
            "selector_process_execution_performed": True,
            "process_environment_read_performed": True,
            "filesystem_read_performed": True,
            "filesystem_write_performed": False,
            "network_contact_performed": False,
            "receipt_publication_authorized": False,
            "receipt_publisher_excluded": True,
            "expected_output_schema": "void_buy_void_v2_live_process_collection_plan_v1",
            "expected_output_file": "source-finality-live-process-plan-v1.json",
        },
        "allocation_custody_evidence": {
            "collector_source_path": CUSTODY_COLLECTOR_REL,
            "collector_git_blob_sha1": CUSTODY_COLLECTOR_BLOB,
            "operator_contract_path": CUSTODY_DOC_REL,
            "operator_contract_git_blob_sha1": CUSTODY_DOC_BLOB,
            "logical_invocation": ["node", CUSTODY_COLLECTOR_REL],
            "required_environment_variable": CUSTODY_CONFIG_ENV,
            "required_config_keys": list(CUSTODY_CONFIG_KEYS),
            "read_only_host_observation": True,
            "filesystem_write_performed": False,
            "host_mutation_performed": False,
            "runtime_integration": False,
            "payment_acceptance": False,
            "public_presale_activation": False,
            "funds_movement": False,
            "expected_output_schema": "void_buy_void_allocation_custody_host_evidence_v1",
            "expected_output_file": "allocation-custody-host-evidence-v1.json",
        },
        "epoch2_installed_generation_evidence": {
            "qualifier_source_path": EPOCH2_QUALIFIER_REL,
            "qualifier_git_blob_sha1": EPOCH2_QUALIFIER_BLOB,
            "qualifier_proof_path": EPOCH2_QUALIFIER_PROOF_REL,
            "qualifier_proof_git_blob_sha1": EPOCH2_QUALIFIER_PROOF_BLOB,
            "logical_invocation": [
                "/usr/bin/python3",
                "-I",
                "-B",
                EPOCH2_QUALIFIER_REL,
                "--run",
                "--expected-head",
                expected_head,
            ],
            "host_root_required": True,
            "native_self_test_execution": True,
            "native_self_test_descriptor_bound": True,
            "runner_execution": False,
            "live_composition_execution": False,
            "credential_access": False,
            "private_key_access": False,
            "signing": False,
            "transaction": False,
            "payment_acceptance": False,
            "public_presale_activation": False,
            "funds_movement": False,
            "output_extraction": "result_json_line",
            "expected_output_marker": "VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V5",
            "expected_output_file": "epoch2-installed-qualification-v5.json",
        },
        "parent_host_classifier": {
            "source_path": HOST_QUALIFIER_REL,
            "source_git_blob_sha1": HOST_QUALIFIER_BLOB,
            "proof_path": HOST_QUALIFIER_PROOF_REL,
            "proof_git_blob_sha1": HOST_QUALIFIER_PROOF_BLOB,
            "host_install_qualified": False,
            "installed_receipt_authenticity_verified": False,
            "allocation_custody_qualified": False,
            "epoch2_installed_generation_qualified": False,
        },
        "authority": {
            "collection_plan_only": True,
            "host_execution_authorized": False,
            "receipt_publication_authorized": False,
            "filesystem_write_authorized": False,
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
        },
        "next_gate": "SEPARATELY_AUTHORIZE_PRESALE_INDEPENDENT_HOST_EVIDENCE_COLLECTION_V1",
    }
    plan_id = "voidpresalehostevplan1_" + sha256(canonical(body))
    return {**body, "plan_id": plan_id}


def self_test() -> None:
    value = build("a" * 40, 1000, 1000)
    assert value["plan_id"].startswith("voidpresalehostevplan1_")
    assert len(value["plan_id"]) == len("voidpresalehostevplan1_") + 64
    assert value["receipt_live_process_evidence"]["receipt_publisher_excluded"] is True
    assert value["receipt_live_process_evidence"]["filesystem_write_performed"] is False
    assert value["allocation_custody_evidence"]["host_mutation_performed"] is False
    assert value["epoch2_installed_generation_evidence"]["runner_execution"] is False
    assert value["epoch2_installed_generation_evidence"]["native_self_test_execution"] is True
    assert value["parent_host_classifier"]["host_install_qualified"] is False
    assert all(flag is False for key, flag in value["authority"].items() if key != "collection_plan_only")
    assert value["authority"]["collection_plan_only"] is True
    print(MARKER + "_SELF_TEST_GREEN")
    print("three_independent_evidence_domains=true")
    print("receipt_publisher_excluded=true")
    print("receipt_collection_is_root_sensitive=true")
    print("custody_collection_is_read_only=true")
    print("epoch2_native_self_test_execution_disclosed=true")
    print("host_execution_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("funds_movement_authorized=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--plan", action="store_true")
    parser.add_argument("--expected-head", default="")
    parser.add_argument("--runtime-uid", default="")
    parser.add_argument("--runtime-gid", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0

    if not args.expected_head or not args.runtime_uid or not args.runtime_gid:
        raise SystemExit("expected-head/runtime-uid/runtime-gid required")
    try:
        result = build(
            args.expected_head,
            positive(args.runtime_uid, "runtime_uid"),
            positive(args.runtime_gid, "runtime_gid"),
        )
    except ValueError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("host_execution_authorized=false")
        print("payment_acceptance_authorized=false")
        print("funds_movement_authorized=false")
        return 2

    print(MARKER)
    print("status=PLAN_GREEN")
    print("plan_id=" + result["plan_id"])
    print("host_execution_authorized=false")
    print("receipt_publication_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("funds_movement_authorized=false")
    print("plan_json=" + canonical(result).decode("ascii"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
