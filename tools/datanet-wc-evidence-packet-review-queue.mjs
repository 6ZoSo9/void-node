#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_QUEUE_HOLD_V1";
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

function validateRoundtripSummary(summary) {
  if (summary.schema !== "void.datanet.wc.evidence_packet_roundtrip.v1") {
    throw new Error("summary_schema_mismatch");
  }
  if (summary.marker !== ROUNDTRIP_MARKER) {
    throw new Error("summary_marker_mismatch");
  }
  if (summary.status !== "roundtrip_verified") {
    throw new Error("summary_status_mismatch");
  }
  if (summary.generator_marker !== GENERATOR_MARKER) {
    throw new Error("generator_marker_mismatch");
  }
  if (summary.verifier_marker !== VERIFIER_MARKER) {
    throw new Error("verifier_marker_mismatch");
  }
  if (!/^[0-9a-f]{64}$/.test(summary.evidence_hash || "")) {
    throw new Error("evidence_hash_invalid");
  }
  if (!summary.review_required) {
    throw new Error("review_required_false");
  }
  if (!summary.work_id || !summary.worker) {
    throw new Error("summary_identity_missing");
  }

  assertBool(summary.work_credits_policy?.useful_verifiable_work_only, true, "useful_verifiable_work_only");
  assertBool(summary.work_credits_policy?.unlimited_uncapped_accounting_units, true, "unlimited_uncapped_accounting_units");
  assertBool(summary.work_credits_policy?.award_amount_included, false, "award_amount_included");
  assertBool(summary.work_credits_policy?.operator_review_required, true, "operator_review_required");

  const boundary = summary.boundary || {};
  assertBool(boundary.roundtrip_only, true, "roundtrip_only");
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
  ]) {
    assertBool(boundary[key], false, key);
  }
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log("Usage: node tools/datanet-wc-evidence-packet-review-queue.mjs --summary <roundtrip-summary.json> --queue-dir <dir> [--reviewer <handle>] [--note <text>]");
    return;
  }

  const summaryPath = path.resolve(requireArg("summary"));
  const queueDir = path.resolve(requireArg("queue-dir"));
  const reviewer = getArg("reviewer") || "operator-review-required";
  const note = getArg("note") || "pending operator review";

  const summary = JSON.parse(await readFile(summaryPath, "utf8"));
  validateRoundtripSummary(summary);

  const reviewId = sha256(JSON.stringify({
    evidence_hash: summary.evidence_hash,
    work_id: summary.work_id,
    worker: summary.worker,
    reviewer
  }));

  const queueEntry = {
    schema: "void.datanet.wc.evidence_packet_review_queue.v1",
    marker: MARKER,
    status: "pending_operator_review",
    review_id: reviewId,
    created_at: process.env.VOID_REVIEW_QUEUE_CREATED_AT || new Date().toISOString(),
    reviewer,
    note,
    source: {
      summary_path: summaryPath,
      summary_marker: summary.marker,
      generator_marker: summary.generator_marker,
      verifier_marker: summary.verifier_marker,
      evidence_hash: summary.evidence_hash,
      work_id: summary.work_id,
      worker: summary.worker,
      files: summary.files,
      review_required: true
    },
    work_credits_policy: {
      useful_verifiable_work_only: true,
      unlimited_uncapped_accounting_units: true,
      award_amount_included: false,
      operator_review_required: true
    },
    boundary: {
      review_queue_only: true,
      review_decision_enabled: false,
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

  await mkdir(queueDir, { recursive: true });
  const queueFile = path.join(queueDir, `${reviewId}.json`);
  await writeFile(queueFile, JSON.stringify(queueEntry, null, 2) + "\n", "utf8");

  console.log(JSON.stringify({
    marker: MARKER,
    status: "queued_for_operator_review",
    review_id: reviewId,
    queue_file: queueFile,
    evidence_hash: summary.evidence_hash,
    work_id: summary.work_id,
    worker: summary.worker,
    reviewer,
    boundary: "review_queue_only_no_decision_no_award_no_ledger_write_no_network_submit"
  }, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_review_queue_error=${err.message}`);
  process.exit(1);
});
