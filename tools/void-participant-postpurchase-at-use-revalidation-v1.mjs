#!/usr/bin/env node
import { createHash } from "node:crypto";

import {
  importVoidParticipantPostpurchaseFinalityV1,
} from "./void-participant-postpurchase-finality-import-v1.mjs";
import {
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1,
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_AUTHORITY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_V1,
} from "./void-participant-postpurchase-production-runtime-binding-v1.mjs";

export const VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_V1 =
  "VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_V1";

export const VOID_PARTICIPANT_POSTPURCHASE_AT_USE_COUPLED_LAUNCH_ID_V1 =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";

export const VOID_PARTICIPANT_POSTPURCHASE_AT_USE_MAX_AGE_SECONDS_V1 = 600;
export const VOID_PARTICIPANT_POSTPURCHASE_AT_USE_MAX_COLLECTION_SECONDS_V1 = 30;
export const VOID_PARTICIPANT_POSTPURCHASE_AT_USE_MAX_FUTURE_SKEW_SECONDS_V1 = 30;

export const VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_AUTHORITY_V1 =
  Object.freeze({
    explicit_evidence_bytes_required:true,
    finality_reimport_required:true,
    runtime_binding_identity_recomputed:true,
    read_only_chain2050_head_rpc:true,
    injected_head_transport_required:true,
    collector_wall_clock_read:true,
    chain_head_timestamp_bound:true,
    source_only_reverification:true,
    participant_count_bound_to_one:true,
    filesystem_read:false,
    filesystem_write:false,
    credential_access:false,
    wallet_or_signer_access:false,
    private_key_access:false,
    transaction_construction:false,
    transaction_signing:false,
    transaction_submission:false,
    transaction_broadcast:false,
    authoritative_chain2050_write:false,
    token_movement:false,
    candidate_mutation:false,
    market_activation:false,
    public_presale_activation:false,
    funds_movement:false,
  });

const MAX_INPUT_BYTES=2*1024*1024;
const CHAIN_ID=2050n;
const CANONICAL_VOID_TOKEN=
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const RUNTIME_STATUS=
  "PRODUCTION_RUNTIME_FINALITY_BINDING_VERIFIED_SOURCE_PROMOTION_HOLD";
const PUBLIC_RUNTIME_STATUS=
  "INACTIVE_SUCCESSOR_PUBLIC_READ_RUNTIME_READY";
const GENESIS_BLOCK_HASH=
  "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d";
const GENESIS_STATE_ROOT=
  "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2";

const HASH=/^0x[0-9a-f]{64}$/u;
const ADDRESS=/^0x[0-9a-f]{40}$/u;
const HEX64=/^[0-9a-f]{64}$/u;
const SHA256_ID=/^sha256:[0-9a-f]{64}$/u;
const RUNTIME_BINDING_ID=/^voidpprtb1_[0-9a-f]{64}$/u;
const FINALITY_IMPORT_ID=/^voidppfri1_[0-9a-f]{64}$/u;
const FINALITY_BINDING_ID=/^voidppfrb1_[0-9a-f]{64}$/u;
const REVALIDATION_ID=/^voidppau1_[0-9a-f]{64}$/u;
const UINT=/^(0|[1-9][0-9]*)$/u;

const COLLECT_KEYS=Object.freeze([
  "runtime_binding_bytes",
  "runtime_binding_file_sha256",
  "finality_input_bytes",
  "finality_input_file_sha256",
  "head_transport",
]);
const VERIFY_KEYS=Object.freeze([
  "artifact",
  "evaluation_time_utc",
]);
const RUNTIME_BINDING_KEYS=Object.freeze([
  "marker",
  "version",
  "status",
  "runtime_binding_id",
  "finality",
  "runtime",
  "production_runtime_binding_verified",
  "participant_control_finality_evidence_imported",
  "participant_postpurchase_voidtoken_control_runtime_binding_source_ready",
  "participant_post_purchase_voidtoken_control_ready",
  "coupled_candidate_updated",
  "candidate_promotion_required",
  "market_activation_authorized",
  "public_presale_activation_authorized",
  "funds_movement_authorized",
  "authority",
]);
const FINALITY_KEYS=Object.freeze([
  "import_id",
  "binding_id",
  "source_evidence_id",
  "participant_address",
  "delivered_token_amount_atoms",
  "control_transfer_recipient",
  "control_transfer_amount_atoms",
  "observed_delivery_confirmation_count",
  "observed_control_confirmation_count",
]);
const RUNTIME_KEYS=Object.freeze([
  "public_origin",
  "chain_id",
  "execution_epoch",
  "status",
  "delivery",
  "control",
  "external_public_receipt_route_verified",
  "raw_public_rpc_used",
]);
const STATUS_KEYS=Object.freeze([
  "url",
  "artifact_sha256",
  "status",
  "chain_id",
  "execution_epoch",
  "genesis_block_hash",
  "genesis_state_root",
]);
const RECEIPT_KEYS=Object.freeze([
  "url",
  "artifact_sha256",
  "source_evidence_id",
  "transaction_hash",
  "block_number",
  "block_hash",
  "state_root",
  "receipt_status",
  "receipt_from",
  "receipt_to",
  "exact_receipt_identity_revalidated",
  "exact_block_identity_revalidated",
]);
const ARTIFACT_KEYS=Object.freeze([
  "marker",
  "version",
  "status",
  "chain_id",
  "execution_epoch",
  "pair",
  "coupled_launch_id",
  "participant_count",
  "runtime_binding_bytes_base64",
  "runtime_binding_file_sha256",
  "finality_input_bytes_base64",
  "finality_input_file_sha256",
  "runtime_binding_id",
  "finality_import_id",
  "finality_binding_id",
  "source_finality_evidence_id",
  "participant_address",
  "delivered_token_amount_atoms",
  "control_transfer_recipient",
  "control_transfer_amount_atoms",
  "delivery_transaction_hash",
  "delivery_receipt_block_number",
  "delivery_receipt_block_hash",
  "control_transaction_hash",
  "control_receipt_block_number",
  "control_receipt_block_hash",
  "observed_head_block_number",
  "observed_head_block_hash",
  "head_block_timestamp_utc",
  "current_delivery_confirmation_count",
  "current_control_confirmation_count",
  "collection_started_at_utc",
  "collection_completed_at_utc",
  "collection_duration_ms",
  "max_evidence_age_seconds",
  "valid_until_utc",
  "runtime_binding_semantically_verified",
  "finality_reimported",
  "current_block_identities_verified",
  "current_finality_verified",
  "participant_count_bound_to_one",
  "fresh_at_collection",
  "production_candidate_updated",
  "market_activation_authorized",
  "public_presale_activation_authorized",
  "funds_movement_authorized",
  "authority",
  "participant_control_evidence_id",
  "revalidation_id",
]);

