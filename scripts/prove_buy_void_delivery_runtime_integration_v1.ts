import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  claimBuyVoidFulfillmentJournalV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidTransactionReceiptV2,
} from "../src/economic/buy_void_verified_payment_v2.js";
import type {
  BuyVoidAutoFulfillmentPolicyV1,
  BuyVoidRequestV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";
import {
  readBuyVoidExecutionAttemptV1,
  reserveBuyVoidExecutionAttemptV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  buyVoidDeliverySubmissionGuardPathsV1,
} from "../src/economic/buy_void_delivery_submission_guard_v1.js";

const routes = new Map<string, Function>();
const app: any = {
  get(route: string, ...handlers: Function[]) {
    routes.set(`GET ${route}`, handlers[handlers.length - 1]);
  },
  post(route: string, ...handlers: Function[]) {
    routes.set(`POST ${route}`, handlers[handlers.length - 1]);
  },
};
(globalThis as any).__void_http_app = app;

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-delivery-runtime-v90-"),
);
process.env.VOID_BUY_VOID_RUNTIME_DIR = root;
delete process.env
  .VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED;
for (const key of [
  "VOID_BUY_VOID_DELIVERY_CHAIN_ID",
  "VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS",
  "VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS",
  "VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS",
  "VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT",
  "VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI",
  "VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI",
  "VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL",
]) {
  delete process.env[key];
}

function responseHarness() {
  let sentValue: { status: number; body: any } | null = null;
  const res: any = {
    statusCode: 200,
    headersSent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader() {},
    json(body: any) {
      this.headersSent = true;
      sentValue = { status: this.statusCode, body };
      return this;
    },
  };
  return { res, read: () => sentValue };
}

async function call(
  method: "GET" | "POST",
  route: string,
  req: any,
) {
  const handler = routes.get(`${method} ${route}`);
  assert.ok(handler, `missing handler ${method} ${route}`);
  const harness = responseHarness();
  await Promise.resolve(handler(req, harness.res));
  const sent = harness.read();
  assert.ok(sent, `handler ${method} ${route} did not respond`);
  return sent;
}

const thisFile = fileURLToPath(import.meta.url);
const moduleFile = thisFile.endsWith(".ts")
  ? path.join(
      process.cwd(),
      "src",
      "economic",
      "buy_void_delivery_runtime_integration_v1.ts",
    )
  : path.join(
      path.dirname(thisFile),
      "..",
      "src",
      "economic",
      "buy_void_delivery_runtime_integration_v1.js",
    );
await import(
  pathToFileURL(moduleFile).href +
    `?delivery-runtime-v90-proof=${Date.now()}`
);
await new Promise((resolve) => setTimeout(resolve, 400));

const statusRoute =
  "/__void/operator/buy-void-delivery-runtime-v1/status";
const commandRoute =
  "/__void/operator/buy-void-delivery-runtime-v1/command";

const remoteStatus = await call("GET", statusRoute, {
  socket: { remoteAddress: "100.64.0.1" },
});
assert.equal(remoteStatus.status, 403);
assert.equal(remoteStatus.body.error, "operator_loopback_only");

const disabledStatus = await call("GET", statusRoute, {
  socket: { remoteAddress: "127.0.0.1" },
});
assert.equal(disabledStatus.status, 200);
assert.equal(disabledStatus.body.enabled, false);
assert.equal(disabledStatus.body.policy_configured, false);
assert.equal(
  disabledStatus.body.server_derived_transaction_plan,
  true,
);
assert.equal(
  disabledStatus.body.direct_sign_broadcast_apply_allowed,
  false,
);
assert.equal(disabledStatus.body.effective_authority.signing, false);
assert.equal(
  disabledStatus.body.effective_authority.transaction_broadcast,
  false,
);

const disabledCommand = await call("POST", commandRoute, {
  socket: { remoteAddress: "::1" },
  body: { action: "plan_erc20_delivery" },
});
assert.equal(disabledCommand.status, 503);
assert.equal(
  disabledCommand.body.error,
  "buy_void_delivery_runtime_integration_disabled",
);

const wallet = Wallet.createRandom();
const recipient = Wallet.createRandom().address.toLowerCase();
const token = Wallet.createRandom().address.toLowerCase();
const receive = Wallet.createRandom().address.toLowerCase();
const usdc = Wallet.createRandom().address.toLowerCase();
const paymentTx = `0x${"a".repeat(64)}`;
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const topic = (address: string): string =>
  `0x${"0".repeat(24)}${address.slice(2)}`;

