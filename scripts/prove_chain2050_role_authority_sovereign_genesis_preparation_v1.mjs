#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  verifySovereignGenesisPreparationV1,
} from "../tools/chain2050-role-authority-sovereign-genesis-preparation-v1.mjs";

const policy = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/chain2050-role-authority-sovereign-policy-v1.json",
    "utf8",
  ),
);
const prep = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/chain2050-role-authority-sovereign-genesis-preparation-v1.json",
    "utf8",
  ),
);

const result = verifySovereignGenesisPreparationV1(prep, policy);

assert.equal(result.ok, true);
assert.equal(
  result.genesis_preparation_id,
  "voidcrasgp1_4aac5c1bb4b7500c9dc15df53f36722a44471b9d52b61063528d49602a2348ee",
);
assert.equal(
  result.subject_binding_sha256,
  "7945ba03feac32e5268382a8b995eb7c927a084d9dd1d44598ffb340a12a770e",
);
assert.equal(
  result.authority_policy_sha256,
  "9a8ee80c68cb026b88117710c7d78e8b3063a1c5c2fe1cf6cb555ca80d8f1e75",
);
assert.equal(
  result.role_record_sha256,
  "1492c4d55f5c6d4873a28ca08d641196ba51d9e5c0a7c1cc31f27bf1a6405b0b",
);
assert.equal(
  result.predicted_registry_root_sha256,
  "54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041",
);
assert.equal(result.append_eligible, false);

const source = fs.readFileSync(
  "tools/chain2050-role-authority-sovereign-genesis-preparation-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "crypto.sign(",
  "createPrivateKey(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction(",
  "BEGIN PRIVATE KEY",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_PREPARATION_V1_GREEN",
);
console.log(
  "genesis_preparation_id=" + result.genesis_preparation_id,
);
console.log(
  "subject_binding_sha256=" + result.subject_binding_sha256,
);
console.log(
  "authority_policy_sha256=" + result.authority_policy_sha256,
);
console.log(
  "role_record_sha256=" + result.role_record_sha256,
);
console.log(
  "predicted_registry_root_sha256=" +
    result.predicted_registry_root_sha256,
);
console.log("identity_id=sovereign.zoso");
console.log("role=SOVEREIGN");
console.log("append_eligible=false");
console.log("chain2050_write=false");
console.log("transaction_broadcast=false");
console.log(
  "decision=GREEN_SOURCE_PREPARED_HOLD_PENDING_LIVE_PRECISION_KEY_REVALIDATION",
);