function fail(code){throw new Error(code);}

function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}

function exactObject(value,keys,code){
  if(!plain(value)) fail(code);
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null) fail(code);
  const descriptors=Object.getOwnPropertyDescriptors(value);
  const actual=Reflect.ownKeys(descriptors);
  if(actual.some((key)=>typeof key!=="string")) fail(code);
  const sorted=[...actual].sort();
  const expected=[...keys].sort();
  if(sorted.length!==expected.length||sorted.some((key,i)=>key!==expected[i])){
    fail(code);
  }
  const out=Object.create(null);
  for(const key of keys){
    const descriptor=descriptors[key];
    if(!descriptor||descriptor.enumerable!==true||!Object.hasOwn(descriptor,"value")){
      fail(code);
    }
    out[key]=descriptor.value;
  }
  return Object.freeze(out);
}

function compareText(a,b){return a<b?-1:a>b?1:0;}

function canonicalJson(value){
  if(value===null) return "null";
  if(typeof value==="string") return JSON.stringify(value);
  if(typeof value==="boolean") return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value)) return String(value);
  if(Array.isArray(value)) return "["+value.map(canonicalJson).join(",")+"]";
  if(plain(value)){
    return "{"+Object.keys(value).sort(compareText).map(
      (key)=>JSON.stringify(key)+":"+canonicalJson(value[key]),
    ).join(",")+"}";
  }
  fail("PARTICIPANT_AT_USE_CANONICAL_VALUE_INVALID");
}

function sha256(bytes){
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text){
  return createHash("sha256").update(text).digest("hex");
}

function uint(value,code,{positive=false}={}){
  if(typeof value!=="string"||value.length>78||!UINT.test(value)) fail(code);
  const parsed=BigInt(value);
  if(positive&&parsed<=0n) fail(code);
  return parsed;
}

function hexQuantity(value,code){
  if(typeof value!=="string"||!/^0x(?:0|[1-9a-f][0-9a-f]*)$/iu.test(value)){
    fail(code);
  }
  return BigInt(value);
}

function normalizeHash(value,code){
  if(typeof value!=="string") fail(code);
  const out=value.toLowerCase();
  if(!HASH.test(out)) fail(code);
  return out;
}

function normalizeAddress(value,code){
  if(typeof value!=="string") fail(code);
  const out=value.toLowerCase();
  if(!ADDRESS.test(out)||out==="0x0000000000000000000000000000000000000000"){
    fail(code);
  }
  return out;
}

function canonicalUtc(value,code){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value)){
    fail(code);
  }
  const ms=Date.parse(value);
  if(!Number.isFinite(ms)||new Date(ms).toISOString()!==value.replace("Z",".000Z")){
    fail(code);
  }
  return BigInt(ms);
}

function utcFromSeconds(seconds,code){
  if(
    typeof seconds!=="bigint"||
    seconds<0n||
    seconds>BigInt(Math.floor(Number.MAX_SAFE_INTEGER/1000))
  ) fail(code);
  return new Date(Number(seconds*1000n)).toISOString().replace(".000Z","Z");
}

function utcFromMs(ms,code){
  if(!Number.isSafeInteger(ms)||ms<0) fail(code);
  return new Date(Math.floor(ms/1000)*1000).toISOString().replace(".000Z","Z");
}

function parseJsonBytes(bytes,expectedSha,label){
  if(!Buffer.isBuffer(bytes)||bytes.length<2||bytes.length>MAX_INPUT_BYTES){
    fail(label+"_bytes_invalid");
  }
  if(typeof expectedSha!=="string"||!HEX64.test(expectedSha)){
    fail(label+"_sha256_invalid");
  }
  if(sha256(bytes)!==expectedSha) fail(label+"_sha256_mismatch");
  let text;
  try{
    text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  }catch{
    fail(label+"_utf8_invalid");
  }
  let value;
  try{
    value=JSON.parse(text);
  }catch{
    fail(label+"_json_invalid");
  }
  if(!plain(value)) fail(label+"_json_not_object");
  return Object.freeze({bytes:Buffer.from(bytes),sha256:expectedSha,value});
}

