#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1 =
  "VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1";
export const VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_CONFIRMATION_V1 =
  "discoverVoidSignedArtifactCandidates";

export const VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    explicit_operator_paths_only: true,
    scanned_file_content_read: false,
    metadata_read: true,
    local_receipt_write: true,
    arbitrary_home_scan: false,
    credential_content_access: false,
    wallet_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    replay_gate_promotion: false,
    funds_movement: false,
  });

const MAX_ROOTS = 16;
const MAX_EXPLICIT_FILES = 256;
const MAX_DISCOVERED_FILES = 10_000;
const MAX_DEPTH = 12;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const KNOWN_REPOSITORY_LINEAGE_COUNT = 20;
const KNOWN_REPOSITORY_LINEAGE_SET_SHA256 =
  "84c3b99115d6dbc9f5ec909c190a1c69e7e692d8123c241f66dac79e66a5741d";

export class VoidEconomicEpoch2SignedArtifactMetadataCensusHoldV1 extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.name = "VoidEconomicEpoch2SignedArtifactMetadataCensusHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail = null) {
  throw new VoidEconomicEpoch2SignedArtifactMetadataCensusHoldV1(
    reason,
    detail,
  );
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
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
      hold("path_component_missing", { path: cursor });
    }
    if (stat.isSymbolicLink()) {
      hold("symlink_path_rejected", { path: cursor });
    }
  }
  return resolved;
}

function currentUid() {
  return typeof process.getuid === "function" ? process.getuid() : null;
}

function assertOwned(stat, target) {
  const uid = currentUid();
  if (uid !== null && stat.uid !== uid) {
    hold("path_owner_mismatch", { path: target });
  }
}

function isVoidOwnedRootName(resolved) {
  const segments = resolved
    .split(path.sep)
    .filter(Boolean)
    .map((segment) => segment.toLowerCase());
  return segments.some(
    (segment) =>
      segment === "void" ||
      segment.startsWith("void-") ||
      segment.startsWith("void_") ||
      segment.startsWith("void.") ||
      segment.startsWith(".void"),
  );
}

function validateRoot(raw) {
  if (typeof raw !== "string" || !path.isAbsolute(raw)) {
    hold("root_must_be_absolute");
  }
  const resolved = assertNoSymlinkAncestors(raw);
  const home = path.resolve(os.homedir());
  if (
    resolved === path.parse(resolved).root ||
    resolved === home ||
    resolved === path.join(home, "Downloads")
  ) {
    hold("broad_root_forbidden", { path: resolved });
  }
  if (!isVoidOwnedRootName(resolved)) {
    hold("root_not_void_owned_by_name", { path: resolved });
  }
  const stat = fs.lstatSync(resolved);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    hold("root_not_direct_directory", { path: resolved });
  }
  assertOwned(stat, resolved);
  if (fs.realpathSync(resolved) !== resolved) {
    hold("root_realpath_mismatch", { path: resolved });
  }
  return resolved;
}

function validateExplicitFile(raw) {
  if (typeof raw !== "string" || !path.isAbsolute(raw)) {
    hold("explicit_file_must_be_absolute");
  }
  const resolved = assertNoSymlinkAncestors(raw);
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    hold("explicit_file_not_direct_regular_file", { path: resolved });
  }
  assertOwned(stat, resolved);
  if (fs.realpathSync(resolved) !== resolved) {
    hold("explicit_file_realpath_mismatch", { path: resolved });
  }
  return resolved;
}

function candidateNameHint(filePath) {
  const base = path.basename(filePath).toLowerCase();
  const hasVoid = base.includes("void") ||
    filePath.split(path.sep).some((segment) =>
      segment.toLowerCase().startsWith("void")
    );
  const hasTxWord =
    /(?:^|[-_.])(signed|transaction|tx|raw)(?:[-_.]|$)/i.test(base) ||
    /signed.*transaction|transaction.*signed|raw.*tx|tx.*raw/i.test(base);
  return hasVoid && hasTxWord;
}

