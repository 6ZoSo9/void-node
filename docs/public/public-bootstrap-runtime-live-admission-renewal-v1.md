# VOID public bootstrap runtime live-admission renewal v1

## Problem

The publication pipeline correctly requires a fresh multi-sample qualification
receipt when a stable HTTPS seed manifest is created. The client then reused the
same two-hour receipt age as a wall-clock admission rule on every later node
startup.

That coupled two different things:

1. whether the seed was freshly qualified when the manifest was published; and
2. whether the seed is exact-green **now** when a node wants to use it.

Because the manifest itself is valid for up to 72 hours, the old client rule
forced operators to publish a new manifest every two hours even when the same
public endpoint remained exact-green.

## Contract

For every enabled HTTPS endpoint, publication-time evidence must satisfy:

- `qualified_at <= generated_at`; and
- `generated_at - qualified_at <= 2 hours`.

A manifest therefore cannot launder a qualification that was already stale when
the manifest was created.

If the publication qualification is still inside its original two-hour window,
normal live resolution preserves that original deadline.

If that publication window has aged out but the manifest remains unexpired,
`--verify-only` validates immutable manifest/publication trust but **does not**
mint a new runtime checkpoint-authority deadline. Normal resolution must then
perform the existing DNS-pinned exact-green live probe. Only after that probe
succeeds does the resolver mint a local runtime deadline:

`min(live_probe_time + 2 hours, manifest.expires_at)`.

The launcher compares immutable manifest identity and the published
qualification deadline across verify/live/reverify. It obtains the runtime
checkpoint deadline only from successful live resolution, so verify and live
calls can cross a wall-clock boundary without appearing to be different trust
material.

The existing public-seed adapter's `qualification_expired` fail-closed behavior
is unchanged. That deadline gates checkpoint discovery/manifest/segment
authority; ordinary bounded `/blocks/range` historical catch-up remains outside
that checkpoint-authority route class.

## Non-goals

This does not extend an expired manifest, mutate or backdate published evidence,
change the three-sample publication builder, weaken DNS pinning or gateway
boundary checks, make a seed consensus authority, solve the remaining N−1
bootstrap topology requirement, or deploy/restart any runtime.
