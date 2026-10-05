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
- carry one canonical `terminal_cost_identity_sha256` that is stable across
  later confirmation-depth observations;
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

The reconciliation row does not carry `gasUsed` or
`effectiveGasPrice`. Current merged #2479 requires
`gasUsed == liability.gas_limit` before it can produce terminal-cost evidence,
but this census cannot independently re-prove that receipt fact from the
reconciliation row alone. It therefore requires only accounting compatibility
with a full-gas-limit execution: the gas-cost portion of `actual_consumed`
must divide exactly by the immutable liability gas limit and the derived
effective gas price must remain at or below the admitted max fee.

That compatibility check rejects values that cannot come from the reviewed
full-gas-limit lineage, but it is not proof that the underlying receipt actually
used the full gas limit; a different gas-used / gas-price pair can have the same
product. Exact `gasUsed == gas_limit` authority remains inherited from an
independently authenticated #2479/#2485 provenance chain. Accordingly,
`terminal_evidence_provenance_verified=false` remains authoritative here.

An orphan reconciliation, duplicate row, or alternate reconciliation for one
liability HOLDS.

A WC/VOID liability cannot be reconciled by this V1 because #2485 exposes only
confirmed presale reconciliation authority. WC/VOID therefore remains
effective-open.

The generic liability-history format can represent a zero-native-value row, but
merged #2485's presale reconciliation validator requires a strictly positive
`transaction_native_value_wei`. This census preserves that parent domain:
a zero-native presale liability may remain visible as historical/effective-open
state, but a reconciliation for it HOLDS instead of being treated as a valid
#2485 result.

## Derived accounting

The successful census returns deterministic sorted identities and exact
uint256-bounded sums:

- historical liability count and IDs;
- historical obligation IDs, transaction-plan fingerprints, and nonces;
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

Reserve release and replay protection are deliberately separate. A later
admission path may use only the **effective-open** liabilities for balance
reservation, but it must continue checking a new candidate against the
historical obligation/plan/nonce indexes. Passing only the effective-open rows
back into the legacy #2463 classifier would release capacity but would also
erase collision history for reconciled liabilities; that composition is not
authorized by this contract.

## Provenance boundary

A stored reconciliation can be internally canonical while its terminal receipt
provenance is not freshly authenticated. The stored
`terminal_cost_identity_sha256` proves deterministic accounting identity, not
that the terminal receipt was freshly re-observed through an authenticated
transport at census time. Fresh observation identity remains a separate
resolver/writer responsibility.

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
6. run #2485 reconciliation classification and require the fresh observation to
   reproduce the stable terminal-cost identity/canonical reconciliation;
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
authority drift, accounting drift, WC/VOID reconciliation HOLD, zero-native
presale reconciliation-domain HOLD, malformed liability economics, and explicit
no-release/no-mutation authority.
