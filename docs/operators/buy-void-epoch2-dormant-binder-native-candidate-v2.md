# Buy VOID Epoch-2 dormant binder finalized-input candidate V2

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_V2`.

Tracker: #3361.

Status: **source/CI-only successor candidate; unaccepted and not installed**.

## Why V2 exists

Merged #3360 proves a reproducible dormant-binder native candidate, but its V1
candidate proof records reviewed source identity and then reopens the mutable
checkout source pathname for preprocessing and both compile passes.

That makes V1 reproducibility evidence, not complete derivation provenance under
a same-UID substitute/restore threat.

V2 preserves merged V1 as historical evidence and introduces a new build-input
authority rather than silently changing the meaning of the V1 report.

## Finalized source authority

V2 reads the exact reviewed native source, verifies its merged Git-blob identity,
then copies those exact bytes into a Linux `memfd` created with sealing enabled.

Before any preprocess or compile operation it applies:

- `F_SEAL_WRITE`;
- `F_SEAL_GROW`;
- `F_SEAL_SHRINK`;
- `F_SEAL_SEAL`.

The proof re-reads the sealed bytes and proves a write attempt is rejected.

Preprocessing and both candidate compile passes use only the inherited
`/proc/self/fd/<sealed-fd>` handle with an explicit C language selection. They
never use the mutable checkout source pathname as a build input.

The visible repository source is revalidated after the build, but that
revalidation is defense in depth. The sealed descriptor generation is the build
authority.

A synthetic substitute/restore adversary replaces a visible source pathname
after snapshot creation and proves the sealed bytes do not change.

## Toolchain provenance

Every compiler/linker/strip executable and every recorded static-link input is
required to resolve to a root-owned regular file beneath root-owned
non-group/world-writable ancestry. The report binds stable byte identities and
permission metadata.

The complete toolchain identity is recomputed after preprocess/compile/link/strip
and must match exactly.

Root-equivalent mutation remains outside this source proof's threat model.

## Hosted derivation

Three independent Ubuntu 24.04 lanes must produce byte-identical:

- V2 candidate report;
- stripped static native-preentry ELF.

A separate compare job independently rederives both once more.

The existing merged #3358 failure-truth semantics and exact native self-test
transcript remain mandatory, including:

`failure_truth_boundary_test_modes=true`.

## Authority

V2 remains candidate evidence only:

- `candidate_accepted=false`;
- `native_binary_identity_accepted=false`;
- `protected_install_authorized=false`;
- `live_execution_authorized=false`;
- `credential_access=false`;
- `private_key_access=false`;
- `signing_authorized=false`;
- `transaction=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `wc_void_market_activation=false`;
- `funds_movement=false`;
- `production_host_evidence_authority=false`.

No Precision installation, service mutation, credential/key access, signing,
RPC, transaction, payment acceptance, presale/WC activation, or funds movement.

PROTECT THE CORE.
