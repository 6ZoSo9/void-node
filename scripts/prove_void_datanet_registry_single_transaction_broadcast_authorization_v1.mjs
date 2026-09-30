#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  buildVoidDatanetRegistrySingleTransactionBroadcastAuthorizationWithDependenciesV1,
  validateVoidDatanetRegistrySingleTransactionBroadcastAuthorizationWithDependenciesV1,
} from "../tools/void-datanet-registry-single-transaction-broadcast-authorization-v1.mjs";
import {
  requiredVoidDatanetRegistryDeploymentBroadcastConfirmationV1,
} from "../tools/void-datanet-registry-signed-verification-broadcast-request-v1.mjs";

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(
    Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
  );
}
function rehash(value){
  const x=structuredClone(value);
  delete x.broadcast_authorization_id;
  return "voiddrba1_"+sha256(Buffer.from(JSON.stringify(canonical(x))));
}

const signedTransactionId="voiddrstx1_"+"1".repeat(64);
const signedHash="0x"+"2".repeat(64);
const candidateId="voiddrtxc1_"+"3".repeat(64);
const fingerprint="4".repeat(64);
const confirmation=
  requiredVoidDatanetRegistryDeploymentBroadcastConfirmationV1({
    signed_transaction_id:signedTransactionId,
    signed_transaction_hash:signedHash,
    candidate_id:candidateId,
    transaction_fingerprint_sha256:fingerprint,
  });

const request={
  marker:"VOID_DATANET_REGISTRY_BROADCAST_AUTHORIZATION_REQUEST_V1",
  version:1,
  status:"HOLD_PENDING_EXACT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION",
  broadcast_authorization_request_id:"voiddrbar1_"+"5".repeat(64),
  signed_transaction_verification_id:"voiddrstv1_"+"6".repeat(64),
  signed_transaction_id:signedTransactionId,
  candidate_id:candidateId,
  signing_request_id:"voiddrsr1_"+"7".repeat(64),
  signing_authorization_id:"voiddrsa1_"+"8".repeat(64),
  consumption_record_id:"voiddrsac1_"+"9".repeat(64),
  signing_operation_id:"voiddrso1_"+"a".repeat(64),
  transaction_fingerprint_sha256:fingerprint,
  deployer_address:"0x"+"b".repeat(40),
  signed_at_utc:"2030-01-01T00:08:00.000Z",
  transaction_summary:{
    transaction_type:2,
    chain_id:"2050",
    nonce:"0",
    from_address:"0x"+"b".repeat(40),
    to_address:null,
    value_wei:"0",
    gas_limit:"250000",
    max_fee_per_gas_wei:"3000000000",
    max_priority_fee_per_gas_wei:"1000000000",
    predicted_contract_address:"0x"+"c".repeat(40),
    data_sha256:"d".repeat(64),
    data_keccak256:"0x"+"e".repeat(64),
    unsigned_transaction_hash:"0x"+"f".repeat(64),
    signed_transaction_hash:signedHash,
    signed_serialized_transaction_sha256:"0".repeat(64),
  },
  required_confirmation:confirmation,
  scope:{
    exact_single_transaction:true,
    exact_signed_transaction_only:true,
    one_submission_attempt_only:true,
    exact_contract_creation_consequence_requires_later_authorization:true,
    exact_gas_fee_spend_requires_later_authorization:true,
    additional_value_transfer_authorized:false,
    replacement_transaction_authorized:false,
    automatic_retry:false,
  },
  authority:{
    request_only:true,
    signed_transaction_bytes_output:false,
    credential_access:false,
    private_key_access:false,
    broadcaster_access:false,
    transaction_submission:false,
    transaction_broadcast_authorized:false,
    transaction_broadcast_performed:false,
    deployment_authorized:false,
    deployment_performed:false,
    chain2050_write_authorized:false,
    chain2050_write_performed:false,
    validator_mutation:false,
    token_movement:false,
    funds_movement:false,
    automatic_retry:false,
  },
  broadcast_authorized:false,
  broadcast_performed:false,
  next_gate:"explicit_exact_registry_single_transaction_broadcast_authorization_v1",
};
const dependencies={
  validate_broadcast_request:()=>request,
};

const authorization=
  buildVoidDatanetRegistrySingleTransactionBroadcastAuthorizationWithDependenciesV1(
    {
      broadcast_request:{},
      broadcast_request_evidence:{},
      authorized_at_utc:"2030-01-01T00:09:00.000Z",
      valid_until_utc:"2030-01-01T00:14:00.000Z",
      confirmation,
    },
    dependencies,
  );

