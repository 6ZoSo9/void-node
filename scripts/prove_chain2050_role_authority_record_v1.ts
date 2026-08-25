#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_CHAIN2050_ROLE_AUTHORITY_MAX_GENERATION,
  VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA,
  canonicalChain2050RoleAuthorityJsonV1,
  compareChain2050RoleAuthorityPairV1,
  computeChain2050RoleRecordSha256V1,
  deriveChain2050RoleAuthorityPairV1,
  parseChain2050RoleAuthorityGenerationV1,
  validateChain2050RoleAuthorityRecordV1,
  verifyChain2050RoleAuthorityGenesisV1,
  verifyChain2050RoleAuthorityTransitionV1,
  type Chain2050RoleAuthorityRecordV1,
} from "../src/security/chain2050_role_authority_record_v1.js";

const MARKER = "VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_PROOF_GREEN";

const SUBJECT_A = "11".repeat(32);
const SUBJECT_B = "22".repeat(32);
const POLICY_A = "aa".repeat(32);
const POLICY_B = "bb".repeat(32);

function genesis(
  overrides: Partial<Chain2050RoleAuthorityRecordV1> = {},
): Chain2050RoleAuthorityRecordV1 {
  return {
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA,
    chain_id: 2050,
    identity_id: "void-id:apollyon-v2r13",
    role: "APOLLYON_CANDIDATE",
    authority_status: "active",
    role_authority_generation: "0",
    subject_binding_sha256: SUBJECT_A,
    authority_policy_sha256: POLICY_A,
    predecessor_role_record_sha256: null,
    transition: "genesis_grant",
    ...overrides,
  };
}

function successor(
  previous: Chain2050RoleAuthorityRecordV1,
  overrides: Partial<Chain2050RoleAuthorityRecordV1>,
): Chain2050RoleAuthorityRecordV1 {
  const previousPair = deriveChain2050RoleAuthorityPairV1(previous);
  return {
    ...previous,
    role_authority_generation: (
      BigInt(previous.role_authority_generation) + 1n
    ).toString(),
    predecessor_role_record_sha256:
      previousPair.role_record_sha256,
    ...overrides,
  };
}

const g0 = genesis();
const g0Pair = deriveChain2050RoleAuthorityPairV1(g0);

assert.deepEqual(
  verifyChain2050RoleAuthorityGenesisV1(g0),
  { ok: true, kind: "genesis", pair: g0Pair },
);

assert.equal(
  computeChain2050RoleRecordSha256V1(g0),
  g0Pair.role_record_sha256,
);

assert.equal(
  canonicalChain2050RoleAuthorityJsonV1({
    z: 1,
    a: { y: 2, b: 3 },
  }),
  '{"a":{"b":3,"y":2},"z":1}',
);

assert.deepEqual(
  verifyChain2050RoleAuthorityTransitionV1(g0, structuredClone(g0)),
  { ok: true, kind: "idempotent_replay", pair: g0Pair },
);

const sameGenerationDifferentHash = {
  ...g0,
  subject_binding_sha256: SUBJECT_B,
  transition: "subject_binding_change" as const,
};
assert.deepEqual(
  verifyChain2050RoleAuthorityTransitionV1(
    g0,
    sameGenerationDifferentHash,
  ),
  {
    ok: false,
    reason: "role_authority_same_generation_different_hash",
  },
);

const g1Revoked = successor(g0, {
  authority_status: "revoked",
  transition: "revoke",
});
const g1RevokedResult =
  verifyChain2050RoleAuthorityTransitionV1(g0, g1Revoked);
assert.equal(g1RevokedResult.ok, true);
assert.equal(
  g1RevokedResult.ok ? g1RevokedResult.kind : null,
  "transition",
);

const g1Pair = deriveChain2050RoleAuthorityPairV1(g1Revoked);
assert.equal(compareChain2050RoleAuthorityPairV1(g0Pair, g1Pair), false);

const g2Restored = successor(g1Revoked, {
  authority_status: "active",
  transition: "restore",
});
assert.equal(
  verifyChain2050RoleAuthorityTransitionV1(
    g1Revoked,
    g2Restored,
  ).ok,
  true,
);
const g2Pair = deriveChain2050RoleAuthorityPairV1(g2Restored);
assert.equal(compareChain2050RoleAuthorityPairV1(g0Pair, g2Pair), false);
assert.equal(g2Pair.role_authority_generation, "2");

