#!/usr/bin/env node

import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

export const VOID_BTC_VOID_MARKET_MAKER_RESERVE_POLICY_V1 =
  "VOID_BTC_VOID_MARKET_MAKER_RESERVE_POLICY_V1";

export const VOID_PREMINE_PURPOSE_VAULT_TARGET_V1 = Object.freeze({
  schema: "void.premine.purpose_vault_target.v1",
  marker: "VOID_PREMINE_PURPOSE_VAULT_TARGET_V1",
  amounts_void: Object.freeze({
    core_void_treasury: "308207333",
    presale_inventory_vault: "10000000",
    btc_void_market_vault: "10000000",
    ops_treasury: "5000000",
    previously_distributed_or_unreconciled: "126000",
    total_premine: "333333333",
  }),
  transition_basis_void: Object.freeze({
    last_verified_void_treasury: "332207333",
    last_verified_ops_treasury: "1000000",
    planned_ops_treasury_top_up: "4000000",
  }),
  funding_readiness: Object.freeze({
    current_balance_reconciliation_required: true,
    unexplained_balance_must_be_resolved: true,
    final_vault_identity_and_controls_required: true,
    canary_transfer_receipt_required: true,
    full_target_delta_funded_after_gates: true,
    funding_does_not_activate_use: true,
  }),
  authority: Object.freeze({
    source_only_target: true,
    wallet_or_signer_accessed: false,
    treasury_transfer_authorized: false,
    transaction_constructed: false,
    transaction_broadcast: false,
    funds_moved: false,
  }),
});

const BPS_DENOMINATOR = 10_000n;
const MAX_SPREAD_BPS = 5_000;
const MAX_CONFIRMATIONS = 1_000_000;
const MAX_ATOMIC_VALUE = (1n << 128n) - 1n;
const MAX_STDIN_BYTES = 65_536;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/;

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + " must be an object");
  }
  return value;
}

function exactKeys(value, keys, label) {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(label + " keys mismatch");
  }
  return object;
}

function atomic(value, label, { allowZero = false } = {}) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(label + " must be a canonical decimal string");
  }
  const parsed = BigInt(value);
  if ((!allowZero && parsed === 0n) || parsed > MAX_ATOMIC_VALUE) {
    throw new Error(label + " is outside the v1 atomic-value range");
  }
  return parsed;
}

function integer(value, label, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(label + " is outside the v1 integer range");
  }
  return value;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function validatePurposeVaultTargetV1() {
  const target = structuredClone(VOID_PREMINE_PURPOSE_VAULT_TARGET_V1);
  const amounts = target.amounts_void;
  const allocated =
    BigInt(amounts.core_void_treasury) +
    BigInt(amounts.presale_inventory_vault) +
    BigInt(amounts.btc_void_market_vault) +
    BigInt(amounts.ops_treasury) +
    BigInt(amounts.previously_distributed_or_unreconciled);
  if (allocated !== BigInt(amounts.total_premine)) {
    throw new Error("purpose-vault target does not conserve the premine");
  }
  const transition = target.transition_basis_void;
  if (
    BigInt(transition.last_verified_ops_treasury) +
      BigInt(transition.planned_ops_treasury_top_up) !==
    BigInt(amounts.ops_treasury)
  ) {
    throw new Error("OpsTreasury transition does not reach its target");
  }
  if (
    BigInt(transition.last_verified_void_treasury) -
      BigInt(amounts.presale_inventory_vault) -
      BigInt(amounts.btc_void_market_vault) -
      BigInt(transition.planned_ops_treasury_top_up) !==
    BigInt(amounts.core_void_treasury)
  ) {
    throw new Error("VoidTreasury transition does not reach its target");
  }
  return Object.freeze({ ...target, allocation_conserved: true });
}

function normalizeRequest(raw) {
  const request = exactKeys(
    structuredClone(raw),
    ["schema", "settlement", "policy"],
    "reserve-recycling request",
  );
  if (request.schema !== "void.btc_void.reserve_recycling_request.v1") {
    throw new Error("reserve-recycling request schema mismatch");
  }

  const settlement = exactKeys(
    request.settlement,
    [
      "source_sale_id",
      "direction",
      "status",
      "btc_received_sats",
      "void_sold_atomic",
      "observed_bitcoin_confirmations",
      "required_bitcoin_confirmations",
    ],
    "settlement",
  );
  const policy = exactKeys(
    request.policy,
    ["minimum_spread_bps", "bitcoin_network_fee_reserve_sats"],
    "policy",
  );

  if (typeof settlement.source_sale_id !== "string" || !SHA256_ID.test(settlement.source_sale_id)) {
    throw new Error("settlement.source_sale_id must be a canonical sha256 identity");
  }
  if (settlement.direction !== "btc_to_void") {
    throw new Error("only settled BTC-to-VOID sales create v1 buyback lots");
  }
  if (settlement.status !== "settled") {
    throw new Error("BTC proceeds are not bid-eligible before terminal settlement");
  }

  const btcReceived = atomic(
    settlement.btc_received_sats,
    "settlement.btc_received_sats",
  );
  const voidSold = atomic(
    settlement.void_sold_atomic,
    "settlement.void_sold_atomic",
  );
  const observedConfirmations = integer(
    settlement.observed_bitcoin_confirmations,
    "settlement.observed_bitcoin_confirmations",
    0,
    MAX_CONFIRMATIONS,
  );
  const requiredConfirmations = integer(
    settlement.required_bitcoin_confirmations,
    "settlement.required_bitcoin_confirmations",
    1,
    MAX_CONFIRMATIONS,
  );
  if (observedConfirmations < requiredConfirmations) {
    throw new Error("BTC proceeds have insufficient Bitcoin confirmations");
  }

  const minimumSpreadBps = integer(
    policy.minimum_spread_bps,
    "policy.minimum_spread_bps",
    1,
    MAX_SPREAD_BPS,
  );
  const networkFeeReserve = atomic(
    policy.bitcoin_network_fee_reserve_sats,
    "policy.bitcoin_network_fee_reserve_sats",
    { allowZero: true },
  );
  if (networkFeeReserve >= btcReceived) {
    throw new Error("Bitcoin network-fee reserve exhausts sale proceeds");
  }

  return {
    request: {
      schema: request.schema,
      settlement: {
        source_sale_id: settlement.source_sale_id,
        direction: settlement.direction,
        status: settlement.status,
        btc_received_sats: btcReceived.toString(),
        void_sold_atomic: voidSold.toString(),
        observed_bitcoin_confirmations: observedConfirmations,
        required_bitcoin_confirmations: requiredConfirmations,
      },
      policy: {
        minimum_spread_bps: minimumSpreadBps,
        bitcoin_network_fee_reserve_sats: networkFeeReserve.toString(),
      },
    },
    btcReceived,
    voidSold,
    minimumSpreadBps,
    networkFeeReserve,
  };
}

