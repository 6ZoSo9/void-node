#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_IMPORT_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_IMPORT_V1";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_V1";

const SOURCE_BINDING_MARKER =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1";
const DURABLE_STORE_MARKER =
  "VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1";
const RUNTIME_MARKER =
  "VOID_ECONOMIC_EPOCH2_INACTIVE_PUBLIC_SUBMISSION_GATEWAY_RUNTIME_V1";
const SOURCE_CONTRACT_MARKER =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_CONTRACT_V1";

const HOSTNAME="zoso-Precision-Tower-7810";
const SERVICE_IDENTITY=
  "void-economic-epoch2-public-submission-gateway-v1.service";
const EVIDENCE_PATH=
  "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-runtime-evidence-v1.json";
const IMPORT_PATH=
  "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-runtime-evidence-import-v1.json";
const REPLAY_ROOT=
  "/home/zoso/.local/state/void-economic-epoch2-public-submission-gateway-v1/replay-v1";
const UNIT_PATH=
  "/home/zoso/.config/systemd/user/void-economic-epoch2-public-submission-gateway-v1.service";
const STATUS_PATH=
  "/home/zoso/.local/state/void-economic-epoch2-public-submission-gateway-v1/status-v1.json";

const SHA256=/^[0-9a-f]{64}$/u;
const EVIDENCE_ID=/^voide2gre1_[0-9a-f]{64}$/u;
const DIGEST=/^0x[0-9a-f]{64}$/u;
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;

function fail(reason){ throw new Error(reason); }

function canonical(value){
  if(value===null || typeof value!=="object") return JSON.stringify(value);
  if(Array.isArray(value)) return "["+value.map(canonical).join(",")+"]";
  return "{"+Object.keys(value).sort()
    .map((key)=>JSON.stringify(key)+":"+canonical(value[key]))
    .join(",")+"}";
}

function evidenceId(value){
  const body=structuredClone(value);
  delete body.evidence_id;
  return "voide2gre1_"+
    crypto.createHash("sha256").update(canonical(body),"utf8").digest("hex");
}

