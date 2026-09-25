#!/usr/bin/env node
import crypto from "node:crypto";
import { quoteBtcVoidV1 } from "./void-btc-void-quote-math-v1.mjs";

export const VOID_BTC_VOID_TRADE_FUNDED_FEES_V1 =
  "VOID_BTC_VOID_TRADE_FUNDED_FEES_V1";
export const BTC_VOID_PROTOCOL_FEE_BPS_V1 = 50;

export const AUTHORITY = Object.freeze({
  source_only_policy: true,
  trade_pays_bitcoin_fees_from_btc_leg: true,
  voidtoken_economic_charge_bound_from_void_leg: true,
  trade_pays_chain2050_native_gas_from_voidtoken_leg: false,
  chain2050_native_gas_separate_from_voidtoken: true,
  chain2050_native_gas_model_ready: false,
  chain2050_native_gas_replenishment_or_user_paid_required: true,
  standing_bitcoin_fee_reserve_required: false,
  per_swap_fee_envelope_required: true,
  success_and_refund_fee_budget_required: true,
  fee_budget_bound_before_executable_quote: true,
  no_unfunded_bitcoin_fee_liability: true,
  no_unfunded_chain2050_native_gas_liability: false,
  wallet_or_signer_access: false,
  bitcoin_rpc_call: false,
  chain2050_rpc_call: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  inventory_reservation: false,
  funds_movement: false,
  market_activation: false,
});

const MAX_ATOMIC_VALUE = (1n << 128n) - 1n;
const UINT = /^(0|[1-9][0-9]*)$/u;
const BPS = 10_000n;

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

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256Id(prefix, value) {
  return (
    prefix +
    crypto.createHash("sha256").update(canonicalJson(value)).digest("hex")
  );
}

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
  if (typeof value !== "string" || !UINT.test(value)) {
    throw new Error(label + " must be a canonical decimal string");
  }
  const parsed = BigInt(value);
  if (
    (!allowZero && parsed === 0n) ||
    parsed > MAX_ATOMIC_VALUE
  ) {
    throw new Error(label + " is outside the v1 atomic-value range");
  }
  return parsed;
}

function boundedBps(value, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 5_000) {
    throw new Error(label + " is outside the v1 basis-point range");
  }
  return BigInt(value);
}

function max(a, b) {
  return a > b ? a : b;
}

