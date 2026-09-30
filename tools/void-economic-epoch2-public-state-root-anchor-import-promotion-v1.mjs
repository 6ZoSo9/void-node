#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";
import {
  verifyEconomicEpoch2PublicStateRootAnchorAdmissionCandidateV1,
} from "./void-economic-epoch2-public-state-root-anchor-admission-v1.mjs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "./void-economic-evm-successor-migration-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_PROMOTION_V1 =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_PROMOTION_V1";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_CONFIRMATION_V1 =
  "importReviewedRealFinalizedStateRootMembershipV1";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_PROMOTION_AUTHORITY_V1 =
  Object.freeze({
    source_promotion_only: true,
    reviewed_membership_digest_required: true,
    explicit_review_confirmation_required: true,
    canonical_truth_admission_rederived: true,
    candidate_copy_only: true,
    derived_output_write: true,
    repository_mutation_authorized: false,
    rpc_call: false,
    network_call: false,
    credential_content_access: false,
    wallet_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    validator_mutation: false,
    governance_mutation: false,
    work_credit_mutation: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation_authorized: false,
  });

const SHA256=/^[0-9a-f]{64}$/u;
const ADDRESS=/^0x[0-9a-f]{40}$/u;
const MAX_MEMBERSHIP_BYTES=1024*1024;
const PAYLOAD_PATH=
  "public/public-node/evidence/economic-epoch2-public-void-state-root-anchor-v1.json";
const MIGRATION_PATH=
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const PROMOTION_FILENAME=
  "economic-epoch2-public-state-root-anchor-import-promotion-v1.json";
const UPDATED_MIGRATION_FILENAME=
  "economic-evm-successor-migration-candidate-v1.json";

const MODULE_REPO_ROOT=
  path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MAX_CANONICAL_SOURCE_BYTES=8*1024*1024;
const PUBLIC_PROMOTION_INPUT_KEYS=Object.freeze([
  "membershipBytes",
  "expectedMembershipSha256",
  "expectedRegistryAddress",
  "expectedPublisherAddress",
  "reviewConfirmation",
]);

export const VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_CANONICAL_GIT_BLOBS_V1=
  Object.freeze({
    anchor_payload:Object.freeze({
      path:PAYLOAD_PATH,
      git_blob_sha1:"cd15adcccbc1620656df72ec75808cc4510e3fe1",
    }),
    migration_candidate:Object.freeze({
      path:MIGRATION_PATH,
      git_blob_sha1:"1457b8a0b060c4c515bf2232320af19f4e70dd35",
    }),
    state_root_admission:Object.freeze({
      path:"tools/void-economic-epoch2-public-state-root-anchor-admission-v1.mjs",
      git_blob_sha1:"0e35fb0c8cdf3083d5be99ad98b7eb0c94f0ddaa",
    }),
    migration_classifier:Object.freeze({
      path:"tools/void-economic-evm-successor-migration-v1.mjs",
      git_blob_sha1:"9f51b193da687669700c898ed587edf9040f6264",
    }),
    state_root_anchor_verifier:Object.freeze({
      path:"tools/void-economic-epoch2-public-void-state-root-anchor-v1.mjs",
      git_blob_sha1:"3f42b09a8d0861cc2c34056b85b410065ac43892",
    }),
    canonical_truth_admission:Object.freeze({
      path:"tools/datanet-content-commitment-canonical-truth-admission-v1.mjs",
      git_blob_sha1:"ee92747e3109e3b8940c1d8657d51c9a14fc961e",
    }),
    compiler_profile:Object.freeze({
      path:"tools/datanet-content-commitment-compiler-profile-v1.mjs",
      git_blob_sha1:"d02d94a11f7f8df89c3e9886866dd4929147f2a1",
    }),
  });

function fail(reason) {
  throw new Error(reason);
}

