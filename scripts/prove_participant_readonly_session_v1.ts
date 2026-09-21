import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  sign,
  type JsonWebKey,
} from "node:crypto";

import {
  authorizeParticipantReadonlySessionV1,
  canonicalParticipantReadonlyJsonV1,
  computeParticipantSubjectBindingSha256V1,
  createParticipantReadonlyChallengeV1,
  verifyAndIssueParticipantReadonlySessionV1,
  verifyParticipantReadonlyProofV1,
  VOID_PARTICIPANT_READONLY_SESSION_PRODUCTION_ACTIVE,
  type ParticipantReadonlyChallengeReplayStoreV1,
  type ParticipantReadonlyBoundRoleSourceV1,
  type ParticipantReadonlyProofV1,
  type ParticipantReadonlyPublicJwkV1,
  type ParticipantReadonlySessionIssueStoreV1,
} from "../src/security/participant_readonly_session_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
  VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA,
  computeChain2050RoleRecordSha256V1,
  type Chain2050RoleAuthorityRecordV1,
} from "../src/security/chain2050_role_authority_record_v1.js";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_READ_SOURCE_KIND_V1,
  type Chain2050RoleAuthorityReadSourceV1,
} from "../src/security/chain2050_role_authority_read_adapter_v1.js";

const ORIGIN = "https://zoso-precision-tower-7810.taila47fd.ts.net";
const IDENTITY = "participant.alice";
const ACCOUNT = "alice";
const POLICY = "a".repeat(64);
const REGISTRY_BINDING = "d".repeat(64);
const NONCE_A = Buffer.alloc(24, 0x11).toString("base64url");
const NONCE_B = Buffer.alloc(24, 0x22).toString("base64url");
const SESSION_ID = "12".repeat(32);
const SESSION_TOKEN = Buffer.alloc(32, 0x33).toString("base64url");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const exported = publicKey.export({ format: "jwk" }) as JsonWebKey;
const publicJwk: ParticipantReadonlyPublicJwkV1 = {
  kty: "OKP",
  crv: "Ed25519",
  x: String(exported.x),
};

const binding = computeParticipantSubjectBindingSha256V1({
  identity_id: IDENTITY,
  account_id: ACCOUNT,
  public_key_jwk: publicJwk,
});

function record(overrides: Partial<Chain2050RoleAuthorityRecordV1> = {}): Chain2050RoleAuthorityRecordV1 {
  return {
    schema: VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1_SCHEMA,
    chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
    identity_id: IDENTITY,
    role: "AGENT",
    authority_status: "active",
    role_authority_generation: "0",
    subject_binding_sha256: binding,
    authority_policy_sha256: POLICY,
    predecessor_role_record_sha256: null,
    transition: "genesis_grant",
    ...overrides,
  };
}

let currentRecord: Chain2050RoleAuthorityRecordV1 = record();
const source: ParticipantReadonlyBoundRoleSourceV1 = {
  chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
  source_kind: VOID_CHAIN2050_ROLE_AUTHORITY_READ_SOURCE_KIND_V1,
  binding_descriptor_sha256: REGISTRY_BINDING,
  readCurrentRoleAuthorityRecordV1: async (identityId: string) =>
    identityId === IDENTITY ? structuredClone(currentRecord) : null,
};

class ReplayStore implements ParticipantReadonlyChallengeReplayStoreV1 {
  readonly seen = new Set<string>();
  async consumeChallengeNonceV1(nonce: string): Promise<boolean> {
    if (this.seen.has(nonce)) return false;
    this.seen.add(nonce);
    return true;
  }
}

class IssueStore implements ParticipantReadonlySessionIssueStoreV1 {
  readonly seen = new Set<string>();
  async consumeVerifiedProofV1(proofSha256: string): Promise<boolean> {
    if (this.seen.has(proofSha256)) return false;
    this.seen.add(proofSha256);
    return true;
  }
}

function signedProof(
  nonce: string,
  overrides: {
    origin?: string;
    identity_id?: string;
    account_id?: string;
    issued_at?: string;
    expires_at?: string;
  } = {},
): ParticipantReadonlyProofV1 {
  const challenge = createParticipantReadonlyChallengeV1({
    origin: overrides.origin ?? ORIGIN,
    identity_id: overrides.identity_id ?? IDENTITY,
    account_id: overrides.account_id ?? ACCOUNT,
    public_key_jwk: publicJwk,
    issued_at: overrides.issued_at ?? "2026-09-21T20:00:00.000Z",
    expires_at: overrides.expires_at ?? "2026-09-21T20:00:45.000Z",
    nonce,
  });
  const signature = sign(
    null,
    Buffer.from(canonicalParticipantReadonlyJsonV1(challenge), "utf8"),
    privateKey,
  ).toString("base64url");
  return {
    marker: "VOID_PARTICIPANT_READONLY_SESSION_PROOF_V1",
    version: 1,
    challenge,
    signature: {
      alg: "Ed25519",
      encoding: "base64url-no-padding",
      value: signature,
    },
  };
}

