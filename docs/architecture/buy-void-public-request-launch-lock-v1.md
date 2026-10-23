# Buy VOID public request: revalidate one-active-destination under launch lock

## October 20 machine-readable range-error generation — current source-only

The reviewed machine-readable `/blocks/range` alias/recovery repair generation changes `src/index.ts` outside the Buy VOID request-lock route while preserving the request persistence/privacy behavior. Current exact index Git blob: `a09661797aa4295371c036be36d82995e5233269`.

Historical request-lock V1 and V2 proofs remain immutable at Git blobs `26bb9725b4a4639bff4b3ce4375aeb9e827830be` and `94d4ef0544264a4ec23b2def7b4d31066f709310`; both must fail closed on this source generation. Current request-lock V3 proof is Git blob `ad1b9b017770717f72b40a61c0bdef4bb80254de`. It freezes V1+V2 before replaying the complete V2 request persistence/privacy adversary matrix against the exact range/alias-repaired router bytes.

The public-request launch-lock workflow requires V1/V2 refusal, V3 success, and byte-identical Node 22/24/26 V3 receipts. Coupled-launch consumes V3 as the current request-persistence proof. No product/runtime implementation source changes in this successor.

This is source/test/CI qualification only. It does not deploy the route, enable payment intake, authorize signing or funds movement, or activate the presale/WC market.

## October 12 callback and comparison authority isolation — source-only

The request helper treats same-process ambient prototype mutation as an
integrity threat because request admission decides whether a new paid
obligation may be persisted. The current source closes three remaining
ambient-method seams without changing the live launch authority itself:

- the six launch/history callbacks are captured from exact own numeric data
  descriptors rather than through `Array.prototype[Symbol.iterator]`;
- canonical request-ID lookup walks dense own indices and does not call
  ambient `Array.prototype.find` or `.some`;
- destination and transaction-hash normalization uses module-load-captured
  `String.prototype.trim` / `toLowerCase`, with captured numeric
  conversion and finite checks for the matching amount comparison;
- durable-history reconstruction no longer uses ambient `Map`, `Set`,
  `Array.from`, live `Array.isArray` / `Object.hasOwn`, or mutable
  WeakSet prototype dispatch. Exact collection predicates/methods needed by
  the helper are captured at module load, while canonical request-ID folding
  uses null-prototype dictionaries plus dense own-index arrays.

The focused proof contains positive-control hostile replacements for all
four classes, demonstrates that naive code is affected, and requires the
actual helper to invoke none of those poisoned functions while preserving
exactly one durable synthetic obligation. The collection regression targets
only the exact synthetic economic arrays/request IDs while poisoning
`Array.from`, `Array.isArray`, `Object.hasOwn`, Map/Set methods,
`Array.prototype.push`, and WeakSet methods, so unrelated Node internals keep
native behavior. Required markers are
`authority_callback_tuple_iterator_poison_isolated=true`,
`ambient_array_find_some_request_authority=false`,
`ambient_string_request_authority_intrinsics=false`, and
`ambient_collection_intrinsics_request_authority=false`.

The helper source identity below includes the semantic-no-op TypeScript callback annotation required by `noImplicitAny`; runtime request-lock behavior is unchanged.

Current exact evidence identities are helper Git blob
`58c921a1e9efdb3d672aee3dc102369561c42a15`, proof Git blob
`26bb9725b4a4639bff4b3ce4375aeb9e827830be`, and request-lock workflow Git blob
`93b5e752b111035e63782e2fc136df5d13a5258c`. The current
`src/index.ts` generation remains
`40239e0f76aa1edce43523d18c1b57691e41e8cf`.

This is source/proof/CI hardening only. It is not deployment, buyer
authorization, payment verification, signer or wallet use, presale/WC
activation, or funds authority.

## October 12 operator immutable-payment comparison — source-only

