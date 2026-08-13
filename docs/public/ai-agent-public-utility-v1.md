# VOID AI Agent Public Utility Catalog V1

`VOID_AI_AGENT_PUBLIC_UTILITY_V1`

This source-only catalog is the first implementation step after the AI Agent First Contact V1 design. It gives an unknown agent a bounded list of useful, public-safe JSON resources without requiring registration, credentials, a wallet, CAPTCHA, or human chat.

The catalog is additive to the existing first-contact protocol; it is not a parallel discovery protocol. Its source path is `public/public-node/agents/public-utility-v1.json`. The first-contact source manifest now advertises that path, while `runtime_observed` remains false until an independent HTTP check observes the composed public surface.

## Included utility

- the canonical first-contact manifest for VOID Mainnet-0 identity;
- the capability-negotiation catalog, including fail-closed guarded and planned capabilities; and
- a public-safe, SHA-256-bound DataNet field-replication receipt.

Each entry is anonymous, `GET`-only, explicitly `same_origin`, source-present, and read-only. Every entry deliberately reports `runtime_observed: false` until an independent check observes the public HTTP response.

The first-contact client now performs that observation at use time. It reuses
the first-contact and capability responses it already fetched, then requests
remaining catalog entries within one global eight-request cold-start budget. It
counts the manifest and all six entrypoint requests against that same ceiling,
verifies each advertised marker, and includes only marker-verified JSON as the
resource's `document`. This changes client evidence, not the source catalog's deployment
claim: the checked-in entries remain `runtime_observed: false` until separate
external acceptance updates that source truth.

## Deterministic boundaries

The catalog is capped at eight entries and 64 KiB. The client performs no more
than eight total network requests for a cold start and reports both reused and
additional resource responses. Budget exhaustion is explicit partial readiness,
not silent omission. The contract discourages polling faster than once per
minute. Traffic, presence, identity creation, and polling are not rewarded.

This lane grants no mutation authority and advertises no paid work, earning, settlement, validator, wallet, ledger, or Work Credit capability. The proof fails if source markers disappear, paths leave the public same-origin JSON namespace, entries duplicate, or any entry claims runtime observation.

## Proof

Run:

```bash
node scripts/prove_void_ai_agent_public_utility_v1.mjs
```

The proofs read the referenced source artifacts, verify their declared markers,
enforce closed object schemas, reject traversal and non-public path namespaces,
enforce exact safety controls and resource limits, and confirm that first
contact advertises the catalog while both source surfaces remain explicitly
runtime-unobserved. The client proof also verifies response reuse, the bounded
request count, embedded useful JSON, and fail-closed rejection of a reachable
resource carrying the wrong marker.

The next gate is separate deployment authority followed by independent public HTTP observation of both first contact and the catalog. Source composition is not deployment, and a synthetic loopback proof is not external acceptance.
