#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_HOLD_V1"
PREV_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1"
FINAL_SEAL_INDEX_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1"
REVIEW_INDEX_CLOSEOUT_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_HOLD_V1"
REVIEW_INDEX_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_HOLD_V1"
RECEIPT_CLOSEOUT_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_HOLD_V1"
RECEIPT_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_HOLD_V1"
SCRATCH_APPLY_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_HOLD_V1"
EXECUTE_PACKET_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_EXECUTE_PACKET_HOLD_V1"
DRY_RUN_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_DRY_RUN_HOLD_V1"
LEDGER_PACKET_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_WRITE_PACKET_HOLD_V1"

TOOL="tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-terminal-rollup.mjs"
DOC="docs/datanet/datanet-wc-evidence-packet-ledger-append-scratch-preview-terminal-rollup-hold-v1.md"
PREV_PROOF="ops/mainnet0/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt-closeout-review-index-closeout-final-seal-index-closeout-hold-v1-proof.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

INPUT="$TMP_DIR/final-seal-index-closeout.json"
OUT_A="$TMP_DIR/terminal-rollup-a.json"
OUT_B="$TMP_DIR/terminal-rollup-b.json"
BAD_STATUS="$TMP_DIR/bad-status.json"
BAD_MARKER="$TMP_DIR/bad-marker.json"
CREATED_AT="2026-07-02T00:00:00.000Z"

printf '== tools exist / syntax ==\n'
test -x "$TOOL"
node --check "$TOOL"
bash -n "$PREV_PROOF"

printf '== final seal index closeout source proof ==\n'
bash "$PREV_PROOF"

