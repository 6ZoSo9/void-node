// VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_NATIVE_BRIDGE_V2
// Source integration of fixed inherited-pipe input and retained kernel peer checks.
// This adapter preserves the core's source-only authority. Expected executable/cmdline
// custody, privileged role admission and installed origin remain separate requirements.
// The one-use paired source session adds socket framing and the live challenge exchange.
// It does not start a listener or authenticate a pipe producer.
import {createRequire} from "node:module";
import {types} from "node:util";
import {createHash} from "node:crypto";

import {
  prepareApollyonDurableAttemptClaimPublisherForwardV2,
} from "./apollyon-durable-attempt-claim-store-service-source-implementation-v2.mjs";
import {
  createApollyonDurableAttemptClaimStoreServiceWithLinuxTransactionV2,
} from "./apollyon-durable-attempt-claim-store-transaction-lease-v2.mjs";
import {
  qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1,
} from "./apollyon-durable-attempt-claim-authorization-slot-v1.mjs";
import {
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_RECORD_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SUCCESS_RESPONSE_KEYS_V2,
  qualifyApollyonDurableAttemptClaimSuccessResponseShapeV2,
} from "./apollyon-durable-attempt-claim-store-contract-v2.mjs";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_NATIVE_BRIDGE_V2 =
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_NATIVE_BRIDGE_V2";
export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_NATIVE_SESSION_V2 =
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_NATIVE_SESSION_V2";

const REQUIRE=createRequire(import.meta.url);
const APPLY=Reflect.apply;
const SET_BYTES=Uint8Array.prototype.set;
const ALLOC_BYTES=Buffer.alloc;
const FROM_BYTES=Buffer.from;
const JSON_STRINGIFY=JSON.stringify;
const PROMISE_THEN=Promise.prototype.then;
const TYPED_ARRAY=Object.getPrototypeOf(Uint8Array.prototype);
const BYTE_LENGTH=Object.getOwnPropertyDescriptor(TYPED_ARRAY,"byteLength").get;
const ARRAY_BUFFER=Object.getOwnPropertyDescriptor(TYPED_ARRAY,"buffer").get;
const CONFIG_KEYS=Object.freeze([
  "root_fd","claim_uid","claim_gid","session_binding_id","revalidate","peer_identity",
]);
const SESSION_CONFIG_KEYS=Object.freeze([
  "root_fd","claim_uid","claim_gid","session_binding_id","revalidate",
  "control_peer_identity","publisher_peer_identity",
]);
const PEER_KEYS=Object.freeze([
  "socket_fd","expected_ppid","expected_uid","expected_gid",
  "expected_supplementary_gids","expected_executable_fd","expected_cmdline_bytes",
]);
const RECEIPT_KEYS=Object.freeze([
  "marker","version","stage","session_binding_id","publish_request_sha256",
  "store_generation_record_id","store_generation_id","authorization_slot_id",
  "authorization_slot_record_id","claim_record_id","local_revalidation_passed",
  "source_contract_only","host_proven",
]);
const NATIVE_METHODS=Object.freeze([
  "readInheritedPublisherRequest","openPeerIdentity","revalidatePeerIdentity",
  "closePeerIdentity","revalidatePeerPair","readPublisherPeerRequest",
  "exchangePeerChallenge","sendPublisherPeerResponse",
]);
let binding;

