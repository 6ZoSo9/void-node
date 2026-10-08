# Buy VOID legacy operator status — exact payment identity

## Source-only P1 consistency fix

Existing merged `writeBuyVoidOperatorEventWithCapacityAdmissionV1` used an
exact comparison against `payment_verified` to choose the protected
capacity writer, while its later strict ledger recount used
`String(row.operator_status || "").trim()`. Consequently a row carrying
`"payment_verified "` could take the unprotected legacy nonpayment append
path and later be counted as a verified payment/capacity obligation.

This flaw is separately recognized in the
[Draft #2676 independent P2 review](https://github.com/6ZoSo9/void-node/pull/2676#pullrequestreview-5463881382).
#2676 closes the ambiguity in its **unmounted** dispatcher, but the exported
**existing legacy writer and history recount** remain callable directly. This
source-only companion fixes that lower-level boundary without moving any
mounted operator route, protected custody service or active integration PR.

## Exact code changes

Only `src/economic/buy_void_verified_payment_capacity_admission_v1.ts`
existing code is modified:

- The exported legacy operator writer serializes the caller event exactly once
  into a detached, deep-frozen snapshot before choosing payment versus
  nonpayment handling. The exact bytes selected by that snapshot are the bytes
  later appended, so stateful getters or a top-level `toJSON()` cannot change
  status between routing and persistence.
- The detached snapshot accepts only EXACT `payment_verified`, `reviewed`,
  `fulfilled`, or `rejected` strings. Case, whitespace, status objects and
  unknown values fail before request-directory creation, append or sidecar
  publication.
- The existing strict capacity recount requires operator-event status
  to be a nonempty, unpadded **string**; no row is silently converted
  from a whitespace alias into a verified-capacity obligation.
- Historical event identity and payment-sidecar recovery predicates
  compare `row.operator_status === "payment_verified"` exactly.
- Legacy exact `reviewed`, `fulfilled`, `rejected` remain nonpayment,
  while exact `payment_verified` continues to invoke its original capacity
  and duplicate-identity admission. No payment/allocation ordering changes.

The source patch is deliberately narrow: no manifest, wallet, signer,
operator auth, capacity quote calculation, or allocation writer changes.

## Inert regression proof

`scripts/prove_buy_void_legacy_operator_status_exact_identity_v1.ts`
pins the changed writer Git blob and calls the actual exported writer
with malformed statuses. It asserts no filesystem root is created before
the invalid input fails, including a synthetic status object whose `toString`
and `toJSON` disagree.

It also exercises two mutable-caller adversaries against the actual writer:
a stateful `operator_status` getter that returns `reviewed` first and
`payment_verified` later must be read only once and persist `reviewed`;
and a top-level event `toJSON()` that serializes `payment_verified` after
presenting a visible `reviewed` property must enter the protected payment path
and must never succeed through the legacy nonpayment append.

It separately exercises `testOnlyReadStrictCapacityCensusV1` against
private OS-temp `requests.jsonl` and `operator-events.jsonl`:
padded/wrapped rows and nonstring statuses must HOLD; exact
`reviewed`/`rejected` remain nonpayment; exact
`payment_verified` remains a single finite-capacity obligation.
No actual customer payment, installed host, custody ledger or RPC is read.

Hosted Node 22/24/26 builds and focused proofs must complete at the exact
Draft head and produce byte-identical reports. Old-source pinned CI failures
may correctly reveal generations requiring independent successor review;
**do not repin historical manifests** merely to get broad green.

## Release/authority HOLD

This does not mount the #2676 dispatcher or qualify the current original
buyer-payment-to-allocation path. The protected allocation custody IPC
service reserve/recover methods still require independently bound durable
payment provenance. Without that service authority, direct web-process
writes into protected custody roots remain forbidden. Later deployment
must independently prove external ingress isolation, operator identity,
source provider finality, live high-water and exactly-once allocation recovery.

Keep Draft/unmerged. No actual host/services, customer ledgers,
wallet/credential/signer, transaction, Chain-2050/WC, inventory, treasury,
liquidity, presale/market activation or funds movement occurs here.

**PROTECT THE CORE.**
