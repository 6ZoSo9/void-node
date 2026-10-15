#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
} from "../dist/economic/buy_void_allocation_custody_witness_transport_v1.js";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1,
} from "../tools/void-buy-legacy-request-history-disposition-v1.mjs";
import {
  assembleVoidBuyVoidLegacyHistorySovereignAuthorizationV1,
  canonicalVoidBuyVoidLegacyHistorySovereignAuthorizationPayloadV1,
  testOnlyBuildVoidBuyVoidLegacyHistorySovereignAuthorizationRequestAgainstFingerprintV1,
} from "../tools/void-buy-legacy-request-history-sovereign-authorization-v1.mjs";
import {
  testOnlyBuildVoidBuyVoidLegacyHistoryNimoAppendRequestAgainstFingerprintV1,
  validateVoidBuyVoidLegacyHistoryNimoResponseV1,
} from "../tools/void-buy-legacy-request-history-nimo-transport-envelope-v1.mjs";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_AUTHORITY_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INTENT_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_WITNESS_NAME_V1,
  testOnlyHandleVoidBuyVoidLegacyHistoryNimoForcedCommandRequestV1,
} from "../tools/void-buy-legacy-request-history-nimo-forced-command-v1.mjs";

const D=VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1;
function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value).replace(/[\u007f-\uffff]/g,
    ch=>"\\u"+ch.charCodeAt(0).toString(16).padStart(4,"0"));
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"&&!Array.isArray(value)){
    return "{"+Object.keys(value).sort().map(k=>canonical(k)+":"+canonical(value[k])).join(",")+"}";
  }
  throw Error("noncanonical");
}
const sha256=value=>crypto.createHash("sha256").update(value).digest("hex");
const sid=ch=>"sha256:"+ch.repeat(64).slice(0,64);
const nimoIdentity=Object.freeze({
  witness_hostname:"Nimo",
  witness_machine_id_sha256:
    "sha256:48a3554126d621d6460385ebacf3d41b454157337271cb7405af012158f203d4",
  witness_root_disk_serial:"50026B76873B25AB",
  witness_root_disk_wwn:"eui.00000000000000000026b76873b25ab5",
});
function transportPolicy(){
  return {
    transport:"ssh",remote_host:"nimo",remote_port:22,remote_user:"voidwitness",
    host_key_algorithm:"ssh-ed25519",host_key_sha256:sid("1"),
    known_hosts_sha256:sid("2"),client_key_algorithm:"ssh-ed25519",
    client_public_key_sha256:sid("3"),
    endpoint_marker:VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
    batch_mode:true,strict_host_key_checking:true,identities_only:true,
    request_tty:false,clear_all_forwardings:true,permit_local_command:false,
    remote_forced_command_only:true,remote_shell_allowed:false,
    caller_selected_remote_command:false,caller_selected_remote_path:false,
    connect_timeout_ms:8000,operation_timeout_ms:30000,
    max_request_bytes:256*1024,max_response_bytes:24*1024*1024,
  };
}
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-legacy-history-nimo-handler-v1-"));
  fs.chmodSync(root,0o700);
  fs.writeFileSync(
    path.join(root,VOID_BUY_VOID_LEGACY_HISTORY_NIMO_WITNESS_NAME_V1),
    Buffer.alloc(0),{mode:0o600}
  );
  const config={
    schema:"void_buy_void_legacy_history_nimo_forced_command_config_v1",
    marker:"VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_CONFIG_V1",
    version:1,authority_root:root,
    witness_filename:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_WITNESS_NAME_V1,
    transport_policy:transportPolicy(),
    expected_witness_identity:nimoIdentity,
  };
  return {root,config};
}
function candidateAndAuth(){
  const body={
    schema:"void_buy_void_legacy_history_disposition_candidate_v1",
    marker:VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1,
    version:1,metadata_census_sha256:"sha256:"+"1".repeat(64),
    metadata_census_source_head:"c4a0046dbadc7eb681e78c49090c9a17373f8682",
    metadata_census_source_blob_sha1:"f8bfda9ff88a5278c950b1c23f5e1675e5362048",
    metadata_census_marker:"VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V1",
    metadata_census_version:1,designated_hostname_matches:true,
    designated_runtime_user_matches:true,designated_machine_id_matches:true,
    bounded_current_candidate_set_observed:true,process_environment_access:false,
    external_network_calls:false,loopback_get_only:true,candidate_count:5,
    surviving_history_metadata_root_count:0,unverified_root_count:0,
    empty_shape_external_anchor_required_count:0,absent_root_count:4,
    technical_candidate_set_completeness_proven:false,
    technical_historical_origin_proven:false,filesystem_rollback_prevention_proven:false,
    decision:D.NO_PREANCHOR_CUSTOMER_LIABILITY_DECLARED,
    operator_id:"economic-owner-review",reviewed_at_utc:"2026-10-15T12:00:00.000Z",
    human_accounting_disposition_declared:true,sovereign_signature_required:true,
    external_witness_required:true,sovereign_signature_verified:false,
    external_witness_verified:false,historical_request_history_disposition_accepted:false,
    migration_authorized:false,stable_root_apply_authorized:false,payment_acceptance:false,
    public_presale_activation:false,funds_movement:false,
  };
  const candidate={
    ok:true,status:"DISPOSITION_CANDIDATE_REQUIRES_SOVEREIGN_SIGNATURE_AND_EXTERNAL_WITNESS",
    ...body,candidate_id:"voidblrhdc1_"+sha256(Buffer.from(canonical(body),"utf8")),
    authority:VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1,
  };
  const {publicKey,privateKey}=crypto.generateKeyPairSync("ed25519");
  const fingerprint=sha256(publicKey.export({type:"spki",format:"der"}));
  const publicPem=publicKey.export({type:"spki",format:"pem"});
  const request=
    testOnlyBuildVoidBuyVoidLegacyHistorySovereignAuthorizationRequestAgainstFingerprintV1(
      candidate,"2026-10-15T12:05:00.000Z",fingerprint
    );
  const signature=crypto.sign(
    null,canonicalVoidBuyVoidLegacyHistorySovereignAuthorizationPayloadV1(request),
    privateKey
  ).toString("base64");
  return {
    candidate,
    authorization:assembleVoidBuyVoidLegacyHistorySovereignAuthorizationV1(request,signature),
    publicPem,fingerprint,
  };
}
function appendRequest(state,current=Buffer.alloc(0)){
  return testOnlyBuildVoidBuyVoidLegacyHistoryNimoAppendRequestAgainstFingerprintV1(
    {
      policy:state.config.transport_policy,challenge_sha256:"sha256:"+"4".repeat(64),
      current_witness_jsonl:current,candidate:state.candidate,
      authorization:state.authorization,public_key_pem:state.publicPem,
      witnessed_at_utc:"2026-10-15T12:06:00.000Z",
    },state.fingerprint
  );
}
function classifier(fingerprint){
  return input=>{
    const mod=globalThis.__serverClassifier;
    return mod(input,fingerprint);
  };
}
const transport=await import("../tools/void-buy-legacy-request-history-nimo-transport-envelope-v1.mjs");
globalThis.__serverClassifier=(input,fingerprint)=>
  transport.testOnlyClassifyVoidBuyVoidLegacyHistoryNimoServerRequestAgainstFingerprintV1(
    input,fingerprint
  );

