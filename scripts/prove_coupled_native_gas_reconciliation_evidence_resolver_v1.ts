#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import * as http from "node:http";
import os from "node:os";
import path from "node:path";

import {
  resolveCoupledNativeGasReconciliationEvidenceV1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_AUTHORITY_V1,
} from "../src/economic/coupled_native_gas_reconciliation_evidence_resolver_v1.js";
import {
  reserveBuyVoidPreparedTransactionPlanV1,
} from "../src/economic/buy_void_prepared_transaction_plan_reservation_v1.js";
import {
  prepareBuyVoidExecutionTransactionV1,
  recordBuyVoidExecutionBroadcastV1,
  recordBuyVoidExecutionConfirmedV1,
  reserveBuyVoidExecutionAttemptV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  recordBuyVoidBroadcastConfirmedV1,
  recordBuyVoidBroadcastRevertedV1,
} from "../src/economic/buy_void_broadcast_outcome_journal_v1.js";
import {
  confirmBuyVoidFulfillmentV1,
} from "../src/economic/buy_void_fulfillment_confirmation_v1.js";
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
  buildCoupledNativeGasPayerObservationV1,
  classifyCoupledNativeGasBuyVoidAdmissionV1,
} from "../src/economic/coupled_native_gas_liability_v1.js";

const delivery = "0x1111111111111111111111111111111111111111";
const receive = "0x2222222222222222222222222222222222222222";
const usdc = "0x3333333333333333333333333333333333333333";
const wallet = "0x4444444444444444444444444444444444444444";
const paymentTx = `0x${"a".repeat(64)}`;
const deliveryTx = `0x${"b".repeat(64)}`;
const blockHash = `0x${"9".repeat(64)}`;
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const nativeValueWei =
  (50_000_000n * 1_000_000_000_000n).toString();

function topic(address: string): string {
  return `0x${"0".repeat(24)}${address.slice(2)}`;
}

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

const executionPolicy = {
  attempt_journal_enabled: true,
  max_attempts_per_payment: 1,
  chain_id: 2050,
  fulfillment_wallet_allowlist: [wallet],
};

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error("noncanonical_value");
    return encoded;
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  const record = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
      .join(",") +
    "}"
  );
}

function sha256Canonical(value: unknown): string {
  return crypto.createHash("sha256").update(canonical(value), "utf8").digest("hex");
}

function stableFingerprint(parts: Record<string, string>): string {
  return crypto
    .createHash("sha256")
    .update(
      Object.keys(parts)
        .sort()
        .map((key) => key + "=" + parts[key])
        .join("\n"),
      "utf8",
    )
    .digest("hex");
}

function snapshotTree(root: string): string {
  const rows: string[] = [];
  const visit = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      const relative = path.relative(root, full);
      const stat = fs.lstatSync(full);
      if (entry.isDirectory()) {
        rows.push(`d|${relative}|${stat.mode & 0o777}`);
        visit(full);
      } else {
        rows.push(
          `f|${relative}|${stat.mode & 0o777}|` +
          crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex"),
        );
      }
    }
  };
  visit(root);
  return crypto.createHash("sha256").update(rows.join("\n")).digest("hex");
}

async function withOnePathReadSubstitution<T>(
  targetPath: string,
  replacementUtf8: string,
  operation: () => Promise<T>,
): Promise<{ value: T; injected: boolean }> {
  const original = fs.readFileSync as any;
  const target = path.resolve(targetPath);
  let injected = false;
  (fs as any).readFileSync = (candidate: any, ...args: any[]) => {
    if (
      !injected &&
      typeof candidate === "string" &&
      path.resolve(candidate) === target
    ) {
      injected = true;
      return replacementUtf8;
    }
    return original(candidate, ...args);
  };
  try {
    return {
      value: await operation(),
      injected,
    };
  } finally {
    (fs as any).readFileSync = original;
  }
}

