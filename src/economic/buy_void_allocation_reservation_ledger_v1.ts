import crypto from "node:crypto";

import {
  canonicalBuyVoidPaymentIdentityV1,
} from "./buy_void_auto_fulfillment_v1.js";
import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1,
} from "./buy_void_crash_consistent_saga_server_policy_v1.js";

export const VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_V1 =
  "VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_V1";

export const VOID_BUY_VOID_ALLOCATION_RESERVATION_RECORD_V1 =
  "VOID_BUY_VOID_ALLOCATION_RESERVATION_RECORD_V1";

export const VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1 =
  "sha256:" + "0".repeat(64);

export const VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_planning: true,
    append_only_jsonl_contract: true,
    hash_chain_validation: true,
    duplicate_request_rejection: true,
    duplicate_payment_identity_rejection: true,
    exact_inventory_arithmetic: true,
    canonical_presale_economics_bound: true,
    external_high_water_binding: false,
    rollback_detection: false,
    runtime_integration: false,
    filesystem_read: false,
    filesystem_write: false,
    allocation_reservation_write: false,
    payment_verified_event_write: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    market_activation: false,
    public_presale_activation: false,
    production_gate_ready: false,
    funds_movement: false,
  });

const RECORD_TYPE = "allocation_reserved";
const RECORD_ID = /^voidalloc1_[0-9a-f]{64}$/u;
const REQUEST_ID = /^buyvoid_[a-z0-9]+_[0-9a-f]{8}$/u;
const TX_HASH = /^0x[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const BYTES32 = /^0x[0-9a-f]{64}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const ACTIVATION_RECEIPT_ID = /^voidbclive1_[0-9a-f]{64}$/u;
const REQUEST_AUTHORITY_MARKER =
  "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1";
const REQUEST_AUTHORITY_KEYS = Object.freeze([
  "activation_generation",
  "activation_receipt_id",
  "activation_receipt_sha256",
  "coupled_launch_id",
  "expires_at_ms",
  "generation_tip_sha256",
  "marker",
  "source_composition_id",
  "version",
]);
const MAX_LEDGER_BYTES = 64 * 1024 * 1024;
const MAX_LEDGER_RECORDS = 100_000;
const MAX_PAYMENT_LOG_INDEX = 0xffff_ffffn;
const MICRO = 1_000_000n;
const MAX_AMOUNT_TEXT_CHARS = 32;

const RECORD_KEYS = Object.freeze([
  "activation_generation",
  "activation_receipt_id",
  "activation_receipt_sha256",
  "allocation_record_hash",
  "buyer_delivery_wallet",
  "canonical_payment_identity",
  "coupled_launch_id",
  "created_at_ms",
  "duplicate_payment_guard_result",
  "expires_at_ms",
  "generation_tip_sha256",
  "inventory_allocation_guard_result",
  "operator_activation_record_ref",
  "payment_log_index",
  "payment_transaction_hash",
  "payment_verified_event_sha256",
  "pool_void_total_before",
  "previous_allocation_record_hash",
  "quote_usdc_amount",
  "quote_void_amount",
  "record_id",
  "record_type",
  "remaining_void_after",
  "remaining_void_before",
  "request_id",
  "reserved_void_total_after",
  "reserved_void_total_before",
  "source_chain",
  "source_composition_id",
  "verified_payment_receipt_ref",
]);

export type BuyVoidAllocationReservationRecordV1 = {
  record_type: typeof RECORD_TYPE;
  record_id: string;
  request_id: string;
  coupled_launch_id: string;
  source_composition_id: string;
  activation_generation: string;
  generation_tip_sha256: string;
  activation_receipt_id: string;
  activation_receipt_sha256: string;
  expires_at_ms: number;
  source_chain: "base" | "ethereum";
  payment_transaction_hash: string;
  payment_log_index: string;
  canonical_payment_identity: string;
  payment_verified_event_sha256: string;
  buyer_delivery_wallet: string;
  quote_void_amount: string;
  quote_usdc_amount: string;
  pool_void_total_before: string;
  reserved_void_total_before: string;
  remaining_void_before: string;
  reserved_void_total_after: string;
  remaining_void_after: string;
  verified_payment_receipt_ref: string;
  duplicate_payment_guard_result: string;
  inventory_allocation_guard_result: string;
  operator_activation_record_ref: string;
  created_at_ms: number;
  previous_allocation_record_hash: string;
  allocation_record_hash: string;
};

export type BuyVoidAllocationReservationLedgerValidV1 = {
  ok: true;
  status: "valid";
  marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_V1;
  version: 1;
  record_count: number;
  records: readonly BuyVoidAllocationReservationRecordV1[];
  request_ids: readonly string[];
  canonical_payment_identities: readonly string[];
  pool_void_total: string | null;
  reserved_void_total: string;
  remaining_void: string | null;
  tip_hash: string;
  authority:
    typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_AUTHORITY_V1;
};

export type BuyVoidAllocationReservationHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_V1;
  version: 1;
  reason: string;
  authority:
    typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_AUTHORITY_V1;
};

export type BuyVoidAllocationReservationLedgerDecisionV1 =
  | BuyVoidAllocationReservationLedgerValidV1
  | BuyVoidAllocationReservationHeldV1;

