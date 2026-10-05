#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  resolveCoupledNativeGasReconciliationEvidenceV1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_AUTHORITY_V1,
  type CoupledNativeGasReconciliationEvidenceRpcTransportV1,
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

function transportFor(
  outcome: "confirmed" | "reverted",
  options: {
    chain_id?: string;
    transaction_hash?: string;
    status?: string;
    gas_used?: string;
    effective_gas_price?: string;
    from?: string;
    to?: string;
    current_block?: string;
    on_call?: (
      method: "eth_chainId" | "eth_getTransactionReceipt" | "eth_blockNumber",
    ) => void;
  } = {},
): CoupledNativeGasReconciliationEvidenceRpcTransportV1 {
  return async ({ method }) => {
    options.on_call?.(method);
    if (method === "eth_chainId") {
      return options.chain_id ?? "0x802";
    }
    if (method === "eth_getTransactionReceipt") {
      return {
        transactionHash:
          options.transaction_hash ?? deliveryTx,
        blockNumber: "0x64",
        blockHash:
          outcome === "confirmed"
            ? blockHash
            : "0x" + "8".repeat(64),
        status:
          options.status ??
          (outcome === "confirmed" ? "0x1" : "0x0"),
        gasUsed: options.gas_used ?? "0x5208",
        effectiveGasPrice:
          options.effective_gas_price ?? "0x5",
        from: options.from ?? wallet,
        to: options.to ?? delivery,
      };
    }
    return options.current_block ?? "0x66";
  };
}

const policy = {
  chain_id: "2050" as const,
  rpc_url: "http://127.0.0.1:18553/",
  required_min_confirmations: "2",
  request_timeout_ms: 5000,
  max_response_bytes: 65536,
};

const confirmed = setupFixture("confirmed", "confirmed");
const before = snapshotTree(confirmed.root);
const happy = await resolveCoupledNativeGasReconciliationEvidenceV1({
  root_dir: confirmed.root,
  liability: confirmed.liability,
  policy,
  transport: transportFor("confirmed"),
});
assert.equal(snapshotTree(confirmed.root), before);
assert.equal(happy.ok, true);
if (!happy.ok) throw new Error(happy.reason);
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
  const wrongChain = await resolveCoupledNativeGasReconciliationEvidenceV1({
    root_dir: confirmed.root,
    liability: confirmed.liability,
    policy,
    transport: transportFor("confirmed", { chain_id: "0x1" }),
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
  const wrongReceipt =
    await resolveCoupledNativeGasReconciliationEvidenceV1({
      root_dir: confirmed.root,
      liability: confirmed.liability,
      policy,
      transport: transportFor("confirmed", {
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
      policy,
      transport: transportFor("confirmed", {
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
      transport: transportFor("confirmed"),
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
      policy,
      transport: transportFor("confirmed"),
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
      policy,
      transport: transportFor("confirmed"),
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
      policy,
      transport: transportFor("confirmed", {
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
      policy,
      transport: transportFor("reverted"),
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
    "descriptor_bound_local_snapshot",
    "local_snapshot_revalidated_after_rpc",
    "numeric_loopback_http_only",
    "chain2050_required",
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

console.log(
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_V1_GREEN",
);
console.log("exact_prepared_plan_lineage=true");
console.log("derived_attempt_id_only=true");
console.log("whole_terminal_outcome_state=true");
console.log("numeric_loopback_chain2050_only=true");
console.log("local_snapshot_revalidated_after_rpc=true");
console.log("reverted_liability_release=false");
console.log("filesystem_publication=false");
console.log("rpc_write=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("liability_release_authorized=false");
console.log("funds_movement=false");
