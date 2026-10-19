# Buy VOID Epoch-2 accepted native V3 artifact materializer v1

Marker:

`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_V3_MATERIALIZER_V1`.

Status: **source/CI artifact publication only**.

## Purpose

Merged #3218 accepts the exact Epoch-2 native V3 identity and merged #3219
provides the canonical protected installer. The accepted V3 derivation artifacts,
however, retained only `candidate.json`; they did not retain the 726,976-byte
ELF required as an input to a later separately authorized protected install.

This lane closes only that byte-handoff gap.

It does **not** replace, modify, or repin the canonical #3219 installer.

## Accepted identity

Accepted lock:

`voidbuye2nativecandlock3_024c9e3818a40616fc8b198f605721bf76ed43d6d4f186bf02a202d46860a659`.

Materialized ELF:

- bytes: 726,976;
- SHA-256:
  `78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589`;
- static x86-64 executable;
- no `PT_INTERP`;
- output mode 0555.

## Trust root

Before executing any candidate code, the materializer descriptor-stably reads
and verifies:

- accepted V3 lock Git blob
  `57f965a944031eac90d69b4104b0f8f2473e66cc`;
- accepted V3 candidate-tool Git blob
  `3b779a27cfd071c2569c438e3319b756b46c85c9`;
- native source Git blob
  `4aa091e7835b32aa5c4e7b8e4059651c69a64eb3`.

The lock must retain candidate/native identity acceptance while install/live,
presale/WC and funds authority remain false.

Only after those checks does the materializer compile and execute the exact
reviewed V3 candidate module in-process and call its existing `compile_one()`
derivation path.

The output is rejected unless it exactly matches the accepted byte length and
SHA-256 and the candidate reports the reviewed static/no-interpreter shape and
link-trace evidence.

## Publication

`--derive <absolute-output>` writes one create-only local artifact.

The output:

- must begin absent;
- is opened with `O_EXCL|O_NOFOLLOW`;
- receives mode 0555;
- is fsynced;
- is reread and rehashed before success.

An existing destination is never overwritten.

This is **artifact publication**, not protected installation.

## Hosted evidence

The focused workflow:

1. binds the exact materializer/proof/lock/candidate/source generation;
2. runs materializer self-test;
3. independently proves two byte-identical materializations;
4. derives one final workflow artifact;
5. verifies exact bytes/SHA and no `PT_INTERP`;
6. uploads:
   - the exact ELF;
   - `SHA256SUMS_epoch2_native_v3.txt`;
   - the materialization receipt.

The workflow supports `workflow_dispatch` after merge so the accepted ELF can
be regenerated from canonical repository source when an operator needs the
input for a separately authorized #3219 install.

GitHub artifact retention is convenience only. The installer still independently
verifies the downloaded ELF by size/SHA/generation before any protected
publication.

## Authority boundary

Still false:

- Precision protected installation;
- live native/runner execution;
- credential/private-key access;
- signing;
- transaction;
- payment acceptance;
- public presale activation;
- WC/VOID market activation;
- service/systemd mutation;
- production-host evidence authority;
- funds movement.

No `/opt` write occurs in this lane.

PROTECT THE CORE.
