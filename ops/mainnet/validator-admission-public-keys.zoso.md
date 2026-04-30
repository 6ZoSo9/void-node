# VOID Mainnet-0 Validator Admission Public Key Record

validator_id: candidate-validator-01
operator_label: zoso
record_status: public_values_recorded_not_live_admitted

## Public validator values

reward_address: "0xD2571D5D471D6574f7d57D0a3aCa5B34D0C8dA6F"
consensus_key: "0x67a0e5bb8887982681cd0fef8d35ec9a02fc74ac2224dd5fef0e97e101800540"

## Source artifacts

These values are public values from the frozen/bootstrap validator0 artifacts:

- ops/mainnet/void-mainnet.deployed.json
  - status: live_frozen_post_bootstrap
  - validator0.reward
  - validator0.consensusKey

- ops/mainnet/validator-truth-upgrade-track.deployed.json
  - status: upgrade_track_rebound_epoch_captured
  - reward
  - consensusKey

## Current admission limitation

This record does not mean the validator is live-admitted.

The current ops/mainnet/void-mainnet.live.json still reports:
- mode: mainnet_plan_stub
- status: stub_only_not_live
- validators: []

So validator-status.current.yaml must remain blocked until live config/admission is intentionally promoted and proven.

## Safety posture

This file contains only public addresses / public consensus key material.

No private keys, seed phrases, keystores, passphrases, or signing secrets belong in this file.
