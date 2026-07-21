import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  Wallet,
} from "ethers";
import {
  VOID_NATIVE_ACCOUNT_STATE_STORE_INITIALIZE_CONFIRMATION_V1,
  createVoidNativeAccountStateStoreV1,
  initializeVoidNativeAccountStateStoreV1,
} from "../src/chain/native_account_state_store_v1.js";
import {
  VOID_NATIVE_VALUE_TRANSFER_BLOCK_CONFIRMATION_V1,
  applyVoidNativeValueTransferBlockExecutionV1,
  prepareVoidNativeValueTransferBlockExecutionV1,
  type VoidNativeValueTransferBlockStoreApplyRequestV1,
  type VoidNativeValueTransferBlockStoreV1,
} from "../src/chain/native_value_transfer_block_executor_v1.js";

const root = mkdtempSync(
  path.join(os.tmpdir(), "void-native-block-executor-proof-"),
);

try {
  const sender = Wallet.createRandom();
  const recipientA = Wallet.createRandom();
  const recipientB = Wallet.createRandom();
  const feeRecipient = Wallet.createRandom();

  const valueA = 1_000_000_000_000_000_000n;
  const valueB = 2_000_000_000_000_000_000n;
  const effectiveGasPrice = 1_000_000_000n;
  const feeDebit = 21_000n * effectiveGasPrice;
  const feeCredit = 15_000_000_000_000n;
  const senderBalance =
    valueA + valueB + feeDebit * 2n
    + 9_000_000_000_000_000n;

  const storePolicy = {
    max_accounts: 100,
    max_applied_transactions: 1_000,
    max_snapshot_bytes: 4_000_000,
    max_journal_bytes: 8_000_000,
    stale_lock_min_age_ms: 1_000,
  };

  const initialized = initializeVoidNativeAccountStateStoreV1({
    root_directory: root,
    policy: storePolicy,
    genesis_id: "block-executor-proof",
    accounts: [
      {
        address: sender.address,
        balance_wei: senderBalance,
        nonce: 7,
      },
      {
        address: recipientA.address,
        balance_wei: 11n,
        nonce: 0,
      },
      {
        address: recipientB.address,
        balance_wei: 22n,
        nonce: 0,
      },
      {
        address: feeRecipient.address,
        balance_wei: 33n,
        nonce: 0,
      },
    ],
    confirmation:
      VOID_NATIVE_ACCOUNT_STATE_STORE_INITIALIZE_CONFIRMATION_V1,
  });
  if (!initialized.ok) throw new Error(initialized.reason);

  const accountStore = createVoidNativeAccountStateStoreV1({
    root_directory: root,
    policy: storePolicy,
  });
  const snapshot = accountStore.read_state_snapshot();

  const rawA = await sender.signTransaction({
    type: 2,
    chainId: 2050n,
    nonce: 7,
    gasLimit: 21_000n,
    maxFeePerGas: 2_000_000_000n,
    maxPriorityFeePerGas: 1_000_000_000n,
    to: recipientA.address,
    value: valueA,
    data: "0x",
    accessList: [],
  });
  const rawB = await sender.signTransaction({
    type: 2,
    chainId: 2050n,
    nonce: 8,
    gasLimit: 21_000n,
    maxFeePerGas: 2_000_000_000n,
    maxPriorityFeePerGas: 1_000_000_000n,
    to: recipientB.address,
    value: valueB,
    data: "0x",
    accessList: [],
  });

  const transferPolicy = {
    expected_chain_id: 2050,
    required_transaction_type: 2,
    required_gas_limit: 21_000,
    max_raw_transaction_bytes: 131_072,
    max_value_wei: valueB * 2n,
    max_fee_debit_wei: feeDebit * 2n,
    max_fee_credit_count: 2,
    sender_allowlist: [sender.address],
    fee_credit_allowlist: [feeRecipient.address],
  };
  const blockPolicy = {
    max_transactions_per_block: 100,
    max_total_raw_transaction_bytes: 1_000_000,
    max_total_value_wei: valueA + valueB + 1n,
    max_total_fee_debit_wei: feeDebit * 3n,
    max_total_fee_burned_wei: feeDebit * 3n,
  };
  const feeContext = {
    effective_gas_price_wei: effectiveGasPrice,
    fee_credits: [
      {
        address: feeRecipient.address,
        amount_wei: feeCredit,
      },
    ],
    fee_policy_fingerprint_sha256: "b".repeat(64),
  };

  const blockHash = `0x${"a".repeat(64)}`;
  const prepared = prepareVoidNativeValueTransferBlockExecutionV1({
    block_hash: blockHash,
    block_number: 200,
    snapshot,
    block_policy: blockPolicy,
    transactions: [
      {
        raw_signed_transaction: rawA,
        transfer_policy: transferPolicy,
        ...feeContext,
      },
      {
        raw_signed_transaction: rawB,
        transfer_policy: transferPolicy,
        ...feeContext,
      },
    ],
  });
  if ("reason" in prepared) throw new Error(prepared.reason);
  assert.equal(prepared.status, "prepared");
  assert.equal(prepared.plan.transaction_count, 2);
  assert.equal(
    prepared.plan.ordered_transaction_hashes.length,
    2,
  );
  assert.equal(
    prepared.plan.transaction_plans[0].account_changes.length,
    3,
    "first transaction must exclude the unrelated second recipient",
  );
  assert.equal(
    prepared.plan.transaction_plans[1].account_changes.length,
    3,
    "second transaction must exclude the unrelated first recipient",
  );
  assert.equal(
    new Set(prepared.plan.ordered_transaction_hashes).size,
    2,
  );
  assert.equal(
    prepared.plan.total_value_wei,
    (valueA + valueB).toString(),
  );
  assert.equal(
    prepared.plan.total_fee_debit_wei,
    (feeDebit * 2n).toString(),
  );
  assert.equal(
    prepared.plan.total_fee_credit_wei,
    (feeCredit * 2n).toString(),
  );
  assert.equal(
    prepared.plan.total_fee_burned_wei,
    ((feeDebit - feeCredit) * 2n).toString(),
  );
  assert.equal(
    prepared.plan.raw_signed_transaction_persisted,
    false,
  );
  assert.equal(
    prepared.plan.per_transaction_store_apply_performed,
    false,
  );
  assert.equal(
    prepared.plan.block_store_apply_performed,
    false,
  );
  assert.equal(
    JSON.stringify(prepared.plan).includes(rawA.slice(2, 42)),
    false,
  );
  assert.equal(
    JSON.stringify(prepared.plan).includes(rawB.slice(2, 42)),
    false,
  );

  const changes = new Map(
    prepared.plan.aggregate_account_changes.map(
      (item) => [item.address, item],
    ),
  );
  assert.equal(
    changes.get(sender.address.toLowerCase())?.nonce_before,
    "7",
  );
  assert.equal(
    changes.get(sender.address.toLowerCase())?.nonce_after,
    "9",
  );
  assert.equal(
    changes.get(sender.address.toLowerCase())?.balance_after_wei,
    (
      senderBalance - valueA - valueB - feeDebit * 2n
    ).toString(),
  );

  class InMemoryBlockStore
  implements VoidNativeValueTransferBlockStoreV1 {
    calls = 0;
    state = new Map(
      snapshot.accounts.map((account) => [
        account.address,
        {
          balance_wei: account.balance_wei,
          nonce: account.nonce,
        },
      ]),
    );
    stateVersion = snapshot.state_version;
    snapshotFingerprint =
      snapshot.snapshot_fingerprint_sha256;
    applied = new Map<string, string>();

    async apply_native_value_transfer_block_once(
      request:
        Readonly<VoidNativeValueTransferBlockStoreApplyRequestV1>,
    ) {
      this.calls += 1;
      const existing = this.applied.get(
        request.block_idempotency_key_sha256,
      );
      if (existing) {
        return {
          applied: false as const,
          reason: "native_value_transfer_block_already_applied",
          existing_block_hash: existing,
          submission_may_have_occurred: false,
        };
      }
      assert.equal(
        request.parent_state_version,
        this.stateVersion,
      );
      assert.equal(
        request.parent_snapshot_fingerprint_sha256,
        this.snapshotFingerprint,
      );
      assert.equal(
        request.raw_signed_transactions_included,
        false,
      );
      assert.equal(request.transaction_count, 2);
      for (const change of request.aggregate_account_changes) {
        const current = this.state.get(change.address);
        assert.ok(current);
        assert.equal(
          current.balance_wei,
          change.balance_before_wei,
        );
        assert.equal(current.nonce, change.nonce_before);
      }
      for (const change of request.aggregate_account_changes) {
        this.state.set(change.address, {
          balance_wei: change.balance_after_wei,
          nonce: change.nonce_after,
        });
      }
      this.stateVersion = request.final_state_version;
      this.applied.set(
        request.block_idempotency_key_sha256,
        request.block_hash,
      );
      return {
        applied: true as const,
        commit_id: "block-commit-1",
        block_hash: request.block_hash,
        block_number: request.block_number,
        state_version: request.final_state_version,
        transaction_count: request.transaction_count,
      };
    }
  }

  const store = new InMemoryBlockStore();

  const wrongConfirmation =
    await applyVoidNativeValueTransferBlockExecutionV1({
      plan: prepared.plan,
      confirmation: "wrong",
      store,
    });
  assert.equal(wrongConfirmation.ok, false);
  assert.equal(store.calls, 0);

  const applied =
    await applyVoidNativeValueTransferBlockExecutionV1({
      plan: prepared.plan,
      confirmation:
        VOID_NATIVE_VALUE_TRANSFER_BLOCK_CONFIRMATION_V1,
      store,
    });
  if ("reason" in applied) throw new Error(applied.reason);
  assert.equal(applied.status, "applied");
  assert.equal(applied.transaction_count, 2);
  assert.equal(applied.final_state_version, store.stateVersion);
  assert.equal(applied.money_movement_performed, true);
  assert.equal(store.calls, 1);
  assert.equal(
    store.state.get(sender.address.toLowerCase())?.nonce,
    "9",
  );

  const duplicate =
    await applyVoidNativeValueTransferBlockExecutionV1({
      plan: prepared.plan,
      confirmation:
        VOID_NATIVE_VALUE_TRANSFER_BLOCK_CONFIRMATION_V1,
      store,
    });
  assert.equal(duplicate.ok, false);
  if (!("reason" in duplicate)) throw new Error("missing reason");
  assert.equal(
    duplicate.reason,
    "native_value_transfer_block_already_applied",
  );
  assert.equal(store.calls, 2);

  const wrongNonceRaw = await sender.signTransaction({
    type: 2,
    chainId: 2050n,
    nonce: 9,
    gasLimit: 21_000n,
    maxFeePerGas: 2_000_000_000n,
    maxPriorityFeePerGas: 1_000_000_000n,
    to: recipientB.address,
    value: valueB,
    data: "0x",
    accessList: [],
  });
  const wrongNonce = prepareVoidNativeValueTransferBlockExecutionV1({
    block_hash: `0x${"c".repeat(64)}`,
    block_number: 201,
    snapshot,
    block_policy: blockPolicy,
    transactions: [
      {
        raw_signed_transaction: rawA,
        transfer_policy: transferPolicy,
        ...feeContext,
      },
      {
        raw_signed_transaction: wrongNonceRaw,
        transfer_policy: transferPolicy,
        ...feeContext,
      },
    ],
  });
  assert.equal(wrongNonce.ok, false);
  if (!("reason" in wrongNonce)) throw new Error("missing reason");
  assert.equal(wrongNonce.reason, "block_transaction_prepare_failed");
  assert.equal(
    wrongNonce.detail?.transaction_reason,
    "transaction_nonce_mismatch",
  );

  const malformedRaw =
    prepareVoidNativeValueTransferBlockExecutionV1({
      block_hash: `0x${"f".repeat(64)}`,
      block_number: 204,
      snapshot,
      block_policy: blockPolicy,
      transactions: [
        {
          raw_signed_transaction: "0x1234",
          transfer_policy: transferPolicy,
          ...feeContext,
        },
      ],
    });
  assert.equal(malformedRaw.ok, false);
  if (!("reason" in malformedRaw)) {
    throw new Error("missing reason");
  }
  assert.equal(
    malformedRaw.reason,
    "block_transaction_prepare_failed",
  );
  assert.equal(
    malformedRaw.detail?.transaction_reason,
    "signed_transaction_decode_failed",
  );

  const duplicateHash =
    prepareVoidNativeValueTransferBlockExecutionV1({
      block_hash: `0x${"d".repeat(64)}`,
      block_number: 202,
      snapshot,
      block_policy: blockPolicy,
      transactions: [
        {
          raw_signed_transaction: rawA,
          transfer_policy: transferPolicy,
          ...feeContext,
        },
        {
          raw_signed_transaction: rawA,
          transfer_policy: transferPolicy,
          ...feeContext,
        },
      ],
    });
  assert.equal(duplicateHash.ok, false);

  const wrongChainRaw = await sender.signTransaction({
    type: 2,
    chainId: 2051n,
    nonce: 7,
    gasLimit: 21_000n,
    maxFeePerGas: 2_000_000_000n,
    maxPriorityFeePerGas: 1_000_000_000n,
    to: recipientA.address,
    value: valueA,
    data: "0x",
    accessList: [],
  });
  const wrongChain =
    prepareVoidNativeValueTransferBlockExecutionV1({
      block_hash: `0x${"e".repeat(64)}`,
      block_number: 203,
      snapshot,
      block_policy: blockPolicy,
      transactions: [
        {
          raw_signed_transaction: wrongChainRaw,
          transfer_policy: transferPolicy,
          ...feeContext,
        },
      ],
    });
  assert.equal(wrongChain.ok, false);

  const tampered = {
    ...prepared.plan,
    total_fee_burned_wei: "0",
  };
  const tamperedResult =
    await applyVoidNativeValueTransferBlockExecutionV1({
      plan: tampered,
      confirmation:
        VOID_NATIVE_VALUE_TRANSFER_BLOCK_CONFIRMATION_V1,
      store: new InMemoryBlockStore(),
    });
  assert.equal(tamperedResult.ok, false);
  if (!("reason" in tamperedResult)) {
    throw new Error("missing reason");
  }
  assert.equal(
    tamperedResult.reason,
    "block_plan_binding_mismatch",
  );

  const throwingStore: VoidNativeValueTransferBlockStoreV1 = {
    async apply_native_value_transfer_block_once() {
      throw new Error("synthetic_block_store_failure");
    },
  };
  const unknown =
    await applyVoidNativeValueTransferBlockExecutionV1({
      plan: prepared.plan,
      confirmation:
        VOID_NATIVE_VALUE_TRANSFER_BLOCK_CONFIRMATION_V1,
      store: throwingStore,
    });
  assert.equal(unknown.ok, false);
  if (!("reason" in unknown)) throw new Error("missing reason");
  assert.equal(
    unknown.reason,
    "native_value_transfer_block_store_error",
  );
  assert.equal(unknown.retry_allowed, false);
  assert.equal(unknown.submission_may_have_occurred, true);

  console.log(
    "VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1_GREEN",
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