export type BuyVoidAllocationReservationPlanDecisionV1 =
  | BuyVoidAllocationReservationHeldV1
  | {
      ok: true;
      status: "planned" | "idempotent";
      marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_V1;
      version: 1;
      idempotent: boolean;
      operation_performed: false;
      record: Readonly<BuyVoidAllocationReservationRecordV1>;
      next_ledger_jsonl: string;
      next_record_count: number;
      authority:
        typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_AUTHORITY_V1;
    };

type AmountV1 = {
  text: string;
  micro: bigint;
};

function held(reason: string): BuyVoidAllocationReservationHeldV1 {
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_V1,
    version: 1,
    reason,
    authority:
      VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_AUTHORITY_V1,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (isRecord(value)) {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) +
            ":" +
            canonicalJson(value[key]),
        )
        .join(",") +
      "}"
    );
  }
  throw new Error("allocation_reservation_noncanonical_value");
}

function sha256(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function amountV1(
  value: unknown,
  code: string,
  positive = false,
): AmountV1 {
  const source = String(value ?? "");
  // allocation_reservation_amount_text_too_long_guard
  // Bound attacker-controlled decimal text before trim/regex/BigInt work.
  if (source.length > MAX_AMOUNT_TEXT_CHARS) throw new Error(code);
  const raw = source.trim();
  if (raw.length > MAX_AMOUNT_TEXT_CHARS) throw new Error(code);
  const match =
    /^(0|[1-9][0-9]*)(?:\.([0-9]{1,6}))?$/u.exec(raw);
  if (!match) throw new Error(code);
  const whole = BigInt(match[1]);
  const fractionRaw = match[2] || "";
  const micro =
    whole * MICRO +
    BigInt(fractionRaw.padEnd(6, "0") || "0");
  if (positive && micro < 1n) throw new Error(code);
  const fraction = fractionRaw.replace(/0+$/u, "");
  return Object.freeze({
    text: fraction ? match[1] + "." + fraction : match[1],
    micro,
  });
}

function amountTextFromMicroV1(value: bigint): string {
  if (value < 0n) {
    throw new Error("allocation_reservation_negative_amount");
  }
  const whole = value / MICRO;
  const fraction = (value % MICRO)
    .toString()
    .padStart(6, "0")
    .replace(/0+$/u, "");
  return fraction
    ? whole.toString() + "." + fraction
    : whole.toString();
}

function assertCanonicalPresaleEconomicsV1(
  pool: AmountV1,
  quoteVoid: AmountV1,
  quoteUsdc: AmountV1,
): void {
  if (
    pool.text !==
    VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
      .canonical_presale_max_void
  ) {
    throw new Error(
      "allocation_reservation_canonical_pool_mismatch",
    );
  }
  const numerator = BigInt(
    VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
      .rate_void_units_numerator,
  );
  const denominator = BigInt(
    VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
      .rate_void_units_denominator,
  );
  if (
    quoteVoid.micro * denominator !==
    quoteUsdc.micro * numerator
  ) {
    throw new Error(
      "allocation_reservation_presale_rate_mismatch",
    );
  }
}


function paymentLogIndexV1(
  value: unknown,
  code: string,
): string {
  let parsed: bigint;
  if (typeof value === "bigint") {
    parsed = value;
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(code);
    }
    parsed = BigInt(value);
  } else {
    const raw = String(value ?? "").trim().toLowerCase();
    if (!raw) throw new Error(code);
    if (/^0x[0-9a-f]+$/u.test(raw)) {
      if (raw.length > 10) throw new Error(code);
    } else if (/^[0-9]+$/u.test(raw)) {
      if (raw.length > 10) throw new Error(code);
    } else {
      throw new Error(code);
    }
    try {
      parsed = BigInt(raw);
    } catch {
      throw new Error(code);
    }
  }
  if (parsed < 0n || parsed > MAX_PAYMENT_LOG_INDEX) {
    throw new Error(code);
  }
  return parsed.toString();
}

function canonicalChainV1(value: unknown): "base" | "ethereum" {
  const raw = String(value ?? "").trim().toLowerCase();
  const chain = raw === "eth" ? "ethereum" : raw;
  if (chain !== "base" && chain !== "ethereum") {
    throw new Error("allocation_reservation_source_chain_invalid");
  }
  return chain;
}

function canonicalHashV1(value: unknown): string {
  const hash = String(value ?? "").trim().toLowerCase();
  if (!TX_HASH.test(hash)) {
    throw new Error("allocation_reservation_payment_tx_hash_invalid");
  }
  return hash;
}

function canonicalAddressV1(value: unknown): string {
  const address = String(value ?? "").trim().toLowerCase();
  if (
    !ADDRESS.test(address) ||
    address === "0x0000000000000000000000000000000000000000"
  ) {
    throw new Error("allocation_reservation_buyer_wallet_invalid");
  }
  return address;
}

function contentRefV1(value: unknown, code: string): string {
  const ref = String(value ?? "").trim().toLowerCase();
  if (!SHA256_ID.test(ref)) throw new Error(code);
  return ref;
}

