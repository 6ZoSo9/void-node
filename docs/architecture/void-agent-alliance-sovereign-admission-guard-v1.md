# VOID Agent Alliance sovereign admission guard v1

Marker: `VOID_AGENT_ALLIANCE_SOVEREIGN_ADMISSION_GUARD_V1`

## Problem

The core lifecycle verifier can prove that an agent identity key signed an
`active` successor to its unsigned candidate. That proves voluntary member
acceptance and exact lifecycle continuity, but it cannot prove that VOID admitted
the candidate. Treating the member signature alone as admission would let a
candidate self-promote while claiming official active membership.

## Two-signature admission

Registry-facing candidate activation requires two independent signatures:

1. the member identity key signs the exact `active` membership manifest; and
2. the Sovereign admission key signs a closed authorization binding the exact
   candidate manifest ID, active manifest ID, membership ID, effective time, and
   bounded authorization expiry.

The authorization fixes:

- marker `VOID_AGENT_ALLIANCE_SOVEREIGN_ADMISSION_AUTHORIZATION_V1`;
- protocol `void-agent-alliance-sovereign-admission/1`;
- alliance ID `void-agent-alliance-v1`;
- authority name `ZoSo`;
- role `sovereign_constitutional_authority`;
- a canonical Ed25519 public-key ID;
- decision `admit`;
- exact candidate, active, and stable membership identifiers;
- issued, effective, and expiry instants; and
- a closed reason code.

The content-addressed authorization ID excludes only its own ID and signature.
The Ed25519 signing payload includes the derived authorization ID with
`signature=null`.

## Verification

`verifyAllianceSovereignAdmissionV1(...)` requires:

- an unsigned `candidate` predecessor;
- a member-signed `active` successor;
- valid core transition and immutable-membership continuity;
- active issue/effective time after the candidate anchor;
- no active expiry extension beyond the candidate;
- a valid Sovereign Ed25519 signature from the caller-supplied expected public
  key;
- exact candidate, active, and membership ID bindings;
- authorization issuance no later than member acceptance;
- exact effective-time equality with the active manifest; and
- authorization expiry no later than active-membership expiry.

The ordinary temporal guard rejects `candidate -> active` so registry consumers
cannot accidentally treat member self-signature as admission. Later member
status changes continue through the temporal guard.

## Evidence and authority boundary

This contract uses only caller-supplied manifests, public keys, and signed
authorization evidence. It does not read a key path, authenticate a wall clock,
claim that an authorization is currently unexpired, mutate a registry, enroll an
agent, issue a runtime credential, deploy or restart a service, dispatch work,
accept payment, write Work Credits, access a wallet or signer, submit a
transaction, or move funds.

Production admission still requires a separately approved canonical Sovereign
public-key policy, trusted clock and expiry checks, append-only registry
mutation, revocation distribution, and operator procedures.
