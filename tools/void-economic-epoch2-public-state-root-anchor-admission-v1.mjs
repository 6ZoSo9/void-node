#!/usr/bin/env node
import {
  ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_SHA256_V1,
  ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_BYTES_V1,
  ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_SHA256_V1,
  verifyEconomicEpoch2PublicVoidStateRootAnchorPayloadV1,
} from "./void-economic-epoch2-public-void-state-root-anchor-v1.mjs";
import {
  admitDatanetContentCommitmentCanonicalTruthV1,
} from "./datanet-content-commitment-canonical-truth-admission-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_ADMISSION_V1 =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_ADMISSION_V1";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_ADMISSION_AUTHORITY_V1 =
  Object.freeze({
    source_only_composition: true,
    anchor_payload_verification: true,
    canonical_truth_admission_rederived: true,
    filesystem_read: false,
    filesystem_write: false,
    credential_content_access: false,
    wallet_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    rpc_call: false,
    network_call: false,
    authoritative_chain2050_write: false,
    validator_mutation: false,
    governance_mutation: false,
    work_credit_mutation: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation_authorized: false,
  });

const ADDRESS=/^0x[0-9a-f]{40}$/u;

function held(reason,detail={}) {
  return Object.freeze({
    ok:false,
    marker:VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_ADMISSION_V1,
    version:1,
    status:"HOLD",
    reason,
    successor_state_root_public_void_anchor_candidate_ready:false,
    canonical_truth_admission_input_verified:false,
    real_finalized_membership_import_verified:false,
    successor_state_root_public_void_anchor_ready:false,
    public_balance_receipt_code_verification_ready:false,
    migration_authorized:false,
    public_activation_authorized:false,
    chain2050_write_performed:false,
    authority:
      VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_ADMISSION_AUTHORITY_V1,
    ...(Object.keys(detail).length?{detail}:{}),
  });
}

function ownData(value,key,reason) {
  try {
    if(!value||typeof value!=="object"||Array.isArray(value)) throw null;
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(
      !descriptor||
      descriptor.enumerable!==true||
      !Object.hasOwn(descriptor,"value")
    ) throw null;
    return descriptor.value;
  } catch {
    throw new Error(reason);
  }
}

function address(value,reason) {
  if(typeof value!=="string") throw new Error(reason);
  const lower=value.toLowerCase();
  if(
    !ADDRESS.test(lower)||
    lower==="0x0000000000000000000000000000000000000000"
  ) throw new Error(reason);
  return lower;
}

