#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  canonicalApollyonClaimContractJsonV1,
} from "../tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  ACCEPTED_STORE_POLICY_ID,
  CANONICALIZER_V1_BLOB_SHA1,
  PARENT_CANDIDATE_BLOB_SHA1,
  PARENT_STORE_CONTRACT_BLOB_SHA1,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_ENVELOPE_AUTHORITY_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_MARKER_V2,
  parseApollyonDurableAttemptClaimPublishRequestBytesV2,
  serializeApollyonDurableAttemptClaimPublishRequestV2,
  validateApollyonDurableAttemptClaimPublishRequestV2,
} from "../tools/apollyon-durable-attempt-claim-request-envelope-v2.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries({
  "tools/apollyon-durable-attempt-claim-request-envelope-v2.mjs":
    "b2cc538a20ab8fa03ee4c91051d654e4b0273fe9",
  "tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs":
    "7654ddb2d5875d1aa42e8f41398afb727ba3832d",
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs":
    "bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs":
    "f97fafb0148527ae3a954e2752faef8c7fc9e88e",
})){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}

assert.equal(PARENT_CANDIDATE_BLOB_SHA1,"7654ddb2d5875d1aa42e8f41398afb727ba3832d");
assert.notEqual(PARENT_CANDIDATE_BLOB_SHA1,"d67ef39c4cd034844fb0862e180de46ed4cd0c88");
assert.equal(PARENT_STORE_CONTRACT_BLOB_SHA1,"bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc");
assert.equal(CANONICALIZER_V1_BLOB_SHA1,"f97fafb0148527ae3a954e2752faef8c7fc9e88e");

const STORE_CONTRACT_ID="apollyon_claim_store_contract_v2:"+"1".repeat(64);
const STORE_GENERATION_ID="apollyon_claim_store_generation_v2:"+"2".repeat(64);
function record(overrides={}){
  const material={
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_V2",
    version:2,
    status:"durable_candidate_training_attempt_claim_record_v2",
    store_contract_id:STORE_CONTRACT_ID,
    store_policy_id:ACCEPTED_STORE_POLICY_ID,
    store_generation_id:STORE_GENERATION_ID,
    terminal_receipt_id:"apollyon_terminal_receipt_v2:"+"3".repeat(64),
    terminal_runner_receipt_sha256:"4".repeat(64),
    authorization_id:"apollyon_authz_v1:"+"5".repeat(64),
    custody_generation_id:"apollyon_custody_generation_v1:"+"6".repeat(64),
    custody_record_sha256:"7".repeat(64),
    request_sha256:"8".repeat(64),
    canonical_main:"9".repeat(40),
    canonical_tree:"a".repeat(40),
    corpus_sha256:"b".repeat(64),
    parent_adapter_sha256:"c".repeat(64),
    operator_public_key_raw_sha256:"d".repeat(64),
    attempt_limit:1,
    automatic_retry_authorized:false,
    ...overrides,
  };
  return {
    ...material,
    claim_record_id:"apollyon_attempt_claim_record_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8")),
  };
}
function request(overrides={}){
  return {
    claim_record:record(),
    marker:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_MARKER_V2,
    method:"publish_claim_v2",
    store_contract_id:STORE_CONTRACT_ID,
    store_policy_id:ACCEPTED_STORE_POLICY_ID,
    version:2,
    ...overrides,
  };
}
function canonicalBytes(value){
  return Buffer.from(canonicalApollyonClaimContractJsonV1(value)+"\n","utf8");
}

const positive=request();
const validated=validateApollyonDurableAttemptClaimPublishRequestV2(positive);
assert.equal(validated.marker,"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_V2");
assert.equal(validated.version,2);
assert.equal(validated.method,"publish_claim_v2");
assert.equal(validated.store_policy_id,ACCEPTED_STORE_POLICY_ID);
assert.equal(validated.claim_record.claim_record_id,positive.claim_record.claim_record_id);

