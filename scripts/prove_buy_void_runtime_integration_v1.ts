import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-runtime-v1-"));
process.env.DATA_DIR = tmp;
delete process.env.VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED;
delete process.env.VOID_BUY_VOID_RUNTIME_DIR;

function responseHarness() {
  let sentValue: { status: number; body: any } | null = null;
  const res: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader() {},
    json(body: any) {
      sentValue = { status: this.statusCode, body };
      return this;
    },
  };
  return { res, read: () => sentValue };
}

async function call(method: "GET" | "POST", route: string, req: any) {
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
      "buy_void_runtime_integration_v1.ts",
    )
  : path.join(
      path.dirname(thisFile),
      "..",
      "src",
      "economic",
      "buy_void_runtime_integration_v1.js",
    );
const moduleUrl = pathToFileURL(moduleFile).href + `?runtime-proof=${Date.now()}`;
await import(moduleUrl);
await new Promise((resolve) => setTimeout(resolve, 400));

const statusRoute = "/__void/operator/buy-void-runtime-v1/status";
const commandRoute = "/__void/operator/buy-void-runtime-v1/command";

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
assert.equal(disabledStatus.body.authority.public_route, false);
assert.equal(disabledStatus.body.authority.signing, false);
assert.equal(disabledStatus.body.authority.transaction_broadcast, false);
assert.equal(disabledStatus.body.authority.money_movement, false);

const disabledCommand = await call("POST", commandRoute, {
  socket: { remoteAddress: "::1" },
  body: { action: "verify_and_claim" },
});
assert.equal(disabledCommand.status, 503);
assert.equal(
  disabledCommand.body.error,
  "buy_void_runtime_integration_disabled",
);

process.env.VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED = "1";

const delivery = "0x1111111111111111111111111111111111111111";
const receive = "0x2222222222222222222222222222222222222222";
const usdc = "0x3333333333333333333333333333333333333333";
const paymentTx = `0x${"a".repeat(64)}`;
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const topic = (address: string): string =>
  `0x${"0".repeat(24)}${address.slice(2)}`;

const verifyBody = {
  action: "verify_and_claim",
  request: {
    request_id: "buyvoid_runtime_integration_v1",
    source_chain: "base",
    tx_hash: paymentTx,
    delivery_address: delivery,
    receive_address: receive,
    usdc_amount: "25",
    quoted_void: "50",
  },
  receipt: {
    status: 1,
    transactionHash: paymentTx,
    blockNumber: 100,
    logs: [
      {
        address: usdc,
        topics: [transferTopic, topic(delivery), topic(receive)],
        data: "0x17d7840",
        logIndex: 7,
        transactionHash: paymentTx,
        blockNumber: 100,
        removed: false,
      },
    ],
  },
  verification_policy: {
    allowed_chains: ["base"],
    usdc_contract_by_chain: { base: usdc },
    receive_address_by_chain: { base: receive },
    current_block_number_by_chain: { base: 105 },
  },
  fulfillment_policy: {
    automatic_fulfillment_enabled: true,
    allowed_chains: ["base"],
    min_confirmations_by_chain: { base: 3 },
    usdc_contract_by_chain: { base: usdc },
    receive_address_by_chain: { base: receive },
    rate_void_units_numerator: "2",
    rate_void_units_denominator: "1",
    pool_remaining_void_units: "1000000000",
    exact_payment_required: true,
  },
};

const dry = await call("POST", commandRoute, {
  socket: { remoteAddress: "::ffff:127.0.0.1" },
  body: verifyBody,
});
assert.equal(dry.status, 200);
assert.equal(dry.body.decision.status, "dry_run");
assert.equal(dry.body.decision.mutation_performed, false);
assert.equal(fs.existsSync(path.join(tmp, "buy_void_v1")), false);

