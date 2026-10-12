#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-held-redacted-settlement-receipt-verify-pack-candidate-hold-v1"
MARKER="VOID_DATANET_WC_HELD_REDACTED_SETTLEMENT_RECEIPT_VERIFY_PACK_CANDIDATE_HOLD_V1"

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

brick = "datanet-wc-held-redacted-settlement-receipt-verify-pack-candidate-hold-v1"
marker = "VOID_DATANET_WC_HELD_REDACTED_SETTLEMENT_RECEIPT_VERIFY_PACK_CANDIDATE_HOLD_V1"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {entry["id"]: entry for entry in index["entries"]}
assert brick in entries

entry = entries[brick]
assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/work-credits/{brick}.json"
assert entry["json"] == f"{brick}.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_held_redacted_settlement_receipt_verify_pack_candidate"
assert entry["verify_pack_candidate_only"] is True
assert entry["verify_pack_created"] is False
assert entry["verify_pack_published"] is False
assert entry["settlement_receipt_created"] is False
assert entry["settlement_receipt_published"] is False
assert entry["ledger_append_performed"] is False
assert entry["transaction_hash_exposed"] is False
assert entry["void_transfer_performed"] is False
assert entry["wc_amount"] == 0
assert entry["void_amount"] == 0
assert entry["wallet_or_signer_required"] is False
assert entry["runtime_mutation_route_enabled"] is False
assert entry["marker"] == marker

card = json.loads(Path(f"public/public-node/work-credits/{brick}.json").read_text())
assert card["schema"] == "void.public_node.work_credits.held_redacted_settlement_receipt_verify_pack_candidate.v1"
assert card["id"] == brick
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["verify_pack_candidate_only"] is True
assert card["candidate_amounts"]["wc_amount"] == 0
assert card["candidate_amounts"]["void_amount"] == 0

state = card["verify_pack_state"]
assert state["verify_pack_created"] is False
assert state["verify_pack_published"] is False
assert state["verify_pack_status"] == "not_created_hold"
assert state["settlement_receipt_created"] is False
assert state["settlement_receipt_published"] is False
assert state["public_receipt_created"] is False
assert state["worker_receipt_created"] is False
assert state["ledger_append_performed"] is False
assert state["execution_result_created"] is False
assert state["void_transfer_performed"] is False
assert state["transaction_created"] is False
assert state["transaction_signed"] is False
assert state["transaction_broadcast"] is False
assert state["transaction_hash"] is None
assert state["transaction_hash_exposed"] is False
assert state["wallet_or_signer_accessed"] is False
assert state["runtime_mutation_route_enabled"] is False
assert state["mutation_handler_enabled"] is False

surfaces = card["verification_surfaces"]
assert surfaces["public_verification_pack_enabled"] is False
assert surfaces["public_receipt_verification_enabled"] is False
assert surfaces["tx_hash_verification_enabled"] is False
assert surfaces["ledger_line_verification_enabled"] is False
assert surfaces["worker_identity_verification_enabled"] is False

redaction = card["redaction_policy"]
assert redaction["redacted_public_verify_pack_only"] is True
assert redaction["contains_private_operator_material"] is False
assert redaction["contains_wallet_material"] is False
assert redaction["contains_secret_material"] is False
assert redaction["contains_transaction_hash"] is False
assert redaction["contains_worker_private_identity"] is False
assert redaction["contains_private_ledger_path"] is False
assert redaction["public_tx_hash_exposure_enabled"] is False

safety = card["public_safety"]
assert safety["buyer_or_worker_action_required"] is False
assert safety["public_mutation_enabled"] is False
assert safety["runtime_route_enabled"] is False
assert safety["mutation_handler_enabled"] is False
assert safety["wallet_or_signer_required"] is False

source = card["source_chain"]
assert source["redacted_settlement_receipt_candidate"] == "/public-node/work-credits/datanet-wc-held-redacted-settlement-receipt-candidate-hold-v1.json"

print("held_redacted_settlement_receipt_verify_pack_candidate_binding_green=true")
PY

echo "== marker presence =="
grep -R "$MARKER" "$INDEX" "$CARD" "$DOC" "$PROOF" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement scan =="
python3 - <<'PY'
from pathlib import Path

paths = [
    Path("public/public-node/work-credits/index.json"),
    Path("public/public-node/work-credits/datanet-wc-held-redacted-settlement-receipt-verify-pack-candidate-hold-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-held-redacted-settlement-receipt-verify-pack-candidate-hold-v1.md"),
]

bad = [
    '"verify_pack_created": true',
    '"verify_pack_published": true',
    '"settlement_receipt_created": true',
    '"settlement_receipt_published": true',
    '"public_receipt_created": true',
    '"worker_receipt_created": true',
    '"ledger_append_performed": true',
    '"execution_result_created": true',
    '"void_transfer_performed": true',
    '"transaction_created": true',
    '"transaction_signed": true',
    '"transaction_broadcast": true',
    '"transaction_hash_exposed": true',
    '"wallet_or_signer_accessed": true',
    '"runtime_mutation_route_enabled": true',
    '"mutation_handler_enabled": true',
    '"public_mutation_enabled": true',
    '"runtime_route_enabled": true',
    '"wallet_or_signer_required": true',
    '"public_verification_pack_enabled": true',
    '"public_receipt_verification_enabled": true',
    '"tx_hash_verification_enabled": true',
    '"ledger_line_verification_enabled": true',
    '"worker_identity_verification_enabled": true',
    '"contains_private_operator_material": true',
    '"contains_wallet_material": true',
    '"contains_secret_material": true',
    '"contains_transaction_hash": true',
    '"contains_worker_private_identity": true',
    '"contains_private_ledger_path": true',
    '"public_tx_hash_exposure_enabled": true',
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
echo "VOID_DATANET_WC_HELD_REDACTED_SETTLEMENT_RECEIPT_VERIFY_PACK_CANDIDATE_HOLD_V1_GREEN"
