#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_V1";
const NETWORK = "Mainnet-0";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SELF_CHECK_TOOL = path.join(
  ROOT,
  "tools/public-node-operator-self-check-v1.mjs",
);
const REVIEW_TOOL = path.join(
  ROOT,
  "tools/public-node-operator-self-check-receipt-review-v1.mjs",
);

const ARTIFACTS = {
  receipt: "operator-self-check-v1.json",
  review: "operator-self-check-receipt-review-v1.json",
  manifest: "operator-evidence-pack-v1.json",
  checksums: "SHA256SUMS.txt",
};

function usage() {
  console.log(`VOID public-node operator evidence pack v1

Usage:
  node tools/public-node-operator-evidence-pack-v1.mjs [options]

Required:
  --output-dir DIR             New directory for the evidence pack

Options:
  --base URL                   Node base URL (default: http://127.0.0.1:4100)
  --expected-peer-count N      Minimum peer count (default: 1)
  --allow-hold                 Accept a structurally valid hold receipt
  --observed-at ISO8601        Fixed self-check timestamp
  --reviewed-at ISO8601        Fixed review timestamp
  --help                       Show this help

The pack contains:
  ${ARTIFACTS.receipt}
  ${ARTIFACTS.review}
  ${ARTIFACTS.manifest}
  ${ARTIFACTS.checksums}

The directory is created atomically with mode 0700. Files use mode 0600.
No raw target URL or output path is copied into the manifest.`);
}

function parseInteger(raw, label, minimum, maximum) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

function parseArgs(argv) {
  const result = {
    outputDir: "",
    base: "http://127.0.0.1:4100",
    expectedPeerCount: 1,
    allowHold: false,
    observedAt: "",
    reviewedAt: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`missing value for ${arg}`);
      return argv[index];
    };

    if (arg === "--output-dir") result.outputDir = next();
    else if (arg === "--base") result.base = next();
    else if (arg === "--expected-peer-count") {
      result.expectedPeerCount = parseInteger(
        next(),
        "--expected-peer-count",
        0,
        10_000,
      );
    } else if (arg === "--allow-hold") result.allowHold = true;
    else if (arg === "--observed-at") result.observedAt = next();
    else if (arg === "--reviewed-at") result.reviewedAt = next();
    else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (!result.outputDir) throw new Error("--output-dir is required");
  return result;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readJson(file, label) {
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
  if (!isObject(value)) throw new Error(`${label} must be a JSON object`);
  return value;
}

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function fileRecord(file, name) {
  const stat = fs.statSync(file);
  return {
    name,
    sha256: sha256File(file),
    bytes: stat.size,
    mode: (stat.mode & 0o777).toString(8).padStart(3, "0"),
  };
}

