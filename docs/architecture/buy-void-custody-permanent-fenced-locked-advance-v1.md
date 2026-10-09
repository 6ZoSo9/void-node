# Buy VOID high-water permanent fence + private exclusive lock — source-only

## Source lineage and status

This Draft successor is stacked on the fully-green **[#2714](https://github.com/6ZoSo9/void-node/pull/2714)**
locked actual high-water writer (`0a55c33f142a2fc06d3f25b29c9a9e80e4bb861d`)
and incorporates, by exact verified Git blob identity, the **create-only permanent
transition planner** `97ef9de26f5b51ce935dc4f94a454b05af3c153b`
and **detached-input permanent fence storage**
`009acf8220987408dfa17459b5ed59a0fb6b0494` from
[#2717](https://github.com/6ZoSo9/void-node/pull/2717)
(`e5793b0aff0b74e921c032da08f7382a887fd3d3`, 84/84 CI green).
It does not merge unrelated integration history into #2714 or modify a
live custody service or any existing customer record.

## Exact state transition order

An operator-preprovisioned private subdirectory at
`<custody_root>/.void-buy-void-custody-permanent-fences-v1`
is owned by the same unprivileged custody principal, mode 0700.
Nothing in this source creates or reaps the directory or a permanent slot.

The new `createBuyVoidCustodyPermanentlyFencedLockedAdvanceV1()`
composition requires exactly the three previously reviewed startup path
fields. It binds the actual synchronous high-water writer inside the
same private-directory exclusive lock as #2714. When a source-verified
generation is ahead of the current high-water:

1. The writer descriptor-pins the journal, signed-activation receipt and
   owner-private custody root, and classifies the exact candidate.
2. It creates only its own random `O_EXCL` temporary high-water file,
   writes and fsyncs the proposed bytes and closes that descriptor.
3. **Before final rename**, it derives the canonical permanent same-prior
   slot from the observed prior and authority-derived next bytes. The
   exact planner checks ordering, source composition, SHA-256 and shape.
4. It requires an already-provisioned private fence directory, uses
   `O_CREAT|O_EXCL|O_NOFOLLOW`, fsyncs the complete detached fence
   record, fsyncs its directory, and verifies exact pinned readback.
   An exact preexisting durable same-prior/next record is idempotent;
   a competing successor, partial record, symlink or failed fsync HOLDS.
   It **never unlinks or overwrites a fence record**.
5. The original writer then reobserves the journal/receipt/high-water,
   verifies unchanged authority/expected prior, and only then renames
   its owned temporary high-water to the fixed name; it fsyncs the
   custody directory and reopens/compares the published bytes.
6. A clean writer success releases and fsyncs the private exclusive
   lock. An unsuccessful write retains the lock for separately reviewed
   operator recovery. A post-rmdir fsync fault is an **uncertain release**,
   not proof of lock retention or safe automatic takeover.

`inspect()` does no lock, fence, temp creation or cleanup. Bootstrap
writes remain disabled. There is no automatic stale-lock reclamation.

## Synthetic recovery and competition evidence

The exact-source, **unmounted** test-only constructor injects an inert
classifier, not a real signed launch receipt. Tests use only 0700/0600
disposable OS-temporary fixtures and require:

- durable permanent fence readback while the old high-water is still
  present **before** the actual rename, successful monotonic publish
  and read-only idempotent replay without changing the fence inode;
- simulated interruption after permanent fence fsync but before rename:
  old high-water and exact permanent intent retained, conservative
  private lock HOLD; fixture-only explicitly reviewed lock reconciliation
  then resumes the **same** planned successor;
- a preexisting alternative same-prior permanent fence preventing an
  actual writer from publishing competing next bytes, preserving the
  original fence inode and bytes without deleting either record;
- preprovisioning required; missing fence directory never produces an
  unguarded high-water update;
- three independent **two-OS-process** actual-writer competitions from
  the same prior with two distinct successors, requiring exactly one
  real high-water publish, one failed contender, and a single immutable
  canonical permanent record matching the winner. Node 22/24/26 runs
  and cross-node receipts must match byte-for-byte.

The fixture removes a stale lock **only** in disposable OS temp after
explicit negative checks; this is NOT a recovery service, trusted
operator procedure, or permission for a production lock reaper.

## Critical remaining HOLDs

This source does not install a custody UID, preprovision the private
fence root, verify all parent path trust/permission boundaries in a live
service, expose cross-UID authenticated IPC, qualify process crash and
post-rmdir uncertain release handling on the installed hosts, or
activate either `reserve` or `recover`. It does not prove a
real activated EIP-712 launch receipt, payment-origin-to-allocation
linkage, 10m VOID inventory reserve, bounded canary, WC/VOID opening,
payment fulfillment, market launch or any funds action. The standalone
unlocked writer factory from predecessor #2714 still exists in the
historical source; **until every installed caller is constrained to
this reviewed fenced+locked composition**, do not claim a globally
enforced single-writer boundary.

`runtime_custody_service_mounted=false`
`production_allocation_mutation_ready=false`
`presale_activation=false`
`funds_moved=false`

No production deploy/merge/Ready, wallet/signer/keys, customer ledger,
chain transaction, inventory/treasury, WC ledger or funds mutation.

**PROTECT THE CORE.**