printf '== create fixture final seal index closeout ==\n'
python3 - "$INPUT" "$PREV_MARKER" "$FINAL_SEAL_INDEX_MARKER" "$REVIEW_INDEX_CLOSEOUT_MARKER" "$REVIEW_INDEX_MARKER" "$RECEIPT_CLOSEOUT_MARKER" "$RECEIPT_MARKER" "$SCRATCH_APPLY_MARKER" "$EXECUTE_PACKET_MARKER" "$DRY_RUN_MARKER" "$LEDGER_PACKET_MARKER" <<'PY'
import json, sys
out, prev_marker, final_marker, review_close_marker, review_marker, receipt_close_marker, receipt_marker, scratch_marker, execute_marker, dry_marker, ledger_marker = sys.argv[1:]
hexes = {
    "final_seal_index_closeout_id": "a" * 64,
    "final_seal_index_id": "b" * 64,
    "review_index_closeout_id": "c" * 64,
    "review_index_id": "d" * 64,
    "receipt_closeout_id": "e" * 64,
    "receipt_id": "f" * 64,
    "scratch_apply_id": "1" * 64,
    "current_scratch_ledger_hash": "2" * 64,
    "scratch_ledger_out_hash": "3" * 64,
    "appended_line_hash": "4" * 64,
    "logical_candidate_next_ledger_hash": "5" * 64,
    "execute_packet_id": "6" * 64,
    "dry_run_id": "7" * 64,
    "packet_id": "8" * 64,
    "evidence_hash": "9" * 64,
}
record = {
    "schema": "void.datanet.wc.evidence_packet_ledger_append_scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout.v1",
    "marker": prev_marker,
    "status": "scratch_preview_review_index_closeout_final_seal_index_closed_for_operator_review",
    "scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id": hexes["final_seal_index_closeout_id"],
    "created_at": "2026-07-02T00:00:00.000Z",
    "closer": "operator-final-seal-closeout",
    "reason": "fixture closeout binds final seal index only",
    "final_seal_index": {
        "path": "/tmp/final-seal-index.json",
        "marker": final_marker,
        "scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_id": hexes["final_seal_index_id"],
        "indexer": "operator-final-seal-indexer",
        "reason": "fixture final seal index binds review index closeout only",
    },
    "review_index_closeout": {
        "marker": review_close_marker,
        "scratch_apply_receipt_closeout_review_index_closeout_id": hexes["review_index_closeout_id"],
        "closer": "operator-review-closeout",
        "reason": "fixture closeout binds review index only",
    },
    "review_index": {
        "marker": review_marker,
        "scratch_apply_receipt_closeout_review_index_id": hexes["review_index_id"],
        "indexer": "operator-review-indexer",
        "reason": "fixture index binds scratch closeout only",
    },
    "closeout": {
        "marker": receipt_close_marker,
        "scratch_apply_receipt_closeout_id": hexes["receipt_closeout_id"],
    },
    "receipt": {
        "marker": receipt_marker,
        "scratch_apply_receipt_id": hexes["receipt_id"],
    },
    "scratch_apply": {
        "marker": scratch_marker,
        "scratch_apply_id": hexes["scratch_apply_id"],
    },
    "scratch_ledger": {
        "current_scratch_ledger_hash": hexes["current_scratch_ledger_hash"],
        "scratch_ledger_out_hash": hexes["scratch_ledger_out_hash"],
        "appended_line_hash": hexes["appended_line_hash"],
        "logical_candidate_next_ledger_hash": hexes["logical_candidate_next_ledger_hash"],
    },
    "source": {
        "execute_packet_marker": execute_marker,
        "execute_packet_id": hexes["execute_packet_id"],
        "dry_run_marker": dry_marker,
        "dry_run_id": hexes["dry_run_id"],
        "packet_marker": ledger_marker,
        "packet_id": hexes["packet_id"],
        "evidence_hash": hexes["evidence_hash"],
        "work_id": "demo-datanet-verification-artifact",
        "worker": "local-contributor",
    },
    "closeout_summary": {
        "scratch_review_index_closeout_final_seal_index_bound": True,
        "scratch_preview_chain_final_seal_index_closed_for_operator_review": True,
        "operator_review_final_seal_index_closeout_only": True,
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
        "scratch_review_index_closeout_final_seal_index_closeout_only": True,
    },
    "boundary": {
        "scratch_review_index_closeout_final_seal_index_closeout_only": True,
        "scratch_review_index_closeout_final_seal_index_only_source": True,
        "scratch_apply_receipt_closeout_review_index_closeout_only_source": True,
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
open(out, "w", encoding="utf-8").write(json.dumps(record, indent=2) + "\n")
print("fixture_final_seal_index_closeout_green=true")
PY

printf '== terminal rollup ==\n'
VOID_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CREATED_AT="$CREATED_AT" node "$TOOL" \
  --final-seal-index-closeout "$INPUT" \
  --out "$OUT_A" \
  --operator "operator-terminal-rollup" \
  --reason "fixture terminal rollup binds closed scratch preview chain only" >/tmp/void-scratch-preview-terminal-rollup-a.out

VOID_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CREATED_AT="$CREATED_AT" node "$TOOL" \
  --final-seal-index-closeout "$INPUT" \
  --out "$OUT_B" \
  --operator "operator-terminal-rollup" \
  --reason "fixture terminal rollup binds closed scratch preview chain only" >/tmp/void-scratch-preview-terminal-rollup-b.out

printf '== terminal rollup deterministic / binding ==\n'
python3 - "$INPUT" "$OUT_A" "$OUT_B" "$MARKER" "$PREV_MARKER" <<'PY'
import json, pathlib, re, sys
input_path, out_a, out_b, marker, prev_marker = sys.argv[1:]
source = json.load(open(input_path, encoding="utf-8"))
text_a = pathlib.Path(out_a).read_text(encoding="utf-8")
text_b = pathlib.Path(out_b).read_text(encoding="utf-8")
assert text_a == text_b
record = json.loads(text_a)
assert record["schema"] == "void.datanet.wc.evidence_packet_ledger_append_scratch_preview_terminal_rollup.v1"
assert record["marker"] == marker
assert record["status"] == "scratch_preview_terminal_rollup_ready_for_operator_review"
assert re.fullmatch(r"[0-9a-f]{64}", record["scratch_preview_terminal_rollup_id"])
assert record["operator"] == "operator-terminal-rollup"
assert record["final_seal_index_closeout"]["path"] == str(pathlib.Path(input_path).resolve())
assert record["final_seal_index_closeout"]["marker"] == prev_marker
assert record["final_seal_index_closeout"]["scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id"] == source["scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id"]
assert record["sealed_chain"]["final_seal_index_id"] == source["final_seal_index"]["scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_id"]
assert record["sealed_chain"]["review_index_closeout_id"] == source["review_index_closeout"]["scratch_apply_receipt_closeout_review_index_closeout_id"]
assert record["sealed_chain"]["review_index_id"] == source["review_index"]["scratch_apply_receipt_closeout_review_index_id"]
assert record["sealed_chain"]["receipt_closeout_id"] == source["closeout"]["scratch_apply_receipt_closeout_id"]
assert record["sealed_chain"]["receipt_id"] == source["receipt"]["scratch_apply_receipt_id"]
assert record["sealed_chain"]["scratch_apply_id"] == source["scratch_apply"]["scratch_apply_id"]
assert record["scratch_ledger"]["scratch_ledger_out_hash"] == source["scratch_ledger"]["scratch_ledger_out_hash"]
assert record["scratch_ledger"]["appended_line_hash"] == source["scratch_ledger"]["appended_line_hash"]
assert record["scratch_ledger"]["logical_candidate_next_ledger_hash"] == source["scratch_ledger"]["logical_candidate_next_ledger_hash"]
summary = record["terminal_summary"]
assert summary["scratch_preview_chain_fully_closed_and_indexed"] is True
assert summary["scratch_preview_terminal_rollup_only"] is True
assert summary["operator_review_ready"] is True
assert summary["canonical_ledger_ready_for_later_manual_operator_decision_only"] is True
assert summary["canonical_ledger_append_performed"] is False
assert summary["wc_issuance_performed"] is False
assert summary["wc_claim_performed"] is False
assert summary["actual_wc_ledger_write_performed"] is False
boundary = record["boundary"]
assert boundary["scratch_preview_terminal_rollup_only"] is True
assert boundary["final_seal_index_closeout_only_source"] is True
assert boundary["canonical_ledger_append_performed"] is False
for key in ["wc_issuance_enabled", "wc_claim_enabled", "wc_ledger_write_enabled", "void_transfer_enabled", "usdc_transfer_enabled", "wallet_connection_enabled", "signer_access_enabled", "network_submit_enabled", "public_mutation_enabled"]:
    assert boundary[key] is False, key
print("scratch_preview_terminal_rollup_deterministic_green=true")
print("scratch_preview_terminal_rollup_binding_green=true")
PY

printf '== bad final seal index closeout rejection ==\n'
python3 - "$INPUT" "$BAD_STATUS" <<'PY'
import json, sys
record = json.load(open(sys.argv[1], encoding="utf-8"))
record["status"] = "not_closed"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(record, indent=2) + "\n")
PY
if node "$TOOL" \
  --final-seal-index-closeout "$BAD_STATUS" \
  --out "$TMP_DIR/bad-status-rollup.json" \
  --operator "operator-terminal-rollup" \
  --reason "bad final seal index closeout should fail" >/tmp/void-terminal-rollup-bad-status-out 2>/tmp/void-terminal-rollup-bad-status-err; then
  echo "bad_final_seal_index_closeout_rejection_green=false"
  cat /tmp/void-terminal-rollup-bad-status-out
  exit 1
fi
grep -Fq "final_seal_index_closeout_status_mismatch" /tmp/void-terminal-rollup-bad-status-err
echo "bad_final_seal_index_closeout_rejection_green=true"

printf '== bad marker rejection ==\n'
python3 - "$INPUT" "$BAD_MARKER" <<'PY'
import json, sys
record = json.load(open(sys.argv[1], encoding="utf-8"))
record["marker"] = "VOID_BAD_MARKER"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(record, indent=2) + "\n")
PY
if node "$TOOL" \
  --final-seal-index-closeout "$BAD_MARKER" \
  --out "$TMP_DIR/bad-marker-rollup.json" \
  --operator "operator-terminal-rollup" \
  --reason "bad marker should fail" >/tmp/void-terminal-rollup-bad-marker-out 2>/tmp/void-terminal-rollup-bad-marker-err; then
  echo "bad_marker_rejection_green=false"
  cat /tmp/void-terminal-rollup-bad-marker-out
  exit 1
