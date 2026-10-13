import crypto from "node:crypto";
import { TextDecoder, types as utilTypes } from "node:util";

import {
  classifyBuyVoidAllocationReservationLedgerV1,
  planBuyVoidAllocationReservationV1,
} from "../../dist/economic/buy_void_allocation_reservation_ledger_v1.js";
import {
  classifyBuyVoidVerifiedAllocationReplayBindingV1,
} from "../../dist/economic/buy_void_verified_allocation_replay_binding_v1.js";
import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1,
} from "../../dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  classifyBuyVoidCustodyLaunchAuthorityObservedBytesV2,
} from "./buy_void_custody_launch_authority_v2.mjs";

export const VOID_BUY_VOID_CUSTODY_RESERVE_PLAN_V1 =
  "VOID_BUY_VOID_CUSTODY_RESERVE_PLAN_V1";

export const VOID_BUY_VOID_CUSTODY_RESERVE_PLAN_AUTHORITY_V1 =
  Object.freeze({
    source_only_planner: true,
    verified_payment_replay_classifier_reused: true,
    canonical_allocation_planner_reused: true,
    custody_launch_v2_classifier_reused: true,
    caller_green_flags_accepted: false,
    caller_launch_decision_accepted: false,
    caller_clock_accepted: false,
    descriptor_bound_reads: false,
    filesystem_read: false,
    filesystem_write: false,
    allocation_write: false,
    custody_reserve_method_enabled: false,
    custody_recover_method_enabled: false,
    service_mounted: false,
    runtime_integration: false,
    production_allocation_mutation_ready: false,
    presale_activation: false,
    funds_movement: false,
  });

const REQUEST_ID=/^buyvoid_[a-z0-9]+_[0-9a-f]{8}$/u;
const SHA256_REF=/^sha256:[0-9a-f]{64}$/u;
const HEX64=/^[0-9a-f]{64}$/u;
const MAX_JSONL_BYTES=64*1024*1024;
const MAX_ROWS=100000;
const UTF8=new TextDecoder("utf-8",{fatal:true,ignoreBOM:true});
const MICRO=1000000n;
const ECONOMICS=VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1;
const POOL_MICRO=BigInt(ECONOMICS.canonical_presale_max_void)*MICRO;
const MAX_RECEIPT_BYTES=64*1024;
const PRODUCTION_INPUT_KEYS=Object.freeze([
  "activation_receipt_bytes",
  "allocation_jsonl",
  "custody_high_water_bytes",
  "generation_journal_bytes",
  "operator_events_jsonl",
  "request_id",
  "requests_jsonl",
]);

// Capture native view operations once; caller properties are not byte authority.
const BUFFER_PROTOTYPE=Buffer.prototype;
const TYPED_ARRAY_PROTOTYPE=Object.getPrototypeOf(Uint8Array.prototype);
const VIEW_LENGTH=Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE,"length").get;
const VIEW_BUFFER=Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE,"buffer").get;
const VIEW_VALUES=TYPED_ARRAY_PROTOTYPE.values;
const VIEW_SET=TYPED_ARRAY_PROTOTYPE.set;
const ALLOC_PRIVATE=Buffer.alloc;
const APPLY=Reflect.apply;
const INPUT_BYTE_LIMITS=Object.freeze({
  requests_jsonl:MAX_JSONL_BYTES,
  operator_events_jsonl:MAX_JSONL_BYTES,
  allocation_jsonl:MAX_JSONL_BYTES,
  activation_receipt_bytes:MAX_RECEIPT_BYTES,
  generation_journal_bytes:64*1024,
  custody_high_water_bytes:16*1024,
});
const BUFFER_SHADOW_KEYS=Object.freeze([
  "length","byteLength","byteOffset","buffer","valueOf","toString","constructor",
  Symbol.iterator,Symbol.toPrimitive,
]);

