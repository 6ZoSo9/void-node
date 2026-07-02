#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1";
const TERMINAL_ROLLUP_CLOSEOUT_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_HOLD_V1";
const TERMINAL_ROLLUP_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_HOLD_V1";
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

function validateTerminalRollupCloseout(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("terminal_rollup_closeout_invalid");
  if (record.schema !== "void.datanet.wc.evidence_packet_ledger_append_scratch_preview_terminal_rollup_closeout.v1") throw new Error("terminal_rollup_closeout_schema_mismatch");
  expectMarker(record.marker, TERMINAL_ROLLUP_CLOSEOUT_MARKER, "terminal_rollup_closeout");
  if (record.status !== "scratch_preview_terminal_rollup_closed_for_operator_review") throw new Error("terminal_rollup_closeout_status_mismatch");
  assertHex64(record.scratch_preview_terminal_rollup_closeout_id, "scratch_preview_terminal_rollup_closeout_id");
  assertNonEmpty(record.closer, "terminal_rollup_closeout_closer");
  assertNonEmpty(record.reason, "terminal_rollup_closeout_reason");

  const terminalRollup = record.terminal_rollup || {};
  expectMarker(terminalRollup.marker, TERMINAL_ROLLUP_MARKER, "terminal_rollup");
  assertHex64(terminalRollup.scratch_preview_terminal_rollup_id, "scratch_preview_terminal_rollup_id");
  assertNonEmpty(terminalRollup.operator, "terminal_rollup_operator");
  assertNonEmpty(terminalRollup.reason, "terminal_rollup_reason");

  const finalSealIndexCloseout = record.final_seal_index_closeout || {};
  expectMarker(finalSealIndexCloseout.marker, FINAL_SEAL_INDEX_CLOSEOUT_MARKER, "final_seal_index_closeout");
  assertHex64(finalSealIndexCloseout.scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id, "scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id");

  const chain = record.sealed_chain || {};
  expectMarker(chain.final_seal_index_marker, FINAL_SEAL_INDEX_MARKER, "final_seal_index");
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

  const summary = record.closeout_summary || {};
  assertBool(summary.terminal_rollup_bound, true, "terminal_rollup_bound");
  assertBool(summary.scratch_preview_chain_fully_closed_indexed_rolled_up_and_closed_for_operator_review, true, "scratch_preview_chain_fully_closed_indexed_rolled_up_and_closed_for_operator_review");
  assertBool(summary.terminal_rollup_closeout_only, true, "terminal_rollup_closeout_only");
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
  assertBool(policy.scratch_preview_terminal_rollup_closeout_only, true, "scratch_preview_terminal_rollup_closeout_only");

  const boundary = record.boundary || {};
  assertBool(boundary.scratch_preview_terminal_rollup_closeout_only, true, "scratch_preview_terminal_rollup_closeout_only");
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
    console.log("Usage: node tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-terminal-rollup-closeout-final-seal-index.mjs --terminal-rollup-closeout <closeout.json> --out <final-seal-index.json> --indexer <operator> --reason <reason>");
    return;
  }

  const closeoutPath = path.resolve(requireArg("terminal-rollup-closeout"));
  const outPath = path.resolve(requireArg("out"));
  const indexer = requireArg("indexer");
  const reason = requireArg("reason");
  assertNonEmpty(indexer, "indexer");
  assertNonEmpty(reason, "reason");

  const closeout = JSON.parse(await readFile(closeoutPath, "utf8"));
  validateTerminalRollupCloseout(closeout);

  const finalSealIndexId = stableHashObject({
    terminal_rollup_closeout_id: closeout.scratch_preview_terminal_rollup_closeout_id,
    terminal_rollup_id: closeout.terminal_rollup.scratch_preview_terminal_rollup_id,
    final_seal_index_closeout_id: closeout.final_seal_index_closeout.scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id,
    final_seal_index_id: closeout.sealed_chain.final_seal_index_id,
    review_index_closeout_id: closeout.sealed_chain.review_index_closeout_id,
    review_index_id: closeout.sealed_chain.review_index_id,
    receipt_closeout_id: closeout.sealed_chain.receipt_closeout_id,
    receipt_id: closeout.sealed_chain.receipt_id,
    scratch_apply_id: closeout.sealed_chain.scratch_apply_id,
    scratch_ledger_out_hash: closeout.scratch_ledger.scratch_ledger_out_hash,
    appended_line_hash: closeout.scratch_ledger.appended_line_hash,
    logical_candidate_next_ledger_hash: closeout.scratch_ledger.logical_candidate_next_ledger_hash,
    indexer,
    reason,
  });

  const finalSealIndex = {
    schema: "void.datanet.wc.evidence_packet_ledger_append_scratch_preview_terminal_rollup_closeout_final_seal_index.v1",
    marker: MARKER,
    status: "scratch_preview_terminal_rollup_closeout_final_seal_indexed",
    scratch_preview_terminal_rollup_closeout_final_seal_index_id: finalSealIndexId,
    created_at: process.env.VOID_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_CREATED_AT || new Date().toISOString(),
    indexer,
    reason,
    terminal_rollup_closeout: {
      path: closeoutPath,
      marker: closeout.marker,
      scratch_preview_terminal_rollup_closeout_id: closeout.scratch_preview_terminal_rollup_closeout_id,
      closer: closeout.closer,
      reason: closeout.reason,
    },
    terminal_rollup: closeout.terminal_rollup,
    final_seal_index_closeout: closeout.final_seal_index_closeout,
    sealed_chain: closeout.sealed_chain,
    scratch_ledger: closeout.scratch_ledger,
    final_seal_summary: {
      terminal_rollup_closeout_bound: true,
      scratch_preview_chain_fully_closed_rolled_up_closed_and_final_seal_indexed_for_operator_review: true,
      terminal_rollup_closeout_final_seal_index_only: true,
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
      scratch_preview_terminal_rollup_closeout_final_seal_index_only: true,
    },
    boundary: {
      scratch_preview_terminal_rollup_closeout_final_seal_index_only: true,
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
  await writeFile(outPath, `${JSON.stringify(finalSealIndex, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(finalSealIndex, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_ledger_append_scratch_preview_terminal_rollup_closeout_final_seal_index_error=${err.message}`);
  process.exit(1);
});
