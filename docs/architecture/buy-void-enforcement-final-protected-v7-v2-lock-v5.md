# Accept canonical V5 protected enforcement candidate

## Purpose

Accept exactly the hosted V5 candidate derived in Draft #3700 without changing
its candidate generation.

Candidate source head: `2e2688b3883ca7ef718526a0202b75554145554a`.

Hosted evidence: run `39788884247`; Node 22/24/26 jobs
`119859269924` / `119859269275` / `119859270048`; artifacts
`12429234085` / `12431116097` / `12430581057`; cross-node job
`119859577338`.

Exact candidate identity:

- bytes: `13881`;
- SHA-256: `d3ab6682dec3bdac01cb5fbbd6b7912a2461d92c3fdaf48909bf89995cc483da`;
- Git blob: `46e3774ca442cf593d25b6062ab5538d5ac43611`;
- enforcement set: `e72f512b0006eef7cec7325f39c56823eb3c878d7f8452a08c717478b7c8ac45`;
- protected inventory: `7f9bf2134ba33ddf52d6a2b9cf6fa1ba4b8ad437d71f2a5c2b1814f25f98d74f`.

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
