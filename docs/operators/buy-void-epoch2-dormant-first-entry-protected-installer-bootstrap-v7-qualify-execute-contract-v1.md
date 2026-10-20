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
  `597dd61923d349980cd30bcf190fee354ff1c1f2`.

Exact reviewed planner proof:

- path:
  `scripts/prove_buy_void_epoch2_dormant_first_entry_protected_installer_bootstrap_plan_v7.py`;
- Git blob:
  `656075f1941e9cca302ebfd40efad09d979b4f25`.

The captured planner output must contain canonical
`plan_body_json` and a matching
`voidbuye2protectedbootstrapplan7_<sha256>` ID.

The contract rejects noncanonical JSON, duplicate or unexpected output/body
keys, a mismatched plan ID, changed authority fields, changed artifact
identities, unexpected nested fields, or an altered qualification contract.

Planner body, installed-bootstrap identity, launcher/native artifact identity,
qualification contract, and qualification required-result objects are
closed-schema. Dynamic planner tool metadata is validated for safe shape and
fixed aliases but is deliberately not carried forward as execution authority.

## Phase 1 — repaired qualification

The phase-1 source is exactly:

`ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_bootstrap_repaired_installed_qualification_v1.py`

Git blob:

`132e03eaea440f3f8c59aeaca879596c677c6bcf`.

The execution contract records:

- `run_as=nonroot`;
- fixed interpreter `/usr/bin/python3`;
- descriptor-bound exact-Git-object source execution;
- `--run --expected-head <exact planner head>`;
- exact reviewed qualification source/upgrader/plan blobs;
- closed qualification requirement/result schemas;
- preliminary local-config isolation, no-lazy-fetch, protocol-deny and
  object-alternate rejection requirements;
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
`81e4b587b63a88e599630bedfbc31c6b2722dd5e`.

Bound dependency blobs:
- V7 planner: `597dd61923d349980cd30bcf190fee354ff1c1f2`;
- V7 planner proof: `656075f1941e9cca302ebfd40efad09d979b4f25`;
- repaired installed qualifier: `132e03eaea440f3f8c59aeaca879596c677c6bcf`.

The parent-relative review surface is exactly this contract's four ADD-only files.
The qualification-helper static proof is checked against
`_validate_qualification_contract()` itself; qualification labels are no
longer incorrectly searched inside `validate_planner_output()`.


## October 20 closed-schema repair

Current exact parent #3518:
`81e4b587b63a88e599630bedfbc31c6b2722dd5e`.

This generation closes the open-schema review finding. Recomputing the planner
plan ID no longer legitimizes altered nested identities or extra authority-like
fields. Exact key sets are required for the planner body, installed bootstrap,
artifacts, qualification contract and required result. Previously ignored
qualifier source/upgrader/plan and fixed tool aliases are validated; dynamic
tool metadata is not propagated as execution authority.

The inert self-test mutates and rehashes the qualifier source path, upgrader
blob, upgrade-plan blob, interpreter alias, Git-tool alias, unexpected
qualification key, unexpected required-result key and unexpected top-level
planner key. Every case must HOLD.


## October 20 exact-head planner-state/race repair

The exact-head rereview identified two source-only correctness gaps in the V7
two-phase handoff. A rehashed planner body could disagree with the duplicated
top-level qualification-state lines for whether installed qualification had
already run or remained required, and a pathname replacement/removal race
between metadata observation and descriptor/open/revalidation could escape as an
uncaught `OSError`.

The repaired contract now requires the canonical planner body itself to carry
`installed_qualification_performed=false` and
`installed_qualification_required_before_bootstrap_plan=true`. Rehashed
opposite values are rejected. Planner-output open/read/revalidation
`OSError` paths are translated to `ContractError`, preserving the documented
machine-readable HOLD boundary instead of a traceback. The inert self-test
injects both an open race and a post-read visible-path race without performing
qualification, bootstrap execution, protected installation, service mutation,
credential access, signing, payment acceptance, activation, or funds movement.


## October 20 pathological planner-JSON HOLD repair

