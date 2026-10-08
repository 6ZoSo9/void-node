# Buy VOID: hypothetical pre-append original-lineage qualification

## Why this is needed

The new source-only durable payment→allocation handoff is owned by
[Draft #2654](https://github.com/6ZoSo9/void-node/pull/2654), exact parent
`b2571e8ee9c352bd9b78ce8f0c87f2487e3f8ded`. The existing
`classifyBuyVoidVerifiedAllocationReplayBindingV1` already checks the
durable *original* request, native Base/Ethereum token, original buyer/
receipt sender and destination, quote/rate, source transaction/log, and
coupled-launch lineage. The handoff calls that strict classifier in the
**post-append** allocation path, meaning it can reject an inconsistent
verified payment *after* payment JSONL has been fsynced. The actual
production source remains unmounted, and presale remains HOLD.

A neighboring independent [negative filesystem PR #2658](https://github.com/6ZoSo9/void-node/pull/2658)
initially attempted to reproduce the post-fsync mismatch, but its first
synthetic request ID `buyvoid_h_hhhhhhhh` violates the actual required
eight-hex suffix. That test is blocked at the input preflight; it does
not show payment history poisoning. Its owning author must separately
correct the fixture and rerun its real temporary-filesystem witness.
This Draft does **not** rewrite or bypass that active test.

## In-memory reference strategy — before any append

`scripts/prove_buy_void_preappend_lineage_hypothetical_v1.mjs`
uses only **immutable Buffer** fixtures and the actual existing compiled
replay classifier. It models a *hypothetical append* by joining the
already-read operator-event bytes with `JSON.stringify(event)+"\\n"`
**in memory only**. For a valid new payment and no current allocation,
the strict classifier must return exactly
`status="verified_allocation_missing"` plus the same full
`payment_verified_event_sha256` computed from that exact row. A hold,
incorrect digest, wrong buyer, foreign token, bad log index, missing
original token/launch or unqualified source must fail before any real
write can be justified.

Because the existing replay classifier verifies the event against
durable request snapshots but does **not** compare a separate
caller-supplied `request` argument, the reference guard additionally
checks the caller snapshot's buyer/destination, token/receiver,
source/transaction, quoted VOID and USDC, and exact nine-field original
launch authority against the latest request snapshot it was given.
The positive fixture uses canonical
`buyvoid_a_aaaaaaaa` (8-hex suffix), with six VOID quoted for three
USDC under the fixed native Base-USDC policy.

The proof has one valid hypothetical positive and ten negative
buyer, destination, token, index, caller-snapshot, launch and
original-record variants. It calls **no** payment writer, reservation
writer, RPC, signer, wallet, service or host ledger. It creates no
real customer/payment file or sidecar. The Node 22/24/26 GitHub workflow
rebuilds only in an ephemeral workspace, checks exact source Git blobs,
and requires three pure evidence reports to be byte-identical.

## Not a production gate

This script is a *reference proving a possible fail-closed admission
check before payment fsync*, **not** an integrated patch. In particular
it does not qualify concurrency, the real global capacity/request
locks, protected high-water custody, current launch lease, sidecar
crash recovery, or actual exactly-once ledger behavior. The source
handoff must later incorporate the reviewed check inside the existing
serialization domain **before** the irreversible append and rerun the
neighboring real temporary-ledger proof. The original replay validator
must remain strict, never weakened to force approval.

```text
actual_handoff_modified=false
actual_append_invoked=false
production_preappend_guard_integrated=false
production_gate_ready=false
public_presale_activation=false
funds_moved=false
```

No Ready/merge, runtime deployment, original user/customer ledger,
wallet/key/signer, transaction, Chain-2050/Work Credit, market,
inventory, treasury/liquidity or funds movement is authorized.

**PROTECT THE CORE.**