{
  const f=fixture(),a=candidateAndAuth(),state={...f,...a};
  const req=appendRequest(state);
  assert.equal(req.ok,true);
  const result=testOnlyHandleVoidBuyVoidLegacyHistoryNimoForcedCommandRequestV1(
    f.config,req.request_json,{host_identity:nimoIdentity,server_classifier:classifier(a.fingerprint)}
  );
  assert.equal(result.ok,true);
  assert.equal(result.response.status,"appended");
  assert.equal(result.response.operation_performed,true);
  const validated=validateVoidBuyVoidLegacyHistoryNimoResponseV1({
    policy:f.config.transport_policy,request_json:req.request_json,response_json:result.response_json
  });
  assert.equal(validated.ok,true);
  assert.equal(fs.existsSync(path.join(f.root,VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INTENT_NAME_V1)),false);
  fs.rmSync(f.root,{recursive:true,force:true});
}
{
  const f=fixture(),a=candidateAndAuth(),state={...f,...a};
  const req=appendRequest(state);
  assert.throws(()=>testOnlyHandleVoidBuyVoidLegacyHistoryNimoForcedCommandRequestV1(
    f.config,req.request_json,{
      host_identity:nimoIdentity,server_classifier:classifier(a.fingerprint),
      hooks:{interrupt_after_intent:true},
    }
  ),/test_interrupt_after_intent/u);
  assert.equal(fs.existsSync(path.join(f.root,VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INTENT_NAME_V1)),true);
  const retry=testOnlyHandleVoidBuyVoidLegacyHistoryNimoForcedCommandRequestV1(
    f.config,req.request_json,{host_identity:nimoIdentity,server_classifier:classifier(a.fingerprint)}
  );
  assert.equal(retry.ok,true);
  assert.equal(retry.recovered_intent,true);
  assert.equal(retry.response.status,"appended");
  assert.equal(fs.existsSync(path.join(f.root,VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INTENT_NAME_V1)),false);
  fs.rmSync(f.root,{recursive:true,force:true});
}
{
  const f=fixture(),a=candidateAndAuth(),state={...f,...a};
  const req=appendRequest(state);
  assert.throws(()=>testOnlyHandleVoidBuyVoidLegacyHistoryNimoForcedCommandRequestV1(
    f.config,req.request_json,{
      host_identity:nimoIdentity,server_classifier:classifier(a.fingerprint),
      hooks:{interrupt_after_partial_append:true},
    }
  ),/test_interrupt_after_partial_append/u);
  const retry=testOnlyHandleVoidBuyVoidLegacyHistoryNimoForcedCommandRequestV1(
    f.config,req.request_json,{host_identity:nimoIdentity,server_classifier:classifier(a.fingerprint)}
  );
  assert.equal(retry.ok,true);
  assert.equal(retry.recovered_intent,true);
  assert.equal(retry.response.status,"appended");
  fs.rmSync(f.root,{recursive:true,force:true});
}
{
  const f=fixture(),a=candidateAndAuth(),state={...f,...a};
  const req=appendRequest(state);
  assert.throws(()=>testOnlyHandleVoidBuyVoidLegacyHistoryNimoForcedCommandRequestV1(
    f.config,req.request_json,{
      host_identity:nimoIdentity,server_classifier:classifier(a.fingerprint),
      hooks:{interrupt_after_full_append:true},
    }
  ),/test_interrupt_after_full_append/u);
  const retry=testOnlyHandleVoidBuyVoidLegacyHistoryNimoForcedCommandRequestV1(
    f.config,req.request_json,{host_identity:nimoIdentity,server_classifier:classifier(a.fingerprint)}
  );
  assert.equal(retry.ok,true);
  assert.equal(retry.recovered_intent,true);
  assert.equal(retry.response.status,"idempotent");
  assert.equal(retry.response.operation_performed,false);
  fs.rmSync(f.root,{recursive:true,force:true});
}
{
  const f=fixture(),a=candidateAndAuth(),state={...f,...a};
  const req=appendRequest(state);
  assert.throws(()=>testOnlyHandleVoidBuyVoidLegacyHistoryNimoForcedCommandRequestV1(
    f.config,req.request_json,{
      host_identity:nimoIdentity,server_classifier:classifier(a.fingerprint),
      hooks:{interrupt_after_intent:true},
    }
  ),/test_interrupt_after_intent/u);
  const different=Buffer.from(req.request_json);
  different[different.length-2]^=1;
  assert.throws(()=>testOnlyHandleVoidBuyVoidLegacyHistoryNimoForcedCommandRequestV1(
    f.config,different,{host_identity:nimoIdentity,server_classifier:classifier(a.fingerprint)}
  ),/pending_intent_request_mismatch/u);
  fs.rmSync(f.root,{recursive:true,force:true});
}
{
  const f=fixture(),a=candidateAndAuth(),state={...f,...a};
  const req=appendRequest(state);
  assert.throws(()=>testOnlyHandleVoidBuyVoidLegacyHistoryNimoForcedCommandRequestV1(
    f.config,req.request_json,{
      host_identity:{...nimoIdentity,witness_root_disk_serial:"wrong"},
      server_classifier:classifier(a.fingerprint),
    }
  ),/host_identity_mismatch/u);
  fs.rmSync(f.root,{recursive:true,force:true});
}

