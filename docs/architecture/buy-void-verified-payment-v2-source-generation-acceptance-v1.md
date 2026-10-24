# Buy VOID verified-payment V2 source-generation acceptance

Status: **candidate / source and hosted CI only**. This is not an approved
replacement for the historical protected enforcement lock. Target dependency:
[PR #3692](https://github.com/6ZoSo9/void-node/pull/3692) at current-main
repaired current-main head `f84d380d41e3aefd3c96b3fa956f5f7addf9f908`
with tree `6d03b668ca51cc7ffa115c164955d09dc9b13e70`.

The original reviewed seven-ADD-only generation remains immutable at
`0628d81259fed779ea3bb6c4d067b66b19a3e577` / tree
`282648386bb2f0b79f95af398de61f231e79504c`. The repaired parent preserves
that head as an ancestor and still exposes exactly seven ADD-only V2 paths
relative to live `main@61b0f81b2112aab32e3dc16084fe2d43178ec4da`.
The transport source/proof remain byte-identical; the current workflow,
allocation-stage source/proof and custody-inspect source/proof are separately
versioned to bind payment-instruction amount and first-original lineage.

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

The accepted source HEAD/tree and all seven current dependency blobs are pinned
to the repaired parent. In addition to canonical quote/verifier binding, the
stage now requires payment-instruction amount equality and a bounded canonical
first-request lineage preflight. Later native-USDC or launch-authority backfill
cannot repair a deficient first row. The historical seven-file generation stays
separately authenticated and is never repinned in place.

## Disposable custody inspection regression alignment

The current custody-inspect proof uses the real canonical receipt/log verifier,
the repaired payment-instruction and first-original lineage preflight, and a
disposable native Base USDC Transfer. Authentication is required before lineage
or socket-configuration access. The custody bridge remains **inspect-only** and
returns HOLD even for a valid disposable Unix socket reply. The versioned source
proof pins current blob `b87945fb2d7df4af4740fc28ae467f8f660361e3`.

## Broad TypeScript source regression

The original real-verifier synthetic proof used a boolean-discriminant access
that passed the dedicated build but not the repository's broader focused
TypeScript invocation. The current focused stage proof is pinned as
`addd7842edb7f0e851d1e589d4303c0dc6e2756f` and includes adversaries for
payment-instruction amount, incomplete first-row launch/native-USDC provenance,
bounded lineage buffers, accessors/proxies and detached backing stores. TypeScript
settings and historical evidence remain unchanged.


## Repaired-parent exact identities

```text
accepted_source_base=61b0f81b2112aab32e3dc16084fe2d43178ec4da
accepted_v2_parent=f84d380d41e3aefd3c96b3fa956f5f7addf9f908
accepted_v2_parent_tree=6d03b668ca51cc7ffa115c164955d09dc9b13e70
landed_main=652197dc8df36f0f2004d50c6bbf95369790e2d1
landed_main_tree=00e5dd00386372e533c945141dd857f663fdf036
accepted_transport_workflow=0cc7e50febb6d289c343e188a10e63bbd22053d6
current_transport_workflow=6d9c8e821ba70f28183bc2d879b95b7e2f829be1
custody_inspect_proof=b87945fb2d7df4af4740fc28ae467f8f660361e3
transport_proof=2714988acfbcded3d4779ef79a141cd3e39b1426
allocation_stage_proof=addd7842edb7f0e851d1e589d4303c0dc6e2756f
custody_inspect_source=45ade2941e28a51e4dbb4884dfcbe9ec549022e6
transport_source=61dc219117538f2894b170ac98bb56806f69f430
allocation_stage_source=6efb2be5f03ff87290ef376d7852d22db22900f8
```

The accepted branch generation is preserved as immutable evidence even though #3692 landed by squash merge and therefore cannot remain a Git ancestor of `main`. Current and future proofs bind the permanent landed carrier `652197dc8df36f0f2004d50c6bbf95369790e2d1` as an ancestor, require its exact tree `00e5dd00386372e533c945141dd857f663fdf036`, and verify every current seven-file V2 source identity at both that landed carrier and the executing head. This replaces an ancestry assumption; it does not alter source acceptance, mount, payment, or funds authority.

The accepted V2 add-only generation remains immutable at `f84d380d41e3aefd3c96b3fa956f5f7addf9f908`; its transport workflow blob is still `0cc7e50febb6d289c343e188a10e63bbd22053d6`. The current combined-head successor changes only that one seven-file source-map member to workflow blob `6d9c8e821ba70f28183bc2d879b95b7e2f829be1` so the historical seven-path proof and the separately reviewed 16-path composition can both remain exact. This successor binding does not set independent source acceptance or runtime authority true.

## Source-proof reader and acceptance semantics

The current V2 source proof and trigger-closure proof use retained descriptor-
relative directory traversal with `O_NOFOLLOW|O_NONBLOCK`, bounded reads and
before/open/after generation checks. Disposable guarded regular-to-FIFO swaps
must reject without blocking.

The frozen enforcement lock remains historical evidence only:

```text
historical_v2_candidate_enforcement_identity_accepted=true
candidate_enforcement_identity_accepted=false
independent_source_acceptance_complete=false
successor_runtime_generation_accepted=false
```

All five protected V2 consumers assert that split. Current source-generation
integration does not convert historical candidate acceptance into authority for
this changed V2 source generation.
