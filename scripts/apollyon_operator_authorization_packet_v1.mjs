#!/usr/bin/env node

import {
  createHash,
  createPublicKey,
  timingSafeEqual,
  verify as cryptoVerify,
} from "node:crypto";

export const VOID_APOLLYON_OPERATOR_AUTHORIZATION_PACKET_V1 =
  "VOID_APOLLYON_OPERATOR_AUTHORIZATION_PACKET_V1";
export const VOID_APOLLYON_OPERATOR_AUTHORIZATION_PAYLOAD_V1 =
  "VOID_APOLLYON_OPERATOR_AUTHORIZATION_PAYLOAD_V1";
export const VOID_APOLLYON_OPERATOR_AUTHORIZATION_DOMAIN_V1 =
  "void.apollyon.operator-authorization.v1";

const HEX64=/^[0-9a-f]{64}$/u;
const GIT_OID40=/^[0-9a-f]{40}$/u;
const AUTHORIZATION_ID=/^apollyon_authz_v1:[0-9a-f]{64}$/u;
const NONCE=/^[0-9a-f]{64}$/u;
const ED25519_SPKI_PREFIX=Buffer.from("302a300506032b6570032100","hex");
const MAX_VALIDITY_MS=15*60*1000;
const CLOCK_SKEW_MS=2*60*1000;
const MAX_REQUEST_BYTES=1024*1024;
const MAX_CORPUS_RECORDS=100000;
const MAX_LENGTH=65536;

function fail(message){
  throw new Error(message);
}

function exactKeys(value,expected,label){
  if(value===null || typeof value!=="object" || Array.isArray(value)){
    fail(label+" must be an object");
  }
  const actual=Object.keys(value).sort();
  const wanted=[...expected].sort();
  if(actual.length!==wanted.length){
    fail(label+" keys mismatch");
  }
  for(let i=0;i<wanted.length;i+=1){
    if(actual[i]!==wanted[i]) fail(label+" keys mismatch");
  }
}

function safePositiveInteger(value,label,max){
  if(!Number.isSafeInteger(value) || value<1 || value>max){
    fail(label+" invalid");
  }
  return value;
}

function hex64(value,label){
  if(typeof value!=="string" || !HEX64.test(value)){
    fail(label+" must be lowercase sha256 hex");
  }
  return value;
}

function gitOid40(value,label){
  if(typeof value!=="string" || !GIT_OID40.test(value)){
    fail(label+" must be a lowercase 40-hex Git object ID");
  }
  return value;
}

function strictBase64(value,label){
  if(
    typeof value!=="string" ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)
  ){
    fail(label+" must be canonical base64");
  }
  const bytes=Buffer.from(value,"base64");
  if(bytes.toString("base64")!==value){
    fail(label+" must be canonical base64");
  }
  return bytes;
}

function canonicalize(value){
  if(value===null || typeof value==="string" || typeof value==="boolean"){
    return value;
  }
  if(typeof value==="number"){
    if(!Number.isSafeInteger(value)) fail("canonical number must be a safe integer");
    return value;
  }
  if(Array.isArray(value)){
    return value.map(canonicalize);
  }
  if(typeof value==="object"){
    const output={};
    for(const key of Object.keys(value).sort()){
      if(value[key]===undefined) fail("undefined canonical value");
      output[key]=canonicalize(value[key]);
    }
    return output;
  }
  fail("unsupported canonical value");
}

export function canonicalApollyonOperatorAuthorizationJsonV1(value){
  return JSON.stringify(canonicalize(value));
}

function sha256(value){
  return createHash("sha256").update(value).digest("hex");
}

function parseCanonicalIso(value,label){
  if(typeof value!=="string") fail(label+" must be a string");
  const ms=Date.parse(value);
  if(!Number.isFinite(ms) || new Date(ms).toISOString()!==value){
    fail(label+" must be canonical ISO-8601 UTC");
  }
  return ms;
}