async function withOnePathGrowthAfterOpen<T>(
  targetPath: string,
  operation: () => Promise<T>,
): Promise<{ value: T; injected: boolean }> {
  const original = fs.readSync as any;
  const target = path.resolve(targetPath);
  let injected = false;
  (fs as any).readSync = (fd: number, ...args: any[]) => {
    if (!injected) {
      let openedPath = "";
      try {
        openedPath = path.resolve(
          fs.readlinkSync("/proc/self/fd/" + String(fd)),
        );
      } catch {
        openedPath = "";
      }
      if (openedPath === target) {
        injected = true;
        fs.appendFileSync(
          target,
          Buffer.alloc(1024 * 1024 + 128, 0x20),
        );
      }
    }
    return original(fd, ...args);
  };
  try {
    return {
      value: await operation(),
      injected,
    };
  } finally {
    (fs as any).readSync = original;
  }
}

function makeBaseRequest(): BuyVoidRequestV1 {
  return {
    request_id: "buyvoid_reconciliation_evidence_v1",
    source_chain: "base",
    tx_hash: paymentTx,
    delivery_address: delivery,
    receive_address: receive,
    usdc_amount: "25",
    quoted_void: "50",
  };
}

function setupFixture(label: string, terminal: "confirmed" | "reverted") {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), `void-native-gas-resolver-${label}-`),
  );
  fs.chmodSync(root, 0o700);

  const request = makeBaseRequest();
  const paymentReceipt: BuyVoidTransactionReceiptV2 = {
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
  };
  const verified = buildBuyVoidVerifiedPaymentEventV2({
    request,
    receipt: paymentReceipt,
    policy: {
      allowed_chains: ["base"],
      usdc_contract_by_chain: { base: usdc },
      receive_address_by_chain: { base: receive },
      current_block_number_by_chain: { base: 105 },
    },
  });
  if ("reason" in verified) throw new Error(verified.reason);

  const claimed = claimBuyVoidFulfillmentJournalV1({
    root_dir: root,
    request,
    verified_payment_event: verified.event,
    policy: fulfillmentPolicy,
    now_ms: 1_800_000_000_000,
  });
  if ("reason" in claimed) throw new Error(claimed.reason);

  const reservedAttempt = reserveBuyVoidExecutionAttemptV1({
    root_dir: root,
    intent: claimed.intent,
    policy: executionPolicy,
    now_ms: 1_800_000_000_100,
  });
  if ("reason" in reservedAttempt) {
    throw new Error(reservedAttempt.reason);
  }
  const attemptId = reservedAttempt.attempt.reservation.attempt_id;

  const planDecision = reserveBuyVoidPreparedTransactionPlanV1({
    root_dir: root,
    saga_id: "voidbvfsg1_" + "7".repeat(64),
    attempt_id: attemptId,
    chain_id: "2050",
    wallet_address: wallet,
    observed_pending_nonce: 7,
    delivery_address: delivery,
    native_value_wei: nativeValueWei,
    gas_limit: "21000",
    max_fee_per_gas_wei: "10",
    max_priority_fee_per_gas_wei: "1",
    economic_policy_fingerprint_sha256: "c".repeat(64),
    preparation_policy_fingerprint_sha256: "d".repeat(64),
    now_ms: 1_800_000_000_200,
  });
  if ("reason" in planDecision) throw new Error(planDecision.reason);
  const plan = planDecision.reservation;

  const prepared = prepareBuyVoidExecutionTransactionV1({
    root_dir: root,
    attempt_id: attemptId,
    intent: claimed.intent,
    policy: executionPolicy,
    transaction: {
      chain_id: 2050,
      transaction_hash: deliveryTx,
      from_address: wallet,
      to_address: delivery,
      amount_units: "50000000",
    },
    now_ms: 1_800_000_000_300,
  });
  if ("reason" in prepared) throw new Error(prepared.reason);

  const broadcast = recordBuyVoidExecutionBroadcastV1({
    root_dir: root,
    attempt_id: attemptId,
    transaction_hash: deliveryTx,
    provider_submission_id: "resolver-proof-submit",
    now_ms: 1_800_000_000_400,
  });
  if ("reason" in broadcast) throw new Error(broadcast.reason);

  if (terminal === "confirmed") {
    const confirmation = confirmBuyVoidFulfillmentV1({
      intent: claimed.intent,
      observation: {
        chain_id: 2050,
        transaction_hash: deliveryTx,
        transaction_status: 1,
        block_number: 100,
        block_hash: blockHash,
        current_block_number: 105,
        from_address: wallet,
        to_address: delivery,
        amount_units: "50000000",
      },
      policy: {
        chain_id: 2050,
        min_confirmations: 3,
        fulfillment_wallet_allowlist: [wallet],
      },
    });
    if ("reason" in confirmation) throw new Error(confirmation.reason);

    const executionConfirmed = recordBuyVoidExecutionConfirmedV1({
      root_dir: root,
      attempt_id: attemptId,
      confirmed_record: confirmation.record,
      delivery_block_hash: blockHash,
      now_ms: 1_800_000_000_500,
    });
    if ("reason" in executionConfirmed) {
      throw new Error(executionConfirmed.reason);
    }

    const outcome = recordBuyVoidBroadcastConfirmedV1({
      root_dir: root,
      attempt_id: attemptId,
      transaction_hash: deliveryTx,
      confirmed_record: confirmation.record,
      now_ms: 1_800_000_000_600,
    });
    if ("reason" in outcome) throw new Error(outcome.reason);
  } else {
    const outcome = recordBuyVoidBroadcastRevertedV1({
      root_dir: root,
      attempt_id: attemptId,
      transaction_hash: deliveryTx,
      observation: {
        chain_id: 2050,
        transaction_status: 0,
        block_number: 100,
        current_block_number: 102,
      },
      policy: {
        outcome_journal_enabled: true,
        chain_id: 2050,
        min_revert_confirmations: 2,
      },
      now_ms: 1_800_000_000_600,
    });
    if ("reason" in outcome) throw new Error(outcome.reason);
  }

  const payerObservation = buildCoupledNativeGasPayerObservationV1({
    payer_address: wallet,
    observed_native_balance_wei:
      (BigInt(nativeValueWei) + 10_000_000n).toString(),
    required_max_fee_per_gas_wei: "9",
    observed_at_ms: 1000,
    expires_at_ms: 2000,
    source_identity_sha256: "e".repeat(64),
  });
  const liabilityDecision = classifyCoupledNativeGasBuyVoidAdmissionV1({
    now_ms: 1500,
    buy_void_plan: plan,
    payer_observation: payerObservation,
    open_liabilities: [],
  });
  if (liabilityDecision.ok !== true) {
    throw new Error(liabilityDecision.reason);
  }

  return {
    root,
    plan,
    liability: liabilityDecision.liability,
    outcome: terminal,
  };
}

