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
  consumeApollyonOperatorAuthorizationAgainstFingerprintWithClockV1,
  VOID_APOLLYON_OPERATOR_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1,
} from "../tools/apollyon-operator-authorization-consumption-v1.mjs";

const TOOL=fileURLToPath(
  new URL("../tools/apollyon-operator-authorization-consumption-v1.mjs",import.meta.url),
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

function packet(){
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

function stateRoot(mode=0o700){
  const root=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-apollyon-authz-consumption-v1-"),
  );
  fs.chmodSync(root,mode);
  return root;
}

function input(root,value=packet()){
  return {packet:value,state_dir:root};
}

function consume(root,value=packet(),clock=nowMs){
  return consumeApollyonOperatorAuthorizationAgainstFingerprintWithClockV1(
    input(root,value),
    fingerprint,
    publicKey,
    clock,
  );
}

function recordPath(root,result){
  const digest=result.authorization_id.split(":")[1];
  assert.match(digest,/^[0-9a-f]{64}$/u);
  return path.join(root,"consumed",digest+".json");
}

{
  const root=stateRoot();
  try{
    const result=consume(root);
    assert.equal(result.ok,true);
    if(result.ok===false)throw new Error(result.reason);
    assert.equal(
      result.status,
      "operator_authorization_consumption_recorded_for_candidate_training_attempt",
    );
    assert.match(
      result.consumption_record_id,
      /^apollyon_authz_consumption_v1:[0-9a-f]{64}$/u,
    );
    assert.equal(result.authorization_consumption_recorded,true);
    assert.equal(result.authorization_single_use_guaranteed,false);
    assert.match(
      result.state_store_generation_id,
      /^apollyon_authz_store_v1:[0-9a-f]{64}$/u,
    );
    assert.match(result.state_store_generation_sha256,/^[0-9a-f]{64}$/u);
    assert.equal(result.consumption.single_use_guaranteed_by_this_gate,false);
    assert.equal(result.consumption.authorization_consumption_recorded,true);
    assert.equal(
      result.consumption.duplicate_rejected_while_consumption_slot_intact,
      true,
    );
    assert.equal(
      result.consumption.same_uid_namespace_tamper_resistance_claimed,
      false,
    );
    assert.equal(result.consumption.global_replay_prevention_claimed,false);
    assert.equal(result.consumption.immutable_consumption_record,true);
    assert.equal(result.consumption.signature_reverified_before_consumption,true);
    assert.equal(result.consumption.expiry_rechecked_at_consumption,true);
    assert.equal(result.consumption.consumption_precedes_attempt_claim,true);
    assert.equal(result.consumption.consumption_precedes_training_execution,true);
    assert.equal(
      result.next_gate,
      "independently_protected_authorization_consumption_authority_v1",
    );
    assert.equal(result.attempt_claimed,false);
    assert.equal(result.training_execution_performed,false);
    assert.equal(result.candidate_weight_mutation_performed,false);
    assert.equal(result.generation_execution_performed,false);
    assert.equal(result.wallet_access_performed,false);
    assert.equal(result.transaction_signing_performed,false);
    assert.equal(result.funds_movement_performed,false);

    const consumedDir=path.join(root,"consumed");
    const file=recordPath(root,result);
    assert.equal(fs.lstatSync(consumedDir).mode&0o777,0o700);
    assert.equal(fs.lstatSync(file).mode&0o777,0o600);
    const before=fs.readFileSync(file);

    const duplicate=consume(root,packet(),nowMs+1000);
    assert.equal(duplicate.ok,false);
    assert.equal(
      duplicate.reason,
      "authorization_consumption_already_consumed",
    );
    assert.deepEqual(fs.readFileSync(file),before);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const result=consume(root,packet(),Date.parse(expiresAt));
    assert.equal(result.ok,false);
    assert.equal(result.reason,"authorization_consumption_expired");
    assert.equal(fs.existsSync(path.join(root,"consumed")),false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot(0o755);
  try{
    const result=consume(root);
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "authorization_consumption_state_root_mode_must_be_0700",
    );
    assert.equal(fs.existsSync(path.join(root,"consumed")),false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const parent=stateRoot();
  const real=path.join(parent,"real");
  const link=path.join(parent,"link");
  fs.mkdirSync(real,{mode:0o700});
  fs.symlinkSync(real,link);
  try{
    const result=consume(link);
    assert.equal(result.ok,false);
    assert.match(result.reason,/authorization_consumption_state_root_/u);
  }finally{
    fs.rmSync(parent,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const forged=packet();
    const signature=Buffer.from(forged.signature.value_base64,"base64");
    signature[0]^=1;
    forged.signature.value_base64=signature.toString("base64");
    const result=consume(root,forged);
    assert.equal(result.ok,false);
    assert.equal(result.reason,"authorization_consumption_verifier_failed");
    assert.equal(fs.existsSync(path.join(root,"consumed")),false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const rootA=stateRoot();
  const rootB=stateRoot();
  try{
    const shared=packet();
    const first=consume(rootA,shared);
    const second=consume(rootB,shared);
    assert.equal(first.ok,true);
    assert.equal(second.ok,true);
    assert.notEqual(first.state_store_generation_id,second.state_store_generation_id);
    assert.notEqual(
      first.state_store_generation_sha256,
      second.state_store_generation_sha256,
    );
    assert.equal(first.consumption.global_replay_prevention_claimed,false);
  }finally{
    fs.rmSync(rootA,{recursive:true,force:true});
    fs.rmSync(rootB,{recursive:true,force:true});
  }
}

{
  const parent=stateRoot();
  const fixed=path.join(parent,"fixed-store");
  fs.mkdirSync(fixed,{mode:0o700});
  fs.chmodSync(fixed,0o700);
  try{
    const shared=packet();
    const first=consume(fixed,shared);
    assert.equal(first.ok,true);
    if(first.ok===false)throw new Error(first.reason);
    const firstGeneration=first.state_store_generation_id;
    const firstPathFingerprint=first.state_store_realpath_sha256;

    fs.rmSync(fixed,{recursive:true,force:true});
    fs.mkdirSync(fixed,{mode:0o700});
    fs.chmodSync(fixed,0o700);

    const second=consume(fixed,shared,nowMs+1000);
    assert.equal(second.ok,true);
    if(second.ok===false)throw new Error(second.reason);
    assert.equal(second.state_store_realpath_sha256,firstPathFingerprint);
    assert.notEqual(second.state_store_generation_id,firstGeneration);
    assert.notEqual(
      second.state_store_generation_sha256,
      first.state_store_generation_sha256,
    );
    assert.equal(
      second.consumption.same_realpath_replacement_is_new_store_generation,
      true,
    );
    assert.equal(second.consumption.global_replay_prevention_claimed,false);
  }finally{
    fs.rmSync(parent,{recursive:true,force:true});
  }
}

// Explicitly prove the declared same-UID limitation: deleting the immutable
// pathname after the writer has exited can make the same signed packet
// recordable again. V79 must not claim stronger replay protection than this.
{
  const root=stateRoot();
  try{
    const shared=packet();
    const first=consume(root,shared);
    assert.equal(first.ok,true);
    if(first.ok===false)throw new Error(first.reason);
    const file=recordPath(root,first);
    fs.unlinkSync(file);

    const second=consume(root,shared,nowMs+1000);
    assert.equal(second.ok,true);
    if(second.ok===false)throw new Error(second.reason);
    assert.equal(second.state_store_generation_id,first.state_store_generation_id);
    assert.equal(
      second.state_store_generation_sha256,
      first.state_store_generation_sha256,
    );
    assert.equal(second.authorization_single_use_guaranteed,false);
    assert.equal(
      second.consumption.same_uid_namespace_tamper_resistance_claimed,
      false,
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const shared=packet();
    const first=consume(root,shared);
    assert.equal(first.ok,true);
    if(first.ok===false)throw new Error(first.reason);

    fs.rmSync(path.join(root,"consumed"),{recursive:true,force:true});
    fs.mkdirSync(path.join(root,"consumed"),{mode:0o700});
    fs.chmodSync(path.join(root,"consumed"),0o700);

    const second=consume(root,shared,nowMs+1000);
    assert.equal(second.ok,true);
    if(second.ok===false)throw new Error(second.reason);
    assert.equal(second.state_store_generation_id,first.state_store_generation_id);
    assert.equal(second.authorization_single_use_guaranteed,false);
    assert.equal(
      second.consumption.same_uid_namespace_tamper_resistance_claimed,
      false,
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

for(const [key,expected] of Object.entries({
  durable_consumption_evidence:true,
  exact_signed_authorization_reverification_required:true,
  runtime_expiry_recheck_required:true,
  private_existing_state_root_required:true,
  duplicate_rejected_while_consumption_slot_intact:true,
  same_realpath_replacement_is_new_store_generation:true,
  same_uid_namespace_tamper_resistance_claimed:false,
  single_use_guaranteed_by_this_gate:false,
  global_replay_prevention_claimed:false,
  canonical_state_store_runtime_binding_still_required:true,
  immutable_consumption_record:true,
  filesystem_read:true,
  filesystem_mutation_store_identity_and_one_consumption_record_may_occur:true,
  operator_private_key_access:false,
  production_signing:false,
  attempt_claim_authorized_by_this_gate:false,
  attempt_claimed:false,
  training_execution_authorized_by_this_gate:false,
  training_execution_performed:false,
  candidate_weight_mutation_performed:false,
  generation_execution_performed:false,
  wallet_access:false,
  transaction_signing:false,
  transaction_broadcast:false,
  funds_movement:false,
  repository_merge:false,
  runtime_service_mutation:false,
  network_access:false,
  automatic_retry:false,
})){
  assert.equal(
    VOID_APOLLYON_OPERATOR_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(TOOL,"utf8");
for(const forbidden of [
  "node:child_process",
  "createPrivateKey",
  "generateKeyPairSync",
  "crypto.sign(",
  "Wallet(",
  "signTransaction(",
  "sendTransaction(",
  "eth_sendRawTransaction",
  "fetch(",
  "process.env",
]){
  assert.equal(
    source.includes(forbidden),
    false,
    "consumption gate gained forbidden capability: "+forbidden,
  );
}

console.log("VOID_APOLLYON_OPERATOR_AUTHORIZATION_CONSUMPTION_V1_PROOF_GREEN");
console.log("authorization_signature_reverified_before_consumption=true");
console.log("runtime_expiry_rechecked=true");
console.log("private_state_root_0700_required=true");
console.log("immutable_consumption_record_0600=true");
console.log("duplicate_rejected_while_consumption_slot_intact=true");
console.log("same_uid_namespace_tamper_resistance_claimed=false");
console.log("single_use_guaranteed_by_this_gate=false");
console.log("global_replay_prevention_claimed=false");
console.log("protected_replay_authority_required_before_attempt_claim=true");
console.log("attempt_claimed=false");
console.log("training_execution=false");
console.log("candidate_weight_mutation=false");
console.log("wallet_access=false");
console.log("transaction_signing=false");
console.log("funds_movement=false");