An operator's first same-ID payment transaction-hash revision must preserve
**every original economic field**, including nested USDC sender/receiver,
rail and payment instructions. Previously the immutable-field comparison
iterated `Object.keys(row)` through ambient `Array.prototype[Symbol.iterator]`.
A same-process modified iterator could omit `payment_instructions` from
both operands; inherited `Object.prototype.toJSON` could also normalize
different nested receiver addresses into identical serialized bytes.

The source now deep-detaches both durable and proposed rows into bounded,
null-prototype own-data-only snapshots before comparing. It walks the
captured own-key array by numeric indices and preserves all fields except
the *three explicitly mutable operator columns*: status, tx_hash, and
payment_submitted_at_ms. The existing locked journal/sidecar preappend and
final-byte checks remain unchanged. The actual compiled-helper proof
supplies a changed nested USDC receiver with (a) poisoned array iteration,
and separately (b) inherited toJSON, demonstrates naive comparison would
hide the change, and requires that the actual request intake HOLD **before**
any new journal append or sidecar overwrite.

Reviewed candidate identities: helper `58c921a1e9efdb3d672aee3dc102369561c42a15`, focused proof
`26bb9725b4a4639bff4b3ce4375aeb9e827830be`. The existing Node22/24/26 workflow pins these exact Git
blobs and requires independent adversarial markers. This is protection
against conditional same-process prototype interference, **not** evidence
of remote exploitation or a production signer/buyer launch gate. Main and
real customer/custody records are unchanged.

## October 12 canonical buyer snapshot under hostile ambient prototypes — source-only

The existing strict journal reader already retained its own JSON parser and
serialization references, but a newly admitted buyer's `reqObj` could still
inherit a late `Object.prototype.toJSON` hook. Capturing the native
`JSON.stringify` alone does not prevent that hook from changing the durable
amount, destination, or payment instructions after the request passed the
launch-authority admission check. Ambient `Array.prototype[Symbol.iterator]`
changes can also silently skip one key while naive code copies `Object.keys`.

The current helper now detaches the incoming request **before**
`withLaunchMutation`, authority comparisons, journal append and sidecar
publication. It snapshots the entire admitted own-data graph into
null-prototype objects and arrays, rejects accessors, symbol/hidden or
forbidden keys, nonfinite numbers, cycles, sparse arrays and oversized/deep
graphs, then requires exact own-key count/order parity. It traverses the
`Object.keys` result by **numeric indices**, not the ambient array iterator.
The same closed snapshot goes through both canonical `JSON.stringify` calls
(journal row and pretty sidecar) and the in-lock economic checks.

The actual compiled-helper regression shows a positive poisoned
`Object.prototype.toJSON` control (3 USDC changes to 250 without altering
the original input), but confirms that the persistor invokes no further
poisoned hook and durably writes only the original 3-USDC amount and
destination, including an exact matching sidecar. A second positive control
drops `payment_instructions` from a naive `for..of Object.keys` copy, but
the real persistor retains that field and both expected byte strings. Further
test cases reject own `toJSON`, getter fields, nonfinite numbers and nonplain
request data before any journal mutation.

**Current source blob:** `58c921a1e9efdb3d672aee3dc102369561c42a15`; **exact proof blob:**
`26bb9725b4a4639bff4b3ce4375aeb9e827830be`. The focused Node 22/24/26 workflow pins both and requires
the new adversarial markers. This protects an in-process integrity seam,
**not** runtime module/source-custody trust, deployed buyer authorization,
payment verification, crash atomicity, or full presale/WC readiness.



## October 12 anonymous-retry response-shape parity — current source-only

The actual public POST handler must not reveal a prior buyer's private
payment amount or source chain through small changes in anonymous HTTP 409
error shape. Its former same-destination, matching-terms branch contained
`one_active_request_cap_enforced:true`, while a changed amount/rail lacked
that field. The currently reviewed `src/index.ts` source adds the **same**
field to the changed-terms conflict, preserving 409 in both cases, the generic
`one_active_request_per_void_destination` error, and redaction of account,
request ID, path, note, payment details or the original buyer's terms.