export function deriveBtcVoidBuybackLotV1(raw) {
  const normalized = normalizeRequest(raw);
  const netProceeds = normalized.btcReceived - normalized.networkFeeReserve;
  const bidFactor = BPS_DENOMINATOR - BigInt(normalized.minimumSpreadBps);
  const bidBudget = (netProceeds * bidFactor) / BPS_DENOMINATOR;
  if (bidBudget === 0n || bidBudget >= netProceeds) {
    throw new Error("spread policy did not create a lower nonzero buyback budget");
  }
  const spreadEquity = netProceeds - bidBudget;
  if (
    bidBudget + spreadEquity + normalized.networkFeeReserve !==
    normalized.btcReceived
  ) {
    throw new Error("BTC reserve classification does not conserve sale proceeds");
  }

  const plan = {
    schema: "void.btc_void.buyback_lot_plan.v1",
    marker: VOID_BTC_VOID_MARKET_MAKER_RESERVE_POLICY_V1,
    market: {
      pair: "BTC_VOID",
      bitcoin_asset: "native_btc",
      void_asset: "native_void_chain_2050",
      settlement: "native_cross_chain_atomic",
      pricing_basis: "native_btc_sats_per_native_void_atomic_only",
      fiat_or_usd_value_used: false,
      external_price_oracle_used: false,
    },
    source: normalized.request,
    reserve_recycling: {
      confirmed_btc_added_to_market_reserve_sats:
        normalized.btcReceived.toString(),
      automatic_bid_budget_sats: bidBudget.toString(),
      bitcoin_network_fee_reserve_sats:
        normalized.networkFeeReserve.toString(),
      retained_spread_equity_sats: spreadEquity.toString(),
      automatic_ops_treasury_sweep_sats: "0",
      proceeds_conserved: true,
    },
    buyback_lot: {
      source_sale_id: normalized.request.settlement.source_sale_id,
      target_void_atomic: normalized.voidSold.toString(),
      maximum_btc_out_sats: bidBudget.toString(),
      maximum_bid_price: {
        btc_sats_numerator: bidBudget.toString(),
        void_atomic_denominator: normalized.voidSold.toString(),
      },
      source_sale_effective_price: {
        btc_sats_numerator: normalized.btcReceived.toString(),
        void_atomic_denominator: normalized.voidSold.toString(),
      },
      full_source_lot_round_trip_btc_out_lt_btc_received: true,
      fill_rule:
        "actual_btc_out_must_not_exceed_curve_quote_or_remaining_lot_budget",
      reacquired_void_destination: "btc_void_market_vault",
    },
    lifecycle: {
      pending_or_unconfirmed_btc_bid_eligible: false,
      settled_confirmed_btc_bid_eligible: true,
      duplicate_source_sale_creates_second_lot: false,
      unused_bid_budget_remains_market_reserve: true,
      completed_buyback_returns_void_to_market_inventory: true,
      opening_bid_requires_existing_confirmed_btc_or_first_confirmed_sale: true,
      opening_btc_seed_authorized_by_this_plan: false,
    },
    authority: {
      source_only_plan: true,
      reserve_state_mutated: false,
      inventory_reserved: false,
      wallet_or_signer_accessed: false,
      transaction_constructed: false,
      transaction_broadcast: false,
      ops_treasury_sweep_authorized: false,
      leverage_or_credit_authorized: false,
      funds_moved: false,
    },
  };

  return Object.freeze({
    ...plan,
    buyback_lot_id:
      "sha256:" +
      crypto.createHash("sha256").update(canonicalJson(plan)).digest("hex"),
  });
}

async function readBoundedStdin() {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > MAX_STDIN_BYTES) throw new Error("stdin exceeds 65536 bytes");
    chunks.push(chunk);
  }
  if (bytes === 0) throw new Error("stdin JSON is required");
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--pretty") || args.length > 1) {
    throw new Error(
      "usage: void-btc-void-market-maker-reserve-policy-v1.mjs [--pretty] < request.json",
    );
  }
  const result = deriveBtcVoidBuybackLotV1(
    JSON.parse(await readBoundedStdin()),
  );
  process.stdout.write(
    JSON.stringify(result, null, args[0] === "--pretty" ? 2 : 0) + "\n",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(
      "VOID_BTC_VOID_MARKET_MAKER_RESERVE_POLICY_V1_HOLD: " +
        error.message +
        "\n",
    );
    process.exitCode = 1;
  });
}
