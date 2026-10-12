#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  buildCoupledNativeGasPayerObservationV1,
} from "../src/economic/coupled_native_gas_liability_v1.js";
import {
  VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_V1,
  observeCoupledNativeGasPayerV1,
  type CoupledNativeGasPayerObserverPolicyV1,
} from "../src/economic/coupled_native_gas_payer_observation_v1.js";
import type {
  BuyVoidNativeExecutionPlannerRpcCallV1,
  BuyVoidNativeExecutionPlannerRpcResultV1,
  BuyVoidNativeExecutionPlannerTransportV1,
} from "../src/economic/buy_void_native_execution_nonce_fee_planner_v1.js";

const payer = "0x1111111111111111111111111111111111111111";

function policy(
  override: Partial<CoupledNativeGasPayerObserverPolicyV1> = {},
): CoupledNativeGasPayerObserverPolicyV1 {
  return {
    rpc_url: "http://127.0.0.1:18553/",
    expected_chain_id: "2050",
    payer_address: payer,
    fee_multiplier_bps: "12000",
    max_fee_per_gas_wei: "1000",
    observation_ttl_ms: "5000",
    max_observation_duration_ms: "2000",
    request_timeout_ms: "5000",
    max_response_bytes: "65536",
    ...override,
  };
}

type MockOptions = {
  chain?: unknown;
  gas?: unknown;
  balance?: unknown;
  fail_method?: string;
  throw_method?: string;
};

function mockTransport(
  calls: BuyVoidNativeExecutionPlannerRpcCallV1[],
  options: MockOptions = {},
): BuyVoidNativeExecutionPlannerTransportV1 {
  return async (
    call: Readonly<BuyVoidNativeExecutionPlannerRpcCallV1>,
  ): Promise<BuyVoidNativeExecutionPlannerRpcResultV1> => {
    calls.push({ ...call, params: [...call.params] });
    if (call.method === options.throw_method) {
      throw new TypeError("synthetic transport fault");
    }
    if (call.method === options.fail_method) {
      return {
        ok: false,
        error_code: "synthetic_rpc_failure",
        provider_submission_id: "",
        http_status: 503,
      };
    }
    const result =
      call.method === "eth_chainId"
        ? (options.chain ?? "0x802")
        : call.method === "eth_gasPrice"
          ? (options.gas ?? "0x64")
          : call.method === "eth_getBalance"
            ? (options.balance ?? "0xf4240")
            : "0x0";
    return {
      ok: true,
      result,
      provider_submission_id: "mock",
      http_status: 200,
    };
  };
}

function clock(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };
}

async function observed(
  options: {
    policy?: Partial<CoupledNativeGasPayerObserverPolicyV1>;
    mock?: MockOptions;
    times?: number[];
  } = {},
) {
  const calls: BuyVoidNativeExecutionPlannerRpcCallV1[] = [];
  const decision = await observeCoupledNativeGasPayerV1({
    policy: policy(options.policy),
    read_now_ms: clock(options.times ?? [1_000_000, 1_000_100]),
    transport: mockTransport(calls, options.mock),
  });
  return { decision, calls };
}

function requireObserved<T extends { ok: boolean }>(
  value: T,
): asserts value is Extract<T, { ok: true }> {
  const runtime = value as T & { reason?: string };
  if (runtime.ok !== true) {
    throw new Error(runtime.reason ?? "expected observed");
  }
}

async function expectHeld(
  reason: string,
  options: Parameters<typeof observed>[0],
): Promise<void> {
  const { decision } = await observed(options);
  if (decision.ok !== false) throw new Error("expected HOLD");
  assert.equal(decision.reason, reason);
  assert.equal(decision.mutation_performed, false);
  assert.equal(decision.signing_performed, false);
  assert.equal(decision.transaction_broadcast_performed, false);
  assert.equal(decision.funds_movement_performed, false);
}

const baseline = await observed();
requireObserved(baseline.decision);
assert.equal(
  baseline.decision.marker,
  VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_V1,
);
assert.equal(baseline.decision.payer_address, payer);
assert.equal(baseline.decision.observed_gas_price_wei, "100");
assert.equal(
  baseline.decision.required_max_fee_per_gas_wei,
  "120",
);
assert.equal(baseline.decision.observation_duration_ms, 100);
assert.deepEqual(
  baseline.decision.rpc_methods_used,
  ["eth_chainId", "eth_gasPrice", "eth_getBalance"],
);
assert.deepEqual(
  baseline.calls.map((call) => call.method),
  ["eth_chainId", "eth_gasPrice", "eth_getBalance"],
);
assert.deepEqual(
  baseline.calls[2].params,
  [payer, "pending"],
);
assert.equal(
  baseline.calls.some((call) => call.method === "eth_getTransactionCount"),
  false,
);
assert.equal(
  baseline.decision.observation.observed_native_balance_wei,
  "1000000",
);
assert.equal(
  baseline.decision.observation.required_max_fee_per_gas_wei,
  "120",
);
assert.equal(
  baseline.decision.observation.observed_at_ms,
  1_000_100,
);
assert.equal(
  baseline.decision.observation.expires_at_ms,
  1_005_100,
);
assert.equal(
  baseline.decision.observation.source_identity_sha256,
  baseline.decision.source_identity_sha256,
);
assert.match(
  baseline.decision.source_identity_sha256,
  /^[0-9a-f]{64}$/u,
);
assert.match(
  baseline.decision.observation.observation_sha256,
  /^[0-9a-f]{64}$/u,
);