function verifyRuntimeAuthority(raw){
  const keys=Object.keys(VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_AUTHORITY_V1);
  const authority=exactObject(raw,keys,"PARTICIPANT_AT_USE_RUNTIME_AUTHORITY_SHAPE_INVALID");
  if(
    canonicalJson(authority)!==
      canonicalJson(VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_AUTHORITY_V1)
  ) fail("PARTICIPANT_AT_USE_RUNTIME_AUTHORITY_MISMATCH");
}

function validateRuntimeBinding(runtimeBinding,imported){
  const binding=exactObject(
    runtimeBinding,
    RUNTIME_BINDING_KEYS,
    "PARTICIPANT_AT_USE_RUNTIME_BINDING_SHAPE_INVALID",
  );
  if(
    binding.marker!==VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_V1||
    binding.version!==1||
    binding.status!==RUNTIME_STATUS||
    typeof binding.runtime_binding_id!=="string"||
    !RUNTIME_BINDING_ID.test(binding.runtime_binding_id)||
    binding.production_runtime_binding_verified!==true||
    binding.participant_control_finality_evidence_imported!==true||
    binding.participant_postpurchase_voidtoken_control_runtime_binding_source_ready!==true||
    binding.participant_post_purchase_voidtoken_control_ready!==false||
    binding.coupled_candidate_updated!==false||
    binding.candidate_promotion_required!==true||
    binding.market_activation_authorized!==false||
    binding.public_presale_activation_authorized!==false||
    binding.funds_movement_authorized!==false
  ) fail("PARTICIPANT_AT_USE_RUNTIME_BINDING_IDENTITY_INVALID");

  const finality=exactObject(
    binding.finality,
    FINALITY_KEYS,
    "PARTICIPANT_AT_USE_RUNTIME_FINALITY_SHAPE_INVALID",
  );
  const runtime=exactObject(
    binding.runtime,
    RUNTIME_KEYS,
    "PARTICIPANT_AT_USE_RUNTIME_SHAPE_INVALID",
  );
  const status=exactObject(
    runtime.status,
    STATUS_KEYS,
    "PARTICIPANT_AT_USE_RUNTIME_STATUS_SHAPE_INVALID",
  );
  const delivery=exactObject(
    runtime.delivery,
    RECEIPT_KEYS,
    "PARTICIPANT_AT_USE_DELIVERY_SHAPE_INVALID",
  );
  const control=exactObject(
    runtime.control,
    RECEIPT_KEYS,
    "PARTICIPANT_AT_USE_CONTROL_SHAPE_INVALID",
  );

  if(
    finality.import_id!==imported.import_id||
    finality.binding_id!==imported.binding_id||
    finality.source_evidence_id!==imported.source_evidence_id||
    finality.participant_address!==imported.participant_address||
    finality.delivered_token_amount_atoms!==imported.delivered_token_amount_atoms||
    finality.control_transfer_recipient!==imported.control_transfer_recipient||
    finality.control_transfer_amount_atoms!==imported.control_transfer_amount_atoms||
    finality.observed_delivery_confirmation_count!==imported.observed_delivery_confirmation_count||
    finality.observed_control_confirmation_count!==imported.observed_control_confirmation_count
  ) fail("PARTICIPANT_AT_USE_FINALITY_REIMPORT_MISMATCH");

  if(
    typeof finality.import_id!=="string"||!FINALITY_IMPORT_ID.test(finality.import_id)||
    typeof finality.binding_id!=="string"||!FINALITY_BINDING_ID.test(finality.binding_id)||
    typeof finality.source_evidence_id!=="string"||!SHA256_ID.test(finality.source_evidence_id)||
    normalizeAddress(finality.participant_address,"PARTICIPANT_AT_USE_PARTICIPANT_INVALID")!==finality.participant_address||
    uint(finality.delivered_token_amount_atoms,"PARTICIPANT_AT_USE_DELIVERED_AMOUNT_INVALID",{positive:true})<=0n||
    normalizeAddress(finality.control_transfer_recipient,"PARTICIPANT_AT_USE_CONTROL_RECIPIENT_INVALID")!==finality.control_transfer_recipient||
    uint(finality.control_transfer_amount_atoms,"PARTICIPANT_AT_USE_CONTROL_AMOUNT_INVALID",{positive:true})<=0n||
    uint(finality.observed_delivery_confirmation_count,"PARTICIPANT_AT_USE_OBSERVED_DELIVERY_CONFIRMATIONS_INVALID",{positive:true})<=0n||
    uint(finality.observed_control_confirmation_count,"PARTICIPANT_AT_USE_OBSERVED_CONTROL_CONFIRMATIONS_INVALID",{positive:true})<=0n
  ) fail("PARTICIPANT_AT_USE_RUNTIME_FINALITY_INVALID");

  if(
    runtime.public_origin!==VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1||
    runtime.chain_id!==2050||
    runtime.execution_epoch!==2||
    runtime.external_public_receipt_route_verified!==true||
    runtime.raw_public_rpc_used!==false||
    status.status!==PUBLIC_RUNTIME_STATUS||
    status.chain_id!==2050||
    status.execution_epoch!==2||
    status.genesis_block_hash!==GENESIS_BLOCK_HASH||
    status.genesis_state_root!==GENESIS_STATE_ROOT||
    typeof status.artifact_sha256!=="string"||!HEX64.test(status.artifact_sha256)
  ) fail("PARTICIPANT_AT_USE_RUNTIME_PUBLIC_BOUNDARY_INVALID");

  for(const [label,receipt] of [["DELIVERY",delivery],["CONTROL",control]]){
    if(
      typeof receipt.artifact_sha256!=="string"||!HEX64.test(receipt.artifact_sha256)||
      typeof receipt.source_evidence_id!=="string"||!SHA256_ID.test(receipt.source_evidence_id)||
      normalizeHash(receipt.transaction_hash,"PARTICIPANT_AT_USE_"+label+"_TX_INVALID")!==receipt.transaction_hash||
      uint(receipt.block_number,"PARTICIPANT_AT_USE_"+label+"_BLOCK_INVALID",{positive:true})<=0n||
      normalizeHash(receipt.block_hash,"PARTICIPANT_AT_USE_"+label+"_BLOCK_HASH_INVALID")!==receipt.block_hash||
      normalizeHash(receipt.state_root,"PARTICIPANT_AT_USE_"+label+"_STATE_ROOT_INVALID")!==receipt.state_root||
      receipt.receipt_status!=="0x1"||
      normalizeAddress(receipt.receipt_from,"PARTICIPANT_AT_USE_"+label+"_FROM_INVALID")!==receipt.receipt_from||
      normalizeAddress(receipt.receipt_to,"PARTICIPANT_AT_USE_"+label+"_TO_INVALID")!==CANONICAL_VOID_TOKEN||
      receipt.exact_receipt_identity_revalidated!==true||
      receipt.exact_block_identity_revalidated!==true
    ) fail("PARTICIPANT_AT_USE_"+label+"_RECEIPT_INVALID");
  }

  if(
    delivery.transaction_hash!==imported.delivery_transaction_hash||
    delivery.block_number!==imported.delivery_receipt_block_number||
    delivery.block_hash!==imported.delivery_receipt_block_hash||
    delivery.receipt_from!==imported.delivery_fulfillment_wallet||
    control.transaction_hash!==imported.control_transaction_hash||
    control.block_number!==imported.control_receipt_block_number||
    control.block_hash!==imported.control_receipt_block_hash||
    control.receipt_from!==imported.participant_address||
    BigInt(control.block_number)<BigInt(delivery.block_number)
  ) fail("PARTICIPANT_AT_USE_RUNTIME_RECEIPT_CROSSLINK_INVALID");

  const identity=Object.freeze({
    finality_import_id:imported.import_id,
    finality_binding_id:imported.binding_id,
    source_finality_evidence_id:imported.source_evidence_id,
    public_origin:VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1,
    chain_id:2050,
    execution_epoch:2,
    status_artifact_sha256:status.artifact_sha256,
    delivery_artifact_sha256:delivery.artifact_sha256,
    control_artifact_sha256:control.artifact_sha256,
    delivery_source_evidence_id:delivery.source_evidence_id,
    control_source_evidence_id:control.source_evidence_id,
    delivery_transaction_hash:delivery.transaction_hash,
    delivery_receipt_block_number:delivery.block_number,
    delivery_receipt_block_hash:delivery.block_hash,
    control_transaction_hash:control.transaction_hash,
    control_receipt_block_number:control.block_number,
    control_receipt_block_hash:control.block_hash,
  });
  const expectedRuntimeBindingId=
    "voidpprtb1_"+sha256Text(canonicalJson(identity));
  if(binding.runtime_binding_id!==expectedRuntimeBindingId){
    fail("PARTICIPANT_AT_USE_RUNTIME_BINDING_ID_MISMATCH");
  }

  verifyRuntimeAuthority(binding.authority);
  return Object.freeze({binding,finality,runtime,status,delivery,control});
}