type RpcScenarioOptionsV1 = {
  chain_id?: string;
  transaction_hash?: string;
  status?: string;
  gas_used?: string;
  effective_gas_price?: string;
  from?: string;
  to?: string;
  current_block?: string;
  receipt_patch?: Record<string, unknown>;
  on_call?: (
    method: "eth_chainId" | "eth_getTransactionReceipt" | "eth_blockNumber",
  ) => void;
};

let rpcScenario: {
  outcome: "confirmed" | "reverted";
  options: RpcScenarioOptionsV1;
} = {
  outcome: "confirmed",
  options: {},
};

function rpcResultFor(
  method: "eth_chainId" | "eth_getTransactionReceipt" | "eth_blockNumber",
): unknown {
  const { outcome, options } = rpcScenario;
  options.on_call?.(method);
  if (method === "eth_chainId") {
    return options.chain_id ?? "0x802";
  }
  if (method === "eth_getTransactionReceipt") {
    return {
      transactionHash:
        options.transaction_hash ?? deliveryTx,
      transactionIndex: "0x0",
      blockNumber: "0x64",
      blockHash:
        outcome === "confirmed"
          ? blockHash
          : "0x" + "8".repeat(64),
      status:
        options.status ??
        (outcome === "confirmed" ? "0x1" : "0x0"),
      gasUsed: options.gas_used ?? "0x5208",
      cumulativeGasUsed: "0x5208",
      effectiveGasPrice:
        options.effective_gas_price ?? "0x5",
      from: options.from ?? wallet,
      to: options.to ?? delivery,
      contractAddress: null,
      logs: [],
      logsBloom: "0x" + "0".repeat(512),
      type: "0x2",
      ...(options.receipt_patch || {}),
    };
  }
  return options.current_block ?? "0x69";
}

