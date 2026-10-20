// Fixture-only, never uses owner keys or protected host resources.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  buildBuyVoidAllocationCustodySecondControlApprovalIdV2,
} from "../tools/void-buy-allocation-custody-rollback-controller-candidate-v2.mjs";
import {
  MARKER,SIGNING_DOMAIN,CONTROLLER_GIT_BLOB_SHA1,SOURCE_ONLY_AUTHORITY,
  buildBuyVoidCustodySecondControlSigningPayloadV1,
  verifyBuyVoidCustodySecondControlSignatureV1,
} from "../tools/void-buy-allocation-custody-second-control-signature-verifier-v1.mjs";

const ROOT=new URL("../",import.meta.url);
function gitBlob(bytes){
  return crypto.createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
}
function pin(rel,sha){
  const bytes=fs.readFileSync(new URL(rel,ROOT));
  assert.equal(gitBlob(bytes),sha,rel);
  return bytes.toString("utf8");
}
const SELF=pin("tools/void-buy-allocation-custody-second-control-signature-verifier-v1.mjs",
  "72c9c451eb8d949b61a159fc9ffa4753b0bb895a");
pin("tools/void-buy-allocation-custody-rollback-controller-candidate-v2.mjs",
  "7a42e1863f3f4d842dd59060b366901adb402848");
pin("ops/security/buy-void-presale-custody-durability-rollback-challenge-plan-v2.json",
  "1cdecf34117e4e890f67e62b412419d32870dfa0");
assert.equal(CONTROLLER_GIT_BLOB_SHA1,"7a42e1863f3f4d842dd59060b366901adb402848");
assert.equal(MARKER,"VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_ED25519_VERIFIER_V1");
assert.equal(SIGNING_DOMAIN,"VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_APPROVAL_ED25519_V1");
assert(!SELF.includes("crypto.sign("));
for(const forbidden of [
  'from "node:fs"','from "node:child_process"','from "node:net"',
  'from "node:http"','from "node:https"','/var/lib/','/opt/',
  'systemctl','spawn(','execFile(',
])assert.equal(SELF.includes(forbidden),false,forbidden);
for(const [key,value] of Object.entries(SOURCE_ONLY_AUTHORITY)){
  const allow=key==="pure_detached_signature_verifier"||key==="source_only_candidate";
  assert.equal(value,allow,key);
}

function hash(x){return "sha256:"+crypto.createHash("sha256").update(x).digest("hex");}
const h=x=>hash(Buffer.from(x,"utf8"));
const body={
  marker:"VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_APPROVAL_V2",
  version:2,
  plan_id:"voidbuycustodychallengeplan2_622c5cab506b8424860a484e6675f73031a26635c0ef29a80aee2281f53f0844",
  authorization_id:"voidbuycustodychallengeauth2_"+"1".repeat(64),
  operation_id:"voidbuycustodychallengeop2_"+"2".repeat(64),
  authorization_claim_id:"voidbuycustodychallengeclaim2_"+"3".repeat(64),
  challenge_id:"voidbuycustodychallenge2_"+"4".repeat(64),
  operation_lease_id:"voidbuycustodyoperationlease2_"+"5".repeat(64),
  host_id:"precision-synthetic-only",
  rollback_target_journal_tip_sha256:h("prior-fixture-journal"),
  protected_high_water_sha256:h("synthetic-high-water"),
  external_witness_sequence:12,
  external_witness_tip_sha256:h("synthetic-witness"),
};
const approvalId=buildBuyVoidAllocationCustodySecondControlApprovalIdV2(body);
assert.match(approvalId,/^voidbuycustodysecondcontrol2_[0-9a-f]{64}$/u);

