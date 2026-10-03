#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_V1 =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_V1";
export const VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_SIGNATURE_SCHEME_V1 =
  "ed25519-spki-sha256-v1";
export const VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_CANONICALIZATION_V1 =
  "void-canonical-json-v1";
export const VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_ID_PREFIX_V1 =
  "voidapwcrp1_";
export const VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_PATH_V1 =
  "/__void/agents/paid-work/credential-requests/v1";

export const VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_HEADERS_V1 =
  Object.freeze({
    key_id: "x-void-credential-applicant-key-id",
    public_key_spki_base64:
      "x-void-credential-applicant-public-key-spki-base64",
    issued_at_unix:
      "x-void-credential-applicant-proof-issued-at-unix",
    expires_at_unix:
      "x-void-credential-applicant-proof-expires-at-unix",
    nonce:
      "x-void-credential-applicant-proof-nonce",
    signature_base64:
      "x-void-credential-applicant-signature-base64",
  });

export const VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_LIMITS_V1 =
  Object.freeze({
    minimum_ttl_seconds: 30,
    maximum_ttl_seconds: 300,
    maximum_clock_skew_seconds: 30,
    maximum_header_value_bytes: 4096,
  });

const KEY_ID=/^ed25519:[0-9a-f]{64}$/u;
const SHA256=/^[0-9a-f]{64}$/u;
const NONCE=/^0x[0-9a-f]{64}$/u;
const UINT=/^(0|[1-9][0-9]*)$/u;

function fail(code){throw new Error(code);}

function compareText(a,b){return a<b?-1:a>b?1:0;}

export function canonicalPublicProofJsonV1(value){
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value)){
    return "["+value.map(canonicalPublicProofJsonV1).join(",")+"]";
  }
  if(value&&typeof value==="object"&&Object.getPrototypeOf(value)===Object.prototype){
    return "{"+Object.keys(value).sort(compareText).map(
      key=>JSON.stringify(key)+":"+canonicalPublicProofJsonV1(value[key]),
    ).join(",")+"}";
  }
  fail("credential_request_public_proof_canonical_value_invalid");
}