export function verifyEconomicEpoch2PublicStateRootAnchorAdmissionCandidateV1(input) {
  if(
    !input||
    typeof input!=="object"||
    Array.isArray(input)||
    !Buffer.isBuffer(input.payload_bytes)
  ) {
    return held("state_root_anchor_admission_input_invalid");
  }

  const anchor=
    verifyEconomicEpoch2PublicVoidStateRootAnchorPayloadV1({
      payload_bytes:input.payload_bytes,
    });
  if(anchor?.ok!==true) {
    return held("state_root_anchor_payload_not_verified",{
      upstream_reason:anchor?.reason??"unknown",
    });
  }

  let expectedRegistry;
  let expectedPublisher;
  let observedRegistry;
  let observedPublisher;
  try {
    expectedRegistry=address(
      input.expected_registry_address,
      "state_root_anchor_expected_registry_invalid",
    );
    expectedPublisher=address(
      input.expected_publisher_address,
      "state_root_anchor_expected_publisher_invalid",
    );
    observedRegistry=address(
      ownData(
        input.finalized_event_membership,
        "registry_address",
        "state_root_anchor_membership_registry_missing",
      ),
      "state_root_anchor_membership_registry_invalid",
    );
    observedPublisher=address(
      ownData(
        input.finalized_event_membership,
        "publisher_address",
        "state_root_anchor_membership_publisher_missing",
      ),
      "state_root_anchor_membership_publisher_invalid",
    );
  } catch(error) {
    return held(
      error instanceof Error?error.message:"state_root_anchor_address_binding_invalid",
    );
  }

  if(observedRegistry!==expectedRegistry) {
    return held("state_root_anchor_registry_address_mismatch");
  }
  if(observedPublisher!==expectedPublisher) {
    return held("state_root_anchor_publisher_address_mismatch");
  }

  const truth=admitDatanetContentCommitmentCanonicalTruthV1({
    finalized_event_membership:input.finalized_event_membership,
  });
  if(
    truth?.ok!==true||
    truth.status!==
      "canonical_chain2050_content_commitment_truth_admitted_reconstruction_authority_pending"||
    truth.canonical_commitment_truth_admitted!==true||
    truth.event_receipt_membership_verified!==true
  ) {
    return held("state_root_anchor_canonical_truth_not_admitted",{
      upstream_reason:truth?.reason??"unknown",
    });
  }

  const reference=truth.commitment_reference;
  if(
    reference?.chain_id!=="2050"||
    reference?.object_id!==anchor.object_id||
    reference?.content_sha256!==anchor.content_sha256||
    reference?.byte_length!==anchor.byte_length||
    reference?.accepted_checkpoint_id!==
      anchor.accepted_checkpoint_policy_id
  ) {
    return held("state_root_anchor_commitment_reference_mismatch");
  }

  let membershipObjectId;
  let membershipCommitment;
  try {
    membershipObjectId=ownData(
      input.finalized_event_membership,
      "object_id",
      "state_root_anchor_membership_object_id_missing",
    );
    membershipCommitment=ownData(
      input.finalized_event_membership,
      "commitment",
      "state_root_anchor_membership_commitment_missing",
    );
  } catch(error) {
    return held(
      error instanceof Error?error.message:"state_root_anchor_membership_invalid",
    );
  }
  if(
    membershipObjectId!==anchor.object_id||
    membershipCommitment?.object_id_sha256!==
      ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_SHA256_V1||
    membershipCommitment?.content_sha256!==
      ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_SHA256_V1||
    membershipCommitment?.byte_length!==
      String(ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_BYTES_V1)
  ) {
    return held("state_root_anchor_membership_payload_mismatch");
  }

  const material=Object.freeze({
    marker:VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_ADMISSION_V1,
    version:1,
    status:"CANONICAL_TRUTH_CANDIDATE_VALID_REAL_IMPORT_REQUIRED",
    chain_id:"2050",
    execution_epoch:"2",
    object_id:anchor.object_id,
    object_id_sha256:anchor.object_id_sha256,
    content_sha256:anchor.content_sha256,
    byte_length:anchor.byte_length,
    genesis_block_hash:anchor.genesis_block_hash,
    genesis_state_root:anchor.genesis_state_root,
    registry_address:expectedRegistry,
    publisher_address:expectedPublisher,
    finalized_event_membership_id:
      truth.finalized_event_membership_id,
    canonical_commitment_truth_admission_id:
      truth.canonical_commitment_truth_admission_id,
    commitment_id:reference.commitment_id,
    commitment_transaction_hash:
      reference.commitment_transaction_hash,
    commitment_log_index:reference.commitment_log_index,
    accepted_checkpoint_height:reference.checkpoint_height,
    accepted_checkpoint_hash:reference.checkpoint_block_hash,
    accepted_checkpoint_policy_id:reference.accepted_checkpoint_id,
  });

  return Object.freeze({
    ok:true,
    ...material,
    admission_candidate_id:
      "voide2sraca1_"+sha256(canonicalJson(material)),
    successor_state_root_public_void_anchor_candidate_ready:true,
    anchor_payload_exact_bytes_verified:true,
    canonical_truth_admission_input_verified:true,
    canonical_commitment_reference_matches_anchor:true,
    exact_registry_address_bound:true,
    exact_publisher_address_bound:true,
    real_finalized_membership_import_verified:false,
    successor_state_root_public_void_anchor_ready:false,
    public_balance_receipt_code_verification_ready:false,
    migration_authorized:false,
    public_activation_authorized:false,
    chain2050_write_performed:false,
    transaction_signing_performed:false,
    transaction_submission_performed:false,
    authority:
      VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_ADMISSION_AUTHORITY_V1,
  });
}
