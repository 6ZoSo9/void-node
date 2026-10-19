# Apollyon protected first-entry static candidate V1

Marker:
`VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_STATIC_CANDIDATE_V1`.

Status: **source/test/CI candidate derivation only**.

## Purpose

Accepted #3467 closes the caller-supplied expected-source interface but
deliberately leaves:

`static_first_instruction_proven=false`.

Its hosted fixture showed that the protected first-entry source can be linked
statically, but the fixture used disposable path/UID/GID overrides and did not
accept a production binary.

This gate derives the production-configured static candidate needed before any
acceptance lock, protected install, or Xiphos qualification.

Exact accepted parent:

`e357073c5d7932f924c077a73349e9050dfb78eb`.

Exact predecessor proof blob:

`8348bba0a6a8b6c30ffdcc3a12658f20e99b8592`.

## Production compile contract

No test macros are supplied.

The compiled defaults therefore remain:

- fixed executable path:
  `/opt/void-apollyon-claim-protected-first-entry-v1/bin/apollyon_claim_protected_first_entry_v1`;
- required UID: `0`;
- required GID: `0`.

The exact accepted #3467 source/header chain and predecessor proof are
Git-blob pinned before compilation and re-read after compilation.

Compilation uses:

- C11;
- `-O2 -Wall -Wextra -Werror`;
- `-fno-ident -fno-pie`;
- `-pthread`;
- static link;
- non-PIE link;
- no ELF build ID.

## Reproducibility and ELF evidence

Each derivation compiles the production-default source chain three times in
separate private output directories and requires byte-identical ELF output.

The proof performs two complete derivations and requires the reports and
binaries to be byte-identical again.

Each build must have:

- ELF executable type;
- x86-64 machine;
- no `PT_INTERP`;
- no dynamic `NEEDED` entry;
- the exact production fixed-self string embedded.

The report binds the root-owned compiler and `readelf` generations plus GCC
version and target information and revalidates those tools after building.

This provides **candidate evidence** that the kernel enters one exact static
binary without a separately selected dynamic loader. It is not an acceptance
lock and does not yet establish protected installed origin on Xiphos.

## Content-addressed candidate

The candidate report binds:

- exact accepted parent;
- predecessor proof generation;
- exact candidate derivation tool generation;
- all accepted source/header/document generations;
- production compile contract;
- compiler/readelf generation;
- exact static ELF bytes and digests;
- authority boundary.

The candidate ID prefix is:

`apollyon_claim_protected_first_entry_static_candidate_v1:`.

Validation re-derives the source, repository, candidate-tool and toolchain
fields. It does not trust the report's ELF booleans: the supplied binary bytes
are written to a private validation path and re-inspected with `readelf` for
ELF x86-64 EXEC, no `PT_INTERP` and no dynamic `NEEDED`. The production
fixed-self string is checked in the supplied bytes.

Validation then performs an independent production-default rebuild from the
current exact pinned source/toolchain generation and requires byte-for-byte
identity with the supplied binary. A report whose candidate ID and binary
hashes have been recomputed around arbitrary non-ELF bytes or a mutated ELF
therefore still fails closed.

The nested `binary` object is also schema-closed: its key set must exactly
match the reviewed binary identity/evidence fields. Adding contradictory or
future-looking members such as `candidate_accepted` and recomputing the outer
candidate ID is rejected before those values can become ambiguous to a later
consumer.

Re-addressed source/toolchain/binary/authority/next-gate drift and binary
extra-key drift are rejected.

## Hosted artifact

The focused workflow materializes the derived candidate report and static ELF
only after all proofs pass. The proof explicitly re-addresses a non-ELF payload
and a one-byte-mutated ELF with internally consistent report hashes; validation
must reject the former during byte inspection and the latter because the
independent rebuild differs.

The review handoff is a deterministic POSIX tar archive containing:

- `candidate-v1.json`;
- `apollyon-claim-protected-first-entry-static-v1`;
- `SHA256SUMS.txt`;
- `source-head.txt`.

The tar member for the ELF is required to retain mode `0555`. The workflow
extracts its own archive into a fresh directory, requires the restored ELF mode
to be exactly `0555`, and re-runs the relative SHA-256 manifest before upload.
Only that tar file is sent through `actions/upload-artifact`. The outer hosted
artifact transport may normalize the tar file's own mode, but it cannot erase
the authenticated ELF mode stored inside the tar member.

A later handoff must extract the tar before using the candidate and must recheck
the manifest, source head, and ELF mode. It must not execute a directly restored
loose file from the hosted artifact wrapper.

That artifact is evidence for a later, separately reviewed candidate acceptance
lock. Artifact publication is **not** candidate acceptance and grants no host
installation authority.

## Deliberate HOLDs

This gate leaves all of the following false:

- candidate accepted;
- binary identity accepted;
- protected install authorized;
- Xiphos host qualification performed;
- protected installed expected-source origin proven;
- durable attempt claim authorized or published;
- trainer release authorized;
- training execution authorized/performed;
- credential/private-key/signing/wallet access;
- transaction/funds movement.

Next gate:

`apollyon_claim_protected_first_entry_static_candidate_lock_v1`.

**PROTECT THE CORE.**
