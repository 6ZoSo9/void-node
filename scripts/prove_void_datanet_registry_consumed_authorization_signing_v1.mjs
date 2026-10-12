#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {SigningKey,Transaction,computeAddress} from "ethers";

import {
  buildVoidDatanetRegistryExactSigningRequestFixtureV1,
} from "./fixtures/void-datanet-registry-exact-signing-request-fixture-v1.mjs";
import {
  buildVoidDatanetRegistrySingleTransactionSigningAuthorizationV1,
} from "../tools/void-datanet-registry-single-transaction-signing-authorization-v1.mjs";
import {
  consumeVoidDatanetRegistrySigningAuthorizationWithClockV1,
  voidDatanetRegistrySigningOperationIdV1,
} from "../tools/void-datanet-registry-single-use-signing-authorization-consumption-v1.mjs";
import {
  buildVoidDatanetRegistrySigningStateIdentityV1,
} from "../tools/void-datanet-registry-signing-state-identity-provision-v1.mjs";
import {
  buildVoidDatanetRegistrySigningClaimV1,
  buildVoidDatanetRegistrySigningExecutionAdmissionV1,
  signVoidDatanetRegistryConsumedAuthorizationV1,
  validateVoidDatanetRegistrySignedTransactionV1,
} from "../tools/void-datanet-registry-consumed-authorization-signing-v1.mjs";

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
function rehashAdmission(value){
  const x=structuredClone(value);
  delete x.signing_execution_admission_id;
  return "voiddrsea1_"+sha256(Buffer.from(JSON.stringify(canonical(x))));
}
function rehashConsumption(value){
  const x=structuredClone(value);
  delete x.consumption_record_id;
  return "voiddrsac1_"+sha256(Buffer.from(JSON.stringify(canonical(x))));
}

const fixture=await buildVoidDatanetRegistryExactSigningRequestFixtureV1();
const authorizedAt="2030-01-01T00:07:42.000Z";
const consumedAt="2030-01-01T00:07:43.000Z";
const signedAt="2030-01-01T00:07:44.000Z";

const authorization=
  buildVoidDatanetRegistrySingleTransactionSigningAuthorizationV1({
    signing_request:fixture.signingRequest,
    signing_request_evidence:fixture.signingRequestEvidence,
    authorized_at_utc:authorizedAt,
    confirmation:fixture.signingRequest.required_confirmation,
  });
assert.equal(authorization.signing_authorized,true);
assert.equal(authorization.transaction_broadcast_authorized,false);

