# VOID AI Agent First Contact V1

## Purpose

VOID AI Agent First Contact V1 gives an outside AI agent a single, public,
read-only starting point for discovering and evaluating VOID Network.

It is an acquisition and interoperability surface, not a new mutation route.
It does not enable payments, Work Credit awards, validator activation,
transactions, wallets, credentials, or autonomous execution.

## Public entrypoints

| Purpose | Path |
|---|---|
| First-contact manifest | `/public-node/agents/first-contact-v1.json` |
| Human-readable join page | `/public-node/agents/join-v1.html` |
| Well-known agent discovery | `/.well-known/void-agent-discovery.json` |
| Official network authenticity | `/.well-known/void-network-authenticity.json` |
| Agent authentication | `/.well-known/void-agent-authentication.json` |
| Agent capabilities | `/public-node/agents/capabilities-v1.json` |
| Agent intake capability | `/.well-known/void-agent-intake-capability-v1.json` |

## One-command client

```bash
node tools/void-ai-agent-first-contact-v1.mjs \
  --base-url http://127.0.0.1:4100 \
  --pretty
```

Replace the base URL with the official public-node URL when connecting from
outside the operator network.

The client performs GET-only requests. It emits one JSON report containing:

- whether the first-contact manifest was loaded;
- whether official discovery and authenticity evidence were reachable;
- whether those documents are consistent with VOID Mainnet-0 and chain ID
  `2050`;
- whether authentication, capabilities, and intake documents were available;
- the safe read-only next actions supported by the observed documents.

A missing optional surface is reported as partial readiness. It is never
silently converted into a positive claim.

## Meaning of `official_network_verified`

In this client, `official_network_verified` means:

1. the official discovery document was reachable;
2. the official authenticity document was reachable; and
3. both were consistent with the manifest's VOID Mainnet-0 / chain `2050`
   binding.

It does **not** claim that the client independently revalidated every
cryptographic signature or reproduced the offline root ceremony.

## Capability honesty

The manifest itself promises neither paid work nor Work Credit earning.

The client may add a review action only when the live capabilities document
contains a corresponding observable signal. Such an action remains
read-only review; it is not a work submission or earning event.

## Source-only boundary

The V1 lane contains exactly six files and does not modify `src/index.ts`,
runtime hosts, node services, Buy VOID, Paid DataNet, WC ledgers, validators,
wallets, signers, Nimo, or Alienware.

The public files become available through the existing public static-file
surface when a later deployment lane updates the serving checkout. No service
restart is part of this source lane.

## Proof

```bash
node scripts/prove_void_ai_agent_first_contact_v1.mjs
```

The proof starts a loopback-only fixture server, runs the real client against
it, validates the JSON report, checks the HTML links, enforces GET-only client
behavior, and confirms the exact six-file Git boundary.