const rebuilt = buildCoupledNativeGasPayerObservationV1({
  payer_address: baseline.decision.observation.payer_address,
  observed_native_balance_wei:
    baseline.decision.observation.observed_native_balance_wei,
  required_max_fee_per_gas_wei:
    baseline.decision.observation.required_max_fee_per_gas_wei,
  observed_at_ms: baseline.decision.observation.observed_at_ms,
  expires_at_ms: baseline.decision.observation.expires_at_ms,
  source_identity_sha256:
    baseline.decision.observation.source_identity_sha256,
});
assert.deepEqual(baseline.decision.observation, rebuilt);

const changedSource = await observed({
  policy: { rpc_url: "http://127.0.0.1:18554/" },
});
requireObserved(changedSource.decision);
assert.notEqual(
  changedSource.decision.source_identity_sha256,
  baseline.decision.source_identity_sha256,
);
assert.notEqual(
  changedSource.decision.observation.observation_sha256,
  baseline.decision.observation.observation_sha256,
);

await expectHeld("coupled_native_gas_observer_rpc_url_must_be_loopback_http", {
  policy: { rpc_url: "https://example.com/" },
});
await expectHeld("coupled_native_gas_observer_rpc_url_must_be_loopback_http", {
  policy: { rpc_url: "http://localhost:18553/" },
});
for (const rpc_url of [
  "http://127.1:18553/",
  "http://2130706433:18553/",
  "http://0x7f000001:18553/",
]) {
  await expectHeld("coupled_native_gas_observer_rpc_url_must_be_loopback_http", {
    policy: { rpc_url },
  });
}
const ipv6Loopback = await observed({
  policy: { rpc_url: "http://[::1]:18553/" },
});
requireObserved(ipv6Loopback.decision);
assert.notEqual(
  ipv6Loopback.decision.source_identity_sha256,
  baseline.decision.source_identity_sha256,
);
await expectHeld("coupled_native_gas_observer_policy_invalid", {
  policy: { fee_multiplier_bps: "9999" },
});
await expectHeld("coupled_native_gas_observer_policy_invalid", {
  policy: { fee_multiplier_bps: "50001" },
});
await expectHeld("coupled_native_gas_observer_policy_invalid", {
  policy: { observation_ttl_ms: "300001" },
});
await expectHeld("coupled_native_gas_observer_chain_id_mismatch", {
  mock: { chain: "0x1" },
});
await expectHeld("coupled_native_gas_observer_chain_id_mismatch", {
  mock: { chain: "not-hex" },
});
await expectHeld("coupled_native_gas_observer_gas_price_invalid", {
  mock: { gas: "0x0" },
});
await expectHeld(
  "coupled_native_gas_observer_required_fee_exceeds_policy_cap",
  {
    policy: { max_fee_per_gas_wei: "100" },
    mock: { gas: "0x64" },
  },
);
await expectHeld("coupled_native_gas_observer_balance_invalid", {
  mock: { balance: "bad" },
});
await expectHeld("coupled_native_gas_observer_rpc_call_failed", {
  mock: { fail_method: "eth_gasPrice" },
});
await expectHeld("coupled_native_gas_observer_rpc_transport_exception", {
  mock: { throw_method: "eth_getBalance" },
});
await expectHeld("coupled_native_gas_observer_time_regression_or_invalid", {
  times: [1_000_000, 999_999],
});
{
  const calls: BuyVoidNativeExecutionPlannerRpcCallV1[] = [];
  let reads = 0;
  const decision = await observeCoupledNativeGasPayerV1({
    policy: policy(),
    read_now_ms: () => {
      reads += 1;
      if (reads === 2) throw new Error("synthetic clock fault");
      return 1_000_000;
    },
    transport: mockTransport(calls),
  });
  if (decision.ok !== false) throw new Error("expected clock-fault HOLD");
  assert.equal(decision.reason, "coupled_native_gas_observer_time_regression_or_invalid");
}

await expectHeld("coupled_native_gas_observer_duration_exceeded", {
  policy: { max_observation_duration_ms: "50" },
  times: [1_000_000, 1_000_100],
});
await expectHeld("coupled_native_gas_observer_expiry_invalid", {
  policy: { observation_ttl_ms: "100" },
  times: [
    Number.MAX_SAFE_INTEGER - 10,
    Number.MAX_SAFE_INTEGER - 5,
  ],
});

assert.deepEqual(
  VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_AUTHORITY_V1.rpc_methods,
  ["eth_chainId", "eth_gasPrice", "eth_getBalance"],
);
assert.equal(
  VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_AUTHORITY_V1.nonce_observation,
  false,
);
assert.equal(
  VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_AUTHORITY_V1.nonce_allocation,
  false,
);
assert.equal(
  VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_AUTHORITY_V1.trusted_time_source_proven,
  false,
);
for (const key of [
  "filesystem_write",
  "runtime_integration",
  "wallet_access",
  "private_key_access",
  "signing",
  "transaction_construction",
  "transaction_broadcast",
  "chain2050_write",
  "gas_spend",
  "inventory_movement",
  "market_activation",
  "public_presale_activation",
  "treasury_or_liquidity_movement",
  "funds_movement",
] as const) {
  assert.equal(
    VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_AUTHORITY_V1[key],
    false,
    key,
  );
}

console.log("VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_V1_PROOF_GREEN");
console.log("existing_buy_void_http_transport_reused=true");
console.log("rpc_methods=eth_chainId,eth_gasPrice,eth_getBalance");
console.log("pending_balance_observation=true");
console.log("numeric_loopback_literal_required=true");
console.log("alternate_ipv4_spellings_rejected=true");
console.log("nonce_observation=false");
console.log("fee_multiplier_policy_bound=true");
console.log("content_addressed_observation_reused=true");
console.log("observation_duration_bound=true");
console.log("trusted_time_source_proven=false");
console.log("runtime_integration=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
