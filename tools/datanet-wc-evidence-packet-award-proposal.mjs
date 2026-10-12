#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_PROPOSAL_HOLD_V1";
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

function validateProposedAmount(value) {
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error("proposed_wc_amount_invalid");
  }
  return value;
}

function validateDecisionRecord(record) {
  if (record.schema !== "void.datanet.wc.evidence_packet_review_decision.v1") {
    throw new Error("decision_schema_mismatch");
  }
  if (record.marker !== DECISION_MARKER) {
    throw new Error("decision_marker_mismatch");
  }
  if (record.status !== "review_decision_recorded") {
    throw new Error("decision_status_mismatch");
  }
  if (record.decision !== "accept_evidence") {
    throw new Error("decision_not_accept_evidence");
  }
  if (!/^[0-9a-f]{64}$/.test(record.decision_id || "")) {
    throw new Error("decision_id_invalid");
  }

  const source = record.source || {};
  if (source.queue_marker !== QUEUE_MARKER) throw new Error("queue_marker_mismatch");
  if (source.summary_marker !== ROUNDTRIP_MARKER) throw new Error("summary_marker_mismatch");
  if (source.generator_marker !== GENERATOR_MARKER) throw new Error("generator_marker_mismatch");
  if (source.verifier_marker !== VERIFIER_MARKER) throw new Error("verifier_marker_mismatch");
  if (!/^[0-9a-f]{64}$/.test(source.review_id || "")) throw new Error("review_id_invalid");
  if (!/^[0-9a-f]{64}$/.test(source.evidence_hash || "")) throw new Error("evidence_hash_invalid");
  if (!source.work_id || !source.worker) throw new Error("source_identity_missing");

  assertBool(record.work_credits_policy?.useful_verifiable_work_only, true, "useful_verifiable_work_only");
  assertBool(record.work_credits_policy?.unlimited_uncapped_accounting_units, true, "unlimited_uncapped_accounting_units");
  assertBool(record.work_credits_policy?.award_amount_included, false, "award_amount_included");
  assertBool(record.work_credits_policy?.operator_review_required, true, "operator_review_required");

  const boundary = record.boundary || {};
  assertBool(boundary.review_decision_record_only, true, "review_decision_record_only");
  for (const key of [
    "wc_award_approval_enabled",
    "wc_award_amount_enabled",
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
    console.log("Usage: node tools/datanet-wc-evidence-packet-award-proposal.mjs --decision <decision.json> --out <proposal.json> --proposer <handle> --proposed-wc <positive integer string> --reason <text>");
    return;
  }

  const decisionPath = path.resolve(requireArg("decision"));
  const outPath = path.resolve(requireArg("out"));
  const proposer = requireArg("proposer");
  const proposedWcAmount = validateProposedAmount(requireArg("proposed-wc"));
  const reason = requireArg("reason");

  const decisionRecord = JSON.parse(await readFile(decisionPath, "utf8"));
  validateDecisionRecord(decisionRecord);

  const source = decisionRecord.source;
  const proposalId = sha256(JSON.stringify({
    decision_id: decisionRecord.decision_id,
    review_id: source.review_id,
    evidence_hash: source.evidence_hash,
    work_id: source.work_id,
    worker: source.worker,
    proposer,
    proposed_wc_amount: proposedWcAmount,
    reason
  }));

  const proposalRecord = {
    schema: "void.datanet.wc.evidence_packet_award_proposal.v1",
    marker: MARKER,
    status: "award_proposal_recorded",
    proposal_id: proposalId,
    created_at: process.env.VOID_AWARD_PROPOSAL_CREATED_AT || new Date().toISOString(),
    proposer,
    proposed_wc_amount: proposedWcAmount,
    reason,
    source: {
      decision_path: decisionPath,
      decision_marker: decisionRecord.marker,
      decision_id: decisionRecord.decision_id,
      decision: decisionRecord.decision,
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
      finite_proposed_amount_for_this_review: true,
      operator_approval_required: true
    },
    boundary: {
      award_proposal_record_only: true,
      award_proposal_amount_present: true,
      wc_award_approval_enabled: false,
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
  await writeFile(outPath, JSON.stringify(proposalRecord, null, 2) + "\n", "utf8");

  console.log(JSON.stringify({
    marker: MARKER,
    status: "award_proposal_recorded",
    proposal_id: proposalId,
    out: outPath,
    proposed_wc_amount: proposedWcAmount,
    decision_id: decisionRecord.decision_id,
    review_id: source.review_id,
    evidence_hash: source.evidence_hash,
    work_id: source.work_id,
    worker: source.worker,
    proposer,
    boundary: "award_proposal_record_only_no_approval_no_issuance_no_ledger_write_no_network_submit"
  }, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_award_proposal_error=${err.message}`);
  process.exit(1);
});
