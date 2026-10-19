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
