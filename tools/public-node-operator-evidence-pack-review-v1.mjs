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
const READ_CHUNK_BYTES = 64 * 1024;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW ?? 0;
const O_DIRECTORY = fs.constants.O_DIRECTORY ?? 0;

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

function currentUid() {
  return typeof process.getuid === "function" ? process.getuid() : null;
}

function statGeneration(stat) {
  return {
    dev: stat.dev,
    ino: stat.ino,
    uid: stat.uid,
    gid: stat.gid,
    mode: stat.mode,
    nlink: stat.nlink,
    size: stat.size,
    mtimeNs: stat.mtimeNs,
    ctimeNs: stat.ctimeNs,
    birthtimeNs: stat.birthtimeNs,
  };
}

function sameGeneration(left, right) {
  if (!left || !right) return false;
  for (const key of Object.keys(left)) {
    if (left[key] !== right[key]) return false;
  }
  return true;
}

function readFdBounded(fd, label) {
  const chunks = [];
  let total = 0;
  for (;;) {
    const buffer = Buffer.allocUnsafe(
      Math.min(READ_CHUNK_BYTES, MAX_FILE_BYTES + 1 - total),
    );
    const read = fs.readSync(fd, buffer, 0, buffer.length, null);
    if (read === 0) break;
    total += read;
    if (total > MAX_FILE_BYTES) {
      throw new Error(`${label} exceeds the ${MAX_FILE_BYTES}-byte ceiling`);
    }
    chunks.push(Buffer.from(buffer.subarray(0, read)));
  }
  if (total <= 0) throw new Error(`${label} must not be empty`);
  return Buffer.concat(chunks, total);
}

function descriptorChildPath(directoryFd, name) {
  if (process.platform !== "linux") {
    throw new Error("descriptor-bound evidence review requires Linux /proc/self/fd");
  }
  return `/proc/self/fd/${directoryFd}/${name}`;
}

function openReviewedDirectory(directory, label, requiredMode = null) {
  if (process.platform !== "linux") {
    throw new Error("descriptor-bound evidence review requires Linux /proc/self/fd");
  }

  const resolved = path.resolve(directory);
  const parsed = path.parse(resolved);
  const components = resolved
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);
  if (components.length === 0) {
    throw new Error(`${label} must not be the filesystem root`);
  }

  let fd = fs.openSync(
    parsed.root,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    let stat = fs.fstatSync(fd, { bigint: true });
    if (!stat.isDirectory()) throw new Error(`${label} root must be a directory`);

    for (let index = 0; index < components.length; index += 1) {
      const component = components[index];
      if (!component || component === "." || component === "..") {
        throw new Error(`${label} contains an invalid path component`);
      }

      const childFd = fs.openSync(
        descriptorChildPath(fd, component),
        fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
      );
      fs.closeSync(fd);
      fd = childFd;
      stat = fs.fstatSync(fd, { bigint: true });
      if (!stat.isDirectory()) throw new Error(`${label} must be a directory`);

      const uid = currentUid();
      const mode = Number(stat.mode & 0o777n);
      const isFinal = index === components.length - 1;
      if (!isFinal) {
        if (
          uid !== null &&
          stat.uid !== 0n &&
          stat.uid !== BigInt(uid)
        ) {
          throw new Error(`${label} parent component has an unreviewed owner`);
        }
        const rootStickyShared =
          stat.uid === 0n && (stat.mode & 0o1000n) !== 0n;
        if ((mode & 0o022) !== 0 && !rootStickyShared) {
          throw new Error(`${label} parent component is group/world writable`);
        }
      } else {
        if (uid !== null && stat.uid !== BigInt(uid)) {
          throw new Error(`${label} must be owned by the current operator UID`);
        }
        if (requiredMode !== null && mode !== requiredMode) {
          throw new Error(
            `${label} must use mode ${requiredMode.toString(8).padStart(3, "0")}`,
          );
        }
        if ((mode & 0o022) !== 0) {
          throw new Error(`${label} must not be group/world writable`);
        }
      }
    }

    const finalStat = fs.fstatSync(fd, { bigint: true });
    const pathStat = fs.lstatSync(resolved, { bigint: true });
    if (
      pathStat.isSymbolicLink() ||
      !sameGeneration(statGeneration(finalStat), statGeneration(pathStat))
    ) {
      throw new Error(`${label} final pathname does not match opened directory generation`);
    }
    if (fs.realpathSync(resolved) !== resolved) {
      throw new Error(`${label} must resolve without symbolic-link aliases`);
    }

    return {
      fd,
      resolved,
      generation: statGeneration(finalStat),
      mode: Number(finalStat.mode & 0o777n),
    };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function readArtifact(directoryFd, canonicalPath, name) {
  const fd = fs.openSync(
    descriptorChildPath(directoryFd, name),
    fs.constants.O_RDONLY | O_NOFOLLOW,
  );
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!before.isFile()) throw new Error(`${name} must be a regular file`);
    const uid = currentUid();
    if (uid !== null && before.uid !== BigInt(uid)) {
      throw new Error(`${name} must be owned by the current operator UID`);
    }
    if (before.nlink !== 1n) {
      throw new Error(`${name} must have exactly one hard link`);
    }
    const mode = Number(before.mode & 0o777n);
    if (mode !== 0o600) throw new Error(`${name} must use mode 0600`);

    const bytes = readFdBounded(fd, name);
    const after = fs.fstatSync(fd, { bigint: true });
    const pathStat = fs.lstatSync(canonicalPath, { bigint: true });
    const beforeGeneration = statGeneration(before);
    if (
      !sameGeneration(beforeGeneration, statGeneration(after)) ||
      !sameGeneration(beforeGeneration, statGeneration(pathStat))
    ) {
      throw new Error(`${name} changed generation during bounded review`);
    }

    return {
      bytes,
      generation: beforeGeneration,
      record: {
        name,
        sha256: sha256Bytes(bytes),
        bytes: bytes.length,
        mode: "600",
      },
    };
  } finally {
    fs.closeSync(fd);
  }
}

