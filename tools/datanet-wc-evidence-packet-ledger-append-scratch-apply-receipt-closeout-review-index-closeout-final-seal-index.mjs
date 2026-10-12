#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1";
const INDEX_CLOSEOUT_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_HOLD_V1";
const REVIEW_INDEX_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_HOLD_V1";
const CLOSEOUT_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_HOLD_V1";
const RECEIPT_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_HOLD_V1";
const SCRATCH_APPLY_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_HOLD_V1";
const EXECUTE_PACKET_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_EXECUTE_PACKET_HOLD_V1";
const DRY_RUN_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_DRY_RUN_HOLD_V1";
const LEDGER_PACKET_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_WRITE_PACKET_HOLD_V1";
const APPROVAL_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_APPROVAL_HOLD_V1";
const PROPOSAL_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_PROPOSAL_HOLD_V1";
const DECISION_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_DECISION_HOLD_V1";
const QUEUE_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_QUEUE_HOLD_V1";
const ROUNDTRIP_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_ROUNDTRIP_HOLD_V1";
const GENERATOR_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1";
const VERIFIER_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_VERIFIER_HOLD_V1";

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

function validateIndexCloseout(closeout) {
  if (!closeout || typeof closeout !== "object" || Array.isArray(closeout)) throw new Error("review_index_closeout_invalid");
  if (closeout.schema !== "void.datanet.wc.evidence_packet_ledger_append_scratch_apply_receipt_closeout_review_index_closeout.v1") throw new Error("review_index_closeout_schema_mismatch");
  if (closeout.marker !== INDEX_CLOSEOUT_MARKER) throw new Error("review_index_closeout_marker_mismatch");
  if (closeout.status !== "scratch_receipt_closeout_review_index_closed_for_operator_review") throw new Error("review_index_closeout_status_mismatch");
  assertHex64(closeout.scratch_apply_receipt_closeout_review_index_closeout_id, "scratch_apply_receipt_closeout_review_index_closeout_id");
  assertNonEmpty(closeout.closer, "review_index_closeout_closer");
  assertNonEmpty(closeout.reason, "review_index_closeout_reason");

  const reviewIndex = closeout.review_index || {};
  assertNonEmpty(reviewIndex.path, "review_index_path");
  if (reviewIndex.marker !== REVIEW_INDEX_MARKER) throw new Error("review_index_marker_mismatch");
  assertHex64(reviewIndex.scratch_apply_receipt_closeout_review_index_id, "scratch_apply_receipt_closeout_review_index_id");
  assertNonEmpty(reviewIndex.indexer, "review_index_indexer");
  assertNonEmpty(reviewIndex.reason, "review_index_reason");

  const sourceCloseout = closeout.closeout || {};
  if (sourceCloseout.marker !== CLOSEOUT_MARKER) throw new Error("closeout_marker_mismatch");
  assertHex64(sourceCloseout.scratch_apply_receipt_closeout_id, "scratch_apply_receipt_closeout_id");
  assertNonEmpty(sourceCloseout.closer, "closeout_closer");
  assertNonEmpty(sourceCloseout.reason, "closeout_reason");

  const receipt = closeout.receipt || {};
  if (receipt.marker !== RECEIPT_MARKER) throw new Error("receipt_marker_mismatch");
  assertHex64(receipt.scratch_apply_receipt_id, "scratch_apply_receipt_id");
  assertNonEmpty(receipt.reviewer, "receipt_reviewer");

  const scratchApply = closeout.scratch_apply || {};
  if (scratchApply.marker !== SCRATCH_APPLY_MARKER) throw new Error("scratch_apply_marker_mismatch");
  assertHex64(scratchApply.scratch_apply_id, "scratch_apply_id");
  assertNonEmpty(scratchApply.operator, "scratch_apply_operator");

  const scratchLedger = closeout.scratch_ledger || {};
  assertNonEmpty(scratchLedger.path, "scratch_ledger_path");
  if (!Number.isInteger(scratchLedger.line_count) || scratchLedger.line_count < 1) throw new Error("scratch_ledger_line_count_invalid");
  assertHex64(scratchLedger.current_scratch_ledger_hash, "current_scratch_ledger_hash");
  assertHex64(scratchLedger.scratch_ledger_out_hash, "scratch_ledger_out_hash");
  assertHex64(scratchLedger.appended_line_hash, "appended_line_hash");
  assertHex64(scratchLedger.logical_candidate_next_ledger_hash, "logical_candidate_next_ledger_hash");

  const source = closeout.source || {};
  if (source.execute_packet_marker !== EXECUTE_PACKET_MARKER) throw new Error("execute_packet_marker_mismatch");
  assertHex64(source.execute_packet_id, "execute_packet_id");
  if (source.dry_run_marker !== DRY_RUN_MARKER) throw new Error("dry_run_marker_mismatch");
  assertHex64(source.dry_run_id, "dry_run_id");
  if (source.packet_marker !== LEDGER_PACKET_MARKER) throw new Error("packet_marker_mismatch");
  assertHex64(source.packet_id, "packet_id");
  if (source.approval_marker !== APPROVAL_MARKER) throw new Error("approval_marker_mismatch");
  assertHex64(source.approval_id, "approval_id");
  if (source.proposal_marker !== PROPOSAL_MARKER) throw new Error("proposal_marker_mismatch");
  assertHex64(source.proposal_id, "proposal_id");
  if (source.decision_marker !== DECISION_MARKER) throw new Error("decision_marker_mismatch");
  assertHex64(source.decision_id, "decision_id");
  if (source.queue_marker !== QUEUE_MARKER) throw new Error("queue_marker_mismatch");
  assertHex64(source.review_id, "review_id");
  if (source.summary_marker !== ROUNDTRIP_MARKER) throw new Error("summary_marker_mismatch");
  if (source.generator_marker !== GENERATOR_MARKER) throw new Error("generator_marker_mismatch");
  if (source.verifier_marker !== VERIFIER_MARKER) throw new Error("verifier_marker_mismatch");
  assertHex64(source.evidence_hash, "evidence_hash");
  assertNonEmpty(source.work_id, "work_id");
  assertNonEmpty(source.worker, "worker");
  if (!Number.isInteger(source.files) || source.files < 1) throw new Error("source_files_invalid");

  const summary = closeout.closeout_summary || {};
  assertBool(summary.scratch_receipt_closeout_review_index_bound, true, "scratch_receipt_closeout_review_index_bound");
  assertBool(summary.scratch_preview_chain_review_index_closed, true, "scratch_preview_chain_review_index_closed");
  assertBool(summary.operator_review_index_closeout_only, true, "operator_review_index_closeout_only");
  assertBool(summary.canonical_ledger_ready_for_later_manual_operator_decision_only, true, "canonical_ledger_ready_for_later_manual_operator_decision_only");
  assertBool(summary.canonical_ledger_append_performed, false, "canonical_ledger_append_performed");
  assertBool(summary.wc_issuance_performed, false, "wc_issuance_performed");
  assertBool(summary.wc_claim_performed, false, "wc_claim_performed");
  assertBool(summary.actual_wc_ledger_write_performed, false, "actual_wc_ledger_write_performed");

  const policy = closeout.work_credits_policy || {};
  assertBool(policy.useful_verifiable_work_only, true, "useful_verifiable_work_only");
  assertBool(policy.unlimited_uncapped_accounting_units, true, "unlimited_uncapped_accounting_units");
  assertBool(policy.finite_approved_amount_for_this_review, true, "finite_approved_amount_for_this_review");
  assertBool(policy.scratch_receipt_closeout_review_index_closeout_only, true, "scratch_receipt_closeout_review_index_closeout_only");

  const boundary = closeout.boundary || {};
  assertBool(boundary.scratch_apply_receipt_closeout_review_index_closeout_only, true, "scratch_apply_receipt_closeout_review_index_closeout_only");
  assertBool(boundary.scratch_apply_receipt_closeout_review_index_only_source, true, "scratch_apply_receipt_closeout_review_index_only_source");
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
    console.log("Usage: node tools/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt-closeout-review-index-closeout-final-seal-index.mjs --review-index-closeout <review-index-closeout.json> --out <final-seal-index.json> --indexer <indexer> --reason <reason>");
    return;
  }

  const closeoutPath = path.resolve(requireArg("review-index-closeout"));
  const outPath = path.resolve(requireArg("out"));
  const indexer = requireArg("indexer");
  const reason = requireArg("reason");
  assertNonEmpty(indexer, "indexer");
  assertNonEmpty(reason, "reason");

  const closeout = JSON.parse(await readFile(closeoutPath, "utf8"));
  validateIndexCloseout(closeout);

  const finalSealIndexId = stableHashObject({
    scratch_apply_receipt_closeout_review_index_closeout_id: closeout.scratch_apply_receipt_closeout_review_index_closeout_id,
    scratch_apply_receipt_closeout_review_index_id: closeout.review_index.scratch_apply_receipt_closeout_review_index_id,
    scratch_apply_receipt_closeout_id: closeout.closeout.scratch_apply_receipt_closeout_id,
    scratch_apply_receipt_id: closeout.receipt.scratch_apply_receipt_id,
    scratch_apply_id: closeout.scratch_apply.scratch_apply_id,
    scratch_ledger_out_hash: closeout.scratch_ledger.scratch_ledger_out_hash,
    appended_line_hash: closeout.scratch_ledger.appended_line_hash,
    logical_candidate_next_ledger_hash: closeout.scratch_ledger.logical_candidate_next_ledger_hash,
    indexer,
    reason,
  });

  const finalSealIndex = {
    schema: "void.datanet.wc.evidence_packet_ledger_append_scratch_apply_receipt_closeout_review_index_closeout_final_seal_index.v1",
    marker: MARKER,
    status: "scratch_preview_review_index_closeout_final_seal_indexed",
    scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_id: finalSealIndexId,
    created_at: process.env.VOID_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_CREATED_AT || new Date().toISOString(),
    indexer,
    reason,
    review_index_closeout: {
      path: closeoutPath,
      marker: closeout.marker,
      scratch_apply_receipt_closeout_review_index_closeout_id: closeout.scratch_apply_receipt_closeout_review_index_closeout_id,
      closer: closeout.closer,
      reason: closeout.reason,
    },
    review_index: closeout.review_index,
    closeout: closeout.closeout,
    receipt: closeout.receipt,
    scratch_apply: closeout.scratch_apply,
    scratch_ledger: closeout.scratch_ledger,
    source: closeout.source,
    final_seal_summary: {
      scratch_review_index_closeout_bound: true,
      scratch_preview_chain_final_sealed_for_operator_review: true,
      operator_review_final_seal_index_only: true,
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
      scratch_review_index_closeout_final_seal_index_only: true,
    },
    boundary: {
      scratch_review_index_closeout_final_seal_index_only: true,
      scratch_apply_receipt_closeout_review_index_closeout_only_source: true,
      scratch_apply_receipt_closeout_review_index_only_source: true,
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
  console.error(`datanet_wc_evidence_packet_ledger_append_scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_error=${err.message}`);
  process.exit(1);
});
