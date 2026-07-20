#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_WORKFLOW_V1";
const NETWORK = "Mainnet-0";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TOOLS = {
  self_check: {
    path: path.join(ROOT, "tools/public-node-operator-self-check-v1.mjs"),
    sha256: "a058520994e11dad55ad7e2d85784caa1584668154248ea521c2b2a64db7610b",
  },
  receipt_review: {
    path: path.join(
      ROOT,
      "tools/public-node-operator-self-check-receipt-review-v1.mjs",
    ),
    sha256: "63a3ea4fbef5d7b7aa1a2fa00319b4aa593e9fbeb94293403ad60c597b87b428",
  },
  evidence_pack: {
    path: path.join(ROOT, "tools/public-node-operator-evidence-pack-v1.mjs"),
    sha256: "29b08b5e8285ebcb680bed6c78fdb739fc4a67b259734952c8fad1be7ed860c6",
  },
  evidence_pack_review: {
    path: path.join(
      ROOT,
      "tools/public-node-operator-evidence-pack-review-v1.mjs",
    ),
    sha256: "01978839f01273d47f6a3a71a6f926489b149327e3fe92d0941a16fa7a17456f",
  },
  evidence_attestation: {
    path: path.join(
      ROOT,
      "ops/public/operator-onboarding-v1/void-public-node-operator-evidence-attest-v1.py",
    ),
    sha256: "2a219c36ad187d732ba8165264c6f4ad4c3faf19eda9f0e2ab8d219a52ff8f6b",
  },
};

const NAMESPACE = "void-public-node-evidence-attestation-v1";
const PACK_MARKER = "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_V1";
const PACK_REVIEW_MARKER =
  "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_REVIEW_V1";
const ATTESTATION_SUBMISSION_MARKER =
  "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_ATTESTATION_SUBMISSION_V1";
const ATTESTATION_REVIEW_MARKER =
  "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_ATTESTATION_REVIEW_V1";

const NAMES = {
  packDir: "evidence-pack",
  packReview: "evidence-pack-review-v1.json",
  attestationDir: "evidence-attestation",
  attestationReview: "evidence-attestation-review-v1.json",
  manifest: "operator-evidence-workflow-v1.json",
  checksums: "SHA256SUMS.txt",
};

