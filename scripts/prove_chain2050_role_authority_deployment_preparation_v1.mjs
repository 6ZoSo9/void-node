#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  ACCEPTED_CREATION_BYTECODE_SHA256,
  ACCEPTED_REVIEW_PACKET_SHA256,
  EXISTING_MAINNET0_ADDRESS_ROLES_V1,
  buildRoleAuthorityUnsignedDeploymentPreparationV1,
  reviewRoleAuthorityOwnerDeployerPairV1,
} from "../tools/chain2050-role-authority-deployment-preparation-v1.mjs";

const acceptance = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/chain2050-role-authority-sovereign-bytecode-acceptance-v1.json",
    "utf8",
  ),
);

assert.equal(
  acceptance.accepted_review_packet_sha256,
  ACCEPTED_REVIEW_PACKET_SHA256,
);
assert.equal(
  acceptance.accepted_creation_bytecode_sha256,
  ACCEPTED_CREATION_BYTECODE_SHA256,
);
assert.equal(
  acceptance.acceptance_scope.sovereign_bytecode_acceptance,
  true,
);
assert.equal(
  acceptance.acceptance_scope.compiler_distribution_trust_accepted,
  true,
);
assert.equal(
  acceptance.acceptance_scope.owner_selection_authorized,
  false,
);
assert.equal(
  acceptance.acceptance_scope.deployer_selection_authorized,
  false,
);
assert.equal(
  acceptance.acceptance_scope.signing_authorized,
  false,
);
assert.equal(
  acceptance.acceptance_scope.transaction_broadcast_authorized,
  false,
);

const OWNER =
  "0x1111111111111111111111111111111111111111";
const DEPLOYER =
  "0x2222222222222222222222222222222222222222";

const pair = reviewRoleAuthorityOwnerDeployerPairV1({
  owner_address: OWNER,
  deployer_address: DEPLOYER,
});
assert.equal(pair.ok, true);
if (pair.ok !== true) throw new Error(pair.reason);
assert.equal(pair.pair_selected, false);
assert.equal(pair.deployment_authorized, false);

assert.equal(
  reviewRoleAuthorityOwnerDeployerPairV1({
    owner_address: OWNER,
    deployer_address: OWNER,
  }).reason,
  "owner_deployer_separation_required",
);

for (const [role, address] of Object.entries(
  EXISTING_MAINNET0_ADDRESS_ROLES_V1,
)) {
  const ownerCollision =
    reviewRoleAuthorityOwnerDeployerPairV1({
      owner_address: address,
      deployer_address: DEPLOYER,
    });
  assert.equal(ownerCollision.ok, false, role);
  const deployerCollision =
    reviewRoleAuthorityOwnerDeployerPairV1({
      owner_address: OWNER,
      deployer_address: address,
    });
  assert.equal(deployerCollision.ok, false, role);
}

const creationFile =
  process.env.ROLE_AUTHORITY_CREATION_BYTECODE_FILE || "";
if (!creationFile) {
  throw new Error(
    "ROLE_AUTHORITY_CREATION_BYTECODE_FILE required",
  );
}
const creation = fs.readFileSync(creationFile, "utf8").trim();
const prepared =
  buildRoleAuthorityUnsignedDeploymentPreparationV1({
    accepted_review_packet_sha256:
      ACCEPTED_REVIEW_PACKET_SHA256,
    owner_address: OWNER,
    deployer_address: DEPLOYER,
    creation_bytecode: creation,
    nonce: "7",
    gas_limit: "1500000",
    max_fee_per_gas_wei: "3000000000",
    max_priority_fee_per_gas_wei: "1000000000",
  });

assert.equal(prepared.chain_id, "2050");
assert.equal(
  prepared.accepted_creation_bytecode_sha256,
  ACCEPTED_CREATION_BYTECODE_SHA256,
);
assert.equal(
  prepared.owner_deployer_binding.owner_address,
  OWNER,
);
assert.equal(
  prepared.owner_deployer_binding.deployer_address,
  DEPLOYER,
);
assert.equal(prepared.unsigned_transaction.type, 2);
assert.equal(prepared.unsigned_transaction.to_address, null);
assert.equal(prepared.unsigned_transaction.nonce, "7");
assert.equal(prepared.unsigned_transaction.value_wei, "0");
assert.match(
  prepared.deployment_data.predicted_contract_address,
  /^0x[0-9a-f]{40}$/,
);
assert.equal(
  prepared.decision.sovereign_bytecode_acceptance,
  true,
);
assert.equal(
  prepared.decision.unsigned_transaction_constructed,
  true,
);
assert.equal(prepared.decision.signing_authorized, false);
assert.equal(
  prepared.decision.transaction_broadcast_authorized,
  false,
);
assert.equal(prepared.decision.deployment_authorized, false);

assert.throws(
  () =>
    buildRoleAuthorityUnsignedDeploymentPreparationV1({
      accepted_review_packet_sha256: "00".repeat(32),
      owner_address: OWNER,
      deployer_address: DEPLOYER,
      creation_bytecode: creation,
      nonce: "7",
      gas_limit: "1500000",
      max_fee_per_gas_wei: "3000000000",
      max_priority_fee_per_gas_wei: "1000000000",
    }),
  /accepted_review_packet_mismatch/,
);

const tamperedCreation =
  creation.slice(0, -2) +
  (creation.endsWith("00") ? "01" : "00");
assert.throws(
  () =>
    buildRoleAuthorityUnsignedDeploymentPreparationV1({
      accepted_review_packet_sha256:
        ACCEPTED_REVIEW_PACKET_SHA256,
      owner_address: OWNER,
      deployer_address: DEPLOYER,
      creation_bytecode: tamperedCreation,
      nonce: "7",
      gas_limit: "1500000",
      max_fee_per_gas_wei: "3000000000",
      max_priority_fee_per_gas_wei: "1000000000",
    }),
  /creation_bytecode_hash_mismatch/,
);

assert.throws(
  () =>
    buildRoleAuthorityUnsignedDeploymentPreparationV1({
      accepted_review_packet_sha256:
        ACCEPTED_REVIEW_PACKET_SHA256,
      owner_address: OWNER,
      deployer_address: DEPLOYER,
      creation_bytecode: creation,
      nonce: "7",
      gas_limit: "1500000",
      max_fee_per_gas_wei: "1",
      max_priority_fee_per_gas_wei: "2",
    }),
  /fee_policy_invalid/,
);

const source = fs.readFileSync(
  "tools/chain2050-role-authority-deployment-preparation-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendTransaction",
  "eth_sendRawTransaction",
  "broadcastTransaction",
  "sendTransaction(",
  "signTransaction(",
  "Wallet(",
  "JsonRpcProvider",
  "privateKey",
  "mnemonic",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_DEPLOYMENT_PREPARATION_V1_GREEN",
);
console.log("sovereign_bytecode_acceptance=true");
console.log("owner_deployer_pair_selected=false");
console.log("known_role_collision_rejected=true");
console.log("accepted_creation_bytecode_verified=true");
console.log("constructor_deployment_data_constructible=true");
console.log("unsigned_type2_transaction_constructible=true");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("registry_append=false");
console.log("production_activation=false");
console.log("funds_action=false");
