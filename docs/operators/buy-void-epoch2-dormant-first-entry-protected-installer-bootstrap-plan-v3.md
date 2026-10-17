# Buy VOID Epoch-2 protected-installer bootstrap plan V3

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V3`.

Status: **read-only plan handoff only; it does not execute the installed bootstrap**.

## Purpose

This gate follows the repaired V3 installed qualification in #3435.

It verifies the exact installed V3 protected-bootstrap generation plus the exact
accepted dormant-binder first-entry launcher and native ELF, then emits a
content-bound argv receipt for a later separately authorized root bootstrap
**plan**.

It does not call sudo and does not execute the bootstrap.

## Bound installed qualifier

The plan handoff executes the exact V3 qualifier source in memory from Git blob:

`a2298dbdbf9928f14963ce8bf77d91f54e349ce9`.

The qualifier must independently prove:

- clean current `main` at the supplied lowercase 40-hex HEAD;
- V4 canonical bootstrap lock;
- exact root-custodied V3 bootstrap;
- exact root Python policy generation;
- exact repaired protected-installer V2 source;
- `runtime_expected_head_compile_bound=false`;
- strict runtime HEAD admission and unchanged forwarding;
- `canonical_main_candidate_authority=true`;
- historical V3/V2/V1 lock install authority false;
- no bootstrap execution and no protected-installer apply.

A qualifier HOLD causes this plan to HOLD.

## Accepted V3 bootstrap

Installed bootstrap path:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v3/bin/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v3`

Accepted identity:

- V4 lock:
  `voidbuye2bootstraplock4_6568c1cd0195405d49001fbf6cb9a086364e401f78f3bfcf1d6cbb080947cb67`;
- candidate:
  `voidbuye2bootstrapcand3_9e914f52eb3cde5a5fef42fbdf065b375f89fdabb768034b09615861bba67ce3`;
- ELF bytes: `731072`;
- ELF SHA-256:
  `904e6b05df45bc9212be7689ea0617ccfbf65d5edf8535a381abcbb588f236cd`;
- ELF Git blob:
  `69e3bf6db7baf614eb0b7d8c5e93aafce0deab46`.

## Accepted launcher input

Canonical launcher V2 authority:

- lock ID:
  `voidbuye2dormantfirstentrylock2_89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543`;
- candidate ID:
  `voidbuye2dormantfirstentrycand2_b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b`;
- `runtime_head_contract_accepted=true`;
- `canonical_main_candidate_authority=true`;
- `superseded_v1_lock_install_authority=false`;
- `runtime_expected_head_compile_bound=false`;
- strict lowercase runtime-head admission;
- unchanged runtime-head forwarding;
- repository HEAD absent from the launcher ELF;
- frozen-child launcher pathname compatibility preserved.


Accepted launcher lock Git blob:

`227c2fa449abf1387925373c706ecd07775d5898`.

Reviewed materializer Git blob:

`611e5d54154e3d3d5d9e7ba6c0374d697ecc3ba7`.

Required launcher file:

- absolute normalized path;
- regular file, no symlink, one link;
- mode `0555`;
- bytes `731072`;
- SHA-256
  `4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28`;
- Git-blob identity
  `798907b18c73ee2cc1dea0fe05b36f27ab4137a7`.

## Accepted native input

Accepted native lock Git blob:

`5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1`.

Reviewed native materializer Git blob:

`557eb68453d517d78bb3b6c6d8427df9ed36316f`.

Required native file:

- absolute normalized path;
- regular file, no symlink, one link;
- mode `0555`;
- bytes `726976`;
- SHA-256
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`.

The later repaired installer independently verifies the accepted native
generation again.

The V3 plan additionally parses the launcher V2 acceptance lock itself. A file
with the expected lock blob is not enough: the lock must assert canonical V2
candidate authority, the runtime-head contract, exact launcher ELF identity,
and historical V1 install authority false before any argv is emitted.


## Structured future argv

A GREEN plan emits only this structured argument vector:

```text
<installed V3 bootstrap>
--installer-plan
--launcher <exact accepted launcher path>
--native <exact accepted native path>
--expected-head <exact current checkout HEAD>
```

The argv is emitted as JSON, not executed.

The plan ID prefix is:

`voidbuye2protectedbootstrapplan3_`

and the suffix is SHA-256 over canonical JSON containing the expected HEAD,
installed-bootstrap evidence, accepted artifact identities and exact future argv.

## Non-root boundary

This handoff requires a non-root caller.

Effective UID 0 is refused before host qualification so the plan-generation
step itself never crosses the privileged bootstrap boundary.

## Source bindings

This generation binds:

- V3 installed qualifier:
  `a2298dbdbf9928f14963ce8bf77d91f54e349ce9`;
- launcher lock:
  `227c2fa449abf1387925373c706ecd07775d5898`;
- launcher materializer:
  `611e5d54154e3d3d5d9e7ba6c0374d697ecc3ba7`;
- native lock V3:
  `5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1`;
- native materializer V2:
  `557eb68453d517d78bb3b6c6d8427df9ed36316f`;
- V3 plan source:
  `b5f0a3a79632ea9bbb17c9e3a8cb4771752fca47`;
- V3 plan proof:
  `aa666b3417a2d9ffbbbcfe8f43dafa4f872d8e60`.

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

`SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALLER_BOOTSTRAP_EXECUTE_PLAN_V3`.

That later gate is still plan-only and is not repaired protected-installer apply
authority.

**PROTECT THE CORE.**
