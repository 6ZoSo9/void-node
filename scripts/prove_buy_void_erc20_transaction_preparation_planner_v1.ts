import assert from "node:assert/strict";
import * as http from "node:http";
import {
  Interface,
} from "ethers";
import {
  VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_AUTHORITY_V1,
  runBuyVoidErc20TransactionPreparationPlannerV1,
  type BuyVoidErc20TransactionPreparationPlannerPolicyV1,
  type BuyVoidErc20TransactionPreparationPlannerTransportV1,
} from "../src/economic/buy_void_erc20_transaction_preparation_planner_v1.js";

const wallet = "0x1111111111111111111111111111111111111111";
const recipient = "0x2222222222222222222222222222222222222222";
const token = "0x3333333333333333333333333333333333333333";
const amountUnits = 2_500_000_000n;
const amountAtoms = amountUnits * 1_000_000_000_000n;
const transferInterface = new Interface([
  "function transfer(address to, uint256 value) returns (bool)",
]);

function attempt(options: {
  status?: "reserved" | "prepared";
  amountUnits?: bigint;
  deliveryAddress?: string;
} = {}) {
  const status = options.status ?? "reserved";
  return {
    reservation: {
      schema: "void_buy_void_execution_attempt_reservation_v1",
      marker: "VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1",
      attempt_id: "a".repeat(64),
      attempt_number: 1,
      reserved_at_ms: 1,
      payment_key_sha256: "b".repeat(64),
      request_key_sha256: "c".repeat(64),
      canonical_payment_identity:
        "voidpay1:ethereum:0x" + "d".repeat(64) + ":0",
      request_id: "request-erc20-preparation-v1",
      instruction_id: "e".repeat(64),
      intent_fingerprint: "f".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: "e".repeat(64),
        request_id: "request-erc20-preparation-v1",
        canonical_payment_identity:
          "voidpay1:ethereum:0x" + "d".repeat(64) + ":0",
        source_chain: "ethereum",
        payment_transaction_hash: `0x${"d".repeat(64)}`,
        payment_log_index: "0",
        confirmed_block_number: "10",
        confirmation_count: "10",
        payment_usdc_units: "25000000",
        delivery_address: options.deliveryAddress ?? recipient,
        void_amount_units:
          (options.amountUnits ?? amountUnits).toString(),
        signing_authorized: false,
        transaction_broadcast_authorized: false,
        automatic_execution_authorized: false,
      },
      signing_authorized_by_this_module: false,
      transaction_broadcast_authorized_by_this_module: false,
      money_movement_authorized_by_this_module: false,
    },
    prepared: status === "prepared"
      ? {
          schema: "void_buy_void_execution_prepared_transaction_v1",
          marker: "VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1",
          attempt_id: "a".repeat(64),
          prepared_at_ms: 2,
          chain_id: "2050",
          void_delivery_tx_hash: `0x${"1".repeat(64)}`,
          fulfillment_wallet: wallet,
          delivery_address: recipient,
          void_amount_units: amountUnits.toString(),
          transaction_binding_fingerprint: "1".repeat(64),
          signed_transaction_persisted: false,
          raw_transaction_persisted: false,
          transaction_broadcast_performed_by_this_module: false,
        }
      : null,
    broadcast: null,
    failure: null,
    postbroadcast_failure: null,
    confirmation: null,
    status,
  } as any;
}

function policy(
  overrides: Partial<BuyVoidErc20TransactionPreparationPlannerPolicyV1> = {},
): BuyVoidErc20TransactionPreparationPlannerPolicyV1 {
  return {
    enabled: true,
    chain_id: "2050",
    rpc_url: "http://127.0.0.1:8545/",
    fulfillment_wallet_address: wallet,
    void_token_address: token,
    max_void_amount_units: "10000000000000",
    gas_limit_multiplier_bps: "12000",
    max_gas_limit: "100000",
    fee_multiplier_bps: "15000",
    max_fee_per_gas_wei: "200",
    max_priority_fee_per_gas_wei: "10",
    ...overrides,
  };
}

