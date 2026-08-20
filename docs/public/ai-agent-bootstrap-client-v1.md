# VOID AI Agent Bootstrap Client V1

`VOID_AI_AGENT_BOOTSTRAP_CLIENT_V1` is a portable, GET-only client for an
external AI agent to discover the public VOID Network surface from one origin.

It composes existing public contracts without introducing a new runtime route
or modifying `src/index.ts`.

## Read sequence

1. `/.well-known/void-agent-discovery.json`
2. the exact same-origin `/.well-known/void-network-authenticity.json` route bound by the reviewed root contract
3. the exact canonical discovery route bound by the reviewed well-known contract
4. `/.well-known/void-agent-capabilities.json`
5. `/.well-known/void-agent-authentication.json`
6. `/public-node/agents/first-contact-v1.json`
7. `/.well-known/void-agent-intake-capability-v1.json`

Before any downstream probe contributes to readiness, the root well-known
document must match the reviewed V1 contract exactly: schema, marker, protocol,
`VOID Mainnet-0`, numeric `chain_id: 2050`, canonical discovery route,
read-only/no-credential authority, the complete fail-closed safety object, and
the canonical network-authenticity route. Missing, extra, wrong-typed, or
contradictory root fields fail closed before downstream discovery begins.

The network-authenticity reference is not treated as proof merely because the
root names it. Before downstream discovery, the client GETs that exact
same-origin route through the same bounded, final-URL-bound, no-redirect
transport. The returned packet must match the reviewed closed Mainnet-0
identity/admission/authority/safety contract, bind to the admitted Ed25519 key
identity and signed-payload SHA-256, derive the same key identity from the
public key, and verify the Ed25519 signature over the canonical signed payload.
Missing, malformed, forged, or mismatched authenticity evidence fails closed,
so no report can publish `official_entrypoint.verified: true` or readiness truth
from an unverified network-authenticity packet.

The client emits one machine-readable bootstrap report. A generic
`VOID_*` marker is never sufficient for readiness. Canonical discovery,
capability, authentication, first-contact, and external-opportunity intake
responses are each bound to the canonical SHA-256 of the complete reviewed
JSON contract. This closes marker-preserving drift in protocol, network,
authority, safety, runtime, onboarding, and unsupported-operation fields.
Required discovery, capability, and authentication contracts determine
`read_only_connection_ready`. Exact first-contact and external-opportunity
intake contracts additionally determine `onboarding_surface_complete`.

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

`--output` refuses an existing final path, including a symbolic link. Every
output-parent component is created or opened relative to an already-pinned
directory descriptor with no-follow semantics. The final leaf is created
exclusively inside that pinned namespace, written through the already-open
descriptor, forced to mode `0600`, and synchronized before close. The parent
directory is synchronized and its absolute pathname must still resolve to the
same device/inode generation before success is returned. A symlinked component
or concurrent parent replacement fails closed before publication. This
Linux source contract requires `/proc/self/fd`; absence fails closed. Choose a
new output path for each publication rather than relying on overwrite behavior.

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
  buffered past the configured ceiling. Each nonterminal reader result must be
  an object with boolean `done` and a non-empty `Uint8Array` value. The typed
  array byte length is compared against the remaining byte budget before
  `Buffer.from()` may copy it; malformed, zero-progress, or oversized chunks
  enter bounded teardown instead of escaping the transport lease.
- After every 64 admitted nonterminal body reads the client yields to the event
  loop under the same owned deadline. A custom reader producing an immediate
  stream of tiny chunks therefore cannot starve the request timer indefinitely.
- A present `Content-Length` must be a canonical nonnegative safe integer;
  malformed or oversized declarations fail closed before body accumulation.
- The per-request deadline owns fetch acquisition as well as response-body
  consumption. A caller-supplied fetch or admitted reader that ignores
  `AbortSignal` cannot keep the participant-facing request pending past that
  deadline.
- One transport-generation lease per exact origin spans fetch acquisition through
  admitted body consumption for a caller-supplied fetch implementation. If the
  participant deadline wins while acquisition, a body read, malformed-read
  teardown, or cleanup is still unresolved, the participant still receives the
  bounded terminal but retries to that same origin fail closed with the existing
  quarantine terminal instead of spawning a replacement generation. Unrelated
  origins using the same shared fetch implementation retain independent leases
  and remain usable. The affected origin lease releases only after the retained
  underlying read/cancel outcome settles, after which a clean retry to that
  origin can recover.
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
