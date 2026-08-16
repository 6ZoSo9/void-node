# VOID AI Agent Bootstrap Client V1

`VOID_AI_AGENT_BOOTSTRAP_CLIENT_V1` is a portable, GET-only client for an
external AI agent to discover the public VOID Network surface from one origin.

It composes existing public contracts without introducing a new runtime route
or modifying `src/index.ts`.

## Read sequence

1. `/.well-known/void-agent-discovery.json`
2. the same-origin canonical discovery route declared by that entrypoint
3. `/.well-known/void-agent-capabilities.json`
4. `/.well-known/void-agent-authentication.json`
5. `/public-node/agents/first-contact-v1.json`
6. `/.well-known/void-agent-intake-capability-v1.json`

The client emits one machine-readable bootstrap report. Required discovery,
capability, and authentication surfaces determine `read_only_connection_ready`.
First-contact and external-opportunity intake additionally determine
`onboarding_surface_complete`.

## Use

```bash
node tools/void-ai-agent-bootstrap-client-v1.mjs \
  --base-url https://node.example.invalid \
  --pretty
```

Optional mode-0600 output:

```bash
node tools/void-ai-agent-bootstrap-client-v1.mjs \
  --base-url https://node.example.invalid \
  --output ./void-bootstrap-result.json \
  --pretty
```

## Network boundary

- HTTPS is required except for loopback proof mode.
- Only `GET` is used.
- Redirects are rejected.
- Every discovered route must remain on the original origin.
- `--max-bytes` is enforced while streaming, before a response can be fully
  buffered past the configured ceiling.
- A present `Content-Length` must be a canonical nonnegative safe integer;
  malformed or oversized declarations fail closed before body accumulation.
- The per-request deadline remains active through response-body consumption and
  bounded rejection teardown.
- Rejection cleanup cannot replace or indefinitely delay an already-known
  oversized-response HOLD.
- No authorization header, cookie, credential, wallet material, operator key,
  or request body is sent.

## Authority boundary

This client does not grant or exercise:

- mutation authority;
- runtime administration;
- work submission;
- paid-work execution;
- Work Credit earning or ledger writes;
- wallet or signer access;
- payment authority;
- transaction construction or broadcast;
- Buy VOID fulfillment authority.

Availability in the report is evidence of a readable public contract, not a
promise of paid work, Work Credits, settlement, or execution.

## Files

- `tools/void-ai-agent-bootstrap-client-v1.mjs`
- `scripts/prove_void_ai_agent_bootstrap_client_v1.mjs`
- `scripts/prove_void_ai_agent_bootstrap_response_bounds_v1.mjs`
- `schemas/void-ai-agent-bootstrap-client-v1.schema.json`
- `examples/void-ai-agent-bootstrap-client-v1.example.json`
- `.github/workflows/void-ai-agent-bootstrap-client-v1.yml`
- `.github/workflows/void-ai-agent-bootstrap-response-bounds-v1.yml`