const rpcServer = http.createServer((request, response) => {
  const chunks: Buffer[] = [];
  request.on("data", (chunk: Buffer) => chunks.push(chunk));
  request.on("end", () => {
    let payload: any;
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "invalid_json" }));
      return;
    }
    const method = String(payload?.method || "") as
      | "eth_chainId"
      | "eth_getTransactionReceipt"
      | "eth_blockNumber";
    if (
      payload?.jsonrpc !== "2.0" ||
      !Number.isSafeInteger(payload?.id) ||
      ![
        "eth_chainId",
        "eth_getTransactionReceipt",
        "eth_blockNumber",
      ].includes(method)
    ) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        jsonrpc: "2.0",
        id: payload?.id ?? null,
        error: { code: -32601, message: "method not found" },
      }));
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({
      jsonrpc: "2.0",
      id: payload.id,
      result: rpcResultFor(method),
    }));
  });
});

await new Promise<void>((resolve, reject) => {
  rpcServer.once("error", reject);
  rpcServer.listen(0, "127.0.0.1", () => resolve());
});
const rpcAddress = rpcServer.address();
if (!rpcAddress || typeof rpcAddress === "string") {
  throw new Error("resolver_proof_rpc_server_address_invalid");
}

const policy = {
  chain_id: "2050" as const,
  rpc_url: `http://127.0.0.1:${rpcAddress.port}/`,
  required_min_confirmations: "2",
  request_timeout_ms: 5000,
  max_response_bytes: 65536,
};

function rpcPolicy(
  outcome: "confirmed" | "reverted",
  options: RpcScenarioOptionsV1 = {},
): typeof policy {
  rpcScenario = { outcome, options };
  return policy;
}

const confirmed = setupFixture("confirmed", "confirmed");
const before = snapshotTree(confirmed.root);
const happy = await resolveCoupledNativeGasReconciliationEvidenceV1({
  root_dir: confirmed.root,
  liability: confirmed.liability,
  policy: rpcPolicy("confirmed"),
});
assert.equal(snapshotTree(confirmed.root), before);
if (!happy.ok) {
  throw new Error(
    "happy_path_hold:" + happy.stage + ":" + happy.reason,
  );
}
assert.equal(happy.ok, true);
assert.equal(happy.status, "reconciliation_evidence_resolved");
assert.equal(happy.packet.liability_id, confirmed.liability.liability_id);
assert.equal(
  happy.packet.prepared_plan_reservation_id,
  confirmed.plan.reservation_id,
);
assert.equal(happy.packet.attempt_id, confirmed.plan.attempt_id);
assert.equal(happy.packet.transaction_hash, deliveryTx);
assert.deepEqual(happy.packet.rpc_methods_used, [
  "eth_chainId",
  "eth_getTransactionReceipt",
  "eth_blockNumber",
]);
assert.equal(happy.packet.terminal_cost_evidence.outcome, "confirmed");
assert.equal(happy.packet.reconciliation.outcome, "confirmed");
assert.equal(happy.packet.mutation_performed, false);
assert.equal(happy.packet.liability_release_authorized, false);
assert.match(happy.packet.packet_id, /^[0-9a-f]{64}$/u);

