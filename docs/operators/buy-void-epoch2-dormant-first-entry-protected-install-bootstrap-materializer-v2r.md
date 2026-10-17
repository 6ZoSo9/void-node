# Buy VOID Epoch-2 runtime-head protected-install bootstrap materializer V2R

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_MATERIALIZER_V2R`.

Status: **source/CI artifact materialization only**.

## Purpose

Materialize the exact accepted runtime-head V2 bootstrap without trusting an
operator-provided binary or recompiling from mutable current-main source.

Accepted lock:

`voidbuye2bootstraplock3_690d119c90f5c8c20f429fcc14919b62691f9a1b3bfe2226476267ede993197f`.

Accepted candidate:

`voidbuye2bootstrapcand2_b71b8757fa64fc36c2df0e95e3812c00eccef114b71e0b854c34ddfd62285def`.

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

The materializer requires the canonical V3 acceptance lock on the current clean checkout,
then rederives from the frozen candidate source head
`344f0abcc57d6f2fbacbb6a57e27009ae9ea7a4b`, exact tree
`4085987d856fa303b8bc81087e3b5a207bc8964f`.

It creates a disposable detached worktree at that generation, requires candidate
proof Git blob `4f9b5a2ca77b3aebc9e70ea835c92155601a1a06`, executes those verified
proof bytes in memory, and invokes reviewed `derive()`.

The result must reproduce exactly:
- report: 4789 bytes, SHA-256
  `2ca03a4d7e609076df740a7590abfae572101ef7bf78feacf11240e309a43ee4`,
  Git blob `fbaab61d0e169516a49c5c07feeceba1a7204e83`;
- candidate ID above;
- accepted bootstrap ELF identity above.

## Runtime-head contract

The materializer requires canonical lock V3 to preserve:
- `runtime_head_contract_accepted=true`;
- `canonical_main_candidate_authority=true`;
- `superseded_v2_lock_install_authority=false`;
- `superseded_v1_lock_install_authority=false`;
- `runtime_expected_head_compile_bound=false`;
- strict lowercase runtime-head admission;
- unchanged runtime-head forwarding;
- repository candidate HEAD bytes absent from the bootstrap ELF.

Merged lock V2 `voidbuye2bootstraplock2_7a306d22914d51844489688ab33152d98c8ea1d30b0eb887d8e1adfe883c7170` remains frozen historical evidence and cannot authorize canonical V2 materialization or installation because it accepted the PR-preview candidate. The older V1 lock also has no install authority.

## Create-only output

The requested output parent must already exist. The output leaf is opened with
`O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC`, written through its retained
descriptor, changed to mode `0555`, fsynced, reread fully, checked against the
visible inode/generation, then its parent directory is fsynced.

A duplicate output HOLDs. Failure after the create-only open does not unlink a
visible output pathname by name.

Hosted CI publishes the exact accepted V2 ELF and V2R materialization log as an artifact so a
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

`void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_install_v2r`.

PROTECT THE CORE.


## Canonical evidence and Git isolation

V2R consumes only the canonical-main candidate evidence accepted by lock V3:
workflow run `38992362910`, source head
`344f0abcc57d6f2fbacbb6a57e27009ae9ea7a4b`, report candidate
`voidbuye2bootstrapcand2_b71b8757fa64fc36c2df0e95e3812c00eccef114b71e0b854c34ddfd62285def`.
The bootstrap ELF remains byte-identical to the historical preview generation;
only the candidate report/acceptance lineage changed.

All Git subprocesses run with `GIT_NO_LAZY_FETCH=1` and an empty
`GIT_ALLOW_PROTOCOL`, so missing objects HOLD instead of implicitly fetching or
modifying the checkout.
