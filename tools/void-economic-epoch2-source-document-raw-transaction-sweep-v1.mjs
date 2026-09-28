#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";
import { Transaction } from "ethers";

import {
  inspectVoidEconomicEpoch2ExplicitRawTransactionV1,
} from "./void-economic-epoch2-explicit-raw-transaction-inspector-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_SOURCE_DOCUMENT_RAW_TRANSACTION_SWEEP_V1 =
  "VOID_ECONOMIC_EPOCH2_SOURCE_DOCUMENT_RAW_TRANSACTION_SWEEP_V1";
export const VOID_ECONOMIC_EPOCH2_SOURCE_DOCUMENT_RAW_TRANSACTION_SWEEP_CONFIRMATION_V1 =
  "scanApprovedVoidSourceDocumentCandidates";

const RECEIPT_MARKER =
  "VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1";
const RECEIPT_STATUS = "METADATA_CENSUS_READY_OPERATOR_REVIEW_REQUIRED";
const REGISTRY_PATH =
  "ops/mainnet0/economic-epoch2-known-signed-transaction-lineages-v1.json";
const NONCE_PATH =
  "ops/mainnet0/economic-epoch2-account-nonce-continuity-candidate-v1.json";
const REGISTRY_GIT_BLOB_SHA1 =
  "f96d7d4d5857a33bc292dce677678db026aabf2f";
const NONCE_GIT_BLOB_SHA1 =
  "83191d30131a2c99ef0cf51e43d2954fc34ffd06";
const MAX_RECEIPTS = 2048;
const MAX_SOURCE_FILES = 512;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 128 * 1024 * 1024;
const MAX_HEX_TOKENS_PER_FILE = 4096;
const MIN_HEX_DIGITS = 160;
const MAX_RAW_HEX_DIGITS = 512 * 1024;
const TEXT_EXTENSIONS = Object.freeze([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".md", ".yml", ".yaml", ".sh", ".py",
  ".sha256", ".html", ".example",
]);
const decoder = new TextDecoder("utf-8", { fatal: true });

