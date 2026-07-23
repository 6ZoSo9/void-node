import assert from "node:assert/strict";
import {
  Transaction,
  Wallet,
} from "ethers";
import {
  VOID_NATIVE_VALUE_TRANSFER_CONFIRMATION_V1,
  VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1,
  applyVoidNativeValueTransferStateTransitionV1,
  prepareVoidNativeValueTransferStateTransitionV1,
  type VoidNativeValueTransferPreparedPlanV1,
  type VoidNativeValueTransferStoreApplyRequestV1,
  type VoidNativeValueTransferStoreV1,
} from "../src/chain/native_value_transfer_state_transition_v1.js";

const sender = Wallet.createRandom();
const recipient = Wallet.createRandom();
const feeRecipient = Wallet.createRandom();

const value = 1_000_000_000_000_000_000n;
const effectiveGasPrice = 1_000_000_000n;
const feeDebit = 21_000n * effectiveGasPrice;
const feeCredit = 15_000_000_000_000n;
const senderBalance = value + feeDebit + 5_000_000_000_000_000n;

const unsigned = {
  type: 2,
  chainId: 2050n,
  nonce: 7,
  gasLimit: 21_000n,
  maxFeePerGas: 2_000_000_000n,
  maxPriorityFeePerGas: 1_000_000_000n,
  to: recipient.address,
  value,
  data: "0x",
  accessList: [],
};

const raw = await sender.signTransaction(unsigned);
const parsed = Transaction.from(raw);
assert.ok(parsed.hash);

const policy = {
  expected_chain_id: 2050,
  required_transaction_type: 2,
  required_gas_limit: 21_000,
  max_raw_transaction_bytes: 131_072,
  max_value_wei: value * 2n,
  max_fee_debit_wei: feeDebit * 2n,
  max_fee_credit_count: 2,
  sender_allowlist: [sender.address],
  fee_credit_allowlist: [feeRecipient.address],
};

const snapshot = {
  state_version: "state-v1",
  accounts: [
    {
      address: sender.address,
      balance_wei: senderBalance,
      nonce: 7,
    },
    {
      address: recipient.address,
      balance_wei: 11n,
      nonce: 0,
    },
    {
      address: feeRecipient.address,
      balance_wei: 22n,
      nonce: 0,
    },
  ],
};

const executionContext = {
  block_hash: `0x${"a".repeat(64)}`,
  block_number: 100,
  transaction_index: 0,
  gas_used: 21_000,
  effective_gas_price_wei: effectiveGasPrice,
  fee_credits: [
    {
      address: feeRecipient.address,
      amount_wei: feeCredit,
    },
  ],
  fee_policy_fingerprint_sha256: "b".repeat(64),
};

const prepared = prepareVoidNativeValueTransferStateTransitionV1({
  raw_signed_transaction: raw,
  policy,
  snapshot,
  execution_context: executionContext,
});
if ("reason" in prepared) throw new Error(prepared.reason);
assert.equal(prepared.ok, true);
assert.equal(prepared.status, "prepared");
assert.equal(
  prepared.marker,
  VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1,
);
assert.equal(prepared.plan.chain_id, "2050");
assert.equal(prepared.plan.transaction_type, 2);
assert.equal(prepared.plan.transaction_hash, parsed.hash);
assert.equal(prepared.plan.sender, sender.address.toLowerCase());
assert.equal(prepared.plan.recipient, recipient.address.toLowerCase());
assert.equal(prepared.plan.value_wei, value.toString());
assert.equal(prepared.plan.transaction_nonce, "7");
assert.equal(prepared.plan.gas_limit, "21000");
assert.equal(prepared.plan.gas_used, "21000");
assert.equal(prepared.plan.fee_debit_wei, feeDebit.toString());
assert.equal(prepared.plan.fee_credit_total_wei, feeCredit.toString());
assert.equal(
  prepared.plan.fee_burned_wei,
  (feeDebit - feeCredit).toString(),
);
assert.equal(prepared.plan.raw_signed_transaction_persisted, false);
assert.equal(prepared.plan.raw_signed_transaction_returned, false);
assert.equal(prepared.plan.signing_performed, false);
assert.equal(prepared.plan.rpc_call_performed, false);
assert.equal(prepared.plan.state_mutation_performed, false);
assert.equal(prepared.plan.money_movement_performed, false);
assert.equal(
  JSON.stringify(prepared.plan).includes(raw.slice(2, 40)),
  false,
);

