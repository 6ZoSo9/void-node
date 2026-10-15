#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1,
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
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_AUTHORITY_V1,
  buildVoidBuyVoidLegacyHistoryNimoReadRequestV1,
  buildVoidBuyVoidLegacyHistoryNimoServerResponseV1,
  testOnlyBuildVoidBuyVoidLegacyHistoryNimoAppendRequestAgainstFingerprintV1,
  testOnlyClassifyVoidBuyVoidLegacyHistoryNimoServerRequestAgainstFingerprintV1,
  validateVoidBuyVoidLegacyHistoryNimoResponseV1,
} from "../tools/void-buy-legacy-request-history-nimo-transport-envelope-v1.mjs";

const D=VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1;
const workflow=fs.readFileSync(
  ".github/workflows/buy-void-legacy-request-history-nimo-transport-envelope-v1.yml",
  "utf8"
);
for(const relative of [
  "tools/void-buy-legacy-request-history-external-witness-v1.mjs",
  "tools/void-buy-legacy-request-history-sovereign-authorization-v1.mjs",
  "tools/void-buy-legacy-request-history-disposition-v1.mjs",
  "src/security/void_sovereign_emergency_control_v1.ts",
  "src/security/void_alignment_layer_v1.ts",
  "src/economic/buy_void_allocation_custody_witness_transport_v1.ts",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.build.json",
  "scripts/copy_void_runtime_js_v1.mjs",
  "scripts/retire_saveblock_periodic_rewriters_v1.mjs",
]){
  const token='      - "'+relative+'"';
  assert.equal(
    workflow.split(token).length-1,
    2,
    "workflow must trigger for PR and main push: "+relative,
  );
}
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
const sid=hex=>"sha256:"+hex.repeat(64).slice(0,64);

const policy={
  transport:"ssh",
  remote_host:"nimo",
  remote_port:22,
  remote_user:"voidwitness",
  host_key_algorithm:"ssh-ed25519",
  host_key_sha256:sid("1"),
  known_hosts_sha256:sid("2"),
  client_key_algorithm:"ssh-ed25519",
  client_public_key_sha256:sid("3"),
  endpoint_marker:VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
  batch_mode:true,
  strict_host_key_checking:true,
  identities_only:true,
  request_tty:false,
  clear_all_forwardings:true,
  permit_local_command:false,
  remote_forced_command_only:true,
  remote_shell_allowed:false,
  caller_selected_remote_command:false,
  caller_selected_remote_path:false,
  connect_timeout_ms:8000,
  operation_timeout_ms:30000,
  max_request_bytes:256*1024,
  max_response_bytes:24*1024*1024,
};
assert.equal(classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(policy).ok,true);

const candidateBody={
  schema:"void_buy_void_legacy_history_disposition_candidate_v1",
  marker:VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1,
  version:1,
  metadata_census_sha256:"sha256:"+"1".repeat(64),
  metadata_census_source_head:"c4a0046dbadc7eb681e78c49090c9a17373f8682",
  metadata_census_source_blob_sha1:"f8bfda9ff88a5278c950b1c23f5e1675e5362048",
  metadata_census_marker:"VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V1",
  metadata_census_version:1,
  designated_hostname_matches:true,designated_runtime_user_matches:true,
  designated_machine_id_matches:true,bounded_current_candidate_set_observed:true,
  process_environment_access:false,external_network_calls:false,loopback_get_only:true,
  candidate_count:5,surviving_history_metadata_root_count:0,unverified_root_count:0,
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
  ...candidateBody,
  candidate_id:"voidblrhdc1_"+sha256(Buffer.from(canonical(candidateBody),"utf8")),
  authority:VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1,
};
const {publicKey,privateKey}=crypto.generateKeyPairSync("ed25519");
const fingerprint=sha256(publicKey.export({type:"spki",format:"der"}));
const publicPem=publicKey.export({type:"spki",format:"pem"});
const authorizationRequest=
  testOnlyBuildVoidBuyVoidLegacyHistorySovereignAuthorizationRequestAgainstFingerprintV1(
    candidate,"2026-10-15T12:05:00.000Z",fingerprint
  );
