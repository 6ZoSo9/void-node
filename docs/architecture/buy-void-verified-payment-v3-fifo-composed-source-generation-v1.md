# Current-main V3 reconciliation — October 23, 2026

This document's current authoritative generation is the direct-current-main V3 source candidate on `main@29057c25f06fcb214853bc612ea7606211778f81`.

Exact current properties:

- scope: exactly 27 paths relative to that main generation;
- landed V2 source-acceptance carrier: `652197dc8df36f0f2004d50c6bbf95369790e2d1`;
- canonical-producer V5 launcher: `ops/run-void-node-live-v1.sh` Git blob `bc6a17ccdf389299fb139db37e742f0b1ad9dc4e`, historical V2 predecessor `6fb040de128ce0df16e848d61ea5f4acb62794da`;
- range-enabled mounted router: `src/index.ts` Git blob `a09661797aa4295371c036be36d82995e5233269`, historical V2 predecessor `123ec1792a027f93d4c9030749a0e7e136a75a44`;
- FIFO-safe verified-payment capacity writer: Git blob `d1320be22fe55af24017b84f0655fbcde82dbee9`;
- range-only dispatcher V6 remains immutable at `1ef5cd61a338cf726ddec59cea24932846d8d1fb`;
- combined dispatcher V7 source proof is a new successor and must bind the range router plus FIFO-safe writer without rewriting V6;
- current-presale V3 is historical refusal; V4 is the source-only combined successor;
- the V2 source-acceptance workflow is historical refusal under the current protected generation; its first frozen-row refusal is now the canonical-producer V5 launcher, before the later range-router drift;
- the current protected-source generation is **not accepted by this PR**. Relative to frozen V2 evidence, the current protected drift set includes the canonical-producer V5 launcher and the range router. Both are classified source-generation changes, not acceptance authority.

Therefore all of these remain false:

```text
candidate_enforcement_identity_accepted=false
successor_runtime_generation_accepted=false
verified_payment_v2_route_mounted=false
payment_allocation_custody_authority=false
source_finality_authentication_verified=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

The historical section below records the original #3698-parent V3 derivation and remains provenance only.

PROTECT THE CORE.

---

# Buy VOID V3 composed source generation: verified-payment V2 + FIFO-safe capacity

Status: **Draft / source and hosted CI only**.

This successor is stacked on #3698 exact head `52ae2fed1464157848c95fdccf10f23802f85ed6`. It preserves the
seven exact V2 verified-payment additions and the protected V1/V2 historical
evidence, while admitting one reviewed production-source transition from #3690:

```text
src/economic/buy_void_verified_payment_capacity_admission_v1.ts
old=ac8bf352979e0e24d2cab45c3b23949e1bd2b026
new=d1320be22fe55af24017b84f0655fbcde82dbee9
fifo_proof=1b3d72c2eda967f5cd84d929cd80c62508cce16e
```

The predecessor V2 source-generation proof remains immutable and is required to
**refuse** this composition with
`reconciliation_modified_allowed_current_main_drift:src/economic/buy_void_verified_payment_capacity_admission_v1.ts`. V3 accepts
only the exact FIFO-safe replacement, requires its real disposable FIFO
regression, and reruns the V2 transport/allocation/custody synthetic proofs on
the same exact checkout.

The current V3 proof additionally keeps historical V2 enforcement-lock acceptance
explicitly scoped as historical evidence while reporting
`candidate_enforcement_identity_accepted=false` for the changed FIFO-safe V3
source generation. A distinct V3 candidate/lock acceptance remains required.

The V3 source reader uses retained descriptor-relative
`O_RDONLY|O_NOFOLLOW|O_NONBLOCK` opens, bounded exact-length reads, pre/open/post
generation checks, and a real regular-to-FIFO substitution self-test. The
historical dual-rail V2 runtime-integration refusal checks its actual immutable
expected blob against the exact current V3 writer blob; it does not require an
impossible intermediate generation digest.

The five protected current-generation workflow consumers are advanced to V3
without rewriting the frozen candidate/lock/census evidence. Historical V1 and
V2 proof programs remain present as refusal evidence.

This does not mount the V2 operator route or prove source-chain finality,
cross-UID custody authority, production allocation, ERC-20 delivery, public
presale activation, signing, or funds movement.

```text
verified_payment_v2_route_mounted=false
payment_allocation_custody_authority=false
source_finality_authentication_verified=false
successor_runtime_generation_accepted=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

PROTECT THE CORE.
