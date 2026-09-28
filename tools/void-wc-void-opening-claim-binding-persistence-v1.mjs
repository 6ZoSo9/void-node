import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  deriveWcVoidOpeningClaimBindingV1,
} from "./void-wc-void-opening-claim-binding-v1.mjs";

export const VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_V1 =
  "VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_V1";

export const VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_AUTHORITY_V1 =
  Object.freeze({
    bounded_read_only_filesystem_inspection: true,
    canonical_binding_path_required: true,
    stable_file_identity_required: true,
    stable_parent_directory_identity_required: true,
    exact_binding_rederivation_required: true,
    ledger_write: false,
    wc_issuance: false,
    wc_balance_mutation: false,
    token_transfer: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const INPUT_KEYS = Object.freeze([
  "data_dir",
  "coupled_launch_id",
  "commitments",
  "ledger_debits",
  "mode",
  "dispositions",
]);

const MAX_BINDING_BYTES = 64 * 1024 * 1024;
const SHA256 = /^sha256:[0-9a-f]{64}$/u;

function fail(code) {
  throw new Error(code);
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) fail(code);
  const sorted = actual.sort();
  const expected = [...keys].sort();
  if (
    sorted.length !== expected.length ||
    sorted.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort(compareText);
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalDataDir(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("\0") ||
    !path.isAbsolute(value)
  ) {
    fail("INVALID_WC_VOID_CLAIM_BINDING_DATA_DIR");
  }
  const normalized = path.normalize(value);
  if (normalized === path.parse(normalized).root) {
    fail("INVALID_WC_VOID_CLAIM_BINDING_DATA_DIR");
  }
  return normalized;
}

function directDirectory(candidate, code) {
  let stat;
  try {
    stat = fs.lstatSync(candidate, { bigint: true });
  } catch {
    fail(code);
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail(code);
  let real;
  try {
    real = fs.realpathSync(candidate);
  } catch {
    fail(code);
  }
  if (real !== candidate) fail(code);
  if (
    typeof process.getuid === "function" &&
    stat.uid !== BigInt(process.getuid())
  ) {
    fail(code);
  }
  if ((Number(stat.mode) & 0o022) !== 0) fail(code);
  return stat;
}

function directBindingFile(candidate) {
  let stat;
  try {
    stat = fs.lstatSync(candidate, { bigint: true });
  } catch {
    fail("WC_VOID_OPENING_CLAIM_BINDING_PERSISTED_FILE_UNAVAILABLE");
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_NOT_DIRECT_FILE");
  }
  let real;
  try {
    real = fs.realpathSync(candidate);
  } catch {
    fail("WC_VOID_OPENING_CLAIM_BINDING_REALPATH_FAILED");
  }
  if (real !== candidate) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_REALPATH_MISMATCH");
  }
  if (
    typeof process.getuid === "function" &&
    stat.uid !== BigInt(process.getuid())
  ) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_OWNER_MISMATCH");
  }
  if ((Number(stat.mode) & 0o022) !== 0) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_MODE_NOT_PRIVATE");
  }
  if (stat.size <= 0n || stat.size > BigInt(MAX_BINDING_BYTES)) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_FILE_SIZE_INVALID");
  }
  return stat;
}

function sameStableFile(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function sameStableDirectory(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode
  );
}

function revalidateDirectory(candidate, expected, code) {
  const current = directDirectory(candidate, code);
  if (!sameStableDirectory(expected, current)) fail(code);
}

function bindingFilename(bindingId) {
  if (typeof bindingId !== "string" || !SHA256.test(bindingId)) {
    fail("INVALID_WC_VOID_OPENING_CLAIM_BINDING_ID");
  }
  return bindingId.slice("sha256:".length) + ".json";
}

function readStableJson(file) {
  const fd = fs.openSync(file, "r");
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!before.isFile()) {
      fail("WC_VOID_OPENING_CLAIM_BINDING_NOT_FILE");
    }
    const size = Number(before.size);
    if (
      !Number.isSafeInteger(size) ||
      size <= 0 ||
      size > MAX_BINDING_BYTES
    ) {
      fail("WC_VOID_OPENING_CLAIM_BINDING_FILE_SIZE_INVALID");
    }
    const buffer = Buffer.allocUnsafe(size);
    let offset = 0;
    while (offset < size) {
      const read = fs.readSync(fd, buffer, offset, size - offset, offset);
      if (read <= 0) {
        fail("WC_VOID_OPENING_CLAIM_BINDING_SHORT_READ");
      }
      offset += read;
    }

    const after = fs.fstatSync(fd, { bigint: true });
    if (!sameStableFile(before, after)) {
      fail("WC_VOID_OPENING_CLAIM_BINDING_CHANGED_DURING_INSPECTION");
    }

    let parsed;
    try {
      parsed = JSON.parse(buffer.toString("utf8"));
    } catch {
      fail("WC_VOID_OPENING_CLAIM_BINDING_MALFORMED_JSON");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      fail("WC_VOID_OPENING_CLAIM_BINDING_NON_OBJECT_JSON");
    }

    return Object.freeze({
      parsed,
      bytes: size,
      sha256: sha256(buffer),
      stat: before,
    });
  } finally {
    fs.closeSync(fd);
  }
}

