#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

export const VOID_ECONOMIC_EPOCH2_CANDIDATE_CONTAINER_STRUCTURE_INSPECTOR_V1 =
  "VOID_ECONOMIC_EPOCH2_CANDIDATE_CONTAINER_STRUCTURE_INSPECTOR_V1";
export const VOID_ECONOMIC_EPOCH2_CANDIDATE_CONTAINER_STRUCTURE_INSPECTOR_CONFIRMATION_V1 =
  "inspectApprovedVoidCandidateContainerStructure";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_JSON_NODES = 10_000;
const MAX_ZIP_ENTRIES = 512;

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
    if (stat.isSymbolicLink()) hold("symlink_path_rejected", { path: cursor });
  }
  return resolved;
}
function readExactOwnedFile(file) {
  if (typeof file !== "string" || !path.isAbsolute(file)) {
    hold("explicit_file_must_be_absolute");
  }
  const resolved = assertNoSymlinkAncestors(file);
  let stat;
  try {
    stat = fs.lstatSync(resolved);
  } catch {
    hold("explicit_file_metadata_read_failed", { path: resolved });
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    hold("explicit_file_not_direct_regular_file", { path: resolved });
  }
  const uid = currentUid();
  if (uid !== null && stat.uid !== uid) {
    hold("explicit_file_owner_mismatch", { path: resolved });
  }
  if (stat.size <= 0 || stat.size > MAX_FILE_BYTES) {
    hold("explicit_file_size_out_of_bounds", {
      path: resolved,
      size_bytes: stat.size,
      maximum_bytes: MAX_FILE_BYTES,
    });
  }
  let bytes;
  try {
    bytes = fs.readFileSync(resolved);
  } catch {
    hold("explicit_file_content_read_failed", { path: resolved });
  }
  return { file_path: resolved, basename: path.basename(resolved), bytes };
}
function nameHints(key) {
  const lower = String(key).toLowerCase();
  return {
    raw_transaction_name_hint:
      /raw.*transaction|transaction.*raw|raw_tx|signed.*transaction|transaction.*bytes|serialized.*transaction/.test(lower),
    credential_name_hint:
      /private.?key|mnemonic|keystore|seed.?phrase|credential|secret/.test(lower),
  };
}
function describeJson(value) {
  const rows = [];
  let nodes = 0;
  const visit = (current, p, keyName = "") => {
    nodes += 1;
    if (nodes > MAX_JSON_NODES) hold("json_node_count_exceeded");
    const hints = nameHints(keyName);
    if (current === null) {
      rows.push({ path: p, type: "null", ...hints });
      return;
    }
    if (Array.isArray(current)) {
      rows.push({ path: p, type: "array", length: current.length, ...hints });
      for (let i = 0; i < current.length; i += 1) {
        visit(current[i], p + "[" + i + "]", keyName);
      }
      return;
    }
    if (typeof current === "object") {
      const keys = Object.keys(current).sort();
      rows.push({ path: p, type: "object", key_count: keys.length, ...hints });
      for (const key of keys) {
        visit(current[key], p + "." + key, key);
      }
      return;
    }
    if (typeof current === "string") {
      rows.push({ path: p, type: "string", length: current.length, ...hints });
      return;
    }
    if (typeof current === "number") {
      rows.push({ path: p, type: "number", ...hints });
      return;
    }
    if (typeof current === "boolean") {
      rows.push({ path: p, type: "boolean", ...hints });
      return;
    }
    rows.push({ path: p, type: typeof current, ...hints });
  };
  visit(value, "$", "");
  return rows;
}
function findEocd(bytes) {
  const min = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= min; i -= 1) {
    if (bytes.readUInt32LE(i) === 0x06054b50) return i;
  }
  hold("zip_eocd_not_found");
}
function describeZip(bytes) {
  const eocd = findEocd(bytes);
  const disk = bytes.readUInt16LE(eocd + 4);
  const startDisk = bytes.readUInt16LE(eocd + 6);
  const entriesDisk = bytes.readUInt16LE(eocd + 8);
  const entriesTotal = bytes.readUInt16LE(eocd + 10);
  const centralSize = bytes.readUInt32LE(eocd + 12);
  const centralOffset = bytes.readUInt32LE(eocd + 16);
  if (disk !== 0 || startDisk !== 0 || entriesDisk !== entriesTotal) {
    hold("zip_multidisk_unsupported");
  }
  if (entriesTotal === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    hold("zip64_unsupported");
  }
  if (entriesTotal > MAX_ZIP_ENTRIES) hold("zip_entry_count_exceeded");
  if (centralOffset + centralSize > bytes.length) hold("zip_central_directory_out_of_bounds");

  const entries = [];
  let cursor = centralOffset;
  for (let i = 0; i < entriesTotal; i += 1) {
    if (cursor + 46 > bytes.length || bytes.readUInt32LE(cursor) !== 0x02014b50) {
      hold("zip_central_directory_invalid", { entry_index: i });
    }
    const flags = bytes.readUInt16LE(cursor + 8);
    const compression = bytes.readUInt16LE(cursor + 10);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const uncompressedSize = bytes.readUInt32LE(cursor + 24);
    const nameLen = bytes.readUInt16LE(cursor + 28);
    const extraLen = bytes.readUInt16LE(cursor + 30);
    const commentLen = bytes.readUInt16LE(cursor + 32);
    const end = cursor + 46 + nameLen + extraLen + commentLen;
    if (end > bytes.length) hold("zip_central_directory_invalid", { entry_index: i });
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLen).toString("utf8");
    entries.push({
      name,
      compressed_size: compressedSize,
      uncompressed_size: uncompressedSize,
      compression_method: compression,
      encrypted: (flags & 1) !== 0,
      ...nameHints(name),
    });
    cursor = end;
  }
  return entries;
}
function parseArgs(argv) {
  const out = { file: "", apply: false, confirmation: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--file") out.file = argv[++i] ?? "";
    else if (key === "--apply") out.apply = true;
    else if (key === "--confirmation") out.confirmation = argv[++i] ?? "";
    else if (key === "--help") out.help = true;
    else hold("unknown_argument", { key });
  }
  return out;
}
export function inspectCandidateContainerStructureV1({ filePath, bytes }) {
  const lower = path.basename(filePath).toLowerCase();
  if (lower.endsWith(".json")) {
    let value;
    try {
      value = JSON.parse(bytes.toString("utf8"));
    } catch {
      hold("json_parse_failed");
    }
    const rows = describeJson(value);
    return {
      container_kind: "json",
      json_structure: rows,
      raw_transaction_name_hint_paths: rows
        .filter((row) => row.raw_transaction_name_hint)
        .map((row) => row.path),
      credential_name_hint_paths: rows
        .filter((row) => row.credential_name_hint)
        .map((row) => row.path),
      candidate_values_printed: false,
      archive_entry_content_extracted: false,
    };
  }
  if (lower.endsWith(".zip")) {
    const entries = describeZip(bytes);
    return {
      container_kind: "zip",
      zip_entries: entries,
      raw_transaction_name_hint_entries: entries
        .filter((row) => row.raw_transaction_name_hint)
        .map((row) => row.name),
      credential_name_hint_entries: entries
        .filter((row) => row.credential_name_hint)
        .map((row) => row.name),
      candidate_values_printed: false,
      archive_entry_content_extracted: false,
    };
  }
  hold("unsupported_container_extension");
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.apply) {
    console.log(JSON.stringify({
      marker: VOID_ECONOMIC_EPOCH2_CANDIDATE_CONTAINER_STRUCTURE_INSPECTOR_V1,
      status: "PLAN_READY",
      exact_operator_file_only: true,
      supported_extensions: [".json", ".zip"],
      candidate_file_content_read_on_apply: true,
      candidate_values_printed: false,
      archive_entry_content_extracted: false,
      required_confirmation:
        VOID_ECONOMIC_EPOCH2_CANDIDATE_CONTAINER_STRUCTURE_INSPECTOR_CONFIRMATION_V1,
    }, null, 2));
    return;
  }
  if (
    args.confirmation !==
    VOID_ECONOMIC_EPOCH2_CANDIDATE_CONTAINER_STRUCTURE_INSPECTOR_CONFIRMATION_V1
  ) hold("explicit_confirmation_required");
  const selected = readExactOwnedFile(args.file);
  const result = inspectCandidateContainerStructureV1({
    filePath: selected.file_path,
    bytes: selected.bytes,
  });
  console.log(VOID_ECONOMIC_EPOCH2_CANDIDATE_CONTAINER_STRUCTURE_INSPECTOR_V1);
  console.log("file=" + selected.file_path);
  console.log("basename=" + selected.basename);
  console.log("size_bytes=" + selected.bytes.length);
  console.log("candidate_file_content_read=true");
  console.log("candidate_values_printed=false");
  console.log("archive_entry_content_extracted=false");
  console.log("structure=" + JSON.stringify(result));
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("authoritative_chain2050_write=false");
  console.log("pending_legacy_signed_transaction_census_complete=false");
  console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
  console.log("cross_epoch_replay_protection_proven=false");
  console.log(VOID_ECONOMIC_EPOCH2_CANDIDATE_CONTAINER_STRUCTURE_INSPECTOR_V1 + "_GREEN");
}
try {
  main();
} catch (error) {
  const reason = error instanceof Hold ? error.reason : String(error?.message || error);
  const detail = error instanceof Hold && error.detail !== null
    ? " detail=" + JSON.stringify(error.detail)
    : "";
  console.error(
    VOID_ECONOMIC_EPOCH2_CANDIDATE_CONTAINER_STRUCTURE_INSPECTOR_V1 +
      "_HOLD reason=" + reason + detail,
  );
  process.exitCode = 2;
}
