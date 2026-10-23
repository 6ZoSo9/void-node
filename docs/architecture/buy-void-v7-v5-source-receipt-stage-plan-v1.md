# V7 V5 source + deployment-receipt staging plan V1

## Purpose

Define the create-only staging boundary immediately before the reviewed atomic
V4→V5 source/receipt exchange.

This plan creates **no host authority**. It binds the exact source and receipt
artifacts that future root-custodied staging installers must produce.

Plan ID:

`voidv7stageplan1_266ca6a4377c8590ecd159504597bd64ddba3b4e2a4ed79ade971b26b9322f2e`

## Closed prerequisites

### V5 enforcement identity

Accepted source generation:

- commit `3dc143bb16d7c1d1d5e0f674881cf12621818661`;
- tree `21e7fae2d3dfeb6a918c11799ae6644c6ca70a64`;
- parent `b9d8ad7aec19592b104d47da4a496710d4fde8db`;
- V5 candidate blob `ef9d39fb22f7d4225f6f8abe6bb84c1f11acb8bc`;
- V5 lock blob `3c341f2de794f0922d5d1af2d1574cee6450c0d5`;
- enforcement set
  `ea6f7203779174302bd8f01219055dd5a126c8475e18dcb301e60e9a2481acbc`.

The exact V5 lock workflow is terminal GREEN including cross-node
rederivation.

### Hardened exchange plan

#3706 current head `5535f696e28dc60b4217015922bffbad310283cc`
is GREEN on Node 22/24/26.

The exchange implementation must retain the hardened requirements from plan
`voidv7srcrecexchange1_14c1314bb42f1b4d55d475f4e81f7d48603354d71ab01539f751558e42e566eb`,
including a durable transition journal, startup reconciliation, crash fault
injection, and an exclusive protected-consumer fence.

### Full-history source provenance

#3707 current head `89d5e9aea60f2702068ed0de041038d651401520`
is terminal GREEN after building a disposable full-history candidate.

The protected V5 source target is exactly:

- 18,357 reachable commits;
- non-shallow;
- complete object graph;
- exact index and worktree;
- no grafts, alternates, commondir, or delegated Git metadata.

### Deployment-receipt bytes

#3708 current head `58b25a65f77e89179302f8f48a915993618af4da`
is terminal GREEN on Node 22/24/26 plus independent cross-node rederivation.

The exact receipt is committed in this lane as
`ops/security/buy-void-source-finality-v7-deployment-receipt-v5.json`:

- Git blob `933e81f5d695eba57b969bf7da0d565be5198073`;
- receipt ID
  `voidbsfdep1_351215ea3296d4935a4ae845d8f975166a8da20723ce9a56f94d9f4c21f25244`;
- SHA-256
  `2990e9bdef4793cc02f1dc0d502c1854f321f40202774e1e94939be9248efba6`;
- bytes `1136`.

This is still **candidate/staging evidence**, not proof that the installed
deployment is V5.

## Precision host census

The read-only Precision census proves the existing V4 pair remains exact and
the planned stage/predecessor names are unused.

Both fixed objects and their parents are on device `2050`, so each later
source or receipt exchange can use same-filesystem rename semantics.

No current V4 source or receipt is changed by this plan.

## Source-stage contract

Future source staging is proposed at:

`/opt/.void-buy-void-v7-reviewed-v1.stage-v5`

The root must be `root:root`, mode `0755`, runtime-nonwritable, and retain
the complete full-history Git repository.

The future create-only installer must independently authenticate the
current-UID candidate at:

`/home/zoso/Downloads/void-v7-v5-full-history-candidate`

It must require exact V5 commit/tree/parent, 18,357 reachable commits, complete
object closure, exact index/worktree, and absence of shallow/graft/alternate
or commondir indirection. Copy and terminal verification must be
descriptor-bound.

Publication to the hidden stage must use create-only
`renameat2(RENAME_NOREPLACE)`, followed by parent fsync. Exact reapply may
succeed; a mismatched existing stage must HOLD.

The stage installer has **no authority** to exchange the fixed production
source root.

## Receipt-stage contract

Future receipt staging is proposed at:

`/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5`

It must be exactly the committed V5 receipt bytes and terminally verify:

- root:root;
- mode `0444`;
- nlink `1`;
- receipt ID, SHA-256 and byte count above.

Publication is create-only `RENAME_NOREPLACE` plus parent fsync. Exact reapply
may succeed; a mismatched stage must HOLD.

The stage installer has **no authority** to replace the fixed production
deployment receipt.

## Partial staging

The source stage and receipt stage may be constructed independently. A partial
pair has no exchange authority and cannot represent
`actual_installed_deployment_generation_verified=true`.

After both stages exist, a separate read-only qualification must reverify:

1. both exact V5 stage identities;
2. the fixed V4 source+receipt pair remains unchanged;
3. no service/runtime state changed;
4. the hardened exchange plan is still the active reviewed transition
   contract.

Only then can an exchange implementation/apply lane be considered.

## Authority

```text
plan_only=true
host_read=false
host_write=false
root_execution=false
protected_filesystem_mutation=false
service_mutation=false
systemd_mutation=false
provider_rpc_contact=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
signing=false
transaction=false
payment_acceptance=false
actual_installed_deployment_generation_verified=false
runtime_cutover_authority=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

Next gate:

`IMPLEMENT_V5_SOURCE_AND_RECEIPT_CREATE_ONLY_STAGE_INSTALLERS`

PROTECT THE CORE.
