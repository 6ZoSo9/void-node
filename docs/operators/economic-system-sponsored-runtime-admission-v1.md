# Sponsored runtime admission composition v1

Marker: `VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_V1`

Status: **default-off source composition; no live route and no sponsored execution**.

## Purpose

This lane composes the source-green sponsored-execution safety primitives in the
required order without crossing into transaction execution:

```text
constructor-bound reviewed launch policy artifact
  -> exact request normalization
  -> non-mutating signed candidate preflight
  -> non-mutating reservation-store structural/history preflight
  -> non-mutating trusted-time preview
  -> current signed candidate revalidation at preview time
  -> read-only durable reservation history/budget classification
       DENY -> HOLD with no durable time append
       ALLOW ->
         durable sponsored observation-time store
         -> current signed candidate revalidation at durable accepted time
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

The constructor verifies bundle shape/content but does not prove compiler
provenance. Its authority therefore keeps:

```text
reviewed_policy_compiler_proven=false
canonical_main_bundle_proven=false
```

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

## Signed candidate preflight before time mutation

A runtime candidate must have `issued_at_ms` strictly after the exact bound
bundle's `bundle_committed_at_ms`. This prevents an older economic intent from
being retroactively paired with a later sponsored-execution bundle merely
because its lower-level TTL policy ID still matches.

This check occurs before the clock is called or either durable store is touched.

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

## Reservation-store structural/history preflight after authentication

After exact request normalization and successful signed-candidate preflight, but
before trusted-time mutation, the binder invokes
`inspectEconomicSystemSponsoredReservationStoreV1({ root_dir })`.

That inspector validates the already-provisioned private root, private
`records/`, private `sponsorship-admission-v1.queue/`, and the complete stable
canonical durable-history topology. It performs no cleanup,
policy/TTL/budget evaluation, observation-time evaluation, or mutation.

The complete history scan is intentionally **after** signed-candidate
cryptographic preflight. The inspector is O(history) and may parse up to the
store's reviewed record ceiling; an unauthenticated but syntactically valid
request must not be able to force that work before signature rejection.

Therefore:

- malformed or invalid signed candidates HOLD before reservation-history scan,
  trusted clock, or time-store mutation;
- a valid signed candidate with missing/malformed reservation authority HOLDS
  after signature preflight but still before the trusted clock/time store;
- missing root/records/queue still cannot create a time receipt; and
- `reservation_store_preflight_before_time_proven=true` remains true.

The source additionally reports
`candidate_preflight_before_reservation_history_scan=true`.

This does not prove host rollback/path custody, so
`reservation_store_root_stability_proven=false` remains correct. A reservation
root that passes preflight can still disappear or be replaced before the later
durable reservation step. If that happens after the trusted-time step begins,
one valid time receipt may already be durable before reservation persistence
HOLDS. The source therefore does not claim that all post-preflight storage loss
is time-growth-free.

## Non-mutating trusted-time and budget preview

After signed preflight and structural reservation-store inspection, the binder
calls `timeStore.preview()`.

Preview stable-reads the durable time head, samples the captured clock once,
validates one candidate next time receipt, stable-reads the durable time head
again, and publishes nothing.

The runtime then re-runs current candidate verification at the preview time.

If the candidate is already expired or otherwise not current, admission HOLDS
before durable time mutation.

Next, the binder calls the read-only sponsored reservation listing API at that
same preview time. For a new sponsorship, the canonical anti-grief classifier
is run against the complete durable intent+sponsorship history.

Budget exhaustion, conflicting durable identity, malformed history, or other
canonical denial therefore HOLDS before `timeStore.observe()`.

An exact durable duplicate is handled separately: current validity is still
proved at preview time, but the full-history classifier's intentional duplicate
rejection is skipped so the positive/idempotent path may continue to
authoritative durable time and exact reservation replay.

This source therefore reports:

```text
non_mutating_time_preview_before_durable_time=true
read_only_budget_preflight_before_durable_time=true
preview_denial_does_not_advance_time=true
valid_denied_request_time_growth_bounded=true
expired_duplicate_execution_admission=false
```

## Durable trusted-time step

Only a request that is current and economically admissible at preview time may
call the durable observation-time store.

The caller still cannot supply a prior receipt or timestamp. The durable time
store reconstructs its own head and obtains a fresh observation from the
captured clock dependency. Preview time is never reused as durable authority.

If durable observation HOLDS, sponsored reservation is not attempted.

Cross-process and cross-boot continuity remain false. A process restart
therefore HOLDS instead of resetting generation zero.

## Current-time revalidation after durable observation

Preview is negative/preflight evidence only. It is not positive execution
authority.

After durable observation succeeds, the binder re-runs canonical current
candidate verification at the **durable accepted observed time** before touching
the gas reservation store.

This closes the race where a candidate is current at preview but expires before
durable observation. Such a race may create one durable time receipt, then HOLD;
a retry previews against the new durable head and rejects the expired candidate
without another durable append.

Likewise, if budget is available at preview but another concurrent admission
uses it before persistence, the later reservation-store admission HOLDS. A retry
sees the new durable budget state during preview and does not append again.

Positive paths therefore still require:

```text
durable_observe_required_after_preview_allow=true
durable_time_observation_before_reservation=true
durable_reservation_before_execution=true
```

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

A cryptographically valid/current request can still be denied by existing
durable history, including per-identity/global sponsored-gas exhaustion.

The preview/history path now proves those already-denied requests do not append
durable time authority:

```text
valid_denied_request_time_growth_bounded=true
```

This statement is intentionally narrow. It does not claim a general public
request-rate limit and does not eliminate every possible one-receipt race.

A request that appears admissible at preview can still race with expiry or a
concurrent reservation before the later durable steps. In that case at most the
positive-at-preview path can advance durable time before fail-closed
revalidation/persistence discovers the race. The next retry observes the new
durable time/history state and rejects without another append.

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
valid_denied_request_time_growth_bounded=true
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
- missing preprovisioned reservation lock queue HOLD before signature/time,
  with zero clock calls and zero time/reservation growth;
- reservation-root loss after successful structural preflight but during the
  trusted-clock step, proving one durable time receipt may advance before the
  later reservation persistence HOLD while root stability remains false;
- successful admission reports reservation structural preflight verified;
- invalid signature after structural preflight but before clock read;
- request timestamp injection before clock read;
- first preview + durable time + first durable reservation;
- exact current duplicate reservation with preview plus durable observation;
- valid global-budget denial at preview/history preflight with zero new durable
  time rows;
- expired duplicate HOLD at preview time with zero new durable time rows;
- destructive reservation-root loss during preview with zero durable time
  publication;
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
5. bind the durable execution replay store;
6. prove any remaining public request-rate/CPU/storage bounds separately; and
7. only then define the sponsored transaction execution stage.

This lane itself authorizes none of those live actions.
