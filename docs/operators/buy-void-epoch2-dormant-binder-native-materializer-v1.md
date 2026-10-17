# Buy VOID Epoch-2 dormant-binder native materializer V1

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_MATERIALIZER_V1`.

Status: **source/CI artifact materialization only**.

## Purpose

Remove the operator-download dependency for the accepted dormant-binder native
candidate.

Accepted lock V3 is:

`voidbuye2dormantbinderlock3_a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a`.

Accepted candidate ID:

`voidbuye2dormantbindercand2_8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d`.

Accepted ELF:

- bytes: `726976`;
- SHA-256:
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`;
- static ELF64 x86-64;
- no `PT_INTERP`;
- hostile `LD_PRELOAD` cannot reach the static first instruction.

## Frozen derivation

The materializer does not compile from current-main source.

It requires the accepted V3 lock on the current clean checkout, then:

1. proves accepted candidate merge
   `2b76758851d550e8cbd5fc71412e4b85cfaa8791` is an ancestor;
2. creates a disposable detached Git worktree at that exact merge;
3. requires candidate proof Git blob
   `f97cb8aff642f2f3e138fe8e087eece22223b934`;
4. executes that verified proof source in-memory;
5. invokes its reviewed `derive()`, including the sealed-memfd source snapshot,
   protected toolchain checks, two byte-identical builds, native self-test, and
   loader-independence controls;
6. requires exact accepted report and ELF identities;
7. removes only the disposable Git worktree.

The accepted report identity is:

- bytes: `7870`;
- SHA-256:
  `f21445a333a2c05d132692c29aa929a1de727d6f6f35ce2edac600a7cccfa4a2`;
- Git blob:
  `4ba13c0b8a471d36c7644754e27ec0b8c07481ca`.

## Create-only output

The requested output parent must already exist.

The materializer opens the output leaf with
`O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC`, writes the exact accepted ELF,
sets mode `0555`, fsyncs and rereads through the retained descriptor, then
fsyncs the parent directory.

A duplicate output returns HOLD. A failure after create-only open deliberately
does not unlink the visible output pathname by name; the operator must inspect
or choose a fresh path.

## Authority

Materialization does not authorize or perform:

- any write under `/opt`;
- protected installation;
- dormant-binder/native live execution;
- credential/private-key access;
- signing;
- RPC/transaction;
- payment acceptance;
- public presale or WC/VOID activation;
- treasury/liquidity action;
- funds movement.

The next operational use is as the exact `--native` input to the separately
authorized read-only protected-installer plan.

PROTECT THE CORE.
