# Sponsored host trusted-clock binding v1

Marker: `VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_V1`

Status: **source-only fixed-host clock binding; no live runtime authority**.

## Purpose

The merged sponsored observation-time contract accepts an injected
`trustedClock()` sample with:

```text
boot_id
process_start_ticks
wall_time_ms
monotonic_ns
```

and deliberately keeps both `trusted_clock_source_proven=false` and
`trusted_clock_host_binding_proven=false`.

The merged host time-sync collector independently proves a fixed-source Linux
capture around one wall-clock sample, but it does not bind that capture to the
current process identity or emit the exact four-field observation-time sample.

This source contract closes only that missing **source binding**. It does not
mount the clock into the sponsored runtime and does not continue a prior durable
time chain across a process restart.

## Fixed production sources

The production entry point accepts **no arguments**.

It brackets the existing fixed host-time collector with two reads of:

`/proc/self/stat`

The process-stat reads are bounded, no-follow reads. Both must identify the
actual current PID and the exact same non-zero Linux process start ticks.

Between those two process observations, the existing host-time collector reads
only its reviewed fixed sources:

- `/proc/sys/kernel/random/boot_id`;
- `/proc/uptime`;
- `/usr/bin/timedatectl show --property=NTPSynchronized --value`;
- one `Date.now()` sample inside that reviewed collector.

The binding independently requires the host evidence to retain those exact
source paths, command arguments and closed `LANG=C`, `LC_ALL=C`,
`PATH=/usr/bin:/bin` environment.

Caller-selected paths, commands, timestamps, PIDs and process-start identities
are not production inputs.

## Boot-relative sample

The host-time evidence brackets the wall sample with exact boot-relative uptime
values. This binding narrows the accepted bracket to at most **2 seconds**.

It emits the observation-time `monotonic_ns` as:

```text
floor((uptime_before_ns + uptime_after_ns) / 2)
```

and records the conservative midpoint uncertainty:

```text
ceil(capture_span_ns / 2)
```

The binding therefore keeps the original lower/upper uptime observations and
does not pretend the midpoint is an exact kernel timestamp for the wall-clock
instruction.

The tighter two-second source bound limits midpoint uncertainty to at most one
second. The focused proof then supplies the exact four-field sample to the
canonical sponsored observation-time contract and requires it to be accepted as
a syntactically and semantically valid observation sample.

## Process-generation boundary

The process identity is read before and after the complete host-time capture.

A PID mismatch, malformed `/proc/self/stat`, zero/invalid start ticks, or a
changed start-tick generation HOLDS.

This proves only that one source-level host-clock sample is bound to one stable
process generation during its capture.

It does **not** prove process-restart continuity.

## Test-only boundary

Hosted CI never runs the production host collector.

The test-only API injects:
- the existing host-time collector's test dependencies; and
- synthetic before/after `/proc/self/stat` text.

That path always inherits
`production_fixed_sources_observed=false` and
`test_only_injected_dependencies=true`.

Synthetic CI evidence cannot become live host authority.

## Authority

This lane may establish only a reviewed source contract for producing an
observation-compatible fixed-host clock sample.

It deliberately keeps false:

```text
trusted_clock_runtime_authority=false
cross_process_restart_continuity_proven=false
cross_boot_restart_continuity_proven=false
durable_time_store_mutation=false
runtime_route_active=false
runtime_enforcement_verified=false
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

No service/clock mutation, wallet/key/signer access, transaction, Chain-2050
write, presale/WC activation, treasury/liquidity action or funds movement is
part of this PR.

## Next gate

After exact-head source acceptance, a later default-off composition may bind
this exact sample source to the durable sponsored observation-time store.

Only receipts demonstrably produced from that bound source can later become
eligible inputs to a same-boot process-restart bridge.

Cross-boot continuity remains a separate stronger gate.

PROTECT THE CORE.