function metadataForFile(filePath, sourceKind) {
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    hold("discovered_file_not_direct_regular_file", { path: filePath });
  }
  assertOwned(stat, filePath);
  return Object.freeze({
    source_kind: sourceKind,
    absolute_path: filePath,
    path_sha256: sha256Text(filePath),
    basename: path.basename(filePath),
    size_bytes: stat.size,
    mode_octal: (stat.mode & 0o777).toString(8).padStart(3, "0"),
    candidate_name_hint: candidateNameHint(filePath),
    content_read: false,
  });
}

function walkRoot(root, onFile) {
  let count = 0;
  const visit = (directory, depth) => {
    if (depth > MAX_DEPTH) {
      hold("maximum_scan_depth_exceeded", { path: directory });
    }
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        hold("symlink_descendant_rejected", { path: full });
      }
      if (entry.isDirectory()) {
        const stat = fs.lstatSync(full);
        assertOwned(stat, full);
        visit(full, depth + 1);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      count += 1;
      if (count > MAX_DISCOVERED_FILES) {
        hold("maximum_discovered_files_exceeded");
      }
      onFile(full);
    }
  };
  visit(root, 0);
  return count;
}

function uniqueSorted(values, reason) {
  const set = new Set(values);
  if (set.size !== values.length) hold(reason);
  return [...set].sort();
}

export function discoverVoidSignedArtifactMetadataV1({
  roots = [],
  files = [],
}) {
  if (
    !Array.isArray(roots) ||
    roots.length < 1 ||
    roots.length > MAX_ROOTS
  ) {
    hold("root_count_invalid");
  }
  if (
    !Array.isArray(files) ||
    files.length > MAX_EXPLICIT_FILES
  ) {
    hold("explicit_file_count_invalid");
  }

  const canonicalRoots = uniqueSorted(
    roots.map(validateRoot),
    "duplicate_root_rejected",
  );
  const canonicalFiles = uniqueSorted(
    files.map(validateExplicitFile),
    "duplicate_explicit_file_rejected",
  );

  const rows = [];
  const seen = new Set();

  for (const root of canonicalRoots) {
    walkRoot(root, (filePath) => {
      if (seen.has(filePath)) hold("duplicate_discovered_file");
      seen.add(filePath);
      rows.push(metadataForFile(filePath, "explicit_void_owned_root"));
    });
  }

  for (const filePath of canonicalFiles) {
    if (seen.has(filePath)) hold("explicit_file_already_in_root_scan");
    seen.add(filePath);
    rows.push(metadataForFile(filePath, "explicit_operator_file"));
  }

  rows.sort((a, b) => a.absolute_path.localeCompare(b.absolute_path));
  const candidateRows = rows.filter((row) => row.candidate_name_hint);

  const material = Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1,
    version: 1,
    roots: canonicalRoots,
    explicit_files: canonicalFiles,
    discovered_file_count: rows.length,
    candidate_name_hint_count: candidateRows.length,
    files: rows,
    known_repository_lineage_count: KNOWN_REPOSITORY_LINEAGE_COUNT,
    known_repository_lineage_set_sha256:
      KNOWN_REPOSITORY_LINEAGE_SET_SHA256,
  });

  return Object.freeze({
    ...material,
    census_material_sha256: sha256Text(JSON.stringify(material)),
    status: "METADATA_CENSUS_READY_OPERATOR_REVIEW_REQUIRED",
    scanned_file_content_read: false,
    arbitrary_home_scan_performed: false,
    pending_legacy_signed_transaction_census_complete: false,
    privileged_signer_nonce_or_key_replay_fence_proven: false,
    cross_epoch_replay_protection_proven: false,
    next_gate:
      "operator_review_then_explicit_exact_raw_transaction_inspection_v1",
    authority:
      VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_AUTHORITY_V1,
  });
}

