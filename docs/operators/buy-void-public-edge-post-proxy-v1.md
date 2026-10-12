# Buy VOID public-edge POST proxy v1

## Purpose

The public Tailscale Funnel terminates at the VOID public app composition
gateway on `127.0.0.1:8082`. That gateway serves the Buy VOID checkout page
and read-only configuration routes, but historically rejected every non-GET
method before the request reached the live node on port `4100`.

This lane adds one narrow exception:

```text
POST /__void/buy-void/request
```

The exact request body is forwarded to `VOID_NODE_UPSTREAM`, whose existing
Buy VOID request contract remains authoritative for validation, idempotency,
one-active-request enforcement, sale limits, receiver binding, and journal
persistence.

## Boundary

The gateway does not gain a general mutation proxy.

- Only the exact POST path above is forwarded.
- All unrelated POST requests remain blocked.
- Legacy `GET /__void/buy-void/request.json` remains outside the new
  allowlist; the deployed checkout runtime proof remains authoritative for
  its existing `405` behavior.
- `OPTIONS /__void/buy-void/request` remains blocked because the checkout is
  same-origin and does not require CORS preflight.
- Request bodies are capped at 65,536 bytes.
- The upstream POST and its full JSON response have a fixed **8-second
  total deadline**, enforced by both AbortSignal and one monotonic absolute
  expiry applied to response headers **and every body read**. Each awaited
  step has a separate deadline timer that is detached when it settles, so
  tiny-chunk streams cannot accumulate listeners on one shared pending
  deadline promise. The focused proof also executes the real production handler in an isolated
  no-socket fixture with 4,098 one-byte reads and counts every deadline
  timer, requiring at least one timer per awaited operation, zero surviving
  settled timers and at most one concurrent timer. The extra fence covers the Node 22 case where an aborted
  stream reader never settles. The upstream is contacted with redirects
  forbidden.
- HTTP 201 **created-request** responses must also match the canonical
  node's actual `void_public_buy_void_checkout_request_result_v1` schema,
  `VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1` marker, `ok: true`,
  `idempotent: false`, `one_active_request_cap_enforced: true` and a
  canonical embedded checkout-request object with request ID, awaiting
  payment-hash status and `persisted.ok: true`. An empty, unrelated, false,
  reused or malformed 201 cannot be forwarded as a newly created payment
  request. The nested `request.persisted` must contain **exactly**
  `{ok:true}`, never an internal `file` path or other disk metadata.
  This matches the public-redaction successor in source-only request-intake
  PR #2811, while preventing an older backend with private-path leakage
  from being exposed as a successful checkout through the public edge.
  The focused synthetic HTTP proof uses a redacted valid 201 and refuses
  an otherwise-valid 201 containing a sentinel absolute buyer sidecar path.
  The validated successful **original bytes** are still forwarded
  exactly without reserialization.
- Upstream responses must be strict UTF-8 JSON **objects**, not just a
  JSON `Content-Type` header. Malformed JSON, invalid UTF-8, null/primitive values and arrays refuse
  even on HTTP 201. The maximum accepted response body is
  **131,072 bytes**. Declared oversized responses are refused before
  streaming; unannounced oversized bodies stop at the byte ceiling.
  Header-rejected response bodies receive an immediate best-effort
  cancellation without waiting on an untrusted cancellation promise.
- **Partial-upgrade privacy:** the historic node currently merged in
  `main` can return a prior buyer's full request on HTTP 200 idempotent
  reuse, or their request ID/status on HTTP 409 conflict. This public edge
  **never forwards any non-201 upstream response body or headers**.
  Upstream 400, 409 and 503 retain only their coarse HTTP status with a
  fixed generic no-store response; every other non-201 status (including
  retired 200 success/reuse) becomes generic **502**. Neither case discloses
  buyer IDs, accounts, notes, payment hashes or payment instructions, even
  if this edge is installed before the #2811 request-writer privacy fix.
  A rejected, lost or uncertain upstream result does not prove whether any
  economic obligation was persisted and is **never** authority to retry.
- A refused or timed-out upstream result becomes a fixed generic error with
  no checkout request, transaction identity, private data, or payment
  instructions in the edge-generated response.
- A 502 does **not** establish that no request was recorded upstream.
  A client MUST keep the attempted intent uncertain and must not
  automatically resubmit or send funds; only reviewed request recovery
  can establish an already-committed outcome.
- The response is always marked `Cache-Control: no-store` and
  `X-Content-Type-Options: nosniff`, regardless of upstream headers.
- Automatic fulfillment remains disabled.
- This code change does not deploy or restart any live service.
- This code change does not create a request, access a wallet, send USDC,
  sign a transaction, broadcast a transaction, or deliver VOID.

## Full buyer receipt forwarding proof (synthetic)

In addition to the minimal canonical-created envelope, the isolated
`full_client_contract_201` upstream fixture supplies a complete public
Buy VOID **native Base USDC** request-creation response with a generated
four-minute lease, immutable receiver and sender/destination binding,
chain 8453 and chain 2050 identities, canonical USDC contract and six-decimal
amount, request-first acknowledgements, manual-fulfillment policy, and
public-only `persisted: { ok:true }`. The actual gateway must preserve the
full noncanonical JSON bytes and HTTP 201 exactly; this source-only proof
checks the identities, instruction expiry and absence of an internal file path.

**This is not yet an executable cross-PR browser acceptance test.** Browser
Draft #2818 has additional time, view-generation, receipt-retry and
payment-instruction validation that must be tested with this *same* full
fixture at an independently composed source tree before a buyer can be
told the checkout is end-to-end ready. A failed or uncertain POST outcome
cannot be assumed uncommitted or safely retried. No real funds move.

## Verification

`scripts/prove_buy_void_public_edge_post_proxy_v1.mjs` starts an isolated fake
node upstream and a temporary composition gateway. It proves that the exact
POST route preserves method/body and only the exact qualified created
HTTP 201 response unchanged, while other upstream responses get fixed
redacted bodies. It simulates the *actual retired writer* HTTP 200 idempotent
prior-buyer record and HTTP 409 prior-ID/status response, proving no sentinel
private fields or upstream ETag cross the public wire. All unrelated methods
remain blocked. It also
tests the exact maximum accepted JSON reply, byte-for-byte forwarding
of a deliberately noncanonical valid HTTP 201 receipt, malformed/invalid-UTF-8,
truthy primitive (`true`), array and six malformed/wrong
schema, marker, idempotency or request-status HTTP 201 refusals, declared/streamed oversize, non-JSON
and redirect refusal, plus a header-rejected response held open until the
upstream server observes early socket closure. A separate fake upstream
sends valid headers but never finishes the JSON body to probe the absolute
deadline. All HTTP tests remain isolated and run under Node 22/24/26;
none establish an
installed public-network endpoint or prove a request was not committed
upstream on a timeout.
