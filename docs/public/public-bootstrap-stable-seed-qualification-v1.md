# VOID public bootstrap stable-seed qualification v1

Status: source-only qualification and publication gate. No public endpoint is published or activated by this lane.

Issue #1005 cannot close on a temporary tunnel or an operator-only Tailnet proof. A candidate seed must be reachable through stable public HTTPS, expose only the restricted read gateway, remain exact-green across multiple observations, and produce fresh tamper-evident evidence before it can enter a bootstrap manifest.

## Boundary

The public seed architecture has three separate layers:

1. The VOID node remains on its existing private or loopback runtime boundary.
2. `tools/void-public-seed-gateway-v1.mjs` binds only to loopback and proxies an exact read-only route allowlist to the loopback node.
3. A separately configured stable HTTPS reverse proxy publishes only the loopback gateway.

The gateway never supplies TLS, DNS, a tunnel, or public ingress itself. It requires numeric loopback literals for both bind and upstream, avoiding hostname-resolution ambiguity. Temporary tunnel hostnames are not stable-seed candidates.

The gateway permits only `GET` and `HEAD` for:

```text
/__void/ready.json
/blocks/latest/number2.json
/head
/__void/demo/summary.json
/api/health
/blocks/range?from=N&to=M
```

The range is limited to at most 999 blocks. Query pollution, duplicate parameters, undocumented routes, mutation methods, upstream redirects, non-JSON upstream responses, oversized responses, and unavailable upstreams fail closed.

Private JSON-RPC, admin, wallet, signer, validator, treasury, Work Credit, Buy VOID, operator mutation, filesystem, and secret-bearing routes are not exposed.

## Start the restricted loopback gateway

From an exact reviewed checkout:

```bash
VOID_PUBLIC_SEED_UPSTREAM=http://127.0.0.1:4100 \
VOID_PUBLIC_SEED_BIND=127.0.0.1 \
VOID_PUBLIC_SEED_PORT=4111 \
node tools/void-public-seed-gateway-v1.mjs
```

Expected markers include:

```text
VOID_PUBLIC_SEED_GATEWAY_V1_READY
private_mutation_routes_exposed=false
wallet_authority=false
signer_authority=false
validator_authority=false
treasury_authority=false
work_credit_authority=false
money_movement_authority=false
```

A stable public HTTPS proxy may point to `http://127.0.0.1:4111` only after its DNS, TLS, ingress, persistence, and restart behavior are separately reviewed. Do not point public ingress directly at the node's full HTTP port.

## Qualify a stable candidate

The qualifier requires a credential-free HTTPS origin with a fully qualified DNS hostname and no path, query, or fragment. It rejects known temporary tunnel providers and any hostname that resolves to loopback, LAN, link-local, documentation, benchmark, multicast, reserved, CGNAT, or Tailnet address space.

Each request is pinned to a prevalidated public DNS address. The receipt records both DNS answers and the actual connected addresses, preventing a DNS-rebinding race from silently reaching a private address.

Run three observations over at least 60 seconds:

```bash
node scripts/qualify_void_public_seed_v1.mjs \
  --endpoint https://seed.example.org \
  --samples 3 \
  --interval-ms 30000 \
  --output /tmp/void-public-seed-qualification-v1.json
```

Every observation verifies:

- `ready=true`;
- positive head;
- `gap=0`;
- `txroot_live=1`;
- readiness/head agreement within 64 blocks;
- retrieval of the corresponding head block through the bounded range route;
- `x-void-public-seed-gateway: v1`;
- `/admin` rejected as `404 route_not_public`;
- `POST /follower/start` rejected as `405 method_not_allowed`;
- `HEAD` support on readiness;
- JSON-only responses; and
- public DNS before and after the sample, with actual connections pinned to those answers.

A successful receipt is content-addressed as `voidpsq1_<sha256>` and explicitly records that all private and economic authority flags are false.

## Build a candidate manifest

The builder accepts only untampered receipts with at least three samples, at least a 60-second observation span, no head regression, and a latest sample no older than two hours. It rejects loopback fixtures, temporary providers, private or mixed DNS, connected addresses not bound to DNS evidence, future-generated or stale receipts, duplicate endpoints, and any authority flag that is not exactly false.

```bash
node scripts/build_void_public_bootstrap_manifest_v1.mjs \
  --receipt /tmp/void-public-seed-qualification-v1.json \
  --validity-hours 72 \
  --output /tmp/void-public-bootstrap-v1.json
```

The candidate manifest:

- is bound to chain ID `2050` and `VOID Network`;
- contains only qualified HTTPS seeds;
- marks every endpoint `temporary=false`;
- includes each qualification ID and qualified head;
- expires after a bounded one-hour to seven-day validity window; and
- is content-addressed as `voidpbm1_<sha256>`.

Building a file under `/tmp` is not publication. Committing or replacing `public/bootstrap/v1.json`, deploying ingress, changing DNS, starting a persistent service, or closing issue #1005 remains a separate reviewed action.

## Acceptance boundary

This source lane proves the qualification contract; it does not claim that a stable seed currently exists. Issue #1005 still requires an ordinary machine outside the operator Tailnet to use exact merged source and the normal clone/run path, advance above head zero, reach `gap=0` with `txroot_live=1`, and demonstrate that no private or economic authority is exposed.