const g1Binding = successor(g0, {
  subject_binding_sha256: SUBJECT_B,
  transition: "subject_binding_change",
});
assert.equal(
  verifyChain2050RoleAuthorityTransitionV1(g0, g1Binding).ok,
  true,
);

const g1Policy = successor(g0, {
  authority_policy_sha256: POLICY_B,
  transition: "policy_change",
});
assert.equal(
  verifyChain2050RoleAuthorityTransitionV1(g0, g1Policy).ok,
  true,
);

const g1Role = successor(g0, {
  role: "APOLLYON_GENERAL",
  transition: "role_change",
});
assert.equal(
  verifyChain2050RoleAuthorityTransitionV1(g0, g1Role).ok,
  true,
);

const badPredecessor = successor(g0, {
  authority_status: "revoked",
  transition: "revoke",
  predecessor_role_record_sha256: "00".repeat(32),
});
assert.deepEqual(
  verifyChain2050RoleAuthorityTransitionV1(g0, badPredecessor),
  {
    ok: false,
    reason: "role_authority_predecessor_hash_mismatch",
  },
);

const generationSkip = successor(g0, {
  role_authority_generation: "2",
  authority_status: "revoked",
  transition: "revoke",
});
assert.deepEqual(
  verifyChain2050RoleAuthorityTransitionV1(g0, generationSkip),
  {
    ok: false,
    reason: "role_authority_generation_must_increment_by_one",
  },
);

const wrongReason = successor(g0, {
  authority_status: "revoked",
  transition: "policy_change",
});
assert.deepEqual(
  verifyChain2050RoleAuthorityTransitionV1(g0, wrongReason),
  {
    ok: false,
    reason: "role_authority_transition_reason_mismatch",
  },
);

const noAuthorityChange = successor(g0, {
  transition: "policy_change",
});
assert.deepEqual(
  verifyChain2050RoleAuthorityTransitionV1(g0, noAuthorityChange),
  {
    ok: false,
    reason:
      "role_authority_transition_must_change_exactly_one_authority_field",
  },
);

const multipleAuthorityChanges = successor(g0, {
  role: "APOLLYON_GENERAL",
  authority_policy_sha256: POLICY_B,
  transition: "role_change",
});
assert.deepEqual(
  verifyChain2050RoleAuthorityTransitionV1(
    g0,
    multipleAuthorityChanges,
  ),
  {
    ok: false,
    reason:
      "role_authority_transition_must_change_exactly_one_authority_field",
  },
);

const identityChange = successor(g0, {
  identity_id: "void-id:different",
  transition: "subject_binding_change",
});
assert.deepEqual(
  verifyChain2050RoleAuthorityTransitionV1(g0, identityChange),
  {
    ok: false,
    reason:
      "role_authority_transition_must_change_exactly_one_authority_field",
  },
);

assert.equal(parseChain2050RoleAuthorityGenerationV1("0"), 0n);
assert.equal(
  parseChain2050RoleAuthorityGenerationV1(
    VOID_CHAIN2050_ROLE_AUTHORITY_MAX_GENERATION.toString(),
  ),
  VOID_CHAIN2050_ROLE_AUTHORITY_MAX_GENERATION,
);
assert.equal(parseChain2050RoleAuthorityGenerationV1("01"), null);
assert.equal(parseChain2050RoleAuthorityGenerationV1("-1"), null);
assert.equal(
  parseChain2050RoleAuthorityGenerationV1(
    (VOID_CHAIN2050_ROLE_AUTHORITY_MAX_GENERATION + 1n).toString(),
  ),
  null,
);

assert.deepEqual(
  verifyChain2050RoleAuthorityGenesisV1(
    genesis({ role_authority_generation: "1" }),
  ),
  {
    ok: false,
    reason: "role_authority_genesis_generation_must_be_zero",
  },
);
assert.deepEqual(
  verifyChain2050RoleAuthorityGenesisV1(
    genesis({
      predecessor_role_record_sha256: "00".repeat(32),
    }),
  ),
  {
    ok: false,
    reason: "role_authority_genesis_predecessor_must_be_null",
  },
);
assert.deepEqual(
  verifyChain2050RoleAuthorityGenesisV1(
    genesis({ transition: "policy_change" }),
  ),
  {
    ok: false,
    reason: "role_authority_genesis_transition_required",
  },
);
assert.deepEqual(
  verifyChain2050RoleAuthorityGenesisV1(
    genesis({ authority_status: "revoked" }),
  ),
  {
    ok: false,
    reason: "role_authority_genesis_must_be_active",
  },
);