type LaunchAuthorityLineageV1 = {
  coupled_launch_id: string;
  source_composition_id: string;
  activation_generation: string;
  generation_tip_sha256: string;
  activation_receipt_id: string;
  activation_receipt_sha256: string;
  expires_at_ms: number;
};

function canonicalBytes32V1(value: unknown, code: string): string {
  const text = String(value ?? "").trim().toLowerCase();
  if (!BYTES32.test(text)) throw new Error(code);
  return text;
}

function canonicalHex64V1(value: unknown, code: string): string {
  const text = String(value ?? "").trim().toLowerCase();
  if (!HEX64.test(text)) throw new Error(code);
  return text;
}

function launchAuthorityLineageFieldsV1(input: {
  coupled_launch_id: unknown;
  source_composition_id: unknown;
  activation_generation: unknown;
  generation_tip_sha256: unknown;
  activation_receipt_id: unknown;
  activation_receipt_sha256: unknown;
  expires_at_ms: unknown;
}): Readonly<LaunchAuthorityLineageV1> {
  const receiptId = String(input.activation_receipt_id ?? "").trim();
  if (!ACTIVATION_RECEIPT_ID.test(receiptId)) {
    throw new Error("allocation_reservation_activation_receipt_id_invalid");
  }
  const expiresAt = Number(input.expires_at_ms);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < 1) {
    throw new Error("allocation_reservation_launch_expiry_invalid");
  }
  return Object.freeze({
    coupled_launch_id: contentRefV1(
      input.coupled_launch_id,
      "allocation_reservation_coupled_launch_id_invalid",
    ),
    source_composition_id: contentRefV1(
      input.source_composition_id,
      "allocation_reservation_source_composition_id_invalid",
    ),
    activation_generation: canonicalBytes32V1(
      input.activation_generation,
      "allocation_reservation_activation_generation_invalid",
    ),
    generation_tip_sha256: contentRefV1(
      input.generation_tip_sha256,
      "allocation_reservation_generation_tip_invalid",
    ),
    activation_receipt_id: receiptId,
    activation_receipt_sha256: canonicalHex64V1(
      input.activation_receipt_sha256,
      "allocation_reservation_activation_receipt_sha256_invalid",
    ),
    expires_at_ms: expiresAt,
  });
}

function requestLaunchAuthorityLineageV1(
  value: unknown,
): Readonly<LaunchAuthorityLineageV1> {
  if (!isRecord(value)) {
    throw new Error("allocation_reservation_request_launch_authority_invalid");
  }
  if (
    Object.keys(value).sort().join("\n") !==
    [...REQUEST_AUTHORITY_KEYS].sort().join("\n") ||
    value.marker !== REQUEST_AUTHORITY_MARKER ||
    value.version !== 1
  ) {
    throw new Error("allocation_reservation_request_launch_authority_invalid");
  }
  const lineage = launchAuthorityLineageFieldsV1({
    coupled_launch_id: value.coupled_launch_id,
    source_composition_id: value.source_composition_id,
    activation_generation: value.activation_generation,
    generation_tip_sha256: value.generation_tip_sha256,
    activation_receipt_id: value.activation_receipt_id,
    activation_receipt_sha256: value.activation_receipt_sha256,
    expires_at_ms: value.expires_at_ms,
  });
  for (const key of [
    "coupled_launch_id",
    "source_composition_id",
    "activation_generation",
    "generation_tip_sha256",
    "activation_receipt_id",
    "activation_receipt_sha256",
    "expires_at_ms",
  ] as const) {
    if (value[key] !== lineage[key]) {
      throw new Error(
        "allocation_reservation_request_launch_authority_noncanonical",
      );
    }
  }
  return lineage;
}

function recordIdV1(
  requestId: string,
  canonicalPaymentIdentity: string,
  paymentVerifiedEventSha256: string,
  launchAuthority: LaunchAuthorityLineageV1,
): string {
  return (
    "voidalloc1_" +
    sha256(
      [
        VOID_BUY_VOID_ALLOCATION_RESERVATION_RECORD_V1,
        requestId,
        canonicalPaymentIdentity,
        paymentVerifiedEventSha256,
        launchAuthority.coupled_launch_id,
        launchAuthority.source_composition_id,
        launchAuthority.activation_generation,
        launchAuthority.generation_tip_sha256,
        launchAuthority.activation_receipt_id,
        launchAuthority.activation_receipt_sha256,
        String(launchAuthority.expires_at_ms),
      ].join("\n"),
    )
  );
}

function recordHashV1(
  recordWithoutHash: Omit<
    BuyVoidAllocationReservationRecordV1,
    "allocation_record_hash"
  >,
): string {
  return "sha256:" + sha256(canonicalJson(recordWithoutHash));
}

function recordWithoutHashV1(
  record: BuyVoidAllocationReservationRecordV1,
): Omit<
  BuyVoidAllocationReservationRecordV1,
  "allocation_record_hash"
> {
  const {
    allocation_record_hash: _allocationRecordHash,
    ...body
  } = record;
  return body;
}

