#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { computeAddress } from "ethers";

import {
  MARKER,
  STATUS,
  EXPECTED_FULFILLER,
  EXPECTED_CREDENTIAL_ID,
  EXPECTED_SOURCE_BINDING_ID,
  CHALLENGE_DOMAIN,
  buildEpoch2InstalledCredentialSignedChallengeMessageV1,
  classifyEpoch2InstalledCredentialPublicEvidenceV1,
  testOnlyClassifyEpoch2InstalledCredentialPublicEvidenceV1,
} from "../tools/void-buy-void-epoch2-installed-credential-public-evidence-v1.mjs";

const sha256=(bytes)=>crypto.createHash("sha256").update(bytes).digest("hex");
const privateKey=Buffer.alloc(32);
privateKey[31]=1;
const sec1=Buffer.concat([
  Buffer.from("302e0201010420","hex"),
  privateKey,
  Buffer.from("a00706052b8104000a","hex"),
]);
const privateObject=crypto.createPrivateKey({key:sec1,format:"der",type:"sec1"});
sec1.fill(0);
const publicObject=crypto.createPublicKey(privateObject);
const spki=publicObject.export({format:"der",type:"spki"});
assert.ok(Buffer.isBuffer(spki));
const jwk=publicObject.export({format:"jwk"});
const x=Buffer.from(String(jwk.x||""),"base64url");
const y=Buffer.from(String(jwk.y||""),"base64url");
const uncompressed=Buffer.concat([Buffer.from([4]),x,y]);
const testAddress=computeAddress("0x"+uncompressed.toString("hex")).toLowerCase();
assert.equal(testAddress,"0x7e5f4552091a69125d5dfcb7b8c2659029395bdf");

const sourceHead="a".repeat(40);
const sourceTree="b".repeat(40);
const invocation="c".repeat(32);
const body={
  marker:"VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V1",
  version:1,
  status:"EPOCH2_INSTALLED_CREDENTIAL_SIGNING_CAPABILITY_GREEN",
  source_head:sourceHead,
  source_tree:sourceTree,
  source_branch:"main",
  sealed_probe_git_blob:"d".repeat(40),
  credential_source_binding_id:EXPECTED_SOURCE_BINDING_ID,
  credential_id:EXPECTED_CREDENTIAL_ID,
  immutable_fulfiller:testAddress,
  systemd:{
    service:"void-node-live.service",
    main_pid:4242,
    invocation_id:invocation,
    loadcredential_binding_sha256:"e".repeat(64),
    credentials_directory_sha256:"f".repeat(64),
    main_pid_cgroup_sha256:"1".repeat(64),
    process_source_commit:sourceHead,
    process_source_tree:sourceTree,
    process_source_branch:"main",
    raw_loadcredential_source_path_output:false,
    raw_credentials_directory_output:false,
  },
  challenge:{
    domain:CHALLENGE_DOMAIN,
    nonce_hex:"2".repeat(64),
    challenge_sha256:"",
    signature_sha256:"",
    public_signature_p1363_hex:"",
    public_key_spki_der_hex:spki.toString("hex"),
    public_key_uncompressed_sha256:sha256(uncompressed),
    raw_challenge_output:false,
    public_signature_output:true,
    public_key_output:true,
    transaction_constructed:false,
  },
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
};

const message=buildEpoch2InstalledCredentialSignedChallengeMessageV1(body);
body.challenge.challenge_sha256=sha256(message);
const signature=crypto.sign(
  "sha256",message,{key:privateObject,dsaEncoding:"ieee-p1363"}
);
assert.equal(signature.length,64);
body.challenge.signature_sha256=sha256(signature);
body.challenge.public_signature_p1363_hex=signature.toString("hex");
const record={
  ...body,
  evidence_id:"voide2sealed1_"+sha256(Buffer.from(JSON.stringify(body),"utf8")),
};

const good=testOnlyClassifyEpoch2InstalledCredentialPublicEvidenceV1(
  record,testAddress
);
assert.equal(good.ok,true);
assert.equal(good.status,STATUS);
assert.equal(good.signer_address,testAddress);
assert.equal(good.systemd_observation_signature_bound,true);
assert.equal(good.active_signing_capability_cryptographically_verified,true);
assert.equal(good.runtime_source_binding_signature_bound,true);
assert.equal(good.live_payment_signing_authorized,false);
assert.equal(good.transaction_sign_or_broadcast_authorized,false);
assert.equal(good.public_presale_activation_authorized,false);
assert.equal(good.funds_movement_authorized,false);

