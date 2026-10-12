#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_HOLD_V1";
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

function validateCandidateLine(line) {
  if (!line || typeof line !== "object" || Array.isArray(line)) throw new Error("candidate_line_invalid");
  if (line.schema !== "void.datanet.wc.ledger_line_candidate.v1") throw new Error("candidate_line_schema_mismatch");
  if (line.operation !== "append_only_dry_run_candidate") throw new Error("candidate_line_operation_mismatch");
  assertHex64(line.previous_ledger_hash, "line_previous_ledger_hash");
  assertHex64(line.evidence_hash, "line_evidence_hash");
  assertHex64(line.approval_id, "line_approval_id");
  assertHex64(line.proposal_id, "line_proposal_id");
  assertHex64(line.review_id, "line_review_id");
  assertHex64(line.packet_id, "line_packet_id");
  assertHex64(line.candidate_line_hash, "line_candidate_line_hash");
  if (!/^[1-9][0-9]*$/.test(line.approved_wc_amount || "")) throw new Error("approved_wc_amount_invalid");
  const lineCore = { ...line };
  delete lineCore.candidate_line_hash;
  const recomputedLineHash = stableHashObject(lineCore);
  if (recomputedLineHash !== line.candidate_line_hash) throw new Error("candidate_line_hash_mismatch");
  return recomputedLineHash;
}

