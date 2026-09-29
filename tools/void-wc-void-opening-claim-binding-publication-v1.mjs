#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  deriveWcVoidOpeningClaimBindingV1,
} from "./void-wc-void-opening-claim-binding-v1.mjs";

import {
  inspectWcVoidOpeningClaimBindingPersistenceV1,
} from "./void-wc-void-opening-claim-binding-persistence-v1.mjs";

import {
  initialWcVoidOpeningReplayStateV1,
} from "./void-wc-void-opening-replay-protection-v1.mjs";

import {
  inspectWcVoidOpeningReplayTerminalV1,
} from "./void-wc-void-opening-replay-persistence-v1.mjs";

export const VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_V1 =
  "VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_V1";

export const VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_CONFIRMATION_V1 =
  "persistWcVoidOpeningClaimBinding";

export const VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_AUTHORITY_V1 =
  Object.freeze({
    bounded_filesystem_read: true,
    bounded_filesystem_write: true,
    create_once_claim_binding_persistence: true,
    replay_terminal_required: true,
    exact_binding_rederivation_required: true,
    ledger_write: false,
    wc_issuance: false,
    wc_balance_mutation: false,
    token_transfer: false,
    refund_write: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    rpc_call: false,
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
  "confirmation",
  "coupled_launch_id",
  "commitments",
  "ledger_debits",
  "mode",
  "dispositions",
]);

const STORE_DIRECTORY = "opening-claim-bindings-v1";
const MAX_BINDING_FILES = 10_000;
const MAX_BINDING_BYTES = 64 * 1024 * 1024;
const SHA256 = /^sha256:[0-9a-f]{64}$/u;

function fail(code) {
  throw new Error(code);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, keys, code) {
  if (!plain(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) fail(code);
  const sorted = actual.sort(compareText);
  const expected = [...keys].sort(compareText);
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
  if (plain(value)) {
    const keys = Object.keys(value).sort(compareText);
    return (
      "{" +
      keys
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
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
    fail("INVALID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_DATA_DIR");
  }
  const normalized = path.normalize(value);
  if (normalized === path.parse(normalized).root) {
    fail("INVALID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_DATA_DIR");
  }
  return normalized;
}

function canonicalBindingId(value) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    fail("INVALID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_BINDING_ID");
  }
  return value;
}

function bindingFilename(bindingId) {
  return canonicalBindingId(bindingId).slice("sha256:".length) + ".json";
}

function directPrivateDirectory(candidate, code) {
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

function sameDirectory(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode
  );
}

function revalidateDirectory(candidate, expected, code) {
  const current = directPrivateDirectory(candidate, code);
  if (!sameDirectory(expected, current)) fail(code);
}

function directPrivateFile(candidate, code) {
  let stat;
  try {
    stat = fs.lstatSync(candidate, { bigint: true });
  } catch {
    fail(code);
  }
  if (!stat.isFile() || stat.isSymbolicLink()) fail(code);
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
  if ((Number(stat.mode) & 0o777) !== 0o600) fail(code);
  if (stat.size <= 0n || stat.size > BigInt(MAX_BINDING_BYTES)) fail(code);
  return stat;
}

function noFollowFlag() {
  return typeof fs.constants.O_NOFOLLOW === "number"
    ? fs.constants.O_NOFOLLOW
    : 0;
}

