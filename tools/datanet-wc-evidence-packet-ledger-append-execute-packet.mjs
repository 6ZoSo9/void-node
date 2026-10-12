#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_EXECUTE_PACKET_HOLD_V1";
const DRY_RUN_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_DRY_RUN_HOLD_V1";
const LEDGER_PACKET_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_WRITE_PACKET_HOLD_V1";
const APPROVAL_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_APPROVAL_HOLD_V1";
const PROPOSAL_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_PROPOSAL_HOLD_V1";
const DECISION_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_DECISION_HOLD_V1";
const QUEUE_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_QUEUE_HOLD_V1";
const ROUNDTRIP_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_ROUNDTRIP_HOLD_V1";
const GENERATOR_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1";
const VERIFIER_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_VERIFIER_HOLD_V1";

const CONFIRM_PHRASE = "I_UNDERSTAND_THIS_IS_EXECUTE_PACKET_ONLY_NO_APPEND";
const EXECUTION_MODE = "manual_operator_append_review";

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

function assertPositiveIntegerString(value, label) {
  if (!/^[1-9][0-9]*$/.test(value || "")) throw new Error(`${label}_invalid`);
}

function validateDryRun(record) {
  if (record.schema !== "void.datanet.wc.evidence_packet_ledger_append_dry_run.v1") throw new Error("dry_run_schema_mismatch");
  if (record.marker !== DRY_RUN_MARKER) throw new Error("dry_run_marker_mismatch");
  if (record.status !== "ledger_append_dry_run_recorded") throw new Error("dry_run_status_mismatch");
  assertHex64(record.dry_run_id, "dry_run_id");
  assertHex64(record.ledger_current_hash, "ledger_current_hash");
  assertHex64(record.candidate_next_ledger_hash, "candidate_next_ledger_hash");

  const line = record.candidate_line || {};
  if (line.schema !== "void.datanet.wc.ledger_line_candidate.v1") throw new Error("candidate_line_schema_mismatch");
  if (line.operation !== "append_only_dry_run_candidate") throw new Error("candidate_line_operation_mismatch");
  assertHex64(line.previous_ledger_hash, "previous_ledger_hash");
  assertHex64(line.evidence_hash, "evidence_hash");
  assertHex64(line.approval_id, "approval_id");
  assertHex64(line.proposal_id, "proposal_id");
  assertHex64(line.review_id, "review_id");
  assertHex64(line.packet_id, "packet_id");
  assertHex64(line.candidate_line_hash, "candidate_line_hash");
  assertPositiveIntegerString(line.approved_wc_amount, "approved_wc_amount");

  const source = record.source || {};
  if (source.packet_marker !== LEDGER_PACKET_MARKER) throw new Error("packet_marker_mismatch");
  if (source.approval_marker !== APPROVAL_MARKER) throw new Error("approval_marker_mismatch");
  if (source.approval_decision !== "approve_award") throw new Error("approval_decision_mismatch");
  if (source.proposal_marker !== PROPOSAL_MARKER) throw new Error("proposal_marker_mismatch");
  if (source.decision_marker !== DECISION_MARKER) throw new Error("decision_marker_mismatch");
  if (source.decision !== "accept_evidence") throw new Error("source_decision_not_accept_evidence");
  if (source.queue_marker !== QUEUE_MARKER) throw new Error("queue_marker_mismatch");
  if (source.summary_marker !== ROUNDTRIP_MARKER) throw new Error("summary_marker_mismatch");
  if (source.generator_marker !== GENERATOR_MARKER) throw new Error("generator_marker_mismatch");
  if (source.verifier_marker !== VERIFIER_MARKER) throw new Error("verifier_marker_mismatch");

  assertBool(record.work_credits_policy?.useful_verifiable_work_only, true, "useful_verifiable_work_only");
  assertBool(record.work_credits_policy?.unlimited_uncapped_accounting_units, true, "unlimited_uncapped_accounting_units");
  assertBool(record.work_credits_policy?.finite_approved_amount_for_this_review, true, "finite_approved_amount_for_this_review");
  assertBool(record.work_credits_policy?.separate_operator_append_required, true, "separate_operator_append_required");

  const boundary = record.boundary || {};
  assertBool(boundary.ledger_append_dry_run_only, true, "ledger_append_dry_run_only");
  assertBool(boundary.ledger_append_performed, false, "ledger_append_performed");
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
    console.log(`Usage: node tools/datanet-wc-evidence-packet-ledger-append-execute-packet.mjs --dry-run <dry-run.json> --out <execute-packet.json> --operator <handle> --execution-mode ${EXECUTION_MODE} --confirm ${CONFIRM_PHRASE} --reason <text>`);
    return;
  }

  const dryRunPath = path.resolve(requireArg("dry-run"));
  const outPath = path.resolve(requireArg("out"));
  const operator = requireArg("operator");
  const executionMode = requireArg("execution-mode");
  const confirm = requireArg("confirm");
  const reason = requireArg("reason");

  if (executionMode !== EXECUTION_MODE) throw new Error("execution_mode_not_allowed");
  if (confirm !== CONFIRM_PHRASE) throw new Error("confirm_phrase_mismatch");

  const dryRun = JSON.parse(await readFile(dryRunPath, "utf8"));
  validateDryRun(dryRun);

  const line = dryRun.candidate_line;
  const source = dryRun.source;

  const executePacketId = stableHashObject({
    dry_run_id: dryRun.dry_run_id,
    candidate_line_hash: line.candidate_line_hash,
    candidate_next_ledger_hash: dryRun.candidate_next_ledger_hash,
    operator,
    execution_mode: executionMode,
    reason
  });

  const executePacket = {
    schema: "void.datanet.wc.evidence_packet_ledger_append_execute_packet.v1",
    marker: MARKER,
    status: "ledger_append_execute_packet_recorded",
    execute_packet_id: executePacketId,
    created_at: process.env.VOID_LEDGER_APPEND_EXECUTE_PACKET_CREATED_AT || new Date().toISOString(),
    operator,
    execution_mode: executionMode,
    reason,
    append_execution_intent: {
      operation: "append_only_manual_operator_candidate",
      ledger: dryRun.ledger,
      previous_ledger_hash: dryRun.ledger_current_hash,
      candidate_line_hash: line.candidate_line_hash,
      candidate_next_ledger_hash: dryRun.candidate_next_ledger_hash,
      candidate_line: line
    },
    source: {
      dry_run_path: dryRunPath,
      dry_run_marker: dryRun.marker,
      dry_run_id: dryRun.dry_run_id,
      packet_marker: source.packet_marker,
      packet_id: source.packet_id,
      approval_marker: source.approval_marker,
      approval_id: source.approval_id,
      approval_decision: source.approval_decision,
      proposal_marker: source.proposal_marker,
      proposal_id: source.proposal_id,
      decision_marker: source.decision_marker,
      decision_id: source.decision_id,
      decision: source.decision,
      queue_marker: source.queue_marker,
      review_id: source.review_id,
      summary_marker: source.summary_marker,
      generator_marker: source.generator_marker,
      verifier_marker: source.verifier_marker,
      evidence_hash: source.evidence_hash,
      work_id: source.work_id,
      worker: source.worker,
      files: source.files
    },
    work_credits_policy: {
      useful_verifiable_work_only: true,
      unlimited_uncapped_accounting_units: true,
      finite_approved_amount_for_this_review: true,
      separate_operator_append_execution_required: true
    },
    boundary: {
      execute_packet_only: true,
      ledger_append_performed: false,
      wc_issuance_enabled: false,
      wc_claim_enabled: false,
      wc_ledger_write_enabled: false,
      void_transfer_enabled: false,
      usdc_transfer_enabled: false,
      wallet_connection_enabled: false,
      signer_access_enabled: false,
      network_submit_enabled: false,
      public_mutation_enabled: false
    }
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(executePacket, null, 2) + "\n", "utf8");

  console.log(JSON.stringify({
    marker: MARKER,
    status: "ledger_append_execute_packet_recorded",
    execute_packet_id: executePacketId,
    out: outPath,
    ledger: dryRun.ledger,
    approved_wc_amount: line.approved_wc_amount,
    candidate_line_hash: line.candidate_line_hash,
    candidate_next_ledger_hash: dryRun.candidate_next_ledger_hash,
    dry_run_id: dryRun.dry_run_id,
    packet_id: source.packet_id,
    approval_id: source.approval_id,
    review_id: source.review_id,
    evidence_hash: source.evidence_hash,
    work_id: source.work_id,
    worker: source.worker,
    operator,
    boundary: "execute_packet_only_no_append_no_issuance_no_claim_no_actual_ledger_write_no_network_submit"
  }, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_ledger_append_execute_packet_error=${err.message}`);
  process.exit(1);
});
