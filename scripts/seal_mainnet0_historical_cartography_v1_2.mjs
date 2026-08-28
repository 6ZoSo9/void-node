#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  stableStringify,
  sha256Hex,
  scanHistoricalSource,
} from "./mainnet0_historical_cartography_v1.mjs";

export const ACCEPTANCE_SCHEMA =
  "void_mainnet0_historical_cartography_acceptance_v1";
export const ACCEPTANCE_MARKER =
  "VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_ACCEPTANCE_V1_2";
export const ACCEPTANCE_VERSION = "v1.2";
export const AUTHORITY_SCHEMA =
  "void_mainnet0_independent_prefix_authority_v1";
export const AUTHORITY_ID_PREFIX = "voidm0auth1_";
export const ACCEPTANCE_ID_PREFIX = "voidm0accept1_";
export const SEG_SPAN = 10_000;
export const MAX_FRAME_BYTES = 128 * 1024 * 1024;

const THIS_FILE = fileURLToPath(import.meta.url);
const DEFAULT_REPO_ROOT = path.resolve(path.dirname(THIS_FILE), "..");
const DEFAULT_SCANNER_REL =
  "scripts/mainnet0_historical_cartography_v1.mjs";
const DEFAULT_SCHEMA_REL =
  "public/mainnet0-historical-cartography-v1.schema.json";