function fsyncDirectory(directory) {
  const flags =
    fs.constants.O_RDONLY |
    (typeof fs.constants.O_DIRECTORY === "number"
      ? fs.constants.O_DIRECTORY
      : 0);
  const fd = fs.openSync(directory, flags);
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function ensurePrivateDirectory(directory, parent, code) {
  if (!fs.existsSync(directory)) {
    try {
      fs.mkdirSync(directory, { mode: 0o700 });
      fsyncDirectory(parent);
    } catch (error) {
      if (!fs.existsSync(directory)) throw error;
    }
  }
  return directPrivateDirectory(directory, code);
}

function writeExclusiveFile(file, bytes) {
  const fd = fs.openSync(
    file,
    fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      fs.constants.O_WRONLY |
      noFollowFlag(),
    0o600,
  );
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  return directPrivateFile(
    file,
    "WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_PENDING_FILE_INVALID",
  );
}

function inspectReplayBinding(dataDir, request, expectedBindingId) {
  const initial = initialWcVoidOpeningReplayStateV1(
    request.coupled_launch_id,
  );
  let replay;
  try {
    replay = inspectWcVoidOpeningReplayTerminalV1({
      data_dir: dataDir,
      before_state: initial,
      coupled_launch_id: request.coupled_launch_id,
      commitments: request.commitments,
      ledger_debits: request.ledger_debits,
      mode: request.mode,
      dispositions: request.dispositions,
    });
  } catch {
    fail("WC_VOID_OPENING_CLAIM_BINDING_REPLAY_TERMINAL_MISMATCH");
  }
  if (
    replay.ok !== true ||
    replay.status !== "verified" ||
    replay.terminal_replay_state_persisted !== true ||
    replay.durable_replay_state_persistence_verified !== true ||
    replay.duplicate_replay_protection_verified_for_launch !== true ||
    replay.binding_id !== expectedBindingId
  ) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_REPLAY_TERMINAL_MISMATCH");
  }
  return replay;
}

