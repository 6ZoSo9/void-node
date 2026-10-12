#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  VOID_PRIVATE_CHAIN2050_CHECKPOINT_DELIVERY_BINDING_RPC_METHODS_V1,
  VOID_PRIVATE_CHAIN2050_CHECKPOINT_MARKER_V1,
  VOID_PRIVATE_CHAIN2050_CHECKPOINT_RPC_METHODS_V1,
  VOID_PRIVATE_CHAIN2050_CHECKPOINT_VERSION_V1,
  VOID_PRIVATE_CHAIN2050_EXPECTED_CHAIN_ID_V1,
} from "./void-private-chain2050-checkpoint-v1.mjs";

export const VOID_PRIVATE_CHAIN2050_STARTUP_SELECTION_MARKER_V1 =
  "VOID_PRIVATE_CHAIN2050_STARTUP_SELECTION_V1";
export const VOID_PRIVATE_CHAIN2050_STARTUP_SELECTION_VERSION_V1 = 1;
export const VOID_PRIVATE_CHAIN2050_BASELINE_FORMATS_V1 = Object.freeze([
  "anvil_cli_state_json",
  "anvil_dump_state_hex",
]);

const SHA256_RE = /^[0-9a-f]{64}$/;
const BLOCK_HASH_RE = /^0x[0-9a-f]{64}$/;
const HEX_DUMP_RE = /^0x[0-9a-fA-F]+$/;
const CHECKPOINT_MANIFEST_SUFFIX = ".manifest.json";
const CHECKPOINT_STATE_SUFFIX = ".anvil-dump-state.hex";
const CHECKPOINT_COMPLETE_SUFFIX = ".complete-v1";
const CHECKPOINT_STEM_RE = /^chain2050-block-(0|[1-9][0-9]*)-([0-9a-f]{64})$/;
const DEFAULT_MAX_MANIFEST_BYTES = 64 * 1024;
const DEFAULT_MAX_STATE_BYTES = 768 * 1024 * 1024;
const DEFAULT_MAX_CHECKPOINT_ROOT_ENTRIES = 1536;

export class VoidPrivateChain2050StartupSelectionHoldV1 extends Error {
  constructor(reason) {
    super(reason);
    this.name = "VoidPrivateChain2050StartupSelectionHoldV1";
    this.reason = reason;
  }
}

function hold(reason) {
  throw new VoidPrivateChain2050StartupSelectionHoldV1(reason);
}

export function canonicalVoidPrivateChain2050StartupSelectionV1(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalVoidPrivateChain2050StartupSelectionV1).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalVoidPrivateChain2050StartupSelectionV1(value[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Text(value) {
  return sha256Buffer(Buffer.from(value, "utf8"));
}

function exactKeys(value, expected, reason) {
  if (!value || typeof value !== "object" || Array.isArray(value)) hold(reason);
  const observed = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(observed) !== JSON.stringify(wanted)) hold(reason);
}

function safeBlockNumber(value, reason) {
  if (!Number.isSafeInteger(value) || value < 0) hold(reason);
  return value;
}

function exactBlockHash(value, reason) {
  if (typeof value !== "string" || !BLOCK_HASH_RE.test(value)) hold(reason);
  return value;
}

function exactSha256(value, reason) {
  if (typeof value !== "string" || !SHA256_RE.test(value)) hold(reason);
  return value;
}

function canonicalIsoTimestamp(value, reason) {
  if (typeof value !== "string") hold(reason);
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) hold(reason);
  return value;
}

function assertNoSymlinkComponents(pathname, reason) {
  const resolved = path.resolve(pathname);
  const parsed = path.parse(resolved);
  let current = parsed.root;
  for (const part of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) continue;
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) hold(reason);
  }
}

function assertOwned(stat, reason) {
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
    hold(reason);
  }
}

