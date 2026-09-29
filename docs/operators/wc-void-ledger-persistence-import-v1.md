# WC/VOID ledger persistence import v1

Marker: `VOID_WC_VOID_LEDGER_PERSISTENCE_IMPORT_V1`

Status: source-only import/review seam for a future real receipt produced by the
canonical read-only WC/VOID ledger persistence verifier.

This lane does not read the production ledger itself and does not update the
production candidate.

## Purpose

`inspectWcVoidOpeningLedgerPersistenceV1` can prove that the exact opening
settlement set exists in the canonical WC ledger append window under stable
private custody. A future real receipt must not become production-candidate truth
merely because it says:

`ledger_persistence_verified=true`

or:

`quote_reserve_custody_verified=true`.

This importer binds that receipt to a separately reviewed expected launch and
settlement set.

## Expected review binding

The expected descriptor is content-addressed as:

`voidwclprb1_<sha256>`

and binds:

- exact coupled launch ID;
- exact settlement adapter;
- exact trusted ledger prestate byte offset;
- exact opening settlement-set root;
- exact total settled WC units; and
- exact expected opening settlement count.

The importer requires the canonical settlement adapter
`void-wc-ledger-opening-settlement-v1`.

## Receipt validation

The importer requires the exact
`VOID_WC_VOID_LEDGER_PERSISTENCE_V1` receipt shape and rechecks:

- marker/version/status;
- expected launch, adapter, prestate offset, settlement root, settled WC total,
  and settlement count;
- positive bounded file/window/count observations;
- append-window SHA-256 shape;
- exact expected settlement set present;
- no extra opening settlement inside the inspected window;
- direct canonical ledger file and exact realpath;
- owner/private custody;
- stable file identity through read;
- stable parent-directory identity through read;
- ledger persistence true;
- quote-reserve custody true;
- all write/funding/activation/funds authority false; and
- the exact canonical ledger verifier authority object.

The complete receipt is then independently content-addressed as
`source_receipt_sha256`.

A valid import is content-addressed as:

`voidwclpri1_<sha256>`.

## Candidate fields

A valid future import may derive:

```text
wc_ledger_persistence_verified=true
quote_reserve_custody_verified=true
production_candidate_binding_allowed=true
production_candidate_updated=false
```

This PR deliberately does not write those values into the production candidate.
A later lane must bind a real imported receipt from the intended launch.

## Authority boundary

Pure explicit-input validation only. The importer performs no filesystem read,
filesystem write, RPC, credential/private-key access, wallet/signing,
transaction construction/submission/broadcast, Chain-2050 write, WC mutation,
inventory funding, liquidity movement, market/presale activation, or funds
movement.

Verification:

```bash
node scripts/prove_void_wc_void_ledger_persistence_import_v1.mjs
```
