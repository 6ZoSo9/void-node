# V7 V5 root-custodied staging plan V1

## Purpose

Define the **create-only staging gate** that must exist before the hardened
source+deployment-receipt exchange in Draft #3706 can ever be implemented on
Precision.

The staging gate prepares two new hidden objects while leaving the currently
trusted V4 production pair untouched:

- source stage:
  `/opt/.void-buy-void-v7-reviewed-v1.stage-v5`;
- deployment-receipt stage:
  `/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5`.

No exchange into the fixed production names occurs in this gate.

## Closed prerequisites

The plan binds the exact reviewed V5 evidence already proven on hosted CI:

- V5 accepted lock head:
  `be2fbe41aaba291d3f874b9de52bcb87336307f5`;
- V5 lock blob:
  `bc1b2f4095315861db7a257d4cc3c80a9f112530`;
- V5 enforcement set:
  `e72f512b0006eef7cec7325f39c56823eb3c878d7f8452a08c717478b7c8ac45`;
- hardened exchange plan ID:
  `voidv7srcrecexchange1_ddc23a6acfe11a8ce0e486d6848c43f6eb0e0dd6942c8c3f1240bdd1cd7fc9d0`;
- full-history V5 source target:
  commit `be2fbe41...`, tree `749877d2...`, parent `79081038...`,
  18,357 reachable commits;
- V5 deployment receipt:
  ID `voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37`,
  SHA-256 `12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001`,
  1,136 bytes.

## Source-stage contract

The future privileged builder must first revalidate an unprivileged
full-history candidate produced under the executing account's physical
passwd-derived Downloads tree.

Before any protected publication it must prove:

- exact commit/tree/parent and 18,357 reachable commits;
- branch `main`, clean worktree, and non-shallow repository;
- complete reachable object graph;
- no grafts, alternates, commondir, config.worktree, or external Git metadata;
- exact worktree/tree agreement;
- descriptor-bound source reads and copies;
- no-follow traversal and exclusive destination leaf creation.

The hidden source stage is create-only. Its final root is root:root mode
`0755`, and the runtime identity UID/GID 1000 must be unable to mutate the
root or any admitted descendant. This follows the reviewed protected-source
custody model in the V4 installer rather than inventing a new mode policy.

Publication of the hidden stage must use the reviewed
`renameat2(RENAME_NOREPLACE)` create-only pattern followed by parent fsync.
It grants **no** authority to exchange the stage into
`/opt/void-buy-void-v7-reviewed-v1`.

## Receipt-stage contract

The hidden receipt stage must be exactly:

```text
receipt_id=voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37
sha256=12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001
bytes=1136
uid=0
gid=0
mode=0444
nlink=1
```

It is also create-only and must be durably published to its hidden pathname
without replacing the existing production receipt.

## Resumption and failure policy

The two stages are independently verifiable.

- absent stage: eligible for creation;
- exact existing stage: reusable/resumable;
- mismatched existing stage: hard HOLD;
- nonempty partially-created source evidence after a failure: retain for
  inspection rather than recursively deleting it.

After either stage is published, the builder must revalidate that the original
V4 production source and deployment receipt remain exact and unchanged.

The staging gate must never create the future V4 predecessor names. Those names
belong only to the separately reviewed exchange/recovery operation.

A successful stage operation ends only at:

`V5_STAGE_PAIR_READY_FOR_SEPARATE_EXCHANGE_GATE`

It does not imply runtime cutover or source-finality authority.

## Host evidence boundary

The read-only Precision census observed that both current production objects
share a filesystem with their respective parents and that all planned
stage/predecessor names were absent.

That census is useful evidence but **not exclusion authority**. A fresh census
and protected preflight must run again immediately before any privileged stage
apply.

## Authority

This Draft is plan/proof/CI only:

```text
host_read=false
host_write=false
root_execution=false
protected_filesystem_mutation=false
fixed_source_exchange=false
fixed_receipt_exchange=false
transition_journal_write=false
consumer_fence_mutation=false
service_mutation=false
systemd_mutation=false
provider_rpc_contact=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

Plan ID:

`voidv7stageplan1_4e3b2f22bb6466a5921c1eaa5f63dfc319d224c9e3854a2064979d50ae605f41`

Next gate:

`IMPLEMENT_V5_ROOT_CUSTODIED_STAGE_BUILDER_AFTER_PLAN_CI`

PROTECT THE CORE.