function parseArgs(argv) {
  const args = {
    roots: [],
    files: [],
    apply: false,
    confirmation: "",
    out: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--root") {
      if (!argv[index + 1]) hold("root_value_missing");
      args.roots.push(argv[++index]);
    } else if (key === "--file") {
      if (!argv[index + 1]) hold("file_value_missing");
      args.files.push(argv[++index]);
    } else if (key === "--out") {
      if (!argv[index + 1]) hold("out_value_missing");
      args.out = argv[++index];
    } else if (key === "--apply") {
      args.apply = true;
    } else if (key === "--confirmation") {
      if (!argv[index + 1]) hold("confirmation_value_missing");
      args.confirmation = argv[++index];
    } else if (key === "--help") {
      args.help = true;
    } else {
      hold("unknown_argument", { key });
    }
  }
  return args;
}

function atomicPrivateCreate(outputPath, value) {
  const resolved = path.resolve(outputPath);
  const parent = path.dirname(resolved);
  assertNoSymlinkAncestors(parent);
  const parentStat = fs.lstatSync(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    hold("output_parent_invalid");
  }
  assertOwned(parentStat, parent);

  const bytes = Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
  if (bytes.length > MAX_OUTPUT_BYTES) hold("output_receipt_too_large");
  const fd = fs.openSync(resolved, "wx", 0o600);
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  return resolved;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      [
        "VOID epoch2 signed-artifact metadata census v1",
        "",
        "Plan:",
        "  node tools/void-economic-epoch2-signed-artifact-metadata-census-v1.mjs --root /absolute/void-owned-directory",
        "",
        "Apply:",
        "  node tools/void-economic-epoch2-signed-artifact-metadata-census-v1.mjs \\",
        "    --root /absolute/void-owned-directory \\",
        "    [--file /absolute/explicit-file] \\",
        "    --out /absolute/private-receipt.json \\",
        "    --apply --confirmation discoverVoidSignedArtifactCandidates",
        "",
      ].join("\n"),
    );
    return;
  }

  if (!args.apply) {
    process.stdout.write(
      JSON.stringify(
        {
          marker: VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1,
          status: "PLAN_READY",
          required_confirmation:
            VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_CONFIRMATION_V1,
          explicit_void_owned_roots_required: true,
          broad_home_or_downloads_root_forbidden: true,
          explicit_files_supported: true,
          scanned_file_content_read: false,
          pending_legacy_signed_transaction_census_complete: false,
          authority:
            VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_AUTHORITY_V1,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  if (
    args.confirmation !==
    VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_CONFIRMATION_V1
  ) {
    hold("explicit_confirmation_required");
  }
  if (!args.out) hold("output_path_required");

  const receipt = discoverVoidSignedArtifactMetadataV1({
    roots: args.roots,
    files: args.files,
  });
  const output = atomicPrivateCreate(args.out, receipt);
  process.stdout.write(
    JSON.stringify(
      {
        marker: receipt.marker,
        status: receipt.status,
        output_path: output,
        census_material_sha256: receipt.census_material_sha256,
        discovered_file_count: receipt.discovered_file_count,
        candidate_name_hint_count: receipt.candidate_name_hint_count,
        scanned_file_content_read: false,
        pending_legacy_signed_transaction_census_complete: false,
        next_gate: receipt.next_gate,
      },
      null,
      2,
    ) + "\n",
  );
}

const invoked = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;

if (invoked) {
  main().catch((error) => {
    const reason =
      error instanceof VoidEconomicEpoch2SignedArtifactMetadataCensusHoldV1
        ? error.reason
        : String(error?.message || error);
    const detail =
      error instanceof VoidEconomicEpoch2SignedArtifactMetadataCensusHoldV1 &&
      error.detail !== null
        ? " detail=" + JSON.stringify(error.detail)
        : "";
    process.stderr.write(
      VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1 +
        "_HOLD reason=" + reason + detail + "\n",
    );
    process.exitCode = 2;
  });
}