const request: BuyVoidRequestV1 = {
  request_id: "buyvoid_delivery_runtime_v90",
  source_chain: "base",
  tx_hash: paymentTx,
  delivery_address: recipient,
  receive_address: receive,
  usdc_amount: "25",
  quoted_void: "50",
};
const receipt: BuyVoidTransactionReceiptV2 = {
  status: 1,
  transactionHash: paymentTx,
  blockNumber: 100,
  logs: [
    {
      address: usdc,
      topics: [
        transferTopic,
        topic(recipient),
        topic(receive),
      ],
      data: "0x17d7840",
      logIndex: 7,
      transactionHash: paymentTx,
      blockNumber: 100,
      removed: false,
    },
  ],
};
const verified = buildBuyVoidVerifiedPaymentEventV2({
  request,
  receipt,
  policy: {
    allowed_chains: ["base"],
    usdc_contract_by_chain: { base: usdc },
    receive_address_by_chain: { base: receive },
    current_block_number_by_chain: { base: 105 },
  },
});
if ("reason" in verified) throw new Error(verified.reason);

const fulfillmentPolicy: BuyVoidAutoFulfillmentPolicyV1 = {
  automatic_fulfillment_enabled: true,
  allowed_chains: ["base"],
  min_confirmations_by_chain: { base: 3 },
  usdc_contract_by_chain: { base: usdc },
  receive_address_by_chain: { base: receive },
  rate_void_units_numerator: "2",
  rate_void_units_denominator: "1",
  pool_remaining_void_units: "1000000000",
  exact_payment_required: true,
};
const claimed = claimBuyVoidFulfillmentJournalV1({
  root_dir: root,
  request,
  verified_payment_event: verified.event,
  policy: fulfillmentPolicy,
  now_ms: 1_701_800_000_000,
});
if ("reason" in claimed) throw new Error(claimed.reason);

const executionPolicy = {
  attempt_journal_enabled: true,
  max_attempts_per_payment: 2,
  chain_id: 2050,
  fulfillment_wallet_allowlist: [wallet.address],
};
const reserved = reserveBuyVoidExecutionAttemptV1({
  root_dir: root,
  intent: claimed.intent,
  policy: executionPolicy,
  now_ms: 1_701_800_100_000,
});
if ("reason" in reserved) throw new Error(reserved.reason);
const attemptId =
  reserved.attempt.reservation.attempt_id;

const rpcCalls: Array<{ method: string; params: unknown[] }> = [];
const rpcServer = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    const payload = JSON.parse(
      Buffer.concat(chunks).toString("utf8"),
    );
    rpcCalls.push({
      method: String(payload.method || ""),
      params: Array.isArray(payload.params)
        ? payload.params
        : [],
    });

    let result = "0x0";
    switch (payload.method) {
      case "eth_chainId":
        result = "0x802";
        break;
      case "eth_getTransactionCount":
        assert.deepEqual(payload.params, [
          wallet.address.toLowerCase(),
          "pending",
        ]);
        result = "0x7";
        break;
      case "eth_gasPrice":
        result = "0x3b9aca00";
        break;
      case "eth_estimateGas": {
        assert.equal(payload.params?.[1], "pending");
        const tx = payload.params?.[0];
        assert.equal(
          String(tx?.from || "").toLowerCase(),
          wallet.address.toLowerCase(),
        );
        assert.equal(
          String(tx?.to || "").toLowerCase(),
          token,
        );
        assert.equal(tx?.value, "0x0");
        assert.equal(
          String(tx?.data || "").slice(0, 10).toLowerCase(),
          "0xa9059cbb",
        );
        result = "0xc350";
        break;
      }
      case "eth_getBalance":
        assert.deepEqual(payload.params, [
          wallet.address.toLowerCase(),
          "pending",
        ]);
        result = "0xde0b6b3a7640000";
        break;
      default:
        throw new Error(`unexpected rpc method ${payload.method}`);
    }

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({
      jsonrpc: "2.0",
      id: payload.id,
      result,
    }));
  });
});
await new Promise<void>((resolve, reject) => {
  rpcServer.once("error", reject);
  rpcServer.listen(0, "127.0.0.1", resolve);
});
const address = rpcServer.address();
assert.ok(address && typeof address === "object");

process.env
  .VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED = "1";
process.env.VOID_BUY_VOID_DELIVERY_CHAIN_ID = "2050";
process.env.VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS = token;
process.env.VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS =
  wallet.address;
process.env.VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS =
  "1000000000";
process.env.VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT =
  "100000";
process.env.VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI =
  "3000000000";
process.env
  .VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI =
  "1000000000";
process.env.VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL =
  `http://127.0.0.1:${address.port}/`;

