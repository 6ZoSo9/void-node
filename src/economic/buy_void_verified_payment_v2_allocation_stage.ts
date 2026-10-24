// Unmounted staging connector: authenticate the exact private V2 transport,
// then classify a SERVER-SUPPLIED verified-payment event through the canonical
// allocation-required dispatcher planner. No writer, IPC, RPC or funds access.
import { createHash } from "node:crypto";
import path from "node:path";
import { types as utilTypes } from "node:util";
import {
  planBuyVoidOperatorAllocationDispatchV1,
  VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
  VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
  type BuyVoidOperatorAllocationDispatchInputV1,
} from "./buy_void_operator_verified_allocation_dispatch_v1.js";
import {
  authorizeBuyVoidVerifiedPaymentTransportV2,
} from "./buy_void_verified_payment_transport_v2.js";
import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1,
} from "./buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  classifyBuyVoidPreappendVerifiedPaymentLineageV1,
} from "./buy_void_verified_allocation_replay_binding_v1.js";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_V2_ALLOCATION_STAGE =
  "VOID_BUY_VOID_VERIFIED_PAYMENT_V2_ALLOCATION_STAGE";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_V2_ALLOCATION_STAGE_AUTHORITY =
  Object.freeze({
    transport_authenticated_before_planner: true,
    server_supplied_inputs_only: true,
    canonical_allocation_required_planner_reused: true,
    legacy_payment_only_path_forbidden: true,
    allocation_roots_canonical: true,
    event_and_request_immutable_snapshot: true,
    payment_instruction_amount_bound: true,
    canonical_first_request_lineage_preflight_required: true,
    request_history_source_authenticated: false,
    source_only_unmounted: true,
    source_finality_authentication_verified: false,
    cross_uid_service_authenticated: false,
    mounted_verified_allocation_dispatch: false,
    payment_capacity_lock_verified: false,
    payment_acceptance: false,
    presale_activation: false,
    funds_movement: false,
  });

const stringify = JSON.stringify;
const REQUEST_ID = /^buyvoid_[a-z0-9]+_[0-9a-f]{8}$/u;
const TX_HASH = /^0x[0-9a-fA-F]{64}$/u;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const DECIMAL_VOID = /^(0|[1-9][0-9]*)(?:\.([0-9]{1,6}))?$/u;
const MICRO_VOID = 1_000_000n;
const ECON = VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1;
const MAX_PRESALE_VOID_MICRO = BigInt(ECON.canonical_presale_max_void) *
  MICRO_VOID;
const NATIVE_USDC_BY_CHAIN: Readonly<Record<string, string>> = Object.freeze({
  base: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  ethereum: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
});

const MAX_LINEAGE_HISTORY_BYTES = 64 * 1024 * 1024;
const LINEAGE_TYPED_ARRAY_PROTO = Object.getPrototypeOf(Uint8Array.prototype);
const LINEAGE_TYPED_ARRAY_LENGTH_GETTER =
  Object.getOwnPropertyDescriptor(LINEAGE_TYPED_ARRAY_PROTO, "length")?.get;
const LINEAGE_TYPED_ARRAY_BUFFER_GETTER =
  Object.getOwnPropertyDescriptor(LINEAGE_TYPED_ARRAY_PROTO, "buffer")?.get;
const LINEAGE_REFLECT_APPLY_NATIVE = Reflect.apply;
const LINEAGE_IS_SHARED_BACKING_NATIVE = utilTypes.isSharedArrayBuffer;
const LINEAGE_TYPED_ARRAY_SET_NATIVE = Uint8Array.prototype.set;

