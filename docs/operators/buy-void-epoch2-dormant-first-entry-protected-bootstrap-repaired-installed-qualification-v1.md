# Buy VOID Epoch-2 repaired V6 bootstrap installed qualification V1

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_V6_REPAIRED_INSTALLED_QUALIFICATION_V1`.

Status: **source/CI-only read-only qualification; no Precision apply or execution authority**.

## Purpose

Qualify the fixed protected V6 bootstrap root **after** the repaired atomic
predecessor-to-current transition defined by #3493 and planned by #3509.

This gate does not need the original candidate input paths. It loads the exact
reviewed #3493 upgrader Git object and reuses only its read-only observation
functions to prove the installed state.

## Exact source generations

Repaired upgrader:
- path:
  `ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_bootstrap_atomic_upgrade_v1.py`
- Git blob:
  `d4b298dea73a4970987bf22435be3e76a5e7a02d`

Upgrader proof:
`74245f061432efd5383123c111ab481befbe90b5`

Non-executing upgrade plan:
`9ba10aac284da9e44db0ad258348425cfa3c2e2c`

Upgrade-plan proof:
`31d501e290513c3ef2629681574fc0e51f7fe50e`

## Transition identities

Historical predecessor lock:

`voidbuye2dormantbootstraplock3_5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b`

Repaired lock:

`voidbuye2dormantbootstraplock3_4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396`

Repaired candidate:

`voidbuye2dormantbootstrapcand3_1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2`

Historical bootstrap:
- 874608 bytes
- SHA-256
  `c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b`
- Git blob
  `a91707c3e5803071fc73c3451c9bcb3b774f8b48`

Repaired bootstrap:
- 874608 bytes
- SHA-256
  `618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c`
- Git blob
  `b577d70666f98ac59a75b84b3dab741fe7b93a4b`

Historical manifest:
- 2382 bytes
- SHA-256
  `aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662`
- Git blob
  `6e0630af72111bd9976dcc38cdcdada1904dd067`

Repaired manifest:
- 2382 bytes
- SHA-256
  `8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9`
- Git blob
  `de56bacb30bea0adc418e240cf3fb8d900b061ef`

## Read-only host qualification

A future host run requires one explicit lowercase 40-hex expected HEAD and a
clean local `main` checkout at that exact commit.

The qualifier then:

1. verifies the exact #3493 upgrader, proof, #3509 plan and plan-proof Git
   objects at that HEAD;
2. executes those upgrader bytes in memory;
3. loads the exact reviewed outer installer generation;
4. uses the upgrader's authenticated repository/Python/Git binding observer;
5. requires the upgrader's protected state classifier to return exactly
   `PROTECTED_BOOTSTRAP_V6_REPAIRED_GREEN_WITH_PREDECESSOR`;
6. re-verifies the repaired fixed root;
7. independently re-verifies the retained predecessor root;
8. requires the atomic-upgrade stage path to be absent;
9. requires the predecessor path to remain present;
10. requires the repaired lock to be the current binding;
11. requires temporary private Git metadata cleanup and zero source repository
    mutation/fetch/config/callback authority.

The qualifier deliberately does **not** call the upgrader's `collect()` or
`apply()` entrypoints.

## Temporary Git metadata boundary

The inherited authenticated repository observer may create temporary private Git
metadata while validating immutable object bytes. A GREEN receipt requires:

```text
temporary_git_metadata_write_performed=true
temporary_git_metadata_cleanup_completed=true
source_repository_mutation=false
source_object_fetch=false
repository_config_loaded=false
repository_callback_execution=false
native_parent_authority_claimed=false
```

No persistent repository mutation is authorized.

The qualifier's preliminary Git observation is isolated from the checkout's
local Git configuration. It verifies the real `.git/HEAD`, main ref, object
directory and bounded index as data, then copies the index into a private
temporary Git directory. Git commands run with that private directory as
`GIT_DIR`, the checkout only as `GIT_WORK_TREE`, and the real object store
only as `GIT_OBJECT_DIRECTORY`. The real `.git/config` is therefore not the
command's local configuration source. `GIT_NO_LAZY_FETCH=1` is mandatory and
`protocol.allow=never` denies Git transport fallback. Command-scope
`core.fsmonitor=false`, `core.hooksPath=/dev/null`, disabled credential
helpers/interactivity and disabled SSH remain defense in depth.

The focused proof creates a hostile local `core.fsmonitor` callback and remote
URL, verifies the scratch Git view does not expose either local-config entry,
requires the callback not to execute, and uses a Git wrapper to require the
no-lazy-fetch and protocol-deny environment on every preliminary command.

The bound #3509 planner generation is the repaired immutable-handoff generation:
it records `future_apply_source_inline=true`,
`future_apply_source_reopens_checkout=false`, and executes exact authenticated
upgrader Git-object bytes inline in any later root argv rather than reopening the
writable checkout script.

## Deliberate non-execution

This qualification never executes:
- the installed V6 bootstrap;
- the inner installer;
- native/binder payloads;
- services/systemd.

It performs no protected filesystem mutation. The authenticated repository
observer may create temporary private Git metadata while verifying immutable
object bytes. That temporary write is required to be cleaned before GREEN, and
the source repository itself remains unmodified. The qualification is
non-root-only.

A GREEN host qualification advances only to the separately reviewed:

`SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_V6_REPAIRED_EXECUTION_PLAN`

That future plan is still distinct from execution/apply authority.

## Authority

All remain false:

```text
temporary_git_metadata_write_required=true
temporary_git_metadata_cleanup_completed=true
qualification_git_callbacks_neutralized=true
source_repository_mutation=false
nonroot_run_required=true
protected_filesystem_mutation=false
bootstrap_execution=false
inner_installer_execution=false
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

**PROTECT THE CORE.**


## Repaired parent generation

This qualification generation is rebound to atomic-upgrade head
`12b5b05eaaf07e10bd4cb04c98abc1916a81fede` and non-executing planner
head `441f746d2ee8146b2ad6a62f68639f4451354c84`.

The parent upgrader preserves a normally returned first `RENAME_EXCHANGE` as
monotonic publication evidence even if a later layout observation is already
READY. The parent planner also binds its exact reviewed parent despite stale
pull-request event metadata and watches the correct upgrader-proof dependency
path in both PR and push triggers.


## October 20 preliminary Git config/fetch repair

Exact-head review of downstream V7 planning found that the earlier preliminary
observer still invoked Git with the real checkout as its repository. Although
known callbacks were overridden, Git could still parse `.git/config`; a
partial clone could also attempt promisor lazy fetch before the later hardened
receipt.

This generation closes that gap by making the preliminary observer use a
private scratch Git directory with a copied index, fixed detached HEAD, explicit
worktree/object-store bindings, `GIT_NO_LAZY_FETCH=1`, and
`protocol.allow=never`. Repository-local configuration is not command
authority, and missing promisor objects fail closed instead of fetching.

This remains source/CI-only and does not authorize host execution or mutation.
