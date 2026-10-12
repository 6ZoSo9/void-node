# Buy VOID source-finality compiled artifact attestation v2

## Purpose

This successor generation records a reviewed build-input rollover caused by the
production PostgreSQL client dependency required by the Buy VOID dispatcher
connection factory.

V1 remains immutable and is the predecessor evidence. V2 does not reinterpret
or replace the reviewed source-finality source generation. It proves that the
reviewed six-file source closure is unchanged and that rebuilding with the new
locked repository package inputs emits the exact same six JavaScript artifacts.

## Predecessor

```text
marker=VOID_BUY_VOID_SOURCE_FINALITY_COMPILED_ARTIFACT_ATTESTATION_V1
manifest_git_blob_sha1=24ea833fbfacab1f38311e4e6d5f401625291882
compiled_artifact_set_sha256=98aaf70a7aa4e45a38e38ab5679a163f58be4211cb4fa81284e1596666ff00d3
source_stack_head=9202f3ce11664873f2316b08cbdbe2b98fd77fb4
```

The V1 manifest bytes are re-read and Git-blob verified by the V2 proof.

## Reviewed rollover

The only top-level package.json delta from the reviewed source-stack head is:

```text
dependencies.pg=8.23.0
devDependencies.@types/pg=8.23.1
```

Removing those two keys from the current package.json must reproduce the
predecessor package.json canonically. The exact current package inputs are also
pinned as Git blobs:

```text
package.json=f28c3e9446c7623ef203da36a9642d046e5f34ee
package-lock.json=b2671f0149f522b2489247016df0a5ec4bb72b8b
tsconfig.build.json=d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb
typescript=5.9.3
```

The six reviewed source-finality TypeScript files, tsconfig.build.json, and the
two runtime-copy/build helper scripts must remain unchanged from the reviewed V4
source-stack head.

## Artifact equality

V2 rebuilds the same closed six-file runtime import graph on Node 22, 24, and
26. Each emitted path, byte count, and SHA-256 must equal the predecessor V1
manifest. Any byte change is a hard failure.

The V2 generation identity is:

```text
compiled_artifact_generation_sha256=420fdb1d2af44940db47bbba9873461337a6010002dc90b711e2753d808c2f9b
artifact_bytes_match_predecessor=true
```

The normal production Docker image proof remains independently useful: it
extracts the six artifacts from a stopped container and verifies them against
the immutable V1 artifact bytes. Because V2 requires exact artifact equality to
V1, that package proof also establishes equality to the V2 artifact bytes
without changing the accepted V1 package record.

## Authority boundary

```text
compiled_artifact_generation_verified=true
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
wallet_access=false
signing=false
transaction_broadcast=false
money_movement=false
```

This gate is provenance only. It does not deploy, start a container, mount a
runtime route, read credentials, access a wallet, sign, broadcast, or move
funds.
