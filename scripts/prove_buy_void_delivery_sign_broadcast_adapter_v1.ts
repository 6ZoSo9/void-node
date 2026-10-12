import assert from "node:assert/strict";
import {
  Interface,
  Transaction,
  Wallet,
} from "ethers";
import {
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1,
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1,
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_CONFIRMATION_V1,
  VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1,
  runBuyVoidDeliverySignBroadcastV1,
  type BuyVoidDeliverySignBroadcastDecisionV1,
  type BuyVoidDeliverySignBroadcastDependenciesV1,
  type BuyVoidDeliverySignBroadcastHeldV1,
  type BuyVoidDeliverySignBroadcastInputV1,
  type BuyVoidDeliverySignBroadcastPolicyV1,
  type BuyVoidDeliveryTransactionPlanV1,
  type BuyVoidDeliveryUnsignedTransactionV1,
} from "../src/economic/buy_void_delivery_sign_broadcast_adapter_v1.js";
import type {
  BuyVoidExecutionAttemptStateV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";

const wallet = Wallet.createRandom();
const otherWallet = Wallet.createRandom();
const recipient = Wallet.createRandom().address.toLowerCase();
const token = Wallet.createRandom().address.toLowerCase();
const amount = 2_500_000_000n;
const transferInterface = new Interface([
  "function transfer(address to, uint256 value) returns (bool)",
]);
const unitMultiplier = 1_000_000_000_000n;
const uint256Max = (1n << 256n) - 1n;
const attemptId = "1".repeat(64);
const placeholderHash = `0x${"2".repeat(64)}`;

const policy: BuyVoidDeliverySignBroadcastPolicyV1 = {
  enabled: true,
  chain_id: 2050,
  void_token_address: token,
  fulfillment_wallet_address: wallet.address,
  max_void_amount_units: amount.toString(),
  max_gas_limit: "100000",
  max_fee_per_gas_wei: "3000000000",
  max_priority_fee_per_gas_wei: "2000000000",
};

const plan: BuyVoidDeliveryTransactionPlanV1 = {
  chain_id: 2050,
  nonce: 7,
  gas_limit: 65000,
  max_fee_per_gas_wei: 2_000_000_000,
  max_priority_fee_per_gas_wei: 1_000_000_000,
};

function attemptWithHash(
  transactionHash: string,
  voidAmountUnits: bigint = amount,
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
      request_id: "buyvoid_sign_broadcast_adapter_v1",
      instruction_id: "voidfill1_sign_broadcast_adapter_v1",
      intent_fingerprint: "5".repeat(64),
      max_attempts_per_payment: 2,
      unsigned_instruction: {
        payment_transaction_hash: `0x${"6".repeat(64)}`,
        delivery_address: recipient,
        void_amount_units: voidAmountUnits.toString(),
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
      void_amount_units: voidAmountUnits.toString(),
      transaction_binding_fingerprint: "7".repeat(64),
      signed_transaction_persisted: false,
      raw_transaction_persisted: false,
      transaction_broadcast_performed_by_this_module: false,
    },
    broadcast: null,
    failure: null,
    ...( { postbroadcast_failure: null } as any ),
    confirmation: null,
    status: "prepared",
  };
}

const initialDry = await runBuyVoidDeliverySignBroadcastV1({
  attempt: attemptWithHash(placeholderHash),
  policy,
  plan,
});
if ("reason" in initialDry) throw new Error(initialDry.reason);
assert.equal(initialDry.ok, true);
assert.equal(initialDry.status, "dry_run");

assert.deepEqual(VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1, {
  fulfillment_unit_decimals: 6,
  token_atom_decimals: 18,
  multiplier: "1000000000000",
});
assert.equal(
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1.erc20_transfer,
  true,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1
    .integer_only_unit_conversion,
  true,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1.rounding,
  false,
);

const unitScaleVectors = [
  [1n, 1_000_000_000_000n],
  [1_000_000n, 1_000_000_000_000_000_000n],
  [2_500_000_000n, 2_500_000_000_000_000_000_000n],
  [10_000_000_000_000n, 10_000_000_000_000_000_000_000_000n],
] as const;
for (const [units, expectedAtoms] of unitScaleVectors) {
  const vector = await runBuyVoidDeliverySignBroadcastV1({
    attempt: attemptWithHash(placeholderHash, units),
    policy: {
      ...policy,
      max_void_amount_units: units.toString(),
    },
    plan,
  });
  if ("reason" in vector) throw new Error(vector.reason);
  const decoded = transferInterface.decodeFunctionData(
    "transfer",
    vector.transaction_plan.data,
  );
  assert.equal(String(decoded[0]).toLowerCase(), recipient);
  assert.equal(decoded[1], expectedAtoms);
  assert.equal(expectedAtoms, units * unitMultiplier);
}

