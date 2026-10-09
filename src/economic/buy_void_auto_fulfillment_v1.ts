import crypto from "node:crypto";
import { types as utilTypes } from "node:util";

export const VOID_BUY_VOID_AUTO_FULFILLMENT_V1 =
  "VOID_BUY_VOID_AUTO_FULFILLMENT_V1";

export const VOID_BUY_VOID_AUTO_FULFILLMENT_AUTHORITY_V1 = {
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  filesystem_write: false,
  money_movement: false,
} as const;

const HEX_32 = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const CHAIN = /^[a-z0-9][a-z0-9_-]{1,31}$/;
const MAX_PAYMENT_LOG_INDEX = 0xffff_ffffn;
const AUTO_FULFILLMENT_SNAPSHOT_MAX_TEXT_CODE_UNITS_V1 =
  1024 * 1024;
const AUTO_FULFILLMENT_MAX_ALLOWED_CHAINS_V1 = 32;
const AUTO_FULFILLMENT_MAX_PRIOR_CLAIMS_V1 = 8192;

type AutoFulfillmentDataFieldV1 = Readonly<{
  present: boolean;
  value: unknown;
}>;

function plainAutoFulfillmentRecordV1(
  value: unknown,
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !== "object" ||
    utilTypes.isProxy(value) ||
    Array.isArray(value)
  ) {
    return null;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return null;
  }
  return value as Record<string, unknown>;
}

function ownAutoFulfillmentDataFieldV1(
  recordValue: Record<string, unknown>,
  key: string,
): AutoFulfillmentDataFieldV1 | null {
  const descriptor = Object.getOwnPropertyDescriptor(recordValue, key);
  if (!descriptor) {
    return Object.freeze({ present: false, value: undefined });
  }
  if (
    descriptor.enumerable !== true ||
    !Object.hasOwn(descriptor, "value")
  ) {
    return null;
  }
  if (
    typeof descriptor.value === "string" &&
    descriptor.value.length >
      AUTO_FULFILLMENT_SNAPSHOT_MAX_TEXT_CODE_UNITS_V1
  ) {
    return null;
  }
  return Object.freeze({
    present: true,
    value: descriptor.value,
  });
}

function snapshotAutoFulfillmentSelectedRecordV1(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> | null {
  const recordValue = plainAutoFulfillmentRecordV1(value);
  if (!recordValue) return null;
  const out: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const field = ownAutoFulfillmentDataFieldV1(recordValue, key);
    if (!field) return null;
    if (!field.present) continue;
    Object.defineProperty(out, key, {
      value: field.value,
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }
  return out;
}

function snapshotAutoFulfillmentArrayV1(
  value: unknown,
  maximum: number,
): readonly unknown[] | null {
  if (
    !value ||
    typeof value !== "object" ||
    utilTypes.isProxy(value) ||
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype
  ) {
    return null;
  }
  const length = value.length;
  if (
    !Number.isSafeInteger(maximum) ||
    maximum < 0 ||
    !Number.isSafeInteger(length) ||
    length < 0 ||
    length > maximum
  ) {
    return null;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (
    ownKeys.some((key) => typeof key !== "string") ||
    ownKeys.length !== length + 1
  ) {
    return null;
  }
  const out: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      return null;
    }
    if (
      typeof descriptor.value === "string" &&
      descriptor.value.length >
        AUTO_FULFILLMENT_SNAPSHOT_MAX_TEXT_CODE_UNITS_V1
    ) {
      return null;
    }
    out.push(descriptor.value);
  }
  return Object.freeze(out);
}

function snapshotAutoFulfillmentMapV1(
  value: unknown,
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  const recordValue = plainAutoFulfillmentRecordV1(value);
  if (!recordValue) return null;
  const out: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const field = ownAutoFulfillmentDataFieldV1(recordValue, key);
    if (!field) return null;
    if (field.present) out[key] = field.value;
  }
  return Object.freeze(out);
}