function parseRecordV1(
  raw: unknown,
  input: {
    expected_previous_hash: string;
    prior_pool_micro: bigint | null;
    prior_reserved_micro: bigint;
    prior_remaining_micro: bigint | null;
    prior_created_at_ms: number | null;
    seen_record_hashes: Set<string>;
    seen_request_ids: Set<string>;
    seen_payment_identities: Set<string>;
  },
): BuyVoidAllocationReservationRecordV1 {
  if (!isRecord(raw)) {
    throw new Error("allocation_reservation_record_invalid");
  }
  if (
    Object.keys(raw).sort().join("\n") !==
    [...RECORD_KEYS].sort().join("\n")
  ) {
    throw new Error("allocation_reservation_record_shape_invalid");
  }

  const recordType = String(raw.record_type || "");
  if (recordType !== RECORD_TYPE) {
    throw new Error("allocation_reservation_record_type_invalid");
  }

  const requestId = String(raw.request_id || "").trim();
  if (!REQUEST_ID.test(requestId)) {
    throw new Error("allocation_reservation_request_id_invalid");
  }
  const launchAuthority = launchAuthorityLineageFieldsV1({
    coupled_launch_id: raw.coupled_launch_id,
    source_composition_id: raw.source_composition_id,
    activation_generation: raw.activation_generation,
    generation_tip_sha256: raw.generation_tip_sha256,
    activation_receipt_id: raw.activation_receipt_id,
    activation_receipt_sha256: raw.activation_receipt_sha256,
    expires_at_ms: raw.expires_at_ms,
  });
  for (const key of [
    "coupled_launch_id",
    "source_composition_id",
    "activation_generation",
    "generation_tip_sha256",
    "activation_receipt_id",
    "activation_receipt_sha256",
    "expires_at_ms",
  ] as const) {
    if (raw[key] !== launchAuthority[key]) {
      throw new Error("allocation_reservation_launch_authority_noncanonical");
    }
  }

  const chain = canonicalChainV1(raw.source_chain);
  if (raw.source_chain !== chain) {
    throw new Error("allocation_reservation_source_chain_noncanonical");
  }
  const txHash = canonicalHashV1(raw.payment_transaction_hash);
  if (raw.payment_transaction_hash !== txHash) {
    throw new Error("allocation_reservation_payment_tx_hash_noncanonical");
  }
  const logIndex = paymentLogIndexV1(
    raw.payment_log_index,
    "allocation_reservation_payment_log_index_invalid",
  );
  if (raw.payment_log_index !== logIndex) {
    throw new Error("allocation_reservation_payment_log_index_noncanonical");
  }
  const canonicalPaymentIdentity =
    canonicalBuyVoidPaymentIdentityV1({
      source_chain: chain,
      payment_transaction_hash: txHash,
      payment_log_index: logIndex,
    });
  if (
    raw.canonical_payment_identity !==
    canonicalPaymentIdentity
  ) {
    throw new Error(
      "allocation_reservation_canonical_payment_identity_mismatch",
    );
  }
  const wallet = canonicalAddressV1(raw.buyer_delivery_wallet);
  if (raw.buyer_delivery_wallet !== wallet) {
    throw new Error("allocation_reservation_buyer_wallet_noncanonical");
  }

  const quoteVoid = amountV1(
    raw.quote_void_amount,
    "allocation_reservation_quote_void_invalid",
    true,
  );
  const quoteUsdc = amountV1(
    raw.quote_usdc_amount,
    "allocation_reservation_quote_usdc_invalid",
    true,
  );
  const pool = amountV1(
    raw.pool_void_total_before,
    "allocation_reservation_pool_invalid",
    true,
  );
  const reservedBefore = amountV1(
    raw.reserved_void_total_before,
    "allocation_reservation_reserved_before_invalid",
  );
  const remainingBefore = amountV1(
    raw.remaining_void_before,
    "allocation_reservation_remaining_before_invalid",
  );
  const reservedAfter = amountV1(
    raw.reserved_void_total_after,
    "allocation_reservation_reserved_after_invalid",
  );
  const remainingAfter = amountV1(
    raw.remaining_void_after,
    "allocation_reservation_remaining_after_invalid",
  );

  assertCanonicalPresaleEconomicsV1(
    pool,
    quoteVoid,
    quoteUsdc,
  );

  for (const [observed, canonical, code] of [
    [
      raw.quote_void_amount,
      quoteVoid.text,
      "allocation_reservation_quote_void_noncanonical",
    ],
    [
      raw.quote_usdc_amount,
      quoteUsdc.text,
      "allocation_reservation_quote_usdc_noncanonical",
    ],
    [
      raw.pool_void_total_before,
      pool.text,
      "allocation_reservation_pool_noncanonical",
    ],
    [
      raw.reserved_void_total_before,
      reservedBefore.text,
      "allocation_reservation_reserved_before_noncanonical",
    ],
    [
      raw.remaining_void_before,
      remainingBefore.text,
      "allocation_reservation_remaining_before_noncanonical",
    ],
    [
      raw.reserved_void_total_after,
      reservedAfter.text,
      "allocation_reservation_reserved_after_noncanonical",
    ],
    [
      raw.remaining_void_after,
      remainingAfter.text,
      "allocation_reservation_remaining_after_noncanonical",
    ],
  ] as const) {
    if (observed !== canonical) throw new Error(code);
  }

  if (
    reservedBefore.micro + remainingBefore.micro !== pool.micro ||
    reservedAfter.micro + remainingAfter.micro !== pool.micro ||
    quoteVoid.micro > remainingBefore.micro ||
    reservedAfter.micro !==
      reservedBefore.micro + quoteVoid.micro ||
    remainingAfter.micro !==
      remainingBefore.micro - quoteVoid.micro ||
    reservedAfter.micro > pool.micro
  ) {
    throw new Error("allocation_reservation_inventory_math_invalid");
  }

  if (
    input.prior_pool_micro === null &&
    (reservedBefore.micro !== 0n ||
      remainingBefore.micro !== pool.micro)
  ) {
    throw new Error(
      "allocation_reservation_genesis_inventory_state_invalid",
    );
  }

  if (
    input.prior_pool_micro !== null &&
    (pool.micro !== input.prior_pool_micro ||
      reservedBefore.micro !== input.prior_reserved_micro ||
      remainingBefore.micro !== input.prior_remaining_micro)
  ) {
    throw new Error("allocation_reservation_inventory_chain_invalid");
  }

  const verifiedRef = contentRefV1(
    raw.verified_payment_receipt_ref,
    "allocation_reservation_verified_payment_ref_invalid",
  );
  const paymentVerifiedEventSha256 = contentRefV1(
    raw.payment_verified_event_sha256,
    "allocation_reservation_payment_verified_event_sha256_invalid",
  );
  if (raw.payment_verified_event_sha256 !== paymentVerifiedEventSha256) {
    throw new Error(
      "allocation_reservation_payment_verified_event_sha256_noncanonical",
    );
  }
  const duplicateRef = contentRefV1(
    raw.duplicate_payment_guard_result,
    "allocation_reservation_duplicate_guard_ref_invalid",
  );
  const inventoryRef = contentRefV1(
    raw.inventory_allocation_guard_result,
    "allocation_reservation_inventory_guard_ref_invalid",
  );
  const activationRef = contentRefV1(
    raw.operator_activation_record_ref,
    "allocation_reservation_operator_activation_ref_invalid",
  );

  const createdAt = Number(raw.created_at_ms);
  if (
    !Number.isSafeInteger(createdAt) ||
    createdAt < 1 ||
    (input.prior_created_at_ms !== null &&
      createdAt < input.prior_created_at_ms)
  ) {
    throw new Error("allocation_reservation_created_at_invalid");
  }

  const previousHash = String(
    raw.previous_allocation_record_hash || "",
  ).trim().toLowerCase();
  const allocationHash = String(
    raw.allocation_record_hash || "",
  ).trim().toLowerCase();
  if (!SHA256_ID.test(previousHash)) {
    throw new Error("allocation_reservation_previous_hash_invalid");
  }
  if (!SHA256_ID.test(allocationHash)) {
    throw new Error("allocation_reservation_hash_invalid");
  }
  if (input.seen_record_hashes.has(allocationHash)) {
    throw new Error("allocation_reservation_duplicate_record_hash");
  }
  if (previousHash !== input.expected_previous_hash) {
    throw new Error("allocation_reservation_previous_hash_mismatch");
  }
  if (input.seen_request_ids.has(requestId)) {
    throw new Error("allocation_reservation_duplicate_request_id");
  }
  if (
    input.seen_payment_identities.has(
      canonicalPaymentIdentity,
    )
  ) {
    throw new Error(
      "allocation_reservation_duplicate_canonical_payment_identity",
    );
  }

  const recordId = String(raw.record_id || "").trim();
  if (
    !RECORD_ID.test(recordId) ||
    recordId !== recordIdV1(
      requestId,
      canonicalPaymentIdentity,
      paymentVerifiedEventSha256,
      launchAuthority,
    )
  ) {
    throw new Error("allocation_reservation_record_id_invalid");
  }

  const record: BuyVoidAllocationReservationRecordV1 = {
    record_type: RECORD_TYPE,
    record_id: recordId,
    request_id: requestId,
    coupled_launch_id: launchAuthority.coupled_launch_id,
    source_composition_id: launchAuthority.source_composition_id,
    activation_generation: launchAuthority.activation_generation,
    generation_tip_sha256: launchAuthority.generation_tip_sha256,
    activation_receipt_id: launchAuthority.activation_receipt_id,
    activation_receipt_sha256: launchAuthority.activation_receipt_sha256,
    expires_at_ms: launchAuthority.expires_at_ms,
    source_chain: chain,
    payment_transaction_hash: txHash,
    payment_log_index: logIndex,
    canonical_payment_identity: canonicalPaymentIdentity,
    buyer_delivery_wallet: wallet,
    quote_void_amount: quoteVoid.text,
    quote_usdc_amount: quoteUsdc.text,
    pool_void_total_before: pool.text,
    reserved_void_total_before: reservedBefore.text,
    remaining_void_before: remainingBefore.text,
    reserved_void_total_after: reservedAfter.text,
    remaining_void_after: remainingAfter.text,
    verified_payment_receipt_ref: verifiedRef,
    payment_verified_event_sha256: paymentVerifiedEventSha256,
    duplicate_payment_guard_result: duplicateRef,
    inventory_allocation_guard_result: inventoryRef,
    operator_activation_record_ref: activationRef,
    created_at_ms: createdAt,
    previous_allocation_record_hash: previousHash,
    allocation_record_hash: allocationHash,
  };

  if (
    recordHashV1(recordWithoutHashV1(record)) !==
    allocationHash
  ) {
    throw new Error("allocation_reservation_hash_mismatch");
  }
  return Object.freeze(record);
}

