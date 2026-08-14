import assert from "node:assert/strict";
import * as http from "node:http";
import {
  VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_AUTHORITY_V1,
  VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_V1,
  createBuyVoidNativeExecutionPlannerHttpTransportV1,
  planBuyVoidNativeExecutionNonceFeeV1,
  type BuyVoidNativeExecutionPlannerRpcCallV1,
  type BuyVoidNativeExecutionPlannerTransportV1,
} from "../src/economic/buy_void_native_execution_nonce_fee_planner_v1.js";

const wallet = "0x1000000000000000000000000000000000000001";
const basePolicy = {
  rpc_url: "http://127.0.0.1:18545/",
  expected_chain_id: "2050" as const,
  fulfillment_wallet_address: wallet,
  native_value_wei: "1000000000000000000",
  gas_limit: "21000",
  max_gas_limit: "21000",
  max_fee_per_gas_wei: "3000000000",
  max_priority_fee_per_gas_wei: "1000000000",
  fee_multiplier_bps: "12000",
};

assert.deepEqual(
  VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_AUTHORITY_V1,
  {
    expected_chain_id: 2050,
    server_controlled_rpc_url: true,
    loopback_http_only: true,
    execution_state_tag: "pending",
    read_only_rpc_methods: [
      "eth_chainId",
      "eth_getTransactionCount",
      "eth_gasPrice",
      "eth_getBalance",
    ],
    transaction_signing: false,
    transaction_broadcast: false,
    wallet_access: false,
    secret_access: false,
    filesystem_read: false,
    filesystem_write: false,
    runtime_route_mount: false,
    automatic_retry: false,
    receipt_wait: false,
    redirect_follow: false,
    proxy_use: false,
    money_movement: false,
  },
);

const calls: BuyVoidNativeExecutionPlannerRpcCallV1[] = [];
const mock: BuyVoidNativeExecutionPlannerTransportV1 =
  async (call) => {
    calls.push({ ...call, params: [...call.params] });
    const resultByMethod: Record<string, string> = {
      eth_chainId: "0x802",
      eth_getTransactionCount: "0x7",
      eth_gasPrice: "0x77359400",
      eth_getBalance: "0x21e19e0c9bab2400000",
    };
    return {
      ok: true,
      result: resultByMethod[call.method],
      provider_submission_id: `mock-${call.request_id}`,
      http_status: 200,
    };
  };

const planned = await planBuyVoidNativeExecutionNonceFeeV1(
  basePolicy,
  mock,
);
assert.equal(planned.ok, true);
if ("reason" in planned) throw new Error(String(planned.reason));
assert.equal(
  planned.marker,
  VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_V1,
);
assert.equal(planned.status, "planned");
assert.equal(planned.pending_nonce, 7);
assert.equal(planned.execution_state, "pending");
assert.equal(planned.observed_gas_price_wei, "2000000000");
assert.equal(
  planned.computed_max_fee_per_gas_wei,
  "2400000000",
);
assert.equal(
  planned.transaction_plan.max_priority_fee_per_gas_wei,
  "1000000000",
);
assert.equal(
  planned.transaction_plan.max_fee_per_gas_wei,
  "2400000000",
);
assert.equal(planned.transaction_plan.gas_limit, "21000");
assert.equal(planned.transaction_plan.nonce, 7);
assert.equal(planned.sufficient_balance, true);
assert.deepEqual(
  planned.rpc_methods_used,
  [
    "eth_chainId",
    "eth_getTransactionCount",
    "eth_gasPrice",
    "eth_getBalance",
  ],
);
assert.deepEqual(
  calls.map((call) => call.method),
  planned.rpc_methods_used,
);
assert.deepEqual(calls[1].params, [wallet, "pending"]);
assert.deepEqual(calls[3].params, [wallet, "pending"]);
assert.equal(
  JSON.stringify(planned).includes(basePolicy.rpc_url),
  false,
);

let rejectedCalls = 0;
const nonLoopback =
  await planBuyVoidNativeExecutionNonceFeeV1(
    {
      ...basePolicy,
      rpc_url: "http://192.0.2.10:8545/",
    },
    async () => {
      rejectedCalls += 1;
      throw new Error("should not run");
    },
  );
assert.equal(nonLoopback.ok, false);
if (!("reason" in nonLoopback)) throw new Error("expected hold");
assert.equal(nonLoopback.reason, "rpc_url_must_be_loopback_http");
assert.equal(rejectedCalls, 0);

const chainMismatch =
  await planBuyVoidNativeExecutionNonceFeeV1(
    basePolicy,
    async (call) => ({
      ok: true,
      result:
        call.method === "eth_chainId"
          ? "0x1"
          : "0x0",
      provider_submission_id: "",
      http_status: 200,
    }),
  );
