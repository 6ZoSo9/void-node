# Buy VOID first-original buyer custody reserve source V2 proof

## Immutable lineage and scope

This source-only candidate is an **additive child** of the reviewed joint
original-buyer + current V6 operator Draft
[#2753](https://github.com/6ZoSo9/void-node/pull/2753)
exact head `cff927e850dfc078419be06a468aa77c6c1f41c3`.
It does NOT alter the joint merge's ordered two parents or their exact
Git trees. The historical V1 reserve proof and hypothetical crash matrix
remain byte-identical in the source tree, including the old replay source
pin `970e686cd96b43d496c44acb4ff343a5e61e26c5`.
The joint workflow is intentionally supposed to see that historical V1
crash proof fail on the new replay source: this is a **positive negative
witness**, never a defect to bypass.

## Current semantics separately demonstrated

The current replay-binding source is exactly
`0a74a3652081c3e142d0b887676771a7ac148f32`.
Independently compared against predecessor `970e686...`, it adds eight
lines preserving the buyer delivery wallet from the first request row.
A later request update can add a pending transaction or receive address,
but can never backfill the original buyer delivery wallet to qualify a
verified payment or reserve VOID.

The added `scripts/prove_buy_void_custody_reserve_first_original_v2.mjs`
is a **new** source/compiled identity-pinned successor based on the
original canonical reserve-plan test, not a rewrite of that historical V1.
It retains the actual pure V2 signed launch decision, verified-payment
replay, allocation reservation planning, idempotent already-allocated
replay, prior-verified obligation gap, quote/capacity invariants, malformed
launch lineage, Proxy/getter/extra-caller-authority refusal, and all
false monetary authority outputs. It additionally requires the five
reviewed first-original wallet source guards **and** checks a forged
two-snapshot history with no original buyer wallet but a later valid
wallet. The forged history must HOLD before allocation planning.

A Node 22/24/26 exact-head workflow compiles reviewed TypeScript,
requires the frozen V1 reserve proof to fail with its **original**
source-identity drift reason, executes the **new** V2 reserve proof,
checks the exact all-false output, and byte-compares receipts across
all three Nodes. The old source pins and their historical CI remain
untouched. The prior reviewed V2 hypothetical crash-matrix proof
remains independently required by its existing joint workflow.

## What this cannot authorize

It is still only a **pure source-level planner** with inert fixture
receipt/launch, not a real EIP-712 launch signature, fsynced verified
payment, authenticated operator or buyer, custody service IPC, protected
dual-root publication, monotonic installed Nimo witness, independent
crash/recovery or production reservation.

The existing dedicated AF_UNIX custody service still returns HOLD on
`reserve` and `recover`; this new proof **does not** enable either.
The production operator verified→allocation dispatcher remains unmounted.
Frozen Nimo V1 remains historically valid 8/8 in the supplied operator
read-only census; proposed V2 is a separate unaccepted inactive bundle.
Market inventory, coupled WC/VOID readiness and presale activation
are not qualified.

`production_allocation_mutation_ready=false`
`custody_reserve_method_enabled=false`
`presale_activation=false`
`funds_moved=false`

**Draft, unmerged; no live host, customer data, wallet/key, signer,
transaction, inventory, market or funds activity. PROTECT THE CORE.**
