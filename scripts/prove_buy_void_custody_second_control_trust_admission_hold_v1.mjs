// Synthetic-only trust-admission HOLD proof. Never uses real signing keys.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  MARKER,VERIFIER_GIT_BLOB_SHA1,V2_CONTROLLER_GIT_BLOB_SHA1,
  UNCONFIGURED_ACCEPTED_TRUST_POLICY_V1,SOURCE_ONLY_AUTHORITY,
  assessBuyVoidCustodySecondControlTrustAdmissionHoldV1,
} from "../tools/void-buy-custody-second-control-trust-admission-hold-v1.mjs";
import {
  buildBuyVoidCustodySecondControlSigningPayloadV1,
  verifyBuyVoidCustodySecondControlSignatureV1,
} from "../tools/void-buy-allocation-custody-second-control-signature-verifier-v1.mjs";
import {
  buildBuyVoidAllocationCustodySecondControlApprovalIdV2,
} from "../tools/void-buy-allocation-custody-rollback-controller-candidate-v2.mjs";

const ROOT=new URL("../",import.meta.url);
const WORKFLOW_PATH=".github/workflows/buy-void-custody-second-control-trust-admission-hold-v1.yml";
const expectedBlobs={
  "tools/void-buy-custody-second-control-trust-admission-hold-v1.mjs":
    "f07701e5f89f82fbe5e97b0df1bc91deee7a9ea7",
  "tools/void-buy-allocation-custody-second-control-signature-verifier-v1.mjs":
    "72c9c451eb8d949b61a159fc9ffa4753b0bb895a",
  "tools/void-buy-allocation-custody-rollback-controller-candidate-v2.mjs":
    "7a42e1863f3f4d842dd59060b366901adb402848",
  "ops/security/buy-void-presale-custody-durability-rollback-challenge-plan-v2.json":
    "1cdecf34117e4e890f67e62b412419d32870dfa0",
};
const gitBlob=bytes=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
  .update(bytes).digest("hex");
for(const [path,hash] of Object.entries(expectedBlobs)){
  const bytes=fs.readFileSync(new URL(path,ROOT));
  assert.equal(gitBlob(bytes),hash,path);
}
const workflowSource=fs.readFileSync(new URL(WORKFLOW_PATH,ROOT),"utf8");
const pullStart=workflowSource.indexOf("  pull_request:\n");
const pushStart=workflowSource.indexOf("  push:\n");
const permissionsStart=workflowSource.indexOf("permissions:\n");
assert.ok(pullStart>=0&&pushStart>pullStart&&permissionsStart>pushStart,
  "workflow_trigger_sections_missing");
const pullBlock=workflowSource.slice(pullStart,pushStart);
const pushBlock=workflowSource.slice(pushStart,permissionsStart);
for(const path of Object.keys(expectedBlobs)){
  const triggerLine='      - "'+path+'"';
  assert.equal(pullBlock.includes(triggerLine),true,
    "pull_request_trigger_missing:"+path);
  assert.equal(pushBlock.includes(triggerLine),true,
    "push_trigger_missing:"+path);
}
assert.equal(VERIFIER_GIT_BLOB_SHA1,
  expectedBlobs["tools/void-buy-allocation-custody-second-control-signature-verifier-v1.mjs"]);
assert.equal(V2_CONTROLLER_GIT_BLOB_SHA1,
  expectedBlobs["tools/void-buy-allocation-custody-rollback-controller-candidate-v2.mjs"]);
assert.equal(MARKER,
  "VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_TRUST_ADMISSION_HOLD_V1");
const policy=UNCONFIGURED_ACCEPTED_TRUST_POLICY_V1;
assert.equal(Object.isFrozen(policy),true);
assert.equal(policy.trust_root_status,"UNCONFIGURED");
assert.equal(policy.accepted_trust_root_generation,null);
assert.equal(policy.accepted_approver_spki_sha256,null);
assert.equal(policy.approval_acceptance_enabled,false);
for(const [key,value] of Object.entries(policy)){
  if(typeof value==="boolean")assert.equal(value,false,key);
}
const authorizedTrue=new Set(["source_only_hold_classifier","current_trust_root_unconfigured"]);
for(const [key,value] of Object.entries(SOURCE_ONLY_AUTHORITY)){
  assert.equal(value,authorizedTrue.has(key),key);
}

