import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  Interface,
  Transaction,
  Wallet,
} from "ethers";
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
  prepareBuyVoidExecutionTransactionV1,
  readBuyVoidExecutionAttemptV1,
  reserveBuyVoidExecutionAttemptV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  buyVoidDeliverySubmissionGuardPathsV1,
} from "../src/economic/buy_void_delivery_submission_guard_v1.js";
import {
  VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1,
} from "../src/economic/buy_void_delivery_sign_broadcast_adapter_v1.js";

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
  path.join(os.tmpdir(), "void-buy-delivery-runtime-v1-"),
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
]) {
  delete process.env[key];
}
delete (globalThis as any)
  .__void_buy_void_delivery_runtime_dependencies_v1;

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
    `?delivery-runtime-proof=${Date.now()}`
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
assert.equal(disabledStatus.body.signer_configured, false);
assert.equal(
  disabledStatus.body.effective_authority.signing,
  false,
);
assert.equal(
  disabledStatus.body.effective_authority
    .transaction_broadcast,
  false,
);

const disabledCommand = await call("POST", commandRoute, {
  socket: { remoteAddress: "::1" },
  body: { action: "sign_and_broadcast" },
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
const amount = "50000000";
const paymentTx = `0x${"a".repeat(64)}`;
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const topic = (address: string): string =>
  `0x${"0".repeat(24)}${address.slice(2)}`;

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
  "2000000000";

const request: BuyVoidRequestV1 = {
  request_id: "buyvoid_delivery_runtime_v1",
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
  now_ms: 1_701_700_000_000,
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
  now_ms: 1_701_700_100_000,
});
if ("reason" in reserved) throw new Error(reserved.reason);

const transferInterface = new Interface([
  "function transfer(address to, uint256 value) returns (bool)",
]);
const plan = {
  chain_id: 2050,
  nonce: 7,
  gas_limit: 65000,
  max_fee_per_gas_wei: 2_000_000_000,
  max_priority_fee_per_gas_wei: 1_000_000_000,
};
const tokenAmountAtoms =
  BigInt(amount) *
  BigInt(VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1.multiplier);
assert.equal(
  VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1.fulfillment_unit_decimals,
  6,
);
assert.equal(
  VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1.token_atom_decimals,
  18,
);

const unsigned = {
  type: 2,
  chainId: 2050n,
  nonce: 7,
  gasLimit: 65000n,
  maxFeePerGas: 2_000_000_000n,
  maxPriorityFeePerGas: 1_000_000_000n,
  to: token,
  value: 0n,
  data: transferInterface.encodeFunctionData("transfer", [
    recipient,
    tokenAmountAtoms,
  ]),
};
const referenceRaw = await wallet.signTransaction(unsigned);
const expectedHash = Transaction.from(referenceRaw).hash;
assert.ok(expectedHash);
const decodedReferenceTransfer = transferInterface.decodeFunctionData(
  "transfer",
  unsigned.data,
);
assert.equal(
  decodedReferenceTransfer[1],
  BigInt(amount) * 1_000_000_000_000n,
);

const prepared = prepareBuyVoidExecutionTransactionV1({
  root_dir: root,
  attempt_id: reserved.attempt.reservation.attempt_id,
  intent: claimed.intent,
  policy: executionPolicy,
  transaction: {
    chain_id: 2050,
    transaction_hash: expectedHash,
    from_address: wallet.address,
    to_address: recipient,
    amount_units: amount,
  },
  now_ms: 1_701_700_200_000,
});
if ("reason" in prepared) throw new Error(prepared.reason);
const attemptId = prepared.attempt.reservation.attempt_id;

const configuredNoDeps = await call("GET", statusRoute, {
  socket: { remoteAddress: "127.0.0.1" },
});
assert.equal(configuredNoDeps.status, 200);
assert.equal(configuredNoDeps.body.enabled, true);
assert.equal(configuredNoDeps.body.policy_configured, true);
assert.equal(configuredNoDeps.body.signer_configured, false);
assert.equal(
  configuredNoDeps.body.effective_authority.signing,
  false,
);

const dry = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    action: "sign_and_broadcast",
    attempt_id: attemptId,
    plan,
  },
});
assert.equal(dry.status, 200);
assert.equal(dry.body.decision.status, "dry_run");
assert.equal(dry.body.decision.signing_performed, false);
assert.equal(
  fs.existsSync(
    buyVoidDeliverySubmissionGuardPathsV1(root).journal_file,
  ),
  false,
);

