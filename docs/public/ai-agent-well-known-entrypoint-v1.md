# VOID AI Agent Well-Known Entrypoint V1

Marker: `VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1`

This lane adds a stable machine-readable starting path for external AI agents:

```text
/.well-known/void-agent-discovery.json
```

The well-known document is a small same-origin pointer to the canonical
discovery contract:

```text
/public-node/agents/discovery-v1.json
```

It does not grant mutation authority.

## Resolution sequence

An agent:

1. Sends a GET-only request to
   `/.well-known/void-agent-discovery.json`.
2. Validates VOID Mainnet-0, chain ID `2050`, read-only authority, no
   credentials, no redirects, and the same-origin rule.
3. Resolves the advertised canonical path on the same origin.
4. Validates the canonical discovery marker, protocol, chain ID, read-only
   authority, safe methods, capability states, and fail-closed defaults.
5. Stops before any mutation unless a separate signed capability explicitly
   grants the exact action.

## Safe client

```bash
node tools/void-ai-agent-well-known-client-v1.mjs \
  --base https://your-node.example
```

Optional GET-only probes:

```bash
node tools/void-ai-agent-well-known-client-v1.mjs \
  --base https://your-node.example \
  --probe
```

The client rejects cross-origin pointers, redirects, mutation-authority claims,
credential requirements, unsafe methods, wrong chain identity, malformed JSON,
and unknown authority that is not treated as `not_granted`.

## Proof

```bash
node scripts/prove_void_ai_agent_well_known_entrypoint_v1.mjs
```

## Collision boundary

This lane adds five new files only. It does not modify:

- Existing AI-agent discovery files from PR #678.
- `src/index.ts` or runtime route mounting.
- Validator runtime or PR #646 files.
- Existing public indexes.
- Release-authority files or worktrees.
- Buy VOID or Work Credit mutation code.
- Deployment configuration.
- Nimo state.

Nimo remains offline and is not contacted by this lane.

<!-- VOID_AI_AGENT_DISCOVERY_RUNTIME_INTEGRATION_V1 -->
## Runtime integration

The discovery contract is mounted through the existing public read-only runtime
router. The runtime exposes the canonical discovery document, its schema, the
well-known pointer, and the well-known pointer schema:

- `GET`/`HEAD /public-node/agents/discovery-v1.json`
- `GET`/`HEAD /public-node/agents/discovery-v1.schema.json`
- `GET`/`HEAD /.well-known/void-agent-discovery.json`
- `GET`/`HEAD /.well-known/void-agent-discovery.schema.json`

The handlers serve exact repository JSON bytes with `Cache-Control: no-store`.
They grant no mutation, wallet, treasury, ledger, validator, Work Credit, or
Buy VOID execution authority. `src/index.ts` is not expanded by this runtime
integration; mounting is delegated through the existing local runtime router.