function assertLoadedPathGeneration(file, loaded, label) {
  const stat = fs.lstatSync(file, { bigint: true });
  if (!sameGeneration(loaded.generation, statGeneration(stat))) {
    throw new Error(`${label} path generation changed after bounded review`);
  }
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

function readSourceToolBytes(file, label) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | O_NOFOLLOW);
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!before.isFile()) throw new Error(`${label} must be a regular file`);
    const bytes = readFdBounded(fd, label);
    const after = fs.fstatSync(fd, { bigint: true });
    const pathStat = fs.lstatSync(file, { bigint: true });
    const beforeGeneration = statGeneration(before);
    if (
      !sameGeneration(beforeGeneration, statGeneration(after)) ||
      !sameGeneration(beforeGeneration, statGeneration(pathStat))
    ) {
      throw new Error(`${label} changed generation during source binding`);
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function validateSourceContracts(manifest) {
  const expected = {};
  const loaded = {};
  for (const [key, file] of Object.entries(SOURCE_TOOLS)) {
    try {
      loaded[key] = readSourceToolBytes(file, `local source tool ${key}`);
      expected[key] = sha256Bytes(loaded[key]);
    } catch (error) {
      return {
        ok: false,
        detail:
          error instanceof Error
            ? error.message
            : `local source tool unavailable: ${key}`,
        receiptReviewSource: null,
      };
    }
  }

  const contracts = manifest?.source_contracts;
  const ok =
    isObject(contracts) &&
    contracts.self_check?.name === "public-node-operator-self-check-v1.mjs" &&
    contracts.receipt_review?.name ===
      "public-node-operator-self-check-receipt-review-v1.mjs" &&
    contracts.self_check?.sha256 === expected.self_check &&
    contracts.receipt_review?.sha256 === expected.receipt_review;

  return {
    ok,
    detail: ok ? null : "manifest source-tool hashes do not match local contracts",
    receiptReviewSource: ok ? loaded.receipt_review : null,
  };
}

function replayCanonicalReceiptReview(
  receiptPath,
  loadedReceipt,
  manifest,
  storedReview,
  receiptReviewSource,
) {
  if (!isObject(manifest) || typeof manifest.allow_hold !== "boolean") {
    return { ok: false, detail: "manifest allow_hold missing for canonical review replay" };
  }
  if (!isObject(storedReview)) {
    return { ok: false, detail: "stored receipt review missing for canonical replay" };
  }

  let reviewedAt;
  try {
    reviewedAt = safeIso(manifest.created_at, "manifest.created_at");
    assertLoadedPathGeneration(receiptPath, loadedReceipt, "receipt");
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "receipt replay precondition failed" };
  }

  if (!Buffer.isBuffer(receiptReviewSource) || receiptReviewSource.length === 0) {
    return { ok: false, detail: "canonical receipt reviewer source is not bound" };
  }

  const args = [
    "--input-type=module",
    "-",
    "--receipt",
    receiptPath,
    "--reviewed-at",
    reviewedAt,
  ];
  if (!manifest.allow_hold) args.push("--require-green");

  const replay = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    input: receiptReviewSource,
    stdio: ["pipe", "pipe", "pipe"],
    env: {},
  });
  if (replay.error) {
    return { ok: false, detail: "canonical receipt reviewer failed to start" };
  }

  try {
    assertLoadedPathGeneration(receiptPath, loadedReceipt, "receipt");
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "receipt replay generation drift" };
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
    return { ok: false, detail: "canonical receipt reviewer did not emit valid JSON" };
  }

  if (replayedReview?.receipt_sha256 !== loadedReceipt.record.sha256) {
    return { ok: false, detail: "canonical receipt replay reviewed a different receipt generation" };
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
  const reviewedDirectory = openReviewedDirectory(packDir, "pack directory", 0o700);
  const resolved = reviewedDirectory.resolved;
  try {
    const actualNames = fs.readdirSync(descriptorChildPath(reviewedDirectory.fd, ".")).sort();
    const expectedNames = Object.values(FILES).sort();
    const artifactSetOk =
      actualNames.length === expectedNames.length &&
      actualNames.every((name, index) => name === expectedNames[index]);
    pushCheck(
      checks,
      "pack_directory",
      true,
      "pack directory must be a real mode-0700 directory",
    );
    pushCheck(
      checks,
      "artifact_set",
      artifactSetOk,
      "pack must contain exactly four canonical artifacts",
    );

    const paths = Object.fromEntries(
      Object.entries(FILES).map(([key, name]) => [key, path.join(resolved, name)]),
    );

    const loaded = {};
    let regularFilesOk = true;
    let permissionsOk = true;
    for (const [key, name] of Object.entries(FILES)) {
      try {
        loaded[key] = readArtifact(reviewedDirectory.fd, paths[key], name);
      } catch {
        regularFilesOk = false;
        permissionsOk = false;
      }
    }
    pushCheck(
      checks,
      "regular_files",
      regularFilesOk,
      "all artifacts must be one exact owner-private regular-file generation",
    );
    pushCheck(
      checks,
      "permissions",
      permissionsOk,
      "all artifacts must use mode 0600 and be owned by the current UID",
    );

    const records = Object.fromEntries(
      Object.entries(loaded).map(([key, value]) => [key, value.record]),
    );

    let checksumMap = new Map();
    let checksumsFormatOk = false;
    try {
      checksumMap = parseChecksums(loaded.checksums.bytes.toString("utf8"));
      const expectedChecksumNames = [FILES.manifest, FILES.receipt, FILES.review].sort();
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
    pushCheck(checks, "checksum_binding", checksumBindingOk, "artifact checksum mismatch");

    let receipt = null;
    let review = null;
    let manifest = null;
    let jsonOk = true;
    try {
      receipt = parseJsonBytes(loaded.receipt.bytes, FILES.receipt);
      review = parseJsonBytes(loaded.review.bytes, FILES.review);
      manifest = parseJsonBytes(loaded.manifest.bytes, FILES.manifest);
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
    const expectedReviewExit = status === "green" || manifest?.allow_hold ? 0 : 2;
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

    const canonicalReplay = loaded.receipt
      ? replayCanonicalReceiptReview(
          paths.receipt,
          loaded.receipt,
          manifest,
          review,
          sourceContracts.receiptReviewSource,
        )
      : { ok: false, detail: "receipt unavailable for canonical replay" };
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

    const directoryAfter = fs.fstatSync(reviewedDirectory.fd, { bigint: true });
    const directoryPathAfter = fs.lstatSync(resolved, { bigint: true });
    pushCheck(
      checks,
      "pack_directory_generation",
      sameGeneration(
        reviewedDirectory.generation,
        statGeneration(directoryAfter),
      ) &&
        sameGeneration(
          reviewedDirectory.generation,
          statGeneration(directoryPathAfter),
        ),
      "pack directory generation changed during review",
    );

    const accepted = checks.every((entry) => entry.ok);
    return {
      accepted,
      status: status === "hold" ? "hold" : "green",
      checks,
      records,
    };
  } finally {
    fs.closeSync(reviewedDirectory.fd);
  }
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

function writeAll(fd, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    const written = fs.writeSync(fd, bytes, offset, bytes.length - offset, offset);
    if (written <= 0) throw new Error("review output write did not make progress");
    offset += written;
  }
}

function writeReview(output, value) {
  const encoded = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  if (output) {
    const resolved = path.resolve(output);
    const parent = path.dirname(resolved);
    const leaf = path.basename(resolved);
    if (!leaf || leaf === "." || leaf === "..") {
      throw new Error("review output must name one final file");
    }

    const reviewedParent = openReviewedDirectory(parent, "review output parent");
    let fd = -1;
    let createdStat = null;
    try {
      fd = fs.openSync(
        descriptorChildPath(reviewedParent.fd, leaf),
        fs.constants.O_WRONLY |
          fs.constants.O_CREAT |
          fs.constants.O_EXCL |
          O_NOFOLLOW,
        0o600,
      );
      fs.fchmodSync(fd, 0o600);
      writeAll(fd, encoded);
      fs.fsyncSync(fd);
      createdStat = fs.fstatSync(fd, { bigint: true });
      if (!createdStat.isFile() || Number(createdStat.mode & 0o777n) !== 0o600) {
        throw new Error("review output publication did not preserve mode 0600");
      }
      fs.fsyncSync(reviewedParent.fd);
    } finally {
      if (fd >= 0) fs.closeSync(fd);
      fs.closeSync(reviewedParent.fd);
    }

    const published = fs.lstatSync(resolved, { bigint: true });
    if (!createdStat || !sameGeneration(statGeneration(createdStat), statGeneration(published))) {
      throw new Error("review output final pathname does not match created generation");
    }
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
