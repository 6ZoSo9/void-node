# VOID public seed raw-IP TLS ingress packet v1

Status: source-only packet lane stacked on PR #1031. No VPS, certificate, firewall, service, manifest, credential, or public endpoint is created by this source change.

## Port boundary

The raw-IP stable seed uses:

```text
80/tcp   ACME HTTP-01 challenge only
443/tcp  restricted HTTPS synchronization
4700/tcp native VOID P2P
```

The node HTTP service remains on `127.0.0.1:4100`. The existing restricted public-seed gateway remains on `127.0.0.1:4111`. Public ingress never exposes the full node HTTP port.

## Certificate boundary

The packet requires Certbot 5.4 or newer and requests an IP-address certificate with the `shortlived` profile and `webroot` challenge. Certbot’s normal `/etc/letsencrypt/live/<IP>/` symlinks are resolved only into the matching `/etc/letsencrypt/archive/<IP>/` lineage. The packet installs a six-hour renewal check and an atomic deploy hook that:

- verifies the certificate covers the exact public IPv4 address;
- verifies the certificate and private key match;
- copies them into a private service-owned directory;
- sets the private key to mode `0400`; and
- restarts only the TLS ingress service.

The packet does not request a certificate automatically.

## Runtime boundary

The TLS proxy:

- serves only `/.well-known/acme-challenge/<token>` over HTTP;
- rejects all other HTTP routes;
- accepts only the exact IP Host header over HTTPS;
- rejects absolute-form, scheme-relative, control-character, and non-origin-form request targets before upstream construction;
- permits only `GET` and `HEAD`;
- forwards only to `http://127.0.0.1:4111`;
- caps response bodies; and
- can run before initial issuance in explicit `TLS_PENDING` state.

The restricted gateway remains the authoritative route allowlist and private-route boundary. Its exact source is copied into the content-addressed packet and installed under `/usr/local/libexec`; services never execute from a mutable checkout.

## Packet generation

On the future VPS, from one clean exact checkout containing merged PR #1031 and this lane:

```bash
node scripts/build_void_public_seed_raw_ip_tls_packet_v1.mjs \
  --public-ip <VPS_PUBLIC_IPV4> \
  --repo-root "$PWD" \
  --expected-head "$(git rev-parse HEAD)" \
  --node "$(command -v node)" \
  --certbot "$(command -v certbot)" \
  --output "$HOME/void-public-seed-raw-ip-tls-packet-v1"
```

The output must remain outside the repository. Node.js and Certbot must resolve to canonical system paths outside `/home`, `/root`, and `/run/user`, matching the generated systemd sandbox. The packet records exact source, executable hashes, file hashes, port policy, and all authority flags.

## Installation boundary

Installation requires root and the exact confirmation token:

```bash
sudo VOID_PUBLIC_SEED_INSTALL_CONFIRM=install-raw-ip-tls-ingress-v1 \
  bash ops/public/install_void_public_seed_raw_ip_tls_packet_v1.sh \
  "$HOME/void-public-seed-raw-ip-tls-packet-v1" \
  "$PWD"
```

By default, installation does not start services, apply firewall policy, or request a certificate. Those remain explicit later actions.

## Remaining acceptance

This lane does not close issue #1005. Closure still requires:

1. a provisioned dedicated VPS;
2. exact reviewed node source and authority-free chain state;
3. successful short-lived IP-certificate issuance and automated renewal;
4. exact-green live qualification;
5. reviewed manifest publication; and
6. an ordinary-machine clone/run reaching nonzero `ready=true`, `gap=0`, and `txroot_live=1`.

No wallet, signer, treasury, validator-admission, Buy VOID, Work Credit, or money-moving authority belongs on the VPS.
