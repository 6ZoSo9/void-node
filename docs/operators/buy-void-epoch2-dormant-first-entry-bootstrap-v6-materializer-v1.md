# Buy VOID Epoch-2 dormant first-entry bootstrap V6 materializer V1

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_MATERIALIZER_V1`.

Status: **source/CI artifact publication only**.

## Purpose

Materialize the exact V6 static bootstrap ELF accepted by lock:

`voidbuye2dormantbootstraplock3_4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396`

and pair it with the exact immutable source-generation manifest needed by the future protected bootstrap installation.

## Published identities

Bootstrap ELF:

- file: `void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6`;
- bytes: `874608`;
- SHA-256:
  `618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c`;
- artifact mode: `0555`.

Source-generation manifest:

- file: `source-generation-v3.conf`;
- bytes: `2382`;
- SHA-256:
  `8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9`;
- artifact mode: `0444`.

The materializer verifies the accepted lock and candidate-tool Git blobs before executing the candidate derivation code. It also verifies source-generation V3's exact inner-installer V5 Git blob `ce6930bc1be8239a3171d4922c44b96a50f5778b`. It rederives the ELF and rejects any bytes/size mismatch with the accepted identity.

The accepted V6 lock also binds the descriptor-independent build contract:
- compiler logical source name is `stdin`;
- distinct sealed-source FD numbers were exercised;
- descriptor number is not candidate identity;
- the distinct-FD builds are byte-identical.

The materializer rechecks those fields and requires ELF Git-blob identity
`b577d70666f98ac59a75b84b3dab741fe7b93a4b` before publishing any artifact bytes.

## Host policy deliberately excluded

The future installed V5 bootstrap root also requires `policy-v1.conf`, but that policy binds the actual protected host generations of:

- `/usr/bin/python3`;
- `/usr/bin/git`.

Therefore the hosted artifact does **not** manufacture a host policy. A later Precision plan must derive that policy from the host's exact root-custodied tools and bind it into a separately reviewed create-only install.

## Publication

Hosted CI publishes:

- accepted V6 ELF;
- exact source-generation manifest;
- SHA256SUMS;
- materializer receipt.

Before reporting `DERIVE_GREEN`, the materializer revalidates the original absolute output path against the retained parent and output directory descriptors. It keeps each created artifact descriptor open while checking that the corresponding visible name still identifies that file, with the expected metadata, bytes, and mode. A detected parent relocation, directory replacement, or leaf substitution fails the command before a success receipt. A HOLD does not recursively remove the output directory, so a replacement tree is left for inspection.

These checks describe consistency at the publication observation points. They do not prevent another process with access to the caller-owned output from changing it after the final check. The returned output path is the verified absolute path; the receiving installer still needs a fresh byte and identity check.

The artifact is a handoff convenience only. A future host installer must independently verify every byte, the source-generation V3 identity, and the accepted V6 lock before publication.

## Authority

Still false:

- protected install;
- bootstrap execution;
- inner installer execution/apply;
- credential/private-key access;
- signing;
- transaction/RPC;
- payment acceptance;
- public presale/WC activation;
- treasury/liquidity action;
- production-host evidence authority;
- funds movement.

No `/opt` write occurs in this lane.

PROTECT THE CORE.

## Git cruft-pack compatibility

The accepted V6 generation treats `pack-<oid>.mtimes` as non-authoritative cruft-pack metadata under the same regular-file/single-link shape checks as other pack auxiliaries. It is not copied into the private object view and does not grant object authority.
