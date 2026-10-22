# Buy VOID verified-payment V2 source-generation acceptance

Status: **candidate / source and hosted CI only**. This is not an approved
replacement for the historical protected enforcement lock. Target dependency:
[PR #3692](https://github.com/6ZoSo9/void-node/pull/3692) at exact head
`56a382ab3cfba742e29b928357922dcdb15422a3` with tree
`f87f021a743af46a6a60c27983c3df3f30f3ce06`.

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
node scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v2.mjs --self-test
node scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v2.mjs --receipt
```

The historical V1 proof should still refuse this new source generation with
`unexpected_post_census_economic_drift`. That refusal is a required regression
and is tested in the new workflow, not a reason to edit the V1 script or
change frozen candidate/lock JSON.

The source successor is meaningful **only after** exact-head hosted matrix
tests, independent review, and separate source acceptance. The currently
historical five workflow generations must remain fail-closed until a
separately reviewed versioned dispatch/promotion step composes the new
receipt into their exact source-generation gates. Simply copying the
receipt into an old workflow is not approval.

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