function snapshotProductionInput(raw){
  try{
    // Proxy detection precedes even Array.isArray: a revoked Proxy must HOLD.
    if(!raw||typeof raw!=="object"||utilTypes.isProxy(raw)||Array.isArray(raw)||
       ![Object.prototype,null].includes(Object.getPrototypeOf(raw)))return null;
    const keys=Reflect.ownKeys(raw);
    if(keys.length!==PRODUCTION_INPUT_KEYS.length||
       keys.some(key=>typeof key!=="string")||
       keys.sort().some((key,index)=>key!==PRODUCTION_INPUT_KEYS[index]))return null;

    // Admit all six views and their actual sizes before allocating any payload.
    const admitted=[];
    for(const key of PRODUCTION_INPUT_KEYS){
      const descriptor=Object.getOwnPropertyDescriptor(raw,key);
      if(!descriptor||descriptor.enumerable!==true||
         !Object.hasOwn(descriptor,"value"))return null;
      const value=descriptor.value;
      if(key==="request_id"){
        if(typeof value!=="string")return null;
        admitted.push({key,value,length:null});
        continue;
      }
      if(utilTypes.isProxy(value)||!utilTypes.isUint8Array(value)||
         Object.getPrototypeOf(value)!==BUFFER_PROTOTYPE||
         BUFFER_SHADOW_KEYS.some(name=>Object.hasOwn(value,name)))return null;
      const backing=APPLY(VIEW_BUFFER,value,[]);
      if(utilTypes.isSharedArrayBuffer(backing))return null;
      // This native operation validates detached/out-of-bounds views without
      // consulting the caller's iterator, constructor or indexed properties.
      APPLY(VIEW_VALUES,value,[]);
      const length=APPLY(VIEW_LENGTH,value,[]);
      if(!Number.isSafeInteger(length)||length<0||length>INPUT_BYTE_LIMITS[key])return null;
      admitted.push({key,value,length});
    }
    const out=Object.create(null);
    for(const {key,value,length} of admitted){
      const copy=length===null?value:ALLOC_PRIVATE(length);
      if(length!==null)APPLY(VIEW_SET,copy,[value]);
      Object.defineProperty(out,key,{
        value:copy,enumerable:true,writable:false,configurable:false,
      });
    }
    return Object.freeze(out);
  }catch{
    // No malformed view or copy failure may escape the public HOLD contract.
    return null;
  }
}

