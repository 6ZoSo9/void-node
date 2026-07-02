#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_HOLD_V1"
SOURCE_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_HOLD_V1"
TERMINAL_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1"
TERMINAL_CLOSEOUT_FINAL_SEAL_INDEX_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1"
TERMINAL_CLOSEOUT_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_HOLD_V1"
TERMINAL_ROLLUP_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_HOLD_V1"
PRIOR_FINAL_CLOSEOUT_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1"

TOOL="tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-handoff-packet-closeout.mjs"
DOC="docs/datanet/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-handoff-packet-closeout-hold-v1.md"
PREV_PROOF="ops/mainnet0/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-handoff-packet-hold-v1-proof.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

INPUT="$TMP_DIR/operator-handoff-packet.json"
OUT_A="$TMP_DIR/operator-handoff-closeout-a.json"
OUT_B="$TMP_DIR/operator-handoff-closeout-b.json"
BAD_SOURCE="$TMP_DIR/bad-source.json"
BAD_MARKER="$TMP_DIR/bad-marker.json"
CREATED_AT="2026-07-02T00:00:00.000Z"

echo "== tools exist / syntax =="
test -x "$TOOL"
node --check "$TOOL"
bash -n "$PREV_PROOF"

echo "== operator handoff packet source proof =="
bash "$PREV_PROOF"