function blockSnapshot(raw,code){
  if(!plain(raw)) fail(code+"_SHAPE_INVALID");
  const number=Object.getOwnPropertyDescriptor(raw,"number");
  const hash=Object.getOwnPropertyDescriptor(raw,"hash");
  const timestamp=Object.getOwnPropertyDescriptor(raw,"timestamp");
  if(
    !number||!Object.hasOwn(number,"value")||
    !hash||!Object.hasOwn(hash,"value")||
    !timestamp||!Object.hasOwn(timestamp,"value")
  ) fail(code+"_FIELD_MISSING");
  return Object.freeze({
    number:hexQuantity(String(number.value).toLowerCase(),code+"_NUMBER_INVALID"),
    hash:normalizeHash(hash.value,code+"_HASH_INVALID"),
    timestamp:hexQuantity(String(timestamp.value).toLowerCase(),code+"_TIMESTAMP_INVALID"),
  });
}

function artifactMaterial(artifact){
  const out=Object.create(null);
  for(const key of ARTIFACT_KEYS){
    if(["participant_control_evidence_id","revalidation_id"].includes(key)) continue;
    out[key]=artifact[key];
  }
  return out;
}

function verifyAuthority(raw){
  const keys=Object.keys(VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_AUTHORITY_V1);
  const authority=exactObject(raw,keys,"PARTICIPANT_AT_USE_AUTHORITY_SHAPE_INVALID");
  if(canonicalJson(authority)!==canonicalJson(VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_AUTHORITY_V1)){
    fail("PARTICIPANT_AT_USE_AUTHORITY_MISMATCH");
  }
}

