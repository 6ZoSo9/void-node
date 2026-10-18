# Buy VOID Epoch-2 repaired protected-installer bootstrap plan V7

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V7`.

Status: **source/CI-only non-executing plan; no bootstrap or protected-installer execution authority**.

## Purpose

V7 preserves the hardened V6 planner's raw checkout observer, artifact admission,
accepted launcher/native identities, complete content-addressed plan body and
structured bootstrap argv.

The only authority transition from V6 is the installed-qualification contract.
V7 binds the stricter repaired qualification from #3517 instead of the older V6
qualification that executed two bootstrap self-tests.

## Repaired qualification

Exact qualifier:

`ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_bootstrap_repaired_installed_qualification_v1.py`

Git blob:

`d9650aff7af2cb9fc9a8d95a888d8dd52aef1970`

Its contract requires:

```text
root_execution_required=false
nonroot_execution_required=true
protected_state_read_only_required=true
temporary_git_metadata_write_required=true
temporary_git_metadata_cleanup_required=true
qualification_git_callbacks_neutralized_required=true
descriptor_bound_source_execution_required=true
```

A GREEN result must prove:
- repaired fixed V6 root exact;
- retained predecessor exact;
- upgrade stage absent;
- repaired lock/candidate exact;
- temporary private Git metadata write performed and cleaned;
- qualifier preliminary Git callbacks explicitly neutralized before repository observation;
- source repository mutation/fetch/config/callback authority false;
- protected filesystem mutation false;
- bootstrap execution false;
- inner-installer execution false.

No bootstrap self-test is part of the V7 qualification contract.

## Repaired V6 installed generation

Expected repaired bootstrap:
- lock:
  `voidbuye2dormantbootstraplock3_4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396`;
- candidate:
  `voidbuye2dormantbootstrapcand3_1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2`;
- bytes: `874608`;
- SHA-256:
  `618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c`;
- Git blob:
  `b577d70666f98ac59a75b84b3dab741fe7b93a4b`.

Repaired source-generation V3 manifest:
- bytes: `2382`;
- SHA-256:
  `8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9`;
- Git blob:
  `de56bacb30bea0adc418e240cf3fb8d900b061ef`.

The retained predecessor is also part of qualification truth:
- predecessor bootstrap SHA-256
  `c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b`;
- predecessor manifest SHA-256
  `aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662`.

## Accepted launcher/native inputs

Launcher V2 remains:
- lock
  `voidbuye2dormantfirstentrylock2_89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543`;
- candidate
  `voidbuye2dormantfirstentrycand2_b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b`;
- SHA-256
  `4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28`.

Dormant-binder native remains:
- SHA-256
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`;
- bytes `726976`.

V7 preserves V6's descriptor-bound exact-artifact admission and current-head
binding for both inputs.

## Planned bootstrap argv

V7 emits only:

```text
<installed repaired V6 bootstrap>
  --installer-plan
  --launcher <accepted launcher V2 path>
  --native <accepted native path>
  --expected-head <exact current lowercase 40-hex main HEAD>
```

It never executes this argv.

The complete plan body and qualification contract are emitted as canonical JSON.
Changing checkout generation or caller artifact identity changes the plan ID.

## Inherited hardened machinery

The V7 proof binds the exact V6 planner and V6 proof, then requires byte-for-byte
function-source equality for the inherited:
- raw Git plumbing allowlist;
- checkout path and metadata observer;
- index/tree parsing;
- repository object binding;
- artifact admission;
- root-protected tool observation;
- accepted launcher/native dependency validation;
- content-addressed plan-ID derivation.

Only qualifier-facing plan functions may differ.

## Authority

The planner itself remains:

```text
nonroot_required=true
installed_qualification_performed=false
bootstrap_execution_performed=false
protected_installer_apply_performed=false
filesystem_write=false
protected_filesystem_mutation=false
service_mutation=false
systemd_mutation=false
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

The later qualification contract truthfully permits temporary private Git
metadata writes but no protected/source-repository mutation. It also requires
the repaired qualifier's explicit callback-neutralized Git boundary, including
`core.fsmonitor=false` and `core.hooksPath=/dev/null`, before that
qualification may satisfy V7.

**PROTECT THE CORE.**


## Repaired qualification parent

This V7 planner generation is reviewed directly against repaired qualification
head `190fae8c410d7fe3ae4af5551ea78a5523bcd7fb`.

The qualifier is itself bound to the monotonic-publication atomic upgrader and
the trigger-corrected non-executing upgrade planner. V7 therefore does not
inherit the superseded pre-repair parent identities.
