# Buy VOID source-finality compiled artifact attestation V3

## Purpose

V3 is the compiled-artifact successor required by the V5 reviewed-source
rollover. Compiled artifact attestation V2 remains immutable predecessor
evidence: V2 explicitly required the source-finality source closure and emitted
artifacts to remain unchanged from its predecessor, so it cannot truthfully
authorize the new verified-payment verifier bytes.

## Predecessor

V3 re-reads and Git-blob verifies
`docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v2.json`
and binds predecessor generation
`420fdb1d2af44940db47bbba9873461337a6010002dc90b711e2753d808c2f9b`.

The four unchanged common runtime artifacts must remain byte-identical to the
V2 predecessor:

- authenticated composition V3;
- source-finality authority V2;
- source-chain finality RPC adapter V1;
- payment RPC observer V1.

## Reviewed change

The successor records a real source/artifact change rather than describing it as
an unchanged build-input rollover.

The canonical verified-payment source is bound to Git blob
`c0e4660bb238e1b718b8a471890901bd5a59badf`.

The compiled verifier is bound independently by exact byte length and SHA-256.
The V5 provenance artifact is also a new artifact because the source-generation
module itself is the V5 successor.

The derivation requires the exact reviewed source/build stack, locked TypeScript
version and package/build-input blobs. It derives the closed six-artifact import
graph on Node 22, 24 and 26 and requires all three derivations to produce one
byte-identical committed V3 manifest.

## Manifest acceptance

`--derive` emits candidate JSON only. Candidate output grants no authority.

Acceptance requires the derived bytes to equal the committed
`buy-void-source-finality-compiled-artifact-attestation-v3.json` byte-for-byte
on every reviewed Node major. The workflow must trigger when the V3 proof,
manifest, documentation, reviewed source closure, or bound build inputs change.

## Remaining gates

V3 proves a reviewed compiled generation, not a deployed process. The matching
enforcement closure and packaged/final-image identity must roll to successors
before production artifact authority can consume these new bytes.

## Authority boundary

`compiled_artifact_generation_verified=true` is a source/build statement only.
`deployed_artifact_generation_verified=false`,
`runtime_mount_authority=false`, and
`production_source_finality_authority_ready=false` remain required.

No deployment, live RPC, wallet/private-key/signer access, transaction
construction/signing/broadcast, Chain-2050 or inventory mutation, presale/market
activation, treasury/liquidity action, or funds movement is performed.
