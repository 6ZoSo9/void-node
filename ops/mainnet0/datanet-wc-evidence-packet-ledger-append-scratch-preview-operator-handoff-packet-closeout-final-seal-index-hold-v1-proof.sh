#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1"
SOURCE_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_HOLD_V1"
OPERATOR_HANDOFF_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_HOLD_V1"
TERMINAL_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1"
TERMINAL_CLOSEOUT_FINAL_SEAL_INDEX_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1"
TERMINAL_CLOSEOUT_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_HOLD_V1"
TERMINAL_ROLLUP_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_HOLD_V1"
PRIOR_FINAL_CLOSEOUT_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1"

TOOL="tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-handoff-packet-closeout-final-seal-index.mjs"
DOC="docs/datanet/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-handoff-packet-closeout-final-seal-index-hold-v1.md"
PREV_PROOF="ops/mainnet0/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-handoff-packet-closeout-hold-v1-proof.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

INPUT="$TMP_DIR/operator-handoff-packet-closeout.json"
OUT_A="$TMP_DIR/final-seal-index-a.json"
OUT_B="$TMP_DIR/final-seal-index-b.json"
BAD_SOURCE="$TMP_DIR/bad-source.json"
BAD_MARKER="$TMP_DIR/bad-marker.json"
CREATED_AT="2026-07-02T00:00:00.000Z"

echo "== tools exist / syntax =="
test -x "$TOOL"
test -f "$DOC"
test -x "$PREV_PROOF"
node --check "$TOOL"
bash -n "$PREV_PROOF"

echo "== operator handoff packet closeout source proof =="
bash "$PREV_PROOF"

echo "== create fixture operator handoff packet closeout =="
python3 - "$INPUT" "$SOURCE_MARKER" "$OPERATOR_HANDOFF_MARKER" "$TERMINAL_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_MARKER" "$TERMINAL_CLOSEOUT_FINAL_SEAL_INDEX_MARKER" "$TERMINAL_CLOSEOUT_MARKER" "$TERMINAL_ROLLUP_MARKER" "$PRIOR_FINAL_CLOSEOUT_MARKER" <<'PYFIX'
import hashlib, json, sys
out, source_marker, handoff_marker, terminal_closeout_final_closeout_marker, terminal_closeout_final_marker, terminal_closeout_marker, terminal_rollup_marker, prior_final_closeout_marker = sys.argv[1:]
def h(label):
    return hashlib.sha256(label.encode()).hexdigest()
