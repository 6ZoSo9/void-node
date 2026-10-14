# Buy VOID final V7/V2 current-enforcement candidate v1

Marker: `VOID_BUY_VOID_ENFORCEMENT_FINAL_V7_V2_CURRENT_CANDIDATE_V1`.

Status: **source/CI candidate only; enforcement identity not accepted**.

## Parent

This candidate is stacked directly on accepted protected V2 publisher head:

`a2f304fa3ae494cdd4fa71f65aa6f689a1313948` (#2980).

The 28-member executable/runtime closure remains byte-identical to the accepted
V2 V7 runtime generation and is rederived rather than copied as authority.
The candidate additionally binds the complete current protected source set that
the deployment installer requires before it can consume a future accepted lock.

## Exact current-source boundary

The candidate imports the deployment installer's reviewed
`VOID_BUY_VOID_CURRENT_ENFORCEMENT_TRACKED_SOURCE_PATHS_V1` contract and
requires all **49** listed paths to remain Git-blob and mode identical to the
accepted #2980 parent.

It then records every row directly in:

`current_enforcement_tracked_source_inventory_v1`

and content-addresses that inventory in the candidate enforcement identity.

The three additive candidate files are deliberately outside that protected
49-path runtime/mutation set and cannot silently change an authority-bearing
tool generation.

## Executable closure retained

The proof rederives the previously accepted final V7/V2 execution closure:

- exact 28 compiled economic artifacts and 28 source files;
- six-module V7 executable delta;
- reviewed `ethers + express` package runtime;
- provider-closure lock semantics;
- static live-process V2 module edge;
- dynamic fulfillment-saga tool edge.

The runtime/build path set is required byte-identical to accepted #2971 even
though the later reconciled publisher lineage is not an ancestry descendant of
that branch.

## Authority

The candidate may prove:

`complete_executable_closure_verified=true`

`current_enforcement_tracked_source_inventory_verified=true`

It must remain:

`candidate_enforcement_identity_accepted=false`

`deployed_artifact_generation_verified=false`

`runtime_mount_authority=false`

`production_source_finality_authority_ready=false`

`public_presale_activation=false`

`funds_movement=false`

Acceptance requires a separate lock PR after exact Node 22/24/26 candidate byte
equality. No deployment, receipt publication, service/RPC/payment, credential,
key, wallet, signer, transaction, WC/presale, treasury/liquidity or funds
action is authorized here.
