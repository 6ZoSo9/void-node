#!/usr/bin/env node
import {types} from "node:util";

export const VOID_APOLLYON_CLAIM_CONTRACT_CANONICAL_JSON_V2 =
  "VOID_APOLLYON_CLAIM_CONTRACT_CANONICAL_JSON_V2";

export const VOID_APOLLYON_CLAIM_CONTRACT_CANONICAL_JSON_AUTHORITY_V2 =
  Object.freeze({
    source_only_serializer:true,
    frozen_v1_unchanged:true,
    exact_valid_fixture_equivalence_required:true,
    post_import_tojson_poison_resistance_required:true,
    post_import_json_stringify_poison_resistance_required:true,
    proxy_and_accessor_input_rejected:true,
    trusted_module_initialization_required:true,
    trusted_module_initialization_proven:false,
    consumer_migration_performed:false,
    installed_runtime_authorized:false,
    protected_host_execution_authorized:false,
    claim_publication_authorized:false,
    training_start_authorized:false,
    training_execution_authorized:false,
    credential_access_authorized:false,
    signing_authorized:false,
    transaction_authorized:false,
    funds_movement_authorized:false,
  });

const APPLY=Reflect.apply;
const OWN_KEYS=Reflect.ownKeys;
const GET_PROTOTYPE_OF=Object.getPrototypeOf;
const GET_OWN_PROPERTY_NAMES=Object.getOwnPropertyNames;
const GET_OWN_PROPERTY_DESCRIPTOR=Object.getOwnPropertyDescriptor;
const HAS_OWN=Object.hasOwn;
const ARRAY_IS_ARRAY=Array.isArray;
const NUMBER_IS_SAFE_INTEGER=Number.isSafeInteger;
const ARRAY_SORT=Array.prototype.sort;
const NUMBER_TO_STRING=Number.prototype.toString;
const STRING_CHAR_CODE_AT=String.prototype.charCodeAt;
const OBJECT_PROTOTYPE=Object.prototype;
const ARRAY_PROTOTYPE=Array.prototype;

const MAX_DEPTH=64;
const MAX_ARRAY_ITEMS=4096;
const MAX_OBJECT_KEYS=1024;
const MAX_STRING_CODE_UNITS=1024*1024;
const MAX_SERIALIZED_CODE_UNITS=8*1024*1024;

function fail(code){
  throw new Error(code);
}

function bounded(text){
  if(typeof text!=="string"||text.length>MAX_SERIALIZED_CODE_UNITS){
    fail("apollyon_claim_canonical_v2_output_too_large");
  }
  return text;
}

function hex4(code){
  let value=APPLY(NUMBER_TO_STRING,code,[16]);
  if(value.length===1)value="000"+value;
  else if(value.length===2)value="00"+value;
  else if(value.length===3)value="0"+value;
  return "\\u"+value;
}

function quoteString(value){
  if(typeof value!=="string"||value.length>MAX_STRING_CODE_UNITS){
    fail("apollyon_claim_canonical_v2_string_invalid");
  }
  let out='"';
  for(let index=0;index<value.length;index+=1){
    const code=APPLY(STRING_CHAR_CODE_AT,value,[index]);
    if(code===0x22){out+='\\"';continue;}
    if(code===0x5c){out+='\\\\';continue;}
    if(code===0x08){out+="\\b";continue;}
    if(code===0x09){out+="\\t";continue;}
    if(code===0x0a){out+="\\n";continue;}
    if(code===0x0c){out+="\\f";continue;}
    if(code===0x0d){out+="\\r";continue;}
    if(code<0x20){out+=hex4(code);continue;}
    if(code>=0xd800&&code<=0xdbff){
      const next=index+1<value.length
        ?APPLY(STRING_CHAR_CODE_AT,value,[index+1])
        :-1;
      if(next>=0xdc00&&next<=0xdfff){
        out+=value[index]+value[index+1];
        index+=1;
      }else{
        out+=hex4(code);
      }
      continue;
    }
    if(code>=0xdc00&&code<=0xdfff){
      out+=hex4(code);
      continue;
    }
    out+=value[index];
  }
  out+='"';
  return bounded(out);
}

function exactDataDescriptor(value,key,code){
  const descriptor=GET_OWN_PROPERTY_DESCRIPTOR(value,key);
  if(
    !descriptor||
    !HAS_OWN(descriptor,"value")||
    HAS_OWN(descriptor,"get")||
    HAS_OWN(descriptor,"set")
  ){
    fail(code);
  }
  return descriptor;
}

