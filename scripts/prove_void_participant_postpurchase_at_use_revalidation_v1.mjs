#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";

import {
  VOID_PARTICIPANT_POSTPURCHASE_FINALITY_AUTHORITY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1,
} from "../tools/void-participant-postpurchase-finality-v1.mjs";
import {
  buildVoidParticipantPostpurchaseProductionRuntimeBindingV1,
} from "../tools/void-participant-postpurchase-production-runtime-binding-v1.mjs";
import {
  VOID_PARTICIPANT_POSTPURCHASE_AT_USE_COUPLED_LAUNCH_ID_V1,
  VOID_PARTICIPANT_POSTPURCHASE_AT_USE_MAX_AGE_SECONDS_V1,
  VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_AUTHORITY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_V1,
  collectVoidParticipantPostpurchaseAtUseRevalidationV1,
  verifyVoidParticipantPostpurchaseAtUseRevalidationV1,
} from "../tools/void-participant-postpurchase-at-use-revalidation-v1.mjs";

const TOKEN="0x470075b85352eb86f7d089fb9ba88945f12aad94";
const DELIVERY_HASH="0x"+"a".repeat(64);
const CONTROL_HASH="0x"+"b".repeat(64);
const DELIVERY_BLOCK_HASH="0x"+"c".repeat(64);
const CONTROL_BLOCK_HASH="0x"+"d".repeat(64);
const HEAD_BLOCK_HASH="0x"+"e".repeat(64);
const PARTICIPANT="0x1111111111111111111111111111111111111111";
const FULFILLMENT="0x2222222222222222222222222222222222222222";
const RECIPIENT="0x3333333333333333333333333333333333333333";
const DELIVERED="100000000000000000000";
const CONTROLLED="25000000000000000000";
const DELIVERY_BLOCK="100";
const CONTROL_BLOCK="110";
const PUBLIC_BASE="https://seed.nullfeed.org";
const STATUS_PATH="/public-node/economic/epoch2/read-status-v1.json";
const RECEIPT_PATH="/public-node/economic/epoch2/receipt-v1";
const RUNTIME_MARKER="VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1";
const GENESIS_BLOCK_HASH=
  "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d";
const GENESIS_STATE_ROOT=
  "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2";
const PAYLOAD_KEYS=[
  "schema","chain_id","execution_epoch","delivery_transaction_hash",
  "delivery_receipt_evidence_fingerprint_sha256","delivery_fulfillment_wallet",
  "delivered_token_amount_atoms","delivery_transfer_log_index",
  "delivery_receipt_block_number","delivery_receipt_block_hash",
  "delivery_observed_confirmation_count","delivery_current_confirmation_count",
  "transaction_hash","participant_address","void_token","transfer_recipient",
  "transfer_amount_atoms","transfer_log_index","receipt_block_number",
  "receipt_block_hash","observed_confirmation_count","required_confirmation_count",
];

function canonicalJson(value){
  if(value===null) return "null";
  if(typeof value==="string") return JSON.stringify(value);
  if(typeof value==="boolean") return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value)) return String(value);
  if(Array.isArray(value)) return "["+value.map(canonicalJson).join(",")+"]";
  if(value&&typeof value==="object"&&!Array.isArray(value)){
    return "{"+Object.keys(value).sort().map(
      (key)=>JSON.stringify(key)+":"+canonicalJson(value[key]),
    ).join(",")+"}";
  }
  throw new Error("invalid_canonical_value");
}

function sha256(value){
  return createHash("sha256").update(value).digest("hex");
}

function prettyBytes(value){
  return Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
}

function finalityEvidenceId(value){
  const payload={};
  for(const key of PAYLOAD_KEYS) payload[key]=value[key];
  return "sha256:"+sha256(Buffer.from(canonicalJson(payload),"utf8"));
}

const deliveryFingerprint=sha256(Buffer.from([
  "chain_id=2050",
  "transaction_hash="+DELIVERY_HASH,
  "receipt_block_number="+DELIVERY_BLOCK,
  "receipt_block_hash="+DELIVERY_BLOCK_HASH,
  "void_token_address="+TOKEN,
  "transfer_from="+FULFILLMENT,
  "transfer_to="+PARTICIPANT,
  "token_amount_atoms="+DELIVERED,
  "transfer_log_index=0",
].join("\n"),"utf8"));

