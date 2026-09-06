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

If the published qualification is still inside its original two-hour window,
behavior is unchanged.

If that window has aged out but the manifest remains unexpired, static
verification marks runtime renewal as required. Normal resolution must still
perform the existing DNS-pinned exact-green live probe. Only a successful live
resolution activates the renewed local checkpoint-authority deadline.

The renewed deadline is deterministic across the launcher's separate verify/live
resolver calls, at most two hours ahead, and capped by manifest `expires_at`.
The existing public-seed adapter's `qualification_expired` fail-closed behavior
is unchanged.

## Non-goals

This does not extend an expired manifest, mutate or backdate published evidence,
change the three-sample publication builder, weaken private-route rejection,
make a seed consensus authority, solve the remaining N−1 bootstrap topology
requirement, or deploy/restart any runtime.