const wrongConfirmation = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    ...verifyBody,
    apply: true,
    confirmation: "wrong",
  },
});
assert.equal(wrongConfirmation.status, 428);
assert.equal(
  wrongConfirmation.body.decision.reason,
  "explicit_confirmation_required",
);

const applied = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    ...verifyBody,
    apply: true,
    confirmation: "buyVoidVerifyAndClaim",
    now_ms: 1_701_500_000_000,
  },
});
assert.equal(applied.status, 200);
assert.equal(applied.body.decision.status, "applied");
assert.equal(applied.body.decision.mutation_performed, true);
assert.equal(applied.body.root_dir_server_controlled, true);
assert.equal(fs.existsSync(path.join(tmp, "buy_void_v1")), true);

const runtimeRoot = path.join(
  tmp,
  "buy_void_v1",
  "runtime-integration-v1",
);
const intent = applied.body.decision.result.claim.intent;
const wallet = "0x4444444444444444444444444444444444444444";
const deliveryTx = `0x${"b".repeat(64)}`;
const executionPolicy = {
  attempt_journal_enabled: true,
  max_attempts_per_payment: 2,
  chain_id: 2050,
  fulfillment_wallet_allowlist: [wallet],
};
const reserved = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    action: "reserve_execution",
    apply: true,
    confirmation: "buyVoidReserveExecution",
    intent,
    execution_policy: executionPolicy,
    now_ms: 1_701_500_010_000,
  },
});
assert.equal(reserved.status, 200);
const attemptId = reserved.body.decision.result.attempt.reservation.attempt_id;
const prepared = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    action: "prepare_execution",
    apply: true,
    confirmation: "buyVoidPrepareExecution",
    attempt_id: attemptId,
    intent,
    execution_policy: executionPolicy,
    transaction: {
      chain_id: 2050,
      transaction_hash: deliveryTx,
      from_address: wallet,
      to_address: delivery,
      amount_units: "50000000",
    },
    now_ms: 1_701_500_020_000,
  },
});
assert.equal(prepared.status, 200);

fs.writeFileSync(
  path.join(runtimeRoot, "buy-void-broadcast-outcomes-v1"),
  "blocked-by-proof\n",
  { mode: 0o600 },
);
const partialMutation = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    action: "record_broadcast_unknown",
    apply: true,
    confirmation: "buyVoidRecordBroadcastUnknown",
    attempt_id: attemptId,
    transaction_hash: deliveryTx,
    reason_code: "synthetic_outcome_journal_fault",
    provider_submission_id: "provider-runtime-partial-1",
    now_ms: 1_701_500_030_000,
  },
});
assert.equal(partialMutation.status, 500);
assert.equal(partialMutation.body.ok, false);
assert.equal(partialMutation.body.decision.status, "held");
assert.equal(partialMutation.body.decision.applied, true);
assert.equal(partialMutation.body.decision.mutation_performed, true);
assert.equal(
  partialMutation.body.decision.reason,
  "broadcast_outcome_state_invalid",
);

const rootOverride = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    ...verifyBody,
    root_dir: "/tmp/attacker-controlled",
  },
});
assert.equal(rootOverride.status, 400);
assert.equal(rootOverride.body.error, "root_dir_is_server_controlled");

const secretMaterial = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    ...verifyBody,
    nested: { private_key: "do-not-accept" },
  },
});
assert.equal(secretMaterial.status, 400);
assert.equal(secretMaterial.body.error, "forbidden_execution_material");
assert.equal(secretMaterial.body.forbidden_key, "private_key");

const invalidAction = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: { action: "sign_and_broadcast" },
});
assert.equal(invalidAction.status, 400);
assert.equal(invalidAction.body.error, "invalid_pipeline_action");

assert.equal(routes.has(`GET ${commandRoute}`), false);

fs.rmSync(tmp, { recursive: true, force: true });

console.log("VOID_BUY_VOID_RUNTIME_INTEGRATION_V1_GREEN");
console.log("partial_mutation_http_status=500");
