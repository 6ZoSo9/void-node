import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
  verifyWcVoidOpeningLedgerSettlementsV1,
  wcVoidOpeningSettlementIdV1,
} from "./void-wc-void-coupled-opening-v1.mjs";

export const VOID_WC_VOID_LEDGER_PERSISTENCE_V1 =
  "VOID_WC_VOID_LEDGER_PERSISTENCE_V1";

export const VOID_WC_VOID_LEDGER_PERSISTENCE_AUTHORITY_V1 = Object.freeze({
  bounded_read_only_filesystem_inspection: true,
  canonical_wc_ledger_path_required: true,
  append_window_only: true,
  stable_file_identity_required: true,
  ledger_write: false,
  wc_issuance: false,
  wc_balance_mutation: false,
  wallet_or_signer_access: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  inventory_funding: false,
  liquidity_movement: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
});

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const MAX_APPEND_BYTES = 64 * 1024 * 1024;
const MAX_APPEND_LINES = 1_000_000;
const MAX_LINE_BYTES = 64 * 1024;

const INPUT_KEYS = Object.freeze([
  "data_dir",
  "coupled_launch_id",
  "commitments",
  "expected_ledger_debits",
  "prestate_bytes",
]);

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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalSha(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

function canonicalPrestateBytes(value) {
  if (typeof value !== "string" || !UINT.test(value)) {
    fail("INVALID_WC_VOID_LEDGER_PRESTATE_BYTES");
  }
  const parsed = BigInt(value);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) {
    fail("WC_VOID_LEDGER_PRESTATE_BYTES_TOO_LARGE");
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
    fail("INVALID_WC_VOID_LEDGER_DATA_DIR");
  }
  const normalized = path.normalize(value);
  if (normalized === path.parse(normalized).root) {
    fail("INVALID_WC_VOID_LEDGER_DATA_DIR");
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
  if (typeof process.getuid === "function" && stat.uid !== BigInt(process.getuid())) {
    fail(code);
  }
  if ((Number(stat.mode) & 0o022) !== 0) fail(code);
  return stat;
}

function directLedgerFile(candidate) {
  let stat;
  try {
    stat = fs.lstatSync(candidate, { bigint: true });
  } catch {
    fail("WC_VOID_CANONICAL_LEDGER_UNAVAILABLE");
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail("WC_VOID_CANONICAL_LEDGER_NOT_DIRECT_FILE");
  }
  let real;
  try {
    real = fs.realpathSync(candidate);
  } catch {
    fail("WC_VOID_CANONICAL_LEDGER_REALPATH_FAILED");
  }
  if (real !== candidate) {
    fail("WC_VOID_CANONICAL_LEDGER_REALPATH_MISMATCH");
  }
  if (typeof process.getuid === "function" && stat.uid !== BigInt(process.getuid())) {
    fail("WC_VOID_CANONICAL_LEDGER_OWNER_MISMATCH");
  }
  if ((Number(stat.mode) & 0o022) !== 0) {
    fail("WC_VOID_CANONICAL_LEDGER_MODE_NOT_PRIVATE");
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

function readByte(fd, position) {
  const byte = Buffer.allocUnsafe(1);
  const read = fs.readSync(fd, byte, 0, 1, position);
  if (read !== 1) fail("WC_VOID_LEDGER_BOUNDARY_READ_FAILED");
  return byte[0];
}

function parseAppendWindow(buffer) {
  if (buffer.length === 0) {
    fail("WC_VOID_LEDGER_APPEND_WINDOW_EMPTY");
  }
  if (buffer[buffer.length - 1] !== 0x0a) {
    fail("WC_VOID_LEDGER_APPEND_WINDOW_PARTIAL_FINAL_LINE");
  }
  const text = buffer.toString("utf8");
  const rawLines = text.split("\n");
  rawLines.pop();
  if (rawLines.length < 1 || rawLines.length > MAX_APPEND_LINES) {
    fail("WC_VOID_LEDGER_APPEND_LINE_COUNT_INVALID");
  }

  return rawLines.map((line) => {
    if (
      Buffer.byteLength(line, "utf8") < 2 ||
      Buffer.byteLength(line, "utf8") > MAX_LINE_BYTES
    ) {
      fail("WC_VOID_LEDGER_APPEND_LINE_SIZE_INVALID");
    }
    let value;
    try {
      value = JSON.parse(line);
    } catch {
      fail("WC_VOID_LEDGER_APPEND_MALFORMED_JSON");
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      fail("WC_VOID_LEDGER_APPEND_NON_OBJECT_JSON");
    }
    return value;
  });
}

function expectedSettlementIds(expectedDebits) {
  if (!Array.isArray(expectedDebits) || expectedDebits.length < 1) {
    fail("INVALID_WC_VOID_EXPECTED_LEDGER_DEBIT_SET");
  }
  const ids = expectedDebits.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail("INVALID_WC_VOID_EXPECTED_LEDGER_DEBIT");
    }
    const id = entry.settlement_id;
    canonicalSha(id, "INVALID_WC_VOID_EXPECTED_SETTLEMENT_ID");
    return id;
  });
  const seen = new Set(ids);
  if (seen.size !== ids.length) {
    fail("DUPLICATE_WC_VOID_EXPECTED_SETTLEMENT_ID");
  }
  return Object.freeze([...seen].sort());
}