function validateReceipt(receipt) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) throw new Error("receipt_invalid");
  if (receipt.schema !== "void.datanet.wc.evidence_packet_ledger_append_scratch_apply_receipt.v1") throw new Error("receipt_schema_mismatch");
  if (receipt.marker !== RECEIPT_MARKER) throw new Error("receipt_marker_mismatch");
  if (receipt.status !== "scratch_ledger_preview_receipt_recorded") throw new Error("receipt_status_mismatch");
  assertHex64(receipt.scratch_apply_receipt_id, "scratch_apply_receipt_id");
  assertNonEmpty(receipt.reviewer, "receipt_reviewer");
  assertNonEmpty(receipt.reason, "receipt_reason");

  const scratchApply = receipt.scratch_apply || {};
  if (scratchApply.marker !== SCRATCH_APPLY_MARKER) throw new Error("scratch_apply_marker_mismatch");
  assertHex64(scratchApply.scratch_apply_id, "scratch_apply_id");
  assertNonEmpty(scratchApply.operator, "scratch_apply_operator");
  assertNonEmpty(scratchApply.reason, "scratch_apply_reason");

  const scratchLedger = receipt.scratch_ledger || {};
  assertNonEmpty(scratchLedger.path, "scratch_ledger_path");
  if (!Number.isInteger(scratchLedger.line_count) || scratchLedger.line_count < 1) throw new Error("scratch_ledger_line_count_invalid");
  assertHex64(scratchLedger.current_scratch_ledger_hash, "current_scratch_ledger_hash");
  assertHex64(scratchLedger.scratch_ledger_out_hash, "scratch_ledger_out_hash");
  assertHex64(scratchLedger.appended_line_hash, "appended_line_hash");
  assertHex64(scratchLedger.logical_candidate_next_ledger_hash, "logical_candidate_next_ledger_hash");
  const lastLineHash = validateCandidateLine(scratchLedger.last_line);
  if (lastLineHash !== scratchLedger.appended_line_hash) throw new Error("receipt_last_line_hash_mismatch");
  const recomputedNext = stableHashObject({
    previous_ledger_hash: scratchLedger.current_scratch_ledger_hash,
    candidate_line_hash: scratchLedger.appended_line_hash,
  });
  if (recomputedNext !== scratchLedger.logical_candidate_next_ledger_hash) throw new Error("logical_candidate_next_ledger_hash_mismatch");

  const source = receipt.source || {};
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

  const policy = receipt.work_credits_policy || {};
  assertBool(policy.useful_verifiable_work_only, true, "useful_verifiable_work_only");
  assertBool(policy.unlimited_uncapped_accounting_units, true, "unlimited_uncapped_accounting_units");
  assertBool(policy.finite_approved_amount_for_this_review, true, "finite_approved_amount_for_this_review");
  assertBool(policy.scratch_receipt_only, true, "scratch_receipt_only");

  const boundary = receipt.boundary || {};
  assertBool(boundary.scratch_apply_receipt_only, true, "scratch_apply_receipt_only");
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
    console.log("Usage: node tools/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt-closeout.mjs --receipt <receipt.json> --out <closeout.json> --closer <closer> --reason <reason>");
    return;
  }

  const receiptPath = path.resolve(requireArg("receipt"));
  const outPath = path.resolve(requireArg("out"));
  const closer = requireArg("closer");
  const reason = requireArg("reason");
  assertNonEmpty(closer, "closer");
  assertNonEmpty(reason, "reason");

  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  validateReceipt(receipt);

  const closeoutId = stableHashObject({
    scratch_apply_receipt_id: receipt.scratch_apply_receipt_id,
    scratch_apply_id: receipt.scratch_apply.scratch_apply_id,
    scratch_ledger_out_hash: receipt.scratch_ledger.scratch_ledger_out_hash,
    appended_line_hash: receipt.scratch_ledger.appended_line_hash,
    logical_candidate_next_ledger_hash: receipt.scratch_ledger.logical_candidate_next_ledger_hash,
    closer,
    reason,
  });

  const closeout = {
    schema: "void.datanet.wc.evidence_packet_ledger_append_scratch_apply_receipt_closeout.v1",
    marker: MARKER,
    status: "scratch_receipt_chain_closed_for_operator_review",
    scratch_apply_receipt_closeout_id: closeoutId,
    created_at: process.env.VOID_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_CREATED_AT || new Date().toISOString(),
    closer,
    reason,
    receipt: {
      path: receiptPath,
      marker: receipt.marker,
      scratch_apply_receipt_id: receipt.scratch_apply_receipt_id,
      reviewer: receipt.reviewer,
      reason: receipt.reason,
    },
    scratch_apply: {
      marker: receipt.scratch_apply.marker,
      scratch_apply_id: receipt.scratch_apply.scratch_apply_id,
      operator: receipt.scratch_apply.operator,
      reason: receipt.scratch_apply.reason,
    },
    scratch_ledger: {
      path: receipt.scratch_ledger.path,
      line_count: receipt.scratch_ledger.line_count,
      current_scratch_ledger_hash: receipt.scratch_ledger.current_scratch_ledger_hash,
      scratch_ledger_out_hash: receipt.scratch_ledger.scratch_ledger_out_hash,
      appended_line_hash: receipt.scratch_ledger.appended_line_hash,
      logical_candidate_next_ledger_hash: receipt.scratch_ledger.logical_candidate_next_ledger_hash,
    },
    source: {
      execute_packet_marker: receipt.source.execute_packet_marker,
      execute_packet_id: receipt.source.execute_packet_id,
      dry_run_marker: receipt.source.dry_run_marker,
      dry_run_id: receipt.source.dry_run_id,
      packet_marker: receipt.source.packet_marker,
      packet_id: receipt.source.packet_id,
      approval_marker: receipt.source.approval_marker,
      approval_id: receipt.source.approval_id,
      proposal_marker: receipt.source.proposal_marker,
      proposal_id: receipt.source.proposal_id,
      decision_marker: receipt.source.decision_marker,
      decision_id: receipt.source.decision_id,
      queue_marker: receipt.source.queue_marker,
      review_id: receipt.source.review_id,
      summary_marker: receipt.source.summary_marker,
      generator_marker: receipt.source.generator_marker,
      verifier_marker: receipt.source.verifier_marker,
      evidence_hash: receipt.source.evidence_hash,
      work_id: receipt.source.work_id,
      worker: receipt.source.worker,
      files: receipt.source.files,
    },
    closeout_summary: {
      scratch_receipt_chain_complete: true,
      scratch_ledger_preview_bound: true,
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
      scratch_receipt_closeout_only: true,
    },
    boundary: {
      scratch_apply_receipt_closeout_only: true,
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
  console.error(`datanet_wc_evidence_packet_ledger_append_scratch_apply_receipt_closeout_error=${err.message}`);
  process.exit(1);
});
