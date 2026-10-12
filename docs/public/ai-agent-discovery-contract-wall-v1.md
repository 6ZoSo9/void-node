# VOID AI Agent Discovery Contract Wall V1

Marker: `VOID_AI_AGENT_DISCOVERY_CONTRACT_WALL_V1`

This lane gives an external AI agent a deterministic, machine-readable place to
start without asking the agent to scrape HTML, infer authority from buttons, or
guess which mutation paths exist.

It does not grant mutation authority.

## Public contract

The static contract is served from:

```text
/public-node/agents/discovery-v1.json
```

The contract binds the agent to:

- VOID Mainnet-0 and chain ID `2050`.
- GET-only or HEAD-only discovery.
- Same-origin entrypoints.
- Explicit capability states.
- A fail-closed rule where unknown, ambiguous, expired, guarded, or
  unverifiable authority is treated as `not_granted`.
- No secret, wallet-material, or operator-key transmission.

The discovery contract is intentionally static and read-only. It points agents
at existing public identity, readiness, index, DataNet, Work Credit, and
participant surfaces without mounting a new runtime mutation route.

## Safe client

Run against a public node:

```bash
node tools/void-ai-agent-discovery-client-v1.mjs \
  --base https://your-node.example
```

Probe advertised JSON entrypoints using same-origin GET-only requests:

```bash
node tools/void-ai-agent-discovery-client-v1.mjs \
  --base https://your-node.example \
  --probe
```

The client rejects:

- Wrong marker, protocol, or chain ID.
- Cross-origin entrypoints.
- Discovery methods other than GET or HEAD.
- Any claim that the discovery document grants mutation authority.
- Unsafe defaults for unknown capabilities.
- Non-HTTPS public bases, except local loopback testing.

## Proof

```bash
node scripts/prove_void_ai_agent_discovery_contract_wall_v1.mjs
```

## Collision boundary

This lane adds new files only. It does not modify:

- `src/index.ts`.
- Validator runtime or PR #646 files.
- Existing public indexes.
- Existing release-authority files or worktrees.
- Buy VOID runtime or signer code.
- Work Credit mutation code.
- Deployment configuration.
- Nimo state.

Nimo remains offline and is not contacted by this lane.
