// VOID custody second-control detached-signature verifier V1.
// Source-only verifier. Never authenticates where a caller got its key policy.
// No signing, key generation, protected host I/O, or economic authority here.
import crypto from "node:crypto";
import { types as utilTypes } from "node:util";
import {
  buildBuyVoidAllocationCustodySecondControlApprovalIdV2,
} from "./void-buy-allocation-custody-rollback-controller-candidate-v2.mjs";

export const MARKER =
  "VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_ED25519_VERIFIER_V1";
export const SIGNING_DOMAIN =
  "VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_APPROVAL_ED25519_V1";
export const CONTROLLER_GIT_BLOB_SHA1 =
  "7a42e1863f3f4d842dd59060b366901adb402848";
export const SOURCE_ONLY_AUTHORITY = Object.freeze({
  pure_detached_signature_verifier: true,
  source_only_candidate: true,
  caller_key_pin_independently_authenticated: false,
  distinct_approving_principal_authenticated: false,
  replay_prevention_proven: false,
  approved_second_control_proven: false,
  production_host_evidence_authority: false,
  host_execution_authorized: false,
  filesystem_read_authorized: false,
  filesystem_write_authorized: false,
  storage_mutation_authorized: false,
  rollback_test_authorized: false,
  credential_access_authorized: false,
  private_key_access_authorized: false,
  signing_authorized: false,
  transaction_submission_authorized: false,
  payment_acceptance_authorized: false,
  public_presale_activation_authorized: false,
  wc_void_market_activation_authorized: false,
  treasury_or_liquidity_action_authorized: false,
  funds_movement: false,
});

const BODY_KEYS=Object.freeze([
  "marker","version","plan_id","authorization_id","operation_id",
  "authorization_claim_id","challenge_id","operation_lease_id","host_id",
  "rollback_target_journal_tip_sha256","protected_high_water_sha256",
  "external_witness_sequence","external_witness_tip_sha256",
]);
const ATTESTATION_KEYS=Object.freeze([
  "marker","version","approval_id","approver_public_key_spki_der_b64",
  "signature_ed25519_b64",
]);
const POLICY_KEYS=Object.freeze([
  "marker","version","allowed_approver_spki_sha256",
  "operator_spki_sha256",
]);
const TOP_KEYS=Object.freeze(["approval_body","approval_id","attestation","declared_key_policy"]);
const SHA=/^sha256:[0-9a-f]{64}$/u;
const V2_ID=/^voidbuycustodysecondcontrol2_[0-9a-f]{64}$/u;
// Strict RFC8410 DER SubjectPublicKeyInfo for Ed25519, no parameters.
const ED25519_SPKI_PREFIX=Buffer.from("302a300506032b6570032100","hex");

function hold(reason){throw new Error(reason);}
function record(value,keys,reason){
  if(!value||typeof value!=="object"||utilTypes.isProxy(value)||Array.isArray(value))
    hold(reason);
  const prototype=Object.getPrototypeOf(value);
  if(prototype!==Object.prototype&&prototype!==null)hold(reason);
  const names=Reflect.ownKeys(value);
  if(names.length!==keys.length||names.some(k=>typeof k!=="string"))
    hold(reason);
  const sorted=keys.slice().sort();
  if(names.slice().sort().some((name,i)=>name!==sorted[i]))hold(reason);
  const out=Object.create(null);
  for(const key of keys){
    const d=Object.getOwnPropertyDescriptor(value,key);
    if(!d||!("value" in d)||d.enumerable!==true)hold(reason);
    out[key]=d.value;
  }
  return out;
}
function requireFingerprint(x,reason){
  if(typeof x!=="string"||!SHA.test(x))hold(reason);
  return x;
}
function strictB64(value,reason,maxBytes){
  if(typeof value!=="string"||value.length>maxBytes*2||
     !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value))
    hold(reason);
  const bytes=Buffer.from(value,"base64");
  if(bytes.length<1||bytes.length>maxBytes||bytes.toString("base64")!==value)
    hold(reason);
  return bytes;
}
function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean")
    return JSON.stringify(value);
  if(typeof value==="number"&&Number.isSafeInteger(value))
    return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"){
    return "{"+Object.keys(value).sort().map(
      k=>JSON.stringify(k)+":"+canonical(value[k]),
    ).join(",")+"}";
  }
  hold("second_control_noncanonical_payload");
}
function sha(raw){
  return "sha256:"+crypto.createHash("sha256").update(raw).digest("hex");
}