record = {
    "schema": "void.datanet.wc.evidence_packet_ledger_append_scratch_preview_operator_handoff_packet_closeout.v1",
    "marker": source_marker,
    "status": "scratch_preview_operator_handoff_packet_closed_for_operator_review",
    "scratch_preview_operator_handoff_packet_closeout_id": h("operator-handoff-packet-closeout-id"),
    "created_at": "2026-07-02T00:00:00.000Z",
    "closer": "operator-handoff-closeout",
    "reason": "close out scratch preview operator handoff packet for manual review only",
    "operator_handoff_packet": {
        "path": "/tmp/operator-handoff-packet.json",
        "marker": handoff_marker,
        "scratch_preview_operator_handoff_packet_id": h("operator-handoff-packet-id"),
        "operator": "manual-operator",
        "review_window": "manual-review-window",
        "reason": "operator review handoff for scratch preview only",
    },
    "terminal_rollup_closeout_final_seal_index_closeout": {
        "marker": terminal_closeout_final_closeout_marker,
        "scratch_preview_terminal_rollup_closeout_final_seal_index_closeout_id": h("terminal-rollup-closeout-final-seal-index-closeout-id"),
    },
    "terminal_rollup_closeout_final_seal_index": {
        "marker": terminal_closeout_final_marker,
        "scratch_preview_terminal_rollup_closeout_final_seal_index_id": h("terminal-rollup-closeout-final-seal-index-id"),
    },
    "terminal_rollup_closeout": {
        "marker": terminal_closeout_marker,
        "scratch_preview_terminal_rollup_closeout_id": h("terminal-rollup-closeout-id"),
    },
    "terminal_rollup": {
        "marker": terminal_rollup_marker,
        "scratch_preview_terminal_rollup_id": h("terminal-rollup-id"),
    },
    "prior_final_seal_index_closeout": {
        "marker": prior_final_closeout_marker,
        "scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id": h("prior-final-closeout-id"),
    },
    "sealed_chain": {
        "final_seal_index_id": h("final-seal-index"),
        "review_index_closeout_id": h("review-index-closeout"),
        "review_index_id": h("review-index"),
        "receipt_closeout_id": h("receipt-closeout"),
        "receipt_id": h("receipt"),
        "scratch_apply_id": h("scratch-apply"),
        "execute_packet_id": h("execute"),
        "dry_run_id": h("dry-run"),
        "ledger_write_packet_id": h("ledger-write"),
        "evidence_hash": h("evidence"),
        "work_id": "demo-datanet-verification-artifact",
        "worker": "local-contributor",
    },
    "scratch_ledger": {
        "current_scratch_ledger_hash": h("current-scratch"),
        "scratch_ledger_out_hash": h("scratch-out"),
        "appended_line_hash": h("line"),
        "logical_candidate_next_ledger_hash": h("logical-next"),
    },
    "closeout_summary": {
        "operator_handoff_packet_bound": True,
        "fully_closed_scratch_preview_chain_handoff_closed_for_operator_review": True,
        "scratch_preview_operator_handoff_packet_closeout_only": True,
        "operator_review_ready": True,
        "canonical_ledger_ready_for_later_manual_operator_decision_only": True,
        "canonical_ledger_append_performed": False,
        "wc_issuance_performed": False,
        "wc_claim_performed": False,
        "actual_wc_ledger_write_performed": False,
    },
    "work_credits_policy": {
        "useful_verifiable_work_only": True,
        "unlimited_uncapped_accounting_units": True,
        "finite_approved_amount_for_this_review": True,
        "scratch_preview_operator_handoff_packet_closeout_only": True,
    },
    "boundary": {
        "scratch_preview_operator_handoff_packet_closeout_only": True,
        "operator_handoff_packet_only_source": True,
        "terminal_rollup_closeout_final_seal_index_closeout_only_source": True,
        "terminal_rollup_closeout_final_seal_index_only_source": True,
        "terminal_rollup_closeout_only_source": True,
        "terminal_rollup_only_source": True,
        "scratch_preview_chain_review_only": True,
        "canonical_ledger_append_performed": False,
        "wc_issuance_enabled": False,
        "wc_claim_enabled": False,
        "wc_ledger_write_enabled": False,
        "void_transfer_enabled": False,
        "usdc_transfer_enabled": False,
        "wallet_connection_enabled": False,
        "signer_access_enabled": False,
        "network_submit_enabled": False,
        "public_mutation_enabled": False,
    },
}
with open(out, "w", encoding="utf-8") as f:
    json.dump(record, f, indent=2)
    f.write("\n")
PYFIX
fixture_operator_handoff_packet_closeout_green=true

echo "== operator handoff packet closeout final seal index =="
VOID_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_FINAL_SEAL_INDEX_CREATED_AT="$CREATED_AT" node "$TOOL" \
  --operator-handoff-packet-closeout "$INPUT" \
  --out "$OUT_A" \
  --sealer "operator-handoff-closeout-final-seal-index" \
  --reason "seal scratch preview operator handoff packet closeout for manual review only" >/dev/null
VOID_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_FINAL_SEAL_INDEX_CREATED_AT="$CREATED_AT" node "$TOOL" \
  --operator-handoff-packet-closeout "$INPUT" \
  --out "$OUT_B" \
  --sealer "operator-handoff-closeout-final-seal-index" \
  --reason "seal scratch preview operator handoff packet closeout for manual review only" >/dev/null
cmp -s "$OUT_A" "$OUT_B"
echo "operator_handoff_packet_closeout_final_seal_index_deterministic_green=true"

echo "== operator handoff packet closeout final seal index binding =="
python3 - "$OUT_A" "$MARKER" "$SOURCE_MARKER" <<'PYCHECK'
import json, sys
path, marker, source_marker = sys.argv[1:]
with open(path, encoding="utf-8") as f:
    data = json.load(f)
