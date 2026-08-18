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
- Redirects are rejected and their response bodies enter the same bounded
  rejection-teardown contract instead of outliving the bootstrap probe.
- Every discovered route must remain on the original origin.
- `--timeout-ms` and `--max-bytes` accept only whole canonical positive decimal
  CLI tokens in their reviewed ranges. The exported programmatic client accepts
  only actual finite safe-integer numbers in the same ranges, and validates
  both controls before admitting any fetch/network work.
- `--max-bytes` is enforced while streaming, before a response can be fully
  buffered past the configured ceiling.
- A present `Content-Length` must be a canonical nonnegative safe integer;
  malformed or oversized declarations fail closed before body accumulation.
- The per-request deadline owns fetch acquisition as well as response-body
  consumption. A caller-supplied fetch that ignores `AbortSignal` cannot keep
  the participant-facing request pending past that deadline.
- At most one unresolved fetch-acquisition generation is retained for the same
  caller-supplied fetch implementation. Retries fail closed while that
  generation remains unresolved rather than accumulating detached requests.
- If a timed-out fetch resolves later to a live response, the client performs
  one bounded late-response cleanup before releasing that acquisition
  generation; cleanup cannot replace the already-returned timeout.
- Response-body reader acquisition is teardown-owned. A locked or throwing
  `getReader()` cannot escape as an unowned raw stream failure.
- Every admitted `reader.read()` is raced against the owned request deadline,
  including custom readers that ignore request abort.
- Rejection cleanup has a separate bounded 250 ms settlement terminal and
  cannot replace or indefinitely delay an already-known response HOLD.
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
