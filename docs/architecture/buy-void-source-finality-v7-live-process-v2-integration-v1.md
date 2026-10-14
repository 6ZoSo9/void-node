# Buy VOID V7 live-process V2 consumption

## Purpose

This stacked source-only successor makes V7 consume the kernel-selected
live-process V2 evidence contract from #2964 instead of the historical V1
user-manager-bus receipt generation.

## Source inventory

V1 remains in the exact reviewed source inventory because V2 reuses only its
self-process identity reader. V2 is added as a separately reviewed source file,
so the V7 reviewed source count advances from 9 to 10.

A deployment receipt from the 9-file generation therefore cannot verify against
this source generation. The deployment/source-finality enforcement lineage must
be freshly derived after this change.

## Runtime gate

V7 now requires the fixed V2 receipt path:

`/var/lib/void-source-finality-v7/live-process-binding-v2.json`

and calls `verifyBuyVoidSourceFinalityLiveProcessBindingV2(...)`.

The execution preflight supplies only that fixed V2 path. A V1 receipt is not
reinterpreted or promoted.

The executable provider-pair pre-RPC proof is migrated to a V2 receipt fixture
and still requires invalid provider-pair evidence to make zero HTTP/HTTPS
requests before a valid pair can reach the HTTPS sentinel.

## Boundary

This PR does not implement or run the privileged V2 receipt collector. It does
not publish a V2 receipt, deploy source, restart a service, contact an RPC
provider, access credentials/keys/wallets/signers, construct/sign/broadcast a
transaction, mutate Chain-2050/WC/inventory/treasury/liquidity, activate the
presale, or move funds.

A separately reviewed collector behind the native pidfd selector remains
required before real V2 evidence can exist.

PROTECT THE CORE.

## Executable-delta consequence

The V7 executable-delta candidate advances from five to six modules by adding
`buy_void_source_finality_live_process_binding_v2`. The historical V1 module
remains in the delta because V2 depends on its self-process identity reader.
Node 22/24/26 must derive the six-module candidate byte-identically before any
fresh whole-enforcement census/acceptance successor is attempted.
