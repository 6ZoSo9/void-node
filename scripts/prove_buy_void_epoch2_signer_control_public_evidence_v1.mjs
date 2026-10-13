#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

import {
  EVIDENCE_ID_SHA256,EVIDENCE_PATH,MARKER,STATUS,
  classifyEpoch2SignerControlPublicEvidenceV1,
} from "../tools/void-buy-void-epoch2-signer-control-public-evidence-v1.mjs";

const SOURCE_HEAD="5bc76c0c1410f8db2f3e759a94a2a3184ab800de";
const SOURCE_TREE="118fa8680937d88db1e8a83a393408123e01f03c";
const SOURCE_BLOB="785fe80d74ae5f6840da22a19a337cd2bcee9944";
const SOURCE_PATH="src/economic/buy_void_epoch2_signer_control_v1.ts";
const FULFILLER="0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";

const git=args=>execFileSync("git",args,{
  encoding:"utf8",timeout:7000,maxBuffer:1_000_000,
  stdio:["ignore","pipe","pipe"],
}).trim();

const raw=fs.readFileSync(EVIDENCE_PATH,"utf8");
assert.ok(raw.length>100 && raw.length<16_384);
const record=JSON.parse(raw);
const decision=classifyEpoch2SignerControlPublicEvidenceV1(record);
assert.equal(decision.ok,true);
assert.equal(decision.status,STATUS);
assert.equal(decision.evidence_id_sha256,EVIDENCE_ID_SHA256);
assert.equal(decision.signer_address,FULFILLER);
assert.equal(decision.signer_offchain_control_proven,true);
assert.equal(decision.systemd_credential_identity_proven,false);
assert.equal(decision.runtime_source_binding_proven,false);
assert.equal(decision.runtime_credential_installed_verified,false);
assert.equal(decision.live_payment_signing_authorized,false);
assert.equal(decision.transaction_sign_or_broadcast_authorized,false);
assert.equal(decision.public_presale_activation_authorized,false);
assert.equal(decision.wc_void_market_activation_authorized,false);
assert.equal(decision.funds_movement_authorized,false);

execFileSync("git",["merge-base","--is-ancestor",SOURCE_HEAD,"HEAD"],{
  stdio:["ignore","ignore","pipe"],timeout:7000,
});
assert.equal(git(["rev-parse",SOURCE_HEAD+"^{tree}"]),SOURCE_TREE);
assert.equal(git(["rev-parse",SOURCE_HEAD+":"+SOURCE_PATH]),SOURCE_BLOB);
assert.equal(git(["rev-parse","HEAD:"+SOURCE_PATH]),SOURCE_BLOB);

const bad=(name,change)=>{
  const altered=structuredClone(record);
  change(altered);
  const out=classifyEpoch2SignerControlPublicEvidenceV1(altered);
  assert.equal(out.ok,false,name);
  assert.equal(out.signer_offchain_control_proven,false,name);
  assert.equal(out.live_payment_signing_authorized,false,name);
  assert.equal(out.public_presale_activation_authorized,false,name);
  assert.equal(out.funds_movement_authorized,false,name);
};
bad("signature_tamper",x=>{x.receipt.signature="0x"+"0".repeat(130);});
bad("source_head_tamper",x=>{x.receipt.challenge.source_head="f".repeat(40);});
bad("fulfiller_tamper",x=>{x.receipt.challenge.immutable_fulfiller="0x"+"1".repeat(40);});
bad("bundle_hash_tamper",x=>{x.source_bundle_sha256="f".repeat(64);});
bad("runtime_source_overclaim",x=>{x.interpretation.runtime_source_binding_proven=true;});
bad("credential_overclaim",x=>{x.interpretation.systemd_credential_identity_proven=true;});
bad("payment_overclaim",x=>{x.interpretation.live_payment_signing_authorized=true;});
bad("activation_overclaim",x=>{x.interpretation.public_presale_activation_authorized=true;});
bad("unknown_field",x=>{x.unreviewed=true;});

console.log(MARKER+"_PROOF_GREEN");
console.log("accepted_evidence_id_sha256="+EVIDENCE_ID_SHA256);
console.log("signer_offchain_control_proven=true");
console.log("immutable_epoch2_fulfiller_recovered=true");
console.log("accepted_challenge_source_head="+SOURCE_HEAD);
console.log("accepted_challenge_source_tree="+SOURCE_TREE);
console.log("runtime_source_binding_proven=false");
console.log("systemd_credential_identity_proven=false");
console.log("runtime_credential_installed_verified=false");
console.log("live_payment_signing_authorized=false");
console.log("transaction_sign_or_broadcast_authorized=false");
console.log("public_presale_activation_authorized=false");
console.log("wc_void_market_activation_authorized=false");
console.log("funds_movement_authorized=false");
