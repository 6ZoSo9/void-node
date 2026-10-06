# Credential-request loopback connector policy v1

## Purpose

This source-only contract defines the minimum host-policy shape required before
the PROXY-v2 source metadata used by the public credential-request edge can be
considered eligible for live trust.

It does not inspect or mutate a live host. A successful decision means only
`POLICY_SHAPE_QUALIFIED_NOT_LIVE`.

The later designated-host collector must prove that the exact service
identities, listener and nftables rules described here are actually installed
and active before any runtime lane may set `local_transport_trust_proven=true`.

## Upstream source boundary

The merged credential edge composition already requires:

- PROXY protocol v2;
- TLS-terminated public port 443;
- exact IPv4 loopback adapter target;
- strict request-line/source composition;
- spoofable forwarding/source-header removal; and
- edge-local source identity.

It intentionally reports `local_transport_trust_proven=false` because another
local process can otherwise open a TCP connection to the loopback adapter and
supply forged PROXY-v2 bytes.

## Reviewed host-policy shape

The qualifier accepts one canonical policy object.

### Funnel

Required:

- `proxy_protocol_version=2`;
- `tls_terminated_tcp_port=443`;
- target exactly `tcp://127.0.0.1:<adapter-port>`.

The adapter port is private/local and must be at least 1024.

### Connector identity

The reviewed Linux policy uses `tailscaled.service` as the trusted connector
service and requires the connector socket UID/GID to be root (0/0).

This is intentionally a host-trust-domain decision. It does not prove the
specific root process creating each socket; other root/CAP_NET_ADMIN-equivalent
compromise is explicitly outside this policy's threat model.

### Adapter

The adapter must:

- listen only on `127.0.0.1:<adapter-port>`;
- expose no IPv6 listener;
- run with non-root UID/GID;
- have `NoNewPrivileges=true`; and
- have no `CAP_NET_ADMIN`.

### Existing public gateway

The existing public gateway must also run as non-root, have
`NoNewPrivileges=true`, and have no `CAP_NET_ADMIN`.

The adapter and gateway do not receive authority to change the firewall.

### nftables

The reviewed policy is a dedicated root-owned nftables table:

- family: `inet`;
- table: `void_credential_edge_v1`;
- base chain: `output`;
- type: `filter`;
- hook: `output`;
- priority: `0`;
- chain policy: `accept`.

Its exact rule list contains two rules in order.

Rule 1 permits the trusted connector socket identity only:

```text
oifname lo
ip daddr 127.0.0.1
l4proto tcp
tcp dport <adapter-port>
meta skuid 0
accept
```

Rule 2 rejects every other local socket UID for the same destination:

```text
oifname lo
ip daddr 127.0.0.1
l4proto tcp
tcp dport <adapter-port>
drop
```

The source qualifier requires the ruleset to be represented as immutable to the
adapter and public-gateway identities. A later host collector must prove the
actual root ownership, active ruleset and capability boundary; caller assertions
alone are not live qualification.

nftables documents `meta skuid` as the UID associated with the originating
socket. This policy uses that primitive only to exclude ordinary unprivileged
local connectors. It is not a defense against a compromised root-equivalent
process.

## Threat boundary

A source-qualified policy establishes only this conditional statement:

> If the reviewed policy is loaded exactly as described and the collected
> service identities are accurate, ordinary non-root local processes cannot
> originate TCP connections to the adapter port.

It does not establish:

- exact connector-process identity beyond root socket UID;
- root/CAP_NET_ADMIN compromise resistance;
- live nftables state;
- live tailscaled process identity;
- live adapter listener identity;
- live Funnel configuration;
- durable participant identity;
- NAT-independent participant isolation;
- rate-state custody;
- HTTP parser/stream binding; or
- runtime integration.

Therefore all of these remain false:

```text
exact_connector_process_identity_proven=false
live_host_evidence_verified=false
nftables_ruleset_live_verified=false
tailscaled_process_live_verified=false
listener_live_verified=false
local_transport_trust_proven=false
tailscale_funnel_configuration_verified=false
runtime_integration=false
```

## Required later host collector

A separate read-only collector should bind at minimum:

- exact repository/source head;
- host identity;
- `tailscaled.service` MainPID and effective UID/GID;
- adapter/public-gateway MainPID and effective UID/GID;
- effective capability sets, including absence of CAP_NET_ADMIN for adapter and
  gateway;
- `NoNewPrivileges` state;
- exact loopback listener address/port and owning PID;
- exact `tailscale funnel status` / reviewed Funnel configuration;
- canonical nftables JSON ruleset;
- table/chain hook, priority and rule ordering;
- root ownership of persisted ruleset/configuration;
- evidence timestamp/generation.

Any mismatch, absent firewall rule, wrong process identity, changed listener,
missing Funnel config, or ability of an unprivileged local process to connect
must HOLD.

## Proof

```bash
node scripts/prove_agent_paid_work_credential_request_loopback_connector_policy_v1.mjs
node --check tools/void-agent-paid-work-credential-request-loopback-connector-policy-v1.mjs
node --check scripts/prove_agent_paid_work_credential_request_loopback_connector_policy_v1.mjs
npm run typecheck
npm run build
git diff --check
```

The synthetic proof covers a canonical policy and adversaries for:

- wrong PROXY version;
- wrong public TLS port;
- wrong loopback target;
- public/wildcard or IPv6 adapter exposure;
- root adapter identity;
- adapter/gateway CAP_NET_ADMIN;
- missing NoNewPrivileges;
- wrong connector service/UID;
- non-root-owned or service-mutable firewall;
- missing/extra/reordered firewall rules;
- wrong connector UID;
- wrong adapter port/interface; and
- nonconnector rule changed from drop.

## Authority boundary

This contract performs no live nftables, Tailscale, systemd, process, socket or
listener read or mutation. It creates no listener and changes no service.

It grants no credential issuance, registry mutation, paid-work dispatch, WC
write, wallet/key/signer access, transaction, Chain-2050 write, market/presale
activation, treasury/liquidity authority or funds movement.
