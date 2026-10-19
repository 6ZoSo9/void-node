# Buy VOID Epoch-2 live-composition Runner/Policy upgrade plan V6R3

Marker:
`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_UPGRADE_PLAN_V6R3`.

Status: **source/test/CI plus future non-executing host plan only**.

There is no apply mode in this generation.

## Accepted inputs

- V6R3 lock:
  `voidbuye2runnerpollock6r3_261c86ebce21170cf95479f7817e8a5689cb8438286a189bb239019a035adb5e`;
- candidate:
  `voidbuye2runnerpolcand6r3_9c00c1601412e8d3873c42c37000a6886580c992355822496eee57b55528f60b`;
- Runner V4 SHA-256:
  `730effadd9b95ec43d609759239ce43ab61e9e118c6c897cd0e13faa37a0e7f4`;
- accepted native V3 SHA-256:
  `85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8`;
- runtime/policy HEAD:
  `4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`.

## Future host plan

A separately authorized non-root `--plan` will:

1. authenticate current local `main` with Git transport/lazy fetch disabled;
2. require the runtime head to remain an ancestor of current source;
3. require exact accepted lock, Runner V4, credential qualifier and sealed-probe Git blobs;
4. descriptor-hash the current protected root, V4 predecessor and `/usr/bin/node`;
5. derive the existing V6R2 policy and require the current root to match it exactly;
6. derive the new policy using the **same runtime head** and current protected-host Node identity;
7. classify either:
   - `EPOCH2_V6R3_RUNNER_POLICY_UPGRADE_READY`; or
   - `EPOCH2_V6R3_RUNNER_POLICY_ROOT_GREEN_WITH_V6R2_PREDECESSOR`;
8. emit a content-addressed plan.

The future mutation protocol is declared but not implemented here: stage a complete
three-file root (unchanged native V3 + Runner V4 + new policy), atomically
exchange it with the current root, and retain the old V6R2 root under a distinct
predecessor path. The existing V4 predecessor remains untouched.

## Authority

This planner has no write/apply path. Even a GREEN host plan keeps false:

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

If READY, next gate is a separately reviewed/authorized atomic-upgrade
implementation and operation. If already GREEN, the next gate is installed
read-only qualification.

PROTECT THE CORE.


## Immutable-workflow lock rebind

The accepted V6R3 lock was reissued after the repository Actions-reference guard
required the candidate workflow to pin `actions/checkout` immutably.

Current accepted lock:

```text
lock_blob=84aed3b9c1f0f3f540c7d12b4cc33d0c132a74f0
lock_id=voidbuye2runnerpollock6r3_261c86ebce21170cf95479f7817e8a5689cb8438286a189bb239019a035adb5e
candidate_id=voidbuye2runnerpolcand6r3_9c00c1601412e8d3873c42c37000a6886580c992355822496eee57b55528f60b
```

The candidate identity is unchanged. This planner remains non-executing and has
no apply mode; the rebind adds no host/install/live authority.


## Post-P1 accepted generation

This planner is bound to the Runner V4 privileged-read closure repair:

```text
runner_git_blob=8e3c588f9c7275dcb0e351d2785b5a923982f133
runner_sha256=730effadd9b95ec43d609759239ce43ab61e9e118c6c897cd0e13faa37a0e7f4
runner_bytes=61692
candidate_id=voidbuye2runnerpolcand6r3_9c00c1601412e8d3873c42c37000a6886580c992355822496eee57b55528f60b
lock_id=voidbuye2runnerpollock6r3_261c86ebce21170cf95479f7817e8a5689cb8438286a189bb239019a035adb5e
```

The accepted candidate's exact compatibility and candidate hosted proofs are
SUCCESS. The runner's complete eight-object credential qualification dependency
closure is authenticated as runtime Git objects before root execution; source and
lock pathname reads from the user-owned checkout are forbidden in the root
qualification bootstrap.

This planner remains **non-executing and read-only**. It has no apply mode and
grants no install/live/credential/signing/payment/activation/funds authority.
