#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_AUTHORITY_V1,
  constructVoidDatanetRegistrySignableDeploymentCandidateV1,
  requireVoidDatanetRegistryConstructionConfirmationV1,
} from "../tools/void-datanet-registry-signable-deployment-candidate-v1.mjs";
import {
  VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
} from "../tools/void-datanet-registry-transaction-construction-admission-v1.mjs";

assert.equal(
  VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
  "constructDatanetRegistryDeploymentTransactionV1",
);
assert.equal(
  requireVoidDatanetRegistryConstructionConfirmationV1(
    VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
  ),
  true,
);

for(const bad of [
  undefined,
  null,
  "",
  "constructDatanetRegistryDeploymentTransaction",
  "constructDatanetRegistryDeploymentTransactionV2",
  "startPrivateEpoch2QbftSuccessorV1",
]){
  assert.throws(
    ()=>requireVoidDatanetRegistryConstructionConfirmationV1(bad),
    /transaction_construction_explicit_confirmation_required/u,
  );
  assert.throws(
    ()=>constructVoidDatanetRegistrySignableDeploymentCandidateV1({
      confirmation:bad,
    }),
    /transaction_construction_explicit_confirmation_required/u,
  );
}

assert.equal(
  VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_AUTHORITY_V1
    .transaction_construction,
  true,
);
assert.equal(
  VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_AUTHORITY_V1
    .signable_transaction_materialized,
  true,
);
for(const key of [
  "rpc_call",
  "filesystem_secret_read",
  "credential_access",
  "wallet_access",
  "private_key_access",
  "deployer_funding",
  "transaction_signing",
  "transaction_submission",
  "transaction_broadcast",
  "deployment",
  "chain2050_mutation",
  "validator_mutation",
  "token_movement",
  "funds_movement",
  "migration_authorized",
  "public_activation_authorized",
  "automatic_retry",
]){
  assert.equal(
    VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_AUTHORITY_V1[key],
    false,
    key,
  );
}

const tool=fs.readFileSync(
  "tools/void-datanet-registry-signable-deployment-candidate-v1.mjs",
  "utf8",
);
for(const required of [
  'import {Transaction,getCreateAddress,keccak256} from "ethers"',
  "requireVoidDatanetRegistryConstructionConfirmationV1(input?.confirmation)",
  "validateVoidDatanetRegistryTransactionConstructionAdmissionV1",
  "validateVoidDatanetRegistryDeploymentPreSignRevalidationV1",
  "validateVoidDatanetRegistryFreshFeeFundingPacketV1",
  "type:2",
  "chainId:2050",
  "nonce:n.nonce",
  "gasLimit:n.gas_limit",
  "maxFeePerGas:n.max_fee_per_gas_wei",
  "maxPriorityFeePerGas:n.max_priority_fee_per_gas_wei",
  "to:null",
  "value:0n",
  "data:n.creation_data",
  "accessList:[]",
  "tx.signature!==null",
  "tx.unsignedSerialized",
  "tx.unsignedHash",
  "const rebuilt=Transaction.from({",
  "rebuilt.unsignedSerialized.toLowerCase()",
  "rebuilt.unsignedHash.toLowerCase()",
  "signable_deployment_candidate_encoding_mismatch",
  "signable_deployment_candidate_semantic_mismatch",
  "signable_deployment_candidate_evidence_required",
  "signable_deployment_candidate_evidence_lineage_mismatch",
  "signable_deployment_candidate_evidence_fields_mismatch",
  "signable_deployment_candidate_fingerprint_mismatch",
  "predicted_registry_contract_address",
  "signing_authorized:false",
  "submission_authorized:false",
  "broadcast_authorized:false",
  "deployment_authorized:false",
  "funds_movement_authorized:false",
  "separate_explicit_single_transaction_signing_authorization_bound_to_exact_unsigned_transaction_hash",
]){
  assert.ok(tool.includes(required),required);
}
for(const forbidden of [
  "new Wallet",
  "Wallet(",
  "SigningKey",
  ".signTransaction(",
  ".sign(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "personal_",
  "wallet.sign",
  "wallet.send",
  "privateKey",
  "systemctl",
  "docker ",
  "ssh ",
  "sudo ",
]){
  assert.equal(tool.includes(forbidden),false,forbidden);
}

const runner=fs.readFileSync(
  "ops/precision/void-datanet-registry-signable-deployment-candidate-v1.mjs",
  "utf8",
);
for(const required of [
  "--apply",
  "--confirmation",
  "buildVoidDatanetRegistryConstructionHoldV1",
  "constructVoidDatanetRegistrySignableDeploymentCandidateV1",
  "validateVoidDatanetRegistrySignableDeploymentCandidateV1(candidate,evidence)",
  "construction_authorized=false",
  "signable_transaction_materialized=false",
  "transaction_signing=false",
  "transaction_submission=false",
  "transaction_broadcast=false",
  "deployment=false",
  "chain2050_mutation=false",
  "funds_movement=false",
]){
  assert.ok(runner.includes(required),required);
}
for(const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet",
  "Wallet(",
  "SigningKey",
  ".signTransaction(",
  "privateKey",
  "systemctl",
  "docker ",
  "ssh ",
  "sudo ",
  "http.request",
  "https.request",
  "fetch(",
]){
  assert.equal(runner.includes(forbidden),false,forbidden);
}

console.log("VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_V1_SOURCE_PROOF_GREEN");
console.log("correct_confirmation_token_validated_without_construction=true");
console.log("missing_confirmation_holds_before_evidence_processing=true");
console.log("wrong_confirmation_holds_before_evidence_processing=true");
console.log("confirmed_construction_path_executed_in_ci=false");
console.log("eip1559_type2_fields_statically_bound=true");
console.log("candidate_validator_rebuilds_unsigned_encoding=true");
console.log("candidate_validator_rechecks_create_address=true");
console.log("candidate_validator_rechecks_data_keccak=true");
console.log("exact_upstream_evidence_validators_required=true");
console.log("wallet_access=false");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
