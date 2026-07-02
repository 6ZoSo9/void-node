#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_DECISION_HOLD_V1";
const QUEUE_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_QUEUE_HOLD_V1";
const ROUNDTRIP_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_ROUNDTRIP_HOLD_V1";
const GENERATOR_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1";
const VERIFIER_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_VERIFIER_HOLD_V1";

const ALLOWED_DECISIONS = new Set([
  "accept_evidence",
  "request_changes",
  "reject_evidence"
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

function validateQueueEntry(entry) {
  if (entry.schema !== "void.datanet.wc.evidence_packet_review_queue.v1") {
    throw new Error("queue_schema_mismatch");
  }
  if (entry.marker !== QUEUE_MARKER) {
    throw new Error("queue_marker_mismatch");
  }
  if (entry.status !== "pending_operator_review") {
    throw new Error("queue_status_mismatch");
  }
  if (!/^[0-9a-f]{64}$/.test(entry.review_id || "")) {
    throw new Error("review_id_invalid");
  }

  const source = entry.source || {};
  if (source.summary_marker !== ROUNDTRIP_MARKER) throw new Error("summary_marker_mismatch");
  if (source.generator_marker !== GENERATOR_MARKER) throw new Error("generator_marker_mismatch");
  if (source.verifier_marker !== VERIFIER_MARKER) throw new Error("verifier_marker_mismatch");
  if (!/^[0-9a-f]{64}$/.test(source.evidence_hash || "")) throw new Error("evidence_hash_invalid");
  if (!source.work_id || !source.worker) throw new Error("source_identity_missing");
  if (source.review_required !== true) throw new Error("source_review_required_false");

  assertBool(entry.work_credits_policy?.useful_verifiable_work_only, true, "useful_verifiable_work_only");
  assertBool(entry.work_credits_policy?.unlimited_uncapped_accounting_units, true, "unlimited_uncapped_accounting_units");
  assertBool(entry.work_credits_policy?.award_amount_included, false, "award_amount_included");
  assertBool(entry.work_credits_policy?.operator_review_required, true, "operator_review_required");

  const boundary = entry.boundary || {};
  assertBool(boundary.review_queue_only, true, "review_queue_only");
  for (const key of [
    "review_decision_enabled",
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
    console.log("Usage: node tools/datanet-wc-evidence-packet-review-decision.mjs --queue-entry <entry.json> --out <decision.json> --reviewer <handle> --decision <accept_evidence|request_changes|reject_evidence> --reason <text>");
    return;
  }

  const queueEntryPath = path.resolve(requireArg("queue-entry"));
  const outPath = path.resolve(requireArg("out"));
  const reviewer = requireArg("reviewer");
  const decision = requireArg("decision");
  const reason = requireArg("reason");

  if (!ALLOWED_DECISIONS.has(decision)) {
    throw new Error("decision_not_allowed");
  }

  const queueEntry = JSON.parse(await readFile(queueEntryPath, "utf8"));
  validateQueueEntry(queueEntry);

  const source = queueEntry.source;
  const decisionId = sha256(JSON.stringify({
    review_id: queueEntry.review_id,
    evidence_hash: source.evidence_hash,
    work_id: source.work_id,
    worker: source.worker,
    reviewer,
    decision,
    reason
  }));

  const decisionRecord = {
    schema: "void.datanet.wc.evidence_packet_review_decision.v1",
    marker: MARKER,
    status: "review_decision_recorded",
    decision_id: decisionId,
    created_at: process.env.VOID_REVIEW_DECISION_CREATED_AT || new Date().toISOString(),
    reviewer,
    decision,
    reason,
    source: {
      queue_entry_path: queueEntryPath,
      queue_marker: queueEntry.marker,
      review_id: queueEntry.review_id,
      evidence_hash: source.evidence_hash,
      work_id: source.work_id,
      worker: source.worker,
      files: source.files,
      summary_marker: source.summary_marker,
      generator_marker: source.generator_marker,
      verifier_marker: source.verifier_marker
    },
    work_credits_policy: {
      useful_verifiable_work_only: true,
      unlimited_uncapped_accounting_units: true,
      award_amount_included: false,
      operator_review_required: true
    },
    boundary: {
      review_decision_record_only: true,
      wc_award_approval_enabled: false,
      wc_award_amount_enabled: false,
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
  await writeFile(outPath, JSON.stringify(decisionRecord, null, 2) + "\n", "utf8");

  console.log(JSON.stringify({
    marker: MARKER,
    status: "review_decision_recorded",
    decision_id: decisionId,
    decision,
    out: outPath,
    review_id: queueEntry.review_id,
    evidence_hash: source.evidence_hash,
    work_id: source.work_id,
    worker: source.worker,
    reviewer,
    boundary: "review_decision_record_only_no_award_amount_no_award_approval_no_ledger_write_no_network_submit"
  }, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_review_decision_error=${err.message}`);
  process.exit(1);
});