const signature=crypto.sign(
  null,canonicalVoidBuyVoidLegacyHistorySovereignAuthorizationPayloadV1(authorizationRequest),
  privateKey
).toString("base64");
const authorization=assembleVoidBuyVoidLegacyHistorySovereignAuthorizationV1(
  authorizationRequest,signature
);
const challenge="sha256:"+"4".repeat(64);

const append=testOnlyBuildVoidBuyVoidLegacyHistoryNimoAppendRequestAgainstFingerprintV1(
  {
    policy,challenge_sha256:challenge,current_witness_jsonl:Buffer.alloc(0),
    candidate,authorization,public_key_pem:publicPem,
    witnessed_at_utc:"2026-10-15T12:06:00.000Z",
  },
  fingerprint,
);
assert.equal(append.ok,true);
if(!append.ok)throw Error(append.reason||"append request held");
assert.equal(append.expected_append_required,true);
assert.match(append.request_id,/^voidblrhtreq1_[0-9a-f]{64}$/u);

for(const invalidUtc of [
  "2026-02-29T00:00:00.000Z",
  "2026-02-31T12:00:00.000Z",
]){
  const invalid=testOnlyBuildVoidBuyVoidLegacyHistoryNimoAppendRequestAgainstFingerprintV1(
    {
      policy,
      challenge_sha256:"sha256:"+"8".repeat(64),
      current_witness_jsonl:Buffer.alloc(0),
      candidate,
      authorization,
      public_key_pem:publicPem,
      witnessed_at_utc:invalidUtc,
    },
    fingerprint,
  );
  assert.equal(invalid.ok,false);
  assert.match(invalid.reason,/legacy_history_nimo_transport_time_invalid/u);
}
const leapTransport=
  testOnlyBuildVoidBuyVoidLegacyHistoryNimoAppendRequestAgainstFingerprintV1(
    {
      policy,
      challenge_sha256:"sha256:"+"8".repeat(64),
      current_witness_jsonl:Buffer.alloc(0),
      candidate,
      authorization,
      public_key_pem:publicPem,
      witnessed_at_utc:"2028-02-29T12:00:00Z",
    },
    fingerprint,
  );
assert.equal(leapTransport.ok,true);

const server=testOnlyClassifyVoidBuyVoidLegacyHistoryNimoServerRequestAgainstFingerprintV1(
  {policy,request_json:append.request_json,current_witness_jsonl:Buffer.alloc(0)},
  fingerprint,
);
assert.equal(server.ok,true);
if(!server.ok)throw Error(server.reason||"server held");
assert.equal(server.status,"APPEND_READY_SOURCE_ONLY");
assert.equal(server.append_required,true);
assert.ok(server.next_witness_jsonl.equals(append.expected_next_witness_jsonl));

const appendResponse=buildVoidBuyVoidLegacyHistoryNimoServerResponseV1({
  policy,request_json:append.request_json,
  observed_witness_jsonl:server.next_witness_jsonl,
  operation_performed:true,
});
assert.equal(appendResponse.ok,true);
const validatedAppend=validateVoidBuyVoidLegacyHistoryNimoResponseV1({
  policy,request_json:append.request_json,response_json:appendResponse.response_json,
});
assert.equal(validatedAppend.ok,true);
assert.equal(validatedAppend.round_trip_witness_bytes_verified,true);
assert.equal(validatedAppend.external_transport_authenticated,false);
assert.equal(validatedAppend.external_witness_storage_proven,false);

const retryResponse=buildVoidBuyVoidLegacyHistoryNimoServerResponseV1({
  policy,request_json:append.request_json,
  observed_witness_jsonl:server.next_witness_jsonl,
  operation_performed:false,
});
assert.equal(retryResponse.ok,true);
if(!retryResponse.ok)throw Error("retry response held");
assert.equal(retryResponse.response.status,"idempotent");
assert.equal(retryResponse.response.operation_performed,false);
const validatedRetry=validateVoidBuyVoidLegacyHistoryNimoResponseV1({
  policy,request_json:append.request_json,response_json:retryResponse.response_json,
});
assert.equal(validatedRetry.ok,true);

const candidateBBody={
  ...candidateBody,
  metadata_census_sha256:"sha256:"+"2".repeat(64),
};
const candidateB={
  ...candidate,
  ...candidateBBody,
  candidate_id:"voidblrhdc1_"+sha256(Buffer.from(canonical(candidateBBody),"utf8")),
};
const requestB=
  testOnlyBuildVoidBuyVoidLegacyHistorySovereignAuthorizationRequestAgainstFingerprintV1(
    candidateB,"2026-10-15T12:08:00.000Z",fingerprint
  );
