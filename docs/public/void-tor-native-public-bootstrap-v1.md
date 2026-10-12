# VOID Tor-native public bootstrap v1

Status: source-only transport foundation. This lane does not install Tor, create an onion service, publish an onion address, alter the canonical bootstrap manifest, start a service, access onion-service keys, deploy, or move funds.

## Purpose

VOID must not require a registrar, public DNS, a certificate authority, Cloudflare, GitHub availability, a public IP address, or router port forwarding for first synchronization.

This lane establishes the client-side transport boundary for a canonical Tor v3 seed:

```text
VOID client
  -> numeric-loopback Tor SOCKS5 endpoint
  -> 56-character v3 onion address
  -> restricted VOID public-seed gateway
  -> loopback VOID node
```

The onion hostname is sent to the SOCKS5 proxy as a domain-name request. The client does not resolve it through clearnet DNS.

## Endpoint contract

Enabled onion endpoints use exactly these keys:

```text
transport
base
priority
enabled
temporary
qualification_id
qualified_at
qualified_head
```

Required values include:

- `transport=tor_v3_http`;
- `base=http://<56-base32>.onion` with virtual port 80 and no path;
- `enabled=true`;
- `temporary=false`;
- a content-addressed `voidptq1_<sha256>` qualification ID emitted by the Tor seed qualification contract;
- a bounded valid qualification timestamp; and
- a positive qualified head.

Unknown fields, duplicate endpoints, non-v3 addresses, HTTPS onion origins, alternate ports, credentials, query strings, fragments, and paths fail closed.

## SOCKS boundary

The transport accepts only a numeric-loopback SOCKS endpoint. Remote SOCKS proxies are rejected. The SOCKS5 request uses address type `DOMAINNAME`, preserving onion resolution inside Tor.

Successful HTTP responses require:

- HTTP 200;
- JSON content type;
- bounded response bytes;
- valid JSON; and
- `x-void-public-seed-gateway: v1`.

Redirects, malformed responses, missing gateway identity, oversized bodies, and query-polluted paths fail closed.

## Proof

Run:

```bash
node scripts/prove_void_tor_native_bootstrap_transport_v1.mjs
```

The proof implements an in-process SOCKS5 fixture and verifies the requested hostname remains the exact onion address. It does not invoke operating-system DNS or connect to the public internet.

Expected marker:

```text
VOID_TOR_NATIVE_BOOTSTRAP_TRANSPORT_V1_PROOF_GREEN
dns_resolution_required=false
domain_registrar_required=false
certificate_authority_required=false
cloud_provider_required=false
socks_proxy_loopback_only=true
gateway_identity_required=true
tor_qualification_receipt_prefix_required=true
wallet_signer_validator_wc_money_authority=0
```

The client accepts the canonical `voidptq1_...` receipt namespace and rejects the incompatible legacy `voidpsq1_...` prefix.

## Next integration steps

A later reviewed lane must:

1. extend the canonical bootstrap manifest status contract to support qualified onion seeds;
2. wire this transport into the public-bootstrap resolver and loopback adapter;
3. create a persistent Tor v3 onion service mapped to the restricted gateway, preferably through a Unix socket;
4. bind onion-service identity backup and recovery outside the repository;
5. replace GitHub-only manifest discovery with a signed embedded trust root and multi-source retrieval;
6. run an ordinary-machine Tor-only clone-and-sync proof; and
7. keep clearnet mirrors optional and non-authoritative.

## Authority boundary

This source does not create, read, export, or rotate onion-service private keys. It does not access Cloudflare, DNS, credentials, wallets, signers, validators, Work Credits, or treasury assets. It does not publish a manifest or make any network service reachable.
