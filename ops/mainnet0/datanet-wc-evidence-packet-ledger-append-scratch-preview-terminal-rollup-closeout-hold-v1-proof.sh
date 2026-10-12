#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_HOLD_V1"
PREV_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_HOLD_V1"
FINAL_SEAL_INDEX_CLOSEOUT_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1"
FINAL_SEAL_INDEX_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1"
REVIEW_INDEX_CLOSEOUT_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_HOLD_V1"
REVIEW_INDEX_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_HOLD_V1"
RECEIPT_CLOSEOUT_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_HOLD_V1"
RECEIPT_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_HOLD_V1"
SCRATCH_APPLY_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_HOLD_V1"
EXECUTE_PACKET_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_EXECUTE_PACKET_HOLD_V1"
DRY_RUN_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_DRY_RUN_HOLD_V1"
LEDGER_PACKET_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_WRITE_PACKET_HOLD_V1"

TOOL="tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-terminal-rollup-closeout.mjs"
DOC="docs/datanet/datanet-wc-evidence-packet-ledger-append-scratch-preview-terminal-rollup-closeout-hold-v1.md"
PREV_PROOF="ops/mainnet0/datanet-wc-evidence-packet-ledger-append-scratch-preview-terminal-rollup-hold-v1-proof.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

INPUT="$TMP_DIR/terminal-rollup.json"
OUT_A="$TMP_DIR/terminal-rollup-closeout-a.json"
OUT_B="$TMP_DIR/terminal-rollup-closeout-b.json"
BAD_STATUS="$TMP_DIR/bad-status.json"
BAD_MARKER="$TMP_DIR/bad-marker.json"
CREATED_AT="2026-07-02T00:00:00.000Z"

printf '== tools exist / syntax ==\n'
test -x "$TOOL"
node --check "$TOOL"
bash -n "$PREV_PROOF"

printf '== terminal rollup source proof ==\n'
bash "$PREV_PROOF"