const signatureB=crypto.sign(
  null,
  canonicalVoidBuyVoidLegacyHistorySovereignAuthorizationPayloadV1(requestB),
  privateKey,
).toString("base64");
const authorizationB=
  assembleVoidBuyVoidLegacyHistorySovereignAuthorizationV1(requestB,signatureB);
const appendB=testOnlyBuildVoidBuyVoidLegacyHistoryNimoAppendRequestAgainstFingerprintV1(
  {
    policy,
    challenge_sha256:"sha256:"+"6".repeat(64),
    current_witness_jsonl:server.next_witness_jsonl,
    candidate:candidateB,
    authorization:authorizationB,
    public_key_pem:publicPem,
    witnessed_at_utc:"2026-10-15T12:09:00.000Z",
  },
  fingerprint,
);
assert.equal(appendB.ok,true);
if(!appendB.ok)throw Error(appendB.reason||"append B held");
assert.equal(appendB.expected_append_required,true);
const serverB=testOnlyClassifyVoidBuyVoidLegacyHistoryNimoServerRequestAgainstFingerprintV1(
  {
    policy,
    request_json:appendB.request_json,
    current_witness_jsonl:server.next_witness_jsonl,
  },
  fingerprint,
);
assert.equal(serverB.ok,true);
if(!serverB.ok)throw Error(serverB.reason||"server B held");
const responseB=buildVoidBuyVoidLegacyHistoryNimoServerResponseV1({
  policy,
  request_json:appendB.request_json,
  observed_witness_jsonl:serverB.next_witness_jsonl,
  operation_performed:true,
});
assert.equal(responseB.ok,true);
assert.equal(validateVoidBuyVoidLegacyHistoryNimoResponseV1({
  policy,request_json:appendB.request_json,response_json:responseB.response_json,
}).ok,true);

const retryA=testOnlyBuildVoidBuyVoidLegacyHistoryNimoAppendRequestAgainstFingerprintV1(
  {
    policy,
    challenge_sha256:"sha256:"+"7".repeat(64),
    current_witness_jsonl:serverB.next_witness_jsonl,
    candidate,
    authorization,
    public_key_pem:publicPem,
    witnessed_at_utc:"2026-10-15T12:10:00.000Z",
  },
  fingerprint,
);
assert.equal(retryA.ok,true);
if(!retryA.ok)throw Error(retryA.reason||"non-tip retry A held");
assert.equal(retryA.expected_append_required,false);
assert.ok(retryA.expected_next_witness_jsonl.equals(serverB.next_witness_jsonl));
const retryAServer=
  testOnlyClassifyVoidBuyVoidLegacyHistoryNimoServerRequestAgainstFingerprintV1(
    {policy,request_json:retryA.request_json,current_witness_jsonl:serverB.next_witness_jsonl},
    fingerprint,
  );
assert.equal(retryAServer.ok,true);
if(!retryAServer.ok)throw Error(retryAServer.reason||"non-tip server retry held");
assert.equal(retryAServer.status,"IDEMPOTENT_READY_SOURCE_ONLY");
assert.equal(retryAServer.append_required,false);
const retryAResponse=buildVoidBuyVoidLegacyHistoryNimoServerResponseV1({
  policy,
  request_json:retryA.request_json,
  observed_witness_jsonl:serverB.next_witness_jsonl,
  operation_performed:false,
});
assert.equal(retryAResponse.ok,true);
if(!retryAResponse.ok)throw Error(retryAResponse.reason||"non-tip response held");
assert.equal(retryAResponse.response.status,"idempotent");
assert.notEqual(retryAResponse.response.tip_event_id,retryA.request.expected_event_id);
const validatedRetryA=validateVoidBuyVoidLegacyHistoryNimoResponseV1({
  policy,request_json:retryA.request_json,response_json:retryAResponse.response_json,
});
assert.equal(validatedRetryA.ok,true);

