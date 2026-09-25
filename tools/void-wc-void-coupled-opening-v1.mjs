import { createHash } from "node:crypto";

export const VOID_WC_VOID_COUPLED_OPENING_V1 =
  "VOID_WC_VOID_COUPLED_OPENING_V1";

export const VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1 =
  "void-wc-ledger-opening-settlement-v1";

export const VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1 =
  "void.wc-void-opening-commitment.v1";

export const VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1 =
  "void.wc-ledger-market-debit.v1";

export const VOID_WC_VOID_OPENING_STATE_SCHEMA_V1 =
  "void.wc-void-coupled-opening-state.v1";

export const VOID_WC_VOID_COUPLED_OPENING_AUTHORITY_V1 = Object.freeze({
  source_only: true,
  explicit_input_only: true,
  canonical_wc_ledger_event_shape_required: true,
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

export const VOID_WC_VOID_OPENING_POLICY_V1 = Object.freeze({
  chain_id: 2050,
  pair: "WC_VOID",
  quote_asset: "WC",
  base_asset: "VOID",
  source_domain: "void-work-credit-ledger",
  quote_asset_form: "ledger-credit",
  quote_unit: "wc",
  quote_decimals: 0,
  protocol_void_inventory_atoms: "10000000000000000000000000",
  protocol_void_inventory_whole: "10000000",
  protocol_wc_seed_units: "0",
  fixed_conversion: false,
  fixed_opening_price: false,
  opening_price_source: "settled_wc_reserve_ratio",
  settlement_adapter_id:
    VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
});

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const SAFE_ACCOUNT = /^[A-Za-z0-9._:@-]{3,128}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const MAX_SAFE_WC = BigInt(Number.MAX_SAFE_INTEGER);
const MAX_SET_SIZE = 1_000_000;

const COMMITMENT_KEYS = Object.freeze([
  "schema",
  "commitment_id",
  "coupled_launch_id",
  "participant_id",
  "account",
  "wc_units",
]);

const DEBIT_KEYS = Object.freeze([
  "schema",
  "kind",
  "account",
  "amount",
  "delta",
  "ts_ms",
  "reason",
  "settlement_id",
  "commitment_id",
  "coupled_launch_id",
  "pair",
  "source_domain",
  "quote_asset_form",
  "quote_unit",
  "quote_decimals",
  "market_meta",
]);

const META_KEYS = Object.freeze([
  "adapter_id",
  "opening_only",
  "fixed_price",
  "protocol_wc_seed_units",
]);

const REQUEST_KEYS = Object.freeze([
  "coupled_launch_id",
  "commitments",
  "ledger_debits",
]);

function fail(code) {
  throw new Error(code);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) fail(code);
  const actual = ownKeys.sort(compareText);
  const expected = [...keys].sort(compareText);
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const snapshot = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function exactArray(value, code) {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length < 1 ||
    value.length > MAX_SET_SIZE
  ) {
    fail(code);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== value.length + 1) fail(code);
  const out = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out.push(descriptor.value);
  }
  return out;
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
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort(compareText);
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function digest(value) {
  return "sha256:" +
    createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function positiveWholeWc(value, code) {
  if (typeof value !== "string" || !UINT.test(value)) fail(code);
  const amount = BigInt(value);
  if (amount <= 0n || amount > MAX_SAFE_WC) fail(code);
  return amount;
}

function canonicalAccount(value, code) {
  if (typeof value !== "string" || !SAFE_ACCOUNT.test(value)) fail(code);
  return value;
}

function canonicalSha(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

function gcd(left, right) {
  let a = left;
  let b = right;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

function commitmentPayload(value) {
  return Object.freeze({
    schema: value.schema,
    coupled_launch_id: value.coupled_launch_id,
    participant_id: value.participant_id,
    account: value.account,
    wc_units: value.wc_units,
  });
}

function debitPayload(value) {
  return Object.freeze({
    schema: value.schema,
    kind: value.kind,
    account: value.account,
    amount: value.amount,
    delta: value.delta,
    ts_ms: value.ts_ms,
    reason: value.reason,
    commitment_id: value.commitment_id,
    coupled_launch_id: value.coupled_launch_id,
    pair: value.pair,
    source_domain: value.source_domain,
    quote_asset_form: value.quote_asset_form,
    quote_unit: value.quote_unit,
    quote_decimals: value.quote_decimals,
    market_meta: value.market_meta,
  });
}

export function wcVoidOpeningCommitmentIdV1(value) {
  const commitment = exactObject(
    value,
    COMMITMENT_KEYS,
    "INVALID_WC_VOID_OPENING_COMMITMENT_SHAPE",
  );
  return digest(commitmentPayload(commitment));
}

export function wcVoidOpeningSettlementIdV1(value) {
  const debit = exactObject(
    value,
    DEBIT_KEYS,
    "INVALID_WC_VOID_OPENING_LEDGER_DEBIT_SHAPE",
  );
  return digest(debitPayload(debit));
}

export function verifyWcVoidOpeningCommitmentsV1(
  coupledLaunchId,
  commitments,
) {
  canonicalSha(coupledLaunchId, "INVALID_COUPLED_LAUNCH_ID");
  const values = exactArray(
    commitments,
    "INVALID_WC_VOID_OPENING_COMMITMENT_SET",
  );

  const seenCommitmentIds = new Set();
  const seenParticipantIds = new Set();
  let totalWc = 0n;

  const canonical = values.map((raw) => {
    const value = exactObject(
      raw,
      COMMITMENT_KEYS,
      "INVALID_WC_VOID_OPENING_COMMITMENT_SHAPE",
    );
    if (value.schema !== VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1) {
      fail("INVALID_WC_VOID_OPENING_COMMITMENT_SCHEMA");
    }
    if (value.coupled_launch_id !== coupledLaunchId) {
      fail("WC_VOID_OPENING_COMMITMENT_LAUNCH_MISMATCH");
    }
    canonicalSha(value.commitment_id, "INVALID_WC_VOID_OPENING_COMMITMENT_ID");
    canonicalSha(value.participant_id, "INVALID_WC_VOID_OPENING_PARTICIPANT_ID");
    canonicalAccount(value.account, "INVALID_WC_VOID_OPENING_ACCOUNT");
    const wc = positiveWholeWc(
      value.wc_units,
      "INVALID_WC_VOID_OPENING_WC_UNITS",
    );
    if (wcVoidOpeningCommitmentIdV1(value) !== value.commitment_id) {
      fail("WC_VOID_OPENING_COMMITMENT_DIGEST_MISMATCH");
    }
    if (seenCommitmentIds.has(value.commitment_id)) {
      fail("DUPLICATE_WC_VOID_OPENING_COMMITMENT_ID");
    }
    if (seenParticipantIds.has(value.participant_id)) {
      fail("DUPLICATE_WC_VOID_OPENING_PARTICIPANT_ID");
    }
    seenCommitmentIds.add(value.commitment_id);
    seenParticipantIds.add(value.participant_id);
    totalWc += wc;
    return Object.freeze({
      commitment_id: value.commitment_id,
      coupled_launch_id: value.coupled_launch_id,
      participant_id: value.participant_id,
      account: value.account,
      wc_units: value.wc_units,
    });
  });

  canonical.sort((left, right) =>
    compareText(left.commitment_id, right.commitment_id)
  );

  return Object.freeze({
    commitment_count: canonical.length,
    commitment_set_root: digest({
      schema: VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
      coupled_launch_id: coupledLaunchId,
      commitments: canonical,
    }),
    total_committed_wc_units: totalWc.toString(),
    commitments: Object.freeze(canonical),
    participant_provenance_verified: false,
    ledger_settlement_verified: false,
  });
}

export function verifyWcVoidOpeningLedgerSettlementsV1(
  coupledLaunchId,
  commitments,
  ledgerDebits,
) {
  const commitmentSet =
    verifyWcVoidOpeningCommitmentsV1(coupledLaunchId, commitments);
  const debitValues = exactArray(
    ledgerDebits,
    "INVALID_WC_VOID_OPENING_LEDGER_DEBIT_SET",
  );
  if (debitValues.length !== commitmentSet.commitment_count) {
    fail("WC_VOID_OPENING_SETTLEMENT_COUNT_MISMATCH");
  }

  const commitmentsById = new Map(
    commitmentSet.commitments.map((value) => [value.commitment_id, value]),
  );
  const seenSettlements = new Set();
  const seenCommitments = new Set();
  let totalSettledWc = 0n;

  const canonical = debitValues.map((raw) => {
    const value = exactObject(
      raw,
      DEBIT_KEYS,
      "INVALID_WC_VOID_OPENING_LEDGER_DEBIT_SHAPE",
    );
    const meta = exactObject(
      value.market_meta,
      META_KEYS,
      "INVALID_WC_VOID_OPENING_LEDGER_DEBIT_META_SHAPE",
    );

    if (value.schema !== VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1) {
      fail("INVALID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA");
    }
    if (
      value.kind !== "debit" ||
      value.reason !== "wc_void_opening_settlement_v1" ||
      value.pair !== VOID_WC_VOID_OPENING_POLICY_V1.pair ||
      value.source_domain !== VOID_WC_VOID_OPENING_POLICY_V1.source_domain ||
      value.quote_asset_form !==
        VOID_WC_VOID_OPENING_POLICY_V1.quote_asset_form ||
      value.quote_unit !== VOID_WC_VOID_OPENING_POLICY_V1.quote_unit ||
      value.quote_decimals !== VOID_WC_VOID_OPENING_POLICY_V1.quote_decimals
    ) {
      fail("WC_VOID_OPENING_LEDGER_DEBIT_POLICY_MISMATCH");
    }
    if (
      meta.adapter_id !== VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1 ||
      meta.opening_only !== true ||
      meta.fixed_price !== false ||
      meta.protocol_wc_seed_units !== "0"
    ) {
      fail("WC_VOID_OPENING_LEDGER_DEBIT_META_MISMATCH");
    }

    canonicalSha(value.settlement_id, "INVALID_WC_VOID_OPENING_SETTLEMENT_ID");
    canonicalSha(value.commitment_id, "INVALID_WC_VOID_OPENING_COMMITMENT_ID");
    canonicalSha(value.coupled_launch_id, "INVALID_COUPLED_LAUNCH_ID");
    canonicalAccount(value.account, "INVALID_WC_VOID_OPENING_ACCOUNT");

    if (value.coupled_launch_id !== coupledLaunchId) {
      fail("WC_VOID_OPENING_SETTLEMENT_LAUNCH_MISMATCH");
    }
    if (
      !Number.isSafeInteger(value.amount) ||
      value.amount <= 0 ||
      !Number.isSafeInteger(value.delta) ||
      value.delta !== -value.amount ||
      !Number.isSafeInteger(value.ts_ms) ||
      value.ts_ms <= 0
    ) {
      fail("WC_VOID_OPENING_LEDGER_DEBIT_NUMERIC_INVALID");
    }

    const commitment = commitmentsById.get(value.commitment_id);
    if (!commitment) fail("UNKNOWN_WC_VOID_OPENING_SETTLED_COMMITMENT");
    if (
      commitment.account !== value.account ||
      BigInt(commitment.wc_units) !== BigInt(value.amount)
    ) {
      fail("WC_VOID_OPENING_SETTLEMENT_COMMITMENT_MISMATCH");
    }
    if (wcVoidOpeningSettlementIdV1(value) !== value.settlement_id) {
      fail("WC_VOID_OPENING_SETTLEMENT_DIGEST_MISMATCH");
    }
    if (seenSettlements.has(value.settlement_id)) {
      fail("DUPLICATE_WC_VOID_OPENING_SETTLEMENT_ID");
    }
    if (seenCommitments.has(value.commitment_id)) {
      fail("DUPLICATE_WC_VOID_OPENING_SETTLED_COMMITMENT");
    }
    seenSettlements.add(value.settlement_id);
    seenCommitments.add(value.commitment_id);
    totalSettledWc += BigInt(value.amount);

    return Object.freeze({
      settlement_id: value.settlement_id,
      commitment_id: value.commitment_id,
      account: value.account,
      amount_wc: String(value.amount),
      ts_ms: value.ts_ms,
    });
  });

  if (seenCommitments.size !== commitmentsById.size) {
    fail("MISSING_WC_VOID_OPENING_SETTLEMENT");
  }
  if (totalSettledWc.toString() !== commitmentSet.total_committed_wc_units) {
    fail("WC_VOID_OPENING_SETTLED_WC_TOTAL_MISMATCH");
  }

  canonical.sort((left, right) =>
    compareText(left.settlement_id, right.settlement_id)
  );

  return Object.freeze({
    adapter_id: VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
    source_domain: VOID_WC_VOID_OPENING_POLICY_V1.source_domain,
    quote_asset_form: VOID_WC_VOID_OPENING_POLICY_V1.quote_asset_form,
    quote_unit: VOID_WC_VOID_OPENING_POLICY_V1.quote_unit,
    quote_decimals: VOID_WC_VOID_OPENING_POLICY_V1.quote_decimals,
    settlement_count: canonical.length,
    settlement_set_root: digest({
      schema: VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
      coupled_launch_id: coupledLaunchId,
      settlements: canonical,
    }),
    total_settled_wc_units: totalSettledWc.toString(),
    exact_commitment_settlement_bijection: true,
    duplicate_settlement_rejected: true,
    duplicate_commitment_settlement_rejected: true,
    ledger_event_shape_verified: true,
    canonical_balance_debit_compatible: true,
    ledger_persistence_verified: false,
    ledger_write_performed: false,
    wc_balance_mutation_performed: false,
    settlements: Object.freeze(canonical),
  });
}

export function deriveWcVoidCoupledOpeningStateV1(input) {
  const request = exactObject(
    input,
    REQUEST_KEYS,
    "INVALID_WC_VOID_COUPLED_OPENING_REQUEST_SHAPE",
  );
  const launchId = canonicalSha(
    request.coupled_launch_id,
    "INVALID_COUPLED_LAUNCH_ID",
  );
  const commitmentSet = verifyWcVoidOpeningCommitmentsV1(
    launchId,
    request.commitments,
  );
  const settlementSet = verifyWcVoidOpeningLedgerSettlementsV1(
    launchId,
    request.commitments,
    request.ledger_debits,
  );

  const settledWc = BigInt(settlementSet.total_settled_wc_units);
  const voidWhole = BigInt(
    VOID_WC_VOID_OPENING_POLICY_V1.protocol_void_inventory_whole,
  );
  const divisor = gcd(settledWc, voidWhole);
  const priceNumerator = settledWc / divisor;
  const priceDenominator = voidWhole / divisor;

  const payload = Object.freeze({
    schema: VOID_WC_VOID_OPENING_STATE_SCHEMA_V1,
    coupled_launch_id: launchId,
    chain_id: VOID_WC_VOID_OPENING_POLICY_V1.chain_id,
    pair: VOID_WC_VOID_OPENING_POLICY_V1.pair,
    settlement_adapter_id:
      VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
    commitment_set_root: commitmentSet.commitment_set_root,
    settlement_set_root: settlementSet.settlement_set_root,
    participant_commitment_count: commitmentSet.commitment_count,
    settled_wc_reserve_units: settledWc.toString(),
    protocol_wc_seed_units:
      VOID_WC_VOID_OPENING_POLICY_V1.protocol_wc_seed_units,
    protocol_void_inventory_atoms:
      VOID_WC_VOID_OPENING_POLICY_V1.protocol_void_inventory_atoms,
    opening_price_wc_per_void_numerator: priceNumerator.toString(),
    opening_price_wc_per_void_denominator: priceDenominator.toString(),
    opening_price_source:
      VOID_WC_VOID_OPENING_POLICY_V1.opening_price_source,
  });

  return Object.freeze({
    ...payload,
    opening_state_id: digest(payload),
    fixed_conversion: false,
    fixed_opening_price: false,
    real_participant_wc_required: true,
    zero_protocol_wc_seed_required: true,
    commitment_settlement_bijection_verified: true,
    settlement_event_shape_verified: true,
    ledger_persistence_verified: false,
    quote_reserve_custody_verified: false,
    void_market_vault_custody_verified: false,
    participant_opening_claim_policy_ready: false,
    opening_commitment_window_policy_ready: false,
    participant_provenance_and_eligibility_verified: false,
    opening_concentration_and_sybil_limits_ready: false,
    opening_minimum_quote_depth_policy_ready: false,
    nonproduction_wc_exclusion_verified: false,
    opening_price_manipulation_protection_ready: false,
    opening_price_is_production_authority: false,
    market_activation_authority: false,
    inventory_funding_authority: false,
    liquidity_movement_authority: false,
    ledger_write_authority: false,
    wc_issuance_authority: false,
    funds_movement_authority: false,
    authority: VOID_WC_VOID_COUPLED_OPENING_AUTHORITY_V1,
  });
}
