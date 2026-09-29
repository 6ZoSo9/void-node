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
  inspectWcVoidOpeningLedgerPersistenceV1,
} from "./void-wc-void-ledger-persistence-v1.mjs";

export const VOID_WC_VOID_QUOTE_RESERVE_CUSTODY_V1 =
  "VOID_WC_VOID_QUOTE_RESERVE_CUSTODY_V1";

export const VOID_WC_VOID_QUOTE_RESERVE_CUSTODY_AUTHORITY_V1 =
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
  "commitments",
  "expected_ledger_debits",
  "prestate_bytes",
]);
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const MAX_APPEND_BYTES = 64 * 1024 * 1024;
const MAX_APPEND_LINES = 1_000_000;

function fail(code) {
  throw new Error(code);
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

function canonicalLaunchId(value) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    fail("WC_VOID_QUOTE_RESERVE_LAUNCH_ID_INVALID");
  }
  return value;
}

function canonicalDataDir(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("\0") ||
    !path.isAbsolute(value)
  ) {
    fail("WC_VOID_QUOTE_RESERVE_DATA_DIR_INVALID");
  }
  const normalized = path.normalize(value);
  if (normalized === path.parse(normalized).root) {
    fail("WC_VOID_QUOTE_RESERVE_DATA_DIR_INVALID");
  }
  return normalized;
}

function canonicalPrestateBytes(value) {
  if (
    typeof value !== "string" ||
    value.length > 20 ||
    !/^(?:0|[1-9][0-9]*)$/u.test(value)
  ) {
    fail("WC_VOID_QUOTE_RESERVE_PRESTATE_INVALID");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    fail("WC_VOID_QUOTE_RESERVE_PRESTATE_INVALID");
  }
  return parsed;
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

function directPrivateLedger(candidate, code) {
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

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function canonicalSettlementId(value) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    fail("WC_VOID_QUOTE_RESERVE_SETTLEMENT_ID_INVALID");
  }
  return value;
}

function parseAppendWindow(buffer) {
  if (buffer.length < 1 || buffer[buffer.length - 1] !== 0x0a) {
    fail("WC_VOID_QUOTE_RESERVE_APPEND_WINDOW_NOT_LINE_ALIGNED");
  }
  const text = buffer.toString("utf8");
  const rawLines = text.slice(0, -1).split("\n");
  if (
    rawLines.length < 1 ||
    rawLines.length > MAX_APPEND_LINES ||
    rawLines.some((line) => line.length < 2)
  ) {
    fail("WC_VOID_QUOTE_RESERVE_APPEND_WINDOW_INVALID");
  }
  return Object.freeze(
    rawLines.map((line) => {
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch {
        fail("WC_VOID_QUOTE_RESERVE_APPEND_ROW_JSON_INVALID");
      }
      if (!plain(parsed)) {
        fail("WC_VOID_QUOTE_RESERVE_APPEND_ROW_NON_OBJECT");
      }
      return parsed;
    }),
  );
}

function openingRowForLaunch(row, launchId, expectedSettlementIds) {
  return (
    row.coupled_launch_id === launchId &&
    row.schema === VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1 &&
    row.kind === "debit" &&
    row.reason === "wc_void_opening_settlement_v1" &&
    row?.market_meta?.adapter_id ===
      VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1 &&
    expectedSettlementIds.has(row.settlement_id)
  );
}

