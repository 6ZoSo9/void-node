# Coupled successor runtime semantic seam v1

Marker: `VOID_COUPLED_SUCCESSOR_RUNTIME_SEMANTIC_SEAM_V1`

## Problem

The epoch-2 successor architecture intentionally rebuilds the canonical
`VoidToken` runtime at the same address while preserving balance/supply state
and proving reviewed semantic equivalence.

The successor classifier therefore emits:

- `voidtoken_same_address_preserved=true`;
- `voidtoken_legacy_runtime_reused=false`;
- `voidtoken_successor_runtime_reviewed=true`;
- `voidtoken_successor_runtime_semantic_equivalence_verified=true`; and
- `voidtoken_balance_and_supply_equivalence_verified=true`.

It does not emit the retired
`voidtoken_runtime_identity_verified` byte-identity claim.

The coupled economic gate still required that obsolete field, which meant an
otherwise valid upstream `SOURCE_READY` decision could never compose into a
coupled `SOURCE_READY` result.

## Repair

The coupled gate now requires the actual epoch-2 invariants:

- same canonical token address preserved;
- legacy runtime is not reused;
- successor runtime was reviewed;
- successor runtime semantic equivalence was verified; and
- balance/supply equivalence remains verified.

This is stricter than accepting a legacy byte-identity claim and is aligned
with the existing migration policy.

## Proof boundary

The dedicated integration proof creates a synthetic fully-ready upstream
candidate from the checked-in migration candidate, obtains the real
`SOURCE_READY` return shape from the upstream classifier, and feeds that
decision into the coupled classifier with all coupled gates synthetically true.

It proves:

- the real upstream result composes successfully;
- the upstream result has no
  `voidtoken_runtime_identity_verified` property;
- an obsolete runtime-identity flag cannot substitute for reviewed successor
  runtime;
- semantic-equivalence failure still fails closed; and
- legacy runtime reuse still fails closed.

No checked-in launch gate is promoted by this repair.

## Authority boundary

This is source/integration-test/CI/documentation only. It grants no migration,
wallet/signer, transaction, funding, market activation, presale activation, or
funds-movement authority.