{
  const divergent = setupFixture(
    "confirmation-journal-divergence",
    "confirmed",
  );
  const outcomePath = path.join(
    divergent.root,
    "buy-void-broadcast-outcomes-v1",
    "attempts",
    divergent.plan.attempt_id,
    "confirmed.json",
  );
  const outcome = JSON.parse(
    fs.readFileSync(outcomePath, "utf8"),
  );
  const record = {
    ...outcome.confirmed_record,
    request_id:
      String(outcome.confirmed_record.request_id) + "_diverged",
  };
  record.delivery_binding_fingerprint = stableFingerprint({
    canonical_payment_identity:
      String(record.canonical_payment_identity),
    request_id: String(record.request_id),
    instruction_id: String(record.instruction_id),
    delivery_chain_id: "2050",
    void_delivery_tx_hash: String(record.void_delivery_tx_hash),
    delivery_block_number: String(record.delivery_block_number),
    delivery_block_hash: String(record.delivery_block_hash),
    fulfillment_wallet: String(record.fulfillment_wallet),
    delivery_address: String(record.delivery_address),
    void_amount_units: String(record.void_amount_units),
  });
  outcome.confirmed_record = record;
  outcome.confirmation_fingerprint = stableFingerprint({
    marker: String(record.marker),
    canonical_payment_identity:
      String(record.canonical_payment_identity),
    request_id: String(record.request_id),
    instruction_id: String(record.instruction_id),
    void_delivery_tx_hash: String(record.void_delivery_tx_hash),
    delivery_block_hash: String(record.delivery_block_hash),
    fulfillment_wallet: String(record.fulfillment_wallet),
    delivery_address: String(record.delivery_address),
    void_amount_units: String(record.void_amount_units),
    delivery_block_number: String(record.delivery_block_number),
    delivery_binding_fingerprint:
      String(record.delivery_binding_fingerprint),
  });
  fs.writeFileSync(
    outcomePath,
    JSON.stringify(outcome, null, 2) + "\n",
    { mode: 0o600 },
  );

  const held =
    await resolveCoupledNativeGasReconciliationEvidenceV1({
      root_dir: divergent.root,
      liability: divergent.liability,
      policy: rpcPolicy("confirmed"),
    });
  assert.equal(held.ok, false);
  if (held.ok) {
    throw new Error("expected confirmation-journal divergence HOLD");
  }
  assert.equal(held.stage, "terminal_outcome");
  assert.equal(
    held.reason,
    "reconciliation_evidence_confirmation_journal_mismatch",
  );
  assert.deepEqual(held.rpc_methods_used, []);
}

{
  const aliasParent = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-native-gas-resolver-symlink-ancestor-"),
  );
  fs.chmodSync(aliasParent, 0o700);
  const aliasRoot = path.join(aliasParent, "root-link");
  fs.symlinkSync(confirmed.root, aliasRoot, "dir");
  try {
    const decision =
      await resolveCoupledNativeGasReconciliationEvidenceV1({
        root_dir: aliasRoot,
        liability: confirmed.liability,
        policy: rpcPolicy("confirmed"),
      });
    assert.equal(decision.ok, false);
    if (decision.ok) {
      throw new Error("expected symlink-ancestor HOLD");
    }
    assert.equal(decision.stage, "plan");
    assert.equal(
      decision.reason,
      "reconciliation_evidence_plan_namespace_ancestor_open_failed",
    );
    assert.deepEqual(decision.rpc_methods_used, []);
  } finally {
    fs.rmSync(aliasParent, { recursive: true, force: true });
  }
}

{
  const grown = setupFixture("snapshot-grow", "confirmed");
  const walletKey = crypto
    .createHash("sha256")
    .update("void-buy-wallet-v1\n2050\n" + wallet, "utf8")
    .digest("hex");
  const planPath = path.join(
    grown.root,
    "buy-void-prepared-transaction-plan-reservation-v1",
    "wallets",
    walletKey,
    "nonces",
    String(grown.plan.nonce).padStart(16, "0") + ".json",
  );
  const result = await withOnePathGrowthAfterOpen(
    planPath,
    () =>
      resolveCoupledNativeGasReconciliationEvidenceV1({
        root_dir: grown.root,
        liability: grown.liability,
        policy: rpcPolicy("confirmed"),
      }),
  );
  assert.equal(result.injected, true);
  assert.equal(result.value.ok, false);
  if (result.value.ok) {
    throw new Error("expected bounded snapshot read HOLD");
  }
  assert.equal(result.value.stage, "plan");
  assert.equal(
    result.value.reason,
    "reconciliation_evidence_plan_namespace_file_too_large_during_read",
  );
}

