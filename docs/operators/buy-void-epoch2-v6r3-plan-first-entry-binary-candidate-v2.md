# Buy VOID Epoch-2 V6R3 planner first-entry binary candidate V2

Marker: `VOID_BUY_VOID_EPOCH2_V6R3_PLAN_FIRST_ENTRY_BINARY_CANDIDATE_V2`.

Status: **source/CI-only compiled ELF candidate; unaccepted and not installed**.

## Exact source

This lane is stacked on #3571 source head `0c28e7941e701f32bece90f1a892b0b6ce1864c7` and binds:

```text
source_path=ops/precision/void_buy_void_epoch2_v6r3_plan_first_entry_v1.c
source_git_blob=8d06482b5cc313cc1609371493112e737f89abc2
```

The bound source is the **combined #3582 → #3585 repair generation**, with explicit securebits and capability-set reduction and safe inherited stdout/stderr custody. The original #3573/#3574 binary identity is a historical blocked predecessor, not a release artifact.

The bound source is the native planner first-entry launcher that authenticates the fixed
planner before Python, permanently drops to UID/GID 1000, executes sealed planner/Python
memfd snapshots, uses isolated `-I -B -S`, closes inherited fds with
`close_range(..., CLOSE_RANGE_UNSHARE)` plus an fd census, and identity-checks the
`/dev/null` stdin replacement.

## Compile recipe

Each hosted lane compiles the exact source twice with fixed `/usr/bin/cc` and:

```text
-std=c11
-O2
-Wall
-Wextra
-Werror
-D_FORTIFY_SOURCE=2
-fstack-protector-strong
-static
-Wl,-z,relro,-z,now
-Wl,--build-id=none
```

The report records compiler requested path, realpath, binary SHA-256/size, first version
line, target triple, and compiler version. Compiler evidence is provenance, not
production trust.

Each build must be ELF, statically linked, have no `PT_INTERP`, and produce the exact
reviewed launcher `--self-test` transcript. The two local binary byte strings must be
identical.

## Three-run equality

Three independent Ubuntu 24.04 jobs upload **only canonical JSON candidate reports**.
The compare job requires all three report byte strings to be identical, revalidates the
current source/compiler identities, recomputes the content-addressed candidate ID, and
rejects authority overclaims.

The ELF itself is not published or accepted by this lane. The new candidate schema is V2, and no previous candidate report or lock may be repinned to these changed C bytes.

## Authority

A GREEN candidate still records:

```text
candidate_binary_identity_accepted=false
protected_install_authorized=false
installed_binary_identity_proven=false
host_plan_authorized=false
service_mutation=false
credential_access=false
private_key_access=false
signing=false
transaction=false
rpc_call=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

## Next gate

`void_buy_void_epoch2_v6r3_plan_first_entry_binary_candidate_lock_v2`.

That later lock may accept one exact hosted candidate report as repository evidence.
Installation, host Python/stdlib/dynamic-loader closure, installed qualification,
independent review, and host-plan authorization remain separate gates.

PROTECT THE CORE.