function writePrivate(file, content) {
  fs.writeFileSync(file, content, { encoding: "utf8", mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function runNode(toolPath, args, expectedCodes, label) {
  const result = spawnSync(process.execPath, [toolPath, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    throw new Error(`${label} failed to start`);
  }
  if (!expectedCodes.includes(result.status ?? -1)) {
    const detail = String(result.stderr || result.stdout || "")
      .trim()
      .slice(0, 400);
    throw new Error(
      `${label} exited ${String(result.status)}${detail ? `: ${detail}` : ""}`,
    );
  }
  return result.status;
}

function sourceContract(file, name) {
  if (!fs.existsSync(file)) throw new Error(`required source tool missing: ${name}`);
  return {
    name,
    sha256: sha256File(file),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = path.resolve(args.outputDir);
  const parent = path.dirname(outputDir);
  const leaf = path.basename(outputDir);

  if (!leaf || leaf === "." || leaf === "..") {
    throw new Error("invalid output directory");
  }
  if (fs.existsSync(outputDir)) {
    throw new Error("output directory already exists");
  }

  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const parentStat = fs.lstatSync(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    throw new Error("output parent must be a real directory");
  }
  fs.chmodSync(parent, 0o700);

  const selfCheckContract = sourceContract(
    SELF_CHECK_TOOL,
    "public-node-operator-self-check-v1.mjs",
  );
  const reviewContract = sourceContract(
    REVIEW_TOOL,
    "public-node-operator-self-check-receipt-review-v1.mjs",
  );

  const tempDir = fs.mkdtempSync(path.join(parent, `.${leaf}.tmp-`));
  fs.chmodSync(tempDir, 0o700);

  let keepTemp = false;
  try {
    const receiptPath = path.join(tempDir, ARTIFACTS.receipt);
    const reviewPath = path.join(tempDir, ARTIFACTS.review);
    const manifestPath = path.join(tempDir, ARTIFACTS.manifest);
    const checksumsPath = path.join(tempDir, ARTIFACTS.checksums);

    const selfCheckArgs = [
      "--base",
      args.base,
      "--expected-peer-count",
      String(args.expectedPeerCount),
      "--output",
      receiptPath,
    ];
    if (args.observedAt) {
      selfCheckArgs.push("--observed-at", args.observedAt);
    }

    const selfCheckExit = runNode(
      SELF_CHECK_TOOL,
      selfCheckArgs,
      [0, 2],
      "operator self-check",
    );

    const reviewArgs = [
      "--receipt",
      receiptPath,
      "--output",
      reviewPath,
    ];
    if (!args.allowHold) reviewArgs.push("--require-green");
    if (args.reviewedAt) {
      reviewArgs.push("--reviewed-at", args.reviewedAt);
    }

    const reviewExit = runNode(
      REVIEW_TOOL,
      reviewArgs,
      args.allowHold ? [0] : [0, 2],
      "receipt reviewer",
    );

    const receipt = readJson(receiptPath, "self-check receipt");
    const review = readJson(reviewPath, "receipt review");
    const receiptHash = sha256File(receiptPath);

    if (receipt.marker !== "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1") {
      throw new Error("self-check receipt marker mismatch");
    }
    if (
      review.marker !==
      "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_RECEIPT_REVIEW_V1"
    ) {
      throw new Error("receipt review marker mismatch");
    }
    if (review.accepted !== true) {
      throw new Error("receipt reviewer did not accept the receipt");
    }
    if (review.receipt_sha256 !== receiptHash) {
      throw new Error("receipt review hash binding mismatch");
    }
    if (!["green", "hold"].includes(receipt.summary?.status)) {
      throw new Error("receipt status invalid");
    }
    if (review.receipt_status !== receipt.summary.status) {
      throw new Error("receipt and review status mismatch");
    }

    const packStatus = receipt.summary.status;
    const gate =
      packStatus === "green"
        ? "passed"
        : args.allowHold
          ? "passed_with_hold"
          : "hold";

    const receiptRecord = fileRecord(receiptPath, ARTIFACTS.receipt);
    const reviewRecord = fileRecord(reviewPath, ARTIFACTS.review);

    const manifest = {
      marker: MARKER,
      network: NETWORK,
      created_at: review.reviewed_at,
      read_only: true,
      status: packStatus,
      gate,
      allow_hold: args.allowHold,
      artifacts: {
        receipt: receiptRecord,
        review: reviewRecord,
        checksums: {
          name: ARTIFACTS.checksums,
          algorithm: "sha256",
          includes_manifest: true,
        },
      },
      bindings: {
        review_receipt_sha256_matches: true,
        receipt_status_matches_review: true,
        expected_peer_count: receipt.runtime?.expected_peer_count ?? null,
      },
      source_contracts: {
        self_check: selfCheckContract,
        receipt_review: reviewContract,
      },
      execution: {
        self_check_exit_code: selfCheckExit,
        review_exit_code: reviewExit,
      },
      safety: {
        raw_target_included: false,
        raw_output_path_included: false,
        credentials_included: false,
        mutation_attempted: false,
        registration_attempted: false,
        validator_activation_attempted: false,
        ledger_write_attempted: false,
        peer_state_write_attempted: false,
        ticket_claim_attempted: false,
        buy_void_fulfillment_attempted: false,
      },
    };

    writePrivate(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const manifestRecord = fileRecord(manifestPath, ARTIFACTS.manifest);

    const checksumRecords = [
      receiptRecord,
      reviewRecord,
      manifestRecord,
    ].sort((left, right) => left.name.localeCompare(right.name));

    writePrivate(
      checksumsPath,
      `${checksumRecords
        .map((entry) => `${entry.sha256}  ${entry.name}`)
        .join("\n")}\n`,
    );

    for (const name of Object.values(ARTIFACTS)) {
      const file = path.join(tempDir, name);
      if (!fs.existsSync(file)) throw new Error(`pack artifact missing: ${name}`);
      fs.chmodSync(file, 0o600);
    }

    fs.renameSync(tempDir, outputDir);
    keepTemp = true;

    const result = {
      marker: MARKER,
      status: packStatus,
      gate,
      artifacts: Object.values(ARTIFACTS),
      receipt_sha256: receiptRecord.sha256,
      review_sha256: reviewRecord.sha256,
      manifest_sha256: manifestRecord.sha256,
      output_path_included: false,
      mutation_attempted: false,
    };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

    if (gate === "hold") process.exitCode = 2;
    else process.exitCode = 0;
  } finally {
    if (!keepTemp) fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(
    JSON.stringify(
      {
        marker: MARKER,
        status: "error",
        mutation_attempted: false,
        error: error instanceof Error ? error.message : "unknown_error",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
