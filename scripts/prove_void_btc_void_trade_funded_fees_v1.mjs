#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  AUTHORITY,
  VOID_BTC_VOID_TRADE_FUNDED_FEES_V1,
  deriveBtcVoidTradeFundedFeesV1,
} from "../tools/void-btc-void-trade-funded-fees-v1.mjs";

function request(overrides = {}) {
  const base = {
    schema: "void.btc_void.trade_funded_fee_request.v1",
    direction: "btc_to_void",
    gross_amount_in: "1000000",
    reserves: {
      btc_sats: "100000000",
      void_atomic: "50000000000",
    },
    market_policy: {
      fee_bps: 30,
      max_input_reserve_fraction_bps: 500,
      minimum_btc_reserve_sats: "50000000",
      minimum_void_reserve_atomic: "25000000000",
    },
    fee_budget: {
      bitcoin: {
        funding_sats: "1000",
        claim_sats: "1500",
        refund_sats: "2000",
        minimum_terminal_output_sats: "1000",
      },
      chain2050: {
        lock_void_atomic: "1000000",
        claim_void_atomic: "500000",
        refund_void_atomic: "700000",
      },
    },
    execution_policy: {
      minimum_net_btc_output_sats: "100000",
      minimum_net_void_output_atomic: "1000000",
      max_btc_fee_fraction_bps: 500,
      max_void_fee_fraction_bps: 500,
    },
  };

  return {
    ...base,
    ...overrides,
    reserves: { ...base.reserves, ...(overrides.reserves || {}) },
    market_policy: {
      ...base.market_policy,
      ...(overrides.market_policy || {}),
    },
    fee_budget: {
      bitcoin: {
        ...base.fee_budget.bitcoin,
        ...(overrides.fee_budget?.bitcoin || {}),
      },
      chain2050: {
        ...base.fee_budget.chain2050,
        ...(overrides.fee_budget?.chain2050 || {}),
      },
    },
    execution_policy: {
      ...base.execution_policy,
      ...(overrides.execution_policy || {}),
    },
  };
}

assert.equal(
  VOID_BTC_VOID_TRADE_FUNDED_FEES_V1,
  "VOID_BTC_VOID_TRADE_FUNDED_FEES_V1",
);