function verifyAuthority(authority){
  exactKeys(
    authority,
    [
      "attempt_limit",
      "candidate_weight_mutation",
      "fresh_corpus_binding",
      "funds_movement",
      "generation_execution",
      "repository_merge",
      "runtime_service_mutation",
      "transaction_broadcast",
      "transaction_signing",
      "training_execution",
      "wallet_access",
      "xiphos_runtime",
    ],
    "payload.authority",
  );
  if(authority.attempt_limit!==1) fail("attempt_limit must equal 1");
  for(const key of [
    "candidate_weight_mutation",
    "fresh_corpus_binding",
    "training_execution",
    "xiphos_runtime",
  ]){
    if(authority[key]!==true) fail(key+" must be true");
  }
  for(const key of [
    "funds_movement",
    "generation_execution",
    "repository_merge",
    "runtime_service_mutation",
    "transaction_broadcast",
    "transaction_signing",
    "wallet_access",
  ]){
    if(authority[key]!==false) fail(key+" must be false");
  }
}

export function validateApollyonOperatorAuthorizationPayloadV1(payload,{nowMs=Date.now()}={}){
  exactKeys(
    payload,
    [
      "action",
      "authority",
      "corpus",
      "expires_at",
      "issued_at",
      "marker",
      "nonce",
      "parent_adapter_sha256",
      "purpose",
      "request",
      "subject",
      "target_host",
      "version",
    ],
    "payload",
  );
  if(payload.marker!==VOID_APOLLYON_OPERATOR_AUTHORIZATION_PAYLOAD_V1){
    fail("payload marker mismatch");
  }
  if(payload.version!==1) fail("payload version mismatch");
  if(payload.purpose!=="authorize_exactly_one_apollyon_candidate_training_attempt"){
    fail("payload purpose mismatch");
  }
  if(payload.subject!=="Apollyon") fail("payload subject mismatch");
  if(payload.action!=="candidate_training_attempt_v1") fail("payload action mismatch");
  if(payload.target_host!=="Xiphos") fail("target_host must equal Xiphos");
  if(typeof payload.nonce!=="string" || !NONCE.test(payload.nonce)){
    fail("payload nonce invalid");
  }

  const issuedMs=parseCanonicalIso(payload.issued_at,"payload.issued_at");
  const expiresMs=parseCanonicalIso(payload.expires_at,"payload.expires_at");
  if(expiresMs<=issuedMs || expiresMs-issuedMs>MAX_VALIDITY_MS){
    fail("payload validity window invalid");
  }
  if(!Number.isFinite(nowMs)) fail("verification clock invalid");
  if(issuedMs>nowMs+CLOCK_SKEW_MS) fail("authorization not yet valid");
  if(expiresMs<=nowMs) fail("authorization expired");

  exactKeys(
    payload.request,
    ["bytes","canonical_main","canonical_tree","sha256"],
    "payload.request",
  );
  hex64(payload.request.sha256,"payload.request.sha256");
  gitOid40(payload.request.canonical_main,"payload.request.canonical_main");
  gitOid40(payload.request.canonical_tree,"payload.request.canonical_tree");
  safePositiveInteger(payload.request.bytes,"payload.request.bytes",MAX_REQUEST_BYTES);

  exactKeys(
    payload.corpus,
    ["max_length","records","sha256"],
    "payload.corpus",
  );
  hex64(payload.corpus.sha256,"payload.corpus.sha256");
  safePositiveInteger(payload.corpus.records,"payload.corpus.records",MAX_CORPUS_RECORDS);
  safePositiveInteger(payload.corpus.max_length,"payload.corpus.max_length",MAX_LENGTH);
  hex64(payload.parent_adapter_sha256,"payload.parent_adapter_sha256");

  verifyAuthority(payload.authority);

  return Object.freeze({
    issued_ms:issuedMs,
    expires_ms:expiresMs,
  });
}

export function apollyonOperatorAuthorizationSigningBytesV1(payload){
  validateApollyonOperatorAuthorizationPayloadV1(
    payload,
    {nowMs:Date.parse(payload.issued_at)},
  );
  return Buffer.from(
    VOID_APOLLYON_OPERATOR_AUTHORIZATION_DOMAIN_V1+
    "\n"+
    canonicalApollyonOperatorAuthorizationJsonV1(payload)+
    "\n",
    "utf8",
  );
}

export function apollyonOperatorAuthorizationIdV1(payload){
  return "apollyon_authz_v1:"+sha256(apollyonOperatorAuthorizationSigningBytesV1(payload));
}