// Ephemeral in-memory test-only keys, never written to disk, uploaded, or
// confused with the user's existing Nimo/Precision signing authorities.
const approver=crypto.generateKeyPairSync("ed25519");
const operator=crypto.generateKeyPairSync("ed25519");
const rogue=crypto.generateKeyPairSync("ed25519");
const spki=approver.publicKey.export({format:"der",type:"spki"});
const opSpki=operator.publicKey.export({format:"der",type:"spki"});
const rogueSpki=rogue.publicKey.export({format:"der",type:"spki"});
const declaredPolicy={
  marker:"VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_KEY_POLICY_V1",
  version:1,
  allowed_approver_spki_sha256:hash(spki),
  operator_spki_sha256:hash(opSpki),
};
const msg=buildBuyVoidCustodySecondControlSigningPayloadV1({
  approval_body:body,approval_id:approvalId,
});
assert(msg.subarray(0,SIGNING_DOMAIN.length+1).equals(Buffer.from(SIGNING_DOMAIN+"\0","ascii")));
assert(msg.includes(Buffer.from("7a42e1863f3f4d842dd59060b366901adb402848")));
const signature=crypto.sign(null,msg,approver.privateKey);
assert.equal(signature.length,64);
const attestation={
  marker:"VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_ATTESTATION_V1",
  version:1,
  approval_id:approvalId,
  approver_public_key_spki_der_b64:spki.toString("base64"),
  signature_ed25519_b64:signature.toString("base64"),
};
const input={approval_body:body,approval_id:approvalId,attestation,declared_key_policy:declaredPolicy};
const verified=verifyBuyVoidCustodySecondControlSignatureV1(input);
assert.equal(verified.marker,MARKER);
assert.equal(verified.signature_cryptographically_verified,true);
assert.equal(verified.approval_id,approvalId);
assert.equal(verified.signed_message_sha256,hash(msg));
assert.equal(verified.declared_approver_spki_sha256,hash(spki));
assert.equal(verified.declaration_of_distinct_operator_key,true);
for(const [key,value] of Object.entries(verified)){
  if(["marker","approval_id","signed_message_sha256","declared_approver_spki_sha256"].includes(key))continue;
  if(["signature_cryptographically_verified","declaration_of_distinct_operator_key"].includes(key))continue;
  assert.equal(value,false,key);
}
function fail(name,call,pattern){
  assert.throws(call,pattern,name);
}
const cases={
  changed_signature:()=>{
    const mutated=Buffer.from(signature);mutated[0]^=1;
    return {...input,attestation:{...attestation,signature_ed25519_b64:mutated.toString("base64")}};
  },
  different_signer_signature:()=>({
    ...input,attestation:{...attestation,
      signature_ed25519_b64:crypto.sign(null,msg,rogue.privateKey).toString("base64")},
  }),
  different_signer_key:()=>({
    ...input,attestation:{...attestation,
      approver_public_key_spki_der_b64:rogueSpki.toString("base64")},
  }),
};
fail("changed_signature",()=>verifyBuyVoidCustodySecondControlSignatureV1(cases.changed_signature()),
  /second_control_signature_verification_failed/);
fail("different_signer_signature",()=>verifyBuyVoidCustodySecondControlSignatureV1(cases.different_signer_signature()),
  /second_control_signature_verification_failed/);
fail("different_signer_key",()=>verifyBuyVoidCustodySecondControlSignatureV1(cases.different_signer_key()),
  /second_control_approver_key_pin_mismatch/);
fail("approver_operator_same_pin",()=>verifyBuyVoidCustodySecondControlSignatureV1({
  ...input,declared_key_policy:{...declaredPolicy,operator_spki_sha256:hash(spki)},
}),/second_control_approver_operator_key_collision/);
fail("wrong_approver_pin",()=>verifyBuyVoidCustodySecondControlSignatureV1({
  ...input,declared_key_policy:{...declaredPolicy,allowed_approver_spki_sha256:hash(rogueSpki)},
}),/second_control_approver_key_pin_mismatch/);
fail("altered_attestation_id",()=>verifyBuyVoidCustodySecondControlSignatureV1({
  ...input,attestation:{...attestation,approval_id:"voidbuycustodysecondcontrol2_"+"a".repeat(64)},
}),/second_control_attestation_approval_id_mismatch/);
fail("truncated_signature",()=>verifyBuyVoidCustodySecondControlSignatureV1({
  ...input,attestation:{...attestation,signature_ed25519_b64:signature.subarray(0,63).toString("base64")},
}),/second_control_signature_length_invalid/);
fail("noncanonical_signature_base64",()=>verifyBuyVoidCustodySecondControlSignatureV1({
  ...input,attestation:{...attestation,signature_ed25519_b64:signature.toString("base64")+"\n"},
}),/second_control_signature_base64_invalid/);
const invalidOid=Buffer.from(spki);invalidOid[8]^=1;
fail("invalid_spki_oid",()=>verifyBuyVoidCustodySecondControlSignatureV1({
  ...input,attestation:{...attestation,approver_public_key_spki_der_b64:invalidOid.toString("base64")},
}),/second_control_public_key_algorithm_invalid/);
fail("wrong_domain_marker",()=>verifyBuyVoidCustodySecondControlSignatureV1({
  ...input,attestation:{...attestation,marker:"VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_ATTESTATION_V2"},
}),/second_control_attestation_domain_invalid/);
fail("wrong_policy_marker",()=>verifyBuyVoidCustodySecondControlSignatureV1({
  ...input,declared_key_policy:{...declaredPolicy,marker:"unaccepted-policy"},
}),/second_control_key_policy_domain_invalid/);
fail("foreign_approval_id",()=>verifyBuyVoidCustodySecondControlSignatureV1({
  ...input,approval_id:"voidbuycustodysecondcontrol2_"+"b".repeat(64),
}),/second_control_attestation_approval_id_mismatch/);
fail("proxy_attestation",()=>verifyBuyVoidCustodySecondControlSignatureV1({
  ...input,attestation:new Proxy(attestation,{}),
}),/second_control_attestation_shape_invalid/);
let accessed=false;
const getterAtt={...attestation};
Object.defineProperty(getterAtt,"signature_ed25519_b64",{
  enumerable:true,get(){accessed=true;throw new Error("getter_invoked");},
});
fail("getter_not_called",()=>verifyBuyVoidCustodySecondControlSignatureV1({
  ...input,attestation:getterAtt,
}),/second_control_attestation_shape_invalid/);
assert.equal(accessed,false);

