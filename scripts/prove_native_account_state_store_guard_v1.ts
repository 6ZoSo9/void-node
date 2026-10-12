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
const transitionPath = path.join(
  root,
  "src",
  "chain",
  "native_value_transfer_state_transition_v1.ts",
);
const proofPath = path.join(
  root,
  "scripts",
  "prove_native_account_state_store_v1.ts",
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
  transitionPath,
  proofPath,
  indexPath,
  runtimePath,
]) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const moduleText = fs.readFileSync(modulePath, "utf8");
const transitionText = fs.readFileSync(transitionPath, "utf8");
const proofText = fs.readFileSync(proofPath, "utf8");
const indexText = fs.readFileSync(indexPath, "utf8");
const runtimeText = fs.readFileSync(runtimePath, "utf8");

for (const marker of [
  "VOID_NATIVE_ACCOUNT_STATE_STORE_V1",
  "apply_native_value_transfer_once",
  "expected_prestate_comparison: true",
  "multi_account_atomic_write: true",
  "transaction_apply_once_persistence: true",
  "durable_state_version_advancement: true",
  "append_only_commit_journal: true",
  "crash_intent_recovery: true",
  "raw_signed_transaction_input: false",
  "raw_signed_transaction_persistence: false",
  "runtime_route_mount: false",
  "block_executor_wiring: false",
  "dependency_injection: false",
  "automatic_retry: false",
  "state_mutation_when_called: true",
  "money_movement_when_called: true",
  "raw_signed_transaction_included: false",
  "native_account_store_prestate_mismatch",
  "native_value_transfer_already_applied",
  "native_account_store_idempotency_collision",
  "native_account_store_state_version_mismatch",
  "native_account_store_recovery_required",
  "native_account_store_intent_snapshot_divergence",
  "snapshot_fingerprint_sha256",
  "pre_snapshot_fingerprint_sha256",
  "post_snapshot_fingerprint_sha256",
  "fee_burn_mismatch",
  "sender_nonce_increment_invalid",
  "fsyncDirectory",
  "renameSync(paths.snapshot_next, paths.snapshot)",
  "appendJournal(",
  "process.kill(pid, 0)",
]) {
  assert.equal(moduleText.includes(marker), true, marker);
}

assert.equal(
  moduleText.includes("state_store_injected: false"),
  false,
  "deployment receipt terminology must not be required inside the standalone store module",
);

for (const forbidden of [
  "process.env",
  "fetch(",
  "node:http",
  "node:https",
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
    `forbidden authority: ${forbidden}`,
  );
}

for (const marker of [
  "native_account_state_store_v1",
  "VOID_NATIVE_ACCOUNT_STATE_STORE_V1",
]) {
  assert.equal(indexText.includes(marker), false);
  assert.equal(runtimeText.includes(marker), false);
}

assert.equal(
  transitionText.includes(
    "apply_native_value_transfer_once",
  ),
  true,
  "state-transition store boundary must remain intact",
);

const applyStart = moduleText.indexOf("function applyOnce(");
assert.notEqual(applyStart, -1);
const applyText = moduleText.slice(applyStart);
const duplicateLookup = applyText.indexOf(
  "const existing = snapshot.applied_transactions.find(",
);
const duplicateDecision = applyText.indexOf(
  "native_value_transfer_already_applied",
);
const stateVersionDecision = applyText.indexOf(
  "native_account_store_state_version_mismatch",
);
const prestateCheck = applyText.indexOf(
  "native_account_store_prestate_mismatch",
);
const intentWrite = applyText.indexOf(
  "atomicWriteJson(\n      paths.intent",
);
const nextSnapshotWrite = applyText.indexOf(
  "atomicWriteJson(\n      paths.snapshot_next",
);
const snapshotRename = applyText.indexOf(
  "renameSync(paths.snapshot_next, paths.snapshot)",
);
const journalAppend = applyText.indexOf(
  "appendJournal(\n      paths.journal",
);
const intentRemove = applyText.indexOf(
  "unlinkSync(paths.intent)",
);

for (const [label, value] of [
  ["duplicate lookup", duplicateLookup],
  ["duplicate decision", duplicateDecision],
  ["state version decision", stateVersionDecision],
  ["prestate check", prestateCheck],
  ["intent write", intentWrite],
  ["next snapshot write", nextSnapshotWrite],
  ["snapshot rename", snapshotRename],
  ["journal append", journalAppend],
  ["intent remove", intentRemove],
] as const) {
  assert.notEqual(value, -1, label);
}

assert.equal(
  duplicateLookup < duplicateDecision
    && duplicateDecision < stateVersionDecision,
  true,
  "durable idempotency decision must precede stale state-version refusal",
);

assert.equal(
  prestateCheck < intentWrite
    && intentWrite < nextSnapshotWrite
    && nextSnapshotWrite < snapshotRename
    && snapshotRename < journalAppend
    && journalAppend < intentRemove,
  true,
  "durable apply ordering must be prestate -> intent -> next snapshot -> rename -> journal -> intent removal",
);

assert.equal(
  moduleText.includes("raw_signed_transaction"),
  true,
  "raw transaction exclusion must be explicit",
);
assert.equal(
  (moduleText.match(/raw_signed_transaction_included: false/g) || [])
    .length >= 3,
  true,
);
assert.equal(
  proofText.includes("committed_intent_completed"),
  true,
  "proof must cover committed-intent recovery",
);
assert.equal(
  proofText.includes("stale_lock_removed"),
  true,
  "proof must cover stale lock recovery",
);
assert.equal(
  proofText.includes("native_value_transfer_already_applied"),
  true,
  "proof must cover durable apply-once refusal",
);
assert.equal(
  proofText.includes("native_account_store_idempotency_collision"),
  true,
  "proof must cover conflicting transaction reuse of an applied idempotency key",
);
assert.equal(
  proofText.includes("createVoidNativeAccountStateStoreV1"),
  true,
  "proof must reopen the durable store",
);

console.log("VOID_NATIVE_ACCOUNT_STATE_STORE_GUARD_V1_GREEN");