export class CartographyAcceptanceHold extends Error {
  constructor(reason, detail = {}) {
    super(reason);
    this.name = "CartographyAcceptanceHold";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail = {}) {
  throw new CartographyAcceptanceHold(reason, detail);
}

function lowerHex(value, length) {
  return (
    typeof value === "string" &&
    new RegExp(`^[0-9a-f]{${length}}$`).test(value)
  );
}

function safeNonnegativeInt(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function safePositiveInt(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function regularNonSymlink(file) {
  const st = fs.lstatSync(file);
  if (!st.isFile() || st.isSymbolicLink()) {
    hold("path_not_regular_file", { file });
  }
  return st;
}

function readJsonFile(file) {
  regularNonSymlink(file);
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    hold("invalid_json_file", {
      file,
      message: String(error?.message || error),
    });
  }
  return value;
}

function hashFile(file) {
  regularNonSymlink(file);
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(file, "r");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let offset = 0;
    for (;;) {
      const count = fs.readSync(fd, buffer, 0, buffer.length, offset);
      if (count === 0) break;
      hash.update(buffer.subarray(0, count));
      offset += count;
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
}

function recomputeContentId(prefix, object, idKey) {
  const withoutId = { ...object };
  delete withoutId[idKey];
  return (
    prefix +
    sha256Hex(Buffer.from(stableStringify(withoutId), "utf8"))
  );
}

export function validateScanManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    hold("scan_manifest_not_object");
  }
  if (manifest.schema !== "void_mainnet0_historical_cartography_v1") {
    hold("scan_manifest_schema_mismatch");
  }
  if (manifest.status !== "complete") {
    hold("scan_manifest_not_complete");
  }
  if (manifest.scanner_version !== "v1.1") {
    hold("scan_manifest_generation_mismatch", {
      observed: manifest.scanner_version,
    });
  }
  if (manifest.chain_id !== 2050) hold("scan_manifest_chain_id_mismatch");
  if (manifest.network !== "VOID Mainnet-0") {
    hold("scan_manifest_network_mismatch");
  }
  if (!manifest.source || typeof manifest.source !== "object") {
    hold("scan_manifest_source_missing");
  }
  if (!safeNonnegativeInt(manifest.source.frozen_head)) {
    hold("scan_manifest_frozen_head_invalid");
  }
  if (
    !safePositiveInt(manifest.historical_blocks_scanned) ||
    manifest.historical_blocks_scanned !==
      manifest.source.frozen_head + 1
  ) {
    hold("scan_manifest_count_conservation_failed");
  }
  if (
    manifest.unclassified_blocks !== 0 ||
    manifest.ambiguous_classifications !== 0 ||
    manifest.transition_gaps !== 0 ||
    !Array.isArray(manifest.holds) ||
    manifest.holds.length !== 0
  ) {
    hold("scan_manifest_contains_unresolved_hold_state");
  }
  if (
    manifest.canonical_bytes_modified !== 0 ||
    manifest.modern_validator_modified !== false
  ) {
    hold("scan_manifest_authority_boundary_mismatch");
  }
  if (!lowerHex(manifest.complete_scan_digest, 64)) {
    hold("scan_manifest_complete_digest_invalid");
  }
  if (
    typeof manifest.manifest_id !== "string" ||
    !/^voidm0map1_[0-9a-f]{64}$/.test(manifest.manifest_id)
  ) {
    hold("scan_manifest_id_invalid");
  }

  const recomputed = recomputeContentId(
    "voidm0map1_",
    manifest,
    "manifest_id",
  );
  if (recomputed !== manifest.manifest_id) {
    hold("scan_manifest_content_id_mismatch", {
      expected: manifest.manifest_id,
      actual: recomputed,
    });
  }

  const classCounts = manifest.class_counts;
  if (!classCounts || typeof classCounts !== "object") {
    hold("scan_manifest_class_counts_missing");
  }
  const sum = Object.values(classCounts).reduce((acc, value) => {
    if (!safeNonnegativeInt(value)) {
      hold("scan_manifest_class_count_invalid");
    }
    return acc + value;
  }, 0);
  if (sum !== manifest.historical_blocks_scanned) {
    hold("scan_manifest_class_count_conservation_failed", {
      sum,
      scanned: manifest.historical_blocks_scanned,
    });
  }

  return manifest;
}

export function validateAuthorityReceipt(receipt) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    hold("authority_receipt_not_object");
  }
  if (receipt.schema !== AUTHORITY_SCHEMA) {
    hold("authority_receipt_schema_mismatch");
  }
  if (receipt.network !== "VOID Mainnet-0" || receipt.chain_id !== 2050) {
    hold("authority_receipt_network_mismatch");
  }
  if (!safeNonnegativeInt(receipt.frozen_head)) {
    hold("authority_receipt_frozen_head_invalid");
  }
  if (
    receipt.block_count !== receipt.frozen_head + 1 ||
    !safePositiveInt(receipt.segment_count) ||
    !safePositiveInt(receipt.total_prefix_bytes)
  ) {
    hold("authority_receipt_count_invalid");
  }
  if (!lowerHex(receipt.prefix_root, 64)) {
    hold("authority_receipt_prefix_root_invalid");
  }
  if (
    !lowerHex(receipt.genesis_raw_sha256, 64) ||
    !lowerHex(receipt.frozen_raw_sha256, 64)
  ) {
    hold("authority_receipt_anchor_hash_invalid");
  }
  if (
    receipt.authority_basis !==
    "independent_materialization_exact_byte_prefix_match"
  ) {
    hold("authority_receipt_basis_mismatch");
  }
  if (
    receipt.authority_only !== true ||
    receipt.append_authority !== false ||
    receipt.validator_authority !== false ||
    receipt.runtime_authority !== false
  ) {
    hold("authority_receipt_capability_boundary_mismatch");
  }
  const primary = receipt.primary_materialization;
  const witness = receipt.independent_witness;
  if (
    !primary || typeof primary !== "object" || Array.isArray(primary) ||
    !witness || typeof witness !== "object" || Array.isArray(witness)
  ) {
    hold("authority_independent_materializations_missing");
  }
  if (
    typeof primary.label !== "string" ||
    typeof witness.label !== "string" ||
    primary.label === witness.label ||
    typeof primary.hostname !== "string" ||
    typeof witness.hostname !== "string" ||
    primary.hostname.toLowerCase() === witness.hostname.toLowerCase() ||
    witness.repeat_prefix_root_equal !== true
  ) {
    hold("authority_independent_materialization_contract_mismatch");
  }
  if (!Array.isArray(receipt.descriptors)) {
    hold("authority_receipt_descriptors_missing");
  }
  if (receipt.descriptors.length !== receipt.segment_count) {
    hold("authority_receipt_segment_count_mismatch");
  }
  if (
    typeof receipt.authority_id !== "string" ||
    !/^voidm0auth1_[0-9a-f]{64}$/.test(receipt.authority_id)
  ) {
    hold("authority_receipt_id_invalid");
  }
  const recomputed = recomputeContentId(
    AUTHORITY_ID_PREFIX,
    receipt,
    "authority_id",
  );
  if (recomputed !== receipt.authority_id) {
    hold("authority_receipt_content_id_mismatch", {
      expected: receipt.authority_id,
      actual: recomputed,
    });
  }

  let expectedHeight = 0;
  let totalBytes = 0;
  for (let index = 0; index < receipt.descriptors.length; index += 1) {
    const entry = receipt.descriptors[index];
    if (!entry || typeof entry !== "object") {
      hold("authority_descriptor_not_object", { index });
    }
    const expectedName = String(index * SEG_SPAN).padStart(8, "0");
    const expectedTo = Math.min(
      index * SEG_SPAN + SEG_SPAN - 1,
      receipt.frozen_head,
    );
    if (
      entry.segment !== expectedName ||
      entry.from !== expectedHeight ||
      entry.to !== expectedTo ||
      !safePositiveInt(entry.prefix_bytes) ||
      !lowerHex(entry.prefix_sha256, 64)
    ) {
      hold("authority_descriptor_invalid", {
        index,
        segment: entry.segment,
      });
    }
    totalBytes += entry.prefix_bytes;
    expectedHeight = expectedTo + 1;
  }
  if (
    expectedHeight !== receipt.block_count ||
    totalBytes !== receipt.total_prefix_bytes
  ) {
    hold("authority_descriptor_conservation_failed", {
      expected_height: expectedHeight,
      block_count: receipt.block_count,
      total_bytes: totalBytes,
      expected_total_bytes: receipt.total_prefix_bytes,
    });
  }

  const rootBody = {
    schema: "void_mainnet0_prefix_commitment_body_v1",
    chain_id: 2050,
    frozen_head: receipt.frozen_head,
    segment_count: receipt.segment_count,
    total_prefix_bytes: receipt.total_prefix_bytes,
    descriptors: receipt.descriptors,
  };
  const recomputedRoot = sha256Hex(
    Buffer.from(stableStringify(rootBody), "utf8"),
  );
  if (recomputedRoot !== receipt.prefix_root) {
    hold("authority_prefix_root_mismatch", {
      expected: receipt.prefix_root,
      actual: recomputedRoot,
    });
  }

  return receipt;
}

