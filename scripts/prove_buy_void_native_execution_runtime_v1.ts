import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import * as http from "node:http";
import os from "node:os";
import path from "node:path";
import {
  Transaction,
  Wallet,
} from "ethers";
import {
  buyVoidFulfillmentJournalPathsV1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  runBuyVoidAutoReservePlanWorkerV1,
  VOID_BUY_VOID_AUTO_RESERVE_PLAN_CONFIRMATION_V1,
  type BuyVoidAutoReservePlanWorkerPolicyV1,
} from "../src/economic/buy_void_auto_reserve_plan_worker_v1.js";
import type {
  BuyVoidInventoryReservationPolicyV1,
} from "../src/economic/buy_void_inventory_reservation_journal_v1.js";
import type {
  BuyVoidExecutionAttemptPolicyV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
  type BuyVoidNativeExecutionWorkerPolicyV1,
} from "../src/economic/buy_void_native_execution_worker_v1.js";
import {
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1,
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ROUTES_V1,
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1,
  handleBuyVoidNativeExecutionRuntimeCommandV1,
  runBuyVoidNativeExecutionRuntimeCommandV1,
  type BuyVoidNativeExecutionRuntimePolicyV1,
} from "../src/economic/buy_void_native_execution_runtime_v1.js";
import type {
  BuyVoidNativeExecutionPlannerRpcCallV1,
  BuyVoidNativeExecutionPlannerTransportV1,
} from "../src/economic/buy_void_native_execution_nonce_fee_planner_v1.js";

function hash(char: string): string {
  return char.repeat(64);
}
function txHash(char: string): string {
  return `0x${char.repeat(64)}`;
}
function address(char: string): string {
  return `0x${char.repeat(40)}`;
}