function usage() {
  console.log(`VOID public-node operator evidence workflow v1

Usage:
  node tools/public-node-operator-evidence-workflow-v1.mjs [options]

Required:
  --output-dir DIR             New workflow output directory
  --operator-id ID             Public operator identifier
  --node-key ID                Public node identifier
  --private-key FILE           Existing mode-0600 Ed25519 private key

Options:
  --base URL                   Node base URL (default: http://127.0.0.1:4100)
  --expected-peer-count N      Minimum peer count (default: 1)
  --allow-hold                 Complete and sign a valid hold workflow
  --observed-at ISO8601        Fixed self-check timestamp
  --reviewed-at ISO8601        Fixed pack/review timestamp
  --help                       Show this help

The workflow composes the merged self-check, receipt review, evidence pack,
pack review, evidence attestation, and attestation verification tools.

Exit codes:
  0  complete green workflow, or accepted hold with --allow-hold
  1  invocation, source-contract, filesystem, or unexpected execution error
  2  valid strict hold workflow produced without an attestation

The output is created atomically. Directories use mode 0700 and files use mode
0600. The workflow manifest does not include the raw target URL, private-key
path, or raw output path.`);
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
    operatorId: "",
    nodeKey: "",
    privateKey: "",
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
    else if (arg === "--operator-id") result.operatorId = next();
    else if (arg === "--node-key") result.nodeKey = next();
    else if (arg === "--private-key") result.privateKey = next();
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

  for (const [label, value] of [
    ["--output-dir", result.outputDir],
    ["--operator-id", result.operatorId],
    ["--node-key", result.nodeKey],
    ["--private-key", result.privateKey],
  ]) {
    if (!value) throw new Error(`${label} is required`);
  }
  return result;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sha256File(file) {
  return sha256Bytes(fs.readFileSync(file));
}

function validateSourceContracts() {
  const result = {};
  for (const [key, contract] of Object.entries(TOOLS)) {
    if (!fs.existsSync(contract.path)) {
      throw new Error(`required merged tool missing: ${key}`);
    }
    const actual = sha256File(contract.path);
    if (actual !== contract.sha256) {
      throw new Error(`merged source contract changed: ${key}`);
    }
    result[key] = {
      name: path.basename(contract.path),
      sha256: actual,
    };
  }
  return result;
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

function writePrivate(file, value) {
  const content =
    typeof value === "string"
      ? value
      : `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(file, content, { encoding: "utf8", mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function runCommand(command, args, expectedCodes, label) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw new Error(`${label} failed to start`);
  const status = result.status ?? -1;
  if (!expectedCodes.includes(status)) {
    const detail = String(result.stderr || result.stdout || "")
      .trim()
      .slice(0, 700);
    throw new Error(
      `${label} exited ${status}${detail ? `: ${detail}` : ""}`,
    );
  }
  return {
    status,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
  };
}

function parseStdoutJson(result, label) {
  let value;
  try {
    value = JSON.parse(result.stdout);
  } catch {
    throw new Error(`${label} did not return JSON`);
  }
  if (!isObject(value)) throw new Error(`${label} JSON object required`);
  return value;
}

function fileRecord(file, relativeName) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`artifact must be a regular file: ${relativeName}`);
  }
  return {
    name: relativeName,
    sha256: sha256File(file),
    bytes: stat.size,
    mode: (stat.mode & 0o777).toString(8).padStart(3, "0"),
  };
}

function listFiles(rootDir, current = rootDir) {
  const output = [];
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      throw new Error("workflow output must not contain symlinks");
    }
    if (entry.isDirectory()) {
      if ((stat.mode & 0o777) !== 0o700) {
        throw new Error(`workflow directory mode mismatch: ${entry.name}`);
      }
      output.push(...listFiles(rootDir, absolute));
    } else if (entry.isFile()) {
      output.push({
        absolute,
        relative: path.relative(rootDir, absolute).split(path.sep).join("/"),
      });
    } else {
      throw new Error("unsupported workflow artifact type");
    }
  }
  return output;
}

function ensurePrivateArtifacts(rootDir) {
  for (const item of listFiles(rootDir)) {
    const stat = fs.statSync(item.absolute);
    if ((stat.mode & 0o777) !== 0o600) {
      throw new Error(`workflow file mode mismatch: ${item.relative}`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceContracts = validateSourceContracts();

  const outputDir = path.resolve(args.outputDir);
  const parent = path.dirname(outputDir);
  const leaf = path.basename(outputDir);
  if (!leaf || leaf === "." || leaf === "..") {
    throw new Error("invalid output directory");
  }
  if (fs.existsSync(outputDir)) {
    throw new Error("output directory already exists");
  }

  const privateKey = path.resolve(args.privateKey);
  const keyStat = fs.lstatSync(privateKey);
  if (!keyStat.isFile() || keyStat.isSymbolicLink()) {
    throw new Error("private key must be a regular non-symlink file");
  }
  if (keyStat.mode & 0o077) {
    throw new Error("private key permissions must not allow group or other access");
  }

  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const parentStat = fs.lstatSync(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    throw new Error("output parent must be a real directory");
  }

  const tempDir = fs.mkdtempSync(path.join(parent, `.${leaf}.tmp-`));
  fs.chmodSync(tempDir, 0o700);
  let renamed = false;

  try {
    const packDir = path.join(tempDir, NAMES.packDir);
    const packReviewPath = path.join(tempDir, NAMES.packReview);
    const attestationDir = path.join(tempDir, NAMES.attestationDir);
    const attestationReviewPath = path.join(
      tempDir,
      NAMES.attestationReview,
    );
    const manifestPath = path.join(tempDir, NAMES.manifest);
    const checksumsPath = path.join(tempDir, NAMES.checksums);

    const packArgs = [
      TOOLS.evidence_pack.path,
      "--base",
      args.base,
      "--expected-peer-count",
      String(args.expectedPeerCount),
      "--output-dir",
      packDir,
    ];
    if (args.allowHold) packArgs.push("--allow-hold");
    if (args.observedAt) {
      packArgs.push("--observed-at", args.observedAt);
    }
    if (args.reviewedAt) {
      packArgs.push("--reviewed-at", args.reviewedAt);
    }
    const packRun = runCommand(
      process.execPath,
      packArgs,
      [0, 2],
      "evidence pack",
    );

    const packReviewArgs = [
      TOOLS.evidence_pack_review.path,
      "--pack-dir",
      packDir,
      "--output",
      packReviewPath,
    ];
    if (!args.allowHold) packReviewArgs.push("--require-green");
    if (args.reviewedAt) {
      packReviewArgs.push("--reviewed-at", args.reviewedAt);
    }
    const packReviewRun = runCommand(
      process.execPath,
      packReviewArgs,
      [0, 2],
      "evidence-pack review",
    );

    const packManifest = readJson(
      path.join(packDir, "operator-evidence-pack-v1.json"),
      "evidence-pack manifest",
    );
    const packReview = readJson(packReviewPath, "evidence-pack review");
    if (packManifest.marker !== PACK_MARKER) {
      throw new Error("evidence-pack marker mismatch");
    }
    if (
      packReview.marker !== PACK_REVIEW_MARKER ||
      packReview.accepted !== true ||
      packReview.offline !== true
    ) {
      throw new Error("evidence-pack review contract mismatch");
    }
    const status = packManifest.status;
    if (!["green", "hold"].includes(status)) {
      throw new Error("workflow pack status invalid");
    }
    if (packReview.pack_status !== status) {
      throw new Error("workflow pack status binding mismatch");
    }

    let attestationCreateRun = null;
    let attestationVerifyRun = null;
    let attestationResult = null;
    let attestationReview = null;
    let bundlePath = null;

    if (status === "green" || args.allowHold) {
      fs.mkdirSync(attestationDir, { mode: 0o700 });
      fs.chmodSync(attestationDir, 0o700);

      const createArgs = [
        TOOLS.evidence_attestation.path,
        "create",
        "--pack-dir",
        packDir,
        "--operator-id",
        args.operatorId,
        "--node-key",
        args.nodeKey,
        "--private-key",
        privateKey,
        "--output-dir",
        attestationDir,
      ];
      if (args.allowHold) createArgs.push("--allow-hold");
      attestationCreateRun = runCommand(
        "python3",
        createArgs,
        [0],
        "evidence attestation create",
      );
      attestationResult = parseStdoutJson(
        attestationCreateRun,
        "evidence attestation create",
      );
      if (
        attestationResult.marker !== ATTESTATION_SUBMISSION_MARKER ||
        attestationResult.namespace !== NAMESPACE ||
        attestationResult.private_key_in_bundle !== false ||
        attestationResult.evidence_pack_in_bundle !== false ||
        attestationResult.mutation_authority !== false ||
        attestationResult.evidence_status !== status
      ) {
        throw new Error("evidence attestation submission contract mismatch");
      }

      bundlePath = path.resolve(attestationResult.bundle);
      if (
        path.dirname(bundlePath) !== path.resolve(attestationDir) ||
        !fs.existsSync(bundlePath)
      ) {
        throw new Error("attestation bundle location mismatch");
      }
      if (sha256File(bundlePath) !== attestationResult.bundle_sha256) {
        throw new Error("attestation bundle hash mismatch");
      }

      const verifyArgs = [
        TOOLS.evidence_attestation.path,
        "verify",
        "--bundle",
        bundlePath,
        "--pack-dir",
        packDir,
        "--output",
        attestationReviewPath,
      ];
      if (args.allowHold) verifyArgs.push("--allow-hold");
      attestationVerifyRun = runCommand(
        "python3",
        verifyArgs,
        [0],
        "evidence attestation verify",
      );
      attestationReview = readJson(
        attestationReviewPath,
        "evidence attestation review",
      );
      if (
        attestationReview.marker !== ATTESTATION_REVIEW_MARKER ||
        attestationReview.status !== "passed" ||
        attestationReview.namespace !== NAMESPACE ||
        attestationReview.evidence_status !== status ||
        attestationReview.checks?.signature_valid !== true ||
        attestationReview.checks?.pack_hash_binding !== true ||
        attestationReview.checks?.separate_signature_domain !== true ||
        attestationReview.decision_boundary?.mutation_authority !== false
      ) {
        throw new Error("evidence attestation verification contract mismatch");
      }
    }

    const strictHold = status === "hold" && !args.allowHold;
    const gate = strictHold
      ? "hold"
      : status === "hold"
        ? "passed_with_hold"
        : "passed";

    const artifactRecords = {};
    for (const item of listFiles(tempDir)) {
      if (
        item.relative === NAMES.manifest ||
        item.relative === NAMES.checksums
      ) {
        continue;
      }
      fs.chmodSync(item.absolute, 0o600);
      artifactRecords[item.relative] = fileRecord(
        item.absolute,
        item.relative,
      );
    }

    const manifest = {
      marker: MARKER,
      network: NETWORK,
      created_at:
        attestationReview?.reviewed_at ??
        packReview.reviewed_at,
      read_only: true,
      status,
      gate,
      allow_hold: args.allowHold,
      operator: {
        operator_id: args.operatorId,
        node_key: args.nodeKey,
      },
      artifacts: artifactRecords,
      stages: {
        evidence_pack: {
          exit_code: packRun.status,
          complete: true,
        },
        evidence_pack_review: {
          exit_code: packReviewRun.status,
          accepted: true,
          offline: true,
        },
        evidence_attestation: {
          created: Boolean(attestationResult),
          exit_code: attestationCreateRun?.status ?? null,
          namespace: attestationResult?.namespace ?? null,
          bundle_name: bundlePath ? path.basename(bundlePath) : null,
          bundle_sha256: bundlePath ? sha256File(bundlePath) : null,
          private_key_in_bundle: attestationResult
            ? attestationResult.private_key_in_bundle
            : false,
          evidence_pack_in_bundle: attestationResult
            ? attestationResult.evidence_pack_in_bundle
            : false,
        },
        evidence_attestation_review: {
          verified: attestationReview?.status === "passed",
          exit_code: attestationVerifyRun?.status ?? null,
          signature_valid:
            attestationReview?.checks?.signature_valid ?? false,
          pack_hash_binding:
            attestationReview?.checks?.pack_hash_binding ?? false,
          separate_signature_domain:
            attestationReview?.checks?.separate_signature_domain ?? false,
        },
      },
      bindings: {
        pack_status_matches_review: true,
        attestation_status_matches_pack: attestationResult
          ? attestationResult.evidence_status === status
          : false,
        attestation_bundle_hash_matches: bundlePath
          ? sha256File(bundlePath) === attestationResult.bundle_sha256
          : false,
        signature_domain_separate: attestationReview
          ? attestationReview.checks?.separate_signature_domain === true
          : false,
      },
      source_contracts: sourceContracts,
      safety: {
        raw_target_included: false,
        raw_output_path_included: false,
        private_key_path_included: false,
        private_key_in_output: false,
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

    writePrivate(manifestPath, manifest);
    fs.chmodSync(manifestPath, 0o600);

    const checksumItems = listFiles(tempDir)
      .filter((item) => item.relative !== NAMES.checksums)
      .sort((left, right) => left.relative.localeCompare(right.relative));
    writePrivate(
      checksumsPath,
      `${checksumItems
        .map(
          (item) => `${sha256File(item.absolute)}  ${item.relative}`,
        )
        .join("\n")}\n`,
    );
    fs.chmodSync(checksumsPath, 0o600);

    ensurePrivateArtifacts(tempDir);
    fs.renameSync(tempDir, outputDir);
    renamed = true;

    const result = {
      marker: MARKER,
      status,
      gate,
      attestation_created: Boolean(attestationResult),
      attestation_verified: attestationReview?.status === "passed",
      artifact_count: Object.keys(artifactRecords).length + 2,
      output_path_included: false,
      private_key_path_included: false,
      mutation_attempted: false,
    };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = strictHold ? 2 : 0;
  } finally {
    if (!renamed) fs.rmSync(tempDir, { recursive: true, force: true });
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
