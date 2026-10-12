import { createHash } from "node:crypto";

import {
  VOID_WC_VOID_OPENING_POLICY_V1,
  deriveWcVoidCoupledOpeningStateV1,
} from "./void-wc-void-coupled-opening-v1.mjs";

export const VOID_SHARED_MARKET_POST_DISCOVERY_STATE_V2 =
  "VOID_SHARED_MARKET_POST_DISCOVERY_STATE_V2";

export const VOID_SHARED_MARKET_POST_DISCOVERY_SCHEMA_V2 =
  "void.shared-market-post-discovery-state.v2";

export const VOID_SHARED_MARKET_EXECUTION_BINDING_V2 = Object.freeze({
  chain_id: 2050,
  network_identity: "mainnet0",
  execution_epoch: 2,
  void_token: "0x470075b85352eb86f7d089fb9ba88945f12aad94",
  void_token_decimals: 18,
});

export const VOID_SHARED_MARKET_POST_DISCOVERY_AUTHORITY_V2 = Object.freeze({
  source_only: true,
  model_reconciliation_only: true,
  runtime_mutation: false,
  wallet_or_signer_access: false,
  private_key_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  wc_ledger_write: false,
  inventory_funding: false,
  liquidity_movement: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
});

const REQUEST_KEYS = Object.freeze([
  "coupled_launch_id",
  "commitments",
  "ledger_debits",
]);

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const VOID_ATOMS_PER_VOID = 10n ** 18n;
const TEN_MILLION_VOID_ATOMS = 10_000_000n * VOID_ATOMS_PER_VOID;
const FIVE_MILLION_VOID_ATOMS = 5_000_000n * VOID_ATOMS_PER_VOID;
const THIRTY_MILLION_VOID_ATOMS = 30_000_000n * VOID_ATOMS_PER_VOID;
const TWENTY_MILLION_VOID_ATOMS = 20_000_000n * VOID_ATOMS_PER_VOID;
const TWENTY_FIVE_MILLION_VOID_ATOMS = 25_000_000n * VOID_ATOMS_PER_VOID;

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

function assertCanonicalWcPolicy() {
  if (
    VOID_WC_VOID_OPENING_POLICY_V1.chain_id !== 2050 ||
    VOID_WC_VOID_OPENING_POLICY_V1.pair !== "WC_VOID" ||
    VOID_WC_VOID_OPENING_POLICY_V1.protocol_void_inventory_atoms !==
      TEN_MILLION_VOID_ATOMS.toString() ||
    VOID_WC_VOID_OPENING_POLICY_V1.opening_sale_tranche_void_atoms !==
      FIVE_MILLION_VOID_ATOMS.toString() ||
    VOID_WC_VOID_OPENING_POLICY_V1.post_opening_void_reserve_atoms !==
      FIVE_MILLION_VOID_ATOMS.toString() ||
    VOID_WC_VOID_OPENING_POLICY_V1.protocol_wc_seed_units !== "0" ||
    VOID_WC_VOID_OPENING_POLICY_V1.fixed_conversion !== false ||
    VOID_WC_VOID_OPENING_POLICY_V1.fixed_opening_price !== false
  ) {
    fail("WC_VOID_CANONICAL_OPENING_POLICY_MISMATCH");
  }
}

