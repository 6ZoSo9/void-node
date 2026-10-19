# Buy VOID Epoch-2 V6R3 runner/policy non-executing upgrade plan — main integration

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_UPGRADE_PLAN_V6R3`.

Status: **source/test/CI + future non-executing host plan only**. There is no apply
mode in this generation.

## Main-based source identities

```text
integration_pr=3546
main_base=0ada7fde0d90c3946b10693f4621cbd690bfcde6
candidate_id=voidbuye2runnerpolcand6r3_a9f60a75a96d74c9bbae89f6d9867886f6fb9b60b9a7bd7da4137c4502c2557f
accepted_lock_id=voidbuye2runnerpollock6r3_7cce6937b504ce5ec9dd1fe7aaa303763035f9d6486a081619be346793787dc7
accepted_lock_blob=daab812f9925364ad89ff3bd59fdd18b9c98d553
planner_blob=b9e69cab21b3031f0fb8000c0970a4cb99163d74
runner_git_blob=4e84b6eb77c284ecf7d85b609cec4d1cf130c7a7
runner_sha256=88e51377e473d4f0352f949f87ab5566078c85dddb1ab3e8e1bbb9908bfba19b
runner_bytes=66548
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


## Runtime-release Runner repair rebind

This non-executing plan is now bound to the repaired Runner V4 generation that:

- pins the canonical Git dir/worktree for current-source observation;
- keeps Git lazy fetch, transport and prompts disabled;
- executes the historical sealed-v2 probe from the exact protected runtime release `/opt/void-node-live/releases/4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`;
- keeps runtime policy head `4c80887...` distinct from the advancing source checkout.

Current accepted source identities:

```text
candidate_id=voidbuye2runnerpolcand6r3_a9f60a75a96d74c9bbae89f6d9867886f6fb9b60b9a7bd7da4137c4502c2557f
accepted_lock_id=voidbuye2runnerpollock6r3_7cce6937b504ce5ec9dd1fe7aaa303763035f9d6486a081619be346793787dc7
accepted_lock_blob=daab812f9925364ad89ff3bd59fdd18b9c98d553
runner_git_blob=4e84b6eb77c284ecf7d85b609cec4d1cf130c7a7
runner_sha256=88e51377e473d4f0352f949f87ab5566078c85dddb1ab3e8e1bbb9908bfba19b
runner_bytes=66548
planner_blob=b9e69cab21b3031f0fb8000c0970a4cb99163d74
```

The planner remains read-only and has no apply mode.
