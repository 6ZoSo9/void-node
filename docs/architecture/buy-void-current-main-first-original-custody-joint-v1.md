# Buy VOID first-original buyer and merged payment-provenance custody joint qualification

**Purpose:** test already-authored, independently scoped first-original and
allocation-ledger integrity repairs together with the *actually merged*
payment-provenance custody service, rather than claiming the old branches
qualify the new main source generation.

## Two reviewed source ancestors

- `main` at `16a9002a3b1ffe0f8faa2c9170ca6c087565c59a` includes merged
  [#2778](https://github.com/6ZoSo9/void-node/pull/2778), making custody
  independently read durable request and `payment_verified` history. The
  service Git blob is `b89d6c3ef210473f486f9fc9d1cab9303e6336c9`.
- The active owner [#2777](https://github.com/6ZoSo9/void-node/pull/2777)
  source stack `df7ad33671b8c47a350c1d3ebfc87c59d69d580a`
  retains `#2774` (first-original bytes), `#2776` (null-prototype JSON
  decoded rows) and `#2777` (detached allocation JSONL framing).
  Exact final replay source Git blob is
  `d873533dbe60f2efff2fefc19470ee963b4fead0`;
  allocation ledger source Git blob is
  `57a14a782549eb6c64d0a8f977f10e33d9e6bcda`.

The old main → #2777 stack changes **14 paths** (two modified economic
sources and twelve additive focused proof/workflow/docs). The newly merged
#2778 changes **eight different paths**. This review adds only one new
workflow and this architecture note; the two original owner branch heads
and historical source/manifest records remain unchanged.

A non-force two-parent source-only Git commit preserves both ancestor
chains with a tree based on current main plus those *exact copied, reviewed*
14 file blobs. The PR targets current main. This is neither merging owner
branches nor enabling runtime deployment.

## Joint negative qualification

New exact-head workflow `buy-void-current-main-first-original-custody-joint-v1`
rebuilds on Node 22/24/26, reruns all **four** owner proofs against the
actual freshly compiled source, then runs the merged custody service's
real existing Unix-socket/provenance/contract synthetic test against the
same compiled replay version.

It binds the three exact Git blobs in the checked-out tree and requires both
merge parents in ancestry. The suite requires missing first-original buyer
wallet, ambiguous inherited fields, poisoned Array/String/Buffer prototype
manipulation and noncanonical allocation JSONL to HOLD. The custody suite
requires durable `payment_verified` provenance to be descriptor-bound and
that the service stops at
`allocation_custody_service_payment_capacity_lock_not_bound` without a
reserve, recover, wallet, signer, payment or funds action. Exact proofs run
against one source tree: no historical manifest rebinding to manufacture green.

A three-node cross-node job compares deterministic non-authority receipts
byte-for-byte. The eight merged service files remain identical to merged
#2778; no production route, ledgers or installed host are modified.

## October 11 bound-decoder source successor

The two source blobs above identify the original reviewed first-original
generation, preserved in Git history. PR #2790's **new current-generation
candidate** binds fatal UTF-8 decoder calls during module initialization,
so a later replacement of `TextDecoder.prototype.decode` or global
`Reflect.apply` cannot replace decoded allocation/replay row bytes.
The successor reviewed Git blobs are:

- allocation reservation ledger: `1542e833242a20bea8359396e2e157882e53cabc`;
- verified allocation replay: `b5dbbbd932688f8b0ad04477433cd11ede413bb7`;
- adversarial actual-classifier test: `b2487739db2b428c1e5a68cbf4453acb5d0ff354`.

The existing joint workflow now requires the actual-classifier adversary on
Node 22/24/26, including positive controls that poisoned global hooks are
armed, rejection of malformed input without callback invocation, and
byte-identical non-authority receipts. Historical pinned generations remain
unchanged. These are **source-only** proofs; no current installed Nimo runtime,
atomic payment allocation, custody release, buyer finality or presale approval
is claimed.

## Honest remaining launch gates

This forward integration does **not** create a real cross-UID verifiable lease
for the web UID's private bakery capacity lock. The custody UID cannot
independently authenticate or share that serialization domain yet.
`reserve_method_enabled=false`, `recover_method_enabled=false`,
`deployed_artifact_generation_verified=false`, `payment_acceptance=false`
and `presale_activation=false`.

Next actual implementation must create an independently testable **shared
cross-UID payment-capacity serialization/lease protocol** and bind exact
durable first-original and signed launch lineage to the protected
allocation writer while preserving the already durable
`payment_verified` event and crash/replay idempotency. Host/user/group
permissions, privileged recovery and deployed artifact identities remain
separate. This workflow's green would qualify only this source composition.

No Ready/merge, service change, credential/key/wallet/signer, real customer
read/write, chain transaction, inventory/treasury/liquidity, Work Credits,
presale/market activation, or funds movement.

**PROTECT THE CORE.**
