# Buy VOID presale Epoch-2 installed-generation host evidence V1

Marker:
`VOID_BUY_VOID_PRESALE_EPOCH2_INSTALLED_GENERATION_HOST_EVIDENCE_V1`.

Status: **source/CI-only collector definition; no Precision qualification has been run by this gate**.

Parent plan:

`voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab`

This gate implements only #3507 lane:

`epoch2_installed_generation`.

## Reviewed qualifier

The collector binds the existing read-only installed qualifier:

`ops/precision/void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py`

Git blob:

`a04c2e7665294cdd142426e9eb01ee27c5292b8d`

And its adversarial proof:

`scripts/prove_void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py`

Git blob:

`c14ec00acffbc55630aa68db0013d97cac068ab3`.

The collector loads the exact qualifier Git-object bytes into memory and calls
only `collect(expected_head)`.

## Future host run

A future separately authorized root run accepts:

`--run --expected-head <exact clean lowercase-hex main HEAD>`

The collector first requires the local checkout to be clean branch `main` at
that exact HEAD and requires the qualifier/proof paths at that HEAD to match the
pinned reviewed Git blobs.

The V5 qualifier then:

1. authenticates the accepted V6R2 native candidate lock and protected upgrade;
2. verifies the exact current install root;
3. verifies the retained predecessor root;
4. binds Git, setpriv, Node, policy and checkout generations;
5. executes the installed native self-test through a retained descriptor;
6. snapshots the installed generation again;
7. executes a second descriptor-bound native self-test;
8. snapshots a third time;
9. requires before/middle/after installed generations to be identical;
10. requires both self-test outputs/digests to be identical.

Its reviewed proof also demonstrates that a visible pathname swap cannot cause
the replacement binary to execute: the retained descriptor executes the
original generation and the visible generation drift causes HOLD.

## Deliberate process execution

This evidence lane is read-only for persistent state but is not metadata-only.

A future host run executes the installed native **self-test twice**.

It does not execute:
- the authenticated JS runner;
- live composition;
- credentials/private keys;
- signing;
- a transaction or RPC submission.

A GREEN evidence report may set:

```text
epoch2_installed_generation_qualified=true
protected_upgrade_verified=true
installed_generation_stable=true
retained_predecessor_verified=true
node_generation_bound=true
checkout_generation_bound=true
git_generation_bound=true
setpriv_generation_bound=true
native_self_test_execution_performed=true
native_self_test_descriptor_bound=true
native_self_test_stable=true
```

It must retain:

```text
filesystem_write_performed=false
runner_execution=false
live_composition_execution=false
service_mutation=false
network_contact=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
signing=false
transaction_submission=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_or_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

## Relationship to presale qualification

A GREEN lane-3 result proves only the reviewed Epoch-2 installed-generation
evidence required by #3503/#3507.

It does not by itself prove:
- authenticated deployment/live-process receipt evidence;
- allocation-custody durability/rollback/independence;
- host-install qualification;
- payment-rail policy acceptance;
- one-payment/one-fulfillment;
- WC/VOID launch coupling;
- customer payment acceptance;
- presale or market activation.

Lane 1 is separately defined in #3510.

Lane 2 remains HOLD because current reviewed custody primitives deliberately
leave live durability, rollback resistance and independent custody unproven.

## CI boundary

Hosted CI:
- binds #3507's exact parent plan;
- binds exact V5 qualifier and proof blobs;
- compiles and adversarially checks the wrapper;
- exercises only wrapper `--self-test`;
- does not invoke wrapper `--run`;
- does not execute the real native self-test or inspect Precision.

Real host qualification remains separately authorized.

**PROTECT THE CORE.**
