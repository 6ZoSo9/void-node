#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_PREPARATION_V1";

const EXPECTED = Object.freeze({
  policy_sha256:
    "9a8ee80c68cb026b88117710c7d78e8b3063a1c5c2fe1cf6cb555ca80d8f1e75",
  subject_sha256:
    "7945ba03feac32e5268382a8b995eb7c927a084d9dd1d44598ffb340a12a770e",
  role_record_sha256:
    "1492c4d55f5c6d4873a28ca08d641196ba51d9e5c0a7c1cc31f27bf1a6405b0b",
  empty_root:
    "d50b8a122e11454b6cca6a03b312ecac6af6ea1a5d5c5d5f9dd3fdd03b1faea7",
  predicted_root:
    "54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041",
  preparation_id:
    "voidcrasgp1_4aac5c1bb4b7500c9dc15df53f36722a44471b9d52b61063528d49602a2348ee",
  node_id:
    "9d89483769e469e0473b489dc50dba96",
  node_key_fingerprint:
    "2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b",
  node_jwk_x:
    "ejYyFziUrf8A2eRhz9_LJMM2SsMFvrEqVN1iC7m_G4g",
});

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" +
    Object.keys(value).sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") +
    "}";
}
function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}
function hold(reason) {
  throw new Error(reason);
}

export function verifySovereignRolePolicyV1(value) {
  if (
    !value ||
    value.marker !== "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_POLICY_V1" ||
    value.version !== 1 ||
    value.policy_body?.schema !==
      "void.chain2050-role-authority-sovereign-policy.v1" ||
    value.policy_body?.chain_id !== 2050 ||
    value.policy_body?.policy_generation !== "1" ||
    value.policy_body?.identity_id !== "sovereign.zoso" ||
    value.policy_body?.role !== "SOVEREIGN" ||
    value.policy_body?.ordinary_authentication?.subject_schema !==
      "void.participant-subject-binding.v1" ||
    value.policy_body?.ordinary_authentication?.account_id !==
      "sovereign.zoso" ||
    value.policy_body?.ordinary_authentication?.anchor_kind !==
      "existing_main_void_node_identity_key" ||
    value.policy_body?.ordinary_authentication?.expected_node_id !==
      EXPECTED.node_id ||
    value.policy_body?.ordinary_authentication
      ?.expected_public_key_der_sha256 !== EXPECTED.node_key_fingerprint ||
    value.policy_body?.key_separation
      ?.sovereign_primary_is_routine_login_key !== false ||
    value.policy_body?.key_separation
      ?.sovereign_recovery_is_routine_login_key !== false ||
    value.policy_body?.key_separation
      ?.premine_key_is_governance_or_login_key !== false ||
    value.policy_body?.key_separation
      ?.nimo_continuity_key_is_unilateral_sovereign_key !== false ||
    value.policy_body?.authority_model?.technical_capability_implied !== false ||
    value.policy_body?.authority_model?.wallet_or_signer_authority_implied !==
      false ||
    value.policy_body?.authority_model
      ?.transaction_submission_authority_implied !== false ||
    value.policy_body?.authority_model?.funds_or_treasury_authority_implied !==
      false ||
    value.policy_body?.append_boundary
      ?.registry_append_requires_separate_explicit_sovereign_chain2050_write_authorization !==
      true ||
    value.policy_body?.append_boundary?.this_policy_authorizes_chain2050_write !==
      false ||
    value.authority?.source_only !== true ||
    value.authority?.chain2050_write_authorized !== false ||
    value.authority?.signature_creation_authorized !== false ||
    value.authority?.wallet_or_signer_access_authorized !== false ||
    value.authority?.funds_action_authorized !== false
  ) {
    hold("sovereign_role_policy_binding_invalid");
  }
  const policySha = sha256Text(canonical(value.policy_body));
  if (
    value.policy_body_sha256 !== EXPECTED.policy_sha256 ||
    policySha !== EXPECTED.policy_sha256
  ) {
    hold("sovereign_role_policy_sha256_mismatch");
  }
  return Object.freeze({ ok:true, policy_body_sha256:policySha });
}

export function computeSovereignSubjectBindingV1(subject) {
  const exact = {
    schema:"void.participant-subject-binding.v1",
    chain_id:2050,
    identity_id:"sovereign.zoso",
    account_id:"sovereign.zoso",
    public_key_jwk:{
      kty:"OKP",
      crv:"Ed25519",
      x:EXPECTED.node_jwk_x,
    },
  };
  if (canonical(subject) !== canonical(exact)) {
    hold("sovereign_subject_binding_input_mismatch");
  }
  return sha256Text(canonical(exact));
}

