# Buy VOID Epoch-2 live-composition Runner/Policy upgrade plan V6R3

Marker:
`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_UPGRADE_PLAN_V6R3`.

Status: **source/test/CI plus future non-executing host plan only**.

There is no apply mode in this generation.

## Current accepted inputs

```text
lock_blob=be4c1496a702ba4f2a622001576d22b9b4aeca4b
lock_id=voidbuye2runnerpollock6r3_bdd3e0b6fe28f2a6873920cdb1436914183e817c02b4d4ac9da130e3ec14b365
candidate_id=voidbuye2runnerpolcand6r3_c82e554cbc92600aa4a91f6d25c43e437526c670b1509a2c6435c7e8edf55a0d
runner_git_blob=7967778824f22baca976a59df75f9f808ebebfe2
runner_sha256=a548ff17e37fc37d041a42faeaaf79645f843616e654700dafbf20ea652a0029
runner_bytes=64960
native_sha256=85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8
runtime_head=4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb
```

The prior lock
`voidbuye2runnerpollock6r3_ee585a52fc383c31c6f61d9d43fa88e7ef97824d86c5e896e143ec91cf7a3ade`
is superseded and has no current install authority. The candidate and Runner
payload identities are unchanged; only acceptance provenance moved with the
repaired compatibility contract/proof generation.

## Future host plan

A separately authorized non-root `--plan` will:

1. authenticate current local `main` with Git transport/lazy fetch disabled;
2. require the runtime head to remain an ancestor of current source;
3. require exact accepted lock, Runner V4, credential qualifier and sealed-probe Git blobs;
4. descriptor-hash the protected current root, retained V4 predecessor and `/usr/bin/node`;
5. derive the existing V6R2 policy and require the current root to match it exactly;
6. derive the new policy using the **same runtime head** and current protected-host Node identity;
7. classify either:
   - `EPOCH2_V6R3_RUNNER_POLICY_UPGRADE_READY`; or
   - `EPOCH2_V6R3_RUNNER_POLICY_ROOT_GREEN_WITH_V6R2_PREDECESSOR`;
8. emit a content-addressed plan.

The mutation protocol remains declared but is **not implemented in this planner**:
a future separately reviewed operation would stage a complete three-file root
(unchanged native V3 + Runner V4 + new policy), atomically exchange it with the
current root, and retain the V6R2 predecessor. The existing V4 predecessor
remains untouched.

## Authority

Even a GREEN host plan keeps all of the following false:

```text
filesystem_write=false
runner_execution=false
native_execution=false
live_composition_execution=false
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

If READY, the next gate is a separately reviewed/authorized atomic-upgrade
implementation and operation. If already GREEN, the next gate is installed
read-only qualification.

The planner itself remains non-executing and has no `--apply` mode.

PROTECT THE CORE.


## Exact-PR-head successor lock rebind

Upgrade-plan source is rebound only after the successor V6R3 lock is proved. The
runner/candidate/runtime-policy identities are unchanged; only hosted-evidence provenance
and the resulting lock address moved.

```text
accepted_lock_id=voidbuye2runnerpollock6r3_bdd3e0b6fe28f2a6873920cdb1436914183e817c02b4d4ac9da130e3ec14b365
accepted_lock_blob=be4c1496a702ba4f2a622001576d22b9b4aeca4b
candidate_id=voidbuye2runnerpolcand6r3_c82e554cbc92600aa4a91f6d25c43e437526c670b1509a2c6435c7e8edf55a0d
runner_git_blob=7967778824f22baca976a59df75f9f808ebebfe2
runtime_head=4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb
```

This remains a non-executing source plan. No protected install, policy mutation,
live credential execution, signing, transaction/payment, activation, treasury or
funds authority is granted.
