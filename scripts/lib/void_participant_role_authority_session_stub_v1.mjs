#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_PARTICIPANT_ROLE_AUTHORITY_SESSION_STUB_V1 =
  Object.freeze({
    marker: "VOID_PARTICIPANT_ROLE_AUTHORITY_SESSION_ADAPTER_V1",
    chain_id: 2050,
    required_role: "AGENT",
    wallet_private_key_access: false,
    signing_authority: false,
    work_credit_mutation_authority: false,
    validator_mutation_authority: false,
    chain2050_write_authority: false,
    money_movement_authority: false,
  });

function digest(value) {
  return crypto.createHash("sha256")
    .update(String(value), "utf8")
    .digest("hex");
}

function subjectDigest(subject) {
  return digest(JSON.stringify(subject));
}

export function createVoidParticipantRoleAuthoritySessionStubV1({
  rejectIdentity = null,
} = {}) {
  const admit = (subject) => {
    if (
      !subject ||
      typeof subject.identity_id !== "string" ||
      typeof subject.account_id !== "string" ||
      !subject.public_key_jwk ||
      (rejectIdentity !== null &&
        subject.identity_id === rejectIdentity)
    ) {
      return { ok: false, reason: "stub_role_rejected" };
    }
    return {
      ok: true,
      admission: Object.freeze({
        schema: "void.participant-role-authority-admission.v1",
        chain_id: 2050,
        identity_id: subject.identity_id,
        account_id: subject.account_id,
        role: "AGENT",
        subject_binding_sha256: subjectDigest(subject),
        authority_policy_sha256: digest("stub-policy-v1"),
        role_authority_generation: "0",
        role_record_sha256:
          digest("stub-record:" + subject.identity_id),
        role_registry_binding_descriptor_sha256:
          digest("stub-binding-descriptor-v1"),
      }),
    };
  };

  const revalidate = (admission, subject) => {
    const admitted = admit(subject);
    if (
      admitted.ok !== true ||
      !admission ||
      admitted.admission.identity_id !== admission.identity_id ||
      admitted.admission.account_id !== admission.account_id ||
      admitted.admission.subject_binding_sha256 !==
        admission.subject_binding_sha256 ||
      admitted.admission.role_record_sha256 !==
        admission.role_record_sha256
    ) {
      return { ok: false, reason: "stub_role_stale" };
    }
    return {
      ok: true,
      context: Object.freeze({
        identity_id: admission.identity_id,
        account_id: admission.account_id,
        role: "AGENT",
        subject_binding_sha256: admission.subject_binding_sha256,
        role_authority_generation:
          admission.role_authority_generation,
        role_record_sha256: admission.role_record_sha256,
      }),
    };
  };

  return Object.freeze({
    ...VOID_PARTICIPANT_ROLE_AUTHORITY_SESSION_STUB_V1,
    admit,
    revalidate,
  });
}