export function computeClassificationSemantics(repoRoot = DEFAULT_REPO_ROOT) {
  const root = path.resolve(repoRoot);
  const inputs = [
    DEFAULT_SCANNER_REL,
    DEFAULT_SCHEMA_REL,
  ].map((relativePath) => {
    const absolute = path.join(root, relativePath);
    return {
      path: relativePath,
      sha256: hashFile(absolute),
    };
  });

  const body = {
    schema: "void_mainnet0_classification_semantics_v1",
    algorithm: "sha256_stable_json_file_digest_set_v1",
    inputs,
  };
  return {
    ...body,
    root: sha256Hex(Buffer.from(stableStringify(body), "utf8")),
  };
}

export function checkpointPrefixCommitment(
  checkpointDir,
  frozenHead,
) {
  const root = path.resolve(checkpointDir);
  const segmentsDir = path.join(root, "segments");
  const st = fs.lstatSync(segmentsDir);
  if (!st.isDirectory() || st.isSymbolicLink()) {
    hold("checkpoint_segments_not_directory");
  }

  const descriptors = [];
  let expectedHeight = 0;
  let totalPrefixBytes = 0;
  let genesisRawSha256 = null;
  let frozenRawSha256 = null;

  for (let base = 0; base <= frozenHead; base += SEG_SPAN) {
    const name = String(base).padStart(8, "0");
    const file = path.join(segmentsDir, name, "blocks.bin");
    const fileSt = regularNonSymlink(file);
    const expectedTo = Math.min(base + SEG_SPAN - 1, frozenHead);
    const hash = crypto.createHash("sha256");
    const fd = fs.openSync(file, "r");
    let offset = 0;

    try {
      while (expectedHeight <= expectedTo) {
        const prefix = Buffer.allocUnsafe(4);
        if (fs.readSync(fd, prefix, 0, 4, offset) !== 4) {
          hold("checkpoint_torn_frame_prefix", {
            segment: name,
            height: expectedHeight,
          });
        }
        const length = prefix.readUInt32BE(0);
        if (length <= 0 || length > MAX_FRAME_BYTES) {
          hold("checkpoint_frame_length_invalid", {
            segment: name,
            height: expectedHeight,
            length,
          });
        }
        const body = Buffer.allocUnsafe(length);
        if (fs.readSync(fd, body, 0, length, offset + 4) !== length) {
          hold("checkpoint_torn_frame_body", {
            segment: name,
            height: expectedHeight,
          });
        }
        let block;
        try {
          block = JSON.parse(body.toString("utf8"));
        } catch (error) {
          hold("checkpoint_frame_invalid_json", {
            height: expectedHeight,
            message: String(error?.message || error),
          });
        }
        if (block?.number !== expectedHeight) {
          hold("checkpoint_height_sequence_mismatch", {
            expected: expectedHeight,
            observed: block?.number,
          });
        }

        const rawSha = sha256Hex(body);
        if (expectedHeight === 0) genesisRawSha256 = rawSha;
        if (expectedHeight === frozenHead) frozenRawSha256 = rawSha;

        hash.update(prefix);
        hash.update(body);
        offset += 4 + length;
        expectedHeight += 1;
      }
    } finally {
      fs.closeSync(fd);
    }

    if (offset !== Number(fileSt.size)) {
      hold("checkpoint_terminal_or_sealed_segment_has_trailing_bytes", {
        segment: name,
        prefix_bytes: offset,
        file_bytes: Number(fileSt.size),
      });
    }

    descriptors.push({
      segment: name,
      from: base,
      to: expectedTo,
      prefix_bytes: offset,
      prefix_sha256: hash.digest("hex"),
    });
    totalPrefixBytes += offset;
  }

  if (expectedHeight !== frozenHead + 1) {
    hold("checkpoint_block_count_mismatch", {
      expected: frozenHead + 1,
      observed: expectedHeight,
    });
  }

  const rootBody = {
    schema: "void_mainnet0_prefix_commitment_body_v1",
    chain_id: 2050,
    frozen_head: frozenHead,
    segment_count: descriptors.length,
    total_prefix_bytes: totalPrefixBytes,
    descriptors,
  };

  return {
    descriptors,
    segment_count: descriptors.length,
    total_prefix_bytes: totalPrefixBytes,
    block_count: expectedHeight,
    genesis_raw_sha256: genesisRawSha256,
    frozen_raw_sha256: frozenRawSha256,
    prefix_root: sha256Hex(
      Buffer.from(stableStringify(rootBody), "utf8"),
    ),
  };
}

