#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  AUTHORITY,
  BTC_VOID_PROTOCOL_FEE_BPS_V1,
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
      fee_bps: 50,
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
assert.equal(BTC_VOID_PROTOCOL_FEE_BPS_V1, 50);

for (const [key, value] of Object.entries(AUTHORITY)) {
  if (
    [
      "source_only_policy",
      "trade_pays_bitcoin_fees_from_btc_leg",
      "voidtoken_economic_charge_bound_from_void_leg",
      "chain2050_native_gas_separate_from_voidtoken",
      "chain2050_native_gas_replenishment_or_user_paid_required",
      "per_swap_fee_envelope_required",
      "success_and_refund_fee_budget_required",
      "fee_budget_bound_before_executable_quote",
      "no_unfunded_bitcoin_fee_liability",
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
assert.equal(btcToVoid.pricing.curve_gross_output_amount, "491135363");
assert.equal(btcToVoid.pricing.net_user_output_amount, "489435363");
assert.equal(btcToVoid.protocol_fee.policy, "VOID_BTC_VOID_PROTOCOL_FEE_V1");
assert.equal(btcToVoid.protocol_fee.bps, 50);
assert.equal(btcToVoid.protocol_fee.rate_percent, "0.50");
assert.equal(btcToVoid.protocol_fee.input_asset, "native_btc");
assert.equal(btcToVoid.protocol_fee.curve_input_amount, "997000");
assert.equal(btcToVoid.protocol_fee.nominal_fee_input_atomic_floor, "4985");
assert.equal(
  btcToVoid.protocol_fee.retained_in_input_side_market_reserve,
  true,
);
assert.equal(btcToVoid.protocol_fee.automatic_treasury_sweep, false);
assert.equal(
  btcToVoid.protocol_fee.available_for_network_fee_sponsorship,
  false,
);
assert.equal(
  btcToVoid.protocol_fee.separate_onchain_payment_transaction_required,
  false,
);
assert.equal(
  btcToVoid.fee_envelope.chain2050.per_swap_contract_deployment_forbidden,
  true,
);
assert.equal(
  btcToVoid.fee_envelope.chain2050
    .separate_post_terminal_reimbursement_transaction_forbidden,
  true,
);
assert.equal(
  btcToVoid.fee_envelope.bitcoin.unbudgeted_rbf_or_cpfp_fee_bump_forbidden,
  true,
);
assert.equal(
  btcToVoid.launch_fee_topology_gate
    .terminal_executor_native_gas_allowance_required_before_attempt,
  true,
);
assert.equal(
  btcToVoid.launch_fee_topology_gate
    .terminal_executor_native_gas_allowance_proven,
  false,
);
assert.equal(
  btcToVoid.launch_fee_topology_gate
    .failed_terminal_attempt_must_not_draw_unreserved_shared_gas,
  true,
);
assert.equal(
  btcToVoid.launch_fee_topology_gate
    .failed_terminal_attempt_native_gas_isolation_proven,
  false,
);
assert.equal(
  btcToVoid.launch_fee_topology_gate.maximum_terminal_broadcast_attempts,
  1,
);
assert.equal(
  btcToVoid.launch_fee_topology_gate
    .bitcoin_fee_budget_must_bind_exact_vbytes_and_max_sat_per_vbyte,
  true,
);
assert.equal(
  btcToVoid.launch_fee_topology_gate
    .chain2050_native_gas_budget_must_bind_measured_gas_and_max_fee_per_gas,
  true,
);
assert.equal(
  btcToVoid.launch_fee_topology_gate
    .chain2050_native_gas_budget_bound_in_wei,
  false,
);
assert.equal(
  btcToVoid.launch_fee_topology_gate
    .voidtoken_protocol_fee_does_not_replenish_native_gas,
  true,
);
assert.equal(
  btcToVoid.launch_fee_topology_gate
    .native_gas_replenishment_or_user_paid_model_required,
  true,
);
assert.equal(
  btcToVoid.launch_fee_topology_gate
    .caller_authored_unverified_fee_budget_forbidden,
  true,
);
assert.equal(
  btcToVoid.launch_fee_topology_gate
    .fee_observation_must_be_fresh_and_quote_bound,
  true,
);
assert.equal(
  btcToVoid.launch_fee_topology_gate.stale_fee_quote_must_fail_before_funding,
  true,
);
assert.equal(
  btcToVoid.launch_fee_topology_gate.runtime_fee_topology_proven,
  false,
);
assert.equal(
  btcToVoid.launch_fee_topology_gate.market_activation_ready,
  false,
);
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
  btcToVoid.executable_invariants.trade_pays_all_chain2050_native_gas,
  false,
);
assert.equal(
  btcToVoid.executable_invariants.voidtoken_economic_charge_bound,
  true,
);
assert.equal(
  btcToVoid.executable_invariants.chain2050_native_gas_liability_unresolved,
  true,
);
assert.equal(
  btcToVoid.executable_invariants
    .no_trade_creates_unfunded_bitcoin_fee_liability,
  true,
);
assert.equal(
  btcToVoid.executable_invariants
    .no_trade_creates_unfunded_chain2050_native_gas_liability,
  false,
);
assert.equal(
  btcToVoid.executable_invariants.quote_not_executable_until_native_gas_model_ready,
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
assert.equal(voidToBtc.pricing.curve_gross_output_amount, "491687");
assert.equal(voidToBtc.pricing.net_user_output_amount, "488687");
assert.equal(voidToBtc.protocol_fee.bps, 50);
assert.equal(
  voidToBtc.protocol_fee.input_asset,
  "canonical_chain2050_voidtoken",
);
assert.equal(
  voidToBtc.protocol_fee.nominal_fee_input_atomic_floor,
  "1241500",
);
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
            funding_sats: "40001",
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
  /VoidToken economic charge envelope exceeds configured fee-fraction cap/,
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
    deriveBtcVoidTradeFundedFeesV1(
      request({
        market_policy: {
          fee_bps: 49,
        },
      }),
    ),
  /official BTC\/VOID protocol fee must equal 50 bps/,
);

assert.throws(
  () =>
    deriveBtcVoidTradeFundedFeesV1(
      request({
        market_policy: {
          fee_bps: 51,
        },
      }),
    ),
  /official BTC\/VOID protocol fee must equal 50 bps/,
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
console.log("btc_to_void_net_void_output_atomic=489435363");
console.log("btc_to_void_protocol_fee_sats_floor=4985");
console.log("void_to_btc_gross_input_void_atomic=250000000");
console.log("void_to_btc_curve_input_void_atomic=248300000");
console.log("void_to_btc_net_btc_output_sats=488687");
console.log("void_to_btc_protocol_fee_void_atomic_floor=1241500");
console.log("bitcoin_fee_budget_trade_funded=true");
console.log("voidtoken_economic_charge_bound=true");
console.log("chain2050_native_gas_trade_funded=false");
console.log("chain2050_native_gas_separate_from_voidtoken=true");
console.log("chain2050_native_gas_liability_unresolved=true");
console.log("native_gas_replenishment_or_user_paid_model_required=true");
console.log("standing_bitcoin_fee_reserve_required=false");
console.log("no_trade_creates_unfunded_bitcoin_fee_liability=true");
console.log("market_quote_not_executable_until_native_gas_model_ready=true");
console.log("protocol_fee_bps=50");
console.log("protocol_fee_retained_in_market_reserve=true");
console.log("protocol_fee_automatic_treasury_sweep=false");
console.log("protocol_fee_available_for_network_fee_sponsorship=false");
console.log("protocol_fee_separate_onchain_payment_transaction_required=false");
console.log("per_swap_chain2050_contract_deployment_forbidden=true");
console.log("terminal_executor_native_gas_allowance_required_before_attempt=true");
console.log("terminal_executor_native_gas_allowance_proven=false");
console.log("failed_terminal_attempt_native_gas_isolation_proven=false");
console.log("maximum_terminal_broadcast_attempts=1");
console.log("live_contract_gas_census_required_before_activation=true");
console.log("bitcoin_fee_budget_binds_vbytes_and_max_sat_per_vbyte=true");
console.log("chain2050_native_gas_budget_binds_gas_and_max_fee_per_gas=true");
console.log("chain2050_native_gas_budget_bound_in_wei=false");
console.log("voidtoken_protocol_fee_replenishes_native_gas=false");
console.log("caller_authored_unverified_fee_budget_forbidden=true");
console.log("fee_observation_fresh_and_quote_bound=true");
console.log("stale_fee_quote_fails_before_funding=true");
console.log("runtime_fee_topology_proven=false");
console.log("market_activation_ready=false");
console.log("execution_authorized=false");
console.log("transaction_broadcast=false");
console.log("funds_moved=false");
