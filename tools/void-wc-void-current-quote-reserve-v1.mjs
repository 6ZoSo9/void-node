#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
  deriveWcVoidCoupledOpeningStateV1,
} from "./void-wc-void-coupled-opening-v1.mjs";
import {
  VOID_WC_VOID_REVERSE_SETTLEMENT_ADAPTER_ID_V1,
  VOID_WC_VOID_REVERSE_SETTLEMENT_POLICY_V1,
} from "./void-wc-void-reverse-settlement-v1.mjs";
import {
  inspectWcVoidOpeningLedgerPersistenceV1,
} from "./void-wc-void-ledger-persistence-v1.mjs";

export const VOID_WC_VOID_CURRENT_QUOTE_RESERVE_V1 =
  "VOID_WC_VOID_CURRENT_QUOTE_RESERVE_V1";

export const VOID_WC_VOID_CURRENT_QUOTE_RESERVE_AUTHORITY_V1 =
  Object.freeze({
    source_verification_only: true,
    bounded_filesystem_read: true,
    filesystem_write: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_ledger_write: false,
    wc_balance_mutation: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const INPUT_KEYS = Object.freeze([
  "data_dir",
  "coupled_launch_id",
  "market_vault",
  "commitments",
  "expected_ledger_debits",
  "prestate_bytes",
]);

const REVERSE_CREDIT_KEYS = Object.freeze([
  "kind",
  "account",
  "delta",
  "ts_ms",
  "reason",
  "settlement_id",
  "quote_id",
  "coupled_launch_id",
  "market_state_id",
  "participant_address",
  "market_vault",
  "void_transfer_tx_hash",
  "void_transfer_log_index",
  "void_amount_atoms",
  "wc_amount",
  "market_meta",
]);

const REVERSE_META_KEYS = Object.freeze([
  "adapter_id",
  "pair",
  "direction",
  "source_domain",
  "quote_asset_form",
  "quote_unit",
  "quote_decimals",
  "fixed_price",
  "presale_price_authority",
  "native_gas_model",
  "native_gas_economic_charge_atoms",
]);

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const HASH = /^0x[0-9a-f]{64}$/u;
const SAFE_ACCOUNT = /^[A-Za-z0-9._:@-]{3,128}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const MAX_APPEND_BYTES = 64 * 1024 * 1024;
const MAX_APPEND_LINES = 1_000_000;
const MAX_LINE_BYTES = 64 * 1024;
const MAX_SAFE_WC = BigInt(Number.MAX_SAFE_INTEGER);

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
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function contentId(prefix, value) {
  return prefix + sha256Bytes(Buffer.from(canonicalJson(value), "utf8"));
}

function canonicalLaunchId(value) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    fail("WC_VOID_CURRENT_QUOTE_RESERVE_LAUNCH_ID_INVALID");
  }
  return value;
}

function canonicalAddress(value, code) {
  if (typeof value !== "string") fail(code);
  const out = value.toLowerCase();
  if (
    !ADDRESS.test(out) ||
    out === "0x0000000000000000000000000000000000000000"
  ) {
    fail(code);
  }
  return out;
}

function canonicalSha(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

function canonicalHash(value, code) {
  if (typeof value !== "string") fail(code);
  const out = value.toLowerCase();
  if (!HASH.test(out)) fail(code);
  return out;
}

function canonicalUint(value, code, { positive = false } = {}) {
  if (
    typeof value !== "string" ||
    value.length > 78 ||
    !UINT.test(value)
  ) {
    fail(code);
  }
  const parsed = BigInt(value);
  if (positive && parsed <= 0n) fail(code);
  return parsed;
}

function canonicalPrestateBytes(value) {
  const parsed = canonicalUint(
    value,
    "WC_VOID_CURRENT_QUOTE_RESERVE_PRESTATE_INVALID",
  );
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) {
    fail("WC_VOID_CURRENT_QUOTE_RESERVE_PRESTATE_TOO_LARGE");
  }
  return Number(parsed);
}

