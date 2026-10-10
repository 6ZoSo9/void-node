# Buy VOID first-original raw-byte JSONL framing V1

## Scope

Stacked source-only successor to [Draft #2769](https://github.com/6ZoSo9/void-node/pull/2769)
at exact reviewed parent `e02fa5dde50b6108a5cf7dcb006c3a1604cfa037`.
The owner hardened `Array.prototype.map`, iteration and key-set
comparisons in the first-original replay classifier. The `rows()`
framing stage still used `text.slice(0,-1).split("\\n")`; in the same
threat model, those **mutable String.prototype methods** may silently omit
R0, the original buyer request row, before the safe own-Array slot checks.

This Draft modifies ONLY that reviewed replay classifier and adds its
direct compiled-module regression, one workflow and this note. No
HTTP route, native-USDC policy, custody writer, hosted service, key, wallet,
ledger, or historical verifier/manifest is modified.

## Exact remediation

`rows()` first detaches the caller's canonical bytes and validates the entire
stream using the existing fatal UTF-8 decoder. It then **requires the final
raw octet to be LF**, walks each raw octet using numeric typed-array indexes,
rejects CR anywhere and empty lines, caps original row count at `MAX_ROWS`,
and decodes each actual byte interval using a captured native
`Uint8Array.prototype.subarray`. Each JSON line must still parse and
re-serialize to the exact original bytes. The output uses
`Object.defineProperty` on own nonwritable array numeric slots: no
String.prototype `split`, `slice`, `includes` or `endsWith` is trusted
for record selection.

The old first-original wallet, launch-generation, chain/USDC alias,
duplicate-history, amount/closed keys, payment→allocation provenance,
source-only status and no-funds logic remain unchanged.

## Real compiled-module falsifications

`scripts/prove_buy_void_first_original_byte_framed_jsonl_v1.mjs` retains
the original #2769 synthetic first-buyer/Array-prototype suite and separately
replaces `String.prototype.split`, `slice`, `endsWith`, `includes`,
one at a time AFTER canonical fixture bytes exist. The negative fixtures
require unchanged behavior for:

- R0 missing the original buyer wallet, later R1 backfilling it while the
  verified-payment event matches R1. Must HOLD
  `request_initial_delivery_address_missing`.
- Exactly duplicated original buyer row. Must HOLD
  `request_history_duplicate_snapshot`.
- Missing canonical final LF and forbidden CR before LF. Must HOLD
  `requests_truncated_or_noncanonical`.
- Positive controls prove malicious split/slice methods really could drop R0
  if called, and return counter=1 when deliberately invoked.
- A positive complete original buyer still yields
  `verified_allocation_missing`, **not** allocation success.

All prototype method descriptors are restored in `finally`. The
Node 22/24/26 workflow typechecks/builds and runs the actual compiled
replay classifier, then requires byte-identical no-funds test receipts.
No real private ledger or file is touched.

## Authority boundary

This closes one source-level String-prototype history omission vector.
It does not establish a hostile-process trust model against arbitrary
`JSON.parse`/TextDecoder/Reflect monkeypatches, installed runtime identity,
first independently authenticated original buyer source, fsynced
`payment_verified`, same-capacity-lock allocation, protected custody
high-water, independent Nimo V2 witness, exactly-once reserve/recover or
coupled WC/VOID market opening. Old reviewed replay source and historical
proof hashes must remain immutable; historical source-identity checks may
legitimately HOLD on this successor. Separate source acceptance is required.

No Ready/merge/deployment, signing, payment intake, customer/wallet/ledger,
inventory, Chain-2050/WC, treasury/liquidity or funds mutation.

**PROTECT THE CORE.**
