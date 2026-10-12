# Economic intent TTL and caps policy v1

Marker: `VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_V1`

Status: source-only admission and expiry policy. This contract does not create,
release, execute, or settle an economic intent and has no wallet, signer,
transaction, Chain-2050, inventory, market, presale, or funds authority.

## Purpose

Unpaid economic instructions must not reserve execution capacity, gas budget, or
inventory indefinitely.

This policy closes the source mechanism for:

- finite intent expiry;
- a finite per-identity outstanding-intent cap;
- a finite global outstanding-intent cap;
- deterministic exclusion/release of expired reservations; and
- deterministic late-payment handling without automatic resurrection.

## No invented production values

The source contract does **not** choose the production TTL or cap values.

A future launch policy must supply exact content-addressed values for:

- `intent_ttl_seconds`;
- `per_identity_max_outstanding`; and
- `global_max_outstanding`.

Those values must be positive safe integers and
`global_max_outstanding >= per_identity_max_outstanding`.

The TTL is additionally bounded by the existing signed-submission maximum,
currently `300` seconds. That is an inherited safety ceiling, not the selected
production TTL.

The policy contract therefore records:

```text
production_ttl_value_hardcoded=false
production_cap_values_hardcoded=false
exact_launch_policy_values_required=true
```

## Admission

A concrete launch policy must be committed before any reservation it governs.

Every pending unpaid intent binds:

- one content-addressed policy ID;
- one coupled launch ID;
- one participant/identity ID;
- one unique reservation ID;
- issue time;
- exact policy-derived expiry; and
- `state=pending_unpaid`.

The pre-admission classifier counts only still-live reservations at an explicit
caller-supplied observation time. It refuses another admission when either the
identity cap or global cap has already been reached.

The verifier does not read wall-clock time and does not create a reservation.

## Expiry

An intent is outstanding only while:

```text
observed_at_ms < expires_at_ms
```

At the expiry boundary and afterward it is no longer counted against either cap
and its reservation is marked as requiring deterministic release.

Expiry is exact:

```text
expires_at_ms = issued_at_ms + intent_ttl_seconds * 1000
```

No caller-selected per-intent extension is accepted.

## Late payment

A payment observed before expiry is only classified as eligible to continue the
normal settlement path.

A payment observed at or after expiry is classified:

```text
action=reconcile_without_automatic_execution
automatic_execution_allowed=false
expired_reservation_release_required=true
new_reservation_required_for_late_execution=true
```

Even before expiry, this source module never grants automatic execution
authority; it only reports normal-settlement-path eligibility.

## Coupled-gate meaning

The coupled candidate may mark
`economic_intent_ttl_and_caps_ready=true` once it binds this exact source
policy contract.

That means the source mechanism and required launch-policy shape are ready. It
does **not** mean:

- production TTL/cap values have been selected;
- runtime enforcement has been observed;
- reservations have been mutated or released;
- a payment has been observed;
- an economic transaction may execute; or
- funds may move.

The concrete launch artifact must still commit the actual values before
admission.

## Authority boundary

All of these remain false:

- wall-clock read;
- runtime enforcement;
- reservation mutation;
- payment observation;
- wallet/signer/private-key access;
- transaction construction/signing/submission/broadcast;
- authoritative Chain-2050 write;
- inventory funding;
- liquidity movement;
- market activation;
- public presale activation; and
- funds movement.

Verification:

```bash
node scripts/prove_void_economic_intent_ttl_caps_policy_v1.mjs
```
