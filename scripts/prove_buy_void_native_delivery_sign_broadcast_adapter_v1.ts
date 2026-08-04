import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  Transaction,
  Wallet,
} from "ethers";
import {
  VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1,
  VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_CONFIRMATION_V1,
  VOID_BUY_VOID_NATIVE_DELIVERY_UNIT_SCALE_V1,
  runBuyVoidNativeDeliverySignBroadcastV1,
  type BuyVoidNativeDeliverySignBroadcastDependenciesV1,
  type BuyVoidNativeDeliverySignBroadcastInputV1,
  type BuyVoidNativeDeliveryTransactionPlanV1,
} from "../src/economic/buy_void_native_delivery_sign_broadcast_adapter_v1.js";
import {
  createBuyVoidDeliverySubmissionGuardV1,
} from "../src/economic/buy_void_delivery_submission_guard_v1.js";
import type {
  BuyVoidExecutionAttemptStateV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";

const wallet = new Wallet(`0x${"11".repeat(32)}`);
const recipient =
  new Wallet(`0x${"22".repeat(32)}`).address.toLowerCase();
const amount = 50_000_000n;
const nativeValueWei = amount * 1_000_000_000_000n;
const attemptId = "1".repeat(64);

const policy = {
  enabled: true,
  asset_mode: "native_void" as const,
  chain_id: 2050,
  fulfillment_wallet_address: wallet.address,
  max_void_amount_units: "1000000000",
  max_gas_limit: "100000",
  max_fee_per_gas_wei: "3000000000",
  max_priority_fee_per_gas_wei: "2000000000",
};

const plan: BuyVoidNativeDeliveryTransactionPlanV1 = {
  chain_id: 2050,
  nonce: 7,
  gas_limit: 65000,
  max_fee_per_gas_wei: 2_000_000_000,
  max_priority_fee_per_gas_wei: 1_000_000_000,
};

function attemptWithHash(
  transactionHash: string,
): BuyVoidExecutionAttemptStateV1 {
  return {
    reservation: {
      schema: "void_buy_void_execution_attempt_reservation_v1",
      marker: "VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1",
      attempt_id: attemptId,
      attempt_number: 1,
      reserved_at_ms: 1_700_000_000_000,
      payment_key_sha256: "3".repeat(64),
      request_key_sha256: "4".repeat(64),
      canonical_payment_identity: "voidpay1:base:test:1",
      request_id: "buyvoid_native_idempotency_v1",
      instruction_id: "voidfill1_native_idempotency_v1",
      intent_fingerprint: "5".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        payment_transaction_hash: `0x${"6".repeat(64)}`,
        delivery_address: recipient,
        void_amount_units: amount.toString(),
      } as any,
      signing_authorized_by_this_module: false,
      transaction_broadcast_authorized_by_this_module: false,
      money_movement_authorized_by_this_module: false,
    },
    prepared: {
      schema: "void_buy_void_execution_prepared_transaction_v1",
      marker: "VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1",
      attempt_id: attemptId,
      prepared_at_ms: 1_700_000_000_100,
      chain_id: "2050",
      void_delivery_tx_hash: transactionHash,
      fulfillment_wallet: wallet.address.toLowerCase(),
      delivery_address: recipient,
      void_amount_units: amount.toString(),
      transaction_binding_fingerprint: "7".repeat(64),
      signed_transaction_persisted: false,
      raw_transaction_persisted: false,
      transaction_broadcast_performed_by_this_module: false,
    },
    broadcast: null,
    failure: null,
    ...({ postbroadcast_failure: null } as any),
    confirmation: null,
    status: "prepared",
  };
}

const provisional = await runBuyVoidNativeDeliverySignBroadcastV1({
  attempt: attemptWithHash(`0x${"2".repeat(64)}`),
  policy,
  plan,
});
if ("reason" in provisional) throw new Error(provisional.reason);
const referenceRaw = await wallet.signTransaction(
  provisional.transaction_plan,
);
const expectedHash = String(Transaction.from(referenceRaw).hash);
const attempt = attemptWithHash(expectedHash);

const dry = await runBuyVoidNativeDeliverySignBroadcastV1({
  attempt,
  policy,
  plan,
});
if ("reason" in dry) throw new Error(dry.reason);
assert.equal(dry.status, "dry_run");
assert.equal(dry.signing_performed, false);
assert.equal(dry.broadcast_call_performed, false);
assert.equal(dry.transaction_plan.value, nativeValueWei);

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

const fingerprintInput = {
  attempt_id: attemptId,
  expected_transaction_hash: expectedHash.toLowerCase(),
  asset_mode: "native_void",
  type: "2",
  chain_id: "2050",
  nonce: "7",
  gas_limit: "65000",
  max_fee_per_gas_wei: "2000000000",
  max_priority_fee_per_gas_wei: "1000000000",
  delivery_address: recipient,
  void_amount_units: amount.toString(),
  fulfillment_unit_decimals: "6",
  native_unit_decimals: "18",
  native_value_wei: nativeValueWei.toString(),
  calldata: "0x",
};
const canonicalFingerprintInput = Object.fromEntries(
  Object.entries(fingerprintInput).sort(([left], [right]) =>
    compareCodeUnits(left, right),
  ),
);
const expectedFingerprint = crypto
  .createHash("sha256")
  .update(JSON.stringify(canonicalFingerprintInput), "utf8")
  .digest("hex");