const bytes=serializeApollyonDurableAttemptClaimPublishRequestV2(positive);
assert.deepEqual(bytes,canonicalBytes(validated));
const parseInput=Buffer.from(bytes);
const parsed=parseApollyonDurableAttemptClaimPublishRequestBytesV2(parseInput);
assert.deepEqual(parsed.request,validated);
assert.equal(Object.isFrozen(parsed),true);
assert.equal(Object.isFrozen(parsed.request),true);
assert.equal(Object.isFrozen(parsed.request.claim_record),true);
assert.throws(
  ()=>{parsed.request.claim_record.store_contract_id=
    "apollyon_claim_store_contract_v2:"+"0".repeat(64);},
  TypeError,
);
assert.equal(parsed.request.claim_record.store_contract_id,STORE_CONTRACT_ID);
assert.equal(parsed.publish_request_sha256,sha256(bytes));
assert.equal(typeof parsed.canonical_request_utf8_lf,"string");
assert.equal(parsed.canonical_request_utf8_lf,bytes.toString("utf8"));
assert.equal(
  sha256(Buffer.from(parsed.canonical_request_utf8_lf,"utf8")),
  parsed.publish_request_sha256,
);
assert.throws(
  ()=>{parsed.canonical_request_utf8_lf="tampered\n";},
  TypeError,
);
parseInput[0]^=0xff;
assert.equal(parsed.canonical_request_utf8_lf,bytes.toString("utf8"));
assert.equal(
  sha256(Buffer.from(parsed.canonical_request_utf8_lf,"utf8")),
  parsed.publish_request_sha256,
);
const reconstructed=Buffer.from(parsed.canonical_request_utf8_lf,"utf8");
reconstructed[0]^=0xff;
assert.notEqual(sha256(reconstructed),parsed.publish_request_sha256);
assert.equal(
  sha256(Buffer.from(parsed.canonical_request_utf8_lf,"utf8")),
  parsed.publish_request_sha256,
);

for(const [label,mutate,pattern] of [
  ["marker",x=>{x.marker="VOID_APOLLYON_OTHER";},/envelope_invalid/u],
  ["version",x=>{x.version=1;},/envelope_invalid/u],
  ["version_string",x=>{x.version="2";},/envelope_invalid/u],
  ["method",x=>{x.method="publish";},/envelope_invalid/u],
  ["policy",x=>{x.store_policy_id="apollyon_claim_store_policy_v2:"+"0".repeat(64);},/envelope_invalid/u],
  ["store_cross",x=>{x.store_contract_id="apollyon_claim_store_contract_v2:"+"0".repeat(64);},/store_cross_binding_invalid/u],
  ["unknown",x=>{x.unknown=true;},/envelope_invalid/u],
  ["missing",x=>{delete x.method;},/envelope_invalid/u],
]){
  const bad=request();mutate(bad);
  assert.throws(()=>validateApollyonDurableAttemptClaimPublishRequestV2(bad),pattern,label);
}

