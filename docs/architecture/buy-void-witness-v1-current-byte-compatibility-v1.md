# VOID witness runtime executable-byte compatibility: frozen V1 versus current integration

## Correct the historical comparison baseline

The immutable **V1 witness manifest source-generation commit** is
`f627cad6bc07a6ad3ebe7cbd946723316fcd0567`, not
`e390424c1d31cd87dcf3551cc0d2d610a24e12f8`.
The latter was the historical comparison baseline chosen by the earlier
[Draft #2718](https://github.com/6ZoSo9/void-node/pull/2718) derived V2
candidate, which truthfully observed one different
`buy_void_auto_fulfillment_v1.ts` source file **relative to e390**.
That result is not evidence of a changed executable **relative to the
source generation actually recorded in the frozen V1 manifest**.

An independent exact-Git-object comparison shows that **all eight witness
runtime source files and seven build inputs** are byte-identical between
the correct `f627cad6...` V1 source commit and current
`884edc6e82bd505a83e51a44b38f7e318431f314`.
The original V1 frozen manifest contract source Git blob
`d0f80d3b50e3dcc46c1f58dc4bd0a73b7875db56`
also remains unchanged. Current is a strict descendant of V1's source
commit, but ancestry alone is **not** a witness acceptance receipt.

## Independent compiled runtime equivalence proof

On each Node 22/24/26 runner, the exact PR head is checked out at full
Git depth and the reviewed TypeScript dependencies compiled with no
installer/lifecycle authority. The existing exact-head, derive-only V2
candidate script (Git blob `3c25a46818eace3f989b75466013cc7c4cec1362`)
is rerun, and a new independent checker:

1. Reads the original exact frozen V1 qualification source and extracts
   the **actual V1 source commit** and frozen eight file identities.
2. Uses `git rev-parse COMMIT:path` to bind **all eight** witness source
   Git blobs between V1's actual source commit and current integration.
3. Repeats the comparison for all **seven** reviewed compiler/build inputs,
   checks their Git blob identities against the newly generated candidate,
   and checks the exact TypeScript 5.9.3 compiler file hashes.
4. Requires the newly compiled eight runtime SHA-256 values **and installed
   path strings** to match the frozen V1 manifest file list byte-for-byte,
   and requires the previously reviewed eleven relative module edges.
5. Rejects a wrong source commit, modified runtime SHA-256, altered runtime
   install path or caller-invented `runtime_bundle_identity_accepted=true`.
6. Emits only deterministic read-only compatibility evidence, compared
   across three independent Node versions and retained as a CI artifact.

The independently retrieved Node 22 V2 derivation already shows exact
matching SHA-256 values for **all eight compiled runtime files**.
The new workflow is required to prove the same claim afresh on its own
exact head. Old exact V1 manifest ID remains
`voidwfb1_2a729229f63c10a1562050924ddc279d8255a35603542967431a584977f1f6b7`,
SHA-256
`sha256:2190e7ab944436200b03e46285fa5ba4cda1b90d915cfda05b320d1b1dc7ebe2`.
The earlier unaccepted V2 candidate ID remains
`voidwfb2_b1cf93ea36879332d2745294b8aab1b261d5e7c13522af681db8d390254df73d`.

## Strict distinction: identical files do NOT grant new authority

This proof is **not a newly signed, installed, accepted or promoted witness
manifest**. The historical V1 `source_commit` is immutable. A current
integration generation cannot borrow a previous-generation operator
authorization, SSH transport receipt or installation witness even if its
reviewed executable closure is byte-identical. All of these remain false:

`production_current_source_generation_accepted=false`
`historical_v1_receipt_rebound_to_current_generation=false`
`installed_nimo_witness_verified=false`
`installed_files_read=false`
`signed_operator_acceptance=false`
`production_allocation_mutation_ready=false`
`presale_activation=false`
`funds_moved=false`.

The responsible next step is review of this compatibility evidence and
the **original** installed witness/host identity, then an explicit
current-generation source acceptance/host attestation as a distinct
operator-controlled ceremony. Do not edit V1 manifest constants or
pretend the old `voidwfb1_` identity is current. Do not enable the
real `payment_verified -> allocation_reserved` custody writer,
live presale, WC/VOID pool or money movement from this source-only proof.

This task reads repository source and hosted disposable CI builds only.
It performs no host SSH, Nimo service install, privileged IPC, signer,
wallet, buyer record, Chain-2050/WC or funds operation.

**PROTECT THE CORE.**
