# Apollyon protected first-entry static candidate lock V1

Marker: `VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_STATIC_CANDIDATE_LOCK_V1`.

Status: **source/test/CI candidate-acceptance lock only**.

## Purpose

Accepted #3482 derives and validates one production-configured static ELF candidate
but deliberately leaves `candidate_accepted=false` and
`binary_identity_accepted=false`.

This gate performs the next narrow transition: it accepts the exact reviewed
candidate and binary identity as the only candidate eligible for a later
protected install gate.

It does **not** install the binary, qualify Xiphos, prove protected installed
source origin, publish a durable claim, release a trainer, execute training, or
grant key/signing/transaction/funds authority.

## Exact parent generation

Parent #3482 exact head:

`2aec1d7a30e9c6b20b7d1cf0831f34c240674727`.

Parent-owned blobs:

- candidate derivation tool:
  `2ff81973b10c176523b0bf172a14fe1495a83986`;
- focused candidate proof:
  `4d31e52fe32a7ca9567bf7c2f0f8e6228caf9bea`;
- candidate security document:
  `fc7cf98be5b907729f95021d16139e455413d787`;
- focused workflow:
  `a38a8c2d70d77be554af32f225e4d9d8491aea7e`.

The accepted protected-first-entry source parent remains:

`a149fe2fbac4cb8bb11ed049dfb12a1d0110bfae`.

## Historical evidence lock, not mutable re-compilation

The #3482 candidate was already derived, independently rebuilt, ELF-inspected,
content-addressed, archived with mode preservation, and accepted as source
evidence on its exact historical generation. Recompiling that historical
candidate again on an unpinned hosted image would make this acceptance gate
depend on mutable GCC, binutils, libc/crt and static-link inputs.

This lock therefore **does not recompile** the candidate.

Instead it:

1. proves the accepted #3482 head is an ancestor of the lock head;
2. proves the accepted #3467 base is an ancestor of #3482;
3. re-reads every #3482-owned source/proof/doc/workflow file and requires its
   exact accepted Git blob;
4. binds the exact accepted candidate ID and both raw/canonical report digests;
5. binds the exact mode-preserving inner archive and hosted-wrapper digests;
6. binds the exact accepted binary byte count, SHA-256 and Git-blob identity;
7. records the accepted historical compiler/readelf/runner-image evidence; and
8. performs no compiler, linker or readelf execution during lock derivation.

The proof guards the lock's subprocess boundary and permits only local
read-only Git commands needed for ancestry and parent-blob authentication.
Consequently a future hosted-runner toolchain update cannot silently change the
accepted binary or make the acceptance lock non-executable.

## Accepted identity

The lock accepts exactly:

- candidate ID:
  `apollyon_claim_protected_first_entry_static_candidate_v1:2a1fde88ced23606a3e0b6b10bb1205217915b36a0332ee89b5ec81181b32e23`;
- ELF bytes: `808472`;
- ELF SHA-256:
  `9c414a6aac9bbfc1b07175908e130993141255b132359ccae23ae49ecf5f7b6d`;
- ELF Git blob SHA-1:
  `0eaedceb79f39829fbde9f06e454f45b9aeb8912`;
- expected protected-install file mode: `0555`;
- static x86-64 EXEC;
- no `PT_INTERP`;
- no dynamic `NEEDED`;
- production fixed-self path embedded.

The lock also binds the accepted #3482 evidence envelope:

- canonical candidate-report SHA-256:
  `8e96b53161b0b5447e5b02499537803ffd680b5f01d6520ec1653fee52c75649`;
- raw candidate-report SHA-256:
  `dffdd2ce32fcf9dee765f8a6d17b455e100022012c7cd17d9cec1f5d436b484a`;
- deterministic inner tar SHA-256:
  `ca21d9f28b66c408f857ee00480a63585080025a6a76a84efca472e188390944`;
- hosted wrapper SHA-256:
  `ae1a062c6bd6a74d446a4cc7bf25242e11f2638f2c17c30dc1b2ae08017fc417`;
- accepted runner image: `ubuntu24/20261012.334`;
- accepted GCC SHA-256:
  `1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26`;
- accepted readelf SHA-256:
  `64c58e15274bbbb5153f31078e455e9e77ee5f51489e709bba5bb788ce9df2b0`.

These values are historical identity evidence, not a request to reproduce that
hosted image. Artifact availability is not required to derive or validate the
lock; the later install gate must supply candidate bytes and require them to
match the locked binary identity before any protected filesystem mutation.

## Acceptance transition

The source-only lock may assert:

- `candidate_accepted=true`;
- `binary_identity_accepted=true`;
- `static_first_instruction_candidate_evidence_accepted=true`;
- `accepted_parent_evidence_identity_bound=true`;
- `accepted_parent_toolchain_identity_bound=true`.

It explicitly records:

- `historical_parent_candidate_rederived=false`;
- `mutable_runner_toolchain_used=false`.

These statements mean only that the exact reviewed binary is the accepted input
to the next protected-install gate.

The lock keeps false:

- `protected_install_authorized`;
- `xiphos_host_qualification_performed`;
- `protected_expected_source_origin_proven`;
- durable attempt claim authority/performance;
- trainer release;
- training/model/weight execution;
- credential/private-key/signing/wallet access;
- transaction/funds authority.

## Fail-closed validation

The lock record is content-addressed and schema-closed.

Authority data is also non-aliased. Each derivation receives a fresh authority
mapping, and validation compares against a separately reconstructed expected
mapping. Mutating a returned lock therefore cannot mutate the validator's
authority oracle. Every authority value must also have exact Boolean type;
numeric JSON values such as `1` and `0` are rejected even though Python
normally compares them equal to `True` and `False`.

Hosted proof re-addresses forged records and requires rejection for:

- extra top-level fields;
- parent-head drift;
- parent candidate-ID drift;
- accepted report-digest drift;
- accepted artifact-digest drift;
- accepted historical toolchain-identity drift;
- binary SHA drift;
- extra nested binary fields;
- derived-authority alias mutation and protected-install authority overclaim;
- false historical-rederivation or mutable-toolchain claims;
- rollback of candidate acceptance; and
- next-gate drift.

A later install gate must independently revalidate the lock and exact binary
identity before any protected filesystem mutation.

## Next gate

`apollyon_claim_protected_first_entry_static_candidate_install_v1`.

That successor remains separately reviewed and separately authorized.

**PROTECT THE CORE.**
