# Buy VOID payment→allocation production HOLD — current-main source proof V1

This **source-only, nonauthorizing** proof is stacked on exact current-main
integration [Draft #2675](https://github.com/6ZoSo9/void-node/pull/2675),
reviewed head `aa39d97c13f9ee18da19a6c0dda377925ad66dcf`. It does not make that integration Ready, green,
deployed, or payment-capable.

## Why a source-only HOLD is required

The current integration composes V6 finality, checked compiled-V4 identity,
bearer-protected POST operator endpoints, the durable verified-payment to
allocation handoff, corrected canonical status recount, and the **unmounted**
operator allocation dispatcher. However the real authenticated operator route
still calls the lower-level payment-capacity writer rather than the complete
payment→allocation handoff; a payment can therefore be durably verified by the
old route without creating the required allocation reservation.

The separate privilege-protected custody service also retains
`reserve_method_enabled=false`, independently authenticated original
payment provenance false, and explicit reserve/recover rejection. No principal
from the web process is authorized to write protected allocation/high-water
roots directly. [Cross-UID source census #2680](https://github.com/6ZoSo9/void-node/pull/2680)
additionally documents that current coupled-launch external anchors are
derived from `os.userInfo().homedir`, which differs between public operator
and custody service accounts. A shared DATA_DIR/HOME field alone does not
bind the independent launch lease, protected high-water, or original payment.

## What the proof actually checks

`scripts/prove_buy_void_current_main_launch_hold_v1.mjs` pins five exact
reviewed **source Git blob identities** as observed on #2675:

- `src/index.ts` — `f0c1292f26cbe3f9c6bc64dfc824cd616a9a7048`.
- `src/economic/buy_void_verified_payment_capacity_admission_v1.ts`
  — `f591f7407d9afc2cf77e0f90923aa11b4817fd4e`.
- `src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts`
  — `56cc3d4089f870868222328d9b56dd91415974a0`.
- `tools/void-buy-allocation-custody-service-v1.mjs`
  — `a53ed0c6c506b3c30a5d219a72295740b7a6761f`.
- `src/economic/buy_void_coupled_launch_gate_v1.mjs`
  — `e0402744ae51bb7bda2dc1e2038aae217d868ed9`.

The CI script uses a bounded descriptor read and exact Git-blob hash within a
trusted temporary Actions checkout; it is *not* a proof against hostile
ancestor mounts on a live host. It additionally requires the reviewed
integration head to be an ancestor, with zero content diff on those exact five
source paths. Any future source change forces HOLD/re-review, not automatic
promotion based on old CI.

`--self-test` keeps all work in memory and falsifies five unsupported claims:
silently mounting the dispatcher, enabling reserve, claiming payment
provenance bound, promoting dispatcher mount authority, or pretending a
different OS HOME-based launch anchor is equivalent.

`--census` outputs deterministic JSON that truthfully marks all production,
deployed, reserve/recover, custody/payment, cross-UID and presale
**qualification** flags FALSE.
An exact-head Node22/24/26 workflow independently compares all three
source-only receipts byte-for-byte without contacting an endpoint.
No live process, service state or current public presale traffic is observed;
these receipts are restricted to reviewed source-generation authority.

## What future promotion requires

A **separate** reviewed privilege-separated custody service successor must:
- bind the canonical FIRST original buyer, quote, native-USDC verified payment,
  durable payment event and coupled-launch generation;
- read independent signing/activation lease and external anchor correctly
  across identities, preserving protected antirollback high-water;
- serialize exact payment→allocation / crash replay without duplication or
  wrong-buyer allocation; keep the public node from private custody writes;
- require reviewed operator principal authentication, deployed source and
  effective ingress isolation before enabling a state-changing route.

This is not authorization to create/rotate keys, provision services, inspect
live customer ledgers, mount operator routes, accept money, sign transactions,
broadcast, modify Chain2050/Work Credit or activate presale/market.

**A green source HOLD test explicitly means launch is NOT ready.**

**PROTECT THE CORE.**
