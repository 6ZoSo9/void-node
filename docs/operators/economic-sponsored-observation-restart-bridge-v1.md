# Sponsored observation same-boot restart bridge v1

Marker:

`VOID_ECONOMIC_SPONSORED_OBSERVATION_RESTART_BRIDGE_V1`

Status: **source-only restart evidence composition; no live runtime or economic authority**.

## Purpose

The sponsored runtime admission ordering is already merged. The fixed host clock
binding and the host-clock -> durable observation-store composition are also
merged, but the durable observation contract intentionally HOLDs whenever the
process generation changes.

This bridge closes only the next source-classification boundary: proving that a
caller-supplied evidence tuple is internally consistent with a potential later
process on the **same boot** and with one exact prior durable head.

The classifier does not establish where those evidence objects came from. A
content-addressed, production-shaped object is not by itself proof that the
fixed host collector or the live durable-store inspector actually produced it.
Therefore this generation does not prove production restart continuity.

It does not modify the durable store and it does not authorize execution.

## Required evidence

The classifier accepts exactly five evidence objects:

1. the canonical prior durable sponsored observation-time receipt;
2. the exact prior host-clock/store composition receipt from the merged
   host-observation binding;
3. the exact prior host trusted-clock binding named by that composition;
4. one fresh current host trusted-clock binding; and
5. a read-only canonical durable-store inspection.

Every object is exact-schema and accessor/Proxy inputs HOLD before evidence is
read. Parent authority objects are validated as exact plain-data maps rather
than JavaScript reference identities, so a canonical JSON round-trip preserves
valid evidence shape across a process restart.

## Prior-head binding

The prior durable receipt is verified with the canonical observation receipt
verifier. The bridge then requires all of the following to identify the same
accepted head:

- composition durable receipt SHA-256 == prior receipt SHA-256;
- composition generation == prior receipt generation;
- composition accepted wall time == prior receipt observed wall time;
- composition receipt count == inspected durable receipt count;
- inspected head SHA-256/generation/time == prior receipt;
- durable receipt count == generation + 1;
- prior host binding ID == composition host binding ID;
- prior host evidence ID == composition host evidence ID; and
- prior host sample boot/process/wall/monotonic fields == prior durable receipt.

The composition and both host bindings are content-address rederived rather
than accepted by label alone.

## Same-boot restart rule

The current host binding must prove:

- the same exact boot ID as the durable prior receipt;
- a strictly newer Linux process-start-tick generation;
- boot-relative midpoint time strictly after the prior durable monotonic time;
- wall time not below the prior accepted wall time; and
- cumulative wall-vs-boot-monotonic skew, measured from the prior receipt's
  durable baseline, within the existing 5-second sponsored observation bound.

A boot change always HOLDs. Cross-boot continuity remains out of scope.

## Evidence mode versus evidence origin

The classifier requires the prior composition and both host bindings to agree on
their declared production/test evidence mode, and it rederives their
content-addressed identities. That proves shape and cross-binding consistency,
not origin custody.

This generation therefore always keeps:

```text
caller_supplied_evidence_only=true
evidence_origin_custody_proven=false
live_store_inspection_origin_proven=false
production_fixed_sources_observed=false
cross_process_restart_continuity_proven=false
```

even when the supplied objects are internally consistent with production mode.

A later protected wrapper must internally obtain the live store inspection and
current fixed host binding, and must establish admitted custody/provenance for
the prior composition/host-binding evidence before production cross-process
continuity can become true.

Hosted CI uses only the explicit test-only host binding collector and proves the
same classifier algorithm without manufacturing production authority.

## Deliberate remaining HOLDs

Every bridge receipt keeps:

```text
evidence_origin_custody_proven=false
live_store_inspection_origin_proven=false
cross_process_restart_continuity_proven=false
cross_boot_restart_continuity_proven=false
durable_time_store_mutation=false
trusted_clock_runtime_authority=false
receipt_store_rollback_resistance_proven=false
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
```

Root-path stability, rollback/high-water protection, runtime route composition,
execution replay consume, sponsored execution, and the coupled presale/WC
activation gate remain separate work.

## Verification

The focused proof:

- pins the exact merged observation, durable-store, host-binding, and
  host/store-composition source blobs;
- creates the prior durable receipt with the canonical observation contract;
- creates the prior composition with the real merged test-only composition API;
- JSON round-trips the complete evidence tuple and requires the same bridge ID;
- qualifies a same-boot changed-process restart;
- requires deterministic content-addressed bridge identity;
- rejects cross-boot evidence;
- rejects unchanged/older process generation;
- rejects non-forward boot-relative time;
- rejects wall-time regression;
- rejects cumulative skew beyond the existing 5-second bound;
- rejects a durable-store head different from the prior receipt;
- rejects revoked Proxy evidence through the bridge's bounded input error before
  array/prototype reflection;
- rejects accessor-backed top-level evidence without invoking the accessor; and
- rejects accessor-backed nested host observation samples without invoking the
  accessor before content-address verification.

No production clock, durable store, service, transaction, or funds path is
called by hosted CI.

PROTECT THE CORE.
