# Buy VOID Epoch-2 protected-installer bootstrap plan V2R

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V2R`.

Status: **read-only plan handoff only; it does not execute the installed bootstrap**.

## Purpose

This gate follows merged canonical V2R installed qualification #3426.

It verifies the exact installed V2 bootstrap generation plus the exact accepted
dormant-binder first-entry launcher and native ELF, then emits a content-bound
argv receipt for a later separately authorized root bootstrap plan.

It deliberately does **not** call sudo and does **not** execute the bootstrap.

## Bound installed qualifier

The plan handoff executes the exact merged qualifier source in memory from Git
blob:

`c6b1236de5eac88dd29ea84ef8b66ccd6e71a043`.

The qualifier must independently prove:

- clean current `main` at the supplied lowercase 40-hex HEAD;
- V3 canonical bootstrap lock;
- exact root-custodied V2 bootstrap;
- exact Python policy generation;
- exact #3391 protected-installer source;
- `runtime_expected_head_compile_bound=false`;
- strict runtime HEAD admission and unchanged forwarding;
- `canonical_main_candidate_authority=true`;
- historical V2 install authority false;
- no bootstrap execution and no protected-installer apply.

A qualifier HOLD causes this plan to HOLD.

## Accepted launcher input

Accepted launcher lock Git blob:

`f8ff6fbb855aecafc329cd60622cf3af782745a3`.

Reviewed materializer Git blob:

`50e8e7ba06740af830cc3c9df34d0ef7739a7e67`.

Required launcher file:

- absolute normalized path;
- regular file, no symlink, one link;
- mode `0555`;
- bytes `731072`;
- SHA-256
  `4fbf67bff503cead931b59e4364d66ccf2f2d6c0ee40182b6f9498cf96e8f51a`;
- Git-blob identity
  `eb66ce5313a8c0b01639ebec79564111d55163c4`.

## Accepted native input

Accepted native lock Git blob:

`5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1`.

Reviewed materializer Git blob:

`557eb68453d517d78bb3b6c6d8427df9ed36316f`.

Required native file:

- absolute normalized path;
- regular file, no symlink, one link;
- mode `0555`;
- bytes `726976`;
- SHA-256
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`.

The later #3391 plan independently verifies the accepted native generation
again.

## Structured future argv

A GREEN plan emits only this structured argument vector:

```text
<installed V2 bootstrap>
--installer-plan
--launcher <exact accepted launcher path>
--native <exact accepted native path>
--expected-head <exact current checkout HEAD>
```

The argv is emitted as JSON, not executed.

The plan ID prefix is:

`voidbuye2protectedbootstrapplan2r_`

and its suffix is SHA-256 over canonical JSON containing the expected HEAD,
installed-bootstrap evidence, accepted artifact identities and exact future
argv.

## Non-root boundary

This handoff requires a non-root caller.

Root execution is refused before host qualification so the plan-generation
step itself never crosses the privileged boundary.

## Authority

Always false:

```text
bootstrap_execution_performed=false
protected_installer_apply_performed=false
filesystem_write=false
service_mutation=false
credential_access=false
private_key_access=false
signing=false
transaction=false
rpc_call=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

A GREEN result may advance only to:

`SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALLER_BOOTSTRAP_EXECUTE_PLAN_V2R`.

That later gate is still plan-only and is not #3391 apply authority.

**PROTECT THE CORE.**
