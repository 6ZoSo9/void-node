import { createHash } from "node:crypto";
import { TextDecoder } from "node:util";

import { canonicalBuyVoidPaymentIdentityV1 } from "./buy_void_auto_fulfillment_v1.js";
import { classifyBuyVoidAllocationReservationLedgerV1 } from "./buy_void_allocation_reservation_ledger_v1.js";
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
  launchAuthority: RecordRow | null;
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
  const raw = String(value ?? "base").toLowerCase();
  const normalized = raw === "eth" ? "ethereum" : raw;
  if (normalized !== "base" && normalized !== "ethereum") fail("source_chain_invalid");
  return normalized;
}
function txHash(value: unknown, optional = false): string {
  if (optional && (value === null || value === undefined || value === "")) return "";
  const tx = field(value, "transaction_hash_invalid").toLowerCase();
  if (!TX.test(tx)) fail("transaction_hash_invalid");
  return tx;
}

// A caller-supplied Buffer is NOT proof of descriptor custody or fsync. This
// classifier only binds the byte history that a later trusted reader provides.
function rows(bytes: Buffer, label: string): HistoryRow[] {
  if (!Buffer.isBuffer(bytes) || bytes.length > MAX_JSONL_BYTES) fail(label + "_bytes_invalid");
  if (bytes.length === 0) return [];
  const text = UTF8.decode(bytes);
  if (!text.endsWith("\n") || text.includes("\r")) fail(label + "_truncated_or_noncanonical");
  const lines = text.slice(0, -1).split("\n");
  if (lines.length > MAX_ROWS) fail(label + "_too_many_rows");
  return lines.map((line) => {
    if (!line) fail(label + "_empty_row");
    let value: unknown;
    try { value = JSON.parse(line); } catch { fail(label + "_json_invalid"); }
    if (!isRow(value) || JSON.stringify(value) !== line) fail(label + "_noncanonical_row");
    return { row: value, exactLine: line };
  });
}

function requestState(requestRows: HistoryRow[]): Map<string, RequestState> {
  const states = new Map<string, RequestState>();
  for (const { row } of requestRows) {
    const id = field(row.request_id, "request_id_invalid");
    if (!REQUEST_ID.test(id)) fail("request_id_invalid");
    const sourceChain = chain(row.source_chain ?? row.payment_chain ?? row.chain);
    const tx = txHash(row.tx_hash, true);
    const quoted = amount(row.quoted_void, "request_quote_invalid");
    const usdc = row.usdc_amount === undefined || row.usdc_amount === null
      ? null : amount(row.usdc_amount, "request_usdc_invalid");
    const delivery = address(row.delivery_address, "request_delivery_invalid", true);
    const receive = address(row.receive_address, "request_receive_invalid", true);
    const authority = isRow(row.launch_authority) ? row.launch_authority : null;
    const prev = states.get(id);
    if (!prev) {
      states.set(id, {
        id, chain: sourceChain, tx, voidMicro: quoted, usdcMicro: usdc,
        delivery, receive, launchAuthority: authority,
      });
      continue;
    }
    if (prev.chain !== sourceChain || prev.voidMicro !== quoted ||
      (prev.tx && prev.tx !== tx) || (prev.usdcMicro !== null && usdc !== null && prev.usdcMicro !== usdc) ||
      (prev.delivery && delivery && prev.delivery !== delivery) ||
      (prev.receive && receive && prev.receive !== receive) ||
      (prev.launchAuthority && authority && JSON.stringify(prev.launchAuthority) !== JSON.stringify(authority))) {
      fail("request_history_lineage_drift");
    }
    states.set(id, {
      id, chain: sourceChain, tx: prev.tx || tx, voidMicro: quoted,
      usdcMicro: prev.usdcMicro ?? usdc,
      delivery: prev.delivery || delivery, receive: prev.receive || receive,
      launchAuthority: prev.launchAuthority || authority,
    });
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
  if (!request || !request.tx || !request.delivery || !request.receive || request.usdcMicro === null) {
    fail("verified_event_request_lineage_missing");
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
    if (!isRow(input) || Object.keys(input).sort().join("|") !==
      ["request_id", "requests_jsonl", "operator_events_jsonl", "allocation_jsonl"].sort().join("|")) {
      fail("replay_binding_input_shape_invalid");
    }
    const target = field(input.request_id, "replay_binding_request_id_invalid");
    if (!REQUEST_ID.test(target)) fail("replay_binding_request_id_invalid");
    const requests = requestState(rows(input.requests_jsonl, "requests"));
    if (!requests.has(target)) fail("replay_binding_request_absent");
    const operatorRows = rows(input.operator_events_jsonl, "operator_events");
    const byRequest = new Map<string, VerifiedState>();
    const byIdentity = new Map<string, VerifiedState>();
    let verifiedMicro = 0n;
    for (const item of operatorRows) {
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

    const allocation = classifyBuyVoidAllocationReservationLedgerV1(input.allocation_jsonl);
    if (allocation.ok === false) fail("allocation_history_" + allocation.reason);
    let allocatedMicro = 0n;
    let matched: (typeof allocation.records)[number] | null = null;
    for (const record of allocation.records) {
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
      ok: true,
      status: matched ? "allocation_present" : "verified_allocation_missing",
      marker: VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_BINDING_V1,
      reason: null,
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
