#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_PROMOTION_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_PROMOTION_V1";

const EVIDENCE_MARKER=
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_EVIDENCE_V1";
const EVIDENCE_STATUS=
  "PRODUCTION_VALIDATOR_BOUND_OFFLINE_SUCCESSOR_EQUIVALENCE_EVIDENCE_GREEN";
const EVIDENCE_PATH=
  "ops/mainnet0/economic-epoch2-production-successor-equivalence-evidence-v1.json";
const PROMOTION_PATH=
  "ops/mainnet0/economic-epoch2-production-successor-equivalence-promotion-v1.json";

const VALIDATORS=Object.freeze([
  "0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863",
  "0x02f967953386188397b992c208239d3a25180db6",
  "0x461bf06270d9d28962f7570182c061b828799b66",
]);
const SHA256=/^[0-9a-f]{64}$/u;
const EVIDENCE_ID=/^voide2pse1_[0-9a-f]{64}$/u;
const HEX32=/^0x[0-9a-f]{64}$/u;

function fail(reason){ throw new Error(reason); }
function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function canonical(value){
  if(value===null || typeof value!=="object") return JSON.stringify(value);
  if(Array.isArray(value)) return "["+value.map(canonical).join(",")+"]";
  return "{"+Object.keys(value).sort()
    .map((k)=>JSON.stringify(k)+":"+canonical(value[k]))
    .join(",")+"}";
}
function evidenceId(value){
  const body=structuredClone(value);
  delete body.evidence_id;
  return "voide2pse1_"+
    crypto.createHash("sha256").update(canonical(body),"utf8").digest("hex");
}
function readJson(file){ return JSON.parse(fs.readFileSync(file,"utf8")); }

function verifyEvidence(evidence){
  const checks=[
    ["marker", evidence?.marker===EVIDENCE_MARKER],
    ["version", evidence?.version===1],
    ["status", evidence?.status===EVIDENCE_STATUS],
    ["chain_id", evidence?.chain_id===2050],
    ["execution_epoch", evidence?.execution_epoch===2],
    ["evidence_id_shape", EVIDENCE_ID.test(String(evidence?.evidence_id||""))],
    ["evidence_id_material", evidence ? evidenceId(evidence)===evidence.evidence_id : false],
    ["validator_count", evidence?.consensus?.validator_count===3],
    ["validator_quorum", evidence?.consensus?.required_validator_quorum===2],
    ["byzantine_fault_tolerance", evidence?.consensus?.byzantine_fault_tolerance===0],
    ["validator_roster", JSON.stringify(evidence?.consensus?.validators)===JSON.stringify(VALIDATORS)],
    ["block0_extra_data", evidence?.consensus?.block0_extra_data_exact===true],
    ["production_extra_data_bound", evidence?.consensus?.production_qbft_extra_data_bound_into_genesis===true],
    ["validator_roster_readback", evidence?.consensus?.validator_roster_readback_exact===true],
    ["production_validator_set_bound", evidence?.consensus?.production_validator_set_bound===true],
    ["nonce_state_root_equivalence", evidence?.economic_state?.state_root_matches_nonce_continuity_equivalence===true],
    ["client_state_equivalence", evidence?.economic_state?.client_specific_state_equivalence_proven===true],
    ["storage_count", evidence?.economic_state?.verified_storage_entry_count===1268],
    ["native_balance_zero", evidence?.economic_state?.native_balance_sum_wei==="0"],
    ["total_supply", evidence?.economic_state?.successor_total_supply_atoms==="333333333000000000000000000"],
    ["holder_sum", evidence?.economic_state?.successor_holder_sum_atoms==="333333333000000000000000000"],
    ["nonce_count", evidence?.economic_state?.nonce_continuity_account_count===154],
    ["nonce_only_count", evidence?.economic_state?.nonce_only_alloc_account_count===152],
    ["maximum_nonce", evidence?.economic_state?.maximum_nonce==="273"],
    ["nonce_readbacks", evidence?.economic_state?.all_nonce_readbacks_exact===true],
    ["nonce_only_balances", evidence?.economic_state?.all_nonce_only_native_balances_zero===true],
    ["retired_code_absent", evidence?.economic_state?.all_retired_nonce_only_code_absent===true],
    ["retained_raw_stale", evidence?.economic_state?.known_retained_raw_transaction_stale_under_exact_nonce_continuity===true],
    ["offline_equivalence", evidence?.economic_state?.offline_successor_equivalence_proven===true],
    ["gate_validator_bound", evidence?.gates?.production_validator_set_bound===true],
    ["gate_offline_equivalence", evidence?.gates?.offline_successor_equivalence_proven===true],
    ["gate_replay", evidence?.gates?.cross_epoch_replay_protection_proven===true],
    ["gate_public_anchor_hold", evidence?.gates?.successor_state_root_public_void_anchor_ready===false],
    ["gate_public_read_hold", evidence?.gates?.public_balance_receipt_code_verification_ready===false],
    ["gate_migration_hold", evidence?.gates?.migration_authorized===false],
    ["gate_activation_hold", evidence?.gates?.public_activation_authorized===false],
    ["runtime_state_root_shape", HEX32.test(String(evidence?.runtime_artifacts?.state_root||""))],
  ];
  for(const [name,ok] of checks){
    if(!ok) fail("production_successor_equivalence_evidence_invalid:"+name);
  }

  if(evidence.authority?.evidence_only!==true){
    fail("production_successor_equivalence_evidence_authority_invalid");
  }
  for(const [key,value] of Object.entries(evidence.authority||{})){
    if(key==="evidence_only" || key==="isolated_loopback_rpc_read"){
      if(value!==true) fail("production_successor_equivalence_evidence_authority_invalid:"+key);
      continue;
    }
    if(value!==false){
      fail("production_successor_equivalence_evidence_authority_invalid:"+key);
    }
  }
  return evidence;
}