function requireAbsoluteRegularFile(
  pathname,
  {
    mode = null,
    maxBytes = null,
    rejectWritable = false,
    reason = "file_invalid",
  } = {},
) {
  if (typeof pathname !== "string" || !path.isAbsolute(pathname)) {
    hold(`${reason}_path`);
  }
  assertNoSymlinkComponents(pathname, `${reason}_path_symlink_component`);
  let stat;
  try {
    stat = fs.lstatSync(pathname);
  } catch {
    hold(`${reason}_missing`);
  }
  if (!stat.isFile() || stat.isSymbolicLink()) hold(`${reason}_unsafe`);
  assertOwned(stat, `${reason}_owner`);
  if (mode !== null && (stat.mode & 0o777) !== mode) hold(`${reason}_mode`);
  if (rejectWritable && (stat.mode & 0o022) !== 0) hold(`${reason}_writable`);
  if (maxBytes !== null && stat.size > maxBytes) hold(`${reason}_too_large`);
  return stat;
}

function requireCheckpointRoot(checkpointRoot, maxEntries) {
  if (typeof checkpointRoot !== "string" || !path.isAbsolute(checkpointRoot)) {
    hold("checkpoint_root_path_invalid");
  }
  assertNoSymlinkComponents(checkpointRoot, "checkpoint_root_path_symlink_component");
  if (!fs.existsSync(checkpointRoot)) return false;
  const stat = fs.lstatSync(checkpointRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink()) hold("checkpoint_root_unsafe");
  assertOwned(stat, "checkpoint_root_owner_invalid");
  if ((stat.mode & 0o777) !== 0o700) hold("checkpoint_root_mode_invalid");
  const entries = fs.readdirSync(checkpointRoot, { withFileTypes: true });
  if (entries.length > maxEntries) hold("checkpoint_root_entry_limit_exceeded");
  return entries;
}

function normalizeBaseline(baseline, maxStateBytes) {
  exactKeys(
    baseline,
    [
      "chain_id",
      "block_number",
      "block_hash",
      "state_sha256",
      "state_file",
      "state_format",
    ],
    "baseline_schema_invalid",
  );
  if (baseline.chain_id !== VOID_PRIVATE_CHAIN2050_EXPECTED_CHAIN_ID_V1) {
    hold("baseline_chain_id_mismatch");
  }
  const blockNumber = safeBlockNumber(
    baseline.block_number,
    "baseline_block_number_invalid",
  );
  const blockHash = exactBlockHash(
    baseline.block_hash,
    "baseline_block_hash_invalid",
  );
  const stateSha256 = exactSha256(
    baseline.state_sha256,
    "baseline_state_sha256_invalid",
  );
  if (!VOID_PRIVATE_CHAIN2050_BASELINE_FORMATS_V1.includes(baseline.state_format)) {
    hold("baseline_state_format_invalid");
  }
  requireAbsoluteRegularFile(baseline.state_file, {
    maxBytes: maxStateBytes,
    rejectWritable: true,
    reason: "baseline_state_file",
  });
  const stateBuffer = fs.readFileSync(baseline.state_file);
  const observedSha256 = sha256Buffer(stateBuffer);
  if (observedSha256 !== stateSha256) hold("baseline_state_sha256_mismatch");
  const stateText = stateBuffer.toString("utf8");
  if (baseline.state_format === "anvil_cli_state_json") {
    try {
      JSON.parse(stateText);
    } catch {
      hold("baseline_state_format_content_invalid");
    }
  } else if (
    stateText.length < 4 ||
    !HEX_DUMP_RE.test(stateText) ||
    stateText.length % 2 !== 0
  ) {
    hold("baseline_state_format_content_invalid");
  }
  return Object.freeze({
    kind: "baseline",
    chain_id: VOID_PRIVATE_CHAIN2050_EXPECTED_CHAIN_ID_V1,
    block_number: blockNumber,
    block_hash: blockHash,
    state_sha256: stateSha256,
    state_file: baseline.state_file,
    state_format: baseline.state_format,
  });
}