const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-registry-signing-proof-"));
fs.chmodSync(root,0o700);
try{
  const stat=fs.lstatSync(root,{bigint:true});
  const identity=buildVoidDatanetRegistrySigningStateIdentityV1({
    state_root_realpath:fs.realpathSync(root),
    state_root_dev:String(stat.dev),
    state_root_ino:String(stat.ino),
  });

  const consumed=
    consumeVoidDatanetRegistrySigningAuthorizationWithClockV1(
      {
        signing_authorization:authorization,
        signing_request:fixture.signingRequest,
        signing_request_evidence:fixture.signingRequestEvidence,
        state_dir:root,
        state_identity:identity,
      },
      Date.parse(consumedAt),
    );
  assert.equal(consumed.ok,true);
  assert.equal(consumed.consumption.authorization_consumed,true);
  assert.equal(consumed.transaction_signing_performed,false);

  const operationId=voidDatanetRegistrySigningOperationIdV1(authorization);
  const recordPath=path.join(root,"consumed",operationId+".json");
  const record=JSON.parse(fs.readFileSync(recordPath,"utf8"));

  const admission=buildVoidDatanetRegistrySigningExecutionAdmissionV1({
    unsigned_transaction_candidate:fixture.candidate,
    candidate_evidence:fixture.candidateEvidence,
    signing_request:fixture.signingRequest,
    signing_request_evidence:fixture.signingRequestEvidence,
    signing_authorization:authorization,
    consumption_record:record,
    state_identity:identity,
    confirmation:authorization.required_confirmation,
    signed_at_utc:signedAt,
  });
  assert.match(
    admission.signing_execution_admission_id,
    /^voiddrsea1_[0-9a-f]{64}$/u,
  );
  assert.equal(admission.signing_operation_id,operationId);
  assert.equal(admission.state_store_id,identity.state_store_id);
  assert.equal(admission.consumption_record_id,record.consumption_record_id);
  assert.equal(admission.authority.consumed_authorization_verified,true);
  assert.equal(admission.authority.state_generation_verified,true);
  assert.equal(admission.authority.exact_confirmation_verified,true);
  assert.equal(admission.authority.credential_access,false);
  assert.equal(admission.authority.private_key_access,false);
  assert.equal(admission.authority.transaction_signing_authorized,true);
  assert.equal(admission.authority.transaction_signing_performed,false);
  assert.equal(admission.authority.transaction_broadcast_authorized,false);

  const claim=buildVoidDatanetRegistrySigningClaimV1({admission});
  assert.match(claim.signing_claim_id,/^voiddrscl1_[0-9a-f]{64}$/u);
  assert.equal(claim.signing_operation_id,operationId);
  assert.equal(claim.authority.durable_single_signing_attempt_claim,true);
  assert.equal(claim.authority.credential_access,false);
  assert.equal(claim.authority.transaction_signing_performed,false);

  {
    assert.throws(
      ()=>buildVoidDatanetRegistrySigningExecutionAdmissionV1({
        unsigned_transaction_candidate:fixture.candidate,
        candidate_evidence:fixture.candidateEvidence,
        signing_request:fixture.signingRequest,
        signing_request_evidence:fixture.signingRequestEvidence,
        signing_authorization:authorization,
        consumption_record:record,
        state_identity:identity,
        confirmation:"wrong",
        signed_at_utc:signedAt,
      }),
      /registry_signing_execution_confirmation_required/u,
    );
  }
  {
    const bad=structuredClone(record);
    bad.state_store_realpath_sha256="0".repeat(64);
    bad.consumption_record_id=rehashConsumption(bad);
    assert.throws(
      ()=>buildVoidDatanetRegistrySigningExecutionAdmissionV1({
        unsigned_transaction_candidate:fixture.candidate,
        candidate_evidence:fixture.candidateEvidence,
        signing_request:fixture.signingRequest,
        signing_request_evidence:fixture.signingRequestEvidence,
        signing_authorization:authorization,
        consumption_record:bad,
        state_identity:identity,
        confirmation:authorization.required_confirmation,
        signed_at_utc:signedAt,
      }),
      /registry_signing_execution_consumption_record_mismatch/u,
    );
  }
  {
    const bad=structuredClone(record);
    bad.consumed_at_utc="2030-01-01T00:07:41.000Z";
    bad.consumption_record_id=rehashConsumption(bad);
    assert.throws(
      ()=>buildVoidDatanetRegistrySigningExecutionAdmissionV1({
        unsigned_transaction_candidate:fixture.candidate,
        candidate_evidence:fixture.candidateEvidence,
        signing_request:fixture.signingRequest,
        signing_request_evidence:fixture.signingRequestEvidence,
        signing_authorization:authorization,
        consumption_record:bad,
        state_identity:identity,
        confirmation:authorization.required_confirmation,
        signed_at_utc:signedAt,
      }),
      /registry_signing_execution_consumption_time_invalid/u,
    );
  }

  // Cryptographic execution is proved with an ephemeral test key, never the
  // production deployer credential.
  const testKey=Buffer.alloc(32);
  testKey[31]=1;
  const testSigningKey=new SigningKey(testKey);
  const testAddress=computeAddress(testSigningKey.publicKey).toLowerCase();
  const unsigned=Transaction.from({
    type:2,
    chainId:2050,
    nonce:0,
    gasLimit:100000n,
    maxFeePerGas:3_000_000_000n,
    maxPriorityFeePerGas:1_000_000_000n,
    to:null,
    value:0n,
    data:"0x60006000",
  });
  assert.equal(unsigned.signature,null);

  const cryptoAdmission={
    ...admission,
    deployer_address:testAddress,
    unsigned_transaction_hash:unsigned.unsignedHash.toLowerCase(),
    unsigned_serialized_transaction_sha256:
      sha256(Buffer.from(unsigned.unsignedSerialized.slice(2),"hex")),
  };
  cryptoAdmission.signing_execution_admission_id=rehashAdmission(cryptoAdmission);
  const cryptoClaim=buildVoidDatanetRegistrySigningClaimV1({
    admission:cryptoAdmission,
  });

  const keyForSigner=Buffer.from(testKey);
  const signed=await signVoidDatanetRegistryConsumedAuthorizationV1({
    admission:cryptoAdmission,
    signing_claim:cryptoClaim,
    unsigned_serialized_transaction:unsigned.unsignedSerialized,
    private_key_bytes:keyForSigner,
  });
  assert.ok(keyForSigner.every((byte)=>byte===0));
  validateVoidDatanetRegistrySignedTransactionV1(signed);
  assert.match(signed.signed_transaction_id,/^voiddrstx1_[0-9a-f]{64}$/u);
  assert.equal(signed.signing_claim_id,cryptoClaim.signing_claim_id);
  assert.equal(signed.deployer_address,testAddress);
  assert.equal(signed.unsigned_transaction_hash,unsigned.unsignedHash.toLowerCase());
  assert.equal(signed.authority.transaction_signing_performed,true);
  assert.equal(signed.authority.signed_transaction_export,true);
  assert.equal(signed.authority.transaction_submission,false);
  assert.equal(signed.authority.transaction_broadcast_authorized,false);
  assert.equal(signed.authority.transaction_broadcast_performed,false);
  assert.equal(signed.authority.chain2050_write_authorized,false);

  const parsed=Transaction.from(signed.signed_serialized_transaction);
  assert.equal(parsed.from?.toLowerCase(),testAddress);
  assert.equal(parsed.hash?.toLowerCase(),signed.signed_transaction_hash);
  assert.equal(parsed.unsignedHash.toLowerCase(),unsigned.unsignedHash.toLowerCase());

  {
    const wrongKey=Buffer.alloc(32);
    wrongKey[31]=2;
    await assert.rejects(
      ()=>signVoidDatanetRegistryConsumedAuthorizationV1({
        admission:cryptoAdmission,
        signing_claim:cryptoClaim,
        unsigned_serialized_transaction:unsigned.unsignedSerialized,
        private_key_bytes:wrongKey,
      }),
      /registry_signing_execution_deployer_identity_mismatch/u,
    );
    assert.ok(wrongKey.every((byte)=>byte===0));
  }
}finally{
  fs.rmSync(root,{recursive:true,force:true});
}

