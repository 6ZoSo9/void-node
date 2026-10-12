#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-status-reviewer-chain-closeout-audit-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CHAIN_CLOSEOUT_AUDIT_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-${BRICK}-proof.sh"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
echo "json_green=true"

echo "== source presence =="
python3 - <<'PY'
import json
from pathlib import Path

card = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-chain-closeout-audit-hold-v1.json").read_text())
for item in card["chain_entries"]:
    path = Path("public" + item["path"])
    assert path.exists(), str(path)
print("source_files_green=true")
PY

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CHAIN_CLOSEOUT_AUDIT_HOLD_V1"
entry_id = "datanet-wc-public-earn-status-reviewer-chain-closeout-audit-hold-v1"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {entry["id"]: entry for entry in index["entries"]}
assert entry_id in entries

entry = entries[entry_id]
assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/work-credits/{entry_id}.json"
assert entry["json"] == f"{entry_id}.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_wc_public_earn_status_reviewer_chain_closeout_audit"
assert entry["summary_only"] is True
assert entry["chain_closeout_audit_only"] is True
assert entry["chain_first_pr"] == 59
assert entry["chain_last_pr"] == 67
assert entry["chain_merged_pr_count"] == 9
assert entry["wc_supply_unlimited_uncapped"] is True
assert entry["wc_supply_lifetime_cap_declared"] is False
assert entry["earning_remains_held"] is True
assert entry["marker"] == marker

for key in [
    "live_earn_enabled",
    "public_submission_enabled",
    "accepts_work_packets",
    "review_decision_enabled",
    "wc_approval_enabled",
    "wc_issuance_enabled",
    "wc_ledger_write_enabled",
    "void_allocation_enabled",
    "void_transfer_enabled",
    "wallet_or_signer_required",
    "runtime_route_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
]:
    assert entry[key] is False, key

card = json.loads(Path(f"public/public-node/work-credits/{entry_id}.json").read_text())
assert card["schema"] == "void.public_node.work_credits.datanet_wc_public_earn_status_reviewer_chain_closeout_audit_hold.v1"
assert card["id"] == entry_id
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["audit_status"] == "chain_closeout_audit_only_hold"
assert card["summary_only"] is True
assert card["chain_closeout_audit_only"] is True
assert card["wc_supply_unlimited_uncapped"] is True
assert card["wc_supply_lifetime_cap_declared"] is False

chain = card["chain_range"]
assert chain["first_pr"] == 59
assert chain["last_pr"] == 67
assert chain["merged_prs"] == list(range(59, 68))
assert chain["merged_pr_count"] == 9

chain_entries = card["chain_entries"]
assert len(chain_entries) == 9
assert [item["pr"] for item in chain_entries] == list(range(59, 68))

for item in chain_entries:
    assert item["id"] in entries
    assert item["proof_marker"].startswith("VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_")
    assert item["proof_marker"].endswith("_GREEN")
    assert item["path"].startswith("/public-node/work-credits/")

held = card["what_is_held"]
for key in [
    "packet_intake",
    "public_submission_endpoint",
    "active_review_decision",
    "live_earning",
    "wc_approval",
    "wc_issuance",
    "wc_ledger_write",
    "void_allocation",
    "void_transfer",
    "wallet_access",
    "signer_access",
    "runtime_route",
    "mutation_handler",
]:
    assert held[key] == "held", key

for section, keys_false in {
    "wc_boundary": [
        "live_earn_enabled",
        "public_submission_enabled",
        "accepts_work_packets",
        "performs_review_decision",
        "approves_work_credits",
        "issues_work_credits",
        "creates_ledger_line",
        "appends_to_ledger_file",
        "writes_wc_ledger",
        "allocates_void",
        "transfers_void",
        "opens_execute_gate",
        "automatic_reward",
    ],
    "authority_boundary": [
        "creates_authority",
        "authorizes_execution",
        "authorizes_ledger_write_execution",
        "grants_signer_wallet_access",
        "moves_funds",
        "changes_datanet_storage",
        "changes_runtime_behavior",
        "adds_runtime_route",
        "activates_public_mutation",
    ],
    "public_safety": [
        "contains_private_operator_material",
        "contains_wallet_material",
        "contains_secret_material",
        "contains_transaction_hash",
        "public_mutation_enabled",
        "runtime_route_enabled",
        "runtime_mutation_route_enabled",
        "mutation_handler_enabled",
        "wallet_or_signer_required",
    ],
}.items():
    for key in keys_false:
        assert card[section][key] is False, f"{section}.{key}"