export function reconcileSharedMarketPostDiscoveryStateV2(input) {
  const request = exactObject(
    input,
    REQUEST_KEYS,
    "INVALID_SHARED_MARKET_POST_DISCOVERY_V2_REQUEST_SHAPE",
  );
  if (
    typeof request.coupled_launch_id !== "string" ||
    !SHA256.test(request.coupled_launch_id)
  ) {
    fail("INVALID_COUPLED_LAUNCH_ID");
  }

  assertCanonicalWcPolicy();

  const wcOpening = deriveWcVoidCoupledOpeningStateV1({
    coupled_launch_id: request.coupled_launch_id,
    commitments: request.commitments,
    ledger_debits: request.ledger_debits,
  });

  if (
    wcOpening.protocol_void_inventory_atoms !==
      TEN_MILLION_VOID_ATOMS.toString() ||
    wcOpening.opening_allocated_void_atoms !==
      FIVE_MILLION_VOID_ATOMS.toString() ||
    wcOpening.post_opening_void_reserve_atoms !==
      FIVE_MILLION_VOID_ATOMS.toString() ||
    wcOpening.exact_opening_tranche_conservation !== true
  ) {
    fail("WC_VOID_OPENING_STATE_RECONCILIATION_MISMATCH");
  }

  const marketModels = Object.freeze({
    WC_VOID: Object.freeze({
      phase: "coupled_presale_opening",
      launch_reference_kind: "coupled_launch_id",
      launch_reference_id: request.coupled_launch_id,
      total_planned_void_inventory_atoms: TEN_MILLION_VOID_ATOMS.toString(),
      opening_participant_tranche_void_atoms:
        FIVE_MILLION_VOID_ATOMS.toString(),
      post_opening_retained_void_reserve_atoms:
        FIVE_MILLION_VOID_ATOMS.toString(),
      opening_participant_allocated_void_atoms:
        wcOpening.opening_allocated_void_atoms,
      quote_asset: "WC",
      quote_source_domain: "void-work-credit-ledger",
      quote_asset_form: "ledger-credit",
      quote_unit: "wc",
      quote_decimals: 0,
      protocol_quote_seed_units: "0",
      settled_quote_reserve_units: wcOpening.settled_wc_reserve_units,
      opening_state_id: wcOpening.opening_state_id,
      market_opening_ready: false,
    }),
    BTC_VOID: Object.freeze({
      phase: "post_presale_unopened",
      launch_reference_kind: "presale_closeout_required_before_opening",
      launch_reference_id: null,
      total_planned_void_inventory_atoms: TEN_MILLION_VOID_ATOMS.toString(),
      opening_participant_tranche_void_atoms: "0",
      post_opening_retained_void_reserve_atoms: "0",
      opening_participant_allocated_void_atoms: "0",
      quote_asset: "BTC",
      quote_source_domain: "bitcoin-mainnet",
      quote_asset_form: "native",
      quote_unit: "satoshi",
      quote_decimals: 8,
      protocol_quote_seed_units: "0",
      settled_quote_reserve_units: null,
      opening_state_id: null,
      market_opening_ready: false,
    }),
    ETH_VOID: Object.freeze({
      phase: "post_presale_unopened",
      launch_reference_kind: "presale_closeout_required_before_opening",
      launch_reference_id: null,
      total_planned_void_inventory_atoms: TEN_MILLION_VOID_ATOMS.toString(),
      opening_participant_tranche_void_atoms: "0",
      post_opening_retained_void_reserve_atoms: "0",
      opening_participant_allocated_void_atoms: "0",
      quote_asset: "ETH",
      quote_source_domain: "ethereum-mainnet",
      quote_asset_form: "native",
      quote_unit: "wei",
      quote_decimals: 18,
      protocol_quote_seed_units: "0",
      settled_quote_reserve_units: null,
      opening_state_id: null,
      market_opening_ready: false,
    }),
  });

  const payload = Object.freeze({
    schema: VOID_SHARED_MARKET_POST_DISCOVERY_SCHEMA_V2,
    chain_id: VOID_SHARED_MARKET_EXECUTION_BINDING_V2.chain_id,
    network_identity:
      VOID_SHARED_MARKET_EXECUTION_BINDING_V2.network_identity,
    execution_epoch:
      VOID_SHARED_MARKET_EXECUTION_BINDING_V2.execution_epoch,
    void_token: VOID_SHARED_MARKET_EXECUTION_BINDING_V2.void_token,
    void_token_decimals:
      VOID_SHARED_MARKET_EXECUTION_BINDING_V2.void_token_decimals,
    coupled_launch_id: request.coupled_launch_id,
    wc_opening_state_id: wcOpening.opening_state_id,
    market_models: marketModels,
    total_planned_void_inventory_atoms:
      THIRTY_MILLION_VOID_ATOMS.toString(),
    wc_opening_participant_allocated_void_atoms:
      FIVE_MILLION_VOID_ATOMS.toString(),
    wc_post_opening_retained_void_reserve_atoms:
      FIVE_MILLION_VOID_ATOMS.toString(),
    unopened_post_presale_planned_void_inventory_atoms:
      TWENTY_MILLION_VOID_ATOMS.toString(),
    modeled_protocol_side_void_after_wc_opening_before_post_presale_markets_atoms:
      TWENTY_FIVE_MILLION_VOID_ATOMS.toString(),
  });

  return Object.freeze({
    marker: VOID_SHARED_MARKET_POST_DISCOVERY_STATE_V2,
    ...payload,
    reconciliation_id: digest(payload),
    shared_post_discovery_model_reconciled: true,
    legacy_v1_status: "historical_not_production_authority",
    legacy_v1_six_decimal_void_atoms_authoritative: false,
    all_markets_share_one_presale_closeout: false,
    wc_void_uses_coupled_launch_id: true,
    btc_void_remains_post_presale: true,
    eth_void_remains_post_presale: true,
    wc_void_5m_participant_tranche_5m_retained_reserve: true,
    exact_30m_planned_inventory_conservation: true,
    quote_reserve_custody_verified: false,
    void_reserve_custody_verified: false,
    btc_void_opening_ready: false,
    eth_void_opening_ready: false,
    market_activation_authority: false,
    public_presale_activation_authority: false,
    inventory_funding_authority: false,
    funds_movement_authority: false,
    authority: VOID_SHARED_MARKET_POST_DISCOVERY_AUTHORITY_V2,
  });
}
