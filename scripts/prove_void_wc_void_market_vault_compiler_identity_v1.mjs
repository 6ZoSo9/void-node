#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  AUTHORITY,
  CONTRACT_NAME,
  CONTRACT_PATH,
  EVM_VERSION,
  EXPECTED_IMMUTABLES,
  SOLC_RELEASE,
  SOLC_VERSION,
  VOID_WC_VOID_MARKET_VAULT_COMPILER_IDENTITY_V1,
  VOID_SOLC_COMPILER_ENVIRONMENT_V1,
  buildStandardJsonInput,
  canonicalJson,
  sha256,
  validateSourceText,
} from "../tools/void-wc-void-market-vault-compiler-identity-v1.mjs";

const source=fs.readFileSync(CONTRACT_PATH,"utf8");
validateSourceText(source);

assert.equal(CONTRACT_PATH,"contracts/mainnet/WCVoidMarketVaultV2.sol");
assert.equal(CONTRACT_NAME,"WCVoidMarketVaultV2");
assert.equal(SOLC_VERSION,"0.8.24");
assert.equal(SOLC_RELEASE,"0.8.24+commit.e11b9ed9");
assert.equal(EVM_VERSION,"paris");
assert.equal(VOID_WC_VOID_MARKET_VAULT_COMPILER_IDENTITY_V1,"VOID_WC_VOID_MARKET_VAULT_COMPILER_IDENTITY_V1");
assert.equal(VOID_SOLC_COMPILER_ENVIRONMENT_V1,"VOID_SOLC_COMPILER_ENVIRONMENT_V1");
assert.deepEqual(EXPECTED_IMMUTABLES,[
  "closeoutController",
  "coupledLaunchId",
  "launchController",
  "settlementExecutor",
  "token",
]);

const input=buildStandardJsonInput(source);
assert.equal(input.language,"Solidity");
assert.equal(input.settings.optimizer.enabled,false);
assert.equal(input.settings.optimizer.runs,200);
assert.equal(input.settings.evmVersion,"paris");
assert.equal(input.settings.viaIR,false);
assert.equal(input.settings.metadata.appendCBOR,true);
assert.equal(input.settings.metadata.useLiteralContent,true);
assert.equal(input.settings.metadata.bytecodeHash,"ipfs");
assert.deepEqual(input.settings.remappings,[]);
assert.deepEqual(input.settings.libraries,{});
assert.equal(input.sources[CONTRACT_PATH].content,source);
assert.match(sha256(canonicalJson(input)),/^[0-9a-f]{64}$/);

for(const [key,value] of Object.entries(AUTHORITY)){
  assert.equal(value,false,key);
}

const tool=fs.readFileSync(
  "tools/void-wc-void-market-vault-compiler-identity-v1.mjs",
  "utf8",
);
for(const required of [
  'command === "input"',
  'command === "review"',
  "reviewDualCompilerIdentityV1",
  "compiled_identity_committed: false",
  "market_vault_address: null",
  "inventory_funding_verified: false",
  "market_activation_authorized: false",
  "public_presale_activation_authorized: false",
  "fs.openSync(file, \"wx\", 0o600)",
  "constructor(address,address,address,address,bytes32)",
]){
  assert.ok(tool.includes(required),"missing "+required);
}
for(const forbidden of [
  "JsonRpcProvider",
  "broadcastTransaction",
  "sendTransaction",
  "forge create",
  "cast send",
  "--private-key",
  "eth_sendRawTransaction",
]){
  assert.equal(tool.includes(forbidden),false,"forbidden "+forbidden);
}

console.log("VOID_WC_VOID_MARKET_VAULT_COMPILER_IDENTITY_V1_PROOF_GREEN");
console.log("solc_release="+SOLC_RELEASE);
console.log("evm_version=paris");
console.log("optimizer_enabled=false");
console.log("dual_compiler_required=true");
console.log("expected_immutable_count=5");
console.log("compiled_identity_committed=false");
console.log("rpc_call=false");
console.log("deployment=false");
console.log("inventory_funding=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
