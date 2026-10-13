#!/usr/bin/env node
import crypto from "node:crypto";
import { computeAddress } from "ethers";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_INSTALLED_CREDENTIAL_PUBLIC_EVIDENCE_V1";
export const STATUS = "INSTALLED_CREDENTIAL_PUBLIC_EVIDENCE_VERIFIED";
export const EXPECTED_FULFILLER =
  "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";
export const EXPECTED_CREDENTIAL_ID = "buy-void-epoch2-fulfiller-v1";
export const EXPECTED_SOURCE_BINDING_ID =
  "5fde8cc7fcd0493619c105ac9f367063fbdacd74e8ae50df76454c6d298206f1";
export const CHALLENGE_DOMAIN =
  "VOID_BUY_VOID_EPOCH2_CREDENTIAL_CHALLENGE_SEALED_V1";

const SOURCE_MARKER = "VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V1";
const SOURCE_STATUS = "EPOCH2_INSTALLED_CREDENTIAL_SIGNING_CAPABILITY_GREEN";
const SHA40=/^[0-9a-f]{40}$/u;
const HEX32=/^[0-9a-f]{32}$/u;
const HEX64=/^[0-9a-f]{64}$/u;
const HEX128=/^[0-9a-f]{128}$/u;
const EVIDENCE_ID=/^voide2sealed1_[0-9a-f]{64}$/u;

const TOP_KEYS=Object.freeze([
  "marker","version","status","source_head","source_tree","source_branch",
  "sealed_probe_git_blob","credential_source_binding_id","credential_id",
  "immutable_fulfiller","systemd","challenge","credential_content_read",
  "immutable_fulfiller_identity_proven","active_signing_capability_proven",
  "raw_private_key_output","private_key_string_materialization",
  "raw_signed_transaction_output","rpc_call_performed","transaction_constructed",
  "root_owned_node_binary_verified","node_loader_environment_empty",
  "native_loader_environment_empty","transaction_broadcast_performed",
  "transaction_submission_performed","filesystem_write_performed",
  "runtime_activation_authorized","public_payment_acceptance_authorized",
  "presale_activation_authorized","funds_movement","evidence_id",
]);
const SYSTEMD_KEYS=Object.freeze([
  "service","main_pid","invocation_id","loadcredential_binding_sha256",
  "credentials_directory_sha256","main_pid_cgroup_sha256",
  "process_source_commit","process_source_tree","process_source_branch",
  "raw_loadcredential_source_path_output","raw_credentials_directory_output",
]);
const CHALLENGE_KEYS=Object.freeze([
  "domain","nonce_hex","challenge_sha256","signature_sha256",
  "public_signature_p1363_hex","public_key_spki_der_hex",
  "public_key_uncompressed_sha256","raw_challenge_output",
  "public_signature_output","public_key_output","transaction_constructed",
]);

function exactKeys(value,expected){
  if(!value||typeof value!=="object"||Array.isArray(value)||
     Object.getPrototypeOf(value)!==Object.prototype)return false;
  const actual=Object.keys(value).sort();
  const want=[...expected].sort();
  return actual.length===want.length&&
    actual.every((key,index)=>key===want[index]);
}
function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function bad(reason){
  return Object.freeze({
    ok:false,status:"HOLD",reason,
    evidence_id:null,source_head:null,source_tree:null,signer_address:null,
    systemd_observation_signature_bound:false,
    active_signing_capability_cryptographically_verified:false,
    runtime_source_binding_signature_bound:false,
    live_payment_signing_authorized:false,
    transaction_sign_or_broadcast_authorized:false,
    public_presale_activation_authorized:false,
    wc_void_market_activation_authorized:false,
    funds_movement_authorized:false,
  });
}

export function buildEpoch2InstalledCredentialSignedChallengeMessageV1(record){
  const s=record?.systemd;
  const c=record?.challenge;
  return Buffer.from([
    CHALLENGE_DOMAIN,
    String(record?.source_head||""),
    String(record?.source_tree||""),
    String(record?.source_branch||""),
    String(s?.service||""),
    String(s?.main_pid??""),
    String(s?.invocation_id||""),
    String(record?.credential_id||""),
    String(s?.loadcredential_binding_sha256||""),
    String(s?.credentials_directory_sha256||""),
    String(s?.main_pid_cgroup_sha256||""),
    String(s?.process_source_commit||""),
    String(s?.process_source_tree||""),
    String(s?.process_source_branch||""),
    String(c?.nonce_hex||""),
  ].join("\0"),"utf8");
}