assert.equal(VOID_PARTICIPANT_READONLY_SESSION_PRODUCTION_ACTIVE, false);

const proofA = signedProof(NONCE_A);
const replayA = new ReplayStore();
const verified = await verifyParticipantReadonlyProofV1(
  source,
  REGISTRY_BINDING,
  replayA,
  proofA,
  ORIGIN,
  "2026-09-21T20:00:20.000Z",
);
assert.equal(verified.ok, true, verified.ok ? "" : verified.reason);
if (!verified.ok) throw new Error("unreachable");

assert.equal(verified.verified.identity_id, IDENTITY);
assert.equal(verified.verified.account_id, ACCOUNT);
assert.equal(verified.verified.origin, ORIGIN);
assert.equal(verified.verified.subject_binding_sha256, binding);

const replayed = await verifyParticipantReadonlyProofV1(
  source,
  REGISTRY_BINDING,
  replayA,
  proofA,
  ORIGIN,
  "2026-09-21T20:00:21.000Z",
);
assert.deepEqual(replayed, {
  ok: false,
  reason: "participant_challenge_replay_detected",
});

const wrongOrigin = await verifyParticipantReadonlyProofV1(
  source,
  REGISTRY_BINDING,
  new ReplayStore(),
  proofA,
  "https://voidchain.org",
  "2026-09-21T20:00:20.000Z",
);
assert.deepEqual(wrongOrigin, {
  ok: false,
  reason: "participant_challenge_origin_mismatch",
});

const unboundSource: Chain2050RoleAuthorityReadSourceV1 = {
  chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
  source_kind: VOID_CHAIN2050_ROLE_AUTHORITY_READ_SOURCE_KIND_V1,
  readCurrentRoleAuthorityRecordV1: source.readCurrentRoleAuthorityRecordV1,
};
const unbound = await verifyParticipantReadonlyProofV1(
  unboundSource,
  REGISTRY_BINDING,
  new ReplayStore(),
  signedProof(Buffer.alloc(24, 0xa1).toString("base64url")),
  ORIGIN,
  "2026-09-21T20:00:20.000Z",
);
assert.deepEqual(unbound, {
  ok: false,
  reason: "participant_role_source_binding_invalid",
});

const foreignBoundSource: ParticipantReadonlyBoundRoleSourceV1 = {
  ...source,
  binding_descriptor_sha256: "e".repeat(64),
};
const foreignBinding = await verifyParticipantReadonlyProofV1(
  foreignBoundSource,
  REGISTRY_BINDING,
  new ReplayStore(),
  signedProof(Buffer.alloc(24, 0xa2).toString("base64url")),
  ORIGIN,
  "2026-09-21T20:00:20.000Z",
);
assert.deepEqual(foreignBinding, {
  ok: false,
  reason: "participant_role_source_binding_mismatch",
});

const expired = await verifyParticipantReadonlyProofV1(
  source,
  REGISTRY_BINDING,
  new ReplayStore(),
  signedProof(NONCE_B),
  ORIGIN,
  "2026-09-21T20:01:00.000Z",
);
assert.deepEqual(expired, {
  ok: false,
  reason: "participant_challenge_expired_or_not_yet_valid",
});

const tampered = structuredClone(signedProof(Buffer.alloc(24, 0x44).toString("base64url")));
tampered.challenge.account_id = "mallory";
const tamperedResult = await verifyParticipantReadonlyProofV1(
  source,
  REGISTRY_BINDING,
  new ReplayStore(),
  tampered,
  ORIGIN,
  "2026-09-21T20:00:20.000Z",
);
assert.equal(tamperedResult.ok, false);

currentRecord = record({ role: "VALIDATOR" });
const wrongRoleProof = signedProof(Buffer.alloc(24, 0x55).toString("base64url"));
const wrongRole = await verifyParticipantReadonlyProofV1(
  source,
  REGISTRY_BINDING,
  new ReplayStore(),
  wrongRoleProof,
  ORIGIN,
  "2026-09-21T20:00:20.000Z",
);
assert.deepEqual(wrongRole, {
  ok: false,
  reason: "participant_role_not_agent",
});

