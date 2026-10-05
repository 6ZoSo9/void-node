# Coupled native-gas effective-open census v1

## Purpose

`VOID_COUPLED_NATIVE_GAS_EFFECTIVE_OPEN_CENSUS_V1` is the pure accounting
bridge between immutable native-gas liability admission history and later
durable reconciliation storage.

It solves one specific problem: appending reconciliation evidence is not enough
to release capacity if the admission path still counts every historical
`status=open` liability forever. The current state must be derived from two
immutable histories:

```text
historical liabilities
  minus exactly one accepted reconciliation per liability
  = effective-open liabilities
```

This contract performs that derivation only. It reads no filesystem state,
authenticates no live receipt, mutates no liability store, and authorizes no
release.

## Inputs

The classifier accepts one explicit payer domain:

```ts
classifyCoupledNativeGasEffectiveOpenCensusV1({
  payer_address,
  liabilities,
  reconciliations,
})
```

All liability rows must be canonical
`VOID_COUPLED_NATIVE_GAS_LIABILITY_V1` records for that payer.

All reconciliation rows must be canonical confirmed-only
`VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_V1` results from the
current attempt-limit-one presale contract.

## Immutable history

Liability rows remain immutable admission history. Reconciliation rows remain
immutable terminal accounting history.

The census does not:

- delete an admitted liability;
- rewrite `status=open`;
- store a mutable `released=true` bit; or
- infer current reserve from file absence.

Instead it validates both histories and derives the effective-open set by
liability ID.

## Liability validation

Every historical liability is revalidated from first principles:

- exact schema/marker/version/key set;
- exact payer and canonical lowercase address;
- exact lane/evidence-kind pairing;
- exact nonce and content-addressed obligation/plan/evidence IDs;
- exact integer native value, gas limit, admitted max fee and attempt count;
- exact
  `maximum_reserved_wei =
  (transaction_native_value_wei + gas_limit * admitted_max_fee_per_gas_wei)
  * attempt_limit`;
- exact `liability_id` rederived from canonical liability bytes;
- unique liability ID within the payer census; and
- historical uniqueness of obligation ID, transaction-plan fingerprint, and
  nonce across the payer domain.

Those historical conflict checks remain active after reconciliation. Releasing
reserve capacity must not make a completed obligation/plan/nonce eligible to be
silently admitted as a second liability. This is replay/collision detection,
not nonce allocation; `nonce_scheduler_authority=false` remains explicit.

Both `presale` and canonical `wc_void` history can be counted. This does not
grant new WC/VOID admission authority.

## Reconciliation validation

Every reconciliation must:

- be the exact #2485 confirmed presale reconciliation shape;
- carry the exact #2485 authority object;
- bind an existing historical liability;
- match liability payer, obligation, nonce, transaction-plan fingerprint and
  maximum reserve;
- require `attempt_limit=1`;
- rederive the one-attempt maximum from the immutable liability;
- require confirmed consumption to be feasible under the immutable envelope:
  `actual_consumed = transaction_native_value + gas_limit * integer_effective_gas_price`
  with the derived effective gas price not above the admitted max fee;
- satisfy exact accounting:

```text
actual_consumed
  + unused_release_candidate
  = maximum_reserved

retained_future_attempt_reserve = 0
next_open_reserved              = 0
```

- rederive its exact `reconciliation_id`; and
- be the only reconciliation for that liability.

The census deliberately does not reconstruct `gasUsed` or effective gas price
from the reconciliation row. Those fields are authenticated upstream by the
terminal-cost evidence contract and are not carried in the canonical
reconciliation record. In particular, a valid transaction may consume less gas
than its admitted gas limit; dividing consumed gas cost by the admitted limit
would incorrectly reject ordinary confirmed transactions.

An orphan reconciliation, duplicate row, or alternate reconciliation for one
liability HOLDS.

A WC/VOID liability cannot be reconciled by this V1 because #2485 exposes only
confirmed presale reconciliation authority. WC/VOID therefore remains
effective-open.

## Derived accounting

The successful census returns deterministic sorted identities and exact
uint256-bounded sums:

- historical liability count and IDs;
- accepted reconciliation count and IDs;
- reconciled liability IDs;
- effective-open liability IDs;
- WC/VOID effective-open count;
- historical maximum reserve;
- reconciled maximum reserve;
- reconciled actual consumed reserve;
- reconciled unused release candidate; and
- effective-open reserve.

It independently requires:

```text
historical_maximum_reserved
  = reconciled_maximum_reserved
  + effective_open_reserved

reconciled_maximum_reserved
  = reconciled_actual_consumed
  + reconciled_unused_release_candidate
```

The canonical output body is content-addressed as `census_id`. Input ordering
does not change that identity.

## Provenance boundary

A stored reconciliation can be internally canonical while its terminal receipt
provenance is not freshly authenticated.

This contract therefore reports:

- `terminal_evidence_provenance_verified=false`;
- `reconciliation_namespace_custody_verified=false`;
- `liability_release_authorized=false`;
- `filesystem_read=false`;
- `filesystem_write=false`;
- `runtime_integration=false`; and
- `funds_movement=false`.

The later payer-serialized reconciliation writer must independently authenticate
the immutable prepared plan, durable terminal outcome, fresh receipt/current
block/finality evidence and #2485 reconciliation before first publication, then
bind the reconciliation namespace to reviewed custody.

## Next durable gate

The later writer should operate under the same existing payer queue used by the
open-liability store:

```text
payer-domain-v1.json
records/<liability_id>.json
reconciliations/<liability_id>.json
gas-liability-admission-v1.queue/
```

Under that lock it should:

1. census immutable liabilities + reconciliations with this contract;
2. resolve the exact immutable prepared plan;
3. re-read the exact durable terminal outcome;
4. obtain fresh server-controlled receipt/current-block evidence;
5. run terminal-cost evidence classification;
6. run #2485 reconciliation classification;
7. create/fsync one canonical reconciliation;
8. rerun this full census; and
9. prove the liability leaves effective-open reserve exactly once.

That later operation remains separate from this source-only accounting contract.

## Focused proof

```bash
npx tsx scripts/prove_coupled_native_gas_effective_open_census_v1.ts
npm run typecheck
npm run build
git diff --check
```

The proof covers deterministic ordering, empty/all-open history, one confirmed
reconciliation, exact reserve conservation, duplicate liability, wrong payer,
orphan reconciliation, duplicate reconciliation, conflicting reconciliation,
authority drift, accounting drift, WC/VOID reconciliation HOLD, malformed
liability economics, and explicit no-release/no-mutation authority.