for (const [key, value] of Object.entries(AUTHORITY)) {
  if (
    [
      "source_only_policy",
      "trade_pays_bitcoin_fees_from_btc_leg",
      "trade_pays_chain2050_fees_from_void_leg",
      "per_swap_fee_envelope_required",
      "success_and_refund_fee_budget_required",
      "fee_budget_bound_before_executable_quote",
      "no_unfunded_fee_liability",
    ].includes(key)
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const btcToVoid = deriveBtcVoidTradeFundedFeesV1(request());
assert.equal(
  btcToVoid.schema,
  "void.btc_void.trade_funded_fee_quote.v1",
);
assert.equal(btcToVoid.request.direction, "btc_to_void");
assert.equal(btcToVoid.pricing.gross_input_amount, "1000000");
assert.equal(btcToVoid.pricing.curve_priced_input_amount, "997000");
assert.equal(btcToVoid.pricing.curve_gross_output_amount, "492112853");
assert.equal(btcToVoid.pricing.net_user_output_amount, "490412853");
assert.equal(
  btcToVoid.fee_envelope.bitcoin.terminal_route_budget_sats,
  "2000",
);
assert.equal(
  btcToVoid.fee_envelope.bitcoin.complete_worst_case_budget_sats,
  "3000",
);
assert.equal(
  btcToVoid.fee_envelope.chain2050.terminal_route_budget_void_atomic,
  "700000",
);
assert.equal(
  btcToVoid.fee_envelope.chain2050.complete_worst_case_budget_void_atomic,
  "1700000",
);
assert.equal(
  btcToVoid.executable_invariants
    .no_standing_bitcoin_fee_reserve_dependency,
  true,
);
assert.equal(
  btcToVoid.executable_invariants
    .no_standing_void_gas_reserve_dependency,
  true,
);
assert.equal(
  btcToVoid.executable_invariants.no_trade_creates_unfunded_fee_liability,
  true,
);
assert.match(
  btcToVoid.trade_funded_fee_quote_id,
  /^voidbtcvfq1_[0-9a-f]{64}$/u,
);

const voidToBtc = deriveBtcVoidTradeFundedFeesV1(
  request({
    direction: "void_to_btc",
    gross_amount_in: "250000000",
  }),
);
assert.equal(voidToBtc.pricing.gross_input_amount, "250000000");
assert.equal(voidToBtc.pricing.curve_priced_input_amount, "248300000");
assert.equal(voidToBtc.pricing.curve_gross_output_amount, "492670");
assert.equal(voidToBtc.pricing.net_user_output_amount, "489670");
assert.equal(
  voidToBtc.fee_envelope.bitcoin.complete_worst_case_budget_sats,
  "3000",
);
assert.equal(
  voidToBtc.fee_envelope.chain2050.complete_worst_case_budget_void_atomic,
  "1700000",
);

assert.throws(
  () =>
    deriveBtcVoidTradeFundedFeesV1(
      request({
        gross_amount_in: "3000",
      }),
    ),
  /BTC input cannot cover/,
);

assert.throws(
  () =>
    deriveBtcVoidTradeFundedFeesV1(
      request({
        direction: "void_to_btc",
        gross_amount_in: "1700000",
      }),
    ),
  /VOID input cannot cover/,
);

assert.throws(
  () =>
    deriveBtcVoidTradeFundedFeesV1(
      request({
        fee_budget: {
          bitcoin: {
            funding_sats: "40000",
            claim_sats: "10000",
            refund_sats: "10000",
          },
        },
      }),
    ),
  /BTC fee envelope exceeds configured fee-fraction cap/,
);

assert.throws(
  () =>
    deriveBtcVoidTradeFundedFeesV1(
      request({
        fee_budget: {
          chain2050: {
            lock_void_atomic: "30000000",
            claim_void_atomic: "10000000",
            refund_void_atomic: "10000000",
          },
        },
      }),
    ),
  /VOID fee envelope exceeds configured fee-fraction cap/,
);

assert.throws(
  () =>
    deriveBtcVoidTradeFundedFeesV1(
      request({
        execution_policy: {
          minimum_net_void_output_atomic: "490412854",
        },
      }),
    ),
  /net VOID output is below/,
);

assert.throws(
  () =>
    deriveBtcVoidTradeFundedFeesV1(
      request({
        direction: "void_to_btc",
        gross_amount_in: "250000000",
        execution_policy: {
          minimum_net_btc_output_sats: "489671",
        },
      }),
    ),
  /net BTC output is below/,
);

assert.throws(
  () =>
    deriveBtcVoidTradeFundedFeesV1({
      ...request(),
      extra: true,
    }),
  /keys mismatch/,
);

const source = fs.readFileSync(
  "tools/void-btc-void-trade-funded-fees-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider",
  "Wallet(",
  "eth_sendRawTransaction",
  "bitcoin_network_fee_reserve_sats",
  "automatic_treasury_refill",
  "fixed_wc_void",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_BTC_VOID_TRADE_FUNDED_FEES_V1_PROOF_GREEN");
console.log("btc_to_void_gross_input_sats=1000000");
console.log("btc_to_void_curve_input_sats=997000");
console.log("btc_to_void_net_void_output_atomic=490412853");
console.log("void_to_btc_gross_input_void_atomic=250000000");
console.log("void_to_btc_curve_input_void_atomic=248300000");
console.log("void_to_btc_net_btc_output_sats=489670");
console.log("bitcoin_fee_budget_trade_funded=true");
console.log("chain2050_fee_budget_trade_funded=true");
console.log("success_path_fully_budgeted=true");
console.log("refund_path_fully_budgeted=true");
console.log("standing_bitcoin_fee_reserve_required=false");
console.log("standing_void_gas_reserve_required=false");
console.log("no_trade_creates_unfunded_fee_liability=true");
console.log("execution_authorized=false");
console.log("transaction_broadcast=false");
console.log("funds_moved=false");