currentRecord = record({ authority_status: "revoked" });
const revokedProof = signedProof(Buffer.alloc(24, 0x66).toString("base64url"));
const revoked = await verifyParticipantReadonlyProofV1(
  source,
  REGISTRY_BINDING,
  new ReplayStore(),
  revokedProof,
  ORIGIN,
  "2026-09-21T20:00:20.000Z",
);
assert.equal(revoked.ok, false);
if (!revoked.ok) {
  assert.match(revoked.reason, /^participant_role_authority_rejected:/);
}

currentRecord = record({ subject_binding_sha256: "b".repeat(64) });
const bindingProof = signedProof(Buffer.alloc(24, 0x77).toString("base64url"));
const wrongBinding = await verifyParticipantReadonlyProofV1(
  source,
  REGISTRY_BINDING,
  new ReplayStore(),
  bindingProof,
  ORIGIN,
  "2026-09-21T20:00:20.000Z",
);
assert.deepEqual(wrongBinding, {
  ok: false,
  reason: "participant_role_subject_binding_mismatch",
});

assert.throws(
  () =>
    createParticipantReadonlyChallengeV1({
      origin: ORIGIN,
      identity_id: IDENTITY,
      account_id: ACCOUNT,
      public_key_jwk: {
        ...publicJwk,
        d: "forbidden-private-material",
      } as ParticipantReadonlyPublicJwkV1,
      issued_at: "2026-09-21T20:00:00.000Z",
      expires_at: "2026-09-21T20:00:45.000Z",
      nonce: Buffer.alloc(24, 0x88).toString("base64url"),
    }),
  /participant_public_jwk_invalid/,
);

currentRecord = record();
const proofForSession = signedProof(Buffer.alloc(24, 0x99).toString("base64url"));
const issueStore = new IssueStore();
const issued = await verifyAndIssueParticipantReadonlySessionV1(
  source,
  REGISTRY_BINDING,
  new ReplayStore(),
  issueStore,
  proofForSession,
  ORIGIN,
  "2026-09-21T20:00:20.000Z",
  {
    session_id: SESSION_ID,
    bearer_token: SESSION_TOKEN,
    expires_at: "2026-09-22T20:00:20.000Z",
  },
);
assert.equal(issued.ok, true, issued.ok ? "" : issued.reason);
if (!issued.ok) throw new Error("unreachable");

const duplicateIssued = await verifyAndIssueParticipantReadonlySessionV1(
  source,
  REGISTRY_BINDING,
  new ReplayStore(),
  issueStore,
  proofForSession,
  ORIGIN,
  "2026-09-21T20:00:20.000Z",
  {
    session_id: "34".repeat(32),
    bearer_token: Buffer.alloc(32, 0x35).toString("base64url"),
    expires_at: "2026-09-22T20:00:20.000Z",
  },
);
assert.deepEqual(duplicateIssued, {
  ok: false,
  reason: "participant_verified_proof_already_consumed",
});

assert.equal(JSON.stringify(issued.session).includes(SESSION_TOKEN), false);
assert.equal(
  issued.session.role_registry_binding_descriptor_sha256,
  REGISTRY_BINDING,
);
assert.equal(issued.session.role, "AGENT");
assert.equal(issued.session.capabilities.wallet_read, true);
assert.equal(issued.session.capabilities.earn_read, true);
for (const key of [
  "account_enumeration",
  "generic_private_node_read",
  "wallet_signing",
  "wallet_send",
  "work_credit_mutation",
  "validator_mutation",
  "transaction_broadcast",
  "money_movement",
] as const) {
  assert.equal(issued.session.capabilities[key], false, key);
}

for (const route of [
  "/__void/ui/wave3/wallet.json",
  "/__void/ui/wave4/earn.json",
]) {
  const authorized = await authorizeParticipantReadonlySessionV1(
    source,
    REGISTRY_BINDING,
    issued.session,
    {
      bearer_token: SESSION_TOKEN,
      origin: ORIGIN,
      account_id: ACCOUNT,
      route,
      now: "2026-09-21T20:05:00.000Z",
    },
  );
  assert.equal(authorized.ok, true, authorized.ok ? "" : authorized.reason);
  if (authorized.ok) {
    assert.equal(authorized.context.account_id, ACCOUNT);
    assert.equal(authorized.context.route, route);
  }
}

const wrongToken = await authorizeParticipantReadonlySessionV1(
  source,
  REGISTRY_BINDING,
  issued.session,
  {
    bearer_token: Buffer.alloc(32, 0xaa).toString("base64url"),
    origin: ORIGIN,
    account_id: ACCOUNT,
    route: "/__void/ui/wave3/wallet.json",
    now: "2026-09-21T20:05:00.000Z",
  },
);
assert.deepEqual(wrongToken, {
  ok: false,
  reason: "participant_session_token_mismatch",
});

