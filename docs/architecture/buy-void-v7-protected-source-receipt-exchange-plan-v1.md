# V7 protected source + deployment receipt exchange plan V1

## Purpose

Plan the first safe generation transition for the fixed V7 protected source root
and its create-once deployment receipt after canonical V5 acceptance.

Current Precision state is already an exact V4 pair:

- protected source root:
  `/opt/void-buy-void-v7-reviewed-v1`;
- source commit:
  `75927cae2c7ed0b4273e6218937dedf69824f64c`;
- source tree:
  `51fcfacd0303ae6e1c5aa8f4505fbff24ded3371`;
- deployment receipt:
  `/var/lib/void-source-finality-v7/deployment-receipt.json`;
- receipt ID:
  `voidbsfdep1_3f128abf9c9d9c2fc97c8d3620be212b12542b0e57a149672bdb988efee1d5a1`;
- receipt SHA-256:
  `da43b974970fdfee00f914d61064bee86d192ad9b67769f52696e1fbd05bfa87`.

V5 cannot simply be copied over either path.

The native pre-entry, protected launcher, deployment receipt installer,
provider-pair installer, and live-process receipt publisher all authenticate the
same fixed V1 protected source root. The deployment receipt installer also
permits an alternate `--receipt-path` only for planning: production apply
requires the fixed default path.

## Why atomic exchange instead of a V2 pathname

Changing the protected source pathname would require a new native pre-entry,
launcher, and all protected dispatch consumers merely to follow the new root.
That would expand the protected executable transition beyond canonical V5.

Instead, this plan preserves the already-reviewed fixed pathname and uses a
generation exchange:

1. construct an independently qualified V5 source stage on the same filesystem
   as `/opt/void-buy-void-v7-reviewed-v1`;
2. construct an independently qualified root-custodied V5 deployment receipt
   stage on the same filesystem as the fixed receipt;
3. revalidate current V4 source + receipt and both V5 stages through retained,
   no-follow descriptors;
4. atomically exchange the staged source directory with the fixed source root;
5. fsync its parent;
6. atomically exchange the staged receipt with the fixed receipt;
7. fsync its parent;
8. terminally verify that the fixed pair is V5 and that the displaced V4 source
   and receipt are still retained at the stage names;
9. require the runtime classifier to return
   `deployment_generation_verified`.

The source and receipt cannot be exchanged together in one syscall. Therefore
the intermediate state must be treated as deliberately fail-closed. No source
finality operation may treat the transition as ready until both exchanges and
terminal qualification are complete.

## Rollback

The repository already contains reviewed protected-root atomic upgrade patterns
using `renameat2(RENAME_EXCHANGE)`, predecessor retention, parent fsync,
truthful publication-state receipts, and automatic rollback.

This plan binds those existing implementations rather than inventing a weaker
publication model.

If the pair does not reach terminal V5 GREEN, the future implementation must
restore the old receipt if it moved, restore the old protected source root if it
moved, fsync both parents, and revalidate the exact original V4 pair.

The old V4 source and receipt must **not** be deleted in the same operation even
after a successful V5 exchange. Retirement is a later explicit gate.

## Stage authority remains separate

This plan does not authorize creation of either V5 stage.

The source stage still needs exact V5 commit/tree plus independently accepted
full-history provenance. The receipt stage still needs exact V5
content-addressed receipt evidence. Their builders and host qualification remain
separate reviewed gates.

The V5 lock in Draft #3704 is bound by exact source identities, but this plan
also requires #3704 exact-head CI to be terminal before any transition
implementation may be accepted.

## Authority

Plan only:

```text
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
runtime_cutover_authority=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

Plan ID:

`voidv7srcrecexchange1_bc6417cd5a3d40961ce49f45a38943732b9e7e401dc731724fb86821fdfed2c8`

Next gate:

`IMPLEMENT_TRUSTED_V7_PROTECTED_SOURCE_RECEIPT_EXCHANGE_CANDIDATE_AFTER_V5_LOCK_CI_AND_STAGE_PROVENANCE`

PROTECT THE CORE.
