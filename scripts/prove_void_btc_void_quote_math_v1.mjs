#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

import {
  canonicalJson,
  quoteBtcVoidV1,
} from "../tools/void-btc-void-quote-math-v1.mjs";

function request(overrides = {}) {
  const base = {
    schema: "void.btc_void.indicative_quote_request.v1",
    direction: "btc_to_void",
    amount_in: "1000000",
    reserves: {
      btc_sats: "100000000",
      void_atomic: "50000000000",
    },
    policy: {
      fee_bps: 30,
      max_input_reserve_fraction_bps: 500,
      minimum_btc_reserve_sats: "50000000",
      minimum_void_reserve_atomic: "25000000000",
    },
  };
  return {
    ...base,
    ...overrides,
    reserves: { ...base.reserves, ...(overrides.reserves || {}) },
    policy: { ...base.policy, ...(overrides.policy || {}) },
  };
}

const original = request();
const originalBefore = structuredClone(original);
const btcToVoid = quoteBtcVoidV1(original);
assert.deepEqual(original, originalBefore);
assert.equal(btcToVoid.schema, "void.btc_void.indicative_quote.v1");
assert.equal(btcToVoid.marker, "VOID_BTC_VOID_QUOTE_MATH_V1");
assert.equal(btcToVoid.result.input_asset, "native_btc");
assert.equal(btcToVoid.result.output_asset, "native_void_chain_2050");
assert.equal(btcToVoid.result.amount_out, "493579017");
assert.ok(
  BigInt(btcToVoid.result.invariant_after) >=
    BigInt(btcToVoid.result.invariant_before),
);
assert.match(btcToVoid.indicative_quote_id, /^sha256:[0-9a-f]{64}$/);
assert.equal(
  btcToVoid.indicative_quote_id,
  "sha256:8f794e3aa0cce12b210162b497a5d2d1c47f200b23d3fcf923f62db0463fa364",
);
assert.deepEqual(btcToVoid.authority, {
  indicative_only: true,
  runtime_observed: false,
  inventory_reserved: false,
  execution_authorized: false,
  wallet_or_signer_accessed: false,
  transaction_constructed: false,
  transaction_broadcast: false,
  funds_moved: false,
});

const reordered = {
  policy: structuredClone(original.policy),
  reserves: structuredClone(original.reserves),
  amount_in: original.amount_in,
  direction: original.direction,
  schema: original.schema,
};
assert.equal(
  quoteBtcVoidV1(reordered).indicative_quote_id,
  btcToVoid.indicative_quote_id,
);
assert.equal(canonicalJson({ b: 1, a: 2 }), '{"a":2,"b":1}');

const voidToBtc = quoteBtcVoidV1(
  request({
    direction: "void_to_btc",
    amount_in: "250000000",
  }),
);
assert.equal(voidToBtc.result.input_asset, "native_void_chain_2050");
assert.equal(voidToBtc.result.output_asset, "native_btc");
assert.equal(voidToBtc.result.amount_out, "496027");
assert.equal(
  voidToBtc.indicative_quote_id,
  "sha256:f22afa7ebc9bd6d32cce250ead06aade6cbe8b98f660f79c522736e7f67db6f8",
);
assert.notEqual(voidToBtc.indicative_quote_id, btcToVoid.indicative_quote_id);

const zeroFee = quoteBtcVoidV1(request({ policy: { fee_bps: 0 } }));
assert.equal(zeroFee.math.fee_factor_bps, "10000");
assert.ok(
  BigInt(zeroFee.result.invariant_after) >=
    BigInt(zeroFee.result.invariant_before),
);

const changedOneUnit = quoteBtcVoidV1(request({ amount_in: "1000001" }));
assert.notEqual(changedOneUnit.indicative_quote_id, btcToVoid.indicative_quote_id);

assert.throws(() => quoteBtcVoidV1({ ...request(), extra: true }), /keys mismatch/);
assert.throws(
  () => quoteBtcVoidV1(request({ amount_in: 1000000 })),
  /canonical decimal string/,
);
assert.throws(
  () => quoteBtcVoidV1(request({ amount_in: "01000000" })),
  /canonical decimal string/,
);
assert.throws(
  () => quoteBtcVoidV1(request({ amount_in: "0" })),
  /atomic-value range/,
);
assert.throws(
  () => quoteBtcVoidV1(request({ direction: "btc_to_usdc" })),
  /unsupported/,
);
assert.throws(
  () => quoteBtcVoidV1(request({ amount_in: "5000001" })),
  /reserve-fraction limit/,
);
assert.throws(
  () => quoteBtcVoidV1(request({ policy: { fee_bps: 1001 } })),
  /integer range/,
);
assert.throws(
  () => quoteBtcVoidV1(request({ policy: { fee_bps: "30" } })),
  /integer range/,
);
assert.throws(
  () =>
    quoteBtcVoidV1(
      request({ policy: { max_input_reserve_fraction_bps: 2501 } }),
    ),
  /integer range/,
);
assert.throws(
  () =>
    quoteBtcVoidV1(
      request({ policy: { minimum_void_reserve_atomic: "49900000000" } }),
    ),
  /reserve floor/,
);
assert.throws(
  () =>
    quoteBtcVoidV1(
      request({
        amount_in: "1",
        reserves: {
          btc_sats: "340282366920938463463374607431768211455",
          void_atomic: "1",
        },
        policy: {
          fee_bps: 0,
          max_input_reserve_fraction_bps: 2500,
          minimum_btc_reserve_sats: "0",
          minimum_void_reserve_atomic: "0",
        },
      }),
    ),
  /(reserve-fraction limit|atomic-value range|zero or exhausts)/,
);
assert.throws(
  () =>
    quoteBtcVoidV1(
      request({
        amount_in: "340282366920938463463374607431768211455",
        reserves: {
          btc_sats: "340282366920938463463374607431768211455",
        },
        policy: { max_input_reserve_fraction_bps: 2500 },
      }),
    ),
  /(reserve-fraction limit|atomic-value range)/,
);

const workflowDoc = fs.readFileSync(
  ".github/workflows/void-btc-void-quote-math-v1.yml",
  "utf8",
);
for (const expected of [
  "uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6",
  "uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6",
]) {
  assert.equal(
    workflowDoc.split(expected).length - 1,
    1,
    `workflow must contain exactly one ${expected}`,
  );
}
assert.doesNotMatch(
  workflowDoc,
  /uses:\s+actions\/(?:checkout|setup-node)@v\d+/,
  "workflow must not use mutable Action tags",
);

process.stdout.write(
  JSON.stringify({
    marker: "VOID_BTC_VOID_QUOTE_MATH_V1_PROOF_GREEN",
    status: "green",
    btc_to_void_amount_out: btcToVoid.result.amount_out,
    void_to_btc_amount_out: voidToBtc.result.amount_out,
    deterministic_quote_id: true,
    integer_only: true,
    invariant_non_decreasing: true,
    runtime_observed: false,
    inventory_reserved: false,
    execution_authorized: false,
    transaction_constructed: false,
    transaction_broadcast: false,
    funds_moved: false,
  }) + "\n",
);
