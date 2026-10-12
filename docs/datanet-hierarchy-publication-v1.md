# DataNet hierarchy create-only publication and retained-byte verification v1

This gate advances #1352 by one bounded production seam only. It takes the existing `DatanetHierarchyStructureV1` output, publishes its canonical leaf manifests and top manifest under a content-bound publication directory, closes all writer descriptors, and then reopens and verifies the retained files.

## Contract

- Publication is create-only. The publication directory is `hierarchy-<manifest_sha256>` and is created with no overwrite path. Any pre-existing publication directory is `PUBLICATION_ALREADY_EXISTS`; identical-existing content is not silently accepted as a new publication.
- Each leaf manifest and the top manifest is created with exclusive file creation, mode `0600`, file `fsync`, followed by publication-directory `fsync` and root-directory `fsync`.
- The root and publication directories must be private owner-controlled directories and are held through directory file descriptors. Public-path and descriptor identities must remain equal.
- Retained verification occurs after writer descriptors are closed. Every retained file is reopened without symlink following, checked for exact identity/metadata/length, read to exact EOF, SHA-256 verified, byte-compared with the existing canonical encoder output, and checked for generation stability across the read.
- The publication directory inventory must contain exactly the expected leaf files plus `top.v1.json`; unexpected, missing, substituted, truncated, grown, corrupted, linked, symlinked, or metadata-invalid files fail closed.
- Empty objects publish only `top.v1.json` and remain valid hierarchy publications.
- The production module has no delete, cleanup, rename-over, overwrite, recovery, remote retrieval, repair, or availability-promotion path. A partial failed publication is retained for a later recovery design rather than being reused automatically.

## Regression surface

The dedicated Node 22/24/26 workflow executes the existing immutable-hierarchy proof and a publication proof covering: five-leaf success, post-close retained readback, duplicate publication rejection, pre-existing target rejection, noncanonical producer bytes, same-length corruption, truncation, unexpected inventory, symlink substitution, and the empty hierarchy.

## Non-claims

This gate proves durable local publication of hierarchy manifest bytes only. It does not prove that payload segment bytes are locally retained, remotely retrievable, independently replicated, repairable, finalized by Chain-2050, or production-available. `payload_availability_proved` is therefore always `false`. Public remote retrieval remains the next dependency after this gate is accepted.