const AUTO_FULFILLMENT_REQUEST_KEYS_V1 = Object.freeze([
  "request_id",
  "source_chain",
  "tx_hash",
  "delivery_address",
  "receive_address",
  "usdc_amount",
  "quoted_void",
]);

const AUTO_FULFILLMENT_EVENT_KEYS_V1 = Object.freeze([
  "schema",
  "marker",
  "payment_identity_input_complete",
  "request_id",
  "operator_status",
  "payment_verified",
  "tx_hash",
  "payment_verifier",
]);

const AUTO_FULFILLMENT_VERIFIER_KEYS_V1 = Object.freeze([
  "chain",
  "transaction_hash",
  "log_index",
  "block_number",
  "confirmations",
  "usdc_contract",
  "from_address",
  "receive_address",
  "delivery_address",
  "amount_units",
  "requested_units",
]);

const AUTO_FULFILLMENT_POLICY_KEYS_V1 = Object.freeze([
  "automatic_fulfillment_enabled",
  "allowed_chains",
  "min_confirmations_by_chain",
  "usdc_contract_by_chain",
  "receive_address_by_chain",
  "rate_void_units_numerator",
  "rate_void_units_denominator",
  "pool_remaining_void_units",
  "exact_payment_required",
]);

const AUTO_FULFILLMENT_CLAIM_KEYS_V1 = Object.freeze([
  "schema",
  "marker",
  "canonical_payment_identity",
  "canonical_payment_identity_sha256",
  "request_id",
  "decision_fingerprint",
  "instruction_id",
  "unsigned_instruction",
  "status",
]);

const AUTO_FULFILLMENT_INSTRUCTION_KEYS_V1 = Object.freeze([
  "schema",
  "marker",
  "instruction_id",
  "request_id",
  "canonical_payment_identity",
  "source_chain",
  "payment_transaction_hash",
  "payment_log_index",
  "confirmed_block_number",
  "confirmation_count",
  "payment_usdc_units",
  "delivery_address",
  "void_amount_units",
  "signing_authorized",
  "transaction_broadcast_authorized",
  "automatic_execution_authorized",
]);

function snapshotAutoFulfillmentRequestV1(
  value: unknown,
): BuyVoidRequestV1 | null {
  const request = snapshotAutoFulfillmentSelectedRecordV1(
    value,
    AUTO_FULFILLMENT_REQUEST_KEYS_V1,
  );
  return request
    ? Object.freeze(request) as unknown as BuyVoidRequestV1
    : null;
}

function snapshotAutoFulfillmentEventV1(
  value: unknown,
): BuyVoidVerifiedPaymentAdmissionEventV1 | null {
  const event = snapshotAutoFulfillmentSelectedRecordV1(
    value,
    AUTO_FULFILLMENT_EVENT_KEYS_V1,
  );
  if (!event) return null;
  if (Object.hasOwn(event, "payment_verifier")) {
    const verifier = snapshotAutoFulfillmentSelectedRecordV1(
      event.payment_verifier,
      AUTO_FULFILLMENT_VERIFIER_KEYS_V1,
    );
    if (!verifier) return null;
    event.payment_verifier = Object.freeze(verifier);
  }
  return Object.freeze(
    event,
  ) as unknown as BuyVoidVerifiedPaymentAdmissionEventV1;
}

