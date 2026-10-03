# WC/VOID opening production-WC capacity census v1

Marker: `VOID_WC_VOID_OPENING_PRODUCTION_WC_CAPACITY_CENSUS_V1`

Status: read-only operator observation for #2370 / #2364.

## Purpose

The real WC/VOID launch-policy bundle needs a minimum real production-earned WC
depth and concentration limits. Those values must not be copied from source
fixtures.

This census measures the current **capacity evidence** visible on one operator
host without mutating the WC ledger and without reading credential registries,
raw tokens, wallets, signers, or private keys.

It is deliberately not the final opening cohort.

## Inputs

The operator supplies:

- exact VOID data directory with canonical
  `wc_v1/ledger.jsonl` and, when present, `wc_v1/redeemed.jsonl`;
- one or more absolute non-secret receipt-search roots.

The receipt scan opens only files whose basename is exactly:

`adapter-execution-receipt-v1.json`

It skips symlinks and paths classified as credential/token/wallet/key stores.

## Production-earned evidence

Every candidate receipt is validated through the canonical:

`validateAgentPaidWorkWcEarningAdapterReceiptV1(...)`

A receipt counts only when its participant account equals its bound destination
WC account and its exact account/job/receipt tuple maps to exactly one canonical
WC ledger credit with:

- `kind=credit`;
- `delta=3`;
- `reason=verified_receipt_acceptance_v1`;
- `receipt_kind=datanet_fetch_verify`;
- `reward_meta.source=wc_verified_receipt_acceptance_v1`;
- server-controlled award and persisted receipt/job/completion verification.

Copied identical adapter receipts are deduplicated by their content-addressed
adapter receipt ID. Distinct adapter receipts may not reuse either canonical
duplicate-guard identity (`receipt_id` or `job_id`). While scanning the WC
ledger, any credit row that reuses a matched receipt ID or job ID without
being the exact canonical account/job/receipt credit is conflicting evidence
and fails closed. Exact duplicate matching credits also fail closed.

## Current redeemable bounds

WC is fungible. The canonical ledger does not preserve a source-specific FIFO or
LIFO rule for later debits/redemptions.

The census therefore does not pretend to know exactly which earning source a
later outflow consumed.

For every matched production-earned account it reuses the canonical:

`readCanonicalWcState(...)`

and derives:

```text
lower bound
  = max(0, matched production-earned gross
            - all account debits
            - all account redemptions)

upper bound
  = min(matched production-earned gross,
        current all-source redeemable WC)
```

The lower bound is intentionally conservative: every observed outflow is charged
against matched production-earned WC first.

The output also reports the whole-WC floor of that lower bound because the
opening minimum-depth policy requires a positive whole-WC value.

## Concentration evidence

No account names are emitted.

The census reports:

- number of matched production-earned accounts;
- largest-account gross share in basis points;
- largest-account lower-bound share;
- maximum possible account share under source-attribution uncertainty, using
  each candidate account's upper bound against the other accounts' lower bounds.

These statistics describe current available earned-WC capacity only.

They do not prove what any participant will actually commit during the opening
window and do not close related-identity/Sybil truth.

## Discovery limits

The output always records:

`receipt_search_scope_authoritative=false`

The scan proves only what was found beneath the explicitly supplied roots.

Unreadable directories and receipt-search paths truncated by the bounded
recursive-depth limit force the `OBSERVED_WITH_DISCOVERY_GAPS` status. Unknown
malformed canonical WC ledger lines do the same. The census also consumes the
canonical WC projector's malformed-redemption count for matched accounts; any
malformed `wc_v1/redeemed.jsonl` row likewise prevents CLEAN status because it
can hide an outflow relevant to the production-earned lower/upper bounds.

One historical exception is already part of canonical production-WC visibility
compatibility on `main`. The census recognizes only that exact raw-line SHA-256,
repairs only byte position `178` to `:`, requires the exact canonical repaired
SHA-256, and parses the repaired bytes in memory. It reports the count as
`historical_known_compatibility_repairs_applied` and never writes repaired bytes
back to the ledger. Any other malformed row remains a discovery gap.

It also leaves:

- current credential/binding revalidation = false;
- opening participant eligibility proven = false;
- opening commitment amounts observed = false;
- related-identity truth proven = false;
- policy selection authorized = false.

A missing private receipt therefore reduces observed capacity; it is never
silently treated as proof that the associated production-earned WC does not
exist.

## Privacy

The JSON output does not emit:

- account names;
- credential IDs;
- binding IDs;
- receipt/job IDs;
- source file paths;
- raw receipt evidence.

Only aggregate counts, WC quantities, basis-point statistics, and safety flags
are returned. Malformed ledger/redemption evidence is exposed only as aggregate
counts; no affected account or raw line is emitted.

## Operator use

Example:

```bash
./node_modules/.bin/tsx   scripts/void_wc_void_opening_production_wc_capacity_census_v1.ts   --data-dir "$HOME/dev/void-node/data_a"   --receipt-root "$HOME/Downloads"   --receipt-root "$HOME/.local/share/void"   --receipt-root "$HOME/.local/state/void"
```

Only include receipt roots you intend the read-only census to inspect.

## Authority

Read-only filesystem observation only.

No network/RPC call, credential registry read, raw-token read, wallet/signer/
private-key access, WC ledger write, service/runtime mutation, transaction
construction/signing/submission/broadcast, Chain-2050 write, market/presale
activation, token movement, liquidity/treasury action, or funds movement is
performed or authorized.

Verification:

```bash
./node_modules/.bin/tsx   scripts/prove_void_wc_void_opening_production_wc_capacity_census_v1.ts
```
