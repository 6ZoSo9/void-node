# Buy VOID Epoch-2 live-composition runner/policy candidate lock V6R3

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_CANDIDATE_LOCK_V6R3`.

Status: **accepted source candidate identity only**. This lock does not install,
execute, activate, or grant credential/signing/economic authority.

## Current accepted exact generation

The candidate payload is unchanged after the repaired #3535 compatibility
reconciliation:

```text
candidate_head=95feac7bf64a92a891640d80d7a2eed0fdb4cb49
compatibility_run=39302930907
compatibility_job=118232536377
compatibility_conclusion=success
candidate_run=39302929811
candidate_job=118232533789
candidate_identity_job=118233036839
candidate_conclusion=success
candidate_id=voidbuye2runnerpolcand6r3_c82e554cbc92600aa4a91f6d25c43e437526c670b1509a2c6435c7e8edf55a0d
```

Runner V4 accepted identity:

```text
git_blob_sha1=7967778824f22baca976a59df75f9f808ebebfe2
sha256=a548ff17e37fc37d041a42faeaaf79645f843616e654700dafbf20ea652a0029
bytes=64960
install_mode=0444
```

Compatibility acceptance provenance is rebound to the repaired parent generation:

```text
compat_contract_git_blob_sha1=f37fcd41bbb7efa057b66c3a7ad46d36f2d6e9ae
compat_proof_git_blob_sha1=65c72cd077ee413a6c7f4aa2b7b4aeb4dd5aa51a
compat_workflow_git_blob_sha1=88d4fcbedfdccb6e33ea733beb2033571e45f876
```

The accepted native V3 binary remains reused unchanged:

```text
native_sha256=85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8
native_bytes=726976
native_binary_rebuild_required=false
```

Current lock:

```text
lock_blob=c86912d4e632d4525bfd1d32cb2c01524fb0ebfb
lock_id=voidbuye2runnerpollock6r3_decff2ebef64d6e8eb332a1ff5d363906c08322c8949bff9e9abdce48088522d
```

## Policy rule

The lock accepts a policy **template**, not host policy bytes. A future protected
plan must bind the descriptor-observed protected-host Node identity while
preserving runtime HEAD
`4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`. Canonical source HEAD must never
replace that runtime policy head.

## Superseded generations

The following prior final lock is now superseded by the compatibility-provenance
rebind and has no current install authority:

`voidbuye2runnerpollock6r3_ee585a52fc383c31c6f61d9d43fa88e7ef97824d86c5e896e143ec91cf7a3ade`.

Earlier candidate/lock IDs listed in the lock JSON are likewise historical only.
`superseded_install_authority=false`.

## Authority

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


## Exact-PR-head hosted provenance successor

The prior accepted lock `voidbuye2runnerpollock6r3_decff2ebef64d6e8eb332a1ff5d363906c08322c8949bff9e9abdce48088522d` is superseded because its cited hosted
compatibility/candidate workflows did not themselves require an explicit pull-request
head checkout. The candidate content identity is unchanged, but hosted provenance is
reissued from a generation whose workflow first checks out and asserts exact PR head
`f237c2c31b0551f8291524dd2bc46796605cc469`.

Exact successor evidence:

```text
candidate_head=f237c2c31b0551f8291524dd2bc46796605cc469
compatibility_run=39305661304
compatibility_job=118241935894
candidate_run=39305661383
candidate_job=118241936839
candidate_identity_job=118242178056
candidate_id=voidbuye2runnerpolcand6r3_c82e554cbc92600aa4a91f6d25c43e437526c670b1509a2c6435c7e8edf55a0d
candidate_workflow_blob=eacf6ee3c203e65a412ef057a5fe6fc2104fa682
compatibility_workflow_blob=402267212f3280e54c204a124ccb26c332821f97
successor_lock_id=voidbuye2runnerpollock6r3_bdd3e0b6fe28f2a6873920cdb1436914183e817c02b4d4ac9da130e3ec14b365
```

The superseded lock gains no historical install authority. All protected-install,
live-execution, credential/key/signing, transaction/payment, activation/treasury,
funds, and production-host-evidence authority remain false.
