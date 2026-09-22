#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  ACCEPTED_CREATION_BYTECODE_SHA256,
} from "../tools/chain2050-role-authority-deployment-preparation-v1.mjs";
import {
  buildRoleAuthorityUnsignedDeploymentPolicyV1,
} from "../tools/chain2050-role-authority-unsigned-deployment-policy-v1.mjs";

const observation = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/chain2050-role-authority-deployment-resolution-precision-v1.json",
    "utf8",
  ),
);

const creationFile =
  process.env.ROLE_AUTHORITY_CREATION_BYTECODE_FILE || "";
if (!creationFile) {
  throw new Error("ROLE_AUTHORITY_CREATION_BYTECODE_FILE required");
}
const creation = fs.readFileSync(creationFile, "utf8").trim();

const policy =
  buildRoleAuthorityUnsignedDeploymentPolicyV1({
    observation,
    creation_bytecode: creation,
  });

assert.equal(
  observation.creation_bytecode_sha256,
  ACCEPTED_CREATION_BYTECODE_SHA256,
);
assert.equal(
  policy.status,
  "HOLD_PENDING_DEPLOYER_GAS_FUNDING_FRESH_PRE_SIGN_REVALIDATION_AND_SEPARATE_SIGNING_AUTHORIZATION",
);
assert.equal(
  policy.unsigned_transaction_candidate.transaction_type,
  2,
);
assert.equal(
  policy.unsigned_transaction_candidate.chain_id,
  "2050",
);
assert.equal(
  policy.unsigned_transaction_candidate.nonce,
  "0",
);
assert.equal(
  policy.unsigned_transaction_candidate.from_address,
  "0x4d0a1149d13b03448c56ee6582d161159c5e537f",
);
assert.equal(
  policy.unsigned_transaction_candidate.to_address,
  null,
);
assert.equal(
  policy.unsigned_transaction_candidate.value_wei,
  "0",
);
assert.equal(
  policy.unsigned_transaction_candidate.gas_limit,
  "2402981",
);
assert.equal(
  policy.unsigned_transaction_candidate.max_fee_per_gas_wei,
  "3000000000",
);
assert.equal(
  policy.unsigned_transaction_candidate.max_priority_fee_per_gas_wei,
  "1000000000",
);
assert.equal(
  policy.unsigned_transaction_candidate.data_sha256,
  "1f6f97cabc21b54875f1b181b27153be75ee261a6bc5d77ff30c993187fab068",
);
assert.equal(
  policy.unsigned_transaction_candidate.data_keccak256,
  "0xa0a33788745d22d83b2cbf0058912abe19d8cc34d2403252fd4c95cf3b5786f6",
);
assert.equal(
  policy.unsigned_transaction_candidate.predicted_contract_address,
  "0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49",
);
assert.match(
  policy.unsigned_transaction_candidate.unsigned_serialized_transaction,
  /^0x02[0-9a-f]+$/,
);
assert.match(
  policy.unsigned_transaction_candidate.unsigned_transaction_hash,
  /^0x[0-9a-f]{64}$/,
);
assert.match(
  policy.unsigned_transaction_candidate_fingerprint_sha256,
  /^[0-9a-f]{64}$/,
);
assert.equal(
  policy.funding_requirement.current_deployer_balance_wei,
  "0",
);
assert.equal(
  policy.funding_requirement.maximum_gas_cost_wei,
  "7208943000000000",
);
assert.equal(
  policy.funding_requirement.minimum_additional_funding_wei,
  "7208943000000000",
);
assert.equal(
  policy.funding_requirement.funding_required,
  true,
);
assert.equal(
  policy.funding_requirement.funding_authorized,
  false,
);
assert.equal(policy.authority.signing, false);
assert.equal(policy.authority.transaction_broadcast, false);
assert.equal(policy.authority.deployment, false);
assert.equal(policy.authority.chain2050_mutation, false);
assert.equal(policy.authority.funds_action, false);

const tampered = structuredClone(observation);
tampered.pending_nonce = "1";
assert.throws(
  () =>
    buildRoleAuthorityUnsignedDeploymentPolicyV1({
      observation: tampered,
      creation_bytecode: creation,
    }),
  /precision_nonce_or_chain_mismatch/,
);

const occupied = structuredClone(observation);
occupied.predicted_contract_address_vacant = false;
assert.throws(
  () =>
    buildRoleAuthorityUnsignedDeploymentPolicyV1({
      observation: occupied,
      creation_bytecode: creation,
    }),
  /precision_pair_or_revalidation_mismatch/,
);

const source = fs.readFileSync(
  "tools/chain2050-role-authority-unsigned-deployment-policy-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendTransaction",
  "eth_sendRawTransaction",
  "broadcastTransaction",
  "sendTransaction(",
  "signTransaction(",
  "privateKey",
  "mnemonic",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_UNSIGNED_DEPLOYMENT_POLICY_V1_GREEN",
);
console.log(
  "unsigned_transaction_candidate_fingerprint_sha256=" +
    policy.unsigned_transaction_candidate_fingerprint_sha256,
);
console.log(
  "unsigned_transaction_hash=" +
    policy.unsigned_transaction_candidate.unsigned_transaction_hash,
);
console.log(
  "maximum_gas_cost_wei=" +
    policy.funding_requirement.maximum_gas_cost_wei,
);
console.log(
  "minimum_additional_funding_wei=" +
    policy.funding_requirement.minimum_additional_funding_wei,
);
console.log("deployer_funding_satisfied=false");
console.log("funding_authorized=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_action=false");
