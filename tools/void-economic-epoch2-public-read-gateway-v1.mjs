#!/usr/bin/env node

import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1 =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    injected_read_only_rpc_transport_required: true,
    exact_block_binding_required: true,
    bounded_query_surface: true,
    runtime_route_active: false,
    public_gateway_active: false,
    default_rpc_transport: false,
    arbitrary_rpc_method: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    wc_mutation: false,
    validator_mutation: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement: false,
  });

export class VoidEconomicEpoch2PublicReadGatewayHoldV1 extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.name = "VoidEconomicEpoch2PublicReadGatewayHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

const MAX_TIMEOUT_MS = 5_000;
const MAX_CODE_BYTES = 128 * 1024;
const UINT64_MAX = (1n << 64n) - 1n;
const UINT256_MAX = (1n << 256n) - 1n;
const HASH = /^0x[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const HEX_BYTES = /^0x(?:[0-9a-f]{2})*$/u;
const HEX_QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/u;

const BALANCE_OR_CODE_KEYS = Object.freeze([
  "marker",
  "version",
  "kind",
  "address",
  "block_number",
]);

const RECEIPT_KEYS = Object.freeze([
  "marker",
  "version",
  "kind",
  "transaction_hash",
]);

function hold(reason, detail = null) {
  throw new VoidEconomicEpoch2PublicReadGatewayHoldV1(reason, detail);
}

function ownData(value, key, code) {
  let descriptor;
  try {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      throw null;
    }
    descriptor = Object.getOwnPropertyDescriptor(value, key);
  } catch {
    hold(code);
  }
  if (
    !descriptor ||
    descriptor.enumerable !== true ||
    !Object.hasOwn(descriptor, "value")
  ) {
    hold(code);
  }
  return descriptor.value;
}

function exactObject(value, keys, code) {
  let descriptors;
  try {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      throw null;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw null;
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    hold(code);
  }

  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) hold(code);
  const sorted = actual.sort();
  const expected = [...keys].sort();
  if (
    sorted.length !== expected.length ||
    sorted.some((key, index) => key !== expected[index])
  ) {
    hold(code);
  }

  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      hold(code);
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
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return (
      "{" +
      keys
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  hold("invalid_canonical_value");
}

function evidenceId(value) {
  return (
    "sha256:" +
    createHash("sha256")
      .update(canonicalJson(value), "utf8")
      .digest("hex")
  );
}

function canonicalAddress(value, code) {
  if (typeof value !== "string") hold(code);
  const normalized = value.toLowerCase();
  if (!ADDRESS.test(normalized)) hold(code);
  return normalized;
}

function canonicalHash(value, code) {
  if (typeof value !== "string") hold(code);
  const normalized = value.toLowerCase();
  if (!HASH.test(normalized)) hold(code);
  return normalized;
}

function canonicalQuantity(value, code, maximum = UINT256_MAX) {
  if (typeof value !== "string") hold(code);
  const normalized = value.toLowerCase();
  if (!HEX_QUANTITY.test(normalized)) hold(code);
  let parsed;
  try {
    parsed = BigInt(normalized);
  } catch {
    hold(code);
  }
  if (parsed < 0n || parsed > maximum) hold(code);
  return Object.freeze({ text: normalized, value: parsed });
}

function canonicalCode(value) {
  if (typeof value !== "string") {
    hold("code_result_not_canonical_hex_bytes");
  }
  const normalized = value.toLowerCase();
  if (
    normalized.length > 2 + MAX_CODE_BYTES * 2 ||
    !HEX_BYTES.test(normalized)
  ) {
    hold(
      normalized.length > 2 + MAX_CODE_BYTES * 2
        ? "code_result_above_bound"
        : "code_result_not_canonical_hex_bytes",
    );
  }
  return Object.freeze({
    code: normalized,
    code_bytes: (normalized.length - 2) / 2,
    code_sha256: createHash("sha256")
      .update(Buffer.from(normalized.slice(2), "hex"))
      .digest("hex"),
  });
}

function normalizeBlock(raw, expectedNumber) {
  if (raw === null) hold("block_not_found");
  const number = canonicalQuantity(
    ownData(raw, "number", "block_number_missing"),
    "block_number_invalid",
    UINT64_MAX,
  );
  if (number.text !== expectedNumber) {
    hold("block_number_mismatch");
  }
  const hash = canonicalHash(
    ownData(raw, "hash", "block_hash_missing"),
    "block_hash_invalid",
  );
  const stateRoot = canonicalHash(
    ownData(raw, "stateRoot", "block_state_root_missing"),
    "block_state_root_invalid",
  );
  return Object.freeze({
    number: number.text,
    hash,
    state_root: stateRoot,
  });
}

function sameBlock(left, right) {
  return (
    left.number === right.number &&
    left.hash === right.hash &&
    left.state_root === right.state_root
  );
}

