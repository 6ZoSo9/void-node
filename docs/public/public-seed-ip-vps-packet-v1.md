# VOID public-seed raw-IP VPS packet v1

Status: source-only packet generation and verification contract. This lane does
not provision or access a VPS, issue a certificate, install a service, publish a
bootstrap manifest, or activate public ingress.

## Purpose

Issue #1005 needs a durable public seed that survives a home move and does not
depend on Tailscale, a private `100.x` address, a home router, or inaccessible
legacy domains.

The packet targets this shape:

```text
ordinary node
    |
    +-- HTTPS 443 --> nginx --> 127.0.0.1:4111 restricted gateway
    |
    +-- native TCP 4700 --> VOID public seed full node
```

The full node binds HTTP only to `127.0.0.1:4100`. The restricted gateway binds
only to `127.0.0.1:4111`. Neither port may be publicly reachable.

## Host floor

The first host contract is:

- Ubuntu 24.04;
- one stable globally routable IPv4;
- at least 2 vCPU;
- at least 4 GiB RAM;
- at least 80 GiB storage; and
- inbound TCP 80, 443, and 4700 only.

The packet does not select or purchase a provider.

## TLS without a domain

The packet uses a publicly trusted IP-address certificate and the `shortlived`
ACME profile. Activation requires Certbot 5.4 or newer with `--ip-address`,
`--preferred-profile shortlived`, and HTTP-01 webroot validation.

IP-address certificates are short-lived, so renewal must be automated. The
packet includes a six-hour renewal timer and a deploy hook that validates and
reloads nginx. Certbot obtains the certificate; the packet installs the nginx
certificate paths explicitly because Certbot does not assume automatic web
server installation for IP-address certificates.

## Snapshot boundary

A VPS cannot become a useful stable seed from an empty local chain while the
canonical public manifest remains in hold. Before activation it needs an exact
validated chain snapshot in the configured data directory.

The snapshot may contain public chain and node synchronization state only. It
must not contain wallet, signer, validator, treasury, Work Credit, Buy VOID,
payment, credential, or operator-authority material.

## Live continuity boundary

A snapshot is only an initial state transfer. It does not make the VPS a durable
seed. P2P block messages are announcements; canonical full blocks advance
through validated HTTP pulls.

The packet therefore requires one credential-free numeric-loopback HTTP
continuity origin, defaulting to `http://127.0.0.1:4199`. A separately reviewed
reverse transport or local adapter must map that loopback origin to one
canonical restricted gateway. The generated node enables the existing bounded
follower loop against only that numeric-loopback origin.

The packet does not create the reverse transport, access its credentials, or
open another public port. Qualification and manifest publication remain held
until repeated pulls prove a non-regressing live head after the snapshot import.
Proposer or validator placement on the VPS remains a separate authority review.

## Build

Run only from a completely clean exact checkout:

```bash
node scripts/build_void_public_seed_ip_vps_packet_v1.mjs \
  --public-ip PUBLIC_VPS_IPV4 \
  --repo-root "$PWD" \
  --expected-head "$(git rev-parse HEAD)" \
  --continuity-origin http://127.0.0.1:4199 \
  --output "$HOME/void-public-seed-ip-vps-packet"
```

The output must remain outside the repository.

## Verify

```bash
node scripts/verify_void_public_seed_ip_vps_packet_v1.mjs \
  "$HOME/void-public-seed-ip-vps-packet" \
  --repo-root "$PWD" \
  --expected-head "$(git rev-parse HEAD)"
```

The verifier requires a completely clean checkout at the explicit expected
commit. It independently hashes `tools/void-public-seed-gateway-v1.mjs`; packet
self-claims are not sufficient.

Verification checks:

- content-addressed packet identity;
- exact clean source checkout and explicit expected commit;
- restricted-gateway source hash bound to that checkout;
- globally routable IPv4 only;
- exact generated file set, sizes, hashes, and modes;
- node HTTP loopback-only binding;
- gateway HTTP loopback-only binding;
- public P2P advertisement on TCP 4700;
- nginx TLS proxying only to the restricted gateway;
- short-lived IP-certificate issuance and renewal instructions;
- exact numeric-loopback continuity origin and bounded follower-autostart settings;
- snapshot-only publication rejection and live-progress requirement;
- no public continuity port and no embedded transport credential;
- no domain, Cloudflare Tunnel, Tailscale, or private address dependency;
- no embedded private keys, mnemonic material, transaction methods, or
  economic authority; and
- all activation flags false.

## Activation boundary

Packet generation is not activation. Future explicit authorization is required
for each of these actions:

1. purchasing or provisioning a VPS;
2. accessing it over SSH;
3. installing packages or source;
4. importing a chain snapshot;
5. opening firewall ports;
6. issuing staging or production certificates;
7. installing or starting services;
8. establishing the separately reviewed loopback continuity transport;
9. proving repeated non-regressing follower pulls;
10. running live qualification;
11. publishing the canonical manifest; and
12. asking an outside machine to complete the normal clone/run proof.

Issue #1005 remains open until the stable endpoint and outside-machine proof are
exact-green.
