#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CANDIDATE_METADATA_REVIEW_V1 =
  "VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CANDIDATE_METADATA_REVIEW_V1";
export const VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CANDIDATE_METADATA_REVIEW_CONFIRMATION_V1 =
  "reviewVoidSignedArtifactCandidateMetadata";

const RECEIPT_MARKER =
  "VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1";
const RECEIPT_STATUS = "METADATA_CENSUS_READY_OPERATOR_REVIEW_REQUIRED";
const MAX_RECEIPTS = 2048;
const MAX_TOTAL_ROWS = 250_000;

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
function uid() {
  return typeof process.getuid === "function" ? process.getuid() : null;
}
function classifyBasename(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".txt")) return "direct_text_candidate";
  if (lower.endsWith(".json")) return "structured_json_candidate";
  if (lower.endsWith(".zip")) return "archive_candidate";
  return "source_or_document_name";
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
  const stat = fs.lstatSync(resolved);
  if (!stat.isDirectory() || stat.isSymbolicLink()) hold("receipt_dir_invalid");
  const currentUid = uid();
  if (currentUid !== null && stat.uid !== currentUid) hold("receipt_dir_owner_mismatch");

  const pattern = receiptPattern(stamp);
  const names = fs.readdirSync(resolved).filter((name) => pattern.test(name)).sort();
  if (names.length === 0) hold("receipt_set_empty");
  if (names.length > MAX_RECEIPTS) hold("receipt_count_exceeded");

  return names.map((name) => {
    const file = path.join(resolved, name);
    const item = fs.lstatSync(file);
    if (!item.isFile() || item.isSymbolicLink()) hold("receipt_not_direct_file", { file });
    if (currentUid !== null && item.uid !== currentUid) hold("receipt_owner_mismatch", { file });
    if ((item.mode & 0o777) !== 0o600) hold("receipt_mode_invalid", { file });
    return file;
  });
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.apply) {
    console.log(JSON.stringify({
      marker: VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CANDIDATE_METADATA_REVIEW_V1,
      status: "PLAN_READY",
      reads_private_census_receipts_only: true,
      candidate_file_content_read: false,
      required_confirmation:
        VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CANDIDATE_METADATA_REVIEW_CONFIRMATION_V1,
    }, null, 2));
    return;
  }
  if (
    args.confirmation !==
    VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CANDIDATE_METADATA_REVIEW_CONFIRMATION_V1
  ) hold("explicit_confirmation_required");

  const receiptFiles = safeReceiptFiles(args.receiptDir, args.stamp);
  const candidates = [];
  let totalRows = 0;
  let symlinkCandidateCount = 0;

  for (const receiptFile of receiptFiles) {
    const value = JSON.parse(fs.readFileSync(receiptFile, "utf8"));
    if (
      value?.marker !== RECEIPT_MARKER ||
      value?.status !== RECEIPT_STATUS ||
      value?.scanned_file_content_read !== false ||
      !Array.isArray(value.files) ||
      !Array.isArray(value.symlink_descendants)
    ) hold("receipt_contract_mismatch", { receipt: path.basename(receiptFile) });

    totalRows += value.files.length + value.symlink_descendants.length;
    if (totalRows > MAX_TOTAL_ROWS) hold("receipt_row_count_exceeded");

    for (const row of value.files) {
      if (row?.candidate_name_hint !== true) continue;
      if (
        typeof row.absolute_path !== "string" ||
        typeof row.basename !== "string" ||
        typeof row.size_bytes !== "number" ||
        typeof row.source_kind !== "string" ||
        row.content_read !== false
      ) hold("candidate_metadata_contract_mismatch");
      candidates.push(Object.freeze({
        absolute_path: row.absolute_path,
        basename: row.basename,
        size_bytes: row.size_bytes,
        source_kind: row.source_kind,
        review_class: classifyBasename(row.basename),
      }));
    }
    for (const row of value.symlink_descendants) {
      if (row?.candidate_name_hint === true) symlinkCandidateCount += 1;
    }
  }

  candidates.sort((a, b) => a.absolute_path.localeCompare(b.absolute_path));
  const seen = new Set();
  for (const row of candidates) {
    if (seen.has(row.absolute_path)) hold("duplicate_candidate_path");
    seen.add(row.absolute_path);
  }

  const classCounts = {};
  const basenameSet = new Set();
  for (const row of candidates) {
    basenameSet.add(row.basename);
    classCounts[row.review_class] = (classCounts[row.review_class] ?? 0) + 1;
  }
  const focused = candidates.filter((row) =>
    row.review_class !== "source_or_document_name"
  );

  console.log(VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CANDIDATE_METADATA_REVIEW_V1);
  console.log("receipt_stamp=" + args.stamp);
  console.log("receipt_count=" + receiptFiles.length);
  console.log("candidate_occurrence_count=" + candidates.length);
  console.log("unique_candidate_path_count=" + seen.size);
  console.log("unique_candidate_basename_count=" + basenameSet.size);
  console.log("symlink_candidate_name_hint_count=" + symlinkCandidateCount);
  console.log("review_class_counts=" + JSON.stringify(classCounts));
  console.log("candidate_file_content_read=false");
  console.log("focused_candidate_count=" + focused.length);
  console.log("focused_candidates=" + JSON.stringify(focused));
  console.log("next_gate=operator_select_exact_direct_raw_transaction_candidates_only");
  console.log("pending_legacy_signed_transaction_census_complete=false");
  console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
  console.log("cross_epoch_replay_protection_proven=false");
  console.log(VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CANDIDATE_METADATA_REVIEW_V1 + "_GREEN");
}

try {
  main();
} catch (error) {
  const reason = error instanceof Hold ? error.reason : String(error?.message || error);
  const detail = error instanceof Hold && error.detail !== null
    ? " detail=" + JSON.stringify(error.detail)
    : "";
  console.error(
    VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CANDIDATE_METADATA_REVIEW_V1 +
      "_HOLD reason=" + reason + detail
  );
  process.exitCode = 2;
}