function finalityInput(){
  const evidence={
    marker:VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1,
    schema:"void.participant-postpurchase-finality-evidence.v1",
    chain_id:2050,
    execution_epoch:2,
    delivery_transaction_hash:DELIVERY_HASH,
    delivery_receipt_evidence_fingerprint_sha256:deliveryFingerprint,
    delivery_fulfillment_wallet:FULFILLMENT,
    delivered_token_amount_atoms:DELIVERED,
    delivery_transfer_log_index:"0",
    delivery_receipt_block_number:DELIVERY_BLOCK,
    delivery_receipt_block_hash:DELIVERY_BLOCK_HASH,
    delivery_observed_confirmation_count:"6",
    delivery_current_confirmation_count:"21",
    transaction_hash:CONTROL_HASH,
    participant_address:PARTICIPANT,
    void_token:TOKEN,
    transfer_recipient:RECIPIENT,
    transfer_amount_atoms:CONTROLLED,
    transfer_log_index:"0",
    receipt_block_number:CONTROL_BLOCK,
    receipt_block_hash:CONTROL_BLOCK_HASH,
    observed_confirmation_count:"11",
    required_confirmation_count:"3",
    evidence_id:"sha256:"+"0".repeat(64),
    rpc_methods_used:[
      "eth_chainId","eth_getTransactionReceipt","eth_getTransactionReceipt",
      "eth_blockNumber","eth_getTransactionReceipt","eth_getTransactionReceipt",
    ],
    exact_delivery_receipt_binding_verified:true,
    stable_delivery_receipt_revalidation_verified:true,
    delivery_to_control_participant_binding_verified:true,
    exact_submission_receipt_binding_verified:true,
    exact_voidtoken_transfer_finality_verified:true,
    stable_receipt_revalidation_verified:true,
    participant_postpurchase_voidtoken_control_finality_source_ready:true,
    runtime_or_launch_evidence:false,
    runtime_route_active:false,
    public_submission_open:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    authoritative_chain2050_write_performed:false,
    token_movement_performed_by_this_verifier:false,
    funds_movement_performed_by_this_verifier:false,
    authority:structuredClone(
      VOID_PARTICIPANT_POSTPURCHASE_FINALITY_AUTHORITY_V1,
    ),
  };
  evidence.evidence_id=finalityEvidenceId(evidence);
  return {
    expected:{
      delivery_transaction_hash:DELIVERY_HASH,
      delivery_receipt_evidence_fingerprint_sha256:deliveryFingerprint,
      participant_address:PARTICIPANT,
      delivered_token_amount_atoms:DELIVERED,
      control_transaction_hash:CONTROL_HASH,
      control_transfer_recipient:RECIPIENT,
      control_transfer_amount_atoms:CONTROLLED,
      control_receipt_block_number:CONTROL_BLOCK,
      control_receipt_block_hash:CONTROL_BLOCK_HASH,
      control_transfer_log_index:"0",
      minimum_delivery_confirmation_count:"12",
      minimum_control_confirmation_count:"6",
    },
    evidence,
  };
}

function runtimeBoundary(){
  return {
    production_successor_rpc_endpoint_selected:true,
    exact_production_genesis_read_replica:true,
    p2p_enabled:false,
    discovery_enabled:false,
    raw_public_rpc_allowed:false,
    transaction_construction:false,
    transaction_signing:false,
    transaction_submission:false,
    transaction_broadcast:false,
    authoritative_chain2050_write:false,
    wallet_access:false,
    private_key_access:false,
    credential_content_access:false,
    validator_mutation:false,
    token_movement:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation_authorized:false,
  };
}

function transportResult(body,pathname){
  const bytes=prettyBytes(body);
  return {
    url:new URL(pathname,PUBLIC_BASE).href,
    http_status:200,
    body,
    artifact_sha256:sha256(bytes),
  };
}

function statusResult(){
  return transportResult({
    ok:true,
    marker:RUNTIME_MARKER,
    status:"INACTIVE_SUCCESSOR_PUBLIC_READ_RUNTIME_READY",
    chain_id:2050,
    execution_epoch:2,
    block_number:"0x0",
    block_hash:GENESIS_BLOCK_HASH,
    state_root:GENESIS_STATE_ROOT,
    query_kinds:["balance","code","receipt"],
    balance_code_block_fixed_to_genesis:true,
    live_receipt_lookup_transport_verified:true,
    successful_receipt_semantics_source_proven:true,
    live_balance_receipt_code_gateway_ready:true,
    runtime_route_active:true,
    public_gateway_active:false,
    ...runtimeBoundary(),
  },STATUS_PATH);
}

