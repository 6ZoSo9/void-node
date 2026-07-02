#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_ROUNDTRIP_HOLD_V1";
const GENERATOR_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1";
const VERIFIER_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_VERIFIER_HOLD_V1";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const generatorTool = path.join(toolsDir, "datanet-wc-evidence-packet.mjs");
const verifierTool = path.join(toolsDir, "datanet-wc-evidence-packet-verify.mjs");

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

function runNode(args, label) {
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    env: process.env
  });

  if (result.status !== 0) {
    throw new Error(`${label}_failed: ${result.stderr || result.stdout}`);
  }

  return result.stdout;
}

async function writeJsonIfRequested(file, value) {
  if (!file) return;
  const abs = path.resolve(file);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, JSON.stringify(value, null, 2) + "\n", "utf8");
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log("Usage: node tools/datanet-wc-evidence-packet-roundtrip.mjs --input <dir> --packet-out <packet.json> --work-id <id> --worker <handle> [--reviewer <hint>] [--verify-out <verify.json>] [--summary-out <summary.json>]");
    return;
  }

  const input = requireArg("input");
  const packetOut = requireArg("packet-out");
  const workId = requireArg("work-id");
  const worker = requireArg("worker");
  const reviewer = getArg("reviewer") || "operator-review-required";
  const verifyOut = getArg("verify-out");
  const summaryOut = getArg("summary-out");

  const generatorArgs = [
    generatorTool,
    "--input", input,
    "--out", packetOut,
    "--work-id", workId,
    "--worker", worker,
    "--reviewer", reviewer
  ];

  const generatorRaw = runNode(generatorArgs, "generator");
  const generatorResult = JSON.parse(generatorRaw);

  const verifierArgs = [
    verifierTool,
    "--packet", packetOut,
    "--input", input,
    "--expect-work-id", workId,
    "--expect-worker", worker,
    "--expect-reviewer", reviewer
  ];

  const verifierRaw = runNode(verifierArgs, "verifier");
  const verifierResult = JSON.parse(verifierRaw);

  if (generatorResult.marker !== GENERATOR_MARKER) {
    throw new Error("generator_marker_mismatch");
  }
  if (verifierResult.marker !== VERIFIER_MARKER) {
    throw new Error("verifier_marker_mismatch");
  }
  if (generatorResult.evidence_hash !== verifierResult.evidence_hash) {
    throw new Error("roundtrip_evidence_hash_mismatch");
  }

  await writeJsonIfRequested(verifyOut, verifierResult);

  const summary = {
    schema: "void.datanet.wc.evidence_packet_roundtrip.v1",
    marker: MARKER,
    status: "roundtrip_verified",
    generator_marker: generatorResult.marker,
    verifier_marker: verifierResult.marker,
    packet_path: path.resolve(packetOut),
    verify_result_path: verifyOut ? path.resolve(verifyOut) : null,
    work_id: workId,
    worker,
    reviewer,
    files: verifierResult.files,
    evidence_hash: verifierResult.evidence_hash,
    review_required: true,
    work_credits_policy: {
      useful_verifiable_work_only: true,
      unlimited_uncapped_accounting_units: true,
      award_amount_included: false,
      operator_review_required: true
    },
    boundary: {
      roundtrip_only: true,
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

  await writeJsonIfRequested(summaryOut, summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_roundtrip_error=${err.message}`);
  process.exit(1);
});
