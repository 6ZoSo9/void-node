#!/usr/bin/env node
import { createHash } from "node:crypto";

import {
  VOID_WC_VOID_LEDGER_PERSISTENCE_AUTHORITY_V1,
  VOID_WC_VOID_LEDGER_PERSISTENCE_V1,
} from "./void-wc-void-ledger-persistence-v1.mjs";
import {
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
} from "./void-wc-void-coupled-opening-v1.mjs";

export const VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_V1 =
  "VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_V1";

export const VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    explicit_input_only: true,
    filesystem_read: false,
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

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const SHA256_HEX = /^[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const BINDING_ID = /^voidwclprb1_[0-9a-f]{64}$/u;
const IMPORT_ID = /^voidwclpri1_[0-9a-f]{64}$/u;

const INPUT_KEYS = Object.freeze([
  "expected",
  "evidence",
]);

const EXPECTED_KEYS = Object.freeze([
  "coupled_launch_id",
  "settlement_adapter_id",
  "prestate_bytes",
  "settlement_set_root",
  "total_settled_wc_units",
  "expected_settlement_count",
  "binding_id",
]);

const RECEIPT_KEYS = Object.freeze([
  "ok",
  "status",
  "marker",
  "version",
  "coupled_launch_id",
  "settlement_adapter_id",
  "prestate_bytes",
  "observed_file_size_bytes",
  "append_window_bytes",
  "append_window_sha256",
  "append_line_count",
  "opening_settlement_line_count",
  "expected_settlement_count",
  "settlement_set_root",
  "total_settled_wc_units",
  "exact_expected_settlement_set_present",
  "no_extra_opening_settlement_in_window",
  "canonical_ledger_direct_file",
  "canonical_ledger_realpath_exact",
  "canonical_ledger_owner_bound",
  "canonical_ledger_not_group_or_world_writable",
  "prestate_line_boundary_verified",
  "stable_file_identity_during_read",
  "stable_parent_directory_identity_during_read",
  "ledger_persistence_verified",
  "quote_reserve_custody_verified",
  "ledger_write_performed",
  "wc_balance_mutation_performed",
  "market_activation_authority",
  "inventory_funding_authority",
  "public_presale_activation_authority",
  "funds_movement_authority",
  "authority",
]);

const SOURCE_AUTHORITY_KEYS = Object.freeze(
  Object.keys(VOID_WC_VOID_LEDGER_PERSISTENCE_AUTHORITY_V1),
);

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
    const keys = Object.keys(value).sort();
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalSha(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

function canonicalHexSha(value, code) {
  if (typeof value !== "string" || !SHA256_HEX.test(value)) fail(code);
  return value;
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

function canonicalCount(value, code, { positive = false } = {}) {
  if (!Number.isSafeInteger(value) || value < 0) fail(code);
  if (positive && value <= 0) fail(code);
  return value;
}

function bindingBody(expected) {
  return Object.freeze({
    coupled_launch_id: expected.coupled_launch_id,
    settlement_adapter_id: expected.settlement_adapter_id,
    prestate_bytes: expected.prestate_bytes,
    settlement_set_root: expected.settlement_set_root,
    total_settled_wc_units: expected.total_settled_wc_units,
    expected_settlement_count: expected.expected_settlement_count,
  });
}

export function wcVoidLedgerPersistenceReviewBindingIdV1(expected) {
  const value = exactObject(
    expected,
    EXPECTED_KEYS,
    "INVALID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_EXPECTED_SHAPE",
  );
  return "voidwclprb1_" + sha256Text(canonicalJson(bindingBody(value)));
}

function normalizeExpected(raw) {
  const value = exactObject(
    raw,
    EXPECTED_KEYS,
    "INVALID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_EXPECTED_SHAPE",
  );
  const out = Object.freeze({
    coupled_launch_id: canonicalSha(
      value.coupled_launch_id,
      "WC_VOID_LEDGER_PERSISTENCE_IMPORT_EXPECTED_LAUNCH_ID_INVALID",
    ),
    settlement_adapter_id: value.settlement_adapter_id,
    prestate_bytes: canonicalUint(
      value.prestate_bytes,
      "WC_VOID_LEDGER_PERSISTENCE_IMPORT_EXPECTED_PRESTATE_INVALID",
    ).toString(),
    settlement_set_root: canonicalSha(
      value.settlement_set_root,
      "WC_VOID_LEDGER_PERSISTENCE_IMPORT_EXPECTED_SETTLEMENT_ROOT_INVALID",
    ),
    total_settled_wc_units: canonicalUint(
      value.total_settled_wc_units,
      "WC_VOID_LEDGER_PERSISTENCE_IMPORT_EXPECTED_SETTLED_WC_INVALID",
      { positive: true },
    ).toString(),
    expected_settlement_count: canonicalCount(
      value.expected_settlement_count,
      "WC_VOID_LEDGER_PERSISTENCE_IMPORT_EXPECTED_SETTLEMENT_COUNT_INVALID",
      { positive: true },
    ),
    binding_id: value.binding_id,
  });
  if (
    out.settlement_adapter_id !==
      VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1 ||
    typeof out.binding_id !== "string" ||
    !BINDING_ID.test(out.binding_id) ||
    out.binding_id !== wcVoidLedgerPersistenceReviewBindingIdV1(out)
  ) {
    fail("WC_VOID_LEDGER_PERSISTENCE_IMPORT_EXPECTED_BINDING_MISMATCH");
  }
  return out;
}

function validateSourceAuthority(raw) {
  const authority = exactObject(
    raw,
    SOURCE_AUTHORITY_KEYS,
    "WC_VOID_LEDGER_PERSISTENCE_IMPORT_SOURCE_AUTHORITY_SHAPE_INVALID",
  );
  for (const key of SOURCE_AUTHORITY_KEYS) {
    if (authority[key] !== VOID_WC_VOID_LEDGER_PERSISTENCE_AUTHORITY_V1[key]) {
      fail("WC_VOID_LEDGER_PERSISTENCE_IMPORT_SOURCE_AUTHORITY_MISMATCH");
    }
  }
}

function receiptBody(receipt) {
  const body = Object.create(null);
  for (const key of RECEIPT_KEYS) {
    if (key !== "authority") body[key] = receipt[key];
  }
  body.authority = receipt.authority;
  return body;
}

export function importWcVoidLedgerPersistenceV1(input) {
  const request = exactObject(
    input,
    INPUT_KEYS,
    "INVALID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_INPUT_SHAPE",
  );
  const expected = normalizeExpected(request.expected);
  const receipt = exactObject(
    request.evidence,
    RECEIPT_KEYS,
    "INVALID_WC_VOID_LEDGER_PERSISTENCE_RECEIPT_SHAPE",
  );

  if (
    receipt.ok !== true ||
    receipt.status !== "PERSISTENCE_VERIFIED" ||
    receipt.marker !== VOID_WC_VOID_LEDGER_PERSISTENCE_V1 ||
    receipt.version !== 1
  ) {
    fail("WC_VOID_LEDGER_PERSISTENCE_IMPORT_RECEIPT_IDENTITY_MISMATCH");
  }

  if (
    canonicalSha(
      receipt.coupled_launch_id,
      "WC_VOID_LEDGER_PERSISTENCE_IMPORT_RECEIPT_LAUNCH_ID_INVALID",
    ) !== expected.coupled_launch_id ||
    receipt.settlement_adapter_id !== expected.settlement_adapter_id ||
    canonicalUint(
      receipt.prestate_bytes,
      "WC_VOID_LEDGER_PERSISTENCE_IMPORT_RECEIPT_PRESTATE_INVALID",
    ).toString() !== expected.prestate_bytes ||
    canonicalSha(
      receipt.settlement_set_root,
      "WC_VOID_LEDGER_PERSISTENCE_IMPORT_RECEIPT_SETTLEMENT_ROOT_INVALID",
    ) !== expected.settlement_set_root ||
    canonicalUint(
      receipt.total_settled_wc_units,
      "WC_VOID_LEDGER_PERSISTENCE_IMPORT_RECEIPT_SETTLED_WC_INVALID",
      { positive: true },
    ).toString() !== expected.total_settled_wc_units ||
    canonicalCount(
      receipt.expected_settlement_count,
      "WC_VOID_LEDGER_PERSISTENCE_IMPORT_RECEIPT_SETTLEMENT_COUNT_INVALID",
      { positive: true },
    ) !== expected.expected_settlement_count
  ) {
    fail("WC_VOID_LEDGER_PERSISTENCE_IMPORT_EXPECTED_BINDING_MISMATCH");
  }

  canonicalUint(
    receipt.observed_file_size_bytes,
    "WC_VOID_LEDGER_PERSISTENCE_IMPORT_FILE_SIZE_INVALID",
    { positive: true },
  );
  canonicalUint(
    receipt.append_window_bytes,
    "WC_VOID_LEDGER_PERSISTENCE_IMPORT_APPEND_WINDOW_INVALID",
    { positive: true },
  );
  canonicalHexSha(
    receipt.append_window_sha256,
    "WC_VOID_LEDGER_PERSISTENCE_IMPORT_APPEND_SHA_INVALID",
  );
  canonicalCount(
    receipt.append_line_count,
    "WC_VOID_LEDGER_PERSISTENCE_IMPORT_APPEND_LINE_COUNT_INVALID",
    { positive: true },
  );
  canonicalCount(
    receipt.opening_settlement_line_count,
    "WC_VOID_LEDGER_PERSISTENCE_IMPORT_OPENING_LINE_COUNT_INVALID",
    { positive: true },
  );

  for (const key of [
    "exact_expected_settlement_set_present",
    "no_extra_opening_settlement_in_window",
    "canonical_ledger_direct_file",
    "canonical_ledger_realpath_exact",
    "canonical_ledger_owner_bound",
    "canonical_ledger_not_group_or_world_writable",
    "prestate_line_boundary_verified",
    "stable_file_identity_during_read",
    "stable_parent_directory_identity_during_read",
    "ledger_persistence_verified",
    "quote_reserve_custody_verified",
  ]) {
    if (receipt[key] !== true) {
      fail("WC_VOID_LEDGER_PERSISTENCE_IMPORT_REQUIRED_PROOF_MISSING");
    }
  }

  for (const key of [
    "ledger_write_performed",
    "wc_balance_mutation_performed",
    "market_activation_authority",
    "inventory_funding_authority",
    "public_presale_activation_authority",
    "funds_movement_authority",
  ]) {
    if (receipt[key] !== false) {
      fail("WC_VOID_LEDGER_PERSISTENCE_IMPORT_AUTHORITY_MISMATCH");
    }
  }

  validateSourceAuthority(receipt.authority);

  const sourceReceiptSha256 =
    "sha256:" + sha256Text(canonicalJson(receiptBody(receipt)));
  const body = Object.freeze({
    marker: VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_V1,
    version: 1,
    status: "VERIFIED_LEDGER_PERSISTENCE_IMPORT",
    binding_id: expected.binding_id,
    source_receipt_sha256: sourceReceiptSha256,
    coupled_launch_id: expected.coupled_launch_id,
    settlement_adapter_id: expected.settlement_adapter_id,
    prestate_bytes: expected.prestate_bytes,
    settlement_set_root: expected.settlement_set_root,
    total_settled_wc_units: expected.total_settled_wc_units,
    expected_settlement_count: expected.expected_settlement_count,
    observed_file_size_bytes: receipt.observed_file_size_bytes,
    append_window_bytes: receipt.append_window_bytes,
    append_window_sha256: receipt.append_window_sha256,
    append_line_count: receipt.append_line_count,
    opening_settlement_line_count: receipt.opening_settlement_line_count,
  });

  return Object.freeze({
    ok: true,
    ...body,
    import_id:
      "voidwclpri1_" + sha256Text(canonicalJson(body)),
    wc_ledger_persistence_verified: true,
    quote_reserve_custody_verified: true,
    production_candidate_binding_allowed: true,
    production_candidate_updated: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority: VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_AUTHORITY_V1,
  });
}
