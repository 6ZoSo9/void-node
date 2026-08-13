# VOID Node-Hosted Public Domains Plan v1

Marker: `VOID_NODE_HOSTED_PUBLIC_DOMAINS_PLAN_V1`

## Purpose

VOID owns the domains:

- `voidchain.org`
- `nullfeed.org`

These domains are public identity and DNS assets only.

They must point to VOID node-hosted services. They must not imply Google Cloud hosting, Cloud Run hosting, VPS hosting, managed platform hosting, or paid web hosting.

## Core doctrine

VOID public surfaces should be hosted by VOID nodes.

Domains are names. Nodes are the host.

## Domain roles

### voidchain.org

`voidchain.org` is the canonical public VOID Network / VOID Chain identity domain.

It should eventually resolve to a node-hosted VOID public gateway that exposes:

- `/`
- `/buy-void`
- `/funding`
- `/participant`
- `/public-node`
- `/public-node/route-index.json`
- `/public-node/datanet/challenge/demo003-folder-fixture-v1`
- `/proofs`
- `/.well-known/void-public-node.json`

Primary CTAs:

1. Buy VOID / Fund Development
2. Participant / Earn WC
3. DataNet Verification
4. Public Node / Proof Dashboard

### nullfeed.org

`nullfeed.org` is the canonical NullFeed / DataNet media identity domain.

It should eventually resolve to node-hosted NullFeed and DataNet surfaces:

- `/`
- `/feed`
- `/datanet`
- `/verify`
- `/objects`
- `/proofs`
- `/.well-known/void-public-node.json`

## Current verified public seed

Current public seed URL:

```text
https://zoso-alienware-aurora-r7.taila47fd.ts.net

This remains the verified public node-hosted seed until custom-domain DNS and HTTPS are proven.

No-paid-hosting boundary

This plan does not require:

Google Cloud hosting
Cloud Run
App Engine
Compute Engine
managed web hosting
VPS hosting
paid CDN hosting
paid storage hosting

DNS may be used only as a naming layer if the operator chooses.

Future self-hosted domain path

A future domain promotion lane should prefer:

Node-hosted service remains source of truth.
DNS points domain/subdomain to the node-hosted front door.
HTTPS is terminated by node-controlled infrastructure.
Public route parity is proven against the current seed.
Private/operator/admin/rpc/wallet/secret routes remain blocked.
Funding disclaimers remain visible.
WC remains contribution-credit accounting, not a faucet.
DataNet remains read-only and verification-first.
Safety boundaries

This plan performs no:

DNS mutation
registrar mutation
Google Cloud mutation
Tailscale mutation
hosting purchase
wallet action
money movement
automatic VOID fulfillment
Work Credit ledger write
public mutation
operator route exposure
private JSON-RPC exposure
Non-negotiable trust rule

Public domain promotion must not outrun node-hosted proof.

A domain is only a name. The node-hosted proof surface is the authority.
