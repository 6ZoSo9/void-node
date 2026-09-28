#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Transaction } from "ethers";

import {
  inspectVoidEconomicEpoch2ExplicitRawTransactionV1,
} from "./void-economic-epoch2-explicit-raw-transaction-inspector-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1 =
  "VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1";
export const VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_CONFIRMATION_V1 =
  "scanApprovedVoidArtifactContentsForSignedTransactions";

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
const GENERATED_DIR_NAMES = new Set([
  ".git", ".mypy_cache", ".pytest_cache", ".ruff_cache", ".tox",
  ".venv", "__pycache__", "node_modules", "venv",
]);
const MAX_RECEIPTS = 2048;
const MAX_REGULAR_FILES = 100_000;
const MAX_DEPTH_EXPANDED_FILES = 20_000;
const MAX_EXPANDED_DEPTH = 32;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_SAFETENSORS_FILE_BYTES = 64 * 1024 * 1024 * 1024;
const MAX_SAFETENSORS_HEADER_BYTES = 16 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024 * 1024;
const MAX_ASCII_HEX_TOKENS_PER_FILE = 8192;
const MAX_RAW_TRANSACTION_BYTES = 1024 * 1024;
const MIN_RAW_TRANSACTION_BYTES = 80;
const SAFETENSORS_DTYPE_BYTES = Object.freeze({
  BOOL: 1,
  U8: 1,
  I8: 1,
  F8_E4M3: 1,
  F8_E5M2: 1,
  I16: 2,
  U16: 2,
  F16: 2,
  BF16: 2,
  I32: 4,
  U32: 4,
  F32: 4,
  I64: 8,
  U64: 8,
  F64: 8,
});

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
function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}
function gitBlobSha1(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`, "utf8"))
    .update(bytes)
    .digest("hex");
}
function receiptPattern(stamp) {
  const escaped = stamp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    "^void_epoch2_signed_artifact_metadata_census_precision_v1_" +
      escaped +
      "_(?:root_batch_[0-9]+|file_batch_[0-9]+)\\.json$",
  );
}
function sensitivePath(filePath) {
  const lower = filePath.toLowerCase();
  const base = path.basename(lower);
  const ext = path.extname(base);
  if ([
    ".pem", ".key", ".p12", ".pfx", ".jks", ".kdbx",
    ".wallet", ".seed", ".mnemonic", ".env",
  ].includes(ext)) return true;
  if (/^(?:id_rsa|id_ed25519)(?:\.|$)/.test(base)) return true;
  if (/(?:^|[-_.])(?:private[-_]?key|privkey|mnemonic|seed[-_]?phrase)(?:[-_.]|$)/.test(base)) {
    return true;
  }
  const segments = lower.split(path.sep);
  return segments.some((segment) =>
    ["keystore", "keystores", "wallet", "wallets", "credentials", "secrets"].includes(segment)
  );
}
function readCanonicalJson(file, expectedBlob) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    hold("canonical_repository_evidence_not_direct_file", { path: file });
  }
  const bytes = fs.readFileSync(file);
  const observed = gitBlobSha1(bytes);
  if (observed !== expectedBlob) {
    hold("canonical_repository_evidence_identity_mismatch", {
      path: file,
      expected_git_blob_sha1: expectedBlob,
      observed_git_blob_sha1: observed,
    });
  }
  return JSON.parse(bytes.toString("utf8"));
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
function collectReceiptScope(receiptFiles) {
  const files = new Map();
  const symlinks = new Map();
  const generated = new Map();
  const depth = new Map();
  for (const receiptFile of receiptFiles) {
    const value = JSON.parse(fs.readFileSync(receiptFile, "utf8"));
    if (
      value?.marker !== RECEIPT_MARKER ||
      value?.status !== RECEIPT_STATUS ||
      value?.scanned_file_content_read !== false ||
      !Array.isArray(value.files) ||
      !Array.isArray(value.symlink_descendants) ||
      !Array.isArray(value.skipped_generated_subtrees) ||
      !Array.isArray(value.skipped_depth_subtrees)
    ) hold("receipt_contract_mismatch", { receipt: path.basename(receiptFile) });

    for (const row of value.files) {
      if (
        typeof row.absolute_path !== "string" ||
        typeof row.path_sha256 !== "string" ||
        typeof row.size_bytes !== "number" ||
        row.content_read !== false
      ) hold("regular_file_metadata_contract_mismatch");
      if (files.has(row.absolute_path)) hold("duplicate_regular_file_path");
      files.set(row.absolute_path, {
        absolute_path: row.absolute_path,
        path_sha256: row.path_sha256,
        size_bytes: row.size_bytes,
        source: "receipt_regular_file",
      });
    }
    for (const row of value.symlink_descendants) {
      if (typeof row.absolute_path !== "string" || row.followed !== false) {
        hold("symlink_metadata_contract_mismatch");
      }
      if (symlinks.has(row.absolute_path)) hold("duplicate_symlink_path");
      symlinks.set(row.absolute_path, row);
    }
    for (const row of value.skipped_generated_subtrees) {
      if (
        typeof row.absolute_path !== "string" ||
        row.skip_reason !== "generated_dependency_or_cache_directory" ||
        row.contents_enumerated !== false ||
        row.content_read !== false
      ) hold("generated_skip_contract_mismatch");
      if (generated.has(row.absolute_path)) hold("duplicate_generated_skip_path");
      generated.set(row.absolute_path, row);
    }
    for (const row of value.skipped_depth_subtrees) {
      if (
        typeof row.absolute_path !== "string" ||
        row.skip_reason !== "maximum_scan_depth_boundary" ||
        row.contents_enumerated !== false ||
        row.content_read !== false
      ) hold("depth_skip_contract_mismatch");
      if (depth.has(row.absolute_path)) hold("duplicate_depth_skip_path");
      depth.set(row.absolute_path, row);
    }
  }
  if (files.size > MAX_REGULAR_FILES) hold("regular_file_count_exceeded");
  return { files, symlinks, generated, depth };
}
function validateRegularFile(row) {
  const resolved = path.resolve(row.absolute_path);
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    hold("regular_file_type_changed", { path: resolved });
  }
  const currentUid = uid();
  if (currentUid !== null && stat.uid !== currentUid) {
    hold("regular_file_owner_mismatch", { path: resolved });
  }
  if (stat.size !== row.size_bytes) {
    hold("regular_file_size_changed_since_census", {
      path: resolved,
      census_size_bytes: row.size_bytes,
      observed_size_bytes: stat.size,
    });
  }
  return { ...row, absolute_path: resolved, size_bytes: stat.size };
}
function validateLargeSafetensorsArtifact(row) {
  if (!row.absolute_path.toLowerCase().endsWith(".safetensors")) {
    hold("regular_file_above_content_scan_bound", {
      path: row.absolute_path,
      size_bytes: row.size_bytes,
      maximum_bytes: MAX_FILE_BYTES,
    });
  }
  if (row.size_bytes > MAX_SAFETENSORS_FILE_BYTES) {
    hold("safetensors_file_above_model_artifact_bound", {
      path: row.absolute_path,
      size_bytes: row.size_bytes,
      maximum_bytes: MAX_SAFETENSORS_FILE_BYTES,
    });
  }

  let fd;
  try {
    fd = fs.openSync(
      row.absolute_path,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0),
    );
  } catch {
    hold("safetensors_nofollow_open_failed", { path: row.absolute_path });
  }

  try {
    const opened = fs.fstatSync(fd);
    if (!opened.isFile() || opened.size !== row.size_bytes) {
      hold("safetensors_identity_changed_during_open", {
        path: row.absolute_path,
      });
    }

    const prefix = Buffer.alloc(8);
    if (fs.readSync(fd, prefix, 0, 8, 0) !== 8) {
      hold("safetensors_header_length_read_failed", {
        path: row.absolute_path,
      });
    }
    const headerLengthBig = prefix.readBigUInt64LE(0);
    if (
      headerLengthBig < 2n ||
      headerLengthBig > BigInt(MAX_SAFETENSORS_HEADER_BYTES)
    ) {
      hold("safetensors_header_length_invalid", {
        path: row.absolute_path,
        header_length: headerLengthBig.toString(),
      });
    }
    const headerLength = Number(headerLengthBig);
    if (8 + headerLength > row.size_bytes) {
      hold("safetensors_header_out_of_bounds", {
        path: row.absolute_path,
      });
    }

    const headerBytes = Buffer.alloc(headerLength);
    if (fs.readSync(fd, headerBytes, 0, headerLength, 8) !== headerLength) {
      hold("safetensors_header_read_failed", {
        path: row.absolute_path,
      });
    }

    let header;
    try {
      header = JSON.parse(headerBytes.toString("utf8"));
    } catch {
      hold("safetensors_header_json_invalid", {
        path: row.absolute_path,
      });
    }
    if (!header || Array.isArray(header) || typeof header !== "object") {
      hold("safetensors_header_object_required", {
        path: row.absolute_path,
      });
    }

    const payloadBytes = row.size_bytes - 8 - headerLength;
    const intervals = [];
    let tensorCount = 0;
    for (const [name, value] of Object.entries(header)) {
      if (name === "__metadata__") {
        if (
          value !== null &&
          (!value || Array.isArray(value) || typeof value !== "object")
        ) {
          hold("safetensors_metadata_object_invalid", {
            path: row.absolute_path,
          });
        }
        if (
          value !== null &&
          Object.values(value).some((item) => typeof item !== "string")
        ) {
          hold("safetensors_metadata_value_invalid", {
            path: row.absolute_path,
          });
        }
        continue;
      }
      if (
        !value ||
        Array.isArray(value) ||
        typeof value !== "object" ||
        typeof value.dtype !== "string" ||
        !Array.isArray(value.shape) ||
        !Array.isArray(value.data_offsets) ||
        value.data_offsets.length !== 2
      ) {
        hold("safetensors_tensor_descriptor_invalid", {
          path: row.absolute_path,
          tensor: name,
        });
      }
      if (
        value.shape.some(
          (dimension) =>
            !Number.isSafeInteger(dimension) || dimension < 0,
        )
      ) {
        hold("safetensors_tensor_shape_invalid", {
          path: row.absolute_path,
          tensor: name,
        });
      }
      const dtypeBytes = SAFETENSORS_DTYPE_BYTES[value.dtype];
      if (!Number.isSafeInteger(dtypeBytes)) {
        hold("safetensors_tensor_dtype_unsupported", {
          path: row.absolute_path,
          tensor: name,
          dtype: value.dtype,
        });
      }
      const [start, end] = value.data_offsets;
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        end < start ||
        end > payloadBytes
      ) {
        hold("safetensors_tensor_offsets_invalid", {
          path: row.absolute_path,
          tensor: name,
        });
      }
      let elementCount = 1n;
      for (const dimension of value.shape) {
        elementCount *= BigInt(dimension);
      }
      const expectedTensorBytes = elementCount * BigInt(dtypeBytes);
      if (BigInt(end - start) !== expectedTensorBytes) {
        hold("safetensors_tensor_byte_length_mismatch", {
          path: row.absolute_path,
          tensor: name,
          expected_bytes: expectedTensorBytes.toString(),
          observed_bytes: String(end - start),
        });
      }
      intervals.push([start, end]);
      tensorCount += 1;
    }
    if (tensorCount === 0) {
      hold("safetensors_tensor_set_empty", { path: row.absolute_path });
    }

    intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let cursor = 0;
    for (const [start, end] of intervals) {
      if (start !== cursor) {
        hold("safetensors_tensor_payload_not_contiguous", {
          path: row.absolute_path,
          expected_offset: cursor,
          observed_offset: start,
        });
      }
      cursor = end;
    }
    if (cursor !== payloadBytes) {
      hold("safetensors_tensor_payload_not_fully_described", {
        path: row.absolute_path,
        described_bytes: cursor,
        payload_bytes: payloadBytes,
      });
    }

    return Object.freeze({
      ...row,
      classification: "VALIDATED_SAFETENSORS_MODEL_WEIGHT_ARTIFACT",
      tensor_count: tensorCount,
      header_bytes: headerLength,
      payload_bytes: payloadBytes,
      header_sha256: sha256Bytes(headerBytes),
      header_content: headerBytes,
    });
  } finally {
    fs.closeSync(fd);
  }
}
function walkDepthSubtree(rootPath) {
  const root = path.resolve(rootPath);
  const rootStat = fs.lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    hold("depth_subtree_not_direct_directory", { path: root });
  }
  const currentUid = uid();
  if (currentUid !== null && rootStat.uid !== currentUid) {
    hold("depth_subtree_owner_mismatch", { path: root });
  }
  const out = [];
  const generatedSkips = [];
  const visit = (dir, depth) => {
    if (depth > MAX_EXPANDED_DEPTH) {
      hold("expanded_depth_limit_exceeded", { path: dir, depth });
    }
    const names = fs.readdirSync(dir).sort();
    for (const name of names) {
      const child = path.join(dir, name);
      const stat = fs.lstatSync(child);
      if (stat.isSymbolicLink()) {
        hold("depth_subtree_symlink_requires_separate_review", { path: child });
      }
      if (currentUid !== null && stat.uid !== currentUid) {
        hold("depth_subtree_descendant_owner_mismatch", { path: child });
      }
      if (stat.isDirectory()) {
        if (GENERATED_DIR_NAMES.has(name.toLowerCase())) {
          generatedSkips.push(child);
          continue;
        }
        visit(child, depth + 1);
      } else if (stat.isFile()) {
        if (out.length >= MAX_DEPTH_EXPANDED_FILES) {
          hold("depth_expanded_file_count_exceeded");
        }
        out.push({
          absolute_path: child,
          path_sha256: sha256Text(child),
          size_bytes: stat.size,
          source: "depth_boundary_expansion",
        });
      } else {
        hold("depth_subtree_special_file_rejected", { path: child });
      }
    }
  };
  visit(root, 0);
  return { files: out, generatedSkips };
}
function resolveSymlinksInsideKnownFiles(symlinks, knownFilePaths) {
  const internal = [];
  const external = [];
  const broken = [];
  for (const row of symlinks.values()) {
    let target;
    try {
      target = fs.realpathSync(row.absolute_path);
    } catch {
      broken.push(row.absolute_path);
      continue;
    }
    if (knownFilePaths.has(target)) {
      internal.push({ symlink: row.absolute_path, target });
    } else {
      external.push({ symlink: row.absolute_path, target });
    }
  }
  return { internal, external, broken };
}
function rlpTotalLength(bytes, offset) {
  if (offset >= bytes.length) return null;
  const first = bytes[offset];
  if (first <= 0x7f) return 1;
  if (first <= 0xb7) {
    const len = first - 0x80;
    return offset + 1 + len <= bytes.length ? 1 + len : null;
  }
  if (first <= 0xbf) {
    const lenOfLen = first - 0xb7;
    if (lenOfLen < 1 || lenOfLen > 6 || offset + 1 + lenOfLen > bytes.length) return null;
    let len = 0;
    for (let i = 0; i < lenOfLen; i += 1) len = len * 256 + bytes[offset + 1 + i];
    const total = 1 + lenOfLen + len;
    return offset + total <= bytes.length ? total : null;
  }
  if (first <= 0xf7) {
    const len = first - 0xc0;
    return offset + 1 + len <= bytes.length ? 1 + len : null;
  }
  const lenOfLen = first - 0xf7;
  if (lenOfLen < 1 || lenOfLen > 6 || offset + 1 + lenOfLen > bytes.length) return null;
  let len = 0;
  for (let i = 0; i < lenOfLen; i += 1) len = len * 256 + bytes[offset + 1 + i];
  const total = 1 + lenOfLen + len;
  return offset + total <= bytes.length ? total : null;
}
function classifyRawCandidate(rawHex, registry, nonceCandidate) {
  try {
    const tx = Transaction.from(rawHex);
    if (!tx.isSigned() || BigInt(tx.chainId) !== 2050n) return null;
  } catch {
    return null;
  }
  return inspectVoidEconomicEpoch2ExplicitRawTransactionV1({
    rawTransaction: rawHex,
    registry,
    nonceCandidate,
  });
}
function asciiCandidates(bytes) {
  const text = bytes.toString("latin1");
  const matches = text.match(/0x[0-9a-fA-F]{160,}/g) ?? [];
  if (matches.length > MAX_ASCII_HEX_TOKENS_PER_FILE) {
    hold("ascii_hex_token_count_exceeded");
  }
  return [...new Set(matches)].filter((token) => {
    const byteLength = (token.length - 2) / 2;
    return (
      (token.length - 2) % 2 === 0 &&
      byteLength >= MIN_RAW_TRANSACTION_BYTES &&
      byteLength <= MAX_RAW_TRANSACTION_BYTES
    );
  });
}
function binaryCandidates(bytes) {
  const out = [];
  for (let offset = 0; offset < bytes.length; offset += 1) {
    const first = bytes[offset];
    let total = null;
    if (first >= 0xc0) {
      total = rlpTotalLength(bytes, offset);
    } else if ([1, 2, 3, 4].includes(first) && offset + 1 < bytes.length && bytes[offset + 1] >= 0xc0) {
      const payload = rlpTotalLength(bytes, offset + 1);
      if (payload !== null) total = 1 + payload;
    } else {
      continue;
    }
    if (
      total === null ||
      total < MIN_RAW_TRANSACTION_BYTES ||
      total > MAX_RAW_TRANSACTION_BYTES ||
      offset + total > bytes.length
    ) continue;
    out.push("0x" + bytes.subarray(offset, offset + total).toString("hex"));
    offset += total - 1;
  }
  return out;
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
      marker: VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1,
      status: "PLAN_READY",
      receipt_bound_scope_only: true,
      scans_filename_hint_and_non_hint_regular_files: true,
      scans_ascii_and_binary_serialized_evm_transactions: true,
      credential_or_key_path_content_read: false,
      generated_dependency_cache_content_read: false,
      validated_safetensors_tensor_payload_content_read: false,
      raw_transaction_printed: false,
      raw_transaction_persisted: false,
      required_confirmation:
        VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_CONFIRMATION_V1,
    }, null, 2));
    return;
  }
  if (
    args.confirmation !==
    VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_CONFIRMATION_V1
  ) hold("explicit_confirmation_required");

  const receiptFiles = safeReceiptFiles(args.receiptDir, args.stamp);
  const scope = collectReceiptScope(receiptFiles);

  const baseRows = [...scope.files.values()].map(validateRegularFile);
  const sensitiveBase = baseRows.filter((row) => sensitivePath(row.absolute_path));

  const expandedRows = [];
  const expandedGenerated = [];
  for (const row of scope.depth.values()) {
    const expanded = walkDepthSubtree(row.absolute_path);
    expandedRows.push(...expanded.files);
    expandedGenerated.push(...expanded.generatedSkips);
  }
  const validatedExpanded = expandedRows.map(validateRegularFile);
  const sensitiveExpanded = validatedExpanded.filter((row) =>
    sensitivePath(row.absolute_path)
  );
  const sensitive = [...sensitiveBase, ...sensitiveExpanded];
  if (sensitive.length > 0) {
    hold("credential_or_key_path_requires_separate_exclusion_review", {
      count: sensitive.length,
      paths: sensitive.slice(0, 50).map((row) => row.absolute_path),
    });
  }

  const allValidatedRows = [...baseRows, ...validatedExpanded];
  const modelArtifacts = [];
  const allRows = [];
  for (const row of allValidatedRows) {
    if (row.size_bytes > MAX_FILE_BYTES) {
      modelArtifacts.push(validateLargeSafetensorsArtifact(row));
    } else {
      allRows.push(row);
    }
  }

  const knownPaths = new Set(allValidatedRows.map((row) => row.absolute_path));
  if (knownPaths.size !== allValidatedRows.length) {
    hold("duplicate_path_after_depth_expansion");
  }

  const symlinkResolution = resolveSymlinksInsideKnownFiles(scope.symlinks, knownPaths);
  if (symlinkResolution.broken.length > 0) {
    hold("broken_symlink_requires_review", {
      count: symlinkResolution.broken.length,
      paths: symlinkResolution.broken,
    });
  }
  if (symlinkResolution.external.length > 0) {
    hold("external_symlink_target_requires_review", {
      count: symlinkResolution.external.length,
      rows: symlinkResolution.external,
    });
  }

  let totalBytes = 0;
  for (const row of allRows) {
    totalBytes += row.size_bytes;
    if (totalBytes > MAX_TOTAL_BYTES) {
      hold("content_scan_total_bytes_exceeded", {
        observed_bytes: totalBytes,
        maximum_bytes: MAX_TOTAL_BYTES,
      });
    }
  }

  const registry = readCanonicalJson(REGISTRY_PATH, REGISTRY_GIT_BLOB_SHA1);
  const nonceCandidate = readCanonicalJson(NONCE_PATH, NONCE_GIT_BLOB_SHA1);

  const manifestRows = [];
  const modelManifestRows = [];
  const discoveredByRawSha = new Map();
  let asciiHexTokenCount = 0;
  let binaryCandidateCount = 0;
  let modelHeaderHexTokenCount = 0;

  for (const row of allRows.sort((a, b) => a.absolute_path.localeCompare(b.absolute_path))) {
    const stat = fs.lstatSync(row.absolute_path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== row.size_bytes) {
      hold("file_changed_before_content_read", { path: row.absolute_path });
    }
    const bytes = fs.readFileSync(row.absolute_path);
    const fileSha = sha256Bytes(bytes);
    manifestRows.push(
      row.path_sha256 + "\t" + row.size_bytes + "\t" + fileSha + "\n",
    );

    const candidates = new Map();
    for (const token of asciiCandidates(bytes)) {
      asciiHexTokenCount += 1;
      candidates.set(sha256Text(token.toLowerCase()), token);
    }
    for (const token of binaryCandidates(bytes)) {
      binaryCandidateCount += 1;
      candidates.set(sha256Text(token.toLowerCase()), token);
    }

    for (const [rawSha, token] of candidates) {
      const inspected = classifyRawCandidate(token, registry, nonceCandidate);
      if (inspected === null) continue;
      if (!discoveredByRawSha.has(rawSha)) {
        discoveredByRawSha.set(rawSha, {
          raw_transaction_sha256: rawSha,
          raw_transaction_length: token.length,
          transaction_hash: inspected.transaction_hash,
          signer_address: inspected.signer_address,
          transaction_nonce: inspected.transaction_nonce,
          frozen_final_nonce: inspected.frozen_final_nonce,
          known_repository_lineage: inspected.known_repository_lineage,
          known_repository_lineage_id: inspected.known_repository_lineage_id,
          status: inspected.status,
          replay_staleness_proven: inspected.replay_staleness_proven,
          requires_operator_followup: inspected.requires_operator_followup,
          first_file_path_sha256: row.path_sha256,
          occurrence_count: 1,
        });
      } else {
        discoveredByRawSha.get(rawSha).occurrence_count += 1;
      }
    }
  }

  for (const row of modelArtifacts.sort((a, b) =>
    a.absolute_path.localeCompare(b.absolute_path)
  )) {
    modelManifestRows.push(
      row.path_sha256 + "\t" +
      row.size_bytes + "\t" +
      row.header_bytes + "\t" +
      row.payload_bytes + "\t" +
      row.tensor_count + "\t" +
      row.header_sha256 + "\n",
    );

    for (const token of asciiCandidates(row.header_content)) {
      modelHeaderHexTokenCount += 1;
      const rawSha = sha256Text(token.toLowerCase());
      const inspected = classifyRawCandidate(token, registry, nonceCandidate);
      if (inspected === null) continue;
      if (!discoveredByRawSha.has(rawSha)) {
        discoveredByRawSha.set(rawSha, {
          raw_transaction_sha256: rawSha,
          raw_transaction_length: token.length,
          transaction_hash: inspected.transaction_hash,
          signer_address: inspected.signer_address,
          transaction_nonce: inspected.transaction_nonce,
          frozen_final_nonce: inspected.frozen_final_nonce,
          known_repository_lineage: inspected.known_repository_lineage,
          known_repository_lineage_id: inspected.known_repository_lineage_id,
          status: inspected.status,
          replay_staleness_proven: inspected.replay_staleness_proven,
          requires_operator_followup: inspected.requires_operator_followup,
          first_file_path_sha256: row.path_sha256,
          occurrence_count: 1,
          occurrence_surface: "safetensors_header",
        });
      } else {
        discoveredByRawSha.get(rawSha).occurrence_count += 1;
      }
    }
  }

  const transactions = [...discoveredByRawSha.values()].sort((a, b) =>
    a.raw_transaction_sha256.localeCompare(b.raw_transaction_sha256)
  );
  const followup = transactions.filter((row) => row.requires_operator_followup);
  const stale = transactions.filter((row) => row.replay_staleness_proven);
  const generatedBasenameCounts = {};
  for (const row of scope.generated.values()) {
    generatedBasenameCounts[row.basename] =
      (generatedBasenameCounts[row.basename] ?? 0) + 1;
  }

  console.log(VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1);
  console.log("receipt_stamp=" + args.stamp);
  console.log("receipt_count=" + receiptFiles.length);
  console.log("receipt_regular_file_count=" + baseRows.length);
  console.log("depth_boundary_subtree_count=" + scope.depth.size);
  console.log("depth_expanded_file_count=" + validatedExpanded.length);
  console.log("generated_dependency_cache_subtree_count=" + scope.generated.size);
  console.log("generated_dependency_cache_basename_counts=" + JSON.stringify(generatedBasenameCounts));
  console.log("expanded_generated_dependency_cache_subtree_count=" + expandedGenerated.length);
  console.log("symlink_descendant_count=" + scope.symlinks.size);
  console.log("symlink_internal_alias_count=" + symlinkResolution.internal.length);
  console.log("symlink_external_target_count=0");
  console.log("credential_or_key_path_skipped_count=0");
  console.log("validated_safetensors_model_artifact_count=" + modelArtifacts.length);
  console.log("validated_safetensors_model_payload_bytes=" +
    modelArtifacts.reduce((sum, row) => sum + row.payload_bytes, 0));
  console.log("validated_safetensors_model_manifest_sha256=" +
    sha256Text(modelManifestRows.join("")));
  console.log("safetensors_tensor_payload_content_read=false");
  console.log("safetensors_header_hex_candidate_count=" + modelHeaderHexTokenCount);
  console.log("content_scanned_file_count=" + allRows.length);
  console.log("content_scanned_total_bytes=" + totalBytes);
  console.log("content_manifest_sha256=" + sha256Text(manifestRows.join("")));
  console.log("ascii_long_hex_candidate_count=" + asciiHexTokenCount);
  console.log("binary_rlp_candidate_count=" + binaryCandidateCount);
  console.log("signed_chain2050_transaction_count=" + transactions.length);
  console.log("stale_signed_chain2050_transaction_count=" + stale.length);
  console.log("requires_operator_followup_count=" + followup.length);
  console.log("signed_chain2050_transactions=" + JSON.stringify(transactions));
  console.log("generated_dependency_cache_content_read=false");
  console.log("credential_or_key_path_content_read=false");
  console.log("raw_transaction_printed=false");
  console.log("raw_transaction_persisted=false");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("authoritative_chain2050_write=false");
  console.log("full_receipt_bound_content_sweep_complete=true");
  console.log("pending_legacy_signed_transaction_census_complete=false");
  console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
  console.log("cross_epoch_replay_protection_proven=false");
  console.log(VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1 + "_GREEN");
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
    VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1 +
      "_HOLD reason=" + reason + detail,
  );
  process.exitCode = 2;
}
