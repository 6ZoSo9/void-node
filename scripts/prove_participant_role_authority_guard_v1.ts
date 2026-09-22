#!/usr/bin/env node
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";

import {
  VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA,
  deriveChain2050RoleAuthorityPairV1,
  type Chain2050RoleAuthorityRecordV1,
} from "../src/security/chain2050_role_authority_record_v1.js";
import {
  appendChain2050RoleAuthorityRecordV1,
  createEmptyChain2050RoleAuthorityRegistryV1,
} from "../src/security/chain2050_role_authority_registry_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_KIND_V1,
  VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_V1_SCHEMA,
  computeChain2050RoleAuthorityRegistryBindingDescriptorSha256V1,
  createChain2050RoleAuthorityRegistryReadSourceBindingV1,
  type Chain2050RoleAuthorityRegistryBindingDescriptorV1,
} from "../src/security/chain2050_role_authority_registry_read_source_binding_v1.js";
import {
  admitParticipantRoleAuthorityV1,
  computeParticipantRoleSubjectBindingSha256V1,
  revalidateParticipantRoleAuthorityV1,
} from "../src/security/participant_role_authority_guard_v1.js";

const MARKER =
  "VOID_PARTICIPANT_ROLE_AUTHORITY_GUARD_V1_PROOF_GREEN";
const IDENTITY = "participant.alice";
const OTHER_IDENTITY = "participant.validator";
const ACCOUNT = "participant-a";
const POLICY_A = "aa".repeat(32);
const POLICY_B = "bb".repeat(32);

function publicJwk(): { kty: "OKP"; crv: "Ed25519"; x: string } {
  const { publicKey } = generateKeyPairSync("ed25519");
  const jwk = publicKey.export({ format: "jwk" }) as JsonWebKey;
  assert.equal(jwk.kty, "OKP");
  assert.equal(jwk.crv, "Ed25519");
  assert.equal(typeof jwk.x, "string");
  return {
    kty: "OKP",
    crv: "Ed25519",
    x: String(jwk.x),
  };
}

const LOGIN_A = publicJwk();
const LOGIN_B = publicJwk();
const SUBJECT_A = {
  identity_id: IDENTITY,
  account_id: ACCOUNT,
  public_key_jwk: LOGIN_A,
};
const SUBJECT_A_SHA =
  computeParticipantRoleSubjectBindingSha256V1(SUBJECT_A);
assert.match(SUBJECT_A_SHA ?? "", /^[a-f0-9]{64}$/);
assert.equal(
  SUBJECT_A_SHA,
  computeParticipantRoleSubjectBindingSha256V1({
    public_key_jwk: {
      x: LOGIN_A.x,
      crv: "Ed25519",
      kty: "OKP",
    },
    account_id: ACCOUNT,
    identity_id: IDENTITY,
  }),
  "canonical key ordering changed subject hash",
);

function genesis(
  identityId: string,
  role: string,
  subjectBindingSha256: string,
): Chain2050RoleAuthorityRecordV1 {
  return {
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA,
    chain_id: 2050,
    identity_id: identityId,
    role,
    authority_status: "active",
    role_authority_generation: "0",
    subject_binding_sha256: subjectBindingSha256,
    authority_policy_sha256: POLICY_A,
    predecessor_role_record_sha256: null,
    transition: "genesis_grant",
  };
}

function successor(
  previous: Chain2050RoleAuthorityRecordV1,
  overrides: Partial<Chain2050RoleAuthorityRecordV1>,
): Chain2050RoleAuthorityRecordV1 {
  return {
    ...previous,
    role_authority_generation:
      (BigInt(previous.role_authority_generation) + 1n).toString(),
    predecessor_role_record_sha256:
      deriveChain2050RoleAuthorityPairV1(previous).role_record_sha256,
    ...overrides,
  };
}

let state = createEmptyChain2050RoleAuthorityRegistryV1();
const a0 = genesis(IDENTITY, "AGENT", String(SUBJECT_A_SHA));
const appendA0 = appendChain2050RoleAuthorityRecordV1(state, a0);
assert.equal(appendA0.ok, true);
if (appendA0.ok === false) throw new Error(appendA0.reason);
state = appendA0.state;

