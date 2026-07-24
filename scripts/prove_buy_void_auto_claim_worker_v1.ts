import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import {
  VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1,
  VOID_BUY_VOID_AUTO_CLAIM_WORKER_AUTHORITY_V1,
  VOID_BUY_VOID_AUTO_CLAIM_WORKER_V1,
  runBuyVoidAutoClaimWorkerV1,
  type BuyVoidAutoClaimRequestV1,
  type BuyVoidAutoClaimWorkerPolicyV1,
} from "../src/economic/buy_void_auto_claim_worker_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_V1,
  observeBuyVoidPaymentV1,
  type BuyVoidPaymentRpcCallV1,
  type BuyVoidPaymentRpcObserverPolicyV1,
  type BuyVoidPaymentRpcTransportV1,
} from "../src/economic/buy_void_payment_rpc_observer_v1.js";
import type {
  BuyVoidAutoFulfillmentPolicyV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";
import type {
  BuyVoidVerifiedPaymentPolicyV2,
} from "../src/economic/buy_void_verified_payment_v2.js";

const txHash = `0x${"a".repeat(64)}`;
const delivery = `0x${"1".repeat(40)}`;
const receiver = `0x${"2".repeat(40)}`;
const usdc = `0x${"3".repeat(40)}`;
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const addressTopic = (address: string): string =>
  `0x${"0".repeat(24)}${address.slice(2)}`;

const request: BuyVoidAutoClaimRequestV1 = {
  request_id: "buyvoid_auto_claim_worker_v1",
  source_chain: "base",
  tx_hash: txHash,
  delivery_address: delivery,
  receive_address: receiver,
  usdc_amount: "12.5",
  quoted_void: "25",
  status: "payment_submitted_pending_manual_review",
};

const receipt = {
  status: "0x1",
  transactionHash: txHash,
  blockNumber: "0x64",
  logs: [
    {
      address: usdc,
      topics: [
        transferTopic,
        addressTopic(delivery),
        addressTopic(receiver),
      ],
      data: "0xbebc20",
      logIndex: "0x7",
      transactionHash: txHash,
      blockNumber: "0x64",
      removed: false,
    },
  ],
};

const observerPolicy: BuyVoidPaymentRpcObserverPolicyV1 = {
  enabled: true,
  source_chain: "base",
  chain_id: 8453,
  rpc_url: "http://127.0.0.1:8545",
  timeout_ms: 5_000,
  max_response_bytes: 262_144,
};

const verificationPolicy: BuyVoidVerifiedPaymentPolicyV2 = {
  allowed_chains: ["base"],
  usdc_contract_by_chain: { base: usdc },
  receive_address_by_chain: { base: receiver },
  current_block_number_by_chain: { base: "0" },
};

const fulfillmentPolicy: BuyVoidAutoFulfillmentPolicyV1 = {
  automatic_fulfillment_enabled: true,
  allowed_chains: ["base"],
  min_confirmations_by_chain: { base: 2 },
  usdc_contract_by_chain: { base: usdc },
  receive_address_by_chain: { base: receiver },
  rate_void_units_numerator: "2",
  rate_void_units_denominator: "1",
  pool_remaining_void_units: "1000000000",
  exact_payment_required: true,
};

const workerPolicy: BuyVoidAutoClaimWorkerPolicyV1 = {
  enabled: true,
  accepted_request_status:
    "payment_submitted_pending_manual_review",
  max_void_amount_units: "50000000",
};

async function withFixtureRpc<T>(
  callback: (input: {
    rpc_url: string;
    methods: string[];
  }) => Promise<T>,
): Promise<T> {
  const methods: string[] = [];
  const server = http.createServer((requestMessage, response) => {
    const chunks: Buffer[] = [];
    requestMessage.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    requestMessage.on("end", () => {
      const envelope = JSON.parse(
        Buffer.concat(chunks).toString("utf8"),
      ) as { id: number; method: string };
      methods.push(envelope.method);

      let result: unknown;
      if (envelope.method === "eth_chainId") result = "0x2105";
      else if (envelope.method === "eth_getTransactionReceipt") {
        result = receipt;
      } else if (envelope.method === "eth_blockNumber") {
        result = "0x65";
      } else {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({
          jsonrpc: "2.0",
          id: envelope.id,
          error: { code: -32601, message: "method not found" },
        }));
        return;
      }

      response.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify({
        jsonrpc: "2.0",
        id: envelope.id,
        result,
      }));
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo;
  try {
    return await callback({
      rpc_url: `http://127.0.0.1:${address.port}/`,
      methods,
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

class FixtureTransport implements BuyVoidPaymentRpcTransportV1 {
  readonly calls: BuyVoidPaymentRpcCallV1[] = [];

  constructor(
    private readonly overrides: Partial<
      Record<BuyVoidPaymentRpcCallV1["method"], unknown>
    > = {},
  ) {}

  async call(input: BuyVoidPaymentRpcCallV1): Promise<unknown> {
    this.calls.push(input);
    if (Object.prototype.hasOwnProperty.call(this.overrides, input.method)) {
      const value = this.overrides[input.method];
      if (value instanceof Error) throw value;
      return value;
    }
    if (input.method === "eth_chainId") return "0x2105";
    if (input.method === "eth_getTransactionReceipt") return receipt;
    if (input.method === "eth_blockNumber") return "0x65";
    throw new Error("unexpected_rpc_method");
  }
}

async function main(): Promise<void> {
  assert.equal(VOID_BUY_VOID_AUTO_CLAIM_WORKER_V1,
    "VOID_BUY_VOID_AUTO_CLAIM_WORKER_V1");
  assert.equal(VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_V1,
    "VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_V1");
  assert.equal(
    VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1,
    "buyVoidAutoClaimPayment",
  );
  assert.deepEqual(
    VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1.allowed_rpc_methods,
    ["eth_chainId", "eth_getTransactionReceipt", "eth_blockNumber"],
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1.rpc_read,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1.rpc_write,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1.wallet_access,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1.signing,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1.transaction_broadcast,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_AUTO_CLAIM_WORKER_AUTHORITY_V1.one_request_per_run,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_AUTO_CLAIM_WORKER_AUTHORITY_V1.dry_by_default,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_AUTO_CLAIM_WORKER_AUTHORITY_V1.inventory_decrement,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_AUTO_CLAIM_WORKER_AUTHORITY_V1.request_journal_write,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_AUTO_CLAIM_WORKER_AUTHORITY_V1.wallet_access,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_AUTO_CLAIM_WORKER_AUTHORITY_V1.signing,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_AUTO_CLAIM_WORKER_AUTHORITY_V1.transaction_broadcast,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_AUTO_CLAIM_WORKER_AUTHORITY_V1.background_loop,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_AUTO_CLAIM_WORKER_AUTHORITY_V1.money_movement,
    false,
  );

  const observerTransport = new FixtureTransport();
  const observed = await observeBuyVoidPaymentV1({
    request,
    policy: observerPolicy,
    transport: observerTransport,
  });
  if ("reason" in observed) throw new Error(observed.reason);
  assert.equal(observed.ok, true);
  assert.equal(observed.status, "observed");
  assert.equal(observed.chain_id, "8453");
  assert.equal(observed.payment_transaction_hash, txHash);
  assert.equal(observed.receipt_block_number, "100");
  assert.equal(observed.current_block_number, "101");
  assert.equal(observed.rpc_url_fingerprint_sha256.length, 64);
  assert.deepEqual(observed.rpc_methods_used, [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
  ]);
  assert.deepEqual(
    observerTransport.calls.map((call) => call.method),
    observed.rpc_methods_used,
  );

  await withFixtureRpc(async ({ rpc_url, methods }) => {
    const httpObserved = await observeBuyVoidPaymentV1({
      request,
      policy: { ...observerPolicy, rpc_url },
    });
    if ("reason" in httpObserved) throw new Error(httpObserved.reason);
    assert.equal(httpObserved.status, "observed");
    assert.equal(httpObserved.payment_transaction_hash, txHash);
    assert.equal(httpObserved.rpc_url_fingerprint_sha256.length, 64);
    assert.equal(JSON.stringify(httpObserved).includes(rpc_url), false);
    assert.deepEqual(methods, [
      "eth_chainId",
      "eth_getTransactionReceipt",
      "eth_blockNumber",
    ]);
  });

  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-auto-claim-worker-v1-"),
  );
  const journalPath = path.join(root, "buy-void-auto-fulfillment-v1");

  const dryTransport = new FixtureTransport();
  const dryRun = await runBuyVoidAutoClaimWorkerV1({
    request,
    root_dir: root,
    worker_policy: workerPolicy,
    observer_policy: observerPolicy,
    verification_policy: verificationPolicy,
    fulfillment_policy: fulfillmentPolicy,
    transport: dryTransport,
    now_ms: 1_700_000_000_000,
  });
  if ("reason" in dryRun) throw new Error(dryRun.reason);
  assert.equal(dryRun.ok, true);
  assert.equal(dryRun.status, "dry_run");
  assert.equal(dryRun.applied, false);
  assert.equal(dryRun.mutation_performed, false);
  assert.equal(
    dryRun.required_confirmation,
    VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1,
  );
  assert.equal(fs.existsSync(journalPath), false);
  assert.equal(dryRun.admission.instruction.signing_authorized, false);
  assert.equal(
    dryRun.admission.instruction.transaction_broadcast_authorized,
    false,
  );
  assert.equal(
    dryRun.admission.instruction.automatic_execution_authorized,
    false,
  );

  const wrongConfirmationTransport = new FixtureTransport();
  const wrongConfirmation = await runBuyVoidAutoClaimWorkerV1({
    request,
    root_dir: root,
    worker_policy: workerPolicy,
    observer_policy: observerPolicy,
    verification_policy: verificationPolicy,
    fulfillment_policy: fulfillmentPolicy,
    apply: true,
    confirmation: "wrong",
    transport: wrongConfirmationTransport,
    now_ms: 1_700_000_000_000,
  });
  if (!("reason" in wrongConfirmation)) throw new Error("expected confirmation hold");
  assert.equal(wrongConfirmation.ok, false);
  assert.equal(wrongConfirmation.stage, "worker_policy");
  assert.equal(wrongConfirmation.reason, "explicit_confirmation_required");
  assert.equal(wrongConfirmation.mutation_performed, false);
  assert.equal(wrongConfirmationTransport.calls.length, 0);
  assert.equal(fs.existsSync(journalPath), false);

  const applied = await runBuyVoidAutoClaimWorkerV1({
    request,
    root_dir: root,
    worker_policy: workerPolicy,
    observer_policy: observerPolicy,
    verification_policy: verificationPolicy,
    fulfillment_policy: fulfillmentPolicy,
    apply: true,
    confirmation: VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1,
    transport: new FixtureTransport(),
    now_ms: 1_700_000_000_000,
  });
  if ("reason" in applied) throw new Error(applied.reason);
  assert.equal(applied.ok, true);
  assert.equal(applied.status, "claimed");
  assert.equal(applied.applied, true);
  assert.equal(applied.mutation_performed, true);
  assert.equal(applied.journal.status, "approved");
  assert.equal(applied.journal.new_claim, true);
  assert.equal(applied.journal.intent.signing_authorized, false);
  assert.equal(
    applied.journal.intent.transaction_broadcast_authorized,
    false,
  );
  assert.equal(applied.journal.intent.money_movement_authorized, false);
  assert.equal(
    applied.request_state_patch.status,
    "payment_verified_fulfillment_claimed",
  );
  assert.equal(
    applied.request_state_patch.canonical_payment_identity,
    `voidpay1:base:${txHash}:7`,
  );
  assert.equal(
    applied.request_state_patch.automatic_delivery_started,
    false,
  );
  assert.equal(applied.request_state_patch.signing_performed, false);
  assert.equal(applied.request_state_patch.transaction_broadcast, false);
  assert.equal(fs.existsSync(journalPath), true);

  const duplicate = await runBuyVoidAutoClaimWorkerV1({
    request,
    root_dir: root,
    worker_policy: workerPolicy,
    observer_policy: observerPolicy,
    verification_policy: verificationPolicy,
    fulfillment_policy: {
      ...fulfillmentPolicy,
      automatic_fulfillment_enabled: false,
      pool_remaining_void_units: "0",
    },
    apply: true,
    confirmation: VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1,
    transport: new FixtureTransport({
      eth_blockNumber: "0x70",
    }),
    now_ms: 1_700_000_100_000,
  });
  if ("reason" in duplicate) throw new Error(duplicate.reason);
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.status, "duplicate");
  assert.equal(duplicate.applied, true);
  assert.equal(duplicate.mutation_performed, false);
  assert.equal(duplicate.journal.status, "duplicate");
  assert.equal(
    duplicate.request_state_patch.payment_verified_at_ms,
    applied.request_state_patch.payment_verified_at_ms,
  );
  assert.equal(
    duplicate.request_state_patch.fulfillment_instruction_id,
    applied.request_state_patch.fulfillment_instruction_id,
  );

  const disabledTransport = new FixtureTransport();
  const disabled = await runBuyVoidAutoClaimWorkerV1({
    request,
    root_dir: root,
    worker_policy: { ...workerPolicy, enabled: false },
    observer_policy: observerPolicy,
    verification_policy: verificationPolicy,
    fulfillment_policy: fulfillmentPolicy,
    transport: disabledTransport,
  });
  if (!("reason" in disabled)) throw new Error("expected disabled hold");
  assert.equal(disabled.ok, false);
  assert.equal(disabled.reason, "auto_claim_worker_disabled");
  assert.equal(disabledTransport.calls.length, 0);

  const wrongStatus = await runBuyVoidAutoClaimWorkerV1({
    request: { ...request, status: "awaiting_payment_tx_hash" },
    root_dir: root,
    worker_policy: workerPolicy,
    observer_policy: observerPolicy,
    verification_policy: verificationPolicy,
    fulfillment_policy: fulfillmentPolicy,
    transport: new FixtureTransport(),
  });
  if (!("reason" in wrongStatus)) throw new Error("expected status hold");
  assert.equal(wrongStatus.ok, false);
  assert.equal(wrongStatus.reason, "request_not_pending_payment_review");

  const overCap = await runBuyVoidAutoClaimWorkerV1({
    request,
    root_dir: root,
    worker_policy: {
      ...workerPolicy,
      max_void_amount_units: "24999999",
    },
    observer_policy: observerPolicy,
    verification_policy: verificationPolicy,
    fulfillment_policy: fulfillmentPolicy,
    transport: new FixtureTransport(),
  });
  if (!("reason" in overCap)) throw new Error("expected amount cap hold");
  assert.equal(overCap.ok, false);
  assert.equal(overCap.reason, "auto_claim_amount_exceeds_policy");

  const chainMismatchTransport = new FixtureTransport({
    eth_chainId: "0x1",
  });
  const chainMismatch = await observeBuyVoidPaymentV1({
    request,
    policy: observerPolicy,
    transport: chainMismatchTransport,
  });
  if (!("reason" in chainMismatch)) throw new Error("expected chain hold");
  assert.equal(chainMismatch.ok, false);
  assert.equal(chainMismatch.reason, "payment_observer_chain_id_mismatch");
  assert.deepEqual(
    chainMismatchTransport.calls.map((call) => call.method),
    ["eth_chainId"],
  );

  const missingReceipt = await observeBuyVoidPaymentV1({
    request,
    policy: observerPolicy,
    transport: new FixtureTransport({
      eth_getTransactionReceipt: null,
    }),
  });
  if (!("reason" in missingReceipt)) throw new Error("expected receipt hold");
  assert.equal(missingReceipt.ok, false);
  assert.equal(missingReceipt.reason, "payment_receipt_not_found");

  const failedRpc = await observeBuyVoidPaymentV1({
    request,
    policy: observerPolicy,
    transport: new FixtureTransport({
      eth_chainId: new Error("https://secret-provider.invalid/key"),
    }),
  });
  if (!("reason" in failedRpc)) throw new Error("expected RPC hold");
  assert.equal(failedRpc.ok, false);
  assert.equal(failedRpc.reason, "payment_observer_rpc_call_failed");
  assert.equal(JSON.stringify(failedRpc).includes("secret-provider"), false);

  const invalidTransportPolicy = await observeBuyVoidPaymentV1({
    request,
    policy: {
      ...observerPolicy,
      rpc_url: "http://rpc.example.invalid",
    },
    transport: new FixtureTransport(),
  });
  if (!("reason" in invalidTransportPolicy)) {
    throw new Error("expected transport policy hold");
  }
  assert.equal(invalidTransportPolicy.ok, false);
  assert.equal(
    invalidTransportPolicy.reason,
    "payment_observer_rpc_transport_not_allowed",
  );

  fs.rmSync(root, { recursive: true, force: true });

  console.log("VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_V1_GREEN");
  console.log("VOID_BUY_VOID_AUTO_CLAIM_WORKER_V1_GREEN");
  console.log("payment_observation=server_controlled_read_only_rpc");
  console.log("one_request_per_run=1");
  console.log("dry_by_default=1");
  console.log("exact_confirmation_required=1");
  console.log("duplicate_safe_claim=1");
  console.log("request_journal_write=0");
  console.log("inventory_decrement=0");
  console.log("wallet_access=0");
  console.log("signing=0");
  console.log("transaction_broadcast=0");
  console.log("runtime_route_mount=0");
  console.log("background_loop=0");
  console.log("money_movement=0");
  console.log("verdict=BUY_VOID_AUTO_CLAIM_WORKER_LOCAL_EXACT_GREEN");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
