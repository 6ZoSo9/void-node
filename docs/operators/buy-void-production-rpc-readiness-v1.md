# Buy VOID production RPC readiness v1

Marker:

`VOID_BUY_VOID_PRODUCTION_RPC_READINESS_V1`

Decision:

`EXPLICIT_READ_ONLY_CHAIN2050_IDENTITY_PROBE_BOUND_TO_EXACT_PRODUCTION_PLAN`

## Purpose

Add the next production-readiness boundary after the merged source-only
production activation plan.

This lane may perform exactly one class of live operation when separately
invoked with explicit apply authority: a read-only chain identity probe against
the plan-bound loopback RPC endpoint.

It does not start either private service and cannot submit a transaction.

## Dry-run boundary

Dry run is the default.

It revalidates the full `BuyVoidProductionActivationPlanV1` policy and returns:

- the exact deterministic production plan ID;
- chain ID `2050`;
- normalized loopback RPC URL and its fingerprint;
- the exact readiness-probe confirmation; and
- the exact plan ID that must be echoed on apply.

Dry run performs zero RPC calls.

## Explicit apply boundary

An applied readiness probe requires both:

```text
confirmation=buyVoidProbeProductionChain2050RpcReadinessV1
expected_plan_id_sha256=<exact dry-run plan ID>
```

Wrong confirmation fails before plan validation can reach any probe.

A missing, malformed, stale, or different plan ID fails before any probe.

This prevents a configuration change between dry-run review and the later
readiness call from silently probing a different endpoint or authority bundle.

## Read-only RPC primitive

The lane reuses:

`probeBuyVoidNativeChain2050BroadcasterV1(...)`

from the merged native chain-2050 broadcaster source.

That primitive sends only:

`eth_chainId`

and requires the response to equal chain ID `2050`.

The readiness wrapper additionally requires:

- the returned marker/version/status to be exact;
- `mutation_performed=false`; and
- the probed RPC URL fingerprint to equal the production plan's exact RPC URL
  fingerprint.

A wrong chain, malformed result, transport failure, or fingerprint mismatch is
held.

## What this does not do

Even on explicit apply this lane does not:

- construct or start the credential-backed custodian;
- construct or start the submission-capable broadcaster;
- read a production credential;
- sign a transaction;
- call `submit_once`;
- call `eth_sendRawTransaction`;
- inspect or reconcile a transaction;
- decrement inventory;
- emit a fulfilled projection;
- deploy or restart a service;
- mutate Work Credits or validators; or
- move funds.

## Synthetic proof

The focused proof first injects a fake probe to establish:

- dry run invokes zero probe calls;
- wrong activation confirmation invokes zero probe calls;
- wrong plan ID invokes zero probe calls;
- an exact applied decision returns ready only after one successful probe; and
- a mismatched RPC fingerprint is held.

The proof then invokes the real merged
`probeBuyVoidNativeChain2050BroadcasterV1(...)` with an injected synthetic
JSON-RPC transport. It records every requested method and requires the exact
method list to be:

```text
eth_chainId
```

The synthetic transport also returns chain ID `1` in an adversarial case and
the wrapper must hold that result.

No real network request is made by the proof.

## Relationship to production activation plan

The merged production activation plan remains authoritative for:

- same private custody store across custodian and broadcaster;
- wallet-derived expected signer fingerprint;
- distinct private paths;
- chain ID `2050`; and
- normalized loopback HTTP RPC policy.

This readiness lane does not accept a caller-authored ready-plan object. It
accepts the original policy and re-derives the exact plan each time, preventing
a forged or stale plan object from substituting for current policy truth.

## Authority boundary

Source, proof, documentation, CI, and source-review actions are safe without
production access.

A future invocation with `apply=true` is an operational read-only RPC action and
therefore remains separately authorized from source publication/merge.

Production service activation, production credential/signing use, transaction
submission, receipt acceptance, terminal closeout, and any live purchase canary
remain later separate explicit operational gates.