const validatorSubject = {
  identity_id: OTHER_IDENTITY,
  account_id: "validator-a",
  public_key_jwk: publicJwk(),
};
const validatorSubjectSha =
  computeParticipantRoleSubjectBindingSha256V1(validatorSubject);
assert.notEqual(validatorSubjectSha, null);
const validator0 = genesis(
  OTHER_IDENTITY,
  "VALIDATOR",
  String(validatorSubjectSha),
);
const appendValidator = appendChain2050RoleAuthorityRecordV1(
  state,
  validator0,
);
assert.equal(appendValidator.ok, true);
if (appendValidator.ok === false) {
  throw new Error(appendValidator.reason);
}
state = appendValidator.state;

const descriptor: Chain2050RoleAuthorityRegistryBindingDescriptorV1 = {
  schema: VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_V1_SCHEMA,
  chain_id: 2050,
  binding_kind: VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_BINDING_KIND_V1,
  binding_id: "participant-role-authority-guard-proof-v1",
  registry_namespace_sha256: "10".repeat(32),
  registry_contract_sha256: "20".repeat(32),
  query_contract_sha256: "30".repeat(32),
  finality_policy_sha256: "40".repeat(32),
};
const descriptorSha =
  computeChain2050RoleAuthorityRegistryBindingDescriptorSha256V1(
    descriptor,
  );
assert.match(descriptorSha ?? "", /^[a-f0-9]{64}$/);

let providerState: unknown = state;
let providerReads = 0;
const provider = {
  descriptor: structuredClone(descriptor),
  async readCanonicalRoleAuthorityRegistryV1(): Promise<unknown> {
    providerReads += 1;
    return providerState;
  },
};
const bound =
  createChain2050RoleAuthorityRegistryReadSourceBindingV1(
    provider,
    descriptor,
  );
assert.equal(bound.ok, true);
if (bound.ok === false) throw new Error(bound.reason);

const admission = await admitParticipantRoleAuthorityV1(
  bound.source,
  descriptorSha,
  SUBJECT_A,
);
assert.equal(admission.ok, true);
if (admission.ok === false) throw new Error(admission.reason);
assert.equal(admission.admission.role, "AGENT");
assert.equal(admission.admission.identity_id, IDENTITY);
assert.equal(admission.admission.account_id, ACCOUNT);
assert.equal(
  admission.admission.subject_binding_sha256,
  SUBJECT_A_SHA,
);
assert.equal(
  admission.admission.role_registry_binding_descriptor_sha256,
  descriptorSha,
);
assert.equal(providerReads, 1);

const revalidated = await revalidateParticipantRoleAuthorityV1(
  bound.source,
  descriptorSha,
  admission.admission,
  SUBJECT_A,
);
assert.equal(revalidated.ok, true);
if (revalidated.ok === false) throw new Error(revalidated.reason);
assert.equal(revalidated.context.role, "AGENT");
assert.equal(providerReads, 2);

const wrongAccount = await admitParticipantRoleAuthorityV1(
  bound.source,
  descriptorSha,
  { ...SUBJECT_A, account_id: "participant-b" },
);
assert.deepEqual(wrongAccount, {
  ok: false,
  reason: "participant_role_subject_binding_mismatch",
});

const wrongKey = await admitParticipantRoleAuthorityV1(
  bound.source,
  descriptorSha,
  { ...SUBJECT_A, public_key_jwk: LOGIN_B },
);
assert.deepEqual(wrongKey, {
  ok: false,
  reason: "participant_role_subject_binding_mismatch",
});

const wrongIdentity = await admitParticipantRoleAuthorityV1(
  bound.source,
  descriptorSha,
  {
    identity_id: "participant.missing",
    account_id: ACCOUNT,
    public_key_jwk: LOGIN_A,
  },
);
assert.match(
  wrongIdentity.ok ? "" : wrongIdentity.reason,
  /^participant_role_authority_rejected:/,
);

