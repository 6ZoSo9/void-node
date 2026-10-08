# Buy VOID: mutable caller request after payment fsync — negative witness

## Hypothesis and exact source lineage

Source-only **test Draft**, stacked on [#2663](https://github.com/6ZoSo9/void-node/pull/2663)
exact source head `6cc6e11db61e6ff6726bb50c7b6801a1df355d41`.
This owns only a new test, focused CI and a review note; it changes NO
payment-allocation handoff, historical V1 custody writer, replay classifier,
app ingress, real customer data, or deployed service.

Current payment writer Git blob is
`abbd4cf733d6ba1e9fb6b5fd902f6c59303f0aab`.
The earlier [#2668 positive source proof](https://github.com/6ZoSo9/void-node/pull/2668)
established the event is serialized ONCE into an immutable `eventLine`
and passes the original-buyer pre-fsync gate. That is real progress.

**A distinct caller-request boundary remains:** inside the same global
capacity bakery/request locks, the handoff still assigns
`const request = input?.request`, validates it with
`classifyBuyVoidPreappendVerifiedPaymentLineageV1`, then calls
`appendPaymentVerifiedEventDurableV1` and fsyncs the V2 event bytes.
After that fsync the supported `test_only_after_payment_fsync` callback
runs before `persistVerifiedPaymentAllocationUnderCapacityLockV1({request,...})`.
The allocation planner still uses `request.delivery_address`,
`request.quoted_void`, `request.launch_authority`,
`request.source_chain`, `request.tx_hash` and other mutable properties
before persisting the allocation, with strict replay binding only after
allocation persistence.

Therefore a caller-owned mutable request can be valid when checked but
change before allocation. On this source generation, the next step is to
**falsify on disposable ledgers** whether the valid payment row remains
durable while the wrong-buyer allocation is written and postchecked too late.
This is an unmounted caller-mutation trust-boundary test, not evidence any
remote client currently sends executable JS objects or that a production
operator/customer ledger was altered.

## Synthetic reproduction constraints

The TypeScript test inherits the exact **valid** temp request/receipt/native
USDC/launch fixture from the already-green #2668 real-writer proof. It first
requires an unchanged mutable-control payment to append one correct payment,
one allocation, and a correct source-only writer result.

For the negative case it passes a valid mutable JSON clone of the original
buyer request. Inside `test_only_after_payment_fsync`, after the writer has
durably recorded the canonical payment event and before the allocation
planner runs, it substitutes a **different valid EVM delivery wallet**.
It requires source fsync was reached; the exact V2 payment row retained the
original buyer; the persisted allocation shows the mutated buyer; the strict
replay postcheck rejects it; and an honest replay does not silently count
a second payment or repair an unqualified allocation. All data is under
one automatically cleaned `os.tmpdir()` test fixture.

The focused workflow executes the actual unmounted TS writer after a clean
Node 22/24/26 locked build, pins both application and replay source blobs,
and requires byte-identical negative receipts. **Success of a negative test
confirms a source defect, not a successful production launch.** The initial
PR head requires fresh CI before any conclusion.

## Required reviewed repair if falsification succeeds

Capture a single immutable **original request** snapshot before the first
asynchronous boundary, ideally directly from the descriptor-bound first
durable buyer ledger, and use it consistently for admission, preappend,
allocation planning, strict postcheck and idempotent recovery. Reject hostile
`toJSON`, setters and getters by exact one-time canonicalization. After
changing the owner source, invert this negative test to require that a mutable
post-fsync caller cannot poison an allocation: either the allocation retains
the first original and replay passes, or the mutation HOLDS before payment
append. Do not weaken the replay classifier or rewrite historical custody
V1 hashes to force green.

The existing #2663 preappend/first-original fixes and #2668 immutable
event-byte proof are preserved. Current-custody writer V2, high-water
external witness, operator principal authentication, deployed compiled/
packaged source-finality, real native-USDC provider finality, exactly-once
recovery and WC/VOID launch remain independently HOLD.

No Ready/merge, host/SSH/service, signer/key/wallet, customer data,
transaction, Chain-2050/WC, inventory/treasury/liquidity, presale/market
activation or funds movement is permitted by this test. PROTECT THE CORE.
