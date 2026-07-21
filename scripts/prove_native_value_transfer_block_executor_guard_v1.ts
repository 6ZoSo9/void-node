import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const modulePath = path.join(
  root,
  "src",
  "chain",
  "native_value_transfer_block_executor_v1.ts",
);
const proofPath = path.join(
  root,
  "scripts",
  "prove_native_value_transfer_block_executor_v1.ts",
);
const indexPath = path.join(root, "src", "index.ts");
const runtimePath = path.join(
  root,
  "src",
  "economic",
  "buy_void_native_delivery_runtime_integration_v1.ts",
);
const accountStorePath = path.join(
  root,
  "src",
  "chain",
  "native_account_state_store_v1.ts",
);
const transitionPath = path.join(
  root,
  "src",
  "chain",
  "native_value_transfer_state_transition_v1.ts",
);

for (const file of [
  modulePath,
  proofPath,
  indexPath,
  runtimePath,
  accountStorePath,
  transitionPath,
]) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const moduleText = fs.readFileSync(modulePath, "utf8");
const proofText = fs.readFileSync(proofPath, "utf8");
const indexText = fs.readFileSync(indexPath, "utf8");
const runtimeText = fs.readFileSync(runtimePath, "utf8");
const accountStoreText = fs.readFileSync(accountStorePath, "utf8");
const transitionText = fs.readFileSync(transitionPath, "utf8");

for (const marker of [
  "VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1",
  "VOID_NATIVE_VALUE_TRANSFER_BLOCK_CONFIRMATION_V1",
  "prepareVoidNativeValueTransferBlockExecutionV1",
  "applyVoidNativeValueTransferBlockExecutionV1",
  "canonical_transaction_order_required: true",
  "all_transactions_prepared_before_apply: true",
  "projected_nonce_and_balance_chaining: true",
  "per_transaction_minimal_snapshot_selection_required: true",
  "snapshot_selection_validation_authority: false",
  "duplicate_transaction_hash_rejection: true",
  "let selectionTransaction: Transaction;",
  "selectionTransaction = Transaction.from(raw);",
  "const requiredProjectedAddresses = new Set<string>();",
  "const transactionSnapshotAccounts =",
  "accounts: transactionSnapshotAccounts",
  "block_atomic_store_apply_once_required: true",
  "per_transaction_store_apply: false",
  "partial_block_commit: false",
  "raw_signed_transaction_store_boundary: false",
  "apply_native_value_transfer_block_once",
  "block_duplicate_transaction_hash",
  "block_projected_prestate_mismatch",
  "block_plan_binding_mismatch",
  "raw_signed_transactions_included: false",
  'if (!("commit_id" in result))',
]) {
  assert.equal(moduleText.includes(marker), true, marker);
}

for (const forbidden of [
  'from "node:fs"',
  'from "node:http"',
  'from "node:https"',
  "process.env",
  "fetch(",
  "JsonRpcProvider",
  "new Wallet(",
  "signTransaction(",
  "sendTransaction(",
  "broadcastTransaction(",
  "eth_sendRawTransaction",
  "child_process",
  "systemctl",
  "app.post(",
  "app.get(",
  "applyVoidNativeValueTransferStateTransitionV1",
  "apply_native_value_transfer_once",
]) {
  assert.equal(
    moduleText.includes(forbidden),
    false,
    `forbidden direct authority or per-transaction apply: ${forbidden}`,
  );
}

for (const marker of [
  "native_value_transfer_block_executor_v1",
  "VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1",
]) {
  assert.equal(indexText.includes(marker), false);
  assert.equal(runtimeText.includes(marker), false);
  assert.equal(accountStoreText.includes(marker), false);
}

assert.equal(
  transitionText.includes(
    "prepareVoidNativeValueTransferStateTransitionV1",
  ),
  true,
  "transaction preparation contract must remain canonical",
);