function held(reason){
  return Object.freeze({
    ready:false,
    status:"held",
    marker:VOID_BUY_VOID_CUSTODY_RESERVE_PLAN_V1,
    version:1,
    reason,
    request_id:null,
    payment_verified_event_sha256:null,
    allocation_record_id:null,
    idempotent:false,
    next_ledger_jsonl:null,
    operation_performed:false,
    descriptor_bound_reads:false,
    filesystem_write:false,
    allocation_write:false,
    custody_reserve_method_enabled:false,
    custody_recover_method_enabled:false,
    production_allocation_mutation_ready:false,
    funds_movement:false,
    authority:VOID_BUY_VOID_CUSTODY_RESERVE_PLAN_AUTHORITY_V1,
  });
}
function fail(code){throw new Error("custody_reserve_plan_"+code);}
function sha256Ref(bytes){
  return "sha256:"+crypto.createHash("sha256").update(bytes).digest("hex");
}
function stableRef(domain,values){
  return sha256Ref(Buffer.from([domain,...values].join("\n"),"utf8"));
}
function microAmount(value,code){
  if(typeof value!=="string"&&typeof value!=="number")fail(code);
  const raw=String(value);
  if(raw.length>32)fail(code);
  const m=/^(0|[1-9][0-9]*)(?:\.([0-9]{1,6}))?$/u.exec(raw);
  if(!m)fail(code);
  const result=BigInt(m[1])*MICRO+
    BigInt((m[2]||"").padEnd(6,"0")||"0");
  if(result<1n||result>POOL_MICRO)fail(code);
  return result;
}
function strictRows(bytes,label){
  if(!Buffer.isBuffer(bytes)||bytes.length>MAX_JSONL_BYTES)fail(label+"_bytes_invalid");
  if(bytes.length===0)return [];
  let text;
  try{text=UTF8.decode(bytes);}catch{fail(label+"_utf8_invalid");}
  if(!text.endsWith("\n")||text.includes("\r")||text.charCodeAt(0)===0xfeff){
    fail(label+"_noncanonical");
  }
  const lines=text.slice(0,-1).split("\n");
  if(lines.length>MAX_ROWS||lines.some(line=>line.length===0))fail(label+"_rows_invalid");
  return lines.map((line)=>{
    let row;
    try{row=JSON.parse(line);}catch{fail(label+"_json_invalid");}
    if(!row||typeof row!=="object"||Array.isArray(row)||JSON.stringify(row)!==line){
      fail(label+"_row_noncanonical");
    }
    return Object.freeze({row,line});
  });
}
function latestRequest(rows,requestId){
  const found=rows.filter(({row})=>row.request_id===requestId);
  if(found.length<1)fail("request_missing");
  return found[found.length-1].row;
}
function verifiedEvent(rows,requestId){
  const found=rows.filter(({row})=>
    row.request_id===requestId&&row.operator_status==="payment_verified");
  if(found.length!==1)fail("verified_event_cardinality_invalid");
  return found[0].row;
}
function exactLaunchBinding(request,eventReceiptBytes,decision,nowMs){
  if(!decision||decision.ready!==true||
      decision.high_water_matches_current!==true||
      decision.high_water_advance_required!==false||
      !SHA256_REF.test(String(decision.source_composition_id||""))||
      !/^0x[0-9a-f]{64}$/u.test(String(decision.generation||""))||
      !SHA256_REF.test(String(decision.tip_sha256||""))||
      !/^voidbclive1_[0-9a-f]{64}$/u.test(String(decision.activation_receipt_id||""))||
      !SHA256_REF.test(String(decision.activation_receipt_sha256||""))){
    fail("launch_authority_not_ready");
  }
  let receipt;
  try{receipt=JSON.parse(eventReceiptBytes.toString("utf8"));}catch{
    fail("activation_receipt_json_invalid");
  }
  const launch=request?.launch_authority;
  if(!launch||typeof launch!=="object"||Array.isArray(launch))fail("request_launch_authority_missing");
  if(!Number.isSafeInteger(nowMs)||nowMs<1)fail("clock_invalid");
  if(!Number.isSafeInteger(launch.expires_at_ms)||launch.expires_at_ms<=nowMs){
    fail("request_launch_authority_expired");
  }
  const actualReceiptSha=sha256Ref(eventReceiptBytes);
  if(actualReceiptSha!==decision.activation_receipt_sha256||
      launch.marker!=="VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1"||
      launch.version!==1||
      launch.coupled_launch_id!==receipt.coupled_launch_id||
      launch.source_composition_id!==decision.source_composition_id||
      launch.source_composition_id!==receipt.source_composition_id||
      launch.activation_generation!==decision.generation||
      launch.activation_generation!==receipt.activation_generation||
      launch.generation_tip_sha256!==decision.tip_sha256||
      launch.generation_tip_sha256!==receipt.generation_tip_sha256||
      launch.activation_receipt_id!==decision.activation_receipt_id||
      launch.activation_receipt_id!==receipt.activation_receipt_id||
      !HEX64.test(String(launch.activation_receipt_sha256||""))||
      "sha256:"+launch.activation_receipt_sha256!==actualReceiptSha||
      launch.expires_at_ms!==receipt.expires_at_ms){
    fail("request_launch_authority_mismatch");
  }
  return launch;
}
function planCore({
  request_id,
  requests_jsonl,
  operator_events_jsonl,
  allocation_jsonl,
  activation_receipt_bytes,
  launch_authority_decision,
  now_ms,
}){
  try{
    if(typeof request_id!=="string"||!REQUEST_ID.test(request_id))fail("request_id_invalid");
    if(!Buffer.isBuffer(requests_jsonl)||!Buffer.isBuffer(operator_events_jsonl)||
       !Buffer.isBuffer(allocation_jsonl)||!Buffer.isBuffer(activation_receipt_bytes)){
      fail("observed_bytes_invalid");
    }
    if(activation_receipt_bytes.length<1||
       activation_receipt_bytes.length>MAX_RECEIPT_BYTES){
      fail("activation_receipt_size_invalid");
    }
    const replay=classifyBuyVoidVerifiedAllocationReplayBindingV1({
      request_id,
      requests_jsonl:Buffer.from(requests_jsonl),
      operator_events_jsonl:Buffer.from(operator_events_jsonl),
      allocation_jsonl:Buffer.from(allocation_jsonl),
    });
    const replayMissing=
      replay.status==="verified_allocation_missing"&&
      replay.reason==="verified_allocation_requires_protected_recovery";
    const replayPresent=replay.ok===true&&replay.status==="allocation_present";
    if(!replayMissing&&!replayPresent){
      fail("verified_payment_replay_"+String(replay.reason||"held"));
    }
    if(replay.request_id!==request_id||
       !SHA256_REF.test(String(replay.payment_verified_event_sha256||""))||
       typeof replay.canonical_payment_identity!=="string"){
      fail("verified_payment_replay_identity_invalid");
    }

    const requests=strictRows(requests_jsonl,"requests");
    const operators=strictRows(operator_events_jsonl,"operator_events");
    const request=latestRequest(requests,request_id);
    const event=verifiedEvent(operators,request_id);
    const launch=exactLaunchBinding(
      request,activation_receipt_bytes,launch_authority_decision,now_ms,
    );

    const quoteMicro=microAmount(request.quoted_void,"quote_void_invalid");
    const expectedUnallocated=replayPresent?0n:quoteMicro;
    let unallocated;
    try{unallocated=BigInt(String(replay.unallocated_verified_void_micro));}
    catch{fail("unallocated_verified_invalid");}
    if(unallocated!==expectedUnallocated){
      fail("prior_verified_allocation_gap");
    }

    const allocation=classifyBuyVoidAllocationReservationLedgerV1(allocation_jsonl);
    if(allocation.ok===false)fail("allocation_ledger_"+allocation.reason);
    const lastCreated=allocation.records.length
      ? allocation.records[allocation.records.length-1].created_at_ms
      :0;
    const markedAt=Number(event.marked_at_ms);
    if(!Number.isSafeInteger(markedAt)||markedAt<1)fail("verified_event_time_invalid");
    const createdAt=Math.max(lastCreated,markedAt,now_ms);

    const verifier=event.payment_verifier;
    if(!verifier||typeof verifier!=="object"||Array.isArray(verifier)){
      fail("verified_event_verifier_missing");
    }
    const logIndex=String(verifier.log_index??"").trim();
    const eventSha=String(replay.payment_verified_event_sha256);
    const verifierRef=sha256Ref(Buffer.from(JSON.stringify(verifier),"utf8"));
    const requestChain=String(request.source_chain||"").trim().toLowerCase();
    const requestTx=String(request.tx_hash||"").trim().toLowerCase();
    const duplicateRef=stableRef(
      "VOID_BUY_VOID_ALLOCATION_DUPLICATE_GUARD_BINDING_V1",
      [request_id,eventSha,requestChain,requestTx,logIndex],
    );
    const inventoryRef=stableRef(
      "VOID_BUY_VOID_ALLOCATION_CAPACITY_GUARD_BINDING_V1",
      [POOL_MICRO.toString(),quoteMicro.toString(),eventSha],
    );

    const plan=planBuyVoidAllocationReservationV1({
      ledger_jsonl:allocation_jsonl,
      request_id,
      source_chain:request.source_chain,
      payment_transaction_hash:request.tx_hash,
      payment_log_index:logIndex,
      launch_authority:launch,
      buyer_delivery_wallet:request.delivery_address,
      quote_void_amount:request.quoted_void,
      quote_usdc_amount:request.usdc_amount,
      pool_void_total:ECONOMICS.canonical_presale_max_void,
      verified_payment_receipt_ref:verifierRef,
      payment_verified_event_sha256:eventSha,
      duplicate_payment_guard_result:duplicateRef,
      inventory_allocation_guard_result:inventoryRef,
      operator_activation_record_ref:"sha256:"+launch.activation_receipt_sha256,
      created_at_ms:createdAt,
      verified_payment_gate_green:true,
      duplicate_payment_guard_green:true,
      inventory_allocation_guard_green:true,
      operator_activation_record_green:true,
    });
    if(plan.ok===false)fail("allocation_plan_"+plan.reason);

    return Object.freeze({
      ready:true,
      status:plan.status,
      marker:VOID_BUY_VOID_CUSTODY_RESERVE_PLAN_V1,
      version:1,
      reason:null,
      request_id,
      canonical_payment_identity:replay.canonical_payment_identity,
      payment_verified_event_sha256:eventSha,
      allocation_record_id:plan.record.record_id,
      idempotent:plan.idempotent,
      next_ledger_jsonl:plan.next_ledger_jsonl,
      operation_performed:false,
      descriptor_bound_reads:false,
      filesystem_write:false,
      allocation_write:false,
      custody_reserve_method_enabled:false,
      custody_recover_method_enabled:false,
      production_allocation_mutation_ready:false,
      funds_movement:false,
      authority:VOID_BUY_VOID_CUSTODY_RESERVE_PLAN_AUTHORITY_V1,
    });
  }catch(error){
    const raw=error instanceof Error?error.message:"custody_reserve_plan_held";
    return held(raw.startsWith("custody_reserve_plan_")?
      raw.slice("custody_reserve_plan_".length):"held");
  }
}

export function planBuyVoidCustodyReserveFromObservedBytesV1(input={}){
  const observed=snapshotProductionInput(input);
  if(!observed)return held("input_not_plain_data");
  const launch=classifyBuyVoidCustodyLaunchAuthorityObservedBytesV2({
    generation_journal_bytes:observed.generation_journal_bytes,
    activation_receipt_bytes:observed.activation_receipt_bytes,
    custody_high_water_bytes:observed.custody_high_water_bytes,
  });
  return planCore({
    request_id:observed.request_id,
    requests_jsonl:observed.requests_jsonl,
    operator_events_jsonl:observed.operator_events_jsonl,
    allocation_jsonl:observed.allocation_jsonl,
    activation_receipt_bytes:observed.activation_receipt_bytes,
    launch_authority_decision:launch,
    now_ms:Date.now(),
  });
}

export function testOnlyPlanBuyVoidCustodyReserveV1(input={}){
  return planCore(input);
}