function checkpointMaterial(manifest) {
  const deliveryBound =
    Object.prototype.hasOwnProperty.call(manifest, "delivery_block_number") &&
    Object.prototype.hasOwnProperty.call(manifest, "delivery_block_hash") &&
    Object.prototype.hasOwnProperty.call(
      manifest,
      "delivery_block_hash_verified",
    );
  return {
    marker: manifest.marker,
    version: manifest.version,
    chain_id: manifest.chain_id,
    block_number: manifest.block_number,
    block_hash: manifest.block_hash,
    ...(deliveryBound
      ? {
          delivery_block_number: manifest.delivery_block_number,
          delivery_block_hash: manifest.delivery_block_hash,
          delivery_block_hash_verified: manifest.delivery_block_hash_verified,
        }
      : {}),
    state_sha256: manifest.state_sha256,
    state_bytes: manifest.state_bytes,
    rpc_methods_used: manifest.rpc_methods_used,
    rpc_unlocked_account_count: manifest.rpc_unlocked_account_count,
    chain_mutation_performed: manifest.chain_mutation_performed,
    transaction_broadcast_performed: manifest.transaction_broadcast_performed,
    wallet_access_performed: manifest.wallet_access_performed,
    credential_access_performed: manifest.credential_access_performed,
    money_movement_performed: manifest.money_movement_performed,
  };
}

function validateCheckpointManifest(
  checkpointRoot,
  manifestPath,
  expectedStem,
  maxManifestBytes,
  maxStateBytes,
) {
  requireAbsoluteRegularFile(manifestPath, {
    mode: 0o600,
    maxBytes: maxManifestBytes,
    reason: "checkpoint_manifest",
  });
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    hold("checkpoint_manifest_json_invalid");
  }
  const deliveryKeys = [
    "delivery_block_number",
    "delivery_block_hash",
    "delivery_block_hash_verified",
  ];
  const deliveryKeyCount = deliveryKeys.filter((key) =>
    Object.prototype.hasOwnProperty.call(manifest, key)
  ).length;
  if (deliveryKeyCount !== 0 && deliveryKeyCount !== deliveryKeys.length) {
    hold("checkpoint_delivery_binding_schema_invalid");
  }
  const deliveryBound = deliveryKeyCount === deliveryKeys.length;
  exactKeys(
    manifest,
    [
      "marker",
      "version",
      "chain_id",
      "block_number",
      "block_hash",
      ...(deliveryBound ? deliveryKeys : []),
      "state_sha256",
      "state_bytes",
      "rpc_methods_used",
      "rpc_unlocked_account_count",
      "chain_mutation_performed",
      "transaction_broadcast_performed",
      "wallet_access_performed",
      "credential_access_performed",
      "money_movement_performed",
      "captured_at",
      "checkpoint_id_sha256",
      "state_file",
    ],
    "checkpoint_manifest_schema_invalid",
  );
  if (
    manifest.marker !== VOID_PRIVATE_CHAIN2050_CHECKPOINT_MARKER_V1 ||
    manifest.version !== VOID_PRIVATE_CHAIN2050_CHECKPOINT_VERSION_V1 ||
    manifest.chain_id !== VOID_PRIVATE_CHAIN2050_EXPECTED_CHAIN_ID_V1
  ) {
    hold("checkpoint_manifest_identity_invalid");
  }
  const blockNumber = safeBlockNumber(
    manifest.block_number,
    "checkpoint_block_number_invalid",
  );
  const blockHash = exactBlockHash(
    manifest.block_hash,
    "checkpoint_block_hash_invalid",
  );
  if (deliveryBound) {
    const deliveryBlockNumber = safeBlockNumber(
      manifest.delivery_block_number,
      "checkpoint_delivery_block_number_invalid",
    );
    exactBlockHash(
      manifest.delivery_block_hash,
      "checkpoint_delivery_block_hash_invalid",
    );
    if (
      deliveryBlockNumber <= 0 ||
      deliveryBlockNumber > blockNumber ||
      manifest.delivery_block_hash_verified !== true
    ) {
      hold("checkpoint_delivery_binding_invalid");
    }
  }
  const stateSha256 = exactSha256(
    manifest.state_sha256,
    "checkpoint_state_sha256_invalid",
  );
  if (!Number.isSafeInteger(manifest.state_bytes) || manifest.state_bytes < 4) {
    hold("checkpoint_state_bytes_invalid");
  }
  if (
    JSON.stringify(manifest.rpc_methods_used) !==
    JSON.stringify(
      deliveryBound
        ? VOID_PRIVATE_CHAIN2050_CHECKPOINT_DELIVERY_BINDING_RPC_METHODS_V1
        : VOID_PRIVATE_CHAIN2050_CHECKPOINT_RPC_METHODS_V1,
    )
  ) {
    hold("checkpoint_rpc_method_contract_invalid");
  }
  if (
    manifest.rpc_unlocked_account_count !== 0 ||
    manifest.chain_mutation_performed !== false ||
    manifest.transaction_broadcast_performed !== false ||
    manifest.wallet_access_performed !== false ||
    manifest.credential_access_performed !== false ||
    manifest.money_movement_performed !== false
  ) {
    hold("checkpoint_authority_boundary_invalid");
  }
  canonicalIsoTimestamp(manifest.captured_at, "checkpoint_captured_at_invalid");
  const checkpointId = exactSha256(
    manifest.checkpoint_id_sha256,
    "checkpoint_id_invalid",
  );
  const expectedId = sha256Text(
    canonicalVoidPrivateChain2050StartupSelectionV1(checkpointMaterial(manifest)),
  );
  if (checkpointId !== expectedId) hold("checkpoint_id_mismatch");
  const expectedFromManifest = `chain2050-block-${blockNumber}-${checkpointId}`;
  if (expectedFromManifest !== expectedStem) hold("checkpoint_manifest_filename_mismatch");
  if (path.basename(manifestPath) !== `${expectedStem}${CHECKPOINT_MANIFEST_SUFFIX}`) {
    hold("checkpoint_manifest_filename_mismatch");
  }
  if (manifest.state_file !== `${expectedStem}${CHECKPOINT_STATE_SUFFIX}`) {
    hold("checkpoint_state_filename_mismatch");
  }
  const statePath = path.join(checkpointRoot, manifest.state_file);
  requireAbsoluteRegularFile(statePath, {
    mode: 0o600,
    maxBytes: maxStateBytes,
    reason: "checkpoint_state",
  });
  const dumpedState = fs.readFileSync(statePath, "utf8");
  if (
    dumpedState.length < 4 ||
    !HEX_DUMP_RE.test(dumpedState) ||
    dumpedState.length % 2 !== 0
  ) {
    hold("checkpoint_state_hex_invalid");
  }
  if (Buffer.byteLength(dumpedState, "utf8") !== manifest.state_bytes) {
    hold("checkpoint_state_bytes_mismatch");
  }
  if (sha256Text(dumpedState) !== stateSha256) {
    hold("checkpoint_state_sha256_mismatch");
  }
  return Object.freeze({
    kind: "checkpoint",
    chain_id: VOID_PRIVATE_CHAIN2050_EXPECTED_CHAIN_ID_V1,
    block_number: blockNumber,
    block_hash: blockHash,
    state_sha256: stateSha256,
    state_file: statePath,
    state_format: "anvil_dump_state_hex",
    checkpoint_id_sha256: checkpointId,
    captured_at: manifest.captured_at,
  });
}

