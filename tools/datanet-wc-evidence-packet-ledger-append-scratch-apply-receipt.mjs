#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_HOLD_V1";
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

function validateScratchApply(record) {
  if (record.schema !== "void.datanet.wc.evidence_packet_ledger_append_scratch_apply.v1") throw new Error("scratch_apply_schema_mismatch");
  if (record.marker !== SCRATCH_APPLY_MARKER) throw new Error("scratch_apply_marker_mismatch");
  if (record.status !== "scratch_ledger_preview_written") throw new Error("scratch_apply_status_mismatch");
  assertHex64(record.scratch_apply_id, "scratch_apply_id");
  assertNonEmpty(record.operator, "operator");
  assertNonEmpty(record.reason, "reason");
  assertNonEmpty(record.ledger_in_path, "ledger_in_path");
  assertNonEmpty(record.ledger_out_path, "ledger_out_path");
  assertHex64(record.current_scratch_ledger_hash, "current_scratch_ledger_hash");
  assertHex64(record.scratch_ledger_out_hash, "scratch_ledger_out_hash");
  assertHex64(record.logical_candidate_next_ledger_hash, "logical_candidate_next_ledger_hash");
  assertHex64(record.appended_line_hash, "appended_line_hash");

  const appendedLineHash = validateCandidateLine(record.appended_line);
  if (appendedLineHash !== record.appended_line_hash) throw new Error("appended_line_hash_mismatch");
  if (record.appended_line.previous_ledger_hash !== record.current_scratch_ledger_hash) throw new Error("scratch_previous_hash_mismatch");
  const recomputedNext = stableHashObject({
    previous_ledger_hash: record.current_scratch_ledger_hash,
    candidate_line_hash: record.appended_line_hash,
  });
  if (recomputedNext !== record.logical_candidate_next_ledger_hash) throw new Error("logical_candidate_next_ledger_hash_mismatch");

  const source = record.source || {};
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

  assertBool(record.work_credits_policy?.useful_verifiable_work_only, true, "useful_verifiable_work_only");
  assertBool(record.work_credits_policy?.unlimited_uncapped_accounting_units, true, "unlimited_uncapped_accounting_units");
  assertBool(record.work_credits_policy?.finite_approved_amount_for_this_review, true, "finite_approved_amount_for_this_review");
  assertBool(record.work_credits_policy?.scratch_preview_only, true, "scratch_preview_only");

  const boundary = record.boundary || {};
  assertBool(boundary.scratch_apply_only, true, "scratch_apply_only");
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

  const recomputedScratchApplyId = stableHashObject({
    execute_packet_id: source.execute_packet_id,
    candidate_line_hash: record.appended_line_hash,
    candidate_next_ledger_hash: record.logical_candidate_next_ledger_hash,
    scratch_ledger_out_hash: record.scratch_ledger_out_hash,
    operator: record.operator,
    reason: record.reason,
  });
  if (recomputedScratchApplyId !== record.scratch_apply_id) throw new Error("scratch_apply_id_mismatch");
}

