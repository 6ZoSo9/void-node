# Buy VOID Epoch-2 V7 qualification/root-plan execution contract V1

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALLER_BOOTSTRAP_V7_QUALIFY_EXECUTE_CONTRACT_V1`.

Status: **source/CI-only handoff contract; no host execution authority**.

## Purpose

The repaired V7 planner emits a content-addressed non-executing plan whose next
action is a separately authorized qualification/root-plan transition.

This gate defines that transition without implementing it.

It consumes captured V7 planner stdout, revalidates the complete canonical plan
body and plan ID, and emits a new content-addressed execution contract with two
ordered phases:

1. repaired installed qualification under a **non-root** boundary;
2. installed V6 bootstrap `--installer-plan` under a **root** boundary.

Neither phase is executed by this gate.

## Parent V7 planner

Exact reviewed planner source:

- path:
  `ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_installer_bootstrap_plan_v7.py`;
- Git blob:
  `9ea4a7d34a66f81ed568adaed693755ebca37b66`.

Exact reviewed planner proof:

- path:
  `scripts/prove_buy_void_epoch2_dormant_first_entry_protected_installer_bootstrap_plan_v7.py`;
- Git blob:
  `66263ef1beb35d5611683f456f95cafd5e0007ec`.

The captured planner output must contain canonical
`plan_body_json` and a matching
`voidbuye2protectedbootstrapplan7_<sha256>` ID.

The contract rejects noncanonical JSON, duplicate output keys, a mismatched plan
ID, changed authority fields, changed artifact identities or an altered
qualification contract.

## Phase 1 — repaired qualification

The phase-1 source is exactly:

`ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_bootstrap_repaired_installed_qualification_v1.py`

Git blob:

`d9650aff7af2cb9fc9a8d95a888d8dd52aef1970`.

The execution contract records:

- `run_as=nonroot`;
- fixed interpreter `/usr/bin/python3`;
- descriptor-bound exact-Git-object source execution;
- `--run --expected-head <exact planner head>`;
- exact V7 `qualification_contract`;
- GREEN is required before phase 2.

The qualification may truthfully create and remove its private temporary Git
metadata. The contract does not reinterpret that as protected filesystem
mutation.

## Phase 2 — root bootstrap plan

Only after exact phase-1 GREEN may a later separately reviewed operator boundary
use the V7 planner's exact structured bootstrap argv:

```text
<installed V6 bootstrap>
--installer-plan
--launcher <accepted runtime-head launcher V2>
--native <accepted dormant-binder native>
--expected-head <exact current head>
```

The execution contract records `run_as=root` for this phase but deliberately
does **not** implement sudo, setpriv, privilege escalation, exec or subprocess
launching.

The root boundary remains a later separately reviewed operator implementation.

## Artifact identities

Installed repaired V6 bootstrap:

- lock:
  `voidbuye2dormantbootstraplock3_4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396`;
- candidate:
  `voidbuye2dormantbootstrapcand3_1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2`;
- bytes: `874608`;
- SHA-256:
  `618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c`;
- Git blob:
  `b577d70666f98ac59a75b84b3dab741fe7b93a4b`.

Accepted runtime-head launcher V2:

- lock:
  `voidbuye2dormantfirstentrylock2_89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543`;
- candidate:
  `voidbuye2dormantfirstentrycand2_b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b`;
- bytes: `731072`;
- SHA-256:
  `4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28`;
- Git blob:
  `798907b18c73ee2cc1dea0fe05b36f27ab4137a7`.

Accepted dormant-binder native:

- bytes: `726976`;
- SHA-256:
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`.

## Planner-output intake

`--plan --planner-output <absolute file>` performs read-only intake.

The captured output must be:

- a normalized absolute regular-file path;
- no symlink;
- single link;
- bounded to 2 MiB;
- descriptor-opened with `O_RDONLY|O_CLOEXEC|O_NOFOLLOW`;
- stable before/after descriptor and visible-path checks.

No output file is created by the contract.

## Contract output

The contract ID is:

`voidbuye2protectedbootstrapv7exec1_<sha256(canonical contract body)>`.

The body includes:

- exact V7 planner source/proof blobs;
- exact V7 plan ID and canonical body digest;
- exact expected HEAD;
- exact phase-1 qualifier source/contract;
- exact phase-2 bootstrap argv;
- explicit privilege split;
- exact phase order;
- all execution authority false.

A GREEN contract advances only to:

`SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALLER_BOOTSTRAP_V7_EXECUTE_QUALIFICATION_AND_ROOT_PLAN`.

That future action is not implemented or authorized here.

## Callback-neutralized qualification prerequisite

Phase 1 binds the repaired qualifier generation and requires
`qualification_git_callbacks_neutralized_required=true`; its accepted GREEN
result must include `qualification_git_callbacks_neutralized=true`.
An older V7 planner/qualifier output without those fields fails closed before
any root-phase representation.

## Authority

This gate executes no host phase.

```text
qualification_execution_performed=false
bootstrap_execution_performed=false
protected_installer_apply_performed=false
root_boundary_execution_performed=false
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

CI may run only self-test, source-plan and proof code. It must not invoke the
installed bootstrap or repaired qualifier against a real host.

**PROTECT THE CORE.**


## Final V7 dependency generation

This contract is reviewed against exact parent #3518
`f226bb5f4c938a8b51fe8bdfbef3b6985ac0e7ac`.

Bound dependency blobs:
- V7 planner: `9ea4a7d34a66f81ed568adaed693755ebca37b66`;
- V7 planner proof: `66263ef1beb35d5611683f456f95cafd5e0007ec`;
- repaired installed qualifier: `d9650aff7af2cb9fc9a8d95a888d8dd52aef1970`.

The parent-relative review surface is exactly this contract's four ADD-only files.
The qualification-helper static proof is checked against
`_validate_qualification_contract()` itself; qualification labels are no
longer incorrectly searched inside `validate_planner_output()`.
