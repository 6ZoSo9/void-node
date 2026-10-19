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

A future separately reviewed protected host adapter must inject exactly sixteen
synchronous capabilities:

1. generate execution-time challenge entropy;
2. acquire the exact operation-wide exclusive lease;
3. observe pre-challenge storage/policy/customer state under that lease;
4. durably claim the exact operation authorization once under that lease;
5. append the non-customer journal canary;
6. advance protected high-water;
7. sync/close/reopen and prove durability;
8. append the external-witness event;
9. obtain high-water second-control approval;
10. attempt the controlled journal rollback;
11. observe post-rollback state;
12. attempt stale-journal replay and prove refusal;
13. reobserve storage/policy/customer state;
14. revalidate the exact authorization claim after rollback;
15. revalidate the exact operation lease after rollback; and
16. authenticate evidence origin.

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

## Operation-wide lease binding

After challenge entropy is derived and before the first storage/policy observation,
the controller requires a single operation-wide lease capability. The lease record
must bind the exact authorization ID, operation ID, challenge ID, plan, expected
policy fingerprint/generation, and reviewed source tree, and must report an opaque
`voidbuycustodyoperationlease1_<sha256>` lease ID with `acquired=true` and
`exclusive=true`.

That same lease ID is passed to and echoed by every subsequent capability and
observation: current-state observation, one-time claim, journal append, high-water
advance, durability reopen, external witness, second control, rollback,
post-rollback observation, stale-replay attempt, terminal reobservation, claim
revalidation, lease revalidation, and evidence-origin authentication. A changed
lease ID at any stage HOLDs.

Before evidence-origin authentication the controller requires terminal lease
revalidation with the exact authorization/operation/challenge/lease tuple still
present and exclusive. Lease acquisition and terminal revalidation are included
in the controller-computed canonical evidence transcript digest.

This closes the source-level TOCTOU seam where individually valid callbacks
could otherwise describe a self-consistent transcript while external host state
changed between callbacks. It does **not** prove that an injected future adapter
actually owns an OS/kernel lock or that the lease provider is authentic. Those
remain protected-adapter responsibilities, so
`operation_lease_authenticated=false` and
`operation_lease_exclusivity_proven=false` remain deliberate.

## Evidence-origin transcript digest binding

Before evidence-origin authentication, the controller canonicalizes the complete
validated challenge transcript: authorization, challenge identity, pre-challenge
observation, one-time claim, canary append, protected high-water advance,
sync/close/reopen observation, external witness, second-control approval,
controlled rollback result, post-rollback observation, stale-replay refusal,
terminal reobservation, and post-rollback claim revalidation.

The controller computes `controller_evidence_sha256` from that canonical
transcript and passes the exact digest to `authenticate_evidence_origin`.
The origin capability must return that same digest. A different but syntactically
valid SHA-256 fails closed at `evidence_origin_digest_mismatch`.

This proves only that the capability report is bound to the controller transcript.
It does not authenticate the injected capability, host adapter, entropy source,
or storage devices. Therefore `evidence_origin_authenticated=false` and
`injected_capabilities_authenticated=false` remain unchanged until a future
distinctly reviewed protected adapter proves those authorities.

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
`operation_lease_authenticated=false`,
`operation_lease_exclusivity_proven=false`,
`operation_bound_authorization_authenticated=false`,
`non_customer_canary_isolation_proven=false`,
`challenge_unpredictability_proven=false`,
`evidence_origin_authenticated=false`, and
`injected_capabilities_authenticated=false`.

Next gate:

`VERSION_CHALLENGE_PLAN_FOR_CLAIM_TRANSCRIPT_AND_OPERATION_LEASE_THEN_BUILD_PROTECTED_HOST_ADAPTER_V1`.

The immutable #3516 V1 plan still enumerates its original 20 future-evidence
requirements. This hardened controller adds stricter one-time-claim, post-rollback
claim-survival, canonical transcript-digest, and operation-wide lease requirements.
A versioned successor must bind those stronger requirements and obtain a new
content-addressed plan/contract identity
before any protected host adapter is built. Do not silently reinterpret the V1
plan ID as carrying these later semantics.

The later adapter would cross a new authority boundary and is not implemented
or authorized here.

**PROTECT THE CORE.**
