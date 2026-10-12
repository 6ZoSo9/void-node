#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_HOLD_V1";
const FINAL_SEAL_INDEX_CLOSEOUT_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1";
const FINAL_SEAL_INDEX_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1";
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

function validateFinalSealIndexCloseout(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("final_seal_index_closeout_invalid");
  if (record.schema !== "void.datanet.wc.evidence_packet_ledger_append_scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout.v1") throw new Error("final_seal_index_closeout_schema_mismatch");
  if (record.marker !== FINAL_SEAL_INDEX_CLOSEOUT_MARKER) throw new Error("final_seal_index_closeout_marker_mismatch");
  if (record.status !== "scratch_preview_review_index_closeout_final_seal_index_closed_for_operator_review") throw new Error("final_seal_index_closeout_status_mismatch");
  assertHex64(record.scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id, "scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id");
  assertNonEmpty(record.closer, "final_seal_index_closeout_closer");
  assertNonEmpty(record.reason, "final_seal_index_closeout_reason");

  const finalSealIndex = record.final_seal_index || {};
  expectMarker(finalSealIndex.marker, FINAL_SEAL_INDEX_MARKER, "final_seal_index");
  assertHex64(finalSealIndex.scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_id, "scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_id");

  const reviewIndexCloseout = record.review_index_closeout || {};
  expectMarker(reviewIndexCloseout.marker, REVIEW_INDEX_CLOSEOUT_MARKER, "review_index_closeout");
  assertHex64(reviewIndexCloseout.scratch_apply_receipt_closeout_review_index_closeout_id, "scratch_apply_receipt_closeout_review_index_closeout_id");

  const reviewIndex = record.review_index || {};
  expectMarker(reviewIndex.marker, REVIEW_INDEX_MARKER, "review_index");
  assertHex64(reviewIndex.scratch_apply_receipt_closeout_review_index_id, "scratch_apply_receipt_closeout_review_index_id");

  const receiptCloseout = record.closeout || {};
  expectMarker(receiptCloseout.marker, RECEIPT_CLOSEOUT_MARKER, "receipt_closeout");
  assertHex64(receiptCloseout.scratch_apply_receipt_closeout_id, "scratch_apply_receipt_closeout_id");

  const receipt = record.receipt || {};
  expectMarker(receipt.marker, RECEIPT_MARKER, "receipt");
  assertHex64(receipt.scratch_apply_receipt_id, "scratch_apply_receipt_id");

  const scratchApply = record.scratch_apply || {};
  expectMarker(scratchApply.marker, SCRATCH_APPLY_MARKER, "scratch_apply");
  assertHex64(scratchApply.scratch_apply_id, "scratch_apply_id");

  const scratchLedger = record.scratch_ledger || {};
  assertHex64(scratchLedger.current_scratch_ledger_hash, "current_scratch_ledger_hash");
  assertHex64(scratchLedger.scratch_ledger_out_hash, "scratch_ledger_out_hash");
  assertHex64(scratchLedger.appended_line_hash, "appended_line_hash");
  assertHex64(scratchLedger.logical_candidate_next_ledger_hash, "logical_candidate_next_ledger_hash");

  const source = record.source || {};
  expectMarker(source.execute_packet_marker, EXECUTE_PACKET_MARKER, "execute_packet");
  assertHex64(source.execute_packet_id, "execute_packet_id");
  expectMarker(source.dry_run_marker, DRY_RUN_MARKER, "dry_run");
  assertHex64(source.dry_run_id, "dry_run_id");
  expectMarker(source.packet_marker, LEDGER_PACKET_MARKER, "ledger_packet");
  assertHex64(source.packet_id, "packet_id");
  assertHex64(source.evidence_hash, "evidence_hash");
  assertNonEmpty(source.work_id, "work_id");
  assertNonEmpty(source.worker, "worker");

  const closeoutSummary = record.closeout_summary || {};
  assertBool(closeoutSummary.scratch_review_index_closeout_final_seal_index_bound, true, "scratch_review_index_closeout_final_seal_index_bound");
  assertBool(closeoutSummary.scratch_preview_chain_final_seal_index_closed_for_operator_review, true, "scratch_preview_chain_final_seal_index_closed_for_operator_review");
  assertBool(closeoutSummary.operator_review_final_seal_index_closeout_only, true, "operator_review_final_seal_index_closeout_only");
  assertBool(closeoutSummary.canonical_ledger_ready_for_later_manual_operator_decision_only, true, "canonical_ledger_ready_for_later_manual_operator_decision_only");
  assertBool(closeoutSummary.canonical_ledger_append_performed, false, "canonical_ledger_append_performed");
  assertBool(closeoutSummary.wc_issuance_performed, false, "wc_issuance_performed");
  assertBool(closeoutSummary.wc_claim_performed, false, "wc_claim_performed");
  assertBool(closeoutSummary.actual_wc_ledger_write_performed, false, "actual_wc_ledger_write_performed");

  const policy = record.work_credits_policy || {};
  assertBool(policy.useful_verifiable_work_only, true, "useful_verifiable_work_only");
  assertBool(policy.unlimited_uncapped_accounting_units, true, "unlimited_uncapped_accounting_units");
  assertBool(policy.finite_approved_amount_for_this_review, true, "finite_approved_amount_for_this_review");

  const boundary = record.boundary || {};
  assertBool(boundary.scratch_review_index_closeout_final_seal_index_closeout_only, true, "scratch_review_index_closeout_final_seal_index_closeout_only");
  assertBool(boundary.scratch_review_index_closeout_final_seal_index_only_source, true, "scratch_review_index_closeout_final_seal_index_only_source");
  assertBool(boundary.scratch_apply_receipt_closeout_review_index_closeout_only_source, true, "scratch_apply_receipt_closeout_review_index_closeout_only_source");
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
    console.log("Usage: node tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-terminal-rollup.mjs --final-seal-index-closeout <closeout.json> --out <rollup.json> --operator <operator> --reason <reason>");
    return;
  }

  const closeoutPath = path.resolve(requireArg("final-seal-index-closeout"));
  const outPath = path.resolve(requireArg("out"));
  const operator = requireArg("operator");
  const reason = requireArg("reason");
  assertNonEmpty(operator, "operator");
  assertNonEmpty(reason, "reason");

  const closeout = JSON.parse(await readFile(closeoutPath, "utf8"));
  validateFinalSealIndexCloseout(closeout);

  const rollupId = stableHashObject({
    final_seal_index_closeout_id: closeout.scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id,
    final_seal_index_id: closeout.final_seal_index.scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_id,
    review_index_closeout_id: closeout.review_index_closeout.scratch_apply_receipt_closeout_review_index_closeout_id,
    review_index_id: closeout.review_index.scratch_apply_receipt_closeout_review_index_id,
    receipt_closeout_id: closeout.closeout.scratch_apply_receipt_closeout_id,
    receipt_id: closeout.receipt.scratch_apply_receipt_id,
    scratch_apply_id: closeout.scratch_apply.scratch_apply_id,
    scratch_ledger_out_hash: closeout.scratch_ledger.scratch_ledger_out_hash,
    appended_line_hash: closeout.scratch_ledger.appended_line_hash,
    logical_candidate_next_ledger_hash: closeout.scratch_ledger.logical_candidate_next_ledger_hash,
    operator,
    reason,
  });

  const rollup = {
    schema: "void.datanet.wc.evidence_packet_ledger_append_scratch_preview_terminal_rollup.v1",
    marker: MARKER,
    status: "scratch_preview_terminal_rollup_ready_for_operator_review",
    scratch_preview_terminal_rollup_id: rollupId,
    created_at: process.env.VOID_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CREATED_AT || new Date().toISOString(),
    operator,
    reason,
    final_seal_index_closeout: {
      path: closeoutPath,
      marker: closeout.marker,
      scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id: closeout.scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id,
      closer: closeout.closer,
      reason: closeout.reason,
    },
    sealed_chain: {
      final_seal_index_marker: closeout.final_seal_index.marker,
      final_seal_index_id: closeout.final_seal_index.scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_id,
      review_index_closeout_marker: closeout.review_index_closeout.marker,
      review_index_closeout_id: closeout.review_index_closeout.scratch_apply_receipt_closeout_review_index_closeout_id,
      review_index_marker: closeout.review_index.marker,
      review_index_id: closeout.review_index.scratch_apply_receipt_closeout_review_index_id,
      receipt_closeout_marker: closeout.closeout.marker,
      receipt_closeout_id: closeout.closeout.scratch_apply_receipt_closeout_id,
      receipt_marker: closeout.receipt.marker,
      receipt_id: closeout.receipt.scratch_apply_receipt_id,
      scratch_apply_marker: closeout.scratch_apply.marker,
      scratch_apply_id: closeout.scratch_apply.scratch_apply_id,
      execute_packet_marker: closeout.source.execute_packet_marker,
      execute_packet_id: closeout.source.execute_packet_id,
      dry_run_marker: closeout.source.dry_run_marker,
      dry_run_id: closeout.source.dry_run_id,
      ledger_write_packet_marker: closeout.source.packet_marker,
      ledger_write_packet_id: closeout.source.packet_id,
      evidence_hash: closeout.source.evidence_hash,
      work_id: closeout.source.work_id,
      worker: closeout.source.worker,
    },
    scratch_ledger: {
      current_scratch_ledger_hash: closeout.scratch_ledger.current_scratch_ledger_hash,
      scratch_ledger_out_hash: closeout.scratch_ledger.scratch_ledger_out_hash,
      appended_line_hash: closeout.scratch_ledger.appended_line_hash,
      logical_candidate_next_ledger_hash: closeout.scratch_ledger.logical_candidate_next_ledger_hash,
    },
    terminal_summary: {
      scratch_preview_chain_fully_closed_and_indexed: true,
      scratch_preview_terminal_rollup_only: true,
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
      scratch_preview_terminal_rollup_only: true,
    },
    boundary: {
      scratch_preview_terminal_rollup_only: true,
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
  await writeFile(outPath, `${JSON.stringify(rollup, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(rollup, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_ledger_append_scratch_preview_terminal_rollup_error=${err.message}`);
  process.exit(1);
});
