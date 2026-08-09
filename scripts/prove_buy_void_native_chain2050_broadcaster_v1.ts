import assert from "node:assert/strict";
import { Transaction, Wallet } from "ethers";
import {
  VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_AUTHORITY_V1,
  VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1,
  createBuyVoidNativeChain2050BroadcasterV1,
  probeBuyVoidNativeChain2050BroadcasterV1,
  type BuyVoidNativeChain2050JsonRpcCallResultV1,
  type BuyVoidNativeChain2050JsonRpcCallV1,
  type BuyVoidNativeChain2050JsonRpcTransportV1,
} from "../src/economic/buy_void_native_chain2050_broadcaster_v1.js";

function ready(
  requestId: number,
  result: unknown,
): BuyVoidNativeChain2050JsonRpcCallResultV1 {
  return {
    ok: true,
    request_sent: true,
    response_received: true,
    http_status: 200,
    request_id: requestId,
    result,
    provider_submission_id: `proof:${requestId}:result`,
  };
}

function held(
  requestId: number,
  options: {
    request_sent: boolean;
    response_received: boolean;
    error_code?: string;
  },
): BuyVoidNativeChain2050JsonRpcCallResultV1 {
  return {
    ok: false,
    request_sent: options.request_sent,
    response_received: options.response_received,
    http_status: options.response_received ? 200 : null,
    request_id: requestId,
    error_code: options.error_code || "synthetic_rpc_error",
    json_rpc_error_code: "-32000",
    provider_submission_id: `proof:${requestId}:held`,
  };
}

function malformed(
  value: unknown,
): BuyVoidNativeChain2050JsonRpcCallResultV1 {
  return value as BuyVoidNativeChain2050JsonRpcCallResultV1;
}

function queueTransport(
  responses: Array<
    | BuyVoidNativeChain2050JsonRpcCallResultV1
    | Error
    | ((input: BuyVoidNativeChain2050JsonRpcCallV1) =>
        BuyVoidNativeChain2050JsonRpcCallResultV1)
  >,
): {
  transport: BuyVoidNativeChain2050JsonRpcTransportV1;
  calls: BuyVoidNativeChain2050JsonRpcCallV1[];
} {
  const calls: BuyVoidNativeChain2050JsonRpcCallV1[] = [];
  const queue = [...responses];
  return {
    calls,
    transport: {
      async call(input) {
        calls.push({
          ...input,
          params: [...input.params],
        });
        const next = queue.shift();
        if (next === undefined) {
          throw new Error(`missing synthetic response for ${input.method}`);
        }
        if (next instanceof Error) throw next;
        return typeof next === "function" ? next(input) : next;
      },
    },
  };
}


function requireCreatedReady<T extends { ok: boolean }>(
  decision: T,
): Extract<T, { ok: true }> {
  if (!decision.ok) throw new Error("synthetic broadcaster creation failed");
  return decision as Extract<T, { ok: true }>;
}

const policy = {
  rpc_url: "http://127.0.0.1:8545/",
  expected_chain_id: 2050,
  request_timeout_ms: 5_000,
  max_response_bytes: 65_536,
};

for (const invalidPolicy of [
  { ...policy, rpc_url: "https://127.0.0.1:8545/" },
  { ...policy, rpc_url: "http://localhost:8545/" },
  { ...policy, rpc_url: "http://10.0.0.2:8545/" },
  { ...policy, rpc_url: "http://127.0.0.1/" },
  { ...policy, rpc_url: "http://user:pass@127.0.0.1:8545/" },
  { ...policy, rpc_url: "http://127.0.0.1:8545/?x=1" },
  { ...policy, expected_chain_id: 1 },
]) {
  const queued = queueTransport([]);
  const decision = await createBuyVoidNativeChain2050BroadcasterV1(
    invalidPolicy,
    queued.transport,
  );
  assert.equal(decision.ok, false);
  assert.equal(queued.calls.length, 0);
}

{
  const queued = queueTransport([ready(1, "0x1")]);
  const decision = await createBuyVoidNativeChain2050BroadcasterV1(
    policy,
    queued.transport,
  );
  assert.equal(decision.ok, false);
  if (decision.ok) throw new Error("wrong-chain endpoint was accepted");
  assert.equal(decision.reason, "chain_identity_mismatch");
  assert.deepEqual(queued.calls.map((call) => call.method), [
    "eth_chainId",
  ]);
}

{
  const queued = queueTransport([ready(1, "0x802")]);
  const probe = await probeBuyVoidNativeChain2050BroadcasterV1(
    policy,
    queued.transport,
  );
  assert.equal(probe.ok, true);
  assert.equal(probe.mutation_performed, false);
  assert.deepEqual(queued.calls.map((call) => call.method), [
    "eth_chainId",
  ]);
}