assert.equal(chainMismatch.ok, false);
if (!("reason" in chainMismatch)) throw new Error("expected hold");
assert.equal(chainMismatch.reason, "chain_id_mismatch");
assert.deepEqual(chainMismatch.rpc_methods_used, ["eth_chainId"]);

const feeCap =
  await planBuyVoidNativeExecutionNonceFeeV1(
    {
      ...basePolicy,
      max_fee_per_gas_wei: "2100000000",
    },
    mock,
  );
assert.equal(feeCap.ok, false);
if (!("reason" in feeCap)) throw new Error("expected hold");
assert.equal(feeCap.reason, "computed_fee_exceeds_policy_cap");

const insufficient =
  await planBuyVoidNativeExecutionNonceFeeV1(
    basePolicy,
    async (call) => {
      const resultByMethod: Record<string, string> = {
        eth_chainId: "0x802",
        eth_getTransactionCount: "0x7",
        eth_gasPrice: "0x77359400",
        eth_getBalance: "0x1",
      };
      return {
        ok: true,
        result: resultByMethod[call.method],
        provider_submission_id: "",
        http_status: 200,
      };
    },
  );
assert.equal(insufficient.ok, false);
if (!("reason" in insufficient)) throw new Error("expected hold");
assert.equal(
  insufficient.reason,
  "fulfillment_wallet_balance_insufficient",
);

const requiredMaximum =
  1_000_000_000_000_000_000n + 21_000n * 2_400_000_000n;
const latestSufficientPendingInsufficientCalls: BuyVoidNativeExecutionPlannerRpcCallV1[] = [];
const latestSufficientPendingInsufficient =
  await planBuyVoidNativeExecutionNonceFeeV1(
    basePolicy,
    async (call) => {
      latestSufficientPendingInsufficientCalls.push({
        ...call,
        params: [...call.params],
      });
      let result: string;
      if (call.method === "eth_chainId") result = "0x802";
      else if (call.method === "eth_getTransactionCount") result = "0x7";
      else if (call.method === "eth_gasPrice") result = "0x77359400";
      else if (call.method === "eth_getBalance") {
        const stateTag = String(call.params[1] || "");
        result = stateTag === "pending"
          ? `0x${(requiredMaximum - 1n).toString(16)}`
          : `0x${(requiredMaximum + 1n).toString(16)}`;
      } else {
        throw new Error(`unexpected method ${call.method}`);
      }
      return {
        ok: true,
        result,
        provider_submission_id: "",
        http_status: 200,
      };
    },
  );
assert.equal(latestSufficientPendingInsufficient.ok, false);
if (!("reason" in latestSufficientPendingInsufficient)) {
  throw new Error("mixed-state fixture must hold");
}
assert.equal(
  latestSufficientPendingInsufficient.reason,
  "fulfillment_wallet_balance_insufficient",
);
assert.deepEqual(
  latestSufficientPendingInsufficientCalls.at(-1)?.params,
  [wallet, "pending"],
);

const serverCalls: Array<{
  id: number;
  method: string;
  params: unknown[];
}> = [];
const server = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    const body = JSON.parse(
      Buffer.concat(chunks).toString("utf8"),
    );
    serverCalls.push({
      id: body.id,
      method: body.method,
      params: body.params,
    });
    const resultByMethod: Record<string, string> = {
      eth_chainId: "0x802",
      eth_getTransactionCount: "0x2",
      eth_gasPrice: "0x3b9aca00",
      eth_getBalance: "0x21e19e0c9bab2400000",
    };
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({
      jsonrpc: "2.0",
      id: body.id,
      result: resultByMethod[body.method],
    }));
  });
});
await new Promise<void>((resolve) =>
  server.listen(0, "127.0.0.1", resolve),
);
const address = server.address();
assert.ok(address && typeof address === "object");

try {
  const transport =
    createBuyVoidNativeExecutionPlannerHttpTransportV1();
  const live = await planBuyVoidNativeExecutionNonceFeeV1(
    {
      ...basePolicy,
      rpc_url: `http://127.0.0.1:${address.port}/rpc`,
    },
    transport,
  );
  assert.equal(live.ok, true);
  if ("reason" in live) throw new Error(String(live.reason));
  assert.equal(live.pending_nonce, 2);
  assert.equal(live.execution_state, "pending");
  assert.deepEqual(
    serverCalls.map((call) => call.method),
    [
      "eth_chainId",
      "eth_getTransactionCount",
      "eth_gasPrice",
      "eth_getBalance",
    ],
  );
  assert.deepEqual(serverCalls[1].params, [wallet, "pending"]);
  assert.deepEqual(serverCalls[3].params, [wallet, "pending"]);
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((error) =>
      error ? reject(error) : resolve(),
    ),
  );
}