function receiptResult({transactionHash,blockNumberHex,blockHash,stateRoot,from}){
  const core={
    query_kind:"receipt",
    chain_id:2050,
    execution_epoch:2,
    block_number:blockNumberHex,
    block_hash:blockHash,
    state_root:stateRoot,
    transaction_hash:transactionHash,
    receipt_status:"0x1",
    receipt_from:from,
    receipt_to:TOKEN,
  };
  return transportResult({
    ok:true,
    marker:RUNTIME_MARKER,
    status:"LIVE_SUCCESSOR_RECEIPT_VERIFIED",
    receipt_found:true,
    source_evidence_id:"sha256:"+sha256(Buffer.from(canonicalJson(core),"utf8")),
    transaction_hash:transactionHash,
    block_number:blockNumberHex,
    block_hash:blockHash,
    state_root:stateRoot,
    receipt_status:"0x1",
    receipt_from:from,
    receipt_to:TOKEN,
    exact_receipt_identity_revalidated:true,
    exact_block_identity_revalidated:true,
    live_receipt_lookup_transport_verified:true,
    successful_receipt_semantics_source_proven:true,
    live_balance_receipt_code_gateway_ready:true,
    runtime_route_active:true,
    public_gateway_active:false,
    ...runtimeBoundary(),
  },RECEIPT_PATH+"?tx="+transactionHash);
}

function runtimeBinding(){
  return buildVoidParticipantPostpurchaseProductionRuntimeBindingV1({
    finalityInput:finalityInput(),
    statusResult:statusResult(),
    deliveryReceiptResult:receiptResult({
      transactionHash:DELIVERY_HASH,
      blockNumberHex:"0x64",
      blockHash:DELIVERY_BLOCK_HASH,
      stateRoot:"0x"+"1".repeat(64),
      from:FULFILLMENT,
    }),
    controlReceiptResult:receiptResult({
      transactionHash:CONTROL_HASH,
      blockNumberHex:"0x6e",
      blockHash:CONTROL_BLOCK_HASH,
      stateRoot:"0x"+"2".repeat(64),
      from:PARTICIPANT,
    }),
  });
}

function hex(value){return "0x"+BigInt(value).toString(16);}

function headTransportFor({
  head=120n,
  headHash=HEAD_BLOCK_HASH,
  headTimestamp=BigInt(Math.floor(Date.now()/1000)-5),
  secondHead=head,
  secondHeadHash=headHash,
  secondHeadTimestamp=headTimestamp,
  deliveryHash=DELIVERY_BLOCK_HASH,
  controlHash=CONTROL_BLOCK_HASH,
}={}){
  let headNumberReads=0;
  let headBlockReads=0;
  const calls=[];
  const transport=async({method,params})=>{
    calls.push({method,params});
    if(method==="eth_chainId") return "0x802";
    if(method==="eth_blockNumber"){
      return hex(headNumberReads++===0?head:secondHead);
    }
    if(method==="eth_getBlockByNumber"){
      const requested=String(params?.[0]||"").toLowerCase();
      if(requested===hex(100n)) return {
        number:hex(100n),hash:deliveryHash,timestamp:hex(headTimestamp-100n),
      };
      if(requested===hex(110n)) return {
        number:hex(110n),hash:controlHash,timestamp:hex(headTimestamp-50n),
      };
      const second=headBlockReads++>0;
      return {
        number:hex(second?secondHead:head),
        hash:second?secondHeadHash:headHash,
        timestamp:hex(second?secondHeadTimestamp:headTimestamp),
      };
    }
    throw new Error("unexpected_method:"+method);
  };
  return {calls,transport};
}

function sourceBytes(){
  const finality=finalityInput();
  const binding=runtimeBinding();
  return {
    finality,
    binding,
    finalityBytes:prettyBytes(finality),
    bindingBytes:prettyBytes(binding),
  };
}

async function collect(options={}){
  const source=sourceBytes();
  const head=headTransportFor(options);
  const artifact=
    await collectVoidParticipantPostpurchaseAtUseRevalidationV1({
      runtime_binding_bytes:source.bindingBytes,
      runtime_binding_file_sha256:sha256(source.bindingBytes),
      finality_input_bytes:source.finalityBytes,
      finality_input_file_sha256:sha256(source.finalityBytes),
      head_transport:head.transport,
    });
  return {artifact,headCalls:head.calls,source};
}

