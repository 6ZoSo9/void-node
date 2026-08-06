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

A normal run may start the local node while the manifest is in hold state, but it prints:

```text
public_bootstrap=hold_no_stable_seed
public_sync_active=false
tailnet_required=false
```

An acceptance or production-readiness run can require public synchronization:

```bash
VOID_PUBLIC_BOOTSTRAP_REQUIRE=1 ./run-void-node.sh
```

That command fails closed while the canonical manifest remains in hold state.

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
- rejects redirects, non-JSON responses, non-200 responses, and manifests larger than one MiB;
- verifies the `voidpbm1_<sha256>` content address;
- requires chain ID `2050`, network `VOID Network`, the private-Tailnet boundary, and every authority flag to be exactly false;
- recognizes only `hold_no_stable_seed` and `stable_https_seed` states;
- requires stable manifests to expire within one hour through seven days;
- requires enabled endpoints to be HTTPS, `temporary=false`, unique, and bound to a `voidpsq1_<sha256>` qualification ID;
- rejects qualification timestamps older than two hours;
- live-probes each candidate through PR #1011's DNS-pinned gateway proof; and
- returns only candidates that remain exact-green and have not fallen below their qualified head.

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
- absorbs an identical immediate block-range retry for two seconds, bound to the current peer, so the legacy bounded-pull retry does not double remote bandwidth.

The supervisor requests an ephemeral loopback port by default, avoiding collision with unrelated local services.

## Catch-up behavior

When the supervisor is active, `src/http/follower_routes.ts` accepts only numeric-loopback HTTP origins from it.

The default public catch-up contract is:

```text
pull_limit=999
catchup_interval_ms=250
steady_interval_ms=1000
failure_backoff_max_ms=30000
```

The environment values remain bounded in source. A successful pull that remains behind schedules another catch-up pull. Failures rotate the configured local origins and use bounded exponential backoff.

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
VOID_PUBLIC_SEED_CLIENT_PORT=<0..65535>
```

`VOID_PUBLIC_BOOTSTRAP_REQUIRE=1` conflicts with explicit disable mode. Loopback fixture mode exists only for bounded tests and is not a stable-public-seed claim.

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