printf '== create fixture terminal rollup ==\n'
python3 - "$INPUT" "$PREV_MARKER" "$FINAL_SEAL_INDEX_CLOSEOUT_MARKER" "$FINAL_SEAL_INDEX_MARKER" "$REVIEW_INDEX_CLOSEOUT_MARKER" "$REVIEW_INDEX_MARKER" "$RECEIPT_CLOSEOUT_MARKER" "$RECEIPT_MARKER" "$SCRATCH_APPLY_MARKER" "$EXECUTE_PACKET_MARKER" "$DRY_RUN_MARKER" "$LEDGER_PACKET_MARKER" <<'PYFIXTURE'
import json, sys
(out, prev_marker, final_close_marker, final_marker, review_close_marker, review_marker, receipt_close_marker, receipt_marker, scratch_marker, execute_marker, dry_marker, ledger_marker) = sys.argv[1:]
hexes = {
    "terminal_rollup_id": "0" * 64,
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
    "schema": "void.datanet.wc.evidence_packet_ledger_append_scratch_preview_terminal_rollup.v1",
    "marker": prev_marker,
    "status": "scratch_preview_terminal_rollup_ready_for_operator_review",
    "scratch_preview_terminal_rollup_id": hexes["terminal_rollup_id"],
    "created_at": "2026-07-02T00:00:00.000Z",
    "operator": "operator-terminal-rollup",
    "reason": "fixture terminal rollup binds closed scratch preview chain only",
    "final_seal_index_closeout": {
        "path": "/tmp/final-seal-index-closeout.json",
        "marker": final_close_marker,
        "scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id": hexes["final_seal_index_closeout_id"],
        "closer": "operator-final-seal-closeout",
        "reason": "fixture closeout binds final seal index only",
    },
    "sealed_chain": {
        "final_seal_index_marker": final_marker,
        "final_seal_index_id": hexes["final_seal_index_id"],
        "review_index_closeout_marker": review_close_marker,
        "review_index_closeout_id": hexes["review_index_closeout_id"],
        "review_index_marker": review_marker,
        "review_index_id": hexes["review_index_id"],
        "receipt_closeout_marker": receipt_close_marker,
        "receipt_closeout_id": hexes["receipt_closeout_id"],
        "receipt_marker": receipt_marker,
        "receipt_id": hexes["receipt_id"],
        "scratch_apply_marker": scratch_marker,
        "scratch_apply_id": hexes["scratch_apply_id"],
        "execute_packet_marker": execute_marker,
        "execute_packet_id": hexes["execute_packet_id"],
        "dry_run_marker": dry_marker,
        "dry_run_id": hexes["dry_run_id"],
        "ledger_write_packet_marker": ledger_marker,
        "ledger_write_packet_id": hexes["packet_id"],
        "evidence_hash": hexes["evidence_hash"],
        "work_id": "demo-datanet-verification-artifact",
        "worker": "local-contributor",
    },
    "scratch_ledger": {
        "current_scratch_ledger_hash": hexes["current_scratch_ledger_hash"],
        "scratch_ledger_out_hash": hexes["scratch_ledger_out_hash"],
        "appended_line_hash": hexes["appended_line_hash"],
        "logical_candidate_next_ledger_hash": hexes["logical_candidate_next_ledger_hash"],
    },
    "terminal_summary": {
        "scratch_preview_chain_fully_closed_and_indexed": True,
        "scratch_preview_terminal_rollup_only": True,
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
        "scratch_preview_terminal_rollup_only": True,
    },
    "boundary": {
        "scratch_preview_terminal_rollup_only": True,
        "final_seal_index_closeout_only_source": True,
        "final_seal_index_only_source": True,
        "review_index_closeout_only_source": True,
        "review_index_only_source": True,
        "scratch_apply_receipt_closeout_only_source": True,
        "scratch_apply_receipt_only_source": True,
        "scratch_apply_only_source": True,
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
print("fixture_terminal_rollup_green=true")
PYFIXTURE

printf '== terminal rollup closeout ==\n'
VOID_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_CREATED_AT="$CREATED_AT" node "$TOOL" \
  --terminal-rollup "$INPUT" \
  --out "$OUT_A" \
  --closer "operator-terminal-rollup-closeout" \
  --reason "fixture closeout binds scratch preview terminal rollup only" >/tmp/void-scratch-preview-terminal-rollup-closeout-a.out

VOID_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_CREATED_AT="$CREATED_AT" node "$TOOL" \
  --terminal-rollup "$INPUT" \
  --out "$OUT_B" \
  --closer "operator-terminal-rollup-closeout" \
  --reason "fixture closeout binds scratch preview terminal rollup only" >/tmp/void-scratch-preview-terminal-rollup-closeout-b.out

printf '== terminal rollup closeout deterministic / binding ==\n'
python3 - "$INPUT" "$OUT_A" "$OUT_B" "$MARKER" "$PREV_MARKER" <<'PYCHECK'
import json, pathlib, re, sys
input_path, out_a, out_b, marker, prev_marker = sys.argv[1:]
source = json.load(open(input_path, encoding="utf-8"))
text_a = pathlib.Path(out_a).read_text(encoding="utf-8")
text_b = pathlib.Path(out_b).read_text(encoding="utf-8")
assert text_a == text_b
record = json.loads(text_a)
assert record["schema"] == "void.datanet.wc.evidence_packet_ledger_append_scratch_preview_terminal_rollup_closeout.v1"
assert record["marker"] == marker
assert record["status"] == "scratch_preview_terminal_rollup_closed_for_operator_review"
assert re.fullmatch(r"[0-9a-f]{64}", record["scratch_preview_terminal_rollup_closeout_id"])
assert record["closer"] == "operator-terminal-rollup-closeout"
assert record["terminal_rollup"]["path"] == str(pathlib.Path(input_path).resolve())
assert record["terminal_rollup"]["marker"] == prev_marker
assert record["terminal_rollup"]["scratch_preview_terminal_rollup_id"] == source["scratch_preview_terminal_rollup_id"]
assert record["final_seal_index_closeout"]["scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id"] == source["final_seal_index_closeout"]["scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id"]
assert record["sealed_chain"]["final_seal_index_id"] == source["sealed_chain"]["final_seal_index_id"]
assert record["sealed_chain"]["review_index_closeout_id"] == source["sealed_chain"]["review_index_closeout_id"]
assert record["sealed_chain"]["review_index_id"] == source["sealed_chain"]["review_index_id"]
assert record["sealed_chain"]["receipt_closeout_id"] == source["sealed_chain"]["receipt_closeout_id"]
assert record["sealed_chain"]["receipt_id"] == source["sealed_chain"]["receipt_id"]
assert record["sealed_chain"]["scratch_apply_id"] == source["sealed_chain"]["scratch_apply_id"]
assert record["scratch_ledger"]["scratch_ledger_out_hash"] == source["scratch_ledger"]["scratch_ledger_out_hash"]
assert record["scratch_ledger"]["appended_line_hash"] == source["scratch_ledger"]["appended_line_hash"]
assert record["scratch_ledger"]["logical_candidate_next_ledger_hash"] == source["scratch_ledger"]["logical_candidate_next_ledger_hash"]
summary = record["closeout_summary"]
assert summary["terminal_rollup_bound"] is True
assert summary["scratch_preview_chain_fully_closed_indexed_rolled_up_and_closed_for_operator_review"] is True
assert summary["terminal_rollup_closeout_only"] is True
assert summary["operator_review_ready"] is True
assert summary["canonical_ledger_ready_for_later_manual_operator_decision_only"] is True
assert summary["canonical_ledger_append_performed"] is False
assert summary["wc_issuance_performed"] is False
assert summary["wc_claim_performed"] is False
assert summary["actual_wc_ledger_write_performed"] is False
boundary = record["boundary"]
assert boundary["scratch_preview_terminal_rollup_closeout_only"] is True
assert boundary["terminal_rollup_only_source"] is True
assert boundary["canonical_ledger_append_performed"] is False
for key in ["wc_issuance_enabled", "wc_claim_enabled", "wc_ledger_write_enabled", "void_transfer_enabled", "usdc_transfer_enabled", "wallet_connection_enabled", "signer_access_enabled", "network_submit_enabled", "public_mutation_enabled"]:
    assert boundary[key] is False, key
print("scratch_preview_terminal_rollup_closeout_deterministic_green=true")
print("scratch_preview_terminal_rollup_closeout_binding_green=true")
PYCHECK

printf '== bad terminal rollup rejection ==\n'
python3 - "$INPUT" "$BAD_STATUS" <<'PYBADSTATUS'
import json, sys
record = json.load(open(sys.argv[1], encoding="utf-8"))
record["status"] = "not_ready"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(record, indent=2) + "\n")
PYBADSTATUS
if node "$TOOL" \
  --terminal-rollup "$BAD_STATUS" \
  --out "$TMP_DIR/bad-status-closeout.json" \
  --closer "operator-terminal-rollup-closeout" \
  --reason "bad terminal rollup should fail" >/tmp/void-terminal-rollup-closeout-bad-status-out 2>/tmp/void-terminal-rollup-closeout-bad-status-err; then
  echo "bad_terminal_rollup_rejection_green=false"
  cat /tmp/void-terminal-rollup-closeout-bad-status-out
  exit 1
fi
grep -Fq "terminal_rollup_status_mismatch" /tmp/void-terminal-rollup-closeout-bad-status-err
echo "bad_terminal_rollup_rejection_green=true"

printf '== bad marker rejection ==\n'
python3 - "$INPUT" "$BAD_MARKER" <<'PYBADMARKER'
import json, sys
record = json.load(open(sys.argv[1], encoding="utf-8"))
record["marker"] = "VOID_BAD_MARKER"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(record, indent=2) + "\n")
PYBADMARKER
if node "$TOOL" \
  --terminal-rollup "$BAD_MARKER" \
  --out "$TMP_DIR/bad-marker-closeout.json" \
  --closer "operator-terminal-rollup-closeout" \
  --reason "bad marker should fail" >/tmp/void-terminal-rollup-closeout-bad-marker-out 2>/tmp/void-terminal-rollup-closeout-bad-marker-err; then
  echo "bad_marker_rejection_green=false"
  cat /tmp/void-terminal-rollup-closeout-bad-marker-out
  exit 1
fi
grep -Fq "terminal_rollup_marker_mismatch" /tmp/void-terminal-rollup-closeout-bad-marker-err
echo "bad_marker_rejection_green=true"

printf '== marker/source presence ==\n'
grep -Fq "$MARKER" "$TOOL"
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$0"
grep -Fq "terminal rollup closeout" "$DOC"
grep -Fq "scratch_preview_terminal_rollup_closeout" "$TOOL"

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