Current index source identity: `40239e0f76aa1edce43523d18c1b57691e41e8cf`.
The source-extracted request proof identity is
`26bb9725b4a4639bff4b3ce4375aeb9e827830be`. In addition to redaction, the proof executes both
actual mounted response branches and requires exactly equal JSON payloads,
key order and HTTP 409 for matching versus changed anonymous payment
terms. The dedicated Node 22/24/26 workflow is pinned to those Git
objects and still requires
separate exact live privacy, original sidecar and crash-recovery gates.
These source-only checks do **not** authorize live payments or launch.


## October 12 public successful-receipt private path redaction — source only

The public successful HTTP 201 response used to embed
`requestObj.persisted = { ok:true, file:persisted.file }`. Because the
server-only sidecar path can be under an absolute `VOID_BUY_REQUEST_DIR`,
that code exposed private storage layout to unauthenticated buyers.

The mounted public route now retains the private file path **only in the
server-local `persisted` result** and returns a public-safe
`request.persisted: {ok:true}` receipt. The focused regression executes
the exact mounted HTTP 201 response branch using an inert sentinel absolute
sidecar path; it must report created request status without including the
directory, filename or `file` key anywhere on the public wire. It also
retains the historical old-source leak as a negative control.

New exact source blob `src/index.ts:
40239e0f76aa1edce43523d18c1b57691e41e8cf`; the final helper and
privacy adversarial proof are bound by the dedicated workflow. This is
source-only redaction, not a custody permission change or production install.
Because the index source generation changed, the stacked canonical-producer
preload Draft #2822 still needs an independent generation update **and its
open P1 check-to-load race remains unresolved** before any service cutover.

## October 12 preappend exclusive reservation — source-only candidate

**P2 interloper after ENOENT:** the first-new-request path now opens the
private 0600 `<request_id>.json` with `O_RDWR|O_CREAT|O_EXCL|O_NOFOLLOW`
before any `requests.jsonl` append. The descriptor is retained across
the append and transferred into the existing bounded, fsynced and
byte-verified publication path. An interloping newly created sidecar at
the exclusive reservation returns `sidecar_appeared_before_create`
before any new journal row can be durably appended. A retained reservation
is checked against the pinned directory identity and must be zero length;
the original FD is closed even if the intervening journal operation fails.

The adversarial focused proof injects an opaque same-UID sidecar just
before O_EXCL and requires **no journal file was created**. This is a
stronger invariant than merely refusing a public success after a journal
row was already committed. It remains **not cross-file crash atomicity**:
a process termination after reserving the empty private sidecar but before
writing the canonical JSON can leave an orphan. That exact ambiguous state
fails closed, requiring reviewed operator recovery rather than truncation
or automatic double-purchase. A same-UID actor able to modify a reserved
inode later in its lifetime still requires an independent source-custody
exclusion gate; this change is not continuous protection.

## October 12 orphan sidecar and revision journal cleanup — source only

A new Buy VOID request with an ID **absent from canonical requests.jsonl**
must not open or truncate a surviving private `<id>.json` sidecar.
Even with a nonempty, otherwise sound ledger, that leaf is evidence of
rollback, lost journal history or another writer. The source now refuses
`new_request_orphan_sidecar` **before any journal append**, leaving the
orphan's exact bytes and prior purchase obligations unchanged.

When verification of an original operator-revision sidecar fails, the caller
retains both sidecar and journal FDs until cleanup. Its close handler now uses
an independent nested `finally`, guaranteeing an attempt to close the
pinned journal even if the sidecar close throws and causes a HOLD. The
actual compiled-helper proof creates an orphan alongside a nonempty
journal, proves zero new journal bytes and intact sidecar bytes, then
injects a failed sidecar close and requires exactly one observed journal
close attempt without authorizing the revision.

This closes two narrow source races, **not** production crash atomicity or
authorization of payment, fulfillment, Work Credits or public presale.

## October 11 operator revision original-sidecar preappend fence — source only