print("wc_public_earn_status_reviewer_chain_closeout_audit_binding_green=true")
PY

echo "== component proof stack =="
declare -A PROOFS=(
  [VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_ROLLUP_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-closeout-rollup-hold-v1-proof.sh"
  [VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_HTML_CARD_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-closeout-html-card-hold-v1-proof.sh"
  [VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-closeout-html-card-runtime-visibility-hold-v1-proof.sh"
  [VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-final-seal-hold-v1-proof.sh"
  [VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HTML_CARD_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-final-seal-html-card-hold-v1-proof.sh"
  [VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-final-seal-html-card-runtime-visibility-hold-v1-proof.sh"
  [VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-final-closeout-audit-rollup-hold-v1-proof.sh"
  [VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_CLOSEOUT_AUDIT_ROLLUP_HTML_CARD_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-final-closeout-audit-rollup-html-card-hold-v1-proof.sh"
  [VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_CLOSEOUT_AUDIT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-final-closeout-audit-rollup-html-card-runtime-visibility-hold-v1-proof.sh"
)
mkdir -p .runtime/mainnet0
for proof_marker in "${!PROOFS[@]}"; do
  out=".runtime/mainnet0/${BRICK}.${proof_marker}.log"
  bash "${PROOFS[$proof_marker]}" >"$out" 2>&1
  grep -F "$proof_marker" "$out" >/dev/null
done
echo "component_proof_stack_green=true"

echo "== marker presence =="
grep -q "$MARKER" "$INDEX"
grep -q "$MARKER" "$CARD"
grep -q "$MARKER" "$DOC"
grep -q "$MARKER" "$PROOF"
echo "marker_green=true"

echo "== forbidden enablement scan =="
python3 - <<'PY'
from pathlib import Path

files = [
    Path("public/public-node/work-credits/index.json"),
    Path("public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-chain-closeout-audit-hold-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-public-earn-status-reviewer-chain-closeout-audit-hold-v1.md"),
]

bad_json = [
    '"wc_supply_lifetime_cap_declared": true',
    '"live_earn_enabled": true',
    '"public_submission_enabled": true',
    '"accepts_work_packets": true',
    '"review_decision_enabled": true',
    '"wc_approval_enabled": true',
    '"wc_issuance_enabled": true',
    '"wc_ledger_write_enabled": true',
    '"void_allocation_enabled": true',
    '"void_transfer_enabled": true',
    '"wallet_or_signer_required": true',
    '"runtime_route_enabled": true',
    '"runtime_mutation_route_enabled": true',
    '"mutation_handler_enabled": true',
    '"creates_authority": true',
    '"adds_runtime_route": true',
    '"activates_public_mutation": true',
]

bad_phrases = [
    "earning is live",
    "public submission enabled",
    "work credits issued",
    "wc issuance enabled",
    "ledger write enabled",
    "ledger line created",
    "void allocation enabled",
    "void transfer enabled",
    "wallet access enabled",
    "signer access enabled",
    "runtime mutation route enabled",
    "mutation handler enabled",
    "transaction hash: 0x",
]

for path in files:
    text = path.read_text()
    lower = text.lower()
    for needle in bad_json:
        assert needle not in text, f"{needle} found in {path}"
    for phrase in bad_phrases:
        assert phrase not in lower, f"{phrase} found in {path}"

print("forbidden_enablement_scan_green=true")
PY

echo "== result =="
echo "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CHAIN_CLOSEOUT_AUDIT_HOLD_V1_GREEN"