let slowDripChunks = 0;
const slowDripServer = http.createServer((request, response) => {
  request.resume();
  request.on("end", () => {
    response.writeHead(200, {
      "content-type": "application/json",
    });
    const responseBody = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: "0x802",
    });
    let offset = 0;
    const interval = setInterval(() => {
      if (offset >= responseBody.length) {
        clearInterval(interval);
        response.end();
        return;
      }
      response.write(responseBody.slice(offset, offset + 1));
      offset += 1;
      slowDripChunks += 1;
    }, 20);
    response.on("close", () => clearInterval(interval));
  });
});
await new Promise<void>((resolve, reject) => {
  slowDripServer.once("error", reject);
  slowDripServer.listen(0, "127.0.0.1", resolve);
});
try {
  const slowDripAddress = slowDripServer.address();
  assert.ok(slowDripAddress && typeof slowDripAddress === "object");
  const requestTimeoutMs = 120;
  const startedAtMs = Date.now();
  const slowDripDecision =
    await planBuyVoidNativeExecutionNonceFeeV1({
      ...basePolicy,
      rpc_url: `http://127.0.0.1:${slowDripAddress.port}/rpc`,
      request_timeout_ms: requestTimeoutMs,
    });
  const elapsedMs = Date.now() - startedAtMs;
  assert.equal(slowDripDecision.ok, false);
  if (!("reason" in slowDripDecision)) {
    throw new Error("slow-drip RPC response must hold");
  }
  assert.equal(slowDripDecision.reason, "rpc_call_failed");
  assert.equal(
    String(slowDripDecision.detail?.error_code || ""),
    "request_total_deadline_exceeded",
  );
  assert.deepEqual(slowDripDecision.rpc_methods_used, ["eth_chainId"]);
  assert.ok(
    slowDripChunks >= 2,
    "fixture must keep the socket active before total deadline",
  );
  assert.ok(
    elapsedMs >= requestTimeoutMs - 40,
    `total deadline fired too early: ${elapsedMs}ms`,
  );
  assert.ok(
    elapsedMs < requestTimeoutMs + 1_000,
    `slow-drip response exceeded total deadline bound: ${elapsedMs}ms`,
  );
  assert.equal(slowDripDecision.mutation_performed, false);
  assert.equal(slowDripDecision.signing_performed, false);
  assert.equal(slowDripDecision.transaction_broadcast_performed, false);
} finally {
  await new Promise<void>((resolve, reject) => {
    slowDripServer.close((error) =>
      error ? reject(error) : resolve(),
    );
  });
}

const prematureCloseServer = http.createServer((request, response) => {
  request.resume();
  request.on("end", () => {
    response.writeHead(200, {
      "content-type": "application/json",
    });
    response.flushHeaders();
    response.write('{"jsonrpc":"2.0","id":1,"result":"0x');
    setTimeout(() => response.socket?.destroy(), 20);
  });
});
await new Promise<void>((resolve, reject) => {
  prematureCloseServer.once("error", reject);
  prematureCloseServer.listen(0, "127.0.0.1", resolve);
});
try {
  const prematureCloseAddress = prematureCloseServer.address();
  assert.ok(prematureCloseAddress && typeof prematureCloseAddress === "object");
  const prematureCloseDecision =
    await planBuyVoidNativeExecutionNonceFeeV1({
      ...basePolicy,
      rpc_url: `http://127.0.0.1:${prematureCloseAddress.port}/rpc`,
      request_timeout_ms: 1_000,
    });
  assert.equal(prematureCloseDecision.ok, false);
  if (!("reason" in prematureCloseDecision)) {
    throw new Error("premature response close must hold");
  }
  assert.equal(prematureCloseDecision.reason, "rpc_call_failed");
  assert.ok(
    ["response_aborted", "response_error"].includes(
      String(prematureCloseDecision.detail?.error_code || ""),
    ),
    "post-header response failure must be contained as transport HOLD",
  );
  assert.deepEqual(prematureCloseDecision.rpc_methods_used, ["eth_chainId"]);
  assert.equal(prematureCloseDecision.mutation_performed, false);
  assert.equal(prematureCloseDecision.signing_performed, false);
  assert.equal(prematureCloseDecision.transaction_broadcast_performed, false);
} finally {
  await new Promise<void>((resolve, reject) =>
    prematureCloseServer.close((error) =>
      error ? reject(error) : resolve(),
    ),
  );
}

console.log(
  "VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_V1_GREEN",
);
console.log("read_only_rpc_method_count=4");
console.log("pending_nonce_source=eth_getTransactionCount_pending");
console.log("execution_state=pending");
console.log("balance_state=pending");
console.log("latest_sufficient_pending_insufficient_hold=1");
console.log("rpc_inactivity_timeout_enforced=1");
console.log("rpc_total_deadline_enforced=1");
console.log("slow_drip_total_deadline_hold=1");
console.log("premature_response_close_hold=1");
console.log("fee_source=eth_gasPrice_bounded_multiplier");
console.log("balance_preflight=1");
console.log("loopback_http_only=1");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log(
  "verdict=BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_EXACT_GREEN",
);
