# Enforcement preservation across build generations

The V1 enforcement attestation accepted by #1477 binds source generation
`13bef3b85ad6cf4a1ea3d65425c92fec0f17fd9d`. Its verifier deliberately rejects any
later change to the complete `src` tree. #1387 exposed the integration consequence:
a Home-only source repair preserves all 23 enforcement modules and 30 explicit
inputs but cannot satisfy the historical full-source identity.

V2 records a distinct current build generation. It does not replace the V1 lock or
reinterpret the old source SHA. The V1 JSON and both V1 verifiers remain byte-bound
to reviewed commit `029af8d02d0d3ff1f9481830c06aa340e9f67be0`; their original guard
and historical proof still run on that exact checkout.

## Build contract

1. The workflow supplies its exact checkout SHA to `snapshot`. There is no default
   to a branch name or ambient HEAD. Native Git uses an absolute executable and a
   fixed environment; its physical repository root must match the selected root.
2. Before compilation or image construction, the snapshot binds the selected
   commit/tree, complete tracked source tree, every source file's mode/blob/bytes,
   build inputs and verifier inputs. Filesystem bytes must match commit blobs even
   when Git's status flags hide a rewrite. Ignored/untracked source inputs,
   symlinks, changed modes, dirty checkouts and `.dockerignore` are rejected.
3. The 23 closure sources and seven explicit build inputs remain locked to V1.
   Compiler bytes remain locked too. New expected-head input cannot authorize
   changed enforcement sources, compiler bytes, lockfiles or build recipes.
4. After the build, `derive` repeats the snapshot and derives the actual compiled
   relative-import closure with the unchanged V1 parser. All 23 artifact records,
   bytes, hashes and import edges must equal the reviewed lock. Source checks are
   repeated after verification; an observable generation change fails closed.
5. The record names both historical source identity and current build identity.
   `historical_full_source_generation_preserved` is false for a changed source
   tree even when enforcement artifacts remain identical. The complete record
   digest is distinct for each build source generation.
6. Node 22, 24 and 26 independently derive byte-identical records. The package job
   compares all three records with its own derivation over extracted image bytes.
   The unchanged V1 image verifier binds those enforcement bytes to a never-started
   container, image/config/layer hashes and the same current checkout SHA. Its
   `enforcement_source_head` remains the historical provenance of the locked code;
   the accompanying V2 record provides current whole-source/build provenance.

The package build occurs before host dependencies or evidence are written into
the Docker context. The normal Dockerfile and all image-start/deployment gates are
unchanged. The historical six-module observer verifier also remains required.

## Limits and next gate

The CI host, OS, native Git, Node and installed lockfile-bound dependency environment
remain trusted. Snapshots detect observable drift and bind admitted bytes; they
are not process isolation or proof against a concurrent privileged/same-UID writer
substituting and restoring compiler inputs during execution. External npm code is
not recursively attested. No designated-host, registry, deployed-process or source
finality acceptance follows from a hosted build record.

V2 continues to require `independently_accepted=false`,
`deployed_artifact_generation_verified=false` and
`production_source_finality_authority_ready=false`. Changing the enforcement
closure or any locked build input requires a separately reviewed lock generation;
passing a new checkout SHA cannot grant that authority. V1 evidence remains valid
only for its historical source/build/package tuple. Independent review of this
contract change is required before repository lifecycle promotion.
