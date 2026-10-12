import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const modulePath = path.join(
  root,
  "src",
  "chain",
  "native_account_state_store_v1.ts",
);
const proofPath = path.join(
  root,
  "scripts",
  "prove_native_account_state_store_block_atomic_v1.ts",
);
const executorPath = path.join(
  root,
  "src",
  "chain",
  "native_value_transfer_block_executor_v1.ts",
);
const indexPath = path.join(root, "src", "index.ts");
const runtimePath = path.join(
  root,
  "src",
  "economic",
  "buy_void_native_delivery_runtime_integration_v1.ts",
);

for (const file of [
  modulePath,
  proofPath,
  executorPath,
  indexPath,
  runtimePath,
]) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const moduleText = fs.readFileSync(modulePath, "utf8");
const proofText = fs.readFileSync(proofPath, "utf8");
const executorText = fs.readFileSync(executorPath, "utf8");
const indexText = fs.readFileSync(indexPath, "utf8");
const runtimeText = fs.readFileSync(runtimePath, "utf8");

for (const marker of [
  "block_apply_once_persistence: true",
  "block_atomic_multi_transaction_write: true",
  "block_parent_snapshot_binding: true",
  "block_final_accounts_fingerprint_validation: true",
  "block_recovery_through_shared_intent_protocol: true",
  "VoidNativeValueTransferBlockStoreV1",
  "apply_native_value_transfer_block_once",
  "function validateBlockApplyRequest(",
  "function applyBlockOnce(",
  "void_native_account_state_store_block_journal_entry_v1",
  "native_value_transfer_block_already_applied",
  "native_account_store_block_idempotency_collision",
  "native_account_store_block_parent_snapshot_mismatch",
  "native_account_store_block_prestate_mismatch",
  "native_account_store_block_final_accounts_fingerprint_mismatch",
  "raw_signed_transactions_included: false",
  "block_atomic_apply_once: true",
]) {
  assert.equal(moduleText.includes(marker), true, marker);
}

for (const forbidden of [
  "process.env",
  "fetch(",
  'from "node:http"',
  'from "node:https"',
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
]) {
  assert.equal(
    moduleText.includes(forbidden),
    false,
    `forbidden direct authority: ${forbidden}`,
  );
}

for (const marker of [
  "apply_native_value_transfer_block_once",
  "VOID_NATIVE_ACCOUNT_STATE_STORE_BLOCK_ATOMIC",
]) {
  assert.equal(indexText.includes(marker), false);
  assert.equal(runtimeText.includes(marker), false);
}

assert.equal(
  executorText.includes(
    "apply_native_value_transfer_block_once",
  ),
  true,
  "canonical executor must retain the block-atomic store boundary",
);

const applyStart = moduleText.indexOf("function applyBlockOnce(");
const initializeStart = moduleText.indexOf(
  "export function initializeVoidNativeAccountStateStoreV1(",
);
assert.notEqual(applyStart, -1);
assert.notEqual(initializeStart, -1);
const applyText = moduleText.slice(applyStart, initializeStart);

const duplicateIndex = applyText.indexOf(
  "native_value_transfer_block_already_applied",
);
const parentVersionIndex = applyText.indexOf(
  "native_account_store_block_state_version_mismatch",
);
const parentFingerprintIndex = applyText.indexOf(
  "native_account_store_block_parent_snapshot_mismatch",
);
const prestateIndex = applyText.indexOf(
  "native_account_store_block_prestate_mismatch",
);
const finalFingerprintIndex = applyText.indexOf(
  "native_account_store_block_final_accounts_fingerprint_mismatch",
);
const intentWriteIndex = applyText.indexOf(
  "atomicWriteJson(\n      paths.intent",
);
const nextSnapshotIndex = applyText.indexOf(
  "atomicWriteJson(\n      paths.snapshot_next",
);
const renameIndex = applyText.indexOf(
  "renameSync(paths.snapshot_next, paths.snapshot)",
);
const journalIndex = applyText.indexOf(
  "appendJournal(\n      paths.journal",
);
const intentRemoveIndex = applyText.indexOf(
  "unlinkSync(paths.intent)",
);

for (const [label, value] of [
  ["duplicate", duplicateIndex],
  ["parent version", parentVersionIndex],
  ["parent fingerprint", parentFingerprintIndex],
  ["prestate", prestateIndex],
  ["final fingerprint", finalFingerprintIndex],
  ["intent write", intentWriteIndex],
  ["next snapshot", nextSnapshotIndex],
  ["rename", renameIndex],
  ["journal", journalIndex],
  ["intent remove", intentRemoveIndex],
] as const) {
  assert.notEqual(value, -1, label);
}

assert.equal(
  duplicateIndex < parentVersionIndex
    && parentVersionIndex < parentFingerprintIndex
    && parentFingerprintIndex < prestateIndex
    && prestateIndex < finalFingerprintIndex
    && finalFingerprintIndex < intentWriteIndex
    && intentWriteIndex < nextSnapshotIndex
    && nextSnapshotIndex < renameIndex
    && renameIndex < journalIndex
    && journalIndex < intentRemoveIndex,
  true,
  "block apply ordering must be idempotency -> parent binding -> prestate -> final fingerprint -> intent -> snapshot -> journal -> intent removal",
);

assert.equal(
  (applyText.match(/apply_native_value_transfer_block_once/g) || [])
    .length,
  0,
  "the store implementation must not recursively call its own interface",
);
assert.equal(
  proofText.includes(
    "native_value_transfer_block_already_applied",
  ),
  true,
  "proof must cover durable block replay refusal",
);
assert.equal(
  proofText.includes("committed_intent_completed"),
  true,
  "proof must cover committed block-intent recovery",
);
assert.equal(
  proofText.includes(
    "void_native_account_state_store_block_journal_entry_v1",
  ),
  true,
  "proof must inspect the durable block journal entry",
);
assert.equal(
  proofText.includes(
    "block application must not fabricate transaction-level records",
  ),
  true,
  "proof must separate block idempotency from transaction idempotency",
);

console.log(
  "VOID_NATIVE_ACCOUNT_STATE_STORE_BLOCK_ATOMIC_GUARD_V1_GREEN",
);