function classify(record,expectedFulfiller){
  try{
    const expected=String(expectedFulfiller||"").toLowerCase();
    if(!/^0x[0-9a-f]{40}$/u.test(expected))return bad("expected_fulfiller_invalid");
    if(!exactKeys(record,TOP_KEYS)||
       record.marker!==SOURCE_MARKER||record.version!==1||
       record.status!==SOURCE_STATUS||record.source_branch!=="main"||
       !SHA40.test(String(record.source_head||""))||
       !SHA40.test(String(record.source_tree||""))||
       !SHA40.test(String(record.sealed_probe_git_blob||""))||
       record.credential_source_binding_id!==EXPECTED_SOURCE_BINDING_ID||
       record.credential_id!==EXPECTED_CREDENTIAL_ID||
       String(record.immutable_fulfiller||"").toLowerCase()!==expected||
       !EVIDENCE_ID.test(String(record.evidence_id||""))){
      return bad("evidence_header_invalid");
    }

    const s=record.systemd;
    if(!exactKeys(s,SYSTEMD_KEYS)||
       s.service!=="void-node-live.service"||
       !Number.isSafeInteger(s.main_pid)||s.main_pid<=1||
       !HEX32.test(String(s.invocation_id||""))||
       !HEX64.test(String(s.loadcredential_binding_sha256||""))||
       !HEX64.test(String(s.credentials_directory_sha256||""))||
       !HEX64.test(String(s.main_pid_cgroup_sha256||""))||
       s.process_source_commit!==record.source_head||
       s.process_source_tree!==record.source_tree||
       s.process_source_branch!=="main"||
       s.raw_loadcredential_source_path_output!==false||
       s.raw_credentials_directory_output!==false){
      return bad("systemd_binding_invalid");
    }

    const c=record.challenge;
    if(!exactKeys(c,CHALLENGE_KEYS)||
       c.domain!==CHALLENGE_DOMAIN||
       !HEX64.test(String(c.nonce_hex||""))||
       !HEX64.test(String(c.challenge_sha256||""))||
       !HEX64.test(String(c.signature_sha256||""))||
       !HEX128.test(String(c.public_signature_p1363_hex||""))||
       typeof c.public_key_spki_der_hex!=="string"||
       !/^[0-9a-f]+$/u.test(c.public_key_spki_der_hex)||
       c.public_key_spki_der_hex.length%2!==0||
       !HEX64.test(String(c.public_key_uncompressed_sha256||""))||
       c.raw_challenge_output!==false||
       c.public_signature_output!==true||
       c.public_key_output!==true||
       c.transaction_constructed!==false){
      return bad("challenge_public_material_invalid");
    }

    const message=buildEpoch2InstalledCredentialSignedChallengeMessageV1(record);
    let signature=null,spki=null,x=null,y=null,uncompressed=null;
    try{
      if(sha256(message)!==c.challenge_sha256)return bad("challenge_hash_mismatch");
      signature=Buffer.from(c.public_signature_p1363_hex,"hex");
      if(signature.length!==64||sha256(signature)!==c.signature_sha256){
        return bad("signature_hash_mismatch");
      }
      spki=Buffer.from(c.public_key_spki_der_hex,"hex");
      if(spki.length<32||spki.length>1024)return bad("public_spki_size_invalid");
      let publicObject;
      try{
        publicObject=crypto.createPublicKey({key:spki,format:"der",type:"spki"});
      }catch{return bad("public_spki_invalid");}
      if(!crypto.verify(
        "sha256",message,
        {key:publicObject,dsaEncoding:"ieee-p1363"},
        signature
      ))return bad("public_signature_verify_failed");
      const jwk=publicObject.export({format:"jwk"});
      if(jwk.kty!=="EC"||jwk.crv!=="secp256k1"){
        return bad("public_curve_invalid");
      }
      x=Buffer.from(String(jwk.x||""),"base64url");
      y=Buffer.from(String(jwk.y||""),"base64url");
      if(x.length!==32||y.length!==32)return bad("public_coordinates_invalid");
      uncompressed=Buffer.concat([Buffer.from([4]),x,y]);
      if(sha256(uncompressed)!==c.public_key_uncompressed_sha256){
        return bad("public_key_fingerprint_mismatch");
      }
      let address;
      try{
        address=computeAddress("0x"+uncompressed.toString("hex")).toLowerCase();
      }catch{return bad("public_key_address_derivation_failed");}
      if(address!==expected)return bad("public_key_fulfiller_address_mismatch");

      for(const [key,want] of Object.entries({
        credential_content_read:true,
        immutable_fulfiller_identity_proven:true,
        active_signing_capability_proven:true,
        raw_private_key_output:false,
        private_key_string_materialization:false,
        raw_signed_transaction_output:false,
        rpc_call_performed:false,
        transaction_constructed:false,
        root_owned_node_binary_verified:true,
        node_loader_environment_empty:true,
        native_loader_environment_empty:true,
        transaction_broadcast_performed:false,
        transaction_submission_performed:false,
        filesystem_write_performed:false,
        runtime_activation_authorized:false,
        public_payment_acceptance_authorized:false,
        presale_activation_authorized:false,
        funds_movement:false,
      })){
        if(record[key]!==want)return bad("authority_flag_invalid:"+key);
      }

      const body={...record};
      delete body.evidence_id;
      const expectedId="voide2sealed1_"+
        sha256(Buffer.from(JSON.stringify(body),"utf8"));
      if(record.evidence_id!==expectedId)return bad("evidence_id_mismatch");

      return Object.freeze({
        ok:true,status:STATUS,reason:null,
        evidence_id:record.evidence_id,
        source_head:record.source_head,
        source_tree:record.source_tree,
        signer_address:address,
        systemd_observation_signature_bound:true,
        active_signing_capability_cryptographically_verified:true,
        runtime_source_binding_signature_bound:true,
        live_payment_signing_authorized:false,
        transaction_sign_or_broadcast_authorized:false,
        public_presale_activation_authorized:false,
        wc_void_market_activation_authorized:false,
        funds_movement_authorized:false,
      });
    }finally{
      message.fill(0);
      if(signature)signature.fill(0);
      if(spki)spki.fill(0);
      if(x)x.fill(0);
      if(y)y.fill(0);
      if(uncompressed)uncompressed.fill(0);
    }
  }catch{
    return bad("evidence_unclassified_invalid");
  }
}

export function classifyEpoch2InstalledCredentialPublicEvidenceV1(record){
  return classify(record,EXPECTED_FULFILLER);
}
export function testOnlyClassifyEpoch2InstalledCredentialPublicEvidenceV1(
  record,expectedFulfiller
){
  return classify(record,expectedFulfiller);
}
