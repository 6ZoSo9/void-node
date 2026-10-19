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

`bf8bfed5b5a4b08a7ebe80139987366b8f4eb94c`.

Parent-owned blobs:

- candidate derivation tool:
  `99a1823f4b8349b6f65f210c59e1dbce4a4578f0`;
- focused candidate proof:
  `2f518fb95e4fc6ff55a4a41d60f085a5f9576b60`;
- candidate security document:
  `d3c27cbf63249695d45e47b3dc0ff98f75a961bb`;
- focused workflow:
  `e4251199373f4290b873d818b5a07447232eb663`.

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

## Descriptor-bound parent-source authentication

Current parent evidence is no longer read through the historical
`lstat -> Path.read_bytes -> lstat` pathname-reopen sequence. Every exact parent
source/proof/doc/workflow read now:

- rejects absolute/parent-traversal relative names;
- validates a direct regular single-link bounded leaf;
- acquires that visible generation first with
  `O_PATH|O_CLOEXEC|O_NOFOLLOW`;
- proves the held inode still matches the visible regular generation before any
  data-open;
- data-opens only `/proc/self/fd/<held-fd>` with
  `O_RDONLY|O_CLOEXEC|O_NONBLOCK`, so a later pathname replacement cannot
  become the object being read;
- reads exactly the authenticated size and requires immediate EOF;
- revalidates the data descriptor, O_PATH custody descriptor and visible leaf
  generation after reading;
- verifies the exact Git blob and current-head Git object identity; and
- attempts both retained descriptor closes exactly once, reporting close
  uncertainty through the machine-readable lock error contract.

The focused proof executes stable, traversal, symlink, FIFO, held-inode
replacement, growth-after-open and real-close-failure fixtures. Its replacement
fixture swaps the visible regular source to a FIFO immediately before the
`/proc/self/fd/<held-fd>` data-open and requires zero data-open attempts on the
replacement pathname. This closes the source-read race at the lock layer rather
than relying on the downstream archive-admission gate to compensate for it.

## Accepted identity

The lock accepts exactly:

- candidate ID:
  `apollyon_claim_protected_first_entry_static_candidate_v1:81613bf7887ef287f6aa7cbb4a1bbe8ed0f180981fb8fe9538f6f0ab122855d9`;
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
  `6696b52bc43c451af576814d452c827ad89644a14803cab9d24affabb82c189c`;
- raw candidate-report SHA-256:
  `4bb7a70116da4021a9975f6e8c15c666ba32f5c62d3cedf4a618b22aecf76731`;
- deterministic inner tar SHA-256:
  `89c3edf89d15f9e263d8d8dd603dd7b068a7eb64380c59852e1000e614a0607a`;
- hosted wrapper SHA-256:
  `9e9dacf414025479b04a2a4026b305a2b7e40131cfbdb30b95e2cbc70af2d0b3`;
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

## Flattened-CI historical workflow binding

The combined candidate/lock/archive PR intentionally changes the **current**
candidate workflow's path scope so the three source layers can be reviewed in
one direct PR. That CI-only edit must not rewrite the historical evidence that
accepted the #3482 artifact.

Accordingly, the lock continues to bind the original #3482 workflow blob
`e4251199373f4290b873d818b5a07447232eb663`, but authenticates that workflow
from the exact historical `PARENT_HEAD` Git tree. The candidate tool, proof,
and security document remain byte-identical in the current working tree and
retain descriptor-bound visible-file authentication.

This distinction prevents a flattened CI workflow from being falsely presented
as the workflow that produced the already-recorded historical artifact/report
digests.
