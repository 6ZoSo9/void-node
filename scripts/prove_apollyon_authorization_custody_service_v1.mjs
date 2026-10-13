#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_APOLLYON_OPERATOR_AUTHORIZATION_PACKET_V1,
  VOID_APOLLYON_OPERATOR_AUTHORIZATION_PAYLOAD_V1,
  apollyonOperatorAuthorizationIdV1,
  apollyonOperatorAuthorizationSigningBytesV1,
} from "./apollyon_operator_authorization_packet_v1.mjs";
import {
  createApollyonAuthorizationCustodyServiceV1,
  VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_AUTHORITY_V1,
} from "../tools/apollyon-authorization-custody-service-v1.mjs";
import {
  createApollyonAuthorizationCustodyClientV1,
} from "../tools/apollyon-authorization-custody-client-v1.mjs";

const SERVICE=fileURLToPath(
  new URL("../tools/apollyon-authorization-custody-service-v1.mjs",import.meta.url),
);
const CLIENT=fileURLToPath(
  new URL("../tools/apollyon-authorization-custody-client-v1.mjs",import.meta.url),
);

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function rawFingerprint(publicKey){
  const der=publicKey.export({type:"spki",format:"der"});
  assert.equal(der.length,44);
  return sha256(der.subarray(12));
}

const {publicKey,privateKey}=crypto.generateKeyPairSync("ed25519");
const publicKeyPem=publicKey.export({type:"spki",format:"pem"}).toString();
const fingerprint=rawFingerprint(publicKey);

function packet(seed="11"){
  const now=Date.now();
  const payload={
    marker:VOID_APOLLYON_OPERATOR_AUTHORIZATION_PAYLOAD_V1,
    version:1,
    purpose:"authorize_exactly_one_apollyon_candidate_training_attempt",
    subject:"Apollyon",
    action:"candidate_training_attempt_v1",
    target_host:"Xiphos",
    nonce:seed.repeat(32),
    issued_at:new Date(now-30_000).toISOString(),
    expires_at:new Date(now+600_000).toISOString(),
    request:{
      sha256:"22".repeat(32),
      bytes:4041,
      canonical_main:"33".repeat(20),
      canonical_tree:"44".repeat(20),
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
  const signingBytes=apollyonOperatorAuthorizationSigningBytesV1(payload);
  return {
    marker:VOID_APOLLYON_OPERATOR_AUTHORIZATION_PACKET_V1,
    version:1,
    authorization_id:apollyonOperatorAuthorizationIdV1(payload),
    payload,
    signature:{
      scheme:"ed25519",
      operator_public_key_raw_sha256:fingerprint,
      value_base64:crypto.sign(null,signingBytes,privateKey).toString("base64"),
    },
  };
}

function fixture(){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"void-apollyon-custody-service-v1-"));
  const gid=typeof process.getgid==="function"?process.getgid():0;
  const socketDir=path.join(base,"run");
  const stateRoot=path.join(base,"state");
  fs.mkdirSync(socketDir,{mode:0o750});
  fs.chmodSync(socketDir,0o750);
  fs.mkdirSync(stateRoot,{mode:0o700});
  fs.chmodSync(stateRoot,0o700);
  fs.mkdirSync(path.join(stateRoot,"consumed"),{mode:0o700});
  fs.chmodSync(path.join(stateRoot,"consumed"),0o700);
  return {
    base,
    gid,
    socketDir,
    socketPath:path.join(socketDir,"custody.sock"),
    stateRoot,
  };
}