function snapshotAutoFulfillmentPolicyV1(
  value: unknown,
): BuyVoidAutoFulfillmentPolicyV1 | null {
  const policy = snapshotAutoFulfillmentSelectedRecordV1(
    value,
    AUTO_FULFILLMENT_POLICY_KEYS_V1,
  );
  if (!policy) return null;

  if (Object.hasOwn(policy, "allowed_chains")) {
    const allowed = snapshotAutoFulfillmentArrayV1(
      policy.allowed_chains,
      AUTO_FULFILLMENT_MAX_ALLOWED_CHAINS_V1,
    );
    if (!allowed) return null;
    policy.allowed_chains = allowed;
  }

  const reviewedChains = Array.isArray(policy.allowed_chains)
    ? [...new Set(
        policy.allowed_chains
          .map((entry) => normalizeChain(entry))
          .filter(Boolean),
      )]
    : [];
  for (const key of [
    "min_confirmations_by_chain",
    "usdc_contract_by_chain",
    "receive_address_by_chain",
  ]) {
    if (!Object.hasOwn(policy, key)) continue;
    const map = snapshotAutoFulfillmentMapV1(
      policy[key],
      reviewedChains,
    );
    if (!map) return null;
    policy[key] = map;
  }

  return Object.freeze(
    policy,
  ) as unknown as BuyVoidAutoFulfillmentPolicyV1;
}

function snapshotAutoFulfillmentClaimV1(
  value: unknown,
): BuyVoidFulfillmentClaimV1 | null {
  const claim = snapshotAutoFulfillmentSelectedRecordV1(
    value,
    AUTO_FULFILLMENT_CLAIM_KEYS_V1,
  );
  if (!claim) return null;
  if (Object.hasOwn(claim, "unsigned_instruction")) {
    const instruction = snapshotAutoFulfillmentSelectedRecordV1(
      claim.unsigned_instruction,
      AUTO_FULFILLMENT_INSTRUCTION_KEYS_V1,
    );
    if (!instruction) return null;
    claim.unsigned_instruction = Object.freeze(instruction);
  }
  return Object.freeze(
    claim,
  ) as unknown as BuyVoidFulfillmentClaimV1;
}

function snapshotAutoFulfillmentInputV1(
  value: unknown,
): BuyVoidAutoFulfillmentInputV1 | null {
  const input = snapshotAutoFulfillmentSelectedRecordV1(value, [
    "request",
    "verified_payment_event",
    "policy",
    "prior_claims",
  ]);
  if (!input) return null;
  if (
    !input.request ||
    !input.verified_payment_event ||
    !input.policy
  ) {
    return Object.freeze({
      request: input.request,
      verified_payment_event: input.verified_payment_event,
      policy: input.policy,
    }) as unknown as BuyVoidAutoFulfillmentInputV1;
  }

  const request = snapshotAutoFulfillmentRequestV1(input.request);
  const event = snapshotAutoFulfillmentEventV1(
    input.verified_payment_event,
  );
  const policy = snapshotAutoFulfillmentPolicyV1(input.policy);
  if (!request || !event || !policy) return null;

  let priorClaims: readonly BuyVoidFulfillmentClaimV1[] | undefined;
  if (Object.hasOwn(input, "prior_claims")) {
    const rawClaims = snapshotAutoFulfillmentArrayV1(
      input.prior_claims,
      AUTO_FULFILLMENT_MAX_PRIOR_CLAIMS_V1,
    );
    if (!rawClaims) return null;
    const claims: BuyVoidFulfillmentClaimV1[] = [];
    for (const rawClaim of rawClaims) {
      const claim = snapshotAutoFulfillmentClaimV1(rawClaim);
      if (!claim) return null;
      claims.push(claim);
    }
    priorClaims = Object.freeze(claims);
  }

  return Object.freeze({
    request,
    verified_payment_event: event,
    policy,
    ...(priorClaims !== undefined
      ? { prior_claims: priorClaims }
      : {}),
  }) as unknown as BuyVoidAutoFulfillmentInputV1;
}

export type BuyVoidRequestV1 = {
  request_id: string;
  source_chain: string;
  tx_hash: string;
  delivery_address: string;
  receive_address: string;
  usdc_amount: string | number;
  quoted_void: string | number;
};

export type BuyVoidVerifiedPaymentEventV1 = {
  request_id: string;
  operator_status: string;
  payment_verified: boolean;
  tx_hash: string;
  payment_verifier?: {
    chain?: string;
    transaction_hash?: string;
    log_index?: string | number;
    block_number?: string | number;
    confirmations?: string | number;
    usdc_contract?: string;
    from_address?: string;
    receive_address?: string;
    delivery_address?: string;
    amount_units?: string | number;
    requested_units?: string | number;
  };
};

