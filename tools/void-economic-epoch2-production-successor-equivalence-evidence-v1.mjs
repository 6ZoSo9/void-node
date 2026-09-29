#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_EVIDENCE_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_EVIDENCE_V1";

const HOSTNAME="zoso-Precision-Tower-7810";
const STATE_MANIFEST_SHA256=
  "affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9";
const STATE_MANIFEST_MATERIAL_SHA256=
  "286034e3adb1654c13899b959075fcfa2504a6942c83ec52febb156bd0ea2a4f";
const QBFT_EXTRA_DATA_EVIDENCE_SHA256=
  "c4a98142cc09ddc2c2a2036ffe5a59a1f7e06ff4b213a2d09f39d20bb698adee";
const QBFT_BINDING_SHA256=
  "32b4bac996c952286e7005bac27dbccbaa81f4adc9c6072bff7f9485122e1143";
const QBFT_EXTRA_DATA_SHA256=
  "3449e754ec65555e90ea70cdf830f4a8a18946ee5b6221fcf5ad1a748a98c181";
const NONCE_CONTINUITY_EVIDENCE_SHA256=
  "b89723b6e67a05d7e79b0d5d3c90b32d91dcdb3d08de3b8f685309f887cdd876";
const NONCE_CONTINUITY_STATE_ROOT_RECORDED=
  "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b";
const NONCE_CONTINUITY_STATE_ROOT=
  "0x07aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b";
const BESU_IMAGE=
  "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042";
const VALIDATORS=Object.freeze([
  "0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863",
  "0x02f967953386188397b992c208239d3a25180db6",
  "0x461bf06270d9d28962f7570182c061b828799b66",
]);

const BINDING_PATH=
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json";
const EXTRA_DATA_PATH=
  "ops/mainnet0/economic-epoch2-qbft-production-extra-data-v1.json";
const NONCE_EQ_PATH=
  "ops/mainnet0/economic-epoch2-besu-nonce-continuity-evidence-v1.json";
const MIGRATION_PATH=
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";

const SHA256=/^[0-9a-f]{64}$/u;
const HEX32=/^0x[0-9a-f]{64}$/u;
const COMMIT=/^[0-9a-f]{40}$/u;
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;

function fail(reason){ throw new Error(reason); }
function readJson(file){ return JSON.parse(fs.readFileSync(file,"utf8")); }
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
function exactObject(value,keys,reason){
  if(!value || typeof value!=="object" || Array.isArray(value)) fail(reason);
  const actual=Object.keys(value).sort();
  const expected=[...keys].sort();
  if(
    actual.length!==expected.length ||
    actual.some((k,i)=>k!==expected[i])
  ) fail(reason);
}
function fileSha(file){ return sha256(fs.readFileSync(file)); }