function detachLineageHistoryBuffer(
  value: unknown,
  label: string,
): Buffer {
  const invalid = (): never => hold(label + "_bytes_invalid");
  if (
    utilTypes.isProxy(value) ||
    !Buffer.isBuffer(value) ||
    Object.getPrototypeOf(value) !== Buffer.prototype ||
    Object.getOwnPropertyDescriptor(value, "length") ||
    Object.getOwnPropertyDescriptor(value, "byteLength") ||
    Object.getOwnPropertyDescriptor(value, "buffer") ||
    !LINEAGE_TYPED_ARRAY_LENGTH_GETTER ||
    !LINEAGE_TYPED_ARRAY_BUFFER_GETTER
  ) {
    return invalid();
  }

  let count: number;
  let backing: ArrayBufferLike;
  try {
    count = LINEAGE_REFLECT_APPLY_NATIVE(
      LINEAGE_TYPED_ARRAY_LENGTH_GETTER,
      value,
      [],
    ) as number;
    backing = LINEAGE_REFLECT_APPLY_NATIVE(
      LINEAGE_TYPED_ARRAY_BUFFER_GETTER,
      value,
      [],
    ) as ArrayBufferLike;
  } catch {
    return invalid();
  }

  if (
    !Number.isSafeInteger(count) ||
    count < 0 ||
    count > MAX_LINEAGE_HISTORY_BYTES ||
    LINEAGE_IS_SHARED_BACKING_NATIVE(backing)
  ) {
    return invalid();
  }

  try {
    // Intrinsic TypedArray#set validates the source typed array's backing
    // store and throws on detachment, including a detached zero-length Buffer.
    // Unlike ArrayBuffer#slice it does not perform SpeciesConstructor lookup
    // on caller-controlled backing-object properties.
    const detached = Buffer.alloc(count);
    LINEAGE_REFLECT_APPLY_NATIVE(
      LINEAGE_TYPED_ARRAY_SET_NATIVE,
      detached,
      [value, 0],
    );
    return detached;
  } catch {
    return invalid();
  }
}

export type BuyVoidVerifiedPaymentV2LineageHistoryInput = Readonly<{
  requests_jsonl: Buffer;
  prior_operator_events_jsonl: Buffer;
  allocation_jsonl: Buffer;
}>;

const HISTORY_INPUT_KEYS = Object.freeze([
  "allocation_jsonl",
  "prior_operator_events_jsonl",
  "requests_jsonl",
]);

function captureLineageHistoryInput(
  input: unknown,
): BuyVoidVerifiedPaymentV2LineageHistoryInput {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      utilTypes.isProxy(input)) {
    hold("lineage_history_container_not_plain_data");
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    hold("lineage_history_container_not_plain_data");
  }
  const keys = Reflect.ownKeys(input);
  if (keys.length !== HISTORY_INPUT_KEYS.length) {
    hold("lineage_history_fields_invalid");
  }
  const captured: Record<string, Buffer> = Object.create(null);
  for (const key of HISTORY_INPUT_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")) {
      hold("lineage_history_fields_invalid");
    }
    captured[key] = detachLineageHistoryBuffer(
      descriptor.value,
      "lineage_history_" + key,
    );
  }
  for (const key of keys) {
    if (typeof key !== "string" || !HISTORY_INPUT_KEYS.includes(key)) {
      hold("lineage_history_fields_invalid");
    }
  }
  return Object.freeze(captured) as BuyVoidVerifiedPaymentV2LineageHistoryInput;
}

// The request-first public checkout records numeric quotes. Some reviewed
// private event formats use decimal text. Preserve both primitive types but
// never coerce missing/null/objects, whitespace or exponent notation.
function canonicalPositiveQuoteMicro(value: unknown): bigint | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "number" &&
      (!Number.isFinite(value) || value <= 0 || Object.is(value, -0))) {
    return null;
  }
  const raw = typeof value === "number" ? String(value) : value;
  if (raw.length < 1 || raw.length > 24) return null;
  const parsed = DECIMAL_VOID.exec(raw);
  if (!parsed) return null;
  const micro = BigInt(parsed[1]) * MICRO_VOID +
    BigInt((parsed[2] || "").padEnd(6, "0") || "0");
  return micro > 0n && micro <= MAX_PRESALE_VOID_MICRO ? micro : null;
}
function canonicalPositiveUnitText(value: unknown): bigint | null {
  if (typeof value !== "string" ||
      value.length < 1 || value.length > 20 ||
      !/^[1-9][0-9]*$/u.test(value)) {
    return null;
  }
  const units = BigInt(value);
  return units > 0n && units <= MAX_PRESALE_VOID_MICRO ? units : null;
}
function hold(reason: string): never {
  throw new Error("buy_void_verified_payment_v2_allocation_stage_" + reason);
}
function sameHex(a: unknown, b: unknown, shape: RegExp): boolean {
  return typeof a === "string" && typeof b === "string" &&
    shape.test(a) && shape.test(b) &&
    a.toLowerCase() === b.toLowerCase();
}

