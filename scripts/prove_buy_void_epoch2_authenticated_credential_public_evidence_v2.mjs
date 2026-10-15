#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  CHALLENGE_DOMAIN,
  EXPECTED_SOURCE_BINDING_ID,
  buildEpoch2InstalledCredentialSignedChallengeMessageV1,
} from "../tools/void-buy-void-epoch2-installed-credential-public-evidence-v1.mjs";

import {
  EXPECTED_CREDENTIAL_LOCK_ID,
  EXPECTED_QUALIFIER_MARKER,
  EXPECTED_QUALIFIER_NEXT_ACTION,
  STATUS,
  NEXT_ACTION,
  isCompositeEvidenceIdV2,
  testOnlyClassifyEpoch2AuthenticatedCredentialPublicEvidenceV2,
} from "../tools/void-buy-void-epoch2-authenticated-credential-public-evidence-v2.mjs";

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

const sourceHead="a".repeat(40);
const sourceTree="b".repeat(40);
const invocation="c".repeat(32);
const runtimeUid=1000;
const mainPid=4242;
const credentialSource="/private/e2-fulfiller.key";
const credentialId="buy-void-epoch2-fulfiller-v1";
const loadBinding=credentialId+":"+credentialSource;
const cgroupLine=
  "0::/user.slice/user-1000.slice/user@1000.service/app.slice/"+
  "void-node-live.service\n";
const testAddress=(()=>{
  const hash=crypto.createHash("sha256").update(uncompressed).digest("hex");
  assert.equal(hash.length,64);
  const key=crypto.createPublicKey(publicObject);
  const exported=key.export({format:"jwk"});
  const xx=Buffer.from(String(exported.x||""),"base64url");
  const yy=Buffer.from(String(exported.y||""),"base64url");
  const raw=Buffer.concat([Buffer.from([4]),xx,yy]);
  try{
    // Known secp256k1 private-key-1 address from the V1 proof.
    return "0x7e5f4552091a69125d5dfcb7b8c2659029395bdf";
  }finally{
    xx.fill(0); yy.fill(0); raw.fill(0);
  }
})();

