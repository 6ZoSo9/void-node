# Accept canonical V5 protected enforcement candidate

## Purpose

Accept exactly the hosted V5 candidate derived in Draft #3700 without changing
its candidate generation.

Candidate source head: `b9d8ad7aec19592b104d47da4a496710d4fde8db`.

Hosted evidence: run `40001353669`; Node 22/24/26 jobs
`120577956203` / `120577956712` / `120577955998`; artifacts
`12521648377` / `12522121935` / `12521514154`; cross-node job
`120578738138`.

Exact candidate identity:

- bytes: `13881`;
- SHA-256: `b61a15d8dc2c1677485c454b9158b7bc99e4318ab0a3ed629abaa037358ce604`;
- Git blob: `ef9d39fb22f7d4225f6f8abe6bb84c1f11acb8bc`;
- enforcement set: `ea6f7203779174302bd8f01219055dd5a126c8475e18dcb301e60e9a2481acbc`;
- protected inventory: `8fed6dc4bf5707123e720737fa5757ab3b62f2bf8cefa993eb56d43ff346198f`.

The only protected transition from V4 is the canonical producer runner
`6fb040de... -> d7d7aede...`, mode `100755`.

This V5 lock promotes only the exact candidate enforcement identity:

```text
complete_executable_closure_verified=true
candidate_enforcement_identity_accepted=true
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
deployment_receipt_reissue_required=true
public_presale_activation=false
funds_movement=false
```

The installed V4 deployment receipt remains historical. A new V5 protected
installation and deployment receipt require separate plan/apply/qualification
before runtime cutover.

Exactly five ADD-only paths. No host apply, service mutation, provider RPC,
credential/key/wallet/signer access, signing, transaction/payment acceptance,
presale/WC activation, treasury/liquidity action, or funds movement.

PROTECT THE CORE.