export function classifyBuyVoidAllocationReservationLedgerV1(
  ledger: string | Buffer,
): BuyVoidAllocationReservationLedgerDecisionV1 {
  try {
    const bytes = Buffer.isBuffer(ledger)
      ? ledger
      : Buffer.from(String(ledger ?? ""), "utf8");
    if (bytes.length > MAX_LEDGER_BYTES) {
      throw new Error("allocation_reservation_ledger_too_large");
    }
    const text = bytes.toString("utf8");
    if (!text) {
      return Object.freeze({
        ok: true,
        status: "valid",
        marker: VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_V1,
        version: 1,
        record_count: 0,
        records: Object.freeze([]),
        request_ids: Object.freeze([]),
        canonical_payment_identities: Object.freeze([]),
        pool_void_total: null,
        reserved_void_total: "0",
        remaining_void: null,
        tip_hash:
          VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1,
        authority:
          VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_AUTHORITY_V1,
      });
    }
    if (!text.endsWith("\n")) {
      throw new Error("allocation_reservation_ledger_missing_final_newline");
    }
    const lines = text.slice(0, -1).split("\n");
    if (
      lines.length > MAX_LEDGER_RECORDS ||
      lines.some((line) => line.length === 0)
    ) {
      throw new Error("allocation_reservation_ledger_lines_invalid");
    }

    const records: BuyVoidAllocationReservationRecordV1[] = [];
    const seenHashes = new Set<string>();
    const seenRequests = new Set<string>();
    const seenPayments = new Set<string>();
    let expectedPrevious =
      VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1;
    let priorPool: bigint | null = null;
    let priorReserved = 0n;
    let priorRemaining: bigint | null = null;
    let priorCreatedAt: number | null = null;

    for (const line of lines) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        throw new Error("allocation_reservation_ledger_json_invalid");
      }
      const record = parseRecordV1(parsed, {
        expected_previous_hash: expectedPrevious,
        prior_pool_micro: priorPool,
        prior_reserved_micro: priorReserved,
        prior_remaining_micro: priorRemaining,
        prior_created_at_ms: priorCreatedAt,
        seen_record_hashes: seenHashes,
        seen_request_ids: seenRequests,
        seen_payment_identities: seenPayments,
      });
      if (line !== JSON.stringify(record)) {
        throw new Error(
          "allocation_reservation_record_serialization_noncanonical",
        );
      }
      records.push(record);
      seenHashes.add(record.allocation_record_hash);
      seenRequests.add(record.request_id);
      seenPayments.add(record.canonical_payment_identity);
      expectedPrevious = record.allocation_record_hash;
      priorPool = amountV1(
        record.pool_void_total_before,
        "allocation_reservation_pool_invalid",
        true,
      ).micro;
      priorReserved = amountV1(
        record.reserved_void_total_after,
        "allocation_reservation_reserved_after_invalid",
      ).micro;
      priorRemaining = amountV1(
        record.remaining_void_after,
        "allocation_reservation_remaining_after_invalid",
      ).micro;
      priorCreatedAt = record.created_at_ms;
    }

    return Object.freeze({
      ok: true,
      status: "valid",
      marker: VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_V1,
      version: 1,
      record_count: records.length,
      records: Object.freeze([...records]),
      request_ids: Object.freeze([...seenRequests]),
      canonical_payment_identities: Object.freeze([...seenPayments]),
      pool_void_total:
        priorPool === null
          ? null
          : amountTextFromMicroV1(priorPool),
      reserved_void_total:
        amountTextFromMicroV1(priorReserved),
      remaining_void:
        priorRemaining === null
          ? null
          : amountTextFromMicroV1(priorRemaining),
      tip_hash: expectedPrevious,
      authority:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_reservation_ledger_invalid",
    );
  }
}