function bridgeError(code,cause){
  const error=new Error(code,arguments.length===2?{cause}:undefined);
  error.code=code;
  return error;
}
function fail(code){throw bridgeError(code);}
function exactDataInput(input,keys,code){
  if(!input||typeof input!=="object"||types.isProxy(input)||Array.isArray(input))fail(code);
  const proto=Object.getPrototypeOf(input);
  if(proto!==Object.prototype&&proto!==null)fail(code);
  const descriptors=Object.getOwnPropertyDescriptors(input);
  if(Reflect.ownKeys(descriptors).length!==keys.length)fail(code);
  const snapshot=Object.create(null);
  for(const key of keys){
    if(!Object.hasOwn(descriptors,key))fail(code);
    const descriptor=descriptors[key];
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value"))fail(code);
    snapshot[key]=descriptor.value;
  }
  return Object.freeze(snapshot);
}
function nativeBinding(){
  if(binding)return binding;
  // The runtime has one fixed build location, with no caller-selected module or fallback.
  // Source tests compile into this location inside their disposable snapshot only.
  const loaded=REQUIRE("../build/Release/apollyon_claim_store_native_bridge_v2.node");
  const descriptors=Object.getOwnPropertyDescriptors(loaded);
  if(Reflect.ownKeys(descriptors).length!==NATIVE_METHODS.length){
    fail("apollyon_claim_store_bridge_v2_native_exports_invalid");
  }
  const captured={};
  for(const name of NATIVE_METHODS){
    if(!Object.hasOwn(descriptors,name)){
      fail("apollyon_claim_store_bridge_v2_native_exports_invalid");
    }
    const descriptor=descriptors[name];
    if(!descriptor||!Object.hasOwn(descriptor,"value")||
       typeof descriptor.value!=="function"||types.isProxy(descriptor.value)){
      fail("apollyon_claim_store_bridge_v2_native_exports_invalid");
    }
    captured[name]=descriptor.value;
  }
  binding=Object.freeze(captured);
  return binding;
}
function integer(value,min,max,code){
  if(!Number.isSafeInteger(value)||value<min||value>max)fail(code);
  return value;
}
function captureGroups(input,code){
  if(types.isProxy(input)||!Array.isArray(input)||
     Object.getPrototypeOf(input)!==Array.prototype)fail(code);
  const descriptors=Object.getOwnPropertyDescriptors(input);
  const length=integer(descriptors.length?.value,0,64,code);
  if(Reflect.ownKeys(descriptors).length!==length+1)fail(code);
  const copy=[];
  for(let index=0;index<length;index+=1){
    if(!Object.hasOwn(descriptors,String(index)))fail(code);
    const descriptor=descriptors[String(index)];
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value"))fail(code);
    const gid=integer(descriptor.value,0,65533,code);
    if(copy.includes(gid))fail(code);
    copy.push(gid);
  }
  return Object.freeze(copy);
}
function captureCmdline(input,code){
  if(types.isProxy(input)||!Buffer.isBuffer(input))fail(code);
  if(types.isSharedArrayBuffer(APPLY(ARRAY_BUFFER,input,[])))fail(code);
  const length=integer(APPLY(BYTE_LENGTH,input,[]),2,65536,code);
  const copy=ALLOC_BYTES(length);
  APPLY(SET_BYTES,copy,[input,0]);
  if(copy[length-1]!==0)fail(code);
  return copy;
}
function capturePeer(input){
  const code="apollyon_claim_store_bridge_v2_peer_config_invalid";
  const peer=exactDataInput(input,PEER_KEYS,code);
  return Object.freeze({
    socket_fd:integer(peer.socket_fd,0,2147483647,code),
    expected_ppid:integer(peer.expected_ppid,1,2147483647,code),
    expected_uid:integer(peer.expected_uid,0,65533,code),
    expected_gid:integer(peer.expected_gid,0,65533,code),
    expected_supplementary_gids:captureGroups(peer.expected_supplementary_gids,code),
    expected_executable_fd:integer(peer.expected_executable_fd,0,2147483647,code),
    expected_cmdline_bytes:captureCmdline(peer.expected_cmdline_bytes,code),
  });
}

function captureLocalRevalidation(callback,stage,context){
  const result=APPLY(callback,undefined,[stage,context]);
  if(types.isPromise(result)){
    // Observe native rejection without reading a caller-owned .then property.
    APPLY(PROMISE_THEN,result,[undefined,()=>undefined]);
    fail("apollyon_claim_store_bridge_v2_async_revalidator_forbidden");
  }
  const receipt=exactDataInput(result,RECEIPT_KEYS,
    "apollyon_claim_store_bridge_v2_revalidation_receipt_invalid");
  for(const key of RECEIPT_KEYS){
    const expectedType=key==="version"?"number":
      ["local_revalidation_passed","source_contract_only","host_proven"].includes(key)
        ?"boolean":"string";
    if(typeof receipt[key]!==expectedType){
      fail("apollyon_claim_store_bridge_v2_revalidation_receipt_invalid");
    }
  }
  return receipt;
}

export function readApollyonDurableAttemptClaimPublisherForwardFromInheritedPipeV2(){
  if(arguments.length!==0)fail("apollyon_claim_store_bridge_v2_pipe_arguments_invalid");
  // Native code owns the bounded read, EOF decision, close and process-wide one-shot.
  // The accepted parser/copy helper consumes the actual frame without reconstruction.
  return prepareApollyonDurableAttemptClaimPublisherForwardV2(
    nativeBinding().readInheritedPublisherRequest(),
  );
}