export function inspectWcVoidOpeningLedgerPersistenceV1(input) {
  const request = exactObject(
    input,
    INPUT_KEYS,
    "INVALID_WC_VOID_LEDGER_PERSISTENCE_INPUT_SHAPE",
  );
  const coupledLaunchId = canonicalSha(
    request.coupled_launch_id,
    "INVALID_COUPLED_LAUNCH_ID",
  );
  const dataDir = canonicalDataDir(request.data_dir);
  const wcDir = path.join(dataDir, "wc_v1");
  const ledger = path.join(wcDir, "ledger.jsonl");

  directDirectory(dataDir, "WC_VOID_DATA_DIR_CUSTODY_INVALID");
  directDirectory(wcDir, "WC_VOID_WC_DIR_CUSTODY_INVALID");
  directLedgerFile(ledger);

  const prestateBytes = canonicalPrestateBytes(request.prestate_bytes);
  const expectedIds = expectedSettlementIds(request.expected_ledger_debits);

  const expectedAggregate = verifyWcVoidOpeningLedgerSettlementsV1(
    coupledLaunchId,
    request.commitments,
    request.expected_ledger_debits,
  );

  const fd = fs.openSync(ledger, "r");
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!before.isFile()) fail("WC_VOID_CANONICAL_LEDGER_NOT_FILE");
    if (prestateBytes > Number(before.size)) {
      fail("WC_VOID_LEDGER_PRESTATE_BEYOND_CURRENT_SIZE");
    }
    const appendBytes = Number(before.size) - prestateBytes;
    if (appendBytes <= 0) fail("WC_VOID_LEDGER_APPEND_WINDOW_EMPTY");
    if (appendBytes > MAX_APPEND_BYTES) {
      fail("WC_VOID_LEDGER_APPEND_WINDOW_TOO_LARGE");
    }
    if (prestateBytes > 0 && readByte(fd, prestateBytes - 1) !== 0x0a) {
      fail("WC_VOID_LEDGER_PRESTATE_NOT_LINE_ALIGNED");
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
      if (read <= 0) fail("WC_VOID_LEDGER_APPEND_WINDOW_SHORT_READ");
      offset += read;
    }

    const after = fs.fstatSync(fd, { bigint: true });
    if (!sameStableFile(before, after)) {
      fail("WC_VOID_LEDGER_CHANGED_DURING_INSPECTION");
    }

    const rows = parseAppendWindow(buffer);
    const openingRows = rows.filter(
      (row) =>
        row.schema === VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1 ||
        row.reason === "wc_void_opening_settlement_v1" ||
        row?.market_meta?.adapter_id ===
          VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
    );

    if (openingRows.length !== expectedIds.length) {
      fail("WC_VOID_LEDGER_OPENING_SETTLEMENT_COUNT_MISMATCH");
    }

    const observedAggregate = verifyWcVoidOpeningLedgerSettlementsV1(
      coupledLaunchId,
      request.commitments,
      openingRows,
    );
    const observedIds = openingRows
      .map((row) => row.settlement_id)
      .sort();

    if (
      observedIds.length !== expectedIds.length ||
      observedIds.some((id, index) => id !== expectedIds[index])
    ) {
      fail("WC_VOID_LEDGER_EXPECTED_SETTLEMENT_SET_MISMATCH");
    }
    if (
      observedAggregate.settlement_set_root !==
        expectedAggregate.settlement_set_root ||
      observedAggregate.total_settled_wc_units !==
        expectedAggregate.total_settled_wc_units
    ) {
      fail("WC_VOID_LEDGER_SETTLEMENT_AGGREGATE_MISMATCH");
    }

    return Object.freeze({
      ok: true,
      status: "PERSISTENCE_VERIFIED",
      marker: VOID_WC_VOID_LEDGER_PERSISTENCE_V1,
      version: 1,
      coupled_launch_id: coupledLaunchId,
      settlement_adapter_id:
        VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
      prestate_bytes: String(prestateBytes),
      observed_file_size_bytes: before.size.toString(),
      append_window_bytes: String(appendBytes),
      append_window_sha256: sha256(buffer),
      append_line_count: rows.length,
      opening_settlement_line_count: openingRows.length,
      expected_settlement_count: expectedIds.length,
      settlement_set_root: observedAggregate.settlement_set_root,
      total_settled_wc_units:
        observedAggregate.total_settled_wc_units,
      exact_expected_settlement_set_present: true,
      no_extra_opening_settlement_in_window: true,
      canonical_ledger_direct_file: true,
      canonical_ledger_realpath_exact: true,
      canonical_ledger_owner_bound: true,
      canonical_ledger_not_group_or_world_writable: true,
      prestate_line_boundary_verified: true,
      stable_file_identity_during_read: true,
      ledger_persistence_verified: true,
      opening_debit_persistence_verified: true,
      quote_reserve_custody_verified: false,
      quote_reserve_transfer_or_escrow_primitive_ready: false,
      ledger_write_performed: false,
      wc_balance_mutation_performed: false,
      market_activation_authority: false,
      inventory_funding_authority: false,
      public_presale_activation_authority: false,
      funds_movement_authority: false,
      authority: VOID_WC_VOID_LEDGER_PERSISTENCE_AUTHORITY_V1,
    });
  } finally {
    fs.closeSync(fd);
  }
}