const malformedProbeResponses = [
  malformed(null),
  malformed([]),
  malformed({
    ok: false,
    request_sent: true,
    response_received: true,
    http_status: 200,
    request_id: 1,
    result: "0x802",
    provider_submission_id: "proof:1:malformed",
  }),
  malformed({
    ok: true,
    request_sent: false,
    response_received: true,
    http_status: 200,
    request_id: 1,
    result: "0x802",
    provider_submission_id: "proof:1:malformed",
  }),
  malformed({
    ok: true,
    request_sent: true,
    response_received: false,
    http_status: 200,
    request_id: 1,
    result: "0x802",
    provider_submission_id: "proof:1:malformed",
  }),
  malformed({
    ok: true,
    request_sent: true,
    response_received: true,
    http_status: 503,
    request_id: 1,
    result: "0x802",
    provider_submission_id: "proof:1:malformed",
  }),
  malformed({
    ok: true,
    request_sent: true,
    response_received: true,
    http_status: 200,
    request_id: 99,
    result: "0x802",
    provider_submission_id: "proof:1:malformed",
  }),
  malformed({
    ok: true,
    request_sent: true,
    response_received: true,
    http_status: 200,
    request_id: 1,
    provider_submission_id: "proof:1:malformed",
  }),
  malformed({
    ok: true,
    request_sent: true,
    response_received: true,
    http_status: 200,
    request_id: 1,
    result: "0x802",
    provider_submission_id: "bad provider id!",
  }),
  malformed({
    ok: true,
    request_sent: true,
    response_received: true,
    http_status: 200,
    request_id: 1,
    result: "0x802",
    error_code: "synthetic_error",
    json_rpc_error_code: "",
    provider_submission_id: "proof:1:malformed",
  }),
];

for (const malformedResponse of malformedProbeResponses) {
  const queued = queueTransport([malformedResponse]);
  const probe = await probeBuyVoidNativeChain2050BroadcasterV1(
    policy,
    queued.transport,
  );
  assert.equal(probe.ok, false);
  if (probe.ok) throw new Error("malformed transport result accepted");
  assert.equal(probe.reason, "chain_identity_probe_failed");
  assert.equal(
    probe.detail?.error_code,
    "transport_result_boundary_invalid",
  );
  assert.equal(
    probe.provider_submission_id,
    "chain2050-rpc:1:boundary-invalid",
  );
  assert.equal(probe.mutation_performed, false);
  assert.deepEqual(queued.calls.map((call) => call.method), [
    "eth_chainId",
  ]);
}

const wallet = Wallet.createRandom();
const recipient = Wallet.createRandom().address;
const raw2050 = await wallet.signTransaction({
  type: 2,
  chainId: 2050,
  nonce: 0,
  gasLimit: 21_000n,
  maxFeePerGas: 2_000_000_000n,
  maxPriorityFeePerGas: 1_000_000_000n,
  to: recipient,
  value: 5_000_000_000_000_000_000n,
  data: "0x",
});
const hash2050 = String(Transaction.from(raw2050).hash).toLowerCase();
assert.match(hash2050, /^0x[0-9a-f]{64}$/);

{
  const queued = queueTransport([
    ready(1, "0x802"),
    malformed({
      ok: true,
      request_sent: true,
      response_received: true,
      http_status: 200,
      request_id: 2,
      result: "0x802",
      provider_submission_id: "bad provider id!",
    }),
  ]);
  const created = requireCreatedReady(
    await createBuyVoidNativeChain2050BroadcasterV1(
      policy,
      queued.transport,
    ),
  );
  const result = await created.broadcaster.broadcast_signed_transaction(
    raw2050,
  );
  assert.equal(result.accepted, false);
  assert.equal(result.submission_may_have_occurred, false);
  assert.equal(
    result.provider_submission_id,
    "chain2050-rpc:2:boundary-invalid",
  );
  assert.deepEqual(queued.calls.map((call) => call.method), [
    "eth_chainId",
    "eth_chainId",
  ]);
}

{
  const queued = queueTransport([
    ready(1, "0x802"),
    ready(2, "0x802"),
    malformed({
      ok: false,
      request_sent: false,
      response_received: false,
      http_status: null,
      request_id: 3,
      result: hash2050,
      provider_submission_id: "proof:3:malformed",
    }),
  ]);
  const created = requireCreatedReady(
    await createBuyVoidNativeChain2050BroadcasterV1(
      policy,
      queued.transport,
    ),
  );
  const result = await created.broadcaster.broadcast_signed_transaction(
    raw2050,
  );
  assert.equal(result.accepted, false);
  assert.equal(result.transaction_hash, hash2050);
  assert.equal(result.submission_may_have_occurred, true);
  assert.equal(
    result.provider_submission_id,
    "chain2050-rpc:3:boundary-invalid",
  );
  assert.deepEqual(queued.calls.map((call) => call.method), [
    "eth_chainId",
    "eth_chainId",
    "eth_sendRawTransaction",
  ]);
}

