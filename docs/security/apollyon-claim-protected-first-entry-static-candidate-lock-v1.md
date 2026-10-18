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

## Historical candidate reproduction

The #3482 candidate report is intentionally head-addressed. Running the parent
derivation unchanged on a child branch would therefore create a different
candidate ID merely because the repository HEAD changed.

This lock avoids that ambiguity deliberately.

Before reproducing the historical candidate, the lock:

1. proves the accepted #3482 head is an ancestor of the lock head;
2. proves the accepted #3467 base is an ancestor of #3482;
3. re-reads every #3482-owned file and requires the exact accepted Git blob;
4. executes the exact verified parent candidate tool bytes; and
5. reproduces the parent report with its historical repository generation
   fixed to #3482 only for that verified derivation.

The parent validator then re-runs its full source/toolchain/static-ELF and
independent rebuild checks. This is not a generic caller override and does not
permit a different candidate generation to inherit the accepted identity.

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

The hosted artifact ID and wrapper digest from #3482 are review transport
evidence, not the durable trust root. The lock is instead bound to the stable
candidate/report/source/binary identities above.

## Acceptance transition

The source-only lock may assert:

- `candidate_accepted=true`;
- `binary_identity_accepted=true`;
- `static_first_instruction_candidate_evidence_accepted=true`.

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

Hosted proof re-addresses forged records and requires rejection for:

- extra top-level fields;
- parent-head drift;
- parent candidate-ID drift;
- binary SHA drift;
- extra nested binary fields;
- protected-install authority overclaim;
- rollback of candidate acceptance; and
- next-gate drift.

A later install gate must independently revalidate the lock and exact binary
identity before any protected filesystem mutation.

## Next gate

`apollyon_claim_protected_first_entry_static_candidate_install_v1`.

That successor remains separately reviewed and separately authorized.

**PROTECT THE CORE.**