Before an authenticated operator's first tx-hash revision can append any new
economic journal row, it opens the *existing original buyer sidecar* through
O_RDWR|O_NOFOLLOW under the launch lock, checks the same original 0600 inode,
and compares its actual bytes with the canonical **pre-revision** journal row.
An absent sidecar or any in-place byte mismatch HOLDS before the journal
append, preserving the original customer-sidecar evidence rather than
truncating a corrupted old record and calling the new revision valid.

The same pinned descriptor stays open across the revised journal append,
file/directory fsync and final canonical **new-revision** byte readback.
Both preappend and final comparisons require descriptor and visible-path
metadata stability. A separate disposable actual-source regression tests
missing and byte-corrupted original sidecars; both must refuse a revision,
leave the original durable journal unchanged and never repair/overwrite an
untrusted old sidecar. The existing final FD-read adversary explicitly lets
the preappend original comparison pass before corrupting the later result.

This is a bounded at-use source integrity test, not a same-UID lifetime lease,
not automatically safe crash replay and not live buyer/payment acceptance.

## October 11 first-write/revision final sidecar closure — source only

**All** successful publication branches now retain the same sidecar FD from
private inode verification through file and directory fsync, final journal
lineage and final byte readback. The new-request and operator tx-hash revision
paths use `O_RDWR|O_NOFOLLOW` (plus `O_CREAT|O_EXCL` only for a genuinely new
leaf). Their canonical pretty-JSON bytes are serialized once from the trusted
native `JSON.stringify` captured at module initialization, written to the
retained FD, fsynced, then compared byte-for-byte through that exact descriptor
using the same independent final verifier applied to reuse/recovery. The
post-write bigint metadata baseline must remain unchanged through success,
and uncertain descriptor close HOLDS instead of issuing a success result.

The expanded actual-compiled-helper regression corrupts only the last
sidecar FD read buffer (not customer data) for both a new first checkout and
a valid operator same-ID tx-hash revision; each must fail with the exact
`sidecar_final_content_mismatch` and cannot falsely claim publication success.
Because the journal append occurs before this final read, a rejected result
may already have an independently durable journal row; this work does **not**
claim cross-file atomicity or permission to replay a new payment.

Source-only. No installed runtime or presale/WC payment acceptance is granted.

## October 11 final sidecar byte revalidation — source only

A new last-success safety check keeps the previously authenticated sidecar FD
open through a second bounded byte-for-byte read against the **canonical latest
journal row**, then requires exact bigint dev/inode, size, uid/gid, permission,
link count, mtimeNs and ctimeNs stability before reporting internal idempotent
reuse. An exclusively recreated missing sidecar is opened O_RDWR|O_EXCL so its
fresh fsynced bytes can be re-read; an existing sidecar remains O_RDONLY.
Both paths revalidate journal, launch authority and private directory *before*
the last byte check. The focused compiled-helper proof injects an equal-length
same-inode rewrite after the earlier validation in both the existing and
missing-sidecar-recovery paths, and requires HOLD without appending another
economic obligation. A second **metadata-stable** adversary corrupts only
the actual final FD read buffer and requires the exact
`sidecar_final_content_mismatch` refusal, proving that the final
byte-comparison loop runs even when inode, size, mtime and ctime did not drift.

These are final observed-byte checks, **not a continuous exclusion mechanism**
against a same-UID writer after the final observation or general atomic
journal/sidecar transaction. Operator-event history, installed request-directory
generation, coupled presale/WC market readiness, funds and custody remain HOLD.



## October 11 create-only missing-sidecar recovery — source-only candidate

One specific crash gap is now replayable without inventing a second purchase:
if a complete, strictly verified original JSONL row survived a crash but its
per-request JSON sidecar is entirely absent, a matching public retry may
recreate **only that missing sidecar** from the canonical latest durable
request. The existing cross-process launch lock, retained no-follow journal
FD, private-directory FD, source authority and original-row provenance remain
mandatory. The retained journal is fsynced and its original inode/size/mtime
identity rechecked before any recovery write. The missing sidecar is created
using O_CREAT|O_EXCL|O_NOFOLLOW, fsynced, directory-fsynced and checked for
rebound before an internal idempotent result. No extra JSONL row is appended.