export type BuyVoidVerifiedPaymentAdmissionEventV1 =
  BuyVoidVerifiedPaymentEventV1 & {
    schema: "void_buy_void_verified_payment_event_v2";
    marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2";
    payment_identity_input_complete: true;
  };

export type BuyVoidAutoFulfillmentPolicyV1 = {
  automatic_fulfillment_enabled: boolean;
  allowed_chains: string[];
  min_confirmations_by_chain: Record<string, number>;
  usdc_contract_by_chain: Record<string, string>;
  receive_address_by_chain: Record<string, string>;
  rate_void_units_numerator: string | number;
  rate_void_units_denominator: string | number;
  pool_remaining_void_units: string | number;
  exact_payment_required: true;
};

export type BuyVoidUnsignedFulfillmentInstructionV1 = {
  schema: "void_buy_void_unsigned_fulfillment_instruction_v1";
  marker: typeof VOID_BUY_VOID_AUTO_FULFILLMENT_V1;
  instruction_id: string;
  request_id: string;
  canonical_payment_identity: string;
  source_chain: string;
  payment_transaction_hash: string;
  payment_log_index: string;
  confirmed_block_number: string;
  confirmation_count: string;
  payment_usdc_units: string;
  delivery_address: string;
  void_amount_units: string;
  signing_authorized: false;
  transaction_broadcast_authorized: false;
  automatic_execution_authorized: false;
};

export type BuyVoidFulfillmentClaimV1 = {
  schema: "void_buy_void_fulfillment_claim_v1";
  marker: typeof VOID_BUY_VOID_AUTO_FULFILLMENT_V1;
  canonical_payment_identity: string;
  canonical_payment_identity_sha256: string;
  request_id: string;
  decision_fingerprint: string;
  instruction_id: string;
  unsigned_instruction: BuyVoidUnsignedFulfillmentInstructionV1;
  status: "claimed";
};

export type BuyVoidAutoFulfillmentDecisionV1 =
  | {
      ok: true;
      status: "approved";
      duplicate: false;
      new_claim: true;
      claim: BuyVoidFulfillmentClaimV1;
      instruction: BuyVoidUnsignedFulfillmentInstructionV1;
    }
  | {
      ok: true;
      status: "duplicate";
      duplicate: true;
      new_claim: false;
      claim: BuyVoidFulfillmentClaimV1;
      instruction: BuyVoidUnsignedFulfillmentInstructionV1;
    }
  | {
      ok: false;
      status: "held";
      duplicate: false;
      new_claim: false;
      reason: string;
      detail?: Record<string, unknown>;
    };

export type BuyVoidAutoFulfillmentInputV1 = {
  request: BuyVoidRequestV1;
  verified_payment_event: BuyVoidVerifiedPaymentAdmissionEventV1;
  policy: BuyVoidAutoFulfillmentPolicyV1;
  prior_claims?: BuyVoidFulfillmentClaimV1[];
};

function held(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidAutoFulfillmentDecisionV1 {
  return {
    ok: false,
    status: "held",
    duplicate: false,
    new_claim: false,
    reason,
    ...(detail ? { detail } : {}),
  };
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeChain(value: unknown): string {
  if (typeof value !== "string") return "";
  const raw = value.trim().toLowerCase();
  const chain = raw === "eth" ? "ethereum" : raw;
  return CHAIN.test(chain) ? chain : "";
}

function normalizeHash(value: unknown): string {
  if (typeof value !== "string") return "";
  const hash = value.trim().toLowerCase();
  return HEX_32.test(hash) ? hash : "";
}

function normalizeAddress(value: unknown): string {
  if (typeof value !== "string") return "";
  const address = value.trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function parseNonNegativeInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value);
  }

  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  try {
    if (/^0x[0-9a-f]+$/.test(raw)) {
      const n = BigInt(raw);
      return n >= 0n ? n : null;
    }
    if (/^[0-9]+$/.test(raw)) {
      const n = BigInt(raw);
      return n >= 0n ? n : null;
    }
  } catch {
    return null;
  }

  return null;
}

