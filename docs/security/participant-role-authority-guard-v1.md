# Participant role-authority guard v1

Marker: `VOID_PARTICIPANT_ROLE_AUTHORITY_GUARD_V1_PROOF_GREEN`

## Purpose

This source-only guard carries forward the retained role semantics from
superseded #1652 into the accepted participant login/session lineage without
reviving #1652's parallel session implementation.

It consumes the merged Chain-2050 role-authority read/binding primitives from
#1656.

## Identity rule

The guard does **not** infer an identity from an account and does not add a
second account-to-identity registry.

The caller must supply an explicit:

- `identity_id`;
- `account_id`; and
- canonical Ed25519 public JWK.

The next session-integration gate must place that explicit identity into the
signed login context rather than derive it from mutable display/account data.

## Canonical subject binding

The subject digest is SHA-256 of canonical JSON:

```json
{
  "schema": "void.participant-subject-binding.v1",
  "chain_id": 2050,
  "identity_id": "<identity>",
  "account_id": "<account>",
  "public_key_jwk": {
    "kty": "OKP",
    "crv": "Ed25519",
    "x": "<canonical 32-byte base64url public key>"
  }
}
```

This is the same retained subject-binding contract defined by the superseded
trust-wall lane.

No secret or Wallet private key is included.

## Admission

`admitParticipantRoleAuthorityV1()` requires:

1. a bound canonical Chain-2050 role-authority source;
2. the exact expected registry-binding descriptor SHA-256;
3. one valid explicit participant subject;
4. current authority status `active`;
5. current exact role `AGENT`; and
6. current role-record subject binding equal to the recomputed subject digest.

Successful admission captures:

- identity and account;
- subject-binding SHA-256;
- authority-policy SHA-256;
- exact role-authority generation;
- exact role-record SHA-256; and
- exact registry-binding descriptor SHA-256.

## Per-read revalidation

`revalidateParticipantRoleAuthorityV1()` requires the current explicit
identity/account/login key to still match the admitted subject, then performs a
fresh role-authority read.

It fails closed on:

- source or registry-binding failure;
- revoked authority;
- role change away from `AGENT`;
- subject-binding change;
- authority-policy change;
- role-authority generation change;
- role-record hash change; or
- expected registry-binding descriptor change.

The exact role generation and record hash are both compared independently.

## Authority boundary

This PR adds only a security primitive, proof, documentation, and focused CI.

It adds no:

- HTTP route or browser flow;
- participant-session mutation;
- deployment or service restart;
- live RPC observer;
- Chain-2050 write or registry append;
- Wallet/passphrase/private-key/signer access;
- transaction construction/signing/broadcast;
- Work Credit mutation;
- validator mutation; or
- funds action.

## Next gate

After this guard is accepted, a separate source-only session integration should:

1. add explicit `identity_id` to the signed participant login/challenge
   context;
2. derive the exact Ed25519 public JWK from the already-bound login public key;
3. require this guard at login before session issuance;
4. capture the guard admission in session state; and
5. invoke guard revalidation on every protected account read.

A later live Chain-2050 observer/deployment/activation lane remains separate.