function parseCheckpointEntryName(name) {
  let kind;
  let stem;
  if (name.endsWith(CHECKPOINT_MANIFEST_SUFFIX)) {
    kind = "manifest";
    stem = name.slice(0, -CHECKPOINT_MANIFEST_SUFFIX.length);
  } else if (name.endsWith(CHECKPOINT_STATE_SUFFIX)) {
    kind = "state";
    stem = name.slice(0, -CHECKPOINT_STATE_SUFFIX.length);
  } else if (name.endsWith(CHECKPOINT_COMPLETE_SUFFIX)) {
    kind = "complete";
    stem = name.slice(0, -CHECKPOINT_COMPLETE_SUFFIX.length);
  } else {
    hold("checkpoint_root_unrecognized_entry");
  }
  const match = CHECKPOINT_STEM_RE.exec(stem);
  if (!match) hold("checkpoint_root_entry_name_invalid");
  return { kind, stem, checkpointId: match[2] };
}

export function readVoidPrivateChain2050CheckpointCandidatesV1(
  checkpointRoot,
  {
    maxManifestBytes = DEFAULT_MAX_MANIFEST_BYTES,
    maxStateBytes = DEFAULT_MAX_STATE_BYTES,
    maxCheckpointEntries = DEFAULT_MAX_CHECKPOINT_ROOT_ENTRIES,
  } = {},
) {
  const entries = requireCheckpointRoot(checkpointRoot, maxCheckpointEntries);
  if (entries === false) {
    return Object.freeze({ candidates: [], incomplete_checkpoint_group_count: 0 });
  }

  const groups = new Map();
  for (const entry of entries) {
    const pathname = path.join(checkpointRoot, entry.name);
    if (entry.isSymbolicLink()) hold("checkpoint_root_entry_symlink_forbidden");
    if (!entry.isFile()) hold("checkpoint_root_entry_type_invalid");
    const parsed = parseCheckpointEntryName(entry.name);
    const group = groups.get(parsed.stem) || { checkpointId: parsed.checkpointId };
    if (group[parsed.kind]) hold("checkpoint_root_duplicate_entry");
    group[parsed.kind] = pathname;
    groups.set(parsed.stem, group);
  }

  const candidates = [];
  let incompleteCheckpointGroupCount = 0;
  for (const stem of [...groups.keys()].sort()) {
    const group = groups.get(stem);
    if (group.complete) {
      if (!group.manifest || !group.state) hold("checkpoint_finalized_pair_incomplete");
      requireAbsoluteRegularFile(group.complete, {
        mode: 0o600,
        maxBytes: 256,
        reason: "checkpoint_complete",
      });
      const expectedComplete =
        `VOID_PRIVATE_CHAIN2050_CHECKPOINT_COMPLETE_V1 ${group.checkpointId}\n`;
      if (fs.readFileSync(group.complete, "utf8") !== expectedComplete) {
        hold("checkpoint_complete_content_invalid");
      }
      candidates.push(
        validateCheckpointManifest(
          checkpointRoot,
          group.manifest,
          stem,
          maxManifestBytes,
          maxStateBytes,
        ),
      );
      continue;
    }

    incompleteCheckpointGroupCount += 1;
    if (group.manifest) {
      requireAbsoluteRegularFile(group.manifest, {
        mode: 0o600,
        maxBytes: maxManifestBytes,
        reason: "checkpoint_incomplete_manifest",
      });
    }
    if (group.state) {
      requireAbsoluteRegularFile(group.state, {
        mode: 0o600,
        maxBytes: maxStateBytes,
        reason: "checkpoint_incomplete_state",
      });
    }
  }

  return Object.freeze({
    candidates,
    incomplete_checkpoint_group_count: incompleteCheckpointGroupCount,
  });
}

