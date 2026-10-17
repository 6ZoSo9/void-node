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
  -> optional hidden-service virtual port 4700
       -> 127.0.0.1:4700 existing VOID P2P listener
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

The historical default remains HTTP-seed-only. On Nimo, the reviewed public P2P introduction requires the existing onion identity to additionally publish exactly virtual port 4700 to the already-running loopback-reachable P2P listener on port 4700. Enable that mapping explicitly in plan/install/activate with:

```text
--p2p-virtual-port 4700 --p2p-target-port 4700
```

The pair is closed: supplying only one flag, or any P2P port other than 4700, fails. The HTTP virtual-port 80 mapping remains present. When the P2P option is enabled, the installer also reads the exact canonical `nimo-tor-v3-p2p` introduction from the clean expected repository head and binds activation to that onion identity and expected node ID. An existing mismatched hostname is rejected before service enablement; a newly created/reused hostname is rechecked immediately after Tor starts and fails closed before qualification. Activation also refuses the P2P mapping when the target port is not already occupied; exact process/node-identity ownership remains a separate designated-host qualification rather than being inferred from port occupancy.

Install the user units in a stopped and disabled state. Installation first stops and disables any prior copies, rejects symlink-parent path escapes, and writes configuration and units atomically without following symlink targets:

```bash
node scripts/install_void_public_seed_tor_v1.mjs install \
  --repo-root "$PWD" \
  --expected-head "$SOURCE_SHA" \
  --tor "$TOR_BIN"

# Nimo P2P publication uses the same command plus:
#   --p2p-virtual-port 4700 --p2p-target-port 4700
```

Activation is separate and requires the exact confirmation:

```bash
VOID_PUBLIC_SEED_TOR_CONFIRM=activate-void-public-seed-tor-v1 \
node scripts/install_void_public_seed_tor_v1.mjs activate \
  --repo-root "$PWD" \
  --expected-head "$SOURCE_SHA" \
  --tor "$TOR_BIN"

# Nimo P2P publication uses the same command plus:
#   --p2p-virtual-port 4700 --p2p-target-port 4700
```

The activation confirmation is checked before any managed file or systemd mutation. Only confirmed activation enables the units. Activation begins from stopped and disabled units, requires a numeric positive local head, refuses occupied loopback gateway or SOCKS ports, starts the restricted gateway, starts Tor, validates the checksum-bearing v3 address, then performs three observations through SOCKS5 domain addressing. The cleanup boundary covers readiness, port, enablement, startup, identity, and qualification failures; every failed activation disables and stops both units while preserving the onion identity.

## Qualification contract

The `voidptq1_` receipt requires:

- checksum-valid Tor v3 identity;
- loopback-only SOCKS proxy, rejected before any network access;
- SOCKS domain addressing with remote name resolution;
- `x-void-public-seed-gateway: v1` on every response;
- positive, agreeing readiness and latest heads;
- `ready=true`, `gap=0`, and `txroot_live=1`;
- exact one-block retrieval of the qualified head;
- at least three strictly ordered, closed-schema observations over at least one minute;
- a fresh final observation bound to the receipt generation time;
- numeric positive observation heads with no head regression; and
- an exact requested onion virtual port on every SOCKS observation.

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

The default lane exposes only the existing read-only seed gateway. The explicit Nimo P2P option exposes the already-existing authenticated VOID P2P listener through Tor; it does not create a new node listener or weaken P2P identity authentication. The lane has no wallet, signer, validator, treasury, Work Credit, transaction-submission, operator-mutation, or money-movement authority.
