# VOID public bootstrap runtime live-admission renewal v1

## Problem

Stable HTTPS seed publication already requires a fresh multi-sample
qualification. Reusing the publication timestamp as a permanent two-hour
startup gate forced recurring manifest PRs even while an unexpired manifest
still named healthy public endpoints.

Runtime renewal must therefore be possible without weakening the evidence that
backs checkpoint authority.

## V5 contract

### Publication-time trust

Every enabled endpoint still must satisfy:

- `qualified_at <= generated_at`;
- `generated_at - qualified_at <= 2 hours`;
- the existing manifest ID/content binding;
- the existing HTTPS/public-address/temporary-provider/authority boundaries.

A qualification stale at manifest generation remains invalid forever. Manifest
expiry remains a hard stop.

### Per-endpoint runtime admission

Admission remains independent per endpoint.

A still-fresh endpoint receives one current exact-green probe and keeps its
original publication deadline. The probe grants no extension.

A stale endpoint, or one whose publication deadline expires while its fresh-path
probe is running, must pass a new **3-sample exact-green observation spanning at
least 60 seconds**. One sample cannot mint renewed multi-hour authority.

### Conservative head binding

Runtime authority is stricter than the shared probe's allowed <=64 block
cross-surface tolerance. For admission, **both** `ready_head` and `head` must be
at least the endpoint's published `qualified_head`.

During stale renewal, both surfaces must also be non-regressing across samples.
The runtime-reported live head is the conservative minimum of the final
`ready_head` and `head`, not the more favorable maximum.

Thus a state such as `qualified_head=2000`, `ready_head=1980`, `head=2044` is
rejected even though the two live surfaces differ by only 64 blocks.

### Parallel renewal / startup bound

Per-endpoint admissions are no longer performed one stale endpoint at a time.

If fewer than `MAX_LIVE_SEEDS` endpoints are still inside their publication
window, all manifest candidates are attempted concurrently, so stale renewals
share the same >=60-second observation wave.

If at least `MAX_LIVE_SEEDS` endpoints are still fresh, only those fresh
candidates are probed first. Stale backups are attempted concurrently only if
the fresh wave does not produce enough admitted peers. This avoids imposing a
60-second stale-backup delay when four healthy fresh peers are already usable.

The manifest remains capped at eight endpoints and the resolver retains bounded
per-request timeouts. V5 removes the previous N-times-60-second sequential stale
renewal multiplication; a fallback stale wave can still occur if an apparently
fresh first wave fails, which is deliberate failover behavior rather than an
unbounded per-peer loop.

### Renewed authority

A successfully renewed stale endpoint receives:

`min(final_runtime_sample_time + 2 hours, manifest.expires_at)`.

Failed or regressing endpoints are excluded.

The adapter consumes one checkpoint-authority deadline for its admitted live
peer set, so the resolver exports the minimum deadline across only admitted
peers. Failover therefore cannot outlive the evidence window of any peer that
remains selectable.

### Immutable launcher binding

Verify/live/reverify continue to compare the manifest ID plus the complete
ordered `published_qualification_bindings` vector. Runtime authority is accepted
only from successful live resolution.

The existing adapter's checkpoint-expiry enforcement is unchanged. Ordinary
bounded `/blocks/range` historical catch-up remains outside the
checkpoint-discovery/manifest/segment authority gate.

## Non-goals

This does not extend an expired manifest, backdate evidence, weaken DNS pinning
or gateway/private-route/mutation checks, make a seed consensus authority, solve
N-1 bootstrap topology, deploy/restart Precision, or start Nimo.
