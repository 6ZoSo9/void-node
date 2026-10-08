# Buy VOID preappend canonical event bytes — independent positive proof

## Why this is a separate Draft

This **test-only** successor is stacked on
[Draft #2663](https://github.com/6ZoSo9/void-node/pull/2663) exact head
`06b617e94289c6ef329df68a5b12caa6556e7c84`. The owner has already
addressed the original buyer CHECK→durable append P1 reported by the
[real-filesystem negative witness #2665](https://github.com/6ZoSo9/void-node/pull/2665).
I deliberately make **no production source change** here.

The owner’s revised verified-payment writer source Git blob
`abbd4cf733d6ba1e9fb6b5fd902f6c59303f0aab` now calls
`canonicalVerifiedPaymentEventV1(rawEvent)` exactly at API entry. This
serializes caller input ONCE, parses a detached JSON value, deep-freezes it,
asserts the first serialized line equals that frozen JSON value, and passes
the exact captured `eventLine: Buffer` to the retained-FD durable append.
The same frozen event and byte buffer travel through preappend validation,
allocation, sidecar and idempotent recovery. The owner additionally uses
the same captured canonical event bytes for the legacy verified-payment
writer path at this new source head; that older route requires separate
original-buyer security and runtime qualification before deployment.

The prior P1 exploit used a nonenumerable `toJSON()` returning the valid
original sender the first time but a different sender on the second
serialization, poisoning an append-only payment ledger after fsync while
strict replay subsequently failed. This positive regression uses that
**exact adversarial event behavior** against the current source writer, not
the owner’s existing less adversarial `toJSON` fixture which always returns
a correct payment.

## Falsification required before durable acceptance

`scripts/prove_buy_void_preappend_canonical_event_bytes_v1.ts` is derived
from #2665’s previously successful OS-temp-file original buyer/receipt/USDC
fixture and invokes the real unmounted source handoff. It requires:

- Plain unchanged event: correct durable payment event and allocation.
- **Changing `toJSON`**: caller serializer invoked exactly ONCE; only the
  first, correct buyer row reaches fsync; allocation replay and sidecar bind
  the same original buyer.
- **Changing nested getter**: same one-read guarantee from canonical
  serialization; the durable bytes still match the original buyer.
- **First serialization already wrong**: strict preappend original-buyer
  gate HOLDS before fsync, writes zero operator/allocation/sidecar rows, and
  clean original-buyer retry succeeds on the SAME disposable store.
- **Mutable original event during async launch callback**: after the writer
  snapshots its canonical event, caller alters the original payment sender;
  the validated and fsynced sender remains correct and allocation unchanged.

This test checks actual JSONL and allocation bytes, applies the strict replay
classifier on the resulting rows, and asserts published sidecar bytes still
name the original buyer. It creates only disposable 0700/0600 OS temporary
directories and private fixtures; no real original customer ledger, payment
provider, wallet, signer or service is touched.

The new exact-head workflow first validates the reviewed owner writer/replay
source Git blobs, then runs a dedicated TypeScript typecheck, build, and the
same real-temp proof separately on Node **22, 24, 26**. The second job requires
the THREE original machine-produced receipts to match byte-for-byte. A
pass shows the previously reproduced P1 scenario is no longer possible at
this tested source boundary; it is not universal JS-object safety or
production launch approval.

## Remaining independent gates

The owner #2663 and overlapping #2662 preappend source branches still need
one canonical reviewed merge/rebase strategy. Historical allocation custody
V1 writer identities MUST remain immutable; the additive V2 proof #2666 is
separate. The runtime V6/op-auth bridge, package/enforcement identities,
true source-USDC provider finality, original buyer chronology/custody,
protected high-water anti-rollback, exactly-once crash replay and coupled
WC/VOID launch also remain distinct production HOLDs.

This Draft never edits `src/economic`, historical manifests, network state,
installed host services, real ledgers, keys/wallets/signers, transactions,
Chain-2050, treasury, inventory, liquidity or funds. No Ready/merge/deployment
or presale activation is authorized.

**PROTECT THE CORE.**