const rawWrongChain = await wallet.signTransaction({
  type: 2,
  chainId: 1,
  nonce: 0,
  gasLimit: 21_000n,
  maxFeePerGas: 2_000_000_000n,
  maxPriorityFeePerGas: 1_000_000_000n,
  to: recipient,
  value: 1n,
  data: "0x",
});

{
  const queued = queueTransport([
    ready(1, "0x802"),
    ready(2, "0x802"),
    ready(3, hash2050),
  ]);
  const created = requireCreatedReady(
    await createBuyVoidNativeChain2050BroadcasterV1(
      policy,
      queued.transport,
    ),
  );
  const result = await created.broadcaster.broadcast_signed_transaction(
    raw2050,
  );
  assert.equal(result.accepted, true);
  assert.equal(result.transaction_hash, hash2050);
  assert.equal(result.submission_may_have_occurred, true);
  assert.deepEqual(queued.calls.map((call) => call.method), [
    "eth_chainId",
    "eth_chainId",
    "eth_sendRawTransaction",
  ]);
  assert.deepEqual(queued.calls[2]?.params, [raw2050]);
}

{
  const queued = queueTransport([ready(1, "0x802")]);
  const created = requireCreatedReady(
    await createBuyVoidNativeChain2050BroadcasterV1(
      policy,
      queued.transport,
    ),
  );
  const invalid = await created.broadcaster.broadcast_signed_transaction(
    "0x123",
  );
  assert.equal(invalid.accepted, false);
  assert.equal(invalid.submission_may_have_occurred, false);
  assert.equal(queued.calls.length, 1);

  const wrongChain = await created.broadcaster.broadcast_signed_transaction(
    rawWrongChain,
  );
  assert.equal(wrongChain.accepted, false);
  assert.equal(wrongChain.submission_may_have_occurred, false);
  assert.equal(queued.calls.length, 1);
}

{
  const queued = queueTransport([
    ready(1, "0x802"),
    ready(2, "0x1"),
  ]);
  const created = requireCreatedReady(
    await createBuyVoidNativeChain2050BroadcasterV1(
      policy,
      queued.transport,
    ),
  );
  const result = await created.broadcaster.broadcast_signed_transaction(
    raw2050,
  );
  assert.equal(result.accepted, false);
  assert.equal(result.submission_may_have_occurred, false);
  assert.deepEqual(queued.calls.map((call) => call.method), [
    "eth_chainId",
    "eth_chainId",
  ]);
}

{
  const queued = queueTransport([
    ready(1, "0x802"),
    ready(2, "0x802"),
    held(3, { request_sent: true, response_received: true }),
  ]);
  const created = requireCreatedReady(
    await createBuyVoidNativeChain2050BroadcasterV1(
      policy,
      queued.transport,
    ),
  );
  const result = await created.broadcaster.broadcast_signed_transaction(
    raw2050,
  );
  assert.equal(result.accepted, false);
  assert.equal(result.submission_may_have_occurred, true);
  assert.equal(queued.calls.length, 3);
}

{
  const mismatch = `0x${"1".repeat(64)}`;
  const queued = queueTransport([
    ready(1, "0x802"),
    ready(2, "0x802"),
    ready(3, mismatch),
  ]);
  const created = requireCreatedReady(
    await createBuyVoidNativeChain2050BroadcasterV1(
      policy,
      queued.transport,
    ),
  );
  const result = await created.broadcaster.broadcast_signed_transaction(
    raw2050,
  );
  assert.equal(result.accepted, false);
  assert.equal(result.transaction_hash, mismatch);
  assert.equal(result.submission_may_have_occurred, true);
}

{
  const queued = queueTransport([
    ready(1, "0x802"),
    ready(2, "0x802"),
    new Error("synthetic transport failure"),
  ]);
  const created = requireCreatedReady(
    await createBuyVoidNativeChain2050BroadcasterV1(
      policy,
      queued.transport,
    ),
  );
  const result = await created.broadcaster.broadcast_signed_transaction(
    raw2050,
  );
  assert.equal(result.accepted, false);
  assert.equal(result.submission_may_have_occurred, true);
  assert.equal(queued.calls.length, 3);
}

assert.deepEqual(
  VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_AUTHORITY_V1,
  {
    expected_chain_id: 2050,
    loopback_http_only: true,
    startup_chain_identity_probe_required: true,
    per_broadcast_chain_identity_probe_required: true,
    eth_send_raw_transaction_only_mutation: true,
    transaction_signing: false,
    wallet_access: false,
    secret_access: false,
    environment_read: false,
    filesystem_read: false,
    filesystem_write: false,
    runtime_route_mount: false,
    dependency_injection: false,
    automatic_retry: false,
    receipt_wait: false,
    raw_signed_transaction_persistence: false,
    raw_signed_transaction_output: false,
    redirect_follow: false,
    proxy_use: false,
    money_movement_when_injected_and_called: true,
  },
);
assert.equal(
  VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1,
  "VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1",
);

console.log("VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1_GREEN");
