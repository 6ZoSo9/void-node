# Buy VOID Epoch-2 accepted native V6 artifact materializer v1

Marker:

`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_V6_MATERIALIZER_V1`.

Status: **source/CI artifact publication only**.

## Purpose

The accepted V6 candidate lock identifies the exact native ELF and repaired V3
runner, but the candidate workflow retains canonical `candidate.json` evidence
rather than a durable install bundle.

This lane closes only that byte-handoff gap.

It does not install under `/opt`, execute the live V3 composition, read
credentials, sign, transact, or alter presale/WC/funds state.

## Accepted identities

Accepted lock:

`voidbuye2nativecandlock6_016c2764d5d33c9078fd5120addd2ff7ef25c8d6bf30d5d6741b05a5036a1f22`.

Native ELF:
- bytes: `726976`;
- SHA-256:
  `85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8`;
- mode in published artifact: `0555`;
- static x86-64 executable;
- no `PT_INTERP`.

Runner:
- repository path:
  `ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs`;
- Git blob:
  `499df9b94b5b89354837570da0c7e47ec280025d`;
- bytes: `45147`;
- SHA-256:
  `7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94`;
- mode in published artifact: `0444`.

## Native derivation trust root

Before executing any candidate build code, the materializer descriptor-stably
reads and verifies:

- V6 lock Git blob
  `6b38ab9ffc8a272340f7d2c9af706a5dbd1cf663`;
- V6 candidate-tool Git blob
  `8abbe3956d6b2a6f5599e3efa18010f622569e61`;
- V3 native source Git blob
  `5021727f1def1ec11f870d735cab65acc1701a5e`.

The lock must retain exact native/runner identity acceptance while protected
install, live execution, signing, transaction, payment/presale/WC, treasury,
and funds authority all remain false.

Only after those checks does the materializer compile the exact final-integration V6
candidate module and invoke its existing `compile_one()` path.

The ELF is rejected unless its exact accepted bytes/SHA and static/no-interpreter
shape match the V6 lock.

## Runner handoff

The runner is not regenerated or transformed. Hosted CI reads the exact Git
object already accepted by the V6 lock, requires its blob/size/SHA, and writes
one create-only mode-0444 artifact copy.

This prevents the operator handoff from relying on an unverified manual copy.

## Publication

Hosted CI publishes:

- `void_buy_void_epoch2_live_composition_native_preentry_v3`;
- `void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs`;
- `SHA256SUMS_epoch2_native_v6.txt`;
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

GitHub artifact retention is convenience only. The future protected upgrade still independently
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
