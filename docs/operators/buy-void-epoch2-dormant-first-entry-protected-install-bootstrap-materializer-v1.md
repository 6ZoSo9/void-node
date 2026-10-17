# Buy VOID Epoch-2 dormant first-entry protected-install bootstrap materializer V1

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_MATERIALIZER_V1`.

Status: **source/CI artifact materialization only**.

## Purpose

Remove any operator-download dependency for the accepted protected-installer
bootstrap candidate.

Accepted lock:

`voidbuye2bootstraplock1_4f11418d278908c99cc3b2de622112321600c3f3704f8919e893a2d7011b1b23`.

Accepted candidate:

`voidbuye2bootstrapcand1_24d4c84d307c525cc4e28f010c7f2258db2e55256af7d8cf0cb303cf1c4ee851`.

Accepted bootstrap ELF:

- bytes: `731072`;
- SHA-256:
  `1b570f704841f8b833707de2c85ca66d2a344f3a77b5d1979ab29eaae2ec1189`;
- Git blob:
  `5d35e762fa4b510baeb89b2840d5287cc4fd6716`;
- static ELF64 x86-64;
- no `PT_INTERP`;
- no dynamic `NEEDED`;
- inert self-test GREEN.

## Frozen derivation

The materializer never compiles from mutable current-main source.

It requires the accepted lock on the current clean checkout and then:

1. proves frozen candidate merge
   `0ea097a3fa43dc95a1a0a5272c61afe570361fc7` is an ancestor;
2. requires its exact tree
   `681e9387826f2c0fe8c0336604dfd6e57ff16d93`;
3. creates a disposable detached worktree at that merge;
4. requires candidate proof Git blob
   `d1417455330837c4d584f7bf36f932a869c903cb`;
5. executes that verified proof source in memory and invokes its reviewed
   `derive()`;
6. requires the exact accepted report identity:
   - 4705 bytes;
   - SHA-256
     `b3f909c391ce617b7a8e796749bb57ce69f95b27259dd9da1c0fae849d6e74f7`;
   - Git blob
     `0675dbcc993171edb2bbbbc7fd9481e4ed0ef006`;
7. requires the exact accepted bootstrap ELF identity;
8. removes only the disposable worktree.

## Create-only output

The requested output parent must already exist.

The materializer opens one new output leaf with
`O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC`, writes the exact accepted ELF, changes
the retained descriptor to mode `0555`, fsyncs, rereads the full output through
that descriptor, verifies the visible inode is still the same generation, and
fsyncs the parent directory.

A duplicate output returns HOLD. A failure after create-only open does not
unlink the visible output pathname by name; inspection or a fresh path is
required.

## Authority

Materialization does not authorize or perform:

- writes under `/opt` as part of this source/CI gate;
- protected bootstrap installation;
- protected dormant-binder installer apply;
- bootstrap/binder live execution;
- credential/private-key access;
- signing;
- RPC/transaction;
- payment acceptance;
- public presale or WC/VOID activation;
- treasury/liquidity action;
- funds movement.

The next operational use is as the exact candidate input to the separately
authorized protected-bootstrap installation plan.

PROTECT THE CORE.
