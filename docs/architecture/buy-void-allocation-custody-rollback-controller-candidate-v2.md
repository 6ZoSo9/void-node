# Buy VOID noncustomer custody rollback controller candidate V2

Status: **source and synthetic CI only — no protected host adapter, live rollback or customer/payment authority**.

This candidate is stacked on the [V2 challenge plan #3556](https://github.com/6ZoSo9/void-node/pull/3556), which has 20 inherited noncustomer durability/rollback obligations and nine additional claim/lease/transcript obligations. The existing V1 controller is immutable and intentionally rejects the V2 plan identity; substituting a V2 `plan_id` into a V1 authorization does not make V1 an authorized V2 controller.

## Exact source inheritance

- Parent head: `44271e4ebee39da49cf7ca8463fb9f2621998fad`.
- V2 plan ID: `voidbuycustodychallengeplan2_622c5cab506b8424860a484e6675f73031a26635c0ef29a80aee2281f53f0844`.
- V2 plan Git blob: `1cdecf34117e4e890f67e62b412419d32870dfa0`.
- Historical V1 controller source blob: `96d4ac3499d222841f1f7a3c53e14900b68ae8cf`; original V1 proof blob: `b196fcaa77a6bdc465baacb3387aa949f47bc956`.
- New V2 controller source blob: `abf09c1ce5540b03e39d18184858b40dac6443f1`.
- New V2 behavior proof blob: `98a0b21510e889bc2dae10d113bfd22bda4a24f1`.
- Accepted economic tree remains `71c67e62a2b21a98f3f5135ee6aa56e0ef97d262`.

## V2 authorization and replay boundary

V2 deliberately does **not** reinterpret V1 authorizations. Its separate marker, version and content IDs are:

```text
authorization_marker=VOID_BUY_VOID_CUSTODY_ROLLBACK_CHALLENGE_AUTHORIZATION_V2
authorization_version=2
authorization_id_prefix=voidbuycustodychallengeauth2_
operation_id_prefix=voidbuycustodychallengeop2_
challenge_id_prefix=voidbuycustodychallenge2_
claim_id_prefix=voidbuycustodychallengeclaim2_
operation_lease_id_prefix=voidbuycustodyoperationlease2_
evidence_origin_id_prefix=voidbuycustodychallengeorigin2_
second_control_approval_id_prefix=voidbuycustodysecondcontrol2_
evidence_transcript_marker=VOID_BUY_VOID_CUSTODY_ROLLBACK_CHALLENGE_EVIDENCE_TRANSCRIPT_V2
controller_id=void.replay.journal.rollback.controller.v2
```

The V2 evidence transcript marker and second-control approval ID prefix are
**not** accepted from the V1 controller. The V1 evidence marker/prefix were
previously reused while changing only the V2 authorization and claim IDs;
this child rejects V1 second-control ID before attempting rollback, and
binds the evidence transcript digest under its own explicit V2 marker.
These are source-protocol isolation checks, **not** authentication of
a future external approval signer or protected host adapter.

The noncustomer canary domain is intentionally unchanged: `void.buyvoid.presale.noncustomer.canary.v1`, exactly matching V2 plan requirements. The accepted economic tree, current-policy fingerprint/generation constraints and sixteen synchronous injected capability **interface names and phase order** are retained, now under the separate V2 protocol.

A forged V1→V2 `plan_id` substitution fails on the V2 marker/version boundary; a V2→V1 substitution fails in the old V1 controller. The source proof makes both checks with an instrumented capability object that must not be inspected. These are negative **source-level protocol tests**, not cryptographic authorization or authentic storage evidence.

## Lease-level replay refusal — future protected adapter obligation

The V2 plan requires replay refusal **before mutation**. In the previous
fixture the later `claim_operation_authorization_once` rejected a repeated
authorization only **after** `acquire_operation_lease` had already returned
and changed the synthetic lease state. Although no journal/high-water
mutation followed, treating that as *pre-mutation* replay denial was too broad.

This successor makes the V2 lease acquisition callback carry the explicit
request `reject_previously_claimed_authorization=true` and return the closed
field `authorization_previously_claimed=false` before it can pass to
`observe_before`. A replay-preclaimed result is a structured fail-closed
`operation_lease_replay_precondition_failed`. The fixture's lease callback
checks the prior-authorization claim set **before** creating any lease
record and denies a replay at the lease boundary. The adversarial proof
requires replay call order `["entropy","lease"]`, no created lease or claim,
and rejects missing or positive prior-claim fields. The existing later
durable one-time claim remains mandatory as the second guard against races.

**Critical limit:** A Boolean returned by an injected callback cannot prove
a real atomic check or lack of storage mutation. A future protected host
adapter must authenticate the callback and implement the prior-claim check
and exclusive lease acquisition **atomically against a durable claim/lease
store**. A standalone read-only preflight is insufficient against concurrent
replays. This source-only V2 change does *not* establish durable lease
exclusivity or customer/presale/payment authority.

## Exact terminal checkpoint coherence

The controller already rejects post-rollback high-water or witness decreases.
However, its earlier `>=` sequence checks accepted a purported *newer*
sequence with the old, unchanged tip hash, even when that new generation had
no authenticated append/lineage evidence.

This conservative successor requires the **exact** high-water sequence and
SHA-256 that `advance_high_water` returned, and the **exact** witness
sequence and SHA-256 that `append_external_witness` returned, when checking
both `observe_after_rollback` and `reobserve_storage_and_policy`. A
lower sequence still fails on the existing monotonicity HOLD. A higher
sequence, even with the previously accepted digest, instead fails on a
dedicated `*_unproven_advance` HOLD. This is deliberately stricter than
simple non-decrease and thus preserves the V2 plan's non-decrease
requirement for the exclusive-lease, noncustomer challenge.

The disposable behavioral proof rejects four adversaries: high-water and
external-witness sequence +1 with stale tip hashes at each of the
post-rollback and terminal phases. Normal exact-observation fixtures still
pass. If future operational policy admits independently advanced high-water
or witness records during a challenge, that will require a distinct
source-authenticated, append-linked, lease-aware generation proof rather
than treating a newer sequence and old hash as coherent.

This is **not** authentication of injected callbacks, proof of physical
storage isolation, a real replay-resistant journal, or permission to attempt
a protected rollback. The controller remains a source-only artifact.

## Fresh commitments for advancing journal, high-water and witness

The earlier controller already required these *sequence* advances during
`append_journal_canary`, `advance_high_water` and
`append_external_witness`. But the corresponding newly reported tip SHA-256
was only syntax-checked. A callback could claim sequence+1 while repeating
the *previous* tip SHA-256, and all later readbacks could still agree with
that stale commitment.

The source-only successor rejects unchanged tip digests **immediately after**
each corresponding callback's normal sequence and SHA validation:
`journal_append_tip_not_advanced`, `high_water_tip_not_advanced`, and
`external_witness_tip_not_advanced`. Three synthetic adversaries override
each fresh digest with the previous digest, preserving a valid sequence+1,
and assert no later callbacks run. The post-rollback and terminal exact
checkpoint checks remain unchanged; they now consume checkpoint results that
also passed this earliest fresh-tip requirement.

This is a minimal necessary consistency condition for an append challenge,
**not** proof that the resulting SHA came from new bytes, that a durable write
succeeded, or that an external witness is independent. A future protected
adapter must independently authenticate append/hash-chain provenance,
sync/close/reopen durable readback, storage isolation and claim/lease
atomicity. Source-only fixture success does not authorize a rollback or
customer/presale payments.

## Minimal high-water generation advance

During this **single noncustomer canary append** under the exclusive lease,
the high-water controller must advance to the exact smallest sequence that
covers both the canary journal append and the prior high-water position:
`Math.max(before.high_water_sequence + 1, append.journal_sequence)`.
The prior source accepted **any** larger safe integer, although the
challenge supplies no intermediate high-water append/hash-chain evidence
for skipped generations. Even an arbitrary new SHA would then be accepted
at post-rollback and terminal reobservation.

The revised V2 source preserves the original `high_water_not_advanced`
HOLD for malformed/nonadvanced numbers and adds
`high_water_unproven_sequence_skip` for a reported jump beyond that
minimal sequence. A fixture returning sequence 9 instead of the required
8—with a valid, fresh digest—must HOLD at `advance_high_water` before
any later callback runs.

This conservative exclusive-lease rule is **not** an actual high-water
append proof. Future audited catch-up through multiple genuine high-water
generations requires a separate source-authenticated sequence/hash-lineage
protocol and independently reviewed protected adapter. Nothing here grants
host execution, storage mutation or customer-facing payment authority.

## Source-only controller semantics

The candidate validates noncustomer scope, immutable source/policy identity, exact sequence headroom, one-time authorization-claim contract, operation-wide exclusive lease contract, journal/high-water durability, external witness, second-control approval, controlled rollback refusal, terminal customer-state invariants, and canonical evidence-transcript digest echo.

It retains **the old controller’s strict non-async injected callback requirement and capability order**. A fixture returning success cannot authenticate those callbacks, attest host storage, demonstrate real rollback resistance, authorize a customer charge or bypass missing independent review.

The controller is a pure standard-library Node module with no direct filesystem/process/network/systemd/wallet/signing APIs. It has no automatic execution path; importing it does not call injected capabilities or touch host state. Host adapters are entirely absent.

## Release HOLD

The V2 plan and this controller require genuinely distinct independent security review before an adapter can be considered. **No V1 callback or receipt should be accepted as V2 evidence without a future separately reviewed transport/adapter design.** Neither a plan/source CI PASS nor the protected V7 installer work qualifies this controller for host execution.

```text
source_only_candidate=true
injected_capabilities_required=true
protected_host_adapter_required=true
independent_security_review_satisfied=false
protected_host_adapter_implemented=false
operation_bound_authorization_authenticated=false
authorization_claim_authenticated=false
operation_lease_authenticated=false
operation_lease_exclusivity_proven=false
evidence_origin_authenticated=false
live_durable_storage_proven=false
rollback_resistance_proven=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
funds_movement=false
```

**PROTECT THE CORE.**
