#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const V3="ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v3.json";
const V4="ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v4.json";
const V3_BLOB="04061934a537a1d91213cdd1f9110b46faca4cc7";
const V4_BLOB="e569c9211e01f14c7c00dd1c5041d4dfb0817609";
const OLD_GATE=
  "qualify_live_zero_fee_envelope_and_exact_chain_receipt_or_prove_per_payment_native_gas_funding";
const NEW_GATE=
  "qualify_live_exact_chain_receipt_and_either_zero_fee_envelope_or_per_payment_native_gas_funding";

const gitBlob=(bytes)=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
  .update(bytes).digest("hex");

const canonical=(value)=>{
  if(value===null||typeof value==="boolean"||typeof value==="string"){
    return JSON.stringify(value);
  }
  if(typeof value==="number"){
    assert.ok(Number.isSafeInteger(value));
    return String(value);
  }
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  assert.ok(value&&typeof value==="object");
  return "{"+Object.keys(value).sort()
    .map((key)=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}";
};

const v3Bytes=fs.readFileSync(V3);
const v4Bytes=fs.readFileSync(V4);
assert.equal(gitBlob(v3Bytes),V3_BLOB);
assert.equal(gitBlob(v4Bytes),V4_BLOB);

const v3=JSON.parse(v3Bytes);
const v4=JSON.parse(v4Bytes);

assert.equal(v4.marker,"VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V4");
assert.equal(v4.version,4);
assert.equal(v4.status,v3.status);
assert.equal(v4.canonical_chain_id,v3.canonical_chain_id);
assert.equal(v4.execution_epoch,v3.execution_epoch);
assert.equal(v4.predecessor_candidate_path,V3);
assert.equal(v4.predecessor_candidate_git_blob_sha1,V3_BLOB);
assert.equal(v4.selected_production_target_path,v3.selected_production_target_path);
assert.equal(v4.epoch2_presale_contract,v3.epoch2_presale_contract);
assert.equal(v4.epoch2_fulfiller_public_address,v3.epoch2_fulfiller_public_address);
assert.equal(canonical(v4.candidate_configuration),canonical(v3.candidate_configuration));
assert.equal(canonical(v4.signer_credential_state),canonical(v3.signer_credential_state));
assert.equal(canonical(v4.authority),canonical(v3.authority));

const expectedGates=[...v3.explicit_remaining_gates];
const gateIndex=expectedGates.indexOf(OLD_GATE);
assert.notEqual(gateIndex,-1);
expectedGates[gateIndex]=NEW_GATE;
assert.equal(canonical(v4.explicit_remaining_gates),canonical(expectedGates));
assert.equal(v4.explicit_remaining_gates.includes(OLD_GATE),false);
assert.equal(v4.explicit_remaining_gates.includes(NEW_GATE),true);
assert.equal(v4.explicit_remaining_gates.length,v3.explicit_remaining_gates.length);

assert.equal(
  NEW_GATE.startsWith("qualify_live_exact_chain_receipt_and_"),
  true,
  "exact chain receipt must scope both fee branches",
);
assert.equal(
  NEW_GATE.endsWith("either_zero_fee_envelope_or_per_payment_native_gas_funding"),
  true,
  "fee branch must be explicit zero-fee OR per-payment native-gas funding",
);

assert.equal(v4.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED,"0");
assert.equal(v4.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED,"0");
assert.equal(v4.signer_credential_state.systemd_credential_identity_proven,false);
assert.equal(v4.signer_credential_state.private_key_material_read,false);
assert.equal(v4.authority.candidate_only,true);
for(const [key,value] of Object.entries(v4.authority)){
  if(key!=="candidate_only")assert.equal(value,false,key);
}

const bad=(label,mutate)=>{
  const value=JSON.parse(JSON.stringify(v4));
  mutate(value);
  let rejected=false;
  try{
    assert.equal(canonical(value.candidate_configuration),canonical(v3.candidate_configuration));
    assert.equal(canonical(value.signer_credential_state),canonical(v3.signer_credential_state));
    assert.equal(canonical(value.authority),canonical(v3.authority));
    assert.equal(canonical(value.explicit_remaining_gates),canonical(expectedGates));
  }catch(error){
    void error;
    rejected=true;
  }
  assert.equal(rejected,true,label);
};

bad("chain receipt branch can be bypassed",v=>{
  v.explicit_remaining_gates[gateIndex]=
    "qualify_live_zero_fee_envelope_and_exact_chain_receipt_or_prove_per_payment_native_gas_funding";
});
bad("chain receipt omitted",v=>{
  v.explicit_remaining_gates[gateIndex]=
    "qualify_live_either_zero_fee_envelope_or_per_payment_native_gas_funding";
});
bad("runtime enable",v=>{
  v.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED="1";
});
bad("activation overclaim",v=>{
  v.authority.public_presale_activation=true;
});

console.log("VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V4_PROOF_GREEN");
console.log("predecessor_v3_git_blob_bound=true");
console.log("candidate_configuration_unchanged=true");
console.log("signer_credential_state_unchanged=true");
console.log("authority_unchanged=true");
console.log("exact_chain_receipt_required_for_all_fee_branches=true");
console.log("zero_fee_branch_preserved=true");
console.log("per_payment_native_gas_funding_branch_preserved=true");
console.log("standing_balance_fee_authority=false");
console.log("runtime_enabled=false");
console.log("runtime_apply_enabled=false");
console.log("credential_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("public_presale_activation=false");
console.log("wc_void_market_activation=false");
console.log("funds_movement=false");
