import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Transaction, Wallet } from "ethers";
import {
  VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1,
  VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1,
  VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_CONFIRMATION_V1,
  VOID_BUY_VOID_NATIVE_DELIVERY_UNIT_SCALE_V1,
  runBuyVoidNativeDeliverySignBroadcastV1,
  type BuyVoidNativeDeliverySignBroadcastDecisionV1,
  type BuyVoidNativeDeliverySignBroadcastDependenciesV1,
  type BuyVoidNativeDeliverySignBroadcastHeldV1,
  type BuyVoidNativeDeliverySignBroadcastInputV1,
  type BuyVoidNativeDeliverySignBroadcastPolicyV1,
  type BuyVoidNativeDeliveryTransactionPlanV1,
  type BuyVoidNativeDeliveryUnsignedTransactionV1,
} from "../src/economic/buy_void_native_delivery_sign_broadcast_adapter_v1.js";
import {
  createBuyVoidDeliverySubmissionGuardV1,
} from "../src/economic/buy_void_delivery_submission_guard_v1.js";
import type {
  BuyVoidExecutionAttemptStateV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";

const wallet = new Wallet(`0x${"11".repeat(32)}`);
const otherWallet = new Wallet(`0x${"22".repeat(32)}`);
const recipient = new Wallet(`0x${"33".repeat(32)}`).address.toLowerCase();
const amount = 50_000_000n;
const nativeValueWei = amount * 1_000_000_000_000n;
const attemptId = "1".repeat(64);

const policy: BuyVoidNativeDeliverySignBroadcastPolicyV1 = {
  enabled: true,
  asset_mode: "native_void",
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
  gas_limit: 65_000,
  max_fee_per_gas_wei: "2000000000",
  max_priority_fee_per_gas_wei: "1000000000",
};

function attemptWithHash(
  transactionHash: string,
): BuyVoidExecutionAttemptStateV1 {
  return {
    marker: "VOID_BUY_VOID_EXECUTION_ATTEMPT_STATE_V1",
    version: 1,
    attempt_id: attemptId,
    revision: 1,
    created_at_ms: 1_701_600_000_000,
    updated_at_ms: 1_701_600_000_000,
    reservation: {
      attempt_id: attemptId,
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
      },
    },
    prepared: {
      attempt_id: attemptId,
      chain_id: 2050,
      fulfillment_wallet: wallet.address,
      delivery_address: recipient,
      void_amount_units: amount.toString(),
      void_delivery_tx_hash: transactionHash,
      signed_transaction_persisted: false,
      raw_transaction_persisted: false,
      transaction_broadcast_performed_by_this_module: false,
    },
    broadcast: null,
    failure: null,
    postbroadcast_failure: null,
    confirmation: null,
    status: "prepared",
  } as unknown as BuyVoidExecutionAttemptStateV1;
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

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

const dry = await runBuyVoidNativeDeliverySignBroadcastV1({
  attempt,
  policy,
  plan,
});
if ("reason" in dry) throw new Error(dry.reason);
assert.equal(dry.status, "dry_run");
assert.equal(dry.transaction_plan.to, recipient);
assert.equal(dry.transaction_plan.value, nativeValueWei);
assert.equal(dry.transaction_plan.data, "0x");
assert.equal(dry.signing_performed, false);
assert.equal(dry.broadcast_call_performed, false);
assert.equal(dry.submission_guard_claimed, false);

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
const expectedFingerprint = crypto
  .createHash("sha256")
  .update(JSON.stringify(Object.fromEntries(
    Object.entries(fingerprintInput).sort(([left], [right]) =>
      compareCodeUnits(left, right),
    ),
  )))
  .digest("hex");
assert.equal(dry.transaction_plan_fingerprint_sha256, expectedFingerprint);

assert.equal(
  VOID_BUY_VOID_NATIVE_DELIVERY_UNIT_SCALE_V1.multiplier,
  "1000000000000",
);
assert.equal(
  VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1
    .durable_submission_guard_dependency_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1
    .automatic_retry,
  false,
);
assert.equal(
  VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_CONFIRMATION_V1,
  "buyVoidNativeSignAndBroadcast",
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
assert.equal(/export type [^=]+=\s*any\s*;/.test(source), false);
assert.equal(source.split("\n").length > 500, true);

function asHeld(
  decision: BuyVoidNativeDeliverySignBroadcastDecisionV1,
): BuyVoidNativeDeliverySignBroadcastHeldV1 {
  if (!("reason" in decision)) {
    throw new Error(`expected held decision, found ${decision.status}`);
  }
  return decision;
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

function freshDependencies(options: {
  signerAddress?: string;
  sign?: (
    transaction: Readonly<BuyVoidNativeDeliveryUnsignedTransactionV1>,
  ) => Promise<string>;
  broadcast?: BuyVoidNativeDeliverySignBroadcastDependenciesV1["broadcaster"]["broadcast_signed_transaction"];
  claim?: boolean;
  release?: boolean;
} = {}) {
  const calls = {
    claim: 0,
    release: 0,
    address: 0,
    sign: 0,
    broadcast: 0,
  };
  const dependencies: BuyVoidNativeDeliverySignBroadcastDependenciesV1 = {
    submission_guard: {
      claim_submission_once: async () => {
        calls.claim += 1;
        return options.claim === false
          ? { claimed: false as const, reason: "already_claimed" }
          : { claimed: true as const };
      },
      release_submission_claim: async () => {
        calls.release += 1;
        return options.release === false
          ? { released: false as const, reason: "synthetic_release_refused" }
          : { released: true as const };
      },
    },
    signer: {
      get_address: async () => {
        calls.address += 1;
        return options.signerAddress || wallet.address;
      },
      sign_transaction: async (transaction) => {
        calls.sign += 1;
        if (options.sign) return options.sign(transaction);
        return wallet.signTransaction(transaction);
      },
    },
    broadcaster: {
      broadcast_signed_transaction: async (raw) => {
        calls.broadcast += 1;
        if (options.broadcast) return options.broadcast(raw);
        return {
          accepted: true,
          transaction_hash: Transaction.from(raw).hash,
          provider_submission_id: "synthetic-provider-accepted-v1",
          submission_may_have_occurred: true,
        };
      },
    },
  };
  return { dependencies, calls };
}

{
  const { dependencies, calls } = freshDependencies();
  const disabled = asHeld(await runBuyVoidNativeDeliverySignBroadcastV1({
    ...applyInput(dependencies, "7".repeat(64)),
    policy: { ...policy, enabled: false },
  }));
  assert.equal(disabled.reason, "delivery_sign_broadcast_disabled");
  assert.deepEqual(calls, {
    claim: 0, release: 0, address: 0, sign: 0, broadcast: 0,
  });
}

{
  const { dependencies, calls } = freshDependencies();
  const wrongAsset = asHeld(await runBuyVoidNativeDeliverySignBroadcastV1({
    ...applyInput(dependencies, "8".repeat(64)),
    policy: { ...policy, asset_mode: "wrapped_void" as "native_void" },
  }));
  assert.equal(wrongAsset.reason, "native_delivery_asset_mode_required");
  assert.deepEqual(calls, {
    claim: 0, release: 0, address: 0, sign: 0, broadcast: 0,
  });
}

{
  const { dependencies, calls } = freshDependencies();
  const wrongConfirmation = asHeld(
    await runBuyVoidNativeDeliverySignBroadcastV1({
      ...applyInput(dependencies, "9".repeat(64)),
      confirmation: "wrong",
    }),
  );
  assert.equal(wrongConfirmation.reason, "explicit_confirmation_required");
  assert.deepEqual(calls, {
    claim: 0, release: 0, address: 0, sign: 0, broadcast: 0,
  });
}

{
  const { dependencies, calls } = freshDependencies({ claim: false });
  const duplicate = asHeld(
    await runBuyVoidNativeDeliverySignBroadcastV1(
      applyInput(dependencies, "a".repeat(64)),
    ),
  );
  assert.equal(duplicate.reason, "submission_guard_already_claimed");
  assert.deepEqual(calls, {
    claim: 1, release: 0, address: 0, sign: 0, broadcast: 0,
  });
}

{
  const { dependencies, calls } = freshDependencies({
    signerAddress: otherWallet.address,
  });
  const mismatch = asHeld(
    await runBuyVoidNativeDeliverySignBroadcastV1(
      applyInput(dependencies, "b".repeat(64)),
    ),
  );
  assert.equal(mismatch.reason, "signer_address_mismatch");
  assert.equal(mismatch.status, "not_broadcast");
  assert.equal(mismatch.retry_allowed, true);
  assert.equal(mismatch.submission_guard_released, true);
  assert.deepEqual(calls, {
    claim: 1, release: 1, address: 1, sign: 0, broadcast: 0,
  });
}

{
  const { dependencies, calls } = freshDependencies({
    sign: async (transaction) => wallet.signTransaction({
      ...transaction,
      value: transaction.value + 1n,
    }),
  });
  const mismatch = asHeld(
    await runBuyVoidNativeDeliverySignBroadcastV1(
      applyInput(dependencies, "c".repeat(64)),
    ),
  );
  assert.equal(mismatch.reason, "signed_transaction_hash_mismatch");
  assert.equal(mismatch.submission_guard_released, true);
  assert.equal(mismatch.retry_allowed, true);
  assert.deepEqual(calls, {
    claim: 1, release: 1, address: 1, sign: 1, broadcast: 0,
  });
}

{
  const { dependencies, calls } = freshDependencies({
    broadcast: async () => ({
      accepted: false,
      provider_submission_id: "synthetic-definitive-no-submission-v1",
      submission_may_have_occurred: false,
    }),
  });
  const failed = asHeld(
    await runBuyVoidNativeDeliverySignBroadcastV1(
      applyInput(dependencies, "d".repeat(64)),
    ),
  );
  assert.equal(failed.reason, "broadcast_definitively_not_submitted");
  assert.equal(failed.status, "not_broadcast");
  assert.equal(failed.retry_allowed, true);
  assert.equal(failed.reconciliation_required, false);
  assert.equal(failed.submission_guard_released, true);
  assert.deepEqual(calls, {
    claim: 1, release: 1, address: 1, sign: 1, broadcast: 1,
  });
}

{
  const { dependencies, calls } = freshDependencies({
    broadcast: async () => {
      throw new Error("synthetic broadcaster exception after call");
    },
  });
  const unknown = asHeld(
    await runBuyVoidNativeDeliverySignBroadcastV1(
      applyInput(dependencies, "e".repeat(64)),
    ),
  );
  assert.equal(unknown.reason, "broadcast_submission_exception_unknown");
  assert.equal(unknown.status, "broadcast_unknown");
  assert.equal(unknown.retry_allowed, false);
  assert.equal(unknown.reconciliation_required, true);
  assert.equal(unknown.submission_guard_released, false);
  assert.deepEqual(calls, {
    claim: 1, release: 0, address: 1, sign: 1, broadcast: 1,
  });
}

{
  const { dependencies, calls } = freshDependencies({
    broadcast: async () => ({
      accepted: true,
      transaction_hash: `0x${"f".repeat(64)}`,
      provider_submission_id: "synthetic-wrong-hash-v1",
      submission_may_have_occurred: true,
    }),
  });
  const unknown = asHeld(
    await runBuyVoidNativeDeliverySignBroadcastV1(
      applyInput(dependencies, "f".repeat(64)),
    ),
  );
  assert.equal(unknown.reason, "broadcast_accepted_hash_mismatch");
  assert.equal(unknown.status, "broadcast_unknown");
  assert.equal(unknown.reconciliation_required, true);
  assert.equal(unknown.submission_guard_released, false);
  assert.deepEqual(calls, {
    claim: 1, release: 0, address: 1, sign: 1, broadcast: 1,
  });
}

{
  const { dependencies, calls } = freshDependencies({
    signerAddress: otherWallet.address,
    release: false,
  });
  const heldRelease = asHeld(
    await runBuyVoidNativeDeliverySignBroadcastV1(
      applyInput(dependencies, "0".repeat(64)),
    ),
  );
  assert.equal(heldRelease.reason, "submission_guard_release_failed");
  assert.equal(heldRelease.status, "held");
  assert.equal(heldRelease.retry_allowed, false);
  assert.equal(heldRelease.reconciliation_required, true);
  assert.equal(heldRelease.submission_guard_released, false);
  assert.deepEqual(calls, {
    claim: 1, release: 1, address: 1, sign: 0, broadcast: 0,
  });
}

{
  const { dependencies, calls } = freshDependencies();
  const accepted = await runBuyVoidNativeDeliverySignBroadcastV1(
    applyInput(dependencies, "1".repeat(64)),
  );
  if ("reason" in accepted) throw new Error(accepted.reason);
  assert.equal(accepted.status, "broadcast_accepted");
  assert.equal(
    accepted.marker,
    VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1,
  );
  assert.equal(accepted.transaction_hash, expectedHash);
  assert.equal(accepted.transaction_broadcast_accepted, true);
  assert.equal(accepted.raw_signed_transaction_persisted, false);
  assert.equal(accepted.raw_signed_transaction_returned, false);
  assert.equal(accepted.automatic_retry_allowed, false);
  assert.equal(accepted.submission_guard_released, false);
  assert.deepEqual(calls, {
    claim: 1, release: 0, address: 1, sign: 1, broadcast: 1,
  });
  assert.equal(Object.hasOwn(accepted, "raw_signed_transaction"), false);
  assert.equal(Object.hasOwn(accepted, "signed_transaction"), false);
}

{
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-native-attempt-replay-v1-"),
  );
  const submissionGuard = createBuyVoidDeliverySubmissionGuardV1(root);
  const firstCalls = { address: 0, sign: 0, broadcast: 0 };
  const firstDependencies: BuyVoidNativeDeliverySignBroadcastDependenciesV1 = {
    submission_guard: submissionGuard,
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
  const unknown = asHeld(
    await runBuyVoidNativeDeliverySignBroadcastV1(
      applyInput(firstDependencies, "2".repeat(64)),
    ),
  );
  assert.equal(unknown.status, "broadcast_unknown");
  assert.deepEqual(firstCalls, { address: 1, sign: 1, broadcast: 1 });

  const replayCalls = { address: 0, sign: 0, broadcast: 0 };
  const replayDependencies: BuyVoidNativeDeliverySignBroadcastDependenciesV1 = {
    submission_guard: submissionGuard,
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
  const replay = asHeld(
    await runBuyVoidNativeDeliverySignBroadcastV1(
      applyInput(replayDependencies, "3".repeat(64)),
    ),
  );
  assert.equal(replay.reason, "submission_guard_already_claimed");
  assert.equal(
    replay.detail?.reason,
    "submission_attempt_binding_conflict",
  );
  assert.deepEqual(replayCalls, { address: 0, sign: 0, broadcast: 0 });
}

console.log("typed_adapter_contract_preserved=true");
console.log("preexisting_adversarial_coverage_preserved=true");
console.log("transaction_plan_code_unit_fingerprint_exact=true");
console.log("locale_aware_comparators_absent=true");
console.log("alternate_key_unknown_broadcast_replay_rejected=true");
console.log(
  "VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1_GREEN",
);