const configured = await call("GET", statusRoute, {
  socket: { remoteAddress: "127.0.0.1" },
});
assert.equal(configured.status, 200);
assert.equal(configured.body.enabled, true);
assert.equal(configured.body.policy_configured, true);
assert.equal(
  configured.body.action,
  "plan_erc20_delivery",
);
assert.equal(
  configured.body.runtime_mode,
  "read_only_erc20_planning_hold",
);
assert.equal(
  configured.body.planner_execution_state,
  "pending",
);
assert.equal(
  configured.body.planner_gas_limit_multiplier_bps,
  "12000",
);
assert.equal(
  configured.body.planner_fee_multiplier_bps,
  "12000",
);
assert.equal(configured.body.effective_authority.rpc_call, true);
assert.equal(configured.body.effective_authority.signing, false);
assert.equal(
  configured.body.effective_authority.transaction_broadcast,
  false,
);
assert.equal(configured.body.effective_authority.money_movement, false);

const planned = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    action: "plan_erc20_delivery",
    attempt_id: attemptId,
  },
});
assert.equal(planned.status, 200);
assert.equal(planned.body.ok, true);
assert.equal(planned.body.status, "planned");
assert.equal(planned.body.server_derived_transaction_plan, true);
assert.equal(planned.body.caller_supplied_transaction_plan, false);
assert.equal(
  planned.body.direct_sign_broadcast_apply_allowed,
  false,
);
assert.equal(
  planned.body.durable_prepared_transaction_composition_ready,
  false,
);
assert.equal(planned.body.planner.execution_state, "pending");
assert.equal(planned.body.planner.pending_nonce, 7);
assert.equal(
  planned.body.transaction_plan.chain_id,
  "2050",
);
assert.equal(planned.body.transaction_plan.nonce, 7);
assert.equal(
  planned.body.transaction_plan.gas_limit,
  "60000",
);
assert.equal(
  planned.body.transaction_plan.max_fee_per_gas_wei,
  "1200000000",
);
assert.equal(
  planned.body.transaction_plan.max_priority_fee_per_gas_wei,
  "1000000000",
);
assert.match(
  planned.body.preparation_fingerprint_sha256,
  /^[0-9a-f]{64}$/,
);
assert.deepEqual(
  rpcCalls.map((entry) => entry.method),
  [
    "eth_chainId",
    "eth_getTransactionCount",
    "eth_gasPrice",
    "eth_estimateGas",
    "eth_getBalance",
  ],
);

const callsAfterPlan = rpcCalls.length;
for (const [key, value] of [
  ["plan", { nonce: 99 }],
  ["transaction_plan", { nonce: 99 }],
  ["nonce", 99],
  ["gas_limit", "21000"],
  ["max_fee_per_gas_wei", "1"],
  ["max_priority_fee_per_gas_wei", "1"],
  ["apply", true],
] as const) {
  const rejected = await call("POST", commandRoute, {
    socket: { remoteAddress: "127.0.0.1" },
    body: {
      action: "plan_erc20_delivery",
      attempt_id: attemptId,
      [key]: value,
    },
  });
  assert.equal(rejected.status, 400);
  assert.equal(
    rejected.body.error,
    "caller_supplied_runtime_material_forbidden",
  );
  assert.equal(rejected.body.forbidden_key, key);
  assert.equal(rejected.body.signing_performed, false);
  assert.equal(
    rejected.body.transaction_broadcast_performed,
    false,
  );
  assert.equal(rejected.body.money_movement_performed, false);
}
assert.equal(rpcCalls.length, callsAfterPlan);

const attemptAfter = readBuyVoidExecutionAttemptV1({
  root_dir: root,
  attempt_id: attemptId,
});
assert.ok(attemptAfter);
assert.equal(attemptAfter.status, "reserved");
assert.equal(Boolean(attemptAfter.prepared), false);
assert.equal(Boolean(attemptAfter.broadcast), false);
assert.equal(Boolean(attemptAfter.confirmation), false);
assert.equal(
  fs.existsSync(
    buyVoidDeliverySubmissionGuardPathsV1(root).journal_file,
  ),
  false,
);

await new Promise<void>((resolve, reject) => {
  rpcServer.close((error) =>
    error ? reject(error) : resolve(),
  );
});
fs.rmSync(root, { recursive: true, force: true });

console.log(
  "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1_GREEN",
);
console.log("server_derived_transaction_plan=1");
console.log("caller_supplied_transaction_plan=0");
console.log("planner_execution_state=pending");
console.log("planner_rpc_method_count=5");
console.log("direct_sign_broadcast_apply_allowed=0");
console.log("durable_prepared_transaction_composition_ready=0");
console.log("mutation_performed=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
