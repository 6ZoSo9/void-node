# Buy VOID two plain-array snapshot repairs — composed source review

## Purpose and exact lineage

This **test-only, source-only Draft** is stacked on exact current
[#2761](https://github.com/6ZoSo9/void-node/pull/2761) head
`e33959c711902cc30d61ac2b0e74caa4673a87e9`. That cumulative
presale integration has **already incorporated both separately reviewed
inherited-array-setter source repairs**, without merging into main.
This Draft leaves both fixed production source files unchanged and adds
only a new same-process regression script, its workflow and this note.

- [Draft #2762](https://github.com/6ZoSo9/void-node/pull/2762)
  repairs `src/economic/buy_void_preappend_plain_input_v1.ts`, exact
  source Git blob `945cd55d92d4a76fe0d8bfaa237ca27d4753dc2f`.
  It uses own nonwritable/nonconfigurable property definitions for every
  nested array index, preserving source JSON and avoiding ambient setters.
- [Draft #2764](https://github.com/6ZoSo9/void-node/pull/2764)
  repairs `src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts`,
  exact Git blob `eb4fb37c6073415228b312663c45a99d5015c727`.
  It avoids `Array.prototype.push` and inherited numeric setters by
  explicit own-index definition. This is a distinct later snapshot boundary.

Both original focused Node 22/24/26 workflows succeeded in their respective
PR heads. The cumulative owner now retains **both** regression scripts,
both workflows, both notes and their unchanged source blob identities.
Those prior-head results cannot establish the new combined head's behavior,
so this Draft adds a same-process composition proof and fresh CI
without duplicating the source changes.

## New same-process proof

`scripts/prove_buy_void_dual_plain_snapshot_composition_v1.mjs` imports the
two **actual freshly compiled** modules and creates inert synthetic request
and event arrays with nested operator-status and payment-verifier fields.
The request/event are first detached and frozen through the true preappend
plain-input helper. Those **exact already detached snapshots** are then
supplied to `planBuyVoidOperatorAllocationDispatchV1` for both
`payment_verified` and `reviewed` branch decisions.

The test asserts every array index is an **own data** descriptor, the nested
snapshots remain frozen, raw request/event JSON is unchanged from the clean
baseline, and each branch kind is unchanged. It arms hostile
`Array.prototype["0"]` and `["1"]` setter controls, then a replaced
`Array.prototype.push`, and requires **zero callbacks** from either
reviewed source boundary. All prototype descriptors are restored in
`finally`. The authority callbacks deliberately throw if a plan tries to
invoke one; no real writer, customer file, RPC, wallet, signer or ledger is
accessible through this inert test.

The focused workflow verifies exact source blobs on checked-out PR SHA,
installs locked dependencies, runs full typecheck/build, reuses both original
independent adversarial compiled proofs and runs the new **composed**
negative test on Node **22, 24, and 26**. A downstream job requires the
full raw security transcripts to be byte-identical across all three.

## Explicit launch HOLD

The composition qualifies only in-process source/compiled-array detachment
when its current exact-head focused workflow finishes GREEN. It does **not**
install or enable the operator verified→allocation dispatcher, prove actual
authenticated buyer/payment source-chain receipts, deploy a custody writer,
admit a frozen Nimo V1/V2 witness, protect anti-rollback high-water, or
provide exactly-once reserve/recover. Those remain separate gates. Older
frozen source-generation workflows may correctly fail after adding new
candidate bytes. Do not silently repin immutable historical identities.

This PR does **not** reopen either closed original sibling, mark Ready,
merge or deploy the owner branch.
`operator_route_mounted=false`, `payment_append_performed=false`,
`allocation_append_performed=false`, `presale_activation=false`,
`funds_movement=false`.

**PROTECT THE CORE.**