export function promoteVoidEconomicEpoch2ProductionSuccessorEquivalenceV1({
  evidenceBytes,
  expectedFileSha256,
  expectedEvidenceId,
  bindingCandidate,
  migrationCandidate,
}){
  if(!Buffer.isBuffer(evidenceBytes)) fail("evidence_bytes_required");
  if(typeof expectedFileSha256!=="string" || !SHA256.test(expectedFileSha256)){
    fail("expected_file_sha256_invalid");
  }
  if(typeof expectedEvidenceId!=="string" || !EVIDENCE_ID.test(expectedEvidenceId)){
    fail("expected_evidence_id_invalid");
  }
  const observedSha=sha256(evidenceBytes);
  if(observedSha!==expectedFileSha256) fail("evidence_file_sha256_mismatch");

  let evidence;
  try{ evidence=JSON.parse(evidenceBytes.toString("utf8")); }
  catch{ fail("evidence_json_invalid"); }
  verifyEvidence(evidence);
  if(evidence.evidence_id!==expectedEvidenceId) fail("evidence_id_input_mismatch");

  if(
    bindingCandidate?.marker!=="VOID_ECONOMIC_EPOCH2_QBFT_VALIDATOR_BINDING_CANDIDATE_V1" ||
    bindingCandidate?.qbft?.production_validator_count!==3 ||
    bindingCandidate?.qbft?.required_validator_quorum!==2 ||
    bindingCandidate?.qbft?.production_extra_data_built!==true ||
    bindingCandidate?.gates?.qbft_production_extra_data_built!==true ||
    bindingCandidate?.gates?.production_validator_set_bound!==false ||
    bindingCandidate?.gates?.offline_successor_equivalence_proven!==false
  ) fail("qbft_binding_promotion_start_state_invalid");

  if(
    migrationCandidate?.status!=="HOLD" ||
    migrationCandidate?.successor_execution_layer
      ?.production_validator_set_bound!==false ||
    migrationCandidate?.funds_safety?.offline_successor_equivalence_proven!==false ||
    migrationCandidate?.successor_execution_layer
      ?.client_specific_state_equivalence_proven!==true ||
    migrationCandidate?.funds_safety?.client_specific_state_equivalence_proven!==true ||
    migrationCandidate?.replay_and_epoch_safety
      ?.all_production_validators_epoch_domain_enforced!==true ||
    migrationCandidate?.replay_and_epoch_safety
      ?.cross_epoch_replay_protection_proven!==true ||
    migrationCandidate?.public_verification
      ?.successor_state_root_public_void_anchor_ready!==false ||
    migrationCandidate?.public_verification
      ?.public_balance_receipt_code_verification_ready!==false
  ) fail("migration_promotion_start_state_invalid");

  if(migrationCandidate?.launch_authority?.source_only!==true){
    fail("migration_launch_authority_invalid");
  }
  for(const [key,value] of Object.entries(migrationCandidate.launch_authority)){
    if(key==="source_only") continue;
    if(value!==false) fail("migration_launch_authority_must_remain_false:"+key);
  }

  const updatedBinding=structuredClone(bindingCandidate);
  updatedBinding.status=
    "PRODUCTION_VALIDATOR_SET_BOUND_OFFLINE_SUCCESSOR_EQUIVALENCE_GREEN";
  updatedBinding.gates.production_validator_set_bound=true;
  updatedBinding.gates.offline_successor_equivalence_proven=true;
  updatedBinding.production_successor_equivalence={
    evidence_file:EVIDENCE_PATH,
    evidence_file_sha256:observedSha,
    evidence_id:evidence.evidence_id,
    promotion_file:PROMOTION_PATH,
    production_validator_count:3,
    required_validator_quorum:2,
    byzantine_fault_tolerance:0,
    validator_roster_readback_exact:true,
    state_root_matches_nonce_continuity_equivalence:true,
    all_nonce_readbacks_exact:true,
  };

  const updatedMigration=structuredClone(migrationCandidate);
  updatedMigration.successor_execution_layer.production_validator_set_bound=true;
  updatedMigration.successor_execution_layer
    .production_validator_set_bound_evidence=EVIDENCE_PATH;
  updatedMigration.funds_safety.offline_successor_equivalence_proven=true;
  updatedMigration.funds_safety.offline_successor_equivalence_evidence=EVIDENCE_PATH;
  updatedMigration.funds_safety
    .offline_successor_equivalence_promotion=PROMOTION_PATH;

  // Keep every authority edge closed.
  updatedMigration.launch_authority.public_activation=false;
  updatedMigration.launch_authority.money_movement=false;
  updatedMigration.launch_authority.chain2050_write=false;
  updatedMigration.launch_authority.transaction_broadcast=false;

  const promotion=Object.freeze({
    marker:VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_PROMOTION_V1,
    version:1,
    status:
      "PRODUCTION_VALIDATOR_SET_BOUND_OFFLINE_SUCCESSOR_EQUIVALENCE_PROMOTED_PUBLIC_EVIDENCE_HOLD",
    chain_id:2050,
    execution_epoch:2,
    evidence:Object.freeze({
      evidence_file:EVIDENCE_PATH,
      evidence_file_sha256:observedSha,
      evidence_id:evidence.evidence_id,
      source_commit:evidence.source_commit,
    }),
    verification:Object.freeze({
      evidence_file_sha256_verified:true,
      evidence_id_verified:true,
      evidence_id_material_verified:true,
      production_qbft_extra_data_bound_into_genesis:true,
      production_qbft_block0_extra_data_verified:true,
      production_qbft_validator_roster_readback_verified:true,
      production_validator_set_bound:true,
      state_root_matches_nonce_continuity_equivalence:true,
      client_specific_state_equivalence_proven:true,
      all_nonce_readbacks_exact:true,
      all_nonce_only_native_balances_zero:true,
      all_retired_nonce_only_code_absent:true,
      known_retained_raw_transaction_stale_under_exact_nonce_continuity:true,
      offline_successor_equivalence_proven:true,
      cross_epoch_replay_protection_proven:true,
    }),
    gates:Object.freeze({
      production_validator_set_bound:true,
      offline_successor_equivalence_proven:true,
      all_production_validators_epoch_domain_enforced:true,
      cross_epoch_replay_protection_proven:true,
      successor_state_root_public_void_anchor_ready:false,
      public_balance_receipt_code_verification_ready:false,
      runtime_route_active:false,
      public_submission_open:false,
      authoritative_chain2050_write:false,
      migration_authorized:false,
      public_activation_authorized:false,
      funds_movement_authorized:false,
    }),
    authority:Object.freeze({
      source_promotion_only:true,
      service_action:false,
      production_rpc_contact:false,
      rpc_admin_mutation:false,
      wallet_access:false,
      private_key_access:false,
      credential_content_access:false,
      transaction_construction:false,
      transaction_signing:false,
      transaction_submission:false,
      transaction_broadcast:false,
      authoritative_chain2050_write:false,
      validator_mutation:false,
      token_movement:false,
      funds_movement:false,
      migration_authorized:false,
      public_activation_authorized:false,
    }),
  });

  return Object.freeze({
    promotion,
    updated_qbft_binding:updatedBinding,
    updated_migration_candidate:updatedMigration,
  });
}