{
  const swapped = setupFixture("plan-reader-swap", "confirmed");
  const walletKey = crypto
    .createHash("sha256")
    .update("void-buy-wallet-v1\n2050\n" + wallet, "utf8")
    .digest("hex");
  const planPath = path.join(
    swapped.root,
    "buy-void-prepared-transaction-plan-reservation-v1",
    "wallets",
    walletKey,
    "nonces",
    String(swapped.plan.nonce).padStart(16, "0") + ".json",
  );
  const alternatePlan = {
    ...swapped.plan,
    reserved_at_ms: swapped.plan.reserved_at_ms + 1,
  };
  const result = await withOnePathReadSubstitution(
    planPath,
    JSON.stringify(alternatePlan, null, 2) + "\n",
    () =>
      resolveCoupledNativeGasReconciliationEvidenceV1({
        root_dir: swapped.root,
        liability: swapped.liability,
        policy: rpcPolicy("confirmed"),
      }),
  );
  assert.equal(result.injected, true);
  assert.equal(result.value.ok, false);
  if (result.value.ok) {
    throw new Error("expected plan reader/snapshot HOLD");
  }
  assert.equal(result.value.stage, "plan");
  assert.equal(
    result.value.reason,
    "reconciliation_evidence_plan_reader_snapshot_mismatch",
  );
}

{
  const swapped = setupFixture("outcome-reader-swap", "confirmed");
  const outcomePath = path.join(
    swapped.root,
    "buy-void-broadcast-outcomes-v1",
    "attempts",
    swapped.plan.attempt_id,
    "confirmed.json",
  );
  const originalOutcome = JSON.parse(
    fs.readFileSync(outcomePath, "utf8"),
  );
  const alternateOutcome = {
    ...originalOutcome,
    recorded_at_ms: Number(originalOutcome.recorded_at_ms) + 1,
  };
  const result = await withOnePathReadSubstitution(
    outcomePath,
    JSON.stringify(alternateOutcome, null, 2) + "\n",
    () =>
      resolveCoupledNativeGasReconciliationEvidenceV1({
        root_dir: swapped.root,
        liability: swapped.liability,
        policy: rpcPolicy("confirmed"),
      }),
  );
  assert.equal(result.injected, true);
  assert.equal(result.value.ok, false);
  if (result.value.ok) {
    throw new Error("expected outcome reader/snapshot HOLD");
  }
  assert.equal(result.value.stage, "snapshot");
  assert.equal(
    result.value.reason,
    "reconciliation_evidence_outcome_reader_snapshot_mismatch",
  );
}

{
  const wrongChain = await resolveCoupledNativeGasReconciliationEvidenceV1({
    root_dir: confirmed.root,
    liability: confirmed.liability,
    policy: rpcPolicy("confirmed", { chain_id: "0x1" }),
  });
  assert.equal(wrongChain.ok, false);
  if (wrongChain.ok) throw new Error("expected chain-id HOLD");
  assert.equal(wrongChain.stage, "rpc");
  assert.equal(
    wrongChain.reason,
    "reconciliation_evidence_rpc_chain_id_mismatch",
  );
}

{
  const missingField =
    await resolveCoupledNativeGasReconciliationEvidenceV1({
      root_dir: confirmed.root,
      liability: confirmed.liability,
      policy: rpcPolicy("confirmed", {
        receipt_patch: { effectiveGasPrice: undefined },
      }),
    });
  assert.equal(missingField.ok, false);
  if (missingField.ok) {
    throw new Error("expected missing receipt field HOLD");
  }
  assert.equal(missingField.stage, "rpc");
  assert.equal(
    missingField.reason,
    "reconciliation_evidence_receipt_required_field_invalid",
  );
}

{
  const wrongType =
    await resolveCoupledNativeGasReconciliationEvidenceV1({
      root_dir: confirmed.root,
      liability: confirmed.liability,
      policy: rpcPolicy("confirmed", {
        receipt_patch: { gasUsed: 21000 },
      }),
    });
  assert.equal(wrongType.ok, false);
  if (wrongType.ok) {
    throw new Error("expected wrong-type receipt field HOLD");
  }
  assert.equal(wrongType.stage, "rpc");
  assert.equal(
    wrongType.reason,
    "reconciliation_evidence_receipt_required_field_invalid",
  );
}

