import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";
import {
  VOID_NATIVE_ACCOUNT_STATE_STORE_FILES_V1,
  VOID_NATIVE_ACCOUNT_STATE_STORE_INITIALIZE_CONFIRMATION_V1,
  VOID_NATIVE_ACCOUNT_STATE_STORE_RECOVER_CONFIRMATION_V1,
  createVoidNativeAccountStateStoreV1,
  initializeVoidNativeAccountStateStoreV1,
  recoverVoidNativeAccountStateStoreV1,
} from "../src/chain/native_account_state_store_v1.js";
import {
  VOID_NATIVE_VALUE_TRANSFER_BLOCK_CONFIRMATION_V1,
  applyVoidNativeValueTransferBlockExecutionV1,
  prepareVoidNativeValueTransferBlockExecutionV1,
} from "../src/chain/native_value_transfer_block_executor_v1.js";

const root = mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-native-account-store-block-atomic-proof-",
  ),
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
    genesis_id: "block-atomic-store-proof",
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

  const store = createVoidNativeAccountStateStoreV1({
    root_directory: root,
    policy: storePolicy,
  });
  assert.equal(store.status().block_atomic_apply_once, true);

  const parentSnapshot = store.read_state_snapshot();

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

  const prepared = prepareVoidNativeValueTransferBlockExecutionV1({
    block_hash: `0x${"a".repeat(64)}`,
    block_number: 300,
    snapshot: parentSnapshot,
    block_policy: {
      max_transactions_per_block: 100,
      max_total_raw_transaction_bytes: 1_000_000,
      max_total_value_wei: valueA + valueB + 1n,
      max_total_fee_debit_wei: feeDebit * 3n,
      max_total_fee_burned_wei: feeDebit * 3n,
    },
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

  const wrongConfirmation =
    await applyVoidNativeValueTransferBlockExecutionV1({
      plan: prepared.plan,
      confirmation: "wrong",
      store,
    });
  assert.equal(wrongConfirmation.ok, false);
  assert.equal(
    store.read_state_snapshot().snapshot_fingerprint_sha256,
    parentSnapshot.snapshot_fingerprint_sha256,
  );

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
  assert.equal(applied.money_movement_performed, true);

  const after = store.read_state_snapshot();
  assert.equal(
    after.state_version,
    prepared.plan.final_state_version,
  );
  assert.equal(after.last_commit_id, applied.commit_id);
  assert.equal(
    after.applied_transactions.length,
    0,
    "block application must not fabricate transaction-level records",
  );

  const byAddress = new Map(
    after.accounts.map((account) => [account.address, account]),
  );
  assert.equal(
    byAddress.get(sender.address.toLowerCase())?.nonce,
    "9",
  );
  assert.equal(
    byAddress.get(sender.address.toLowerCase())?.balance_wei,
    (
      senderBalance - valueA - valueB - feeDebit * 2n
    ).toString(),
  );
  assert.equal(
    byAddress.get(recipientA.address.toLowerCase())
      ?.balance_wei,
    (11n + valueA).toString(),
  );
  assert.equal(
    byAddress.get(recipientB.address.toLowerCase())
      ?.balance_wei,
    (22n + valueB).toString(),
  );
  assert.equal(
    byAddress.get(feeRecipient.address.toLowerCase())
      ?.balance_wei,
    (33n + feeCredit * 2n).toString(),
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

  const journalPath = path.join(
    root,
    VOID_NATIVE_ACCOUNT_STATE_STORE_FILES_V1.journal,
  );
  const journalText = readFileSync(journalPath, "utf8");
  const journalLines = journalText
    .split("\n")
    .filter(Boolean);
  assert.equal(journalLines.length, 2);
  const blockEntry = JSON.parse(journalLines[1]);
  assert.equal(
    blockEntry.schema,
    "void_native_account_state_store_block_journal_entry_v1",
  );
  assert.equal(
    blockEntry.block_idempotency_key_sha256,
    prepared.plan.block_idempotency_key_sha256,
  );
  assert.equal(blockEntry.transaction_count, 2);
  assert.equal(
    blockEntry.raw_signed_transactions_included,
    false,
  );
  assert.equal(journalText.includes(rawA.slice(2, 42)), false);
  assert.equal(journalText.includes(rawB.slice(2, 42)), false);

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
        parentSnapshot.snapshot_fingerprint_sha256,
      post_snapshot_fingerprint_sha256:
        after.snapshot_fingerprint_sha256,
      post_snapshot: after,
      journal_entry: blockEntry,
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
  assert.equal(
    readFileSync(journalPath, "utf8")
      .split("\n")
      .filter(Boolean).length,
    2,
  );

  const directTampered = {
    marker: "VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1" as const,
    version: 1 as const,
    confirmation:
      VOID_NATIVE_VALUE_TRANSFER_BLOCK_CONFIRMATION_V1,
    block_idempotency_key_sha256:
      prepared.plan.block_idempotency_key_sha256,
    block_hash: prepared.plan.block_hash,
    block_number: prepared.plan.block_number,
    transaction_count: prepared.plan.transaction_count,
    parent_state_version: prepared.plan.parent_state_version,
    parent_snapshot_fingerprint_sha256:
      prepared.plan.parent_snapshot_fingerprint_sha256,
    final_state_version: prepared.plan.final_state_version,
    final_accounts_fingerprint_sha256:
      "c".repeat(64),
    ordered_transaction_hashes:
      prepared.plan.ordered_transaction_hashes,
    transaction_plan_bindings_sha256:
      prepared.plan.transaction_plans.map(
        (plan) => plan.plan_binding_sha256,
      ),
    aggregate_account_changes:
      prepared.plan.aggregate_account_changes,
    total_fee_burned_wei:
      prepared.plan.total_fee_burned_wei,
    block_binding_sha256:
      prepared.plan.block_binding_sha256,
    raw_signed_transactions_included: false as const,
  };
  const tampered =
    await store.apply_native_value_transfer_block_once(
      directTampered,
    );
  assert.equal(tampered.applied, false);

  console.log(
    "VOID_NATIVE_ACCOUNT_STATE_STORE_BLOCK_ATOMIC_V1_GREEN",
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
