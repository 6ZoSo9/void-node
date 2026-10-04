# Sponsored runtime admission composition v1

Marker: `VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_V1`

Status: **default-off source composition; no live route and no sponsored execution**.

## Purpose

This lane composes the source-green sponsored-execution safety primitives in the
required order without crossing into transaction execution:

```text
constructor-bound reviewed launch policy artifact
  -> non-mutating signed candidate preflight
  -> durable sponsored observation-time store
  -> current signed candidate revalidation at accepted time
  -> durable sponsored-gas reservation store
  -> return source admission result
  -> STOP before sponsored execution
```

It is stacked on the durable observation-time store. It does not mount a public
route, sponsor gas, consume the execution replay store, or submit a transaction.

## Constructor authority

The constructor captures exactly:

- one compiled WC/VOID coupled-launch policy bundle;
- one expected `bundle_id`;
- one injected clock dependency;
- one pre-provisioned observation-time store root;
- one pre-provisioned sponsored-reservation root; and
- one exact allowed-target list.

Requests cannot replace any of those values.

The two authority roots must be absolute and path-disjoint.

## Bundle verification

The compiled bundle is recursively snapshotted from own enumerable data
properties only. Proxy/accessor/function/non-canonical values HOLD.

The complete production bundle key set is required.

The constructor:

1. requires production bundle marker/schema/version;
2. requires canonical coupled-launch ID;
3. requires the exact constructor-bound expected `bundle_id`;
4. recomputes the canonical SHA-256 content address over the entire bundle body;
5. requires the canonical source authority object and explicit false activation
   flags;
6. recomputes the nested TTL/caps policy ID;
7. recomputes the nested sponsored-execution policy ID; and
8. runs the existing TTL and sponsored-policy semantic verifiers against empty
   history before any time-store mutation.

The constructor deliberately reports:

```text
full_policy_bundle_semantics_reexecuted=false
expected_policy_bundle_external_authority_proven=false
```

It does not re-run the production policy compiler or prove that the configured
expected bundle ID came from live launch authority. A later runtime/config gate
must bind that ID to the reviewed activation generation.

## Request shape

The admission request contains exactly:

```text
candidate_intent
candidate_sponsorship
signed_intent
calldata
signature
```

There is no request field for:

- observation time;
- prior time receipt;
- policy;
- policy bundle;
- allowed targets;
- replay-store state;
- gas budget overrides.

Nested candidate objects are snapshotted before direct field access.

## Preflight before time mutation

Before touching the durable time store, the binder reuses the canonical
anti-grief classifier against empty history at the signed intent's own issuance
time.

This validates:

- intent/sponsorship content-addressed identities;
- policy bindings;
- signature;
- calldata hash;
- target allowlist;
- gas-limit binding;
- economic-intent lifetime binding; and
- per-intent policy admissibility.

The preflight uses a fresh non-authoritative replay set only for cryptographic
shape verification. It does **not** replace the later execution replay store.

A malformed signature, calldata, target, request shape, policy binding, or
candidate identity therefore HOLDs before the clock is called and before a
durable time receipt can be created.

## Durable trusted-time step

Only after preflight does the binder call the durable observation-time store.

The caller cannot supply a prior receipt or timestamp. The time store
reconstructs its own durable head and obtains one observation from the captured
clock dependency.

If the time store HOLDS, sponsored reservation is not attempted.

Cross-process and cross-boot continuity remain false. A process restart
therefore HOLDS instead of resetting generation zero.

## Current-time revalidation

The issuance-time preflight proves cryptographic validity without consuming time
authority. It is not sufficient for current execution eligibility.

After the durable time observation succeeds, the binder re-runs the canonical
candidate verification at the **accepted observed time** before touching the gas
reservation store.

This is critical for duplicate history: a durable sponsorship remains valid
historical evidence after TTL expiry, but an expired signed intent must not be
returned as execution-eligible merely because its reservation already exists.

Therefore:

```text
expired_duplicate_execution_admission=false
```

An expired duplicate advances the durable time chain, then HOLDS before the
reservation/execution-success path.

## Durable gas reservation

Only a currently valid candidate reaches
`persistEconomicSystemSponsoredReservationV1(...)`.

The exact accepted time from the durable time store is supplied as
`observed_at_ms`.

Success requires the reservation store to return exactly:

- `reserved`; or
- `duplicate`.

No transaction/execution stage follows in this lane.

## Crash and retry semantics

The two durable stores are separate serialized authorities.

A crash after time publication but before gas reservation may leave an extra
valid time receipt. A retry continues from that durable time head and then
attempts the reservation.

A crash after gas reservation but before response may cause a later request to
advance time again and receive exact `duplicate` reservation status.

This is safe for gas accounting but is not a single atomic transaction across
both stores.

## Valid denied requests

A cryptographically valid/current request can still be denied by the durable
reservation store because existing history exhausts the identity/global budget.

Such a request may already have appended one durable time receipt.

The source contract therefore keeps:

```text
valid_denied_request_time_growth_bounded=false
```

Live exposure requires a separately reviewed request-rate/storage-growth bound.
The source lane does not hide this denial-of-service boundary.

## Additional HOLDs

The source authority keeps all of these false:

```text
full_policy_bundle_semantics_reexecuted=false
expected_policy_bundle_external_authority_proven=false
allowed_targets_external_authority_proven=false
trusted_clock_source_proven=false
cross_process_restart_continuity_proven=false
cross_boot_restart_continuity_proven=false
time_store_rollback_resistance_proven=false
reservation_store_root_stability_proven=false
reservation_store_preflight_before_time_proven=false
valid_denied_request_time_growth_bounded=false
execution_replay_store_bound=false
runtime_route_active=false
runtime_enforcement_verified=false
gas_sponsorship_performed=false
transaction_construction=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

## Focused proof

```bash
npm run build
node scripts/prove_void_economic_system_sponsored_observation_time_store_v1.mjs
node scripts/prove_void_economic_system_sponsored_reservation_store_v1.mjs
node scripts/prove_void_economic_system_sponsored_runtime_admission_v1.mjs
git diff --check
```

The runtime proof covers:

- bundle-ID mismatch;
- whole-bundle digest tamper;
- overlapping authority roots;
- invalid signature before clock read;
- request timestamp injection before clock read;
- first durable time + first durable reservation;
- exact duplicate reservation;
- valid global-budget denial after durable time;
- explicit denied-request time growth;
- expired duplicate HOLD after current-time revalidation;
- caller policy override rejection;
- process-restart HOLD with no new time/reservation row;
- accessor request rejection without getter execution; and
- static scan for transaction/RPC/systemd execution surfaces.

## Next gates

Before any live sponsored execution:

1. bind the expected policy bundle ID and allowed-target list to reviewed launch
   generation authority;
2. prove host clock trust and restart continuity;
3. prove rollback-resistant time-store custody;
4. prove reservation-store host/root stability;
5. bound valid-denied request time-store growth;
6. bind the durable execution replay store; and
7. only then define the sponsored transaction execution stage.

This lane itself authorizes none of those live actions.
