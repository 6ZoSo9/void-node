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

### Post-race absolute deadline qualification

  A missed or late watchdog callback does **not** extend either lease:
  once a client upload finishes, the handler rechecks its monotonic absolute
  receive expiry **before any upstream POST**; after each upstream header or
  reader Promise.race resolves, the same immutable 8-second expiry is
  checked again; after synchronous receipt parsing, it is checked before
  HTTP 201 publication. Unavailable, nonfinite or backward clock readings
  HOLD. The test evaluates the actual handler with synthetic clock advancement
  while timers deliberately remain unfired: a late completed upload performs
  zero upstream requests, late upstream headers yield uncertain 502, and
  a timely original 201 remains acceptable. The final guard now runs
  **after** all untrusted upstream header reads but **before** staging any
  public 201 response status or headers. A getter that advances the clock
  past the absolute expiry cannot leave an old 201 Content-Length on the
  generic uncertain 502. A second actual-handler regression advances the
  monotonic clock inside an allowed response-header getter and requires
  no stale HTTP 201 byte length or upstream identity to be published.
  Opaque upstream ETag is never forwarded, including valid new-request 201.

The gateway does not gain a general mutation proxy.

- Only the exact POST path above is forwarded.
- All unrelated POST requests remain blocked.
- Legacy `GET /__void/buy-void/request.json` remains outside the new
  allowlist; the deployed checkout runtime proof remains authoritative for
  its existing `405` behavior.
- `OPTIONS /__void/buy-void/request` remains blocked because the checkout is
  same-origin and does not require CORS preflight.
- Request bodies are capped at 65,536 bytes. The incoming client-upload
  phase has its **own 8-second absolute lifetime from handler entry**, not
  an inactivity timeout. A half-written chunked POST that sends one byte
  and stalls (or repeatedly trickles one byte) must terminate without
  ever forwarding a request to the upstream node. The incomplete socket
  is destroyed on deadline; its transport close is **not** a payment or
  purchase receipt. If an unfinished upload instead crosses the 65,536-byte
  cap, the edge flushes HTTP 413 with `Connection: close` and retires the
  owned socket immediately afterward; it does not clear the timer and leave
  the oversized peer trickling indefinitely. The inert HTTP proof sends a
  65,537-byte chunk without ending the request, then requires the complete
  413, prompt socket close well before eight seconds, and zero upstream POSTs.
  This timer is independent of the later 8-second upstream header/body
  response limit.
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
- A 201 must ALSO bind its actionable `payment_instructions` to the
  original buyer's destination and amount, and to source-reviewed canonical
  USDC payment identities **independently of the upstream's claim**: exact
  Base/8453 or Ethereum/1 USDC token address, token decimals 6, fixed
  receiver `0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5`,
  matching sender, chain, amount and request ID, shared launch expiry and
  required request-first/sender-control flags. A response showing another
  payment receiver or token is generic uncertain 502, never a buyer-facing
  instruction to send funds. The source-only proof mutates those fields
  individually in otherwise valid 201 receipts and requires rejection.
- HTTP 201 **created-request** responses must also match the canonical
  node's actual `void_public_buy_void_checkout_request_result_v1` schema,
  `VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1` marker, `ok: true`,
  `idempotent: false`, `one_active_request_cap_enforced: true` and a
  canonical embedded checkout-request object with request ID, awaiting
  payment-hash status and `persisted.ok: true`. An empty, unrelated, false,
  reused or malformed 201 cannot be forwarded as a newly created payment
  request. Two source generations are supported without leaking custody
  paths: the request-intake successor in Draft #2811 emits
  `request.persisted: {ok:true}` and its valid HTTP 201 original bytes are
  forwarded **unchanged**. Canonical `main` still emits
  `request.persisted: {ok:true,file:<private server path>}`. That exact
  legacy two-key shape is accepted as a successful 201 only after the rest
  of the receipt and buyer-intent contract qualifies; the edge **removes**
  the internal `file` key and forwards a sanitized canonical response
  with `persisted:{ok:true}`. **All** upstream ETag values are dropped
  even for a valid current-writer 201; a non-cacheable POST receipt cannot
  authenticate an opaque upstream ETag. Any other persistence metadata or
  a nonstring or empty legacy file field HOLDS as uncertain 502 rather than
  leaking data.
  The focused HTTP proof covers both minimal and full checkout receipts
  with the old server-private file path, preserved public payment fields,
  safe byte-for-byte pass-through for path-free receipts, and malformed
  persisted-state refusals.
  The edge additionally compares HTTP 201 `request.void_destination_address`,
  `source_chain`, `requested_amount_usdc` and `usdc_amount` to the
  **actual submitted JSON intent**, rather than trusting only the upstream
  envelope. Mismatches are generic uncertain 502; this guards against an
  otherwise-valid created receipt describing a different buyer destination,
  amount or payment rail. The comparison follows the canonical node's
  original field precedence for `requested_amount_usdc/usdc_amount/amount_usdc/amount`,
  `void_destination_address/delivery_address/delivery_wallet/wallet` and
  `source_chain/payment_chain/chain`, defaulting the chain to Base.
  The focused proof exercises all three mismatch negatives **and** valid
  legacy-alias positives, without inventing a new accepted request syntax.
  This is a bounded consistency check; the independent browser still checks
  canonical receiver, USDC contract, acknowledgements and payment instructions
  before displaying payment directions.
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
  The synthetic wire privacy matrix sends sentinel-bearing upstream bodies
  and private ETag/identity headers on HTTP 200, 400, 409, 503 and 500.
  The edge retains only coarse 400/409/503, maps 200/500 to 502, and emits
  the same fixed private-data-free response in all five cases.
  A rejected, lost or uncertain upstream result does not prove whether any
  economic obligation was persisted and is **never** authority to retry.
- A refused or timed-out upstream result becomes a fixed generic error with
  no checkout request, transaction identity, private data, or payment
  instructions in the edge-generated response. The public JSON result now
  explicitly contains `submission_outcome: "uncertain"` and
  `automatic_retry_safe: false` on all non-201 and failed-upstream results.
  These fields are negative payment-safety evidence, not a status inquiry
  or an operator-certified payment result.
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
full noncanonical JSON bytes and HTTP 201 exactly. In addition to
comparing the received JSON to its source fixture, the proof independently
pins the canonical Base USDC contract, receiver, source/payment chain 8453,
delivery chain 2050, exact 10 USDC six-decimal amount, sender/destination
identity, request/payment IDs, request-first flags, 4-minute lease,
`persisted:{ok:true}` and disabled automatic fulfillment. Changing the
fixture and receipt together can no longer silently redefine these identity
claims; the additional full legacy HTTP 201 fixture has a server-private
persisted file path that MUST be removed before a public receipt is delivered.

**This is not yet an executable cross-PR browser acceptance test.** Browser
Draft #2818 has additional time, view-generation, receipt-retry and
payment-instruction validation that must be tested with this *same* full
fixture at an independently composed source tree before a buyer can be
told the checkout is end-to-end ready. A failed or uncertain POST outcome
cannot be assumed uncommitted or safely retried. No real funds move.

## Verification

The focused proof exercises two actual, intentionally unfinished
chunked HTTP client uploads in parallel: a single byte with no ending chunk
and an indefinite small-byte trickle. Both must terminate within a fixed
wall-clock limit and cause **zero** upstream purchase requests, while
complete valid client POST requests still forward exactly once.

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
