// VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_NATIVE_BRIDGE_V2
// Source integration of fixed inherited-pipe input and retained kernel peer checks.
// This adapter preserves the core's source-only authority. Expected executable/cmdline
// custody, privileged role admission, challenge exchange and installed origin remain
// separate requirements. It does not start a listener or authenticate a pipe producer.
import {createRequire} from "node:module";
import {types} from "node:util";

import {
  prepareApollyonDurableAttemptClaimPublisherForwardV2,
} from "./apollyon-durable-attempt-claim-store-service-source-implementation-v2.mjs";
import {
  createApollyonDurableAttemptClaimStoreServiceWithLinuxTransactionV2,
} from "./apollyon-durable-attempt-claim-store-transaction-lease-v2.mjs";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_NATIVE_BRIDGE_V2 =
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_NATIVE_BRIDGE_V2";

const REQUIRE=createRequire(import.meta.url);
const APPLY=Reflect.apply;
const SET_BYTES=Uint8Array.prototype.set;
const ALLOC_BYTES=Buffer.alloc;
const PROMISE_THEN=Promise.prototype.then;
const TYPED_ARRAY=Object.getPrototypeOf(Uint8Array.prototype);
const BYTE_LENGTH=Object.getOwnPropertyDescriptor(TYPED_ARRAY,"byteLength").get;
const ARRAY_BUFFER=Object.getOwnPropertyDescriptor(TYPED_ARRAY,"buffer").get;
const CONFIG_KEYS=Object.freeze([
  "root_fd","claim_uid","claim_gid","session_binding_id","revalidate","peer_identity",
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
  "closePeerIdentity",
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
    const result=APPLY(callback,undefined,[stage,context]);
    if(types.isPromise(result)){
      // Consume a native rejection without invoking a caller-defined .then property.
      APPLY(PROMISE_THEN,result,[undefined,()=>undefined]);
      fail("apollyon_claim_store_bridge_v2_async_revalidator_forbidden");
    }
    // Capturing plain data before the native post-check prevents getters from running
    // later when the core compares its existing exact local revalidation receipt.
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