function normalizeReceipt(raw, expectedHash) {
  if (raw === null) hold("receipt_not_found");

  const transactionHash = canonicalHash(
    ownData(raw, "transactionHash", "receipt_transaction_hash_missing"),
    "receipt_transaction_hash_invalid",
  );
  if (transactionHash !== expectedHash) {
    hold("receipt_transaction_hash_mismatch");
  }

  const blockNumber = canonicalQuantity(
    ownData(raw, "blockNumber", "receipt_block_number_missing"),
    "receipt_block_number_invalid",
    UINT64_MAX,
  );
  const blockHash = canonicalHash(
    ownData(raw, "blockHash", "receipt_block_hash_missing"),
    "receipt_block_hash_invalid",
  );
  const status = canonicalQuantity(
    ownData(raw, "status", "receipt_status_missing"),
    "receipt_status_invalid",
    1n,
  );
  const from = canonicalAddress(
    ownData(raw, "from", "receipt_from_missing"),
    "receipt_from_invalid",
  );

  const rawTo = ownData(raw, "to", "receipt_to_missing");
  const to =
    rawTo === null
      ? null
      : canonicalAddress(rawTo, "receipt_to_invalid");

  return Object.freeze({
    transaction_hash: transactionHash,
    block_number: blockNumber.text,
    block_hash: blockHash,
    status: status.text,
    from,
    to,
  });
}

function sameReceipt(left, right) {
  return (
    left.transaction_hash === right.transaction_hash &&
    left.block_number === right.block_number &&
    left.block_hash === right.block_hash &&
    left.status === right.status &&
    left.from === right.from &&
    left.to === right.to
  );
}

function normalizeRequest(raw) {
  const kind = ownData(raw, "kind", "request_kind_missing");
  if (kind === "balance" || kind === "code") {
    const value = exactObject(
      raw,
      BALANCE_OR_CODE_KEYS,
      "balance_or_code_request_shape_invalid",
    );
    if (
      value.marker !== VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1 ||
      value.version !== 1 ||
      value.kind !== kind
    ) {
      hold("request_identity_invalid");
    }
    return Object.freeze({
      kind,
      address: canonicalAddress(value.address, "request_address_invalid"),
      block_number: canonicalQuantity(
        value.block_number,
        "request_block_number_invalid",
        UINT64_MAX,
      ).text,
    });
  }

  if (kind === "receipt") {
    const value = exactObject(
      raw,
      RECEIPT_KEYS,
      "receipt_request_shape_invalid",
    );
    if (
      value.marker !== VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1 ||
      value.version !== 1 ||
      value.kind !== "receipt"
    ) {
      hold("request_identity_invalid");
    }
    return Object.freeze({
      kind,
      transaction_hash: canonicalHash(
        value.transaction_hash,
        "request_transaction_hash_invalid",
      ),
    });
  }

  hold("request_kind_unsupported");
}

function normalizeTimeout(value) {
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > MAX_TIMEOUT_MS
  ) {
    hold("timeout_ms_invalid");
  }
  return value;
}

function transportAdapter(value) {
  if (typeof value !== "function") hold("read_transport_required");
  return value;
}

async function boundedCall(transport, method, params, timeoutMs) {
  const startedAt = performance.now();
  let timer = null;
  let timedOut = false;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      reject(new Error("read_rpc_timeout"));
    }, timeoutMs);
  });

  let result;
  let failed = false;
  try {
    const operation = Promise.resolve().then(() =>
      transport(
        Object.freeze({
          method,
          params: Object.freeze([...params]),
          timeout_ms: timeoutMs,
        }),
      ),
    );
    result = await Promise.race([operation, timeout]);
  } catch {
    failed = true;
  } finally {
    if (timer !== null) clearTimeout(timer);
  }

  const elapsedMs = performance.now() - startedAt;
  if (timedOut || elapsedMs >= timeoutMs) {
    hold("read_rpc_timeout", { method });
  }
  if (failed) hold("read_rpc_failed", { method });
  return result;
}

async function chain2050(transport, timeoutMs) {
  const value = await boundedCall(
    transport,
    "eth_chainId",
    [],
    timeoutMs,
  );
  const chainId = canonicalQuantity(
    value,
    "read_rpc_chain_id_invalid",
    UINT64_MAX,
  );
  if (chainId.value !== 2050n) {
    hold("read_rpc_chain_id_mismatch");
  }
  return 2050;
}

async function stableBlock(transport, blockNumber, timeoutMs) {
  return normalizeBlock(
    await boundedCall(
      transport,
      "eth_getBlockByNumber",
      [blockNumber, false],
      timeoutMs,
    ),
    blockNumber,
  );
}

