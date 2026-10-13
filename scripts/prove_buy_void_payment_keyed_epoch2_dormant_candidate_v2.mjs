#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

import {
  EVIDENCE_ID_SHA256,EVIDENCE_PATH,
  classifyEpoch2SignerControlPublicEvidenceV1,
} from "../tools/void-buy-void-epoch2-signer-control-public-evidence-v1.mjs";

const V1="ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v1.json";
const V2="ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v2.json";
const V1_BLOB="2c861c021192c034c98404989cd25b26788cd0f0";
const MESSAGE_SHA="0492a0ae6b2a3fcbd18c907dc2a847b7f16be07ac49840a420182342b4017dad";
const SOURCE_HEAD="5bc76c0c1410f8db2f3e759a94a2a3184ab800de";
const SOURCE_TREE="118fa8680937d88db1e8a83a393408123e01f03c";
const FULFILLER="0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";
const PRESALE="0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce";

const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const git=args=>execFileSync("git",args,{
  encoding:"utf8",timeout:7000,maxBuffer:1_000_000,
  stdio:["ignore","pipe","pipe"],
}).trim();
const canonical=v=>{
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number")return String(v);
  if(Array.isArray(v))return"["+v.map(canonical).join(",")+"]";
  return"{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
};
const exact=(a,b)=>canonical(a)===canonical(b);
const v1=read(V1), v2=read(V2), evidence=read(EVIDENCE_PATH);
assert.equal(git(["hash-object",V1]),V1_BLOB);
assert.equal(git(["rev-parse","HEAD:"+V1]),V1_BLOB);
const evidenceDecision=classifyEpoch2SignerControlPublicEvidenceV1(evidence);
assert.equal(evidenceDecision.ok,true);
assert.equal(evidenceDecision.evidence_id_sha256,EVIDENCE_ID_SHA256);

function qualified(value){
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const expectedTop=[
    "authority","candidate_configuration","canonical_chain_id",
    "epoch2_fulfiller_public_address","epoch2_presale_contract",
    "execution_epoch","explicit_remaining_gates","marker",
    "predecessor_candidate_git_blob_sha1","predecessor_candidate_path",
    "selected_production_target_path","signer_credential_state","status","version",
  ].sort();
  if(JSON.stringify(Object.keys(value).sort())!==JSON.stringify(expectedTop))return false;
  if(value.marker!=="VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V2"||
     value.version!==2||
     value.status!=="EPOCH2_SOURCE_CANDIDATE_SIGNER_CONTROL_PROVEN_CREDENTIAL_AND_ACTIVATION_HOLD"||
     value.canonical_chain_id!==2050||value.execution_epoch!==2||
     value.predecessor_candidate_path!==V1||
     value.predecessor_candidate_git_blob_sha1!==V1_BLOB||
     value.selected_production_target_path!==v1.selected_production_target_path||
     value.epoch2_presale_contract!==PRESALE||
     value.epoch2_fulfiller_public_address!==FULFILLER)return false;
  if(!exact(value.candidate_configuration,v1.candidate_configuration))return false;
  const s=value.signer_credential_state;
  const signerKeys=[
    "credential_path_selected","epoch2_credential_binding_evidence_id",
    "legacy_wallet_credential_reuse_authorized","private_key_material_read",
    "signer_control_evidence_id_sha256","signer_control_evidence_path",
    "signer_control_message_sha256","signer_control_source_head",
    "signer_control_source_tree","signer_offchain_control_proven",
    "systemd_credential_identity_proven",
  ].sort();
  if(!s||JSON.stringify(Object.keys(s).sort())!==JSON.stringify(signerKeys))return false;
  if(s.signer_offchain_control_proven!==true||
     s.signer_control_evidence_path!==EVIDENCE_PATH||
     s.signer_control_evidence_id_sha256!==EVIDENCE_ID_SHA256||
     s.signer_control_message_sha256!==MESSAGE_SHA||
     s.signer_control_source_head!==SOURCE_HEAD||
     s.signer_control_source_tree!==SOURCE_TREE||
     s.systemd_credential_identity_proven!==false||
     s.epoch2_credential_binding_evidence_id!==null||
     s.legacy_wallet_credential_reuse_authorized!==false||
     s.credential_path_selected!==false||
     s.private_key_material_read!==false)return false;
  if(!exact(value.authority,v1.authority))return false;
  const expectedGates=v1.explicit_remaining_gates.slice(1);
  if(!exact(value.explicit_remaining_gates,expectedGates))return false;
  if(value.explicit_remaining_gates.includes(
    "prove_launch_operator_signer_controls_exact_immutable_epoch2_fulfiller"
  ))return false;
  if(!value.explicit_remaining_gates.includes(
    "independently_attest_systemd_credential_identity_and_active_signing_capability"
  ))return false;
  return evidenceDecision.ok===true;
}

assert.equal(qualified(v2),true);
assert.equal(v2.explicit_remaining_gates.length,5);
assert.equal(v2.authority.candidate_only,true);
for(const [key,val] of Object.entries(v2.authority)){
  if(key!=="candidate_only")assert.equal(val,false,key);
}

const bad=(name,change)=>{
  const altered=structuredClone(v2);
  change(altered);
  assert.equal(qualified(altered),false,name);
};
bad("evidence_id_tamper",x=>{x.signer_credential_state.signer_control_evidence_id_sha256="f".repeat(64);});
bad("evidence_path_tamper",x=>{x.signer_credential_state.signer_control_evidence_path="/tmp/unreviewed";});
bad("source_head_tamper",x=>{x.signer_credential_state.signer_control_source_head="f".repeat(40);});
bad("credential_overclaim",x=>{x.signer_credential_state.systemd_credential_identity_proven=true;});
bad("credential_evidence_overclaim",x=>{x.signer_credential_state.epoch2_credential_binding_evidence_id="f".repeat(64);});
bad("credential_path_overclaim",x=>{x.signer_credential_state.credential_path_selected=true;});
bad("runtime_enable",x=>{x.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED="1";});
bad("apply_enable",x=>{x.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED="1";});
bad("activation_overclaim",x=>{x.authority.public_presale_activation=true;});
bad("remove_credential_gate",x=>{x.explicit_remaining_gates=x.explicit_remaining_gates.slice(1);});
bad("restore_completed_gate",x=>{x.explicit_remaining_gates.unshift(
  "prove_launch_operator_signer_controls_exact_immutable_epoch2_fulfiller"
);});
bad("unknown_top_level",x=>{x.unreviewed=true;});

console.log("VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V2_PROOF_GREEN");
console.log("predecessor_v1_git_blob_preserved=true");
console.log("candidate_configuration_unchanged_from_v1=true");
console.log("first_explicit_gate_closed=true");
console.log("signer_offchain_control_proven=true");
console.log("signer_control_evidence_id_sha256="+EVIDENCE_ID_SHA256);
console.log("remaining_gate_count=5");
console.log("systemd_credential_identity_proven=false");
console.log("runtime_source_binding_proven=false");
console.log("runtime_credential_installed_verified=false");
console.log("operational_configuration_selected=false");
console.log("live_payment_signing_authorized=false");
console.log("transaction_sign_or_broadcast=false");
console.log("public_presale_activation=false");
console.log("wc_void_market_activation=false");
console.log("funds_movement=false");
