# VOID public bootstrap client resilience v1

Status: source-only client and catch-up lane. No stable public seed is published or activated by this lane.

Issue #1005 requires a normal machine outside the operator Tailnet to clone the repository, run `./run-void-node.sh`, discover a stable public HTTPS seed without private configuration, and reach exact-green synchronization. The stable-seed qualification gate in PR #1011 protects the server and publication side. This lane protects the client and ordinary clone/run side.

## Current truth

`public/bootstrap/v1.json` is intentionally content-addressed as:

```text
status=hold_no_stable_seed
sync_endpoints=[]
private_tailnet_endpoints_published=false
stable_seed_published=false
```

The repository does not claim that an expired temporary tunnel, plaintext HTTP adapter, Tailnet address, or operator-only endpoint is a current public seed.

A normal run may start the local node while the manifest is in hold state, but it prints one of these truthful states:

```text
public_bootstrap=hold_no_stable_seed
canonical_manifest_published=true
public_sync_active=false
tailnet_required=false
```

or, before the canonical artifact first reaches `main`:

```text
public_bootstrap=local_hold_no_stable_seed
canonical_manifest_published=false
local_hold_manifest_verified=true
public_sync_active=false
tailnet_required=false
```

An acceptance or production-readiness run can require public synchronization:

```bash
VOID_PUBLIC_BOOTSTRAP_REQUIRE=1 ./run-void-node.sh
```

That command fails closed while the canonical manifest is missing or remains in hold state.

## Prepublication hold fallback

A stacked pull request can contain `public/bootstrap/v1.json` before the default raw-`main` URL exists. The launcher handles that narrow staging condition without turning general network failures into optional behavior.

The local fallback is allowed only when all of these statements are true:

- no custom manifest URL or mirror list was supplied;
- the default canonical request returned an explicit HTTP `404`;
- `VOID_PUBLIC_BOOTSTRAP_REQUIRE` is not `1`;
- the checked-in local file exists as a regular non-symlink file;
- its size is within the one-MiB manifest ceiling;
- its `voidpbm1_<sha256>` content address is exact;
- its network, chain, private-Tailnet, and authority boundaries are valid;
- its status is exactly `hold_no_stable_seed`; and
- its synchronization endpoint list is empty.

The local mode rejects stable manifests even when they are otherwise well formed. It therefore cannot publish or activate a seed, bypass canonical HTTPS, or satisfy a required public-sync run. A custom URL failure, timeout, redirect, invalid response, tamper, or any non-404 canonical failure does not enter this path.

Once the hold artifact exists on `main`, normal runs consume the canonical remote copy and the local prepublication path is no longer used.

## Client architecture

When a fresh stable manifest is eventually published, the default run path is:

```text
canonical HTTPS manifest
        |
        v
DNS-pinned manifest resolver
        |
        v
fresh qualified HTTPS seed set
        |
        v
ephemeral numeric-loopback client adapter
        |
        v
bounded follower catch-up
```

The node process does not receive a remote seed URL in the default public path. It follows only the local numeric-loopback adapter selected by the supervisor.

## Manifest resolver

`scripts/resolve_void_public_bootstrap_v1.mjs`:

- accepts at most four manifest mirrors;
- requires HTTPS and a fully qualified DNS hostname outside loopback fixtures;
- rejects credentials, query strings, fragments, local names, IP literals, and temporary tunnel hosts;
- resolves DNS before connecting and pins each request to a prevalidated address;
- verifies the actual connected address;
- treats redirects, non-200 statuses, non-JSON responses, and oversized responses as terminal origin failures instead of retrying the same invalid artifact across every address;
- verifies the `voidpbm1_<sha256>` content address;
- requires chain ID `2050`, network `VOID Network`, the private-Tailnet boundary, and every authority flag to be exactly false;
- recognizes only `hold_no_stable_seed` and `stable_https_seed` states;
- requires stable manifests to expire within one hour through seven days;
- requires enabled endpoints to be HTTPS, `temporary=false`, unique, and bound to a `voidpsq1_<sha256>` qualification ID;
- rejects qualification timestamps older than two hours;
- live-probes each candidate through PR #1011's DNS-pinned gateway proof; and
- returns only candidates that remain exact-green and have not fallen below their qualified head.

The explicit `--local-hold-file` resolver mode exists for the constrained launcher fallback and tests. It accepts only a verified hold manifest and never returns a seed.

A hold manifest returns no seed. A tampered, expired, stale, authority-bearing, private, temporary, redirected, or currently unhealthy manifest fails closed.

## Loopback client adapter

`tools/void-public-seed-client-adapter-v1.mjs` binds only to `127.0.0.1` or `::1` and permits only `GET` or `HEAD` for:

```text
/__void/ready.json
/blocks/latest/number2.json
/head
/__void/demo/summary.json
/api/health
/blocks/range?from=N&to=M
```

The adapter:

- rejects undocumented routes, mutation methods, query pollution, duplicate parameters, and ranges wider than 999 blocks;
- re-resolves and pins public DNS for every remote request;
- verifies the actual connected address;
- rejects redirects and responses without `x-void-public-seed-gateway: v1`;
- requires JSON and caps responses at 64 MiB by default with a 128 MiB compiled ceiling;
- fails over across the resolver's qualified seed set;
- exposes no wallet, signer, validator, treasury, Work Credit, Buy VOID, admin, filesystem, secret, or operator mutation route; and
- defensively absorbs an identical immediate block-range retry for two seconds, bound to the current peer; the current follower accepts a complete requested page without issuing that legacy duplicate request.

The supervisor requests an ephemeral loopback port by default, avoiding collision with unrelated local services.

## Catch-up behavior

