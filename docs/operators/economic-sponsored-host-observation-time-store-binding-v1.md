# Sponsored host clock -> durable observation store binding v1

Marker:

\`VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_V1\`

Status: **source-only composition; default-off; no live runtime/execution authority**.

## Purpose

Issue #2458's source admission ordering is already merged. PR #3175 then added
the missing fixed Linux host trusted-clock binding, but the durable observation
store still accepts an injected \`trustedClock\` dependency and truthfully
reports:

\`\`\`text
trusted_clock_source_proven=false
trusted_clock_host_binding_proven=false
\`\`\`

This lane composes those two reviewed sources without modifying either parent.

It does not add a public route or select a production store root.

## Production constructor

The production entry point accepts exactly:

\`\`\`text
{ root_dir }
\`\`\`

It accepts no caller:

- clock function;
- timestamp;
- prior receipt;
- boot ID;
- process identity;
- host evidence;
- binding ID;
- record path; or
- fallback source.

The constructor internally hard-wires:

\`\`\`text
collectVoidEconomicSponsoredHostTrustedClockBindingV1
\`\`\`

from merged #3175 and the existing:

\`\`\`text
createVoidEconomicSystemSponsoredObservationTimeStoreV1
\`\`\`

durable store.

The supplied root is still subject to the complete existing store custody
contract. This wrapper does not bootstrap, repair, or weaken it.

## Bound preview

\`preview()\` accepts no arguments.

One operation captures exactly one #3175 host binding. The wrapper validates
its exact marker/schema/mode/authority and recomputes its content-addressed
binding ID before exposing only the exact four-field \`observation_sample\` to
the durable store clock dependency.

A successful preview requires:

- exactly one host-binding capture;
- exactly one store clock read;
- no durable mutation;
- no durable time-authority advance;
- no candidate persistence;
- returned observed wall time equal to the bound host sample; and
- a well-formed candidate durable receipt SHA-256.

The composition receipt binds the host binding ID to that candidate receipt
hash.

Hosted CI uses only #3175's explicit test-only injected collector and therefore
keeps:

\`\`\`text
production_fixed_sources_observed=false
trusted_clock_source_proven=false
trusted_clock_host_binding_proven=false
\`\`\`

It cannot manufacture a production host claim.

## Bound durable observe

\`observe()\` also accepts no arguments.

For one operation it captures the fixed host binding **once**, then freezes its
four-field sample for the whole operation:

\`\`\`text
one fixed #3175 host binding
  -> durable store preview()
       -> candidate receipt hash/generation
  -> durable store observe()
       using the same exact bound sample
  -> require persisted head hash == preview candidate hash
  -> require persisted generation == preview candidate generation
  -> require accepted observed time == bound host wall time
  -> emit composition receipt
\`\`\`

The store reads the clock twice (preview and durable observe), but both reads
return the same immutable sample from the single host capture.

This gives the source composition an exact bridge:

\`\`\`text
#3175 host binding ID
  -> exact observation sample
  -> exact preview candidate receipt hash
  -> exact persisted durable head receipt hash
\`\`\`

A changed durable head between preview and observe cannot silently become a
successful composition. Any hash/generation/time mismatch returns HOLD.

If the underlying durable store already mutated before a later wrapper
cross-check fails, the wrapper truthfully propagates that mutation state rather
than claiming rollback. This lane does not invent transaction semantics around
the append-only store.

## Provenance claims

A successful **production** composition operation may truthfully set:

\`\`\`text
trusted_clock_source_proven=true
trusted_clock_host_binding_proven=true
\`\`\`

because the production constructor exposes no injected collector and directly
invokes #3175's fixed-source production collector.

Those claims are local to the emitted composition receipt. They do **not**
promote the underlying historical store's global authority object and do not
mean hosted CI collected production evidence.

## Deliberate remaining HOLDs

Even a production GREEN composition keeps:

\`\`\`text
trusted_clock_runtime_authority=false
live_durable_receipt_storage_proven=false
receipt_store_rollback_resistance_proven=false
cross_process_restart_continuity_proven=false
cross_boot_restart_continuity_proven=false
runtime_route_active=false
runtime_enforcement_verified=false
replay_consume_performed=false
gas_sponsorship_performed=false
wallet_or_signer_access=false
private_key_access=false
transaction_construction=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
public_presale_activation=false
market_activation=false
funds_movement=false
\`\`\`

The next restart-continuity lane may consume only a fresh composition receipt
whose durable receipt identity is independently present in the admitted durable
store. Rollback/high-water and stable host-root custody remain separate gates.

## Test-only boundary

The exported test-only constructor may inject a collector solely to exercise
the composition algorithm with synthetic #3175 evidence.

Its results always retain:

\`\`\`text
production_fixed_sources_observed=false
test_only_injected_dependencies=true
trusted_clock_source_proven=false
trusted_clock_host_binding_proven=false
\`\`\`

The test-only path cannot become production authority.

## Verification

The focused proof requires:

- exact merged parent Git blobs for #3175 and the durable store/observation
  contracts;
- exact production constructor input closure;
- fixed collector wiring;
- empty-store preview with zero durable growth;
- exact preview candidate SHA-256;
- one-capture/two-clock-read durable observation;
- exact preview-candidate == persisted-head binding;
- forward generation on a second later host sample;
- caller-input rejection before host capture;
- malformed host-binding rejection before durable growth;
- all runtime/execution/economic authority fields remaining false; and
- typecheck/build plus parent proofs on Node 22/24/26.

No production host sample or production durable store is touched in CI.

PROTECT THE CORE.
