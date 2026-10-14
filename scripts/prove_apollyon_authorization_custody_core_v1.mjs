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
  createApollyonAuthorizationCustodyCoreV1,
  VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_AUTHORITY_V1,
} from "../tools/apollyon-authorization-custody-core-v1.mjs";

const TOOL=fileURLToPath(
  new URL("../tools/apollyon-authorization-custody-core-v1.mjs",import.meta.url),
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

function packet(seed="11",issuedOffsetMs=-30_000,expiresOffsetMs=600_000){
  const now=Date.now();
  const payload={
    marker:VOID_APOLLYON_OPERATOR_AUTHORIZATION_PAYLOAD_V1,
    version:1,
    purpose:"authorize_exactly_one_apollyon_candidate_training_attempt",
    subject:"Apollyon",
    action:"candidate_training_attempt_v1",
    target_host:"Xiphos",
    nonce:seed.repeat(32),
    issued_at:new Date(now+issuedOffsetMs).toISOString(),
    expires_at:new Date(now+expiresOffsetMs).toISOString(),
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

function rootFixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-apollyon-custody-v1-"));
  fs.chmodSync(root,0o700);
  fs.mkdirSync(path.join(root,"consumed"),{mode:0o700});
  fs.chmodSync(path.join(root,"consumed"),0o700);
  return root;
}

function coreFor(root){
  return createApollyonAuthorizationCustodyCoreV1({
    state_root:root,
    expected_operator_public_key_raw_sha256:fingerprint,
    operator_public_key:publicKey,
  });
}

{
  const root=rootFixture();
  const core=coreFor(root);
  try{
    const p=packet("11");
    const first=core.consume(p);
    assert.equal(first.ok,true);
    assert.equal(first.status,"authorization_custodied");
    assert.equal(first.authorization_custodied,true);
    assert.equal(first.attempt_claimed,false);
    assert.equal(first.training_execution_performed,false);
    assert.match(
      first.custody_generation_id,
      /^apollyon_custody_generation_v1:[0-9a-f]{64}$/u,
    );
    assert.match(first.record_sha256,/^[0-9a-f]{64}$/u);

    const second=core.consume(p);
    assert.equal(second.ok,false);
    assert.equal(second.status,"exists");
    assert.equal(
      second.reason,
      "apollyon_custody_authorization_already_recorded",
    );
    assert.equal(second.exact_existing_record_matches,true);

    const asserted=core.assertConsumed(p.authorization_id);
    assert.equal(asserted.ok,true);
    assert.equal(asserted.record_sha256,first.record_sha256);
  }finally{
    core.close();
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=rootFixture();
  const core=coreFor(root);
  try{
    const p=packet("55");
    const first=core.consume(p);
    assert.equal(first.ok,true);
    if(first.ok===false)throw new Error(first.reason);
    const digest=p.authorization_id.split(":")[1];
    const file=path.join(root,"consumed",digest+".json");
    fs.unlinkSync(file);

    const second=core.consume(p);
    assert.equal(second.ok,true);
    if(second.ok===false)throw new Error(second.reason);
    assert.equal(second.custody_generation_id,first.custody_generation_id);
    assert.equal(second.single_use_guaranteed_by_core,false);
    assert.equal(second.custody_uid_leaf_unlink_resistance_claimed,false);
  }finally{
    core.close();
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=rootFixture();
  const core=coreFor(root);
  try{
    const expired=packet("22",-120_000,-60_000);
    const result=core.consume(expired);
    assert.equal(result.ok,false);
    assert.equal(result.reason,"authorization expired");
    assert.equal(fs.readdirSync(path.join(root,"consumed")).length,0);
  }finally{
    core.close();
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=rootFixture();
  const core=coreFor(root);
  const moved=root+"-moved";
  try{
    fs.renameSync(root,moved);
    fs.mkdirSync(root,{mode:0o700});
    fs.chmodSync(root,0o700);
    fs.mkdirSync(path.join(root,"consumed"),{mode:0o700});
    fs.chmodSync(path.join(root,"consumed"),0o700);

    const result=core.consume(packet("33"));
    assert.equal(result.ok,false);
    assert.equal(result.reason,"apollyon_custody_visible_root_drift");
  }finally{
    core.close();
    fs.rmSync(root,{recursive:true,force:true});
    fs.rmSync(moved,{recursive:true,force:true});
  }
}

{
  const root=rootFixture();
  const core=coreFor(root);
  const consumed=path.join(root,"consumed");
  const moved=path.join(root,"consumed-old");
  try{
    fs.renameSync(consumed,moved);
    fs.mkdirSync(consumed,{mode:0o700});
    fs.chmodSync(consumed,0o700);

    const result=core.consume(packet("44"));
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "apollyon_custody_visible_consumed_directory_drift",
    );
  }finally{
    core.close();
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=rootFixture();
  try{
    fs.chmodSync(root,0o755);
    assert.throws(
      ()=>coreFor(root),
      /apollyon_custody_state_root_invalid/u,
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

for(const [key,expected] of Object.entries({
  source_only_core:true,
  intended_for_dedicated_custody_uid:true,
  retained_root_descriptor:true,
  retained_consumed_descriptor:true,
  visible_path_identity_rechecked_each_operation:true,
  exact_v78_signature_reverification:true,
  create_only_authorization_record:true,
  duplicate_rejected_while_record_present:true,
  custody_uid_leaf_unlink_resistance_claimed:false,
  single_use_guaranteed_by_core:false,
  arbitrary_path_write:false,
  arbitrary_bytes_write:false,
  caller_selected_record_name:false,
  operator_private_key_access:false,
  production_signing:false,
  training_execution:false,
  attempt_claim:false,
  candidate_weight_mutation:false,
  generation_execution:false,
  wallet_access:false,
  transaction_signing:false,
  transaction_broadcast:false,
  funds_movement:false,
  network_access:false,
  service_started_by_import:false,
  af_unix_service_wrapper_required:true,
  host_cross_uid_qualification_required:true,
  host_cross_uid_qualification_performed:false,
  independent_custody_proven:false,
  production_gate_ready:false,
})){
  assert.equal(
    VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(TOOL,"utf8");
for(const forbidden of [
  "node:net",
  "node:child_process",
  "createPrivateKey",
  "generateKeyPairSync",
  "crypto.sign(",
  "process.env",
  "fetch(",
  "Wallet(",
  "signTransaction(",
  "sendTransaction(",
  "eth_sendRawTransaction",
]){
  assert.equal(
    source.includes(forbidden),
    false,
    "custody core gained forbidden capability: "+forbidden,
  );
}

console.log("VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_V1_PROOF_GREEN");
console.log("retained_root_descriptor=true");
console.log("retained_consumed_descriptor=true");
console.log("visible_path_identity_rechecked_each_operation=true");
console.log("duplicate_rejected_while_record_present=true");
console.log("custody_uid_leaf_unlink_resistance_claimed=false");
console.log("single_use_guaranteed_by_core=false");
console.log("root_replacement_holds=true");
console.log("consumed_directory_replacement_holds=true");
console.log("host_cross_uid_qualification_performed=false");
console.log("independent_custody_proven=false");
console.log("attempt_claimed=false");
console.log("training_execution=false");
console.log("wallet_access=false");
console.log("funds_movement=false");