const prepareStart = moduleText.indexOf(
  "export function prepareVoidNativeValueTransferBlockExecutionV1",
);
const applyStart = moduleText.indexOf(
  "export async function applyVoidNativeValueTransferBlockExecutionV1",
);
assert.notEqual(prepareStart, -1);
assert.notEqual(applyStart, -1);
const prepareText = moduleText.slice(prepareStart, applyStart);
const applyText = moduleText.slice(applyStart);

assert.equal(
  prepareText.includes(
    "prepareVoidNativeValueTransferStateTransitionV1",
  ),
  true,
  "every transaction must use the canonical state-transition prepare function",
);
const metadataDecodeIndex = prepareText.indexOf(
  "selectionTransaction = Transaction.from(raw);",
);
const snapshotSelectionIndex = prepareText.indexOf(
  "const transactionSnapshotAccounts =",
);
const canonicalPrepareIndex = prepareText.indexOf(
  "prepareVoidNativeValueTransferStateTransitionV1({",
);
assert.notEqual(metadataDecodeIndex, -1);
assert.notEqual(snapshotSelectionIndex, -1);
assert.notEqual(canonicalPrepareIndex, -1);
assert.equal(
  metadataDecodeIndex < snapshotSelectionIndex
    && snapshotSelectionIndex < canonicalPrepareIndex,
  true,
  "metadata decode and minimal snapshot selection must precede canonical preparation",
);
assert.equal(
  prepareText.includes(
    "accounts: [...projected.values()].sort(",
  ),
  false,
  "the full projected block snapshot must not be passed to a single transaction transition",
);
assert.equal(
  prepareText.includes(
    "projectedStateVersion = `bsv1-${sha256({",
  ),
  true,
  "projected state version must advance after every prepared transaction",
);
assert.equal(
  prepareText.includes(
    "seenTransactionHashes.has(plan.transaction_hash)",
  ),
  true,
  "duplicate transaction hashes must be rejected before block apply",
);
assert.equal(
  prepareText.includes(
    "per_transaction_store_apply_performed: false",
  ),
  true,
  "prepare plan must prove no per-transaction store apply",
);

const planValidationIndex = applyText.indexOf(
  "validateBlockPlan(input.plan)",
);
const storeCallIndex = applyText.indexOf(
  "await input.store.apply_native_value_transfer_block_once(",
);
assert.notEqual(planValidationIndex, -1);
assert.notEqual(storeCallIndex, -1);
assert.equal(
  planValidationIndex < storeCallIndex,
  true,
  "complete block plan validation must precede the single atomic store call",
);
assert.equal(
  (applyText.match(/apply_native_value_transfer_block_once/g) || [])
    .length,
  2,
  "one interface capability check and one awaited block-store call are expected",
);
assert.equal(
  applyText.includes("raw_signed_transactions_included: false"),
  true,
  "raw signed transactions must not cross the block-store boundary",
);

assert.equal(
  proofText.includes("nonce: 7"),
  true,
  "proof must include the first sequential sender nonce",
);
assert.equal(
  proofText.includes("nonce: 8"),
  true,
  "proof must include the second sequential sender nonce",
);
assert.equal(
  proofText.includes(
    "first transaction must exclude the unrelated second recipient",
  ),
  true,
  "proof must lock minimal per-transaction snapshot selection",
);
assert.equal(
  proofText.includes("signed_transaction_decode_failed"),
  true,
  "proof must cover malformed metadata decode before canonical preparation",
);
assert.equal(
  proofText.includes("native_value_transfer_block_already_applied"),
  true,
  "proof must cover durable block replay refusal",
);
assert.equal(
  proofText.includes("block_plan_binding_mismatch"),
  true,
  "proof must cover tampered block-plan refusal",
);
assert.equal(
  proofText.includes("submission_may_have_occurred, true"),
  true,
  "proof must cover unknown block-store outcome",
);

console.log(
  "VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_GUARD_V1_GREEN",
);
