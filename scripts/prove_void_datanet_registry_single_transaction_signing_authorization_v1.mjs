#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  requiredVoidDatanetRegistryDeploymentSigningConfirmationV1,
} from "../tools/void-datanet-registry-exact-signing-request-v1.mjs";
import {
  buildVoidDatanetRegistrySingleTransactionSigningAuthorizationV1,
  validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1,
} from "../tools/void-datanet-registry-single-transaction-signing-authorization-v1.mjs";
import {
  buildVoidDatanetRegistryExactSigningRequestFixtureV1,
} from "./fixtures/void-datanet-registry-exact-signing-request-fixture-v1.mjs";

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
function rehashAuthorization(value){
  const x=structuredClone(value);
  delete x.signing_authorization_id;
  return "voiddrsa1_"+sha256(Buffer.from(JSON.stringify(canonical(x))));
}

const fixture=await buildVoidDatanetRegistryExactSigningRequestFixtureV1();
const request=fixture.signingRequest;
const evidence=fixture.signingRequestEvidence;
const requestedMs=Date.parse(request.requested_at_utc);
const expiresMs=Date.parse(request.valid_until_utc);
assert.ok(expiresMs>requestedMs);

const authorizedAt=
  new Date(Math.min(requestedMs+5_000,expiresMs-1)).toISOString();
const requiredConfirmation=
  requiredVoidDatanetRegistryDeploymentSigningConfirmationV1({
    candidate_id:request.candidate_id,
    final_signing_review_id:request.final_signing_review_id,
    unsigned_transaction_hash:
      request.transaction_summary.unsigned_transaction_hash,
    transaction_fingerprint_sha256:
      request.transaction_fingerprint_sha256,
  });
assert.equal(request.required_confirmation,requiredConfirmation);

const authorization=
  buildVoidDatanetRegistrySingleTransactionSigningAuthorizationV1({
    signing_request:request,
    signing_request_evidence:evidence,
    authorized_at_utc:authorizedAt,
    confirmation:requiredConfirmation,
  });

assert.equal(
  authorization.status,
  "EXACT_SINGLE_TRANSACTION_SIGNING_AUTHORIZED_BROADCAST_HOLD",
);
assert.match(
  authorization.signing_authorization_id,
  /^voiddrsa1_[0-9a-f]{64}$/u,
);
assert.equal(authorization.signing_request_id,request.signing_request_id);
assert.equal(authorization.candidate_id,request.candidate_id);
assert.equal(authorization.required_confirmation,requiredConfirmation);
assert.equal(
  authorization.authorization_scope.transaction_bound_confirmation,
  true,
);
assert.equal(
  authorization.transaction_fingerprint_sha256,
  request.transaction_fingerprint_sha256,
);
assert.deepEqual(
  authorization.transaction_summary,
  request.transaction_summary,
);
assert.equal(authorization.authorized_at_utc,authorizedAt);
assert.equal(authorization.valid_until_utc,request.valid_until_utc);
assert.equal(authorization.authorization_scope.exact_single_transaction,true);
assert.equal(authorization.authorization_scope.signing,true);
assert.equal(authorization.authorization_scope.signing_count_maximum,1);
assert.equal(authorization.authorization_scope.single_use,true);
assert.equal(
  authorization.authorization_scope
    .durable_consumption_before_signer_access_required,
  true,
);
assert.equal(
  authorization.authorization_scope
    .runtime_expiry_recheck_before_signer_access_required,
  true,
);
assert.equal(
  authorization.authorization_scope.transaction_broadcast,
  false,
);
assert.equal(authorization.authorization_scope.chain2050_write,false);
assert.equal(authorization.authorization_scope.funds_movement,false);
assert.equal(authorization.signing_authorized,true);
assert.equal(authorization.signing_performed,false);
assert.equal(authorization.transaction_broadcast_authorized,false);
assert.equal(authorization.transaction_broadcast_performed,false);
assert.equal(authorization.chain2050_write_authorized,false);
assert.equal(authorization.chain2050_write_performed,false);
assert.equal(
  validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1(
    authorization,
    {
      signing_request:request,
      signing_request_evidence:evidence,
    },
  ),
  authorization,
);

for(const [key,value] of Object.entries(authorization.authority)){
  if([
    "operation_confirmation_verified",
    "exact_transaction_signing_authorized",
    "source_authorization_artifact_only",
  ].includes(key)){
    assert.equal(value,true,key);
  }else{
    assert.equal(value,false,key);
  }
}