async function rejectsCollect(options,code){
  let thrown=null;
  try{await collect(options);}catch(error){thrown=error;}
  assert(thrown,"expected rejection: "+code);
  assert.equal(thrown.message,code);
}

assert.equal(
  VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_V1,
  "VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_V1",
);
assert.equal(
  VOID_PARTICIPANT_POSTPURCHASE_AT_USE_COUPLED_LAUNCH_ID_V1,
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d",
);
assert.equal(VOID_PARTICIPANT_POSTPURCHASE_AT_USE_MAX_AGE_SECONDS_V1,600);

const {artifact,headCalls}=await collect();
assert.equal(artifact.status,"PARTICIPANT_CONTROL_AT_USE_REVALIDATED_FRESH");
assert.equal(artifact.chain_id,2050);
assert.equal(artifact.execution_epoch,2);
assert.equal(artifact.pair,"WC_VOID");
assert.equal(artifact.participant_count,"1");
assert.equal(artifact.participant_address,PARTICIPANT);
assert.equal(artifact.delivered_token_amount_atoms,DELIVERED);
assert.equal(artifact.control_transfer_recipient,RECIPIENT);
assert.equal(artifact.control_transfer_amount_atoms,CONTROLLED);
assert.equal(artifact.delivery_transaction_hash,DELIVERY_HASH);
assert.equal(artifact.control_transaction_hash,CONTROL_HASH);
assert.equal(artifact.delivery_receipt_block_hash,DELIVERY_BLOCK_HASH);
assert.equal(artifact.control_receipt_block_hash,CONTROL_BLOCK_HASH);
assert.equal(artifact.observed_head_block_number,"120");
assert.equal(artifact.observed_head_block_hash,HEAD_BLOCK_HASH);
assert.equal(artifact.current_delivery_confirmation_count,"21");
assert.equal(artifact.current_control_confirmation_count,"11");
assert.equal(artifact.runtime_binding_semantically_verified,true);
assert.equal(artifact.finality_reimported,true);
assert.equal(artifact.current_block_identities_verified,true);
assert.equal(artifact.current_finality_verified,true);
assert.equal(artifact.participant_count_bound_to_one,true);
assert.equal(artifact.fresh_at_collection,true);
assert.match(artifact.participant_control_evidence_id,/^sha256:[0-9a-f]{64}$/u);
assert.match(artifact.revalidation_id,/^voidppau1_[0-9a-f]{64}$/u);
assert.equal(artifact.production_candidate_updated,false);
assert.equal(artifact.market_activation_authorized,false);
assert.equal(artifact.public_presale_activation_authorized,false);
assert.equal(artifact.funds_movement_authorized,false);
assert.deepEqual(
  headCalls.map((row)=>row.method),
  [
    "eth_chainId",
    "eth_blockNumber",
    "eth_getBlockByNumber",
    "eth_getBlockByNumber",
    "eth_getBlockByNumber",
    "eth_blockNumber",
    "eth_getBlockByNumber",
  ],
);

const verified=verifyVoidParticipantPostpurchaseAtUseRevalidationV1({
  artifact,
  evaluation_time_utc:artifact.collection_completed_at_utc,
});
assert.equal(verified.ok,true);
assert.equal(
  verified.status,
  "PARTICIPANT_CONTROL_AT_USE_EVIDENCE_VERIFIED_CURRENT",
);
assert.equal(verified.participant_control_evidence_id,artifact.participant_control_evidence_id);
assert.equal(verified.participant_count,"1");
assert.equal(verified.evidence_current_at_evaluation,true);
assert.equal(verified.production_candidate_binding_allowed,false);

await rejectsCollect(
  {
    headTimestamp:
      BigInt(Math.floor(Date.now()/1000))
      -BigInt(VOID_PARTICIPANT_POSTPURCHASE_AT_USE_MAX_AGE_SECONDS_V1)-2n,
  },
  "PARTICIPANT_AT_USE_HEAD_TIMESTAMP_STALE_AT_COLLECTION",
);
await rejectsCollect(
  {headTimestamp:BigInt(Math.floor(Date.now()/1000))+60n},
  "PARTICIPANT_AT_USE_HEAD_TIMESTAMP_TOO_FAR_IN_FUTURE",
);
await rejectsCollect(
  {secondHead:121n},
  "PARTICIPANT_AT_USE_HEAD_CHANGED_DURING_COLLECTION",
);
await rejectsCollect(
  {deliveryHash:"0x"+"9".repeat(64)},
  "PARTICIPANT_AT_USE_CANONICAL_BLOCK_IDENTITY_MISMATCH",
);
await rejectsCollect(
  {head:115n,secondHead:115n},
  "PARTICIPANT_AT_USE_CURRENT_FINALITY_REGRESSED",
);

