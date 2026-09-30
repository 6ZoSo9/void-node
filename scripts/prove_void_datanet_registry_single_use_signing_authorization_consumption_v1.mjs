#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildVoidDatanetRegistrySingleTransactionSigningAuthorizationV1,
} from "../tools/void-datanet-registry-single-transaction-signing-authorization-v1.mjs";
import {
  VOID_DATANET_REGISTRY_SINGLE_USE_SIGNING_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1,
  consumeVoidDatanetRegistrySigningAuthorizationWithClockV1,
  consumeVoidDatanetRegistrySigningAuthorizationWithClocksV1,
  voidDatanetRegistrySigningOperationIdV1,
} from "../tools/void-datanet-registry-single-use-signing-authorization-consumption-v1.mjs";
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
function canonicalJson(value){
  return JSON.stringify(canonical(value));
}
function stateRoot(mode=0o700){
  const root=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-registry-signing-consumption-v1-"),
  );
  fs.chmodSync(root,mode);
  return root;
}
function stateIdentity(root){
  const real=fs.realpathSync.native(root);
  const stat=fs.lstatSync(real,{bigint:true});
  const material={
    marker:"VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_V1",
    version:1,
    state_root_realpath:real,
    state_root_dev:String(stat.dev),
    state_root_ino:String(stat.ino),
  };
  return {
    ...material,
    state_store_id:
      "voiddrssi1_"+sha256(Buffer.from(canonicalJson(material))),
  };
}
function authInput(
  fixture,
  root,
  authorization,
  identity=stateIdentity(root),
){
  return {
    signing_authorization:authorization,
    signing_request:fixture.signingRequest,
    signing_request_evidence:fixture.signingRequestEvidence,
    state_dir:root,
    state_identity:identity,
  };
}

const fixture=await buildVoidDatanetRegistryExactSigningRequestFixtureV1();
const request=fixture.signingRequest;
const requestMs=Date.parse(request.requested_at_utc);
const expiryMs=Date.parse(request.valid_until_utc);
assert.ok(expiryMs>requestMs);
const authorizedMs=Math.min(requestMs+5_000,expiryMs-2_000);
const authorization=
  buildVoidDatanetRegistrySingleTransactionSigningAuthorizationV1({
    signing_request:request,
    signing_request_evidence:fixture.signingRequestEvidence,
    authorized_at_utc:new Date(authorizedMs).toISOString(),
    confirmation:request.required_confirmation,
  });
const authorizationTwo=
  buildVoidDatanetRegistrySingleTransactionSigningAuthorizationV1({
    signing_request:request,
    signing_request_evidence:fixture.signingRequestEvidence,
    authorized_at_utc:new Date(authorizedMs+500).toISOString(),
    confirmation:request.required_confirmation,
  });
assert.notEqual(
  authorizationTwo.signing_authorization_id,
  authorization.signing_authorization_id,
);
const signingOperationId=
  voidDatanetRegistrySigningOperationIdV1(authorization);
assert.equal(
  voidDatanetRegistrySigningOperationIdV1(authorizationTwo),
  signingOperationId,
);
assert.match(signingOperationId,/^voiddrso1_[0-9a-f]{64}$/u);