function digest(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function gitBlobSha1(bytes) {
  if(!Buffer.isBuffer(bytes)) fail("git_blob_bytes_required");
  const header=Buffer.from("blob "+bytes.length+"\0","utf8");
  return crypto.createHash("sha1").update(header).update(bytes).digest("hex");
}

function exactObjectKeys(value,expected) {
  return value!==null&&
    typeof value==="object"&&
    !Array.isArray(value)&&
    JSON.stringify(Object.keys(value).sort())===
      JSON.stringify([...expected].sort());
}

function canonicalAddress(value,label) {
  if(typeof value!=="string") fail(label+"_invalid");
  const lower=value.toLowerCase();
  if(!ADDRESS.test(lower)||lower==="0x0000000000000000000000000000000000000000"){
    fail(label+"_invalid");
  }
  return lower;
}

function parseJsonBytes(bytes,label) {
  if(!Buffer.isBuffer(bytes)) fail(label+"_bytes_required");
  let value;
  try {
    value=JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(label+"_json_invalid");
  }
  if(!value||typeof value!=="object"||Array.isArray(value)) {
    fail(label+"_object_required");
  }
  return value;
}

function assertClosedLaunchAuthority(candidate) {
  if(candidate?.launch_authority?.source_only!==true) {
    fail("migration_source_only_authority_required");
  }
  for(const [key,value] of Object.entries(candidate.launch_authority)) {
    if(key==="source_only") continue;
    if(value!==false) fail("migration_authority_must_remain_closed:"+key);
  }
}

function classifyPromotedCandidate(candidate) {
  const classified=classifyVoidEconomicEvmSuccessorMigrationV1(candidate);
  if(classified?.status==="SOURCE_READY") {
    if(
      classified.migration_authorized!==false||
      classified.public_activation_authorized!==false||
      classified.money_movement_authorized!==false
    ) {
      fail("source_ready_authority_boundary_invalid");
    }
    return Object.freeze({
      migration_classifier_status:"SOURCE_READY",
      remaining_migration_gates:Object.freeze([]),
    });
  }

  const missing=Array.isArray(classified?.missing_gates)
    ? [...classified.missing_gates]
    : [];
  if(
    classified?.status!=="HOLD"||
    classified?.reason!=="migration_gates_incomplete"||
    missing.length!==1||
    missing[0]!=="public_economic_verification_path_required"
  ) {
    fail(
      "state_root_promotion_did_not_leave_only_public_read_gate:"+
      JSON.stringify({status:classified?.status,reason:classified?.reason,missing}),
    );
  }
  return Object.freeze({
    migration_classifier_status:"HOLD",
    remaining_migration_gates:Object.freeze(missing),
  });
}

function promoteFromBoundCanonicalSourcesV1({
  membershipBytes,
  expectedMembershipSha256,
  expectedRegistryAddress,
  expectedPublisherAddress,
  reviewConfirmation,
  payloadBytes,
  migrationCandidate,
  canonicalSource,
}) {
  if(!Buffer.isBuffer(membershipBytes)) fail("membership_bytes_required");
  if(
    membershipBytes.length<2||
    membershipBytes.length>MAX_MEMBERSHIP_BYTES
  ) {
    fail("membership_size_invalid");
  }
  if(!SHA256.test(String(expectedMembershipSha256||""))) {
    fail("expected_membership_sha256_invalid");
  }
  const membershipSha256=digest(membershipBytes);
  if(membershipSha256!==expectedMembershipSha256) {
    fail("reviewed_membership_sha256_mismatch");
  }
  if(
    reviewConfirmation!==
      VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_CONFIRMATION_V1
  ) {
    fail("review_confirmation_required");
  }

  const membership=parseJsonBytes(membershipBytes,"membership");
  const registry=canonicalAddress(
    expectedRegistryAddress,
    "expected_registry_address",
  );
  const publisher=canonicalAddress(
    expectedPublisherAddress,
    "expected_publisher_address",
  );

  if(
    !Buffer.isBuffer(payloadBytes)||
    !migrationCandidate||
    typeof migrationCandidate!=="object"||
    Array.isArray(migrationCandidate)
  ) {
    fail("canonical_inputs_invalid");
  }
  if(
    !exactObjectKeys(canonicalSource,[
      "binding",
      "files",
      "exact_git_blob_sha1_verified",
      "caller_supplied_anchor_payload",
      "caller_supplied_migration_candidate",
      "classifier_admission_execution_source_bound",
    ])||
    canonicalSource.binding!=="exact_reviewed_git_blob_set_v1"||
    canonicalSource.exact_git_blob_sha1_verified!==true||
    canonicalSource.caller_supplied_anchor_payload!==false||
    canonicalSource.caller_supplied_migration_candidate!==false||
    canonicalSource.classifier_admission_execution_source_bound!==true
  ) {
    fail("canonical_source_binding_invalid");
  }

  if(
    migrationCandidate?.marker!=="VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1"||
    migrationCandidate?.version!==1||
    migrationCandidate?.public_verification
      ?.successor_state_root_public_void_anchor_ready!==false
  ) {
    fail("migration_state_root_promotion_start_state_invalid");
  }
  assertClosedLaunchAuthority(migrationCandidate);

  const admission=
    verifyEconomicEpoch2PublicStateRootAnchorAdmissionCandidateV1({
      payload_bytes:payloadBytes,
      finalized_event_membership:membership,
      expected_registry_address:registry,
      expected_publisher_address:publisher,
    });

  if(
    admission?.ok!==true||
    admission.status!==
      "CANONICAL_TRUTH_CANDIDATE_VALID_REAL_IMPORT_REQUIRED"||
    admission.successor_state_root_public_void_anchor_candidate_ready!==true||
    admission.canonical_truth_admission_input_verified!==true||
    admission.canonical_commitment_reference_matches_anchor!==true||
    admission.exact_registry_address_bound!==true||
    admission.exact_publisher_address_bound!==true||
    admission.real_finalized_membership_import_verified!==false||
    admission.successor_state_root_public_void_anchor_ready!==false||
    admission.chain2050_write_performed!==false
  ) {
    fail("state_root_anchor_admission_candidate_invalid");
  }

  if(
    admission.registry_address!==registry||
    admission.publisher_address!==publisher||
    admission.finalized_event_membership_id!==
      membership.finalized_event_membership_id
  ) {
    fail("state_root_anchor_reviewed_membership_binding_mismatch");
  }

  const updatedMigration=structuredClone(migrationCandidate);
  updatedMigration.public_verification
    .successor_state_root_public_void_anchor_ready=true;

  assertClosedLaunchAuthority(updatedMigration);
  const classification=classifyPromotedCandidate(updatedMigration);

  const material=Object.freeze({
    marker:
      VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_PROMOTION_V1,
    version:1,
    status:
      classification.migration_classifier_status==="SOURCE_READY"
        ? "STATE_ROOT_PUBLIC_VOID_ANCHOR_PROMOTED_SOURCE_READY_CANDIDATE"
        : "STATE_ROOT_PUBLIC_VOID_ANCHOR_PROMOTED_PUBLIC_READ_GATE_PENDING",
    chain_id:2050,
    execution_epoch:2,
    canonical_source:canonicalSource,
    reviewed_membership:Object.freeze({
      file_sha256:membershipSha256,
      finalized_event_membership_id:
        membership.finalized_event_membership_id,
      finalized_receipt_admission_id:
        membership.finalized_receipt_admission_id,
      canonical_commitment_truth_admission_id:
        admission.canonical_commitment_truth_admission_id,
      commitment_id:admission.commitment_id,
      commitment_transaction_hash:
        admission.commitment_transaction_hash,
      commitment_log_index:admission.commitment_log_index,
      registry_address:registry,
      publisher_address:publisher,
      accepted_checkpoint_height:
        admission.accepted_checkpoint_height,
      accepted_checkpoint_hash:
        admission.accepted_checkpoint_hash,
      accepted_checkpoint_policy_id:
        admission.accepted_checkpoint_policy_id,
    }),
    anchor:Object.freeze({
      object_id:admission.object_id,
      object_id_sha256:admission.object_id_sha256,
      content_sha256:admission.content_sha256,
      byte_length:admission.byte_length,
      genesis_block_hash:admission.genesis_block_hash,
      genesis_state_root:admission.genesis_state_root,
      admission_candidate_id:admission.admission_candidate_id,
    }),
    verification:Object.freeze({
      reviewed_membership_file_sha256_verified:true,
      explicit_review_confirmation_verified:true,
      canonical_git_blob_set_verified:true,
      caller_supplied_canonical_inputs_rejected:true,
      classifier_admission_execution_source_bound:true,
      canonical_truth_admission_rederived:true,
      exact_anchor_payload_verified:true,
      exact_registry_address_bound:true,
      exact_publisher_address_bound:true,
      real_finalized_membership_import_verified:true,
      successor_state_root_public_void_anchor_ready:true,
      migration_classifier_status:
        classification.migration_classifier_status,
      remaining_migration_gates:
        classification.remaining_migration_gates,
    }),
    authority:
      VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_PROMOTION_AUTHORITY_V1,
  });

  const promotion=Object.freeze({
    ...material,
    promotion_id:
      "voide2sraip1_"+sha256(canonicalJson(material)),
  });

  return Object.freeze({
    promotion,
    updated_migration_candidate:updatedMigration,
  });
}

function loadCanonicalPromotionSourceV1() {
  const bytes={};
  const identities={};
  for(const [name,binding] of Object.entries(
    VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_CANONICAL_GIT_BLOBS_V1,
  )) {
    const file=path.resolve(MODULE_REPO_ROOT,binding.path);
    const fileBytes=readRegularFileNoSymlink(
      file,
      "canonical_source_"+name,
      MAX_CANONICAL_SOURCE_BYTES,
    );
    const blobSha1=gitBlobSha1(fileBytes);
    if(blobSha1!==binding.git_blob_sha1) {
      fail("canonical_source_git_blob_mismatch:"+name);
    }
    bytes[name]=fileBytes;
    identities[name]=Object.freeze({
      path:binding.path,
      git_blob_sha1:blobSha1,
      file_sha256:digest(fileBytes),
    });
  }

  return Object.freeze({
    bytes:Object.freeze(bytes),
    identity:Object.freeze({
      binding:"exact_reviewed_git_blob_set_v1",
      files:Object.freeze(identities),
      exact_git_blob_sha1_verified:true,
      caller_supplied_anchor_payload:false,
      caller_supplied_migration_candidate:false,
      classifier_admission_execution_source_bound:true,
    }),
  });
}

export function promoteVoidEconomicEpoch2PublicStateRootAnchorImportV1(input) {
  if(!exactObjectKeys(input,PUBLIC_PROMOTION_INPUT_KEYS)) {
    fail("promotion_input_keys_invalid");
  }

  const canonical=loadCanonicalPromotionSourceV1();
  return promoteFromBoundCanonicalSourcesV1({
    ...input,
    payloadBytes:canonical.bytes.anchor_payload,
    migrationCandidate:parseJsonBytes(
      canonical.bytes.migration_candidate,
      "canonical_migration_candidate",
    ),
    canonicalSource:canonical.identity,
  });
}

function arg(name) {
  const index=process.argv.indexOf(name);
  return index>=0?process.argv[index+1]:undefined;
}

function readRegularFileNoSymlink(file,label,maxBytes=MAX_MEMBERSHIP_BYTES) {
  const stat=fs.lstatSync(file);
  if(stat.isSymbolicLink()||!stat.isFile()) {
    fail(label+"_must_be_regular_non_symlink");
  }
  if(stat.size<2||stat.size>maxBytes) fail(label+"_size_invalid");
  return fs.readFileSync(file);
}

if(
  process.argv[1]&&
  import.meta.url===new URL("file://"+path.resolve(process.argv[1])).href
) {
  const membershipPath=path.resolve(String(arg("--membership")||""));
  const outputDir=path.resolve(String(arg("--output-dir")||""));
  const expectedMembershipSha256=
    String(arg("--expected-membership-sha256")||"");
  const expectedRegistryAddress=
    String(arg("--expected-registry-address")||"");
  const expectedPublisherAddress=
    String(arg("--expected-publisher-address")||"");
  const reviewConfirmation=String(arg("--confirmation")||"");

  if(
    !membershipPath||
    membershipPath===path.parse(membershipPath).root||
    !fs.existsSync(membershipPath)
  ) {
    fail("membership_path_required");
  }
  if(
    !outputDir||
    outputDir===path.parse(outputDir).root||
    fs.existsSync(outputDir)
  ) {
    fail("create_only_output_dir_required");
  }

  const result=
    promoteVoidEconomicEpoch2PublicStateRootAnchorImportV1({
      membershipBytes:
        readRegularFileNoSymlink(membershipPath,"membership"),
      expectedMembershipSha256,
      expectedRegistryAddress,
      expectedPublisherAddress,
      reviewConfirmation,
    });

  fs.mkdirSync(outputDir,{mode:0o700,recursive:false});
  for(const [name,value] of [
    [PROMOTION_FILENAME,result.promotion],
    [UPDATED_MIGRATION_FILENAME,result.updated_migration_candidate],
  ]) {
    fs.writeFileSync(
      path.join(outputDir,name),
      JSON.stringify(value,null,2)+"\n",
      {encoding:"utf8",mode:0o644,flag:"wx"},
    );
  }

  console.log(
    VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_PROMOTION_V1,
  );
  console.log("status="+result.promotion.status);
  console.log("promotion_id="+result.promotion.promotion_id);
  console.log(
    "reviewed_membership_sha256="+
      result.promotion.reviewed_membership.file_sha256,
  );
  console.log(
    "finalized_event_membership_id="+
      result.promotion.reviewed_membership.finalized_event_membership_id,
  );
  console.log("canonical_git_blob_set_verified=true");
  console.log("caller_supplied_canonical_inputs_rejected=true");
  console.log("real_finalized_membership_import_verified=true");
  console.log("successor_state_root_public_void_anchor_ready=true");
  console.log(
    "migration_classifier_status="+
      result.promotion.verification.migration_classifier_status,
  );
  console.log(
    "remaining_migration_gates="+
      JSON.stringify(result.promotion.verification.remaining_migration_gates),
  );
  console.log("canonical_candidate_mutated=false");
  console.log("chain2050_write=false");
  console.log("transaction_submission=false");
  console.log("migration_authorized=false");
  console.log("public_activation_authorized=false");
  console.log("funds_movement=false");
  console.log("output_dir="+outputDir);
}