export async function queryVoidEconomicEpoch2PublicReadGatewayV1({
  request,
  transport,
  timeoutMs,
}) {
  const normalizedRequest = normalizeRequest(request);
  const readTransport = transportAdapter(transport);
  const timeout = normalizeTimeout(timeoutMs);
  await chain2050(readTransport, timeout);

  if (
    normalizedRequest.kind === "balance" ||
    normalizedRequest.kind === "code"
  ) {
    const before = await stableBlock(
      readTransport,
      normalizedRequest.block_number,
      timeout,
    );

    let normalizedResult;
    if (normalizedRequest.kind === "balance") {
      const rawBalance = await boundedCall(
        readTransport,
        "eth_getBalance",
        [
          normalizedRequest.address,
          normalizedRequest.block_number,
        ],
        timeout,
      );
      const balance = canonicalQuantity(
        rawBalance,
        "balance_result_invalid",
        UINT256_MAX,
      );
      normalizedResult = Object.freeze({
        balance_wei: balance.value.toString(),
        balance_wei_hex: balance.text,
      });
    } else {
      normalizedResult = canonicalCode(
        await boundedCall(
          readTransport,
          "eth_getCode",
          [
            normalizedRequest.address,
            normalizedRequest.block_number,
          ],
          timeout,
        ),
      );
    }

    const after = await stableBlock(
      readTransport,
      normalizedRequest.block_number,
      timeout,
    );
    if (!sameBlock(before, after)) {
      hold("block_identity_changed_during_read");
    }

    const evidence = Object.freeze({
      query_kind: normalizedRequest.kind,
      chain_id: 2050,
      execution_epoch: 2,
      block_number: before.number,
      block_hash: before.hash,
      state_root: before.state_root,
      address: normalizedRequest.address,
      result: normalizedResult,
    });

    return Object.freeze({
      ok: true,
      status: "SOURCE_PUBLIC_READ_QUERY_VERIFIED",
      marker: VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1,
      version: 1,
      ...evidence,
      evidence_id: evidenceId(evidence),
      exact_block_identity_revalidated: true,
      injected_transport_calls_performed: true,
      read_only_rpc_methods_used: Object.freeze([
        "eth_chainId",
        "eth_getBlockByNumber",
        normalizedRequest.kind === "balance"
          ? "eth_getBalance"
          : "eth_getCode",
      ]),
      public_economic_read_gateway_source_ready: true,
      live_balance_receipt_code_gateway_ready: false,
      public_balance_receipt_code_verification_ready: false,
      runtime_route_active: false,
      public_gateway_active: false,
      migration_authorized: false,
      public_activation_authorized: false,
      funds_movement: false,
      authority:
        VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_AUTHORITY_V1,
    });
  }

  const first = normalizeReceipt(
    await boundedCall(
      readTransport,
      "eth_getTransactionReceipt",
      [normalizedRequest.transaction_hash],
      timeout,
    ),
    normalizedRequest.transaction_hash,
  );

  const blockBefore = await stableBlock(
    readTransport,
    first.block_number,
    timeout,
  );
  if (first.block_hash !== blockBefore.hash) {
    hold("receipt_block_hash_mismatch");
  }

  const second = normalizeReceipt(
    await boundedCall(
      readTransport,
      "eth_getTransactionReceipt",
      [normalizedRequest.transaction_hash],
      timeout,
    ),
    normalizedRequest.transaction_hash,
  );
  if (!sameReceipt(first, second)) {
    hold("receipt_changed_during_read");
  }

  const blockAfter = await stableBlock(
    readTransport,
    first.block_number,
    timeout,
  );
  if (!sameBlock(blockBefore, blockAfter)) {
    hold("block_identity_changed_during_read");
  }
  if (second.block_hash !== blockAfter.hash) {
    hold("receipt_block_hash_mismatch");
  }

  const evidence = Object.freeze({
    query_kind: "receipt",
    chain_id: 2050,
    execution_epoch: 2,
    block_number: blockBefore.number,
    block_hash: blockBefore.hash,
    state_root: blockBefore.state_root,
    transaction_hash: first.transaction_hash,
    receipt_status: first.status,
    receipt_from: first.from,
    receipt_to: first.to,
  });

  return Object.freeze({
    ok: true,
    status: "SOURCE_PUBLIC_READ_QUERY_VERIFIED",
    marker: VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_V1,
    version: 1,
    ...evidence,
    evidence_id: evidenceId(evidence),
    exact_receipt_identity_revalidated: true,
    exact_block_identity_revalidated: true,
    injected_transport_calls_performed: true,
    read_only_rpc_methods_used: Object.freeze([
      "eth_chainId",
      "eth_getTransactionReceipt",
      "eth_getBlockByNumber",
    ]),
    public_economic_read_gateway_source_ready: true,
    live_balance_receipt_code_gateway_ready: false,
    public_balance_receipt_code_verification_ready: false,
    runtime_route_active: false,
    public_gateway_active: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement: false,
    authority:
      VOID_ECONOMIC_EPOCH2_PUBLIC_READ_GATEWAY_AUTHORITY_V1,
  });
}
