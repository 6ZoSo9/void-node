import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const modulePath = path.join(
  root,
  "src",
  "chain",
  "native_value_transfer_state_transition_v1.ts",
);
const proofPath = path.join(
  root,
  "scripts",
  "prove_native_value_transfer_state_transition_v1.ts",
);
const indexPath = path.join(root, "src", "index.ts");
const runtimePath = path.join(
  root,
  "src",
  "economic",
  "buy_void_native_delivery_runtime_integration_v1.ts",
);
const broadcasterPath = path.join(
  root,
  "src",
  "economic",
  "buy_void_native_chain2050_broadcaster_v1.ts",
);

for (const file of [
  modulePath,
  proofPath,
  indexPath,
  runtimePath,
  broadcasterPath,
]) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const moduleText = fs.readFileSync(modulePath, "utf8");
const proofText = fs.readFileSync(proofPath, "utf8");
const indexText = fs.readFileSync(indexPath, "utf8");
const runtimeText = fs.readFileSync(runtimePath, "utf8");
const broadcasterText = fs.readFileSync(broadcasterPath, "utf8");

for (const marker of [
  "VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1",
  "VOID_NATIVE_VALUE_TRANSFER_CONFIRMATION_V1",
  "applyNativeValueTransferStateTransitionV1",
  "prepareVoidNativeValueTransferStateTransitionV1",
  "Transaction.from(raw)",
  "transaction_chain_id_mismatch",
  "transaction_nonce_mismatch",
  "sender_balance_insufficient",
  "fee_credit_total_exceeds_fee_debit",
  "apply_native_value_transfer_once",
  "result = await input.store.apply_native_value_transfer_once(",
  'if (!("commit_id" in result)) {',
  "prestate_fingerprint_sha256",
  "poststate_fingerprint_sha256",
  "plan_binding_sha256",
  "raw_signed_transaction_persisted: false",
  "raw_signed_transaction_returned: false",
  "automatic_retry: false",
  "receipt_wait: false",
  "money_movement_when_store_applies: true",
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
  "writeFile",
  "appendFile",
  "app.post(",
  "app.get(",
  "systemctl",
  "child_process",
]) {
  assert.equal(
    moduleText.includes(forbidden),
    false,
    `forbidden direct authority: ${forbidden}`,
  );
}

for (const forbiddenMount of [
  "native_value_transfer_state_transition_v1",
  "VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1",
]) {
  assert.equal(indexText.includes(forbiddenMount), false);
  assert.equal(runtimeText.includes(forbiddenMount), false);
  assert.equal(broadcasterText.includes(forbiddenMount), false);
}

assert.equal(
  moduleText.includes(
    "input.confirmation\n    !== VOID_NATIVE_VALUE_TRANSFER_CONFIRMATION_V1",
  ),
  true,
  "exact confirmation must be checked before store apply",
);
const applyFunctionStart = moduleText.indexOf(
  "export async function applyVoidNativeValueTransferStateTransitionV1",
);
assert.notEqual(
  applyFunctionStart,
  -1,
  "apply function must exist",
);
const applyFunctionText = moduleText.slice(applyFunctionStart);
const planValidationIndex = applyFunctionText.indexOf(
  "validatePlan(input.plan)",
);
const storeMutationCallIndex = applyFunctionText.indexOf(
  "result = await input.store.apply_native_value_transfer_once(",
);
assert.notEqual(
  planValidationIndex,
  -1,
  "prepared plan validation call must exist",
);
assert.notEqual(
  storeMutationCallIndex,
  -1,
  "exact awaited state-store mutation call must exist",
);
assert.equal(
  planValidationIndex < storeMutationCallIndex,
  true,
  "plan validation must precede the awaited state-store mutation call",
);
const storeResultNarrowingIndex = applyFunctionText.indexOf(
  'if (!("commit_id" in result)) {',
);
assert.notEqual(
  storeResultNarrowingIndex,
  -1,
  "store result union must narrow by required success property",
);
assert.equal(
  storeMutationCallIndex < storeResultNarrowingIndex,
  true,
  "store result narrowing must follow the awaited store call",
);
assert.equal(
  applyFunctionText.includes("if (!result.applied)"),
  false,
  "truthiness narrowing is forbidden for the store result union",
);
assert.equal(
  moduleText.indexOf("transaction.chainId !== EXPECTED_CHAIN_ID")
    < moduleText.indexOf("const totalDebit = value + feeDebit"),
  true,
  "chain validation must precede debit planning",
);
assert.equal(
  moduleText.indexOf("senderState.nonce !== BigInt(transaction.nonce)")
    < moduleText.indexOf("const totalDebit = value + feeDebit"),
  true,
  "nonce validation must precede debit planning",
);
assert.equal(
  moduleText.indexOf("senderState.balance_wei < totalDebit")
    < moduleText.indexOf("const changes:"),
  true,
  "balance validation must precede account changes",
);
assert.equal(
  (moduleText.match(/raw_signed_transaction_persisted: false/g) || [])
    .length >= 1,
  true,
);
assert.equal(
  moduleText.includes("raw_signed_transaction_included: false"),
  true,
  "raw signed transaction must not cross store boundary",
);
assert.equal(
  proofText.includes("Wallet.createRandom()"),
  true,
  "behavior proof must use synthetic ephemeral wallets",
);
assert.equal(
  proofText.includes("native_value_transfer_already_applied"),
  true,
  "behavior proof must cover apply-once duplicate refusal",
);
assert.equal(
  proofText.includes("prepared_plan_binding_mismatch"),
  true,
  "behavior proof must cover plan tamper refusal",
);
assert.equal(
  proofText.includes("submission_may_have_occurred, true"),
  true,
  "behavior proof must cover unknown store outcome",
);

console.log(
  "VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_GUARD_V1_GREEN",
);