type TransportValues = {
  chain?: string;
  nonce?: string;
  gasPrice?: string;
  estimateGas?: string;
  balance?: string;
};

function transportFor(values: TransportValues = {}) {
  const calls: Array<{ method: string; params: unknown[] }> = [];
  const transport: BuyVoidErc20TransactionPreparationPlannerTransportV1 =
    async (call) => {
      calls.push({ method: call.method, params: call.params });
      if (call.method === "eth_chainId") {
        return values.chain ?? "0x802";
      }
      if (call.method === "eth_getTransactionCount") {
        return values.nonce ?? "0x7";
      }
      if (call.method === "eth_gasPrice") {
        return values.gasPrice ?? "0x64";
      }
      if (call.method === "eth_estimateGas") {
        return values.estimateGas ?? "0xc350";
      }
      if (call.method === "eth_getBalance") {
        return values.balance ?? "0x989680";
      }
      throw new Error(`unexpected method ${call.method}`);
    };
  return { calls, transport };
}

const baseTransport = transportFor();
const planned = await runBuyVoidErc20TransactionPreparationPlannerV1({
  attempt: attempt(),
  policy: policy(),
  transport: baseTransport.transport,
});
assert.equal(planned.ok, true);
if ("reason" in planned) throw new Error(String(planned.reason));
assert.equal(planned.status, "planned");
assert.equal(planned.chain_id, "2050");
assert.equal(planned.fulfillment_wallet_address, wallet);
assert.equal(planned.void_token_address, token);
assert.equal(planned.delivery_address, recipient);
assert.equal(planned.void_amount_units, amountUnits.toString());
assert.equal(planned.token_amount_atoms, amountAtoms.toString());
assert.equal(planned.transaction_value_wei, "0");
assert.equal(planned.pending_nonce, 7);
assert.equal(planned.execution_state, "pending");
assert.equal(planned.observed_gas_price_wei, "100");
assert.equal(planned.observed_estimated_gas, "50000");
assert.equal(planned.computed_gas_limit, "60000");
assert.equal(planned.computed_max_fee_per_gas_wei, "150");
assert.equal(planned.configured_priority_fee_per_gas_wei, "10");
assert.equal(planned.estimated_max_gas_cost_wei, "9000000");
assert.equal(planned.observed_wallet_balance_wei, "10000000");
assert.equal(planned.sufficient_native_gas_balance, true);
assert.deepEqual(planned.transaction_plan, {
  chain_id: "2050",
  nonce: 7,
  gas_limit: "60000",
  max_fee_per_gas_wei: "150",
  max_priority_fee_per_gas_wei: "10",
});
assert.match(planned.transfer_calldata_sha256, /^[0-9a-f]{64}$/);
assert.match(planned.preparation_fingerprint_sha256, /^[0-9a-f]{64}$/);
const decoded = transferInterface.decodeFunctionData(
  "transfer",
  planned.transfer_calldata,
);
assert.equal(String(decoded[0]).toLowerCase(), recipient);
assert.equal(BigInt(decoded[1]), amountAtoms);

