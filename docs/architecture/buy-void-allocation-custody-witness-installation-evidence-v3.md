# Buy VOID Nimo V3 installation evidence v3

Marker: `VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V3`

## Scope

This is the read-only installation-evidence successor for the exact Nimo V3
runtime-bundle generation accepted by
`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V3`.

The support-plane installation contract remains the reviewed V2 qualification:
dedicated `voidwitness` account, V2 forced-command handler, root-owned
read-only config, restrictive authorized key, effective sshd policy, sanitized
pre-exec chain, pinned host/client identities, continuity attestation, and
witness storage semantics did not change.

The only generation transition is the eight-file runtime closure. This
collector therefore composes:

1. the unchanged
   `classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV2(...)`
   support-plane qualification; and
2. the new read-only
   `collectBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceV3(...)`
   runtime-bundle evidence.

The historical V2 installation collector remains unchanged and continues to
describe the predecessor runtime generation.

## V3 receipt

The V3 receipt has its own schema/marker/version and binds the V3 candidate
manifest ID, exact candidate archive SHA-256, V3 runtime qualification ID,
runtime evidence digest, normalized runtime qualification digest, and V3
collector receipt digest.

The installation support qualification remains a `voidwiq2_...` object by
design. A new runtime generation does not create a new SSH/account/config
contract.

The companion package is generation V2 because it packages the V3 installation
receipt while retaining the existing normalized V2 support qualification.

## Read-only host observation

The collector preserves the V2 descriptor-bound/no-follow security model:
security-sensitive paths are fixed by source, final file identity is bound to a
retained descriptor, parent chains are walked descriptor-relative, bounded
reads reject growth, and two complete censuses must be canonically identical.

It observes but never changes account, SSH, config, continuity, runtime or
witness state.

## Authority boundary

A GREEN source proof or live V3 receipt is installation **evidence**, not
production admission. This lane performs no installation itself and grants no
payment, allocation, custody reserve/recover, signer, transaction, presale or
funds authority.

The following remain false:

`live_evidence_origin_proven=false`,
`live_sshd_connection_context_proven=false`,
`trusted_verification_clock_proven=false`,
`evidence_generation_monotonicity_proven=false`,
`external_transport_authenticated=false`,
`external_witness_storage_proven=false`,
`protected_high_water_custody_proven=false`,
`independent_custody_proven=false`,
`runtime_integration=false`,
`production_gate_ready=false`, and
`funds_movement=false`.

After this source generation is merged and qualified, Nimo may receive the
separately guarded exact two-file V3 root install. The immediate post-install
gate is this V3 collector, followed by authenticated transport/live-read and
protected high-water custody qualification. Public presale activation remains
separate.
