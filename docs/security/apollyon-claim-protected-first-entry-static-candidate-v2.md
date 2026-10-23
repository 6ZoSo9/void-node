# Apollyon protected first-entry static candidate V2

Marker: `VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_STATIC_CANDIDATE_V2`.

Status: **source/test/CI candidate only**. V1 acceptance evidence is immutable. This
successor does not install, activate, publish a claim, release the trainer, execute
training, access credentials, sign, transact, or move funds.

## Purpose

Historical V1 candidate generation accepted one exact static ELF, but its source
reader performed `lstat()` and then a fresh pathname `Path.read_bytes()`. A
regular source leaf could therefore be replaced by a FIFO before that second open,
or grow after the initial size check, causing blocking or unbounded allocation before
the final generation check could HOLD.

V2 changes **only the candidate producer's source-read custody**. The protected
first-entry C sources, compile flags, fixed runtime path and production semantics
remain the reviewed V1 generation.

Direct source parent:

`09760e597668d2888fe6df15ea692873b81840fc` (#3528 exact head).

## Immutable V1 binary identity

V2 must independently rebuild exactly the already accepted V1 ELF:

- bytes: `808472`
- SHA-256: `9c414a6aac9bbfc1b07175908e130993141255b132359ccae23ae49ecf5f7b6d`
- Git blob SHA-1: `0eaedceb79f39829fbde9f06e454f45b9aeb8912`
- historical V1 candidate ID:
  `apollyon_claim_protected_first_entry_static_candidate_v1:81613bf7887ef287f6aa7cbb4a1bbe8ed0f180981fb8fe9538f6f0ab122855d9`

Any binary drift is HOLD. The V2 report gets its own content-addressed candidate ID;
it does not rewrite the historical V1 candidate or lock.

## Retained-inode source reads

For every pinned build/proof source V2:

1. `lstat` requires a non-symlink regular single-link leaf with size
   `1..MAX_SOURCE_BYTES`.
2. The reader opens the leaf with `O_PATH|O_NOFOLLOW|O_CLOEXEC`.
3. It compares before / held-descriptor / visible metadata.
4. It reopens the **retained inode** through `/proc/self/fd/<opath-fd>` using
   `O_RDONLY|O_NONBLOCK|O_CLOEXEC`, never the original pathname.
5. It rechecks retained data/path descriptors and the visible path before reading.
6. Reads are chunked and capped at `MAX_SOURCE_BYTES + 1`; growth beyond the bound
   is deterministic HOLD.
7. EOF, exact admitted byte count, terminal data/path descriptor metadata and the
   terminal visible generation are all required.
8. Both owned descriptors are attempted exactly once on every exit. A close error is
   machine-readable HOLD and is never retried.

The Git blob of those exact bytes must still match the pinned blob and `HEAD:path`.

## Disposable adversaries

The focused proof requires:

- a positive retained regular-file read;
- regular-to-FIFO substitution immediately before the retained `/proc/self/fd`
  data open, with deterministic generation HOLD and no FIFO wait;
- source growth past the configured bound during the first data read, with bounded
  oversized HOLD;
- simulated EIO after the first real descriptor close, while proving the second
  descriptor is still closed exactly once;
- two full candidate derivations with byte-identical binaries;
- exact equality with the accepted V1 ELF identity.

## Authority

V2 retains:

```text
candidate_accepted=false
binary_identity_accepted=false
protected_install_authorized=false
xiphos_host_qualification_performed=false
protected_expected_source_origin_proven=false
durable_attempt_claim_authorized=false
durable_attempt_claim_performed=false
trainer_release_authorized=false
training_execution_authorized=false
training_execution_performed=false
credential_access=false
private_key_access=false
signing=false
wallet_access=false
transaction=false
funds_movement=false
```

Next gate:
`apollyon_claim_protected_first_entry_static_candidate_lock_v2`.

No V2 lock is created by this candidate generation.

**PROTECT THE CORE. PROTECT THE TRUTH.**
