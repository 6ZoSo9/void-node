# Chain-2050 Role Authority Read Adapter v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_READ_ADAPTER_V1`

Status: **source-only read contract**. This lane does not create a live role registry, endpoint, session, capability, signer, model connection, or authority grant.

## Purpose

This adapter consumes one current role-authority record from a separately reviewed Chain-2050 read source and converts it into a validated frozen read view.

The adapter reuses the merged `Chain-2050 Role Authority Record v1` primitive. It does not define a second role format or a second authority hash.

A successful read view contains:

- Chain ID `2050`;
- exact `identity_id`;
- exact `role`;
- `active | revoked` authority status;
- canonical `role_authority_generation`;
- locally derived `role_record_sha256`;
- `subject_binding_sha256`;
- `authority_policy_sha256`;
- predecessor role-record hash; and
- transition reason.

## Canonicality boundary

The adapter does **not** make an arbitrary source canonical merely because that source implements the TypeScript interface.

A production binding must separately prove that its `readCurrentRoleAuthorityRecordV1(identity_id)` implementation reads the reviewed canonical Chain-2050 participant-role registry or equivalent reviewed canonical query surface.

The current repository still lacks that live append-only participant-role registry. Therefore this PR proves the adapter contract and fail-closed semantics only. It does not claim a live on-chain role source exists.

The source advertises:

- `chain_id = 2050`; and
- `source_kind = canonical_chain2050_role_authority`.

Those fields are necessary adapter inputs, not sufficient evidence of production canonicality. Production source binding remains a separate reviewed lane.

## Read request

The closed request shape is:

```text
identity_id
expected_pair
require_active
```

`expected_pair` is either `null` or the exact pair:

```text
(role_authority_generation, role_record_sha256)
```

The adapter rejects unknown request fields, malformed identities, non-canonical generations, malformed hashes, wrong source Chain ID, wrong source kind, source failures, missing records, malformed records, wrong record Chain ID, and identity mismatch.

## Effect-boundary recheck

A caller that is about to rely on a previously observed role state can supply `expected_pair`.

The adapter then fails closed when:

- the current generation differs from the expected generation; or
- the generation matches but the record hash differs.

This is the read-side primitive needed for stale-session and ABA-resistant effect-boundary checks. It does not itself authorize an effect.

## Revocation

With `require_active=false`, a revoked record remains inspectable so monitoring and audit code can observe the revocation.

With `require_active=true`, the same record fails closed as `role_authority_revoked`.

This is still not a capability check. `active` means only that the role-authority record is not revoked. Technical actions remain subject to separate capability gates.

## Single-read semantics

Each adapter call performs exactly one source read.

The returned record is cloned before validation and converted to a frozen value-only view. Later mutation of a caller/source-owned object cannot rewrite the already returned view.

Callers that need a fresh effect-boundary decision must perform a fresh adapter read and compare the exact expected pair again.

## Non-activation boundary

This lane does not:

- create or mutate a Chain-2050 registry;
- publish an API route;
- start or restart a service;
- invoke Ollama or Apollyon;
- create a session;
- issue a capability;
- read or write private keys;
- sign or submit a transaction;
- mutate Work Credits;
- touch validator authority;
- access a wallet or signer; or
- move funds.

`authority_granted=false`

`capability_promoted=false`

`office_designated=false`

## Next lane

After this adapter and its hosted self-enforcing proof are green, the next source-only step is a concrete production-source binding audit/implementation against the eventual reviewed append-only Chain-2050 role registry.

Only after that canonical source binding exists should the frozen Apollyon v2r13 + Broker V11 pair be connected to the adapter through a separately reviewed read-only sentry boundary.
