# VOID home public reachability proof v1

Status: home-direct public reachability not proven.

This document records the first external reachability probe for the local Precision
VOID node public surface.

## Known good local truth

The node was healthy locally:

- repo branch: main
- checkpoint: ckpt-public-bootstrap-gateway-routes-v1-green-20260606-084040
- ready: true
- gap: 0
- txroot_live: 1

Public surface listeners were present:

- 4100 bound on 0.0.0.0
- 4700 bound on 0.0.0.0

RPC remained private:

- 8545 bound on 127.0.0.1 only

## Public IPs discovered

- IPv4: 108.232.1.111
- IPv6: 2600:1700:4054:ae00:7fc0:105e:8504:87c4

## External tcpdump result

The capture window observed local loopback and Tailscale traffic only.

Summary:

- observed_only_local_or_tailscale=true
- tcp_syn_seen=true
- no confirmed public WAN ingress to tcp/4100

## Decision

The home Precision node is not treated as a reliable public internet seed.

Precision remains the source-of-truth builder/prover.

The recommended public architecture is:

1. Precision: canonical builder, prover, operator workstation.
2. VPS: public bootstrap gateway / public seed.
3. Home router exposure: optional later convenience, not a launch blocker.

## Safety invariant

The private JSON-RPC surface must remain non-public.

Required invariant:

- 8545 must not bind to 0.0.0.0
- 8545 must not be exposed through router/VPS/public gateway