An existing sidecar is read-only verified byte-for-byte against that original
latest JSONL row. An inconsistent, truncated, world-readable, symlinked,
rebinding or interloped sidecar is a **HOLD**, never auto-overwritten. Historical
request IDs with unsafe path components also HOLD. The public caller still
receives only the existing generic conflict, never another buyer's details.

This is **not** general crash atomicity: a torn/incomplete JSONL append,
an existing torn sidecar, incomplete authenticated operator-event history,
coordinated rollback or recovery of a terminal/revised request without an
eligible public retry remains independently unqualified. The exact-head
compiled-helper proof uses disposable directories for absent-sidecar replay,
existing-byte mismatch, injected create interloper and unsafe request-ID
rejection. No production/customer service, custody, payment, WC/VOID launch
or funds authority follows from source-only CI.

## October 11 pinned journal read-to-append generation — source only

The original strict request-history reader authenticated a journal inode and
then closed its FD. Later O_APPEND opened a pathname without a proven
relationship to those bytes. A same-UID actor could replace the journal
between read and append, or introduce an unreviewed first-generation journal
between ENOENT and O_CREAT, causing an unqualified write.

The current candidate now opens an existing verified 0600 journal as
O_RDWR|O_APPEND|O_NOFOLLOW under the launch lock and retains **the same
descriptor** from byte-framed strict history parsing through the event append,
file fsync, private-sidecar publication and directory fsync. At each authority
boundary it compares the retained inode's bigint dev/ino, mode, size, owner,
ctime/mtime and link count to the visible leaf. A nonexistent journal may be
created only once using O_CREAT|O_EXCL|O_NOFOLLOW, with identity checked
before use. A changed or missing visible leaf HOLDS without a success receipt,
even when the already pinned original file had been modified.

The source-only actual compiled-helper proof covers one single open for an
existing journal despite a subsequent append, a same-UID pathname replacement
immediately before the descriptor write (replacement bytes untouched), and
an unexpected first-generation file inserted before exclusive create.
Checks require the full Node22/24/26 and cross-node suite.

This is not a continuous same-UID tamper-proof lease. It still **does not**
atomically commit the JSONL record and its sidecar, repair a partial commit
after crash, validate all operator-event history, or qualify production
payment acceptance, custody, Nimo installation, WC/VOID launch or funds.

## October 11 sidecar inode-binding security repair — source only

An existing verified private 0600 request sidecar used to be opened again by
pathname without binding the returned descriptor to the original preflight
inode. The writer could then truncate a newly substituted same-UID 0600 leaf
despite the earlier successful check. A missing sidecar likewise permitted a
substitute created between its ENOENT preflight and ordinary O_CREAT open.

The writer now pins bigint dev/ino/owner/mode/link-count evidence for existing
sidecars, opens an existing leaf without O_CREAT, and requires exact preflight
identity before any truncate. An absent leaf is created using O_CREAT|O_EXCL
and O_NOFOLLOW; an intervening new pathname causes an explicit HOLD. The
opened descriptor's identity is rechecked against its visible directory child
before modification, after file fsync, and again after the directory fsync.
These are bounded checks, not an adversary-resistant lifetime inode lease.

A focused inert compiled-helper regression injects a same-UID old-leaf swap
just before open, a new matching private leaf just before exclusive create,
and a postwrite swap during sidecar fsync; all must HOLD rather than report
success or truncate the substituted leaf. A failed append may already have
modified the original journal: this patch **does not** guarantee multi-file
crash atomicity or establish the journal read-to-append same-inode boundary.
Those and broader customer/privacy/production gates remain explicit HOLDs.
No runtime/host/payment/presale/WC/VOID/funds action is authorized.

## October 11 private buyer-record permissions — source only

At ordinary process umask 0022 the older writer could create the public
request directory mode 0755 and request JSONL/sidecar mode 0644. Those
permissions are inappropriate for buyer-supplied account, note and payment
metadata, even when the HTTP response is redacted.

