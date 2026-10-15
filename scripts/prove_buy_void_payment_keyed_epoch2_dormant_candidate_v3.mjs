#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const V2="ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v2.json";
const V3="ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v3.json";
const V2_BLOB="6a0159e516d30ca8a4b9af4dcace79a4fcddfbb1";
const V3_BLOB="04061934a537a1d91213cdd1f9110b46faca4cc7";
const OLD_GATE="qualify_live_zero_fee_or_nonzero_fee_envelope_and_exact_chain_receipt";
const NEW_GATE="qualify_live_zero_fee_envelope_and_exact_chain_receipt_or_prove_per_payment_native_gas_funding";

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

const v2Bytes=fs.readFileSync(V2);
const v3Bytes=fs.readFileSync(V3);
assert.equal(gitBlob(v2Bytes),V2_BLOB);
assert.equal(gitBlob(v3Bytes),V3_BLOB);
const v2=JSON.parse(v2Bytes);
const v3=JSON.parse(v3Bytes);

assert.equal(v3.marker,"VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V3");
assert.equal(v3.version,3);
assert.equal(v3.status,v2.status);
assert.equal(v3.canonical_chain_id,2050);
assert.equal(v3.execution_epoch,2);
assert.equal(v3.predecessor_candidate_path,V2);
assert.equal(v3.predecessor_candidate_git_blob_sha1,V2_BLOB);
assert.equal(v3.selected_production_target_path,v2.selected_production_target_path);
assert.equal(v3.epoch2_presale_contract,v2.epoch2_presale_contract);
assert.equal(v3.epoch2_fulfiller_public_address,v2.epoch2_fulfiller_public_address);
assert.equal(canonical(v3.candidate_configuration),canonical(v2.candidate_configuration));
assert.equal(canonical(v3.signer_credential_state),canonical(v2.signer_credential_state));
assert.equal(canonical(v3.authority),canonical(v2.authority));

const expectedGates=[...v2.explicit_remaining_gates];
const index=expectedGates.indexOf(OLD_GATE);
assert.notEqual(index,-1);
expectedGates[index]=NEW_GATE;
assert.equal(canonical(v3.explicit_remaining_gates),canonical(expectedGates));
assert.equal(v3.explicit_remaining_gates.includes(OLD_GATE),false);
assert.equal(v3.explicit_remaining_gates.includes(NEW_GATE),true);
assert.equal(v3.explicit_remaining_gates.length,v2.explicit_remaining_gates.length);

assert.equal(v3.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED,"0");
assert.equal(v3.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED,"0");
assert.equal(v3.signer_credential_state.systemd_credential_identity_proven,false);
assert.equal(v3.signer_credential_state.private_key_material_read,false);
assert.equal(v3.authority.candidate_only,true);
for(const [key,value] of Object.entries(v3.authority)){
  if(key!=="candidate_only")assert.equal(value,false,key);
}

const bad=(label,mutate)=>{
  const value=structuredClone(v3);
  mutate(value);
  let ok=true;
  try{
    assert.equal(canonical(value.candidate_configuration),canonical(v2.candidate_configuration));
    assert.equal(canonical(value.signer_credential_state),canonical(v2.signer_credential_state));
    assert.equal(canonical(value.authority),canonical(v2.authority));
    assert.equal(canonical(value.explicit_remaining_gates),canonical(expectedGates));
  }catch{ok=false;}
  assert.equal(ok,false,label);
};
bad("runtime enable",v=>{v.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED="1";});
bad("apply enable",v=>{v.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED="1";});
bad("credential overclaim",v=>{v.signer_credential_state.systemd_credential_identity_proven=true;});
bad("activation overclaim",v=>{v.authority.public_presale_activation=true;});
bad("restore standing-balance gate",v=>{
  const i=v.explicit_remaining_gates.indexOf(NEW_GATE);
  v.explicit_remaining_gates[i]=OLD_GATE;
});
bad("remove funding gate",v=>{
  v.explicit_remaining_gates=v.explicit_remaining_gates.filter(x=>x!==NEW_GATE);
});

console.log("VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V3_PROOF_GREEN");
console.log("predecessor_v2_git_blob_bound=true");
console.log("candidate_configuration_unchanged=true");
console.log("signer_credential_state_unchanged=true");
console.log("authority_unchanged=true");
console.log("remaining_gate_count="+String(v3.explicit_remaining_gates.length));
console.log("standing_balance_fee_gate_retired=true");
console.log("zero_fee_chain_receipt_gate_preserved=true");
console.log("per_payment_native_gas_funding_required_for_nonzero_fee=true");
console.log("runtime_enabled=false");
console.log("runtime_apply_enabled=false");
console.log("credential_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("public_presale_activation=false");
console.log("wc_void_market_activation=false");
console.log("funds_movement=false");
