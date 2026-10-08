# VOID public seed tunnel route correlation — read-only v1

Marker: `VOID_PUBLIC_SEED_TUNNEL_ROUTE_CENSUS_READONLY_V1`

Purpose: one operator-invoked, bounded diagnostic for a public HTTPS seed that
returns 502/404 while the Precision 4111 seed gateway and 4122 Public Earn
origin continue to return HTTP 200. This directly addresses the October 8,
2026 stale/legacy Alienware routing investigation in issue #1005. It does **not**
repair Cloudflare routing, change DNS, grant payment authority, publish a
bootstrap manifest or establish independent public-node synchronization.

## Run on the active intended seed host

Use a reviewed checkout. No sudo and no manual environment overrides:

```bash
bash ops/public/void_public_seed_tunnel_route_census_readonly_v1.sh --read-only
```

The script reads the user systemd `MainPID` for
`void-public-seed-named-tunnel-v1.service`. It checks that the process is named
`cloudflared`, extracts only its active `--config` path privately from
`/proc/<pid>/cmdline`, and invokes **that process's current executable** with
`--config ... tunnel ingress rule` for the fixed public readiness and `/health`
URLs. It classifies the matched local destinations, never printing command-line
arguments, tunnel identifier, configuration path, or raw route output. The
script itself does not open credential files.

It separately reports HTTP statuses (no response bodies) for local 4111 seed,
local 4122 Earn, public Earn and Cloudflare's edge-managed `/cdn-cgi/trace`
route. It binds the optional metrics scrape to the *same live systemd PID*
via a loopback `ss` listener on ports 20241–20245. If that check passes, it
samples the cloudflared HA-connections gauge and total-request counter before
and after exactly one fixed public readiness GET. All HTTP requests are
read-only, bounded by connection/overall deadlines, do not follow redirects
and bypass proxy and curlrc configuration.

## Interpret without claiming too much

- `PUBLIC_REQUEST_NOT_COUNTED_HYPOTHESIS`: local 4111 HTTP 200, local ingress
  targets 4111, public seed is not 200, and the *same process's* request
  counter did not advance across the probe. This is evidence consistent with
  traffic going elsewhere (for example a stale Alienware DNS/tunnel route),
  **not proof** of the exact failing Cloudflare control-plane rule. Counting
  may be incomplete, concurrent traffic can confound an increment, and failures
  before the counter may not be counted.
- `TUNNEL_LIVE_CONNECTIONS_UNCONFIRMED_HOLD`: the public seed returned a non-200
  response and the request counter was flat, but the same connector's
  HA-connection gauge was zero or unavailable before or after sampling.
  A disconnected/unsupported tunnel can produce that same pattern; do not
  attribute it to stale DNS until live HA connections are observed.
- `PUBLIC_PROBE_TRANSPORT_HOLD`: the public curl command failed (even if a
  numeric HTTP code was observed). A failed DNS/TLS/transport request does
  **not** justify a misrouting conclusion from a zero counter delta.
- `CONNECTOR_CHANGED_HOLD`: user-systemd's tunnel MainPID or process identity
  changed while the measurements ran. The before/after metrics cannot be
  attributed to one stable connector generation.
- `PUBLIC_HTTP_200_STILL_UNQUALIFIED`: a single public HTTP 200 is *not*
  a JSON/readiness trust receipt, independent three-sample qualification,
  served-manifest verification, or proof of chain-head advancement.
- `LOCAL_INGRESS_ROUTE_HOLD` and `LOCAL_SEED_GATEWAY_HOLD`: local evidence is
  inconsistent with required route or origin health. A local curl transport
  failure is HOLD even if it emits an HTTP 200 status; do not assume Cloudflare
  is solely at fault.
- `PUBLIC_ROUTE_FAILURE_UNRESOLVED`: no stronger conclusion is supported.
- If the systemd process, config reference or metrics ownership is unavailable,
  the script emits explicit HOLD/UNKNOWN rather than guessing or using a
  different process's metrics.

The normal script executes no `systemctl` mutation, service restart, DNS or
Cloudflare configuration write, wallet/signer access, payment/transaction,
Chain-2050/WC mutation, treasury/funds movement or bootstrap publication.

## Synthetic acceptance

```bash
bash -n ops/public/void_public_seed_tunnel_route_census_readonly_v1.sh
bash ops/public/void_public_seed_tunnel_route_census_readonly_v1.sh --self-test
node scripts/prove_void_public_seed_tunnel_route_census_readonly_v1.mjs
```

The self-test checks the closed classification states only; it never accesses
real network, systemd, tunnel config, metrics or credentials. Hosted CI
executes this proof, not the live `--read-only` mode. After a route repair,
use the existing three-sample external qualifier, fresh at-use publication
packet, owner-controlled merge/deployment and outside-host served-copy
verification. The October 8 public/bootstrap/v1.json expiry is a separate HOLD
until publication is independently accepted.