function canonicalDataDir(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("\0") ||
    !path.isAbsolute(value)
  ) {
    fail("WC_VOID_CURRENT_QUOTE_RESERVE_DATA_DIR_INVALID");
  }
  const normalized = path.normalize(value);
  if (normalized === path.parse(normalized).root) {
    fail("WC_VOID_CURRENT_QUOTE_RESERVE_DATA_DIR_INVALID");
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

function directLedger(candidate, code) {
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
  if ((Number(stat.mode) & 0o022) !== 0) fail(code);
  return stat;
}

function sameFile(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
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

function readByte(fd, position) {
  const byte = Buffer.allocUnsafe(1);
  const read = fs.readSync(fd, byte, 0, 1, position);
  if (read !== 1) {
    fail("WC_VOID_CURRENT_QUOTE_RESERVE_BOUNDARY_READ_FAILED");
  }
  return byte[0];
}

function parseRows(buffer) {
  if (
    buffer.length < 1 ||
    buffer.length > MAX_APPEND_BYTES ||
    buffer[buffer.length - 1] !== 0x0a
  ) {
    fail("WC_VOID_CURRENT_QUOTE_RESERVE_APPEND_WINDOW_INVALID");
  }
  const rawLines = buffer.toString("utf8").split("\n");
  rawLines.pop();
  if (rawLines.length < 1 || rawLines.length > MAX_APPEND_LINES) {
    fail("WC_VOID_CURRENT_QUOTE_RESERVE_APPEND_LINE_COUNT_INVALID");
  }
  return Object.freeze(rawLines.map((line) => {
    const bytes = Buffer.byteLength(line, "utf8");
    if (bytes < 2 || bytes > MAX_LINE_BYTES) {
      fail("WC_VOID_CURRENT_QUOTE_RESERVE_APPEND_LINE_SIZE_INVALID");
    }
    let value;
    try {
      value = JSON.parse(line);
    } catch {
      fail("WC_VOID_CURRENT_QUOTE_RESERVE_APPEND_JSON_INVALID");
    }
    if (!plain(value)) {
      fail("WC_VOID_CURRENT_QUOTE_RESERVE_APPEND_NON_OBJECT");
    }
    return value;
  }));
}

function openingRow(row, launchId, settlementIds) {
  return (
    row.coupled_launch_id === launchId &&
    row.schema === VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1 &&
    row.kind === "debit" &&
    row.reason === "wc_void_opening_settlement_v1" &&
    row?.market_meta?.adapter_id ===
      VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1 &&
    settlementIds.has(row.settlement_id)
  );
}

function reverseHint(row, launchId) {
  if (row.coupled_launch_id !== launchId) return false;
  return (
    row.reason === "wc_void_reverse_settlement_v1" ||
    row.kind === "credit" &&
      (
        row?.market_meta?.adapter_id ===
          VOID_WC_VOID_REVERSE_SETTLEMENT_ADAPTER_ID_V1 ||
        row?.market_meta?.pair === "WC_VOID" ||
        row?.market_meta?.direction === "void_to_wc"
      )
  );
}

function normalizeReverseCredit(row, launchId, marketVault) {
  const credit = exactObject(
    row,
    REVERSE_CREDIT_KEYS,
    "WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_CREDIT_SHAPE_INVALID",
  );
  const meta = exactObject(
    credit.market_meta,
    REVERSE_META_KEYS,
    "WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_META_SHAPE_INVALID",
  );

  if (
    credit.kind !== "credit" ||
    credit.reason !== "wc_void_reverse_settlement_v1" ||
    credit.coupled_launch_id !== launchId ||
    meta.adapter_id !== VOID_WC_VOID_REVERSE_SETTLEMENT_ADAPTER_ID_V1 ||
    meta.pair !== "WC_VOID" ||
    meta.direction !== "void_to_wc" ||
    meta.source_domain !== "void-work-credit-ledger" ||
    meta.quote_asset_form !== "ledger-credit" ||
    meta.quote_unit !== "wc" ||
    meta.quote_decimals !== 0 ||
    meta.fixed_price !== false ||
    meta.presale_price_authority !== false ||
    meta.native_gas_model !==
      VOID_WC_VOID_REVERSE_SETTLEMENT_POLICY_V1.native_gas_model ||
    meta.native_gas_economic_charge_atoms !== "0"
  ) {
    fail("WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_CREDIT_CONTRACT_MISMATCH");
  }

  if (
    typeof credit.account !== "string" ||
    !SAFE_ACCOUNT.test(credit.account)
  ) {
    fail("WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_ACCOUNT_INVALID");
  }
  if (
    !Number.isSafeInteger(credit.delta) ||
    credit.delta <= 0 ||
    !Number.isSafeInteger(credit.ts_ms) ||
    credit.ts_ms <= 0
  ) {
    fail("WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_NUMERIC_INVALID");
  }

  const wcAmount = canonicalUint(
    credit.wc_amount,
    "WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_WC_AMOUNT_INVALID",
    { positive: true },
  );
  if (
    wcAmount > MAX_SAFE_WC ||
    BigInt(credit.delta) !== wcAmount
  ) {
    fail("WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_DELTA_MISMATCH");
  }

  const observedVault = canonicalAddress(
    credit.market_vault,
    "WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_VAULT_INVALID",
  );
  if (observedVault !== marketVault) {
    fail("WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_VAULT_MISMATCH");
  }

  canonicalAddress(
    credit.participant_address,
    "WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_PARTICIPANT_INVALID",
  );
  canonicalHash(
    credit.void_transfer_tx_hash,
    "WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_TX_HASH_INVALID",
  );
  canonicalUint(
    credit.void_transfer_log_index,
    "WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_LOG_INDEX_INVALID",
  );
  canonicalUint(
    credit.void_amount_atoms,
    "WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_VOID_AMOUNT_INVALID",
    { positive: true },
  );
  const settlementId = canonicalSha(
    credit.settlement_id,
    "WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_SETTLEMENT_ID_INVALID",
  );
  canonicalSha(
    credit.quote_id,
    "WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_QUOTE_ID_INVALID",
  );
  canonicalSha(
    credit.market_state_id,
    "WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_MARKET_STATE_ID_INVALID",
  );

  return Object.freeze({
    settlement_id: settlementId,
    wc_amount: wcAmount,
  });
}

export function inspectWcVoidCurrentQuoteReserveV1(input) {
  const request = exactObject(
    input,
    INPUT_KEYS,
    "INVALID_WC_VOID_CURRENT_QUOTE_RESERVE_INPUT_SHAPE",
  );
  const launchId = canonicalLaunchId(request.coupled_launch_id);
  const marketVault = canonicalAddress(
    request.market_vault,
    "WC_VOID_CURRENT_QUOTE_RESERVE_MARKET_VAULT_INVALID",
  );
  if (
    !Array.isArray(request.commitments) ||
    !Array.isArray(request.expected_ledger_debits)
  ) {
    fail("WC_VOID_CURRENT_QUOTE_RESERVE_OPENING_INPUT_ARRAY_REQUIRED");
  }

  const opening = deriveWcVoidCoupledOpeningStateV1({
    coupled_launch_id: launchId,
    commitments: request.commitments,
    ledger_debits: request.expected_ledger_debits,
  });
  const persistence = inspectWcVoidOpeningLedgerPersistenceV1({
    data_dir: request.data_dir,
    coupled_launch_id: launchId,
    commitments: request.commitments,
    expected_ledger_debits: request.expected_ledger_debits,
    prestate_bytes: request.prestate_bytes,
  });
  if (
    persistence.ok !== true ||
    persistence.status !== "PERSISTENCE_VERIFIED" ||
    persistence.ledger_persistence_verified !== true ||
    persistence.coupled_launch_id !== launchId ||
    persistence.settlement_set_root !== opening.settlement_set_root ||
    persistence.total_settled_wc_units !== opening.settled_wc_reserve_units
  ) {
    fail("WC_VOID_CURRENT_QUOTE_RESERVE_OPENING_PERSISTENCE_MISMATCH");
  }

  const expectedOpeningIds = new Set(
    request.expected_ledger_debits.map((row) =>
      canonicalSha(
        row?.settlement_id,
        "WC_VOID_CURRENT_QUOTE_RESERVE_OPENING_SETTLEMENT_ID_INVALID",
      ),
    ),
  );
  if (expectedOpeningIds.size !== request.expected_ledger_debits.length) {
    fail("WC_VOID_CURRENT_QUOTE_RESERVE_OPENING_SETTLEMENT_ID_DUPLICATE");
  }

  const dataDir = canonicalDataDir(request.data_dir);
  const wcDir = path.join(dataDir, "wc_v1");
  const ledger = path.join(wcDir, "ledger.jsonl");
  const dataStat = directDirectory(
    dataDir,
    "WC_VOID_CURRENT_QUOTE_RESERVE_DATA_DIR_CUSTODY_INVALID",
  );
  const wcStat = directDirectory(
    wcDir,
    "WC_VOID_CURRENT_QUOTE_RESERVE_WC_DIR_CUSTODY_INVALID",
  );
  const ledgerStat = directLedger(
    ledger,
    "WC_VOID_CURRENT_QUOTE_RESERVE_LEDGER_CUSTODY_INVALID",
  );
  const prestateBytes = canonicalPrestateBytes(request.prestate_bytes);

  const fd = fs.openSync(ledger, "r");
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!sameFile(ledgerStat, before)) {
      fail("WC_VOID_CURRENT_QUOTE_RESERVE_LEDGER_CHANGED_BEFORE_READ");
    }
    const fileSize = Number(before.size);
    if (
      !Number.isSafeInteger(fileSize) ||
      prestateBytes > fileSize ||
      String(fileSize) !== persistence.observed_file_size_bytes
    ) {
      fail("WC_VOID_CURRENT_QUOTE_RESERVE_LEDGER_SIZE_MISMATCH");
    }
    if (
      prestateBytes > 0 &&
      readByte(fd, prestateBytes - 1) !== 0x0a
    ) {
      fail("WC_VOID_CURRENT_QUOTE_RESERVE_PRESTATE_NOT_LINE_ALIGNED");
    }

    const appendBytes = fileSize - prestateBytes;
    if (
      appendBytes <= 0 ||
      appendBytes > MAX_APPEND_BYTES ||
      String(appendBytes) !== persistence.append_window_bytes
    ) {
      fail("WC_VOID_CURRENT_QUOTE_RESERVE_APPEND_SIZE_MISMATCH");
    }

    const buffer = Buffer.allocUnsafe(appendBytes);
    let offset = 0;
    while (offset < appendBytes) {
      const read = fs.readSync(
        fd,
        buffer,
        offset,
        appendBytes - offset,
        prestateBytes + offset,
      );
      if (read <= 0) {
        fail("WC_VOID_CURRENT_QUOTE_RESERVE_APPEND_SHORT_READ");
      }
      offset += read;
    }

    const after = fs.fstatSync(fd, { bigint: true });
    if (!sameFile(before, after)) {
      fail("WC_VOID_CURRENT_QUOTE_RESERVE_LEDGER_CHANGED_DURING_READ");
    }
    const appendSha = sha256Bytes(buffer);
    if (appendSha !== persistence.append_window_sha256) {
      fail("WC_VOID_CURRENT_QUOTE_RESERVE_APPEND_SHA_MISMATCH");
    }

    const rows = parseRows(buffer);
    const openingSeen = new Set();
    const reverseSeen = new Set();
    let reverseCreditCount = 0;
    let reverseCreditedWc = 0n;

    for (const row of rows) {
      if (openingRow(row, launchId, expectedOpeningIds)) {
        if (reverseCreditCount > 0) {
          fail("WC_VOID_CURRENT_QUOTE_RESERVE_OPENING_AFTER_REVERSE_FORBIDDEN");
        }
        if (openingSeen.has(row.settlement_id)) {
          fail("WC_VOID_CURRENT_QUOTE_RESERVE_OPENING_SETTLEMENT_DUPLICATE");
        }
        openingSeen.add(row.settlement_id);
        continue;
      }

      if (row.coupled_launch_id !== launchId) {
        continue;
      }

      if (reverseHint(row, launchId)) {
        if (openingSeen.size !== expectedOpeningIds.size) {
          fail("WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_BEFORE_OPENING_COMPLETE");
        }
        const reverse = normalizeReverseCredit(
          row,
          launchId,
          marketVault,
        );
        if (reverseSeen.has(reverse.settlement_id)) {
          fail("WC_VOID_CURRENT_QUOTE_RESERVE_REVERSE_SETTLEMENT_DUPLICATE");
        }
        reverseSeen.add(reverse.settlement_id);
        reverseCreditCount += 1;
        reverseCreditedWc += reverse.wc_amount;
        continue;
      }

      fail("WC_VOID_CURRENT_QUOTE_RESERVE_UNKNOWN_LAUNCH_LEDGER_MUTATION");
    }

    if (openingSeen.size !== expectedOpeningIds.size) {
      fail("WC_VOID_CURRENT_QUOTE_RESERVE_OPENING_SETTLEMENT_SET_INCOMPLETE");
    }

    const openingReserve = BigInt(opening.settled_wc_reserve_units);
    if (reverseCreditedWc > openingReserve) {
      fail("WC_VOID_CURRENT_QUOTE_RESERVE_UNDERFLOW");
    }
    const currentReserve = openingReserve - reverseCreditedWc;

    const finalLedgerStat = directLedger(
      ledger,
      "WC_VOID_CURRENT_QUOTE_RESERVE_LEDGER_PATH_CHANGED",
    );
    const finalDataStat = directDirectory(
      dataDir,
      "WC_VOID_CURRENT_QUOTE_RESERVE_DATA_DIR_CHANGED",
    );
    const finalWcStat = directDirectory(
      wcDir,
      "WC_VOID_CURRENT_QUOTE_RESERVE_WC_DIR_CHANGED",
    );
    if (
      !sameFile(ledgerStat, finalLedgerStat) ||
      !sameDirectory(dataStat, finalDataStat) ||
      !sameDirectory(wcStat, finalWcStat)
    ) {
      fail("WC_VOID_CURRENT_QUOTE_RESERVE_CUSTODY_CHANGED");
    }

    const body = Object.freeze({
      marker: VOID_WC_VOID_CURRENT_QUOTE_RESERVE_V1,
      version: 1,
      status: "CURRENT_QUOTE_RESERVE_CUSTODY_VERIFIED",
      coupled_launch_id: launchId,
      market_vault: marketVault,
      opening_state_id: opening.opening_state_id,
      opening_settlement_set_root: opening.settlement_set_root,
      opening_settled_wc_reserve_units: openingReserve.toString(),
      reverse_settlement_credit_count: reverseCreditCount,
      reverse_settlement_ids: Object.freeze([...reverseSeen].sort(compareText)),
      reverse_credited_wc_units: reverseCreditedWc.toString(),
      current_quote_reserve_units: currentReserve.toString(),
      prestate_bytes: String(prestateBytes),
      observed_file_size_bytes: String(fileSize),
      append_window_bytes: String(appendBytes),
      append_window_sha256: appendSha,
    });

    return Object.freeze({
      ok: true,
      ...body,
      evidence_id: contentId("voidwcqrc2_", body),
      ledger_persistence_verified: true,
      quote_reserve_custody_verified: true,
      reverse_credit_projection_complete: true,
      unknown_launch_market_mutation_fail_closed: true,
      post_opening_forward_settlement_supported: false,
      point_in_time_filesystem_evidence: true,
      production_runtime_binding_verified: false,
      production_candidate_binding_allowed: false,
      ledger_write_performed: false,
      wc_balance_mutation_performed: false,
      market_activation_authorized: false,
      public_presale_activation_authorized: false,
      funds_movement_authorized: false,
      authority: VOID_WC_VOID_CURRENT_QUOTE_RESERVE_AUTHORITY_V1,
    });
  } finally {
    fs.closeSync(fd);
  }
}
