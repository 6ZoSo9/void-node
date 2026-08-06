# VOID public-seed WireGuard continuity packet v1

Status: source-only packet generation and verification contract. This lane does
not generate WireGuard keys, access private keys, install packages, change a
firewall, create an interface, start a service, connect to a VPS, publish a
manifest, deploy, or move funds.

## Purpose

The raw-IP VPS stack requires `http://127.0.0.1:4199` to remain a live,
canonical continuity origin. A chain snapshot alone becomes stale. The first
transport must survive home-address changes without adding a domain, Tailscale,
or another public TCP listener.

This packet uses a two-peer WireGuard link:

```text
Precision restricted gateway
127.0.0.1:4111
        |
systemd-socket-proxyd
10.205.0.2:4199
        |
WireGuard, authenticated /32 peers
Precision -> VPS public IPv4 UDP 443
        |
systemd-socket-proxyd
127.0.0.1:4199
        |
VPS bounded follower autostart
```

HTTPS continues on TCP 443. WireGuard uses UDP 443, so it does not consume a
new public TCP port. The VPS peer accepts only the Precision WireGuard public
key and `10.205.0.2/32`. Precision initiates toward the stable VPS IP and uses a
25-second persistent keepalive to preserve the NAT mapping.

No IP forwarding is required. Both ends use socket-activated stream proxies.
The Precision proxy listens only on the WireGuard address and forwards only to
the existing loopback restricted gateway. The VPS proxy listens only on
loopback and forwards only to the Precision WireGuard address.

## Secret boundary

The packet accepts WireGuard public keys only. Private keys:

- are generated separately after explicit authorization;
- remain outside the repository and packet;
- are referenced by absolute paths;
- must be regular non-symlink files with mode `0600`; and
- are never printed, copied, hashed, or read by the packet builder.

The generated interface scripts read the private key only when separately
installed and activated on the target host.

## Build

Run from a clean exact checkout after separately generating and exchanging only
the two public keys:

```bash
node scripts/build_void_public_seed_wireguard_continuity_packet_v1.mjs \
  --public-ip PUBLIC_VPS_IPV4 \
  --vps-public-key VPS_WIREGUARD_PUBLIC_KEY \
  --precision-public-key PRECISION_WIREGUARD_PUBLIC_KEY \
  --repo-root "$PWD" \
  --expected-head "$(git rev-parse HEAD)" \
  --output "$HOME/void-public-seed-wireguard-continuity-packet"
```

The output and private-key paths must remain outside the repository.

## Packet contract

- VPS WireGuard address: `10.205.0.1/32`;
- Precision WireGuard address: `10.205.0.2/32`;
- VPS allowed peer source and explicit route: `10.205.0.2/32`;
- Precision allowed peer destination and explicit route: `10.205.0.1/32`;
- public continuity ingress: UDP 443 only;
- additional public TCP ports: none;
- Precision persistent keepalive: 25 seconds;
- VPS continuity origin: `http://127.0.0.1:4199`;
- Precision restricted gateway: `http://127.0.0.1:4111`;
- proxy concurrency cap: 16 connections;
- no default route, NAT, IP forwarding, DNS, Tailnet, wallet, signer, validator,
  treasury, Work Credit, or money-moving authority.

## Generated files

The content-addressed output contains:

- VPS and Precision WireGuard interface scripts;
- VPS and Precision systemd interface services;
- VPS and Precision socket-proxy sockets and services;
- installation and live-proof instructions; and
- `packet.json` with exact hashes, sizes, modes, source bindings, and all
  activation flags false.

Packet generation is not installation or activation.

## Ordered deployment gates

Each gate requires separate review and authorization:

1. select and purchase the VPS;
2. generate the two WireGuard private keys outside the repository;
3. exchange only public keys and build the exact packet;
4. review the packet and target file paths;
5. install WireGuard and generated files without starting services;
6. open VPS UDP 443 while preserving TCP 80, 443, and 4700;
7. start the Precision and VPS WireGuard interfaces;
8. prove an authenticated handshake and exact `/32` routes;
9. start the Precision proxy, then the VPS loopback proxy;
10. prove `http://127.0.0.1:4199/__void/ready.json` on the VPS;
11. prove repeated non-regressing follower pulls;
12. issue and install the IP-address TLS certificate;
13. run live multi-sample qualification;
14. publish the reviewed manifest; and
15. complete outside-machine clone/run acceptance.

## Authority boundary

This source lane has no authority to generate or access keys, purchase or access
a VPS, install software, modify network interfaces or firewall rules, start or
restart services, import a snapshot, issue a certificate, run live
qualification, publish a manifest, access a wallet or signer, mutate validators
or Work Credits, submit a transaction, or move funds.
