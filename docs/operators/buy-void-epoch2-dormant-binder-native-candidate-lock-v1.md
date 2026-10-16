# Buy VOID Epoch-2 dormant binder native candidate lock V1

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_LOCK_V1`.

Status: **candidate identity acceptance only; not installed and not authorized for live execution**.

## Purpose

Accept the deterministic static native first-entry candidate derived from the
repaired dormant V3R binding generation after #3358 and merged candidate gate
#3360.

Failed Drafts #3355 and #3359 are superseded. They were pinned to the
pre-#3358 native/proof generation and are not acceptance evidence.

## Source lineage

Repaired dormant binding:

- #3358 source head:
  `e602fa5b4b6961e9c24d4bbdb60a6d006a2783b2`;
- #3358 merge:
  `326c809439f9df333a9c8b1b73ecb40901b0e1a1`;
- native preentry source blob:
  `4fdf3f627f407335b9d50800fbbc913d1edae523`;
- JavaScript binder blob:
  `9c29eb4716077e459b9154f39d0f30cf2e56729f`;
- repaired binding proof blob:
  `4671d37fcdb43c2bee9d3de16402df0cd25257bb`.

Candidate gate:

- #3360 head:
  `1b9346f8e91f49019ce16585810054c10da078ca`;
- #3360 merge:
  `0fa249522c955aff03d3eaa24b768381a32d987b`;
- candidate verifier blob:
  `5ac4264d7f9bdb394cf5be4490aa1eadd1f929ee`;
- candidate workflow blob:
  `1292e9ceb82fe533339718765c6bf0982bb278bc`.

## Accepted candidate

Candidate ID:

`voidbuye2dormantbindercand1_3e577d797e1cac83f29baf35efef84620db2506722764b07598cb4f2524d4aad`

Candidate report:

- bytes: `5135`;
- SHA-256:
  `897b9700f36f13d1cdee3c5b6f128a54d0505ddfc852fdcca96e5054ea5d1829`;
- Git blob:
  `443cd004e215159b5b508ec09b29c1c586b6aa14`.

Native ELF:

- bytes: `726976`;
- SHA-256:
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`;
- static ELF64 x86-64 executable;
- no `PT_INTERP`;
- hostile `LD_PRELOAD` positive control succeeds against a dynamic control
  executable and is blocked by the static candidate;
- exact repaired self-test transcript is required, including
  `failure_truth_boundary_test_modes=true`.

JavaScript binder:

- bytes: `39391`;
- SHA-256:
  `afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e`.

## Hosted evidence

Workflow run:

`38950509895`

Jobs:

- source proof: `117140411803`;
- derive A: `117140734128`;
- derive B: `117140733906`;
- derive C: `117140733927`;
- independent compare: `117140950563`.

Artifacts:

- A: `12069020953`;
- B: `12069355140`;
- C: `12068001912`.

All three candidate reports and ELF binaries were byte-identical. The compare
job independently rederived both the report and ELF from source.

## Lock identity

`voidbuye2dormantbinderlock1_9f0002c70442e25553ea7d9dfd3203a806b9fd0e973392f25ad6a5e607995b61`

The suffix is SHA-256 over canonical JSON of the complete lock body excluding
`lock_id`.

The lock verifier does not trust the hosted artifact alone. It independently
runs the merged candidate verifier, rederives `candidate.json` and the static
ELF, and requires the exact hosted report and binary identities before
accepting the committed lock.

## Authority boundary

This gate accepts identity only:

```text
candidate_accepted=true
native_binary_identity_accepted=true
binder_source_identity_accepted=true
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

No Precision install, live binder execution, credential/private-key access,
signature, transaction/RPC, service/systemd mutation, payment acceptance,
presale/WC activation, treasury/liquidity action, or funds movement is
authorized by this lock.

## Next gate

The next separately versioned source gate is the dormant-binder install-input
materializer:

`void_buy_void_epoch2_dormant_binder_native_candidate_materializer_v1`

PROTECT THE CORE.