// This is an internal source preflight, not an HTTP response payload.
// rawServerInput MUST be constructed from the qualified server-side request
// ledger, source-finality verifier and fixed callbacks, never from req.body.
// The function cannot authenticate a payment or obtain custody authority.
export function stageAuthenticatedBuyVoidVerifiedPaymentV2(
  req: unknown,
  res: any,
  rawServerInput: BuyVoidOperatorAllocationDispatchInputV1,
  rawLineageHistory: BuyVoidVerifiedPaymentV2LineageHistoryInput,
) {
  if (!authorizeBuyVoidVerifiedPaymentTransportV2(req, res)) return null;
  // The history container is read only after private transport authentication.
  // These bytes are source-preflight evidence, not authenticated filesystem
  // finality; a later trusted reader must establish their durable origin.
  const lineageHistory = captureLineageHistoryInput(rawLineageHistory);
  // Canonical planner first snapshots all caller state, validates event/status
  // and normalizes the private roots to its two exact reviewed constants.
  const plan = planBuyVoidOperatorAllocationDispatchV1(rawServerInput);
  if (plan.kind !== "verified_payment_allocation_handoff") {
    hold("legacy_payment_only_writer_forbidden");
  }
  if (
    plan.allocation_ledger_root !== VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1 ||
    plan.allocation_high_water_root !==
      VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1
  ) hold("private_roots_not_canonical");

  if (
    typeof plan.request_dir !== "string" ||
    !path.isAbsolute(plan.request_dir) ||
    path.resolve(plan.request_dir) !== plan.request_dir ||
    plan.request_dir === path.parse(plan.request_dir).root ||
    plan.request_dir.includes("\0")
  ) hold("request_root_not_absolute_normalized_private");

  const event = plan.event;
  const original = plan.request;
  const verifier = event.payment_verifier;
  // The real canonical verifier deliberately does NOT emit quoted_void.
  // The quote belongs to the original server-held request and must be
  // independently recomputed from its USDC amount and fixed presale rate.
  // Never fabricate a quote inside the verifier's event to make staging pass.
  const originalQuoteMicro = canonicalPositiveQuoteMicro(original.quoted_void);
  const originalUsdcMicro = canonicalPositiveQuoteMicro(original.usdc_amount);
  const instructedUsdcMicro =
    original.payment_instructions &&
    typeof original.payment_instructions === "object" &&
    !Array.isArray(original.payment_instructions)
      ? canonicalPositiveQuoteMicro(original.payment_instructions.amount)
      : null;
  const verifiedUsdcMicro = canonicalPositiveUnitText(verifier?.amount_units);
  const verifiedRequestMicro =
    canonicalPositiveUnitText(verifier?.requested_units);
  const canonicalRateNumerator = BigInt(ECON.rate_void_units_numerator);
  const canonicalRateDenominator = BigInt(ECON.rate_void_units_denominator);
  const expectedQuoteMicro = originalUsdcMicro !== null &&
      canonicalRateDenominator > 0n &&
      (originalUsdcMicro * canonicalRateNumerator) %
        canonicalRateDenominator === 0n
    ? originalUsdcMicro * canonicalRateNumerator /
      canonicalRateDenominator
    : null;
  const nativeUsdc = typeof original.source_chain === "string"
    ? NATIVE_USDC_BY_CHAIN[original.source_chain] : undefined;
  if (
    event.schema !== "void_buy_void_verified_payment_event_v2" ||
    event.marker !== "VOID_BUY_VOID_VERIFIED_PAYMENT_V2" ||
    event.operator_status !== "payment_verified" ||
    event.payment_verified !== true ||
    event.payment_identity_input_complete !== true ||
    typeof event.request_id !== "string" ||
    !REQUEST_ID.test(event.request_id) ||
    event.request_id !== original.request_id ||
    (original.source_chain !== "base" &&
      original.source_chain !== "ethereum") ||
    !verifier || typeof verifier !== "object" ||
    verifier.chain !== original.source_chain ||
    typeof verifier.log_index !== "string" ||
    !/^(?:0|[1-9][0-9]{0,9})$/u.test(verifier.log_index) ||
    Number(verifier.log_index) > 0xffffffff ||
    Object.hasOwn(event, "quoted_void") ||
    originalQuoteMicro === null ||
    originalUsdcMicro === null ||
    verifiedUsdcMicro === null ||
    verifiedRequestMicro === null ||
    verifiedUsdcMicro !== originalUsdcMicro ||
    verifiedRequestMicro !== originalUsdcMicro ||
    instructedUsdcMicro === null ||
    instructedUsdcMicro !== originalUsdcMicro ||
    expectedQuoteMicro === null ||
    expectedQuoteMicro !== originalQuoteMicro ||
    original.rate_void_per_usdc !== ECON.rate_void_units_numerator ||
    original.price_usdc_per_void !== "0.50" ||
    typeof nativeUsdc !== "string" ||
    !sameHex(verifier.usdc_contract, nativeUsdc, ADDRESS) ||
    !sameHex(original.usdc_contract, nativeUsdc, ADDRESS) ||
    !sameHex(event.tx_hash, original.tx_hash, TX_HASH) ||
    !sameHex(verifier.transaction_hash, original.tx_hash, TX_HASH) ||
    !sameHex(verifier.from_address, original.delivery_address, ADDRESS) ||
    !sameHex(verifier.delivery_address, original.delivery_address, ADDRESS) ||
    !sameHex(verifier.receive_address, original.receive_address, ADDRESS)
  ) hold("event_request_original_identity_mismatch");

  // The canonical replay/preappend classifier owns first-row semantics:
  // later snapshots cannot backfill missing launch authority, native-USDC
  // contract or buyer delivery wallet into allocation authority. The real V2
  // verifier event intentionally has no quote field, so create a separate
  // hypothetical durable-event snapshot solely for this pure classifier.
  const lineageEvent = Object.freeze({
    ...event,
    quoted_void: original.quoted_void,
  });
  const lineage = classifyBuyVoidPreappendVerifiedPaymentLineageV1({
    request: original,
    event: lineageEvent,
    requests_jsonl: lineageHistory.requests_jsonl,
    prior_operator_events_jsonl: lineageHistory.prior_operator_events_jsonl,
    allocation_jsonl: lineageHistory.allocation_jsonl,
  });
  if (
    lineage.ok !== true ||
    lineage.status !== "ready" ||
    lineage.operation_performed !== false ||
    lineage.request_id !== event.request_id
  ) {
    hold("original_request_lineage_unqualified");
  }

  const eventJson = stringify(event);
  const requestJson = stringify(original);
  if (typeof eventJson !== "string" || typeof requestJson !== "string") {
    hold("canonical_snapshot_unavailable");
  }
  const sha = (text: string) =>
    createHash("sha256").update(text, "utf8").digest("hex");

  // Return frozen *internal* snapshots. Never expose their contents to HTTP
  // clients or treat a staging hash as finality, a signature or write authority.
  return Object.freeze({
    marker: VOID_BUY_VOID_VERIFIED_PAYMENT_V2_ALLOCATION_STAGE,
    status: "staged_unmounted" as const,
    kind: plan.kind,
    source_only_unmounted: true as const,
    mounted_verified_allocation_dispatch: false as const,
    event: plan.event,
    request: plan.request,
    request_dir: plan.request_dir,
    allocation_ledger_root: plan.allocation_ledger_root,
    allocation_high_water_root: plan.allocation_high_water_root,
    with_launch_authority_mutation: plan.with_launch_authority_mutation,
    read_sale_state: plan.read_sale_state,
    event_snapshot_sha256: sha(eventJson),
    request_snapshot_sha256: sha(requestJson),
    payment_instruction_amount_bound: true as const,
    canonical_first_request_lineage_preflight_verified: true as const,
    request_history_source_authenticated: false as const,
    source_finality_authentication_verified: false as const,
    cross_uid_service_authenticated: false as const,
    payment_capacity_lock_verified: false as const,
    payment_acceptance: false as const,
    presale_activation: false as const,
    funds_movement: false as const,
  });
}