const overflowUnits = uint256Max / unitMultiplier + 1n;
const overflowDecision = await runBuyVoidDeliverySignBroadcastV1({
  attempt: attemptWithHash(placeholderHash, overflowUnits),
  policy: {
    ...policy,
    max_void_amount_units: overflowUnits.toString(),
  },
  plan,
});
assert.equal("reason" in overflowDecision, true);
if (!("reason" in overflowDecision)) {
  throw new Error("uint256 overflow must fail closed");
}
assert.equal(
  overflowDecision.reason,
  "void_delivery_token_amount_atoms_out_of_range",
);
assert.equal(overflowDecision.signing_performed, false);
assert.equal(overflowDecision.broadcast_call_performed, false);

const referenceRaw = await wallet.signTransaction(
  initialDry.transaction_plan,
);
const expectedHash = Transaction.from(referenceRaw).hash;
assert.ok(expectedHash);
const attempt = attemptWithHash(String(expectedHash));

const dry = await runBuyVoidDeliverySignBroadcastV1({
  attempt,
  policy,
  plan,
});
if ("reason" in dry) throw new Error(dry.reason);
assert.equal(dry.ok, true);
assert.equal(dry.status, "dry_run");
assert.equal(dry.signing_performed, false);
assert.equal(dry.broadcast_call_performed, false);
assert.equal(dry.submission_guard_claimed, false);
assert.equal(dry.expected_transaction_hash, expectedHash);

assert.equal(
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1.disabled_by_default,
  true,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1.private_key_input,
  false,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1.environment_secret_read,
  false,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1.raw_signed_transaction_output,
  false,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1.automatic_retry,
  false,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1.runtime_route_mount,
  false,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1
    .durable_submission_release_required_for_definitive_not_broadcast,
  true,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1
    .broadcaster_exception_is_unknown,
  true,
);
assert.equal(VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1.signing, true);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1.transaction_broadcast,
  true,
);
assert.equal(
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_CONFIRMATION_V1,
  "buyVoidSignAndBroadcast",
);

function freshDependencies(options: {
  signerAddress?: string;
  sign?: (
    transaction: Readonly<BuyVoidDeliveryUnsignedTransactionV1>,
  ) => Promise<string>;
  broadcast?: BuyVoidDeliverySignBroadcastDependenciesV1["broadcaster"]["broadcast_signed_transaction"];
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
  const dependencies: BuyVoidDeliverySignBroadcastDependenciesV1 = {
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

function asHeld(
  decision: BuyVoidDeliverySignBroadcastDecisionV1,
): BuyVoidDeliverySignBroadcastHeldV1 {
  if (!("reason" in decision)) {
    throw new Error(`expected held decision, found ${decision.status}`);
  }
  return decision;
}

function applyInput(
  dependencies: BuyVoidDeliverySignBroadcastDependenciesV1,
  suffix: string,
): BuyVoidDeliverySignBroadcastInputV1 {
  return {
    apply: true,
    confirmation: "buyVoidSignAndBroadcast",
    submission_idempotency_key: suffix.padStart(64, "0").slice(-64),
    attempt,
    policy,
    plan,
    dependencies,
  };
}

{
  const { dependencies, calls } = freshDependencies();
  const disabled = asHeld(await runBuyVoidDeliverySignBroadcastV1({
    ...applyInput(dependencies, "8"),
    policy: { ...policy, enabled: false },
  }));
  assert.equal(disabled.ok, false);
  assert.equal(disabled.reason, "delivery_sign_broadcast_disabled");
  assert.deepEqual(calls, { claim: 0, release: 0, address: 0, sign: 0, broadcast: 0 });
}

{
  const { dependencies, calls } = freshDependencies();
  const wrong = asHeld(await runBuyVoidDeliverySignBroadcastV1({
    ...applyInput(dependencies, "9"),
    confirmation: "wrong",
  }));
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, "explicit_confirmation_required");
  assert.deepEqual(calls, { claim: 0, release: 0, address: 0, sign: 0, broadcast: 0 });
}

{
  const { dependencies, calls } = freshDependencies({ claim: false });
  const duplicate = asHeld(await runBuyVoidDeliverySignBroadcastV1(
    applyInput(dependencies, "a"),
  ));
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, "submission_guard_already_claimed");
  assert.deepEqual(calls, { claim: 1, release: 0, address: 0, sign: 0, broadcast: 0 });
}

{
  const { dependencies, calls } = freshDependencies({
    signerAddress: otherWallet.address,
  });
  const mismatch = asHeld(await runBuyVoidDeliverySignBroadcastV1(
    applyInput(dependencies, "b"),
  ));
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.status, "not_broadcast");
  assert.equal(mismatch.reason, "signer_address_mismatch");
  assert.equal(mismatch.retry_allowed, true);
  assert.equal(mismatch.submission_guard_released, true);
  assert.deepEqual(calls, { claim: 1, release: 1, address: 1, sign: 0, broadcast: 0 });
}

