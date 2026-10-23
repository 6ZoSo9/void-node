# Apollyon protected first-entry static candidate lock V2

**Status: Draft, source/test/CI-only acceptance lock. No protected install or training authority.**

## Purpose

Accept exactly the retained-inode V2 first-entry static candidate produced by Draft #3787 without changing the accepted executable bytes or granting any live Xiphos authority.

V2 repairs the checkout source-read race in the candidate producer while preserving the immutable accepted V1 ELF. This lock exists so repaired producer evidence can be accepted separately from protected install, host qualification, durable claim, trainer release, or training execution.

## Exact parent generation

Parent Draft head: a61887a7fc7a4a8b0ee70d8a2046e4486ab49091

Exact parent blobs:

- producer: 74b45b9f23ce3307b59a98fa9703d5c0a2494bad
- proof: 0a44002a8af860a90658d8327336dea88e13d5e1
- document: 73675c7ce2d0d19f3866eddedb4a649b807bf63b
- hosted-receipt workflow: 4678e2cea95a42f17580f2731c5e2f44ca875eb2

The parent generation retains the four ADD-only V2 source/proof/doc/workflow boundary and leaves all live authority false.

## Hosted candidate receipt

GitHub Actions focused run 40037262100, job 120699688688 emitted and uploaded the deterministic candidate.

Bound evidence:

- candidate ID:
  apollyon_claim_protected_first_entry_static_candidate_v2:7a29e9a3b79c570787fb853820b81c7bb0c61e20b499acf1f5d5df65d29679b0
- candidate JSON SHA-256:
  4c0d17854a99909abf0ea44dc466616deaa4016d7854ca652adc1ae80bf03946
- artifact ID: 12537652102
- artifact ZIP SHA-256:
  33995229508dc92d8c6b6ea2f09a81d82a668e9394db77d6fc711eaba26a1af3
- receipt-log SHA-256:
  19bedd3ceb443397775d51cc544685404a89192d9cd3434a26556fdc65cd6687

The artifact was independently downloaded from GitHub Actions and rehashed before this lock was authored.

Artifact expiry does not revoke the content-addressed evidence. The lock binds the observed run/job/artifact identities and digests; later protected stages must still independently supply and authenticate candidate bytes before use.

## Immutable executable identity

The V2 producer independently rebuilds the same immutable accepted V1 ELF:

- bytes: 808472
- SHA-256:
  9c414a6aac9bbfc1b07175908e130993141255b132359ccae23ae49ecf5f7b6d
- Git blob SHA-1:
  0eaedceb79f39829fbde9f06e454f45b9aeb8912
- expected install mode: 0555
- x86-64 static ET_EXEC
- no PT_INTERP
- no dynamic NEEDED
- production fixed-self path embedded

Candidate acceptance therefore accepts repaired source-admission evidence for the same executable bytes; it does not bless a new executable.

## Acceptance transition

This lock may assert only:

- candidate_accepted=true
- binary_identity_accepted=true
- hosted_candidate_receipt_bound=true
- hosted_artifact_digest_bound=true
- historical_v1_binary_identity_preserved=true

It keeps false:

- protected_install_authorized
- xiphos_host_qualification_performed
- protected_expected_source_origin_proven
- durable attempt claim authorization/performance
- trainer release
- training authorization/execution
- credential/private-key/signing/wallet access
- transaction/funds movement

No host action follows from merging or reviewing this lock.

## Fail-closed lock validation

The lock is content-addressed and schema-closed.

Validation reconstructs fresh expected parent evidence, binary identity, and authority mappings. Parent V2 source files are read through bounded no-follow, nonblocking regular-file descriptors and must also match exact Git blobs at HEAD.

The proof re-addresses forged lock records and requires rejection of:

- extra top-level fields
- candidate-ID drift
- candidate-JSON digest drift
- artifact archive digest drift
- hosted run identity drift
- binary SHA drift
- extra binary fields
- protected-install overclaim
- training overclaim
- funds overclaim
- candidate-acceptance rollback
- numeric values substituted for Boolean authority
- Boolean values substituted for the integer schema version
- next-gate drift

## Next gate

apollyon_claim_protected_first_entry_static_candidate_install_v2

That future gate remains separately reviewed and separately authorized. It must independently authenticate the exact accepted candidate bytes, protected source origin, target host state, and all required stop/rollback boundaries before any filesystem mutation.

**PROTECT THE CORE.**
