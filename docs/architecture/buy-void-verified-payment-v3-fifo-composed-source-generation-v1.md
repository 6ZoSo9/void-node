# Buy VOID V3 composed source generation: verified-payment V2 + FIFO-safe capacity

Status: **Draft / source and hosted CI only**.

This successor is stacked on #3698 exact head `5d54d15901607bc4af1ecda24f16700769e01f50`. It preserves the
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
