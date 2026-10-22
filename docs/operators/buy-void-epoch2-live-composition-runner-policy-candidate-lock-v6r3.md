# Buy VOID Epoch-2 V6R3 runner/policy candidate lock — main integration

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_CANDIDATE_LOCK_V6R3_MAIN_INTEGRATION`.

Status: **accepted source candidate identity only**. No Precision install, runner execution,
credential/private-key access, signing, transaction/payment action, activation, or funds
movement is authorized.

## Main-based accepted generation

```text
integration_pr=3546
integration_base_head=0ada7fde0d90c3946b10693f4621cbd690bfcde6
integration_head=86cd50bf0933e5caba420008eba577f91cdea0fc
integration_tree=d47f88d0d006f8ba198a2476dc345ce62bf7f1a1

compatibility_run=39310618025
compatibility_job=118258923320
candidate_run=39310618703
candidate_job=118258920779
candidate_identity_job=118259141001

candidate_id=voidbuye2runnerpolcand6r3_c82e554cbc92600aa4a91f6d25c43e437526c670b1509a2c6435c7e8edf55a0d
runner_git_blob=7967778824f22baca976a59df75f9f808ebebfe2
runner_sha256=a548ff17e37fc37d041a42faeaaf79645f843616e654700dafbf20ea652a0029
runner_bytes=64960
lock_id=voidbuye2runnerpollock6r3_1c5c5b31abd01aa6cf3f080b2cf666980f18a6a2daf22700127fd6d84951f74c
```

The historical #3535 V3 host-evidence source is recorded by exact identity in the
compatibility contract but is intentionally not materialized in this current-main successor.

## Supersession

All stacked #3543 V6R3 lock identities, including the latest
`voidbuye2runnerpollock6r3_bdd3e0b6fe28f2a6873920cdb1436914183e817c02b4d4ac9da130e3ec14b365`,
are historical and have no current install authority.

The candidate content identity remains `c82e...`; the new lock changes hosted provenance
and integration lineage only.

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

Next source gate:
`void_buy_void_epoch2_live_composition_runner_policy_upgrade_v6r3_plan`.

PROTECT THE CORE.


## Raw-object ancestry repair generation

Accepted candidate:

```text
candidate_id=voidbuye2runnerpolcand6r3_8ffc05fc997f4dc19a3174ca588b812afd126565235361bb6048170701ba1af1
runner_git_blob=340a0cf0eec589a44f20d44143e353ea25250973
runner_sha256=c5976f6b96a5c29807fb188d0ede4f0fe812512f199a083272df2e1a7acb4953
runner_bytes=70767
```

Exact-hosted evidence:

```text
compatibility_run=39319410007
compatibility_job=118289245313
candidate_run=39319409757
candidate_job=118289244127
candidate_identity_job=118289452867
```

Accepted lock:

```text
lock_id=voidbuye2runnerpollock6r3_7dd8db2619e9c02ef8120e6d5e4e716946b991787dea7128fb51ed63290e4af7
```

This generation replaces revision-walk ancestry authority with bounded traversal of
raw commit parent headers. Git grafts/replacement-style revision metadata are not
ancestry authority. The known-vulnerable lock
`voidbuye2runnerpollock6r3_7cce6937...` is explicitly superseded with no install
authority.

No protected install, live execution, credential/key/signing, transaction/payment,
activation, or funds authority is granted by this lock.
