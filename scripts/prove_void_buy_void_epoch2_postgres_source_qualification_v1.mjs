#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  MARKER, STATUS, SOURCE_BLOBS,
  classifyEpoch2ClaimSourceV1, verifyCurrentEpoch2ClaimSourceV1,
} from "../tools/void-buy-void-epoch2-postgres-source-qualification-v1.mjs";

const read = p => JSON.parse(fs.readFileSync(p,"utf8"));
const candidate = read(
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v1.json",
);
const legacy = read(
  "ops/mainnet0/buy-void-payment-keyed-production-candidate-v1.json",
);
const target = read("ops/mainnet0/production-epoch2-rpc-target-v1.json");
const classify = (c=candidate, l=legacy, t=target) =>
  classifyEpoch2ClaimSourceV1(c,l,t);
const original = classify();
assert.equal(original.ok,true);
assert.equal(original.status,STATUS);
assert.equal(original.credential_binding_established,false);
assert.equal(original.runtime_or_payment_activation_authorized,false);
assert.equal(original.historical_v1_authority_inherited,false);
assert.ok(Object.keys(SOURCE_BLOBS).length >= 16);
const clone = v => structuredClone(v);
function bad(name,change) {
  const c=clone(candidate), l=clone(legacy), t=clone(target);
  change(c,l,t);
  const result=classify(c,l,t);
  assert.equal(result.ok,false,name);
  assert.equal(result.status,"HOLD",name);
  assert.equal(result.credential_binding_established,false,name);
  assert.equal(result.runtime_or_payment_activation_authorized,false,name);
  assert.equal(result.historical_v1_authority_inherited,false,name);
}
bad("retired_8545",c=>{
  c.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL =
    "http://127.0.0.1:8545/";
});
bad("alternate_loopback",c=>{
  c.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL =
    "http://localhost:18553/";
});
bad("wrong_e2_fulfiller",c=>{
  c.candidate_configuration.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS =
    "0xc884f631c3881b8b672bfcbf019c856146cd7f73";
});
bad("wrong_e2_contract",c=>{
  c.epoch2_presale_contract="0xa40a43adfd174f88309173cb3daa6e09c10154a7";
});
bad("unexpected_old_signer_id",c=>{
  c.candidate_configuration.VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID =
    "historic_e1_is_not_current";
});
bad("unexpected_credential_dir",c=>{
  c.candidate_configuration.CREDENTIALS_DIRECTORY = "/run/credentials/old";
});
bad("enable_runtime",c=>{
  c.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED="1";
});
bad("enable_apply",c=>{
  c.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED="1";
});
bad("unreviewed_fee_cap",c=>{
  c.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_MAX_FEE_PER_GAS_WEI="999999999999999";
});
bad("restore_old_priority",c=>{
  c.candidate_configuration.VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI="1000000000";
});
bad("pretend_signer_control_proven",c=>{
  c.signer_credential_state.signer_offchain_control_proven=true;
});
bad("pretend_credential_ready",c=>{
  c.signer_credential_state.systemd_credential_identity_proven=true;
});
bad("pretend_credential_attested",c=>{
  c.signer_credential_state.epoch2_credential_binding_evidence_id="f".repeat(64);
});
bad("invent_credential_path",c=>{
  c.signer_credential_state.credential_path_selected=true;
});
bad("claim_production_authority",c=>{
  c.authority.transaction_broadcast=true;
});
bad("relabel_source_as_active",c=>{
  c.status="READY_FOR_PRODUCTION";
});
bad("drift_selected_rpc",(c,l,t)=>{
  t.selection.rpc_url="http://127.0.0.1:8545/";
});
bad("no_credential_review_gate",c=>{
  c.explicit_remaining_gates=[];
});
bad("unexpected_unknown_key",c=>{
  c.UNREVIEWED_SIGNER="0x" + "f".repeat(64);
});

const sourceResult=verifyCurrentEpoch2ClaimSourceV1();
assert.equal(sourceResult.ok,true);
assert.equal(sourceResult.status,STATUS);
assert.equal(sourceResult.credential_binding_established,false);
assert.equal(sourceResult.runtime_or_payment_activation_authorized,false);
console.log(MARKER + "_GREEN");
console.log("current_epoch2_code_objects_bound=" +
  Object.keys(SOURCE_BLOBS).length);
console.log("historical_e1_qualification_objects_unchanged=true");
console.log("candidate_only=true");
console.log("signer_credential_observed=false");
console.log("runtime_or_payment_activation=false");
console.log("tampered_or_forged_input_classes_held=19");
