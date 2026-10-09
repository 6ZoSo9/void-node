# Buy VOID custody locked high-water advance V1 — source only

This successor composes the high-water writer from #2712 with the owned-temp cleanup repair from #2713
with the separate private-directory cross-process exclusion from #2690.
The #2713 writer source and the three existing source-proof pins are carried
byte-identically from that reviewed successor. The #2690 lock implementation
and its original synthetic proof are carried byte-identically from #2690.
The new workflow reruns the #2713 owned-temp collision proof alongside the
existing original writer, inspector, descriptor-close and lock proofs.

The candidate `createBuyVoidCustodyLockedAdvanceV1(trustedStartupConfig)`
requires exactly three ordinary own data-string startup fields:
`generation_journal_path`, `activation_receipt_path`, and `custody_root`.
The existing high-water writer still decides whether a monotonic advance is
permitted. Only its synchronous `advance()` is wrapped in the Linux
0700 private root lock. `inspect()` stays read-only without lock mutation.

The lock is acquired and parent-fsynced before the writer observes or mutates
high-water. A concurrent invocation fails before executing its writer. A clean
writer result may release the lock only for exact `current` without mutation
or exact `advanced` with a reported mutation. Any HOLD, thrown callback,
or ambiguous result retains the lock for separately qualified reconciliation.
If release itself fails after the lock directory was removed, exclusion cannot
be assumed. The adapter reports a conservative HOLD with known mutation truth,
or null when the mutation outcome is unknown.

The positive proof only injects an inert synthetic writer under OS-temporary
directories. The existing writer, read-only inspection, FD-close and exclusive
lock proofs also run in the new Node 22/24/26 workflow. The proof does not
claim cross-filesystem atomicity, a deployed custody service, recovery for
stale/uncertain locks, or completed payment-allocation production wiring.

An additional integration proof runs the **actual high-water writer** and
the actual exclusive lock under private OS-temporary journal, receipt and
high-water fixtures, with the writer's existing test-only classifier hook.
It requires monotonic advance, pre-classification contention rejection,
idempotent replay and a precommit failure that retains the lock and old
high-water for explicit recovery. This does not use real custody state.

Strict HOLD remains for real reserve/recover and sales. Runtime and cross-UID
authenticated IPC, privileged server-only startup path custody, true durable
crash recovery and launch receipt eligibility still need independent review.
This patch does not touch live services, customer files, signer/keys, inventory,
Chain-2050, Work Credit, treasury, or money.

PROTECT THE CORE.
