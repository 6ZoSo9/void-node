import { createHash } from "node:crypto";
import { TextDecoder, types as utilTypes } from "node:util";

import { canonicalBuyVoidPaymentIdentityV1 } from "./buy_void_auto_fulfillment_v1.js";
import { classifyBuyVoidAllocationReservationLedgerV1 } from "./buy_void_allocation_reservation_ledger_v1.js";
import { snapshotBuyVoidPreappendPlainInputV1 } from "./buy_void_preappend_plain_input_v1.js";
import { VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1 } from "./buy_void_crash_consistent_saga_server_policy_v1.js";

export const VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_BINDING_V1 =
  "VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_BINDING_V1";

export const VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_AUTHORITY_V1 =
  Object.freeze({
    source_only_snapshot_classifier: true,
    exact_accepted_event_line_commitment: true,
    canonical_payment_identity_reused: true,
    canonical_allocation_ledger_classifier_reused: true,
    descriptor_bound_read: false,
    independently_proven_event_fsync: false,
    source_finality_verification: false,
    protected_high_water_custody: false,
    capacity_lock_held: false,
    request_launch_generation_authority: false,
    runtime_integration: false,
    filesystem_read: false,
    filesystem_write: false,
    payment_verified_append: false,
    allocation_write: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    work_credit_write: false,
    presale_activation: false,
    funds_movement: false,
    production_gate_ready: false,
  });

const REQUEST_ID = /^buyvoid_[a-z0-9]+_[0-9a-f]{8}$/u;
const TX = /^0x[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
// Closed dual-rail native-USDC policy. Matching two caller-provided records
// about another ERC-20 can never make it a valid USDC payment.
const NATIVE_USDC_CONTRACT_BY_CHAIN = Object.freeze({
  base: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  ethereum: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
});
const SHA256_REF = /^sha256:[0-9a-f]{64}$/u;
const HEX_64 = /^[0-9a-f]{64}$/u;
const ACTIVATION_RECEIPT = /^voidbclive1_[0-9a-f]{64}$/u;
const LAUNCH_AUTHORITY_KEYS = Object.freeze([
  "activation_generation", "activation_receipt_id", "activation_receipt_sha256",
  "coupled_launch_id", "expires_at_ms", "generation_tip_sha256",
  "marker", "source_composition_id", "version",
]);
const UNSIGNED = /^(0|[1-9][0-9]*)$/u;
const MAX_JSONL_BYTES = 64 * 1024 * 1024;
const MAX_ROWS = 100_000;
const MICRO = 1_000_000n;
const ECONOMICS = VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1;
const POOL = BigInt(ECONOMICS.canonical_presale_max_void) * MICRO;
const RATE_NUMERATOR = BigInt(ECONOMICS.rate_void_units_numerator);
const RATE_DENOMINATOR = BigInt(ECONOMICS.rate_void_units_denominator);
const UTF8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

export type BuyVoidVerifiedAllocationReplayDecisionV1 = Readonly<{
  ok: boolean;
  status: "verified_allocation_missing" | "allocation_present" | "held";
  marker: typeof VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_BINDING_V1;
  reason: string | null;
  request_id: string | null;
  canonical_payment_identity: string | null;
  payment_verified_event_sha256: string | null;
  allocation_record_id: string | null;
  verified_void_micro: string | null;
  unallocated_verified_void_micro: string | null;
  operation_performed: false;
  authority: typeof VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_AUTHORITY_V1;
}>;

type RecordRow = Record<string, unknown>;
type HistoryRow = { row: RecordRow; exactLine: string };
type RequestState = {
  id: string;
  chain: "base" | "ethereum";
  tx: string;
  voidMicro: bigint;
  usdcMicro: bigint | null;
  delivery: string;
  receive: string;
  usdcContract: string;
  launchAuthority: RecordRow | null;
  // Permanent original-request qualification: later snapshots cannot upgrade
  // an original missing launch/token. Unrelated unverified legacy rows may
  // coexist in the shared request history without authorizing an allocation.
  initialUsdcContractQualified: boolean;
  // Permanent first-row buyer address evidence. Later snapshots may fill
  // pending tx/receive fields, but cannot invent an original buyer wallet.
  initialDeliveryQualified: boolean;
  initialLaunchAuthorityQualified: boolean;
  // Preserve any first or later cross-chain alias conflict as permanent
  // per-request negative evidence, without poisoning unrelated obligations.
  sourceAliasesQualified: boolean;
};
type VerifiedState = {
  request: RequestState;
  paymentIdentity: string;
  eventSha: string;
  logIndex: string;
};

function held(reason: string): BuyVoidVerifiedAllocationReplayDecisionV1 {
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_BINDING_V1,
    reason,
    request_id: null,
    canonical_payment_identity: null,
    payment_verified_event_sha256: null,
    allocation_record_id: null,
    verified_void_micro: null,
    unallocated_verified_void_micro: null,
    operation_performed: false,
    authority: VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_AUTHORITY_V1,
  });
}

