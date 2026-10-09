# Buy VOID Nimo witness V2 source/compiled identity lock — **unaccepted**

## Why this exists

The original eight-file Nimo witness V1 manifest is a frozen historical
attestation, not an evergreen verifier. In current economic integration
[#2675](https://github.com/6ZoSo9/void-node/pull/2675), one
`buy_void_auto_fulfillment_v1.ts` module changed materially as part of the
plain-data input and prototype/accessor rejection hardening. Its compiled
JavaScript is accordingly different; the old V1 witness must HOLD rather than
silently accept it. The fixed V1 ID
`voidwfb1_2a729229f63c10a1562050924ddc279d8255a35603542967431a584977f1f6b7`
and immutable contract blob
`d0f80d3b50e3dcc46c1f58dc4bd0a73b7875db56`
remain unchanged.

Parent Draft [#2718](https://github.com/6ZoSo9/void-node/pull/2718)
successfully derived a new **UNACCEPTED** eight-file V2 source/compiled
candidate at exact reviewed source generation
`884edc6e82bd505a83e51a44b38f7e318431f314`.
The derivation workflow ran independently on Node 22, 24 and 26 and found
**identical generated candidate bytes**, eight runtime files, 11 static
relative edges, seven unchanged V1 source blobs and one changed blob
(`buy_void_auto_fulfillment_v1.ts`, new Git blob
`b7c963b1d55f000d82ad82289b31107b432503de`).
The source change adds plain-object/array snapshots and strict primitive
normalization, with the original public fulfillment functions preserved.
The module's existing no-signer/no-wallet/no-broadcast/no-funds flags
remain false.

## What this follow-up freezes

The new *review candidate* JSON lists exact eight source Git blob IDs,
eight installed-path targets and exact compiled SHA256/byte lengths, the seven
build-input Git blob identities and TypeScript 5.9.3 compiler library/entry
digests. It pins the complete predecessor and exact derivative:

`voidwfb2_b1cf93ea36879332d2745294b8aab1b261d5e7c13522af681db8d390254df73d`

This ID was recomputed independently from the candidate's canonical sorted
body, not inherited from V1. The unchanged JSON candidate as uploaded by
[#2718](https://github.com/6ZoSo9/void-node/actions/runs/37950601719)
is exactly 13,672 bytes with raw UTF-8 SHA256
`84be9d7a3e8ac9b5426dacd324f0d6e1b45eac5ae0fe797b2a072de57180ccf3`.

`scripts/prove_buy_void_witness_runtime_bundle_v2_locked_candidate_v1.mjs`
pins the **exact reviewed lock Git blob**, original V1 contract Git blob and
exact already-qualified generator Git blob, invokes the actual read-only
generator after a clean reproducible build, requires an exact byte-for-byte
candidate digest, verifies every source, compiled artifact, library and
build input against the lock and reproduces the V1→V2 one-module ancestry.
Eight adversarial in-memory mutations of the compiled SHA, installed path,
source hash, historical source-unchanged claim, V1 predecessor, production
acceptance, runtime edge count and build-input digest must all HOLD.

Node 22, 24 and 26 each run the identical proof and a downstream job
byte-compares their receipts. No witness handler or historical V1 contract is
edited, and no script calls a production service, reserve/recover method,
SSH/Nimo host, RPC, wallet, signer or transaction broadcaster.

## **Production qualification and presale remain HOLD**

This is a **candidate lock**, not a deployment authority or acceptance of
current installed Nimo witness bytes. The existing V1 runtime check should
continue to report genuine historic mismatch for the new code; nothing here
licenses its replacement with V2. To promote V2 an independent reviewer must
qualify installed UID/GID, executable permissions/immutable root, source
deployment and rollback independence, authenticated forced-command/witness
transport and operator provenance on the actual designated Nimo/Precision
hosts. Source-only GitHub CI cannot attest any of that.

This lock is tied to the exact current **#2675 generation**, not to separate
[#2720](https://github.com/6ZoSo9/void-node/pull/2720) allocation-ledger
changes. If that newer ledger generation is adopted, the eight-file manifest
and compiled SHA must be recomputed as an independent successor; never
relabel this lock as a match.

`runtime_bundle_identity_accepted=false`
`installed_nimo_witness_verified=false`
`external_transport_authenticated=false`
`production_allocation_mutation_ready=false`
`presale_activation=false`
`funds_movement=false`

**Keep Draft. No merge/Ready, live host/service or customer allocation
mutation, credentials, wallet/key, chain transaction, market launch or money
movement. PROTECT THE CORE.**
