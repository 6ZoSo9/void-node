#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  SigningKey,
  Transaction,
  computeAddress,
  getCreateAddress,
  keccak256,
} from "ethers";

import {
  buildVoidDatanetRegistryBroadcastAuthorizationRequestWithDependenciesV1,
  requiredVoidDatanetRegistryDeploymentBroadcastConfirmationV1,
  validateVoidDatanetRegistryBroadcastAuthorizationRequestWithDependenciesV1,
  validateVoidDatanetRegistrySignedTransactionVerificationWithDependenciesV1,
  verifyVoidDatanetRegistrySignedTransactionAgainstLineageWithDependenciesV1,
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
function rehashVerification(value){
  const x=structuredClone(value);
  delete x.signed_transaction_verification_id;
  return "voiddrstv1_"+sha256(Buffer.from(JSON.stringify(canonical(x))));
}
function rehashRequest(value){
  const x=structuredClone(value);
  delete x.broadcast_authorization_request_id;
  return "voiddrbar1_"+sha256(Buffer.from(JSON.stringify(canonical(x))));
}

const privateKey=Buffer.alloc(32);
privateKey[31]=1;
const key=new SigningKey(privateKey);
const from=computeAddress(key.publicKey).toLowerCase();
const data="0x60006000556001600055";
const nonce=0;
const predicted=getCreateAddress({from,nonce}).toLowerCase();

const unsigned=Transaction.from({
  type:2,
  chainId:2050,
  nonce,
  gasLimit:250000n,
  maxFeePerGas:3_000_000_000n,
  maxPriorityFeePerGas:1_000_000_000n,
  to:null,
  value:0n,
  data,
});
unsigned.signature=key.sign(unsigned.unsignedHash);
const signedSerialized=unsigned.serialized.toLowerCase();
const signedParsed=Transaction.from(signedSerialized);

const candidate={
  candidate_id:"voiddrtxc1_"+"1".repeat(64),
  transaction_fingerprint_sha256:"2".repeat(64),
  transaction:{
    transaction_type:2,
    chain_id:"2050",
    nonce:"0",
    from_address:from,
    to_address:null,
    value_wei:"0",
    gas_limit:"250000",
    max_fee_per_gas_wei:"3000000000",
    max_priority_fee_per_gas_wei:"1000000000",
    predicted_contract_address:predicted,
    data,
    data_sha256:sha256(Buffer.from(data.slice(2),"hex")),
    data_keccak256:keccak256(data).toLowerCase(),
    unsigned_transaction_hash:signedParsed.unsignedHash.toLowerCase(),
  },
};
const request={
  signing_request_id:"voiddrsr1_"+"3".repeat(64),
};
const authorization={
  signing_authorization_id:"voiddrsa1_"+"4".repeat(64),
  final_signing_review_id:"voiddrfsr1_"+"5".repeat(64),
  transaction_fingerprint_sha256:candidate.transaction_fingerprint_sha256,
  transaction_summary:{
    from_address:from,
    unsigned_transaction_hash:candidate.transaction.unsigned_transaction_hash,
  },
};
const signed={
  marker:"VOID_DATANET_REGISTRY_CONSUMED_AUTHORIZATION_SIGNING_V1",
  version:1,
  status:"EXACT_REGISTRY_TRANSACTION_SIGNED_BROADCAST_HOLD",
  signed_transaction_id:"voiddrstx1_"+"6".repeat(64),
  signed_at_utc:"2030-01-01T00:08:00.000Z",
  signing_execution_admission_id:"voiddrsea1_"+"7".repeat(64),
  signing_claim_id:"voiddrscl1_"+"8".repeat(64),
  signing_operation_id:"voiddrso1_"+"9".repeat(64),
  state_store_id:"voiddrssi1_"+"a".repeat(64),
  consumption_record_id:"voiddrsac1_"+"b".repeat(64),
  signing_authorization_id:authorization.signing_authorization_id,
  signing_request_id:request.signing_request_id,
  candidate_id:candidate.candidate_id,
  final_signing_review_id:authorization.final_signing_review_id,
  transaction_fingerprint_sha256:candidate.transaction_fingerprint_sha256,
  deployer_address:from,
  unsigned_transaction_hash:candidate.transaction.unsigned_transaction_hash,
  signed_transaction_hash:signedParsed.hash.toLowerCase(),
  signed_serialized_transaction:signedSerialized,
  signed_serialized_transaction_sha256:
    sha256(Buffer.from(signedSerialized.slice(2),"hex")),
  authority:{
    transaction_signing_performed:true,
    transaction_broadcast_authorized:false,
    transaction_broadcast_performed:false,
    chain2050_write_authorized:false,
  },
  next_gate:"separate_signed_transaction_verification_and_broadcast_authorization_v1",
};

const dependencies={
  validate_candidate:()=>candidate,
  validate_signing_request:()=>request,
  validate_signing_authorization:()=>authorization,
  validate_signed_transaction:()=>signed,
};
const evidence={
  unsigned_transaction_candidate:{},
  candidate_evidence:{},
  signing_request:{},
  signing_request_evidence:{},
  signing_authorization:{},
  signed_transaction:{},
};

const verification=
  verifyVoidDatanetRegistrySignedTransactionAgainstLineageWithDependenciesV1(
    evidence,
    dependencies,
  );
assert.match(
  verification.signed_transaction_verification_id,
  /^voiddrstv1_[0-9a-f]{64}$/u,
);
assert.equal(verification.signed_transaction_id,signed.signed_transaction_id);
assert.equal(verification.candidate_id,candidate.candidate_id);
assert.equal(verification.signing_request_id,request.signing_request_id);
assert.equal(
  verification.signing_authorization_id,
  authorization.signing_authorization_id,
);
assert.equal(
  verification.transaction_summary.signed_transaction_hash,
  signed.signed_transaction_hash,
);
assert.equal(
  verification.transaction_summary.unsigned_transaction_hash,
  candidate.transaction.unsigned_transaction_hash,
);
assert.equal(verification.transaction_summary.predicted_contract_address,predicted);
assert.equal(verification.verification.signer_recovered_from_signed_transaction,true);
assert.equal(verification.verification.exact_transaction_fields_match_candidate,true);
assert.equal(verification.verification.signed_transaction_bytes_not_copied_into_verification,true);
assert.equal(
  Object.hasOwn(verification,"signed_serialized_transaction"),
  false,
);
for(const [key,value] of Object.entries(verification.authority)){
  if(key==="verification_only") assert.equal(value,true,key);
  else assert.equal(value,false,key);
}

assert.equal(
  validateVoidDatanetRegistrySignedTransactionVerificationWithDependenciesV1(
    verification,
    evidence,
    dependencies,
  ),
  verification,
);

const requestArtifact=
  buildVoidDatanetRegistryBroadcastAuthorizationRequestWithDependenciesV1(
    {
      signed_transaction_verification:verification,
      verification_evidence:evidence,
    },
    dependencies,
  );
assert.match(
  requestArtifact.broadcast_authorization_request_id,
  /^voiddrbar1_[0-9a-f]{64}$/u,
);
assert.equal(
  requestArtifact.status,
  "HOLD_PENDING_EXACT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION",
);
assert.equal(requestArtifact.broadcast_authorized,false);
assert.equal(requestArtifact.broadcast_performed,false);
assert.equal(requestArtifact.scope.exact_single_transaction,true);
assert.equal(requestArtifact.scope.exact_signed_transaction_only,true);
assert.equal(requestArtifact.scope.one_submission_attempt_only,true);
assert.equal(requestArtifact.scope.additional_value_transfer_authorized,false);
assert.equal(requestArtifact.scope.replacement_transaction_authorized,false);
assert.equal(requestArtifact.scope.automatic_retry,false);
assert.equal(requestArtifact.authority.request_only,true);
assert.equal(requestArtifact.authority.transaction_broadcast_authorized,false);
assert.equal(requestArtifact.authority.transaction_broadcast_performed,false);
assert.equal(requestArtifact.authority.chain2050_write_authorized,false);
assert.equal(requestArtifact.authority.automatic_retry,false);
assert.equal(
  requestArtifact.required_confirmation,
  [
    "authorizeDatanetRegistryDeploymentBroadcastV1",
    signed.signed_transaction_id,
    signed.signed_transaction_hash,
    candidate.candidate_id,
    candidate.transaction_fingerprint_sha256,
  ].join(":"),
);
assert.equal(
  requestArtifact.required_confirmation,
  requiredVoidDatanetRegistryDeploymentBroadcastConfirmationV1({
    signed_transaction_id:signed.signed_transaction_id,
    signed_transaction_hash:signed.signed_transaction_hash,
    candidate_id:candidate.candidate_id,
    transaction_fingerprint_sha256:candidate.transaction_fingerprint_sha256,
  }),
);
assert.equal(
  Object.hasOwn(requestArtifact.transaction_summary,"signed_serialized_transaction"),
  false,
);
assert.equal(
  Object.hasOwn(requestArtifact,"signed_serialized_transaction"),
  false,
);

assert.equal(
  validateVoidDatanetRegistryBroadcastAuthorizationRequestWithDependenciesV1(
    requestArtifact,
    {
      signed_transaction_verification:verification,
      verification_evidence:evidence,
    },
    dependencies,
  ),
  requestArtifact,
);

{
  const bad=structuredClone(verification);
  bad.authority.transaction_broadcast_authorized=true;
  bad.signed_transaction_verification_id=rehashVerification(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistrySignedTransactionVerificationWithDependenciesV1(
      bad,
      evidence,
      dependencies,
    ),
    /registry_signed_verification_authority_mismatch:transaction_broadcast_authorized/u,
  );
}
{
  const bad=structuredClone(requestArtifact);
  bad.authority.transaction_broadcast_authorized=true;
  bad.broadcast_authorization_request_id=rehashRequest(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryBroadcastAuthorizationRequestWithDependenciesV1(
      bad,
      {
        signed_transaction_verification:verification,
        verification_evidence:evidence,
      },
      dependencies,
    ),
    /registry_broadcast_request_authority_mismatch:transaction_broadcast_authorized/u,
  );
}
{
  const bad=structuredClone(requestArtifact);
  bad.transaction_summary.signed_transaction_hash="0x"+"0".repeat(64);
  bad.required_confirmation=
    requiredVoidDatanetRegistryDeploymentBroadcastConfirmationV1({
      signed_transaction_id:bad.signed_transaction_id,
      signed_transaction_hash:bad.transaction_summary.signed_transaction_hash,
      candidate_id:bad.candidate_id,
      transaction_fingerprint_sha256:bad.transaction_fingerprint_sha256,
    });
  bad.broadcast_authorization_request_id=rehashRequest(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryBroadcastAuthorizationRequestWithDependenciesV1(
      bad,
      {
        signed_transaction_verification:verification,
        verification_evidence:evidence,
      },
      dependencies,
    ),
    /registry_broadcast_request_evidence_rebuild_mismatch/u,
  );
}
{
  const badDeps={
    ...dependencies,
    validate_signed_transaction:()=>({
      ...signed,
      signed_serialized_transaction:
        signedSerialized.slice(0,-2)+"00",
    }),
  };
  assert.throws(
    ()=>verifyVoidDatanetRegistrySignedTransactionAgainstLineageWithDependenciesV1(
      evidence,
      badDeps,
    ),
    /parse|mismatch|invalid|unsupported|signature/iu,
  );
}

const source=fs.readFileSync(
  "tools/void-datanet-registry-signed-verification-broadcast-request-v1.mjs",
  "utf8",
);
for(const required of [
  "validateVoidDatanetRegistryUnsignedTransactionCandidateV1",
  "validateVoidDatanetRegistryExactSigningRequestV1",
  "validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1",
  "validateVoidDatanetRegistrySignedTransactionV1",
  "transaction_broadcast_authorized:false",
  "broadcast_authorized:false",
  "authorizeDatanetRegistryDeploymentBroadcastV1",
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
  "createPrivateKey",
  "systemctl",
  "docker ",
  "ssh ",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

console.log("VOID_DATANET_REGISTRY_SIGNED_TRANSACTION_VERIFICATION_BROADCAST_REQUEST_V1_PROOF_GREEN");
console.log("ephemeral_signed_transaction_verified=true");
console.log("signer_recovered=true");
console.log("exact_unsigned_candidate_bound=true");
console.log("exact_signing_request_bound=true");
console.log("exact_signing_authorization_bound=true");
console.log("signed_bytes_omitted_from_verification=true");
console.log("signed_bytes_omitted_from_broadcast_request=true");
console.log("exact_broadcast_confirmation_generated=true");
console.log("one_submission_attempt_only=true");
console.log("replacement_transaction_authorized=false");
console.log("automatic_retry=false");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast_authorized=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
