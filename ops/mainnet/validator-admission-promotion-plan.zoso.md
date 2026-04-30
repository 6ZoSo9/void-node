# VOID Mainnet-0 Validator Admission Promotion Plan

status: plan_only_not_promoted
operator_label: zoso
validator_id: candidate-validator-01

## Current state

The validator admission record has public key material recorded:

- reward_address: 0xD2571D5D471D6574f7d57D0a3aCa5B34D0C8dA6F
- consensus_key: 0x67a0e5bb8887982681cd0fef8d35ec9a02fc74ac2224dd5fef0e97e101800540

The validator status remains blocked because live admission config is not promoted.

## Why promotion is not done in this checkpoint

ops/mainnet/void-mainnet.live.json is still intentionally in safe stub mode:

- mode: mainnet_plan_stub
- status: stub_only_not_live
- validators: []

The current live-json guard passes for stub mode. The non-stub guard path expects older mixed-case role/admin keys, while the current live JSON uses snake_case role/admin keys. Promotion should not be done by ad-hoc editing until the guard supports the intended schema.

## Required promotion steps

1. Update the live-json guard to support the current snake_case role/admin schema in non-stub mode.
2. Add an explicit plan-only validator admission shape that records validator0 public values without claiming active admission.
3. Prove bootstrap sanity still passes.
4. Prove validator admission sanity still passes.
5. Prove Precision and Alienware both read the promoted config consistently.
6. Only after the above, consider changing validator-status.current.yaml from blocked to a more specific staged/admission-ready state.

## Safety rule

Do not mark this validator as active/admitted until:
- live config explicitly represents that state,
- runtime endpoints agree,
- cross-box checks agree,
- no private keys are committed,
- launch/update/validator lifecycle gates remain green.
