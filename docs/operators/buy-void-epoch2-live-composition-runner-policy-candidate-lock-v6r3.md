# Buy VOID Epoch-2 live-composition runner/policy candidate lock V6R3

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_CANDIDATE_LOCK_V6R3`.

Status: **accepted source candidate identity only**. The lock does not install,
execute, or activate the candidate.

## Accepted exact candidate

Hosted candidate evidence:

```text
candidate_head=33dcb727396ddd3281b3dee5fde398e86c9c7c48
workflow=Buy VOID Epoch-2 live-composition runner policy candidate V6R3
run_id=39270541453
job_id=118121335657
conclusion=success
candidate_id=voidbuye2runnerpolcand6r3_eee91de4d93ea4ab3068621659a8420255772b49f25556f3d93cbd67d3059c0a
```

Runner V4 accepted identity:

```text
git_blob_sha1=46da5a2df6ccace675ae6f572b11ba011b41efc8
sha256=fda5cddcf632a1f21e474574fdd890751e66db5f488451747b1a62aff65e17ba
bytes=50243
install_mode=0444
```

Accepted native V3 identity is reused from the existing V6R2 lock:

```text
native_sha256=85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8
native_bytes=726976
native_binary_rebuild_required=false
```

Lock ID:

`voidbuye2runnerpollock6r3_4d55eadc456d48aed2e77df8a4897c0756b173761e7a10b0f1b53b24dd4d50a2`.

## Policy rule

The lock accepts a policy **template**, not host policy bytes. A future protected
plan must bind the actual protected-host Node identity while preserving runtime
HEAD `4c80887...`. Canonical source HEAD `0ada7fde...` is never substituted
into the runtime policy.

## Authority

The lock sets candidate/runner/native-reuse/policy-template acceptance true.
It deliberately leaves all execution authority false:

```text
protected_install_authorized=false
live_execution_authorized=false
credential_access_authorized=false
private_key_access_authorized=false
signing_authorized=false
transaction_authorized=false
rpc_call_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
treasury_liquidity_action_authorized=false
funds_movement_authorized=false
production_host_evidence_authority=false
```

Next gate:
`void_buy_void_epoch2_live_composition_runner_policy_upgrade_v6r3_plan`.

PROTECT THE CORE.


## Superseded-generation barrier

Runner V4 source repair changed its exact Git blob from
`46da5a2d...` to `4d50bec847c697bac75e40121173b4840eeab879`.

Therefore the historical candidate
`voidbuye2runnerpolcand6r3_eee91de4...` and historical lock
`voidbuye2runnerpollock6r3_4d55eadc...` are explicitly superseded.

The checked-in lock currently has no active `lock_id`, no current candidate ID,
and all candidate/install/live authority false. It is a fail-closed barrier while
the repaired candidate is re-derived.


## Repaired accepted generation

The superseded barrier has now been replaced by accepted repaired evidence:

```text
candidate_head=6bad5e7bea8db683b53622387923c493370b8e64
compatibility_run=39272638928
compatibility_job=118128683759
candidate_run=39272637721
candidate_job=118128679712
candidate_id=voidbuye2runnerpolcand6r3_7efa1fbe6ea7d457fa8ea0ae59e5b528010957aa914a05b456b8c5443b5c0c6d
runner_git_blob_sha1=62029fafa7073ab3768fec01f2147a7f4eefce2b
runner_sha256=0f87747439b82887033295cf04022c9a2a491c726f8d6acad8b0efc2e8dcdc71
runner_bytes=51684
lock_id=voidbuye2runnerpollock6r3_00b9bdf79f89a3c16cb1d1330e182bec748da4cf20367c3b50882b6728548202
```

This generation accepts runtime-observed current-source compatibility rather than
a fixed current-source SHA. The historical candidate and lock remain explicitly
superseded with no install authority.

Acceptance still does **not** authorize protected installation or live execution.


## Immutable-workflow provenance repair

Current accepted generation after the repository Actions-reference guard repair:

```text
candidate_head=539075ad44f5fef150c7fbfdb4ca6e8115a7b682
candidate_workflow_git_blob_sha1=0e2f3c7dbbebdaa6c7120699aad35890646dc954
compatibility_run=39275749198
compatibility_job=118139485564
candidate_run=39275748113
candidate_job=118139481605
candidate_id=voidbuye2runnerpolcand6r3_7efa1fbe6ea7d457fa8ea0ae59e5b528010957aa914a05b456b8c5443b5c0c6d
lock_id=voidbuye2runnerpollock6r3_20603b85f690336180fd024c3ae632e01025e511cf893b04055967cdd0a59d67
```

The candidate identity is unchanged because the candidate report does not derive
authority from the workflow file. The acceptance lock changes because hosted
provenance is explicitly bound to the immutable checkout-pinned workflow.

The previous repaired lock
`voidbuye2runnerpollock6r3_00b9bdf7...` is now also superseded and has no
install authority. No protected install or live execution is authorized by this
provenance repair.
