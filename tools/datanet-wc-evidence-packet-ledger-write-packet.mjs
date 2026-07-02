#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_WRITE_PACKET_HOLD_V1";
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

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function assertBool(value, expected, label) {
  if (value !== expected) throw new Error(`${label}_boundary_mismatch`);
}

function assertPositiveIntegerString(value, label) {
  if (!/^[1-9][0-9]*$/.test(value || "")) throw new Error(`${label}_invalid`);
}

function validateApproval(record) {
  if (record.schema !== "void.datanet.wc.evidence_packet_award_approval.v1") throw new Error("approval_schema_mismatch");
  if (record.marker !== APPROVAL_MARKER) throw new Error("approval_marker_mismatch");
  if (record.status !== "award_approval_recorded") throw new Error("approval_status_mismatch");
  if (record.approval_decision !== "approve_award") throw new Error("approval_decision_not_approve_award");
  if (!/^[0-9a-f]{64}$/.test(record.approval_id || "")) throw new Error("approval_id_invalid");
  assertPositiveIntegerString(record.approved_wc_amount, "approved_wc_amount");

  const source = record.source || {};
  if (source.proposal_marker !== PROPOSAL_MARKER) throw new Error("proposal_marker_mismatch");
  if (source.decision_marker !== DECISION_MARKER) throw new Error("decision_marker_mismatch");
  if (source.decision !== "accept_evidence") throw new Error("source_decision_not_accept_evidence");
  if (source.queue_marker !== QUEUE_MARKER) throw new Error("queue_marker_mismatch");
  if (source.summary_marker !== ROUNDTRIP_MARKER) throw new Error("summary_marker_mismatch");
  if (source.generator_marker !== GENERATOR_MARKER) throw new Error("generator_marker_mismatch");
  if (source.verifier_marker !== VERIFIER_MARKER) throw new Error("verifier_marker_mismatch");
  if (!/^[0-9a-f]{64}$/.test(source.proposal_id || "")) throw new Error("proposal_id_invalid");
  if (!/^[0-9a-f]{64}$/.test(source.decision_id || "")) throw new Error("decision_id_invalid");
  if (!/^[0-9a-f]{64}$/.test(source.review_id || "")) throw new Error("review_id_invalid");
  if (!/^[0-9a-f]{64}$/.test(source.evidence_hash || "")) throw new Error("evidence_hash_invalid");
  if (!source.work_id || !source.worker) throw new Error("source_identity_missing");

  assertBool(record.work_credits_policy?.useful_verifiable_work_only, true, "useful_verifiable_work_only");
  assertBool(record.work_credits_policy?.unlimited_uncapped_accounting_units, true, "unlimited_uncapped_accounting_units");
  assertBool(record.work_credits_policy?.finite_approved_amount_for_this_review, true, "finite_approved_amount_for_this_review");
  assertBool(record.work_credits_policy?.separate_ledger_write_required, true, "separate_ledger_write_required");

  const boundary = record.boundary || {};
  assertBool(boundary.award_approval_record_only, true, "award_approval_record_only");
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
    console.log("Usage: node tools/datanet-wc-evidence-packet-ledger-write-packet.mjs --approval <approval.json> --out <packet.json> --operator <handle> --ledger <ledger-name> --reason <text>");
    return;
  }

  const approvalPath = path.resolve(requireArg("approval"));
  const outPath = path.resolve(requireArg("out"));
  const operator = requireArg("operator");
  const ledger = requireArg("ledger");
  const reason = requireArg("reason");

  const approval = JSON.parse(await readFile(approvalPath, "utf8"));
  validateApproval(approval);

  const source = approval.source;
  const packetId = sha256(JSON.stringify({
    approval_id: approval.approval_id,
    proposal_id: source.proposal_id,
    review_id: source.review_id,
    evidence_hash: source.evidence_hash,
    work_id: source.work_id,
    worker: source.worker,
    approved_wc_amount: approval.approved_wc_amount,
    operator,
    ledger,
    reason
  }));

  const packet = {
    schema: "void.datanet.wc.evidence_packet_ledger_write_packet.v1",
    marker: MARKER,
    status: "ledger_write_packet_recorded",
    packet_id: packetId,
    created_at: process.env.VOID_LEDGER_WRITE_PACKET_CREATED_AT || new Date().toISOString(),
    operator,
    ledger,
    reason,
    ledger_write_intent: {
      operation: "append_only_candidate",
      worker: source.worker,
      work_id: source.work_id,
      evidence_hash: source.evidence_hash,
      approved_wc_amount: approval.approved_wc_amount,
      approval_id: approval.approval_id,
      proposal_id: source.proposal_id,
      review_id: source.review_id
    },
    source: {
      approval_path: approvalPath,
      approval_marker: approval.marker,
      approval_id: approval.approval_id,
      approval_decision: approval.approval_decision,
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
      separate_operator_execution_required: true
    },
    boundary: {
      ledger_write_packet_only: true,
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
  await writeFile(outPath, JSON.stringify(packet, null, 2) + "\n", "utf8");

  console.log(JSON.stringify({
    marker: MARKER,
    status: "ledger_write_packet_recorded",
    packet_id: packetId,
    out: outPath,
    ledger,
    approved_wc_amount: approval.approved_wc_amount,
    approval_id: approval.approval_id,
    review_id: source.review_id,
    evidence_hash: source.evidence_hash,
    work_id: source.work_id,
    worker: source.worker,
    operator,
    boundary: "ledger_write_packet_only_no_append_no_issuance_no_claim_no_network_submit"
  }, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_ledger_write_packet_error=${err.message}`);
  process.exit(1);
});
