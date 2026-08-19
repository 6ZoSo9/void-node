#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_REVIEW_V1";
const PACK_MARKER = "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_V1";
const RECEIPT_MARKER = "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1";
const RECEIPT_REVIEW_MARKER =
  "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_RECEIPT_REVIEW_V1";
const NETWORK = "Mainnet-0";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_FILE_BYTES = 4 * 1024 * 1024;

const FILES = {
  receipt: "operator-self-check-v1.json",
  review: "operator-self-check-receipt-review-v1.json",
  manifest: "operator-evidence-pack-v1.json",
  checksums: "SHA256SUMS.txt",
};

const SOURCE_TOOLS = {
  self_check: path.join(
    ROOT,
    "tools/public-node-operator-self-check-v1.mjs",
  ),
  receipt_review: path.join(
    ROOT,
    "tools/public-node-operator-self-check-receipt-review-v1.mjs",
  ),
};

function usage() {
  console.log(`VOID public-node operator evidence-pack reviewer v1

Usage:
  node tools/public-node-operator-evidence-pack-review-v1.mjs [options]

Required:
  --pack-dir DIR               Evidence-pack directory

Options:
  --output FILE                Write a mode-0600 review JSON
  --require-green              Return exit 2 for a valid hold pack
  --reviewed-at ISO8601        Fixed review timestamp for deterministic proofs
  --help                       Show this help

Exit codes:
  0  structurally valid pack accepted
  1  invocation or unexpected execution error
  2  valid hold pack rejected by --require-green
  3  malformed, inconsistent, unsafe, or tampered pack

The reviewer is offline. It performs no network request and never modifies the
evidence pack.`);
}

function parseArgs(argv) {
  const result = {
    packDir: "",
    output: "",
    requireGreen: false,
    reviewedAt: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`missing value for ${arg}`);
      return argv[index];
    };

    if (arg === "--pack-dir") result.packDir = next();
    else if (arg === "--output") result.output = next();
    else if (arg === "--require-green") result.requireGreen = true;
    else if (arg === "--reviewed-at") result.reviewedAt = next();
    else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (!result.packDir) throw new Error("--pack-dir is required");
  return result;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeIso(raw, label) {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`${label} is required`);
  }
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`${label} must be valid ISO-8601`);
  }
  return parsed.toISOString();
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sha256File(file) {
  return sha256Bytes(fs.readFileSync(file));
}