export function inspectWcVoidQuoteReserveCustodyV1(input) {
  const request = exactObject(
    input,
    INPUT_KEYS,
    "INVALID_WC_VOID_QUOTE_RESERVE_CUSTODY_INPUT_SHAPE",
  );
  const launchId = canonicalLaunchId(request.coupled_launch_id);
  if (!Array.isArray(request.commitments) || !Array.isArray(request.expected_ledger_debits)) {
    fail("WC_VOID_QUOTE_RESERVE_OPENING_INPUT_ARRAY_REQUIRED");
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
    fail("WC_VOID_QUOTE_RESERVE_OPENING_PERSISTENCE_MISMATCH");
  }

  const expectedSettlementIds = new Set(
    request.expected_ledger_debits.map((row) =>
      canonicalSettlementId(row?.settlement_id),
    ),
  );
  if (expectedSettlementIds.size !== request.expected_ledger_debits.length) {
    fail("WC_VOID_QUOTE_RESERVE_DUPLICATE_OPENING_SETTLEMENT_ID");
  }

  const dataDir = canonicalDataDir(request.data_dir);
  const wcDir = path.join(dataDir, "wc_v1");
  const ledger = path.join(wcDir, "ledger.jsonl");
  const dataStat = directPrivateDirectory(
    dataDir,
    "WC_VOID_QUOTE_RESERVE_DATA_DIR_CUSTODY_INVALID",
  );
  const wcStat = directPrivateDirectory(
    wcDir,
    "WC_VOID_QUOTE_RESERVE_WC_DIR_CUSTODY_INVALID",
  );
  const ledgerStat = directPrivateLedger(
    ledger,
    "WC_VOID_QUOTE_RESERVE_LEDGER_CUSTODY_INVALID",
  );
  const prestateBytes = canonicalPrestateBytes(request.prestate_bytes);

  const fd = fs.openSync(ledger, "r");
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!sameFile(ledgerStat, before)) {
      fail("WC_VOID_QUOTE_RESERVE_LEDGER_CHANGED_BEFORE_READ");
    }
    const size = Number(before.size);
    if (!Number.isSafeInteger(size) || prestateBytes > size) {
      fail("WC_VOID_QUOTE_RESERVE_FILE_SIZE_INVALID");
    }
    if (String(size) !== persistence.observed_file_size_bytes) {
      fail("WC_VOID_QUOTE_RESERVE_LEDGER_SIZE_DRIFT");
    }
    const appendBytes = size - prestateBytes;
    if (
      appendBytes <= 0 ||
      appendBytes > MAX_APPEND_BYTES ||
      String(appendBytes) !== persistence.append_window_bytes
    ) {
      fail("WC_VOID_QUOTE_RESERVE_APPEND_WINDOW_SIZE_MISMATCH");
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
      if (read <= 0) fail("WC_VOID_QUOTE_RESERVE_APPEND_WINDOW_SHORT_READ");
      offset += read;
    }

    const after = fs.fstatSync(fd, { bigint: true });
    if (!sameFile(before, after)) {
      fail("WC_VOID_QUOTE_RESERVE_LEDGER_CHANGED_DURING_READ");
    }
    if (sha256(buffer) !== persistence.append_window_sha256) {
      fail("WC_VOID_QUOTE_RESERVE_APPEND_WINDOW_SHA_MISMATCH");
    }

    const rows = parseAppendWindow(buffer);
    let launchScopedRows = 0;
    let reverseSettlementCreditCount = 0;
    for (const row of rows) {
      if (row.coupled_launch_id !== launchId) continue;
      launchScopedRows += 1;
      if (
        row.kind === "credit" &&
        row.reason === "wc_void_reverse_settlement_v1"
      ) {
        reverseSettlementCreditCount += 1;
      }
      if (!openingRowForLaunch(row, launchId, expectedSettlementIds)) {
        fail("WC_VOID_QUOTE_RESERVE_UNACCOUNTED_LAUNCH_SCOPED_LEDGER_ROW");
      }
    }
    if (launchScopedRows !== expectedSettlementIds.size) {
      fail("WC_VOID_QUOTE_RESERVE_LAUNCH_ROW_COUNT_MISMATCH");
    }
    if (reverseSettlementCreditCount !== 0) {
      fail("WC_VOID_QUOTE_RESERVE_REVERSE_SETTLEMENT_ALREADY_PRESENT");
    }

    const finalLedgerStat = directPrivateLedger(
      ledger,
      "WC_VOID_QUOTE_RESERVE_LEDGER_PATH_CHANGED",
    );
    const finalDataStat = directPrivateDirectory(
      dataDir,
      "WC_VOID_QUOTE_RESERVE_DATA_DIR_CHANGED",
    );
    const finalWcStat = directPrivateDirectory(
      wcDir,
      "WC_VOID_QUOTE_RESERVE_WC_DIR_CHANGED",
    );
    if (
      !sameFile(ledgerStat, finalLedgerStat) ||
      !sameDirectory(dataStat, finalDataStat) ||
      !sameDirectory(wcStat, finalWcStat)
    ) {
      fail("WC_VOID_QUOTE_RESERVE_CUSTODY_CHANGED_DURING_INSPECTION");
    }

    const body = Object.freeze({
      marker: VOID_WC_VOID_QUOTE_RESERVE_CUSTODY_V1,
      version: 1,
      status: "PREACTIVATION_QUOTE_RESERVE_CUSTODY_VERIFIED",
      coupled_launch_id: launchId,
      opening_state_id: opening.opening_state_id,
      settlement_set_root: opening.settlement_set_root,
      prestate_bytes: String(prestateBytes),
      observed_file_size_bytes: String(size),
      append_window_bytes: String(appendBytes),
      append_window_sha256: persistence.append_window_sha256,
      opening_settlement_count: expectedSettlementIds.size,
      launch_scoped_row_count: launchScopedRows,
      reverse_settlement_credit_count: 0,
      opening_settled_wc_reserve_units: opening.settled_wc_reserve_units,
      current_quote_reserve_units: opening.settled_wc_reserve_units,
    });
    const evidenceId =
      "voidwcqrc1_" +
      createHash("sha256")
        .update(JSON.stringify(body))
        .digest("hex");

    return Object.freeze({
      ok: true,
      ...body,
      evidence_id: evidenceId,
      ledger_persistence_verified: true,
      quote_reserve_custody_verified: true,
      preactivation_no_reserve_spend_verified: true,
      point_in_time_filesystem_evidence: true,
      production_runtime_binding_verified: false,
      production_candidate_binding_allowed: false,
      ledger_write_performed: false,
      wc_balance_mutation_performed: false,
      market_activation_authorized: false,
      public_presale_activation_authorized: false,
      funds_movement_authorized: false,
      authority: VOID_WC_VOID_QUOTE_RESERVE_CUSTODY_AUTHORITY_V1,
    });
  } finally {
    fs.closeSync(fd);
  }
}