function parseJsonLines(text) {
  const rawLines = text.split("\n").filter((line) => line.trim() !== "");
  return rawLines.map((line, idx) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new Error(`scratch_ledger_line_${idx + 1}_invalid`);
    }
  });
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log("Usage: node tools/datanet-wc-evidence-packet-ledger-append-scratch-apply-receipt.mjs --scratch-apply <scratch-apply.json> --scratch-ledger <scratch-ledger-out.jsonl> --out <receipt.json> --reviewer <reviewer> --reason <reason>");
    return;
  }

  const scratchApplyPath = path.resolve(requireArg("scratch-apply"));
  const scratchLedgerPath = path.resolve(requireArg("scratch-ledger"));
  const outPath = path.resolve(requireArg("out"));
  const reviewer = requireArg("reviewer");
  const reason = requireArg("reason");
  assertNonEmpty(reviewer, "reviewer");
  assertNonEmpty(reason, "reason");

  const scratchApply = JSON.parse(await readFile(scratchApplyPath, "utf8"));
  validateScratchApply(scratchApply);

  if (scratchLedgerPath !== path.resolve(scratchApply.ledger_out_path)) throw new Error("scratch_ledger_path_mismatch");
  const scratchLedgerBytes = await readFile(scratchLedgerPath);
  const scratchLedgerText = scratchLedgerBytes.toString("utf8");
  const scratchLedgerHash = sha256(scratchLedgerBytes);
  if (scratchLedgerHash !== scratchApply.scratch_ledger_out_hash) throw new Error("scratch_ledger_hash_mismatch");

  const lines = parseJsonLines(scratchLedgerText);
  if (lines.length < 1) throw new Error("scratch_ledger_empty");
  const lastLine = lines[lines.length - 1];
  const lastLineHash = validateCandidateLine(lastLine);
  if (lastLineHash !== scratchApply.appended_line_hash) throw new Error("last_line_hash_mismatch");
  if (JSON.stringify(lastLine) !== JSON.stringify(scratchApply.appended_line)) throw new Error("last_line_binding_mismatch");

  const receiptId = stableHashObject({
    scratch_apply_id: scratchApply.scratch_apply_id,
    scratch_ledger_out_hash: scratchLedgerHash,
    appended_line_hash: lastLineHash,
    logical_candidate_next_ledger_hash: scratchApply.logical_candidate_next_ledger_hash,
    reviewer,
    reason,
  });

  const receipt = {
    schema: "void.datanet.wc.evidence_packet_ledger_append_scratch_apply_receipt.v1",
    marker: MARKER,
    status: "scratch_ledger_preview_receipt_recorded",
    scratch_apply_receipt_id: receiptId,
    created_at: process.env.VOID_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CREATED_AT || new Date().toISOString(),
    reviewer,
    reason,
    scratch_apply: {
      path: scratchApplyPath,
      marker: scratchApply.marker,
      scratch_apply_id: scratchApply.scratch_apply_id,
      operator: scratchApply.operator,
      reason: scratchApply.reason,
    },
    scratch_ledger: {
      path: scratchLedgerPath,
      line_count: lines.length,
      current_scratch_ledger_hash: scratchApply.current_scratch_ledger_hash,
      scratch_ledger_out_hash: scratchLedgerHash,
      appended_line_hash: lastLineHash,
      logical_candidate_next_ledger_hash: scratchApply.logical_candidate_next_ledger_hash,
      last_line: lastLine,
    },
    source: {
      execute_packet_marker: scratchApply.source.execute_packet_marker,
      execute_packet_id: scratchApply.source.execute_packet_id,
      dry_run_marker: scratchApply.source.dry_run_marker,
      dry_run_id: scratchApply.source.dry_run_id,
      packet_marker: scratchApply.source.packet_marker,
      packet_id: scratchApply.source.packet_id,
      approval_marker: scratchApply.source.approval_marker,
      approval_id: scratchApply.source.approval_id,
      proposal_marker: scratchApply.source.proposal_marker,
      proposal_id: scratchApply.source.proposal_id,
      decision_marker: scratchApply.source.decision_marker,
      decision_id: scratchApply.source.decision_id,
      queue_marker: scratchApply.source.queue_marker,
      review_id: scratchApply.source.review_id,
      summary_marker: scratchApply.source.summary_marker,
      generator_marker: scratchApply.source.generator_marker,
      verifier_marker: scratchApply.source.verifier_marker,
      evidence_hash: scratchApply.source.evidence_hash,
      work_id: scratchApply.source.work_id,
      worker: scratchApply.source.worker,
      files: scratchApply.source.files,
    },
    work_credits_policy: {
      useful_verifiable_work_only: true,
      unlimited_uncapped_accounting_units: true,
      finite_approved_amount_for_this_review: true,
      scratch_receipt_only: true,
    },
    boundary: {
      scratch_apply_receipt_only: true,
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
  await writeFile(outPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_ledger_append_scratch_apply_receipt_error=${err.message}`);
  process.exit(1);
});
