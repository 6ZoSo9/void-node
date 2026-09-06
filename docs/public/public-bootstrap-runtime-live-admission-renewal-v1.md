# VOID public bootstrap runtime live-admission renewal v1

## Problem

Stable HTTPS seed publication already requires a fresh multi-sample
qualification. The client then treated that publication timestamp as a permanent
startup clock gate, forcing recurring manifest PRs every two hours even while an
unexpired manifest still named a healthy public endpoint.

## V4 contract

Publication trust and runtime renewal remain separate, but they now use
comparable evidence strength.

### Publication-time trust

Every enabled endpoint must still satisfy:

- `qualified_at <= generated_at`;
- `generated_at - qualified_at <= 2 hours`;
- the existing manifest ID/content binding and authority boundary.

A receipt that was stale when the manifest was generated remains invalid
forever. An expired manifest remains a hard stop.

### Per-endpoint runtime admission

Runtime admission is decided independently for every enabled endpoint.

If an endpoint's published two-hour window is still live, it receives one
current exact-green probe and keeps its original publication deadline. It does
not gain extra authority from that probe.

If that published window is stale, or expires while the fresh-path probe is in
progress, that endpoint must pass a new **3-sample exact-green observation
spanning at least 60 seconds** before it can be admitted. Each sample uses the
same DNS-pinned restricted-gateway checks as publication qualification:
readiness, head/range binding, private-route rejection, mutation rejection,
gateway header, and public address binding. Head regression across renewal
samples is rejected.

A successful stale-endpoint renewal receives:

`min(final_runtime_sample_time + 2 hours, manifest.expires_at)`.

One runtime sample can never mint the renewed multi-hour checkpoint-authority
window.

### Multiple endpoints

Freshness and renewal are per endpoint rather than a manifest-wide `any`
decision. A stale endpoint that fails its renewal is excluded without poisoning
a healthy sibling. A fresh endpoint is not forced into renewal merely because
another endpoint is stale.

The client adapter currently consumes one checkpoint-authority deadline for its
admitted live peer set, so the resolver exports the **minimum deadline across
only the endpoints that actually passed live admission**. This is conservative:
the adapter can never outlive the evidence window of a peer it may fail over to.

The launcher binds the immutable manifest ID plus the full ordered
`published_qualification_bindings` vector across verify/live/reverify. The
runtime deadline is accepted only from successful live resolution.

The adapter's existing checkpoint-expiry enforcement remains unchanged, and
ordinary `/blocks/range` historical catch-up remains outside the checkpoint
discovery/manifest/segment authority gate.

## Non-goals

This change does not extend an expired manifest, backdate evidence, weaken DNS
pinning or gateway/private-route/mutation checks, make a seed consensus
authority, solve N-1 bootstrap topology, deploy/restart Precision, or start
Nimo.
