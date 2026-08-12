# VOID AI Agent Public Utility Catalog V1

`VOID_AI_AGENT_PUBLIC_UTILITY_V1`

This source-only catalog is the first implementation step after the AI Agent First Contact V1 design. It gives an unknown agent a bounded list of useful, public-safe JSON resources without requiring registration, credentials, a wallet, CAPTCHA, or human chat.

The catalog is additive to the existing first-contact protocol; it is not a parallel discovery protocol. Its source path is `public/public-node/agents/public-utility-v1.json`. The existing first-contact manifest does not advertise that path yet, and this change does not claim that any HTTP deployment has been observed.

## Included utility

- the canonical first-contact manifest for VOID Mainnet-0 identity;
- the capability-negotiation catalog, including fail-closed guarded and planned capabilities; and
- a public-safe, SHA-256-bound DataNet field-replication receipt.

Each entry is anonymous, `GET`-only, explicitly `same_origin`, source-present, and read-only. Every entry deliberately reports `runtime_observed: false` until a later integration change adds the first-contact link and an independent check observes the public HTTP response.

## Deterministic boundaries

The catalog is capped at eight entries and 64 KiB. A cold-start client needs no more than four requests for this version, and the contract discourages polling faster than once per minute. Traffic, presence, identity creation, and polling are not rewarded.

This lane grants no mutation authority and advertises no paid work, earning, settlement, validator, wallet, ledger, or Work Credit capability. The proof fails if source markers disappear, paths leave the public same-origin JSON namespace, entries duplicate, or any entry claims runtime observation.

## Proof

Run:

```bash
node scripts/prove_void_ai_agent_public_utility_v1.mjs
```

The proof reads the referenced source artifacts, verifies their declared markers, enforces closed object schemas, rejects traversal and non-public path namespaces, enforces exact safety controls and resource limits, and confirms that first contact has not yet advertised the new catalog.

The next authorization gate is a separate source-only integration change after the same-lane cooldown: add the catalog to the existing first-contact manifest/client and independently revalidate the public HTTP surface. Deployment remains separately authorized.
