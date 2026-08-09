# Buy VOID production live canary preflight v1

Marker:

`VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_V1`

## Purpose

Bind one exact Buy VOID execution attempt to the reviewed production activation
plan before any value-bearing canary is authorized.

This lane does **not** start the private production services and does **not**
authorize a live transaction. It adds a fail-closed read-only preflight above
the existing native execution runtime so one exact candidate can be inspected
without signing, broadcasting, inventory mutation, or money movement.

## Default plan

The default path is `inspect=false`.

It:

1. re-derives the exact production activation plan;
2. requires an exact lowercase 64-hex execution attempt ID;
3. requires the native execution runtime policy to remain disabled;
4. cross-binds the runtime policy to the production plan;
5. snapshots the relevant runtime configuration into a deterministic policy
   fingerprint; and
6. emits a deterministic preflight plan ID.

The default plan performs zero journal reads, zero RPC calls, zero service
starts, zero credential reads, zero signing, and zero transaction broadcast.

## Cross-component binding

A preflight plan is valid only when the disabled native execution runtime agrees
with the production activation plan on the security-critical execution surface:

- native VOID only;
- chain ID exactly `2050`;
- exact production fulfillment wallet;
- exact production loopback RPC URL;
- planner RPC request-timeout bound;
- planner RPC response-size bound;
- one execution attempt per payment;
- exactly one fulfillment-wallet allowlist entry; and
- an absolute non-root server-owned runtime journal directory.

The runtime policy fingerprint additionally binds the pool ID, native amount
cap, gas/fee caps, fee multiplier, planner RPC request timeout, planner RPC
response-size cap, runtime root, and RPC URL fingerprint.

Changing any of those values or the selected execution attempt changes the
preflight plan ID or causes the plan to hold.

## Read-only inspection gate

A read-only inspection is separate from planning and requires all three exact
operator echoes before the first journal/RPC operation:

```text
confirmation=buyVoidInspectProductionLiveCanaryPreflightV1
expected_production_activation_plan_id_sha256=<exact production plan ID>
expected_preflight_plan_id_sha256=<exact preflight plan ID>
```

Whitespace, case changes, stale values, or a different attempt fail before the
native execution runtime is invoked.

After those gates pass, the coordinator constructs a frozen runtime-policy
snapshot and invokes the existing native execution runtime exactly once with:

```text
apply=false
```

No signer or broadcaster dependency is supplied. The underlying native
execution dry run may reconstruct the selected server-owned journals and use
its existing read-only nonce/fee planner. The accepted result must still report
`dry_run`, reconstructed server journals, zero mutation, zero signing, and zero
broadcast. Any contradictory result is rejected.

The frozen snapshot is built before asynchronous inspection so later caller
mutation cannot retarget the wallet, RPC URL, RPC timeout/response-size bounds,
journal root, limits, or execution policy after the plan IDs have been approved.

## Evidence

A successful inspection emits a deterministic evidence ID over the exact
preflight plan ID and the canonicalized native-execution dry-run result.

The evidence ID is review material only. It does not authorize service start,
signing, submission, receipt handling, inventory decrement, or public closeout.

## Separate future authorities

The preflight returns the already-existing confirmations that remain relevant
to the later operational sequence:

- private-services activation:
  `buyVoidStartProductionPrivateServicesV1`
- native execution:
  `buyVoidNativeExecuteReservedPlan`

Those values are disclosed as requirements, not synthesized or exercised by
this lane. A real live canary still requires separate operational authorization
for service activation and the value-bearing native execution path.

## Authority boundary

Publication, review, or merge of this source lane performs no production I/O.

The preflight source itself never:

- starts or stops a private service;
- reads a credential;
- injects signer or broadcaster dependencies;
- signs a transaction;
- calls `eth_sendRawTransaction`;
- broadcasts a transaction;
- mutates an execution journal;
- decrements or releases inventory;
- writes the buyer-visible request journal;
- performs a public fulfilled closeout;
- deploys or restarts a service; or
- moves funds.

A future real `inspect=true` invocation can read the selected server journals and
perform the existing read-only chain-2050 nonce/fee/balance RPC checks. That
read-only operational preflight remains a separate explicit authorization.

A value-bearing canary remains a later, separately authorized operation.

## Proof

```bash
npx tsx scripts/prove_buy_void_production_live_canary_preflight_v1.ts
```

Hosted CI runs the focused proof on Node.js 22, 24, and 26 and preserves the
private-services activation proof, production RPC-readiness proof, production
activation-plan proof, native-execution runtime proof, synthetic end-to-end
fulfillment rehearsal, repository typecheck/build, and committed-range diff
hygiene.

Refs #1108.