function decimalToUnits(value: unknown, decimals = 6): bigint | null {
  let raw = "";
  if (typeof value === "string") raw = value.trim();
  else if (typeof value === "number" && Number.isFinite(value)) {
    raw = String(value);
  }
  if (!raw || !/^[0-9]+(?:\.[0-9]+)?$/.test(raw)) return null;

  const [whole, fraction = ""] = raw.split(".");
  if (fraction.length > decimals) return null;

  try {
    const padded = fraction.padEnd(decimals, "0");
    return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0");
  } catch {
    return null;
  }
}

function stableFingerprint(parts: Record<string, string>): string {
  const ordered = Object.keys(parts)
    .sort()
    .map((key) => `${key}=${parts[key]}`)
    .join("\n");
  return sha256Hex(ordered);
}

export function canonicalBuyVoidPaymentIdentityV1(input: {
  source_chain: unknown;
  payment_transaction_hash: unknown;
  payment_log_index: unknown;
}): string {
  const chain = normalizeChain(input.source_chain);
  const txHash = normalizeHash(input.payment_transaction_hash);
  const logIndex = parseNonNegativeInteger(input.payment_log_index);

  if (!chain) throw new Error("invalid_source_chain");
  if (!txHash) throw new Error("invalid_payment_transaction_hash");
  if (
    logIndex === null ||
    logIndex > MAX_PAYMENT_LOG_INDEX
  ) {
    throw new Error("invalid_payment_log_index");
  }

  return `voidpay1:${chain}:${txHash}:${logIndex.toString()}`;
}

