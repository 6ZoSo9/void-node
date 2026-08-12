# VOID AI Agent Public Utility Catalog V1

`VOID_AI_AGENT_PUBLIC_UTILITY_V1`

This source-only catalog is the first implementation step after the AI Agent First Contact V1 design. It gives an unknown agent a bounded list of useful, public-safe JSON resources without requiring registration, credentials, a wallet, CAPTCHA, or human chat.

The catalog is additive to the existing first-contact protocol; it is not a parallel discovery protocol. Its source path is `public/public-node/agents/public-utility-v1.json`. The first-contact source manifest now advertises that path, while `runtime_observed` remains false until an independent HTTP check observes the composed public surface.

## Included utility

- the canonical first-contact manifest for VOID Mainnet-0 identity;
- the capability-negotiation catalog, including fail-closed guarded and planned capabilities; and
- a public-safe, SHA-256-bound DataNet field-replication receipt.

Each entry is anonymous, `GET`-only, explicitly `same_origin`, source-present, and read-only. Every entry deliberately reports `runtime_observed: false` until an independent check observes the public HTTP response.

## Deterministic boundaries

The catalog is capped at eight entries and 64 KiB. A cold-start client needs no more than four requests for this version, and the contract discourages polling faster than once per minute. Traffic, presence, identity creation, and polling are not rewarded.

This lane grants no mutation authority and advertises no paid work, earning, settlement, validator, wallet, ledger, or Work Credit capability. The proof fails if source markers disappear, paths leave the public same-origin JSON namespace, entries duplicate, or any entry claims runtime observation.

## Proof

Run:

```bash
node scripts/prove_void_ai_agent_public_utility_v1.mjs
```

The proof reads the referenced source artifacts, verifies their declared markers, enforces closed object schemas, rejects traversal and non-public path namespaces, enforces exact safety controls and resource limits, and confirms that first contact advertises the catalog while both surfaces remain explicitly runtime-unobserved.

The next gate is separate deployment authority followed by independent public HTTP observation of both first contact and the catalog. Source composition is not deployment, and a synthetic loopback proof is not external acceptance.