function sameJson(a, b) {
  return stableStringify(a) === stableStringify(b);
}

export function sealHistoricalCartography(options) {
  const scanManifest = validateScanManifest(
    typeof options.scanManifest === "string"
      ? readJsonFile(path.resolve(options.scanManifest))
      : options.scanManifest,
  );
  const authority = validateAuthorityReceipt(
    typeof options.authorityReceipt === "string"
      ? readJsonFile(path.resolve(options.authorityReceipt))
      : options.authorityReceipt,
  );

  if (authority.frozen_head !== scanManifest.source.frozen_head) {
    hold("authority_scan_frozen_head_mismatch");
  }
  if (authority.block_count !== scanManifest.historical_blocks_scanned) {
    hold("authority_scan_block_count_mismatch");
  }

  if (
    options.expectedAuthorityId &&
    authority.authority_id !== options.expectedAuthorityId
  ) {
    hold("authority_id_expected_mismatch", {
      expected: options.expectedAuthorityId,
      actual: authority.authority_id,
    });
  }

  const semantics = computeClassificationSemantics(
    options.repoRoot || DEFAULT_REPO_ROOT,
  );
  if (
    options.expectedSemanticsRoot &&
    semantics.root !== options.expectedSemanticsRoot
  ) {
    hold("classification_semantics_root_mismatch", {
      expected: options.expectedSemanticsRoot,
      actual: semantics.root,
    });
  }

  const checkpointDir = path.resolve(String(options.checkpointDir || ""));
  if (!checkpointDir || !fs.existsSync(checkpointDir)) {
    hold("checkpoint_dir_missing");
  }
  const checkpointDescriptor = path.join(checkpointDir, "checkpoint.json");
  const checkpointDescriptorSha256 = hashFile(checkpointDescriptor);

  const prefix = checkpointPrefixCommitment(
    checkpointDir,
    authority.frozen_head,
  );

  if (
    prefix.prefix_root !== authority.prefix_root ||
    prefix.segment_count !== authority.segment_count ||
    prefix.total_prefix_bytes !== authority.total_prefix_bytes ||
    prefix.block_count !== authority.block_count ||
    prefix.genesis_raw_sha256 !== authority.genesis_raw_sha256 ||
    prefix.frozen_raw_sha256 !== authority.frozen_raw_sha256 ||
    !sameJson(prefix.descriptors, authority.descriptors)
  ) {
    hold("checkpoint_prefix_authority_mismatch", {
      authority_prefix_root: authority.prefix_root,
      checkpoint_prefix_root: prefix.prefix_root,
    });
  }

  const immutableRescan = scanHistoricalSource({
    sourceDir: checkpointDir,
    frozenHead: authority.frozen_head,
    sourceLabel: "authority-sealed-checkpoint",
    knownAnchors: options.knownAnchors,
    knownRawAnchors: options.knownRawAnchors,
  });

  if (immutableRescan.manifest.status !== "complete") {
    hold("immutable_checkpoint_rescan_not_complete", {
      holds: immutableRescan.manifest.holds,
    });
  }
  if (
    immutableRescan.manifest.complete_scan_digest !==
    scanManifest.complete_scan_digest
  ) {
    hold("immutable_checkpoint_scan_digest_mismatch", {
      original: scanManifest.complete_scan_digest,
      immutable: immutableRescan.manifest.complete_scan_digest,
    });
  }
  if (
    !sameJson(
      immutableRescan.manifest.class_counts,
      scanManifest.class_counts,
    ) ||
    !sameJson(
      immutableRescan.manifest.ranges,
      scanManifest.ranges,
    ) ||
    !sameJson(
      immutableRescan.manifest.exceptions,
      scanManifest.exceptions,
    ) ||
    !sameJson(
      immutableRescan.manifest.anchors,
      scanManifest.anchors,
    )
  ) {
    hold("immutable_checkpoint_classification_map_mismatch");
  }

  if (
    immutableRescan.manifest.source.checkpoint_descriptor_sha256 !==
    checkpointDescriptorSha256
  ) {
    hold("checkpoint_descriptor_binding_mismatch");
  }

  const publicAuthority = {
    source_authority_id: authority.authority_id,
    authority_basis: authority.authority_basis,
    frozen_head: authority.frozen_head,
    block_count: authority.block_count,
    segment_count: authority.segment_count,
    total_prefix_bytes: authority.total_prefix_bytes,
    prefix_root: authority.prefix_root,
    genesis_raw_sha256: authority.genesis_raw_sha256,
    frozen_raw_sha256: authority.frozen_raw_sha256,
    descriptors: authority.descriptors,
    independent_materializations: 2,
    independent_witness_repeat_passes: 2,
    exact_byte_prefix_match: true,
  };

  const withoutId = {
    schema: ACCEPTANCE_SCHEMA,
    marker: ACCEPTANCE_MARKER,
    version: ACCEPTANCE_VERSION,
    network: "VOID Mainnet-0",
    chain_id: 2050,
    status: "complete",
    scan: {
      manifest_id: scanManifest.manifest_id,
      scanner_version: scanManifest.scanner_version,
      source_id: scanManifest.source.source_id,
      frozen_head: scanManifest.source.frozen_head,
      historical_blocks_scanned:
        scanManifest.historical_blocks_scanned,
      complete_scan_digest: scanManifest.complete_scan_digest,
      class_counts: scanManifest.class_counts,
    },
    canonical_prefix_authority: publicAuthority,
    immutable_snapshot: {
      kind: "blocks_only_checkpoint_v1",
      checkpoint_descriptor_sha256: checkpointDescriptorSha256,
      checkpoint_source_id:
        immutableRescan.manifest.source.source_id,
      checkpoint_prefix_root: prefix.prefix_root,
      immutable_rescan_manifest_id:
        immutableRescan.manifest.manifest_id,
      immutable_rescan_complete_scan_digest:
        immutableRescan.manifest.complete_scan_digest,
    },
    classification_semantics: semantics,
    acceptance_contract: {
      canonical_prefix_independently_witnessed: true,
      immutable_snapshot_rescan_equal: true,
      classification_semantics_content_bound: true,
      numeric_count_conservation_revalidated: true,
      append_authority: false,
      validator_authority: false,
      runtime_authority: false,
      canonical_bytes_modified: 0,
      modern_validator_modified: false,
    },
  };

  return {
    ...withoutId,
    acceptance_id:
      ACCEPTANCE_ID_PREFIX +
      sha256Hex(Buffer.from(stableStringify(withoutId), "utf8")),
  };
}