assert.match(authorization.broadcast_authorization_id,/^voiddrba1_[0-9a-f]{64}$/u);
assert.equal(
  authorization.status,
  "EXACT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZED_CONSUMPTION_HOLD",
);
assert.equal(authorization.broadcast_authorized,true);
assert.equal(authorization.broadcast_performed,false);
assert.equal(
  authorization.broadcast_authorization_request_id,
  request.broadcast_authorization_request_id,
);
assert.equal(authorization.signed_transaction_id,signedTransactionId);
assert.equal(authorization.candidate_id,candidateId);
assert.equal(authorization.required_confirmation,confirmation);
assert.equal(authorization.authorization_scope.exact_single_transaction,true);
assert.equal(authorization.authorization_scope.exact_signed_transaction_only,true);
assert.equal(authorization.authorization_scope.exact_signed_transaction_hash,true);
assert.equal(authorization.authorization_scope.one_submission_attempt_only,true);
assert.equal(authorization.authorization_scope.single_use,true);
assert.equal(
  authorization.authorization_scope.fresh_prebroadcast_observation_required,
  true,
);
assert.equal(
  authorization.authorization_scope.durable_consumption_before_broadcaster_access_required,
  true,
);
assert.equal(
  authorization.authorization_scope.runtime_expiry_recheck_before_broadcast_required,
  true,
);
assert.equal(
  authorization.authorization_scope.exact_contract_creation_consequence_authorized,
  true,
);
assert.equal(authorization.authorization_scope.exact_gas_fee_spend_authorized,true);
assert.equal(authorization.authorization_scope.additional_value_transfer_authorized,false);
assert.equal(authorization.authorization_scope.replacement_transaction_authorized,false);
assert.equal(authorization.authorization_scope.automatic_retry,false);
assert.equal(authorization.authority.operation_confirmation_verified,true);
assert.equal(authorization.authority.exact_signed_transaction_broadcast_authorized,true);
assert.equal(authorization.authority.source_authorization_artifact_only,true);
assert.equal(authorization.authority.signed_transaction_bytes_access,false);
assert.equal(authorization.authority.broadcaster_access,false);
assert.equal(authorization.authority.transaction_submission_performed,false);
assert.equal(authorization.authority.transaction_broadcast_performed,false);
assert.equal(authorization.authority.chain2050_write_performed,false);
assert.equal(authorization.authority.automatic_retry,false);

assert.equal(
  validateVoidDatanetRegistrySingleTransactionBroadcastAuthorizationWithDependenciesV1(
    authorization,
    {broadcast_request:{},broadcast_request_evidence:{}},
    dependencies,
  ),
  authorization,
);

assert.throws(
  ()=>buildVoidDatanetRegistrySingleTransactionBroadcastAuthorizationWithDependenciesV1(
    {
      broadcast_request:{},
      broadcast_request_evidence:{},
      authorized_at_utc:"2030-01-01T00:09:00.000Z",
      valid_until_utc:"2030-01-01T00:14:00.000Z",
      confirmation:"continue",
    },
    dependencies,
  ),
  /registry_broadcast_authorization_confirmation_required/u,
);
assert.throws(
  ()=>buildVoidDatanetRegistrySingleTransactionBroadcastAuthorizationWithDependenciesV1(
    {
      broadcast_request:{},
      broadcast_request_evidence:{},
      authorized_at_utc:"2030-01-01T00:09:00.000Z",
      valid_until_utc:"2030-01-01T00:14:00.001Z",
      confirmation,
    },
    dependencies,
  ),
  /registry_broadcast_authorization_window_invalid/u,
);
{
  const bad=structuredClone(authorization);
  bad.authority.transaction_broadcast_performed=true;
  bad.broadcast_authorization_id=rehash(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistrySingleTransactionBroadcastAuthorizationWithDependenciesV1(
      bad,
      {broadcast_request:{},broadcast_request_evidence:{}},
      dependencies,
    ),
    /registry_broadcast_authorization_authority_mismatch:transaction_broadcast_performed/u,
  );
}
{
  const bad=structuredClone(authorization);
  bad.authorization_scope.replacement_transaction_authorized=true;
  bad.broadcast_authorization_id=rehash(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistrySingleTransactionBroadcastAuthorizationWithDependenciesV1(
      bad,
      {broadcast_request:{},broadcast_request_evidence:{}},
      dependencies,
    ),
    /registry_broadcast_authorization_scope_mismatch:replacement_transaction_authorized/u,
  );
}
{
  const mutatedRequest=structuredClone(request);
  mutatedRequest.transaction_summary.signed_transaction_hash="0x"+"1".repeat(64);
  const badDeps={validate_broadcast_request:()=>mutatedRequest};
  assert.throws(
    ()=>validateVoidDatanetRegistrySingleTransactionBroadcastAuthorizationWithDependenciesV1(
      authorization,
      {broadcast_request:{},broadcast_request_evidence:{}},
      badDeps,
    ),
    /registry_broadcast_authorization_evidence_rebuild_failed|registry_broadcast_authorization_evidence_rebuild_mismatch/u,
  );
}

const source=fs.readFileSync(
  "tools/void-datanet-registry-single-transaction-broadcast-authorization-v1.mjs",
  "utf8",
);
for(const required of [
  "validateVoidDatanetRegistryBroadcastAuthorizationRequestV1",
  "authorizeDatanetRegistryDeploymentBroadcastV1",
  "one_submission_attempt_only:true",
  "durable_consumption_before_broadcaster_access_required:true",
  "fresh_prebroadcast_observation_required:true",
  "transaction_broadcast_performed:false",
  "chain2050_write_performed:false",
]){
  assert.ok(source.includes(required),required);
}
for(const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction(",
  "sendTransaction(",
  "SigningKey(",
  "Wallet(",
  "privateKey",
  "systemctl",
  "docker ",
  "ssh ",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

console.log("VOID_DATANET_REGISTRY_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION_V1_PROOF_GREEN");
console.log("exact_confirmation_required=true");
console.log("generic_continue_rejected=true");
console.log("authorization_window_max_seconds=300");
console.log("exact_single_transaction=true");
console.log("one_submission_attempt_only=true");
console.log("single_use=true");
console.log("fresh_prebroadcast_observation_required=true");
console.log("durable_consumption_before_broadcaster_access_required=true");
console.log("replacement_transaction_authorized=false");
console.log("additional_value_transfer_authorized=false");
console.log("automatic_retry=false");
console.log("signed_transaction_bytes_access=false");
console.log("broadcaster_access=false");
console.log("transaction_submission_performed=false");
console.log("transaction_broadcast_performed=false");
console.log("chain2050_write_performed=false");
