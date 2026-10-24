# Buy VOID verified-payment operator-principal authentication source plan V1

Status: **SOURCE-ONLY HOLD**

Base source generation:

- repository: `6ZoSo9/void-node`
- head: `a3e0fdc4a9ee3c39c84f5783064c2e38f9481f97`
- tree: `4eeb6d9d382d9520b60ae9b698b1135da85b05df`
- plan ID: `voidbuyopauth1_35d73623a820ffb06acd4bf49769237ad13cf2db0ad7f40f2613229d92f2c2d1`
- plan Git blob: `8258f7ff9ddd489c483c0e6daf675c9a2a58523e`
- proof Git blob: `729302c8bbbaa5eeb647d3894c5abcec5ea239de`

## Current-main rederivation — October 22, 2026

This V1 plan has been rederived on current `main@a3e0fdc4a9ee3c39c84f5783064c2e38f9481f97`.
All **7/7** bound source Git identities match the complete current-main tree.
Only provenance changed: base head/tree, content-addressed plan ID, and the
corresponding plan/proof/document/workflow identities. The route remains
unmounted and operator/payment authority remains false.

## Purpose

The reviewed verified-payment allocation handoff already exists, but the mounted
operator verify-payment route does not call the allocation-required dispatcher.
The dispatcher also deliberately reports
`operator_principal_authenticated=false`,
`mounted_operator_route_verified=false`, and
`custody_service_composed=false`.

This plan defines the missing authentication prerequisite without changing the
router, writer, custody service, launch gate, runtime, or host.

## Current source truth

The current local operator-intent contract is a useful fail-closed boundary. It
requires:

- loopback host;
- loopback socket peer;
- a private operator bearer capability;
- POST for mutation;
- `x-void-operator-intent: VOID_BUY_VOID_OPERATOR_MUTATION_V1`;
- exact registered mutation-route identity;
- cross-site/origin rejection; and
- capability authority not sourced from query parameters, cookies or browser
  storage.

Host or peer identity alone is explicitly non-authoritative.

The current verify-payment route is intentionally held with
`buy_void_allocation_handoff_unmounted`. The current router still contains
`writeBuyVoidOperatorEventWithCapacityAdmissionV1` and does not mount
`dispatchBuyVoidOperatorEventWithAllocationRequiredV1`.

The allocation dispatcher is source-present and requires exact server-controlled
roots:

- `/var/lib/void-allocation-ledger-v1`
- `/var/lib/void-allocation-custody-v1`

Those roots must never be supplied by an HTTP query/body, browser state, or
other caller-controlled field.

The public composition gateway blocks the
`/__void/buy-void/operator` prefix. Public reachability is therefore not
operator authentication and must remain unavailable.

## Required future authentication composition

A later route-mount implementation must independently prove all requirements in
the plan, including:

1. exact mounted verify-payment route generation;
2. operator mutation authorization before event or custody authority;
3. content-bound operator bearer-credential generation;
4. loopback + socket-peer requirements that are necessary but not sufficient;
5. exact registered-route identity independent of client URL spelling;
6. POST + operator-intent header;
7. no query/cookie/body/browser-storage capability authority;
8. continued public-gateway denial of operator routes;
9. verified payments routed to the allocation-required dispatcher, never the
   legacy payment-only writer;
10. exact server-controlled ledger and high-water roots;
11. authenticated operator principal bound to the dispatcher invocation;
12. independently accepted cross-UID claim/phase/recovery contract;
13. independently accepted protected custody/high-water host evidence;
14. exact deployed artifact generation; and
15. separate payment-to-VOID delivery canary and coupled launch activation.

## Bound source identities

The plan content-binds these current sources:

- `src/index.ts` — `123ec1792a027f93d4c9030749a0e7e136a75a44`
- `src/economic/buy_void_operator_local_intent_v1.ts` — `7d1ced8dacb50fd7c7b708fd6587ed7930332bb3`
- `scripts/prove_buy_void_operator_local_intent_v1.ts` — `b62351d9e48ab1c9654b6368eb0e412305f0b899`
- `src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts` — `eb4fb37c6073415228b312663c45a99d5015c727`
- `src/economic/buy_void_verified_payment_capacity_admission_v1.ts` — `ac8bf352979e0e24d2cab45c3b23949e1bd2b026`
- `ops/public/void-public-app-composition-gateway-v1.mjs` — `b086b612fe5ee1dc1d5bcc4838d926af890d1435`
- `scripts/prove_public_app_composition_gateway_v1.mjs` — `0d6c0a6a9b0a9fba31e2632cb255c3514d65f157`

The proof also binds exact base-tree ancestry and exactly four ADD-only plan
paths.

## Authority

This plan does **not** authenticate an operator principal. It records the
requirements for doing so.

The following remain false:

- mounted verified-allocation route;
- operator-principal authentication;
- custody-service composition;
- independent private high-water custody;
- direct web-process writes to private custody roots;
- cross-UID reserve/recover/release authority;
- deployed runtime-generation acceptance;
- payment acceptance;
- presale activation;
- signing or transaction broadcast; and
- funds movement.

PROTECT THE CORE.
