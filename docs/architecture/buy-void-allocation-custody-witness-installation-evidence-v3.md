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

## Reviewed three-key authorization set

The designated Nimo host now legitimately carries three root-owned, mode-0444
`voidwitness` authorized-key entries because later replay-custody work added
two independently restricted transports after the original V2 support-plane
qualification.

The V3 collector therefore preserves the original V2 support contract by
projecting **only entry 1** into
`classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV2(...)`.
It separately requires the complete current authorization file to be either the
historical single V2 entry or the exact reviewed three-entry generation.

The live three-entry generation observed on October 10, 2026 is bound by:

- full authorized-keys SHA-256
  `82cf34c8c2ff28a29103d050f081cff21f9beb0fbad04ec2d6d4de212c49afe4`;
- preserved first-two-entry prefix SHA-256
  `bac998dcfc1331a8182b17cbac524502a5fe4678979cc3ff9c47f9f18d7925f0`;
- entry 1: Buy VOID V2 witness forced command, line SHA-256
  `264214689c2faf0fa58b4d0f6b2e27b4e4853053ff35ba47f388fd69783e06da`;
- entry 2: replay-external witness forced command, line SHA-256
  `879ce63bce8b3198765eb975e89d04b2ff6b9bf5f43b6953f24ceb63eb1c4c17`;
- entry 3: replay compare-only forced command, line SHA-256
  `ff461ee8ef30973293e4435e2b25f773b442aa94b561bde85dfb3289b491b342`.

For all three entries the collector also pins the forced-command SHA-256,
OpenSSH public-key fingerprint, comment, expected generation marker and fixed
handler/wrapper target. Reordering, deletion, addition, command drift, key
substitution, comment drift, or target substitution deterministically HOLDs.

The V3 receipt content-addresses this authorization-set observation separately
from the unchanged V2 qualification object. The collector never edits
`authorized_keys`, reads a private key, or grants any new SSH authority.

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
