// Unmounted staging connector: authenticate the exact private V2 transport,
// then classify a SERVER-SUPPLIED verified-payment event through the canonical
// allocation-required dispatcher planner. No writer, IPC, RPC or funds access.
import { createHash } from "node:crypto";
import path from "node:path";
import {
  planBuyVoidOperatorAllocationDispatchV1,
  VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
  VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
  type BuyVoidOperatorAllocationDispatchInputV1,
} from "./buy_void_operator_verified_allocation_dispatch_v1.js";
import {
  authorizeBuyVoidVerifiedPaymentTransportV2,
} from "./buy_void_verified_payment_transport_v2.js";

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
const MAX_PRESALE_VOID_MICRO = 10_000_000n * MICRO_VOID;

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
) {
  if (!authorizeBuyVoidVerifiedPaymentTransportV2(req, res)) return null;
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
  const eventQuoteMicro = canonicalPositiveQuoteMicro(event.quoted_void);
  const originalQuoteMicro = canonicalPositiveQuoteMicro(original.quoted_void);
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
    eventQuoteMicro === null ||
    originalQuoteMicro === null ||
    eventQuoteMicro !== originalQuoteMicro ||
    event.quoted_void !== original.quoted_void ||
    !sameHex(event.tx_hash, original.tx_hash, TX_HASH) ||
    !sameHex(verifier.transaction_hash, original.tx_hash, TX_HASH) ||
    !sameHex(verifier.from_address, original.delivery_address, ADDRESS) ||
    !sameHex(verifier.delivery_address, original.delivery_address, ADDRESS) ||
    !sameHex(verifier.receive_address, original.receive_address, ADDRESS)
  ) hold("event_request_original_identity_mismatch");

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
    source_finality_authentication_verified: false as const,
    cross_uid_service_authenticated: false as const,
    payment_capacity_lock_verified: false as const,
    payment_acceptance: false as const,
    presale_activation: false as const,
    funds_movement: false as const,
  });
}