const validatorAdmission = await admitParticipantRoleAuthorityV1(
  bound.source,
  descriptorSha,
  validatorSubject,
);
assert.deepEqual(validatorAdmission, {
  ok: false,
  reason: "participant_role_not_agent",
});

const changedSubject = await revalidateParticipantRoleAuthorityV1(
  bound.source,
  descriptorSha,
  admission.admission,
  { ...SUBJECT_A, public_key_jwk: LOGIN_B },
);
assert.deepEqual(changedSubject, {
  ok: false,
  reason: "participant_role_subject_changed",
});

const a1Revoked = successor(a0, {
  authority_status: "revoked",
  transition: "revoke",
});
const revokedAppend = appendChain2050RoleAuthorityRecordV1(
  state,
  a1Revoked,
);
assert.equal(revokedAppend.ok, true);
if (revokedAppend.ok === false) throw new Error(revokedAppend.reason);
providerState = revokedAppend.state;

const revoked = await revalidateParticipantRoleAuthorityV1(
  bound.source,
  descriptorSha,
  admission.admission,
  SUBJECT_A,
);
assert.match(
  revoked.ok ? "" : revoked.reason,
  /^participant_role_revalidation_failed:role_authority_revoked$/,
);

providerState = state;
const a1RoleChanged = successor(a0, {
  role: "VALIDATOR",
  transition: "role_change",
});
const roleChangedAppend = appendChain2050RoleAuthorityRecordV1(
  state,
  a1RoleChanged,
);
assert.equal(roleChangedAppend.ok, true);
if (roleChangedAppend.ok === false) {
  throw new Error(roleChangedAppend.reason);
}
providerState = roleChangedAppend.state;
const roleChanged = await revalidateParticipantRoleAuthorityV1(
  bound.source,
  descriptorSha,
  admission.admission,
  SUBJECT_A,
);
assert.deepEqual(roleChanged, {
  ok: false,
  reason: "participant_role_changed",
});

providerState = state;
const newSubjectSha = String(
  computeParticipantRoleSubjectBindingSha256V1({
    ...SUBJECT_A,
    public_key_jwk: LOGIN_B,
  }),
);
const a1SubjectChanged = successor(a0, {
  subject_binding_sha256: newSubjectSha,
  transition: "subject_binding_change",
});
const subjectChangedAppend = appendChain2050RoleAuthorityRecordV1(
  state,
  a1SubjectChanged,
);
assert.equal(subjectChangedAppend.ok, true);
if (subjectChangedAppend.ok === false) {
  throw new Error(subjectChangedAppend.reason);
}
providerState = subjectChangedAppend.state;
const roleSubjectChanged = await revalidateParticipantRoleAuthorityV1(
  bound.source,
  descriptorSha,
  admission.admission,
  SUBJECT_A,
);
assert.deepEqual(roleSubjectChanged, {
  ok: false,
  reason: "participant_role_subject_binding_changed",
});

providerState = state;
const a1PolicyChanged = successor(a0, {
  authority_policy_sha256: POLICY_B,
  transition: "policy_change",
});
const policyChangedAppend = appendChain2050RoleAuthorityRecordV1(
  state,
  a1PolicyChanged,
);
assert.equal(policyChangedAppend.ok, true);
if (policyChangedAppend.ok === false) {
  throw new Error(policyChangedAppend.reason);
}
providerState = policyChangedAppend.state;
const policyChanged = await revalidateParticipantRoleAuthorityV1(
  bound.source,
  descriptorSha,
  admission.admission,
  SUBJECT_A,
);
assert.deepEqual(policyChanged, {
  ok: false,
  reason: "participant_role_policy_changed",
});

providerState = state;
const invalidGenerationTamper = {
  ...structuredClone(admission.admission),
  role_authority_generation: "18446744073709551616",
};
const invalidGeneration = await revalidateParticipantRoleAuthorityV1(
  bound.source,
  descriptorSha,
  invalidGenerationTamper,
  SUBJECT_A,
);
assert.deepEqual(invalidGeneration, {
  ok: false,
  reason: "participant_role_admission_invalid",
});