{
  const source=sourceBytes();
  const head=headTransportFor();
  await assert.rejects(
    ()=>collectVoidParticipantPostpurchaseAtUseRevalidationV1({
      runtime_binding_bytes:source.bindingBytes,
      runtime_binding_file_sha256:"0".repeat(64),
      finality_input_bytes:source.finalityBytes,
      finality_input_file_sha256:sha256(source.finalityBytes),
      head_transport:head.transport,
    }),
    /PARTICIPANT_AT_USE_RUNTIME_BINDING_FILE_sha256_mismatch/u,
  );
}

{
  const source=sourceBytes();
  const bad=structuredClone(source.binding);
  bad.authority.funds_movement=true;
  const badBytes=prettyBytes(bad);
  const head=headTransportFor();
  await assert.rejects(
    ()=>collectVoidParticipantPostpurchaseAtUseRevalidationV1({
      runtime_binding_bytes:badBytes,
      runtime_binding_file_sha256:sha256(badBytes),
      finality_input_bytes:source.finalityBytes,
      finality_input_file_sha256:sha256(source.finalityBytes),
      head_transport:head.transport,
    }),
    /PARTICIPANT_AT_USE_RUNTIME_AUTHORITY_MISMATCH/u,
  );
}

{
  const bad=structuredClone(artifact);
  bad.participant_count="2";
  assert.throws(
    ()=>verifyVoidParticipantPostpurchaseAtUseRevalidationV1({
      artifact:bad,
      evaluation_time_utc:bad.collection_completed_at_utc,
    }),
    /PARTICIPANT_AT_USE_ARTIFACT_IDENTITY_MISMATCH/u,
  );
}

{
  const bad=structuredClone(artifact);
  bad.runtime_binding_id="voidpprtb1_"+"f".repeat(64);
  assert.throws(
    ()=>verifyVoidParticipantPostpurchaseAtUseRevalidationV1({
      artifact:bad,
      evaluation_time_utc:bad.collection_completed_at_utc,
    }),
    /PARTICIPANT_AT_USE_ARTIFACT_SEMANTIC_BINDING_MISMATCH/u,
  );
}

{
  const after=new Date(
    Date.parse(artifact.valid_until_utc)+1000,
  ).toISOString().replace(".000Z","Z");
  assert.throws(
    ()=>verifyVoidParticipantPostpurchaseAtUseRevalidationV1({
      artifact,
      evaluation_time_utc:after,
    }),
    /PARTICIPANT_AT_USE_EVIDENCE_NOT_CURRENT/u,
  );
}

for(const [key,value] of Object.entries(
  VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_AUTHORITY_V1,
)){
  const allowed=new Set([
    "explicit_evidence_bytes_required",
    "finality_reimport_required",
    "runtime_binding_identity_recomputed",
    "read_only_chain2050_head_rpc",
    "injected_head_transport_required",
    "collector_wall_clock_read",
    "chain_head_timestamp_bound",
    "source_only_reverification",
    "participant_count_bound_to_one",
  ]);
  assert.equal(value,allowed.has(key),key);
}

const source=fs.readFileSync(
  "tools/void-participant-postpurchase-at-use-revalidation-v1.mjs",
  "utf8",
);
for(const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "systemctl",
  "https.request(",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}
for(const required of [
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBlockByNumber",
  "Date.now()",
  "importVoidParticipantPostpurchaseFinalityV1",
  "PARTICIPANT_AT_USE_CURRENT_FINALITY_REGRESSED",
  "PARTICIPANT_AT_USE_HEAD_TIMESTAMP_STALE_AT_COLLECTION",
  "participant_count_bound_to_one:true",
]){
  assert.equal(source.includes(required),true,required);
}

console.log("VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_V1_PROOF_GREEN");
console.log("runtime_binding_exact_bytes_sha256_bound=true");
console.log("finality_input_exact_bytes_sha256_bound=true");
console.log("finality_reimported=true");
console.log("runtime_binding_id_recomputed=true");
console.log("current_delivery_control_blocks_revalidated=true");
console.log("current_confirmation_depth_recomputed=true");
console.log("stable_timestamped_chain_head_required=true");
console.log("participant_count_bound_to_one=true");
console.log("participant_control_evidence_id_ready=true");
console.log("production_candidate_binding_allowed=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
