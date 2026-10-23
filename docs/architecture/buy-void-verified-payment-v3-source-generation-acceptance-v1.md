# Buy VOID verified-payment V3 capacity-safe source-generation acceptance

Status: **Draft / source and hosted CI only**. This successor composes the
reviewed verified-payment V2 source-generation candidate with the separately
reviewed FIFO-safe capacity-reader source repair. It does not mount a payment
route or grant custody, signing, delivery, presale, treasury, or funds authority.

## Accepted parents

Primary source parent:

- PR #3698 head `78b5e4d2566fea29fbc8d2a495238fe68d4d20cc`
- tree `70d5899f3d3fe8a0daa5cbac912507bef2595b69`
- V2 source proof blob `ad1c47b610b6b986250c250eb788f4ec26366009`

Capacity repair evidence:

- PR #3690 current-main head `d87300ad11242160206d01a9ec34e3f8ae2b5954`
- tree `f960feef0f2c36fe7cd102c3276f1989664e3d57`
- production capacity source
  `src/economic/buy_void_verified_payment_capacity_admission_v1.ts`
  old blob `ac8bf352979e0e24d2cab45c3b23949e1bd2b026`
  to FIFO-safe blob `d1320be22fe55af24017b84f0655fbcde82dbee9`
- capacity proof blob `1b3d72c2eda967f5cd84d929cd80c62508cce16e`
- architecture note blob `9439e92089031aa3a63e991ae86d42c944b1c367`

The standalone #3690 workflow remains historical evidence on #3690 rather than
being copied into this composition. V3 executes the exact capacity proof
directly on Node 22/24/26.

## Composition contract

Relative to exact #3698 parent, V3 admits exactly twelve paths:

- the FIFO-safe capacity production source;
- its existing focused proof and architecture note;
- five protected V7/V2 workflow definitions changed only to select V3 while
  retaining V1 and V2 trigger references;
- V3 source proof, trigger-closure proof, dedicated workflow, and this document.

The V3 proof keeps all #3698 checks for the seven V2 additions, the 49 frozen
protected-source identities, frozen candidate/lock/V4 census identities,
provider source/artifact closure, and the three original nonprotected economic
drift paths. Of those three legacy paths, only the capacity writer is permitted
to advance, and only to the exact reviewed FIFO-safe Git blob.

The V2 source proof is preserved byte-for-byte and **must refuse** V3 with the
specific capacity-source generation mismatch. The V1 historical source proof
must also continue refusing the expanded economic generation. V3 is therefore a
versioned successor, not a silent repin of either frozen gate.

## Security behavior added

The accepted capacity source requires `O_NONBLOCK|O_NOFOLLOW` on both retained
request/history and private-sidecar leaf opens. The focused regression substitutes
real 0600 FIFOs at the actual production `fs.openSync` boundaries and requires
regular-file/type rejection without blocking or deleting the displaced original
file. Existing descriptor metadata/generation checks remain in force.

This availability hardening does not change allocation policy, payment
verification, quote rules, customer identity, token delivery, or monetary policy.

## Authority split remains fail-closed

The frozen V2 lock's accepted identity is preserved only as historically scoped
predecessor evidence. It must not be interpreted as acceptance of this changed
V3 source generation.

```text
historical_v2_candidate_enforcement_identity_accepted=true
candidate_enforcement_identity_accepted=false
verified_payment_v2_route_mounted=false
payment_allocation_custody_authority=false
source_finality_authentication_verified=false
cross_uid_peer_credentials_authenticated=false
independent_source_acceptance_complete=false
successor_runtime_generation_accepted=false
payment_acceptance=false
automatic_fulfillment=false
public_presale_activation=false
wc_void_market_activation=false
funds_movement=false
```

A future write-capable route still requires authenticated original first-request
history, first-row native-USDC/launch provenance, protected installed request-root
identity, separate custody UID/socket peer authentication, crash-consistent
payment+allocation durability, and an explicitly approved canary.

PROTECT THE CORE.