{
  const wrongReceipt =
    await resolveCoupledNativeGasReconciliationEvidenceV1({
      root_dir: confirmed.root,
      liability: confirmed.liability,
      policy: rpcPolicy("confirmed", {
        transaction_hash: "0x" + "2".repeat(64),
      }),
    });
  assert.equal(wrongReceipt.ok, false);
  if (wrongReceipt.ok) throw new Error("expected receipt HOLD");
  assert.equal(wrongReceipt.stage, "terminal_cost");
  assert.equal(
    wrongReceipt.reason,
    "coupled_native_gas_terminal_cost_receipt_identity_mismatch",
  );
}

{
  const insufficient =
    await resolveCoupledNativeGasReconciliationEvidenceV1({
      root_dir: confirmed.root,
      liability: confirmed.liability,
      policy: rpcPolicy("confirmed", {
        current_block: "0x64",
      }),
    });
  assert.equal(insufficient.ok, false);
  if (insufficient.ok) throw new Error("expected confirmation HOLD");
  assert.equal(insufficient.stage, "terminal_cost");
  assert.equal(
    insufficient.reason,
    "coupled_native_gas_terminal_cost_confirmations_insufficient",
  );
}

{
  const badPolicy =
    await resolveCoupledNativeGasReconciliationEvidenceV1({
      root_dir: confirmed.root,
      liability: confirmed.liability,
      policy: {
        ...policy,
        rpc_url: "http://localhost:18553/",
      },
    });
  assert.equal(badPolicy.ok, false);
  if (badPolicy.ok) throw new Error("expected loopback-policy HOLD");
  assert.equal(badPolicy.stage, "policy");
  assert.equal(
    badPolicy.reason,
    "reconciliation_evidence_rpc_url_must_be_numeric_loopback",
  );
}

{
  const alteredBody = {
    schema: confirmed.liability.schema,
    marker: confirmed.liability.marker,
    version: confirmed.liability.version,
    lane: confirmed.liability.lane,
    obligation_id: confirmed.liability.obligation_id,
    payer_address: confirmed.liability.payer_address,
    nonce: confirmed.liability.nonce + 1,
    transaction_plan_fingerprint_sha256:
      confirmed.liability.transaction_plan_fingerprint_sha256,
    transaction_native_value_wei:
      confirmed.liability.transaction_native_value_wei,
    gas_limit: confirmed.liability.gas_limit,
    admitted_max_fee_per_gas_wei:
      confirmed.liability.admitted_max_fee_per_gas_wei,
    attempt_limit: confirmed.liability.attempt_limit,
    maximum_reserved_wei: confirmed.liability.maximum_reserved_wei,
    fee_observation_sha256:
      confirmed.liability.fee_observation_sha256,
    source_evidence_kind:
      confirmed.liability.source_evidence_kind,
    source_evidence_id: confirmed.liability.source_evidence_id,
    status: confirmed.liability.status,
  } as const;
  const alteredLiability = {
    ...alteredBody,
    liability_id: sha256Canonical(alteredBody),
  };
  const altered =
    await resolveCoupledNativeGasReconciliationEvidenceV1({
      root_dir: confirmed.root,
      liability: alteredLiability,
      policy: rpcPolicy("confirmed"),
    });
  assert.equal(altered.ok, false);
  if (altered.ok) throw new Error("expected plan-binding HOLD");
  assert.equal(altered.stage, "plan");
  assert.equal(
    altered.reason,
    "reconciliation_evidence_plan_liability_binding_mismatch",
  );
}

{
  const invalidIdentity = {
    ...confirmed.liability,
    liability_id: "0".repeat(64),
  };
  const held =
    await resolveCoupledNativeGasReconciliationEvidenceV1({
      root_dir: confirmed.root,
      liability: invalidIdentity,
      policy: rpcPolicy("confirmed"),
    });
  assert.equal(held.ok, false);
  if (held.ok) throw new Error("expected liability identity HOLD");
  assert.equal(held.stage, "liability");
  assert.equal(
    held.reason,
    "reconciliation_evidence_liability_identity_mismatch",
  );
}

