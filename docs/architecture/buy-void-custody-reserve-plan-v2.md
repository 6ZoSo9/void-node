# Buy VOID custody reserve first-original buyer V2 proof

## Purpose and historical preservation

This **source-only, unmounted successor** composes the reviewed
first-original buyer-wallet replay classifier from [#2739](https://github.com/6ZoSo9/void-node/pull/2739)
and its [15/15-green V2 crash replay #2740](https://github.com/6ZoSo9/void-node/pull/2740)
with the existing custody-reserve pure planner inside
[current launch integration #2675](https://github.com/6ZoSo9/void-node/pull/2675).

The frozen V1 custody-reserve proof has exact Git blob
`94596835ee781f1dcfd42ab79787787868c31841`. Its reviewed dependency
`src/economic/buy_void_verified_allocation_replay_binding_v1.ts` was
`970e686cd96b43d496c44acb4ff343a5e61e26c5`.
The new source has Git blob
`0a74a3652081c3e142d0b887676771a7ac148f32` because it now refuses
inventing an original buyer wallet from later mutable request history.

**Do not rewrite or re-pin V1 to the new blob.** The original V1 proof must
continue to fail `dependency drift` on this new source generation. The new
`scripts/prove_buy_void_custody_reserve_plan_v2.mjs` authenticates that
original V1 proof blob before running its full historical synthetic scenario
matrix with the separately qualified successor replay classifier.

## New source-only V2 assertions

1. First original request with missing, null, or empty `delivery_address`
   followed by a second full row naming the expected wallet HOLDs with
   `request_initial_delivery_address_missing` even if the matching
   `payment_verified` event exists.
2. All three same false-first-original cases also HOLD if a matching canonical
   allocation row already exists. Neither verified event nor allocation can
   backfill the original buyer's missing wallet.
3. A genuine original buyer wallet can remain fixed while transaction hash
   and receive address are legitimately bound afterward; planning yields the
   same deterministic allocation as the equivalent fully populated first row.
4. All original pure-planner launch lineage, duplicate, global pending-payment
   gap, canonical allocation, identical replay, capacity and no-funds tests
   remain inherited unchanged from the frozen V1 proof except for the reviewed
   replay-source dependency pin and versioned positive/negative additions.

The V2 workflow explicitly **requires** the old V1 refusal on new source and
the new V2 positive proof in separate steps. Node 22/24/26 independently
compile and run from exact PR head, upload deterministic review receipts
and require full cross-version byte equality. That evidence is a source-only
synthetic qualification and does not make old V1 checks green.

## Production authority remains false

The custody planner remains unmounted and read/write-free. It accepts
caller-provided in-memory bytes in its pure test, not authenticated private
fsynced customer history. It does not install the custody high-water lock/fence,
Nimo V2 witness, signer, actual allocation-reservation persistence, source
finality, operator authorization or WC/VOID coupled presale.

The report requires
`descriptor_bound_reads=false`,
`custody_reserve_method_enabled=false`,
`allocation_write=false`,
`production_allocation_mutation_ready=false`,
`presale_activation=false` and
`funds_movement=false`.

Keep **Draft/unmerged** pending exact-head CI and independent review. No real
host, service, wallet/key/signer, customer records, RPC, transaction, 2050
chain, Work Credit, token inventory, treasury/liquidity or funds action.

**PROTECT THE CORE.**
