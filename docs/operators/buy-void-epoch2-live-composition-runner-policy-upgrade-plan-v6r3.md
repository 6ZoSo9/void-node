# Buy VOID Epoch-2 V6R3 runner/policy non-executing upgrade plan — main integration

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_UPGRADE_PLAN_V6R3`.

Status: **source/test/CI + future non-executing host plan only**. There is no apply
mode in this generation.

## Main-based source identities

```text
integration_pr=3546
main_base=0ada7fde0d90c3946b10693f4621cbd690bfcde6
candidate_id=voidbuye2runnerpolcand6r3_c82e554cbc92600aa4a91f6d25c43e437526c670b1509a2c6435c7e8edf55a0d
accepted_lock_id=voidbuye2runnerpollock6r3_1c5c5b31abd01aa6cf3f080b2cf666980f18a6a2daf22700127fd6d84951f74c
accepted_lock_blob=c527f317be6fdb2502e9c93ca43618d68f4a6b8e
planner_blob=29ee3e6048a60d5d7368d66c871fe3ee3a561c45
runner_git_blob=7967778824f22baca976a59df75f9f808ebebfe2
runner_sha256=a548ff17e37fc37d041a42faeaaf79645f843616e654700dafbf20ea652a0029
runner_bytes=64960
runtime_head=4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb
```

All stacked #3543 lock/plan identities are superseded for current authority.

## Future non-executing host plan

A separately authorized non-root `--plan` will:

1. authenticate the current source generation and complete nine-entry runtime-sensitive
   dependency closure with network-capable Git transport disabled;
2. bind the accepted main-based V6R3 lock and Runner V4 Git object;
3. descriptor-snapshot the protected host Node binary;
4. derive the existing V6R2 policy using runtime head `4c80887...`;
5. derive the V6R3 policy using the same runtime head and accepted Runner V4 identity;
6. observe whether the protected root is old V6R2 READY state or already V6R3 GREEN;
7. content-address the resulting plan.

The planner performs terminal source revalidation after the host observations.

If the protected root is READY, the next boundary is a **separate** V6R3 runner/policy
atomic-upgrade authorization. If it is already GREEN, the next boundary is a separate
installed read-only qualification.

## Negative authority

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

No Precision host plan is authorized merely by this source publication. No protected
install or live binding follows automatically.

PROTECT THE CORE.
