# Buy VOID Epoch-2 runtime-head protected-install bootstrap materializer V2

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_MATERIALIZER_V2`.

Status: **source/CI artifact materialization only**.

## Purpose

Materialize the exact accepted runtime-head V2 bootstrap without trusting an
operator-provided binary or recompiling from mutable current-main source.

Accepted lock:

`voidbuye2bootstraplock2_7a306d22914d51844489688ab33152d98c8ea1d30b0eb887d8e1adfe883c7170`.

Accepted candidate:

`voidbuye2bootstrapcand2_a8acbc7a61ed1a5a59a29529b678e1473c044584a663bcdb1174756c29c71eb5`.

Accepted bootstrap ELF:
- bytes: `731072`;
- SHA-256:
  `37a6979c274e93fa09860b26664804a9d912201a290db65deb9b4499e39aa276`;
- Git blob:
  `45ca1ed7a6237fccbd6bb0b9d73ef5ff47c72d62`;
- static, no `PT_INTERP`;
- no dynamic `NEEDED`;
- inert V2 self-test GREEN.

## Frozen derivation

The materializer requires the V2 acceptance lock on the current clean checkout,
then rederives from the frozen candidate source head
`917a6247973310c539a4186c59825b1474ce0251`, exact tree
`4085987d856fa303b8bc81087e3b5a207bc8964f`.

It creates a disposable detached worktree at that generation, requires candidate
proof Git blob `4f9b5a2ca77b3aebc9e70ea835c92155601a1a06`, executes those verified
proof bytes in memory, and invokes reviewed `derive()`.

The result must reproduce exactly:
- report: 4789 bytes, SHA-256
  `f740e5e9194cbef3b967050ba215b83ccb442000ad549eccf342c5be2e7acb36`,
  Git blob `1d0505dbb67b9c9ce710335f20d606d56d91570f`;
- candidate ID above;
- accepted bootstrap ELF identity above.

## Runtime-head contract

The materializer requires the accepted V2 lock to preserve:
- `runtime_head_contract_accepted=true`;
- `superseded_v1_lock_install_authority=false`;
- `runtime_expected_head_compile_bound=false`;
- strict lowercase runtime-head admission;
- unchanged runtime-head forwarding;
- repository candidate HEAD bytes absent from the bootstrap ELF.

The frozen-head V1 lock cannot authorize V2 installation.

## Create-only output

The requested output parent must already exist. The output leaf is opened with
`O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC`, written through its retained
descriptor, changed to mode `0555`, fsynced, reread fully, checked against the
visible inode/generation, then its parent directory is fsynced.

A duplicate output HOLDs. Failure after the create-only open does not unlink a
visible output pathname by name.

Hosted CI publishes the exact V2 ELF and materialization log as an artifact so a
later installer can consume accepted bytes without trusting a user download.

## Authority

Materialization does not authorize or perform:
- writes under `/opt`;
- protected bootstrap installation;
- protected-installer apply;
- bootstrap/binder live execution;
- credential/private-key access;
- signing;
- RPC/transaction;
- payment acceptance;
- public presale or WC/VOID activation;
- treasury/liquidity action;
- funds movement.

Next gate after successful materialization:

`void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_install_v2`.

PROTECT THE CORE.
