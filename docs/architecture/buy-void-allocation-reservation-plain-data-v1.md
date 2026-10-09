# Buy VOID allocation reservation plain-data boundary V1

## Why this exists

The canonical `allocation_reserved` JSONL planner
(`src/economic/buy_void_allocation_reservation_ledger_v1.ts`) is already
implemented and tested. The payment→allocation fsync/recovery handoff exists,
but the real operator route still uses a payment-only writer; the protected
custody-service dispatcher is **unmounted**. This patch does not grant it
privileged custody access or activate customer payment intake.

On current main `77f798e42efc73f83052311db94b0a7f33994cf8`,
the pure planner accepted caller-owned objects as authority-like scalar inputs
through `String(value ?? "")` and `Number(value)`. Such inputs can execute a
custom `toString`, `valueOf` or `Symbol.toPrimitive` callback before the
source policy considers their contents. A top-level input or nested launch
authority with own getters/Proxy traps can execute during field reads. A
caller-supplied Buffer used as ledger JSONL can be mutated between separate
reads. Also, both the planned and reparsed reservation `record` objects were
ordinary objects passed to `JSON.stringify`; an ambient
`Object.prototype.toJSON` callback could alter published bytes or run code
after the deterministic record hash was calculated.

## Source-only repair

One first-line snapshot gate now admits only non-Proxy ordinary or
null-prototype records with exactly the original 20 known plan-input fields,
all as **own enumerable data properties**. The nested launch authority has
exactly its previously reviewed nine immutable lineage fields, again without
accessors or Proxy traps. No caller-provided field is coerced, enumerated
through a Proxy, or invoked. Scalars are captured once and must be primitives.
Ledger bytes are restricted to a primitive string or native Node Buffer,
bounded before allocation to the existing 64 MiB maximum, with Buffers copied
into a private detached snapshot. The planner reads that one snapshot
throughout classification, idempotent replay and next-record construction.

The pure standalone `classifyBuyVoidAllocationReservationLedgerV1` now
rejects arbitrary object and Proxy ledger arguments rather than calling
their `toString`; it also takes a private copy of supplied Buffer bytes.
The two internally built reservation `record` objects shadow inherited
`Object.prototype.toJSON` with a nonenumerable own data property set to
`undefined` before being frozen. Their enumerable field list/order,
canonical `allocation_record_hash`, ledger JSONL, replay identity and
canonical pool economics are unchanged. A source identity successor is
required in any downstream compiled/custody/installer attestation; the old
source Git blob must not be silently repinned in a historical manifest.

## Independent regression

An exact-head Node 22/24/26 hosted workflow runs the **entire original**
allocation-reservation ledger proof unchanged and a new inert source-bound
proof that requires:

- same accepted first `allocation_reserved` record fields, hash-chain
  validation, exact JSONL bytes, Buffer idempotent replay, and plain
  null-prototype input compatibility;
- top-level Proxy/getter and nested launch-authority Proxy/getter inputs
  HOLD with zero caller trap/getter invocations;
- object-valued numeric, amount, request, chain, hash, launch and ledger
  fields HOLD before `toString`, `valueOf`, or `Symbol.toPrimitive`;
- extra/unreviewed plan keys HOLD rather than reaching later arithmetic;
- ambient `Object.prototype.toJSON` cannot invoke its handler or change
  either new or reparsed reservation JSONL.

The downstream job requires byte-identical proof receipts across Node
22/24/26. Tests use fixed synthetic data only, no customer records or
disk allocation/custody write. There is no signing, wallet, live RPC,
transaction, token inventory or market/presale state mutation.

## Remaining actual production work

This fixes a **primitive source boundary**, not the ability to receive
payments. The unmounted verified→allocation dispatcher still needs a
separately authenticated private custody IPC/service principal, installed
high-water/storage fencing and externally witnessed rollback protection,
cross-process exactly-once recovery, live original customer request
identity and payment source finality. The coupled WC/VOID market and
participant claim/inventory requirements remain independent launch HOLDs.
Do not merge merely because this focused proof is green.

**PROTECT THE CORE.**