function assertNoProxy(value,code){
  if(types.isProxy(value))fail(code);
}

function withStack(stack,value,fn){
  for(let index=0;index<stack.length;index+=1){
    if(stack[index]===value)fail("apollyon_claim_canonical_v2_cycle_invalid");
  }
  stack[stack.length]=value;
  try{return fn();}
  finally{stack.length-=1;}
}

function serializeArray(value,depth,stack){
  assertNoProxy(value,"apollyon_claim_canonical_v2_proxy_forbidden");
  if(GET_PROTOTYPE_OF(value)!==ARRAY_PROTOTYPE){
    fail("apollyon_claim_canonical_v2_array_prototype_invalid");
  }
  const lengthDescriptor=exactDataDescriptor(
    value,"length","apollyon_claim_canonical_v2_array_shape_invalid",
  );
  const length=lengthDescriptor.value;
  if(
    !NUMBER_IS_SAFE_INTEGER(length)||
    length<0||
    length>MAX_ARRAY_ITEMS
  ){
    fail("apollyon_claim_canonical_v2_array_length_invalid");
  }
  const names=GET_OWN_PROPERTY_NAMES(value);
  const own=OWN_KEYS(value);
  if(names.length!==length+1||own.length!==names.length){
    fail("apollyon_claim_canonical_v2_array_shape_invalid");
  }

  return withStack(stack,value,()=>{
    let out="[";
    for(let index=0;index<length;index+=1){
      const key=""+index;
      const descriptor=exactDataDescriptor(
        value,key,"apollyon_claim_canonical_v2_array_shape_invalid",
      );
      if(descriptor.enumerable!==true){
        fail("apollyon_claim_canonical_v2_array_shape_invalid");
      }
      if(index!==0)out+=",";
      out+=serialize(descriptor.value,depth+1,stack);
      bounded(out);
    }
    out+="]";
    return bounded(out);
  });
}

function serializeObject(value,depth,stack){
  assertNoProxy(value,"apollyon_claim_canonical_v2_proxy_forbidden");
  const prototype=GET_PROTOTYPE_OF(value);
  if(prototype!==OBJECT_PROTOTYPE&&prototype!==null){
    fail("apollyon_claim_canonical_v2_object_prototype_invalid");
  }
  const names=GET_OWN_PROPERTY_NAMES(value);
  const own=OWN_KEYS(value);
  if(
    names.length>MAX_OBJECT_KEYS||
    own.length!==names.length
  ){
    fail("apollyon_claim_canonical_v2_object_shape_invalid");
  }
  for(let index=0;index<names.length;index+=1){
    const key=names[index];
    const descriptor=exactDataDescriptor(
      value,key,"apollyon_claim_canonical_v2_object_shape_invalid",
    );
    if(descriptor.enumerable!==true){
      fail("apollyon_claim_canonical_v2_object_shape_invalid");
    }
  }
  APPLY(ARRAY_SORT,names,[]);

  return withStack(stack,value,()=>{
    let out="{";
    for(let index=0;index<names.length;index+=1){
      const key=names[index];
      const descriptor=exactDataDescriptor(
        value,key,"apollyon_claim_canonical_v2_object_shape_invalid",
      );
      if(index!==0)out+=",";
      out+=quoteString(key)+":"+serialize(descriptor.value,depth+1,stack);
      bounded(out);
    }
    out+="}";
    return bounded(out);
  });
}

function serialize(value,depth,stack){
  if(depth>MAX_DEPTH)fail("apollyon_claim_canonical_v2_depth_invalid");
  if(value===null)return "null";
  if(typeof value==="string")return quoteString(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"){
    if(!NUMBER_IS_SAFE_INTEGER(value)){
      fail("apollyon_claim_canonical_v2_number_invalid");
    }
    if(value===0)return "0";
    return APPLY(NUMBER_TO_STRING,value,[10]);
  }
  if(typeof value!=="object"){
    fail("apollyon_claim_canonical_v2_value_invalid");
  }
  if(ARRAY_IS_ARRAY(value))return serializeArray(value,depth,stack);
  return serializeObject(value,depth,stack);
}

export function canonicalApollyonClaimContractJsonV2(value){
  return serialize(value,0,[]);
}