function normalize(raw) {
  const request = exactKeys(
    structuredClone(raw),
    [
      "schema",
      "direction",
      "gross_amount_in",
      "reserves",
      "market_policy",
      "fee_budget",
      "execution_policy",
    ],
    "trade-funded fee request",
  );

  if (request.schema !== "void.btc_void.trade_funded_fee_request.v1") {
    throw new Error("trade-funded fee request schema mismatch");
  }
  if (!["btc_to_void", "void_to_btc"].includes(request.direction)) {
    throw new Error("trade-funded fee direction unsupported");
  }

  const reserves = exactKeys(
    request.reserves,
    ["btc_sats", "void_atomic"],
    "reserves",
  );
  const marketPolicy = exactKeys(
    request.market_policy,
    [
      "fee_bps",
      "max_input_reserve_fraction_bps",
      "minimum_btc_reserve_sats",
      "minimum_void_reserve_atomic",
    ],
    "market_policy",
  );
  if (marketPolicy.fee_bps !== BTC_VOID_PROTOCOL_FEE_BPS_V1) {
    throw new Error("official BTC/VOID protocol fee must equal 50 bps");
  }

  const feeBudget = exactKeys(
    request.fee_budget,
    ["bitcoin", "chain2050"],
    "fee_budget",
  );
  const bitcoin = exactKeys(
    feeBudget.bitcoin,
    [
      "funding_sats",
      "claim_sats",
      "refund_sats",
      "minimum_terminal_output_sats",
    ],
    "fee_budget.bitcoin",
  );
  const chain2050 = exactKeys(
    feeBudget.chain2050,
    [
      "lock_void_atomic",
      "claim_void_atomic",
      "refund_void_atomic",
    ],
    "fee_budget.chain2050",
  );
  const executionPolicy = exactKeys(
    request.execution_policy,
    [
      "minimum_net_btc_output_sats",
      "minimum_net_void_output_atomic",
      "max_btc_fee_fraction_bps",
      "max_void_fee_fraction_bps",
    ],
    "execution_policy",
  );

  const grossAmountIn = atomic(
    request.gross_amount_in,
    "gross_amount_in",
  );

  const normalized = {
    schema: request.schema,
    direction: request.direction,
    gross_amount_in: grossAmountIn.toString(),
    reserves: {
      btc_sats: atomic(reserves.btc_sats, "reserves.btc_sats").toString(),
      void_atomic: atomic(
        reserves.void_atomic,
        "reserves.void_atomic",
      ).toString(),
    },
    market_policy: {
      fee_bps: marketPolicy.fee_bps,
      max_input_reserve_fraction_bps:
        marketPolicy.max_input_reserve_fraction_bps,
      minimum_btc_reserve_sats: atomic(
        marketPolicy.minimum_btc_reserve_sats,
        "market_policy.minimum_btc_reserve_sats",
        { allowZero: true },
      ).toString(),
      minimum_void_reserve_atomic: atomic(
        marketPolicy.minimum_void_reserve_atomic,
        "market_policy.minimum_void_reserve_atomic",
        { allowZero: true },
      ).toString(),
    },
    fee_budget: {
      bitcoin: {
        funding_sats: atomic(
          bitcoin.funding_sats,
          "fee_budget.bitcoin.funding_sats",
          { allowZero: true },
        ).toString(),
        claim_sats: atomic(
          bitcoin.claim_sats,
          "fee_budget.bitcoin.claim_sats",
          { allowZero: true },
        ).toString(),
        refund_sats: atomic(
          bitcoin.refund_sats,
          "fee_budget.bitcoin.refund_sats",
          { allowZero: true },
        ).toString(),
        minimum_terminal_output_sats: atomic(
          bitcoin.minimum_terminal_output_sats,
          "fee_budget.bitcoin.minimum_terminal_output_sats",
          { allowZero: true },
        ).toString(),
      },
      chain2050: {
        lock_void_atomic: atomic(
          chain2050.lock_void_atomic,
          "fee_budget.chain2050.lock_void_atomic",
          { allowZero: true },
        ).toString(),
        claim_void_atomic: atomic(
          chain2050.claim_void_atomic,
          "fee_budget.chain2050.claim_void_atomic",
          { allowZero: true },
        ).toString(),
        refund_void_atomic: atomic(
          chain2050.refund_void_atomic,
          "fee_budget.chain2050.refund_void_atomic",
          { allowZero: true },
        ).toString(),
      },
    },
    execution_policy: {
      minimum_net_btc_output_sats: atomic(
        executionPolicy.minimum_net_btc_output_sats,
        "execution_policy.minimum_net_btc_output_sats",
        { allowZero: true },
      ).toString(),
      minimum_net_void_output_atomic: atomic(
        executionPolicy.minimum_net_void_output_atomic,
        "execution_policy.minimum_net_void_output_atomic",
        { allowZero: true },
      ).toString(),
      max_btc_fee_fraction_bps: Number(
        boundedBps(
          executionPolicy.max_btc_fee_fraction_bps,
          "execution_policy.max_btc_fee_fraction_bps",
        ),
      ),
      max_void_fee_fraction_bps: Number(
        boundedBps(
          executionPolicy.max_void_fee_fraction_bps,
          "execution_policy.max_void_fee_fraction_bps",
        ),
      ),
    },
  };

  return {
    request: normalized,
    grossAmountIn,
  };
}

