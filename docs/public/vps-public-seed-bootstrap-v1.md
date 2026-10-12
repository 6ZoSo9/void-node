# VOID VPS public seed bootstrap v1

Status: plan/proof lane.

This document defines the recommended public internet path for VOID Network
after home-direct reachability was not proven.

## Decision

Precision remains the canonical builder/prover/operator workstation.

A VPS should be used as the public bootstrap seed/gateway.

The VPS is the internet-facing entry point. Precision remains the trusted
source-of-truth box.

## Why VPS instead of home router exposure

Home-direct tcp/4100 reachability was not proven. The observed traffic was
local/Tailscale only.

A VPS gives VOID a stable public address, cleaner firewall control, easier DNS,
cleaner monitoring, and avoids depending on residential router/ISP behavior.

## Public surfaces allowed on VPS

The VPS public gateway may expose:

- participant UI
- public readiness/status
- public bootstrap discovery metadata
- public DataNet materialized status
- static public docs/download surfaces

## Public surfaces blocked on VPS

The VPS must not expose:

- private JSON-RPC
- validator mutation/admin endpoints
- private operator dashboards
- private keys, secrets, wallets, mnemonics, tokens, .env files, or runtime auth
- unrestricted filesystem browsing
- private Tailscale/admin-only surfaces

## Required invariant

The private JSON-RPC surface must remain private.

Required:

- 8545 must not bind to 0.0.0.0
- 8545 must not be reverse-proxied publicly
- 8545 must not be exposed through router, VPS, nginx, Caddy, SSH tunnel, or Tailscale funnel

## Recommended architecture

Phase 1: public HTTP seed gateway

- VPS listens publicly on 80/443 and optionally 4100.
- VPS serves or proxies only allowlisted public routes.
- Precision remains private builder/prover.
- Public gateway route allowlist is explicit.

Phase 2: public bootstrap metadata

- Publish public seed URL.
- Publish public route list.
- Publish blocked private surface list.
- Publish current checkpoint/tag.
- Publish proof result.

Phase 3: DNS and HTTPS

- Point a VOID-owned domain/subdomain to VPS.
- Terminate HTTPS on VPS.
- Keep raw RPC private.

## Initial VPS requirements

Recommended minimum:

- Ubuntu LTS
- 1 vCPU
- 1 GB RAM minimum, 2 GB preferred
- 20 GB disk minimum
- static IPv4
- SSH key access
- firewall access

## Operator workflow

1. Provision VPS.
2. Create non-root operator user if needed.
3. Install only required public gateway dependencies.
4. Configure firewall to allow SSH and public HTTP/HTTPS.
5. Do not open 8545.
6. Deploy public gateway.
7. Run remote public-surface proof.
8. Record checkpoint.

## Launch blocker status

Home-direct public reachability is not a launch blocker once VPS seed gateway is
available.

The public seed gateway becomes the launch-facing internet surface.
