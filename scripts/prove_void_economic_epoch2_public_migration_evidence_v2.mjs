#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const V1="public/public-node/evidence/economic-epoch2-migration-manifest-v1.json";
const V2="public/public-node/evidence/economic-epoch2-migration-manifest-v2.json";
const SUCCESSOR="ops/mainnet0/economic-epoch2-production-successor-equivalence-evidence-v1.json";
const RAW="ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json";
const CANDIDATE="ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const INDEX="public/public-node/index.json";

const OLD_MATERIAL="7793624324ce6b171f43c1f8089af7edfbbc8c5144eefe911688128600847572";
const V2_MATERIAL="4195294f5a5ac043315f5738d02e638b586671c67f1b5016f81a1badfce1fde6";
const SUCCESSOR_SHA="5006aa32a298c0fbcea6395e75201af66fedacde5b664ac953699dfb2f0c061b";
const BLOCK="0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d";
const ROOT="0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2";

const read=(p)=>JSON.parse(fs.readFileSync(p,"utf8"));
const shaBytes=(b)=>crypto.createHash("sha256").update(b).digest("hex");
const canonical=(v)=>{
  if(Array.isArray(v)) return "["+v.map(canonical).join(",")+"]";
  if(v&&typeof v==="object"){
    return "{"+Object.keys(v).sort()
      .map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
  }
  return JSON.stringify(v);
};
const materialSha=(v)=>crypto.createHash("sha256")
  .update(canonical(v),"utf8").digest("hex");

const v1=read(V1);
const v2=read(V2);
const successorBytes=fs.readFileSync(SUCCESSOR);
const successor=JSON.parse(successorBytes.toString("utf8"));
const raw=read(RAW);
const candidate=read(CANDIDATE);
const index=read(INDEX);

// V1 is immutable historical material already bound into the raw-tx domain.
assert.equal(v1.marker,"VOID_ECONOMIC_EPOCH2_PUBLIC_MIGRATION_EVIDENCE_V1");
assert.equal(v1.version,1);
assert.equal(v1.migration_manifest_material_sha256,OLD_MATERIAL);
assert.equal(materialSha(v1.material),OLD_MATERIAL);
assert.equal(raw.source_binding.migration_manifest_material_sha256,OLD_MATERIAL);
assert.ok(raw.domain_material.includes("migration_manifest_material_sha256="+OLD_MATERIAL));

// V2 is the corrected public identity of the real production-shaped successor.
assert.equal(v2.marker,"VOID_ECONOMIC_EPOCH2_PUBLIC_MIGRATION_EVIDENCE_V2");
assert.equal(v2.version,2);
assert.equal(
  v2.status,
  "PUBLIC_MIGRATION_MANIFEST_V2_REAL_PRODUCTION_SUCCESSOR_IDENTITY_READY_PUBLIC_ANCHOR_HOLD",
);
assert.equal(v2.migration_manifest_hash_algorithm,"sha256-canonical-json-v1");
assert.equal(v2.migration_manifest_material_sha256,V2_MATERIAL);
assert.equal(materialSha(v2.material),V2_MATERIAL);

assert.equal(shaBytes(successorBytes),SUCCESSOR_SHA);
assert.equal(
  successor.evidence_id,
  "voide2pse1_a10332cc6dcd89bc0988d865946185a22e9a448ce94bde7861512af2b1b8e973",
);
assert.equal(successor.runtime_artifacts.block_hash,BLOCK);
assert.equal(successor.runtime_artifacts.state_root,ROOT);
assert.equal(successor.gates.production_validator_set_bound,true);
assert.equal(successor.gates.offline_successor_equivalence_proven,true);

const state=v2.material.successor_state;
assert.equal(state.production_successor_equivalence_evidence_path,SUCCESSOR);
assert.equal(state.production_successor_equivalence_evidence_file_sha256,SUCCESSOR_SHA);
assert.equal(state.genesis_block_hash,BLOCK);
assert.equal(state.genesis_state_root,ROOT);
assert.equal(state.genesis_block_hash,successor.runtime_artifacts.block_hash);
assert.equal(state.genesis_state_root,successor.runtime_artifacts.state_root);
assert.equal(state.alloc_account_count,156);
assert.equal(state.economic_state_account_count,4);
assert.equal(state.verified_storage_entry_count,1268);
assert.equal(state.void_token_total_supply_atoms,"333333333000000000000000000");

assert.deepEqual(v2.publication,{
  public_path:V2,
  public_route:"/public-node/evidence/economic-epoch2-migration-manifest-v2.json",
  migration_manifest_content_addressed:true,
  successor_genesis_or_state_manifest_public_evidence_ready:true,
  successor_state_root_public_void_anchor_ready:false,
  public_balance_receipt_code_verification_ready:false,
  live_balance_receipt_code_gateway_ready:false,
  migration_authorized:false,
  public_activation_authorized:false,
});
assert.equal(v2.authority.source_only,true);
for(const [key,value] of Object.entries(v2.authority)){
  if(key==="source_only") continue;
  assert.equal(value,false,key);
}

assert.equal(candidate.successor_execution_layer.production_validator_set_bound,true);
assert.equal(candidate.funds_safety.offline_successor_equivalence_proven,true);
assert.equal(candidate.replay_and_epoch_safety.cross_epoch_replay_protection_proven,true);
assert.equal(
  candidate.public_verification.successor_state_root_public_void_anchor_ready,
  false,
);
assert.equal(
  candidate.public_verification.public_balance_receipt_code_verification_ready,
  false,
);
assert.equal(candidate.launch_authority.chain2050_write,false);
assert.equal(candidate.launch_authority.transaction_broadcast,false);
assert.equal(candidate.launch_authority.public_activation,false);
assert.equal(candidate.launch_authority.money_movement,false);

const rows=index.routes.filter(
  r=>r.route==="/public-node/evidence/economic-epoch2-migration-manifest-v2.json",
);
assert.equal(rows.length,1);
assert.deepEqual(rows[0],{
  kind:"economic_epoch2_migration_evidence_v2",
  label:"Epoch-2 economic migration evidence v2 — real production successor identity",
  method:"GET",
  public_safe:true,
  read_only:true,
  route:"/public-node/evidence/economic-epoch2-migration-manifest-v2.json",
  status:"content_addressed_real_production_successor_manifest_ready_public_anchor_hold",
  migration_authorized:false,
  public_activation_authorized:false,
  successor_state_artifact_public:true,
});

console.log("VOID_ECONOMIC_EPOCH2_PUBLIC_MIGRATION_EVIDENCE_V2_GREEN");
console.log("historical_v1_material_preserved=true");
console.log("raw_transaction_domain_lineage_unchanged=true");
console.log("v2_material_sha256="+V2_MATERIAL);
console.log("production_successor_evidence_sha256="+SUCCESSOR_SHA);
console.log("genesis_block_hash="+BLOCK);
console.log("genesis_state_root="+ROOT);
console.log("successor_state_root_public_void_anchor_ready=false");
console.log("public_balance_receipt_code_verification_ready=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
