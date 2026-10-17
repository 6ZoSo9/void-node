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

`a149fe2fbac4cb8bb11ed049dfb12a1d0110bfae`.

Exact predecessor proof blob:

`598c195252a17b7e4839763387c1970ea13c3b45`.

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
fields. Re-addressed source/toolchain/binary/authority/next-gate drift is
rejected.

## Hosted artifact

The focused workflow publishes only the derived candidate report and static ELF
as a short-retention review artifact after all proofs pass.

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