const sha=value=>"sha256:"+crypto.createHash("sha256").update(value).digest("hex");
const body={
  marker:"VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_APPROVAL_V2",version:2,
  plan_id:"voidbuycustodychallengeplan2_622c5cab506b8424860a484e6675f73031a26635c0ef29a80aee2281f53f0844",
  authorization_id:"voidbuycustodychallengeauth2_"+"a".repeat(64),
  operation_id:"voidbuycustodychallengeop2_"+"b".repeat(64),
  authorization_claim_id:"voidbuycustodychallengeclaim2_"+"c".repeat(64),
  challenge_id:"voidbuycustodychallenge2_"+"d".repeat(64),
  operation_lease_id:"voidbuycustodyoperationlease2_"+"e".repeat(64),
  host_id:"synthetic-host-not-production",
  rollback_target_journal_tip_sha256:sha("journal-synthetic"),
  protected_high_water_sha256:sha("highwater-synthetic"),
  external_witness_sequence:12,
  external_witness_tip_sha256:sha("witness-synthetic"),
};
const approvalId=buildBuyVoidAllocationCustodySecondControlApprovalIdV2(body);
const message=buildBuyVoidCustodySecondControlSigningPayloadV1({
  approval_body:body,approval_id:approvalId,
});
// Ephemeral synthetic signing proves mathematical validity cannot bootstrap
// an unaccepted key-policy root into independent approval authority.
const signer=crypto.generateKeyPairSync("ed25519");
const operator=crypto.generateKeyPairSync("ed25519");
const signerSpki=signer.publicKey.export({format:"der",type:"spki"});
const operatorSpki=operator.publicKey.export({format:"der",type:"spki"});
const verification=verifyBuyVoidCustodySecondControlSignatureV1({
  approval_body:body,approval_id:approvalId,
  attestation:{
    marker:"VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_ATTESTATION_V1",
    version:1,
    approval_id:approvalId,
    approver_public_key_spki_der_b64:signerSpki.toString("base64"),
    signature_ed25519_b64:crypto.sign(null,message,signer.privateKey).toString("base64"),
  },
  declared_key_policy:{
    marker:"VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_KEY_POLICY_V1",
    version:1,
    allowed_approver_spki_sha256:sha(signerSpki),
    operator_spki_sha256:sha(operatorSpki),
  },
});
assert.equal(verification.signature_cryptographically_verified,true);
assert.equal(verification.caller_key_pin_independently_authenticated,false);
assert.equal(verification.approved_second_control_proven,false);
const verdict=assessBuyVoidCustodySecondControlTrustAdmissionHoldV1({verification});
assert.equal(Object.isFrozen(verdict),true);
assert.equal(verdict.marker,MARKER);
assert.equal(verdict.status,"HOLD");
assert.equal(verdict.reason,"independently_accepted_approver_root_unconfigured");
assert.equal(verdict.checked_approval_id,approvalId);
assert.equal(verdict.mathematical_signature_verification_reported,true);
for(const [k,v] of Object.entries(verdict)){
  if(typeof v==="boolean"&&k!=="mathematical_signature_verification_reported")
    assert.equal(v,false,k);
}
const reject=(name,arg,re)=>assert.throws(
  ()=>assessBuyVoidCustodySecondControlTrustAdmissionHoldV1(arg),
  re,name,
);
reject("signature math unverified",{
  verification:{...verification,signature_cryptographically_verified:false},
},/second_control_trust_admission_signature_math_not_verified/);
reject("unrecognized verifier marker",{
  verification:{...verification,marker:"VOID_FAKE_VERIFIER"},
},/second_control_trust_admission_verifier_domain_invalid/);
reject("invalid approval id",{
  verification:{...verification,approval_id:"malformed"},
},/second_control_trust_admission_verification_identity_invalid/);
reject("false declaration of distinct key",{
  verification:{...verification,declaration_of_distinct_operator_key:false},
},/second_control_trust_admission_verification_identity_invalid/);
reject("extra key accepted as fake trust authorization",{
  verification:{...verification,externally_accepted_trust_root:"made-up-root"},
},/second_control_trust_admission_verification_shape_invalid/);
reject("client trying to supply accepted root",{
  verification, trusted_approver_pin:"sha256:"+"e".repeat(64),
},/second_control_trust_admission_input_invalid/);
for(const field of [
  "caller_key_pin_independently_authenticated",
  "distinct_approving_principal_authenticated",
  "replay_prevention_proven","approved_second_control_proven",
  "host_execution_authorized","storage_mutation_authorized",
  "rollback_test_authorized","payment_acceptance_authorized",
  "public_presale_activation_authorized",
  "wc_void_market_activation_authorized","funds_movement",
]){
  reject("unauthorized positive authority report "+field,{
    verification:{...verification,[field]:true},
  },new RegExp("second_control_trust_admission_unaccepted_positive_authority:"+field));
}
let getterExecuted=false;
const accessor={...verification};
Object.defineProperty(accessor,"approval_id",{
  enumerable:true,get(){getterExecuted=true;throw Error("getter-executed");},
});
reject("accessor must not execute",{
  verification:accessor,
},/second_control_trust_admission_verification_shape_invalid/);
assert.equal(getterExecuted,false);
reject("untrusted proxy record",{
  verification:new Proxy({...verification},{}),
},/second_control_trust_admission_verification_shape_invalid/);
const {proxy,revoke}=Proxy.revocable({},Object.create(null));
revoke();
reject("revoked proxy top-level",proxy,
  /second_control_trust_admission_input_invalid/);
