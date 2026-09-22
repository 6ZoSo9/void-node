# Buy VOID production history carrier census v1

Marker: `VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_V1`

## Purpose

This is the first source gate for #1682. It answers one narrow production
question before any payment-history carrier root is materialized:

> Does the canonical Precision Buy VOID runtime contain any payment/history
> artifacts that require full carrier reconstruction?

The observer is intentionally metadata-only. It never reads journal record
contents and never invents a carrier root.

## Canonical designated-host scope

The canonical runtime root is fixed in source:

```text
/home/zoso/dev/void-node/data_a/buy_void_v1/runtime-integration-v1
```

The canonical pool is:

```text
buy-void-presale-v1
```

The production wrapper does not accept a caller-selected runtime root or pool.

The explicit-root helper exists only for deterministic source proofs and fixture
composition.

## Bounded metadata census

The observer inspects only these deterministic directories:

1. `buy-void-auto-fulfillment-v1/payments/`
2. `buy-void-inventory-reservation-v1/pools/<pool-key>/reservations/`
3. `buy-void-inventory-reservation-v1/pools/<pool-key>/holds/`
4. `buy-void-execution-attempts-v1/attempts/`
5. `inventory-consumption-v1/records/`
6. `buy-void-saga-terminal-closeout-v1/attempts/`
7. `buy-void-crash-consistent-saga-runtime-v1/sagas/`

Each directory is consumed incrementally with `opendirSync`; no unbounded
`readdirSync` list is materialized.

The current hard ceiling is:

```text
4096 entries per observed directory
1 MiB maximum metadata-admitted JSON record size
```

Direct symlinks, symlink path components, malformed names, wrong entry kinds,
multi-link record files, non-private or foreign-owner record files,
non-private managed directories, and foreign-owner managed directories fail
closed.

## Outcomes

### Empty

```text
history_state=empty
carrier_root_sha256=null
```

This means all seven deterministic history surfaces contain zero entries at the
time of the observation.

It does **not** manufacture a genesis carrier root. The merged #1653 carrier
defines a deterministic empty index root, but a carrier-root object begins only
with an admitted reservation, paid-unreservable obligation, or later accepted
history-refresh successor.

An accepted designated-host empty census can therefore support #1682 evidence
with an explicit null carrier root.

### Materialization required

If any admitted history entry exists:

```text
history_state=materialization_required
carrier_root_sha256=null
```

The census stops short of claiming a root. #1682 must then perform a separate
bounded content-validating reconstruction using the merged #1650/#1653 payment
history and carrier contracts.

Invalid JSON is intentionally not parsed by this census. A correctly named
non-empty record is enough to require the stronger materialization gate.

## Privacy and evidence

The returned directory evidence includes only:

- relative directory label/path;
- existence;
- entry count; and
- SHA-256 commitment over admitted entry names plus metadata.

Individual payment keys, reservation IDs, attempt IDs, and saga IDs are not
returned by the observer.

A later designated-host receipt must additionally bind the exact reviewed
source commit/tree and operator execution. This source-only PR does not claim
that Precision has run the observer.

## Exact Precision observer entrypoint

The separately reviewed designated-host CLI is:

```text
scripts/observe_buy_void_production_history_carrier_precision_v1.ts
```

It accepts **no arguments**. It must be launched with the working directory
exactly:

```text
/home/zoso/dev/void-node
```

Before calling the canonical census wrapper it invokes exact `/usr/bin/git`
with explicit `--git-dir` and `--work-tree` paths, disables
`core.fsmonitor`, and uses a bounded PATH/Git config environment that does not
inherit caller `GIT_DIR`, `GIT_WORK_TREE`, alternate-object, or Git-config
authority. It then performs read-only Git checks and requires:

- current branch is `main`;
- `HEAD == local main`;
- the worktree is clean, including untracked files; and
- HEAD/tree identities are valid SHA-1 object IDs.

The CLI performs the census twice and requires byte-equivalent deterministic
results before accepting the observation. It then re-reads branch, HEAD, local
main, tree and clean-worktree state and requires the Git snapshot to be
unchanged across the observation.

Its receipt records `repo_head` and `repo_tree` so later #1682 evidence can
compare the host observation to the reviewed GitHub generation.

The CLI does not fetch. Remote synchronization is a separate operator/source
alignment gate; a census receipt never silently claims that local `main`
equals remote `origin/main`.

## Authority boundary

The source contract declares and proves:

```text
file_content_read=false
credential_content_read=false
wallet_access=false
signer_access=false
rpc_call=false
transaction_signing=false
transaction_broadcast=false
chain2050_write=false
history_mutation=false
carrier_page_publication=false
carrier_root_mutation=false
service_action=false
inventory_mutation=false
treasury_or_liquidity_action=false
funds_movement=false
```

No service is started, stopped, restarted, or reloaded. No credential, wallet,
signer, Chain-2050 RPC, transaction, inventory balance, treasury, liquidity, or
funds action is authorized by this gate.

## Verification

The dedicated workflow runs on Node 22, 24, and 26 and requires:

```text
npx tsc -p tsconfig.json --noEmit
node --import tsx scripts/prove_buy_void_production_history_carrier_census_v1.ts
node --import tsx scripts/prove_buy_void_history_carrier_v1.ts
git diff --check
```

The focused proof covers:

- empty-history classification;
- null carrier-root preservation;
- non-empty history forcing materialization;
- no JSON content dependency;
- malformed-entry rejection;
- symlink rejection;
- fixed production root/pool constants; and
- negative authority assertions.

## Next gate

After this source gate is accepted, run a separately reviewed exact read-only
observer on Precision.

If Precision returns `history_state=empty`, #1682 can build the checked-in
non-secret production evidence object with `carrier_root_sha256=null`.

If Precision returns `history_state=materialization_required`, continue #1682
with bounded semantic reconstruction before creating any carrier-root evidence.

#1679 remains downstream of accepted #1682 evidence. #1683 remains required
before live runtime enable/apply because live carrier-root custody and rotation
must not depend on per-payment systemd environment changes.
