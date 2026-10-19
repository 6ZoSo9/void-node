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

A future separately reviewed protected host adapter must inject exactly fourteen
synchronous capabilities:

1. generate execution-time challenge entropy;
2. observe pre-challenge storage/policy/customer state;
3. durably claim the exact operation authorization once;
4. append the non-customer journal canary;
5. advance protected high-water;
6. sync/close/reopen and prove durability;
7. append the external-witness event;
8. obtain high-water second-control approval;
9. attempt the controlled journal rollback;
10. observe post-rollback state;
11. attempt stale-journal replay and prove refusal;
12. reobserve storage/policy/customer state;
13. revalidate the exact authorization claim after rollback; and
14. authenticate evidence origin.

Async/thenable capabilities fail closed.

All closed object inputs reject Node Proxy objects before any `Array.isArray`
classification. Revoked object and revoked array proxies therefore produce the
controller's namespaced shape rejection rather than escaping as incidental
engine `TypeError`.

## Sequencing invariants

The controller validates a content-addressed operation record for the exact
#3516 plan, exact accepted economic tree, fixed non-customer canary domain
`void.buyvoid.presale.noncustomer.canary.v1`, and expected current policy
fingerprint/generation. The first observation must match that policy record.
The record is **not** treated as authenticated authority: protected
origin/authentication remains a host-adapter requirement.

The controller invokes the injected entropy capability after record validation
and requires exactly 32 bytes. This sequences the entropy requirement but does
not itself prove unpredictability or kernel entropy provenance.

After the exact current policy observation and sequence-headroom checks, but
before the journal canary append, the controller requires a durable create-once
claim for the exact authorization. The claim binds the authorization ID,
operation ID, fresh challenge ID, plan, expected policy fingerprint/generation,
and reviewed source tree. An already-claimed authorization HOLDs before journal,
high-water, witness, or rollback mutation. Retrying a failed/contended challenge
therefore requires a newly authorized operation rather than reuse of the prior
authorization. The claim ID is also bound into terminal evidence-origin
authentication.

The protected adapter must keep the authorization claim outside the journal
rollback authority (or in a separately protected rollback-resistant domain).
The controlled rollback request carries the exact claim ID and must report
`authorization_claim_mutated=false`. After the terminal journal/high-water/
external-witness reobservation, the controller revalidates the exact same
authorization ID, operation ID, challenge ID and claim ID with `present=true`
before evidence-origin authentication. A missing or changed claim HOLDs; the
challenge cannot report GREEN after erasing its own one-time replay fence.

The journal canary must advance exactly one sequence. High-water must advance
to at least the journal challenge sequence and may never be rolled back.

Before the create-once authorization claim—and therefore before any journal,
high-water, witness, or rollback mutation—the observed journal, protected
high-water, and external-witness sequence counters must each have representable
headroom below `Number.MAX_SAFE_INTEGER`. An exhausted counter HOLDs before
the claim. Capability-returned sequence values are revalidated as safe integers.

Policy generation is a canonical positive decimal string bounded to
`1..18446744073709551615` (uint64); a merely 20-digit decimal is not sufficient.

The sync/close/reopen checkpoint must preserve host, both physical storage IDs,
policy fingerprint/generation, accepted source tree, allocation-ledger hash,
customer-request hash, and the pre-challenge external-witness generation.
The post-rollback checkpoint must preserve those same bindings while carrying
the challenge witness and protected high-water generation. The terminal
checkpoint repeats the binding check and also requires the journal to remain at
the rolled-back predecessor after stale-replay refusal.

The external witness must bind the exact challenge journal/high-water pair.
Second-control approval must bind the exact rollback target and protected
high-water before the rollback capability is invoked.

The controlled rollback may target only the journal predecessor. It must report
`high_water_mutated=false` and `authorization_claim_mutated=false`. Post-rollback
observation must show:

- journal restored to the exact predecessor;
- protected high-water unchanged/non-decreasing;
- external-witness continuity retained;
- stale journal replay explicitly refused because high-water is ahead;
- terminal reobservation still shows the journal at the exact rolled-back
  predecessor after that refusal;
- distinct journal/high-water storage identities preserved;
- exact policy fingerprint/generation preserved;
- exact accepted source generation preserved;
- allocation ledger unchanged;
- customer request state unchanged; and
- exact one-time authorization claim still present after rollback; and
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
`authorization_claim_authenticated=false`,
`operation_bound_authorization_authenticated=false`,
`non_customer_canary_isolation_proven=false`,
`challenge_unpredictability_proven=false`,
`evidence_origin_authenticated=false`, and
`injected_capabilities_authenticated=false`.

Next gate:

`VERSION_CHALLENGE_PLAN_FOR_AUTHORIZATION_CLAIM_THEN_BUILD_PROTECTED_HOST_ADAPTER_V1`.

The immutable #3516 V1 plan still enumerates its original 20 future-evidence
requirements. This hardened controller adds a stricter one-time-claim and
post-rollback claim-survival requirement. A versioned successor must bind that
stronger requirement and obtain a new content-addressed plan/contract identity
before any protected host adapter is built. Do not silently reinterpret the V1
plan ID as carrying these later semantics.

The later adapter would cross a new authority boundary and is not implemented
or authorized here.

**PROTECT THE CORE.**
