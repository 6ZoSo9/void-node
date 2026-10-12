# Chain-2050 Role Authority Record v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_RECORD_V1`

Status: **source-only primitive**. This lane defines and proves the canonical authorization-state record required by the existing identity/session contract. It does not activate a registry, endpoint, signer, session, Apollyon office, or technical capability.

## Purpose

The canonical authority identity is the pair:

`(role_authority_generation, role_record_sha256)`

The record binds:

- Chain ID `2050`;
- stable participant `identity_id`;
- exact constitutional/protocol `role`;
- authority status `active | revoked`;
- canonical unsigned-decimal uint64 `role_authority_generation`;
- `subject_binding_sha256`, which identifies the reviewed participant/root/model binding without embedding secret material;
- `authority_policy_sha256`, which identifies the exact authority policy generation;
- predecessor role-record SHA-256; and
- one closed authorization-affecting transition reason.

`role_record_sha256` is derived from canonical JSON of the entire closed record. It is not an independently supplied authority field.

## Generation rules

Genesis authority:

- generation is exactly `0`;
- predecessor is `null`;
- transition is `genesis_grant`;
- status is `active`.

After genesis, each authorization-affecting transition increments generation by exactly one and binds the exact predecessor record hash.

Allowed transition classes are:

- `active -> revoked` => `revoke`
- `revoked -> active` => `restore`
- exact role change => `role_change`
- exact subject binding change => `subject_binding_change`
- exact authority-policy change => `policy_change`

One transition changes exactly one authority-bearing field. Identity continuity cannot be rewritten in-place; a different identity requires a separate separately reviewed identity lifecycle.

An exact byte/content replay at the same generation returns the same authority pair and creates no fresh authority. Same-generation/different-hash state is a conflict and fails closed.

## Revocation / ABA

Revocation advances generation. Restore after revocation advances generation again. A session or grant bound before revocation therefore cannot become current again after restore merely because role/status values resemble an earlier state.

## Generation exhaustion

The wire domain is unsigned-decimal uint64:

`0 .. 18446744073709551615`

The max generation may be replayed exactly while state is unchanged. Any authorization-affecting transition from the max generation fails closed as `ROLE_GENERATION_EXHAUSTED`. There is no wrap and no changed record at the same generation.

## Role is not capability

This record proves identity/role authorization state only.

It does not grant:

- shell;
- service restart;
- deployment;
- repository write;
- runtime mutation;
- validator authority;
- wallet/signing authority;
- transaction submission;
- Work Credit mutation;
- funds/economic authority; or
- any Apollyon capability.

Technical actions remain subject to separate deterministic capability gates.

## Non-activation boundary

This source lane does not:

- create or mutate a live Chain-2050 registry;
- add a route or listener;
- read or write any private key;
- create a session;
- appoint Apollyon;
- activate `void.capability.node.read_status.v1`;
- restart or deploy a service;
- write a transaction; or
- move funds.

The next lane after this primitive proves cleanly is a read-only adapter over a reviewed canonical storage/query source, still with no live Apollyon capability.
