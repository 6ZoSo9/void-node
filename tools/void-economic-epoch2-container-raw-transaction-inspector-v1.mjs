#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  inspectVoidEconomicEpoch2ExplicitRawTransactionV1,
} from "./void-economic-epoch2-explicit-raw-transaction-inspector-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_CONTAINER_RAW_TRANSACTION_INSPECTOR_V1 =
  "VOID_ECONOMIC_EPOCH2_CONTAINER_RAW_TRANSACTION_INSPECTOR_V1";
export const VOID_ECONOMIC_EPOCH2_CONTAINER_RAW_TRANSACTION_INSPECTOR_CONFIRMATION_V1 =
  "inspectApprovedVoidContainerRawTransaction";

const MAX_CONTAINER_BYTES = 2 * 1024 * 1024;
const ALLOWED_FIELDS = new Set(["signed_transaction", "signed_serialized_hex"]);
const REGISTRY_PATH =
  "ops/mainnet0/economic-epoch2-known-signed-transaction-lineages-v1.json";
const NONCE_PATH =
  "ops/mainnet0/economic-epoch2-account-nonce-continuity-candidate-v1.json";
const REGISTRY_GIT_BLOB_SHA1 =
  "f96d7d4d5857a33bc292dce677678db026aabf2f";
const NONCE_GIT_BLOB_SHA1 =
  "83191d30131a2c99ef0cf51e43d2954fc34ffd06";

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
function readOwnedJson(file) {
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
  if (stat.size <= 0 || stat.size > MAX_CONTAINER_BYTES) {
    hold("explicit_file_size_out_of_bounds", {
      path: resolved,
      size_bytes: stat.size,
      maximum_bytes: MAX_CONTAINER_BYTES,
    });
  }
  let bytes;
  try {
    bytes = fs.readFileSync(resolved);
  } catch {
    hold("explicit_file_content_read_failed", { path: resolved });
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    hold("explicit_file_json_invalid");
  }
  if (!value || Array.isArray(value) || typeof value !== "object") {
    hold("explicit_file_json_top_level_object_required");
  }
  return {
    path: resolved,
    basename: path.basename(resolved),
    bytes,
    value,
  };
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
function parseArgs(argv) {
  const out = { file: "", field: "", apply: false, confirmation: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--file") out.file = argv[++i] ?? "";
    else if (key === "--field") out.field = argv[++i] ?? "";
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
      marker: VOID_ECONOMIC_EPOCH2_CONTAINER_RAW_TRANSACTION_INSPECTOR_V1,
      status: "PLAN_READY",
      allowed_top_level_fields: [...ALLOWED_FIELDS],
      exact_operator_json_file_only: true,
      raw_transaction_read_on_apply: true,
      raw_transaction_printed: false,
      raw_transaction_persisted: false,
      required_confirmation:
        VOID_ECONOMIC_EPOCH2_CONTAINER_RAW_TRANSACTION_INSPECTOR_CONFIRMATION_V1,
    }, null, 2));
    return;
  }
  if (
    args.confirmation !==
    VOID_ECONOMIC_EPOCH2_CONTAINER_RAW_TRANSACTION_INSPECTOR_CONFIRMATION_V1
  ) hold("explicit_confirmation_required");
  if (!ALLOWED_FIELDS.has(args.field)) {
    hold("raw_transaction_field_not_allowlisted", { field: args.field });
  }

  const selected = readOwnedJson(args.file);
  if (!Object.hasOwn(selected.value, args.field)) {
    hold("raw_transaction_field_missing", { field: args.field });
  }
  const raw = selected.value[args.field];
  if (typeof raw !== "string") {
    hold("raw_transaction_field_not_string", { field: args.field });
  }

  const registry = readCanonicalJson(REGISTRY_PATH, REGISTRY_GIT_BLOB_SHA1);
  const nonceCandidate = readCanonicalJson(NONCE_PATH, NONCE_GIT_BLOB_SHA1);
  const inspected = inspectVoidEconomicEpoch2ExplicitRawTransactionV1({
    rawTransaction: raw,
    registry,
    nonceCandidate,
  });

  console.log(VOID_ECONOMIC_EPOCH2_CONTAINER_RAW_TRANSACTION_INSPECTOR_V1);
  console.log("file=" + selected.path);
  console.log("basename=" + selected.basename);
  console.log("field=" + args.field);
  console.log("container_sha256=" + sha256Bytes(selected.bytes));
  console.log("raw_transaction_field_sha256=" + sha256Bytes(Buffer.from(raw, "utf8")));
  console.log("raw_transaction_length=" + raw.length);
  console.log("status=" + inspected.status);
  console.log("chain_id=" + inspected.chain_id);
  console.log("transaction_hash=" + inspected.transaction_hash);
  console.log("signer_address=" + inspected.signer_address);
  console.log("transaction_nonce=" + inspected.transaction_nonce);
  console.log("frozen_final_nonce=" + String(inspected.frozen_final_nonce));
  console.log("known_repository_lineage=" + inspected.known_repository_lineage);
  console.log("known_repository_lineage_id=" + String(inspected.known_repository_lineage_id));
  console.log("replay_staleness_proven=" + inspected.replay_staleness_proven);
  console.log("requires_operator_followup=" + inspected.requires_operator_followup);
  console.log("raw_transaction_printed=false");
  console.log("raw_transaction_persisted=false");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("authoritative_chain2050_write=false");
  console.log("pending_legacy_signed_transaction_census_complete=false");
  console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
  console.log("cross_epoch_replay_protection_proven=false");
  console.log(VOID_ECONOMIC_EPOCH2_CONTAINER_RAW_TRANSACTION_INSPECTOR_V1 + "_GREEN");
}
try {
  main();
} catch (error) {
  const reason = error instanceof Hold ? error.reason : String(error?.reason || error?.message || error);
  const detail = error instanceof Hold && error.detail !== null
    ? " detail=" + JSON.stringify(error.detail)
    : "";
  console.error(
    VOID_ECONOMIC_EPOCH2_CONTAINER_RAW_TRANSACTION_INSPECTOR_V1 +
      "_HOLD reason=" + reason + detail,
  );
  process.exitCode = 2;
}