function readRegularFile(file, label) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file`);
  }
  if (stat.size <= 0 || stat.size > MAX_FILE_BYTES) {
    throw new Error(`${label} size is outside the allowed range`);
  }
  return {
    bytes: fs.readFileSync(file),
    stat,
  };
}

function parseJsonBytes(bytes, label) {
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
  if (!isObject(value)) throw new Error(`${label} must be a JSON object`);
  return value;
}

function pushCheck(checks, id, ok, detail) {
  checks.push({
    id,
    ok: Boolean(ok),
    detail: ok ? null : detail,
  });
}

function fileRecord(file, name) {
  const loaded = readRegularFile(file, name);
  return {
    name,
    sha256: sha256Bytes(loaded.bytes),
    bytes: loaded.stat.size,
    mode: (loaded.stat.mode & 0o777).toString(8).padStart(3, "0"),
  };
}

function parseChecksums(text) {
  const lines = text.trim().split("\n");
  const result = new Map();
  for (const line of lines) {
    const match = /^([0-9a-f]{64})  ([A-Za-z0-9._-]+)$/.exec(line);
    if (!match) throw new Error("invalid SHA256SUMS format");
    if (result.has(match[2])) throw new Error("duplicate SHA256SUMS member");
    result.set(match[2], match[1]);
  }
  return result;
}

function collectStringFindings(value, pathValue = "$", output = []) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      collectStringFindings(value[index], `${pathValue}[${index}]`, output);
    }
    return output;
  }
  if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectStringFindings(child, `${pathValue}.${key}`, output);
    }
    return output;
  }
  if (typeof value !== "string") return output;

  const trimmed = value.trim();
  if (/^(?:https?|ssh|file|tailscale):\/\//i.test(trimmed)) {
    output.push(`${pathValue}:absolute_url`);
  }
  if (/-----BEGIN (?:OPENSSH|RSA|EC|PRIVATE) KEY-----/.test(trimmed)) {
    output.push(`${pathValue}:private_key_material`);
  }
  if (/\bBearer\s+[A-Za-z0-9._~-]{12,}\b/i.test(trimmed)) {
    output.push(`${pathValue}:bearer_material`);
  }
  return output;
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (isObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function validateSourceContracts(manifest) {
  const expected = {};
  for (const [key, file] of Object.entries(SOURCE_TOOLS)) {
    if (!fs.existsSync(file)) {
      return {
        ok: false,
        detail: `local source tool missing: ${key}`,
      };
    }
    expected[key] = sha256File(file);
  }

  const contracts = manifest?.source_contracts;
  const ok =
    isObject(contracts) &&
    contracts.self_check?.name ===
      "public-node-operator-self-check-v1.mjs" &&
    contracts.receipt_review?.name ===
      "public-node-operator-self-check-receipt-review-v1.mjs" &&
    contracts.self_check?.sha256 === expected.self_check &&
    contracts.receipt_review?.sha256 === expected.receipt_review;

  return {
    ok,
    detail: ok ? null : "manifest source-tool hashes do not match local contracts",
  };
}

function replayCanonicalReceiptReview(receiptPath, manifest, storedReview) {
  if (!isObject(manifest) || typeof manifest.allow_hold !== "boolean") {
    return { ok: false, detail: "manifest allow_hold missing for canonical review replay" };
  }
  if (!isObject(storedReview)) {
    return { ok: false, detail: "stored receipt review missing for canonical replay" };
  }

  let reviewedAt;
  try {
    reviewedAt = safeIso(manifest.created_at, "manifest.created_at");
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "manifest created_at invalid",
    };
  }

  const args = [
    SOURCE_TOOLS.receipt_review,
    "--receipt",
    receiptPath,
    "--reviewed-at",
    reviewedAt,
  ];
  if (!manifest.allow_hold) args.push("--require-green");

  const replay = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (replay.error) {
    return { ok: false, detail: "canonical receipt reviewer failed to start" };
  }

  const expectedExit = manifest?.execution?.review_exit_code;
  if (!Number.isInteger(expectedExit) || replay.status !== expectedExit) {
    return {
      ok: false,
      detail: `canonical receipt reviewer exit mismatch: expected ${String(expectedExit)}, got ${String(replay.status)}`,
    };
  }

  let replayedReview;
  try {
    replayedReview = JSON.parse(replay.stdout);
  } catch {
    return {
      ok: false,
      detail: "canonical receipt reviewer did not emit valid JSON",
    };
  }

  if (canonicalJson(replayedReview) !== canonicalJson(storedReview)) {
    return {
      ok: false,
      detail: "stored receipt review does not match canonical semantic replay",
    };
  }

  return { ok: true, detail: null };
}

function reviewPack(packDir) {
  const checks = [];
  const resolved = path.resolve(packDir);
  const directoryStat = fs.lstatSync(resolved);

  const directoryOk =
    directoryStat.isDirectory() &&
    !directoryStat.isSymbolicLink() &&
    (directoryStat.mode & 0o777) === 0o700;
  pushCheck(
    checks,
    "pack_directory",
    directoryOk,
    "pack directory must be a real mode-0700 directory",
  );

  const actualNames = fs.readdirSync(resolved).sort();
  const expectedNames = Object.values(FILES).sort();
  const artifactSetOk =
    actualNames.length === expectedNames.length &&
    actualNames.every((name, index) => name === expectedNames[index]);
  pushCheck(
    checks,
    "artifact_set",
    artifactSetOk,
    "pack must contain exactly four canonical artifacts",
  );

  const paths = Object.fromEntries(
    Object.entries(FILES).map(([key, name]) => [key, path.join(resolved, name)]),
  );

  const records = {};
  let permissionsOk = true;
  let regularFilesOk = true;
  for (const [key, name] of Object.entries(FILES)) {
    try {
      records[key] = fileRecord(paths[key], name);
      if (records[key].mode !== "600") permissionsOk = false;
    } catch {
      regularFilesOk = false;
      permissionsOk = false;
    }
  }
  pushCheck(
    checks,
    "regular_files",
    regularFilesOk,
    "all artifacts must be regular non-symlink files",
  );
  pushCheck(
    checks,
    "permissions",
    permissionsOk,
    "all artifacts must use mode 0600",
  );

  let checksumMap = new Map();
  let checksumsFormatOk = false;
  try {
    checksumMap = parseChecksums(
      fs.readFileSync(paths.checksums, "utf8"),
    );
    const expectedChecksumNames = [
      FILES.manifest,
      FILES.receipt,
      FILES.review,
    ].sort();
    const actualChecksumNames = [...checksumMap.keys()].sort();
    checksumsFormatOk =
      actualChecksumNames.length === expectedChecksumNames.length &&
      actualChecksumNames.every(
        (name, index) => name === expectedChecksumNames[index],
      );
  } catch {
    checksumsFormatOk = false;
  }
  pushCheck(
    checks,
    "checksums_format",
    checksumsFormatOk,
    "SHA256SUMS must bind exactly receipt, review, and manifest",
  );

  const checksumBindingOk =
    checksumsFormatOk &&
    checksumMap.get(FILES.receipt) === records.receipt?.sha256 &&
    checksumMap.get(FILES.review) === records.review?.sha256 &&
    checksumMap.get(FILES.manifest) === records.manifest?.sha256;
  pushCheck(
    checks,
    "checksum_binding",
    checksumBindingOk,
    "artifact checksum mismatch",
  );

  let receipt = null;
  let review = null;
  let manifest = null;
  let jsonOk = true;
  try {
    receipt = parseJsonBytes(
      fs.readFileSync(paths.receipt),
      FILES.receipt,
    );
    review = parseJsonBytes(
      fs.readFileSync(paths.review),
      FILES.review,
    );
    manifest = parseJsonBytes(
      fs.readFileSync(paths.manifest),
      FILES.manifest,
    );
  } catch {
    jsonOk = false;
  }
  pushCheck(checks, "json_parse", jsonOk, "one or more JSON artifacts are invalid");

  const receiptOk =
    receipt?.marker === RECEIPT_MARKER &&
    receipt?.network === NETWORK &&
    receipt?.read_only === true &&
    ["green", "hold"].includes(receipt?.summary?.status) &&
    receipt?.target?.raw_target_included === false &&
    receipt?.safety?.mutation_attempted === false;
  pushCheck(checks, "receipt_contract", receiptOk, "receipt contract mismatch");

  const reviewOk =
    review?.marker === RECEIPT_REVIEW_MARKER &&
    review?.network === NETWORK &&
    review?.offline === true &&
    review?.accepted === true &&
    ["green", "hold"].includes(review?.receipt_status) &&
    review?.safety?.network_requests_performed === false &&
    review?.safety?.mutation_attempted === false &&
    review?.safety?.receipt_modified === false &&
    review?.safety?.raw_receipt_path_included === false &&
    review?.safety?.raw_receipt_body_included === false;
  pushCheck(checks, "receipt_review_contract", reviewOk, "receipt review contract mismatch");

  const manifestOk =
    manifest?.marker === PACK_MARKER &&
    manifest?.network === NETWORK &&
    manifest?.read_only === true &&
    ["green", "hold"].includes(manifest?.status) &&
    ["passed", "hold", "passed_with_hold"].includes(manifest?.gate) &&
    typeof manifest?.allow_hold === "boolean" &&
    manifest?.safety?.raw_target_included === false &&
    manifest?.safety?.raw_output_path_included === false &&
    manifest?.safety?.credentials_included === false &&
    manifest?.safety?.mutation_attempted === false;
  pushCheck(checks, "manifest_contract", manifestOk, "manifest contract mismatch");

  const receiptReviewBindingOk =
    review?.receipt_sha256 === records.receipt?.sha256 &&
    review?.receipt_status === receipt?.summary?.status &&
    manifest?.bindings?.review_receipt_sha256_matches === true &&
    manifest?.bindings?.receipt_status_matches_review === true;
  pushCheck(
    checks,
    "receipt_review_binding",
    receiptReviewBindingOk,
    "receipt-to-review binding mismatch",
  );

  const manifestArtifactBindingOk =
    manifest?.artifacts?.receipt?.name === FILES.receipt &&
    manifest?.artifacts?.receipt?.sha256 === records.receipt?.sha256 &&
    manifest?.artifacts?.receipt?.bytes === records.receipt?.bytes &&
    manifest?.artifacts?.receipt?.mode === "600" &&
    manifest?.artifacts?.review?.name === FILES.review &&
    manifest?.artifacts?.review?.sha256 === records.review?.sha256 &&
    manifest?.artifacts?.review?.bytes === records.review?.bytes &&
    manifest?.artifacts?.review?.mode === "600" &&
    manifest?.artifacts?.checksums?.name === FILES.checksums &&
    manifest?.artifacts?.checksums?.algorithm === "sha256" &&
    manifest?.artifacts?.checksums?.includes_manifest === true;
  pushCheck(
    checks,
    "manifest_artifact_binding",
    manifestArtifactBindingOk,
    "manifest artifact metadata mismatch",
  );

  const status = receipt?.summary?.status;
  const statusAlignmentOk =
    manifest?.status === status &&
    review?.receipt_status === status &&
    manifest?.created_at === review?.reviewed_at;
  pushCheck(
    checks,
    "status_alignment",
    statusAlignmentOk,
    "receipt, review, and manifest status/timestamp mismatch",
  );

  const expectedManifestGate =
    status === "green"
      ? "passed"
      : manifest?.allow_hold
        ? "passed_with_hold"
        : "hold";
  const expectedReviewGate =
    status === "green" || manifest?.allow_hold ? "passed" : "hold";
  const expectedReviewRequireGreen = manifest?.allow_hold === false;
  const expectedSelfCheckExit = status === "green" ? 0 : 2;
  const expectedReviewExit =
    status === "green" || manifest?.allow_hold ? 0 : 2;
  const gateAlignmentOk =
    manifest?.gate === expectedManifestGate &&
    review?.gate === expectedReviewGate &&
    review?.require_green === expectedReviewRequireGreen &&
    manifest?.execution?.self_check_exit_code === expectedSelfCheckExit &&
    manifest?.execution?.review_exit_code === expectedReviewExit;
  pushCheck(
    checks,
    "gate_alignment",
    gateAlignmentOk,
    "hold/green gate or exit-code alignment mismatch",
  );

  const sourceContracts = validateSourceContracts(manifest);
  pushCheck(
    checks,
    "source_contract_binding",
    sourceContracts.ok,
    sourceContracts.detail,
  );

  const canonicalReplay = replayCanonicalReceiptReview(
    paths.receipt,
    manifest,
    review,
  );
  pushCheck(
    checks,
    "canonical_receipt_review_replay",
    canonicalReplay.ok,
    canonicalReplay.detail,
  );

  const safetyOk =
    manifest?.safety?.registration_attempted === false &&
    manifest?.safety?.validator_activation_attempted === false &&
    manifest?.safety?.ledger_write_attempted === false &&
    manifest?.safety?.peer_state_write_attempted === false &&
    manifest?.safety?.ticket_claim_attempted === false &&
    manifest?.safety?.buy_void_fulfillment_attempted === false &&
    receipt?.safety?.mutation_attempted === false &&
    review?.safety?.mutation_attempted === false;
  pushCheck(checks, "safety_boundary", safetyOk, "pack safety boundary mismatch");

  const findings = collectStringFindings([receipt, review, manifest]);
  pushCheck(
    checks,
    "public_sanitization",
    findings.length === 0,
    findings.slice(0, 16).join(", ") || "unsafe string content",
  );

  const accepted = checks.every((entry) => entry.ok);
  return {
    accepted,
    status: status === "hold" ? "hold" : "green",
    checks,
    records,
  };
}

function baseSafety() {
  return {
    network_requests_performed: false,
    mutation_attempted: false,
    pack_modified: false,
    raw_pack_path_included: false,
    raw_artifact_bodies_included: false,
  };
}

function writeReview(output, value) {
  const encoded = `${JSON.stringify(value, null, 2)}\n`;
  if (output) {
    const resolved = path.resolve(output);
    fs.mkdirSync(path.dirname(resolved), { recursive: true, mode: 0o700 });
    fs.writeFileSync(resolved, encoded, { encoding: "utf8", mode: 0o600 });
    fs.chmodSync(resolved, 0o600);
  }
  process.stdout.write(encoded);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const reviewedAt = safeIso(
    args.reviewedAt || new Date().toISOString(),
    "reviewed_at",
  );

  const packDir = path.resolve(args.packDir);
  if (args.output) {
    const output = path.resolve(args.output);
    if (output === packDir || output.startsWith(`${packDir}${path.sep}`)) {
      throw new Error("review output must be outside the evidence pack");
    }
  }

  let result;
  try {
    result = reviewPack(packDir);
  } catch (error) {
    result = {
      accepted: false,
      status: "unknown",
      checks: [
        {
          id: "pack_load",
          ok: false,
          detail: error instanceof Error ? error.message : "pack load failed",
        },
      ],
      records: {},
    };
  }

  const gate =
    !result.accepted
      ? "rejected"
      : args.requireGreen && result.status === "hold"
        ? "hold"
        : "passed";

  const review = {
    marker: MARKER,
    network: NETWORK,
    reviewed_at: reviewedAt,
    offline: true,
    accepted: result.accepted,
    pack_status: result.status,
    gate,
    require_green: args.requireGreen,
    summary: {
      checks_total: result.checks.length,
      checks_green: result.checks.filter((entry) => entry.ok).length,
      checks_failed: result.checks.filter((entry) => !entry.ok).length,
      failed_check_ids: result.checks
        .filter((entry) => !entry.ok)
        .map((entry) => entry.id),
    },
    artifact_sha256: {
      receipt: result.records.receipt?.sha256 ?? null,
      receipt_review: result.records.review?.sha256 ?? null,
      manifest: result.records.manifest?.sha256 ?? null,
      checksums: result.records.checksums?.sha256 ?? null,
    },
    checks: result.checks,
    safety: baseSafety(),
  };

  writeReview(args.output, review);

  if (!result.accepted) process.exitCode = 3;
  else if (gate === "hold") process.exitCode = 2;
  else process.exitCode = 0;
}

try {
  main();
} catch (error) {
  console.error(
    JSON.stringify(
      {
        marker: MARKER,
        gate: "error",
        offline: true,
        mutation_attempted: false,
        error: error instanceof Error ? error.message : "unknown_error",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
