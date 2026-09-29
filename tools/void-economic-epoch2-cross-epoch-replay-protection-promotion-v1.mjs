#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_IMPORT_V1,
  verifyVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1,
} from "./void-economic-epoch2-production-gateway-replay-binding-runtime-evidence-import-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_PROTECTION_PROMOTION_V1 =
  "VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_PROTECTION_PROMOTION_V1";

const EVIDENCE_PATH=
  "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-runtime-evidence-v1.json";
const IMPORT_PATH=
  "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-runtime-evidence-import-v1.json";
const PROMOTION_PATH=
  "ops/mainnet0/economic-epoch2-cross-epoch-replay-protection-promotion-v1.json";
const SHA256=/^[0-9a-f]{64}$/u;
const EVIDENCE_ID=/^voide2gre1_[0-9a-f]{64}$/u;

function fail(reason){ throw new Error(reason); }
function sha256Bytes(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function readJson(filename){
  return JSON.parse(fs.readFileSync(filename,"utf8"));
}

function exactImportReceipt(receipt){
  if(
    !receipt ||
    receipt.marker!==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_IMPORT_V1 ||
    receipt.version!==1 ||
    receipt.status!==
      "PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_IMPORTED_PROMOTION_HOLD" ||
    receipt.chain_id!==2050 ||
    receipt.execution_epoch!==2 ||
    receipt.evidence_file!==EVIDENCE_PATH ||
    receipt.import_receipt_file!==IMPORT_PATH ||
    !SHA256.test(String(receipt.evidence_file_sha256||"")) ||
    !EVIDENCE_ID.test(String(receipt.evidence_id||"")) ||
    receipt.verification?.evidence_file_sha256_verified!==true ||
    receipt.verification?.evidence_id_verified!==true ||
    receipt.verification?.evidence_id_material_verified!==true ||
    receipt.verification?.runtime_evidence_semantically_verified!==true ||
    receipt.verification?.evidence_fresh_at_import!==true ||
    receipt.verification?.production_replay_root_selected!==true ||
    receipt.verification?.production_service_identity_bound!==true ||
    receipt.verification?.same_uid_production_trust_proven!==true ||
    receipt.verification?.preexisting_marker_receipts_verified!==true ||
    receipt.verification?.preexisting_markers_preserved!==true ||
    receipt.verification?.successful_canary_added_exactly_one_marker!==true ||
    receipt.verification?.canary_fresh_consumed!==true ||
    receipt.verification?.canary_replay_rejected_after_reopen!==true ||
    receipt.gates?.runtime_evidence_imported!==true ||
    receipt.gates?.runtime_evidence_semantically_verified!==true ||
    receipt.gates?.production_gateway_replay_store_binding_verified!==false ||
    receipt.gates?.runtime_route_active!==false ||
    receipt.gates?.public_submission_open!==false ||
    receipt.gates?.cross_epoch_replay_protection_proven!==false ||
    receipt.gates?.migration_authorized!==false ||
    receipt.gates?.public_activation_authorized!==false ||
    receipt.gates?.funds_movement_authorized!==false ||
    receipt.authority?.source_import_only!==true
  ){
    fail("runtime_evidence_import_receipt_invalid");
  }

  for(const [key,value] of Object.entries(receipt.authority||{})){
    if(key==="source_import_only") continue;
    if(value!==false) fail("runtime_evidence_import_authority_invalid:"+key);
  }
  return receipt;
}

function requireReplayPrerequisites(migration){
  const replay=migration?.replay_and_epoch_safety;
  if(!replay || typeof replay!=="object") fail("migration_replay_state_missing");

  const required=[
    "legacy_write_rpc_disabled_before_successor_activation",
    "execution_epoch_bound_in_public_gateway",
    "privileged_signer_nonce_or_key_replay_fence_proven",
    "pending_legacy_signed_transaction_census_complete",
    "raw_transaction_epoch_domain_defined",
    "raw_transaction_epoch_domain_source_proven",
    "besu_transaction_validation_rule_implemented",
    "plugin_artifact_content_addressed",
    "plugin_artifact_runtime_identity_verified",
    "besu_transaction_validation_rule_runtime_proven",
    "all_production_validators_epoch_domain_enforced",
  ];
  for(const key of required){
    if(replay[key]!==true) fail("cross_epoch_replay_prerequisite_missing:"+key);
  }
  if(replay.cross_epoch_replay_protection_proven!==false){
    fail("cross_epoch_replay_promotion_start_state_invalid");
  }
  return replay;
}

function requireAuthorityHeld(migration){
  const authority=migration?.launch_authority;
  if(!authority || authority.source_only!==true){
    fail("migration_launch_authority_invalid");
  }
  for(const [key,value] of Object.entries(authority)){
    if(key==="source_only") continue;
    if(value!==false) fail("migration_launch_authority_must_remain_false:"+key);
  }
}

export function promoteVoidEconomicEpoch2CrossEpochReplayProtectionV1({
  evidenceBytes,
  importReceipt,
  sourceBindingPolicy,
  durableReplayStorePolicy,
  runtimeEvidenceContract,
  rawDomainPolicy,
  migrationCandidate,
}){
  if(!Buffer.isBuffer(evidenceBytes)) fail("evidence_bytes_required");
  const receipt=exactImportReceipt(importReceipt);

  if(sha256Bytes(evidenceBytes)!==receipt.evidence_file_sha256){
    fail("runtime_evidence_file_sha256_mismatch");
  }

  const verified=
    verifyVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1({
      evidenceBytes,
      expectedFileSha256:receipt.evidence_file_sha256,
      expectedEvidenceId:receipt.evidence_id,
      evaluationTimeUtc:receipt.import_evaluated_at_utc,
      sourceBindingPolicy,
      durableReplayStorePolicy,
      runtimeEvidenceContract,
      rawDomainPolicy,
    });

  if(
    verified.ok!==true ||
    verified.status!==
      "PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_VALID" ||
    verified.production_replay_root_selected!==true ||
    verified.production_service_identity_bound!==true ||
    verified.same_uid_production_trust_proven!==true ||
    verified.preexisting_marker_receipts_verified!==true ||
    verified.preexisting_markers_preserved!==true ||
    verified.successful_canary_added_exactly_one_marker!==true ||
    verified.canary_fresh_consumed!==true ||
    verified.canary_replay_rejected_after_reopen!==true ||
    verified.runtime_route_active!==false ||
    verified.public_submission_open!==false ||
    verified.authoritative_chain2050_write!==false ||
    verified.funds_movement!==false
  ){
    fail("runtime_evidence_reverification_invalid");
  }

  if(
    sourceBindingPolicy?.gates
      ?.production_gateway_replay_store_binding_verified!==false ||
    sourceBindingPolicy?.gates?.runtime_route_active!==false ||
    sourceBindingPolicy?.gates?.public_submission_open!==false ||
    sourceBindingPolicy?.gates?.cross_epoch_replay_protection_proven!==false
  ){
    fail("source_binding_promotion_start_state_invalid");
  }
  if(
    durableReplayStorePolicy?.gates
      ?.production_gateway_replay_store_binding_verified!==false ||
    durableReplayStorePolicy?.gates?.runtime_route_active!==false ||
    durableReplayStorePolicy?.gates?.public_submission_open!==false
  ){
    fail("durable_store_promotion_start_state_invalid");
  }
  if(
    rawDomainPolicy?.gates?.all_production_validators_epoch_domain_enforced!==true ||
    rawDomainPolicy?.gates?.cross_epoch_replay_protection_proven!==false
  ){
    fail("raw_domain_promotion_start_state_invalid");
  }

  const replay=requireReplayPrerequisites(migrationCandidate);
  requireAuthorityHeld(migrationCandidate);

  const updatedBinding=structuredClone(sourceBindingPolicy);
  updatedBinding.status=
    "PRODUCTION_GATEWAY_DURABLE_REPLAY_BINDING_VERIFIED_INACTIVE_ROUTE_HOLD";
  updatedBinding.gates.production_gateway_replay_store_binding_verified=true;
  updatedBinding.gates.runtime_route_active=false;
  updatedBinding.gates.public_submission_open=false;
  updatedBinding.gates.transaction_submission=false;
  updatedBinding.gates.transaction_broadcast=false;
  updatedBinding.gates.authoritative_chain2050_write=false;
  updatedBinding.gates.cross_epoch_replay_protection_proven=true;
  updatedBinding.gates.migration_authorized=false;
  updatedBinding.gates.public_activation_authorized=false;
  updatedBinding.runtime_evidence={
    evidence_file:EVIDENCE_PATH,
    import_receipt_file:IMPORT_PATH,
    promotion_file:PROMOTION_PATH,
    evidence_file_sha256:receipt.evidence_file_sha256,
    evidence_id:receipt.evidence_id,
    import_evaluated_at_utc:receipt.import_evaluated_at_utc,
    hostname:verified.hostname,
    service_identity:verified.service_identity,
    replay_root:verified.replay_root,
    replay_marker_count_before:verified.replay_marker_count_before,
    replay_marker_count_after:verified.replay_marker_count_after,
    same_uid_production_trust_proven:true,
    production_replay_root_selected:true,
    production_service_identity_bound:true,
    canary_fresh_consumed:true,
    canary_replay_rejected_after_reopen:true,
  };
  if(updatedBinding.threat_model){
    updatedBinding.threat_model.production_replay_root_not_selected=false;
    updatedBinding.threat_model.same_uid_production_trust_not_proven=false;
    updatedBinding.threat_model.production_service_identity_not_bound=false;
    updatedBinding.threat_model.live_route_not_exposed=true;
  }

  const updatedDurable=structuredClone(durableReplayStorePolicy);
  updatedDurable.status=
    "PRODUCTION_GATEWAY_REPLAY_BINDING_VERIFIED_INACTIVE_ROUTE_HOLD";
  updatedDurable.gates.production_gateway_replay_store_binding_verified=true;
  updatedDurable.gates.runtime_route_active=false;
  updatedDurable.gates.public_submission_open=false;
  updatedDurable.gates.transaction_submission=false;
  updatedDurable.gates.transaction_broadcast=false;
  updatedDurable.gates.authoritative_chain2050_write=false;
  updatedDurable.gates.migration_authorized=false;
  updatedDurable.gates.public_activation_authorized=false;
  updatedDurable.production_runtime_binding={
    evidence_file:EVIDENCE_PATH,
    import_receipt_file:IMPORT_PATH,
    promotion_file:PROMOTION_PATH,
    evidence_file_sha256:receipt.evidence_file_sha256,
    evidence_id:receipt.evidence_id,
    replay_root:verified.replay_root,
    same_uid_production_trust_proven:true,
  };

  const updatedRawDomain=structuredClone(rawDomainPolicy);
  updatedRawDomain.status=
    "BESU_PRODUCTION_REPLAY_WALL_GREEN_INACTIVE_ROUTE_HOLD";
  updatedRawDomain.gates.all_production_validators_epoch_domain_enforced=true;
  updatedRawDomain.gates.cross_epoch_replay_protection_proven=true;
  updatedRawDomain.gates.migration_authorized=false;
  updatedRawDomain.gates.public_activation_authorized=false;

  const updatedMigration=structuredClone(migrationCandidate);
  updatedMigration.replay_and_epoch_safety
    .production_gateway_replay_store_binding_verified=true;
  updatedMigration.replay_and_epoch_safety
    .production_gateway_replay_binding_runtime_evidence=EVIDENCE_PATH;
  updatedMigration.replay_and_epoch_safety
    .production_gateway_replay_binding_runtime_import=IMPORT_PATH;
  updatedMigration.replay_and_epoch_safety
    .cross_epoch_replay_protection_promotion=PROMOTION_PATH;
  updatedMigration.replay_and_epoch_safety
    .cross_epoch_replay_protection_proven=true;
  updatedMigration.launch_authority.public_activation=false;
  updatedMigration.launch_authority.money_movement=false;
  updatedMigration.launch_authority.chain2050_write=false;
  updatedMigration.launch_authority.transaction_broadcast=false;

  const promotion=Object.freeze({
    marker:VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_PROTECTION_PROMOTION_V1,
    version:1,
    status:
      "CROSS_EPOCH_REPLAY_PROTECTION_PROMOTED_INACTIVE_ROUTE_MIGRATION_HOLD",
    chain_id:2050,
    execution_epoch:2,
    evidence:Object.freeze({
      evidence_file:EVIDENCE_PATH,
      import_receipt_file:IMPORT_PATH,
      evidence_file_sha256:receipt.evidence_file_sha256,
      evidence_id:receipt.evidence_id,
      import_evaluated_at_utc:receipt.import_evaluated_at_utc,
    }),
    verification:Object.freeze({
      evidence_file_hash_verified:true,
      evidence_id_verified:true,
      evidence_semantically_reverified:true,
      evidence_fresh_at_import:true,
      production_replay_root_selected:true,
      production_service_identity_bound:true,
      same_uid_production_trust_proven:true,
      preexisting_marker_receipts_verified:true,
      preexisting_markers_preserved:true,
      successful_canary_added_exactly_one_marker:true,
      canary_fresh_consumed:true,
      canary_replay_rejected_after_reopen:true,
      legacy_write_rpc_disabled:true,
      execution_epoch_bound_in_public_gateway:true,
      privileged_signer_replay_fence_proven:true,
      pending_legacy_signed_transaction_census_complete:true,
      raw_transaction_epoch_domain_defined:true,
      raw_transaction_epoch_domain_source_proven:true,
      besu_transaction_validation_rule_implemented:true,
      plugin_artifact_content_addressed:true,
      plugin_artifact_runtime_identity_verified:true,
      besu_transaction_validation_rule_runtime_proven:true,
      all_production_validators_epoch_domain_enforced:true,
    }),
    gates:Object.freeze({
      production_gateway_replay_store_binding_verified:true,
      cross_epoch_replay_protection_proven:true,
      runtime_route_active:false,
      public_submission_open:false,
      transaction_submission:false,
      transaction_broadcast:false,
      authoritative_chain2050_write:false,
      production_validator_set_bound:
        migrationCandidate?.consensus_and_client
          ?.production_validator_set_bound===true,
      offline_successor_equivalence_proven:
        migrationCandidate?.funds_safety
          ?.offline_successor_equivalence_proven===true,
      migration_authorized:false,
      public_activation_authorized:false,
      funds_movement_authorized:false,
    }),
    authority:Object.freeze({
      source_promotion_only:true,
      service_action:false,
      rpc_call:false,
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

  void replay;
  return Object.freeze({
    promotion,
    updated_source_binding:updatedBinding,
    updated_durable_replay_store:updatedDurable,
    updated_raw_domain_policy:updatedRawDomain,
    updated_migration_candidate:updatedMigration,
  });
}

function arg(name){
  const i=process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : undefined;
}

if(
  process.argv[1] &&
  import.meta.url===new URL("file://"+path.resolve(process.argv[1])).href
){
  const evidencePath=path.resolve(String(arg("--evidence")||""));
  const importPath=path.resolve(String(arg("--import")||""));
  const outputDir=path.resolve(String(arg("--output-dir")||""));

  for(const [value,reason] of [
    [evidencePath,"evidence_path_required"],
    [importPath,"import_path_required"],
    [outputDir,"output_dir_required"],
  ]){
    if(!value || value===path.parse(value).root) fail(reason);
  }
  if(!fs.existsSync(evidencePath)) fail("evidence_file_missing");
  if(!fs.existsSync(importPath)) fail("import_receipt_missing");
  if(fs.existsSync(outputDir)) fail("output_dir_already_exists");

  const result=
    promoteVoidEconomicEpoch2CrossEpochReplayProtectionV1({
      evidenceBytes:fs.readFileSync(evidencePath),
      importReceipt:readJson(importPath),
      sourceBindingPolicy:readJson(
        "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-v1.json",
      ),
      durableReplayStorePolicy:readJson(
        "ops/mainnet0/economic-epoch2-durable-replay-store-v1.json",
      ),
      runtimeEvidenceContract:readJson(
        "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-runtime-evidence-contract-v1.json",
      ),
      rawDomainPolicy:readJson(
        "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json",
      ),
      migrationCandidate:readJson(
        "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
      ),
    });

  fs.mkdirSync(outputDir,{recursive:false});
  const outputs=[
    [
      "economic-epoch2-cross-epoch-replay-protection-promotion-v1.json",
      result.promotion,
    ],
    [
      "economic-epoch2-production-gateway-replay-binding-v1.json",
      result.updated_source_binding,
    ],
    [
      "economic-epoch2-durable-replay-store-v1.json",
      result.updated_durable_replay_store,
    ],
    [
      "economic-epoch2-raw-transaction-domain-v1.json",
      result.updated_raw_domain_policy,
    ],
    [
      "economic-evm-successor-migration-candidate-v1.json",
      result.updated_migration_candidate,
    ],
  ];
  for(const [name,value] of outputs){
    fs.writeFileSync(
      path.join(outputDir,name),
      JSON.stringify(value,null,2)+"\n",
      {encoding:"utf8",mode:0o644,flag:"wx"},
    );
  }

  console.log(VOID_ECONOMIC_EPOCH2_CROSS_EPOCH_REPLAY_PROTECTION_PROMOTION_V1);
  console.log("status="+result.promotion.status);
  console.log("production_gateway_replay_store_binding_verified=true");
  console.log("cross_epoch_replay_protection_proven=true");
  console.log("runtime_route_active=false");
  console.log("public_submission_open=false");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("authoritative_chain2050_write=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("funds_movement_authorized=false");
  console.log("output_dir="+outputDir);
}
