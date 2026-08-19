# VOID AI Agent Bootstrap Client V1

`VOID_AI_AGENT_BOOTSTRAP_CLIENT_V1` is a portable, GET-only client for an
external AI agent to discover the public VOID Network surface from one origin.

It composes existing public contracts without introducing a new runtime route
or modifying `src/index.ts`.

## Read sequence

1. `/.well-known/void-agent-discovery.json`
2. the exact canonical discovery route bound by the reviewed well-known contract
3. `/.well-known/void-agent-capabilities.json`
4. `/.well-known/void-agent-authentication.json`
5. `/public-node/agents/first-contact-v1.json`
6. `/.well-known/void-agent-intake-capability-v1.json`

Before any downstream probe contributes to readiness, the root well-known
document must match the reviewed V1 contract exactly: schema, marker, protocol,
`VOID Mainnet-0`, numeric `chain_id: 2050`, canonical discovery route,
read-only/no-credential authority, the complete fail-closed safety object, and
the canonical network-authenticity route. Missing, extra, wrong-typed, or
contradictory root fields fail closed before downstream discovery begins.

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

Optional create-only mode-0600 output:

```bash
node tools/void-ai-agent-bootstrap-client-v1.mjs \
  --base-url https://node.example.invalid \
  --output ./void-bootstrap-result.json \
  --pretty
```

`--output` refuses an existing final path, including a symbolic link. The final
file is created exclusively, written through that already-open descriptor,
forced to mode `0600`, and synchronized before close. Choose a new output path
for each publication rather than relying on overwrite behavior.

## Network boundary

- HTTPS is required except for loopback proof mode.
- Only `GET` is used.
- Redirects are rejected and their response bodies enter the same bounded
  rejection-teardown contract instead of outliving the bootstrap probe.
- Every discovered route must remain on the original origin.
- A caller-supplied fetch implementation cannot substitute response provenance:
  before body admission, the final `response.url` must be present, parseable,
  and normalize to the exact immutable requested href, while
  `response.redirected === true` is rejected. Missing/malformed final URLs,
  cross-origin substitutions, and same-origin wrong path/query/fragment values
  fail closed under bounded response teardown.
- `--timeout-ms` and `--max-bytes` accept only whole canonical positive decimal
  CLI tokens in their reviewed ranges. The exported programmatic client accepts
  only actual finite safe-integer numbers in the same ranges, and validates
  both controls before admitting any fetch/network work.
- `--max-bytes` is enforced while streaming, before a response can be fully
  buffered past the configured ceiling.
- A present `Content-Length` must be a canonical nonnegative safe integer;
  malformed or oversized declarations fail closed before body accumulation.
- The per-request deadline owns fetch acquisition as well as response-body
  consumption. A caller-supplied fetch or admitted reader that ignores
  `AbortSignal` cannot keep the participant-facing request pending past that
  deadline.
- One transport-generation lease per exact origin spans fetch acquisition through
  admitted body consumption for a caller-supplied fetch implementation. If the
  participant deadline wins while acquisition, a body read, or cleanup is still
  unresolved, the participant still receives the bounded timeout but retries to
  that same origin fail closed with the existing quarantine terminal instead of
  spawning a replacement generation. Unrelated origins using the same shared
  fetch implementation retain independent leases and remain usable. The affected
  origin lease releases only after the retained underlying read/cancel outcome
  settles, after which a clean retry to that origin can recover.
- If a timed-out fetch resolves later to a live response, the client performs
  one bounded late-response cleanup. A cleanup that exceeds the 250 ms
  participant-facing teardown window remains quarantine-owned until its actual
  settlement rather than being detached while a replacement request starts.
- Response-body reader acquisition is teardown-owned. A locked or throwing
  `getReader()` cannot escape as an unowned raw stream failure.
- Every admitted `reader.read()` is raced against the owned request deadline,
  including custom readers that ignore request abort.
- Rejection cleanup has a separate bounded 250 ms participant-facing settlement
  terminal and cannot replace or indefinitely delay an already-known response
  HOLD; per-origin transport quarantine may outlive that visible terminal solely
  to bound unresolved underlying work without suppressing unrelated origins.
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
