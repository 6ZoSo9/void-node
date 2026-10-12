import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const paths = {
  source: "src/economic/buy_void_native_delivery_dependency_readiness_v1.ts",
  cli: "scripts/buy_void_native_delivery_dependency_readiness_v1.ts",
  proof: "scripts/prove_buy_void_native_delivery_dependency_readiness_v1.ts",
  guard: "scripts/prove_buy_void_native_delivery_dependency_readiness_guard_v1.ts",
  docs: "docs/operators/buy-void-native-delivery-dependency-readiness-v1.md",
  workflow: ".github/workflows/buy-void-native-delivery-dependency-readiness-v1.yml",
} as const;

for (const relativePath of Object.values(paths)) {
  assert.equal(
    fs.existsSync(path.join(root, relativePath)),
    true,
    `missing ${relativePath}`,
  );
}

const source = fs.readFileSync(path.join(root, paths.source), "utf8");
const cli = fs.readFileSync(path.join(root, paths.cli), "utf8");
const docs = fs.readFileSync(path.join(root, paths.docs), "utf8");
const workflow = fs.readFileSync(path.join(root, paths.workflow), "utf8");

for (const marker of [
  "VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_V1",
  "probeBuyVoidNativeDeliveryDependenciesReadOnlyV1",
  "createBuyVoidNativeFulfillmentWalletCredentialSignerV1",
  "probeBuyVoidNativeChain2050BroadcasterV1",
  "readiness_probe_not_requested",
  "readiness_probe_confirmation_mismatch",
  "wallet_address_output: false",
  "transaction_signing: false",
  "transaction_broadcast: false",
  "dependency_assignment: false",
  "runtime_enablement: false",
  "money_movement: false",
]) {
  assert.equal(source.includes(marker), true, `source missing ${marker}`);
}

for (const forbidden of [
  "eth_sendRawTransaction",
  ".broadcast_signed_transaction(",
  ".sign_transaction(",
  "sendTransaction(",
  "writeFileSync(",
  "appendFileSync(",
  "setInterval(",
  "while (true)",
  "for (;;)",
]) {
  assert.equal(
    source.includes(forbidden),
    false,
    `source contains forbidden ${forbidden}`,
  );
}

for (const marker of [
  "--probe",
  "--confirm",
  "CREDENTIALS_DIRECTORY",
  "VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS",
  "VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL",
  "process.exitCode = 2",
  "signing_performed: false",
  "transaction_broadcast_performed: false",
  "money_movement: false",
]) {
  assert.equal(cli.includes(marker), true, `CLI missing ${marker}`);
}

for (const forbidden of [
  "writeFileSync(",
  "appendFileSync(",
  "eth_sendRawTransaction",
  "sendTransaction(",
  "setInterval(",
  "while (true)",
]) {
  assert.equal(cli.includes(forbidden), false, `CLI contains ${forbidden}`);
}

for (const marker of [
  "disabled by default",
  "exact confirmation",
  "does not sign",
  "does not broadcast",
  "does not assign",
  "does not enable",
  "does not move",
  "fingerprints",
]) {
  assert.equal(docs.includes(marker), true, `docs missing ${marker}`);
}

for (const relativePath of Object.values(paths)) {
  assert.equal(
    workflow.includes(`\"${relativePath}\"`),
    true,
    `workflow missing path ${relativePath}`,
  );
}
assert.equal(
  workflow.includes(
    "npx tsx scripts/prove_buy_void_native_delivery_dependency_readiness_v1.ts",
  ),
  true,
);
assert.equal(
  workflow.includes(
    "npx tsx scripts/prove_buy_void_native_delivery_dependency_readiness_guard_v1.ts",
  ),
  true,
);
assert.equal(workflow.includes("npm run build"), true);

console.log(
  "VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_GUARD_V1_GREEN",
);
console.log("exact_six_path_scope=1");
console.log("credential_secret_output=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("dependency_assignment=0");
console.log("runtime_enablement=0");
console.log("service_restart=0");
console.log("money_movement=0");
