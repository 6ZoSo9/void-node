#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1";

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

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log("Usage: node tools/datanet-wc-evidence-packet.mjs --input <dir> --out <packet.json> --work-id <id> --worker <handle> [--reviewer <hint>]");
    return;
  }

  const input = path.resolve(requireArg("input"));
  const out = path.resolve(requireArg("out"));
  const workId = requireArg("work-id");
  const worker = requireArg("worker");
  const reviewer = getArg("reviewer") || "operator-review-required";

  if (!(await stat(input)).isDirectory()) {
    throw new Error(`Input is not a directory: ${input}`);
  }

  const files = await walk(input, input, out);
  if (files.length === 0) {
    throw new Error("Input directory has no files to include");
  }

  const deterministicCore = {
    schema: "void.datanet.wc.evidence_packet.v1",
    marker: MARKER,
    work_id: workId,
    worker,
    reviewer,
    input_root_name: path.basename(input),
    files
  };

  const evidenceHash = sha256(JSON.stringify(deterministicCore));
  const packet = {
    ...deterministicCore,
    generated_at: process.env.VOID_PACKET_CREATED_AT || new Date().toISOString(),
    status: "candidate_evidence_packet_generated",
    evidence_hash: evidenceHash,
    review_required: true,
    work_credits_policy: {
      useful_verifiable_work_only: true,
      unlimited_uncapped_accounting_units: true,
      award_amount_included: false,
      operator_review_required: true
    },
    boundary: {
      packet_generation_only: true,
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

  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(packet, null, 2) + "\n", "utf8");

  console.log(JSON.stringify({
    marker: MARKER,
    status: "generated",
    out,
    files: files.length,
    evidence_hash: evidenceHash
  }, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_generator_error=${err.message}`);
  process.exit(1);
});
