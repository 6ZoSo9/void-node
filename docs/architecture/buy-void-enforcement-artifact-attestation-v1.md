# Buy VOID enforcement artifact attestation v1

This repairs the artifact-coverage and status-truth findings on #1477. It preserves
the historical #1475 six-file V4 observer manifest and #1476 verifier unchanged.
Those older records do not attest the new enforcement entrypoint.

## Source and compiled generation

The enforcement generation is bound to source commit
`13bef3b85ad6cf4a1ea3d65425c92fec0f17fd9d`. The subsequent manifest/proof commits
must preserve that complete tracked `src` tree and all bound build inputs. This
avoids a self-referential manifest containing its own commit SHA. The workflow
separately binds the final exact checkout head; each image receipt records both
identities.

The entrypoint is `dist/economic/buy_void_delivery_runtime_integration_v1.js`.
The locked JSON manifest includes all 23 modules reachable through relative
runtime imports, including the new preflight. It binds every module's byte length,
SHA-256, import edges, source mapping, source blob, compiler bytes, lockfile,
TypeScript configurations, build scripts and Dockerfile. Absence of `.dockerignore`
is also checked. Nonliteral imports, unknown external imports, alternate loaders,
escaping imports, missing modules and symlink paths fail closed. Extra or omitted
manifest entries and unreachable claimed modules cannot match the derived graph.
Unrelated files elsewhere in the production `dist` directory are not part of this
entrypoint's relative-import closure.

External imports are explicitly limited to the observed Node builtins, `express`
and `ethers`; the npm dependencies are lockfile-bound. This is not a recursive
attestation of every byte in `node_modules`, nor a proof of a deployed process.

Fresh builds on Node 22/24/26 must each derive a byte-identical manifest and match
the same committed JSON. A mismatch fails the workflow before package acceptance.
No candidate derivation alone grants acceptance or production authority.

## Packaging and image identity

The package job depends on all three locked derivations. It builds the normal
Dockerfile from a clean exact checkout, records the immutable image ID, and
creates a container by that ID. It never starts or executes the container. The
container's inspect state must be unchanged across extraction and image saving.
The package verifier applies the same enforcement manifest to extracted bytes and
also runs the unchanged historical #1476 package verifier.

The image verifier checks that the container names that exact image, has never
started, and has no filesystem mounts. It hashes the saved image configuration
and requires equality to the image ID. It verifies the source-revision label,
working directory, command, ordered rootfs layer diff IDs and the final enforcement
file bytes reconstructed from the saved layers. Missing/substituted files, path
aliases, duplicate archive entries and unexpected artifact ancestor types fail.
The receipt binds the final checkout head, source generation, enforcement digest,
container ID, image config digest, archive-manifest digest, archive digest and
ordered layer digests.

`docker_save_manifest_sha256` means exactly the Docker save manifest bytes. It is
not an OCI registry/distribution manifest digest; no registry pull, push, runtime
mount, designated-host acceptance or deployment is claimed. The image identity
proof closes the previously unbound local image/config/layer link without
inventing a registry identity for an image that was never published.

## Status truth and falsification

The attempt-free status route reports `capability_configured` separately from
`effective_authority`. It reports authorization as `not_evaluated`, with scope
`per_attempt_command`; signing, broadcast, money movement and production source
finality authority remain false. Only the attempt-specific command preflight can
assess permission to use an injected dependency. A synthetic enabled + policy +
dependencies regression confirms the status route invokes no such capability.

Artifact falsifiers cover deleted/substituted preflight, substitution with compiled
#1476 delivery source, redirected imports, omitted manifest preflight, wrapper
bypass, dynamic import, symlink module, wrong source generation and extra unreachable
manifest records. Image falsifiers cover mismatched image/config/layer identities,
modified artifact identities, missing packaged files, duplicate members, running
containers and mounts.

Independent review of the repaired exact head is still required. A green hosted
package receipt proves these source/build/package checks only. All production
source-finality, deployment, signer, transaction, inventory and funds authority
remains false; no Ready/merge transition is performed by this repair workflow.