export function inspectWcVoidOpeningClaimBindingPersistenceV1(input) {
  const request = exactObject(
    input,
    INPUT_KEYS,
    "INVALID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_INPUT_SHAPE",
  );

  const expected = deriveWcVoidOpeningClaimBindingV1({
    coupled_launch_id: request.coupled_launch_id,
    commitments: request.commitments,
    ledger_debits: request.ledger_debits,
    mode: request.mode,
    dispositions: request.dispositions,
  });

  const dataDir = canonicalDataDir(request.data_dir);
  const wcDir = path.join(dataDir, "wc_v1");
  const bindingDir = path.join(wcDir, "opening-claim-bindings-v1");
  const file = path.join(bindingDir, bindingFilename(expected.binding_id));

  const dataDirStat = directDirectory(
    dataDir,
    "WC_VOID_CLAIM_BINDING_DATA_DIR_CUSTODY_INVALID",
  );
  const wcDirStat = directDirectory(
    wcDir,
    "WC_VOID_CLAIM_BINDING_WC_DIR_CUSTODY_INVALID",
  );
  const bindingDirStat = directDirectory(
    bindingDir,
    "WC_VOID_CLAIM_BINDING_DIRECTORY_CUSTODY_INVALID",
  );
  const lstat = directBindingFile(file);
  const observed = readStableJson(file);
  if (!sameStableFile(lstat, observed.stat)) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_CHANGED_BEFORE_READ");
  }

  revalidateDirectory(
    dataDir,
    dataDirStat,
    "WC_VOID_CLAIM_BINDING_DATA_DIR_CHANGED_DURING_INSPECTION",
  );
  revalidateDirectory(
    wcDir,
    wcDirStat,
    "WC_VOID_CLAIM_BINDING_WC_DIR_CHANGED_DURING_INSPECTION",
  );
  revalidateDirectory(
    bindingDir,
    bindingDirStat,
    "WC_VOID_CLAIM_BINDING_DIRECTORY_CHANGED_DURING_INSPECTION",
  );

  const expectedCanonical = canonicalJson(expected);
  let observedCanonical;
  try {
    observedCanonical = canonicalJson(observed.parsed);
  } catch {
    fail("WC_VOID_OPENING_CLAIM_BINDING_PERSISTED_VALUE_INVALID");
  }

  if (observedCanonical !== expectedCanonical) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_PERSISTED_CONTENT_MISMATCH");
  }
  if (
    observed.parsed.binding_id !== expected.binding_id ||
    observed.parsed.opening_state_id !== expected.opening_state_id ||
    observed.parsed.coupled_launch_id !== expected.coupled_launch_id ||
    observed.parsed.mode !== expected.mode
  ) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_IDENTITY_MISMATCH");
  }

  return Object.freeze({
    ok: true,
    status: "PERSISTENCE_VERIFIED",
    marker: VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_V1,
    version: 1,
    coupled_launch_id: expected.coupled_launch_id,
    opening_state_id: expected.opening_state_id,
    binding_id: expected.binding_id,
    mode: expected.mode,
    persisted_path:
      "wc_v1/opening-claim-bindings-v1/" +
      bindingFilename(expected.binding_id),
    persisted_bytes: String(observed.bytes),
    persisted_file_sha256: observed.sha256,
    disposition_count: expected.disposition_count,
    transferred_void_atoms: expected.transferred_void_atoms,
    refunded_wc_units: expected.refunded_wc_units,
    canonical_binding_direct_file: true,
    canonical_binding_realpath_exact: true,
    canonical_binding_owner_bound: true,
    canonical_binding_not_group_or_world_writable: true,
    stable_file_identity_during_read: true,
    stable_parent_directory_identity_during_read: true,
    exact_binding_rederivation_verified: true,
    binding_persistence_verified: true,
    opening_claim_transfer_or_refund_binding_persistence_verified: true,
    runtime_execution_ready: false,
    ledger_write_performed: false,
    wc_balance_mutation_performed: false,
    token_transfer_performed: false,
    refund_write_performed: false,
    market_activation_authority: false,
    public_presale_activation_authority: false,
    funds_movement_authority: false,
    authority:
      VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_AUTHORITY_V1,
  });
}
