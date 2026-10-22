# Buy VOID verified-payment V2 source-generation acceptance

Status: **candidate / source and hosted CI only**. This is not an approved
replacement for the historical protected enforcement lock. Target dependency:
[PR #3692](https://github.com/6ZoSo9/void-node/pull/3692) at exact head
`0628d81259fed779ea3bb6c4d067b66b19a3e577` with tree
`282648386bb2f0b79f95af398de61f231e79504c`.

## Problem and authority

Five frozen V7/V2 protected-generation workflows currently reject the additional
three economic source files in #3692 with
`unexpected_post_census_economic_drift`. That is a correct refusal, not a failed
payment transaction or permission to rewrite the old lock.

Version 2 derives a new **source-only** receipt by independently retaining and
rechecking the historical V1 obligations, not replacing or modifying V1:
- historical 106-path restack and two preserved current-main proof identities;
- exact historical V2 candidate / lock / V4 protected census hashes;
- 49 unchanged protected tracked-source Git mode/blob identities and digest;
- 28 built protected artifacts and 28 source identities;
- provider-source and compiled-provider artifact closure;
- three previously admitted nonprotected source diffs unchanged since restack;
- the seven ADD-only files of #3692, including three new economic modules,
  each pinned to an exact original Git blob on both the accepted dependency
  head and the proposed successor HEAD;
- an exact tree and ancestor binding to #3692;
- the unchanged historical V1 dispatch proof and refusal.

The only admitted new economic paths are
`buy_void_v2_custody_inspect_bridge_v1.mjs`,
`buy_void_verified_payment_transport_v2.ts`, and
`buy_void_verified_payment_v2_allocation_stage.ts`, under `src/economic/`.
Any other source/build drift is HOLD.

## Acceptance path

Run in an unprivileged, disposable checkout of the *stacked* head:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run build
node scripts/prove_buy_void_verified_payment_v2_trigger_closure_v1.mjs
node scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v2.mjs --self-test
node scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v2.mjs --receipt
```

The historical V1 proof should still refuse this new source generation with
`unexpected_post_census_economic_drift`. That refusal is a required regression
and is tested in the new workflow, not a reason to edit the V1 script or
change frozen candidate/lock JSON.

The source successor is meaningful **only after** exact-head hosted matrix
tests, independent review, and separate source acceptance. This Draft now
includes a **source-only versioned dispatch candidate** for the five formerly
V1 workflows. Their exact frozen V2 candidate/lock and V4 census are
untouched. Only the current source-generation invocation/markers and
source-version expectations are changed. The workflows remain unmerged and
cannot grant production authority.

V2 itself fails closed when a workflow does not invoke V2 or lacks a V2
source trigger. The historical V1 proof remains unchanged and still rejects
the new generation directly. Source CI GREEN is not independent acceptance,
deployment authority, payment acceptance, or a public launch approval.

## Trigger-closure contract

The dedicated V2 source-generation workflow is the canonical compulsory
source-acceptance trigger. Its `pull_request.paths` set covers every key derived
from the committed `V2_SOURCE_FILES` inventory: the parent transport workflow,
all three focused proof programs, and all three added economic modules. It also
covers the V1/V2 dispatch proofs, its own trigger-closure proof, this document,
its own workflow definition, and all five protected consumer workflow files.

The five protected consumers still trigger on their own workflow and V2 dispatch
proof changes and invoke the exact V2 self-test when they run. They do not need
to duplicate all seven source-input filters because any change to those inputs
must schedule the dedicated source-acceptance gate. The trigger-closure proof
extracts the inventory keys from the V2 proof source, parses the dedicated
`pull_request.paths` block, and verifies the consumer definitions and V2
invocations. A manually repeated seven-path list is not the source of truth.

This alternative compulsory trigger closes only CI scheduling and source
acceptance. It does not make the inherited frozen enforcement identities current,
mount a route, authenticate payment finality, or authorize allocation/delivery.

## Runtime and customer-safety boundaries

```text
protected_filesystem_mutation=false
operator_route_mounted=false
custody_reserve_authority=false
cross_uid_peer_credentials_authenticated=false
source_chain_payment_finality_authenticated=false
payment_acceptance=false
automatic_fulfillment=false
erc20_delivery_canary_executed=false
public_presale_activation=false
wc_void_coupled_activation=false
wallet_or_signer_access=false
funds_movement=false
```

The pre-existing nonempty request/operator journals must be preserved and
historical obligations resolved before provisioning an alternate request root.
The custody service/socket is not installed; an unprivileged web UID must never
receive implicit custody access. No protected V7 release or process is changed.

**PROTECT THE CORE.**

## Canonical verifier-event integration correction

The predecessor #3692 additionally fixed a source-level availability gap:
the real V2 USDC receipt verifier **does not emit a VOID quote field**, and
the earlier artificial staging fixture invented one. The updated staging
contract now requires the original server-held request's positive VOID quote,
checks exact micro-VOID quantity against canonical fixed economics and USDC
amount, and binds the actual verifier's `amount_units` and
`requested_units` to that original USDC amount. Native USDC contract,
original rate and price commitments are also required; fabricated event quotes
are rejected. The focused regression invokes the actual canonical V2 verifier
on disposable synthetic ERC-20 Transfer receipts and checks the unmodified
event's ability to reach **staged_unmounted** with all payment/custody authority
false.

The accepted source HEAD, tree, and three changed dependency blob IDs in this
version are pinned to that correction. The branch integrates the dependency by
an **additive two-parent merge**, preserving the earlier successor history and
the corrected #3692 parent; no force push or historical evidence repinning.

## Disposable custody inspection regression alignment

The #3692 correction also replaces the historical fabricated V2 event in
`scripts/prove_buy_void_v2_custody_inspect_bridge_v1.mjs` with the output of
the real canonical receipt/log verifier, using one synthetic native Base USDC
Transfer. The custody bridge remains **inspect-only** and returns HOLD even for
a valid disposable Unix socket reply. The versioned source proof pins the
updated Git blob `d0a81327e43a76e7b8171d975b7dde981483219f`.

## Broad TypeScript source regression

The original real-verifier synthetic proof used a boolean-discriminant access
that passed the dedicated build but not the repository's broader focused
TypeScript invocation. It now uses the existing `"reason" in decision`
union narrowing. The versioned source acceptance pins the corrected test blob
`d447fad19edbb0897166f67ab2e435fe34d5e164` rather than relaxing
TypeScript settings or altering a historical proof.