function makeIntent(
  index: number,
  amount = "400",
): BuyVoidFulfillmentJournalIntentV1 {
  const digit = String((index % 8) + 1);
  const requestId = `buyvoid_native_runtime_request_${index}`;
  const instructionId = `voidfill1_${digit.repeat(32)}`;
  const paymentIdentity =
    `voidpay1:base:${txHash(digit)}:${index}`;
  return {
    schema: "void_buy_void_fulfillment_journal_intent_v1",
    marker: "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1",
    created_at_ms: 1_700_100_000_000 + index,
    payment_key_sha256: hash(digit),
    request_key_sha256: hash(
      String(((index + 1) % 8) + 1),
    ),
    claim: {
      schema: "void_buy_void_fulfillment_claim_v1",
      marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
      canonical_payment_identity: paymentIdentity,
      canonical_payment_identity_sha256:
        hash(String(((index + 2) % 8) + 1)),
      request_id: requestId,
      decision_fingerprint:
        hash(String(((index + 3) % 8) + 1)),
      instruction_id: instructionId,
      unsigned_instruction: {
        schema:
          "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: instructionId,
        request_id: requestId,
        canonical_payment_identity: paymentIdentity,
        source_chain: "base",
        payment_transaction_hash: txHash(digit),
        payment_log_index: String(index),
        confirmed_block_number: "12345678",
        confirmation_count: "12",
        payment_usdc_units: "1000000",
        delivery_address: address(digit),
        void_amount_units: amount,
        signing_authorized: false,
        transaction_broadcast_authorized: false,
        automatic_execution_authorized: false,
      },
      status: "claimed",
    },
    verification_binding: {
      source_chain: "base",
      payment_transaction_hash: txHash(digit),
      payment_log_index: String(index),
      confirmed_block_number: "12345678",
      confirmation_count_at_claim: "12",
      usdc_contract: address("a"),
      payer_address: address(digit),
      receive_address: address("b"),
      delivery_address: address(digit),
      payment_usdc_units: "1000000",
      requested_usdc_units: "1000000",
      quoted_void_units: amount,
    },
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}

const wallet = new Wallet(
  "0x059c6995e998f97a5a0044966f0945389dc9e86dae88c7a841f4603b6b78690d",
);
const walletAddress = wallet.address.toLowerCase();
const poolId = "void-presale-mainnet0-v1";

function reservePolicy(): BuyVoidAutoReservePlanWorkerPolicyV1 {
  return {
    enabled: true,
    accepted_claim_status: "claimed",
    execution_chain_id: "2050",
    max_attempts_per_payment: 1,
    max_void_amount_units: "700",
  };
}
function inventoryPolicy(): BuyVoidInventoryReservationPolicyV1 {
  return {
    inventory_reservation_enabled: true,
    pool_id: poolId,
    inventory_policy_version: "fixed-cap-v1",
    pool_capacity_void_units: "1000000",
    max_reservation_void_units: "700",
  };
}
function executionPolicy(): BuyVoidExecutionAttemptPolicyV1 {
  return {
    attempt_journal_enabled: true,
    max_attempts_per_payment: 1,
    chain_id: "2050",
    fulfillment_wallet_allowlist: [walletAddress],
  };
}
function workerPolicy(): BuyVoidNativeExecutionWorkerPolicyV1 {
  return {
    enabled: true,
    asset_mode: "native_void",
    chain_id: "2050",
    pool_id: poolId,
    fulfillment_wallet_address: walletAddress,
    max_void_amount_units: "700",
    max_gas_limit: "21000",
    max_fee_per_gas_wei: "3000000000",
    max_priority_fee_per_gas_wei: "1000000000",
  };
}
function runtimePolicy(root: string):
  BuyVoidNativeExecutionRuntimePolicyV1 {
  return {
    enabled: true,
    root_dir: root,
    worker_policy: workerPolicy(),
    execution_policy: executionPolicy(),
    planner_policy: {
      rpc_url: "http://127.0.0.1:18545/",
      expected_chain_id: "2050",
      fulfillment_wallet_address: walletAddress,
      gas_limit: "21000",
      max_gas_limit: "21000",
      max_fee_per_gas_wei: "3000000000",
      max_priority_fee_per_gas_wei: "1000000000",
      fee_multiplier_bps: "12000",
    },
  };
}

function persistIntent(
  root: string,
  intent: BuyVoidFulfillmentJournalIntentV1,
): void {
  const paths = buyVoidFulfillmentJournalPathsV1(root);
  fs.mkdirSync(paths.payments_dir, {
    recursive: true,
    mode: 0o700,
  });
  fs.writeFileSync(
    path.join(
      paths.payments_dir,
      `${intent.payment_key_sha256}.json`,
    ),
    `${JSON.stringify(intent, null, 2)}\n`,
    { mode: 0o600 },
  );
}

function createReserved(root: string, index: number) {
  const intent = makeIntent(index);
  persistIntent(root, intent);
  const reserved = runBuyVoidAutoReservePlanWorkerV1({
    root_dir: root,
    intent,
    worker_policy: reservePolicy(),
    inventory_policy: inventoryPolicy(),
    execution_policy: executionPolicy(),
    apply: true,
    confirmation:
      VOID_BUY_VOID_AUTO_RESERVE_PLAN_CONFIRMATION_V1,
    now_ms: 1_700_100_010_000 + index,
  });
  assert.equal(reserved.ok, true);
  if ("reason" in reserved) throw new Error(String(reserved.reason));
  return {
    intent,
    attempt_id: reserved.plan.execution_attempt_id,
  };
}

function plannerTransport(
  calls: BuyVoidNativeExecutionPlannerRpcCallV1[],
): BuyVoidNativeExecutionPlannerTransportV1 {
  return async (call) => {
    calls.push({ ...call, params: [...call.params] });
    const values: Record<string, string> = {
      eth_chainId: "0x802",
      eth_getTransactionCount: "0x9",
      eth_gasPrice: "0x77359400",
      eth_getBalance: "0x21e19e0c9bab2400000",
    };
    return {
      ok: true,
      result: values[call.method],
      provider_submission_id: `runtime-proof-${call.request_id}`,
      http_status: 200,
    };
  };
}

assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1,
  "VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1",
);
assert.deepEqual(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ROUTES_V1,
  {
    status: "/__void/operator/buy-void-native-execution-v1/status",
    command: "/__void/operator/buy-void-native-execution-v1/command",
  },
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .disabled_by_default,
  true,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .dry_run_allowed_while_disabled,
  true,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .apply_allowed_while_disabled,
  false,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .exact_confirmation_required_before_apply_io,
  true,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .startup_execution,
  false,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_AUTHORITY_V1
    .inventory_decrement,
  false,
);

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-native-runtime-proof-"),
);
try {
  const reserved = createReserved(root, 1);

  const disabledApplyCalls:
    BuyVoidNativeExecutionPlannerRpcCallV1[] = [];
  const disabledApply =
    await runBuyVoidNativeExecutionRuntimeCommandV1({
      runtime_policy: {
        ...runtimePolicy(root),
        enabled: false,
      },
      command: {
        attempt_id: reserved.attempt_id,
        apply: true,
        confirmation:
          VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
        submission_idempotency_key: hash("8"),
      },
      planner_transport: plannerTransport(disabledApplyCalls),
    });
  assert.equal(disabledApply.ok, false);
  if (!("reason" in disabledApply)) {
    throw new Error("expected disabled apply hold");
  }
  assert.equal(
    disabledApply.reason,
    "native_execution_runtime_disabled",
  );
  assert.equal(disabledApplyCalls.length, 0);

  const wrongCalls: BuyVoidNativeExecutionPlannerRpcCallV1[] = [];
  const wrongConfirmation =
    await runBuyVoidNativeExecutionRuntimeCommandV1({
      runtime_policy: runtimePolicy(root),
      command: {
        attempt_id: reserved.attempt_id,
        apply: true,
        confirmation: "wrong",
        submission_idempotency_key: hash("8"),
      },
      planner_transport: plannerTransport(wrongCalls),
    });
  assert.equal(wrongConfirmation.ok, false);
  if (!("reason" in wrongConfirmation)) {
    throw new Error("expected confirmation hold");
  }
  assert.equal(
    wrongConfirmation.reason,
    "explicit_confirmation_required",
  );
  assert.equal(wrongCalls.length, 0);

  const missingDependencyCalls:
    BuyVoidNativeExecutionPlannerRpcCallV1[] = [];
  const missingDependencies =
    await runBuyVoidNativeExecutionRuntimeCommandV1({
      runtime_policy: runtimePolicy(root),
      command: {
        attempt_id: reserved.attempt_id,
        apply: true,
        confirmation:
          VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
        submission_idempotency_key: hash("8"),
      },
      planner_transport: plannerTransport(
        missingDependencyCalls,
      ),
    });
  assert.equal(missingDependencies.ok, false);
  if (!("reason" in missingDependencies)) {
    throw new Error("expected dependency hold");
  }
  assert.equal(
    missingDependencies.reason,
    "native_execution_dependencies_required",
  );
  assert.equal(missingDependencyCalls.length, 0);

  const dryCalls: BuyVoidNativeExecutionPlannerRpcCallV1[] = [];
  const dry =
    await runBuyVoidNativeExecutionRuntimeCommandV1({
      runtime_policy: {
        ...runtimePolicy(root),
        enabled: false,
      },
      command: {
        attempt_id: reserved.attempt_id,
        apply: false,
      },
      planner_transport: plannerTransport(dryCalls),
    });
  assert.equal(dry.ok, true);
  if ("reason" in dry) throw new Error(String(dry.reason));
  assert.equal(dry.status, "dry_run");
  assert.equal(dry.mutation_performed, false);
  assert.equal(dry.signing_performed, false);
  assert.equal(dry.transaction_broadcast_performed, false);
  assert.match(dry.plan_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(dry.runtime_policy_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.equal(dry.worker.status, "dry_run");
  if (dry.worker.status !== "dry_run") {
    throw new Error("expected dry worker");
  }
  assert.equal(
    dry.worker.preview.nonce,
    9,
  );
  assert.deepEqual(
    dryCalls.map((call) => call.method),
    [
      "eth_chainId",
      "eth_getTransactionCount",
      "eth_gasPrice",
      "eth_getBalance",
    ],
  );


  const handlerRpcMethods: string[] = [];
  const rpcServer = http.createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => {
      try {
        const call = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const method = String(call?.method || "");
        handlerRpcMethods.push(method);
        const values: Record<string, string> = {
          eth_chainId: "0x802",
          eth_getTransactionCount: "0x9",
          eth_gasPrice: "0x77359400",
          eth_getBalance: "0x21e19e0c9bab2400000",
        };
        assert.ok(Object.prototype.hasOwnProperty.call(values, method));
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({
          jsonrpc: "2.0",
          id: call.id,
          result: values[method],
        }));
      } catch (error) {
        response.statusCode = 500;
        response.end(JSON.stringify({
          error: String((error as Error)?.message || error),
        }));
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    rpcServer.once("error", reject);
    rpcServer.listen(0, "127.0.0.1", () => {
      rpcServer.off("error", reject);
      resolve();
    });
  });
  const rpcAddress = rpcServer.address();
  assert.ok(rpcAddress && typeof rpcAddress !== "string");
  if (!rpcAddress || typeof rpcAddress === "string") {
    throw new Error("disabled handler proof RPC address unavailable");
  }

  const handlerEnvironment: Record<string, string> = {
    VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ENABLED: "0",
    VOID_BUY_VOID_RUNTIME_DIR: root,
    VOID_BUY_VOID_INVENTORY_POOL_ID: poolId,
    VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS: walletAddress,
    VOID_BUY_VOID_NATIVE_DELIVERY_MAX_AMOUNT_UNITS: "700",
    VOID_BUY_VOID_NATIVE_EXECUTION_GAS_LIMIT: "21000",
    VOID_BUY_VOID_NATIVE_DELIVERY_MAX_GAS_LIMIT: "21000",
    VOID_BUY_VOID_NATIVE_DELIVERY_MAX_FEE_PER_GAS_WEI: "3000000000",
    VOID_BUY_VOID_NATIVE_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI: "1000000000",
    VOID_BUY_VOID_NATIVE_EXECUTION_FEE_MULTIPLIER_BPS: "12000",
    VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL:
      `http://127.0.0.1:${rpcAddress.port}/`,
  };
  const previousEnvironment = new Map(
    Object.keys(handlerEnvironment).map((key) => [key, process.env[key]]),
  );
  for (const [key, value] of Object.entries(handlerEnvironment)) {
    process.env[key] = value;
  }

  let handlerStatus = 0;
  let handlerDecision: any = null;
  const handlerResponse: any = {
    status(value: number) {
      handlerStatus = value;
      return handlerResponse;
    },
    json(value: unknown) {
      handlerDecision = value;
      return handlerResponse;
    },
  };
  try {
    await handleBuyVoidNativeExecutionRuntimeCommandV1(
      {
        socket: { remoteAddress: "127.0.0.1" },
        body: { attempt_id: reserved.attempt_id, apply: false },
      },
      handlerResponse,
    );
  } finally {
    for (const [key, value] of previousEnvironment) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await new Promise<void>((resolve) => rpcServer.close(() => resolve()));
  }
  assert.equal(handlerStatus, 200);
  assert.equal(handlerDecision?.ok, true);
  assert.equal(handlerDecision?.status, "dry_run");
  assert.equal(handlerDecision?.worker?.status, "dry_run");
  assert.equal(handlerDecision?.mutation_performed, false);
  assert.equal(handlerDecision?.signing_performed, false);
  assert.equal(handlerDecision?.transaction_broadcast_performed, false);
  assert.deepEqual(handlerRpcMethods, [
    "eth_chainId",
    "eth_getTransactionCount",
    "eth_gasPrice",
    "eth_getBalance",
  ]);

  let driftSignerCalls = 0;
  let driftBroadcasterCalls = 0;
  const driftCalls: BuyVoidNativeExecutionPlannerRpcCallV1[] = [];
  const driftTransport: BuyVoidNativeExecutionPlannerTransportV1 = async (call) => {
    driftCalls.push({ ...call, params: [...call.params] });
    const values: Record<string, string> = {
      eth_chainId: "0x802",
      eth_getTransactionCount: "0xa",
      eth_gasPrice: "0x77359400",
      eth_getBalance: "0x21e19e0c9bab2400000",
    };
    return {
      ok: true,
      result: values[call.method],
      provider_submission_id: `runtime-drift-proof-${call.request_id}`,
      http_status: 200,
    };
  };
  const driftHeld = await runBuyVoidNativeExecutionRuntimeCommandV1({
    runtime_policy: runtimePolicy(root),
    command: {
      attempt_id: reserved.attempt_id,
      apply: true,
      confirmation: VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
      submission_idempotency_key: hash("7"),
      expected_plan_fingerprint_sha256: dry.plan_fingerprint_sha256,
      policy_fingerprint_sha256: dry.runtime_policy_fingerprint_sha256,
    },
    dependencies: {
      signer: {
        async get_address() {
          driftSignerCalls += 1;
          return walletAddress;
        },
        async sign_transaction() {
          driftSignerCalls += 1;
          throw new Error("drift signer must not run");
        },
      },
      broadcaster: {
        async broadcast_signed_transaction() {
          driftBroadcasterCalls += 1;
          throw new Error("drift broadcaster must not run");
        },
      },
    },
    planner_transport: driftTransport,
  });
  assert.equal(driftHeld.ok, false);
  if (!("reason" in driftHeld)) throw new Error("expected plan drift hold");
  assert.equal(driftHeld.reason, "native_execution_plan_fingerprint_mismatch");
  assert.equal(driftHeld.mutation_performed, false);
  assert.equal(driftHeld.signing_performed, false);
  assert.equal(driftHeld.transaction_broadcast_performed, false);
  assert.equal(driftSignerCalls, 0);
  assert.equal(driftBroadcasterCalls, 0);
  assert.deepEqual(driftCalls.map((call) => call.method), [
    "eth_chainId",
    "eth_getTransactionCount",
    "eth_gasPrice",
    "eth_getBalance",
  ]);

  let signerCalls = 0;
  let broadcasterCalls = 0;
  const appliedCalls: BuyVoidNativeExecutionPlannerRpcCallV1[] = [];
  const accepted =
    await runBuyVoidNativeExecutionRuntimeCommandV1({
      runtime_policy: runtimePolicy(root),
      command: {
        attempt_id: reserved.attempt_id,
        apply: true,
        confirmation:
          VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
        submission_idempotency_key: hash("8"),
        expected_plan_fingerprint_sha256: dry.plan_fingerprint_sha256,
        policy_fingerprint_sha256: dry.runtime_policy_fingerprint_sha256,
        now_ms: 1_700_100_020_000,
      },
      dependencies: {
        signer: {
          async get_address() {
            signerCalls += 1;
            return walletAddress;
          },
          async sign_transaction(transaction) {
            signerCalls += 1;
            return await wallet.signTransaction(transaction);
          },
        },
        broadcaster: {
          async broadcast_signed_transaction(raw) {
            broadcasterCalls += 1;
            const parsed = Transaction.from(raw);
            assert.equal(parsed.chainId, 2050n);
            assert.equal(parsed.nonce, 9);
            assert.equal(parsed.to?.toLowerCase(), address("2"));
            assert.equal(parsed.value, 400000000000000n);
            assert.equal(parsed.data, "0x");
            assert.ok(parsed.hash);
            return {
              accepted: true,
              transaction_hash: parsed.hash,
              provider_submission_id: "native-runtime-proof",
              submission_may_have_occurred: true,
            };
          },
        },
      },
      planner_transport: plannerTransport(appliedCalls),
    });
  assert.equal(accepted.ok, true);
  if ("reason" in accepted) throw new Error(String(accepted.reason));
  assert.equal(accepted.status, "broadcast_accepted");
  assert.equal(accepted.mutation_performed, true);
  assert.equal(accepted.signing_performed, true);
  assert.equal(accepted.transaction_broadcast_performed, true);
  assert.equal(signerCalls, 2);
  assert.equal(broadcasterCalls, 1);
  assert.equal(
    JSON.stringify(
      accepted,
      (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
    ).includes(
      runtimePolicy(root).planner_policy.rpc_url,
    ),
    false,
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log(
  "VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1_GREEN",
);
console.log("server_journal_reconstruction=1");
console.log("attempt_id_only_selector=1");
console.log("disabled_apply_before_rpc=1");
console.log("disabled_dry_run=1");
console.log("disabled_runtime_handler_dry_run=1");
console.log("wrong_confirmation_before_rpc=1");
console.log("missing_dependencies_before_rpc=1");
console.log("plan_fingerprint_drift_before_signing=held");
console.log("plan_fingerprint_drift_signing=0");
console.log("plan_fingerprint_drift_broadcast=0");
console.log("read_only_nonce_fee_planning=1");
console.log("dry_run_signing=0");
console.log("dry_run_transaction_broadcast=0");
console.log("applied_signing=1");
console.log("applied_transaction_broadcast=1");
console.log("automatic_retry=0");
console.log("receipt_wait=0");
console.log("inventory_decrement=0");
console.log("request_journal_write=0");
console.log(
  "verdict=BUY_VOID_NATIVE_EXECUTION_RUNTIME_LOCAL_EXACT_GREEN",
);
