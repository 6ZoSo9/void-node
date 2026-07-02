#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const VERIFY_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_VERIFIER_HOLD_V1";
const PACKET_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1";

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

async function walk(dir, root, skipAbs) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;

    const abs = path.join(dir, entry.name);
    if (path.resolve(abs) === skipAbs) continue;

    if (entry.isDirectory()) {
      out.push(...await walk(abs, root, skipAbs));
      continue;
    }

    if (!entry.isFile()) continue;

    const body = await readFile(abs);
    const meta = await stat(abs);
    out.push({
      path: path.relative(root, abs).split(path.sep).join("/"),
      size_bytes: meta.size,
      sha256: sha256(body)
    });
  }

  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function stableStringify(value) {
  return JSON.stringify(value);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}_mismatch`);
  }
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log("Usage: node tools/datanet-wc-evidence-packet-verify.mjs --packet <packet.json> --input <dir> [--expect-work-id <id>] [--expect-worker <handle>] [--expect-reviewer <hint>]");
    return;
  }

  const packetPath = path.resolve(requireArg("packet"));
  const input = path.resolve(requireArg("input"));

  if (!(await stat(input)).isDirectory()) {
    throw new Error(`Input is not a directory: ${input}`);
  }

  const packet = JSON.parse(await readFile(packetPath, "utf8"));

  assertEqual(packet.schema, "void.datanet.wc.evidence_packet.v1", "schema");
  assertEqual(packet.marker, PACKET_MARKER, "packet_marker");
  assertEqual(packet.status, "candidate_evidence_packet_generated", "status");

  const expectWorkId = getArg("expect-work-id");
  const expectWorker = getArg("expect-worker");
  const expectReviewer = getArg("expect-reviewer");
  if (expectWorkId) assertEqual(packet.work_id, expectWorkId, "work_id");
  if (expectWorker) assertEqual(packet.worker, expectWorker, "worker");
  if (expectReviewer) assertEqual(packet.reviewer, expectReviewer, "reviewer");

  if (packet.input_root_name !== path.basename(input)) {
    throw new Error("input_root_name_mismatch");
  }

  const actualFiles = await walk(input, input, packetPath);
  const packetFiles = [...packet.files].sort((a, b) => a.path.localeCompare(b.path));
  if (stableStringify(actualFiles) !== stableStringify(packetFiles)) {
    throw new Error("file_manifest_mismatch");
  }

  const deterministicCore = {
    schema: packet.schema,
    marker: packet.marker,
    work_id: packet.work_id,
    worker: packet.worker,
    reviewer: packet.reviewer,
    input_root_name: packet.input_root_name,
    files: packetFiles
  };

  const evidenceHash = sha256(stableStringify(deterministicCore));
  assertEqual(packet.evidence_hash, evidenceHash, "evidence_hash");

  if (!packet.review_required) {
    throw new Error("review_required_false");
  }

  if (packet.work_credits_policy?.useful_verifiable_work_only !== true) {
    throw new Error("useful_verifiable_work_policy_missing");
  }
  if (packet.work_credits_policy?.unlimited_uncapped_accounting_units !== true) {
    throw new Error("unlimited_uncapped_policy_missing");
  }
  if (packet.work_credits_policy?.award_amount_included !== false) {
    throw new Error("award_amount_boundary_mismatch");
  }
  if (packet.work_credits_policy?.operator_review_required !== true) {
    throw new Error("operator_review_required_policy_missing");
  }

  const boundary = packet.boundary || {};
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
    if (boundary[key] !== false) {
      throw new Error(`${key}_boundary_mismatch`);
    }
  }

  console.log(JSON.stringify({
    marker: VERIFY_MARKER,
    status: "verified",
    packet_marker: packet.marker,
    work_id: packet.work_id,
    worker: packet.worker,
    files: packetFiles.length,
    evidence_hash: evidenceHash,
    review_required: true,
    boundary: "verification_only_no_award_no_ledger_write_no_network_submit"
  }, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_verifier_error=${err.message}`);
  process.exit(1);
});