function fail(code: string): never { throw new Error(code); }
function sha(bytes: Buffer): string {
  return "sha256:" + createHash("sha256").update(bytes).digest("hex");
}
function isRow(value: unknown): value is RecordRow {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function field(value: unknown, code: string): string {
  if (typeof value !== "string" || !value) fail(code);
  return value;
}
function amount(value: unknown, code: string): bigint {
  if (typeof value !== "string" && typeof value !== "number") fail(code);
  const raw = String(value);
  if (raw.length > 32) fail(code);
  const m = /^(0|[1-9][0-9]*)(?:\.([0-9]{1,6}))?$/u.exec(raw);
  if (!m) fail(code);
  const micro = BigInt(m[1]) * MICRO + BigInt((m[2] || "").padEnd(6, "0") || "0");
  if (micro < 1n || micro > POOL) fail(code);
  return micro;
}
function unsigned(value: unknown, code: string, positive = false): string {
  if (typeof value !== "string" && typeof value !== "number") fail(code);
  const raw = String(value);
  if (raw.length > 30 || !UNSIGNED.test(raw) || (positive && raw === "0")) fail(code);
  return raw;
}
function address(value: unknown, code: string, optional = false): string {
  if (optional && (value === null || value === undefined || value === "")) return "";
  const result = field(value, code).toLowerCase();
  if (!ADDRESS.test(result)) fail(code);
  return result;
}
function chain(value: unknown): "base" | "ethereum" {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  const normalized = raw === "eth" ? "ethereum" : raw;
  if (normalized !== "base" && normalized !== "ethereum") fail("source_chain_invalid");
  return normalized;
}
function sourceAliasMatches(value: unknown, expected: "base" | "ethereum"): boolean {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (raw === "eth" ? "ethereum" : raw) === expected;
}
function txHash(value: unknown, optional = false): string {
  if (optional && (value === null || value === undefined || value === "")) return "";
  const tx = field(value, "transaction_hash_invalid").toLowerCase();
  if (!TX.test(tx)) fail("transaction_hash_invalid");
  return tx;
}

// A caller-supplied Buffer is NOT proof of descriptor custody or fsync. This
// classifier only binds the byte history that a later trusted reader provides.
// A caller-owned Buffer can shadow .length with an own data property/getter,
// or be a Proxy that forwards Buffer.isBuffer while altering its apparent size.
// Buffer.from(callerBuffer) also trusts the shadowed length. Use intrinsic typed
// array slots to bound and DETACH a snapshot before making replay decisions.
const TYPED_ARRAY_PROTO_V1 = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_LENGTH_GETTER_V1 =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTO_V1, "length")?.get;
const TYPED_ARRAY_BUFFER_GETTER_V1 =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTO_V1, "buffer")?.get;
const TYPED_ARRAY_SET_V1 = Uint8Array.prototype.set;
const TYPED_ARRAY_SUBARRAY_V1 = Uint8Array.prototype.subarray;

function detachedJsonlBytesV1(value: unknown, label: string): Buffer {
  const invalid = () => fail(label + "_bytes_invalid");
  if (
    utilTypes.isProxy(value) ||
    !Buffer.isBuffer(value) ||
    Object.getPrototypeOf(value) !== Buffer.prototype ||
    Object.getOwnPropertyDescriptor(value, "length") ||
    Object.getOwnPropertyDescriptor(value, "byteLength") ||
    Object.getOwnPropertyDescriptor(value, "buffer") ||
    !TYPED_ARRAY_LENGTH_GETTER_V1 ||
    !TYPED_ARRAY_BUFFER_GETTER_V1
  ) invalid();

  let count: number;
  let backing: ArrayBufferLike;
  try {
    count = Reflect.apply(TYPED_ARRAY_LENGTH_GETTER_V1!, value, []) as number;
    backing = Reflect.apply(
      TYPED_ARRAY_BUFFER_GETTER_V1!, value, [],
    ) as ArrayBufferLike;
  } catch {
    return invalid();
  }
  if (
    !Number.isSafeInteger(count) ||
    count < 0 ||
    count > MAX_JSONL_BYTES ||
    utilTypes.isSharedArrayBuffer(backing)
  ) invalid();
  try {
    // Slice with zero output bytes deliberately probes for a detached buffer:
    // a detached prior-event Buffer must not silently become empty history.
    Reflect.apply(ArrayBuffer.prototype.slice, backing, [0, 0]);
    const detached = Buffer.alloc(count);
    Reflect.apply(TYPED_ARRAY_SET_V1, detached, [value, 0]);
    return detached;
  } catch {
    return invalid();
  }
}