export function decideBuyVoidAutoFulfillmentV1(
  input: BuyVoidAutoFulfillmentInputV1,
): BuyVoidAutoFulfillmentDecisionV1 {
  if (!input) return held("missing_input");
  const detachedInput = snapshotAutoFulfillmentInputV1(input);
  if (!detachedInput) {
    return held("auto_fulfillment_input_not_plain_data");
  }

  const request = detachedInput.request;
  const event = detachedInput.verified_payment_event;
  const policy = detachedInput.policy;
  const priorClaimsInput = detachedInput.prior_claims;

  if (!request || !event || !policy) return held("missing_input");
  if (
    priorClaimsInput !== undefined &&
    !Array.isArray(priorClaimsInput)
  ) {
    return held("invalid_prior_claims");
  }
  const priorClaims = priorClaimsInput ?? [];
  if (policy.automatic_fulfillment_enabled !== true) {
    return held("automatic_fulfillment_disabled");
  }
  if (policy.exact_payment_required !== true) {
    return held("exact_payment_policy_required");
  }

  const provenanceEvent = event as BuyVoidVerifiedPaymentEventV1 & {
    schema?: unknown;
    marker?: unknown;
    payment_identity_input_complete?: unknown;
  };
  if (
    provenanceEvent.schema !== "void_buy_void_verified_payment_event_v2" ||
    provenanceEvent.marker !== "VOID_BUY_VOID_VERIFIED_PAYMENT_V2" ||
    provenanceEvent.payment_identity_input_complete !== true
  ) {
    return held("untrusted_payment_verification_provenance", {
      expected_schema: "void_buy_void_verified_payment_event_v2",
      observed_schema:
        typeof provenanceEvent.schema === "string"
          ? provenanceEvent.schema
          : "",
      expected_marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
      observed_marker:
        typeof provenanceEvent.marker === "string"
          ? provenanceEvent.marker
          : "",
      payment_identity_input_complete:
        provenanceEvent.payment_identity_input_complete === true,
    });
  }

  if (typeof request.request_id !== "string") {
    return held("invalid_request_id");
  }
  const requestId = request.request_id.trim();
  if (!/^[A-Za-z0-9._:-]{3,160}$/.test(requestId)) {
    return held("invalid_request_id");
  }
  if (
    typeof event.request_id !== "string" ||
    event.request_id.trim() !== requestId
  ) {
    return held("request_event_mismatch");
  }
  if (
    typeof event.operator_status !== "string" ||
    event.operator_status.trim().toLowerCase() !== "payment_verified" ||
    event.payment_verified !== true
  ) {
    return held("payment_not_verified");
  }

  const verifier = event.payment_verifier;
  if (
    !verifier ||
    typeof verifier !== "object" ||
    Array.isArray(verifier)
  ) {
    return held("missing_payment_verifier");
  }

  const requestChain = normalizeChain(request.source_chain);
  const eventChain = normalizeChain(verifier.chain);
  if (!requestChain || !eventChain || requestChain !== eventChain) {
    return held("source_chain_mismatch");
  }

  if (!Array.isArray(policy.allowed_chains)) {
    return held("invalid_allowed_chains_policy");
  }
  if (
    !policy.min_confirmations_by_chain ||
    typeof policy.min_confirmations_by_chain !== "object" ||
    Array.isArray(policy.min_confirmations_by_chain) ||
    !policy.usdc_contract_by_chain ||
    typeof policy.usdc_contract_by_chain !== "object" ||
    Array.isArray(policy.usdc_contract_by_chain) ||
    !policy.receive_address_by_chain ||
    typeof policy.receive_address_by_chain !== "object" ||
    Array.isArray(policy.receive_address_by_chain)
  ) {
    return held("invalid_fulfillment_policy_map_shape");
  }
  const allowedChains = new Set(
    policy.allowed_chains.map(normalizeChain).filter(Boolean),
  );
  if (!allowedChains.has(eventChain)) return held("source_chain_not_allowlisted");

  const requestTxHash = normalizeHash(request.tx_hash);
  const eventTxHash =
    verifier.transaction_hash !== undefined &&
    verifier.transaction_hash !== null
      ? normalizeHash(verifier.transaction_hash)
      : normalizeHash(event.tx_hash);
  const outerEventTxHash = normalizeHash(event.tx_hash);
  if (!requestTxHash || !eventTxHash || !outerEventTxHash) {
    return held("invalid_payment_transaction_hash");
  }
  if (requestTxHash !== eventTxHash || eventTxHash !== outerEventTxHash) {
    return held("payment_transaction_hash_mismatch");
  }

  const logIndex = parseNonNegativeInteger(verifier.log_index);
  if (logIndex === null) return held("missing_payment_log_index");

  const blockNumber = parseNonNegativeInteger(verifier.block_number);
  if (blockNumber === null || blockNumber <= 0n) {
    return held("missing_confirmed_block_number");
  }

  const confirmations = parseNonNegativeInteger(verifier.confirmations);
  if (confirmations === null) return held("missing_confirmation_count");

  const requiredConfirmations =
    policy.min_confirmations_by_chain?.[eventChain];
  if (
    typeof requiredConfirmations !== "number" ||
    !Number.isSafeInteger(requiredConfirmations) ||
    requiredConfirmations < 1
  ) {
    return held("invalid_confirmation_policy");
  }
  if (confirmations < BigInt(requiredConfirmations)) {
    return held("insufficient_confirmations", {
      confirmations: confirmations.toString(),
      required_confirmations: String(requiredConfirmations),
    });
  }

  const requestDeliveryAddress = normalizeAddress(request.delivery_address);
  const verifierDeliveryAddress = normalizeAddress(verifier.delivery_address);
  const payerAddress = normalizeAddress(verifier.from_address);
  if (
    !requestDeliveryAddress ||
    requestDeliveryAddress !== verifierDeliveryAddress ||
    requestDeliveryAddress !== payerAddress
  ) {
    return held("delivery_address_binding_mismatch");
  }

  const requestReceiveAddress = normalizeAddress(request.receive_address);
  const verifierReceiveAddress = normalizeAddress(verifier.receive_address);
  const policyReceiveAddress = normalizeAddress(
    policy.receive_address_by_chain?.[eventChain],
  );
  if (
    !requestReceiveAddress ||
    !verifierReceiveAddress ||
    !policyReceiveAddress ||
    requestReceiveAddress !== verifierReceiveAddress ||
    verifierReceiveAddress !== policyReceiveAddress
  ) {
    return held("receive_address_binding_mismatch");
  }

  const verifierUsdcContract = normalizeAddress(verifier.usdc_contract);
  const policyUsdcContract = normalizeAddress(
    policy.usdc_contract_by_chain?.[eventChain],
  );
  if (
    !verifierUsdcContract ||
    !policyUsdcContract ||
    verifierUsdcContract !== policyUsdcContract
  ) {
    return held("usdc_contract_mismatch");
  }

  const requestUsdcUnits = decimalToUnits(request.usdc_amount, 6);
  const requestVoidUnits = decimalToUnits(request.quoted_void, 6);
  const verifiedAmountUnits = parseNonNegativeInteger(verifier.amount_units);
  const verifierRequestedUnits = parseNonNegativeInteger(
    verifier.requested_units,
  );
  if (
    requestUsdcUnits === null ||
    requestUsdcUnits <= 0n ||
    requestVoidUnits === null ||
    requestVoidUnits <= 0n ||
    verifiedAmountUnits === null ||
    verifierRequestedUnits === null
  ) {
    return held("invalid_amount_shape");
  }
  if (verifierRequestedUnits !== requestUsdcUnits) {
    return held("requested_amount_binding_mismatch");
  }
  if (verifiedAmountUnits !== verifierRequestedUnits) {
    return held("exact_payment_required", {
      verified_amount_units: verifiedAmountUnits.toString(),
      requested_amount_units: verifierRequestedUnits.toString(),
    });
  }

  const rateNumerator = parseNonNegativeInteger(
    policy.rate_void_units_numerator,
  );
  const rateDenominator = parseNonNegativeInteger(
    policy.rate_void_units_denominator,
  );
  if (
    rateNumerator === null ||
    rateNumerator <= 0n ||
    rateDenominator === null ||
    rateDenominator <= 0n
  ) {
    return held("invalid_rate_policy");
  }

  const scaled = verifiedAmountUnits * rateNumerator;
  if (scaled % rateDenominator !== 0n) {
    return held("rate_produces_fractional_void_unit");
  }

  const expectedVoidUnits = scaled / rateDenominator;
  if (expectedVoidUnits !== requestVoidUnits) {
    return held("quoted_void_rate_mismatch", {
      quoted_void_units: requestVoidUnits.toString(),
      expected_void_units: expectedVoidUnits.toString(),
    });
  }

  const remainingVoidUnits = parseNonNegativeInteger(
    policy.pool_remaining_void_units,
  );
  if (remainingVoidUnits === null) return held("invalid_inventory_policy");
  if (expectedVoidUnits > remainingVoidUnits) {
    return held("insufficient_void_inventory", {
      required_void_units: expectedVoidUnits.toString(),
      remaining_void_units: remainingVoidUnits.toString(),
    });
  }

  let canonicalPaymentIdentity = "";
  try {
    canonicalPaymentIdentity = canonicalBuyVoidPaymentIdentityV1({
      source_chain: eventChain,
      payment_transaction_hash: eventTxHash,
      payment_log_index: logIndex,
    });
  } catch (error) {
    return held("invalid_canonical_payment_identity", {
      message: String((error as Error)?.message || error),
    });
  }

  const decisionFingerprint = stableFingerprint({
    request_id: requestId,
    canonical_payment_identity: canonicalPaymentIdentity,
    source_chain: eventChain,
    payment_transaction_hash: eventTxHash,
    payment_log_index: logIndex.toString(),
    confirmed_block_number: blockNumber.toString(),
    confirmation_count: confirmations.toString(),
    usdc_contract: verifierUsdcContract,
    payer_address: payerAddress,
    receive_address: verifierReceiveAddress,
    delivery_address: requestDeliveryAddress,
    payment_usdc_units: verifiedAmountUnits.toString(),
    void_amount_units: expectedVoidUnits.toString(),
  });

  const paymentClaim = priorClaims.find(
    (claim) =>
      typeof claim?.canonical_payment_identity === "string" &&
      claim.canonical_payment_identity === canonicalPaymentIdentity,
  );
  if (paymentClaim) {
    if (
      typeof paymentClaim.request_id !== "string" ||
      typeof paymentClaim.decision_fingerprint !== "string"
    ) {
      return held("prior_claim_identity_invalid");
    }
    const claimedRequestId = paymentClaim.request_id;
    const claimedFingerprint = paymentClaim.decision_fingerprint;

    if (
      claimedRequestId === requestId &&
      claimedFingerprint === decisionFingerprint &&
      paymentClaim.unsigned_instruction
    ) {
      return {
        ok: true,
        status: "duplicate",
        duplicate: true,
        new_claim: false,
        claim: paymentClaim,
        instruction: paymentClaim.unsigned_instruction,
      };
    }

    if (claimedRequestId === requestId) {
      return held("payment_identity_claim_conflict", {
        canonical_payment_identity: canonicalPaymentIdentity,
        request_id: requestId,
      });
    }

    return held("payment_identity_already_claimed", {
      canonical_payment_identity: canonicalPaymentIdentity,
      claimed_request_id: claimedRequestId,
      attempted_request_id: requestId,
    });
  }

  const requestClaim = priorClaims.find(
    (claim) =>
      typeof claim?.request_id === "string" &&
      claim.request_id === requestId,
  );
  if (requestClaim) {
    return held("request_already_claimed", {
      request_id: requestId,
      claimed_payment_identity:
        typeof requestClaim.canonical_payment_identity === "string"
          ? requestClaim.canonical_payment_identity
          : "",
      attempted_payment_identity: canonicalPaymentIdentity,
    });
  }

  const instructionId = `voidfill1_${sha256Hex(
    `${canonicalPaymentIdentity}\n${requestId}\n${decisionFingerprint}`,
  ).slice(0, 32)}`;

  const instruction: BuyVoidUnsignedFulfillmentInstructionV1 = {
    schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
    marker: VOID_BUY_VOID_AUTO_FULFILLMENT_V1,
    instruction_id: instructionId,
    request_id: requestId,
    canonical_payment_identity: canonicalPaymentIdentity,
    source_chain: eventChain,
    payment_transaction_hash: eventTxHash,
    payment_log_index: logIndex.toString(),
    confirmed_block_number: blockNumber.toString(),
    confirmation_count: confirmations.toString(),
    payment_usdc_units: verifiedAmountUnits.toString(),
    delivery_address: requestDeliveryAddress,
    void_amount_units: expectedVoidUnits.toString(),
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    automatic_execution_authorized: false,
  };

  const claim: BuyVoidFulfillmentClaimV1 = {
    schema: "void_buy_void_fulfillment_claim_v1",
    marker: VOID_BUY_VOID_AUTO_FULFILLMENT_V1,
    canonical_payment_identity: canonicalPaymentIdentity,
    canonical_payment_identity_sha256: sha256Hex(canonicalPaymentIdentity),
    request_id: requestId,
    decision_fingerprint: decisionFingerprint,
    instruction_id: instructionId,
    unsigned_instruction: instruction,
    status: "claimed",
  };

  return {
    ok: true,
    status: "approved",
    duplicate: false,
    new_claim: true,
    claim,
    instruction,
  };
}