export function buildBuyVoidCustodySecondControlSigningPayloadV1(input){
  const top=record(input,["approval_body","approval_id"],
    "second_control_signing_input_invalid");
  const body=record(top.approval_body,BODY_KEYS,"second_control_signing_body_invalid");
  if(typeof top.approval_id!=="string"||!V2_ID.test(top.approval_id))
    hold("second_control_signing_approval_id_invalid");
  if(buildBuyVoidAllocationCustodySecondControlApprovalIdV2(body)!==top.approval_id)
    hold("second_control_signing_approval_id_mismatch");
  const payload={
    marker:SIGNING_DOMAIN,
    version:1,
    controller_source_git_blob_sha1:CONTROLLER_GIT_BLOB_SHA1,
    approval_id:top.approval_id,
    approval_body:body,
  };
  return Buffer.concat([
    Buffer.from(SIGNING_DOMAIN+"\0","ascii"),
    Buffer.from(canonical(payload),"utf8"),
  ]);
}

// Verifies only the mathematical detached signature. Declared keys/pins from
// the caller are NOT trusted roots and do not prove independent control.
export function verifyBuyVoidCustodySecondControlSignatureV1(input){
  const top=record(input,TOP_KEYS,"second_control_verify_input_invalid");
  const att=record(top.attestation,ATTESTATION_KEYS,
    "second_control_attestation_shape_invalid");
  const pins=record(top.declared_key_policy,POLICY_KEYS,
    "second_control_key_policy_shape_invalid");
  if(pins.marker!=="VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_KEY_POLICY_V1"||
     pins.version!==1)hold("second_control_key_policy_domain_invalid");
  const acceptedPin=requireFingerprint(pins.allowed_approver_spki_sha256,
    "second_control_approver_key_pin_invalid");
  const operatorPin=requireFingerprint(pins.operator_spki_sha256,
    "second_control_operator_key_pin_invalid");
  if(acceptedPin===operatorPin)hold("second_control_approver_operator_key_collision");
  if(att.marker!=="VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_ATTESTATION_V1"||
     att.version!==1)hold("second_control_attestation_domain_invalid");
  if(att.approval_id!==top.approval_id)
    hold("second_control_attestation_approval_id_mismatch");
  const message=buildBuyVoidCustodySecondControlSigningPayloadV1({
    approval_body:top.approval_body,approval_id:top.approval_id,
  });
  const spki=strictB64(att.approver_public_key_spki_der_b64,
    "second_control_public_key_base64_invalid",44);
  if(spki.length!==44||!spki.subarray(0,12).equals(ED25519_SPKI_PREFIX))
    hold("second_control_public_key_algorithm_invalid");
  if(sha(spki)!==acceptedPin)
    hold("second_control_approver_key_pin_mismatch");
  let pubkey;
  try {
    pubkey=crypto.createPublicKey({key:spki,format:"der",type:"spki"});
  }catch{hold("second_control_public_key_invalid");}
  if(pubkey.asymmetricKeyType!=="ed25519")
    hold("second_control_public_key_algorithm_invalid");
  const signature=strictB64(att.signature_ed25519_b64,
    "second_control_signature_base64_invalid",64);
  if(signature.length!==64)hold("second_control_signature_length_invalid");
  if(!crypto.verify(null,message,pubkey,signature))
    hold("second_control_signature_verification_failed");
  return Object.freeze({
    marker:MARKER,
    signature_cryptographically_verified:true,
    approval_id:top.approval_id,
    signed_message_sha256:sha(message),
    declared_approver_spki_sha256:acceptedPin,
    declaration_of_distinct_operator_key:true,
    caller_key_pin_independently_authenticated:false,
    distinct_approving_principal_authenticated:false,
    replay_prevention_proven:false,
    approved_second_control_proven:false,
    host_execution_authorized:false,
    storage_mutation_authorized:false,
    rollback_test_authorized:false,
    payment_acceptance_authorized:false,
    public_presale_activation_authorized:false,
    wc_void_market_activation_authorized:false,
    funds_movement:false,
  });
}