assert.deepEqual(
  baseTransport.calls.map((call) => call.method),
  [
    "eth_chainId",
    "eth_getTransactionCount",
    "eth_gasPrice",
    "eth_estimateGas",
    "eth_getBalance",
  ],
);
assert.deepEqual(baseTransport.calls[1].params, [wallet, "pending"]);
assert.deepEqual(baseTransport.calls[3].params, [
  {
    from: wallet,
    to: token,
    value: "0x0",
    data: planned.transfer_calldata,
  },
  "pending",
]);
assert.deepEqual(baseTransport.calls[4].params, [wallet, "pending"]);
assert.equal(planned.mutation_performed, false);
assert.equal(planned.signing_performed, false);
assert.equal(planned.transaction_broadcast_performed, false);
assert.equal(planned.money_movement_performed, false);

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
  const address = slowDripServer.address();
  assert.ok(address && typeof address === "object");
  const requestTimeoutMs = 120;
  const startedAtMs = Date.now();
  const slowDripDecision =
    await runBuyVoidErc20TransactionPreparationPlannerV1({
      attempt: attempt(),
      policy: {
        ...policy(),
        rpc_url: `http://127.0.0.1:${address.port}/`,
        request_timeout_ms: requestTimeoutMs,
      },
    });
  const elapsedMs = Date.now() - startedAtMs;
  assert.equal(slowDripDecision.ok, false);
  if (!("reason" in slowDripDecision)) {
    throw new Error("slow-drip RPC response must hold");
  }
  assert.equal(String(slowDripDecision.reason), "rpc_call_failed");
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
  assert.equal(slowDripDecision.money_movement_performed, false);
} finally {
  await new Promise<void>((resolve, reject) => {
    slowDripServer.close((error) => {
      if (error) reject(error);
      else resolve();
    });
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
    await runBuyVoidErc20TransactionPreparationPlannerV1({
      attempt: attempt(),
      policy: {
        ...policy(),
        rpc_url: `http://127.0.0.1:${prematureCloseAddress.port}/`,
        request_timeout_ms: 1_000,
      },
    });
  assert.equal(prematureCloseDecision.ok, false);
  if (!("reason" in prematureCloseDecision)) {
    throw new Error("premature response close must hold");
  }
  assert.equal(String(prematureCloseDecision.reason), "rpc_call_failed");
  assert.deepEqual(prematureCloseDecision.rpc_methods_used, ["eth_chainId"]);
  assert.equal(prematureCloseDecision.mutation_performed, false);
  assert.equal(prematureCloseDecision.signing_performed, false);
  assert.equal(prematureCloseDecision.transaction_broadcast_performed, false);
  assert.equal(prematureCloseDecision.money_movement_performed, false);
} finally {
  await new Promise<void>((resolve, reject) =>
    prematureCloseServer.close((error) =>
      error ? reject(error) : resolve(),
    ),
  );
}

async function expectHeld(
  reason: string,
  options: {
    attemptValue?: any;
    policyValue?: BuyVoidErc20TransactionPreparationPlannerPolicyV1;
    transportValues?: TransportValues;
    expectedCalls?: number;
  } = {},
) {
  const synthetic = transportFor(options.transportValues);
  const decision = await runBuyVoidErc20TransactionPreparationPlannerV1({
    attempt: options.attemptValue ?? attempt(),
    policy: options.policyValue ?? policy(),
    transport: synthetic.transport,
  });
  assert.equal(decision.ok, false);
  if (!("reason" in decision)) {
    throw new Error("expected held decision");
  }
  assert.equal(String(decision.reason), reason);
  if (options.expectedCalls !== undefined) {
    assert.equal(synthetic.calls.length, options.expectedCalls);
  }
  assert.equal(decision.mutation_performed, false);
  assert.equal(decision.signing_performed, false);
  assert.equal(decision.transaction_broadcast_performed, false);
  assert.equal(decision.money_movement_performed, false);
}

await expectHeld("chain_id_mismatch", {
  transportValues: { chain: "0x1" },
  expectedCalls: 1,
});
await expectHeld("erc20_transfer_gas_limit_exceeds_policy", {
  transportValues: { estimateGas: "0x186a0" },
  expectedCalls: 4,
});
await expectHeld("computed_max_fee_exceeds_policy", {
  transportValues: { gasPrice: "0xc8" },
  expectedCalls: 4,
});
await expectHeld("insufficient_native_balance_for_erc20_gas", {
  transportValues: { balance: "0x89543f" },
  expectedCalls: 5,
});

const latestSufficientPendingInsufficientCalls: Array<{
  method: string;
  params: unknown[];
}> = [];
const latestSufficientPendingInsufficient =
  await runBuyVoidErc20TransactionPreparationPlannerV1({
    attempt: attempt(),
    policy: policy(),
    transport: async (call) => {
      latestSufficientPendingInsufficientCalls.push({
        method: call.method,
        params: [...call.params],
      });
      if (call.method === "eth_chainId") return "0x802";
      if (call.method === "eth_getTransactionCount") return "0x7";
      if (call.method === "eth_gasPrice") return "0x64";
      if (call.method === "eth_estimateGas") return "0xc350";
      if (call.method === "eth_getBalance") {
        return String(call.params[1] || "") === "pending"
          ? "0x89543f"
          : "0x989680";
      }
      throw new Error(`unexpected method ${call.method}`);
    },
  });
assert.equal(latestSufficientPendingInsufficient.ok, false);
if (!("reason" in latestSufficientPendingInsufficient)) {
  throw new Error("mixed-state fixture must hold");
}
assert.equal(
  latestSufficientPendingInsufficient.reason,
  "insufficient_native_balance_for_erc20_gas",
);
assert.deepEqual(
  latestSufficientPendingInsufficientCalls.at(-1)?.params,
  [wallet, "pending"],
);

await expectHeld("reserved_execution_attempt_required", {
  attemptValue: attempt({ status: "prepared" }),
  expectedCalls: 0,
});
await expectHeld("invalid_delivery_address_binding", {
  attemptValue: attempt({ deliveryAddress: token }),
  expectedCalls: 0,
});

const overflowUnits =
  ((1n << 256n) - 1n) / 1_000_000_000_000n + 1n;
await expectHeld("void_delivery_token_amount_atoms_out_of_range", {
  attemptValue: attempt({ amountUnits: overflowUnits }),
  policyValue: policy({ max_void_amount_units: overflowUnits.toString() }),
  expectedCalls: 0,
});

await expectHeld("erc20_transaction_preparation_planner_disabled", {
  policyValue: policy({ enabled: false }),
  expectedCalls: 0,
});

assert.equal(
  VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_AUTHORITY_V1
    .canonical_chain_id,
  "2050",
);
assert.equal(
  VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_AUTHORITY_V1
    .transaction_value_wei,
  "0",
);
assert.equal(
  VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_AUTHORITY_V1
    .gas_only_native_balance_accounting,
  true,
);
assert.equal(
  VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_AUTHORITY_V1
    .execution_state_tag,
  "pending",
);
assert.equal(
  VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_AUTHORITY_V1
    .filesystem_write,
  false,
);
assert.equal(
  VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_AUTHORITY_V1
    .wallet_access,
  false,
);
assert.equal(
  VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_AUTHORITY_V1
    .signing,
  false,
);
assert.equal(
  VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_AUTHORITY_V1
    .transaction_broadcast,
  false,
);
assert.equal(
  VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_AUTHORITY_V1
    .money_movement,
  false,
);

console.log(
  "VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_V1_PROOF_GREEN",
);
console.log("chain_id=2050");
console.log("canonical_asset=void_token_erc20");
console.log("transaction_value_wei=0");
console.log("pending_nonce_required=true");
console.log("execution_state=pending");
console.log("gas_estimate_state=pending");
console.log("balance_state=pending");
console.log("latest_sufficient_pending_insufficient_hold=1");
console.log("exact_transfer_calldata=true");
console.log("gas_estimate_bound=true");
console.log("gas_only_native_balance_accounting=true");
console.log("rpc_inactivity_timeout_enforced=true");
console.log("rpc_total_deadline_enforced=true");
console.log("premature_response_close_hold=1");
console.log("mutation_performed=false");
console.log("wallet_access=false");
console.log("signing_performed=false");
console.log("transaction_broadcast_performed=false");
console.log("money_movement_performed=false");