export function persistWcVoidOpeningClaimBindingV1(input) {
  const request = exactObject(
    input,
    INPUT_KEYS,
    "INVALID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_INPUT_SHAPE",
  );

  if (
    request.confirmation !==
    VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_CONFIRMATION_V1
  ) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_CONFIRMATION_REQUIRED");
  }

  const expected = deriveWcVoidOpeningClaimBindingV1({
    coupled_launch_id: request.coupled_launch_id,
    commitments: request.commitments,
    ledger_debits: request.ledger_debits,
    mode: request.mode,
    dispositions: request.dispositions,
  });
  canonicalBindingId(expected.binding_id);

  const expectedBytes = Buffer.from(canonicalJson(expected) + "\n", "utf8");
  if (
    expectedBytes.length <= 0 ||
    expectedBytes.length > MAX_BINDING_BYTES
  ) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_SIZE_INVALID");
  }

  const dataDir = canonicalDataDir(request.data_dir);
  const dataStat = directPrivateDirectory(
    dataDir,
    "WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_DATA_DIR_CUSTODY_INVALID",
  );
  const wcDir = path.join(dataDir, "wc_v1");
  const wcStat = directPrivateDirectory(
    wcDir,
    "WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_WC_DIR_CUSTODY_INVALID",
  );

  const replayBefore = inspectReplayBinding(
    dataDir,
    request,
    expected.binding_id,
  );
  revalidateDirectory(
    dataDir,
    dataStat,
    "WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_DATA_DIR_CHANGED_DURING_REPLAY_VERIFY",
  );
  revalidateDirectory(
    wcDir,
    wcStat,
    "WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_WC_DIR_CHANGED_DURING_REPLAY_VERIFY",
  );

  const bindingDir = path.join(wcDir, STORE_DIRECTORY);
  const bindingDirStat = ensurePrivateDirectory(
    bindingDir,
    wcDir,
    "WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_STORE_DIR_CUSTODY_INVALID",
  );

  const entries = fs.readdirSync(bindingDir);
  if (entries.length > MAX_BINDING_FILES) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_COUNT_EXCEEDED");
  }
  for (const name of entries) {
    if (name.startsWith(".pending-")) {
      fail(
        "WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_PENDING_ARTIFACT_REQUIRES_REVIEW",
      );
    }
    if (!/^[0-9a-f]{64}\.json$/u.test(name)) {
      fail("WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_UNEXPECTED_STORE_ENTRY");
    }
    directPrivateFile(
      path.join(bindingDir, name),
      "WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_EXISTING_FILE_INVALID",
    );
  }

  const file = path.join(bindingDir, bindingFilename(expected.binding_id));
  if (
    entries.length >= MAX_BINDING_FILES &&
    !fs.existsSync(file)
  ) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_COUNT_EXCEEDED");
  }

  const pending = path.join(
    bindingDir,
    ".pending-" +
      expected.binding_id.slice("sha256:".length) +
      "-" +
      String(process.pid) +
      ".json",
  );
  if (fs.existsSync(pending)) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_PENDING_PATH_BUSY");
  }

  writeExclusiveFile(pending, expectedBytes);
  let linked = false;
  let status = "committed";
  try {
    try {
      fs.linkSync(pending, file);
      linked = true;
      fsyncDirectory(bindingDir);
    } catch (error) {
      if (!error || error.code !== "EEXIST") throw error;
      status = "duplicate";
    }
  } finally {
    if (fs.existsSync(pending)) {
      const pendingStat = directPrivateFile(
        pending,
        "WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_PENDING_FILE_INVALID",
      );
      if (linked) {
        const finalStat = directPrivateFile(
          file,
          "WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_FILE_INVALID",
        );
        if (
          pendingStat.dev !== finalStat.dev ||
          pendingStat.ino !== finalStat.ino
        ) {
          fail(
            "WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_LINK_IDENTITY_MISMATCH",
          );
        }
      }
      fs.unlinkSync(pending);
      fsyncDirectory(bindingDir);
    }
  }

  const verified =
    inspectWcVoidOpeningClaimBindingPersistenceV1({
      data_dir: dataDir,
      coupled_launch_id: request.coupled_launch_id,
      commitments: request.commitments,
      ledger_debits: request.ledger_debits,
      mode: request.mode,
      dispositions: request.dispositions,
    });

  if (
    verified.ok !== true ||
    verified.status !== "PERSISTENCE_VERIFIED" ||
    verified.binding_id !== expected.binding_id ||
    verified.binding_persistence_verified !== true ||
    verified.opening_claim_transfer_or_refund_binding_persistence_verified !==
      true ||
    verified.persisted_file_sha256 !== sha256(expectedBytes)
  ) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_POST_VERIFY_FAILED");
  }

  const replayAfter = inspectReplayBinding(
    dataDir,
    request,
    expected.binding_id,
  );
  if (
    replayAfter.capsule_id !== replayBefore.capsule_id ||
    replayAfter.terminal_capsule_sha256 !==
      replayBefore.terminal_capsule_sha256
  ) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_REPLAY_TERMINAL_CHANGED");
  }

  const finalDataStat = directPrivateDirectory(
    dataDir,
    "WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_DATA_DIR_CHANGED",
  );
  const finalWcStat = directPrivateDirectory(
    wcDir,
    "WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_WC_DIR_CHANGED",
  );
  const finalBindingDirStat = directPrivateDirectory(
    bindingDir,
    "WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_STORE_DIR_CHANGED",
  );
  if (
    !sameDirectory(dataStat, finalDataStat) ||
    !sameDirectory(wcStat, finalWcStat) ||
    !sameDirectory(bindingDirStat, finalBindingDirStat)
  ) {
    fail("WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_CUSTODY_CHANGED");
  }

  return Object.freeze({
    ok: true,
    status,
    marker: VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_V1,
    version: 1,
    coupled_launch_id: expected.coupled_launch_id,
    opening_state_id: expected.opening_state_id,
    binding_id: expected.binding_id,
    mode: expected.mode,
    disposition_count: expected.disposition_count,
    persisted_path: verified.persisted_path,
    persisted_bytes: verified.persisted_bytes,
    persisted_file_sha256: verified.persisted_file_sha256,
    exact_duplicate: status === "duplicate",
    create_once_binding_file: true,
    atomic_complete_file_publication: true,
    replay_terminal_required: true,
    replay_terminal_binding_match_verified: true,
    replay_terminal_capsule_id: replayAfter.capsule_id,
    replay_terminal_capsule_sha256:
      replayAfter.terminal_capsule_sha256,
    exact_binding_rederivation_verified: true,
    binding_persistence_verified: true,
    opening_claim_transfer_or_refund_binding_persistence_verified: true,
    production_opening_claim_binding_gate_updated: false,
    runtime_execution_ready: false,
    ledger_write_performed: false,
    wc_balance_mutation_performed: false,
    token_transfer_performed: false,
    refund_write_performed: false,
    market_activation_authority: false,
    public_presale_activation_authority: false,
    funds_movement_authority: false,
    authority:
      VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_AUTHORITY_V1,
  });
}