const generationTamper = {
  ...structuredClone(admission.admission),
  role_authority_generation: "1",
};
const generationChanged = await revalidateParticipantRoleAuthorityV1(
  bound.source,
  descriptorSha,
  generationTamper,
  SUBJECT_A,
);
assert.deepEqual(generationChanged, {
  ok: false,
  reason: "participant_role_generation_changed",
});

const hashTamper = {
  ...structuredClone(admission.admission),
  role_record_sha256: "ff".repeat(32),
};
const recordHashChanged = await revalidateParticipantRoleAuthorityV1(
  bound.source,
  descriptorSha,
  hashTamper,
  SUBJECT_A,
);
assert.deepEqual(recordHashChanged, {
  ok: false,
  reason: "participant_role_record_hash_changed",
});

const bindingChanged = await revalidateParticipantRoleAuthorityV1(
  bound.source,
  "99".repeat(32),
  admission.admission,
  SUBJECT_A,
);
assert.deepEqual(bindingChanged, {
  ok: false,
  reason: "participant_role_binding_descriptor_changed",
});

providerState = state;
provider.descriptor = {
  ...descriptor,
  finality_policy_sha256: "55".repeat(32),
};
const descriptorDrift = await revalidateParticipantRoleAuthorityV1(
  bound.source,
  descriptorSha,
  admission.admission,
  SUBJECT_A,
);
assert.match(
  descriptorDrift.ok ? "" : descriptorDrift.reason,
  /^participant_role_revalidation_failed:role_authority_source_read_failed$/,
);
provider.descriptor = structuredClone(descriptor);

const throwingProvider = {
  descriptor: structuredClone(descriptor),
  async readCanonicalRoleAuthorityRegistryV1(): Promise<unknown> {
    throw new Error("synthetic source failure");
  },
};
const throwingBound =
  createChain2050RoleAuthorityRegistryReadSourceBindingV1(
    throwingProvider,
    descriptor,
  );
assert.equal(throwingBound.ok, true);
if (throwingBound.ok === false) {
  throw new Error(throwingBound.reason);
}
const sourceFailure = await admitParticipantRoleAuthorityV1(
  throwingBound.source,
  descriptorSha,
  SUBJECT_A,
);
assert.match(
  sourceFailure.ok ? "" : sourceFailure.reason,
  /^participant_role_authority_rejected:role_authority_source_read_failed$/,
);

assert.equal(
  computeParticipantRoleSubjectBindingSha256V1({
    ...SUBJECT_A,
    public_key_jwk: {
      ...LOGIN_A,
      x: LOGIN_A.x + "=",
    },
  }),
  null,
  "noncanonical JWK encoding accepted",
);

console.log(MARKER);
console.log("chain_id=2050");
console.log("required_role=AGENT");
console.log("identity_id_explicit=true");
console.log("account_to_identity_inference=false");
console.log("subject_binding_identity_account_ed25519=true");
console.log("binding_descriptor_pinned=true");
console.log("active_role_required=true");
console.log("role_generation_captured=true");
console.log("role_record_hash_captured=true");
console.log("authority_policy_captured=true");
console.log("per_read_revalidation=true");
console.log("wrong_account_rejected=true");
console.log("wrong_key_rejected=true");
console.log("wrong_identity_rejected=true");
console.log("non_agent_role_rejected=true");
console.log("revoked_role_rejected=true");
console.log("role_change_rejected=true");
console.log("subject_change_rejected=true");
console.log("policy_change_rejected=true");
console.log("invalid_uint64_generation_rejected=true");
console.log("generation_drift_rejected=true");
console.log("record_hash_drift_rejected=true");
console.log("binding_descriptor_drift_rejected=true");
console.log("source_failure_rejected=true");
console.log("http_route_change=false");
console.log("deployment=false");
console.log("chain2050_write=false");
console.log("wallet_or_signer_access=false");
console.log("work_credit_mutation=false");
console.log("funds_action=false");