function sha256Hex(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function decimal(value,code){
  const text=String(value);
  if(!UINT.test(text))fail(code);
  let parsed;
  try{parsed=BigInt(text);}catch{fail(code);}
  if(parsed<0n||parsed>(1n<<64n)-1n)fail(code);
  return parsed;
}

function strictHeader(headers,name){
  if(!headers||typeof headers!=="object"||Array.isArray(headers)){
    fail("credential_request_public_proof_headers_invalid");
  }
  const value=headers[name];
  if(
    typeof value!=="string"||
    Buffer.byteLength(value,"utf8")>
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_LIMITS_V1
        .maximum_header_value_bytes
  ){
    fail("credential_request_public_proof_header_invalid:"+name);
  }
  return value;
}

function strictBase64(value,bytes,code){
  if(
    typeof value!=="string"||
    value.length<1||
    value.length>8192||
    !/^[A-Za-z0-9+/]+={0,2}$/u.test(value)
  )fail(code);
  let decoded;
  try{decoded=Buffer.from(value,"base64");}catch{fail(code);}
  if(decoded.length!==bytes||decoded.toString("base64")!==value)fail(code);
  return decoded;
}

export function credentialRequestApplicantKeyIdV1(publicKeySpkiDer){
  if(!Buffer.isBuffer(publicKeySpkiDer)||publicKeySpkiDer.length<1||publicKeySpkiDer.length>512){
    fail("credential_request_applicant_public_key_invalid");
  }
  let key;
  try{
    key=crypto.createPublicKey({
      key:publicKeySpkiDer,
      format:"der",
      type:"spki",
    });
  }catch{
    fail("credential_request_applicant_public_key_invalid");
  }
  if(key.asymmetricKeyType!=="ed25519"){
    fail("credential_request_applicant_public_key_not_ed25519");
  }
  const canonical=key.export({type:"spki",format:"der"});
  if(!Buffer.from(canonical).equals(publicKeySpkiDer)){
    fail("credential_request_applicant_public_key_noncanonical");
  }
  return "ed25519:"+sha256Hex(publicKeySpkiDer);
}

export function credentialRequestApplicantProofMaterialV1({
  payloadSha256,
  applicantKeyId,
  issuedAtUnix,
  expiresAtUnix,
  nonce,
}={}){
  if(typeof payloadSha256!=="string"||!SHA256.test(payloadSha256)){
    fail("credential_request_applicant_payload_sha256_invalid");
  }
  if(typeof applicantKeyId!=="string"||!KEY_ID.test(applicantKeyId)){
    fail("credential_request_applicant_key_id_invalid");
  }
  const issued=decimal(
    issuedAtUnix,
    "credential_request_applicant_issued_at_invalid",
  );
  const expires=decimal(
    expiresAtUnix,
    "credential_request_applicant_expires_at_invalid",
  );
  const ttl=expires-issued;
  if(
    ttl<
      BigInt(
        VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_LIMITS_V1
          .minimum_ttl_seconds,
      )||
    ttl>
      BigInt(
        VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_LIMITS_V1
          .maximum_ttl_seconds,
      )
  ){
    fail("credential_request_applicant_proof_ttl_invalid");
  }
  if(typeof nonce!=="string"||!NONCE.test(nonce)){
    fail("credential_request_applicant_nonce_invalid");
  }
  return Object.freeze({
    marker:VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_V1,
    version:1,
    signature_scheme:
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_SIGNATURE_SCHEME_V1,
    signature_domain:
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_V1,
    canonicalization:
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_CANONICALIZATION_V1,
    method:"POST",
    path:VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_PATH_V1,
    payload_sha256:payloadSha256,
    applicant_key_id:applicantKeyId,
    issued_at_unix:issued.toString(),
    expires_at_unix:expires.toString(),
    nonce,
  });
}

export function credentialRequestApplicantProofSigningBytesV1(material){
  const normalized=credentialRequestApplicantProofMaterialV1({
    payloadSha256:material?.payload_sha256,
    applicantKeyId:material?.applicant_key_id,
    issuedAtUnix:material?.issued_at_unix,
    expiresAtUnix:material?.expires_at_unix,
    nonce:material?.nonce,
  });
  if(canonicalPublicProofJsonV1(material)!==canonicalPublicProofJsonV1(normalized)){
    fail("credential_request_applicant_proof_material_mismatch");
  }
  return Buffer.from(
    VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_V1+
      "\n"+
      canonicalPublicProofJsonV1(normalized),
    "utf8",
  );
}

export function verifyCredentialRequestApplicantProofV1({
  headers,
  payloadSha256,
  nowUnix=Math.floor(Date.now()/1000),
}={}){
  const h=VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_HEADERS_V1;
  const keyId=strictHeader(headers,h.key_id);
  const publicKeyBase64=strictHeader(headers,h.public_key_spki_base64);
  const issuedAt=strictHeader(headers,h.issued_at_unix);
  const expiresAt=strictHeader(headers,h.expires_at_unix);
  const nonce=strictHeader(headers,h.nonce);
  const signatureBase64=strictHeader(headers,h.signature_base64);

  if(!KEY_ID.test(keyId))fail("credential_request_applicant_key_id_invalid");
  const publicDer=strictBase64(
    publicKeyBase64,
    44,
    "credential_request_applicant_public_key_invalid",
  );
  const derived=credentialRequestApplicantKeyIdV1(publicDer);
  if(derived!==keyId)fail("credential_request_applicant_key_id_mismatch");

  const material=credentialRequestApplicantProofMaterialV1({
    payloadSha256,
    applicantKeyId:keyId,
    issuedAtUnix:issuedAt,
    expiresAtUnix:expiresAt,
    nonce,
  });
  const now=decimal(nowUnix,"credential_request_applicant_now_invalid");
  const issued=BigInt(material.issued_at_unix);
  const expires=BigInt(material.expires_at_unix);
  const skew=BigInt(
    VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_LIMITS_V1
      .maximum_clock_skew_seconds,
  );
  if(now+skew<issued)fail("credential_request_applicant_proof_not_yet_valid");
  if(now>=expires)fail("credential_request_applicant_proof_expired");

  const signature=strictBase64(
    signatureBase64,
    64,
    "credential_request_applicant_signature_invalid",
  );
  let publicKey;
  try{
    publicKey=crypto.createPublicKey({
      key:publicDer,
      format:"der",
      type:"spki",
    });
  }catch{
    fail("credential_request_applicant_public_key_invalid");
  }
  let verified=false;
  try{
    verified=crypto.verify(
      null,
      credentialRequestApplicantProofSigningBytesV1(material),
      publicKey,
      signature,
    );
  }catch{
    verified=false;
  }
  if(!verified)fail("credential_request_applicant_signature_invalid");

  const proofMaterial=Object.freeze({
    material,
    signature_base64:signatureBase64,
    public_key_spki_base64:publicKeyBase64,
  });
  return Object.freeze({
    ok:true,
    marker:VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_V1,
    applicant_key_id:keyId,
    proof_id:
      VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_PROOF_ID_PREFIX_V1+
      sha256Hex(Buffer.from(canonicalPublicProofJsonV1(proofMaterial),"utf8")),
    nonce:material.nonce,
    issued_at_unix:material.issued_at_unix,
    expires_at_unix:material.expires_at_unix,
    payload_sha256:material.payload_sha256,
    credential_authority:false,
    credential_registry_mutation_authority:false,
    wc_award_authority:false,
    funds_movement:false,
  });
}