export function writeAcceptanceExclusive(output, acceptance) {
  const destination = path.resolve(output);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(
    destination,
    `${stableStringify(acceptance)}\n`,
    { flag: "wx", mode: 0o600 },
  );
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) hold("missing_cli_value", { arg });
      return argv[index];
    };

    if (arg === "--scan-manifest") options.scanManifest = next();
    else if (arg === "--authority-receipt") {
      options.authorityReceipt = next();
    } else if (arg === "--checkpoint-dir") {
      options.checkpointDir = next();
    } else if (arg === "--repo-root") {
      options.repoRoot = next();
    } else if (arg === "--expected-authority-id") {
      options.expectedAuthorityId = next();
    } else if (arg === "--expected-semantics-root") {
      options.expectedSemanticsRoot = next();
    } else if (arg === "--output") options.output = next();
    else if (arg === "--help" || arg === "-h") options.help = true;
    else hold("unknown_cli_argument", { arg });
  }
  return options;
}

function usage() {
  return [
    "Usage: node scripts/seal_mainnet0_historical_cartography_v1_2.mjs \\",
    "  --scan-manifest /path/to/cartography-v1_1.json \\",
    "  --authority-receipt /path/to/independent-prefix-authority.json \\",
    "  --checkpoint-dir /path/to/verified/blocks-only-checkpoint \\",
    "  --repo-root /path/to/exact/reviewed/repo \\",
    "  --output /path/to/cartography-acceptance-v1.json",
    "",
    "Optional:",
    "  --expected-authority-id voidm0auth1_<sha256>",
    "  --expected-semantics-root <sha256>",
  ].join("\n");
}