{
  const { dependencies, calls } = freshDependencies({
    sign: async (transaction) => wallet.signTransaction({
      ...transaction,
      nonce: transaction.nonce + 1,
    }),
  });
  const mismatch = asHeld(await runBuyVoidDeliverySignBroadcastV1(
    applyInput(dependencies, "c"),
  ));
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.status, "not_broadcast");
  assert.equal(mismatch.reason, "signed_transaction_hash_mismatch");
  assert.equal(mismatch.submission_guard_released, true);
  assert.equal(mismatch.retry_allowed, true);
  assert.deepEqual(calls, { claim: 1, release: 1, address: 1, sign: 1, broadcast: 0 });
}

{
  const { dependencies, calls } = freshDependencies({
    broadcast: async () => ({
      accepted: false,
      provider_submission_id: "synthetic-definitive-no-submission-v1",
      submission_may_have_occurred: false,
    }),
  });
  const failed = asHeld(await runBuyVoidDeliverySignBroadcastV1(
    applyInput(dependencies, "d"),
  ));
  assert.equal(failed.ok, false);
  assert.equal(failed.status, "not_broadcast");
  assert.equal(failed.reason, "broadcast_definitively_not_submitted");
  assert.equal(failed.retry_allowed, true);
  assert.equal(failed.reconciliation_required, false);
  assert.equal(failed.submission_guard_released, true);
  assert.deepEqual(
    calls,
    { claim: 1, release: 1, address: 1, sign: 1, broadcast: 1 },
  );
}

{
  const { dependencies, calls } = freshDependencies({
    broadcast: async () => {
      throw new Error("synthetic broadcaster exception after call");
    },
  });
  const unknown = asHeld(await runBuyVoidDeliverySignBroadcastV1(
    applyInput(dependencies, "e"),
  ));
  assert.equal(unknown.ok, false);
  assert.equal(unknown.status, "broadcast_unknown");
  assert.equal(unknown.reason, "broadcast_submission_exception_unknown");
  assert.equal(unknown.retry_allowed, false);
  assert.equal(unknown.reconciliation_required, true);
  assert.equal(unknown.submission_guard_released, false);
  assert.deepEqual(
    calls,
    { claim: 1, release: 0, address: 1, sign: 1, broadcast: 1 },
  );
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
  const unknown = asHeld(await runBuyVoidDeliverySignBroadcastV1(
    applyInput(dependencies, "f"),
  ));
  assert.equal(unknown.ok, false);
  assert.equal(unknown.status, "broadcast_unknown");
  assert.equal(unknown.reason, "broadcast_accepted_hash_mismatch");
  assert.equal(unknown.reconciliation_required, true);
  assert.equal(unknown.submission_guard_released, false);
  assert.deepEqual(
    calls,
    { claim: 1, release: 0, address: 1, sign: 1, broadcast: 1 },
  );
}

{
  const { dependencies, calls } = freshDependencies({
    signerAddress: otherWallet.address,
    release: false,
  });
  const heldRelease = asHeld(
    await runBuyVoidDeliverySignBroadcastV1(
      applyInput(dependencies, "0"),
    ),
  );
  assert.equal(heldRelease.reason, "submission_guard_release_failed");
  assert.equal(heldRelease.status, "held");
  assert.equal(heldRelease.retry_allowed, false);
  assert.equal(heldRelease.reconciliation_required, true);
  assert.equal(heldRelease.submission_guard_released, false);
  assert.deepEqual(
    calls,
    { claim: 1, release: 1, address: 1, sign: 0, broadcast: 0 },
  );
}

{
  const { dependencies, calls } = freshDependencies();
  const accepted = await runBuyVoidDeliverySignBroadcastV1(
    applyInput(dependencies, "1"),
  );
  if ("reason" in accepted) throw new Error(accepted.reason);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.status, "broadcast_accepted");
  assert.equal(accepted.marker, VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1);
  assert.equal(accepted.transaction_hash, expectedHash);
  assert.equal(accepted.transaction_broadcast_accepted, true);
  assert.equal(accepted.raw_signed_transaction_persisted, false);
  assert.equal(accepted.raw_signed_transaction_returned, false);
  assert.equal(accepted.automatic_retry_allowed, false);
  assert.equal(accepted.submission_guard_released, false);
  assert.deepEqual(
    calls,
    { claim: 1, release: 0, address: 1, sign: 1, broadcast: 1 },
  );
  assert.equal(Object.hasOwn(accepted, "raw_signed_transaction"), false);
  assert.equal(Object.hasOwn(accepted, "signed_transaction"), false);
}

console.log("VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1_GREEN");
console.log(`erc20_unit_scale_vector_count=${unitScaleVectors.length}`);
console.log("fulfillment_unit_decimals=6");
console.log("token_atom_decimals=18");
console.log("erc20_unit_scale_multiplier=1000000000000");
console.log("erc20_uint256_overflow_rejected=true");
console.log("erc20_rounding=false");