const body={
  marker:"VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V1",
  version:1,
  status:"EPOCH2_INSTALLED_CREDENTIAL_SIGNING_CAPABILITY_GREEN",
  source_head:sourceHead,
  source_tree:sourceTree,
  source_branch:"main",
  sealed_probe_git_blob:"d".repeat(40),
  credential_source_binding_id:EXPECTED_SOURCE_BINDING_ID,
  credential_id:credentialId,
  immutable_fulfiller:testAddress,
  systemd:{
    service:"void-node-live.service",
    main_pid:mainPid,
    invocation_id:invocation,
    loadcredential_binding_sha256:sha256(Buffer.from(loadBinding,"utf8")),
    credentials_directory_sha256:sha256(
      Buffer.from("/run/user/1000/credentials/void-node-live.service","utf8")
    ),
    main_pid_cgroup_sha256:sha256(Buffer.from(cgroupLine,"utf8")),
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
body.challenge.signature_sha256=sha256(signature);
body.challenge.public_signature_p1363_hex=signature.toString("hex");
const record={
  ...body,
  evidence_id:"voide2sealed1_"+sha256(Buffer.from(JSON.stringify(body),"utf8")),
};

function qualification(){
  return {
    marker:EXPECTED_QUALIFIER_MARKER,
    version:1,
    read_only:true,
    root_execution_required:true,
    credential_lock_id:EXPECTED_CREDENTIAL_LOCK_ID,
    credential_installed_pair_verified:true,
    credential_installed_generation_stable:true,
    credential_query_preexec_path_verified:true,
    double_credential_query_stable:true,
    credential_metadata_same_generation_as_v6_security:true,
    v6_security_qualification_composed:true,
    credential_contents_read:false,
    native_output_sha256_first:"sha256:"+"3".repeat(64),
    native_output_sha256_second:"sha256:"+"3".repeat(64),
    runtime_uid:runtimeUid,
    manager_pid:2693,
    manager_start_ticks:"1409",
    main_pid:mainPid,
    service_start_ticks:"998877",
    fragment_path:"/home/zoso/dev/void-node/void-node-live.service",
    dropin_path_count:2,
    credential_dropin_path:
      "/home/zoso/.config/systemd/user/void-node-live.service.d/"+
      "97-buy-void-epoch2-fulfiller-credential-v1.conf",
    credential_source:credentialSource,
    dropin_paths_canonical_bytes:256,
    load_credential_count:1,
    load_credential_id:credentialId,
    v6_kernel_cap_last_cap:40,
    v6_kernel_supported_capability_mask:"000001ffffffffff",
    v6_capability_bounding_set:"000001ffffffffff",
    v6_kernel_cap_bnd:"000001ffffffffff",
    query_execution:true,
    host_mutation:false,
    filesystem_write:false,
    service_mutation:false,
    systemd_mutation:false,
    external_network_calls:false,
    private_key_access:false,
    wallet_or_signer_access:false,
    request_or_payment_contents_read:false,
    payment_acceptance:false,
    public_presale_activation:false,
    transaction:false,
    funds_movement:false,
    production_host_evidence_authority:false,
    next_action:EXPECTED_QUALIFIER_NEXT_ACTION,
  };
}

const good=testOnlyClassifyEpoch2AuthenticatedCredentialPublicEvidenceV2(
  record,qualification(),testAddress
);
assert.equal(good.ok,true);
assert.equal(good.status,STATUS);
assert.equal(good.authenticated_private_manager_fields_crosschecked,true);
assert.equal(good.qualification_provenance_authenticated,false);
assert.equal(good.production_runtime_authority,false);
assert.equal(good.main_pid_crosscheck,true);
assert.equal(good.loadcredential_binding_crosscheck,true);
assert.equal(good.service_cgroup_hash_crosscheck,true);
assert.equal(good.public_user_bus_sufficient_authority,false);
assert.equal(good.active_signing_capability_cryptographically_verified,true);
assert.equal(good.live_payment_signing_authorized,false);
assert.equal(good.transaction_sign_or_broadcast_authorized,false);
assert.equal(good.public_presale_activation_authorized,false);
assert.equal(good.wc_void_market_activation_authorized,false);
assert.equal(good.funds_movement_authorized,false);
assert.equal(good.next_action,NEXT_ACTION);
assert.equal(isCompositeEvidenceIdV2(good.composite_evidence_id),true);
assert.equal(JSON.stringify(good).includes(credentialSource),false);

function hold(label,mutateQualification,mutateRecord=null){
  const q=structuredClone(qualification());
  const r=structuredClone(record);
  if(mutateQualification)mutateQualification(q);
  if(mutateRecord)mutateRecord(r);
  const out=testOnlyClassifyEpoch2AuthenticatedCredentialPublicEvidenceV2(
    r,q,testAddress
  );
  assert.equal(out.ok,false,label);
  assert.equal(out.status,"HOLD",label);
  assert.equal(out.qualification_provenance_authenticated,false,label);
  assert.equal(out.production_runtime_authority,false,label);
  assert.equal(out.live_payment_signing_authorized,false,label);
  assert.equal(out.transaction_sign_or_broadcast_authorized,false,label);
  assert.equal(out.public_presale_activation_authorized,false,label);
  assert.equal(out.funds_movement_authorized,false,label);
}

hold("main pid mismatch",q=>{q.main_pid+=1;});
hold("credential source mismatch",q=>{q.credential_source="/private/other.key";});
hold("cgroup generation mismatch",q=>{q.runtime_uid=1001;});
hold("unstable native transcript",q=>{
  q.native_output_sha256_second="sha256:"+"4".repeat(64);
});
hold("credential lock mismatch",q=>{q.credential_lock_id="wrong";});
hold("payment authority overclaim",q=>{q.payment_acceptance=true;});
hold("credential content read overclaim",q=>{q.credential_contents_read=true;});
hold("bad capability projection",q=>{q.v6_kernel_cap_bnd="000000ffffffffff";});
hold("forged supported capability mask",q=>{
  q.v6_kernel_cap_last_cap=0;
  q.v6_kernel_supported_capability_mask="ffffffffffffffff";
  q.v6_capability_bounding_set="0000000000000001";
  q.v6_kernel_cap_bnd="0000000000000001";
});
hold("bounding bits above kernel ceiling",q=>{
  q.v6_kernel_cap_last_cap=0;
  q.v6_kernel_supported_capability_mask="0000000000000001";
  q.v6_capability_bounding_set="0000000000000003";
  q.v6_kernel_cap_bnd="0000000000000003";
});
hold("sealed signature tamper",null,r=>{
  const sig=Buffer.from(r.challenge.public_signature_p1363_hex,"hex");
  sig[0]^=1;
  r.challenge.public_signature_p1363_hex=sig.toString("hex");
  r.challenge.signature_sha256=sha256(sig);
  const copy={...r}; delete copy.evidence_id;
  r.evidence_id="voide2sealed1_"+sha256(Buffer.from(JSON.stringify(copy),"utf8"));
  sig.fill(0);
});

message.fill(0);
signature.fill(0);
spki.fill(0);
x.fill(0);
y.fill(0);
uncompressed.fill(0);
privateKey.fill(0);

console.log("VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_PUBLIC_EVIDENCE_V2_PROOF_GREEN");
console.log("sealed_public_signature_verified=true");
console.log("authenticated_private_manager_fields_crosschecked=true");
console.log("qualification_provenance_authenticated=false");
console.log("production_runtime_authority=false");
console.log("main_pid_crosscheck=true");
console.log("loadcredential_binding_crosscheck=true");
console.log("service_cgroup_hash_crosscheck=true");
console.log("cap_last_cap_projection_revalidated=true");
console.log("above_kernel_capability_bits_rejected=true");
console.log("public_user_bus_sufficient_authority=false");
console.log("credential_source_reemitted=false");
console.log("credential_contents_read_by_composer=false");
console.log("live_payment_signing_authorized=false");
console.log("transaction_sign_or_broadcast_authorized=false");
console.log("public_presale_activation_authorized=false");
console.log("wc_void_market_activation_authorized=false");
console.log("funds_movement_authorized=false");
console.log("next_action="+NEXT_ACTION);