async function cli() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (
    !options.scanManifest ||
    !options.authorityReceipt ||
    !options.checkpointDir ||
    !options.output
  ) {
    console.error(usage());
    hold("required_cli_argument_missing");
  }

  try {
    const acceptance = sealHistoricalCartography(options);
    writeAcceptanceExclusive(options.output, acceptance);
    console.log(`${ACCEPTANCE_MARKER}_GREEN`);
    console.log(`acceptance_id=${acceptance.acceptance_id}`);
    console.log(
      `source_authority_id=${acceptance.canonical_prefix_authority.source_authority_id}`,
    );
    console.log(
      `prefix_root=${acceptance.canonical_prefix_authority.prefix_root}`,
    );
    console.log(
      `classification_semantics_root=${acceptance.classification_semantics.root}`,
    );
    console.log(
      `complete_scan_digest=${acceptance.scan.complete_scan_digest}`,
    );
    console.log(
      `checkpoint_descriptor_sha256=${acceptance.immutable_snapshot.checkpoint_descriptor_sha256}`,
    );
    console.log("canonical_prefix_independently_witnessed=true");
    console.log("immutable_snapshot_rescan_equal=true");
    console.log("classification_semantics_content_bound=true");
    console.log("append_authority=false");
    console.log("validator_authority=false");
    console.log("runtime_authority=false");
  } catch (error) {
    if (error instanceof CartographyAcceptanceHold) {
      console.error(`${ACCEPTANCE_MARKER}_HOLD: ${error.reason}`);
      console.error(stableStringify({
        schema: "void_mainnet0_historical_cartography_acceptance_hold_v1",
        status: "hold",
        reason: error.reason,
        detail: error.detail,
      }));
      process.exitCode = 2;
      return;
    }
    throw error;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  cli().catch((error) => {
    console.error(
      `${ACCEPTANCE_MARKER}_FAIL: ${String(error?.stack || error)}`,
    );
    process.exit(1);
  });
}