When the supervisor is active, `src/http/follower_routes.ts` accepts only numeric-loopback HTTP origins from it.

The default public catch-up contract is:

```text
pull_limit=999
catchup_interval_ms=250
steady_interval_ms=1000
failure_backoff_max_ms=30000
pull_timeout_ms=15000
```

The environment values remain bounded in source. `VOID_FOLLOWER_PULL_TIMEOUT_MS` accepts only exact integers in `100..120000` and defaults to 15 seconds. The deadline is owned inside `Node.pullOnce()` and is propagated through head probes, range acquisition, streamed JSON admission, block validation/import, index updates, receipt persistence, hooks, and contiguous-head publication. Cancellation aborts the active fetch and any signal-aware receipt publication before the autostart loop clears `running` and rotates peers. If an injected persistence operation ignores cancellation, the caller still receives the deadline failure promptly, but the node retains that mutation-capable generation and rejects every later pull with `VOID_FOLLOWER_PERSISTENCE_GENERATION_ACTIVE_V1` until the operation actually settles.

The production receipt store never abort-mutates an authoritative JSONL shard in place. It validates bounded existing shards, removes already-durable logical receipts, writes the complete next shard generation to an exclusive temporary file, fsyncs it, atomically renames it over the prior generation, and fsyncs the receipts directory before publishing the same truth in memory. A fault before publication leaves the prior shard intact; a fault after publication is classified by the next scan, and an exact retry cannot duplicate or conflict with the durable receipt.

Canonical block truth is also the redo authority for follower-derived projections. After `saveBlock()` durably advances block/head truth, tx-index and receipt writes are checked by exact transaction hash and coordinates. Every later `pullOnce()` reconciles the canonical head block before peer-head short-circuiting, so an abort immediately after the canonical commit converges missing index/receipt work even when the peer is still at that same head. Existing correct projections are not appended again, conflicting projections fail closed, and the canonical block itself is not recommitted.

Every follower fetch uses `redirect: error` and verifies that the final response URL exactly equals the requested peer URL. Redirected head or range data therefore cannot cross peer-origin provenance, even when the target would return otherwise valid JSON. Every head response is streamed under a 64-KiB ceiling. Range responses reuse the public client transport's reviewed 128-MiB compiled ceiling. Exact decimal `content-length` values are rejected before reading when oversized, and chunked bodies are cancelled as soon as their accumulated bytes exceed the same limit. JSON parsing occurs only after the complete bounded body has been admitted. Non-success range responses are terminal for that peer attempt: their bodies are cancelled and never enter block validation or import, even if they contain a valid-looking block array.

Range completeness is evaluated against the requested inclusive `from..to` page, not against the peer's potentially much later advertised head. For example, a follower at block 0 with a 250-block pull limit and peer head 1000 accepts one exact response containing blocks 1 through 250, advances through block 250, and begins the next pull at block 251 without repeating the first GET.

A successful pull that remains behind schedules another catch-up pull. Failures, including timeouts, oversized responses, invalid JSON, and non-success range statuses, rotate the configured local origins and use bounded exponential backoff.

The public gateway still rejects `/follower/start` and every mutation route. Autostart occurs inside the new local node process; it is not remotely callable.

## Operator controls

The normal path needs no private peer editing. Relevant controls are:

```text
VOID_PUBLIC_BOOTSTRAP_REQUIRE=1
VOID_PUBLIC_BOOTSTRAP_DISABLE=1
VOID_PUBLIC_BOOTSTRAP_OPTIONAL=1
VOID_PUBLIC_BOOTSTRAP_MANIFEST_URL=<canonical HTTPS URL>
VOID_PUBLIC_BOOTSTRAP_MANIFEST_URLS=<comma-separated mirrors>
VOID_PUBLIC_BOOTSTRAP_TIMEOUT_MS=<1000..60000>
VOID_PUBLIC_BOOTSTRAP_MAX_LIVE_SEEDS=<1..8>
VOID_FOLLOWER_PULL_TIMEOUT_MS=<100..120000>
VOID_PUBLIC_SEED_CLIENT_PORT=<0..65535>
```

`VOID_PUBLIC_BOOTSTRAP_REQUIRE=1` conflicts with explicit disable mode and blocks local hold fallback. Supplying either manifest URL variable also blocks local fallback. `VOID_PUBLIC_BOOTSTRAP_OPTIONAL=1` remains an explicit operator choice for general manifest unavailability; it is not enabled by default. Loopback fixture mode exists only for bounded tests and is not a stable-public-seed claim.

## Ordinary-machine acceptance after stable publication

After PR #1011 and this client lane are merged, a separate reviewed activation lane must deploy stable DNS/TLS ingress to the restricted gateway, create a fresh qualification receipt, and replace the hold manifest with the manifest builder's exact output.

Then an ordinary machine outside the Tailnet must run:

```bash
git clone https://github.com/6ZoSo9/void-node.git
cd void-node
VOID_PUBLIC_BOOTSTRAP_REQUIRE=1 ./run-void-node.sh
```

Acceptance requires fresh evidence that:

```text
head > 0
ready = true
gap = 0
txroot_live = 1
tailnet_required = false
private_configuration_required = false
private_mutation_routes_exposed = false
wallet_authority = false
signer_authority = false
validator_authority = false
treasury_authority = false
work_credit_authority = false
money_movement_authority = false
```

Issue #1005 remains open until that real stable-ingress and outside-machine proof exists.

## Non-actions

This lane does not deploy or restart a service, open a firewall port, configure DNS or TLS, publish a release, replace the hold manifest with a real endpoint, access credentials, read a wallet or signer, activate validator authority, mutate Work Credit, move funds, or close issue #1005.
