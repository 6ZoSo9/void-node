# VOID Tor-native public seed v1

Status: source-only activation and qualification lane. Nothing in this source change starts a service, creates an onion identity, publishes a bootstrap manifest, accesses credentials, changes DNS, accesses a wallet or signer, mutates validators or Work Credit, or moves funds.

## Sovereignty boundary

The canonical Tor path requires no registrar, public DNS zone, CDN, cloud account, certificate authority, inbound public IP, router port forwarding, Tailnet membership, or external operator approval.

```text
ordinary node
  -> local Tor SOCKS5 domain request
  -> stable v3 onion identity
  -> hidden-service virtual port 80
  -> 127.0.0.1:4111 restricted public seed gateway
  -> 127.0.0.1:4100 VOID read-only synchronization routes
```

The Tor identity is stored outside the repository in a dedicated private data root. Reinstallation preserves it. Fail-closed activation stops both user services without deleting that identity.

## Plan and installation

All commands bind to one exact clean repository head and require an absolute Tor executable:

```bash
SOURCE_SHA="$(git rev-parse HEAD)"
TOR_BIN="$(command -v tor)"

node scripts/install_void_public_seed_tor_v1.mjs plan \
  --repo-root "$PWD" \
  --expected-head "$SOURCE_SHA" \
  --tor "$TOR_BIN"
```

Install and enable the user units without starting them:

```bash
node scripts/install_void_public_seed_tor_v1.mjs install \
  --repo-root "$PWD" \
  --expected-head "$SOURCE_SHA" \
  --tor "$TOR_BIN"
```

Activation is separate and requires the exact confirmation:

```bash
VOID_PUBLIC_SEED_TOR_CONFIRM=activate-void-public-seed-tor-v1 \
node scripts/install_void_public_seed_tor_v1.mjs activate \
  --repo-root "$PWD" \
  --expected-head "$SOURCE_SHA" \
  --tor "$TOR_BIN"
```

Activation verifies the local node is exact-green, refuses occupied loopback gateway or SOCKS ports, starts the restricted gateway, starts Tor, validates the checksum-bearing v3 address, then performs three observations through SOCKS5 domain addressing.

## Qualification contract

The `voidptq1_` receipt requires:

- checksum-valid Tor v3 identity;
- loopback-only SOCKS proxy;
- SOCKS domain addressing with remote name resolution;
- `x-void-public-seed-gateway: v1` on every response;
- positive, agreeing readiness and latest heads;
- `ready=true`, `gap=0`, and `txroot_live=1`;
- exact one-block retrieval of the qualified head;
- at least three strictly ordered observations over at least one minute; and
- no head regression.

The receipt records:

```text
socks_remote_dns=true
dns_required=false
registrar_required=false
certificate_authority_required=false
cloud_account_required=false
tailnet_required=false
manifest_published=false
```

## Remaining acceptance gate

This lane establishes a stable Tor seed identity and qualification contract. A separate reviewed lane must bind fresh `voidptq1_` receipts into the canonical bootstrap manifest and route the public bootstrap client through Tor. Issue #1005 remains open until an ordinary outside machine completes clone/run through Tor and reaches positive head, `gap=0`, and `txroot_live=1` without private configuration.

## Authority boundary

Only the existing read-only seed gateway is exposed. The lane has no wallet, signer, validator, treasury, Work Credit, transaction-submission, operator-mutation, or money-movement authority.
