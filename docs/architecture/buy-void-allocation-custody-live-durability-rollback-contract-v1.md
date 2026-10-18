# Buy VOID allocation-custody live durability / rollback contract V1

Marker:
`VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_CONTRACT_V1`.

Status: **source/test/CI requirements contract only; no host challenge is
authorized or executed**.

## Purpose

#3507 correctly discovered that its allocation-custody lane cannot become GREEN
through read-only evidence alone.

The reviewed source can already establish important prerequisites:

- rollback-domain policy separation;
- live policy observation;
- authenticated external transport and witness storage;
- live remote read and append;
- external second-control domain qualification and policy binding; and
- post-cycle policy observation.

Those facts are valuable, but the current reviewed contracts deliberately keep:

```text
live_durable_storage_proven=false
rollback_resistance_proven=false
protected_high_water_custody_proven=false
independent_custody_proven=false
production_gate_ready=false
```

This V1 contract preserves that boundary and defines what a later controlled
live test would have to demonstrate before a future version may promote any of
those claims.

Parent plan:

`voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab`.

## Reviewed primitive generation

The contract binds:

- external-custody qualification blob
  `d2bc816b027d2aca0c236d9ec31d128b28159d7d`;
- rollback-independence classifier blob
  `2d5fc24498b569f20701445d6214a8ca31e4f701`;
- live rollback-policy evidence blob
  `cf40d9d4a19d138d74aee849a6c02f96ee362dbb`;
- second-control composition blob
  `97180cc03e3f1b2f9935191ac6aafe4b15307708`.

## Read-only ceiling

Read-only observation is explicitly insufficient for the terminal lane-2
claims. A future live test requires separate operation-bound authorization for
storage mutation and a controlled rollback exercise.

This PR grants neither.

## Future evidence requirements

A future versioned collector/executor must prove all of the following before a
qualifier may promote durability, rollback resistance, protected high-water
custody, or independent custody:

1. use a dedicated **non-customer canary domain**;
2. bind a fresh operation-specific authorization;
3. bind the exact current rollback policy and reviewed source generation;
4. use fresh challenge entropy whose unpredictability is evidenced;
5. append a live challenge to the replay journal;
6. advance the protected high-water state;
7. sync, close and independently reopen journal and high-water state;
8. append the resulting challenge state to the external witness;
9. perform a controlled rollback attempt through the reviewed rollback
   controller;
10. require the independent high-water second control;
11. prove the protected high-water never decreases;
12. prove stale journal state is refused after the rollback attempt;
13. prove external-witness continuity after the attempt;
14. reobserve distinct physical storage domains;
15. rebind the reviewed policy after the test;
16. prove the allocation ledger is unchanged;
17. prove customer request state is unchanged; and
18. authenticate the origin of the resulting live evidence.

The source contract additionally requires a reviewed rollback controller and
records every future requirement in one immutable requirements object.

## Why this is a separate authority gate

A rollback-resistance test is not merely a read. Even a canary-only exercise
mutates durable witness/replay state and may exercise restore or rollback
controls.

Therefore the next action is:

`SEPARATELY_AUTHORIZE_NONCUSTOMER_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_V1`.

That future authorization must be operation-bound. It must not implicitly grant
customer payment, allocation mutation, presale/WC activation, wallet/signing,
transaction, treasury/liquidity, or funds authority.

## Current authority

This PR keeps all operational authority false:

```text
host_execution_authorized=false
filesystem_read_authorized=false
filesystem_write_authorized=false
storage_mutation_authorized=false
rollback_test_authorized=false
service_mutation_authorized=false
credential_access_authorized=false
wallet_or_signer_access_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
transaction_submission_authorized=false
treasury_or_liquidity_action_authorized=false
funds_movement=false
production_host_evidence_authority=false
```

A synthetic positive proof demonstrates only that the reviewed prerequisites
are bound and the controlled challenge is required. It never promotes the
terminal custody claims.

**PROTECT THE CORE.**