The subsequent exact-head review identified one additional fail-closed boundary:
Python may raise `ValueError` for oversized integer conversion or
`RecursionError` for pathological nesting while parsing untrusted planner JSON.
Those parser failures are now translated to the same machine-readable
`ContractError` HOLD contract as malformed JSON. The structured
`bootstrap_argv_json` / `qualification_contract_json` parser boundary uses
the same translation. Inert self-tests exercise oversized-integer and
deep-nesting planner bodies plus an oversized structured-output value.

This changes no execution authority: qualification execution, root-plan
execution, service mutation, credentials/signing, transaction/payment,
activation, treasury/liquidity action, and funds movement remain false.


## October 20 qualification-result boolean type repair

Exact-head review found that Python equality accepts numeric substitutes for
booleans (`0 == False`, `1 == True`). The closed qualification
`required_result` schema now uses identity/type checks for every expected
boolean before accepting the rehashed planner body. Inert adversarial cases
replace one false authority field with `0` and one true verification field
with `1`; both must fail closed.

This does not expand authority. Qualification execution, root-plan execution,
service mutation, credentials/signing, transaction/payment, activation,
treasury/liquidity action, and funds movement remain false.


## Exact boolean typing for qualification contracts

The qualification contract is a typed closed schema, not only a value-equality
schema. Every expected boolean in the outer `qualification_contract` and its
nested `required_result` must be an actual JSON/Python boolean with the exact
required identity. Numeric substitutes such as `0` for `false` or `1` for
`true` are rejected even when the planner body is rehashed consistently.

The inert proof mutates outer fields including `root_execution_required` and
`nonroot_execution_required` to numeric substitutes and requires deterministic
HOLD. This adds no execution, privilege, payment, activation, or funds authority.


## Parser and exact-type fail-closed boundaries

The planner handoff rejects malformed-but-rehashed inputs before emitting an
execution contract:

- planner-body canonicalization is inside the same machine-readable HOLD boundary
  as JSON parsing, including recursion failures;
- protocol integer fields are actual integers, not equal-valued floats or
  booleans;
- accepted executable artifact byte counts are exact integers; and
- normalized executable paths reject embedded NUL bytes before they can enter the
  structured root argv.

Inert proof fixtures exercise canonicalization failure, `version: 7.0`,
floating installed/artifact byte counts, and a launcher path containing an
escaped NUL with a consistently modified argv. All must HOLD. These checks add no
execution, privilege, payment, activation, or funds authority.


## Nonblocking observation and executable-path canonicality

The planner-output descriptor is opened with `O_NONBLOCK` in addition to
read-only, close-on-exec and no-follow flags so a regular-file-to-FIFO race cannot
turn validation into an unbounded blocking open. Descriptor identity checks still
reject any rebound object.

Executable artifact paths are restricted to one-root, normalized, strict UTF-8,
sub-4096-byte absolute paths with no NUL/CR/LF. Rehashed double-root,
unencodable-surrogate and overlong paths must HOLD. These checks constrain only
source evidence; they do not execute any artifact.


## Downstream bootstrap path parity

Executable artifact paths also mirror the fixed V6 bootstrap `clean_path()`
consumer boundary: `/` alone is invalid, every path component must be nonempty,
must not be `.` or `..`, and each UTF-8 component must be at most 255 bytes.
The existing total UTF-8 path bound remains below 4096 bytes. Rehashed root-only
and 256-byte-component fixtures must HOLD before a root-plan contract is emitted.


## October 20 duplicated qualification JSON type-exact repair

The current review found that the duplicated `qualification_contract_json` line
was parsed and compared to the canonical planner-body contract with ordinary
Python dictionary equality. That could treat `false` as equal to integer
`0`, `true` as equal to integer `1`, or integer metadata `0` as equal to
`false`, even though the bound planner cannot emit those typed substitutions.

The contract now canonicalizes both parsed duplicated structured values and their
validated planner-body counterparts before comparison. Canonical JSON preserves
the distinction between booleans, integers, and floating-point values. The
self-test independently changes only the duplicated qualification JSON line,
without changing the canonical plan body or plan ID, and requires HOLD for both
`root_execution_required=false -> 0` and interpreter `uid=0 -> false`.

This strengthens transcript binding only. It adds no qualification execution,
root-plan execution, service mutation, credential/signing, transaction/payment,
activation, treasury/liquidity action, or funds movement authority.