// Treat JSONL replay history as an ordered sequence of own data slots.
// Ambient Array.prototype.map/iterators/sorters cannot select later rows.
function ownArrayIndexV1<T>(
  values: readonly T[], index: number, label: string,
): T {
  if (!Array.isArray(values) || index < 0 || index >= values.length) fail(label);
  const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
  if (!descriptor || !Object.hasOwn(descriptor, "value")) fail(label);
  return descriptor.value as T;
}
function exactOwnFieldsV1(
  value: Record<string, unknown>, expected: readonly string[],
): boolean {
  const keys = Reflect.ownKeys(value);
  if (keys.length !== expected.length) return false;
  for (let index = 0; index < keys.length; index += 1) {
    const key = ownArrayIndexV1(keys, index, "object_key_slot_invalid");
    if (typeof key !== "string") return false;
    let found = false;
    for (let j = 0; j < expected.length; j += 1) {
      if (key === ownArrayIndexV1(expected, j, "expected_key_slot_invalid")) {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}
function rows(bytes: Buffer, label: string): HistoryRow[] {
  const detached = detachedJsonlBytesV1(bytes, label);
  if (detached.length === 0) return [];
  // Validate the entire UTF-8 stream first, preserving the original fatal
  // decoder boundary even when a malformed later row follows a valid row.
  UTF8.decode(detached);
  if (detached[detached.length - 1] !== 0x0a) {
    fail(label + "_truncated_or_noncanonical");
  }
  // A mutable String.prototype.split/slice/endsWith can suppress R0 before
  // any Array own-slot checks. Frame each row using the detached byte indices;
  // never consult a string prototype to select the first buyer snapshot.
  const parsed: HistoryRow[] = [];
  let rowStart = 0;
  let rowIndex = 0;
  for (let cursor = 0; cursor < detached.length; cursor += 1) {
    const octet = detached[cursor];
    if (octet === 0x0d) fail(label + "_truncated_or_noncanonical");
    if (octet !== 0x0a) continue;
    if (rowIndex >= MAX_ROWS) fail(label + "_too_many_rows");
    if (cursor === rowStart) fail(label + "_empty_row");
    const lineBytes = Reflect.apply(
      TYPED_ARRAY_SUBARRAY_V1, detached, [rowStart, cursor],
    ) as Uint8Array;
    const line = UTF8.decode(lineBytes);
    if (!line) fail(label + "_empty_row");
    let value: unknown;
    try { value = JSON.parse(line); } catch { fail(label + "_json_invalid"); }
    if (!isRow(value) || JSON.stringify(value) !== line) fail(label + "_noncanonical_row");
    Object.defineProperty(parsed, String(rowIndex), {
      value: { row: value, exactLine: line },
      enumerable: true, writable: false, configurable: false,
    });
    rowIndex += 1;
    rowStart = cursor + 1;
  }
  if (rowStart !== detached.length) fail(label + "_truncated_or_noncanonical");
  return parsed;
}

// Mirror the pure canonical allocation planner's exact *shape* contract.
// It cannot authenticate the launch-generation receipt or its historical origin.
function canonicalLaunchAuthority(value: unknown): RecordRow | null {
  if (value === null || value === undefined) return null;
  if (!isRow(value) || !exactOwnFieldsV1(value, LAUNCH_AUTHORITY_KEYS) ||
      value.marker !== "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1" ||
      value.version !== 1 ||
      typeof value.expires_at_ms !== "number" ||
      !Number.isSafeInteger(value.expires_at_ms) || value.expires_at_ms < 1 ||
      typeof value.activation_receipt_id !== "string" ||
      !ACTIVATION_RECEIPT.test(value.activation_receipt_id) ||
      typeof value.activation_receipt_sha256 !== "string" ||
      !HEX_64.test(value.activation_receipt_sha256) ||
      typeof value.activation_generation !== "string" ||
      !TX.test(value.activation_generation)) {
    fail("request_launch_authority_invalid");
  }
  for (let index = 0; index < 3; index += 1) {
    const name = index === 0 ? "coupled_launch_id" :
      index === 1 ? "source_composition_id" : "generation_tip_sha256";
    if (typeof value[name] !== "string" || !SHA256_REF.test(value[name])) {
      fail("request_launch_authority_invalid");
    }
  }
  return value;
}

// Canonical launch authority has a fixed, validated nine-member primitive tuple.
// JSON member ordering is not authority; a changed/erased value still HOLDS.
function sameCanonicalLaunchAuthority(a: RecordRow, b: RecordRow): boolean {
  for (let index = 0; index < LAUNCH_AUTHORITY_KEYS.length; index += 1) {
    const key = ownArrayIndexV1(LAUNCH_AUTHORITY_KEYS, index, "launch_key_invalid");
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function requestState(requestRows: HistoryRow[]): Map<string, RequestState> {
  const states = new Map<string, RequestState>();
  // Track every exact historical snapshot. A -> B -> A is rollback/replay
  // evidence even if B changed only an untracked field such as status.
  const previousLines = new Map<string, Set<string>>();
  for (let index = 0; index < requestRows.length; index += 1) {
    const { row, exactLine } =
      ownArrayIndexV1(requestRows, index, "request_history_slot_invalid");
    const id = field(row.request_id, "request_id_invalid");
    if (!REQUEST_ID.test(id)) fail("request_id_invalid");
    // Explicit source chain is mandatory. A conflicting/invalid alias
    // permanently disqualifies THIS request, never a separate request that
    // has no relationship to it through the target or verified history.
    const sourceChain = chain(row.source_chain);
    const aliasesQualified =
      (!Object.hasOwn(row, "payment_chain") ||
        sourceAliasMatches(row.payment_chain, sourceChain)) &&
      (!Object.hasOwn(row, "chain") ||
        sourceAliasMatches(row.chain, sourceChain));
    const tx = txHash(row.tx_hash, true);
    const quoted = amount(row.quoted_void, "request_quote_invalid");
    const usdc = row.usdc_amount === undefined || row.usdc_amount === null
      ? null : amount(row.usdc_amount, "request_usdc_invalid");
    const delivery = address(row.delivery_address, "request_delivery_invalid", true);
    const receive = address(row.receive_address, "request_receive_invalid", true);
    const usdcContract = address(row.usdc_contract, "request_usdc_contract_invalid", true);
    const authority = canonicalLaunchAuthority(row.launch_authority);
    const prev = states.get(id);
    if (!prev) {
      // Keep original absence as permanent negative evidence instead of
      // aborting classification of an unrelated, fully qualified request.
      states.set(id, {
        id, chain: sourceChain, tx, voidMicro: quoted, usdcMicro: usdc,
        delivery, receive, usdcContract, launchAuthority: authority,
        initialUsdcContractQualified: Boolean(usdcContract),
        initialDeliveryQualified: Boolean(delivery),
        initialLaunchAuthorityQualified: authority !== null,
        sourceAliasesQualified: aliasesQualified,
      });
      // Construct duplicate-evidence membership without invoking an
      // ambient Array.prototype iterator on a one-element literal.
      const firstSeen = new Set<string>();
      firstSeen.add(exactLine);
      previousLines.set(id, firstSeen);
      continue;
    }
    const seen = previousLines.get(id);
    if (!seen || seen.has(exactLine)) fail("request_history_duplicate_snapshot");
    // Request history is append-only full snapshots. Once a field is populated,
    // a later snapshot may not erase it and fall back to stale prior bytes.
    if (prev.chain !== sourceChain || prev.voidMicro !== quoted ||
      (prev.tx && prev.tx !== tx) ||
      (prev.usdcMicro !== null && prev.usdcMicro !== usdc) ||
      (prev.delivery && prev.delivery !== delivery) ||
      (prev.receive && prev.receive !== receive) ||
      (prev.usdcContract && prev.usdcContract !== usdcContract) ||
      (prev.launchAuthority && (!authority ||
        !sameCanonicalLaunchAuthority(prev.launchAuthority, authority)))) {
      fail("request_history_lineage_drift");
    }
    states.set(id, {
      id, chain: sourceChain, tx: prev.tx || tx, voidMicro: quoted,
      usdcMicro: prev.usdcMicro ?? usdc,
      delivery: prev.delivery || delivery, receive: prev.receive || receive,
      usdcContract: prev.usdcContract || usdcContract,
      launchAuthority: prev.launchAuthority || authority,
      initialUsdcContractQualified: prev.initialUsdcContractQualified,
      initialDeliveryQualified: prev.initialDeliveryQualified,
      initialLaunchAuthorityQualified: prev.initialLaunchAuthorityQualified,
      sourceAliasesQualified: prev.sourceAliasesQualified && aliasesQualified,
    });
    seen.add(exactLine);
  }
  return states;
}

function bindVerifiedEvent(item: HistoryRow, requests: Map<string, RequestState>): VerifiedState {
  const { row, exactLine } = item;
  if (row.schema !== "void_buy_void_verified_payment_event_v2" ||
      row.marker !== "VOID_BUY_VOID_VERIFIED_PAYMENT_V2" ||
      row.operator_status !== "payment_verified" ||
      row.payment_verified !== true || row.payment_identity_input_complete !== true) {
    fail("verified_payment_v2_identity_incomplete");
  }
  const requestId = field(row.request_id, "verified_event_request_id_missing");
  const request = requests.get(requestId);
  if (!request) fail("verified_event_request_lineage_missing");
  if (!request.sourceAliasesQualified) fail("request_source_chain_alias_mismatch");
  // Require original first-row token/launch evidence for every verified
  // obligation, not merely the requested ID or an already-allocated row.
  if (!request.initialUsdcContractQualified) fail("request_initial_usdc_contract_missing");
  if (!request.initialDeliveryQualified) fail("request_initial_delivery_address_missing");
  if (!request.initialLaunchAuthorityQualified) fail("request_initial_launch_authority_missing");
  if (!request.tx || !request.delivery || !request.receive || request.usdcMicro === null) {
    fail("verified_event_request_lineage_missing");
  }
  if (!request.launchAuthority) fail("verified_event_request_launch_authority_missing");
  if (!request.usdcContract) fail("verified_event_request_usdc_contract_missing");
  if (request.usdcContract !== NATIVE_USDC_CONTRACT_BY_CHAIN[request.chain]) {
    fail("verified_event_request_non_native_usdc_contract");
  }
  if (row.quoted_void === undefined || amount(row.quoted_void, "verified_event_quote_invalid") !== request.voidMicro) {
    fail("verified_event_request_quote_mismatch");
  }
  if (request.voidMicro * RATE_DENOMINATOR !== request.usdcMicro * RATE_NUMERATOR) {
    fail("verified_event_presale_economics_mismatch");
  }
  if (!isRow(row.payment_verifier)) fail("verified_event_verifier_missing");
  const v = row.payment_verifier;
  const sourceChain = chain(v.chain);
  const paymentTx = txHash(v.transaction_hash);
  const logIndex = unsigned(v.log_index, "verified_event_log_index_invalid");
  if (BigInt(logIndex) > 0xffff_ffffn || sourceChain !== request.chain ||
      txHash(row.tx_hash) !== request.tx || paymentTx !== request.tx) {
    fail("verified_event_transaction_binding_mismatch");
  }
  if (address(v.usdc_contract, "verified_event_usdc_contract_invalid") !== request.usdcContract) {
    fail("verified_event_usdc_contract_mismatch");
  }
  if (address(v.delivery_address, "verified_event_delivery_invalid") !== request.delivery ||
      address(v.from_address, "verified_event_from_invalid") !== request.delivery ||
      address(v.receive_address, "verified_event_receive_invalid") !== request.receive ||
      unsigned(v.amount_units, "verified_event_amount_units_invalid", true) !== request.usdcMicro.toString() ||
      unsigned(v.requested_units, "verified_event_requested_units_invalid", true) !== request.usdcMicro.toString()) {
    fail("verified_event_destination_or_amount_mismatch");
  }
  unsigned(v.block_number, "verified_event_block_invalid", true);
  unsigned(v.confirmations, "verified_event_confirmations_invalid", true);
  const identity = canonicalBuyVoidPaymentIdentityV1({
    source_chain: sourceChain,
    payment_transaction_hash: paymentTx,
    payment_log_index: logIndex,
  });
  return { request, paymentIdentity: identity, eventSha: sha(Buffer.from(exactLine + "\n", "utf8")), logIndex };
}

// This cannot authorize allocation or prove that the provided snapshot is
// from retained, independently protected filesystem descriptors. It solely
// diagnoses a missing versus matching canonical reservation under one input.
export function classifyBuyVoidVerifiedAllocationReplayBindingV1(input: {
  request_id: string;
  requests_jsonl: Buffer;
  operator_events_jsonl: Buffer;
  allocation_jsonl: Buffer;
}): BuyVoidVerifiedAllocationReplayDecisionV1 {
  try {
    if (!isRow(input) || !exactOwnFieldsV1(input, [
        "request_id", "requests_jsonl", "operator_events_jsonl", "allocation_jsonl",
      ])) {
      fail("replay_binding_input_shape_invalid");
    }
    const target = field(input.request_id, "replay_binding_request_id_invalid");
    if (!REQUEST_ID.test(target)) fail("replay_binding_request_id_invalid");
    const requests = requestState(rows(input.requests_jsonl, "requests"));
    const targetRequest = requests.get(target);
    if (!targetRequest) fail("replay_binding_request_absent");
    if (!targetRequest.sourceAliasesQualified) fail("request_source_chain_alias_mismatch");
    // Do not describe a legacy target as recoverable even when no verified
    // payment exists. Unrelated unverified legacy rows are not global blockers.
    if (!targetRequest.initialUsdcContractQualified) fail("request_initial_usdc_contract_missing");
    if (!targetRequest.initialDeliveryQualified) fail("request_initial_delivery_address_missing");
    if (!targetRequest.initialLaunchAuthorityQualified) fail("request_initial_launch_authority_missing");
    const operatorRows = rows(input.operator_events_jsonl, "operator_events");
    const byRequest = new Map<string, VerifiedState>();
    const byIdentity = new Map<string, VerifiedState>();
    let verifiedMicro = 0n;
    for (let index = 0; index < operatorRows.length; index += 1) {
      const item =
        ownArrayIndexV1(operatorRows, index, "operator_history_slot_invalid");
      const { row } = item;
      const id = field(row.request_id, "operator_event_request_id_invalid");
      if (!REQUEST_ID.test(id) || typeof row.operator_status !== "string") {
        fail("operator_event_invalid");
      }
      const verified = row.operator_status === "payment_verified";
      if (row.payment_verified === true && !verified) fail("operator_event_conflicting_status");
      if (!verified) continue;
      const binding = bindVerifiedEvent(item, requests);
      if (byRequest.has(id) || byIdentity.has(binding.paymentIdentity)) {
        fail("verified_payment_duplicate_or_conflicting_event");
      }
      byRequest.set(id, binding);
      byIdentity.set(binding.paymentIdentity, binding);
      verifiedMicro += binding.request.voidMicro;
      if (verifiedMicro > POOL) fail("verified_payment_capacity_exceeded");
    }
    const event = byRequest.get(target);
    if (!event) fail("replay_binding_verified_payment_missing");

    // First validate the ORIGINAL allocation bytes: the older hash-chain
    // reader parses with Buffer.toString("utf8"), which replaces malformed
    // UTF-8. No decoded/sanitized history may stand in for supplied bytes.
    // This also rejects CRLF, duplicate JSON members and noncanonical rows
    // before canonical #2433 allocation hashes and inventory are checked.
    const allocationHistory =
      detachedJsonlBytesV1(input.allocation_jsonl, "allocation");
    rows(allocationHistory, "allocation");
    const allocation =
      classifyBuyVoidAllocationReservationLedgerV1(allocationHistory);
    if (allocation.ok === false) fail("allocation_history_" + allocation.reason);
    let allocatedMicro = 0n;
    let matched: (typeof allocation.records)[number] | null = null;
    for (let index = 0; index < allocation.records.length; index += 1) {
      const record = ownArrayIndexV1(
        allocation.records, index, "allocation_history_slot_invalid",
      );
      const accepted = byRequest.get(record.request_id);
      if (!accepted || record.canonical_payment_identity !== accepted.paymentIdentity ||
          record.payment_verified_event_sha256 !== accepted.eventSha ||
          amount(record.quote_void_amount, "allocation_void_amount_invalid") !== accepted.request.voidMicro ||
          amount(record.quote_usdc_amount, "allocation_usdc_amount_invalid") !== accepted.request.usdcMicro ||
          record.buyer_delivery_wallet !== accepted.request.delivery ||
          record.source_chain !== accepted.request.chain ||
          record.payment_transaction_hash !== accepted.request.tx ||
          record.payment_log_index !== accepted.logIndex) {
        fail("allocation_history_event_lineage_mismatch");
      }
      // A canonical allocation may not borrow a different sale generation.
      // The request history must contain the exact original launch authority.
      const launch = accepted.request.launchAuthority;
      if (!launch || launch.marker !== "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1" ||
          launch.version !== 1 ||
          record.coupled_launch_id !== launch.coupled_launch_id ||
          record.source_composition_id !== launch.source_composition_id ||
          record.activation_generation !== launch.activation_generation ||
          record.generation_tip_sha256 !== launch.generation_tip_sha256 ||
          record.activation_receipt_id !== launch.activation_receipt_id ||
          record.activation_receipt_sha256 !== launch.activation_receipt_sha256 ||
          record.expires_at_ms !== launch.expires_at_ms) {
        fail("allocation_history_request_launch_lineage_mismatch");
      }
      allocatedMicro += accepted.request.voidMicro;
      if (record.request_id === target) matched = record;
    }
    if (allocatedMicro > verifiedMicro) fail("allocation_history_exceeds_verified_capacity");
    return Object.freeze({
      ok: matched !== null,
      status: matched ? "allocation_present" : "verified_allocation_missing",
      marker: VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_BINDING_V1,
      reason: matched ? null : "verified_allocation_requires_protected_recovery",
      request_id: target,
      canonical_payment_identity: event.paymentIdentity,
      payment_verified_event_sha256: event.eventSha,
      allocation_record_id: matched?.record_id ?? null,
      verified_void_micro: verifiedMicro.toString(),
      unallocated_verified_void_micro: (verifiedMicro - allocatedMicro).toString(),
      operation_performed: false,
      authority: VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : "replay_binding_unknown_hold");
  }
}


export const VOID_BUY_VOID_PREAPPEND_VERIFIED_PAYMENT_LINEAGE_V1 =
  "VOID_BUY_VOID_PREAPPEND_VERIFIED_PAYMENT_LINEAGE_V1";

export const VOID_BUY_VOID_PREAPPEND_VERIFIED_PAYMENT_LINEAGE_AUTHORITY_V1 =
  Object.freeze({
    source_only_classifier: true,
    canonical_replay_classifier_reused: true,
    original_request_history_reused: true,
    hypothetical_event_only: true,
    filesystem_read: false,
    filesystem_write: false,
    payment_verified_append: false,
    allocation_write: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    funds_movement: false,
    production_gate_ready: false,
  });

export type BuyVoidPreappendVerifiedPaymentLineageDecisionV1 = Readonly<{
  ok: boolean;
  status: "ready" | "held";
  marker: typeof VOID_BUY_VOID_PREAPPEND_VERIFIED_PAYMENT_LINEAGE_V1;
  reason: string | null;
  request_id: string | null;
  canonical_payment_identity: string | null;
  payment_verified_event_sha256: string | null;
  operation_performed: false;
  authority:
    typeof VOID_BUY_VOID_PREAPPEND_VERIFIED_PAYMENT_LINEAGE_AUTHORITY_V1;
}>;

function preappendHeld(
  reason: string,
): BuyVoidPreappendVerifiedPaymentLineageDecisionV1 {
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PREAPPEND_VERIFIED_PAYMENT_LINEAGE_V1,
    reason,
    request_id: null,
    canonical_payment_identity: null,
    payment_verified_event_sha256: null,
    operation_performed: false,
    authority:
      VOID_BUY_VOID_PREAPPEND_VERIFIED_PAYMENT_LINEAGE_AUTHORITY_V1,
  });
}

// Pure pre-fsync admission over already descriptor-bound snapshots. This reuses
// the canonical replay classifier on the exact event bytes that would be
// appended, then binds the separate caller request to the same canonical
// request-state history. It performs no filesystem or runtime operation.
export function classifyBuyVoidPreappendVerifiedPaymentLineageV1(input: {
  request: unknown;
  event: unknown;
  requests_jsonl: Buffer;
  prior_operator_events_jsonl: Buffer;
  allocation_jsonl: Buffer;
}): BuyVoidPreappendVerifiedPaymentLineageDecisionV1 {
  try {
    // Snapshot the fixed five-field input through own data descriptors.
    // Caller Proxies/getters/toJSON must never execute while deriving the
    // hypothetical durable payment line or reading original buyer fields.
    // The resulting null-prototype JSON objects retain ordinary key order.
    const detachedInput = snapshotBuyVoidPreappendPlainInputV1(input);
    const requestHistory =
      detachedJsonlBytesV1(detachedInput.requests_jsonl, "requests");
    const priorOperatorHistory =
      detachedJsonlBytesV1(detachedInput.prior_operator_events_jsonl, "operator_events");
    const allocationHistory =
      detachedJsonlBytesV1(detachedInput.allocation_jsonl, "allocation");
    const candidateRequest = detachedInput.request;
    const candidateEvent = detachedInput.event;

    const requestId = field(
      candidateEvent.request_id,
      "preappend_lineage_request_id_invalid",
    );
    if (!REQUEST_ID.test(requestId)) {
      fail("preappend_lineage_request_id_invalid");
    }

    const eventLine = Buffer.from(
      JSON.stringify(candidateEvent) + "\n",
      "utf8",
    );
    const proposedLength = priorOperatorHistory.length + eventLine.length;
    if (proposedLength > MAX_JSONL_BYTES) {
      fail("operator_events_bytes_invalid");
    }
    const proposedOperatorEvents = Buffer.concat([
      priorOperatorHistory,
      eventLine,
    ], proposedLength);
    const replay = classifyBuyVoidVerifiedAllocationReplayBindingV1({
      request_id: requestId,
      requests_jsonl: requestHistory,
      operator_events_jsonl: proposedOperatorEvents,
      allocation_jsonl: allocationHistory,
    });
    const eventSha = sha(eventLine);
    if (
      replay.status !== "verified_allocation_missing" ||
      replay.request_id !== requestId ||
      replay.payment_verified_event_sha256 !== eventSha ||
      !replay.canonical_payment_identity
    ) {
      fail(
        "preappend_strict_replay_" +
          String(replay.reason || replay.status),
      );
    }

    // Reuse the same canonical chronology parser rather than selecting a
    // caller-chosen or merely latest JSON row.
    const requests = requestState(
      rows(requestHistory, "requests"),
    );
    const original = requests.get(requestId);
    if (
      !original ||
      !original.sourceAliasesQualified ||
      !original.initialUsdcContractQualified ||
      !original.initialDeliveryQualified ||
      !original.initialLaunchAuthorityQualified ||
      !original.tx ||
      !original.delivery ||
      !original.receive ||
      !original.usdcContract ||
      original.usdcMicro === null ||
      !original.launchAuthority
    ) {
      fail("preappend_original_request_unqualified");
    }

    if (
      field(
        candidateRequest.request_id,
        "preappend_caller_request_id_invalid",
      ) !== requestId
    ) {
      fail("preappend_caller_request_id_mismatch");
    }
    const callerChain = chain(candidateRequest.source_chain);
    if (
      callerChain !== original.chain ||
      (Object.hasOwn(candidateRequest, "payment_chain") &&
        !sourceAliasMatches(candidateRequest.payment_chain, callerChain)) ||
      (Object.hasOwn(candidateRequest, "chain") &&
        !sourceAliasMatches(candidateRequest.chain, callerChain))
    ) {
      fail("preappend_caller_source_chain_mismatch");
    }
    if (
      txHash(candidateRequest.tx_hash, true) !== original.tx
    ) {
      fail("preappend_caller_transaction_mismatch");
    }
    if (
      address(
        candidateRequest.delivery_address,
        "preappend_caller_delivery_invalid",
      ) !== original.delivery
    ) {
      fail("preappend_caller_delivery_address_mismatch");
    }
    if (
      address(
        candidateRequest.receive_address,
        "preappend_caller_receive_invalid",
      ) !== original.receive
    ) {
      fail("preappend_caller_receive_address_mismatch");
    }
    if (
      address(
        candidateRequest.usdc_contract,
        "preappend_caller_usdc_contract_invalid",
      ) !== original.usdcContract
    ) {
      fail("preappend_caller_usdc_contract_mismatch");
    }
    if (
      amount(
        candidateRequest.quoted_void,
        "preappend_caller_quote_invalid",
      ) !== original.voidMicro
    ) {
      fail("preappend_caller_quoted_void_mismatch");
    }
    if (
      amount(
        candidateRequest.usdc_amount,
        "preappend_caller_usdc_invalid",
      ) !== original.usdcMicro
    ) {
      fail("preappend_caller_usdc_amount_mismatch");
    }
    const callerLaunch =
      canonicalLaunchAuthority(candidateRequest.launch_authority);
    if (
      !callerLaunch ||
      !sameCanonicalLaunchAuthority(
        callerLaunch,
        original.launchAuthority,
      )
    ) {
      fail("preappend_caller_launch_authority_mismatch");
    }

    return Object.freeze({
      ok: true,
      status: "ready",
      marker: VOID_BUY_VOID_PREAPPEND_VERIFIED_PAYMENT_LINEAGE_V1,
      reason: null,
      request_id: requestId,
      canonical_payment_identity: replay.canonical_payment_identity,
      payment_verified_event_sha256: eventSha,
      operation_performed: false,
      authority:
        VOID_BUY_VOID_PREAPPEND_VERIFIED_PAYMENT_LINEAGE_AUTHORITY_V1,
    });
  } catch (error) {
    return preappendHeld(
      error instanceof Error
        ? error.message
        : "preappend_lineage_unknown_hold",
    );
  }
}
