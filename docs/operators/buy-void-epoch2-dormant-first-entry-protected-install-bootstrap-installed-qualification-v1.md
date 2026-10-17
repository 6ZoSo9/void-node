# Buy VOID Epoch-2 protected-bootstrap installed qualification V1

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V1`.

Status: **read-only qualification definition; no host execution or apply authority**.

## Purpose

This is the read-only successor to the create-only protected-bootstrap install
gate in #3408.

It answers two separate questions without conflating them:

1. Is the installed root-custodied bootstrap generation exactly the accepted
   generation?
2. Is that accepted bootstrap's compile-bound repository head aligned with the
   checkout from which #3391 would be invoked?

The second question is deliberately separate. An exact installed binary can be
identity-green while protected-installer execution readiness remains HOLD.

## Accepted installed identity

Accepted lock:

`voidbuye2bootstraplock1_4f11418d278908c99cc3b2de622112321600c3f3704f8919e893a2d7011b1b23`

Accepted candidate:

`voidbuye2bootstrapcand1_24d4c84d307c525cc4e28f010c7f2258db2e55256af7d8cf0cb303cf1c4ee851`

Accepted bootstrap:

- bytes: `731072`;
- SHA-256:
  `1b570f704841f8b833707de2c85ca66d2a344f3a77b5d1979ab29eaae2ec1189`;
- Git blob:
  `5d35e762fa4b510baeb89b2840d5287cc4fd6716`.

The qualifier requires the exact root:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v1`

with exactly:

- `bin/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v1`
  at root:root `0555`;
- `policy-v1.conf` at root:root `0444`.

No extra root or bin entries are accepted.

## Policy qualification

The policy must exactly match the current root-protected
`/usr/bin/python3` generation:

```text
schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V1
python_sha256=<exact current root Python SHA-256>
python_bytes=<exact current root Python bytes>
```

Any Python-generation drift therefore holds qualification before any bootstrap
execution.

## Protected-installer source qualification

The fixed bootstrap installer source remains:

`/home/zoso/dev/void-node/ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py`

Required identity:

- Git blob:
  `383b84e71b371de65579e4113469e86a59b807ab`;
- bytes: `42054`;
- SHA-256:
  `e80b68e19d1498d57cffe2cd05a15cb22a6c2f1acb639175e2be2a2f1c18c9ef`.

The checkout must be clean `main`, and the tracked blob at the explicitly
supplied checkout head must equal that reviewed installer generation.

## Compile-head alignment

The accepted bootstrap is compile-bound to:

- expected head:
  `0ea097a3fa43dc95a1a0a5272c61afe570361fc7`;
- candidate tree:
  `681e9387826f2c0fe8c0336604dfd6e57ff16d93`.

The qualifier therefore emits:

`bootstrap_compile_head_matches_current_checkout=<true|false>`.

If false:

- installed identity may still be exact;
- policy may still be exact;
- #3391 source may still be exact;
- but `protected_installer_execution_readiness=false`;
- qualification returns HOLD with
  `bootstrap_compile_expected_head_not_current_checkout`.

This prevents a later operator from discovering the compile-head mismatch only
after launching the privileged bootstrap.

## No execution

This qualification does not run:

- the installed bootstrap, including `--self-test`;
- #3391 protected installer;
- dormant-binder native/binder code;
- any service or systemd unit.

It performs only stable file reads, hashes, Git identity reads and metadata
checks.

This is intentionally more conservative than earlier native qualification
patterns.

## Modes

`--source-plan` is repository-only and performs no host read.

A future host `--plan` or `--run` requires an explicit
`--expected-head` and performs the same read-only installed inspection. Neither
mode mutates the host or executes the bootstrap.

A fully aligned result may advance only to:

`SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V1`.

That next plan is still not #3391 apply authority.

## Authority

Always false:

```text
filesystem_write=false
bootstrap_execution_performed=false
protected_installer_apply_performed=false
service_mutation=false
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

This source gate does not authorize a Precision run.

**PROTECT THE CORE.**
