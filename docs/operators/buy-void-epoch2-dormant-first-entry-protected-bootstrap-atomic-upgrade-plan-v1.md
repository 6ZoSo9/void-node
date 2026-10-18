# Buy VOID Epoch-2 repaired V6 atomic bootstrap upgrade plan V1

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_ATOMIC_UPGRADE_PLAN_V1`.

Status: **source/CI-only non-executing planner; no Precision upgrade authority**.

## Purpose

This gate is the separately versioned planning boundary after #3487's atomic
repaired-bootstrap root upgrader and #3493's interrupted-rename truth repair.

It authenticates the exact repaired upgrader generation, checks a future
Precision host's current predecessor/repaired artifact state through the
upgrader's existing `collect()` path, and emits the exact future privileged
`--apply` argv as JSON.

It never calls the upgrader's `apply()` function.

## Repaired upgrader generation

The planner binds exact #3493 head source:

- upgrader source Git blob
  `7d70527d8910881f9973479b89ceef78789ad100`;
- upgrader focused proof
  `9e0b997230943b1ad0a0285e74e82faf049d7d31`;
- operator contract
  `6073c2c3a6489d80a24e64eba9fdf892bfe8c4c0`;
- focused workflow
  `a89be3f29d758811362c81c9dbc7d2b69f74c147`.

The planner loads the upgrader from exact Git-object bytes into an in-memory
module and calls only:

`collect(bootstrap, manifest, expected_head)`.

## Transition identity

Predecessor lock:

`voidbuye2dormantbootstraplock3_5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b`

Repaired lock:

`voidbuye2dormantbootstraplock3_4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396`

Repaired candidate:

`voidbuye2dormantbootstrapcand3_1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2`

Repaired bootstrap:
- bytes: `874608`;
- SHA-256:
  `618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c`;
- Git blob:
  `b577d70666f98ac59a75b84b3dab741fe7b93a4b`.

Repaired source-generation manifest:
- bytes: `2382`;
- SHA-256:
  `8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9`;
- Git blob:
  `de56bacb30bea0adc418e240cf3fb8d900b061ef`.

## Future host run

A future operator supplies:
- an absolute repaired bootstrap artifact path, mode `0555`;
- an absolute repaired manifest artifact path, mode `0444`;
- the exact current clean `main` HEAD.

The planner itself requires non-root execution. It verifies:
- exact lowercase 40-hex HEAD;
- clean branch `main` at that HEAD;
- exact #3493 upgrader/proof/doc/workflow Git objects;
- exact bootstrap and manifest file identities with `O_RDONLY|O_NOFOLLOW`;
- the upgrader's full read-only collection contract;
- expected predecessor/repaired lock/candidate IDs;
- atomic-exchange, predecessor-retention and automatic-rollback requirements.

## Temporary Git metadata boundary

The underlying repaired V6 observer may create temporary private Git metadata
while authenticating the repository. This is intentionally reported rather
than mislabeled as a zero-write plan.

The plan must prove:

```text
temporary_git_metadata_write_performed=true
temporary_git_metadata_cleanup_completed=true
source_repository_mutation=false
source_object_fetch=false
repository_config_loaded=false
repository_callback_execution=false
native_parent_authority_claimed=false
```

No protected `/opt` mutation occurs.

The planner's own Git observations also neutralize callback-capable repository
configuration before `status`, `show`, or `rev-parse` are invoked. In
particular `core.fsmonitor` is forced off and `core.hooksPath` is forced to
`/dev/null`; credential helpers/interactivity and SSH command execution are
disabled. The focused proof creates a repository with a hostile local
`core.fsmonitor` command and requires that command not to execute.

## Future apply handoff

A GREEN plan emits a content-addressed handoff ID and a JSON argv that
executes the **exact authenticated #3493 Git-object bytes inline**:

```text
/usr/bin/python3 -I -B -c <wrapper containing exact authenticated upgrader bytes>
--apply
--bootstrap <exact repaired bootstrap>
--manifest <exact repaired manifest>
--expected-head <current clean main HEAD>
--expected-plan-id <exact upgrader plan ID>
--confirm ATOMIC_EXCHANGE_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_V6_PREDECESSOR_TO_REPAIRED
```

The wrapper compiles the already authenticated upgrader bytes with the reviewed
checkout pathname only as the logical `__file__` value. It does **not** reopen
the writable checkout copy before root-side validation.

The handoff body records:

```text
planner_git_callbacks_neutralized=true
future_apply_source_inline=true
future_apply_source_git_blob_sha1=7d70527d8910881f9973479b89ceef78789ad100
future_apply_source_reopens_checkout=false
future_apply_authorized=false
```

The argv remains data only. It is never executed by this planner.

If the repaired generation is already installed, the next action is a separate
read-only installed qualification. Otherwise the next action is a separately
authorized atomic repair upgrade.

## Authority

This source/CI gate grants no host mutation authority.

All remain false:

```text
planner_git_callbacks_neutralized=true
future_apply_source_inline=true
future_apply_source_reopens_checkout=false
future_apply_authorized=false
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

CI runs only syntax, focused proof, `--self-test`, and `--source-plan`.

**PROTECT THE CORE.**