This candidate creates a new request directory with mode 0700, new journal
and sidecar leaves with mode 0600, and refuses existing wrong-owner,
world/group-readable or symlinked leaves before appending any new data.
It opens write descriptors with no-follow, checks the opened file identity
and mode, then writes via those descriptors. It deliberately HOLDS rather
than silently chmodding or overwriting historical insecure files.
The synthetic focused proof runs under an explicit umask 0022, checks
exact private modes, and attempts insecure-directory, legacy-0644-leaf,
and symlink-sidecar adversaries with zero journal mutation.

Existing deployments may require a separately reviewed private-custody
migration if their old bytes are not already private. This is not a
proven directory-ancestor lease or append-to-validated-original-inode
guarantee: a same-UID path rebind and a crash between journal and sidecar
remain separate P1 HOLDs. No installed host, real customer, signer,
payment, treasury or presale mutation follows.

## October 11 guarded fsync and pinned-directory qualification — source only

This candidate retains an opened private 0700 request-directory inode while
reading strict request history and writing the journal/sidecar, addressing
mutable request-directory pathname rebinding. Linux `/proc/self/fd` child
paths tie those operations to the held inode. A successful publication now
requires journal-file fsync, sidecar-file fsync, and parent-directory fsync,
then a final visible-path/inode comparison. The focused proof injects failures
at each fsync boundary and a same-UID directory replacement during publication;
all must refuse a false success. Existing 0600 leaf requirements remain.

**Critical limitations:** The strict request-journal reader currently closes
its checked leaf descriptor before the append writer opens a new O_APPEND leaf.
A same-UID journal inode swap can still escape that read-to-append binding.
The journal and sidecar are separately written and are not an atomic pair; a
crash or fsync failure after one write can leave a partial durable commit.
This is a source-only security increment, **not** a qualified recovery protocol,
a payment receipt, a custody deployment, or presale/WC activation. Keep
Draft/HOLD pending independent review, full exact-head CI, and those
remaining source/runtime gates.

## October 11 same-ID operator tx-hash revision candidate — source only

The current merged operator route correctly refuses to report a payment
tx-hash update that did not reach durable request history, but the shared
public request persistor previously returned only an idempotent reuse.
This unmerged candidate adds an explicit same-request operator revision:
the current launch lock authorizes exactly one first tx-hash/status update
from an existing immutable original request. The ID, destination, USDC
amount/chain, quote, recipient, account, note and launch-authority data
cannot change. Full canonical JSONL is folded only across valid same-ID
transitions; hidden duplicate-ID conflicts and duplicate hashes held by
another request always HOLD. Ordinary public creation still allows only
one active destination.

A new source-only disposable compiled-helper test verifies the actual
second journal row, current reader's new latest row, matching sidecar,
same-destination public refusal, immutable-field tamper, duplicate hash
and conflicting historical same-ID HOLD. This does **not** qualify durable
same-inode append, atomic ledger/sidecar crash recovery, a strict operator
event journal, customer records, production host service, acceptance of
payment, or a WC/VOID presale launch. These remain separate HOLD gates.

## October 11 public exception redaction — source only

The public request POST's catch branch previously returned raw exception text
in `message`. That could leak internal filesystem and buyer-processing details
to an unauthenticated caller. The source now emits fixed public error codes
only: known lease/destination conflicts remain HTTP 409, and unexpected errors
remain HTTP 500 with generic `buy_void_checkout_request_failed`. A
source-extracted adversary executes the old and current catch expressions,
proves the historical leak, and requires no internal sentinel bytes in the
new response. This does not establish authenticated caller recovery or
production acceptance.

## October 11 public privacy and strict-history route successor — source only

