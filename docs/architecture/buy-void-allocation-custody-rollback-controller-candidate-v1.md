# Buy VOID allocation-custody rollback controller candidate V1

Marker: `VOID_BUY_VOID_ALLOCATION_CUSTODY_ROLLBACK_CONTROLLER_CANDIDATE_V1`.

Status: **source/test/CI candidate only; no host adapter and no rollback authority**.

## Purpose

#3516 proves that lane 2 cannot advance without a reviewed controller. This
candidate supplies the missing deterministic controller state machine without
adding a live Precision/Nimo execution path.

Parent challenge plan:

`voidbuycustodychallengeplan1_dd868e3fb6ebdbf894c1170d0ecc153d61e198d9c20279a05c3309957add9006`

Exact accepted economic tree remains:

`71c67e62a2b21a98f3f5135ee6aa56e0ef97d262`

No `src/economic` file is changed.

## Capability boundary

The controller imports only Node crypto/util. It has no direct filesystem,
process, systemd, socket, network, host-path, credential, wallet, signer, RPC,
or transaction API.

A future separately reviewed protected host adapter must inject exactly twelve
synchronous capabilities:

1. generate execution-time challenge entropy;
2. observe pre-challenge storage/policy/customer state;
3. append the non-customer journal canary;
4. advance protected high-water;
5. sync/close/reopen and prove durability;
6. append the external-witness event;
7. obtain high-water second-control approval;
8. attempt the controlled journal rollback;
9. observe post-rollback state;
10. attempt stale-journal replay and prove refusal;
11. reobserve storage/policy/customer state; and
12. authenticate evidence origin.

Async/thenable capabilities fail closed.

## Sequencing invariants

The controller validates a content-addressed operation record for the exact
#3516 plan, exact accepted economic tree, and fixed non-customer canary domain
`void.buyvoid.presale.noncustomer.canary.v1`. That record is **not** treated as
authenticated authority: protected origin/authentication remains a host-adapter
requirement.

The controller invokes the injected entropy capability after record validation
and requires exactly 32 bytes. This sequences the entropy requirement but does
not itself prove unpredictability or kernel entropy provenance.

The journal canary must advance exactly one sequence. High-water must advance
to at least the journal challenge sequence and may never be rolled back.

The external witness must bind the exact challenge journal/high-water pair.
Second-control approval must bind the exact rollback target and protected
high-water before the rollback capability is invoked.

The controlled rollback may target only the journal predecessor. It must report
`high_water_mutated=false`. Post-rollback observation must show:

- journal restored to the exact predecessor;
- protected high-water unchanged/non-decreasing;
- external-witness continuity retained;
- stale journal replay explicitly refused because high-water is ahead;
- distinct journal/high-water storage identities preserved;
- exact policy fingerprint/generation preserved;
- exact accepted source generation preserved;
- allocation ledger unchanged;
- customer request state unchanged; and
- authenticated evidence origin.

## Deliberate non-promotion

Even a successful synthetic candidate sequence returns:

```text
live_durable_storage_proven=false
rollback_resistance_proven=false
protected_high_water_custody_proven=false
independent_custody_proven=false
production_gate_ready=false
protected_host_adapter_required=true
host_execution_authorized=false
filesystem_read_authorized=false
filesystem_write_authorized=false
storage_mutation_authorized=false
rollback_test_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
transaction_submission_authorized=false
treasury_or_liquidity_action_authorized=false
funds_movement=false
production_host_evidence_authority=false
```

This is intentional: in-memory callback success is not proof that a protected
host adapter, operation authorization, non-customer isolation, entropy source,
rollback controller, second-control authority, storage devices, evidence origin,
or external witness were authentic.

The candidate therefore also keeps:
`operation_bound_authorization_authenticated=false`,
`non_customer_canary_isolation_proven=false`,
`challenge_unpredictability_proven=false`,
`evidence_origin_authenticated=false`, and
`injected_capabilities_authenticated=false`.

Next gate:

`BUILD_PROTECTED_HOST_CUSTODY_ROLLBACK_CONTROLLER_ADAPTER_V1`.

That adapter would cross a new authority boundary and is not implemented or
authorized here.

**PROTECT THE CORE.**