{
  const root=stateRoot();
  const identity=stateIdentity(root);
  try{
    const now=authorizedMs+1_000;
    const result=
      consumeVoidDatanetRegistrySigningAuthorizationWithClockV1(
        authInput(fixture,root,authorization,identity),
        now,
      );
    assert.equal(result.ok,true);
    assert.equal(
      result.status,
      "AUTHORIZATION_CONSUMED_FOR_EXACT_REGISTRY_TRANSACTION_SIGNING",
    );
    assert.match(
      result.consumption_record_id,
      /^voiddrsac1_[0-9a-f]{64}$/u,
    );
    assert.equal(
      result.signing_authorization_id,
      authorization.signing_authorization_id,
    );
    assert.equal(result.signing_request_id,request.signing_request_id);
    assert.equal(result.candidate_id,request.candidate_id);
    assert.equal(result.signing_operation_id,signingOperationId);
    assert.equal(result.state_store_id,identity.state_store_id);
    assert.deepEqual(
      result.transaction_summary,
      request.transaction_summary,
    );
    assert.equal(
      result.required_confirmation,
      request.required_confirmation,
    );
    assert.equal(result.consumption.exact_single_transaction,true);
    assert.equal(result.consumption.signing_count_maximum,1);
    assert.equal(result.consumption.single_use,true);
    assert.equal(result.consumption.authorization_consumed,true);
    assert.equal(result.consumption.immutable_consumption_record,true);
    assert.equal(result.consumption.stable_signing_operation_slot,true);
    assert.equal(result.consumption.state_store_generation_bound,true);
    assert.equal(result.consumption.descriptor_relative_publication,true);
    assert.equal(
      result.consumption.replay_rejected_within_exact_state_store_generation,
      true,
    );
    assert.equal(
      result.consumption.replay_prevention_scope,
      "exact_state_store_generation_and_signing_operation",
    );
    assert.equal(
      result.consumption.consumption_precedes_any_signer_access,
      true,
    );
    assert.equal(result.authority.transaction_signing_performed,false);
    assert.equal(result.authority.transaction_broadcast_authorized,false);
    assert.equal(result.authority.chain2050_write_authorized,false);
    assert.equal(result.credential_access_performed,false);
    assert.equal(result.private_key_access_performed,false);
    assert.equal(result.signer_object_exposed,false);
    assert.equal(result.transaction_signer_access_performed,false);
    assert.equal(result.transaction_signing_performed,false);
    assert.equal(result.signed_transaction_export_performed,false);
    assert.equal(result.transaction_broadcast_performed,false);
    assert.equal(result.chain2050_write_performed,false);

    const consumedDir=path.join(root,"consumed");
    const files=fs.readdirSync(consumedDir);
    assert.deepEqual(
      files,
      [signingOperationId+".json"],
    );
    const file=path.join(consumedDir,files[0]);
    assert.equal(fs.lstatSync(consumedDir).mode&0o777,0o700);
    assert.equal(fs.lstatSync(file).mode&0o777,0o600);
    const before=fs.readFileSync(file);

    const duplicate=
      consumeVoidDatanetRegistrySigningAuthorizationWithClockV1(
        authInput(fixture,root,authorization),
        now+500,
      );
    assert.equal(duplicate.ok,false);
    assert.equal(
      duplicate.reason,
      "registry_signing_consumption_already_consumed",
    );
    assert.deepEqual(fs.readFileSync(file),before);

    const equivalentAuthorization=
      consumeVoidDatanetRegistrySigningAuthorizationWithClockV1(
        authInput(fixture,root,authorizationTwo,identity),
        now+750,
      );
    assert.equal(equivalentAuthorization.ok,false);
    assert.equal(
      equivalentAuthorization.reason,
      "registry_signing_consumption_already_consumed",
    );
    assert.equal(
      equivalentAuthorization.signing_operation_id,
      signingOperationId,
    );
    assert.deepEqual(fs.readFileSync(file),before);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const result=
      consumeVoidDatanetRegistrySigningAuthorizationWithClockV1(
        authInput(fixture,root,authorization),
        expiryMs,
      );
    assert.equal(result.ok,false);
    assert.equal(result.reason,"registry_signing_consumption_expired");
    assert.equal(fs.existsSync(path.join(root,"consumed")),false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const result=
      consumeVoidDatanetRegistrySigningAuthorizationWithClockV1(
        authInput(fixture,root,authorization),
        authorizedMs-1,
      );
    assert.equal(result.ok,false);
    assert.equal(result.reason,"registry_signing_consumption_not_yet_valid");
    assert.equal(fs.existsSync(path.join(root,"consumed")),false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot(0o755);
  try{
    const result=
      consumeVoidDatanetRegistrySigningAuthorizationWithClockV1(
        authInput(fixture,root,authorization),
        authorizedMs+1_000,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "registry_signing_consumption_state_root_mode_must_be_0700",
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
    const result=
      consumeVoidDatanetRegistrySigningAuthorizationWithClockV1(
        authInput(fixture,link,authorization),
        authorizedMs+1_000,
      );
    assert.equal(result.ok,false);
    assert.match(
      result.reason,
      /registry_signing_consumption_state_root_/u,
    );
  }finally{
    fs.rmSync(parent,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  const elsewhere=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-registry-consumed-target-v1-"),
  );
  fs.chmodSync(elsewhere,0o700);
  fs.symlinkSync(elsewhere,path.join(root,"consumed"));
  try{
    const result=
      consumeVoidDatanetRegistrySigningAuthorizationWithClockV1(
        authInput(fixture,root,authorization),
        authorizedMs+1_000,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "registry_signing_consumption_store_prepare_failed",
    );
    assert.equal(fs.readdirSync(elsewhere).length,0);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
    fs.rmSync(elsewhere,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  const bad=structuredClone(authorization);
  bad.transaction_broadcast_authorized=true;
  try{
    const result=
      consumeVoidDatanetRegistrySigningAuthorizationWithClockV1(
        authInput(fixture,root,bad),
        authorizedMs+1_000,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "registry_signing_consumption_authorization_invalid",
    );
    assert.equal(fs.existsSync(path.join(root,"consumed")),false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

for(const [key,expected] of Object.entries({
  durable_single_use_consumption:true,
  exact_authorization_rebuild_required:true,
  runtime_expiry_recheck_required:true,
  private_existing_state_root_required:true,
  exact_state_store_realpath_scoped_replay_prevention:true,
  immutable_consumption_record:true,
  filesystem_read:true,
  filesystem_mutation_one_consumption_record_may_occur:true,
  credential_access:false,
  private_key_access:false,
  signer_object_exposed:false,
  wallet_access:false,
  transaction_signer_access_authorized_by_this_gate:false,
  transaction_signing_performed:false,
  signed_transaction_export:false,
  transaction_submission:false,
  transaction_broadcast_authorized:false,
  transaction_broadcast_performed:false,
  deployment_authorized:false,
  deployment_performed:false,
  chain2050_write_authorized:false,
  chain2050_write_performed:false,
  funds_movement:false,
  automatic_retry:false,
})){
  assert.equal(
    VOID_DATANET_REGISTRY_SINGLE_USE_SIGNING_AUTHORIZATION_CONSUMPTION_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const toolSource=fs.readFileSync(
  "tools/void-datanet-registry-single-use-signing-authorization-consumption-v1.mjs",
  "utf8",
);
const runnerSource=fs.readFileSync(
  "ops/nimo/void-nimo-datanet-registry-signing-authorization-consumption-v1.mjs",
  "utf8",
);
for(const required of [
  "fs.linkSync",
  "fs.fsyncSync",
  "mode&0o777)!==0o700",
  "registry_signing_consumption_already_consumed",
  "consumption_precedes_any_signer_access:true",
]){
  assert.ok(toolSource.includes(required),required);
}
for(const required of [
  "Nimo",
  ".local/state/void/datanet-registry-signing-v1",
  "canonical_private_signing_state_root_required",
  "credential_access=false",
  "private_key_access=false",
  "transaction_signer_access=false",
  "transaction_signing=false",
  "signed_transaction_export=false",
  "transaction_broadcast=false",
  "chain2050_write=false",
]){
  assert.ok(runnerSource.includes(required),required);
}
for(const source of [toolSource,runnerSource]){
  for(const forbidden of [
    "SigningKey",
    "Wallet(",
    ".signTransaction(",
    ".signMessage(",
    "eth_sendRawTransaction",
    "eth_sendTransaction",
    "broadcastTransaction(",
    "sendTransaction(",
    "credentials_directory",
    "privateKey",
    "docker ",
    "systemctl",
    "ssh ",
    "sudo ",
  ]){
    assert.equal(source.includes(forbidden),false,forbidden);
  }
}

console.log(
  "VOID_DATANET_REGISTRY_SINGLE_USE_SIGNING_AUTHORIZATION_CONSUMPTION_V1_PROOF_GREEN",
);
console.log("authorization_rebuilt_before_consumption=true");
console.log("runtime_expiry_rechecked=true");
console.log("private_state_root_0700_required=true");
console.log("immutable_consumption_record_0600=true");
console.log("atomic_hardlink_publication=true");
console.log("directory_fsync_after_publication=true");
console.log("duplicate_authorization_rejected=true");
console.log("consumption_record_bytes_unchanged_on_duplicate=true");
console.log("replay_prevention_scope=exact_state_store_realpath");
console.log("consumption_precedes_any_signer_access=true");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("signer_object_exposed=false");
console.log("transaction_signer_access=false");
console.log("transaction_signing=false");
console.log("signed_transaction_export=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
