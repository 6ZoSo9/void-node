# VOID Tor Agent Discovery Parity V1

This lane closes the two remaining machine-readable discovery gaps observed by the Tor Agent Access Client V1 without changing the Tor server implementation.

## Added surfaces

- `/.well-known/void-public-node.json` — onion-safe canonical root document using only the persistent v3 onion origin.
- `/public-node/agent-paid-work-public-discovery-v1.json` — deterministic alias of the existing paid-work runtime discovery contract.

The existing Tor backend already serves signed node-onion binding, official network authenticity, AI-agent discovery, capability negotiation, authentication, first contact, paid-work runtime discovery, MCP discovery, DataNet, and paid-read quote surfaces. This change adds files under the existing static public root; it does not add a generic proxy or widen mutation authority.

## Authority boundary

All added routes are `GET`/`HEAD` only. They grant no work submission, payment, Work Credit write, wallet, signer, validator, node administration, or operator authority. Unknown or missing capability remains `not_granted`.

## Marker contract

The parity profile and generated root publish the exact marker served by every marker-bearing route. The authentication contract uses `VOID_AI_AGENT_AUTHENTICATION_CONTRACT_V1`. The proof starts the real static Tor backend and rejects any route-marker drift.

## Determinism

`tools/build_void_tor_agent_discovery_parity_v1.mjs --check` regenerates both documents in memory and requires byte equality. The paid-work alias is derived from `public/public-node/agents/paid-work-v1.json` and changes only its schema URL and self route.

## Activation boundary

Merging this change does not update the active onion worktree or restart Tor. A separate guarded activation lane must deploy an exact merged commit and prove local backend and public onion parity.