// Production classifier is permanently fixed to the immutable Epoch-2 fulfiller.
const productionReject=classifyEpoch2InstalledCredentialPublicEvidenceV1(record);
assert.equal(productionReject.ok,false);
assert.equal(EXPECTED_FULFILLER,
  "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a");

function resealEvidenceId(value){
  const copy={...value};
  delete copy.evidence_id;
  value.evidence_id=
    "voide2sealed1_"+sha256(Buffer.from(JSON.stringify(copy),"utf8"));
}
function recomputeChallengeHash(value){
  const msg=buildEpoch2InstalledCredentialSignedChallengeMessageV1(value);
  try{value.challenge.challenge_sha256=sha256(msg);}
  finally{msg.fill(0);}
}
function boundTamper(label,mutate){
  const changed=structuredClone(record);
  mutate(changed);
  recomputeChallengeHash(changed);
  resealEvidenceId(changed);
  const out=testOnlyClassifyEpoch2InstalledCredentialPublicEvidenceV1(
    changed,testAddress
  );
  assert.equal(out.ok,false,label);
}
for(const [label,mutate] of [
  ["service",v=>{v.systemd.service="other.service";}],
  ["main_pid",v=>{v.systemd.main_pid+=1;}],
  ["invocation",v=>{v.systemd.invocation_id="3".repeat(32);}],
  ["loadcredential",v=>{v.systemd.loadcredential_binding_sha256="4".repeat(64);}],
  ["credential_directory",v=>{v.systemd.credentials_directory_sha256="5".repeat(64);}],
  ["cgroup",v=>{v.systemd.main_pid_cgroup_sha256="6".repeat(64);}],
  ["source_head",v=>{
    v.source_head="7".repeat(40);
    v.systemd.process_source_commit=v.source_head;
  }],
  ["source_tree",v=>{
    v.source_tree="8".repeat(40);
    v.systemd.process_source_tree=v.source_tree;
  }],
  ["nonce",v=>{v.challenge.nonce_hex="9".repeat(64);}],
]){
  boundTamper(label,mutate);
}

{
  const changed=structuredClone(record);
  const sig=Buffer.from(changed.challenge.public_signature_p1363_hex,"hex");
  sig[0]^=1;
  changed.challenge.public_signature_p1363_hex=sig.toString("hex");
  changed.challenge.signature_sha256=sha256(sig);
  resealEvidenceId(changed);
  assert.equal(
    testOnlyClassifyEpoch2InstalledCredentialPublicEvidenceV1(
      changed,testAddress
    ).ok,
    false,
    "signature tamper",
  );
  sig.fill(0);
}
{
  const changed=structuredClone(record);
  changed.runtime_activation_authorized=true;
  resealEvidenceId(changed);
  assert.equal(
    testOnlyClassifyEpoch2InstalledCredentialPublicEvidenceV1(
      changed,testAddress
    ).ok,
    false,
    "runtime authority overclaim",
  );
}
{
  const changed=structuredClone(record);
  changed.evidence_id="voide2sealed1_"+"0".repeat(64);
  assert.equal(
    testOnlyClassifyEpoch2InstalledCredentialPublicEvidenceV1(
      changed,testAddress
    ).ok,
    false,
    "evidence id tamper",
  );
}

message.fill(0);
signature.fill(0);
spki.fill(0);
x.fill(0);
y.fill(0);
uncompressed.fill(0);
privateKey.fill(0);

console.log(MARKER+"_PROOF_GREEN");
console.log("production_fulfiller_fixed=true");
console.log("public_signature_cryptographically_verified=true");
console.log("systemd_observation_signature_bound=true");
console.log("loadcredential_hash_signature_bound=true");
console.log("credentials_directory_hash_signature_bound=true");
console.log("cgroup_hash_signature_bound=true");
console.log("runtime_source_signature_bound=true");
console.log("challenge_nonce_signature_bound=true");
console.log("tampered_signature_rejected=true");
console.log("authority_overclaim_rejected=true");
console.log("evidence_id_bound=true");
console.log("live_payment_signing_authorized=false");
console.log("transaction_sign_or_broadcast_authorized=false");
console.log("public_presale_activation_authorized=false");
console.log("funds_movement_authorized=false");
