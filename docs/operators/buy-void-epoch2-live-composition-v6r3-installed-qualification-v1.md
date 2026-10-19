# Buy VOID Epoch-2 V6R3 installed qualification V1

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_V6R3_INSTALLED_QUALIFICATION_V1`.

Status: **read-only qualification source**. This source is not an install or live-binding authorization.

## Bound generation

- parent #3553 exact head at branch creation: `39ae7c5610d200bd568080c6cfcc918159176b79`;
- executor blob: `f0a992c0d4880268ff4ad8f180f73109477dd90d`;
- V6R3 planner blob: `96de5ac0c622f12d5ad44b6aafb5c195d5eaef4f`;
- accepted V6R3 lock/candidate and Runner V4 identities are compile-bound.

## Qualification boundary

The `--run` path requires root only because it must observe the protected roots and execute the installed native's inert self-test.

It performs three complete installed snapshots and two descriptor-retained native V3 `--self-test` executions. It requires all three snapshots and both self-test transcripts to be stable and identical.

It verifies:

- current V6R3 root: unchanged native V3 + accepted Runner V4 + runtime-head-preserving policy;
- retained V6R2 predecessor: exact previous native/runner/policy generation;
- retained V4 predecessor: exact historical generation;
- current source HEAD supplied by the operator matches the nonroot planner's authenticated source snapshot;
- accepted lock/candidate/plan identities remain exact.

The JavaScript runner is never executed. No credential/private-key/signing/transaction/payment path is entered.

## Authority

Even GREEN keeps false:

```text
runner_execution=false
live_composition_execution=false
service_mutation=false
systemd_mutation=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
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

The next source gate is the dormant candidate live-binding source/runtime compatibility V3 successor. It remains separately unimplemented/unauthorized by this qualifier.

PROTECT THE CORE.
