# Buy VOID Epoch-2 live composition native candidate V6R2

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_V6R2`.

## Purpose

This is the fresh candidate/report generation required by #3327 after the
historical operator-first-entry preservation repair became canonical through
#3318.

Historical merged #3317 candidate, #3322 lock, and #3324 materializer remain
preserved evidence but are not retry authority for this repaired lineage.

## Canonical repaired parent

- merged #3318: `a3896576a0a716337f679deb26de36dc039219e0`
- parent tree: `7f9fe7beb108368039fdc97ee58b1c6dfb4a69eb`
- operator-first-entry preservation workflow Git blob:
  `c66c1cd21ce762a128d7a25be8cec22686bca993`

The candidate report binds that parent head/tree and exact preservation-workflow
blob in its content-addressed trust root. The V3 native source, repaired V3
runner, native source proof/workflow, and sealed V2 probe remain exact reviewed
bytes.

The native ELF or runner bytes may equal historical V6 output. That does not
permit reuse of the historical candidate ID. V6R2 uses a distinct marker and
`voidbuye2nativecand6r2_<sha256>` content address.

## Hosted qualification

Three independent Ubuntu 24.04 lanes derive candidate reports. A separate
compare job requires raw-byte-identical reports and independently rederives the
native ELF, complete static toolchain/link-input closure, hostile-loader
behavior, exact self-test transcript, and no-PT_INTERP/static executable shape.

The source proof also requires the canonical #3318 merge to be an ancestor of
the candidate head and verifies its exact tree identity.

## Authority

Candidate generation only.

- candidate_accepted=false
- native_binary_identity_accepted=false
- runner_identity_accepted=false
- protected_install_authorized=false
- live_execution_authorized=false
- credential_access=false
- private_key_access=false
- signing_authorized=false
- transaction=false
- payment_acceptance=false
- public_presale_activation=false
- wc_void_market_activation=false
- funds_movement=false

No Precision install/apply, protected-root mutation, live credential access,
signing, transaction/RPC, payment, presale/WC, service/systemd, treasury, or
funds authority.