function arg(name){
  const i=process.argv.indexOf(name);
  return i>=0?process.argv[i+1]:undefined;
}

if(
  process.argv[1] &&
  import.meta.url===new URL("file://"+path.resolve(process.argv[1])).href
){
  const evidencePath=path.resolve(String(arg("--evidence")||""));
  const expectedFileSha256=String(arg("--expected-file-sha256")||"");
  const expectedEvidenceId=String(arg("--expected-evidence-id")||"");
  const outputDir=path.resolve(String(arg("--output-dir")||""));
  if(!evidencePath || evidencePath===path.parse(evidencePath).root){
    fail("evidence_path_required");
  }
  if(!outputDir || outputDir===path.parse(outputDir).root){
    fail("output_dir_required");
  }
  if(!fs.existsSync(evidencePath)) fail("evidence_file_missing");
  if(fs.existsSync(outputDir)) fail("output_dir_already_exists");

  const result=promoteVoidEconomicEpoch2ProductionSuccessorEquivalenceV1({
    evidenceBytes:fs.readFileSync(evidencePath),
    expectedFileSha256,
    expectedEvidenceId,
    bindingCandidate:readJson(
      "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json",
    ),
    migrationCandidate:readJson(
      "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
    ),
  });

  fs.mkdirSync(outputDir,{recursive:false});
  for(const [name,value] of [
    [
      "economic-epoch2-production-successor-equivalence-promotion-v1.json",
      result.promotion,
    ],
    [
      "economic-epoch2-qbft-validator-binding-candidate-v1.json",
      result.updated_qbft_binding,
    ],
    [
      "economic-evm-successor-migration-candidate-v1.json",
      result.updated_migration_candidate,
    ],
  ]){
    fs.writeFileSync(
      path.join(outputDir,name),
      JSON.stringify(value,null,2)+"\n",
      {encoding:"utf8",mode:0o644,flag:"wx"},
    );
  }

  console.log(VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_PROMOTION_V1);
  console.log("status="+result.promotion.status);
  console.log("production_validator_set_bound=true");
  console.log("offline_successor_equivalence_proven=true");
  console.log("cross_epoch_replay_protection_proven=true");
  console.log("successor_state_root_public_void_anchor_ready=false");
  console.log("public_balance_receipt_code_verification_ready=false");
  console.log("authoritative_chain2050_write=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("funds_movement_authorized=false");
  console.log("output_dir="+outputDir);
}
