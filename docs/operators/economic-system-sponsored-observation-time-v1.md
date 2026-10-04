# Sponsored observation time contract v1

Marker: `VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_V1`

Status: **pure source contract; stacked on #2454; no durable time store and no runtime activation**.

## Purpose

#2454 correctly accepts explicit `observed_at_ms` for deterministic sponsored-gas accounting and explicitly reports that such time is not trusted production authority.

This lane defines the next narrow contract: how a runtime binding must obtain one server-controlled time observation without accepting a request timestamp, how successive observations must move forward within one process instance, and what must happen on restart.

It deliberately does not wire a live route and does not persist time receipts yet.

## Injected clock dependency

The binding is created with one function:

```text
trustedClock() -> {
  boot_id,
  process_start_ticks,
  wall_time_ms,
  monotonic_ns
}
```

The binding input is descriptor-snapshotted before the function reference is
captured, so an accessor cannot execute while supplying the clock dependency.
Clock-provider exceptions are mapped to the stable
`sponsored_observation_time_clock_read_failed` HOLD code; provider error text is
not exposed through the decision.

Each `observe(...)` call:

1. validates the prior receipt before any clock read;
2. invokes the captured clock exactly once;
3. descriptor-snapshots the returned sample without invoking getters;
4. validates the sample;
5. either creates the genesis source receipt or checks exact forward continuity.

No request field can provide `observed_at_ms`, wall time, monotonic time, boot ID, or process identity.

The source contract itself does not call `Date.now()`, `process.hrtime`, filesystem APIs, systemd, RPC, or network APIs.

## Receipt

Each accepted source observation creates a content-addressed receipt containing:

```text
schema
marker
version
generation
previous_receipt_sha256
boot_id
process_start_ticks
baseline_wall_time_ms
baseline_monotonic_ns
observed_at_ms
monotonic_ns
wall_monotonic_skew_allowance_ms
receipt_sha256
```

Generation zero has no previous receipt. Later generations chain exactly to the prior receipt SHA-256.

A supplied prior receipt is not accepted merely because its content-addressed
SHA-256 is self-consistent. Parsing re-validates the same receipt-level
producibility invariants: positive process-start identity, generation-zero
baseline equality, strict monotonic advance above the baseline for later
generations, and the cumulative wall-vs-monotonic skew ceiling from the
generation-zero baseline. A fully rehashed but semantically impossible prior
receipt therefore HOLDS before the clock provider is called.

The receipt is source evidence only. This lane does not prove durable receipt storage.

## Same-process monotonic rule

For the same `boot_id` and `process_start_ticks`:

- `monotonic_ns` must increase strictly;
- wall time may not move backward;
- generation zero fixes one immutable wall/monotonic baseline;
- every later receipt carries that exact baseline unchanged; and
- cumulative wall elapsed versus cumulative monotonic elapsed from that baseline
  must stay within the fixed v1 fail-closed tolerance of 5000 ms.

Using the generation-zero baseline is deliberate. A per-step-only skew check
would allow repeated near-threshold wall-clock jumps to ratchet accepted time
arbitrarily ahead of monotonic time.

The 5000 ms value is a source safety ceiling, not an economic parameter and not a trade minimum. If the wall clock diverges farther from the monotonic clock, sponsored-time admission HOLDS.

## Restart behavior

This first contract intentionally fails closed on:

- boot ID change; or
- process start-tick change.

It therefore proves a safe restart behavior: **no expired sponsored-gas budget can be released across a process/boot transition until a later gate establishes trusted restart continuity**.

A later host/runtime lane must bind an external synchronized wall-time authority before starting a new time chain or advancing beyond a durable prior high-water.

## Trust boundary

Positive source results still report:

```text
trusted_clock_source_proven=false
trusted_clock_host_binding_proven=false
cross_process_restart_continuity_proven=false
cross_boot_restart_continuity_proven=false
durable_receipt_storage_proven=false
runtime_enforcement_verified=false
gas_sponsorship_performed=false
```

The name `trustedClock` describes the dependency role expected by the later runtime binder; this pure source lane does not prove that a particular host function deserves that trust.

## Request/accessor safety

The request object and clock sample are snapshotted from own enumerable data descriptors only.

Accessor properties, prototypes other than plain/null objects, symbols, missing keys, or extra keys HOLD.

A malformed prior receipt HOLDS before the clock is called.

## Authority boundary

This lane performs no:

- filesystem read/write;
- wall-clock read;
- monotonic-clock read;
- service/systemd action;
- runtime route mount;
- gas sponsorship;
- wallet/private-key/signer access;
- transaction construction/signing/submission/broadcast;
- Chain-2050 mutation;
- market/presale activation; or
- funds movement.

## Verification

```bash
node --check tools/void-economic-system-sponsored-observation-time-v1.mjs
node --check scripts/prove_void_economic_system_sponsored_observation_time_v1.mjs
node scripts/prove_void_economic_system_sponsored_observation_time_v1.mjs
node scripts/prove_void_economic_system_sponsored_reservation_store_v1.mjs
git diff --check
```

The focused proof covers:

- deterministic genesis receipt;
- exact one-call clock behavior;
- receipt chaining;
- object-key order invariance;
- accessor binding/request/sample rejection without getter execution;
- stable clock-provider exception HOLD without provider-detail exposure;
- corrupt prior receipt rejected before clock read;
- self-consistent rehashed prior receipt with zero process-start identity rejected before clock read;
- self-consistent rehashed prior receipt with excessive cumulative skew rejected before clock read;
- self-consistent later-generation prior receipt without monotonic advance rejected before clock read;
- wall regression;
- monotonic regression/equality;
- skew overflow and exact boundary acceptance;
- cumulative per-step clock-ratchet rejection against the generation-zero
  baseline;
- boot-change HOLD;
- process-instance-change HOLD;
- captured clock-reference behavior;
- request timestamp injection rejection; and
- source scan proving no implicit wall/monotonic clock or host mutation primitive.

## Next gate

After this contract is green, the next #2458 lane may add durable time-receipt storage plus a default-off composition binding:

```text
reviewed policy bundle
  -> captured host trusted-clock dependency
  -> durable observation-time receipt
  -> #2454 durable sponsored reservation
  -> exact postcheck
  -> return before sponsored execution
```

That later lane must still keep live gas sponsorship and transaction submission false.