function candidateCoreV1(input: {
  request_id: unknown;
  source_chain: unknown;
  payment_transaction_hash: unknown;
  payment_log_index: unknown;
  launch_authority: unknown;
  buyer_delivery_wallet: unknown;
  quote_void_amount: unknown;
  quote_usdc_amount: unknown;
  verified_payment_receipt_ref: unknown;
  payment_verified_event_sha256: unknown;
  duplicate_payment_guard_result: unknown;
  inventory_allocation_guard_result: unknown;
  operator_activation_record_ref: unknown;
}) {
  const requestId = String(input.request_id ?? "").trim();
  if (!REQUEST_ID.test(requestId)) {
    throw new Error("allocation_reservation_request_id_invalid");
  }
  const launchAuthority =
    requestLaunchAuthorityLineageV1(input.launch_authority);
  const chain = canonicalChainV1(input.source_chain);
  const txHash = canonicalHashV1(
    input.payment_transaction_hash,
  );
  const logIndex = paymentLogIndexV1(
    input.payment_log_index,
    "allocation_reservation_payment_log_index_invalid",
  );
  const canonicalPaymentIdentity =
    canonicalBuyVoidPaymentIdentityV1({
      source_chain: chain,
      payment_transaction_hash: txHash,
      payment_log_index: logIndex,
    });
  return Object.freeze({
    request_id: requestId,
    coupled_launch_id: launchAuthority.coupled_launch_id,
    source_composition_id: launchAuthority.source_composition_id,
    activation_generation: launchAuthority.activation_generation,
    generation_tip_sha256: launchAuthority.generation_tip_sha256,
    activation_receipt_id: launchAuthority.activation_receipt_id,
    activation_receipt_sha256: launchAuthority.activation_receipt_sha256,
    expires_at_ms: launchAuthority.expires_at_ms,
    source_chain: chain,
    payment_transaction_hash: txHash,
    payment_log_index: logIndex,
    canonical_payment_identity: canonicalPaymentIdentity,
    buyer_delivery_wallet: canonicalAddressV1(
      input.buyer_delivery_wallet,
    ),
    quote_void_amount: amountV1(
      input.quote_void_amount,
      "allocation_reservation_quote_void_invalid",
      true,
    ).text,
    quote_usdc_amount: amountV1(
      input.quote_usdc_amount,
      "allocation_reservation_quote_usdc_invalid",
      true,
    ).text,
    verified_payment_receipt_ref: contentRefV1(
      input.verified_payment_receipt_ref,
      "allocation_reservation_verified_payment_ref_invalid",
    ),
    payment_verified_event_sha256: contentRefV1(
      input.payment_verified_event_sha256,
      "allocation_reservation_payment_verified_event_sha256_invalid",
    ),
    duplicate_payment_guard_result: contentRefV1(
      input.duplicate_payment_guard_result,
      "allocation_reservation_duplicate_guard_ref_invalid",
    ),
    inventory_allocation_guard_result: contentRefV1(
      input.inventory_allocation_guard_result,
      "allocation_reservation_inventory_guard_ref_invalid",
    ),
    operator_activation_record_ref: contentRefV1(
      input.operator_activation_record_ref,
      "allocation_reservation_operator_activation_ref_invalid",
    ),
  });
}