function sha256Bytes(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function parseUtc(value,reason){
  if(typeof value!=="string" || !UTC.test(value)) fail(reason);
  const ms=Date.parse(value);
  if(!Number.isFinite(ms)) fail(reason);
  return ms;
}

function requireFalseAuthority(value,truthyKeys=[]){
  if(!value || typeof value!=="object" || Array.isArray(value)){
    fail("runtime_evidence_authority_invalid");
  }
  const allow=new Set(truthyKeys);
  for(const [key,v] of Object.entries(value)){
    if(allow.has(key)){
      if(v!==true) fail("runtime_evidence_authority_invalid:"+key);
    }else if(v!==false){
      fail("runtime_evidence_authority_invalid:"+key);
    }
  }
}

export function verifyVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1({
  evidenceBytes,
  expectedFileSha256,
  expectedEvidenceId,
  evaluationTimeUtc,
  sourceBindingPolicy,
  durableReplayStorePolicy,
  runtimeEvidenceContract,
  rawDomainPolicy,
}){
  if(!Buffer.isBuffer(evidenceBytes)) fail("evidence_bytes_required");
  if(typeof expectedFileSha256!=="string" || !SHA256.test(expectedFileSha256)){
    fail("expected_file_sha256_invalid");
  }
  if(typeof expectedEvidenceId!=="string" || !EVIDENCE_ID.test(expectedEvidenceId)){
    fail("expected_evidence_id_invalid");
  }

  const observedSha=sha256Bytes(evidenceBytes);
  if(observedSha!==expectedFileSha256) fail("evidence_file_sha256_mismatch");

  let evidence;
  try{ evidence=JSON.parse(evidenceBytes.toString("utf8")); }
  catch{ fail("evidence_json_invalid"); }

  if(
    sourceBindingPolicy?.marker!==SOURCE_BINDING_MARKER ||
    sourceBindingPolicy?.version!==1 ||
    sourceBindingPolicy?.gates?.durable_replay_store_implemented!==true ||
    sourceBindingPolicy?.gates?.durable_replay_store_verified!==true ||
    sourceBindingPolicy?.gates
      ?.production_gateway_replay_store_binding_source_verified!==true ||
    sourceBindingPolicy?.gates
      ?.production_gateway_replay_store_binding_verified!==false ||
    sourceBindingPolicy?.gates?.runtime_route_active!==false ||
    sourceBindingPolicy?.gates?.public_submission_open!==false ||
    sourceBindingPolicy?.gates?.cross_epoch_replay_protection_proven!==false
  ){
    fail("source_binding_import_start_state_invalid");
  }

  if(
    durableReplayStorePolicy?.marker!==DURABLE_STORE_MARKER ||
    durableReplayStorePolicy?.version!==1 ||
    durableReplayStorePolicy?.gates?.durable_replay_store_implemented!==true ||
    durableReplayStorePolicy?.gates?.durable_replay_store_verified!==true ||
    durableReplayStorePolicy?.gates
      ?.production_gateway_replay_store_binding_verified!==false ||
    durableReplayStorePolicy?.gates?.runtime_route_active!==false ||
    durableReplayStorePolicy?.gates?.public_submission_open!==false
  ){
    fail("durable_replay_store_import_start_state_invalid");
  }

  if(
    runtimeEvidenceContract?.marker!==SOURCE_CONTRACT_MARKER ||
    runtimeEvidenceContract?.version!==1 ||
    runtimeEvidenceContract?.gates?.runtime_evidence_contract_source_proven!==true ||
    runtimeEvidenceContract?.gates
      ?.production_gateway_replay_store_binding_verified!==false ||
    runtimeEvidenceContract?.gates?.runtime_route_active!==false ||
    runtimeEvidenceContract?.gates?.public_submission_open!==false ||
    runtimeEvidenceContract?.gates?.cross_epoch_replay_protection_proven!==false
  ){
    fail("runtime_evidence_contract_import_start_state_invalid");
  }

  if(
    rawDomainPolicy?.gates?.all_production_validators_epoch_domain_enforced!==true ||
    rawDomainPolicy?.gates?.cross_epoch_replay_protection_proven!==false ||
    rawDomainPolicy?.gates?.migration_authorized!==false ||
    rawDomainPolicy?.gates?.public_activation_authorized!==false
  ){
    fail("raw_domain_import_start_state_invalid");
  }

  if(
    evidence?.marker!==
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_V1 ||
    evidence?.version!==1 ||
    evidence?.status!==
      "INACTIVE_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_CANDIDATE" ||
    evidence?.hostname!==HOSTNAME ||
    evidence?.service_identity!==SERVICE_IDENTITY ||
    evidence?.service_active!==true ||
    evidence?.chain_id!==2050 ||
    evidence?.execution_epoch!==2 ||
    evidence?.runtime_marker!==RUNTIME_MARKER ||
    evidence?.gateway_binding_marker!==SOURCE_BINDING_MARKER ||
    evidence?.durable_replay_store_marker!==DURABLE_STORE_MARKER ||
    evidence?.replay_root!==REPLAY_ROOT ||
    evidence?.replay_root_realpath!==REPLAY_ROOT ||
    !/^[0-9]+$/u.test(String(evidence?.replay_root_dev||"")) ||
    !/^[0-9]+$/u.test(String(evidence?.replay_root_ino||"")) ||
    !Number.isSafeInteger(evidence?.replay_root_uid) ||
    !Number.isSafeInteger(evidence?.replay_root_gid) ||
    evidence?.replay_root_mode!=="700" ||
    !Number.isSafeInteger(evidence?.service_main_pid) ||
    evidence.service_main_pid<=1 ||
    !Number.isSafeInteger(evidence?.service_uid) ||
    !Number.isSafeInteger(evidence?.operator_uid) ||
    evidence.service_uid!==evidence.operator_uid ||
    evidence.replay_root_uid!==evidence.operator_uid ||
    typeof evidence?.node_exec_path!=="string" ||
    !path.isAbsolute(evidence.node_exec_path) ||
    evidence?.unit_file_path!==UNIT_PATH ||
    !SHA256.test(String(evidence?.unit_file_sha256||"")) ||
    evidence?.status_file_path!==STATUS_PATH ||
    !SHA256.test(String(evidence?.status_file_sha256||"")) ||
    evidence?.same_uid_production_trust_proven!==true ||
    evidence?.production_replay_root_selected!==true ||
    evidence?.production_service_identity_bound!==true ||
    evidence?.unit_af_unix_only!==true ||
    evidence?.unit_no_new_privileges!==true ||
    evidence?.unit_protect_system_strict!==true ||
    evidence?.unit_protect_home_read_only!==true ||
    evidence?.unit_umask_0077!==true ||
    !DIGEST.test(String(evidence?.canary_digest||"")) ||
    evidence?.canary_fresh_consumed!==true ||
    evidence?.canary_replay_rejected_after_reopen!==true ||
    !Number.isSafeInteger(evidence?.replay_marker_count_before) ||
    evidence.replay_marker_count_before<0 ||
    evidence.replay_marker_count_before>1 ||
    !Number.isSafeInteger(evidence?.replay_marker_count_after) ||
    evidence.replay_marker_count_after!==evidence.replay_marker_count_before+1 ||
    evidence?.preexisting_marker_receipts_verified!==true ||
    evidence?.preexisting_markers_preserved!==true ||
    evidence?.successful_canary_added_exactly_one_marker!==true ||
    evidence?.bounded_canary_replay_store_mutation!==true ||
    evidence?.production_store_mutation_scope!==
      "one_new_synthetic_digest_marker_preserving_preexisting_markers" ||
    evidence?.ephemeral_test_signer_used!==true ||
    evidence?.ephemeral_signer_private_key_persisted!==false ||
    evidence?.operator_wallet_access!==false ||
    evidence?.rpc_call!==false ||
    evidence?.transaction_construction!==false ||
    evidence?.transaction_signing!==false ||
    evidence?.transaction_submission!==false ||
    evidence?.transaction_broadcast!==false ||
    evidence?.credential_content_access!==false ||
    evidence?.validator_mutation!==false ||
    evidence?.token_movement!==false ||
    evidence?.runtime_route_active!==false ||
    evidence?.public_submission_open!==false ||
    evidence?.production_gateway_replay_store_binding_verified!==false ||
    evidence?.cross_epoch_replay_protection_proven!==false ||
    evidence?.migration_authorized!==false ||
    evidence?.public_activation_authorized!==false ||
    evidence?.authoritative_chain2050_write!==false ||
    evidence?.funds_movement!==false
  ){
    fail("runtime_evidence_semantics_invalid");
  }

  if(evidence?.evidence_id!==expectedEvidenceId){
    fail("evidence_id_input_mismatch");
  }
  if(evidenceId(evidence)!==evidence.evidence_id){
    fail("evidence_id_material_mismatch");
  }

  const observedMs=parseUtc(
    evidence.observed_at_utc,
    "evidence_observed_at_utc_invalid",
  );
  const validUntilMs=parseUtc(
    evidence.valid_until_utc,
    "evidence_valid_until_utc_invalid",
  );
  const evaluationMs=parseUtc(
    evaluationTimeUtc,
    "evaluation_time_utc_invalid",
  );
  if(
    validUntilMs<=observedMs ||
    validUntilMs-observedMs>3_600_000 ||
    evaluationMs<observedMs ||
    evaluationMs>validUntilMs
  ){
    fail("runtime_evidence_not_current");
  }

  return Object.freeze({
    ok:true,
    status:"PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_VALID",
    evidence_file_sha256:observedSha,
    evidence_id:evidence.evidence_id,
    observed_at_utc:evidence.observed_at_utc,
    valid_until_utc:evidence.valid_until_utc,
    import_evaluated_at_utc:evaluationTimeUtc,
    hostname:evidence.hostname,
    service_identity:evidence.service_identity,
    replay_root:evidence.replay_root,
    replay_marker_count_before:evidence.replay_marker_count_before,
    replay_marker_count_after:evidence.replay_marker_count_after,
    production_replay_root_selected:true,
    production_service_identity_bound:true,
    same_uid_production_trust_proven:true,
    preexisting_marker_receipts_verified:true,
    preexisting_markers_preserved:true,
    successful_canary_added_exactly_one_marker:true,
    canary_fresh_consumed:true,
    canary_replay_rejected_after_reopen:true,
    runtime_route_active:false,
    public_submission_open:false,
    production_gateway_replay_store_binding_verified:false,
    cross_epoch_replay_protection_proven:false,
    authoritative_chain2050_write:false,
    funds_movement:false,
  });
}

export function importVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1(args){
  const verified=
    verifyVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1(args);

  return Object.freeze({
    marker:
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_IMPORT_V1,
    version:1,
    status:
      "PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_IMPORTED_PROMOTION_HOLD",
    chain_id:2050,
    execution_epoch:2,
    evidence_file:EVIDENCE_PATH,
    import_receipt_file:IMPORT_PATH,
    evidence_file_sha256:verified.evidence_file_sha256,
    evidence_id:verified.evidence_id,
    observed_at_utc:verified.observed_at_utc,
    valid_until_utc:verified.valid_until_utc,
    import_evaluated_at_utc:verified.import_evaluated_at_utc,
    runtime_binding:Object.freeze({
      hostname:verified.hostname,
      service_identity:verified.service_identity,
      replay_root:verified.replay_root,
      replay_marker_count_before:verified.replay_marker_count_before,
      replay_marker_count_after:verified.replay_marker_count_after,
    }),
    verification:Object.freeze({
      evidence_file_sha256_verified:true,
      evidence_id_verified:true,
      evidence_id_material_verified:true,
      runtime_evidence_semantically_verified:true,
      evidence_fresh_at_import:true,
      production_replay_root_selected:true,
      production_service_identity_bound:true,
      same_uid_production_trust_proven:true,
      preexisting_marker_receipts_verified:true,
      preexisting_markers_preserved:true,
      successful_canary_added_exactly_one_marker:true,
      canary_fresh_consumed:true,
      canary_replay_rejected_after_reopen:true,
    }),
    gates:Object.freeze({
      runtime_evidence_imported:true,
      runtime_evidence_semantically_verified:true,
      production_gateway_replay_store_binding_verified:false,
      runtime_route_active:false,
      public_submission_open:false,
      cross_epoch_replay_protection_proven:false,
      migration_authorized:false,
      public_activation_authorized:false,
      funds_movement_authorized:false,
    }),
    authority:Object.freeze({
      source_import_only:true,
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
}

function arg(name){
  const i=process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : undefined;
}
function readJson(filename){
  return JSON.parse(fs.readFileSync(filename,"utf8"));
}

if(
  process.argv[1] &&
  import.meta.url===new URL("file://"+path.resolve(process.argv[1])).href
){
  const evidencePath=path.resolve(String(arg("--evidence")||""));
  const expectedFileSha256=String(arg("--expected-file-sha256")||"");
  const expectedEvidenceId=String(arg("--expected-evidence-id")||"");
  const evaluationTimeUtc=String(arg("--evaluation-time-utc")||"");
  const outputPath=path.resolve(String(arg("--output")||""));

  if(!evidencePath || evidencePath===path.parse(evidencePath).root){
    fail("evidence_path_required");
  }
  if(!outputPath || outputPath===path.parse(outputPath).root){
    fail("output_path_required");
  }
  if(!fs.existsSync(evidencePath)) fail("evidence_file_missing");
  if(fs.existsSync(outputPath)) fail("output_already_exists");

  const receipt=
    importVoidEconomicEpoch2ProductionGatewayReplayBindingRuntimeEvidenceV1({
      evidenceBytes:fs.readFileSync(evidencePath),
      expectedFileSha256,
      expectedEvidenceId,
      evaluationTimeUtc,
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
    });

  fs.writeFileSync(
    outputPath,
    JSON.stringify(receipt,null,2)+"\n",
    {encoding:"utf8",mode:0o644,flag:"wx"},
  );

  console.log(
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_RUNTIME_EVIDENCE_IMPORT_V1,
  );
  console.log("status="+receipt.status);
  console.log("evidence_file_sha256="+receipt.evidence_file_sha256);
  console.log("evidence_id="+receipt.evidence_id);
  console.log("runtime_evidence_semantically_verified=true");
  console.log("evidence_fresh_at_import=true");
  console.log("production_gateway_replay_store_binding_verified=false");
  console.log("cross_epoch_replay_protection_proven=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("funds_movement_authorized=false");
  console.log("output="+outputPath);
}