fi
grep -Fq "final_seal_index_closeout_marker_mismatch" /tmp/void-terminal-rollup-bad-marker-err
echo "bad_marker_rejection_green=true"

printf '== marker/source presence ==\n'
grep -Fq "$MARKER" "$TOOL"
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$0"
grep -Fq "terminal rollup" "$DOC"
grep -Fq "scratch_preview_terminal_rollup" "$TOOL"

printf '== forbidden WC cap wording scan ==\n'
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$TOOL" "$DOC"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

printf '== no mutation authority scan ==\n'
if grep -RInE 'privateKey|mnemonic|signTransaction|sendTransaction|canonical_ledger_append_performed[[:space:]]*:[[:space:]]*true|ledger[[:space:]_-]*append[[:space:]]*=[[:space:]]*true|ledger[[:space:]_-]*write[[:space:]]*=[[:space:]]*true|wc_ledger_write_enabled[[:space:]]*:[[:space:]]*true|wc_issuance_enabled[[:space:]]*:[[:space:]]*true|network_submit_enabled[[:space:]]*:[[:space:]]*true' "$TOOL" "$DOC"; then
  echo "no_mutation_authority_scan_green=false"
  exit 1
fi
echo "no_mutation_authority_scan_green=true"

printf '== result ==\n'
echo "${MARKER}_GREEN"
