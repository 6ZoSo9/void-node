#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_APPROVAL_HOLD_V1";
const PROPOSAL_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_PROPOSAL_HOLD_V1";
const DECISION_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_DECISION_HOLD_V1";
const QUEUE_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_QUEUE_HOLD_V1";
const ROUNDTRIP_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_ROUNDTRIP_HOLD_V1";
const GENERATOR_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1";
const VERIFIER_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_VERIFIER_HOLD_V1";

const ALLOWED_APPROVAL_DECISIONS = new Set([
  "approve_award",
  "request_changes",
  "reject_award"
]);

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function requireArg(name) {
  const value = getArg(name);
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing required --${name}`);
  }
  return value;
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function assertBool(value, expected, label) {
  if (value !== expected) {
    throw new Error(`${label}_boundary_mismatch`);
  }
}

function assertPositiveIntegerString(value, label) {
  if (!/^[1-9][0-9]*$/.test(value || "")) {
    throw new Error(`${label}_invalid`);
  }
}

function validateProposalRecord(record) {
  if (record.schema !== "void.datanet.wc.evidence_packet_award_proposal.v1") {
    throw new Error("proposal_schema_mismatch");
  }
  if (record.marker !== PROPOSAL_MARKER) {
    throw new Error("proposal_marker_mismatch");
  }
  if (record.status !== "award_proposal_recorded") {
    throw new Error("proposal_status_mismatch");
  }
  if (!/^[0-9a-f]{64}$/.test(record.proposal_id || "")) {
    throw new Error("proposal_id_invalid");
  }
  assertPositiveIntegerString(record.proposed_wc_amount, "proposed_wc_amount");

  const source = record.source || {};
  if (source.decision_marker !== DECISION_MARKER) throw new Error("decision_marker_mismatch");
  if (source.decision !== "accept_evidence") throw new Error("source_decision_not_accept_evidence");
  if (source.queue_marker !== QUEUE_MARKER) throw new Error("queue_marker_mismatch");
  if (source.summary_marker !== ROUNDTRIP_MARKER) throw new Error("summary_marker_mismatch");
  if (source.generator_marker !== GENERATOR_MARKER) throw new Error("generator_marker_mismatch");
  if (source.verifier_marker !== VERIFIER_MARKER) throw new Error("verifier_marker_mismatch");
  if (!/^[0-9a-f]{64}$/.test(source.decision_id || "")) throw new Error("decision_id_invalid");
  if (!/^[0-9a-f]{64}$/.test(source.review_id || "")) throw new Error("review_id_invalid");
  if (!/^[0-9a-f]{64}$/.test(source.evidence_hash || "")) throw new Error("evidence_hash_invalid");
  if (!source.work_id || !source.worker) throw new Error("source_identity_missing");

  assertBool(record.work_credits_policy?.useful_verifiable_work_only, true, "useful_verifiable_work_only");
  assertBool(record.work_credits_policy?.unlimited_uncapped_accounting_units, true, "unlimited_uncapped_accounting_units");
  assertBool(record.work_credits_policy?.finite_proposed_amount_for_this_review, true, "finite_proposed_amount_for_this_review");
  assertBool(record.work_credits_policy?.operator_approval_required, true, "operator_approval_required");

  const boundary = record.boundary || {};
  assertBool(boundary.award_proposal_record_only, true, "award_proposal_record_only");
  assertBool(boundary.award_proposal_amount_present, true, "award_proposal_amount_present");
  for (const key of [
    "wc_award_approval_enabled",
    "wc_issuance_enabled",
    "wc_claim_enabled",
    "wc_ledger_write_enabled",
    "void_transfer_enabled",
    "usdc_transfer_enabled",
    "wallet_connection_enabled",
    "signer_access_enabled",
    "network_submit_enabled",
    "public_mutation_enabled",
  ]) {
    assertBool(boundary[key], false, key);
  }
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log("Usage: node tools/datanet-wc-evidence-packet-award-approval.mjs --proposal <proposal.json> --out <approval.json> --approver <handle> --decision <approve_award|request_changes|reject_award> --reason <text>");
    return;
  }

  const proposalPath = path.resolve(requireArg("proposal"));
  const outPath = path.resolve(requireArg("out"));
  const approver = requireArg("approver");
  const approvalDecision = requireArg("decision");
  const reason = requireArg("reason");

  if (!ALLOWED_APPROVAL_DECISIONS.has(approvalDecision)) {
    throw new Error("approval_decision_not_allowed");
  }

  const proposalRecord = JSON.parse(await readFile(proposalPath, "utf8"));
  validateProposalRecord(proposalRecord);

  const source = proposalRecord.source;
  const approvedWcAmount = approvalDecision === "approve_award" ? proposalRecord.proposed_wc_amount : null;

  const approvalId = sha256(JSON.stringify({
    proposal_id: proposalRecord.proposal_id,
    decision_id: source.decision_id,
    review_id: source.review_id,
    evidence_hash: source.evidence_hash,
    work_id: source.work_id,
    worker: source.worker,
    approver,
    approval_decision: approvalDecision,
    approved_wc_amount: approvedWcAmount,
    reason
  }));

  const approvalRecord = {
    schema: "void.datanet.wc.evidence_packet_award_approval.v1",
    marker: MARKER,
    status: "award_approval_recorded",
    approval_id: approvalId,
    created_at: process.env.VOID_AWARD_APPROVAL_CREATED_AT || new Date().toISOString(),
    approver,
    approval_decision: approvalDecision,
    approved_wc_amount: approvedWcAmount,
    reason,
    source: {
      proposal_path: proposalPath,
      proposal_marker: proposalRecord.marker,
      proposal_id: proposalRecord.proposal_id,
      proposed_wc_amount: proposalRecord.proposed_wc_amount,
      decision_marker: source.decision_marker,
      decision_id: source.decision_id,
      decision: source.decision,
      review_id: source.review_id,
      evidence_hash: source.evidence_hash,
      work_id: source.work_id,
      worker: source.worker,
      files: source.files,
      queue_marker: source.queue_marker,
      summary_marker: source.summary_marker,
      generator_marker: source.generator_marker,
      verifier_marker: source.verifier_marker
    },
    work_credits_policy: {
      useful_verifiable_work_only: true,
      unlimited_uncapped_accounting_units: true,
      finite_approved_amount_for_this_review: approvalDecision === "approve_award",
      separate_ledger_write_required: approvalDecision === "approve_award"
    },
    boundary: {
      award_approval_record_only: true,
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
  await writeFile(outPath, JSON.stringify(approvalRecord, null, 2) + "\n", "utf8");

  console.log(JSON.stringify({
    marker: MARKER,
    status: "award_approval_recorded",
    approval_id: approvalId,
    out: outPath,
    approval_decision: approvalDecision,
    approved_wc_amount: approvedWcAmount,
    proposal_id: proposalRecord.proposal_id,
    proposed_wc_amount: proposalRecord.proposed_wc_amount,
    review_id: source.review_id,
    evidence_hash: source.evidence_hash,
    work_id: source.work_id,
    worker: source.worker,
    approver,
    boundary: "award_approval_record_only_no_issuance_no_claim_no_ledger_write_no_network_submit"
  }, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_award_approval_error=${err.message}`);
  process.exit(1);
});