export function selectVoidPrivateChain2050StartupStateV1({
  baseline,
  checkpointRoot,
  minimumBlockNumber,
  maxManifestBytes = DEFAULT_MAX_MANIFEST_BYTES,
  maxStateBytes = DEFAULT_MAX_STATE_BYTES,
  maxCheckpointEntries = DEFAULT_MAX_CHECKPOINT_ROOT_ENTRIES,
}) {
  const minimum = safeBlockNumber(
    minimumBlockNumber,
    "minimum_block_number_invalid",
  );
  if (!Number.isSafeInteger(maxManifestBytes) || maxManifestBytes < 256) {
    hold("max_manifest_bytes_invalid");
  }
  if (!Number.isSafeInteger(maxStateBytes) || maxStateBytes < 4) {
    hold("max_state_bytes_invalid");
  }
  if (!Number.isSafeInteger(maxCheckpointEntries) || maxCheckpointEntries < 3) {
    hold("max_checkpoint_entries_invalid");
  }

  const normalizedBaseline = normalizeBaseline(baseline, maxStateBytes);
  const checkpointRead = readVoidPrivateChain2050CheckpointCandidatesV1(
    checkpointRoot,
    { maxManifestBytes, maxStateBytes, maxCheckpointEntries },
  );
  const checkpoints = checkpointRead.candidates;
  const all = [normalizedBaseline, ...checkpoints];
  const eligible = all.filter((candidate) => candidate.block_number >= minimum);
  if (eligible.length === 0) hold("durable_state_below_required_minimum");

  const highest = Math.max(...eligible.map((candidate) => candidate.block_number));
  const leaders = eligible.filter(
    (candidate) => candidate.block_number === highest,
  );
  const identities = new Set(
    leaders.map(
      (candidate) =>
        `${candidate.block_number}:${candidate.block_hash}:${candidate.state_sha256}`,
    ),
  );
  if (identities.size !== 1) hold("ambiguous_highest_durable_state");

  const selected =
    leaders.find((candidate) => candidate.kind === "checkpoint") || leaders[0];
  const resultMaterial = {
    marker: VOID_PRIVATE_CHAIN2050_STARTUP_SELECTION_MARKER_V1,
    version: VOID_PRIVATE_CHAIN2050_STARTUP_SELECTION_VERSION_V1,
    chain_id: VOID_PRIVATE_CHAIN2050_EXPECTED_CHAIN_ID_V1,
    minimum_block_number: minimum,
    selected_kind: selected.kind,
    selected_block_number: selected.block_number,
    selected_block_hash: selected.block_hash,
    selected_state_sha256: selected.state_sha256,
    selected_state_format: selected.state_format,
    checkpoint_candidate_count: checkpoints.length,
    incomplete_checkpoint_group_count:
      checkpointRead.incomplete_checkpoint_group_count,
    durable_candidate_count: all.length,
    state_load_performed: false,
    service_mutation_performed: false,
    transaction_replay_performed: false,
    transaction_broadcast_performed: false,
    wallet_access_performed: false,
    credential_access_performed: false,
    money_movement_performed: false,
  };
  const selectionIdSha256 = sha256Text(
    canonicalVoidPrivateChain2050StartupSelectionV1(resultMaterial),
  );
  return Object.freeze({
    ...resultMaterial,
    selection_id_sha256: selectionIdSha256,
    selected_state_file: selected.state_file,
    selected_checkpoint_id_sha256:
      selected.kind === "checkpoint" ? selected.checkpoint_id_sha256 : null,
  });
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    const take = () => {
      if (!value) hold(`argument_value_missing:${key}`);
      index += 1;
      return value;
    };
    if (key === "--baseline-state") args.baselineState = path.resolve(take());
    else if (key === "--baseline-state-sha256") {
      args.baselineStateSha256 = take();
    } else if (key === "--baseline-state-format") {
      args.baselineStateFormat = take();
    } else if (key === "--baseline-block-number") {
      args.baselineBlockNumber = Number(take());
    } else if (key === "--baseline-block-hash") {
      args.baselineBlockHash = take();
    } else if (key === "--checkpoint-root") {
      args.checkpointRoot = path.resolve(take());
    } else if (key === "--minimum-block-number") {
      args.minimumBlockNumber = Number(take());
    } else if (key === "--help") args.help = true;
    else hold(`unknown_argument:${key}`);
  }
  return args;
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      process.stdout.write(
        "Usage: node tools/void-private-chain2050-startup-selection-v1.mjs --baseline-state ABS --baseline-state-sha256 SHA256 --baseline-state-format anvil_cli_state_json|anvil_dump_state_hex --baseline-block-number N --baseline-block-hash 0xHASH --checkpoint-root ABS --minimum-block-number N\n",
      );
      return;
    }
    for (const key of [
      "baselineState",
      "baselineStateSha256",
      "baselineStateFormat",
      "baselineBlockNumber",
      "baselineBlockHash",
      "checkpointRoot",
      "minimumBlockNumber",
    ]) {
      if (args[key] === undefined) hold(`required_argument_missing:${key}`);
    }
    const result = selectVoidPrivateChain2050StartupStateV1({
      baseline: {
        chain_id: VOID_PRIVATE_CHAIN2050_EXPECTED_CHAIN_ID_V1,
        block_number: args.baselineBlockNumber,
        block_hash: args.baselineBlockHash,
        state_sha256: args.baselineStateSha256,
        state_file: args.baselineState,
        state_format: args.baselineStateFormat,
      },
      checkpointRoot: args.checkpointRoot,
      minimumBlockNumber: args.minimumBlockNumber,
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    if (error instanceof VoidPrivateChain2050StartupSelectionHoldV1) {
      process.stdout.write(
        `${JSON.stringify({
          marker: VOID_PRIVATE_CHAIN2050_STARTUP_SELECTION_MARKER_V1,
          status: "hold",
          reason: error.reason,
          state_load_performed: false,
          service_mutation_performed: false,
          transaction_replay_performed: false,
          transaction_broadcast_performed: false,
          wallet_access_performed: false,
          credential_access_performed: false,
          money_movement_performed: false,
        })}\n`,
      );
      process.exitCode = 2;
      return;
    }
    throw error;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  await main();
}