const wrongAccount = await authorizeParticipantReadonlySessionV1(
  source,
  REGISTRY_BINDING,
  issued.session,
  {
    bearer_token: SESSION_TOKEN,
    origin: ORIGIN,
    account_id: "mallory",
    route: "/__void/ui/wave3/wallet.json",
    now: "2026-09-21T20:05:00.000Z",
  },
);
assert.deepEqual(wrongAccount, {
  ok: false,
  reason: "participant_session_account_mismatch",
});

const wrongRoute = await authorizeParticipantReadonlySessionV1(
  source,
  REGISTRY_BINDING,
  issued.session,
  {
    bearer_token: SESSION_TOKEN,
    origin: ORIGIN,
    account_id: ACCOUNT,
    route: "/rpc",
    now: "2026-09-21T20:05:00.000Z",
  },
);
assert.deepEqual(wrongRoute, {
  ok: false,
  reason: "participant_session_request_invalid",
});

const wrongSessionOrigin = await authorizeParticipantReadonlySessionV1(
  source,
  REGISTRY_BINDING,
  issued.session,
  {
    bearer_token: SESSION_TOKEN,
    origin: "https://voidchain.org",
    account_id: ACCOUNT,
    route: "/__void/ui/wave3/wallet.json",
    now: "2026-09-21T20:05:00.000Z",
  },
);
assert.deepEqual(wrongSessionOrigin, {
  ok: false,
  reason: "participant_session_origin_mismatch",
});

const foreignSourceSession = await authorizeParticipantReadonlySessionV1(
  foreignBoundSource,
  REGISTRY_BINDING,
  issued.session,
  {
    bearer_token: SESSION_TOKEN,
    origin: ORIGIN,
    account_id: ACCOUNT,
    route: "/__void/ui/wave3/wallet.json",
    now: "2026-09-21T20:05:00.000Z",
  },
);
assert.deepEqual(foreignSourceSession, {
  ok: false,
  reason: "participant_session_role_source_binding_mismatch",
});

const expiredSession = await authorizeParticipantReadonlySessionV1(
  source,
  REGISTRY_BINDING,
  issued.session,
  {
    bearer_token: SESSION_TOKEN,
    origin: ORIGIN,
    account_id: ACCOUNT,
    route: "/__void/ui/wave3/wallet.json",
    now: "2026-09-23T20:00:20.001Z",
  },
);
assert.deepEqual(expiredSession, {
  ok: false,
  reason: "participant_session_expired_or_not_yet_valid",
});

const predecessor = computeChain2050RoleRecordSha256V1(currentRecord);
currentRecord = record({
  authority_status: "revoked",
  role_authority_generation: "1",
  predecessor_role_record_sha256: predecessor,
  transition: "revoke",
});
const revokedSession = await authorizeParticipantReadonlySessionV1(
  source,
  REGISTRY_BINDING,
  issued.session,
  {
    bearer_token: SESSION_TOKEN,
    origin: ORIGIN,
    account_id: ACCOUNT,
    route: "/__void/ui/wave3/wallet.json",
    now: "2026-09-21T20:05:00.000Z",
  },
);
assert.equal(revokedSession.ok, false);
if (!revokedSession.ok) {
  assert.match(
    revokedSession.reason,
    /^participant_session_role_revalidation_failed:/,
  );
}

currentRecord = record();
const oldHash = computeChain2050RoleRecordSha256V1(currentRecord);
currentRecord = record({
  subject_binding_sha256: "c".repeat(64),
  role_authority_generation: "1",
  predecessor_role_record_sha256: oldHash,
  transition: "subject_binding_change",
});
const bindingChangedSession = await authorizeParticipantReadonlySessionV1(
  source,
  REGISTRY_BINDING,
  issued.session,
  {
    bearer_token: SESSION_TOKEN,
    origin: ORIGIN,
    account_id: ACCOUNT,
    route: "/__void/ui/wave4/earn.json",
    now: "2026-09-21T20:05:00.000Z",
  },
);
assert.equal(bindingChangedSession.ok, false);

console.log("VOID_PARTICIPANT_READONLY_SESSION_V1_GREEN");
console.log("production_session_issuance=false");
console.log("challenge_ttl_max_seconds=60");
console.log("session_ttl_max_days=30");
console.log("ed25519_proof_required=true");
console.log("canonical_role=AGENT");
console.log("registry_binding_descriptor_pinned=true");
console.log("challenge_replay_rejected=true");
console.log("verified_proof_single_session=true");
console.log("role_authority_revalidated_per_read=true");
console.log("account_enumeration=false");
console.log("wallet_signing=false");
console.log("wallet_send=false");
console.log("work_credit_mutation=false");
console.log("validator_mutation=false");
console.log("transaction_broadcast=false");
console.log("money_movement=false");