function decodeEmbedded(base64,expectedSha,label){
  if(typeof base64!=="string"||base64.length<4) fail(label+"_BASE64_INVALID");
  const bytes=Buffer.from(base64,"base64");
  if(bytes.toString("base64")!==base64) fail(label+"_BASE64_NONCANONICAL");
  return parseJsonBytes(bytes,expectedSha,label);
}

function validateArtifactSemanticInputs(artifact){
  const runtimeSource=decodeEmbedded(
    artifact.runtime_binding_bytes_base64,
    artifact.runtime_binding_file_sha256,
    "PARTICIPANT_AT_USE_RUNTIME_BINDING_FILE",
  );
  const finalitySource=decodeEmbedded(
    artifact.finality_input_bytes_base64,
    artifact.finality_input_file_sha256,
    "PARTICIPANT_AT_USE_FINALITY_INPUT_FILE",
  );
  const imported=importVoidParticipantPostpurchaseFinalityV1(finalitySource.value);
  const runtime=validateRuntimeBinding(runtimeSource.value,imported);
  return Object.freeze({runtimeSource,finalitySource,imported,runtime});
}

export async function collectVoidParticipantPostpurchaseAtUseRevalidationV1(input){
  const request=exactObject(
    input,
    COLLECT_KEYS,
    "INVALID_PARTICIPANT_POSTPURCHASE_AT_USE_COLLECTION_INPUT_SHAPE",
  );
  if(typeof request.head_transport!=="function"){
    fail("PARTICIPANT_AT_USE_HEAD_TRANSPORT_REQUIRED");
  }

  const runtimeSource=parseJsonBytes(
    request.runtime_binding_bytes,
    request.runtime_binding_file_sha256,
    "PARTICIPANT_AT_USE_RUNTIME_BINDING_FILE",
  );
  const finalitySource=parseJsonBytes(
    request.finality_input_bytes,
    request.finality_input_file_sha256,
    "PARTICIPANT_AT_USE_FINALITY_INPUT_FILE",
  );
  const imported=importVoidParticipantPostpurchaseFinalityV1(finalitySource.value);
  const runtime=validateRuntimeBinding(runtimeSource.value,imported);

  const calls=[];
  const call=async(method,params)=>{
    if(!["eth_chainId","eth_blockNumber","eth_getBlockByNumber"].includes(method)){
      fail("PARTICIPANT_AT_USE_HEAD_RPC_METHOD_FORBIDDEN");
    }
    calls.push(method);
    return await request.head_transport(Object.freeze({
      method,
      params:Object.freeze(params),
    }));
  };

  const startedMs=Date.now();
  const chainId=hexQuantity(
    String(await call("eth_chainId",[])).toLowerCase(),
    "PARTICIPANT_AT_USE_CHAIN_ID_INVALID",
  );
  if(chainId!==CHAIN_ID) fail("PARTICIPANT_AT_USE_CHAIN_ID_MISMATCH");

  const firstHeadNumber=hexQuantity(
    String(await call("eth_blockNumber",[])).toLowerCase(),
    "PARTICIPANT_AT_USE_HEAD_NUMBER_INVALID",
  );
  const headTag="0x"+firstHeadNumber.toString(16);
  const firstHead=blockSnapshot(
    await call("eth_getBlockByNumber",[headTag,false]),
    "PARTICIPANT_AT_USE_HEAD_BLOCK",
  );
  if(firstHead.number!==firstHeadNumber){
    fail("PARTICIPANT_AT_USE_HEAD_BLOCK_NUMBER_MISMATCH");
  }

  const deliveryBlockNumber=uint(
    runtime.delivery.block_number,
    "PARTICIPANT_AT_USE_DELIVERY_BLOCK_INVALID",
    {positive:true},
  );
  const controlBlockNumber=uint(
    runtime.control.block_number,
    "PARTICIPANT_AT_USE_CONTROL_BLOCK_INVALID",
    {positive:true},
  );
  if(firstHeadNumber<deliveryBlockNumber||firstHeadNumber<controlBlockNumber){
    fail("PARTICIPANT_AT_USE_HEAD_BEFORE_CONTROL_EVIDENCE");
  }

  const deliveryBlock=blockSnapshot(
    await call("eth_getBlockByNumber",["0x"+deliveryBlockNumber.toString(16),false]),
    "PARTICIPANT_AT_USE_DELIVERY_BLOCK",
  );
  const controlBlock=blockSnapshot(
    await call("eth_getBlockByNumber",["0x"+controlBlockNumber.toString(16),false]),
    "PARTICIPANT_AT_USE_CONTROL_BLOCK",
  );
  if(
    deliveryBlock.number!==deliveryBlockNumber||
    deliveryBlock.hash!==runtime.delivery.block_hash||
    controlBlock.number!==controlBlockNumber||
    controlBlock.hash!==runtime.control.block_hash
  ) fail("PARTICIPANT_AT_USE_CANONICAL_BLOCK_IDENTITY_MISMATCH");

  const secondHeadNumber=hexQuantity(
    String(await call("eth_blockNumber",[])).toLowerCase(),
    "PARTICIPANT_AT_USE_SECOND_HEAD_NUMBER_INVALID",
  );
  const secondHead=blockSnapshot(
    await call("eth_getBlockByNumber",[headTag,false]),
    "PARTICIPANT_AT_USE_SECOND_HEAD_BLOCK",
  );
  if(
    secondHeadNumber!==firstHeadNumber||
    secondHead.number!==firstHead.number||
    secondHead.hash!==firstHead.hash||
    secondHead.timestamp!==firstHead.timestamp
  ) fail("PARTICIPANT_AT_USE_HEAD_CHANGED_DURING_COLLECTION");

  const completedMs=Date.now();
  if(
    completedMs<startedMs||
    completedMs-startedMs>
      VOID_PARTICIPANT_POSTPURCHASE_AT_USE_MAX_COLLECTION_SECONDS_V1*1000
  ) fail("PARTICIPANT_AT_USE_COLLECTION_DURATION_INVALID");

  const deliveryConfirmations=
    firstHeadNumber-deliveryBlockNumber+1n;
  const controlConfirmations=
    firstHeadNumber-controlBlockNumber+1n;
  if(
    deliveryConfirmations<
      uint(runtime.finality.observed_delivery_confirmation_count,
        "PARTICIPANT_AT_USE_OBSERVED_DELIVERY_CONFIRMATIONS_INVALID",
        {positive:true})||
    controlConfirmations<
      uint(runtime.finality.observed_control_confirmation_count,
        "PARTICIPANT_AT_USE_OBSERVED_CONTROL_CONFIRMATIONS_INVALID",
        {positive:true})
  ) fail("PARTICIPANT_AT_USE_CURRENT_FINALITY_REGRESSED");

  const completedSeconds=BigInt(Math.floor(completedMs/1000));
  const maxAge=BigInt(VOID_PARTICIPANT_POSTPURCHASE_AT_USE_MAX_AGE_SECONDS_V1);
  const futureSkew=BigInt(
    VOID_PARTICIPANT_POSTPURCHASE_AT_USE_MAX_FUTURE_SKEW_SECONDS_V1,
  );
  if(firstHead.timestamp>completedSeconds+futureSkew){
    fail("PARTICIPANT_AT_USE_HEAD_TIMESTAMP_TOO_FAR_IN_FUTURE");
  }
  if(completedSeconds>firstHead.timestamp+maxAge){
    fail("PARTICIPANT_AT_USE_HEAD_TIMESTAMP_STALE_AT_COLLECTION");
  }
  const validUntil=firstHead.timestamp+maxAge;

  const material=Object.freeze({
    marker:VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_V1,
    version:1,
    status:"PARTICIPANT_CONTROL_AT_USE_REVALIDATED_FRESH",
    chain_id:2050,
    execution_epoch:2,
    pair:"WC_VOID",
    coupled_launch_id:
      VOID_PARTICIPANT_POSTPURCHASE_AT_USE_COUPLED_LAUNCH_ID_V1,
    participant_count:"1",
    runtime_binding_bytes_base64:runtimeSource.bytes.toString("base64"),
    runtime_binding_file_sha256:runtimeSource.sha256,
    finality_input_bytes_base64:finalitySource.bytes.toString("base64"),
    finality_input_file_sha256:finalitySource.sha256,
    runtime_binding_id:runtime.binding.runtime_binding_id,
    finality_import_id:imported.import_id,
    finality_binding_id:imported.binding_id,
    source_finality_evidence_id:imported.source_evidence_id,
    participant_address:imported.participant_address,
    delivered_token_amount_atoms:imported.delivered_token_amount_atoms,
    control_transfer_recipient:imported.control_transfer_recipient,
    control_transfer_amount_atoms:imported.control_transfer_amount_atoms,
    delivery_transaction_hash:runtime.delivery.transaction_hash,
    delivery_receipt_block_number:runtime.delivery.block_number,
    delivery_receipt_block_hash:runtime.delivery.block_hash,
    control_transaction_hash:runtime.control.transaction_hash,
    control_receipt_block_number:runtime.control.block_number,
    control_receipt_block_hash:runtime.control.block_hash,
    observed_head_block_number:firstHead.number.toString(),
    observed_head_block_hash:firstHead.hash,
    head_block_timestamp_utc:
      utcFromSeconds(firstHead.timestamp,"PARTICIPANT_AT_USE_HEAD_TIMESTAMP_RANGE_INVALID"),
    current_delivery_confirmation_count:deliveryConfirmations.toString(),
    current_control_confirmation_count:controlConfirmations.toString(),
    collection_started_at_utc:
      utcFromMs(startedMs,"PARTICIPANT_AT_USE_COLLECTION_START_INVALID"),
    collection_completed_at_utc:
      utcFromMs(completedMs,"PARTICIPANT_AT_USE_COLLECTION_COMPLETION_INVALID"),
    collection_duration_ms:String(completedMs-startedMs),
    max_evidence_age_seconds:String(
      VOID_PARTICIPANT_POSTPURCHASE_AT_USE_MAX_AGE_SECONDS_V1,
    ),
    valid_until_utc:
      utcFromSeconds(validUntil,"PARTICIPANT_AT_USE_VALID_UNTIL_RANGE_INVALID"),
    runtime_binding_semantically_verified:true,
    finality_reimported:true,
    current_block_identities_verified:true,
    current_finality_verified:true,
    participant_count_bound_to_one:true,
    fresh_at_collection:true,
    production_candidate_updated:false,
    market_activation_authorized:false,
    public_presale_activation_authorized:false,
    funds_movement_authorized:false,
    authority:
      VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_AUTHORITY_V1,
  });
  const digest=sha256Text(canonicalJson(material));
  return Object.freeze({
    ...material,
    participant_control_evidence_id:"sha256:"+digest,
    revalidation_id:"voidppau1_"+digest,
  });
}