export function buildVoidEconomicEpoch2ProductionSuccessorEquivalenceEvidenceV1({
  facts,
  observedAtUtc,
  hostName=os.hostname(),
}){
  const binding=readJson(BINDING_PATH);
  const extra=readJson(EXTRA_DATA_PATH);
  const nonceEq=readJson(NONCE_EQ_PATH);
  const migration=readJson(MIGRATION_PATH);

  if(
    fileSha(BINDING_PATH)!==QBFT_BINDING_SHA256 ||
    fileSha(EXTRA_DATA_PATH)!==QBFT_EXTRA_DATA_EVIDENCE_SHA256 ||
    fileSha(NONCE_EQ_PATH)!==NONCE_CONTINUITY_EVIDENCE_SHA256
  ) fail("canonical_qbft_input_sha256_mismatch");

  if(
    binding?.marker!=="VOID_ECONOMIC_EPOCH2_QBFT_VALIDATOR_BINDING_CANDIDATE_V1" ||
    binding?.qbft?.production_validator_count!==3 ||
    binding?.qbft?.required_validator_quorum!==2 ||
    binding?.qbft?.attested_live_node_count!==3 ||
    binding?.qbft?.attested_identity_slots_remaining!==0 ||
    binding?.qbft?.production_extra_data_built!==true ||
    binding?.qbft?.production_extra_data_sha256!==QBFT_EXTRA_DATA_SHA256 ||
    binding?.gates?.qbft_production_extra_data_built!==true ||
    binding?.gates?.production_validator_set_bound!==false ||
    binding?.gates?.offline_successor_equivalence_proven!==false
  ) fail("canonical_qbft_binding_start_state_invalid");

  if(
    extra?.marker!=="VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_EVIDENCE_V1" ||
    extra?.status!=="PRODUCTION_QBFT_EXTRA_DATA_BUILT_GENESIS_BINDING_HOLD" ||
    extra?.client?.image!==BESU_IMAGE ||
    extra?.validator_count!==3 ||
    extra?.extra_data_sha256!==QBFT_EXTRA_DATA_SHA256 ||
    extra?.decoded?.validator_order_exact!==true ||
    extra?.decoded?.independently_reencoded_exact!==true ||
    extra?.gates?.production_validator_set_bound!==false ||
    extra?.gates?.offline_successor_equivalence_proven!==false ||
    JSON.stringify(extra.validators)!==JSON.stringify(VALIDATORS)
  ) fail("canonical_qbft_extra_data_invalid");

  if(
    nonceEq?.marker!=="VOID_ECONOMIC_EPOCH2_BESU_NONCE_CONTINUITY_EVIDENCE_V1" ||
    nonceEq?.status!=="BESU_NONCE_CONTINUITY_AND_ECONOMIC_STATE_EQUIVALENCE_GREEN" ||
    nonceEq?.source_state?.client_neutral_state_manifest_file_sha256!==
      STATE_MANIFEST_SHA256 ||
    nonceEq?.besu?.repo_digest!==BESU_IMAGE ||
    nonceEq?.besu?.genesis_state_root!==
      NONCE_CONTINUITY_STATE_ROOT_RECORDED ||
    nonceEq?.state_equivalence?.alloc_account_count!==156 ||
    nonceEq?.state_equivalence?.economic_state_account_count!==4 ||
    nonceEq?.state_equivalence?.verified_storage_entry_count!==1268 ||
    nonceEq?.state_equivalence?.client_specific_state_equivalence_proven!==true ||
    nonceEq?.nonce_continuity?.frozen_epoch1_nonzero_nonce_account_count!==154 ||
    nonceEq?.nonce_continuity?.nonce_only_alloc_account_count!==152 ||
    nonceEq?.nonce_continuity?.maximum_preserved_nonce!=="273" ||
    nonceEq?.nonce_continuity?.all_nonce_readbacks_exact!==true ||
    nonceEq?.nonce_continuity?.all_nonce_only_native_balances_zero!==true ||
    nonceEq?.nonce_continuity?.all_retired_nonce_only_code_absent!==true ||
    nonceEq?.gates?.production_validator_set_bound!==false ||
    nonceEq?.gates?.offline_successor_equivalence_proven!==false
  ) fail("canonical_nonce_continuity_equivalence_invalid");

  if(
    migration?.successor_execution_layer?.production_validator_set_bound!==false ||
    migration?.funds_safety?.offline_successor_equivalence_proven!==false ||
    migration?.replay_and_epoch_safety?.cross_epoch_replay_protection_proven!==true ||
    migration?.replay_and_epoch_safety
      ?.all_production_validators_epoch_domain_enforced!==true ||
    migration?.launch_authority?.source_only!==true
  ) fail("canonical_migration_start_state_invalid");

  for(const [key,value] of Object.entries(migration.launch_authority)){
    if(key==="source_only") continue;
    if(value!==false) fail("canonical_migration_authority_not_closed:"+key);
  }

  exactObject(
    facts,
    [
      "marker",
      "version",
      "hostname",
      "source_commit",
      "state_manifest_file_sha256",
      "state_manifest_material_sha256",
      "qbft_binding_file_sha256",
      "qbft_extra_data_evidence_file_sha256",
      "qbft_extra_data_sha256",
      "besu_image",
      "genesis_file_sha256",
      "builder_evidence_file_sha256",
      "state_equivalence_receipt_sha256",
      "nonce_continuity_evidence_file_sha256",
      "chain_id",
      "network_id",
      "block_number",
      "block_hash",
      "state_root",
      "nonce_continuity_state_root",
      "state_root_matches_nonce_continuity_equivalence",
      "block0_extra_data_exact",
      "production_qbft_extra_data_bound_into_genesis",
      "validator_roster_readback_exact",
      "production_validator_count",
      "required_validator_quorum",
      "byzantine_fault_tolerance",
      "validators",
      "client_specific_state_equivalence_proven",
      "verified_storage_entry_count",
      "native_balance_sum_wei",
      "successor_total_supply_atoms",
      "successor_holder_sum_atoms",
      "nonce_continuity_account_count",
      "nonce_only_alloc_account_count",
      "maximum_nonce",
      "all_nonce_readbacks_exact",
      "all_nonce_only_native_balances_zero",
      "all_retired_nonce_only_code_absent",
      "known_retained_raw_transaction_stale_under_exact_nonce_continuity",
      "production_validator_set_bound",
      "offline_successor_equivalence_proven",
      "rpc_scope",
      "p2p_enabled",
      "discovery_enabled",
      "transaction_construction",
      "transaction_signing",
      "transaction_submission",
      "transaction_broadcast",
      "authoritative_chain2050_write",
      "wallet_access",
      "private_key_access",
      "credential_content_access",
      "validator_mutation",
      "token_movement",
      "funds_movement",
      "migration_authorized",
      "public_activation_authorized",
    ],
    "production_successor_equivalence_facts_shape_invalid",
  );

  if(
    hostName!==HOSTNAME ||
    facts.marker!=="VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_FACTS_V1" ||
    facts.version!==1 ||
    facts.hostname!==HOSTNAME ||
    !COMMIT.test(String(facts.source_commit||"")) ||
    facts.state_manifest_file_sha256!==STATE_MANIFEST_SHA256 ||
    facts.state_manifest_material_sha256!==STATE_MANIFEST_MATERIAL_SHA256 ||
    facts.qbft_binding_file_sha256!==QBFT_BINDING_SHA256 ||
    facts.qbft_extra_data_evidence_file_sha256!==QBFT_EXTRA_DATA_EVIDENCE_SHA256 ||
    facts.qbft_extra_data_sha256!==QBFT_EXTRA_DATA_SHA256 ||
    facts.besu_image!==BESU_IMAGE ||
    !SHA256.test(String(facts.genesis_file_sha256||"")) ||
    !SHA256.test(String(facts.builder_evidence_file_sha256||"")) ||
    !SHA256.test(String(facts.state_equivalence_receipt_sha256||"")) ||
    facts.nonce_continuity_evidence_file_sha256!==
      NONCE_CONTINUITY_EVIDENCE_SHA256 ||
    facts.chain_id!==2050 ||
    facts.network_id!=="2050" ||
    facts.block_number!=="0" ||
    !HEX32.test(String(facts.block_hash||"")) ||
    facts.state_root!==NONCE_CONTINUITY_STATE_ROOT ||
    facts.nonce_continuity_state_root!==NONCE_CONTINUITY_STATE_ROOT ||
    facts.state_root_matches_nonce_continuity_equivalence!==true ||
    facts.block0_extra_data_exact!==true ||
    facts.production_qbft_extra_data_bound_into_genesis!==true ||
    facts.validator_roster_readback_exact!==true ||
    facts.production_validator_count!==3 ||
    facts.required_validator_quorum!==2 ||
    facts.byzantine_fault_tolerance!==0 ||
    !Array.isArray(facts.validators) ||
    JSON.stringify(facts.validators)!==JSON.stringify(VALIDATORS) ||
    facts.client_specific_state_equivalence_proven!==true ||
    facts.verified_storage_entry_count!==1268 ||
    facts.native_balance_sum_wei!=="0" ||
    facts.successor_total_supply_atoms!=="333333333000000000000000000" ||
    facts.successor_holder_sum_atoms!=="333333333000000000000000000" ||
    facts.nonce_continuity_account_count!==154 ||
    facts.nonce_only_alloc_account_count!==152 ||
    facts.maximum_nonce!=="273" ||
    facts.all_nonce_readbacks_exact!==true ||
    facts.all_nonce_only_native_balances_zero!==true ||
    facts.all_retired_nonce_only_code_absent!==true ||
    facts.known_retained_raw_transaction_stale_under_exact_nonce_continuity!==true ||
    facts.production_validator_set_bound!==true ||
    facts.offline_successor_equivalence_proven!==true ||
    facts.rpc_scope!=="isolated_loopback_disposable_besu" ||
    facts.p2p_enabled!==false ||
    facts.discovery_enabled!==false ||
    facts.transaction_construction!==false ||
    facts.transaction_signing!==false ||
    facts.transaction_submission!==false ||
    facts.transaction_broadcast!==false ||
    facts.authoritative_chain2050_write!==false ||
    facts.wallet_access!==false ||
    facts.private_key_access!==false ||
    facts.credential_content_access!==false ||
    facts.validator_mutation!==false ||
    facts.token_movement!==false ||
    facts.funds_movement!==false ||
    facts.migration_authorized!==false ||
    facts.public_activation_authorized!==false
  ) fail("production_successor_equivalence_facts_invalid");

  if(!UTC.test(String(observedAtUtc||"")) || !Number.isFinite(Date.parse(observedAtUtc))){
    fail("observed_at_utc_invalid");
  }

  const evidence={
    marker:VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_EVIDENCE_V1,
    version:1,
    status:"PRODUCTION_VALIDATOR_BOUND_OFFLINE_SUCCESSOR_EQUIVALENCE_EVIDENCE_GREEN",
    chain_id:2050,
    execution_epoch:2,
    hostname:HOSTNAME,
    source_commit:facts.source_commit,
    canonical_inputs:{
      state_manifest_file_sha256:STATE_MANIFEST_SHA256,
      state_manifest_material_sha256:STATE_MANIFEST_MATERIAL_SHA256,
      qbft_binding_file_sha256:QBFT_BINDING_SHA256,
      qbft_extra_data_evidence_file_sha256:QBFT_EXTRA_DATA_EVIDENCE_SHA256,
      qbft_extra_data_sha256:QBFT_EXTRA_DATA_SHA256,
      nonce_continuity_evidence_file_sha256:
        NONCE_CONTINUITY_EVIDENCE_SHA256,
      nonce_continuity_state_root_recorded:
        NONCE_CONTINUITY_STATE_ROOT_RECORDED,
      nonce_continuity_state_root:NONCE_CONTINUITY_STATE_ROOT,
      besu_image:BESU_IMAGE,
    },
    runtime_artifacts:{
      genesis_file_sha256:facts.genesis_file_sha256,
      builder_evidence_file_sha256:facts.builder_evidence_file_sha256,
      state_equivalence_receipt_sha256:facts.state_equivalence_receipt_sha256,
      block_hash:facts.block_hash,
      state_root:facts.state_root,
    },
    consensus:{
      validator_count:3,
      required_validator_quorum:2,
      byzantine_fault_tolerance:0,
      validators:[...VALIDATORS],
      block0_extra_data_exact:true,
      production_qbft_extra_data_bound_into_genesis:true,
      validator_roster_readback_exact:true,
      production_validator_set_bound:true,
    },
    economic_state:{
      state_root_matches_nonce_continuity_equivalence:true,
      client_specific_state_equivalence_proven:true,
      verified_storage_entry_count:1268,
      native_balance_sum_wei:"0",
      successor_total_supply_atoms:"333333333000000000000000000",
      successor_holder_sum_atoms:"333333333000000000000000000",
      nonce_continuity_account_count:154,
      nonce_only_alloc_account_count:152,
      maximum_nonce:"273",
      all_nonce_readbacks_exact:true,
      all_nonce_only_native_balances_zero:true,
      all_retired_nonce_only_code_absent:true,
      known_retained_raw_transaction_stale_under_exact_nonce_continuity:true,
      offline_successor_equivalence_proven:true,
    },
    gates:{
      production_validator_set_bound:true,
      offline_successor_equivalence_proven:true,
      cross_epoch_replay_protection_proven:true,
      successor_state_root_public_void_anchor_ready:false,
      public_balance_receipt_code_verification_ready:false,
      migration_authorized:false,
      public_activation_authorized:false,
    },
    authority:{
      evidence_only:true,
      isolated_loopback_rpc_read:true,
      p2p_enabled:false,
      discovery_enabled:false,
      service_action:false,
      production_rpc_contact:false,
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
    },
    observed_at_utc:observedAtUtc,
    evidence_id:"voide2pse1_"+"0".repeat(64),
  };
  evidence.evidence_id=evidenceId(evidence);
  return Object.freeze(evidence);
}