assert.equal(
  dry.transaction_plan_fingerprint_sha256,
  expectedFingerprint,
);

assert.equal(
  VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1
    .automatic_retry,
  false,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1
    .durable_submission_guard_dependency_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_CONFIRMATION_V1,
  "buyVoidNativeSignAndBroadcast",
);
assert.equal(
  VOID_BUY_VOID_NATIVE_DELIVERY_UNIT_SCALE_V1.multiplier,
  "1000000000000",
);

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/economic/buy_void_native_delivery_sign_broadcast_adapter_v1.ts",
  ),
  "utf8",
);
assert.equal(source.includes("localeCompare"), false);
assert.equal(source.includes("Intl.Collator"), false);

function tempRoot(label: string): string {
  return fs.mkdtempSync(
    path.join(os.tmpdir(), `void-buy-${label}-`),
  );
}

function applyInput(
  dependencies: BuyVoidNativeDeliverySignBroadcastDependenciesV1,
  key: string,
): BuyVoidNativeDeliverySignBroadcastInputV1 {
  return {
    apply: true,
    confirmation:
      VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_CONFIRMATION_V1,
    submission_idempotency_key: key,
    attempt,
    policy,
    plan,
    dependencies,
  };
}

const unknownRoot = tempRoot("native-attempt-unknown-v1");
const unknownGuard =
  createBuyVoidDeliverySubmissionGuardV1(unknownRoot);
const firstCalls = { address: 0, sign: 0, broadcast: 0 };
const unknownDependencies:
  BuyVoidNativeDeliverySignBroadcastDependenciesV1 = {
    submission_guard: unknownGuard,
    signer: {
      get_address: async () => {
        firstCalls.address += 1;
        return wallet.address;
      },
      sign_transaction: async (transaction) => {
        firstCalls.sign += 1;
        return wallet.signTransaction(transaction);
      },
    },
    broadcaster: {
      broadcast_signed_transaction: async () => {
        firstCalls.broadcast += 1;
        throw new Error("synthetic unknown after broadcast call");
      },
    },
  };

const unknown = await runBuyVoidNativeDeliverySignBroadcastV1(
  applyInput(unknownDependencies, "a".repeat(64)),
);
assert.equal("reason" in unknown, true);
if (!("reason" in unknown)) throw new Error("expected unknown hold");
assert.equal(
  unknown.reason,
  "broadcast_submission_exception_unknown",
);
assert.equal(unknown.status, "broadcast_unknown");
assert.equal(unknown.reconciliation_required, true);
assert.equal(unknown.retry_allowed, false);
assert.deepEqual(
  firstCalls,
  { address: 1, sign: 1, broadcast: 1 },
);

const replayCalls = { address: 0, sign: 0, broadcast: 0 };
const replayDependencies:
  BuyVoidNativeDeliverySignBroadcastDependenciesV1 = {
    submission_guard: unknownGuard,
    signer: {
      get_address: async () => {
        replayCalls.address += 1;
        return wallet.address;
      },
      sign_transaction: async (transaction) => {
        replayCalls.sign += 1;
        return wallet.signTransaction(transaction);
      },
    },
    broadcaster: {
      broadcast_signed_transaction: async () => {
        replayCalls.broadcast += 1;
        return {
          accepted: true,
          transaction_hash: expectedHash,
          submission_may_have_occurred: true,
        };
      },
    },
  };
const alternateReplay =
  await runBuyVoidNativeDeliverySignBroadcastV1(
    applyInput(replayDependencies, "b".repeat(64)),
  );
assert.equal("reason" in alternateReplay, true);
if (!("reason" in alternateReplay)) {
  throw new Error("alternate key replay unexpectedly executed");
}
assert.equal(
  alternateReplay.reason,
  "submission_guard_already_claimed",
);
assert.equal(
  alternateReplay.detail?.reason,
  "submission_attempt_binding_conflict",
);
assert.deepEqual(
  replayCalls,
  { address: 0, sign: 0, broadcast: 0 },
);

const definitiveRoot = tempRoot("native-definitive-no-v1");
const definitiveGuard =
  createBuyVoidDeliverySubmissionGuardV1(definitiveRoot);
const definitiveDependencies:
  BuyVoidNativeDeliverySignBroadcastDependenciesV1 = {
    submission_guard: definitiveGuard,
    signer: {
      get_address: async () => wallet.address,
      sign_transaction: async (transaction) =>
        wallet.signTransaction(transaction),
    },
    broadcaster: {
      broadcast_signed_transaction: async () => ({
        accepted: false,
        submission_may_have_occurred: false,
      }),
    },
  };
const definitive =
  await runBuyVoidNativeDeliverySignBroadcastV1(
    applyInput(definitiveDependencies, "c".repeat(64)),
  );
assert.equal("reason" in definitive, true);
if (!("reason" in definitive)) {
  throw new Error("expected definitive no-submission hold");
}
assert.equal(
  definitive.reason,
  "broadcast_definitively_not_submitted",
);
assert.equal(definitive.status, "not_broadcast");
assert.equal(definitive.submission_guard_released, true);
assert.equal(definitive.retry_allowed, true);

console.log("transaction_plan_code_unit_fingerprint_exact=true");
console.log("locale_aware_comparators_absent=true");
console.log("alternate_key_unknown_broadcast_replay_rejected=true");
console.log(
  "VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1_GREEN",
);