const badChain = {
  ...g0,
  chain_id: 1,
};
assert.deepEqual(
  validateChain2050RoleAuthorityRecordV1(badChain),
  { ok: false, reason: "role_authority_chain_id_mismatch" },
);

const unknownField = {
  ...g0,
  capability_grant: ["service_restart"],
};
assert.deepEqual(
  validateChain2050RoleAuthorityRecordV1(unknownField),
  { ok: false, reason: "role_authority_record_keys_mismatch" },
);

assert.deepEqual(
  validateChain2050RoleAuthorityRecordV1({
    ...g0,
    role_authority_generation: "01",
  }),
  { ok: false, reason: "role_authority_generation_invalid" },
);

assert.deepEqual(
  validateChain2050RoleAuthorityRecordV1({
    ...g0,
    identity_id: "X",
  }),
  { ok: false, reason: "role_authority_identity_id_invalid" },
);

assert.deepEqual(
  validateChain2050RoleAuthorityRecordV1({
    ...g0,
    role: "bad role",
  }),
  { ok: false, reason: "role_authority_role_invalid" },
);

assert.deepEqual(
  validateChain2050RoleAuthorityRecordV1({
    ...g0,
    authority_status: "quarantined",
  }),
  { ok: false, reason: "role_authority_status_invalid" },
);

assert.deepEqual(
  validateChain2050RoleAuthorityRecordV1({
    ...g0,
    subject_binding_sha256: "not-a-hash",
  }),
  { ok: false, reason: "role_authority_subject_binding_invalid" },
);

assert.deepEqual(
  validateChain2050RoleAuthorityRecordV1({
    ...g0,
    authority_policy_sha256: "not-a-hash",
  }),
  { ok: false, reason: "role_authority_policy_hash_invalid" },
);

assert.deepEqual(
  validateChain2050RoleAuthorityRecordV1({
    ...g0,
    predecessor_role_record_sha256: "not-a-hash",
  }),
  { ok: false, reason: "role_authority_predecessor_hash_invalid" },
);

const maxRecord = genesis({
  role_authority_generation:
    VOID_CHAIN2050_ROLE_AUTHORITY_MAX_GENERATION.toString(),
  transition: "policy_change",
  predecessor_role_record_sha256: "33".repeat(32),
});
const maxReplay = structuredClone(maxRecord);
assert.equal(
  verifyChain2050RoleAuthorityTransitionV1(maxRecord, maxReplay).ok,
  true,
);

const maxChanged = {
  ...maxRecord,
  authority_policy_sha256: POLICY_B,
  predecessor_role_record_sha256:
    deriveChain2050RoleAuthorityPairV1(maxRecord).role_record_sha256,
};
assert.deepEqual(
  verifyChain2050RoleAuthorityTransitionV1(maxRecord, maxChanged),
  { ok: false, reason: "ROLE_GENERATION_EXHAUSTED" },
);

assert.equal(
  compareChain2050RoleAuthorityPairV1(g0Pair, structuredClone(g0Pair)),
  true,
);
assert.equal(
  compareChain2050RoleAuthorityPairV1(
    g0Pair,
    {
      ...g0Pair,
      role_record_sha256: "ff".repeat(32),
    },
  ),
  false,
);

console.log(MARKER);
console.log("chain_id=2050");
console.log("closed_schema=true");
console.log("canonical_role_record_hash=true");
console.log("generation_wire_domain=uint64_decimal_canonical");
console.log("generation_increment_exactly_one=true");
console.log("same_generation_different_hash_rejected=true");
console.log("predecessor_hash_continuity=true");
console.log("revoke_restore_aba_old_pair_revived=false");
console.log("max_generation_exact_replay_allowed=true");
console.log("max_generation_changed_state_fail_closed=true");
console.log("role_is_not_capability=true");
console.log("runtime_activation=false");
console.log("chain_mutation=false");
console.log("authority_granted=false");
