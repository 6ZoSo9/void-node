#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_DRY_RUN_HOLD_V1";
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

function assertPositiveIntegerString(value, label) {
  if (!/^[1-9][0-9]*$/.test(value || "")) throw new Error(`${label}_invalid`);
}

function validateLedgerWritePacket(packet) {
  if (packet.schema !== "void.datanet.wc.evidence_packet_ledger_write_packet.v1") throw new Error("packet_schema_mismatch");
  if (packet.marker !== LEDGER_PACKET_MARKER) throw new Error("packet_marker_mismatch");
  if (packet.status !== "ledger_write_packet_recorded") throw new Error("packet_status_mismatch");
  assertHex64(packet.packet_id, "packet_id");

  const intent = packet.ledger_write_intent || {};
  if (intent.operation !== "append_only_candidate") throw new Error("ledger_write_intent_operation_mismatch");
  assertPositiveIntegerString(intent.approved_wc_amount, "approved_wc_amount");
  if (!intent.worker || !intent.work_id) throw new Error("intent_identity_missing");
  assertHex64(intent.evidence_hash, "evidence_hash");
  assertHex64(intent.approval_id, "approval_id");
  assertHex64(intent.proposal_id, "proposal_id");
  assertHex64(intent.review_id, "review_id");

  const source = packet.source || {};
  if (source.approval_marker !== APPROVAL_MARKER) throw new Error("approval_marker_mismatch");
  if (source.approval_decision !== "approve_award") throw new Error("approval_decision_mismatch");
  if (source.proposal_marker !== PROPOSAL_MARKER) throw new Error("proposal_marker_mismatch");
  if (source.decision_marker !== DECISION_MARKER) throw new Error("decision_marker_mismatch");
  if (source.decision !== "accept_evidence") throw new Error("source_decision_not_accept_evidence");
  if (source.queue_marker !== QUEUE_MARKER) throw new Error("queue_marker_mismatch");
  if (source.summary_marker !== ROUNDTRIP_MARKER) throw new Error("summary_marker_mismatch");
  if (source.generator_marker !== GENERATOR_MARKER) throw new Error("generator_marker_mismatch");
  if (source.verifier_marker !== VERIFIER_MARKER) throw new Error("verifier_marker_mismatch");
  assertHex64(source.approval_id, "source_approval_id");
  assertHex64(source.proposal_id, "source_proposal_id");
  assertHex64(source.decision_id, "source_decision_id");
  assertHex64(source.review_id, "source_review_id");
  assertHex64(source.evidence_hash, "source_evidence_hash");

  assertBool(packet.work_credits_policy?.useful_verifiable_work_only, true, "useful_verifiable_work_only");
  assertBool(packet.work_credits_policy?.unlimited_uncapped_accounting_units, true, "unlimited_uncapped_accounting_units");
  assertBool(packet.work_credits_policy?.finite_approved_amount_for_this_review, true, "finite_approved_amount_for_this_review");
  assertBool(packet.work_credits_policy?.separate_operator_execution_required, true, "separate_operator_execution_required");

  const boundary = packet.boundary || {};
  assertBool(boundary.ledger_write_packet_only, true, "ledger_write_packet_only");
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
    console.log("Usage: node tools/datanet-wc-evidence-packet-ledger-append-dry-run.mjs --packet <ledger-write-packet.json> --out <dry-run.json> --operator <handle> --ledger-current-hash <64hex> --reason <text>");
    return;
  }

  const packetPath = path.resolve(requireArg("packet"));
  const outPath = path.resolve(requireArg("out"));
  const operator = requireArg("operator");
  const ledgerCurrentHash = requireArg("ledger-current-hash");
  const reason = requireArg("reason");

  assertHex64(ledgerCurrentHash, "ledger_current_hash");

  const packet = JSON.parse(await readFile(packetPath, "utf8"));
  validateLedgerWritePacket(packet);

  const intent = packet.ledger_write_intent;
  const source = packet.source;

  const candidateLineCore = {
    schema: "void.datanet.wc.ledger_line_candidate.v1",
    operation: "append_only_dry_run_candidate",
    ledger: packet.ledger,
    previous_ledger_hash: ledgerCurrentHash,
    worker: intent.worker,
    work_id: intent.work_id,
    evidence_hash: intent.evidence_hash,
    approved_wc_amount: intent.approved_wc_amount,
    approval_id: intent.approval_id,
    proposal_id: intent.proposal_id,
    review_id: intent.review_id,
    packet_id: packet.packet_id
  };

  const candidateLineHash = stableHashObject(candidateLineCore);
  const candidateNextLedgerHash = stableHashObject({
    previous_ledger_hash: ledgerCurrentHash,
    candidate_line_hash: candidateLineHash
  });

  const dryRunId = stableHashObject({
    packet_id: packet.packet_id,
    candidate_line_hash: candidateLineHash,
    candidate_next_ledger_hash: candidateNextLedgerHash,
    operator,
    reason
  });

  const dryRunRecord = {
    schema: "void.datanet.wc.evidence_packet_ledger_append_dry_run.v1",
    marker: MARKER,
    status: "ledger_append_dry_run_recorded",
    dry_run_id: dryRunId,
    created_at: process.env.VOID_LEDGER_APPEND_DRY_RUN_CREATED_AT || new Date().toISOString(),
    operator,
    reason,
    ledger: packet.ledger,
    ledger_current_hash: ledgerCurrentHash,
    candidate_line: {
      ...candidateLineCore,
      candidate_line_hash: candidateLineHash
    },
    candidate_next_ledger_hash: candidateNextLedgerHash,
    source: {
      packet_path: packetPath,
      packet_marker: packet.marker,
      packet_id: packet.packet_id,
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
      separate_operator_append_required: true
    },
    boundary: {
      ledger_append_dry_run_only: true,
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
  await writeFile(outPath, JSON.stringify(dryRunRecord, null, 2) + "\n", "utf8");

  console.log(JSON.stringify({
    marker: MARKER,
    status: "ledger_append_dry_run_recorded",
    dry_run_id: dryRunId,
    out: outPath,
    ledger: packet.ledger,
    approved_wc_amount: intent.approved_wc_amount,
    candidate_line_hash: candidateLineHash,
    candidate_next_ledger_hash: candidateNextLedgerHash,
    packet_id: packet.packet_id,
    approval_id: intent.approval_id,
    review_id: intent.review_id,
    evidence_hash: intent.evidence_hash,
    work_id: intent.work_id,
    worker: intent.worker,
    operator,
    boundary: "ledger_append_dry_run_only_no_append_no_issuance_no_claim_no_actual_ledger_write_no_network_submit"
  }, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_ledger_append_dry_run_error=${err.message}`);
  process.exit(1);
});
