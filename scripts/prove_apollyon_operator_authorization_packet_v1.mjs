#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign as cryptoSign,
} from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import {
  VOID_APOLLYON_OPERATOR_AUTHORIZATION_PACKET_V1,
  VOID_APOLLYON_OPERATOR_AUTHORIZATION_PAYLOAD_V1,
  apollyonOperatorAuthorizationIdV1,
  apollyonOperatorAuthorizationSigningBytesV1,
  verifyApollyonOperatorAuthorizationPacketV1,
} from "./apollyon_operator_authorization_packet_v1.mjs";

const CORE=fileURLToPath(new URL("./apollyon_operator_authorization_packet_v1.mjs",import.meta.url));

function sha256(value){
  return createHash("sha256").update(value).digest("hex");
}

function rawFingerprint(publicKey){
  const der=publicKey.export({type:"spki",format:"der"});
  assert.equal(der.length,44);
  return sha256(der.subarray(12));
}

const {publicKey,privateKey}=generateKeyPairSync("ed25519");
const fingerprint=rawFingerprint(publicKey);

const issuedAt="2026-10-13T19:30:00.000Z";
const expiresAt="2026-10-13T19:40:00.000Z";
const nowMs=Date.parse("2026-10-13T19:35:00.000Z");

const payload={
  marker:VOID_APOLLYON_OPERATOR_AUTHORIZATION_PAYLOAD_V1,
  version:1,
  purpose:"authorize_exactly_one_apollyon_candidate_training_attempt",
  subject:"Apollyon",
  action:"candidate_training_attempt_v1",
  target_host:"Xiphos",
  nonce:"11".repeat(32),
  issued_at:issuedAt,
  expires_at:expiresAt,
  request:{
    sha256:"22".repeat(32),
    bytes:4041,
    canonical_main:"33".repeat(32),
    canonical_tree:"44".repeat(32),
  },
  corpus:{
    sha256:"55".repeat(32),
    records:36,
    max_length:3072,
  },
  parent_adapter_sha256:"66".repeat(32),
  authority:{
    attempt_limit:1,
    training_execution:true,
    candidate_weight_mutation:true,
    fresh_corpus_binding:true,
    xiphos_runtime:true,
    transaction_signing:false,
    transaction_broadcast:false,
    wallet_access:false,
    funds_movement:false,
    repository_merge:false,
    runtime_service_mutation:false,
    generation_execution:false,
  },
};

function packetFor(value=payload,key=privateKey,fp=fingerprint){
  const signingBytes=apollyonOperatorAuthorizationSigningBytesV1(value);
  return {
    marker:VOID_APOLLYON_OPERATOR_AUTHORIZATION_PACKET_V1,
    version:1,
    authorization_id:apollyonOperatorAuthorizationIdV1(value),
    payload:value,
    signature:{
      scheme:"ed25519",
      operator_public_key_raw_sha256:fp,
      value_base64:cryptoSign(null,signingBytes,key).toString("base64"),
    },
  };
}

const packet=packetFor();
const verified=verifyApollyonOperatorAuthorizationPacketV1(packet,{
  expectedOperatorPublicKeyRawSha256:fingerprint,
  operatorPublicKey:publicKey,
  nowMs,
});
assert.equal(verified.signature_verified,true);
assert.equal(verified.attempt_limit,1);
assert.equal(verified.training_execution_authorized,true);
assert.equal(verified.transaction_signing_authorized,false);
assert.equal(verified.wallet_access_authorized,false);
assert.equal(verified.funds_movement_authorized,false);
assert.equal(verified.replay_consumed,false);
assert.equal(verified.attempt_claimed,false);
assert.equal(verified.execution_performed,false);

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

{
  const bad=clone(packet);
  bad.payload.request.sha256="77".repeat(32);
  assert.throws(
    ()=>verifyApollyonOperatorAuthorizationPacketV1(bad,{
      expectedOperatorPublicKeyRawSha256:fingerprint,
      operatorPublicKey:publicKey,
      nowMs,
    }),
    /authorization_id mismatch/u,
  );
}
{
  const bad=clone(packet);
  bad.payload.authority.wallet_access=true;
  assert.throws(
    ()=>verifyApollyonOperatorAuthorizationPacketV1(bad,{
      expectedOperatorPublicKeyRawSha256:fingerprint,
      operatorPublicKey:publicKey,
      nowMs,
    }),
    /wallet_access must be false/u,
  );
}
{
  const bad=clone(packet);
  bad.payload.target_host="Precision";
  assert.throws(
    ()=>verifyApollyonOperatorAuthorizationPacketV1(bad,{
      expectedOperatorPublicKeyRawSha256:fingerprint,
      operatorPublicKey:publicKey,
      nowMs,
    }),
    /target_host must equal Xiphos/u,
  );
}
assert.throws(
  ()=>verifyApollyonOperatorAuthorizationPacketV1(packet,{
    expectedOperatorPublicKeyRawSha256:fingerprint,
    operatorPublicKey:publicKey,
    nowMs:Date.parse("2026-10-13T19:40:00.000Z"),
  }),
  /authorization expired/u,
);
{
  const bad=clone(packet);
  const sig=Buffer.from(bad.signature.value_base64,"base64");
  sig[0]^=1;
  bad.signature.value_base64=sig.toString("base64");
  assert.throws(
    ()=>verifyApollyonOperatorAuthorizationPacketV1(bad,{
      expectedOperatorPublicKeyRawSha256:fingerprint,
      operatorPublicKey:publicKey,
      nowMs,
    }),
    /signature invalid/u,
  );
}
{
  const other=generateKeyPairSync("ed25519").publicKey;
  assert.throws(
    ()=>verifyApollyonOperatorAuthorizationPacketV1(packet,{
      expectedOperatorPublicKeyRawSha256:fingerprint,
      operatorPublicKey:other,
      nowMs,
    }),
    /does not match expected raw fingerprint/u,
  );
}

const coreSource=fs.readFileSync(CORE,"utf8");
for(const forbidden of [
  "createPrivateKey",
  "generateKeyPairSync",
  "sign as cryptoSign",
  "node:child_process",
  "node:fs",
  "readFileSync",
  "openSync",
  "writeFileSync",
  "process.env",
  "spawn",
  "execFile",
]){
  assert.equal(
    coreSource.includes(forbidden),
    false,
    "core verifier gained forbidden capability: "+forbidden,
  );
}

console.log("VOID_APOLLYON_OPERATOR_AUTHORIZATION_PACKET_V1_PROOF_GREEN");
console.log("production_private_key_access=false");
console.log("production_signing=false");
console.log("training_execution=false");
console.log("runtime_mutation=false");
console.log("wallet_access=false");
console.log("funds_movement=false");
console.log("attempt_claimed=false");
console.log("replay_consumed=false");