const read=buildVoidBuyVoidLegacyHistoryNimoReadRequestV1({
  policy,challenge_sha256:"sha256:"+"5".repeat(64),
});
assert.equal(read.ok,true);
const readServer=testOnlyClassifyVoidBuyVoidLegacyHistoryNimoServerRequestAgainstFingerprintV1(
  {policy,request_json:read.request_json,current_witness_jsonl:server.next_witness_jsonl},
  fingerprint,
);
assert.equal(readServer.ok,true);
assert.equal(readServer.status,"READ_READY_SOURCE_ONLY");
const readResponse=buildVoidBuyVoidLegacyHistoryNimoServerResponseV1({
  policy,request_json:read.request_json,
  observed_witness_jsonl:readServer.current_witness_jsonl,
  operation_performed:false,
});
assert.equal(readResponse.ok,true);
const validatedRead=validateVoidBuyVoidLegacyHistoryNimoResponseV1({
  policy,request_json:read.request_json,response_json:readResponse.response_json,
});
assert.equal(validatedRead.ok,true);
assert.ok(validatedRead.witness_jsonl.equals(server.next_witness_jsonl));

const staleCurrent=testOnlyClassifyVoidBuyVoidLegacyHistoryNimoServerRequestAgainstFingerprintV1(
  {policy,request_json:append.request_json,current_witness_jsonl:server.next_witness_jsonl},
  fingerprint,
);
assert.equal(staleCurrent.ok,false);

const tampered=Buffer.from(append.request_json);
tampered[tampered.length-2]^=1;
assert.equal(
  testOnlyClassifyVoidBuyVoidLegacyHistoryNimoServerRequestAgainstFingerprintV1(
    {policy,request_json:tampered,current_witness_jsonl:Buffer.alloc(0)},fingerprint
  ).ok,
  false,
);
const wrongPolicy={...policy,host_key_sha256:"sha256:"+"9".repeat(64)};
assert.equal(
  testOnlyClassifyVoidBuyVoidLegacyHistoryNimoServerRequestAgainstFingerprintV1(
    {policy:wrongPolicy,request_json:append.request_json,current_witness_jsonl:Buffer.alloc(0)},
    fingerprint
  ).ok,
  false,
);
const wrongResponse=Buffer.from(appendResponse.response_json);
wrongResponse[wrongResponse.length-2]^=1;
assert.equal(
  validateVoidBuyVoidLegacyHistoryNimoResponseV1({
    policy,request_json:append.request_json,response_json:wrongResponse
  }).ok,
  false,
);

for(const [key,expected] of Object.entries({
  source_only_transport_envelope:true,
  existing_reviewed_ssh_policy_classifier_reused:true,
  forced_command_only_policy_required:true,
  caller_selected_remote_command:false,
  caller_selected_remote_path:false,
  fixed_legacy_history_witness_path:true,
  server_replans_signed_authorization_against_current_witness:true,
  append_compare_and_swap_required:true,
  round_trip_witness_bytes_returned:true,
  crash_retry_idempotent_response_supported:true,
  challenge_bound_request_response:true,
  policy_hash_bound_request_response:true,
  canonical_request_response_bytes:true,
  arbitrary_append_bytes_from_client:false,
  network_access:false,ssh_execution:false,credential_read:false,credential_write:false,
  remote_filesystem_read:false,remote_filesystem_write:false,
  external_transport_authenticated:false,external_witness_storage_proven:false,
  live_remote_read_performed:false,live_remote_append_performed:false,
  external_witness_verified:false,
  historical_request_history_disposition_accepted:false,
  stable_root_apply_authorized:false,private_key_access:false,
  payment_acceptance:false,public_presale_activation:false,funds_movement:false,
})){
  assert.equal(VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_AUTHORITY_V1[key],expected,key);
}

console.log("VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1_PROOF_GREEN");
console.log("reviewed_ssh_policy_classifier_reused=true");
console.log("server_replans_signed_authorization=true");
console.log("arbitrary_append_bytes_from_client=false");
console.log("append_compare_and_swap_required=true");
console.log("round_trip_witness_bytes_verified=true");
console.log("crash_retry_idempotent_response_supported=true");
console.log("network_access=false");
console.log("ssh_execution=false");
console.log("external_transport_authenticated=false");
console.log("external_witness_storage_proven=false");
console.log("external_witness_verified=false");
console.log("stable_root_apply_authorized=false");
console.log("funds_movement=false");
