#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-held-settlement-candidate-chain-rollup-hold-v1"
MARKER="VOID_DATANET_WC_HELD_SETTLEMENT_CANDIDATE_CHAIN_ROLLUP_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-${BRICK}-proof.sh"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
echo "json_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

brick = "datanet-wc-held-settlement-candidate-chain-rollup-hold-v1"
marker = "VOID_DATANET_WC_HELD_SETTLEMENT_CANDIDATE_CHAIN_ROLLUP_HOLD_V1"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {entry["id"]: entry for entry in index["entries"]}
assert brick in entries

entry = entries[brick]
assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/work-credits/{brick}.json"
assert entry["json"] == f"{brick}.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_held_settlement_candidate_chain_rollup"
assert entry["rollup_only"] is True
assert entry["candidate_chain_status"] == "hold"
assert entry["wc_amount"] == 0
assert entry["void_amount"] == 0
assert entry["wc_supply_lifetime_cap_declared"] is False
assert entry["candidate_zero_amount_is_supply_cap"] is False
assert entry["wc_issuance_performed"] is False
assert entry["ledger_append_performed"] is False
assert entry["void_allocation_performed"] is False
assert entry["void_transfer_performed"] is False
assert entry["transaction_hash_exposed"] is False
assert entry["settlement_receipt_created"] is False
assert entry["verify_pack_created"] is False
assert entry["wallet_or_signer_required"] is False
assert entry["runtime_mutation_route_enabled"] is False
assert entry["marker"] == marker

card = json.loads(Path(f"public/public-node/work-credits/{brick}.json").read_text())
assert card["schema"] == "void.public_node.work_credits.held_settlement_candidate_chain_rollup.v1"
assert card["id"] == brick
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["rollup_only"] is True

policy = card["work_credits_policy"]
assert policy["wc_supply_unlimited_uncapped"] is True
assert policy["wc_supply_lifetime_cap_declared"] is False
assert policy["candidate_zero_amount_is_supply_cap"] is False
assert policy["candidate_amounts_are_placeholders_only"] is True

amounts = card["candidate_amounts"]
assert amounts["wc_amount"] == 0
assert amounts["void_amount"] == 0

chain = card["candidate_chain"]
required_refs = [
    "ledger_write_packet_candidate",
    "wc_issuance_packet_candidate",
    "void_allocation_packet_candidate",
    "void_transfer_packet_candidate",
    "transfer_execute_gate_candidate",
    "transfer_execution_result_candidate",
    "redacted_settlement_receipt_candidate",
    "redacted_settlement_receipt_verify_pack_candidate",
]
for key in required_refs:
    assert key in chain
    assert chain[key].startswith("/public-node/work-credits/")
    assert chain[key].endswith(".json")

state = card["chain_state"]
assert state["candidate_chain_status"] == "hold"
assert state["ledger_write_packet_candidate_present"] is True
assert state["wc_issuance_packet_candidate_present"] is True
assert state["void_allocation_packet_candidate_present"] is True
assert state["void_transfer_packet_candidate_present"] is True
assert state["transfer_execute_gate_candidate_present"] is True
assert state["transfer_execution_result_candidate_present"] is True
assert state["redacted_settlement_receipt_candidate_present"] is True
assert state["redacted_settlement_receipt_verify_pack_candidate_present"] is True
assert state["wc_issuance_performed"] is False
assert state["ledger_append_performed"] is False
assert state["void_allocation_performed"] is False
assert state["void_transfer_performed"] is False
assert state["execute_gate_opened"] is False
assert state["execution_authorized"] is False
assert state["transaction_created"] is False
assert state["transaction_signed"] is False
assert state["transaction_broadcast"] is False
assert state["transaction_hash"] is None
assert state["transaction_hash_exposed"] is False
assert state["settlement_receipt_created"] is False
assert state["settlement_receipt_published"] is False
assert state["verify_pack_created"] is False
assert state["verify_pack_published"] is False
assert state["wallet_or_signer_accessed"] is False
assert state["runtime_mutation_route_enabled"] is False
assert state["mutation_handler_enabled"] is False

safety = card["public_safety"]
assert safety["contains_private_operator_material"] is False
assert safety["contains_wallet_material"] is False
assert safety["contains_secret_material"] is False
assert safety["contains_transaction_hash"] is False
assert safety["contains_private_ledger_path"] is False
assert safety["contains_worker_private_identity"] is False
assert safety["buyer_or_worker_action_required"] is False
assert safety["public_mutation_enabled"] is False
assert safety["runtime_route_enabled"] is False
assert safety["wallet_or_signer_required"] is False

print("held_settlement_candidate_chain_rollup_binding_green=true")
PY

echo "== marker presence =="
grep -R "$MARKER" "$INDEX" "$CARD" "$DOC" "$PROOF" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement scan =="
python3 - <<'PY'
from pathlib import Path

paths = [
    Path("public/public-node/work-credits/index.json"),
    Path("public/public-node/work-credits/datanet-wc-held-settlement-candidate-chain-rollup-hold-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-held-settlement-candidate-chain-rollup-hold-v1.md"),
]

bad = [
    '"wc_supply_lifetime_cap_declared": true',
    '"candidate_zero_amount_is_supply_cap": true',
    '"wc_issuance_performed": true',
    '"ledger_append_performed": true',
    '"void_allocation_performed": true',
    '"void_transfer_performed": true',
    '"execute_gate_opened": true',
    '"execution_authorized": true',
    '"transaction_created": true',
    '"transaction_signed": true',
    '"transaction_broadcast": true',
    '"transaction_hash_exposed": true',
    '"settlement_receipt_created": true',
    '"settlement_receipt_published": true',
    '"verify_pack_created": true',
    '"verify_pack_published": true',
    '"wallet_or_signer_accessed": true',
    '"runtime_mutation_route_enabled": true',
    '"mutation_handler_enabled": true',
    '"wallet_or_signer_required": true',
    '"public_mutation_enabled": true',
    '"runtime_route_enabled": true',
    '"contains_private_operator_material": true',
    '"contains_wallet_material": true',
    '"contains_secret_material": true',
    '"contains_transaction_hash": true',
    '"contains_private_ledger_path": true',
    '"contains_worker_private_identity": true',
    '"transaction_hash": "0x',
]

hits = []
for path in paths:
    text = path.read_text()
    for needle in bad:
        if needle in text:
            hits.append(f"{path}:{needle}")

if hits:
    print("\n".join(hits))
    raise SystemExit("forbidden_enablement_scan_green=false")

print("forbidden_enablement_scan_green=true")
PY

echo "== result =="
echo "VOID_DATANET_WC_HELD_SETTLEMENT_CANDIDATE_CHAIN_ROLLUP_HOLD_V1_GREEN"