{
  const bad=request();
  const broken={...bad.claim_record,claim_record_id:"apollyon_attempt_claim_record_v2:"+"0".repeat(64)};
  bad.claim_record=broken;
  assert.throws(
    ()=>validateApollyonDurableAttemptClaimPublishRequestV2(bad),
    /record_id_invalid/u,
  );
}
{
  const bad=request();
  const m={...bad.claim_record,automatic_retry_authorized:true};
  const material={...m};delete material.claim_record_id;
  m.claim_record_id="apollyon_attempt_claim_record_v2:"+
    sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8"));
  bad.claim_record=m;
  assert.throws(
    ()=>validateApollyonDurableAttemptClaimPublishRequestV2(bad),
    /record_invalid/u,
  );
}
{
  const bad=request();
  bad.claim_record={...bad.claim_record,unexpected:false};
  assert.throws(
    ()=>validateApollyonDurableAttemptClaimPublishRequestV2(bad),
    /record_invalid/u,
  );
}
{
  const noncanonical=Buffer.from(
    JSON.stringify(positive,null,1)+"\n","utf8",
  );
  assert.throws(
    ()=>parseApollyonDurableAttemptClaimPublishRequestBytesV2(noncanonical),
    /framing_invalid|noncanonical/u,
  );
}
{
  const noLf=Buffer.from(canonicalApollyonClaimContractJsonV1(positive),"utf8");
  assert.throws(
    ()=>parseApollyonDurableAttemptClaimPublishRequestBytesV2(noLf),
    /framing_invalid/u,
  );
}
{
  const doubleLf=Buffer.concat([bytes,Buffer.from("\n")]);
  assert.throws(
    ()=>parseApollyonDurableAttemptClaimPublishRequestBytesV2(doubleLf),
    /framing_invalid/u,
  );
}
{
  const invalidUtf8=Buffer.from([0xff,0xfe,0x0a]);
  assert.throws(
    ()=>parseApollyonDurableAttemptClaimPublishRequestBytesV2(invalidUtf8),
    /utf8_invalid/u,
  );
}
{
  const huge=Buffer.alloc(65537,0x61);
  assert.throws(
    ()=>parseApollyonDurableAttemptClaimPublishRequestBytesV2(huge),
    /size_invalid/u,
  );
}
assert.throws(
  ()=>parseApollyonDurableAttemptClaimPublishRequestBytesV2(new Uint8Array(bytes)),
  /bytes_invalid/u,
);

for(const [key,expected] of Object.entries({
  source_only_protocol_closure:true,
  parent_candidate_blob_bound:true,
  parent_store_contract_blob_bound:true,
  canonicalizer_v1_blob_bound:true,
  exact_request_marker_bound:true,
  exact_request_version_bound:true,
  exact_request_method_bound:true,
  exact_request_key_schema_bound:true,
  canonical_lf_framing_bound:true,
  publish_request_sha256_exact_bytes_bound:true,
  claim_record_schema_bound:true,
  claim_record_content_address_bound:true,
  request_record_store_cross_binding_required:true,
  accepted_store_policy_id_bound:true,
  terminal_receipt_revalidation_performed:false,
  protected_runner_origin_proven:false,
  current_host_revalidation_performed:false,
  custody_record_revalidation_performed:false,
  host_installation:false,
  filesystem_read:false,
  filesystem_write:false,
  network_access:false,
  service_action:false,
  socket_action:false,
  durable_attempt_claim:false,
  attempt_claim_authorized:false,
  attempt_claimed:false,
  training_execution_authorized:false,
  training_execution:false,
  candidate_weight_mutation:false,
  operator_private_key_access:false,
  production_signing:false,
  wallet_access:false,
  transaction_signing:false,
  transaction_broadcast:false,
  funds_movement:false,
})){
  assert.equal(
    VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_ENVELOPE_AUTHORITY_V2[key],
    expected,key,
  );
}

const source=fs.readFileSync(
  path.join(ROOT,"tools/apollyon-durable-attempt-claim-request-envelope-v2.mjs"),
  "utf8",
);
for(const forbidden of [
  'from "node:fs"','from "node:net"','from "node:child_process"',
  "writeFile","appendFile","mkdir","spawn(","fetch(","systemctl",
  "createPrivateKey","crypto.sign(","attempt_claimed:true",
  "training_execution_authorized:true","training_execution:true",
  "candidate_weight_mutation:true","filesystem_write:true",
  "service_action:true","funds_movement:true",
  "canonical_request_bytes:",
])assert.equal(source.includes(forbidden),false,forbidden);

console.log("VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_ENVELOPE_V2_PROOF_GREEN");
console.log("request_marker=VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_V2");
console.log("request_version=2");
console.log("request_method=publish_claim_v2");
console.log("canonical_request_framing=sorted_json_plus_single_lf");
console.log("publish_request_sha256_exact_bytes=true");
console.log("claim_record_content_address_bound=true");
console.log("store_policy_id_bound=true");
console.log("repaired_parent_candidate_blob_bound=true");
console.log("durable_attempt_claim=false");
console.log("training_execution=false");