function feeSummary(request) {
  const bitcoin = request.fee_budget.bitcoin;
  const chain2050 = request.fee_budget.chain2050;

  const btcFunding = BigInt(bitcoin.funding_sats);
  const btcClaim = BigInt(bitcoin.claim_sats);
  const btcRefund = BigInt(bitcoin.refund_sats);
  const btcTerminal = max(btcClaim, btcRefund);
  const btcWorstCase = btcFunding + btcTerminal;

  const voidLock = BigInt(chain2050.lock_void_atomic);
  const voidClaim = BigInt(chain2050.claim_void_atomic);
  const voidRefund = BigInt(chain2050.refund_void_atomic);
  const voidTerminal = max(voidClaim, voidRefund);
  const voidWorstCase = voidLock + voidTerminal;

  return {
    btcFunding,
    btcClaim,
    btcRefund,
    btcTerminal,
    btcWorstCase,
    voidLock,
    voidClaim,
    voidRefund,
    voidTerminal,
    voidWorstCase,
  };
}

function enforceFeeFraction(fee, gross, maxBps, label) {
  if (fee === 0n) return;
  if (fee * BPS > gross * BigInt(maxBps)) {
    throw new Error(label + " exceeds configured fee-fraction cap");
  }
}

function protocolFeeSummary(request, curveInput) {
  const feeBps = BigInt(request.market_policy.fee_bps);
  const exactNumerator = curveInput * feeBps;
  const wholeAtomicFloor = exactNumerator / BPS;
  const fractionalRemainder = exactNumerator % BPS;

  if (wholeAtomicFloor === 0n) {
    throw new Error(
      "protocol fee would retain less than one whole input atomic unit",
    );
  }

  return {
    bps: Number(feeBps),
    exactNumerator,
    denominator: BPS,
    wholeAtomicFloor,
    fractionalRemainder,
  };
}

function quoteWithNetInput(request, amountIn) {
  return quoteBtcVoidV1({
    schema: "void.btc_void.indicative_quote_request.v1",
    direction: request.direction,
    amount_in: amountIn.toString(),
    reserves: request.reserves,
    policy: request.market_policy,
  });
}

