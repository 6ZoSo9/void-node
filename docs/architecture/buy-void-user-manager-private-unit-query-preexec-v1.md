# Buy VOID user-manager private-unit query static preexec v1

Marker: `VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_PREEXEC_V1`.

Status: **source/CI external pre-exec boundary; no live host authority**.

## Problem closed at the source-design layer

The #3030 query process can verify a fixed libsystemd object after it starts, but
a dynamic-loader adversary may execute before `main()`. A child process cannot
prove that its own pre-exec loader state was clean.

This successor moves the environment boundary outside that process.

## Static preexec

The preexec is compiled as a static ELF with no `PT_INTERP`. It therefore has
no glibc dynamic-loader step in which caller-controlled `LD_PRELOAD` or
`LD_LIBRARY_PATH` can run before its code.

The live design uses fixed protected paths:

- preexec: `/opt/void-buy-void-user-manager-query-v1/void_buy_void_user_manager_private_unit_query_preexec_v1`;
- query: `/opt/void-buy-void-user-manager-query-v1/void_buy_void_user_manager_private_unit_query_v1`.

The preexec requires root, root-owned/non-group/world-writable ancestry, its own
fixed path, and a root-owned/non-writable/single-link executable query file. It
opens the query with `O_NOFOLLOW`, retains that descriptor, rechecks visible
identity, and enters it with `fexecve()`.

The child environment is constructed by the static parent and contains only:

- `PATH=/usr/bin:/bin`;
- `LANG=C`;
- `LC_ALL=C`;
- `VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1=1`.

No caller environment is forwarded.

## Adversarial proof

Hosted CI builds the preexec statically and requires no `PT_INTERP`. It also
builds the existing #3030 query, installs both into a disposable root-owned
`/opt` fixture, and uses an `LD_PRELOAD` constructor as a positive control.

The constructor executes before `main()` on an unsafe direct query launch. The
same poison cannot enter the query when the static preexec is used because the
preexec constructs the child environment itself. A group/world-writable query
binary is also rejected before execution.

## Remaining boundary

This does **not** yet lock the exact compiled query ELF for production
installation. A successor must derive/accept the exact query + preexec ELF
identities, install them create-only or by guarded replacement under the fixed
root-owned tree, and make the live host collector invoke only the accepted
preexec path.

`query_elf_content_lock_still_required=true`

`complete_host_evidence_collector=false`

`production_host_evidence_authority=false`

`payment_acceptance=false`

`public_presale_activation=false`

`funds_movement=false`

No host/service/filesystem/RPC/credential/key/wallet/signer/payment/transaction/
WC/presale/funds mutation occurs in this PR.
