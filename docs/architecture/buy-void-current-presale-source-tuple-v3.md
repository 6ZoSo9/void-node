# Current Buy VOID presale source proof V3 — transparent review successor

This Draft is stacked on the cumulative [#2761](https://github.com/6ZoSo9/void-node/pull/2761)
at checked source head `b672df7bd21971cc2e8c60261d853db67bcd3205`.
This is **review evidence only**, not a production presale activation.

## Why a transparent successor is required

The branch's one-shot author workflow
`.github/workflows/void-pr2761-current-presale-successor-author-v1.yml`
embedded 20,149 decoded bytes of gzip/base64 shell and requested GitHub
`contents:write`. The exact [push run #38075176705](https://github.com/6ZoSo9/void-node/actions/runs/38075176705)
failed before generating anything: `author.sh: line 3: EXPECTED_BRANCH:
unbound variable`. The required `EXPECTED_BRANCH`, `EXPECTED_PARENT`,
and `STAGER` values were not supplied. Its design also would push a new
commit from CI without separately completed PR-head workflows. The narrow
replacement in this Draft deletes only that failed opaque auto-author
workflow and adds fully readable Git-tracked source successors and a
**read-only** review workflow. It never performs a CI push.

## Three historical proof successors

All predecessor proof source blobs remain unmodified and are checked at
runtime. The new source exact tuple is:

- Preappend `src/economic/buy_void_preappend_plain_input_v1.ts`
  Git blob `945cd55d92d4a76fe0d8bfaa237ca27d4753dc2f`.
- Operator allocation dispatcher
  `src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts`
  Git blob `eb4fb37c6073415228b312663c45a99d5015c727`.
- Dispatcher proof V3 (new): Git blob
  `5c5e105b87d4ba4cbc39c0e027c11ac20352a437`;
  historical V1 and V2 remain byte-for-byte frozen and must HOLD when
  applied to the successor.
- First-original handoff proof V4 (new): Git blob
  `d33adb6d84fc96a9f65acbf319391c5d771f3a2d`;
  historical V2/V3 remain frozen and mismatched-source HOLD applies.
- Crash matrix proof V5 (new): Git blob
  `5dc2d12e34e648d2dbfb8f1e79584caa2f8abc51`;
  historical V1/V2/V3/V4 remain frozen. It pins combined source last-change
  commit `e33959c711902cc30d61ac2b0e74caa4673a87e9` and preserves
  all production/money authority flags false.

## Hosted independent qualification

One new exact-head Node **22/24/26** workflow checks tracked Git hashes,
installs dependencies with npm scripts disabled, typechecks and builds the
actual source tree, requires three predecessor proofs to reject the changed
source at their documented error markers, runs both preappend and dispatch
inherited-array security regressions, then exercises each new successor
against inert synthetic buyer/payment/allocation inputs. A downstream
three-node job compares all receipt bytes, not only pass/fail messages.

`permissions: contents: read` and `persist-credentials: false` prohibit
automatic GitHub branch pushes in this workflow. The old hidden auto-author
file is absent in the candidate tree, checked explicitly in CI.

## What remains unproven

This is **not** requalification of the frozen source/compiled/Nimo witness
identities, original durable request origin, externally finalized native
USDC payment, installed Nimo V2 authenticated transport, protected custody
high-water, real capacity-serialized fsync of
`payment_verified → allocation_reserved` or crash recovery. The currently
mounted operator action is payment-only; custody reserve and recover still
return explicit HOLD. An inert current-generation source tuple is necessary
but insufficient for taking payment or releasing any VOID.

Leave Draft/unmerged. No deployed host/service, customer/private ledger,
wallet/signer/keys, transaction, Chain2050/WC, treasury/inventory/liquidity,
coupled WC/VOID opening or funds movement. **PROTECT THE CORE.**