export function createApollyonDurableAttemptClaimStoreServiceWithNativePeerV2(config){
  if(arguments.length!==1)fail("apollyon_claim_store_bridge_v2_config_invalid");
  const cfg=exactDataInput(config,CONFIG_KEYS,"apollyon_claim_store_bridge_v2_config_invalid");
  const peer=capturePeer(cfg.peer_identity);
  const callback=cfg.revalidate;
  if(typeof callback!=="function"||types.isProxy(callback)||
     types.isAsyncFunction(callback)||types.isGeneratorFunction(callback)){
    fail("apollyon_claim_store_bridge_v2_revalidator_invalid");
  }
  let native,handle;
  let active=false;
  let closed=false;

  function revalidate(stage,context){
    native.revalidatePeerIdentity(handle);
    // Capturing plain data before the native post-check prevents getters from running
    // later when the core compares its existing exact local revalidation receipt.
    const receipt=captureLocalRevalidation(callback,stage,context);
    native.revalidatePeerIdentity(handle);
    return receipt;
  }
  const core=createApollyonDurableAttemptClaimStoreServiceWithLinuxTransactionV2({
    root_fd:cfg.root_fd,
    claim_uid:cfg.claim_uid,
    claim_gid:cfg.claim_gid,
    session_binding_id:cfg.session_binding_id,
    revalidate,
  });
  native=nativeBinding();
  handle=native.openPeerIdentity(
    peer.socket_fd,peer.expected_ppid,peer.expected_uid,peer.expected_gid,
    peer.expected_supplementary_gids,peer.expected_executable_fd,peer.expected_cmdline_bytes,
  );

  function run(operation,input,argumentCount,mayMutate){
    if(active)fail("apollyon_claim_store_bridge_v2_reentry");
    if(closed)fail("apollyon_claim_store_bridge_v2_session_closed");
    active=true;
    let enteredCore=false;
    try{
      if(argumentCount!==1)fail("apollyon_claim_store_bridge_v2_operation_arguments_invalid");
      native.revalidatePeerIdentity(handle);
      enteredCore=true;
      const result=operation(input);
      // The original pidfd/socket/executable remain owned through all core descriptor
      // cleanup and Linux lease release; a late native failure cannot return success.
      native.revalidatePeerIdentity(handle);
      return result;
    }catch(primaryError){
      closed=true;
      const cleanupErrors=[];
      try{native.closePeerIdentity(handle);}
      catch(cause){
        cleanupErrors.push(Object.freeze({role:"native_peer_session",cause}));
      }
      const error=bridgeError("apollyon_claim_store_bridge_v2_operation_failed",primaryError);
      error.cleanup_errors=Object.freeze(cleanupErrors);
      error.core_store_mutation_may_have_occurred=mayMutate&&enteredCore;
      throw error;
    }finally{active=false;}
  }
  function publishClaim(input){
    return run(core.publishClaim,input,arguments.length,true);
  }
  function observeAuthorizationWinner(input){
    return run(core.observeAuthorizationWinner,input,arguments.length,false);
  }
  function close(){
    if(active)fail("apollyon_claim_store_bridge_v2_reentry");
    if(closed)fail("apollyon_claim_store_bridge_v2_session_closed");
    if(arguments.length!==0)fail("apollyon_claim_store_bridge_v2_close_arguments_invalid");
    closed=true;
    try{native.closePeerIdentity(handle);}
    catch(cause){throw bridgeError("apollyon_claim_store_bridge_v2_close_failed",cause);}
  }
  return Object.freeze({
    ...core,
    marker:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_NATIVE_BRIDGE_V2,
    status:"store_native_peer_bridge_source_ready_host_integration_unproven",
    native_peer_runtime_integration_present:true,
    protected_expected_identity_origin_proven:false,
    privileged_peer_role_admission_performed:false,
    challenge_exchange_performed:false,
    publishClaim,
    observeAuthorizationWinner,
    close,
  });
}

function capturePrimitiveRecord(input,keys,code){
  const record=exactDataInput(input,keys,code);
  for(const key of keys){
    const value=record[key];
    if(value!==null&&typeof value!=="string"&&typeof value!=="boolean"&&
       !(typeof value==="number"&&Number.isSafeInteger(value)))fail(code);
  }
  return record;
}
function primitiveRecordBytes(input,keys,code){
  const record=capturePrimitiveRecord(input,keys,code);
  const ordered=Object.create(null);
  for(const key of [...keys].sort())ordered[key]=record[key];
  // These accepted record schemas contain primitives only. Sorted own keys and
  // JSON's native primitive encoding reproduce their canonical UTF-8 + LF frame.
  // A null prototype prevents an inherited toJSON callback at the ACK boundary.
  return FROM_BYTES(JSON_STRINGIFY(Object.freeze(ordered))+"\n","utf8");
}
function openCapturedPeer(native,peer){
  return native.openPeerIdentity(
    peer.socket_fd,peer.expected_ppid,peer.expected_uid,peer.expected_gid,
    peer.expected_supplementary_gids,peer.expected_executable_fd,peer.expected_cmdline_bytes,
  );
}

