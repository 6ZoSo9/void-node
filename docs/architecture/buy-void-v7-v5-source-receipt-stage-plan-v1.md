# V7 V5 source + deployment-receipt staging plan V1

## Purpose

Define the create-only staging boundary immediately before the reviewed atomic
V4→V5 source/receipt exchange.

This plan creates **no host authority**. It binds the exact source and receipt
artifacts that future root-custodied staging installers must produce.

Plan ID:

`voidv7stageplan1_7054f1774a723c62d5ea0c527c69084e76e0c47372b7602349b08c49138fc203`

## Closed prerequisites

### V5 enforcement identity

Accepted source generation:

- commit `be2fbe41aaba291d3f874b9de52bcb87336307f5`;
- tree `749877d2320ecee9d659720b32e4726a0c42d697`;
- parent `79081038cf4f03c2971bdcb32c54daf6a87fbabf`;
- V5 candidate blob `46e3774ca442cf593d25b6062ab5538d5ac43611`;
- V5 lock blob `bc1b2f4095315861db7a257d4cc3c80a9f112530`;
- enforcement set
  `e72f512b0006eef7cec7325f39c56823eb3c878d7f8452a08c717478b7c8ac45`.

The exact V5 lock workflow is terminal GREEN including cross-node
rederivation.

### Hardened exchange plan

#3706 current head `dfa30a733fa21f4b806b4a8d559fa3e7ae0f147c`
is GREEN on Node 22/24/26.

The exchange implementation must retain the hardened requirements from plan
`voidv7srcrecexchange1_ddc23a6acfe11a8ce0e486d6848c43f6eb0e0dd6942c8c3f1240bdd1cd7fc9d0`,
including a durable transition journal, startup reconciliation, crash fault
injection, and an exclusive protected-consumer fence.

### Full-history source provenance

#3707 current head `cac12e5d77a05fd5614b85902505c271d86c7748`
is terminal GREEN after building a disposable full-history candidate.

The protected V5 source target is exactly:

- 18,357 reachable commits;
- non-shallow;
- complete object graph;
- exact index and worktree;
- no grafts, alternates, commondir, or delegated Git metadata.

### Deployment-receipt bytes

#3708 current head `242aa1054e1c9ee36a06047ea350f92976870038`
is terminal GREEN on Node 22/24/26 plus independent cross-node rederivation.

The exact receipt is committed in this lane as
`ops/security/buy-void-source-finality-v7-deployment-receipt-v5.json`:

- Git blob `eddd0b47263213ae8dd65ef72a5479c40ea6812e`;
- receipt ID
  `voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37`;
- SHA-256
  `12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001`;
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