class Hold extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.reason = reason;
    this.detail = detail;
  }
}
function hold(reason, detail = null) {
  throw new Hold(reason, detail);
}
function currentUid() {
  return typeof process.getuid === "function" ? process.getuid() : null;
}
function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function gitBlobSha1(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`, "utf8"))
    .update(bytes)
    .digest("hex");
}
function isSourceDocumentBasename(name) {
  const lower = name.toLowerCase();
  return !(
    lower.endsWith(".txt") ||
    lower.endsWith(".json") ||
    lower.endsWith(".zip")
  );
}
function sourceExtensionAllowed(name) {
  const lower = name.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
function receiptPattern(stamp) {
  const escaped = stamp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    "^void_epoch2_signed_artifact_metadata_census_precision_v1_" +
      escaped +
      "_(?:root_batch_[0-9]+|file_batch_[0-9]+)\\.json$",
  );
}
function safeReceiptFiles(receiptDir, stamp) {
  if (!path.isAbsolute(receiptDir)) hold("receipt_dir_must_be_absolute");
  if (!/^\d{8}T\d{6}Z$/.test(stamp)) hold("stamp_invalid");
  const resolved = path.resolve(receiptDir);
  let stat;
  try {
    stat = fs.lstatSync(resolved);
  } catch {
    hold("receipt_dir_metadata_read_failed");
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) hold("receipt_dir_invalid");
  const uid = currentUid();
  if (uid !== null && stat.uid !== uid) hold("receipt_dir_owner_mismatch");

  const pattern = receiptPattern(stamp);
  const names = fs.readdirSync(resolved).filter((name) => pattern.test(name)).sort();
  if (names.length === 0) hold("receipt_set_empty");
  if (names.length > MAX_RECEIPTS) hold("receipt_count_exceeded");

  return names.map((name) => {
    const file = path.join(resolved, name);
    const item = fs.lstatSync(file);
    if (!item.isFile() || item.isSymbolicLink()) {
      hold("receipt_not_direct_file", { file });
    }
    if (uid !== null && item.uid !== uid) {
      hold("receipt_owner_mismatch", { file });
    }
    if ((item.mode & 0o777) !== 0o600) {
      hold("receipt_mode_invalid", { file });
    }
    return file;
  });
}
function assertNoSymlinkAncestors(target) {
  const resolved = path.resolve(target);
  const parsed = path.parse(resolved);
  let cursor = parsed.root;
  for (const segment of resolved.slice(parsed.root.length).split(path.sep)) {
    if (!segment) continue;
    cursor = path.join(cursor, segment);
    let stat;
    try {
      stat = fs.lstatSync(cursor);
    } catch {
      hold("candidate_path_component_missing", { path: cursor });
    }
    if (stat.isSymbolicLink()) {
      hold("candidate_symlink_path_rejected", { path: cursor });
    }
  }
  return resolved;
}
function readSourceCandidate(row) {
  const resolved = assertNoSymlinkAncestors(row.absolute_path);
  let stat;
  try {
    stat = fs.lstatSync(resolved);
  } catch {
    hold("candidate_metadata_read_failed", { path: resolved });
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    hold("candidate_not_direct_regular_file", { path: resolved });
  }
  const uid = currentUid();
  if (uid !== null && stat.uid !== uid) {
    hold("candidate_owner_mismatch", { path: resolved });
  }
  if (stat.size !== row.size_bytes) {
    hold("candidate_size_changed_since_census", {
      path: resolved,
      census_size_bytes: row.size_bytes,
      observed_size_bytes: stat.size,
    });
  }
  if (stat.size < 0 || stat.size > MAX_FILE_BYTES) {
    hold("candidate_file_size_out_of_bounds", {
      path: resolved,
      size_bytes: stat.size,
      maximum_bytes: MAX_FILE_BYTES,
    });
  }
  let bytes;
  try {
    bytes = fs.readFileSync(resolved);
  } catch {
    hold("candidate_content_read_failed", { path: resolved });
  }
  let text;
  try {
    text = decoder.decode(bytes);
  } catch {
    hold("candidate_not_valid_utf8_text", { path: resolved });
  }
  return Object.freeze({
    path: resolved,
    basename: path.basename(resolved),
    bytes,
    text,
  });
}
function readCanonicalJson(file, expectedBlob) {
  let bytes;
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      hold("canonical_repository_evidence_not_direct_file", { path: file });
    }
    bytes = fs.readFileSync(file);
  } catch (error) {
    if (error instanceof Hold) throw error;
    hold("canonical_repository_evidence_read_failed", { path: file });
  }
  const observed = gitBlobSha1(bytes);
  if (observed !== expectedBlob) {
    hold("canonical_repository_evidence_identity_mismatch", {
      path: file,
      expected_git_blob_sha1: expectedBlob,
      observed_git_blob_sha1: observed,
    });
  }
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    hold("canonical_repository_evidence_json_invalid", { path: file });
  }
}
function collectSourceCandidates(receiptFiles) {
  const candidates = [];
  let symlinkCandidateCount = 0;
  for (const receiptFile of receiptFiles) {
    const value = JSON.parse(fs.readFileSync(receiptFile, "utf8"));
    if (
      value?.marker !== RECEIPT_MARKER ||
      value?.status !== RECEIPT_STATUS ||
      value?.scanned_file_content_read !== false ||
      !Array.isArray(value.files) ||
      !Array.isArray(value.symlink_descendants)
    ) {
      hold("receipt_contract_mismatch", {
        receipt: path.basename(receiptFile),
      });
    }
    for (const row of value.files) {
      if (row?.candidate_name_hint !== true) continue;
      if (!isSourceDocumentBasename(row.basename)) continue;
      if (
        typeof row.absolute_path !== "string" ||
        typeof row.basename !== "string" ||
        typeof row.size_bytes !== "number" ||
        row.content_read !== false
      ) {
        hold("candidate_metadata_contract_mismatch");
      }
      if (!sourceExtensionAllowed(row.basename)) {
        hold("source_document_extension_not_allowlisted", {
          path: row.absolute_path,
          basename: row.basename,
        });
      }
      candidates.push(Object.freeze({
        absolute_path: row.absolute_path,
        basename: row.basename,
        size_bytes: row.size_bytes,
      }));
    }
    for (const row of value.symlink_descendants) {
      if (row?.candidate_name_hint === true) symlinkCandidateCount += 1;
    }
  }
  candidates.sort((a, b) => a.absolute_path.localeCompare(b.absolute_path));
  if (candidates.length === 0) hold("source_document_candidate_set_empty");
  if (candidates.length > MAX_SOURCE_FILES) hold("source_document_candidate_count_exceeded");
  const seen = new Set();
  for (const row of candidates) {
    if (seen.has(row.absolute_path)) hold("duplicate_source_document_candidate_path");
    seen.add(row.absolute_path);
  }
  return { candidates, symlinkCandidateCount };
}
function candidateHexTokens(text) {
  const matches = text.match(/0x[0-9a-fA-F]{160,}/g) ?? [];
  if (matches.length > MAX_HEX_TOKENS_PER_FILE) {
    hold("hex_token_count_exceeded");
  }
  return [...new Set(matches)].filter((token) =>
    (token.length - 2) % 2 === 0 &&
    token.length - 2 <= MAX_RAW_HEX_DIGITS
  );
}
function trySignedChain2050(token) {
  let tx;
  try {
    tx = Transaction.from(token);
  } catch {
    return null;
  }
  try {
    if (!tx.isSigned()) return null;
    if (BigInt(tx.chainId) !== 2050n) return null;
  } catch {
    return null;
  }
  return tx;
}
function parseArgs(argv) {
  const out = { receiptDir: "", stamp: "", apply: false, confirmation: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--receipt-dir") out.receiptDir = argv[++i] ?? "";
    else if (key === "--stamp") out.stamp = argv[++i] ?? "";
    else if (key === "--apply") out.apply = true;
    else if (key === "--confirmation") out.confirmation = argv[++i] ?? "";
    else if (key === "--help") out.help = true;
    else hold("unknown_argument", { key });
  }
  return out;
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.apply) {
    console.log(JSON.stringify({
      marker: VOID_ECONOMIC_EPOCH2_SOURCE_DOCUMENT_RAW_TRANSACTION_SWEEP_V1,
      status: "PLAN_READY",
      receipt_bound_source_document_candidates_only: true,
      candidate_content_read_on_apply: true,
      raw_transaction_printed: false,
      raw_transaction_persisted: false,
      required_confirmation:
        VOID_ECONOMIC_EPOCH2_SOURCE_DOCUMENT_RAW_TRANSACTION_SWEEP_CONFIRMATION_V1,
    }, null, 2));
    return;
  }
  if (
    args.confirmation !==
    VOID_ECONOMIC_EPOCH2_SOURCE_DOCUMENT_RAW_TRANSACTION_SWEEP_CONFIRMATION_V1
  ) hold("explicit_confirmation_required");

  const receiptFiles = safeReceiptFiles(args.receiptDir, args.stamp);
  const { candidates, symlinkCandidateCount } =
    collectSourceCandidates(receiptFiles);
  if (symlinkCandidateCount !== 0) {
    hold("symlink_candidate_name_hint_present", {
      count: symlinkCandidateCount,
    });
  }

  const registry = readCanonicalJson(REGISTRY_PATH, REGISTRY_GIT_BLOB_SHA1);
  const nonceCandidate = readCanonicalJson(NONCE_PATH, NONCE_GIT_BLOB_SHA1);

  const fileSummaries = [];
  const discovered = [];
  let totalBytes = 0;
  let totalHexTokens = 0;

  for (const row of candidates) {
    const selected = readSourceCandidate(row);
    totalBytes += selected.bytes.length;
    if (totalBytes > MAX_TOTAL_BYTES) hold("source_document_total_bytes_exceeded");

    const tokens = candidateHexTokens(selected.text);
    totalHexTokens += tokens.length;
    let signedChain2050Count = 0;

    for (const token of tokens) {
      if (trySignedChain2050(token) === null) continue;
      const inspected = inspectVoidEconomicEpoch2ExplicitRawTransactionV1({
        rawTransaction: token,
        registry,
        nonceCandidate,
      });
      signedChain2050Count += 1;
      discovered.push(Object.freeze({
        file_path: selected.path,
        file_basename: selected.basename,
        file_sha256: sha256Bytes(selected.bytes),
        raw_transaction_sha256: sha256Bytes(Buffer.from(token, "utf8")),
        raw_transaction_length: token.length,
        status: inspected.status,
        transaction_hash: inspected.transaction_hash,
        signer_address: inspected.signer_address,
        transaction_nonce: inspected.transaction_nonce,
        frozen_final_nonce: inspected.frozen_final_nonce,
        known_repository_lineage: inspected.known_repository_lineage,
        known_repository_lineage_id: inspected.known_repository_lineage_id,
        replay_staleness_proven: inspected.replay_staleness_proven,
        requires_operator_followup: inspected.requires_operator_followup,
      }));
    }

    fileSummaries.push(Object.freeze({
      path: selected.path,
      basename: selected.basename,
      size_bytes: selected.bytes.length,
      file_sha256: sha256Bytes(selected.bytes),
      candidate_hex_token_count: tokens.length,
      signed_chain2050_transaction_count: signedChain2050Count,
    }));
  }

  const followup = discovered.filter((row) => row.requires_operator_followup);
  const stale = discovered.filter((row) => row.replay_staleness_proven);
  console.log(VOID_ECONOMIC_EPOCH2_SOURCE_DOCUMENT_RAW_TRANSACTION_SWEEP_V1);
  console.log("receipt_stamp=" + args.stamp);
  console.log("receipt_count=" + receiptFiles.length);
  console.log("source_document_candidate_count=" + candidates.length);
  console.log("source_document_total_bytes=" + totalBytes);
  console.log("candidate_hex_token_count=" + totalHexTokens);
  console.log("signed_chain2050_transaction_count=" + discovered.length);
  console.log("stale_signed_chain2050_transaction_count=" + stale.length);
  console.log("requires_operator_followup_count=" + followup.length);
  console.log("file_summaries=" + JSON.stringify(fileSummaries));
  console.log("signed_chain2050_transactions=" + JSON.stringify(discovered));
  console.log("raw_transaction_printed=false");
  console.log("raw_transaction_persisted=false");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("authoritative_chain2050_write=false");
  console.log("source_document_content_sweep_complete=true");
  console.log("pending_legacy_signed_transaction_census_complete=false");
  console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
  console.log("cross_epoch_replay_protection_proven=false");
  console.log(VOID_ECONOMIC_EPOCH2_SOURCE_DOCUMENT_RAW_TRANSACTION_SWEEP_V1 + "_GREEN");
}
try {
  main();
} catch (error) {
  const reason = error instanceof Hold
    ? error.reason
    : String(error?.reason || error?.message || error);
  const detail = error instanceof Hold && error.detail !== null
    ? " detail=" + JSON.stringify(error.detail)
    : "";
  console.error(
    VOID_ECONOMIC_EPOCH2_SOURCE_DOCUMENT_RAW_TRANSACTION_SWEEP_V1 +
      "_HOLD reason=" + reason + detail,
  );
  process.exitCode = 2;
}