{
  const f=fixture();
  const service=createApollyonAuthorizationCustodyServiceV1({
    socket_path:f.socketPath,
    state_root:f.stateRoot,
    socket_group_gid:f.gid,
    expected_operator_public_key_raw_sha256:fingerprint,
    operator_public_key_pem:publicKeyPem,
  });
  const client=createApollyonAuthorizationCustodyClientV1({
    socket_path:f.socketPath,
  });
  try{
    const started=await service.start();
    assert.equal(started.ok,true);
    assert.equal(started.status,"started_source_service");
    assert.equal(fs.lstatSync(f.socketPath).isSocket(),true);
    assert.equal(fs.lstatSync(f.socketPath).mode&0o777,0o660);

    const p=packet("11");
    const first=await client.consume(p);
    assert.equal(first.ok,true);
    assert.equal(first.status,"authorization_custodied");
    assert.equal(first.attempt_claimed,false);
    assert.equal(first.training_execution_performed,false);

    const duplicate=await client.consume(p);
    assert.equal(duplicate.ok,false);
    assert.equal(duplicate.status,"exists");
    assert.equal(
      duplicate.reason,
      "apollyon_custody_authorization_already_recorded",
    );

    const asserted=await client.assertConsumed(p.authorization_id);
    assert.equal(asserted.ok,true);
    assert.equal(asserted.status,"authorization_custody_asserted");

    const forged=packet("22");
    const sig=Buffer.from(forged.signature.value_base64,"base64");
    sig[0]^=1;
    forged.signature.value_base64=sig.toString("base64");
    const rejected=await client.consume(forged);
    assert.equal(rejected.ok,false);
    assert.equal(rejected.attempt_claimed,false);
    assert.equal(rejected.training_execution_performed,false);

    const stopped=await service.stop();
    assert.equal(stopped.ok,true);
    assert.equal(stopped.advertised_socket_unlinked,false);
    assert.equal(fs.existsSync(f.socketPath),true);

    await assert.rejects(
      client.assertConsumed(p.authorization_id,{timeout_ms:1000}),
    );
  }finally{
    if(service.state().started){
      await service.stop();
    }
    try{ fs.unlinkSync(f.socketPath); }catch(error){ if(error?.code!=="ENOENT")throw error; }
    fs.rmSync(f.base,{recursive:true,force:true});
  }
}

for(const [key,expected] of Object.entries({
  source_only_service:true,
  unix_socket_only:true,
  server_controlled_socket_path:true,
  server_controlled_state_root:true,
  exact_request_bytes_required:true,
  bounded_request_response:true,
  no_retry:true,
  private_listener_then_hardlink_publication:true,
  advertised_socket_unlink_on_stop:false,
  stale_socket_cleanup_external:true,
  dedicated_custody_uid_intended:true,
  socket_directory_cross_uid_policy_required:true,
  same_uid_socket_path_tamper_resistance_claimed:false,
  custody_core_leaf_unlink_resistance_claimed:false,
  live_host_qualification_performed:false,
  independent_custody_proven:false,
  production_gate_ready:false,
  service_started_by_import:false,
  operator_private_key_access:false,
  production_signing:false,
  attempt_claim:false,
  training_execution:false,
  candidate_weight_mutation:false,
  generation_execution:false,
  wallet_access:false,
  transaction_signing:false,
  transaction_broadcast:false,
  funds_movement:false,
})){
  assert.equal(
    VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const serviceSource=fs.readFileSync(SERVICE,"utf8");
for(const forbidden of [
  "node:child_process",
  "createPrivateKey",
  "crypto.sign(",
  "Wallet(",
  "signTransaction(",
  "sendTransaction(",
  "eth_sendRawTransaction",
  "fetch(",
  "process.env",
]){
  assert.equal(
    serviceSource.includes(forbidden),
    false,
    "service gained forbidden capability: "+forbidden,
  );
}

const clientSource=fs.readFileSync(CLIENT,"utf8");
for(const forbidden of [
  "http:",
  "https:",
  "fetch(",
  "automatic_retry:true",
  "Wallet(",
]){
  assert.equal(
    clientSource.includes(forbidden),
    false,
    "client gained forbidden fallback/capability: "+forbidden,
  );
}

console.log("VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_V1_PROOF_GREEN");
console.log("unix_socket_only=true");
console.log("private_listener_then_hardlink_publication=true");
console.log("advertised_socket_unlink_on_stop=false");
console.log("exact_v78_verification_delegated_to_pinned_core=true");
console.log("live_host_qualification_performed=false");
console.log("independent_custody_proven=false");
console.log("attempt_claimed=false");
console.log("training_execution=false");
console.log("wallet_access=false");
console.log("funds_movement=false");
