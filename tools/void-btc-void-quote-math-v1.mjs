#!/usr/bin/env node

import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

import { readBtcVoidBoundedStdinV1 } from "./void-btc-void-bounded-stdin-v1.mjs";

import {
  BITCOIN_MAX_MONEY_SATOSHIS_V1,
  VOID_MAX_SUPPLY_ATOMS_V1,
} from "./void-btc-void-atomic-settlement-state-invariants-v1.mjs";

export const VOID_BTC_VOID_QUOTE_MATH_V1 = "void_btc_void_quote_math_v1";

export {
  BITCOIN_MAX_MONEY_SATOSHIS_V1,
  VOID_MAX_SUPPLY_ATOMS_V1,
};

const BPS_DENOMINATOR = 10_000n;
const MAX_FEE_BPS = 1_000;
const MAX_INPUT_RESERVE_FRACTION_BPS = 2_500;
const MAX_ATOMIC_VALUE = (1n << 128n) - 1n;
const MAX_STDIN_BYTES = 65_536;

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

function nativeMaximum(value, maximum, label, maximumLabel) {
  if (value > BigInt(maximum)) {
    throw new Error(label + " exceeds " + maximumLabel);
  }
  return value;
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
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function normalizeRequest(raw) {
  const request = exactKeys(
    structuredClone(raw),
    ["schema", "direction", "amount_in", "reserves", "policy"],
    "quote request",
  );
  if (request.schema !== "void.btc_void.indicative_quote_request.v1") {
    throw new Error("quote request schema mismatch");
  }
  if (!["btc_to_void", "void_to_btc"].includes(request.direction)) {
    throw new Error("quote direction is unsupported");
  }

  const reserves = exactKeys(
    request.reserves,
    ["btc_sats", "void_atomic"],
    "quote reserves",
  );
  const policy = exactKeys(
    request.policy,
    [
      "fee_bps",
      "max_input_reserve_fraction_bps",
      "minimum_btc_reserve_sats",
      "minimum_void_reserve_atomic",
    ],
    "quote policy",
  );

  const amountIn = nativeMaximum(
    atomic(request.amount_in, "amount_in"),
    request.direction === "btc_to_void"
      ? BITCOIN_MAX_MONEY_SATOSHIS_V1
      : VOID_MAX_SUPPLY_ATOMS_V1,
    "amount_in",
    request.direction === "btc_to_void"
      ? "Bitcoin MAX_MONEY"
      : "VOID maximum supply",
  );
  const btcReserve = nativeMaximum(
    atomic(reserves.btc_sats, "reserves.btc_sats"),
    BITCOIN_MAX_MONEY_SATOSHIS_V1,
    "reserves.btc_sats",
    "Bitcoin MAX_MONEY",
  );
  const voidReserve = nativeMaximum(
    atomic(reserves.void_atomic, "reserves.void_atomic"),
    VOID_MAX_SUPPLY_ATOMS_V1,
    "reserves.void_atomic",
    "VOID maximum supply",
  );
  const minimumBtcReserve = nativeMaximum(
    atomic(
      policy.minimum_btc_reserve_sats,
      "policy.minimum_btc_reserve_sats",
      { allowZero: true },
    ),
    BITCOIN_MAX_MONEY_SATOSHIS_V1,
    "policy.minimum_btc_reserve_sats",
    "Bitcoin MAX_MONEY",
  );
  const minimumVoidReserve = nativeMaximum(
    atomic(
      policy.minimum_void_reserve_atomic,
      "policy.minimum_void_reserve_atomic",
      { allowZero: true },
    ),
    VOID_MAX_SUPPLY_ATOMS_V1,
    "policy.minimum_void_reserve_atomic",
    "VOID maximum supply",
  );
  const feeBps = integer(policy.fee_bps, "policy.fee_bps", 0, MAX_FEE_BPS);
  const maxInputFractionBps = integer(
    policy.max_input_reserve_fraction_bps,
    "policy.max_input_reserve_fraction_bps",
    1,
    MAX_INPUT_RESERVE_FRACTION_BPS,
  );

  return {
    request: {
      schema: request.schema,
      direction: request.direction,
      amount_in: amountIn.toString(),
      reserves: {
        btc_sats: btcReserve.toString(),
        void_atomic: voidReserve.toString(),
      },
      policy: {
        fee_bps: feeBps,
        max_input_reserve_fraction_bps: maxInputFractionBps,
        minimum_btc_reserve_sats: minimumBtcReserve.toString(),
        minimum_void_reserve_atomic: minimumVoidReserve.toString(),
      },
    },
    amountIn,
    btcReserve,
    voidReserve,
    minimumBtcReserve,
    minimumVoidReserve,
    feeBps,
    maxInputFractionBps,
  };
}

export function quoteBtcVoidV1(raw) {
  const normalized = normalizeRequest(raw);
  const btcIn = normalized.request.direction === "btc_to_void";
  const reserveIn = btcIn ? normalized.btcReserve : normalized.voidReserve;
  const reserveOut = btcIn ? normalized.voidReserve : normalized.btcReserve;

  const inputReserveMaximum = btcIn
    ? BITCOIN_MAX_MONEY_SATOSHIS_V1
    : VOID_MAX_SUPPLY_ATOMS_V1;
  const inputReserveMaximumLabel = btcIn
    ? "Bitcoin MAX_MONEY"
    : "VOID maximum supply";
  if (reserveIn + normalized.amountIn > BigInt(inputReserveMaximum)) {
    throw new Error(
      "post-quote input reserve exceeds " + inputReserveMaximumLabel,
    );
  }
  if (
    normalized.amountIn * BPS_DENOMINATOR >
    reserveIn * BigInt(normalized.maxInputFractionBps)
  ) {
    throw new Error("amount_in exceeds the configured reserve-fraction limit");
  }

  const feeFactor = BPS_DENOMINATOR - BigInt(normalized.feeBps);
  const adjustedInputNumerator = normalized.amountIn * feeFactor;
  const outputNumerator = reserveOut * adjustedInputNumerator;
  const outputDenominator =
    reserveIn * BPS_DENOMINATOR + adjustedInputNumerator;
  const amountOut = outputNumerator / outputDenominator;

  if (amountOut === 0n || amountOut >= reserveOut) {
    throw new Error("quote output is zero or exhausts the output reserve");
  }

  const reserveInAfter = reserveIn + normalized.amountIn;
  const reserveOutAfter = reserveOut - amountOut;
  const btcAfter = btcIn ? reserveInAfter : reserveOutAfter;
  const voidAfter = btcIn ? reserveOutAfter : reserveInAfter;
  if (
    btcAfter < normalized.minimumBtcReserve ||
    voidAfter < normalized.minimumVoidReserve
  ) {
    throw new Error("quote would cross a configured reserve floor");
  }

  const kBefore = normalized.btcReserve * normalized.voidReserve;
  const kAfter = btcAfter * voidAfter;
  if (kAfter < kBefore) {
    throw new Error("constant-product invariant decreased");
  }

  const quote = {
    schema: "void.btc_void.indicative_quote.v1",
    marker: "VOID_BTC_VOID_QUOTE_MATH_V1",
    market: {
      pair: "BTC_VOID",
      bitcoin_asset: "native_btc",
      bitcoin_unit: "satoshi",
      void_asset: "native_void_chain_2050",
      void_unit: "void_atomic",
    },
    request: normalized.request,
    result: {
      input_asset: btcIn ? "native_btc" : "native_void_chain_2050",
      output_asset: btcIn ? "native_void_chain_2050" : "native_btc",
      amount_in: normalized.amountIn.toString(),
      amount_out: amountOut.toString(),
      reserves_after: {
        btc_sats: btcAfter.toString(),
        void_atomic: voidAfter.toString(),
      },
      invariant_before: kBefore.toString(),
      invariant_after: kAfter.toString(),
      rounding: "floor_output",
    },
    math: {
      basis_points_denominator: BPS_DENOMINATOR.toString(),
      fee_factor_bps: feeFactor.toString(),
      adjusted_input_numerator: adjustedInputNumerator.toString(),
      output_numerator: outputNumerator.toString(),
      output_denominator: outputDenominator.toString(),
    },
    authority: {
      indicative_only: true,
      runtime_observed: false,
      inventory_reserved: false,
      execution_authorized: false,
      wallet_or_signer_accessed: false,
      transaction_constructed: false,
      transaction_broadcast: false,
      funds_moved: false,
    },
  };

  return Object.freeze({
    ...quote,
    indicative_quote_id:
      "sha256:" +
      crypto.createHash("sha256").update(canonicalJson(quote)).digest("hex"),
  });
}

async function readBoundedStdin() {
  return readBtcVoidBoundedStdinV1({
    stream: process.stdin,
    maxBytes: MAX_STDIN_BYTES,
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--pretty") || args.length > 1) {
    throw new Error(
      "usage: void-btc-void-quote-math-v1.mjs [--pretty] < request.json",
    );
  }
  const result = quoteBtcVoidV1(JSON.parse(await readBoundedStdin()));
  process.stdout.write(
    JSON.stringify(result, null, args[0] === "--pretty" ? 2 : 0) + "\n",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(
      "VOID_BTC_VOID_QUOTE_MATH_V1_HOLD: " + error.message + "\n",
    );
    process.exitCode = 1;
  });
}