export function planBuyVoidAllocationReservationV1(input: {
  ledger_jsonl: string | Buffer;
  request_id: unknown;
  source_chain: unknown;
  payment_transaction_hash: unknown;
  payment_log_index: unknown;
  launch_authority: unknown;
  buyer_delivery_wallet: unknown;
  quote_void_amount: unknown;
  quote_usdc_amount: unknown;
  pool_void_total: unknown;
  verified_payment_receipt_ref: unknown;
  payment_verified_event_sha256: unknown;
  duplicate_payment_guard_result: unknown;
  inventory_allocation_guard_result: unknown;
  operator_activation_record_ref: unknown;
  created_at_ms: unknown;
  verified_payment_gate_green: unknown;
  duplicate_payment_guard_green: unknown;
  inventory_allocation_guard_green: unknown;
  operator_activation_record_green: unknown;
}): BuyVoidAllocationReservationPlanDecisionV1 {
  try {
    if (
      input?.verified_payment_gate_green !== true ||
      input?.duplicate_payment_guard_green !== true ||
      input?.inventory_allocation_guard_green !== true ||
      input?.operator_activation_record_green !== true
    ) {
      throw new Error(
        "allocation_reservation_prerequisite_gate_not_green",
      );
    }

    const ledger =
      classifyBuyVoidAllocationReservationLedgerV1(
        input.ledger_jsonl,
      );
    if (ledger.ok === false) return ledger;

    const core = candidateCoreV1(input);
    const pool = amountV1(
      input.pool_void_total,
      "allocation_reservation_pool_invalid",
      true,
    );
    const quoteVoid = amountV1(
      core.quote_void_amount,
      "allocation_reservation_quote_void_invalid",
      true,
    );
    const quoteUsdc = amountV1(
      core.quote_usdc_amount,
      "allocation_reservation_quote_usdc_invalid",
      true,
    );
    assertCanonicalPresaleEconomicsV1(
      pool,
      quoteVoid,
      quoteUsdc,
    );

    const priorByRequest = ledger.records.find(
      (record) => record.request_id === core.request_id,
    );
    const priorByPayment = ledger.records.find(
      (record) =>
        record.canonical_payment_identity ===
        core.canonical_payment_identity,
    );

    if (priorByRequest || priorByPayment) {
      if (
        !priorByRequest ||
        !priorByPayment ||
        priorByRequest.allocation_record_hash !==
          priorByPayment.allocation_record_hash
      ) {
        throw new Error(
          priorByRequest
            ? "allocation_reservation_duplicate_request_id"
            : "allocation_reservation_duplicate_canonical_payment_identity",
        );
      }
      for (const key of [
        "coupled_launch_id",
        "source_composition_id",
        "activation_generation",
        "generation_tip_sha256",
        "activation_receipt_id",
        "activation_receipt_sha256",
        "expires_at_ms",
        "source_chain",
        "payment_transaction_hash",
        "payment_log_index",
        "canonical_payment_identity",
        "buyer_delivery_wallet",
        "quote_void_amount",
        "quote_usdc_amount",
        "verified_payment_receipt_ref",
        "payment_verified_event_sha256",
        "duplicate_payment_guard_result",
        "inventory_allocation_guard_result",
        "operator_activation_record_ref",
      ] as const) {
        if (priorByRequest[key] !== core[key]) {
          throw new Error(
            "allocation_reservation_idempotent_binding_mismatch",
          );
        }
      }
      if (priorByRequest.pool_void_total_before !== pool.text) {
        throw new Error(
          "allocation_reservation_idempotent_pool_mismatch",
        );
      }
      return Object.freeze({
        ok: true,
        status: "idempotent",
        marker: VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_V1,
        version: 1,
        idempotent: true,
        operation_performed: false,
        record: priorByRequest,
        next_ledger_jsonl: Buffer.isBuffer(input.ledger_jsonl)
          ? input.ledger_jsonl.toString("utf8")
          : String(input.ledger_jsonl ?? ""),
        next_record_count: ledger.record_count,
        authority:
          VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_AUTHORITY_V1,
      });
    }

    if (
      ledger.pool_void_total !== null &&
      ledger.pool_void_total !== pool.text
    ) {
      throw new Error("allocation_reservation_pool_changed");
    }

    const reservedBefore = amountV1(
      ledger.reserved_void_total,
      "allocation_reservation_reserved_before_invalid",
    );
    const remainingBefore =
      ledger.remaining_void === null
        ? pool.micro
        : amountV1(
            ledger.remaining_void,
            "allocation_reservation_remaining_before_invalid",
          ).micro;

    if (quoteVoid.micro > remainingBefore) {
      throw new Error(
        "allocation_reservation_remaining_inventory_insufficient",
      );
    }

    const reservedAfter =
      reservedBefore.micro + quoteVoid.micro;
    const remainingAfter =
      remainingBefore - quoteVoid.micro;
    const createdAt = Number(input.created_at_ms);
    const lastCreatedAt =
      ledger.records.length > 0
        ? ledger.records[ledger.records.length - 1].created_at_ms
        : null;
    if (
      !Number.isSafeInteger(createdAt) ||
      createdAt < 1 ||
      (lastCreatedAt !== null && createdAt < lastCreatedAt)
    ) {
      throw new Error("allocation_reservation_created_at_invalid");
    }

    const recordWithoutHash: Omit<
      BuyVoidAllocationReservationRecordV1,
      "allocation_record_hash"
    > = {
      record_type: RECORD_TYPE,
      record_id: recordIdV1(
        core.request_id,
        core.canonical_payment_identity,
        core.payment_verified_event_sha256,
        core,
      ),
      request_id: core.request_id,
      coupled_launch_id: core.coupled_launch_id,
      source_composition_id: core.source_composition_id,
      activation_generation: core.activation_generation,
      generation_tip_sha256: core.generation_tip_sha256,
      activation_receipt_id: core.activation_receipt_id,
      activation_receipt_sha256: core.activation_receipt_sha256,
      expires_at_ms: core.expires_at_ms,
      source_chain: core.source_chain,
      payment_transaction_hash:
        core.payment_transaction_hash,
      payment_log_index: core.payment_log_index,
      canonical_payment_identity:
        core.canonical_payment_identity,
      buyer_delivery_wallet: core.buyer_delivery_wallet,
      quote_void_amount: core.quote_void_amount,
      quote_usdc_amount: core.quote_usdc_amount,
      pool_void_total_before: pool.text,
      reserved_void_total_before:
        reservedBefore.text,
      remaining_void_before:
        amountTextFromMicroV1(remainingBefore),
      reserved_void_total_after:
        amountTextFromMicroV1(reservedAfter),
      remaining_void_after:
        amountTextFromMicroV1(remainingAfter),
      verified_payment_receipt_ref:
        core.verified_payment_receipt_ref,
      payment_verified_event_sha256:
        core.payment_verified_event_sha256,
      duplicate_payment_guard_result:
        core.duplicate_payment_guard_result,
      inventory_allocation_guard_result:
        core.inventory_allocation_guard_result,
      operator_activation_record_ref:
        core.operator_activation_record_ref,
      created_at_ms: createdAt,
      previous_allocation_record_hash:
        ledger.tip_hash,
    };
    const record = Object.freeze({
      ...recordWithoutHash,
      allocation_record_hash:
        recordHashV1(recordWithoutHash),
    });

    const priorText = Buffer.isBuffer(input.ledger_jsonl)
      ? input.ledger_jsonl.toString("utf8")
      : String(input.ledger_jsonl ?? "");
    const nextLedger =
      priorText + JSON.stringify(record) + "\n";
    const classifiedNext =
      classifyBuyVoidAllocationReservationLedgerV1(
        nextLedger,
      );
    if (
      !classifiedNext.ok ||
      classifiedNext.record_count !==
        ledger.record_count + 1 ||
      classifiedNext.tip_hash !==
        record.allocation_record_hash
    ) {
      throw new Error(
        "allocation_reservation_planned_ledger_invalid",
      );
    }

    return Object.freeze({
      ok: true,
      status: "planned",
      marker: VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_V1,
      version: 1,
      idempotent: false,
      operation_performed: false,
      record,
      next_ledger_jsonl: nextLedger,
      next_record_count: classifiedNext.record_count,
      authority:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_reservation_plan_invalid",
    );
  }
}
