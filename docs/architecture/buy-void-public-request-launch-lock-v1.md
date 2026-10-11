# Buy VOID public request: revalidate one-active-destination under launch lock

## October 11 raw-byte history successor — source only

The reviewed request-history helper now derives each complete JSONL row from
numeric LF byte positions under a captured native `Reflect.apply` and typed
subarray operation. Fatal UTF-8 decoding and captured native JSON parsing
and serialization operate on those exact frames, with parsed objects made
null-prototype before canonical comparison. A post-import
`String.prototype.split` hook may no longer silently erase a durable
active obligation. The existing disposable compiled-helper proof now
**positively exercises** a split hook that hides one of two same-destination
rows, then requires unchanged bytes and a multiple-active HOLD with zero
poisoned split callbacks.

A missing or zero-byte `requests.jsonl` is not authenticated fresh genesis
if an operator-event history or a per-request JSON sidecar survives in the
same directory. Such states HOLD before any request append. This deliberately
does not claim an authenticated genesis against coordinated deletion of all
history, or stable directory/journal identity through the subsequent pathname
append. Separate P1 privacy, tx-hash update and crash/recovery obligations
remain outstanding.

Current source Git blob: `20d0ec09dba80260d533346f719ad292d40ed5d4`. Actual source-only
regression Git blob: `cb0ed3aab6e8452b3841e93d63bca2201ad58035`. Fresh exact-head Node 22/24/26 and full
repository CI are mandatory; older results and the prior seven failing
workflows are historical evidence only. No public intake, payment, custody,
wallet, presale, WC, service, or funds authority follows.

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
(Git blob `20d0ec09dba80260d533346f719ad292d40ed5d4`). The existing
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

## Lease expiry during asynchronous history checks (source-only)

The canonical launch lock validates request authority before invoking a
callback, but it also gives the callback an `assertCurrentAuthority` function.
A request/event reader may await asynchronous I/O while the same cross-process
lock is held. Admission at lock entry is **not** proof that the same launch
generation or expiration remains valid when the append begins.

The helper now REQUIRES the canonical callback to provide its revalidator,
invokes it after both awaited history reads and synchronous request encoding,
and only then appends. There is no intervening `await` between this assertion
and the append. It also requires a fresh revalidation before emitting an
idempotent/reused result, so stale read-only results cannot be mistaken for a
currently authorized intake. Missing callback, expired generation or TTL
always HOLD without adding a request row or sidecar.

The existing disposable compiled-helper proof now simulates a lease expiring
*while* `readRequests()` is pending, both for a previously empty history and
for a single matching active request. Both must refuse, perform zero appends,
and assert two actual authority checks (lock admission and post-await). A
lock callback that drops the revalidator must HOLD as well.

**Limits:** This is a lease/read-write linearization guard under the existing
lock, not a strict historical JSONL reader, protected high-water, durable
request/sidecar atomicity, canonical buyer authorization or authenticated
idempotent recovery. The public route can still expose a prior full request
record to an unauthenticated caller who knows public intent fields; that
separate P1 finding remains OPEN and blocks release. No live payment, wallet,
customer ledger or presale/WC state is changed here.

## Launch boundaries

No Ready/merge, live request intake, customer records, installed custody,
Nimo V4 acceptance, payment verifier, verified-payment→allocation dispatcher,
reservations, Work Credits, VOID market, signing, treasury or funds action
is authorized by this source-only guard. Independent operator acceptance and
a separate deployment ceremony remain necessary. **PROTECT THE CORE.**

### Already-multiple active destination histories

Old request-intake code could durably create two nonterminal requests for the
same VOID destination. Reading only the first matching row is **not** an
idempotency guarantee when another active obligation remains (especially
with mismatched USDC amount or payment chain). The new under-launch-lock
recheck scans every projected row and **HOLDs before append** if more than
one launch-qualified nonterminal request has the destination. It never picks
one of several competing obligations as the winner. The actual compiled
helper proof includes both conflicting-rail/amount and identical multi-active
history; both must leave the original JSONL file byte-for-byte unchanged.

This does **not** authenticate that the legacy request/event readers returned
all on-disk records: a skipped malformed or truncated JSONL row remains a
separate production admission HOLD. No real request, payment, reservation,
service deployment, or presale activation is authorized.

## Under-lock strict request JSONL preflight — next reviewed source candidate

The old `__voidReadBuyVoidRequestsV1` can omit malformed or truncated
request rows. Before treating its returned list as complete, the new compiled
helper independently opens the existing `requests.jsonl` with a no-symlink
leaf check and bounded 64 MiB size; verifies inode, size and metadata before
and after descriptor-based reading; requires fatal UTF-8, exact LF-only
canonical JSON rows and surviving request IDs in the legacy reader result.
A failed read, descriptor close, malformed line or silently dropped row HOLDs
under the same launch lock **before any request append**. Launch-generation
authority is rechecked immediately after asynchronous history reads and again
at the synchronous append point; no expired lease becomes a successful
persistence or idempotent answer.

The *independently parsed complete durable rows*, rather than the
legacy reader's possibly filtered subset, now drive the in-lock destination
projection. A separate negative case stores two active requests with the
same `request_id` but conflicting payment terms, supplies a legacy reader
that returns only one, and requires an unchanged JSONL ledger plus an
explicit multiple-active HOLD. Matching request IDs alone are not sufficient
evidence of complete history.

Disposable compiled-helper regressions now verify that a malformed durable
row and a valid durable row omitted by the reader both refuse without
appending or generating a per-request sidecar. The Node22/24/26 workflow
requires these fixed markers. On `workflow_dispatch`, checkout and diff
hygiene use the exact manual run head and its first parent rather than empty
PR-only references.

**This does not solve** an unauthenticated public response disclosing a
previous buyer's request metadata, a tolerant **operator-event** history
reader, coordinated rollback, or atomic request/sidecar durability. Those
remain separate P1/production HOLDs. No deployment or payment authority
is granted by this source/test patch.