export function deriveBtcVoidTradeFundedFeesV1(raw) {
  const normalized = normalize(raw);
  const request = normalized.request;
  const fees = feeSummary(request);
  const btcToVoid = request.direction === "btc_to_void";

  let curveInput;
  if (btcToVoid) {
    if (normalized.grossAmountIn <= fees.btcWorstCase) {
      throw new Error("BTC input cannot cover its complete network-fee envelope");
    }
    enforceFeeFraction(
      fees.btcWorstCase,
      normalized.grossAmountIn,
      request.execution_policy.max_btc_fee_fraction_bps,
      "BTC fee envelope",
    );
    curveInput = normalized.grossAmountIn - fees.btcWorstCase;
    if (
      curveInput <
      BigInt(request.fee_budget.bitcoin.minimum_terminal_output_sats)
    ) {
      throw new Error(
        "BTC source terminal amount would fall below the configured dust/minimum floor",
      );
    }
  } else {
    if (normalized.grossAmountIn <= fees.voidWorstCase) {
      throw new Error(
        "VoidToken input cannot cover its bounded economic-charge envelope",
      );
    }
    enforceFeeFraction(
      fees.voidWorstCase,
      normalized.grossAmountIn,
      request.execution_policy.max_void_fee_fraction_bps,
      "VoidToken economic charge envelope",
    );
    curveInput = normalized.grossAmountIn - fees.voidWorstCase;
  }

  const protocolFee = protocolFeeSummary(request, curveInput);
  const curveQuote = quoteWithNetInput(request, curveInput);
  const curveOutput = BigInt(curveQuote.result.amount_out);

  let netOutput;
  if (btcToVoid) {
    if (curveOutput <= fees.voidWorstCase) {
      throw new Error(
        "quoted VoidToken output cannot cover its bounded economic-charge envelope",
      );
    }
    enforceFeeFraction(
      fees.voidWorstCase,
      curveOutput,
      request.execution_policy.max_void_fee_fraction_bps,
      "VoidToken economic charge envelope",
    );
    netOutput = curveOutput - fees.voidWorstCase;

    if (
      netOutput <
      BigInt(request.execution_policy.minimum_net_void_output_atomic)
    ) {
      throw new Error("net VOID output is below the configured minimum");
    }
  } else {
    if (curveOutput <= fees.btcWorstCase) {
      throw new Error(
        "quoted BTC output cannot cover its complete network-fee envelope",
      );
    }
    enforceFeeFraction(
      fees.btcWorstCase,
      curveOutput,
      request.execution_policy.max_btc_fee_fraction_bps,
      "BTC fee envelope",
    );
    netOutput = curveOutput - fees.btcWorstCase;

    if (
      netOutput <
      BigInt(request.execution_policy.minimum_net_btc_output_sats)
    ) {
      throw new Error("net BTC output is below the configured minimum");
    }

    const minimumTerminalOutput = BigInt(
      request.fee_budget.bitcoin.minimum_terminal_output_sats,
    );
    if (
      curveOutput - fees.btcFunding - fees.btcTerminal <
      minimumTerminalOutput
    ) {
      throw new Error(
        "BTC terminal output would fall below the configured dust/minimum floor",
      );
    }
  }

  const feeEnvelope = {
    bitcoin: {
      funding_sats: fees.btcFunding.toString(),
      claim_sats: fees.btcClaim.toString(),
      refund_sats: fees.btcRefund.toString(),
      terminal_route_budget_sats: fees.btcTerminal.toString(),
      complete_worst_case_budget_sats: fees.btcWorstCase.toString(),
      funding_fee_paid_from_btc_leg: true,
      claim_or_refund_fee_paid_from_btc_leg: true,
      standing_market_fee_reserve_required: false,
    },
    chain2050: {
      lock_void_atomic: fees.voidLock.toString(),
      claim_void_atomic: fees.voidClaim.toString(),
      refund_void_atomic: fees.voidRefund.toString(),
      terminal_route_budget_void_atomic: fees.voidTerminal.toString(),
      complete_worst_case_budget_void_atomic:
        fees.voidWorstCase.toString(),
      amounts_are_voidtoken_economic_charge_not_native_gas: true,
      lock_native_gas_paid_from_voidtoken_leg: false,
      claim_or_refund_native_gas_paid_from_voidtoken_leg: false,
      native_gas_budget_wei_bound: false,
      native_gas_replenishment_proven: false,
    },
  };

  const result = {
    schema: "void.btc_void.trade_funded_fee_quote.v1",
    marker: VOID_BTC_VOID_TRADE_FUNDED_FEES_V1,
    request,
    pricing: {
      gross_input_amount: normalized.grossAmountIn.toString(),
      curve_priced_input_amount: curveInput.toString(),
      curve_gross_output_amount: curveOutput.toString(),
      net_user_output_amount: netOutput.toString(),
      curve_indicative_quote_id: curveQuote.indicative_quote_id,
      curve_input_asset: curveQuote.result.input_asset,
      curve_output_asset: curveQuote.result.output_asset,
    },
    protocol_fee: {
      policy: "VOID_BTC_VOID_PROTOCOL_FEE_V1",
      bps: protocolFee.bps,
      rate_percent: "0.50",
      charged_after_bitcoin_fee_and_voidtoken_economic_charge: true,
      input_asset: btcToVoid ? "native_btc" : "canonical_chain2050_voidtoken",
      curve_input_amount: curveInput.toString(),
      nominal_fee_input_atomic_floor:
        protocolFee.wholeAtomicFloor.toString(),
      nominal_fee_fraction_numerator:
        protocolFee.exactNumerator.toString(),
      nominal_fee_fraction_denominator:
        protocolFee.denominator.toString(),
      nominal_fee_fraction_remainder:
        protocolFee.fractionalRemainder.toString(),
      retained_in_input_side_market_reserve: true,
      automatic_treasury_sweep: false,
      available_for_network_fee_sponsorship: false,
      separate_onchain_payment_transaction_required: false,
    },
    fee_envelope: {
      bitcoin: {
        ...feeEnvelope.bitcoin,
        funding_budget_must_cover_complete_transaction_shape: true,
        claim_budget_must_cover_complete_transaction_shape: true,
        refund_budget_must_cover_complete_transaction_shape: true,
        unbudgeted_rbf_or_cpfp_fee_bump_forbidden: true,
      },
      chain2050: {
        ...feeEnvelope.chain2050,
        lock_voidtoken_charge_policy_bound: true,
        claim_voidtoken_charge_policy_bound: true,
        refund_voidtoken_charge_policy_bound: true,
        per_swap_contract_deployment_forbidden: true,
        separate_post_terminal_reimbursement_transaction_forbidden: true,
      },
    },
    launch_fee_topology_gate: {
      protocol_fee_is_curve_accounting_not_a_transaction: true,
      predeployed_chain2050_settlement_contract_required: true,
      per_swap_chain2050_contract_deployment_forbidden: true,
      terminal_executor_native_gas_allowance_required_before_attempt: true,
      terminal_executor_native_gas_allowance_proven: false,
      failed_terminal_attempt_must_not_draw_unreserved_shared_gas: true,
      failed_terminal_attempt_native_gas_isolation_proven: false,
      maximum_terminal_broadcast_attempts: 1,
      automatic_terminal_retry_forbidden: true,
      unbudgeted_bitcoin_rbf_or_cpfp_transaction_forbidden: true,
      live_contract_gas_census_required_before_activation: true,
      bitcoin_fee_budget_must_bind_exact_vbytes_and_max_sat_per_vbyte: true,
      chain2050_native_gas_budget_must_bind_measured_gas_and_max_fee_per_gas: true,
      chain2050_native_gas_budget_bound_in_wei: false,
      voidtoken_protocol_fee_does_not_replenish_native_gas: true,
      native_gas_replenishment_or_user_paid_model_required: true,
      native_gas_micro_trade_grief_protection_required: true,
      native_gas_micro_trade_grief_protection_proven: false,
      explicit_minimum_if_used_must_be_public_and_policy_bound: true,
      batching_or_user_paid_gas_may_satisfy_grief_gate: true,
      caller_authored_unverified_fee_budget_forbidden: true,
      fee_observation_must_be_fresh_and_quote_bound: true,
      stale_fee_quote_must_fail_before_funding: true,
      runtime_fee_topology_proven: false,
      market_activation_ready: false,
    },
    executable_invariants: {
      trade_pays_all_bitcoin_network_fees: true,
      trade_pays_all_chain2050_native_gas: false,
      voidtoken_economic_charge_bound: true,
      success_path_native_gas_fully_budgeted: false,
      refund_path_native_gas_fully_budgeted: false,
      no_standing_bitcoin_fee_reserve_dependency: true,
      chain2050_native_gas_liability_unresolved: true,
      no_trade_creates_unfunded_bitcoin_fee_liability: true,
      no_trade_creates_unfunded_chain2050_native_gas_liability: false,
      fixed_protocol_fee_required: true,
      protocol_fee_retained_in_market_reserve: true,
      protocol_fee_cannot_sponsor_other_trades: true,
      protocol_fee_cannot_auto_sweep_to_treasury: true,
      bitcoin_fee_budget_bound_before_inventory_reservation: true,
      chain2050_native_gas_budget_bound_before_inventory_reservation: false,
      quote_not_executable_until_native_gas_model_ready: true,
      quote_not_executable_until_micro_trade_grief_protection_ready: true,
      executable_quote_must_fail_if_fee_budget_does_not_fit: true,
    },
    authority: AUTHORITY,
  };

  return Object.freeze({
    ...result,
    trade_funded_fee_quote_id:
      sha256Id("voidbtcvfq1_", result),
  });
}