const changeByAddress = new Map(
  prepared.plan.account_changes.map((item) => [item.address, item]),
);
const senderChange = changeByAddress.get(sender.address.toLowerCase());
const recipientChange = changeByAddress.get(
  recipient.address.toLowerCase(),
);
const feeChange = changeByAddress.get(
  feeRecipient.address.toLowerCase(),
);
assert.ok(senderChange);
assert.ok(recipientChange);
assert.ok(feeChange);
assert.equal(
  senderChange.balance_after_wei,
  (senderBalance - value - feeDebit).toString(),
);
assert.equal(senderChange.nonce_before, "7");
assert.equal(senderChange.nonce_after, "8");
assert.equal(recipientChange.balance_before_wei, "11");
assert.equal(
  recipientChange.balance_after_wei,
  (11n + value).toString(),
);
assert.equal(feeChange.balance_before_wei, "22");
assert.equal(
  feeChange.balance_after_wei,
  (22n + feeCredit).toString(),
);

class InMemoryStore implements VoidNativeValueTransferStoreV1 {
  readonly state = new Map<
    string,
    { balance_wei: bigint; nonce: bigint }
  >();
  readonly applied = new Map<string, string>();

  constructor(plan: VoidNativeValueTransferPreparedPlanV1) {
    for (const change of plan.account_changes) {
      this.state.set(change.address, {
        balance_wei: BigInt(change.balance_before_wei),
        nonce: BigInt(change.nonce_before),
      });
    }
  }

  async apply_native_value_transfer_once(
    input: Readonly<VoidNativeValueTransferStoreApplyRequestV1>,
  ) {
    const existing = this.applied.get(input.idempotency_key_sha256);
    if (existing) {
      return {
        applied: false as const,
        reason: "native_value_transfer_already_applied",
        existing_transaction_hash: existing,
        submission_may_have_occurred: false,
      };
    }

    for (const change of input.account_changes) {
      const current = this.state.get(change.address);
      assert.ok(current);
      assert.equal(
        current.balance_wei.toString(),
        change.balance_before_wei,
      );
      assert.equal(current.nonce.toString(), change.nonce_before);
    }

    for (const change of input.account_changes) {
      this.state.set(change.address, {
        balance_wei: BigInt(change.balance_after_wei),
        nonce: BigInt(change.nonce_after),
      });
    }
    this.applied.set(
      input.idempotency_key_sha256,
      input.transaction_hash,
    );
    return {
      applied: true as const,
      commit_id: "commit-1",
      state_version: "state-v2",
      transaction_hash: input.transaction_hash,
    };
  }
}

const store = new InMemoryStore(prepared.plan);

const wrongConfirmation =
  await applyVoidNativeValueTransferStateTransitionV1({
    plan: prepared.plan,
    confirmation: "wrong",
    store,
  });
assert.equal(wrongConfirmation.ok, false);
if (!("reason" in wrongConfirmation)) throw new Error("missing reason");
assert.equal(wrongConfirmation.reason, "exact_confirmation_required");
assert.equal(wrongConfirmation.money_movement_performed, false);

const applied =
  await applyVoidNativeValueTransferStateTransitionV1({
    plan: prepared.plan,
    confirmation: VOID_NATIVE_VALUE_TRANSFER_CONFIRMATION_V1,
    store,
  });
if ("reason" in applied) throw new Error(applied.reason);
assert.equal(applied.ok, true);
assert.equal(applied.status, "applied");
assert.equal(applied.transaction_hash, parsed.hash);
assert.equal(applied.state_mutation_performed, true);
assert.equal(applied.money_movement_performed, true);
assert.equal(applied.automatic_retry_allowed, false);

const duplicate =
  await applyVoidNativeValueTransferStateTransitionV1({
    plan: prepared.plan,
    confirmation: VOID_NATIVE_VALUE_TRANSFER_CONFIRMATION_V1,
    store,
  });
assert.equal(duplicate.ok, false);
if (!("reason" in duplicate)) throw new Error("missing reason");
assert.equal(
  duplicate.reason,
  "native_value_transfer_already_applied",
);
assert.equal(duplicate.retry_allowed, false);

