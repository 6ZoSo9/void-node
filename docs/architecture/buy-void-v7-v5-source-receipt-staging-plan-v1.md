# V7 V5 source + deployment-receipt staging plan V1

## Purpose

Define the create-only staging boundary for canonical V5 before any fixed-path
source/receipt exchange is implemented or authorized.

This plan sits after:

- accepted V5 enforcement lock;
- full-history V5 source reseal evidence;
- exact cross-node V5 deployment-receipt derivation;
- Precision read-only exchange-host census;
- hardened source+receipt exchange recovery design.

It grants no root-stage creation or exchange authority.

## Exact V5 generation

Protected source generation:

- commit `be2fbe41aaba291d3f874b9de52bcb87336307f5`;
- tree `749877d2320ecee9d659720b32e4726a0c42d697`;
- parent `79081038cf4f03c2971bdcb32c54daf6a87fbabf`;
- reachable commits `18,357`;
- accepted V5 lock blob
  `bc1b2f4095315861db7a257d4cc3c80a9f112530`;
- accepted enforcement set
  `e72f512b0006eef7cec7325f39c56823eb3c878d7f8452a08c717478b7c8ac45`;
- protected inventory SHA-256
  `7f9bf2134ba33ddf52d6a2b9cf6fa1ba4b8ad437d71f2a5c2b1814f25f98d74f`.

## Source-stage prerequisite

Draft #3707 proves the V2 full-history reseal contract for this exact source
generation. A future stage builder must treat the user-owned reseal candidate as
untrusted input and independently copy/revalidate it into root custody.

Required stage path:

`/opt/.void-buy-void-v7-reviewed-v1.stage-v5`

Required source-stage properties:

- exact commit/tree/parent/count above;
- non-shallow complete object graph;
- clean `main`;
- root-custodied, non-group/world-writable tree;
- no source-tree symlinks;
- same filesystem as fixed source root;
- create-or-exact-match semantics only;
- no exchange authority.

## Receipt-stage prerequisite

Draft #3708 is terminal GREEN on Node 22/24/26 and cross-node rederivation.

Exact V5 receipt:

- ID
  `voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37`;
- SHA-256
  `12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001`;
- bytes `1136`.

Required stage path:

`/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5`

Required receipt-stage properties:

- exact ID/SHA-256/bytes above;
- root:root;
- mode `0444`;
- nlink `1`;
- same filesystem as fixed receipt;
- create-or-exact-match semantics only;
- no exchange authority.

## Precision host census

The read-only host census observed the exact current V4 pair and no namespace
collisions.

Current fixed source:

- `/opt/void-buy-void-v7-reviewed-v1`;
- commit `75927cae2c7ed0b4273e6218937dedf69824f64c`;
- tree `51fcfacd0303ae6e1c5aa8f4505fbff24ded3371`;
- clean `main`.

Current fixed receipt:

- `/var/lib/void-source-finality-v7/deployment-receipt.json`;
- SHA-256
  `da43b974970fdfee00f914d61064bee86d192ad9b67769f52696e1fbd05bfa87`;
- bytes `1136`;
- root:root, mode `0444`, nlink `1`.

Both source and receipt parent/object device IDs were `2050`, proving
same-filesystem exchange feasibility for each future rename pair.

These names were absent:

- `/opt/.void-buy-void-v7-reviewed-v1.stage-v5`;
- `/opt/void-buy-void-v7-reviewed-v1.predecessor-v4`;
- `/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5`;
- `/var/lib/void-source-finality-v7/deployment-receipt-v4-predecessor.json`.

The census must be rerun immediately before any future stage apply.

## Staging-pair semantics

Source and receipt stages may be created in either order and independently
qualified.

Neither stage alone grants exchange authority.

During staging:

- the fixed V4 source must remain unchanged;
- the fixed V4 receipt must remain unchanged;
- reserved predecessor names must remain absent;
- no transition journal is created;
- no consumer fence is mutated;
- no service/runtime cutover occurs.

Only when both hidden stages are exact may a later exchange implementation
consider the pair staged. Even then, `pair_ready` is not runtime-cutover
authority.

## Hardened exchange dependency

The current #3706 exchange design requires:

- durable transition journal before first exchange;
- exact old/new generation binding;
- fsync-ordered phase records;
- startup reconciliation before protected consumer admission;
- exclusive writer/consumer fence;
- crash-fault injection after each exchange/fsync;
- ambiguous recovery state => HOLD;
- predecessor retention through terminal verification/rollback.

The staging plan does not create or mutate any of those transition mechanisms.
It only prepares their future exact inputs.

## Authority

```text
plan_only=true
source_candidate_build_authority=false
root_stage_creation_authority=false
fixed_source_exchange_authority=false
fixed_receipt_exchange_authority=false
transition_journal_write_authority=false
consumer_fence_mutation_authority=false
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
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

Plan ID:

`voidv7v5stageplan1_f1a73d229fd78352758302cefd794bd07cfff77daaa02468c80125e378d41fa5`

Next gate:

`IMPLEMENT_CREATE_ONLY_V5_SOURCE_AND_RECEIPT_STAGE_BUILDERS`

PROTECT THE CORE.
