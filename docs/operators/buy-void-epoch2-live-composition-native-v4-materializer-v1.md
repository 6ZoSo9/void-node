# Buy VOID Epoch-2 accepted native V4 artifact materializer v1

Marker:

`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_V4_MATERIALIZER_V1`.

Status: **source/CI artifact publication only**.

## Purpose

The accepted V4 candidate lock identifies the exact native ELF and repaired V3
runner, but the candidate workflow retains canonical `candidate.json` evidence
rather than a durable install bundle.

This lane closes only that byte-handoff gap.

It does not install under `/opt`, execute the live V3 composition, read
credentials, sign, transact, or alter presale/WC/funds state.

## Accepted identities

Accepted lock:

`voidbuye2nativecandlock4_3e6f7806914c54c55ee6658616a3a1590dc4ba29c60dc4cc764c60390d517418`.

Native ELF:
- bytes: `722880`;
- SHA-256:
  `09f2afc921d9d7a5282372151005eab4a3d5bcc520b8359588eb0038351702c4`;
- mode in published artifact: `0555`;
- static x86-64 executable;
- no `PT_INTERP`.

Runner:
- repository path:
  `ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs`;
- Git blob:
  `baab733e43c030d24f8d4abd1644f3c4ae55c3b2`;
- bytes: `40616`;
- SHA-256:
  `f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889`;
- mode in published artifact: `0444`.

## Native derivation trust root

Before executing any candidate build code, the materializer descriptor-stably
reads and verifies:

- V4 lock Git blob
  `34340b5a8d13b7496bf5cafcf9d2937cb777d45c`;
- V4 candidate-tool Git blob
  `9d0f3740d12e136e0a47d13451a83ae1c99b112a`;
- V3 native source Git blob
  `2e75b8a6fa5ecc36ce2ca05d920001a16abcf5b7`.

The lock must retain exact native/runner identity acceptance while protected
install, live execution, signing, transaction, payment/presale/WC, treasury,
and funds authority all remain false.

Only after those checks does the materializer compile the exact reviewed V4
candidate module and invoke its existing `compile_one()` path.

The ELF is rejected unless its exact accepted bytes/SHA and static/no-interpreter
shape match the V4 lock.

## Runner handoff

The runner is not regenerated or transformed. Hosted CI reads the exact Git
object already accepted by the V4 lock, requires its blob/size/SHA, and writes
one create-only mode-0444 artifact copy.

This prevents the operator handoff from relying on an unverified manual copy.

## Publication

Hosted CI publishes:

- `void_buy_void_epoch2_live_composition_native_preentry_v3`;
- `void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs`;
- `SHA256SUMS_epoch2_native_v4.txt`;
- native materializer receipt.

The workflow independently proves two byte-identical native materializations,
verifies no `PT_INTERP`, verifies the runner identity, and then uploads the
two exact installer inputs.

The materializer retains the output parent directory and newly created file
descriptors through publication. It reads back and hashes the native bytes from
the retained file descriptor, fsyncs the parent directory, and requires the
visible output name to still identify the exact created inode before success.
If materialization fails after the create-only open, it does **not** unlink the
pathname by name; preserving a partial failed output is safer than deleting a
same-UID replacement inode. A retry therefore uses a fresh/removed destination
and the create-only rule remains fail-closed.

GitHub artifact retention is convenience only. Installer V2 still independently
verifies both candidate files by bytes/hash and the runner Git blob before any
future protected publication.

## Authority boundary

Still false:

- Precision protected install;
- live native/runner execution;
- credential/private-key access;
- signing;
- transaction/RPC;
- payment acceptance;
- public presale activation;
- WC/VOID market activation;
- treasury/liquidity action;
- production-host evidence authority;
- funds movement.

No `/opt` write occurs in this lane.

PROTECT THE CORE.