function expectHeld(
  decision: ReturnType<
    typeof prepareVoidNativeValueTransferStateTransitionV1
  >,
  reason: string,
): void {
  assert.equal(decision.ok, false);
  if (!("reason" in decision)) throw new Error("missing reason");
  assert.equal(decision.reason, reason);
  assert.equal(decision.state_mutation_performed, false);
  assert.equal(decision.money_movement_performed, false);
}

const wrongChainRaw = await sender.signTransaction({
  ...unsigned,
  chainId: 2051n,
});
expectHeld(
  prepareVoidNativeValueTransferStateTransitionV1({
    raw_signed_transaction: wrongChainRaw,
    policy,
    snapshot,
    execution_context: executionContext,
  }),
  "transaction_chain_id_mismatch",
);

const dataRaw = await sender.signTransaction({
  ...unsigned,
  data: "0x01",
});
expectHeld(
  prepareVoidNativeValueTransferStateTransitionV1({
    raw_signed_transaction: dataRaw,
    policy,
    snapshot,
    execution_context: executionContext,
  }),
  "transaction_data_forbidden",
);

const gasRaw = await sender.signTransaction({
  ...unsigned,
  gasLimit: 25_000n,
});
expectHeld(
  prepareVoidNativeValueTransferStateTransitionV1({
    raw_signed_transaction: gasRaw,
    policy,
    snapshot,
    execution_context: executionContext,
  }),
  "transaction_gas_limit_mismatch",
);

expectHeld(
  prepareVoidNativeValueTransferStateTransitionV1({
    raw_signed_transaction: raw,
    policy,
    snapshot: {
      ...snapshot,
      accounts: snapshot.accounts.map((item) =>
        item.address.toLowerCase() === sender.address.toLowerCase()
          ? { ...item, nonce: 8 }
          : item
      ),
    },
    execution_context: executionContext,
  }),
  "transaction_nonce_mismatch",
);

expectHeld(
  prepareVoidNativeValueTransferStateTransitionV1({
    raw_signed_transaction: raw,
    policy,
    snapshot: {
      ...snapshot,
      accounts: snapshot.accounts.map((item) =>
        item.address.toLowerCase() === sender.address.toLowerCase()
          ? { ...item, balance_wei: value }
          : item
      ),
    },
    execution_context: executionContext,
  }),
  "sender_balance_insufficient",
);

expectHeld(
  prepareVoidNativeValueTransferStateTransitionV1({
    raw_signed_transaction: raw,
    policy,
    snapshot,
    execution_context: {
      ...executionContext,
      effective_gas_price_wei: 3_000_000_000n,
    },
  }),
  "effective_gas_price_exceeds_transaction_max",
);

expectHeld(
  prepareVoidNativeValueTransferStateTransitionV1({
    raw_signed_transaction: raw,
    policy,
    snapshot,
    execution_context: {
      ...executionContext,
      fee_credits: [
        {
          address: feeRecipient.address,
          amount_wei: feeDebit + 1n,
        },
      ],
    },
  }),
  "fee_credit_total_exceeds_fee_debit",
);

const tamperedPlan = {
  ...prepared.plan,
  fee_burned_wei: "0",
};
const tampered =
  await applyVoidNativeValueTransferStateTransitionV1({
    plan: tamperedPlan,
    confirmation: VOID_NATIVE_VALUE_TRANSFER_CONFIRMATION_V1,
    store: new InMemoryStore(prepared.plan),
  });
assert.equal(tampered.ok, false);
if (!("reason" in tampered)) throw new Error("missing reason");
assert.equal(tampered.reason, "prepared_plan_binding_mismatch");

const throwingStore: VoidNativeValueTransferStoreV1 = {
  async apply_native_value_transfer_once() {
    throw new Error("synthetic_store_failure");
  },
};
const unknownOutcome =
  await applyVoidNativeValueTransferStateTransitionV1({
    plan: prepared.plan,
    confirmation: VOID_NATIVE_VALUE_TRANSFER_CONFIRMATION_V1,
    store: throwingStore,
  });
assert.equal(unknownOutcome.ok, false);
if (!("reason" in unknownOutcome)) throw new Error("missing reason");
assert.equal(
  unknownOutcome.reason,
  "native_value_transfer_store_error",
);
assert.equal(unknownOutcome.retry_allowed, false);
assert.equal(unknownOutcome.submission_may_have_occurred, true);

console.log("VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1_GREEN");
