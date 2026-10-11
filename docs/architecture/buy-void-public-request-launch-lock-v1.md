# Buy VOID public request: revalidate one-active-destination under launch lock

## Source review — October 11, 2026

**Source-only Draft. No production, customer or funds authority.**

The current public `POST /__void/buy-void/request` already reads existing
requests and operator events before persisting, and reuses a matching active
destination intent. But those reads occur **outside**
`withBuyLaunchRequestAuthorityMutationV1`; two concurrent POSTs can both
observe no matching pending destination and subsequently append distinct
`request_id` rows. The browser-side [#2810](https://github.com/6ZoSo9/void-node/pull/2810)
guards one local client only and does not solve cross-tab or concurrent
HTTP requests.

This correction keeps a short `src/index.ts` bridge (exact Git blob
`133599f4e2279ca0efe633c9f0ed9bd69c6e955c`) **within its hard size
ceiling** and puts the recheck into compiled
`src/economic/buy_void_public_request_under_launch_lock_v1.ts`
(Git blob `e1295f1a3f85c125982bb56c7548f71a0f859f1a`). The existing
`__voidPersistBuyVoidRequestV1` delegates to that server-owned helper,
which re-reads request and operator-event history **inside the previously
used cross-process launch-authority mutation lock**, before either request
JSONL append or per-ID file creation. This avoids adding a second lock:

- If no launch-authority-valid active intent exists at the same lowercase
  destination, write the reviewed request using the existing persistence
  functions.
- If a matching amount and source chain already exists, return the **existing
  request**, do not generate a second stored request, and issue an
  `idempotent:true` response; no new payment instruction is minted.
- If the destination is active but amount or chain differs, return a
  `409 one_active_request_per_void_destination`, with **no second append**.
- Completed `fulfilled`/`rejected` prior requests retain the existing
  terminal-state policy, and different destination intents are independent.

The earlier quick read-only destination check remains for normal responses;
the new **serialized pre-append revalidation** is authoritative for this
specific request-create path. The existing launch authority/coupled generation
admission, USDC contract, chain selection, acknowledgements, quotation,
one-request ID and request document schema are unchanged.

## Source-bound regression

`scripts/prove_buy_void_request_under_lock_revalidation_v1.mjs` imports
the **actual compiled request-admission helper**. It also extracts the
request and operator-event readers, event-status projection and
terminal-status classifier from the actual `src/index.ts` source, and
transpiles those exact fragments with the reviewed TypeScript compiler. It
runs against *disposable temporary files* with a synthetic serialized lock.
The immutable predecessor index is extracted from Git and its actual old
persistor proves that even serialized prior callback invocations append
**two duplicate rows**. The new compiled helper must instead append only
one and reuse that stored request,
refuse a different amount/rail without an append, preserve a different
destination, and permit a new request after an explicit terminal event.

Index growth is forbidden: the previous inlined patch failed the repository's
hard **3,852,487-byte** `src/index.ts` ceiling. This version keeps the
actual index source below the ceiling without increasing its configured limit.

This focused test is **not proof that a real Nimo/Precision deployment, peer,
durable fsync, cross-UID payment lock or inventory allocator is correctly
installed**. It does not bind other writers that fail to use the canonical
launch lock or prove safe recovery from partial append/crashes. The existing
tolerant historical request JSONL reader is unchanged; canonical corruption
or ambiguous already-persisted state requires a separate source and operating
review. The Node22/24/26 workflow typechecks/builds the actual full repository,
requires exact source Git blobs and byte-identical inert test transcripts,
with no token write permission and no mounted HTTP/payment service.

## Launch boundaries

No Ready/merge, live request intake, customer records, installed custody,
Nimo V4 acceptance, payment verifier, verified-payment→allocation dispatcher,
reservations, Work Credits, VOID market, signing, treasury or funds action
is authorized by this source-only guard. Independent operator acceptance and
a separate deployment ceremony remain necessary. **PROTECT THE CORE.**