// Simulate an attacker signing with their own key and declaring its own
// allowed approver pin: cryptographic success must still mean policy HOLD.
const attacker=crypto.generateKeyPairSync("ed25519");
const attackerSpki=attacker.publicKey.export({format:"der",type:"spki"});
const attackerVerification=verifyBuyVoidCustodySecondControlSignatureV1({
  approval_body:body,approval_id:approvalId,
  attestation:{
    marker:"VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_ATTESTATION_V1",
    version:1,approval_id:approvalId,
    approver_public_key_spki_der_b64:attackerSpki.toString("base64"),
    signature_ed25519_b64:crypto.sign(null,message,attacker.privateKey).toString("base64"),
  },
  declared_key_policy:{
    marker:"VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_KEY_POLICY_V1",
    version:1,allowed_approver_spki_sha256:sha(attackerSpki),
    operator_spki_sha256:sha(operatorSpki),
  },
});
assert.equal(attackerVerification.signature_cryptographically_verified,true);
assert.equal(assessBuyVoidCustodySecondControlTrustAdmissionHoldV1({
  verification:attackerVerification,
}).status,"HOLD");
console.log("VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_TRUST_ADMISSION_HOLD_V1_PROOF_GREEN");
console.log("ephemeral_synthetic_ed25519_keys_only=true");
console.log("verification_success_cannot_grant_approval=true");
console.log("self_declared_approver_key_cannot_be_accepted=true");
console.log("operator_pin_inequality_is_not_principal_separation=true");
console.log("fabricated_positive_authority_fields_rejected=true");
console.log("client_supplied_trust_root_rejected=true");
console.log("proxy_and_accessor_rejected_without_invocation=true");
console.log("trigger_dependency_closure_bound=true");
console.log("accepted_approver_root_configured=false");
console.log("trusted_clock_and_revocation_evidence=false");
console.log("authenticated_replay_and_lease_store=false");
console.log("approved_second_control_proven=false");
console.log("host_execution_authorized=false");
console.log("rollback_test_authorized=false");
console.log("public_presale_activation_authorized=false");
console.log("payment_acceptance_authorized=false");
console.log("funds_movement=false");