echo "== create fixture operator handoff packet =="
python3 - "$INPUT" "$SOURCE_MARKER" "$TERMINAL_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_MARKER" "$TERMINAL_CLOSEOUT_FINAL_SEAL_INDEX_MARKER" "$TERMINAL_CLOSEOUT_MARKER" "$TERMINAL_ROLLUP_MARKER" "$PRIOR_FINAL_CLOSEOUT_MARKER" <<'PYFIX'
import json, sys
out, source_marker, terminal_final_close_marker, terminal_final_marker, terminal_close_marker, terminal_marker, prior_final_close_marker = sys.argv[1:]
hexes = {k: (c * 64) for k, c in {
    "handoff": "0",
    "terminal_final_closeout": "1",
    "terminal_final": "2",
    "terminal_closeout": "3",
    "terminal": "4",
    "prior_final_closeout": "5",
    "final_seal_index": "6",
    "review_index_closeout": "7",
    "review_index": "8",
    "receipt_closeout": "9",
    "receipt": "a",
    "scratch_apply": "b",
    "execute": "c",
    "dry_run": "d",
    "ledger_write": "e",
    "evidence": "f",
    "current_scratch": "0",
    "scratch_out": "1",
    "line": "2",
    "logical_next": "3",
}.items()}
record = {
    "schema": "void.datanet.wc.evidence_packet_ledger_append_scratch_preview_operator_handoff_packet.v1",
    "marker": source_marker,
    "status": "scratch_preview_operator_handoff_packet_ready_for_manual_review",
    "scratch_preview_operator_handoff_packet_id": hexes["handoff"],
    "created_at": "2026-07-02T00:00:00.000Z",
    "operator": "operator-handoff",
    "review_window": "manual operator review before any later canonical decision lane",
    "reason": "fixture handoff binds fully closed scratch preview chain only",
    "terminal_rollup_closeout_final_seal_index_closeout": {
        "path": "/tmp/terminal-rollup-closeout-final-seal-index-closeout.json",
        "marker": terminal_final_close_marker,
        "scratch_preview_terminal_rollup_closeout_final_seal_index_closeout_id": hexes["terminal_final_closeout"],
        "closer": "terminal-final-closeout-operator",
        "reason": "fixture terminal final closeout",
    },
    "terminal_rollup_closeout_final_seal_index": {
        "marker": terminal_final_marker,
        "scratch_preview_terminal_rollup_closeout_final_seal_index_id": hexes["terminal_final"],
        "indexer": "terminal-final-indexer",
        "reason": "fixture terminal final seal index",
    },
    "terminal_rollup_closeout": {
        "marker": terminal_close_marker,
        "scratch_preview_terminal_rollup_closeout_id": hexes["terminal_closeout"],
        "closer": "terminal-closeout-operator",
        "reason": "fixture terminal closeout",
    },
    "terminal_rollup": {
        "marker": terminal_marker,
        "scratch_preview_terminal_rollup_id": hexes["terminal"],
        "operator": "terminal-rollup-operator",
        "reason": "fixture terminal rollup",
    },
    "prior_final_seal_index_closeout": {
        "marker": prior_final_close_marker,
        "scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id": hexes["prior_final_closeout"],
        "closer": "prior-final-closeout-operator",
        "reason": "fixture prior final closeout",
    },
    "sealed_chain": {
        "final_seal_index_id": hexes["final_seal_index"],
        "review_index_closeout_id": hexes["review_index_closeout"],
        "review_index_id": hexes["review_index"],
        "receipt_closeout_id": hexes["receipt_closeout"],
        "receipt_id": hexes["receipt"],
        "scratch_apply_id": hexes["scratch_apply"],
        "execute_packet_id": hexes["execute"],
        "dry_run_id": hexes["dry_run"],
        "ledger_write_packet_id": hexes["ledger_write"],
        "evidence_hash": hexes["evidence"],
        "work_id": "demo-datanet-verification-artifact",
        "worker": "local-contributor",
    },
    "scratch_ledger": {
        "current_scratch_ledger_hash": hexes["current_scratch"],
        "scratch_ledger_out_hash": hexes["scratch_out"],
        "appended_line_hash": hexes["line"],
        "logical_candidate_next_ledger_hash": hexes["logical_next"],
    },
    "handoff_summary": {
        "terminal_rollup_closeout_final_seal_index_closeout_bound": True,
        "fully_closed_scratch_preview_chain_bound_for_operator_review": True,
        "scratch_preview_operator_handoff_packet_only": True,
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
        "scratch_preview_operator_handoff_packet_only": True,
    },
    "boundary": {
        "scratch_preview_operator_handoff_packet_only": True,
        "terminal_rollup_closeout_final_seal_index_closeout_only_source": True,
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
fixture_operator_handoff_packet_green=true

echo "== operator handoff packet closeout =="
VOID_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_CREATED_AT="$CREATED_AT" node "$TOOL" \
  --operator-handoff-packet "$INPUT" \
  --out "$OUT_A" \
  --closer "operator-handoff-closeout" \
  --reason "close out scratch preview operator handoff packet for manual review only" >/dev/null
VOID_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_CREATED_AT="$CREATED_AT" node "$TOOL" \
  --operator-handoff-packet "$INPUT" \
  --out "$OUT_B" \
  --closer "operator-handoff-closeout" \
  --reason "close out scratch preview operator handoff packet for manual review only" >/dev/null
cmp -s "$OUT_A" "$OUT_B"
echo "operator_handoff_packet_closeout_deterministic_green=true"

echo "== operator handoff packet closeout binding =="
python3 - "$OUT_A" "$MARKER" "$SOURCE_MARKER" <<'PYCHECK'
import json, sys
path, marker, source_marker = sys.argv[1:]
with open(path, encoding="utf-8") as f:
    data = json.load(f)
assert data["marker"] == marker
assert data["status"] == "scratch_preview_operator_handoff_packet_closed_for_operator_review"
assert len(data["scratch_preview_operator_handoff_packet_closeout_id"]) == 64
assert data["operator_handoff_packet"]["marker"] == source_marker
summary = data["closeout_summary"]
assert summary["operator_handoff_packet_bound"] is True
assert summary["scratch_preview_operator_handoff_packet_closeout_only"] is True
assert summary["canonical_ledger_append_performed"] is False
assert summary["wc_issuance_performed"] is False
assert summary["wc_claim_performed"] is False
assert summary["actual_wc_ledger_write_performed"] is False
boundary = data["boundary"]
assert boundary["scratch_preview_operator_handoff_packet_closeout_only"] is True
for key in ["wc_issuance_enabled", "wc_claim_enabled", "wc_ledger_write_enabled", "void_transfer_enabled", "usdc_transfer_enabled", "wallet_connection_enabled", "signer_access_enabled", "network_submit_enabled", "public_mutation_enabled"]:
    assert boundary[key] is False
PYCHECK
echo "operator_handoff_packet_closeout_binding_green=true"

echo "== bad operator handoff packet rejection =="
python3 - "$INPUT" "$BAD_SOURCE" <<'PYBAD'
import json, sys
src, dst = sys.argv[1:]
with open(src, encoding="utf-8") as f:
    data = json.load(f)
data["status"] = "not_ready"
with open(dst, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PYBAD
if VOID_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_CREATED_AT="$CREATED_AT" node "$TOOL" --operator-handoff-packet "$BAD_SOURCE" --out "$TMP_DIR/bad-out.json" --closer "operator" --reason "bad" >/dev/null 2>&1; then
  echo "bad_operator_handoff_packet_rejection_failed"
  exit 1
fi
echo "bad_operator_handoff_packet_rejection_green=true"

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
if VOID_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_CREATED_AT="$CREATED_AT" node "$TOOL" --operator-handoff-packet "$BAD_MARKER" --out "$TMP_DIR/bad-marker-out.json" --closer "operator" --reason "bad" >/dev/null 2>&1; then
  echo "bad_marker_rejection_failed"
  exit 1
fi
echo "bad_marker_rejection_green=true"

echo "== marker/source presence =="
grep -q "$MARKER" "$TOOL" "$DOC" "$0"
grep -q "$SOURCE_MARKER" "$TOOL" "$0"
grep -qi "operator handoff packet closeout" "$DOC"

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
