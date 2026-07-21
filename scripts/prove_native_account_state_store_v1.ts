import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  Transaction,
  Wallet,
} from "ethers";
import {
  VOID_NATIVE_VALUE_TRANSFER_CONFIRMATION_V1,
  applyVoidNativeValueTransferStateTransitionV1,
  prepareVoidNativeValueTransferStateTransitionV1,
} from "../src/chain/native_value_transfer_state_transition_v1.js";
import {
  VOID_NATIVE_ACCOUNT_STATE_STORE_FILES_V1,
  VOID_NATIVE_ACCOUNT_STATE_STORE_INITIALIZE_CONFIRMATION_V1,
  VOID_NATIVE_ACCOUNT_STATE_STORE_RECOVER_CONFIRMATION_V1,
  createVoidNativeAccountStateStoreV1,
  initializeVoidNativeAccountStateStoreV1,
  recoverVoidNativeAccountStateStoreV1,
} from "../src/chain/native_account_state_store_v1.js";

const root = mkdtempSync(
  path.join(os.tmpdir(), "void-native-account-store-proof-"),
);

try {
  const sender = Wallet.createRandom();
  const recipient = Wallet.createRandom();
  const feeRecipient = Wallet.createRandom();

  const value = 1_000_000_000_000_000_000n;
  const effectiveGasPrice = 1_000_000_000n;
  const feeDebit = 21_000n * effectiveGasPrice;
  const feeCredit = 15_000_000_000_000n;
  const senderBalance =
    value + feeDebit + 5_000_000_000_000_000n;

  const storePolicy = {
    max_accounts: 100,
    max_applied_transactions: 1_000,
    max_snapshot_bytes: 4_000_000,
    max_journal_bytes: 8_000_000,
    stale_lock_min_age_ms: 1_000,
  };

  const wrongInitialize = initializeVoidNativeAccountStateStoreV1({
    root_directory: root,
    policy: storePolicy,
    genesis_id: "mainnet0-proof",
    accounts: [
      {
        address: sender.address,
        balance_wei: senderBalance,
        nonce: 7,
      },
    ],
    confirmation: "wrong",
  });
  assert.equal(wrongInitialize.ok, false);

  const initialized = initializeVoidNativeAccountStateStoreV1({
    root_directory: root,
    policy: storePolicy,
    genesis_id: "mainnet0-proof",
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
    confirmation:
      VOID_NATIVE_ACCOUNT_STATE_STORE_INITIALIZE_CONFIRMATION_V1,
  });
  if (!initialized.ok) throw new Error(initialized.reason);
  assert.equal(initialized.status, "initialized");
  assert.equal(initialized.account_count, 3);
  assert.equal(initialized.money_movement_performed, false);

  const store = createVoidNativeAccountStateStoreV1({
    root_directory: root,
    policy: storePolicy,
  });
  const initial = store.read_state_snapshot();
  assert.equal(initial.accounts.length, 3);
  assert.equal(initial.applied_transactions.length, 0);

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
  const transaction = Transaction.from(raw);
  assert.ok(transaction.hash);

  const prepared = prepareVoidNativeValueTransferStateTransitionV1({
    raw_signed_transaction: raw,
    policy: {
      expected_chain_id: 2050,
      required_transaction_type: 2,
      required_gas_limit: 21_000,
      max_raw_transaction_bytes: 131_072,
      max_value_wei: value * 2n,
      max_fee_debit_wei: feeDebit * 2n,
      max_fee_credit_count: 2,
      sender_allowlist: [sender.address],
      fee_credit_allowlist: [feeRecipient.address],
    },
    snapshot: {
      state_version: initial.state_version,
      accounts: initial.accounts,
    },
    execution_context: {
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
    },
  });
  if ("reason" in prepared) throw new Error(prepared.reason);

  const wrongConfirmation =
    await applyVoidNativeValueTransferStateTransitionV1({
      plan: prepared.plan,
      confirmation: "wrong",
      store,
    });
  assert.equal(wrongConfirmation.ok, false);

  const applied =
    await applyVoidNativeValueTransferStateTransitionV1({
      plan: prepared.plan,
      confirmation:
        VOID_NATIVE_VALUE_TRANSFER_CONFIRMATION_V1,
      store,
    });
  if ("reason" in applied) throw new Error(applied.reason);
  assert.equal(applied.status, "applied");
  assert.equal(applied.transaction_hash, transaction.hash);
  assert.equal(applied.money_movement_performed, true);

  const after = store.read_state_snapshot();
  assert.notEqual(after.state_version, initial.state_version);
  assert.equal(after.applied_transactions.length, 1);
  assert.equal(after.last_commit_id, applied.commit_id);

  const byAddress = new Map(
    after.accounts.map((account) => [account.address, account]),
  );
  assert.equal(
    byAddress.get(sender.address.toLowerCase())?.balance_wei,
    (senderBalance - value - feeDebit).toString(),
  );
  assert.equal(
    byAddress.get(sender.address.toLowerCase())?.nonce,
    "8",
  );
  assert.equal(
    byAddress.get(recipient.address.toLowerCase())?.balance_wei,
    (11n + value).toString(),
  );
  assert.equal(
    byAddress.get(feeRecipient.address.toLowerCase())?.balance_wei,
    (22n + feeCredit).toString(),
  );

  const duplicate =
    await applyVoidNativeValueTransferStateTransitionV1({
      plan: prepared.plan,
      confirmation:
        VOID_NATIVE_VALUE_TRANSFER_CONFIRMATION_V1,
      store,
    });
  assert.equal(duplicate.ok, false);
  if (!("reason" in duplicate)) throw new Error("missing reason");
  assert.equal(
    duplicate.reason,
    "native_value_transfer_already_applied",
  );

  const idempotencyCollision =
    await store.apply_native_value_transfer_once({
      marker: "VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1",
      version: 1,
      confirmation:
        VOID_NATIVE_VALUE_TRANSFER_CONFIRMATION_V1,
      idempotency_key_sha256:
        prepared.plan.idempotency_key_sha256,
      transaction_hash: `0x${"d".repeat(64)}`,
      state_version: prepared.plan.state_version,
      prestate_fingerprint_sha256:
        prepared.plan.prestate_fingerprint_sha256,
      poststate_fingerprint_sha256:
        prepared.plan.poststate_fingerprint_sha256,
      plan_binding_sha256:
        prepared.plan.plan_binding_sha256,
      account_changes: prepared.plan.account_changes,
      fee_burned_wei: prepared.plan.fee_burned_wei,
      raw_signed_transaction_included: false,
    });
  assert.equal(idempotencyCollision.applied, false);
  if (idempotencyCollision.applied) {
    throw new Error("unexpected collision application");
  }
  assert.equal(
    idempotencyCollision.reason,
    "native_account_store_idempotency_collision",
  );
  assert.equal(
    idempotencyCollision.existing_transaction_hash,
    transaction.hash,
  );

  const reopened = createVoidNativeAccountStateStoreV1({
    root_directory: root,
    policy: storePolicy,
  });
  const reopenedSnapshot = reopened.read_state_snapshot();
  assert.equal(
    reopenedSnapshot.snapshot_fingerprint_sha256,
    after.snapshot_fingerprint_sha256,
  );
  assert.equal(reopenedSnapshot.applied_transactions.length, 1);

  const stalePlanResult =
    await applyVoidNativeValueTransferStateTransitionV1({
      plan: {
        ...prepared.plan,
        idempotency_key_sha256: "c".repeat(64),
      },
      confirmation:
        VOID_NATIVE_VALUE_TRANSFER_CONFIRMATION_V1,
      store,
    });
  assert.equal(stalePlanResult.ok, false);

  const journalPath = path.join(
    root,
    VOID_NATIVE_ACCOUNT_STATE_STORE_FILES_V1.journal,
  );
  const journalBefore = readFileSync(journalPath, "utf8");
  const journalLinesBefore = journalBefore
    .split("\n")
    .filter(Boolean);
  assert.equal(journalLinesBefore.length, 2);

  const appliedJournalEntry = JSON.parse(
    journalLinesBefore[journalLinesBefore.length - 1],
  );
  const intentPath = path.join(
    root,
    VOID_NATIVE_ACCOUNT_STATE_STORE_FILES_V1.intent,
  );
  writeFileSync(
    intentPath,
    `${JSON.stringify({
      schema: "void_native_account_state_store_intent_v1",
      marker: "VOID_NATIVE_ACCOUNT_STATE_STORE_V1",
      version: 1,
      created_at_ms: Date.now() - 10_000,
      pre_snapshot_fingerprint_sha256:
        initial.snapshot_fingerprint_sha256,
      post_snapshot_fingerprint_sha256:
        after.snapshot_fingerprint_sha256,
      post_snapshot: after,
      journal_entry: appliedJournalEntry,
      raw_signed_transaction_included: false,
    }, null, 2)}\n`,
    { mode: 0o600 },
  );

  const recovery = recoverVoidNativeAccountStateStoreV1({
    root_directory: root,
    policy: storePolicy,
    confirmation:
      VOID_NATIVE_ACCOUNT_STATE_STORE_RECOVER_CONFIRMATION_V1,
  });
  if (!recovery.ok) throw new Error(recovery.reason);
  assert.equal(recovery.status, "committed_intent_completed");
  assert.equal(recovery.intent_recovered, true);
  assert.equal(recovery.journal_entry_appended, false);

  const journalAfter = readFileSync(journalPath, "utf8");
  assert.equal(
    journalAfter.split("\n").filter(Boolean).length,
    journalLinesBefore.length,
  );

  const lockPath = path.join(
    root,
    VOID_NATIVE_ACCOUNT_STATE_STORE_FILES_V1.lock,
  );
  writeFileSync(
    lockPath,
    `${JSON.stringify({
      schema: "void_native_account_state_store_lock_v1",
      marker: "VOID_NATIVE_ACCOUNT_STATE_STORE_V1",
      version: 1,
      pid: 999_999_999,
      created_at_ms: Date.now() - 60_000,
    })}\n`,
    { mode: 0o600 },
  );

  const staleLockRecovery =
    recoverVoidNativeAccountStateStoreV1({
      root_directory: root,
      policy: storePolicy,
      confirmation:
        VOID_NATIVE_ACCOUNT_STATE_STORE_RECOVER_CONFIRMATION_V1,
    });
  if (!staleLockRecovery.ok) {
    throw new Error(staleLockRecovery.reason);
  }
  assert.equal(
    staleLockRecovery.status,
    "stale_lock_removed",
  );
  assert.equal(staleLockRecovery.stale_lock_removed, true);

  const finalStatus = store.status();
  assert.equal(finalStatus.initialized, true);
  assert.equal(finalStatus.recovery_required, false);
  assert.equal(finalStatus.lock_present, false);
  assert.equal(finalStatus.runtime_mounted, false);
  assert.equal(finalStatus.block_executor_wired, false);

  for (const file of [
    VOID_NATIVE_ACCOUNT_STATE_STORE_FILES_V1.snapshot,
    VOID_NATIVE_ACCOUNT_STATE_STORE_FILES_V1.journal,
  ]) {
    const text = readFileSync(path.join(root, file), "utf8");
    assert.equal(text.includes(raw.slice(2, 42)), false);
  }

  console.log("VOID_NATIVE_ACCOUNT_STATE_STORE_V1_GREEN");
} finally {
  rmSync(root, { recursive: true, force: true });
}