export function verifySovereignGenesisPreparationV1(prep, policy) {
  const verifiedPolicy = verifySovereignRolePolicyV1(policy);
  if (
    !prep ||
    prep.marker !== MARKER ||
    prep.version !== 1 ||
    prep.status !== "hold_pending_live_precision_main_node_key_revalidation" ||
    prep.genesis_preparation_id !== EXPECTED.preparation_id ||
    prep.chain_id !== 2050 ||
    prep.registry?.contract_address !==
      "0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49" ||
    prep.registry?.deployed_runtime_sha256 !==
      "b2e1938deb9dd2692a322fd837a5128aeb99d3c33095087c8af8d828a6ed930d" ||
    prep.registry?.deployment_finality_evidence_id !==
      "voidcracve1_db9f9f06c2de57efb90c82da6020cf71e11d9229316394a07941ffe167ea9bfd" ||
    prep.registry?.current_entry_count_expected !== "0" ||
    prep.registry?.current_registry_root_sha256_expected !== EXPECTED.empty_root ||
    prep.registry?.intended_entry_index !== "0" ||
    prep.subject?.identity_id !== "sovereign.zoso" ||
    prep.subject?.account_id !== "sovereign.zoso" ||
    prep.subject?.expected_node_id !== EXPECTED.node_id ||
    prep.subject?.expected_public_key_der_sha256 !== EXPECTED.node_key_fingerprint ||
    prep.subject?.public_key_jwk?.x !== EXPECTED.node_jwk_x ||
    prep.subject?.live_precision_main_node_key_revalidated !== false ||
    prep.policy?.policy_body_sha256 !== verifiedPolicy.policy_body_sha256 ||
    prep.candidate?.role_record_sha256 !== EXPECTED.role_record_sha256 ||
    prep.candidate?.predicted_registry_root_sha256 !== EXPECTED.predicted_root ||
    prep.authority?.append_eligible !== false ||
    prep.authority?.calldata_materialized !== false ||
    prep.authority?.nonce_selected !== false ||
    prep.authority?.gas_selected !== false ||
    prep.authority?.private_key_access !== false ||
    prep.authority?.wallet_or_signer_access !== false ||
    prep.authority?.transaction_signing !== false ||
    prep.authority?.transaction_broadcast !== false ||
    prep.authority?.chain2050_write !== false ||
    prep.authority?.registry_append !== false ||
    prep.authority?.funds_action !== false
  ) {
    hold("sovereign_genesis_preparation_binding_invalid");
  }

  const subjectMaterial = {
    schema:prep.subject.schema,
    chain_id:2050,
    identity_id:prep.subject.identity_id,
    account_id:prep.subject.account_id,
    public_key_jwk:prep.subject.public_key_jwk,
  };
  const subjectSha = computeSovereignSubjectBindingV1(subjectMaterial);
  if (
    subjectSha !== EXPECTED.subject_sha256 ||
    prep.subject.subject_binding_sha256 !== EXPECTED.subject_sha256
  ) {
    hold("sovereign_subject_binding_sha256_mismatch");
  }

  const record = prep.candidate.record;
  if (
    record?.schema !== "void.chain2050-role-authority-record.v1" ||
    record?.chain_id !== 2050 ||
    record?.identity_id !== "sovereign.zoso" ||
    record?.role !== "SOVEREIGN" ||
    record?.authority_status !== "active" ||
    record?.role_authority_generation !== "0" ||
    record?.subject_binding_sha256 !== EXPECTED.subject_sha256 ||
    record?.authority_policy_sha256 !== EXPECTED.policy_sha256 ||
    record?.predecessor_role_record_sha256 !== null ||
    record?.transition !== "genesis_grant"
  ) {
    hold("sovereign_genesis_record_shape_invalid");
  }
  const recordSha = sha256Text(canonical(record));
  if (recordSha !== EXPECTED.role_record_sha256) {
    hold("sovereign_genesis_record_sha256_mismatch");
  }

  const rootMaterial = {
    chain_id:2050,
    domain:"void.chain2050-role-authority-registry-root.v1",
    entry_index:"0",
    identity_id:"sovereign.zoso",
    previous_registry_root_sha256:EXPECTED.empty_root,
    role_authority_generation:"0",
    role_record_sha256:recordSha,
  };
  const predictedRoot = sha256Text(canonical(rootMaterial));
  if (predictedRoot !== EXPECTED.predicted_root) {
    hold("sovereign_genesis_predicted_root_mismatch");
  }

  const prepMaterial = {
    contract_address:prep.registry.contract_address,
    runtime_sha256:prep.registry.deployed_runtime_sha256,
    deployment_finality_evidence_id:
      prep.registry.deployment_finality_evidence_id,
    identity_id:prep.subject.identity_id,
    account_id:prep.subject.account_id,
    role:record.role,
    subject_binding_sha256:subjectSha,
    authority_policy_sha256:verifiedPolicy.policy_body_sha256,
    role_record_sha256:recordSha,
    predicted_registry_root_sha256:predictedRoot,
    expected_node_id:prep.subject.expected_node_id,
    expected_public_key_der_sha256:
      prep.subject.expected_public_key_der_sha256,
  };
  const prepId = "voidcrasgp1_" + sha256Text(canonical(prepMaterial));
  if (prepId !== EXPECTED.preparation_id) {
    hold("sovereign_genesis_preparation_id_mismatch");
  }

  return Object.freeze({
    ok:true,
    genesis_preparation_id:prepId,
    subject_binding_sha256:subjectSha,
    authority_policy_sha256:verifiedPolicy.policy_body_sha256,
    role_record_sha256:recordSha,
    predicted_registry_root_sha256:predictedRoot,
    append_eligible:false,
    next_gate:
      "live_precision_main_node_key_public_identity_revalidation_then_genesis_append_preflight",
  });
}