assert.throws(
  ()=>buildVoidDatanetRegistrySingleTransactionSigningAuthorizationV1({
    signing_request:request,
    signing_request_evidence:evidence,
    authorized_at_utc:authorizedAt,
    confirmation:"continue",
  }),
  /registry_signing_authorization_confirmation_required/u,
);
assert.throws(
  ()=>buildVoidDatanetRegistrySingleTransactionSigningAuthorizationV1({
    signing_request:request,
    signing_request_evidence:evidence,
    authorized_at_utc:authorizedAt,
    confirmation:"authorize something else",
  }),
  /registry_signing_authorization_confirmation_required/u,
);
{
  const crossCandidateConfirmation=
    requiredVoidDatanetRegistryDeploymentSigningConfirmationV1({
      candidate_id:"voiddrtxc1_"+"f".repeat(64),
      final_signing_review_id:request.final_signing_review_id,
      unsigned_transaction_hash:
        request.transaction_summary.unsigned_transaction_hash,
      transaction_fingerprint_sha256:
        request.transaction_fingerprint_sha256,
    });
  assert.notEqual(crossCandidateConfirmation,requiredConfirmation);
  assert.throws(
    ()=>buildVoidDatanetRegistrySingleTransactionSigningAuthorizationV1({
      signing_request:request,
      signing_request_evidence:evidence,
      authorized_at_utc:authorizedAt,
      confirmation:crossCandidateConfirmation,
    }),
    /registry_signing_authorization_confirmation_required/u,
  );
}
assert.throws(
  ()=>buildVoidDatanetRegistrySingleTransactionSigningAuthorizationV1({
    signing_request:request,
    signing_request_evidence:evidence,
    authorized_at_utc:new Date(requestedMs-1).toISOString(),
    confirmation:requiredConfirmation,
  }),
  /registry_signing_authorization_time_invalid/u,
);
assert.throws(
  ()=>buildVoidDatanetRegistrySingleTransactionSigningAuthorizationV1({
    signing_request:request,
    signing_request_evidence:evidence,
    authorized_at_utc:request.valid_until_utc,
    confirmation:requiredConfirmation,
  }),
  /registry_signing_authorization_time_invalid/u,
);

{
  const bad=structuredClone(authorization);
  bad.authority.transaction_broadcast_authorized=true;
  bad.signing_authorization_id=rehashAuthorization(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1(
      bad,
      {
        signing_request:request,
        signing_request_evidence:evidence,
      },
    ),
    /registry_signing_authorization_authority_mismatch:transaction_broadcast_authorized/u,
  );
}
{
  const bad=structuredClone(authorization);
  bad.authorization_scope.signing_count_maximum=2;
  bad.signing_authorization_id=rehashAuthorization(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1(
      bad,
      {
        signing_request:request,
        signing_request_evidence:evidence,
      },
    ),
    /registry_signing_authorization_scope_mismatch:signing_count_maximum/u,
  );
}
{
  const bad=structuredClone(authorization);
  bad.transaction_summary.nonce="999";
  bad.signing_authorization_id=rehashAuthorization(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1(
      bad,
      {
        signing_request:request,
        signing_request_evidence:evidence,
      },
    ),
    /registry_signing_authorization_evidence_rebuild_mismatch/u,
  );
}
{
  const bad=structuredClone(authorization);
  bad.valid_until_utc=
    new Date(Date.parse(request.valid_until_utc)+1_000).toISOString();
  bad.signing_authorization_id=rehashAuthorization(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1(
      bad,
      {
        signing_request:request,
        signing_request_evidence:evidence,
      },
    ),
    /registry_signing_authorization_evidence_rebuild_mismatch/u,
  );
}

const runner=fs.readFileSync(
  "ops/precision/void-datanet-registry-single-transaction-signing-authorization-v1.mjs",
  "utf8",
);
for(const required of [
  "--confirmation",
  "transaction_bound_confirmation=true",
  "required_confirmation=",
  "exact_single_transaction=true",
  "signing_count_maximum=1",
  "single_use=true",
  "durable_consumption_before_signer_access_required=true",
  "credential_access=false",
  "private_key_access=false",
  "wallet_access=false",
  "signer_object_exposed=false",
  "transaction_signing_performed=false",
  "signed_transaction_export=false",
  "transaction_submission=false",
  "transaction_broadcast_authorized=false",
  "transaction_broadcast=false",
  "deployment_authorized=false",
  "chain2050_write_authorized=false",
  "funds_movement=false",
]){
  assert.ok(runner.includes(required),required);
}
for(const forbidden of [
  "SigningKey",
  "Wallet(",
  "privateKey",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  ".signTransaction(",
  ".signMessage(",
  "broadcastTransaction(",
  "sendTransaction(",
  "systemctl",
  "docker ",
  "ssh ",
  "sudo ",
]){
  assert.equal(runner.includes(forbidden),false,forbidden);
}

const source=fs.readFileSync(
  "tools/void-datanet-registry-single-transaction-signing-authorization-v1.mjs",
  "utf8",
);
for(const forbidden of [
  "SigningKey",
  "Wallet(",
  "privateKey",
  ".signTransaction(",
  ".signMessage(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction(",
  "sendTransaction(",
  "fs.readFileSync",
  "child_process",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

console.log(
  "VOID_DATANET_REGISTRY_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION_V1_PROOF_GREEN",
);
console.log("exact_transaction_bound_confirmation_required=true");
console.log("cross_candidate_confirmation_replay_rejected=true");
console.log("general_continue_not_reusable=true");
console.log("exact_single_transaction=true");
console.log("signing_count_maximum=1");
console.log("single_use=true");
console.log("authorization_expiry_inherited_from_request=true");
console.log("durable_consumption_before_signer_access_required=true");
console.log("runtime_expiry_recheck_before_signer_access_required=true");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("wallet_access=false");
console.log("signer_object_exposed=false");
console.log("transaction_signing_performed=false");
console.log("signed_transaction_export=false");
console.log("transaction_broadcast_authorized=false");
console.log("transaction_broadcast=false");
console.log("deployment_authorized=false");
console.log("chain2050_write_authorized=false");
console.log("funds_movement=false");
console.log("automatic_retry=false");