const missingDependencies = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    action: "sign_and_broadcast",
    attempt_id: attemptId,
    plan,
    apply: true,
    confirmation: "buyVoidSignAndBroadcast",
    submission_idempotency_key: "8".repeat(64),
  },
});
assert.equal(missingDependencies.status, 503);
assert.equal(
  missingDependencies.body.error,
  "delivery_sign_broadcast_dependencies_not_configured",
);

(globalThis as any)
  .__void_buy_void_delivery_runtime_dependencies_v1 = {
  signer: {
    async get_address() {
      return wallet.address;
    },
    async sign_transaction(transaction: any) {
      return wallet.signTransaction(transaction);
    },
  },
  broadcaster: {
    async broadcast_signed_transaction(
      rawSignedTransaction: string,
    ) {
      assert.equal(
        Transaction.from(rawSignedTransaction).hash,
        expectedHash,
      );
      return {
        accepted: true,
        transaction_hash: expectedHash,
        provider_submission_id: "synthetic-provider-1",
        submission_may_have_occurred: true,
      };
    },
  },
};

const configured = await call("GET", statusRoute, {
  socket: { remoteAddress: "127.0.0.1" },
});
assert.equal(configured.body.signer_configured, true);
assert.equal(
  configured.body.effective_authority.signing,
  true,
);
assert.equal(
  configured.body.effective_authority
    .transaction_broadcast,
  true,
);

const wrongConfirmation = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    action: "sign_and_broadcast",
    attempt_id: attemptId,
    plan,
    apply: true,
    confirmation: "wrong",
    submission_idempotency_key: "8".repeat(64),
  },
});
assert.equal(wrongConfirmation.status, 428);
assert.equal(
  wrongConfirmation.body.decision.reason,
  "explicit_confirmation_required",
);

const accepted = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    action: "sign_and_broadcast",
    attempt_id: attemptId,
    plan,
    apply: true,
    confirmation: "buyVoidSignAndBroadcast",
    submission_idempotency_key: "8".repeat(64),
  },
});
assert.equal(accepted.status, 200);
assert.equal(
  accepted.body.decision.status,
  "broadcast_accepted",
);
assert.equal(
  accepted.body.decision.transaction_hash,
  expectedHash,
);
assert.equal(accepted.body.pipeline_recording.status, "applied");
assert.equal(
  accepted.body.raw_signed_transaction_returned,
  false,
);
const acceptedBodyJson = JSON.stringify(
  accepted.body,
  (_key, value) =>
    typeof value === "bigint" ? value.toString(10) : value,
);
assert.equal(
  acceptedBodyJson.includes(referenceRaw),
  false,
);

const state = readBuyVoidExecutionAttemptV1({
  root_dir: root,
  attempt_id: attemptId,
});
assert.equal(state?.status, "broadcast");
assert.equal(
  state?.broadcast?.void_delivery_tx_hash,
  expectedHash,
);

const duplicate = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    action: "sign_and_broadcast",
    attempt_id: attemptId,
    plan,
    apply: true,
    confirmation: "buyVoidSignAndBroadcast",
    submission_idempotency_key: "8".repeat(64),
  },
});
assert.equal(duplicate.status, 400);
assert.equal(
  duplicate.body.decision.reason,
  "prepared_execution_attempt_required",
);

const rootOverride = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    action: "sign_and_broadcast",
    attempt_id: attemptId,
    plan,
    root_dir: "/tmp/attacker",
  },
});
assert.equal(rootOverride.status, 400);
assert.equal(
  rootOverride.body.error,
  "forbidden_execution_material",
);
assert.equal(rootOverride.body.forbidden_key, "root_dir");

const secretInput = await call("POST", commandRoute, {
  socket: { remoteAddress: "127.0.0.1" },
  body: {
    action: "sign_and_broadcast",
    attempt_id: attemptId,
    plan,
    nested: { private_key: "forbidden" },
  },
});
assert.equal(secretInput.status, 400);
assert.equal(secretInput.body.forbidden_key, "private_key");

assert.equal(routes.has(`GET ${commandRoute}`), false);

console.log(
  "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1_GREEN",
);