{
  const raced = setupFixture("race", "confirmed");
  const outcomePath = path.join(
    raced.root,
    "buy-void-broadcast-outcomes-v1",
    "attempts",
    raced.plan.attempt_id,
    "confirmed.json",
  );
  const decision =
    await resolveCoupledNativeGasReconciliationEvidenceV1({
      root_dir: raced.root,
      liability: raced.liability,
      policy: rpcPolicy("confirmed", {
        on_call(method) {
          if (method === "eth_blockNumber") {
            const now = new Date(Date.now() + 1000);
            fs.utimesSync(outcomePath, now, now);
          }
        },
      }),
    });
  assert.equal(decision.ok, false);
  if (decision.ok) throw new Error("expected snapshot HOLD");
  assert.equal(decision.stage, "snapshot");
  assert.equal(
    decision.reason,
    "reconciliation_evidence_local_state_changed_during_resolution",
  );
}

{
  const reverted = setupFixture("reverted", "reverted");
  const decision =
    await resolveCoupledNativeGasReconciliationEvidenceV1({
      root_dir: reverted.root,
      liability: reverted.liability,
      policy: rpcPolicy("reverted"),
    });
  assert.equal(decision.ok, false);
  if (decision.ok) throw new Error("expected reverted reconciliation HOLD");
  assert.equal(decision.stage, "reconciliation");
  assert.equal(
    decision.reason,
    "coupled_native_gas_reconciliation_reverted_disposition_unresolved",
  );
  assert.equal(decision.terminal_cost_evidence?.outcome, "reverted");
}

for (const [key, value] of Object.entries(
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_AUTHORITY_V1,
)) {
  const expectedTrue = new Set([
    "source_contract",
    "read_only_resolver",
    "presale_only",
    "exact_liability_required",
    "exact_prepared_plan_namespace",
    "exact_prepared_plan_binding_required",
    "derived_attempt_id_only",
    "whole_execution_attempt_state_required",
    "whole_broadcast_outcome_state_required",
    "execution_broadcast_confirmation_binding_required",
    "descriptor_bound_local_snapshot",
    "nofollow_ancestor_traversal",
    "bounded_snapshot_read_during_growth",
    "reader_outputs_bound_to_snapshot",
    "local_snapshot_revalidated_after_rpc",
    "numeric_loopback_http_only",
    "chain2050_required",
    "rpc_receipt_projected_to_classifier_schema",
    "bounded_rpc_timeout",
    "bounded_rpc_response_bytes",
    "terminal_cost_classifier_reused",
    "liability_reconciliation_classifier_reused",
    "filesystem_read",
  ]);
  if (key === "read_only_rpc_methods") {
    assert.deepEqual(value, [
      "eth_chainId",
      "eth_getTransactionReceipt",
      "eth_blockNumber",
    ]);
  } else {
    assert.equal(value, expectedTrue.has(key), key);
  }
}
assert.equal(
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_AUTHORITY_V1
    .caller_transport_override,
  false,
);

await new Promise<void>((resolve, reject) => {
  rpcServer.close((error) => {
    if (error) reject(error);
    else resolve();
  });
});

console.log(
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_V1_GREEN",
);
console.log("exact_prepared_plan_lineage=true");
console.log("derived_attempt_id_only=true");
console.log("whole_terminal_outcome_state=true");
console.log("execution_broadcast_confirmation_journals_bound=true");
console.log("divergent_confirmation_journals_hold_before_rpc=true");
console.log("numeric_loopback_chain2050_only=true");
console.log("caller_transport_override=false");
console.log("real_loopback_http_proof=true");
console.log("realistic_rpc_receipt_projection=true");
console.log("receipt_missing_or_wrong_type_hold=true");
console.log("bounded_snapshot_read_during_growth=true");
console.log("nofollow_ancestor_traversal=true");
console.log("symlink_ancestor_before_rpc_hold=true");
console.log("reader_outputs_bound_to_snapshot=true");
console.log("plan_reader_swap_restore_hold=true");
console.log("outcome_reader_swap_restore_hold=true");
console.log("local_snapshot_revalidated_after_rpc=true");
console.log("reverted_liability_release=false");
console.log("filesystem_publication=false");
console.log("rpc_write=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("liability_release_authorized=false");
console.log("funds_movement=false");
