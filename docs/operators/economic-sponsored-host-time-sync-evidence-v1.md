# Sponsored host time-sync evidence v1

Marker: `VOID_ECONOMIC_SPONSORED_HOST_TIME_SYNC_EVIDENCE_V1`

## Purpose

This source-only contract provides the read-only Linux host evidence needed
before a later sponsored-observation restart bridge may treat a wall-clock
sample as synchronized host evidence.

It does **not** continue a prior sponsored time chain, activate a runtime route,
or authorize gas sponsorship or transactions.

## Fixed host sources

The production collector accepts no caller arguments and uses only:

- `/proc/sys/kernel/random/boot_id`;
- `/proc/uptime`;
- `/usr/bin/timedatectl show --property=NTPSynchronized --value`;
- one `Date.now()` wall-clock sample.

There is no caller-selected path, command, environment, timestamp, prior
receipt, sync state, or fallback source. Fixed procfs reads are opened no-follow
and read through a bounded 257-byte buffer that rejects content above the
256-byte contract limit. The `timedatectl` child receives only a fixed
`LANG=C`, `LC_ALL=C`, `PATH=/usr/bin:/bin` environment rather than the
parent process environment.

The capture order is closed:

```text
boot_id before
  -> /proc/uptime before
  -> timedatectl NTPSynchronized before
  -> one Date.now() wall sample
  -> timedatectl NTPSynchronized after
  -> /proc/uptime after
  -> boot_id after
```

The before/after boot IDs must match exactly. Both synchronized-state queries
must return exact `yes`. Boot-relative uptime must not regress, and the
bracketed capture span must be at most 5 seconds.

The uptime parser uses exact decimal-to-nanosecond integer conversion and does
not depend on floating-point arithmetic.

## Evidence

A successful classification is content-addressed as:

```text
voideshtse1_<sha256(canonical evidence body)>
```

The body binds:

- exact boot ID;
- exact boot-relative uptime before/after in nanoseconds;
- exact capture span;
- wall-clock sample in integer milliseconds;
- synchronized-before and synchronized-after truth;
- exact fixed source paths;
- exact fixed `timedatectl` command and argument vector;
- wall-clock source identity.

This is evidence that one wall sample was bracketed by synchronized-state and
same-boot monotonic observations. It is not by itself a trusted runtime clock.

## Fail-closed behavior

Classification HOLDS on, among other cases:

- malformed or changing boot identity;
- malformed or regressing `/proc/uptime`;
- capture span above 5 seconds;
- either synchronization query reporting anything other than exact `yes`;
- command failure, signal, error, or stderr output;
- invalid wall-clock sample;
- extra or missing capture fields.

The production collector is a no-argument API. Only that fixed-source entry
point may emit `production_fixed_sources_observed=true`. Pure/test
classification and the separately named dependency-injected test collector
always emit `production_fixed_sources_observed=false` and
`test_only_injected_dependencies=true`, so synthetic evidence cannot be
mistaken for a production host capture.

Tests therefore do not turn caller-selected paths/commands/timestamps into
production authority.

## Restart boundary

This contract deliberately leaves all restart authority false.

A later reviewed restart bridge must still bind at least:

```text
exact prior durable sponsored observation receipt
+ prior process identity
+ new process identity
+ exact host time-sync evidence
+ restart generation / previous restart receipt
```

Same-boot process restart must preserve the prior accepted wall-time high-water.
Cross-boot continuation requires a separately reviewed stronger synchronization
boundary. This evidence contract does not decide either case.

## Authority boundary

Authoritative false / not proven here:

- trusted runtime clock authority;
- cross-process restart continuation;
- cross-boot continuity;
- service or clock mutation;
- runtime route/enforcement;
- gas sponsorship;
- wallet/private-key/signer access;
- transaction construction/signing/submission/broadcast;
- authoritative Chain-2050 writes;
- market/presale activation;
- inventory, treasury, liquidity, or funds movement.

## Focused proof

```bash
node --check tools/void-economic-sponsored-host-time-sync-evidence-v1.mjs
node --check scripts/prove_void_economic_sponsored_host_time_sync_evidence_v1.mjs
node scripts/prove_void_economic_sponsored_host_time_sync_evidence_v1.mjs
```

The proof is synthetic and read-only. It does not invoke the production host
collector or query the CI runner's actual synchronization state.
