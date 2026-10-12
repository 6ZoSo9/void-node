#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-held-settlement-candidate-chain-closeout-hold-v1"
MARKER="VOID_DATANET_WC_HELD_SETTLEMENT_CANDIDATE_CHAIN_CLOSEOUT_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-${BRICK}-proof.sh"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
echo "json_green=true"

echo "== binding =="
python3 - "$INDEX" "$CARD" <<'PY'
import json
import sys
from pathlib import Path

index_path = Path(sys.argv[1])
card_path = Path(sys.argv[2])

brick = "datanet-wc-held-settlement-candidate-chain-closeout-hold-v1"
marker = "VOID_DATANET_WC_HELD_SETTLEMENT_CANDIDATE_CHAIN_CLOSEOUT_HOLD_V1"

index = json.loads(index_path.read_text())
entries = {entry["id"]: entry for entry in index["entries"]}
assert brick in entries

entry = entries[brick]
assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/work-credits/{brick}.json"
assert entry["json"] == f"{brick}.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_held_settlement_candidate_chain_closeout"
assert entry["closeout_only"] is True
assert entry["candidate_chain_status"] == "closed_hold"
assert entry["wc_supply_unlimited_uncapped"] is True
assert entry["wc_supply_lifetime_cap_declared"] is False
assert entry["candidate_zero_amount_is_supply_cap"] is False
assert entry["wc_amount"] == 0
assert entry["void_amount"] == 0
assert entry["marker"] == marker

for key in [
    "wc_issuance_performed",
    "ledger_append_performed",
    "void_allocation_performed",
    "void_transfer_performed",
    "transaction_hash_exposed",
    "settlement_receipt_created",
    "verify_pack_created",
    "wallet_or_signer_required",
    "runtime_mutation_route_enabled",
]:
    assert entry[key] is False, key

card = json.loads(card_path.read_text())
assert card["schema"] == "void.public_node.work_credits.held_settlement_candidate_chain_closeout.v1"
assert card["id"] == brick
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["closeout_only"] is True
assert card["candidate_chain_status"] == "closed_hold"
assert card["source_rollup"] == "/public-node/work-credits/datanet-wc-held-settlement-candidate-chain-rollup-hold-v1.json"

policy = card["work_credits_policy"]
assert policy["wc_supply_unlimited_uncapped"] is True
assert policy["wc_supply_lifetime_cap_declared"] is False
assert policy["candidate_zero_amount_is_supply_cap"] is False
assert policy["candidate_amounts_are_placeholders_only"] is True

amounts = card["candidate_amounts"]
assert amounts["wc_amount"] == 0
assert amounts["void_amount"] == 0

state = card["closeout_state"]
for key in [
    "wc_issuance_performed",
    "ledger_append_performed",
    "void_allocation_performed",
    "void_transfer_performed",
    "transaction_created",
    "transaction_signed",
    "transaction_broadcast",
    "transaction_hash_exposed",
    "settlement_receipt_created",
    "settlement_receipt_published",
    "verify_pack_created",
    "verify_pack_published",
    "wallet_or_signer_accessed",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
]:
    assert state[key] is False, key

assert state["transaction_hash"] is None

safety = card["public_safety"]
for key in [
    "contains_private_operator_material",
    "contains_wallet_material",
    "contains_secret_material",
    "contains_transaction_hash",
    "contains_private_ledger_path",
    "contains_worker_private_identity",
    "public_mutation_enabled",
    "runtime_route_enabled",
    "wallet_or_signer_required",
]:
    assert safety[key] is False, key

print("held_settlement_candidate_chain_closeout_binding_green=true")
PY

echo "== marker presence =="
grep -R "$MARKER" "$INDEX" "$CARD" "$DOC" "$PROOF" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement scan =="
python3 - "$INDEX" "$CARD" "$DOC" <<'PY'
import sys
from pathlib import Path

paths = [Path(p) for p in sys.argv[1:]]

bad = [
    '"wc_supply_lifetime_cap_declared": true',
    '"candidate_zero_amount_is_supply_cap": true',
    '"wc_issuance_performed": true',
    '"ledger_append_performed": true',
    '"void_allocation_performed": true',
    '"void_transfer_performed": true',
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
echo "VOID_DATANET_WC_HELD_SETTLEMENT_CANDIDATE_CHAIN_CLOSEOUT_HOLD_V1_GREEN"
