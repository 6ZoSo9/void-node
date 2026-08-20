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
3. Resolves the advertised same-origin official-network authenticity packet
   and verifies its exact Ed25519 key identity, signed payload digest, genesis,
   and admitted checkpoint contract.
4. Resolves the advertised canonical path on the same origin only after
   official-network authenticity is proven.
5. Validates the complete committed canonical discovery contract, including
   capabilities, onboarding, full safety defaults, and no-credential authority.
6. Stops before any mutation unless a separate signed capability explicitly
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

The client rejects cross-origin pointers, redirects, unsigned or forged network
identity, mutation-authority claims, credential requirements, unsafe methods or
onboarding, wrong chain identity, malformed JSON, authority-elevated capability
records, and unknown authority that is not treated as `not_granted`.

## Proof

```bash
node scripts/prove_void_ai_agent_well_known_entrypoint_v1.mjs
```

## Collision boundary

This bounded entrypoint lane does not modify:

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

## Bounded response admission

The reference client admits only exact `application/json` responses from the requested final URL. It rejects declared or streamed bodies above 262,144 bytes before JSON retention, requires fatal UTF-8 decoding, and keeps its 10-second request deadline active through complete body consumption. The same transport boundary applies to the pointer, official-network authenticity packet, canonical discovery document, and optional probes. Redirects, oversized bodies, malformed content lengths, invalid UTF-8, and invalid JSON fail closed without granting authority or requesting credentials.

Any terminal post-header rejection aborts the owned request and retains rejected-response cleanup only through a separate 250 ms teardown window. Cleanup rejection or non-settlement cannot replace the primary HTTP, provenance, size, or read failure. In particular, a non-2xx response with a body that never ends cannot keep the client alive after the logical request has been rejected.

Before returning `ok: true`, the client verifies the official-network packet's
reviewed Ed25519 signature and exact network identity, then admits only the
committed canonical discovery contract. Missing, forged, wrong-key, or stale
identity evidence and any capability, onboarding, safety, or authority drift
fail closed before discovery is accepted. This is verification only; it grants
no runtime, wallet, validator, Work Credit, Buy VOID, or mutation authority.
