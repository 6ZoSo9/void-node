# 2026-09-27 — Coupled Successor Runtime Semantic Seam V1

Marker: `VOID_REN_COUPLED_SUCCESSOR_RUNTIME_SEMANTIC_SEAM_V1`

## Discovery

During the coupled-launch census, the successor/coupled classifier seam exposed
a permanent source-readiness contradiction.

The epoch-2 migration policy explicitly rebuilds the `VoidToken` runtime at
the same address and proves reviewed semantic equivalence instead of preserving
legacy runtime bytes.

The upstream `SOURCE_READY` result correctly exposes successor-runtime review,
semantic equivalence, same-address preservation, and legacy-runtime non-reuse.

The downstream coupled gate still required
`voidtoken_runtime_identity_verified=true`, a field the upstream
`SOURCE_READY` result does not emit.

That made the source-ready composition unreachable even if every real migration
and coupled gate later became green.

## Repair lane

Branch:

`fix/coupled-successor-runtime-semantic-seam-v1-20260927`

The stale byte-identity predicate is replaced by:

- same-address preservation;
- legacy runtime non-reuse;
- successor runtime review;
- successor runtime semantic equivalence; and
- existing balance/supply equivalence.

A dedicated end-to-end classifier proof ensures the actual upstream
`SOURCE_READY` shape composes into the coupled gate and that weakening any of
the semantic-runtime invariants still holds closed.

No production candidate boolean is changed by this lane.

## Authority boundary

Source-only. No migration, runtime mutation, wallet/signer access, transaction,
funding, activation, or funds movement occurs.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.