const foreign={
  operation_id:"voidbuycustodychallengeop2_"+"e".repeat(64),
  authorization_id:"voidbuycustodychallengeauth2_"+"f".repeat(64),
  authorization_claim_id:"voidbuycustodychallengeclaim2_"+"e".repeat(64),
  challenge_id:"voidbuycustodychallenge2_"+"e".repeat(64),
  operation_lease_id:"voidbuycustodyoperationlease2_"+"e".repeat(64),
  host_id:"other-host-fixture",
  rollback_target_journal_tip_sha256:h("other-rollback"),
  protected_high_water_sha256:h("other-highwater"),
  external_witness_sequence:13,
  external_witness_tip_sha256:h("other-witness"),
};
for(const [field,changed] of Object.entries(foreign)){
  const otherBody={...body,[field]:changed};
  const otherId=buildBuyVoidAllocationCustodySecondControlApprovalIdV2(otherBody);
  assert.notEqual(otherId,approvalId,field);
  // An otherwise correctly structured attestation with the original
  // signature cannot be replayed against another contextual approval ID.
  fail("foreign signed context: "+field,()=>verifyBuyVoidCustodySecondControlSignatureV1({
    approval_body:otherBody,approval_id:otherId,
    attestation:{...attestation,approval_id:otherId},
    declared_key_policy:declaredPolicy,
  }),/second_control_signature_verification_failed/);
}
// Deliberate proof of limits: another untrusted caller can introduce a new
// key+policy and make a VALID signature. The verdict must STILL deny
// trusted-root and independent-principal authority regardless.
const inventedPinPolicy={
  ...declaredPolicy,allowed_approver_spki_sha256:hash(rogueSpki),
};
const rogueAccepted=verifyBuyVoidCustodySecondControlSignatureV1({
  ...input,attestation:{...attestation,
    approver_public_key_spki_der_b64:rogueSpki.toString("base64"),
    signature_ed25519_b64:crypto.sign(null,msg,rogue.privateKey).toString("base64"),
  },declared_key_policy:inventedPinPolicy,
});
assert.equal(rogueAccepted.signature_cryptographically_verified,true);
assert.equal(rogueAccepted.caller_key_pin_independently_authenticated,false);
assert.equal(rogueAccepted.distinct_approving_principal_authenticated,false);
assert.equal(rogueAccepted.approved_second_control_proven,false);
assert.equal(rogueAccepted.host_execution_authorized,false);

console.log("VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_SIGNATURE_VERIFIER_V1_PROOF_GREEN");
console.log("source_only=true");
console.log("fixture_ephemeral_keypairs_used=true");
console.log("user_private_key_access=false");
console.log("canonical_V2_approval_id_bound=true");
console.log("ed25519_detached_signature_verified=true");
console.log("foreign_context_signature_replay_rejected=10");
console.log("declared_key_pin_mismatch_rejected=true");
console.log("same_operator_key_pin_rejected=true");
console.log("proxy_and_accessor_callback_data_rejected=true");
console.log("key_policy_self_assertion_does_not_grant_trust=true");
console.log("trusted_approver_origin_proven=false");
console.log("second_control_authorized=false");
console.log("protected_host_adapter_required=true");
console.log("payment_acceptance_authorized=false");
console.log("public_presale_activation_authorized=false");
console.log("funds_movement=false");
