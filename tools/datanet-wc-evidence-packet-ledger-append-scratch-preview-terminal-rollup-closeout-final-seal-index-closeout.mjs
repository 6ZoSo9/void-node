#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1";
const FINAL_SEAL_INDEX_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1";
const TERMINAL_ROLLUP_CLOSEOUT_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_HOLD_V1";
const TERMINAL_ROLLUP_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_HOLD_V1";
const PRIOR_FINAL_SEAL_INDEX_CLOSEOUT_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1";
const PRIOR_FINAL_SEAL_INDEX_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1";
const REVIEW_INDEX_CLOSEOUT_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_HOLD_V1";
const REVIEW_INDEX_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_HOLD_V1";
const RECEIPT_CLOSEOUT_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_HOLD_V1";
const RECEIPT_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_HOLD_V1";
const SCRATCH_APPLY_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_HOLD_V1";
const EXECUTE_PACKET_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_EXECUTE_PACKET_HOLD_V1";
const DRY_RUN_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_DRY_RUN_HOLD_V1";
const LEDGER_PACKET_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_WRITE_PACKET_HOLD_V1";

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function requireArg(name) {
  const value = getArg(name);
  if (!value || value.startsWith("--")) throw new Error(`Missing required --${name}`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableHashObject(value) {
  return sha256(JSON.stringify(value));
}

function assertBool(value, expected, label) {
  if (value !== expected) throw new Error(`${label}_boundary_mismatch`);
}

function assertHex64(value, label) {
  if (!/^[0-9a-f]{64}$/.test(value || "")) throw new Error(`${label}_invalid`);
}

function assertNonEmpty(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label}_missing`);
}

function expectMarker(value, expected, label) {
  if (value !== expected) throw new Error(`${label}_marker_mismatch`);
}

function validateFinalSealIndex(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("terminal_rollup_closeout_final_seal_index_invalid");
  if (record.schema !== "void.datanet.wc.evidence_packet_ledger_append_scratch_preview_terminal_rollup_closeout_final_seal_index.v1") throw new Error("terminal_rollup_closeout_final_seal_index_schema_mismatch");
  expectMarker(record.marker, FINAL_SEAL_INDEX_MARKER, "terminal_rollup_closeout_final_seal_index");
  if (record.status !== "scratch_preview_terminal_rollup_closeout_final_seal_indexed") throw new Error("terminal_rollup_closeout_final_seal_index_status_mismatch");
  assertHex64(record.scratch_preview_terminal_rollup_closeout_final_seal_index_id, "scratch_preview_terminal_rollup_closeout_final_seal_index_id");
  assertNonEmpty(record.indexer, "terminal_rollup_closeout_final_seal_index_indexer");
  assertNonEmpty(record.reason, "terminal_rollup_closeout_final_seal_index_reason");

  const terminalRollupCloseout = record.terminal_rollup_closeout || {};
  expectMarker(terminalRollupCloseout.marker, TERMINAL_ROLLUP_CLOSEOUT_MARKER, "terminal_rollup_closeout");
  assertHex64(terminalRollupCloseout.scratch_preview_terminal_rollup_closeout_id, "scratch_preview_terminal_rollup_closeout_id");
  assertNonEmpty(terminalRollupCloseout.closer, "terminal_rollup_closeout_closer");
  assertNonEmpty(terminalRollupCloseout.reason, "terminal_rollup_closeout_reason");

  const terminalRollup = record.terminal_rollup || {};
  expectMarker(terminalRollup.marker, TERMINAL_ROLLUP_MARKER, "terminal_rollup");
  assertHex64(terminalRollup.scratch_preview_terminal_rollup_id, "scratch_preview_terminal_rollup_id");
  assertNonEmpty(terminalRollup.operator, "terminal_rollup_operator");
  assertNonEmpty(terminalRollup.reason, "terminal_rollup_reason");

  const priorFinalSealIndexCloseout = record.final_seal_index_closeout || {};
  expectMarker(priorFinalSealIndexCloseout.marker, PRIOR_FINAL_SEAL_INDEX_CLOSEOUT_MARKER, "prior_final_seal_index_closeout");
  assertHex64(priorFinalSealIndexCloseout.scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id, "scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id");

  const chain = record.sealed_chain || {};
  expectMarker(chain.final_seal_index_marker, PRIOR_FINAL_SEAL_INDEX_MARKER, "prior_final_seal_index");
  assertHex64(chain.final_seal_index_id, "final_seal_index_id");
  expectMarker(chain.review_index_closeout_marker, REVIEW_INDEX_CLOSEOUT_MARKER, "review_index_closeout");
  assertHex64(chain.review_index_closeout_id, "review_index_closeout_id");
  expectMarker(chain.review_index_marker, REVIEW_INDEX_MARKER, "review_index");
  assertHex64(chain.review_index_id, "review_index_id");
  expectMarker(chain.receipt_closeout_marker, RECEIPT_CLOSEOUT_MARKER, "receipt_closeout");
  assertHex64(chain.receipt_closeout_id, "receipt_closeout_id");
  expectMarker(chain.receipt_marker, RECEIPT_MARKER, "receipt");
  assertHex64(chain.receipt_id, "receipt_id");
  expectMarker(chain.scratch_apply_marker, SCRATCH_APPLY_MARKER, "scratch_apply");
  assertHex64(chain.scratch_apply_id, "scratch_apply_id");
  expectMarker(chain.execute_packet_marker, EXECUTE_PACKET_MARKER, "execute_packet");
  assertHex64(chain.execute_packet_id, "execute_packet_id");
  expectMarker(chain.dry_run_marker, DRY_RUN_MARKER, "dry_run");
  assertHex64(chain.dry_run_id, "dry_run_id");
  expectMarker(chain.ledger_write_packet_marker, LEDGER_PACKET_MARKER, "ledger_write_packet");
  assertHex64(chain.ledger_write_packet_id, "ledger_write_packet_id");
  assertHex64(chain.evidence_hash, "evidence_hash");
  assertNonEmpty(chain.work_id, "work_id");
  assertNonEmpty(chain.worker, "worker");

  const scratchLedger = record.scratch_ledger || {};
  assertHex64(scratchLedger.current_scratch_ledger_hash, "current_scratch_ledger_hash");
  assertHex64(scratchLedger.scratch_ledger_out_hash, "scratch_ledger_out_hash");
  assertHex64(scratchLedger.appended_line_hash, "appended_line_hash");
  assertHex64(scratchLedger.logical_candidate_next_ledger_hash, "logical_candidate_next_ledger_hash");

  const summary = record.final_seal_summary || {};
  assertBool(summary.terminal_rollup_closeout_bound, true, "terminal_rollup_closeout_bound");
  assertBool(summary.scratch_preview_chain_fully_closed_rolled_up_closed_and_final_seal_indexed_for_operator_review, true, "scratch_preview_chain_fully_closed_rolled_up_closed_and_final_seal_indexed_for_operator_review");
  assertBool(summary.terminal_rollup_closeout_final_seal_index_only, true, "terminal_rollup_closeout_final_seal_index_only");
  assertBool(summary.operator_review_ready, true, "operator_review_ready");
  assertBool(summary.canonical_ledger_ready_for_later_manual_operator_decision_only, true, "canonical_ledger_ready_for_later_manual_operator_decision_only");
  assertBool(summary.canonical_ledger_append_performed, false, "canonical_ledger_append_performed");
  assertBool(summary.wc_issuance_performed, false, "wc_issuance_performed");
  assertBool(summary.wc_claim_performed, false, "wc_claim_performed");
  assertBool(summary.actual_wc_ledger_write_performed, false, "actual_wc_ledger_write_performed");

  const policy = record.work_credits_policy || {};
  assertBool(policy.useful_verifiable_work_only, true, "useful_verifiable_work_only");
  assertBool(policy.unlimited_uncapped_accounting_units, true, "unlimited_uncapped_accounting_units");
  assertBool(policy.finite_approved_amount_for_this_review, true, "finite_approved_amount_for_this_review");
  assertBool(policy.scratch_preview_terminal_rollup_closeout_final_seal_index_only, true, "scratch_preview_terminal_rollup_closeout_final_seal_index_only");

  const boundary = record.boundary || {};
  assertBool(boundary.scratch_preview_terminal_rollup_closeout_final_seal_index_only, true, "scratch_preview_terminal_rollup_closeout_final_seal_index_only");
  assertBool(boundary.terminal_rollup_closeout_only_source, true, "terminal_rollup_closeout_only_source");
  assertBool(boundary.terminal_rollup_only_source, true, "terminal_rollup_only_source");
  assertBool(boundary.final_seal_index_closeout_only_source, true, "final_seal_index_closeout_only_source");
  assertBool(boundary.final_seal_index_only_source, true, "final_seal_index_only_source");
  assertBool(boundary.review_index_closeout_only_source, true, "review_index_closeout_only_source");
  assertBool(boundary.review_index_only_source, true, "review_index_only_source");
  assertBool(boundary.scratch_apply_receipt_closeout_only_source, true, "scratch_apply_receipt_closeout_only_source");
  assertBool(boundary.scratch_apply_receipt_only_source, true, "scratch_apply_receipt_only_source");
  assertBool(boundary.scratch_apply_only_source, true, "scratch_apply_only_source");
  assertBool(boundary.canonical_ledger_append_performed, false, "canonical_ledger_append_performed");
  for (const key of [
    "wc_issuance_enabled",
    "wc_claim_enabled",
    "wc_ledger_write_enabled",
    "void_transfer_enabled",
    "usdc_transfer_enabled",
    "wallet_connection_enabled",
    "signer_access_enabled",
    "network_submit_enabled",
    "public_mutation_enabled",
  ]) assertBool(boundary[key], false, key);
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log("Usage: node tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-terminal-rollup-closeout-final-seal-index-closeout.mjs --terminal-rollup-closeout-final-seal-index <final-seal-index.json> --out <final-seal-index-closeout.json> --closer <closer> --reason <reason>");
    return;
  }

  const finalSealIndexPath = path.resolve(requireArg("terminal-rollup-closeout-final-seal-index"));
  const outPath = path.resolve(requireArg("out"));
  const closer = requireArg("closer");
  const reason = requireArg("reason");
  assertNonEmpty(closer, "closer");
  assertNonEmpty(reason, "reason");

  const finalSealIndex = JSON.parse(await readFile(finalSealIndexPath, "utf8"));
  validateFinalSealIndex(finalSealIndex);

  const closeoutId = stableHashObject({
    terminal_rollup_closeout_final_seal_index_id: finalSealIndex.scratch_preview_terminal_rollup_closeout_final_seal_index_id,
    terminal_rollup_closeout_id: finalSealIndex.terminal_rollup_closeout.scratch_preview_terminal_rollup_closeout_id,
    terminal_rollup_id: finalSealIndex.terminal_rollup.scratch_preview_terminal_rollup_id,
    prior_final_seal_index_closeout_id: finalSealIndex.final_seal_index_closeout.scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id,
    prior_final_seal_index_id: finalSealIndex.sealed_chain.final_seal_index_id,
    review_index_closeout_id: finalSealIndex.sealed_chain.review_index_closeout_id,
    review_index_id: finalSealIndex.sealed_chain.review_index_id,
    receipt_closeout_id: finalSealIndex.sealed_chain.receipt_closeout_id,
    receipt_id: finalSealIndex.sealed_chain.receipt_id,
    scratch_apply_id: finalSealIndex.sealed_chain.scratch_apply_id,
    scratch_ledger_out_hash: finalSealIndex.scratch_ledger.scratch_ledger_out_hash,
    appended_line_hash: finalSealIndex.scratch_ledger.appended_line_hash,
    logical_candidate_next_ledger_hash: finalSealIndex.scratch_ledger.logical_candidate_next_ledger_hash,
    closer,
    reason,
  });

  const closeout = {
    schema: "void.datanet.wc.evidence_packet_ledger_append_scratch_preview_terminal_rollup_closeout_final_seal_index_closeout.v1",
    marker: MARKER,
    status: "scratch_preview_terminal_rollup_closeout_final_seal_index_closed_for_operator_review",
    scratch_preview_terminal_rollup_closeout_final_seal_index_closeout_id: closeoutId,
    created_at: process.env.VOID_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_CREATED_AT || new Date().toISOString(),
    closer,
    reason,
    final_seal_index: {
      path: finalSealIndexPath,
      marker: finalSealIndex.marker,
      scratch_preview_terminal_rollup_closeout_final_seal_index_id: finalSealIndex.scratch_preview_terminal_rollup_closeout_final_seal_index_id,
      indexer: finalSealIndex.indexer,
      reason: finalSealIndex.reason,
    },
    terminal_rollup_closeout: finalSealIndex.terminal_rollup_closeout,
    terminal_rollup: finalSealIndex.terminal_rollup,
    prior_final_seal_index_closeout: finalSealIndex.final_seal_index_closeout,
    sealed_chain: finalSealIndex.sealed_chain,
    scratch_ledger: finalSealIndex.scratch_ledger,
    closeout_summary: {
      terminal_rollup_closeout_final_seal_index_bound: true,
      scratch_preview_chain_terminal_rollup_closeout_final_seal_index_closed_for_operator_review: true,
      terminal_rollup_closeout_final_seal_index_closeout_only: true,
      operator_review_ready: true,
      canonical_ledger_ready_for_later_manual_operator_decision_only: true,
      canonical_ledger_append_performed: false,
      wc_issuance_performed: false,
      wc_claim_performed: false,
      actual_wc_ledger_write_performed: false,
    },
    work_credits_policy: {
      useful_verifiable_work_only: true,
      unlimited_uncapped_accounting_units: true,
      finite_approved_amount_for_this_review: true,
      scratch_preview_terminal_rollup_closeout_final_seal_index_closeout_only: true,
    },
    boundary: {
      scratch_preview_terminal_rollup_closeout_final_seal_index_closeout_only: true,
      scratch_preview_terminal_rollup_closeout_final_seal_index_only_source: true,
      terminal_rollup_closeout_only_source: true,
      terminal_rollup_only_source: true,
      final_seal_index_closeout_only_source: true,
      final_seal_index_only_source: true,
      review_index_closeout_only_source: true,
      review_index_only_source: true,
      scratch_apply_receipt_closeout_only_source: true,
      scratch_apply_receipt_only_source: true,
      scratch_apply_only_source: true,
      canonical_ledger_append_performed: false,
      wc_issuance_enabled: false,
      wc_claim_enabled: false,
      wc_ledger_write_enabled: false,
      void_transfer_enabled: false,
      usdc_transfer_enabled: false,
      wallet_connection_enabled: false,
      signer_access_enabled: false,
      network_submit_enabled: false,
      public_mutation_enabled: false,
    },
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(closeout, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(closeout, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_ledger_append_scratch_preview_terminal_rollup_closeout_final_seal_index_closeout_error=${err.message}`);
  process.exit(1);
});
