import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const signerPath = path.join(
  root,
  "src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts",
);
const dependenciesPath = path.join(
  root,
  "src/economic/buy_void_native_delivery_runtime_dependencies_v1.ts",
);
const runtimePath = path.join(
  root,
  "src/economic/buy_void_native_delivery_runtime_integration_v1.ts",
);
const systemdPath = path.join(
  root,
  "ops/systemd/void-node-live.service.d/80-buy-void-native-delivery-runtime-v1.conf.example",
);
const workflowPath = path.join(
  root,
  ".github/workflows/buy-void-native-delivery-runtime-dependencies-v1.yml",
);

for (const file of [
  signerPath,
  dependenciesPath,
  runtimePath,
  systemdPath,
  workflowPath,
]) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const signer = fs.readFileSync(signerPath, "utf8");
const dependencies = fs.readFileSync(dependenciesPath, "utf8");
const runtime = fs.readFileSync(runtimePath, "utf8");
const systemd = fs.readFileSync(systemdPath, "utf8");
const workflow = fs.readFileSync(workflowPath, "utf8");

assert.ok(
  runtime.includes(
    'import "./buy_void_native_delivery_runtime_dependencies_v1.js";',
  ),
);
assert.ok(
  dependencies.includes(
    '"__void_buy_void_native_delivery_runtime_dependencies_v1"',
  ),
);
assert.ok(
  dependencies.includes(
    '"VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_INJECTOR_ENABLED"',
  ),
);
assert.ok(
  dependencies.includes(
    '"VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL"',
  ),
);
assert.ok(
  signer.includes(
    '"buy-void-native-fulfillment-wallet-v1"',
  ),
);
assert.equal(signer.includes("process.env"), false);
assert.equal(signer.includes("NODE_PRIVKEY_PATH"), false);
assert.equal(dependencies.includes("NODE_PRIVKEY_PATH"), false);
assert.equal(dependencies.includes("eth_sendRawTransaction"), false);
assert.ok(
  systemd.includes(
    "LoadCredential=buy-void-native-fulfillment-wallet-v1:",
  ),
);
assert.ok(
  systemd.includes(
    "VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_INJECTOR_ENABLED=0",
  ),
);
assert.ok(
  systemd.includes(
    "VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_ENABLED=0",
  ),
);
assert.ok(
  systemd.includes(
    "VOID_BUY_VOID_NATIVE_DELIVERY_ASSET_MODE=native_void",
  ),
);
assert.ok(
  systemd.includes(
    "VOID_BUY_VOID_NATIVE_DELIVERY_CHAIN_ID=2050",
  ),
);
assert.ok(
  workflow.includes(
    "prove_buy_void_native_fulfillment_wallet_credential_signer_v1.ts",
  ),
);
assert.ok(
  workflow.includes(
    "prove_buy_void_native_delivery_runtime_dependencies_v1.ts",
  ),
);
assert.ok(
  workflow.includes(
    "prove_buy_void_native_delivery_runtime_dependencies_guard_v1.ts",
  ),
);

console.log(
  "VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_GUARD_V1_GREEN",
);