function ed25519RawPublicKey(publicKeyInput){
  let key;
  if(
    publicKeyInput &&
    typeof publicKeyInput==="object" &&
    publicKeyInput.type==="public" &&
    typeof publicKeyInput.export==="function"
  ){
    key=publicKeyInput;
  }else{
    try{
      key=createPublicKey(publicKeyInput);
    }catch(error){
      fail("operator public key could not be parsed: "+error.message);
    }
  }
  if(key.asymmetricKeyType!=="ed25519"){
    fail("operator public key must be ed25519");
  }
  const der=key.export({type:"spki",format:"der"});
  if(
    der.length!==ED25519_SPKI_PREFIX.length+32 ||
    !timingSafeEqual(der.subarray(0,ED25519_SPKI_PREFIX.length),ED25519_SPKI_PREFIX)
  ){
    fail("operator public key SPKI encoding is unexpected");
  }
  return {key,raw:der.subarray(ED25519_SPKI_PREFIX.length)};
}

export function verifyApollyonOperatorAuthorizationPacketV1(
  packet,
  {
    expectedOperatorPublicKeyRawSha256,
    operatorPublicKey,
    nowMs=Date.now(),
  },
){
  exactKeys(
    packet,
    ["authorization_id","marker","payload","signature","version"],
    "packet",
  );
  if(packet.marker!==VOID_APOLLYON_OPERATOR_AUTHORIZATION_PACKET_V1){
    fail("packet marker mismatch");
  }
  if(packet.version!==1) fail("packet version mismatch");
  if(typeof packet.authorization_id!=="string" || !AUTHORIZATION_ID.test(packet.authorization_id)){
    fail("authorization_id invalid");
  }

  validateApollyonOperatorAuthorizationPayloadV1(packet.payload,{nowMs});
  const expectedId=apollyonOperatorAuthorizationIdV1(packet.payload);
  if(packet.authorization_id!==expectedId){
    fail("authorization_id mismatch");
  }

  exactKeys(
    packet.signature,
    ["operator_public_key_raw_sha256","scheme","value_base64"],
    "packet.signature",
  );
  if(packet.signature.scheme!=="ed25519"){
    fail("signature scheme mismatch");
  }
  const expectedFingerprint=hex64(
    expectedOperatorPublicKeyRawSha256,
    "expected operator public-key fingerprint",
  );
  if(packet.signature.operator_public_key_raw_sha256!==expectedFingerprint){
    fail("packet operator public-key fingerprint mismatch");
  }

  const {key,raw}=ed25519RawPublicKey(operatorPublicKey);
  const derivedFingerprint=sha256(raw);
  if(derivedFingerprint!==expectedFingerprint){
    fail("operator public key does not match expected raw fingerprint");
  }

  const signature=strictBase64(packet.signature.value_base64,"signature");
  if(signature.length!==64) fail("ed25519 signature must be 64 bytes");
  const signingBytes=apollyonOperatorAuthorizationSigningBytesV1(packet.payload);
  if(!cryptoVerify(null,signingBytes,key,signature)){
    fail("operator authorization signature invalid");
  }

  return Object.freeze({
    authorization_id:packet.authorization_id,
    operator_public_key_raw_sha256:derivedFingerprint,
    signature_verified:true,
    target_host:packet.payload.target_host,
    action:packet.payload.action,
    request_sha256:packet.payload.request.sha256,
    canonical_main:packet.payload.request.canonical_main,
    canonical_tree:packet.payload.request.canonical_tree,
    corpus_sha256:packet.payload.corpus.sha256,
    parent_adapter_sha256:packet.payload.parent_adapter_sha256,
    attempt_limit:1,
    training_execution_authorized:true,
    candidate_weight_mutation_authorized:true,
    fresh_corpus_binding_authorized:true,
    xiphos_runtime_authorized:true,
    transaction_signing_authorized:false,
    transaction_broadcast_authorized:false,
    wallet_access_authorized:false,
    funds_movement_authorized:false,
    repository_merge_authorized:false,
    runtime_service_mutation_authorized:false,
    generation_execution_authorized:false,
    replay_consumed:false,
    attempt_claimed:false,
    execution_performed:false,
  });
}
