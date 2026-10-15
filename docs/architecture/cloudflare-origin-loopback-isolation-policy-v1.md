# Cloudflare origin loopback isolation policy v1

Marker: `VOID_CLOUDFLARE_ORIGIN_LOOPBACK_ISOLATION_POLICY_V1`

Issue: #2984.

## Purpose

Merged #3006 defines the Cloudflare visitor-address -> strict PROXY-v2 source
translation contract. Merged #3038 binds that contract to a bounded loopback
runtime. Neither change makes `CF-Connecting-IP` trusted on its own.

The remaining local trust problem is concrete: the historical named cloudflared
Tunnel is a **user-manager** service in the ordinary user trust domain. A
loopback listener plus an HTTP header cannot distinguish cloudflared from
another process running under that same ordinary UID.

This source-only policy defines the target local isolation shape needed before
the merged translator/runtime may become source-rate authority.

It does not install, stop, start, migrate, or reconfigure any service.

## Required service identity migration

The historical user-manager unit:

`void-public-seed-named-tunnel-v1.service`

must be retired before live acceptance.

The accepted target shape reuses the named Tunnel service identity in the
**system** manager under a dedicated non-root UID/GID. The cloudflared service
must have:

- `manager_scope=system`;
- non-root UID/GID;
- `NoNewPrivileges=true`;
- no effective `CAP_NET_ADMIN`;
- a UID and GID distinct from both the Cloudflare adapter and the public-443
  dispatcher.

Using the historical ordinary-user identity fails the policy.

This contract does not select numeric production UID/GID values.

### Tunnel config and credential custody

The dedicated cloudflared identity must also own the locally managed Tunnel
configuration and Tunnel credentials metadata used by the system service.

The target policy requires both files to be:

- owned by the dedicated cloudflared UID;
- inaccessible to group/other permission bits;
- single-link regular-file generations; and
- outside the repository.

This closes the migration loophole where the historical ordinary user could
retain readable Tunnel credentials and start a competing connector after the
service UID changes.

Live qualification must inspect only file metadata/path custody for this gate.
Credential **contents are not authorized to be read** by this policy.

## Sensitive Tunnel route set

For public hostname `seed.nullfeed.org`, the dedicated cloudflared identity
must route exactly these sensitive paths to the Cloudflare adapter:

- `/__void/agents/paid-work/credential-requests/v1`;
- `/wc/public-earning-pilot-v1/claim-ticket`;
- `/wc/public-earning-pilot-v1/submit-result`.

The sensitive origin must be exact IPv4 loopback and the same port owned by the
#3038 adapter candidate.

The sensitive origin also requires:

- `httpHostHeader: seed.nullfeed.org`, binding the canonical Host consumed by
  the #3038 adapter; and
- `disableChunkedEncoding: true`, because #3038 deliberately rejects
  `Transfer-Encoding` and accepts only bounded `Content-Length` framing.

Those settings apply to the three sensitive rules, not to unrelated ordinary
origin routes.

Ordinary site, status, bootstrap, download, and other reviewed read routes are
required to remain outside the sensitive adapter path.

The policy also requires future live acceptance to prove both:

- no active Worker/subrequest path can rewrite the visitor source identity; and
- Cloudflare Pseudo IPv4 is set to `Off` for this hostname or replaced by
  a separately reviewed identity contract.

Those are policy requirements here, not live observations. They require a
separately reviewed **Cloudflare control-plane** observation; they cannot be
proven from Precision process/filesystem state alone.

## Adapter and dispatcher

The target services are fixed to:

- `void-cloudflare-origin-proxy-v2-adapter-v1.service`;
- `void-public-443-proxy-v2-dispatch-v1.service`.

Both must be system-manager services with distinct non-root UID/GID identities,
`NoNewPrivileges=true`, and no effective `CAP_NET_ADMIN`.

The adapter and dispatcher must each own exactly one IPv4-loopback listener for
this policy surface, no IPv6 listener, and no additional listener.

The policy binds the source-runtime markers:

- `VOID_CLOUDFLARE_ORIGIN_PROXY_V2_RUNTIME_V1`;
- `VOID_PUBLIC_443_PROXY_V2_DISPATCH_RUNTIME_V1`.

## Root-owned OUTPUT policy

The source policy requires one root-owned nftables table:

- family: `inet`;
- table: `void_cloudflare_origin_edge_v1`;
- chain: `output`;
- type: `filter`;
- hook: `output`;
- priority: `0`;
- default policy: `accept`.

Exactly four rules are required, in order:

1. dedicated cloudflared UID -> adapter loopback port: accept;
2. every other local UID -> adapter loopback port: drop;
3. adapter UID -> dispatcher loopback port: accept;
4. every other local UID -> dispatcher loopback port: drop.

The cloudflared, adapter, and dispatcher service identities may not mutate the
ruleset.

This blocks ordinary unprivileged local processes from minting their own
`CF-Connecting-IP` requests directly to the adapter or bypassing the adapter
and injecting strict-looking PROXY-v2 bytes directly into the dispatcher.

Root-equivalent compromise remains outside this policy's threat model because
root can change the firewall or service identities.

## Relationship to existing sensitive-edge policies

This policy stops at adapter -> dispatcher.

The dispatcher -> credential edge -> dedicated credential gateway path remains
governed by the existing credential loopback/downstream isolation policies.

The dispatcher -> Earn edge -> dedicated Earn gateway path remains governed by
the existing Public Earn loopback isolation policy and rate-state custody
contract.

The focused workflow reruns those existing policy proofs so this source
generation cannot silently become incompatible with either downstream lane.

## Positive result semantics

A valid source object returns:

`POLICY_SHAPE_QUALIFIED_NOT_LIVE`.

It may state that the target topology shape is internally consistent, including
the exact route set and ordered firewall rules.

It must still report all of the following as false:

- live host evidence;
- live cloudflared process identity;
- historical user Tunnel retirement;
- live Tunnel path ownership;
- Worker rewrite absence;
- Pseudo IPv4 `Off` state;
- live nftables ruleset;
- listener ownership;
- cloudflared UID isolation;
- dispatcher exclusive reachability;
- local transport trust;
- runtime integration.

## Required later acceptance evidence

A read-only designated-host collector must eventually bind the local facts:

- exact source/release generation;
- system-manager cloudflared MainPID + start ticks + effective UID/GID;
- absence/inactivity of the historical user-manager Tunnel generation;
- private same-UID config/credential file custody without reading credential
  contents;
- adapter and dispatcher MainPID + start ticks + effective UID/GID;
- exact loopback listener ownership and absence of extra listeners;
- `NoNewPrivileges` and effective capability sets;
- canonical root-owned nftables ruleset and rule order;
- current Tunnel public-hostname/path configuration;
- adapter and dispatcher running source identity; and
- restart/rollback behavior.

A **separate Cloudflare control-plane observation** must establish the zone-level
facts the host cannot know:

- no active Worker/subrequest path can rewrite the visitor source identity for
  the three sensitive routes; and
- Pseudo IPv4 is exactly `Off` for the accepted source
  contract.

Finally, external acceptance must prove two independent source addresses reach
distinct PROXY-v2 rate identities through the real public hostname.

Any missing or ambiguous observation in any of these three evidence domains
must HOLD.

## Authority

Source/test/CI only.

No systemd/service lifecycle action, Tunnel or DNS change, nftables/network
mutation, credential issuance, paid-work dispatch, Work Credit write,
wallet/key/signer access, payment/transaction, presale/market activation,
treasury/liquidity action or funds movement is authorized or performed.

**PROTECT THE CORE.**