The public POST now lets the existing launch-locked persistor decide every
active-destination retry, never returning an earlier buyer's request or
request ID. An unauthenticated same-intent retry receives generic HTTP 409
instead of someone else's payment instructions. The old public fast return,
which could bypass strict malformed-history verification, is removed.
The exact source-extracted regression executes the real reused-response
branch against private sentinel fields and requires zero disclosure. No
public intake activation or production privacy acceptance follows.

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
poisoned split callbacks. The regression's positive-control hook now
intercepts the actual LF separator used by the historical parser, not the
unrelated two-byte literal backslash-n string. The proof first demonstrates
that one of two conflicting raw request rows can disappear through the
legacy split hook, then requires the hardened byte-framed parser to preserve
both and invoke zero injected callbacks.

A missing or zero-byte `requests.jsonl` is not authenticated fresh genesis
if an operator-event history or a per-request JSON sidecar survives in the
same directory. Such states HOLD before any request append. This deliberately
does not claim an authenticated genesis against coordinated deletion of all
history, or stable directory/journal identity through the subsequent pathname
append. Separate P1 privacy, tx-hash update and crash/recovery obligations
remain outstanding.

Current source Git blob: `58c921a1e9efdb3d672aee3dc102369561c42a15`. Actual source-only
regression Git blob: `26bb9725b4a4639bff4b3ce4375aeb9e827830be`. Fresh exact-head Node 22/24/26 and full
repository CI are mandatory; older results and the prior seven failing
workflows are historical evidence only. No public intake, payment, custody,
wallet, presale, WC, service, or funds authority follows.

## Source review — October 11, 2026

**Source-only Draft. No production, customer or funds authority.**

The original public `POST /__void/buy-void/request` read existing
requests and operator events before persisting, then returned a matching
active buyer's complete request to an unauthenticated caller. The
read occurred **outside** `withBuyLaunchRequestAuthorityMutationV1`,
allowing concurrent POSTs to both observe no destination and append
distinct `request_id` rows. The new public route removes that
pre-lock fast path; strict in-lock request-history qualification controls
all reuse/conflict decisions. The browser-side [#2810](https://github.com/6ZoSo9/void-node/pull/2810)
guards one local client only and does not solve cross-tab or concurrent
HTTP requests.

This correction keeps a short `src/index.ts` bridge (exact Git blob
`40239e0f76aa1edce43523d18c1b57691e41e8cf`) **within its hard size
ceiling** and puts the recheck into compiled
`src/economic/buy_void_public_request_under_launch_lock_v1.ts`
(Git blob `58c921a1e9efdb3d672aee3dc102369561c42a15`). The existing
`__voidPersistBuyVoidRequestV1` delegates to that server-owned helper,
which re-reads request and operator-event history **inside the previously
used cross-process launch-authority mutation lock**, before either request
JSONL append or per-ID file creation. This avoids adding a second lock:

- If no launch-authority-valid active intent exists at the same lowercase
  destination, write the reviewed request using the existing persistence
  functions.
- If a matching amount and source chain already exists, the helper
  returns the **existing request internally** without another append.
  The unauthenticated public POST does **not** expose that record or
  its request ID. It responds with a generic HTTP 409 active-destination
  conflict, not a falsely authenticated `idempotent:true` recovery.
  Genuine caller recovery requires a separately reviewed proof of ownership.
- If the destination is active but amount or chain differs, return a
  `409 one_active_request_per_void_destination`, with **no second append**.
- Completed `fulfilled`/`rejected` prior requests retain the existing
  terminal-state policy, and different destination intents are independent.

The earlier public read-only destination check is removed; all active
destination admission now reaches the **serialized strict-history pre-append
revalidation** before any public result is returned. The existing launch authority/coupled generation
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
idempotent recovery. The original public route's prior-request disclosure via both its
precheck and its race-reuse response is now eliminated in source. This
does NOT establish authenticated original-caller recovery, nor clear
other public endpoints or the remaining production P1 boundaries. No live payment, wallet,
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

This repair prevents this **specific public request endpoint** from
returning another buyer's stored request metadata; it does not prove
broader buyer privacy, a tolerant **operator-event** history reader,
coordinated rollback, authenticated original-caller recovery, or atomic
request/sidecar durability. Those
remain separate P1/production HOLDs. No deployment or payment authority
is granted by this source/test patch.