export function verifyVoidParticipantPostpurchaseAtUseRevalidationV1(input){
  const request=exactObject(
    input,
    VERIFY_KEYS,
    "INVALID_PARTICIPANT_POSTPURCHASE_AT_USE_VERIFY_INPUT_SHAPE",
  );
  const artifact=exactObject(
    request.artifact,
    ARTIFACT_KEYS,
    "INVALID_PARTICIPANT_POSTPURCHASE_AT_USE_ARTIFACT_SHAPE",
  );
  if(
    artifact.marker!==VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_V1||
    artifact.version!==1||
    artifact.status!=="PARTICIPANT_CONTROL_AT_USE_REVALIDATED_FRESH"||
    artifact.chain_id!==2050||
    artifact.execution_epoch!==2||
    artifact.pair!=="WC_VOID"||
    artifact.coupled_launch_id!==
      VOID_PARTICIPANT_POSTPURCHASE_AT_USE_COUPLED_LAUNCH_ID_V1||
    artifact.participant_count!=="1"
  ) fail("PARTICIPANT_AT_USE_ARTIFACT_IDENTITY_MISMATCH");

  const semantic=validateArtifactSemanticInputs(artifact);
  const {imported,runtime}=semantic;
  if(
    artifact.runtime_binding_id!==runtime.binding.runtime_binding_id||
    artifact.finality_import_id!==imported.import_id||
    artifact.finality_binding_id!==imported.binding_id||
    artifact.source_finality_evidence_id!==imported.source_evidence_id||
    artifact.participant_address!==imported.participant_address||
    artifact.delivered_token_amount_atoms!==imported.delivered_token_amount_atoms||
    artifact.control_transfer_recipient!==imported.control_transfer_recipient||
    artifact.control_transfer_amount_atoms!==imported.control_transfer_amount_atoms||
    artifact.delivery_transaction_hash!==runtime.delivery.transaction_hash||
    artifact.delivery_receipt_block_number!==runtime.delivery.block_number||
    artifact.delivery_receipt_block_hash!==runtime.delivery.block_hash||
    artifact.control_transaction_hash!==runtime.control.transaction_hash||
    artifact.control_receipt_block_number!==runtime.control.block_number||
    artifact.control_receipt_block_hash!==runtime.control.block_hash
  ) fail("PARTICIPANT_AT_USE_ARTIFACT_SEMANTIC_BINDING_MISMATCH");

  const headNumber=uint(
    artifact.observed_head_block_number,
    "PARTICIPANT_AT_USE_ARTIFACT_HEAD_NUMBER_INVALID",
    {positive:true},
  );
  const deliveryBlock=uint(
    artifact.delivery_receipt_block_number,
    "PARTICIPANT_AT_USE_ARTIFACT_DELIVERY_BLOCK_INVALID",
    {positive:true},
  );
  const controlBlock=uint(
    artifact.control_receipt_block_number,
    "PARTICIPANT_AT_USE_ARTIFACT_CONTROL_BLOCK_INVALID",
    {positive:true},
  );
  const deliveryConfirmations=uint(
    artifact.current_delivery_confirmation_count,
    "PARTICIPANT_AT_USE_ARTIFACT_DELIVERY_CONFIRMATIONS_INVALID",
    {positive:true},
  );
  const controlConfirmations=uint(
    artifact.current_control_confirmation_count,
    "PARTICIPANT_AT_USE_ARTIFACT_CONTROL_CONFIRMATIONS_INVALID",
    {positive:true},
  );
  if(
    headNumber<deliveryBlock||
    headNumber<controlBlock||
    deliveryConfirmations!==headNumber-deliveryBlock+1n||
    controlConfirmations!==headNumber-controlBlock+1n||
    deliveryConfirmations<
      uint(runtime.finality.observed_delivery_confirmation_count,
        "PARTICIPANT_AT_USE_RUNTIME_DELIVERY_CONFIRMATIONS_INVALID",{positive:true})||
    controlConfirmations<
      uint(runtime.finality.observed_control_confirmation_count,
        "PARTICIPANT_AT_USE_RUNTIME_CONTROL_CONFIRMATIONS_INVALID",{positive:true})||
    normalizeHash(
      artifact.observed_head_block_hash,
      "PARTICIPANT_AT_USE_ARTIFACT_HEAD_HASH_INVALID",
    )!==artifact.observed_head_block_hash
  ) fail("PARTICIPANT_AT_USE_ARTIFACT_FINALITY_BINDING_INVALID");

  const started=canonicalUtc(
    artifact.collection_started_at_utc,
    "PARTICIPANT_AT_USE_COLLECTION_START_UTC_INVALID",
  );
  const completed=canonicalUtc(
    artifact.collection_completed_at_utc,
    "PARTICIPANT_AT_USE_COLLECTION_COMPLETION_UTC_INVALID",
  );
  const headTimestamp=canonicalUtc(
    artifact.head_block_timestamp_utc,
    "PARTICIPANT_AT_USE_HEAD_TIMESTAMP_UTC_INVALID",
  );
  const validUntil=canonicalUtc(
    artifact.valid_until_utc,
    "PARTICIPANT_AT_USE_VALID_UNTIL_UTC_INVALID",
  );
  const duration=uint(
    artifact.collection_duration_ms,
    "PARTICIPANT_AT_USE_COLLECTION_DURATION_MS_INVALID",
  );
  const maxAge=uint(
    artifact.max_evidence_age_seconds,
    "PARTICIPANT_AT_USE_MAX_AGE_INVALID",
    {positive:true},
  );
  if(
    maxAge!==BigInt(VOID_PARTICIPANT_POSTPURCHASE_AT_USE_MAX_AGE_SECONDS_V1)||
    completed<started||
    completed-started>
      BigInt(VOID_PARTICIPANT_POSTPURCHASE_AT_USE_MAX_COLLECTION_SECONDS_V1*1000)||
    duration>
      BigInt(VOID_PARTICIPANT_POSTPURCHASE_AT_USE_MAX_COLLECTION_SECONDS_V1*1000)||
    duration+999n<completed-started||
    duration>completed-started+999n||
    validUntil!==headTimestamp+maxAge*1000n||
    completed>validUntil||
    headTimestamp>
      completed+
      BigInt(VOID_PARTICIPANT_POSTPURCHASE_AT_USE_MAX_FUTURE_SKEW_SECONDS_V1*1000)
  ) fail("PARTICIPANT_AT_USE_ARTIFACT_FRESHNESS_BINDING_INVALID");

  for(const key of [
    "runtime_binding_semantically_verified",
    "finality_reimported",
    "current_block_identities_verified",
    "current_finality_verified",
    "participant_count_bound_to_one",
    "fresh_at_collection",
  ]){
    if(artifact[key]!==true) fail("PARTICIPANT_AT_USE_REQUIRED_VERIFICATION_MISSING");
  }
  for(const key of [
    "production_candidate_updated",
    "market_activation_authorized",
    "public_presale_activation_authorized",
    "funds_movement_authorized",
  ]){
    if(artifact[key]!==false) fail("PARTICIPANT_AT_USE_AUTHORITY_MUST_REMAIN_FALSE");
  }
  verifyAuthority(artifact.authority);

  const digest=sha256Text(canonicalJson(artifactMaterial(artifact)));
  if(
    typeof artifact.participant_control_evidence_id!=="string"||
    !SHA256_ID.test(artifact.participant_control_evidence_id)||
    artifact.participant_control_evidence_id!=="sha256:"+digest||
    typeof artifact.revalidation_id!=="string"||
    !REVALIDATION_ID.test(artifact.revalidation_id)||
    artifact.revalidation_id!=="voidppau1_"+digest
  ) fail("PARTICIPANT_AT_USE_ARTIFACT_CONTENT_ID_MISMATCH");

  const evaluation=canonicalUtc(
    request.evaluation_time_utc,
    "PARTICIPANT_AT_USE_EVALUATION_TIME_INVALID",
  );
  if(evaluation<completed||evaluation>validUntil){
    fail("PARTICIPANT_AT_USE_EVIDENCE_NOT_CURRENT");
  }

  return Object.freeze({
    ok:true,
    status:"PARTICIPANT_CONTROL_AT_USE_EVIDENCE_VERIFIED_CURRENT",
    marker:VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_V1,
    revalidation_id:artifact.revalidation_id,
    participant_control_evidence_id:artifact.participant_control_evidence_id,
    coupled_launch_id:artifact.coupled_launch_id,
    participant_count:"1",
    participant_address:artifact.participant_address,
    delivered_token_amount_atoms:artifact.delivered_token_amount_atoms,
    control_transfer_recipient:artifact.control_transfer_recipient,
    control_transfer_amount_atoms:artifact.control_transfer_amount_atoms,
    observed_head_block_number:artifact.observed_head_block_number,
    observed_head_block_hash:artifact.observed_head_block_hash,
    head_block_timestamp_utc:artifact.head_block_timestamp_utc,
    current_delivery_confirmation_count:
      artifact.current_delivery_confirmation_count,
    current_control_confirmation_count:
      artifact.current_control_confirmation_count,
    collection_completed_at_utc:artifact.collection_completed_at_utc,
    valid_until_utc:artifact.valid_until_utc,
    runtime_binding_semantically_verified:true,
    finality_reimported:true,
    current_block_identities_verified:true,
    current_finality_verified:true,
    evidence_current_at_evaluation:true,
    participant_count_bound_to_one:true,
    production_candidate_binding_allowed:false,
    market_activation_authorized:false,
    public_presale_activation_authorized:false,
    funds_movement_authorized:false,
    authority:
      VOID_PARTICIPANT_POSTPURCHASE_AT_USE_REVALIDATION_AUTHORITY_V1,
  });
}