for(const [key,expected] of Object.entries({
  source_handler:true,forced_command_boundary:true,empty_original_command_required:true,
  fixed_config_path_required:true,root_owned_nonwritable_config_ancestry_required:true,
  root_owned_read_only_config_required:true,fixed_authority_root_required:true,
  authority_root_mode_0700_required:true,witness_mode_0600_single_link_required:true,
  intent_mode_0600_single_link_required:true,nofollow_config_and_witness_open:true,
  descriptor_pinned_authority_root:true,shared_cross_process_lock:true,
  server_replans_signed_authorization:true,compare_and_swap_required:true,
  durable_append_intent:true,torn_append_recovery:true,exact_post_crash_idempotence:true,
  witness_fsync:true,authority_directory_fsync:true,post_mutation_path_rebind:true,
  fixed_nimo_host_identity_required:true,dedicated_voidwitness_uid_gid_required:true,
  canonical_durable_intent_required:true,arbitrary_append_bytes_from_client:false,
  caller_selected_path:false,caller_selected_command:false,shell_access:false,
  generic_write_primitive:false,generic_delete_primitive:false,
  generic_rename_primitive:false,service_control_primitive:false,
  live_nimo_installed:false,live_handler_execution_performed:false,
  live_remote_read_performed:false,live_remote_append_performed:false,
  external_transport_authenticated:false,external_witness_storage_proven:false,
  external_witness_verified:false,historical_request_history_disposition_accepted:false,
  stable_root_apply_authorized:false,private_key_access:false,payment_acceptance:false,
  public_presale_activation:false,funds_movement:false,
})){
  assert.equal(VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_AUTHORITY_V1[key],expected,key);
}
console.log("VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_V1_PROOF_GREEN");
console.log("durable_append_intent=true");
console.log("torn_append_recovery=true");
console.log("post_crash_idempotence=true");
console.log("descriptor_pinned_authority_root=true");
console.log("fixed_nimo_host_identity_required=true");
console.log("dedicated_voidwitness_uid_gid_required=true");
console.log("canonical_durable_intent_required=true");
console.log("arbitrary_append_bytes_from_client=false");
console.log("live_nimo_installed=false");
console.log("external_witness_verified=false");
console.log("stable_root_apply_authorized=false");
console.log("funds_movement=false");
