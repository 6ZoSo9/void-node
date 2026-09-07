# voidchain.org path-preserving public edge v1

Status: source-only packet, verifier, proof, and dormant installer. This change does not alter DNS, Northwest forwarding, Tailscale Funnel, Tor, services, node runtime, credentials, wallets, validators, Work Credits, transactions, treasury state, or funds.

## Problem

The restored human website currently works through registrar forwarding:

```text
https://voidchain.org/
  -> HTTP redirect
  -> https://zoso-alienware-aurora-r7.taila47fd.ts.net/
  -> Alienware public-safe edge
```

That is sufficient for the root page, but registrar forwarding is not an origin-preserving reverse proxy. Arbitrary subpaths can be discarded before they reach VOID. The public domain therefore cannot yet be the canonical agent/API origin even though the direct Funnel hostname already serves the required paths.

## Existing origin that remains authoritative

The already-proven Alienware public-safe edge is:

```text
http://127.0.0.1:8080
```

Tailscale Funnel currently reaches that origin without changing the node or the public adapter. The path-preserving edge v1 intentionally reuses the same origin rather than repointing Funnel, changing the node, or requiring the separate composition-gateway cutover.

Expected origin checks before activation:

```text
/                                      -> 200
/__void/ready.json                     -> 200 and ready=true
/__void/adapter.json                   -> 200 and void_public_seed_adapter identity
/__void/public-seed-adapter/status.json -> 200
/participant                           -> 200
/rpc                                   -> 404 not_public
```

## Edge shape

The generated named-tunnel ingress has exactly two hostname rules and one terminal deny rule:

```text
https://voidchain.org/*
https://www.voidchain.org/*
        |
        v
named HTTPS tunnel
        |
        v
http://127.0.0.1:8080/<same path and query>

all other tunnel hostnames -> http_status:404
```

The configuration is host-only. It contains no path selector, redirect, prefix strip, or rewrite rule. This is the property that prevents the current `voidchain.org/__void/ready.json -> homepage` failure mode.

The existing Tailscale Funnel is left untouched and remains the fallback/direct public hostname during qualification.

## Credential boundary

The packet uses an existing locally managed named-tunnel credential file. The builder requires the credentials file to:

- be outside the repository;
- be a regular non-symlink file addressed by its canonical path;
- have mode `0600`; and
- be named exactly `<tunnel-id>.json`.

The builder and verifier inspect only its filesystem metadata. They do not parse, print, copy, hash, upload, or commit credential contents.

## Generate a packet

Run this only on the intended edge host from one clean exact checkout after the source has been reviewed and deployed:

```bash
EXPECTED_HEAD="$(git rev-parse HEAD)"
TUNNEL_ID="<existing-or-new-canonical-tunnel-uuid>"
CREDENTIALS="$HOME/.cloudflared/$TUNNEL_ID.json"
PACKET="$HOME/.config/void/voidchain-org-path-edge-v1/packet-$EXPECTED_HEAD"

node scripts/build_voidchain_org_path_preserving_edge_packet_v1.mjs \
  --tunnel-id "$TUNNEL_ID" \
  --credentials-file "$CREDENTIALS" \
  --repo-root "$PWD" \
  --expected-head "$EXPECTED_HEAD" \
  --cloudflared "$(command -v cloudflared)" \
  --output "$PACKET"

node scripts/verify_voidchain_org_path_preserving_edge_packet_v1.mjs \
  --packet "$PACKET" \
  --repo-root "$PWD"
```

The packet directory is intentionally outside the repository and must remain durable while its generated systemd service is installed, because the service references the packet's exact validated Cloudflare configuration.

## Install without activation

The default installer mode writes only the reviewed user unit and reloads the user systemd manager. It does not enable or start the tunnel:

```bash
VOIDCHAIN_ORG_PATH_EDGE_START=0 \
  bash ops/public/install_voidchain_org_path_preserving_edge_packet_v1.sh "$PACKET"
```

This still does not change DNS or Funnel.

## Separate activation gate

Starting the tunnel is a separate runtime action:

```bash
VOIDCHAIN_ORG_PATH_EDGE_START=1 \
  bash ops/public/install_voidchain_org_path_preserving_edge_packet_v1.sh "$PACKET"
```

Before starting anything, the installer proves the existing `127.0.0.1:8080` root/readiness/adapter identity and `/rpc` rejection. It then starts only the new named-tunnel user service. It does not restart the VOID node, the public adapter, Tailscale, or Funnel.

DNS/TLS binding remains a second separate gate after the service is green. Do not use registrar HTTP forwarding for the final binding. The authoritative DNS provider must bind both `voidchain.org` and `www.voidchain.org` to the named tunnel in a way that terminates HTTPS for those hostnames and forwards requests to the tunnel without a browser redirect.

No DNS command is emitted or executed by this packet because the exact authoritative-DNS mechanism must be reviewed against the live domain configuration at activation time.

## Public qualification after DNS/TLS binding

The final acceptance wall must test exact paths while the browser/client origin remains `voidchain.org`:

```text
GET  https://voidchain.org/                                      -> 200 HTML
GET  https://voidchain.org/__void/ready.json                    -> 200 JSON, ready=true
GET  https://voidchain.org/__void/adapter.json                  -> 200 JSON
GET  https://voidchain.org/__void/public-seed-adapter/status.json -> 200 JSON
GET  https://voidchain.org/participant                          -> 200
GET  https://voidchain.org/rpc                                  -> 404 not_public
GET  https://www.voidchain.org/__void/ready.json                -> 200 JSON, ready=true
```

Redirects from those API paths to `/` or to the Tailscale hostname are failures. A TLS-valid response that changes the requested path is also a failure.

## Tor parity

The existing Onion ingress is not changed by this lane. It remains independently reachable while clearnet qualification occurs. A later parity proof should compare the same public route set across the canonical clearnet hostname and the existing Onion origin without making either transport depend on the other.

## Rollback

Until DNS/TLS binding changes, rollback is simply stopping/disabling the new user service; current Northwest root forwarding and Tailscale Funnel remain unchanged.

After DNS/TLS binding, rollback must be an explicit DNS/edge action using the captured pre-change DNS state. Do not improvise a redirect-based API fallback: the direct Funnel hostname remains the known path-preserving emergency origin for agents.

## Proof

Run:

```bash
node --check scripts/build_voidchain_org_path_preserving_edge_packet_v1.mjs
node --check scripts/verify_voidchain_org_path_preserving_edge_packet_v1.mjs
node --check scripts/prove_voidchain_org_path_preserving_edge_packet_v1.mjs
bash -n ops/public/install_voidchain_org_path_preserving_edge_packet_v1.sh
node scripts/prove_voidchain_org_path_preserving_edge_packet_v1.mjs
```

The proof exercises exact dual-host configuration, terminal deny, no path matcher/rewrite, packet hashing, credential-content non-leakage, dirty-repository rejection, in-repository credential rejection, and tamper rejection.