assert data["marker"] == marker
assert data["status"] == "scratch_preview_operator_handoff_packet_closeout_final_seal_index_ready_for_operator_review"
assert len(data["scratch_preview_operator_handoff_packet_closeout_final_seal_index_id"]) == 64
assert data["source_operator_handoff_packet_closeout"]["marker"] == source_marker
summary = data["final_seal_summary"]
assert summary["operator_handoff_packet_closeout_bound"] is True
assert summary["scratch_preview_operator_handoff_packet_closeout_final_seal_index_only"] is True
assert summary["canonical_ledger_append_performed"] is False
assert summary["wc_issuance_performed"] is False
assert summary["wc_claim_performed"] is False
assert summary["actual_wc_ledger_write_performed"] is False
boundary = data["boundary"]
assert boundary["scratch_preview_operator_handoff_packet_closeout_final_seal_index_only"] is True
for key in ["wc_issuance_enabled", "wc_claim_enabled", "wc_ledger_write_enabled", "void_transfer_enabled", "usdc_transfer_enabled", "wallet_connection_enabled", "signer_access_enabled", "network_submit_enabled", "public_mutation_enabled"]:
    assert boundary[key] is False
PYCHECK
echo "operator_handoff_packet_closeout_final_seal_index_binding_green=true"

echo "== bad operator handoff packet closeout rejection =="
python3 - "$INPUT" "$BAD_SOURCE" <<'PYBAD'
import json, sys
src, dst = sys.argv[1:]
with open(src, encoding="utf-8") as f:
    data = json.load(f)
data["status"] = "not_closed"
with open(dst, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PYBAD
if VOID_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_FINAL_SEAL_INDEX_CREATED_AT="$CREATED_AT" node "$TOOL" --operator-handoff-packet-closeout "$BAD_SOURCE" --out "$TMP_DIR/bad-out.json" --sealer "operator" --reason "bad" >/dev/null 2>&1; then
  echo "bad_operator_handoff_packet_closeout_rejection_failed"
  exit 1
fi
echo "bad_operator_handoff_packet_closeout_rejection_green=true"

echo "== bad marker rejection =="
python3 - "$INPUT" "$BAD_MARKER" <<'PYMARK'
import json, sys
src, dst = sys.argv[1:]
with open(src, encoding="utf-8") as f:
    data = json.load(f)
data["marker"] = "BAD_MARKER"
with open(dst, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PYMARK
if VOID_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_FINAL_SEAL_INDEX_CREATED_AT="$CREATED_AT" node "$TOOL" --operator-handoff-packet-closeout "$BAD_MARKER" --out "$TMP_DIR/bad-marker-out.json" --sealer "operator" --reason "bad" >/dev/null 2>&1; then
  echo "bad_marker_rejection_failed"
  exit 1
fi
echo "bad_marker_rejection_green=true"

echo "== marker/source presence =="
grep -q "$MARKER" "$TOOL" "$DOC" "$0"
grep -q "$SOURCE_MARKER" "$TOOL" "$0"
grep -qi "operator handoff packet closeout final seal index" "$DOC"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|cap(ped)?[[:space:]]+at[[:space:]]+100' "$TOOL" "$DOC" "$0"; then
  echo "forbidden_wc_cap_wording_found"
  exit 1
fi
echo "forbidden_wc_cap_wording_scan_green=true"

echo "== no mutation authority scan =="
if grep -RInE 'canonical_ledger_append_performed[" ]*:[[:space:]]*true|wc_issuance_enabled[" ]*:[[:space:]]*true|wc_claim_enabled[" ]*:[[:space:]]*true|wc_ledger_write_enabled[" ]*:[[:space:]]*true|network_submit_enabled[" ]*:[[:space:]]*true|public_mutation_enabled[" ]*:[[:space:]]*true' "$TOOL" "$DOC" "$0"; then
  echo "mutation_authority_found"
  exit 1
fi
echo "no_mutation_authority_scan_green=true"

echo "== result =="
echo "${MARKER}_GREEN"
