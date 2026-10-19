# Buy VOID Epoch-2 V6R3 runner/policy atomic upgrade V1

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_ATOMIC_UPGRADE_V1`.

Status: **source/test/CI only**. This source defines the separately gated apply mechanism after the accepted V6R3 candidate/lock and non-executing host planner.

## Bound generation

- parent #3543 exact source head at branch creation: `cb8554553dcc97e4abb5a9f8f15a26a487773fb5`;
- V6R3 plan blob: `96de5ac0c622f12d5ad44b6aafb5c195d5eaef4f`;
- accepted lock: `voidbuye2runnerpollock6r3_bdd3e0b6fe28f2a6873920cdb1436914183e817c02b4d4ac9da130e3ec14b365`;
- candidate: `voidbuye2runnerpolcand6r3_c82e554cbc92600aa4a91f6d25c43e437526c670b1509a2c6435c7e8edf55a0d`;
- Runner V4 blob: `7967778824f22baca976a59df75f9f808ebebfe2`;
- Runner SHA-256: `a548ff17e37fc37d041a42faeaaf79645f843616e654700dafbf20ea652a0029`;
- Runner bytes: `64960`.

## Apply contract

Apply is root-only and requires both:

1. the exact content-addressed plan ID emitted by the nonroot V6R3 host planner; and
2. confirmation token `ATOMIC_EXCHANGE_EPOCH2_V6R3_RUNNER_POLICY_UPGRADE_V1`.

Immediately before mutation the executor reruns the nonroot planner and requires the complete plan body to remain identical.

The executor stages the complete root:

- unchanged accepted native V3;
- accepted Runner V4;
- a policy derived from the same runtime head `4c80887...` and the descriptor-bound host Node identity.

Publication uses `renameat2(..., RENAME_EXCHANGE)`, followed by a create-once `RENAME_NOREPLACE` retention of the old V6R2 root as `.predecessor-v6r2`. The V4 predecessor remains independently retained.

If a failure occurs after publication, automatic rollback restores the exact V6R2 root before reporting failure whenever possible.

## Deliberate non-authority

No source-mode invocation mutates the host. Even apply never executes the native or runner and performs no service/systemd action, credential/private-key access, signing, RPC/transaction/payment operation, public presale/WC activation, treasury/liquidity action, or funds movement.

A successful install is not live-binding authority. Its next gate is a separate installed read-only V6R3 qualification.

PROTECT THE CORE.