export function createApollyonDurableAttemptClaimStoreServiceWithNativeSessionV2(config){
  const prefix="apollyon_claim_store_session_v2_";
  if(arguments.length!==1)fail(prefix+"config_invalid");
  const cfg=exactDataInput(config,SESSION_CONFIG_KEYS,prefix+"config_invalid");
  const control=capturePeer(cfg.control_peer_identity);
  const publisher=capturePeer(cfg.publisher_peer_identity);
  const callback=cfg.revalidate;
  if(typeof callback!=="function"||types.isProxy(callback)||
     types.isAsyncFunction(callback)||types.isGeneratorFunction(callback)){
    fail(prefix+"revalidator_invalid");
  }
  let native,controlHandle,publisherHandle;
  let active=false;
  let closed=false;
  let retainedDigest,retainedRequestSha;
  let callbackCount=0;
  let challengeCompleted=false;
  const stages=Object.freeze([
    "before_slot_publication","after_slot_before_claim","before_success_ack",
  ]);

  function closePeers(){
    const owned=[
      ["publisher_peer",publisherHandle],["control_peer",controlHandle],
    ];
    publisherHandle=undefined;
    controlHandle=undefined;
    const errors=[];
    for(const [role,handle] of owned){
      if(handle===undefined)continue;
      try{native.closePeerIdentity(handle);}
      catch(cause){errors.push(Object.freeze({role,cause}));}
    }
    return Object.freeze(errors);
  }
  function sessionFailure(code,primary,cleanupErrors,coreMayMutate,ackMayBeSent){
    const error=bridgeError(prefix+code,primary);
    error.cleanup_errors=cleanupErrors;
    error.core_store_mutation_may_have_occurred=coreMayMutate;
    // Transmitted bytes cannot be revoked by a later identity, shutdown, or close
    // failure. This is conservative from entry into the native send, not an ACK.
    error.response_delivery_may_have_occurred=ackMayBeSent;
    return Object.freeze(error);
  }
  function requireSerializationBoundary(){
    // Parent validators canonicalize plain records. Refuse a callback-installed
    // inherited serializer before handing control back to those validators.
    if(Object.getOwnPropertyDescriptor(Object.prototype,"toJSON")!==undefined){
      fail(prefix+"inherited_serializer_forbidden");
    }
  }
  function revalidate(stage,context){
    if(!active||stage!==stages[callbackCount]||
       context.publish_request_sha256!==retainedRequestSha){
      fail(prefix+"callback_order_invalid");
    }
    requireSerializationBoundary();
    native.revalidatePeerPair(controlHandle,publisherHandle);
    if(callbackCount===0){
      // The canonical core already holds the Linux lease and generation FDs.
      // This callback precedes recovery and the first store mutation.
      native.exchangePeerChallenge(controlHandle,publisherHandle,retainedDigest);
      challengeCompleted=true;
    }
    const receipt=captureLocalRevalidation(callback,stage,context);
    requireSerializationBoundary();
    native.revalidatePeerPair(controlHandle,publisherHandle);
    callbackCount+=1;
    return receipt;
  }
  const core=createApollyonDurableAttemptClaimStoreServiceWithLinuxTransactionV2({
    root_fd:cfg.root_fd,
    claim_uid:cfg.claim_uid,
    claim_gid:cfg.claim_gid,
    session_binding_id:cfg.session_binding_id,
    revalidate,
  });
  native=nativeBinding();
  try{
    // Admission is observed in this order; the caller supplied already-connected
    // descriptors, so this does not prove connection arrival or installed roles.
    controlHandle=openCapturedPeer(native,control);
    publisherHandle=openCapturedPeer(native,publisher);
    native.revalidatePeerPair(controlHandle,publisherHandle);
  }catch(primary){
    closed=true;
    throw sessionFailure("initialization_failed",primary,closePeers(),false,false);
  }

  function servePublisherRequest(input){
    if(active)fail(prefix+"reentry");
    if(closed)fail(prefix+"session_closed");
    active=true;
    closed=true;
    let enteredCore=false;
    let enteredSend=false;
    let failed=false;
    let primary,result;
    try{
      if(arguments.length!==1)fail(prefix+"operation_arguments_invalid");
      const operation=exactDataInput(input,["expected_store_generation_record"],
        prefix+"operation_input_invalid");
      const generation=capturePrimitiveRecord(operation.expected_store_generation_record,
        VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_RECORD_KEYS_V2,
        prefix+"generation_input_invalid");
      requireSerializationBoundary();
      // No caller-owned nested data is revisited after the first blocking I/O.
      const forward=prepareApollyonDurableAttemptClaimPublisherForwardV2(
        native.readPublisherPeerRequest(controlHandle,publisherHandle),
      );
      const requestBytes=forward.exact_request_bytes;
      const record=forward.request.claim_record;
      retainedRequestSha=forward.publish_request_sha256;
      retainedDigest=FROM_BYTES(retainedRequestSha,"hex");
      const claimRecordBytes=primitiveRecordBytes(record,
        VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_KEYS_V2,
        prefix+"claim_record_invalid");
      const slot=qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1({
        store_policy_id:record.store_policy_id,
        authorization_id:record.authorization_id,
        store_contract_id:record.store_contract_id,
        store_generation_id:record.store_generation_id,
        terminal_receipt_id:record.terminal_receipt_id,
        claim_record_id:record.claim_record_id,
        claim_record_sha256:createHash("sha256").update(claimRecordBytes).digest("hex"),
        publish_request_sha256:retainedRequestSha,
        attempt_limit:1,
        automatic_retry_authorized:false,
      });
      native.revalidatePeerPair(controlHandle,publisherHandle);
      enteredCore=true;
      result=core.publishClaim({
        authorization_slot_record:slot,
        expected_store_generation_record:generation,
        request_bytes:requestBytes,
      });
      if(callbackCount!==stages.length||!challengeCompleted){
        fail(prefix+"challenge_sequence_incomplete");
      }
      // Core record descriptors and the Linux lease have now closed cleanly.
      native.revalidatePeerPair(controlHandle,publisherHandle);
      const response=qualifyApollyonDurableAttemptClaimSuccessResponseShapeV2({
        claim_record:record,
        publish_request_sha256:retainedRequestSha,
        success_response:result.success_response,
      });
      const responseBytes=primitiveRecordBytes(response,
        VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SUCCESS_RESPONSE_KEYS_V2,
        prefix+"success_response_invalid");
      native.revalidatePeerPair(controlHandle,publisherHandle);
      enteredSend=true;
      native.sendPublisherPeerResponse(controlHandle,publisherHandle,responseBytes);
    }catch(error){failed=true;primary=error;}
    const cleanupErrors=closePeers();
    active=false;
    retainedDigest=undefined;
    retainedRequestSha=undefined;
    if(failed||cleanupErrors.length!==0){
      throw sessionFailure(failed?"operation_failed":"cleanup_failed",
        failed?primary:cleanupErrors[0].cause,cleanupErrors,enteredCore,enteredSend);
    }
    return Object.freeze({
      ...result,
      native_session:Object.freeze({
        marker:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_NATIVE_SESSION_V2,
        version:2,
        request_input_source:"retained_publisher_socket",
        request_digest_from_actual_bytes:true,
        direct_parent_lineage_observed:true,
        challenge_exchange_performed:true,
        response_transmission_completed:true,
        response_receipt_confirmed:false,
        native_handles_closed:true,
        protected_expected_identity_origin_proven:false,
        privileged_peer_role_admission_performed:false,
        cross_uid_host_qualification_performed:false,
      }),
    });
  }
  function close(){
    if(active)fail(prefix+"reentry");
    if(closed)fail(prefix+"session_closed");
    closed=true;
    const primary=arguments.length===0?undefined:bridgeError(prefix+"close_arguments_invalid");
    const cleanupErrors=closePeers();
    if(primary!==undefined||cleanupErrors.length!==0){
      throw sessionFailure("close_failed",primary??cleanupErrors[0].cause,
        cleanupErrors,false,false);
    }
  }
  return Object.freeze({
    marker:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_NATIVE_SESSION_V2,
    version:2,
    status:"store_native_session_source_ready_host_integration_unproven",
    root_identity:core.root_identity,
    root_identity_sha256:core.root_identity_sha256,
    root_identity_scheme:core.root_identity_scheme,
    physical_layout:core.physical_layout,
    native_peer_runtime_integration_present:true,
    native_session_transport_implementation_present:true,
    direct_parent_pairing_implemented:true,
    challenge_exchange_implementation_present:true,
    protected_expected_identity_origin_proven:false,
    privileged_peer_role_admission_performed:false,
    cross_uid_host_qualification_performed:false,
    fixed_listener_origin_proven:false,
    connection_arrival_order_proven:false,
    receiver_oob_inline_required:true,
    authority:core.authority,
    servePublisherRequest,
    close,
  });
}
