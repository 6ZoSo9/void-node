# Buy VOID allocation-custody host-evidence source plan v5

Marker: `VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_SOURCE_PLAN_V5`.

Status: **source-composition GREEN candidate; live host evidence remains HOLD**.

## Purpose

The historical presale host-evidence V2 qualifier depended on an eleven-file
freeze/census generation that is absent from current main. Re-copying that
historical generation would not qualify today's source and would reintroduce
obsolete acceptance IDs.

This V5 plan instead binds the modern source contracts already reviewed on the
#3666 stack. It is deliberately **not** a host collector.

## Exact base

- stacked parent: Draft #3666;
- parent head: `ea20cb6bf7420692315df71623ffb38ed1810fcf`;
- parent tree: `7291e5d11162742cff4de925800160ce598f98af`;
- plan ID:
  `voidbuycusthostsrcplan5_a7324e498bc36ad8cd425065752e581f330642b875cc415043488848dd1e4095`.

The plan content-binds 31 source/proof/workflow artifacts.

The executable proof also binds the source generation itself: the declared #3666
base commit must have the declared tree, must be an ancestor of the exact
checkout HEAD, and the complete committed base→HEAD diff must be exactly these
four V5 files as additions only. Extra, deleted, renamed, or modified paths HOLD.

## Source composition

The exact bound source generation covers:

1. authenticated user-manager V4 evidence as historical semantics only; the
   historical V4 proof remains frozen and is not executable qualification of
   today's private-query C generation. Current manager acceptance is instead
   source-bound through the existing V6 ELF lock, V6 lock proof, cap-last-cap
   projection, and V6 live-qualification contract, all of which pin the current
   private-query source generation;
2. custody service V2 source and source proof, plus all six direct local runtime
   source dependencies: allocation-reservation ledger classifier, allocation
   high-water binding, verified-allocation replay binding, allocation-roots
   observer, payment-ledgers observer, and cross-UID capacity lock;
3. stable request-root source policy and proof;
4. RuntimeDirectory/socket source policy and proof;
5. Polkit deny source profile and proof;
6. historical V1 storage/mount/statfs/double-census semantics as a **semantic
   donor only** — not as the current user-manager collector;
7. the #3666 current-main presale custody collector V2, its proof, the rollback
   durability contract, both V2 read-only observer sources, and the exact
   second-control composition source.

## What this does not prove

The source-only proof executes bounded read-only Git metadata/ancestry commands
and reads regular files from its exact checkout on an unprivileged CI runner.
It does not execute runuser, systemctl, SSH, RPC, or any host collector; it
does not query the installed Precision protected host, read custody journals or
signers, or mutate services/state. In this plan, `host_read_performed=false`
means no protected installed-host observation, not zero filesystem reads by CI.

In particular all of these remain false:

- complete host-evidence collector;
- production host-evidence authority;
- live custody-service V2 configuration;
- live request-root profile;
- live mount/storage evidence;
- live RuntimeDirectory/socket evidence;
- live Polkit denial;
- live double-census stability;
- trusted verification clock;
- evidence-generation monotonicity;
- authenticated external transport/witness storage;
- independent custody;
- payment acceptance, public presale activation, or funds movement.

The V1 host collector is bound only because its storage/mount/statfs/double-
census semantics remain the reviewed donor for a future user-manager-aware
collector. Its historical system-manager runtime assumptions are not promoted.
Likewise, the historical V4 manager proof is not promoted as executable current
qualification; current C-generation acceptance must flow through the bound V6
contracts, and live query/host execution remains false.

## Next gate

The next gate is a **separately authorized, read-only complete host-evidence
collector V5** that consumes this source plan, authenticates the already-installed
host generation, performs the required double census, and leaves all mutation
and economic authority false until independent host review accepts the result.

No protected-host execution or activation authority is granted by this source plan.

PROTECT THE CORE.