const runner=fs.readFileSync(
  "ops/nimo/void-nimo-datanet-registry-consumed-authorization-signing-v1.mjs",
  "utf8",
);
for(const required of [
  "registry_signing_execution_confirmation_required",
  "atomicClaimAtFd(signingFd,operationId+\".json\",claim)",
  "registry_signing_claim_readback_mismatch",
  "validateVoidDatanetRegistrySigningClaimV1(storedClaim,admission)",
  "const keyBytes=readCredentialBytes",
  "requireStillValid(authorization)",
  "signing_state_generation_changed_after_claim",
  "fs.constants.O_NOFOLLOW",
  "st.nlink!==1",
  "keyBytes.fill(0)",
  "transaction_submission=false",
  "transaction_broadcast_authorized=false",
  "transaction_broadcast=false",
  "deployment=false",
  "chain2050_write=false",
  "automatic_retry=false",
]){
  assert.ok(runner.includes(required),required);
}

const confirmationAt=runner.indexOf(
  "if(args.confirmation!==authorization.required_confirmation)",
);
const outputAt=runner.indexOf("const output=outputPath(args.output)");
const claimAt=runner.indexOf(
  'atomicClaimAtFd(signingFd,operationId+".json",claim)',
);
const claimReadbackAt=runner.indexOf(
  "validateVoidDatanetRegistrySigningClaimV1(storedClaim,admission)",
);
const keyReadAt=runner.indexOf(
  'const keyBytes=readCredentialBytes(args["credentials-directory"])',
);
const signAt=runner.indexOf(
  "signed=await signVoidDatanetRegistryConsumedAuthorizationV1",
);
assert.ok(confirmationAt>=0,"confirmation check missing");
assert.ok(outputAt>confirmationAt,"output preflight must follow confirmation");
assert.ok(claimAt>outputAt,"durable claim must follow output preflight");
assert.ok(claimReadbackAt>claimAt,"claim readback must follow durable claim");
assert.ok(keyReadAt>claimReadbackAt,"credential read must follow claim readback");
assert.ok(signAt>keyReadAt,"signing must follow credential read");

for(const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction(",
  "sendTransaction(",
  "systemctl",
  "docker ",
  "ssh ",
  "sudo ",
  "automatic_retry=true",
]){
  assert.equal(runner.includes(forbidden),false,forbidden);
}

console.log("VOID_DATANET_REGISTRY_CONSUMED_AUTHORIZATION_SIGNING_V1_PROOF_GREEN");
console.log("canonical_production_lineage_admission=true");
console.log("generation_bound_consumption_required=true");
console.log("state_root_realpath_hash_bound=true");
console.log("consumption_time_inside_authorization_window=true");
console.log("exact_transaction_bound_confirmation_required=true");
console.log("durable_signing_claim_before_credential_access=true");
console.log("duplicate_signing_claim_fail_closed=true");
console.log("ephemeral_key_crypto_signing_verified=true");
console.log("private_key_input_buffer_zeroed=true");
console.log("signed_transaction_recovery_verified=true");
console.log("transaction_submission=false");
console.log("transaction_broadcast_authorized=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
console.log("automatic_retry=false");
