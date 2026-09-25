#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  AUTHORITY,
  CANONICAL_COUPLED_LAUNCH_ID,
  CANONICAL_VOID_TOKEN,
  CHAIN_ID,
  VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_PREPARATION_V1,
  prepareWcVoidMarketVaultDeploymentV1,
} from "../tools/void-wc-void-market-vault-deployment-preparation-v1.mjs";

const manifest = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-v2-compiled-identity-v1.json",
    "utf8",
  ),
);
const creation = fs.readFileSync(
  "ops/mainnet0/wc-void-market-vault-v2-creation-bytecode.hex",
  "utf8",
);
const candidate = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-deployment-preparation-v1.json",
    "utf8",
  ),
);

assert.equal(
  VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_PREPARATION_V1,
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_PREPARATION_V1",
);
assert.equal(CHAIN_ID, 2050);
assert.equal(
  CANONICAL_VOID_TOKEN,
  "0x470075b85352eb86f7d089fb9ba88945f12aad94",
);
assert.equal(
  CANONICAL_COUPLED_LAUNCH_ID,
  "0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83",
);

const canonicalReady = prepareWcVoidMarketVaultDeploymentV1({
  manifest,
  creationBytecodeHex: creation,
  bindings: candidate.bindings,
});
assert.equal(canonicalReady.status, "SOURCE_READY");
assert.equal(
  candidate.role_binding_authorization_id,
  "voidwcvra1_8bd7a5dbb1f27b61fd236ee0588c1271cb86e719a7de8db0465a6070831b8b36",
);
assert.equal(candidate.role_binding_authorized, true);
assert.equal(
  canonicalReady.bindings.launch_controller,
  "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e",
);
assert.equal(
  canonicalReady.bindings.settlement_executor,
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
);
assert.equal(
  canonicalReady.bindings.closeout_controller,
  "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b",
);
assert.equal(
  canonicalReady.bindings.coupled_launch_id,
  CANONICAL_COUPLED_LAUNCH_ID,
);
assert.equal(canonicalReady.role_bindings_distinct, true);
assert.equal(canonicalReady.recovery_authorities_distinct, true);
assert.equal(canonicalReady.deployment_data_constructed, true);
assert.equal(canonicalReady.deployment_data_bytes, 9441 + 160);
assert.match(canonicalReady.deployment_data_sha256, /^[0-9a-f]{64}$/);
assert.equal(canonicalReady.deployer_address, null);
assert.equal(canonicalReady.deployment_nonce, null);
assert.equal(canonicalReady.predicted_contract_address, null);
assert.equal(canonicalReady.fee_observation, null);
assert.equal(canonicalReady.unsigned_eip1559_transaction, null);
assert.equal(canonicalReady.deployment_authority, false);

const readyBindings = {
  void_token: CANONICAL_VOID_TOKEN,
  launch_controller: "0x1111111111111111111111111111111111111111",
  settlement_executor: "0x2222222222222222222222222222222222222222",
  closeout_controller: "0x3333333333333333333333333333333333333333",
  coupled_launch_id: CANONICAL_COUPLED_LAUNCH_ID,
};

const ready = prepareWcVoidMarketVaultDeploymentV1({
  manifest,
  creationBytecodeHex: creation,
  bindings: readyBindings,
});
assert.equal(ready.status, "SOURCE_READY");
assert.equal(ready.chain_id, 2050);
assert.equal(ready.contract_name, "WCVoidMarketVaultV2");
assert.equal(ready.role_bindings_distinct, true);
assert.equal(ready.recovery_authorities_distinct, true);
assert.equal(ready.deployment_data_constructed, true);
assert.equal(ready.deployment_data_bytes, 9441 + 160);
assert.match(ready.deployment_data_sha256, /^[0-9a-f]{64}$/);
assert.equal(ready.deployer_address, null);
assert.equal(ready.deployment_nonce, null);
assert.equal(ready.predicted_contract_address, null);
assert.equal(ready.unsigned_eip1559_transaction, null);
assert.equal(ready.deployment_authority, false);

for (const [key, value] of Object.entries(AUTHORITY)) {
  if (key === "source_only_preparation") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

function rejects(bindings, code) {
  assert.throws(
    () =>
      prepareWcVoidMarketVaultDeploymentV1({
        manifest,
        creationBytecodeHex: creation,
        bindings,
      }),
    (error) => error?.code === code,
    code,
  );
}

rejects(
  {
    ...readyBindings,
    void_token: "0x4444444444444444444444444444444444444444",
  },
  "void_token_not_canonical",
);

rejects(
  {
    ...readyBindings,
    closeout_controller: readyBindings.settlement_executor,
  },
  "recovery_authorities_must_be_distinct",
);

rejects(
  {
    ...readyBindings,
    launch_controller: readyBindings.settlement_executor,
  },
  "production_role_bindings_must_be_distinct",
);

rejects(
  {
    ...readyBindings,
    launch_controller: CANONICAL_VOID_TOKEN,
  },
  "role_address_must_not_equal_void_token",
);

rejects(
  {
    ...readyBindings,
    coupled_launch_id:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  "coupled_launch_id_invalid",
);

rejects(
  {
    ...readyBindings,
    coupled_launch_id:
      "0x1111111111111111111111111111111111111111111111111111111111111111",
  },
  "coupled_launch_id_not_canonical",
);

{
  const badManifest = structuredClone(manifest);
  badManifest.identity_id =
    "voidwcvci1_0000000000000000000000000000000000000000000000000000000000000000";
  assert.throws(
    () =>
      prepareWcVoidMarketVaultDeploymentV1({
        manifest: badManifest,
        creationBytecodeHex: creation,
        bindings: readyBindings,
      }),
    (error) => error?.code === "accepted_identity_manifest_mismatch",
  );
}

{
  const tampered =
    creation.trim().slice(0, -2) +
    (creation.trim().endsWith("00") ? "01" : "00");
  assert.throws(
    () =>
      prepareWcVoidMarketVaultDeploymentV1({
        manifest,
        creationBytecodeHex: tampered,
        bindings: readyBindings,
      }),
    (error) => error?.code === "accepted_creation_bytecode_mismatch",
  );
}

const source = fs.readFileSync(
  "tools/void-wc-void-market-vault-deployment-preparation-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider",
  "eth_getTransactionCount",
  "eth_feeHistory",
  "eth_sendRawTransaction",
  "broadcastTransaction",
  "sendTransaction",
  "private_key",
  "mnemonic",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_WC_VOID_MARKET_VAULT_DEPLOYMENT_PREPARATION_V1_PROOF_GREEN",
);
console.log("accepted_compiled_identity_required=true");
console.log("canonical_void_token_required=true");
console.log("role_bindings_explicit=true");
console.log("role_bindings_distinct=true");
console.log("coupled_launch_id_explicit=true");
console.log("coupled_launch_id_canonical=" + CANONICAL_COUPLED_LAUNCH_ID);
console.log("canonical_candidate_status=SOURCE_READY_HELD_ON_DEPLOYER_OBSERVATION");
console.log("canonical_role_binding_authorized=true");
console.log("canonical_deployment_data_sha256=" + canonicalReady.deployment_data_sha256);
console.log("synthetic_source_ready_path_proven=true");
console.log("deployment_data_constructed_for_explicit_binding_only=true");
console.log("deployer_address_resolved=false");
console.log("deployment_nonce_resolved=false");
console.log("rpc_call=false");
console.log("transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("inventory_funding=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