function arg(name){
  const i=process.argv.indexOf(name);
  return i>=0?process.argv[i+1]:undefined;
}

if(
  process.argv[1] &&
  import.meta.url===new URL("file://"+path.resolve(process.argv[1])).href
){
  const factsPath=path.resolve(String(arg("--facts")||""));
  const outputPath=path.resolve(String(arg("--output")||""));
  const observedAtUtc=String(arg("--observed-at-utc")||"");
  if(!factsPath || factsPath===path.parse(factsPath).root) fail("facts_path_required");
  if(!outputPath || outputPath===path.parse(outputPath).root) fail("output_path_required");
  if(fs.existsSync(outputPath)) fail("output_already_exists");

  const evidence=buildVoidEconomicEpoch2ProductionSuccessorEquivalenceEvidenceV1({
    facts:readJson(factsPath),
    observedAtUtc,
  });
  fs.writeFileSync(
    outputPath,
    JSON.stringify(evidence,null,2)+"\n",
    {encoding:"utf8",mode:0o644,flag:"wx"},
  );

  console.log(VOID_ECONOMIC_EPOCH2_PRODUCTION_SUCCESSOR_EQUIVALENCE_EVIDENCE_V1);
  console.log("evidence_id="+evidence.evidence_id);
  console.log("production_validator_set_bound=true");
  console.log("offline_successor_equivalence_proven=true");
  console.log("cross_epoch_replay_protection_proven=true");
  console.log("successor_state_root_public_void_anchor_ready=false");
  console.log("public_balance_receipt_code_verification_ready=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("authoritative_chain2050_write=false");
  console.log("funds_movement=false");
  console.log("output="+outputPath);
}
