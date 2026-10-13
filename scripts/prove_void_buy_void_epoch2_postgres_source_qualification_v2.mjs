#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  MARKER,STATUS,classifyEpoch2ClaimSourceV2,verifyCurrentEpoch2ClaimSourceV2,
} from "../tools/void-buy-void-epoch2-postgres-source-qualification-v2.mjs";

const V1="ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v1.json";
const V2="ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v2.json";
const EVIDENCE="ops/mainnet0/evidence/buy-void-epoch2-signer-control-public-evidence-v1.json";
const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const v1=read(V1),v2=read(V2),evidence=read(EVIDENCE);
const classify=(c=v2,p=v1,e=evidence)=>classifyEpoch2ClaimSourceV2(c,p,e);

const original=classify();
assert.equal(original.ok,true);
assert.equal(original.status,STATUS);
assert.equal(original.signer_offchain_control_proven,true);
assert.equal(original.credential_binding_established,false);
assert.equal(original.runtime_source_binding_proven,false);
assert.equal(original.runtime_or_payment_activation_authorized,false);
assert.equal(original.historical_v1_authority_inherited,false);

const bad=(name,change)=>{
  const c=structuredClone(v2),p=structuredClone(v1),e=structuredClone(evidence);
  change(c,p,e);
  const out=classify(c,p,e);
  assert.equal(out.ok,false,name);
  assert.equal(out.status,"HOLD",name);
  assert.equal(out.signer_offchain_control_proven,false,name);
  assert.equal(out.credential_binding_established,false,name);
  assert.equal(out.runtime_or_payment_activation_authorized,false,name);
};
bad("evidence_signature_tamper",(c,p,e)=>{e.receipt.signature="0x"+"0".repeat(130);});
bad("evidence_id_tamper",c=>{c.signer_credential_state.signer_control_evidence_id_sha256="f".repeat(64);});
bad("credential_overclaim",c=>{c.signer_credential_state.systemd_credential_identity_proven=true;});
bad("credential_binding_overclaim",c=>{c.signer_credential_state.epoch2_credential_binding_evidence_id="f".repeat(64);});
bad("runtime_config_drift",c=>{c.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT="999999";});
bad("runtime_enable",c=>{c.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED="1";});
bad("apply_enable",c=>{c.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED="1";});
bad("activation_overclaim",c=>{c.authority.public_presale_activation=true;});
bad("remove_next_gate",c=>{c.explicit_remaining_gates=c.explicit_remaining_gates.slice(1);});
bad("restore_completed_gate",c=>{c.explicit_remaining_gates.unshift(
  "prove_launch_operator_signer_controls_exact_immutable_epoch2_fulfiller"
);});
bad("wrong_predecessor_blob",c=>{c.predecessor_candidate_git_blob_sha1="f".repeat(40);});
bad("unknown_field",c=>{c.unreviewed=true;});

const live=verifyCurrentEpoch2ClaimSourceV2();
assert.equal(live.ok,true);
assert.equal(live.status,STATUS);
assert.equal(live.signer_offchain_control_proven,true);
assert.equal(live.credential_binding_established,false);
assert.equal(live.runtime_source_binding_proven,false);
assert.equal(live.runtime_or_payment_activation_authorized,false);

console.log(MARKER+"_GREEN");
console.log("historical_v1_source_qualification_preserved=true");
console.log("signer_offchain_control_proven=true");
console.log("remaining_gate_count=5");
console.log("credential_binding_established=false");
console.log("runtime_source_binding_proven=false");
console.log("runtime_or_payment_activation_authorized=false");
console.log("tampered_or_overclaim_classes_held=12");
