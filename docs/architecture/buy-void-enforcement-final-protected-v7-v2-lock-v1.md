# Buy VOID final protected V7 V2 enforcement lock V1

This source/CI-only lock accepts the exact protected whole-enforcement candidate
derived byte-identically on Node 22, 24 and 26 by #2989.

Exact candidate:
- head: `9982e7899a52402ad010fb9066ad78db8c9d49cc`;
- bytes: `16342`;
- SHA-256: `481603ad75f871aef503686548cc1e4b8b54d556f83dca55136813d33d6d991c`;
- Git blob SHA-1: `6b2958bdb4dbb38354d5a4b41e5b4d1e919b6794`;
- enforcement set: `152dc7a45f4d596513cfd7dc44277ece1aea3d64e30e616089162760ec245a9e`;
- protected census ID:
  `voidbefv7c3_6ecf0dda04818faca50159763d330c6c95baa52148dcdbb3d5eaa36f0d649c70`;
- protected current-enforcement inventory: 49 paths,
  canonical SHA-256
  `36c18eb2bd7ac1ab02b8a1463e7e9afc82423192eedcdf7e9190f6aaba53bee5`.

The committed candidate evidence is the exact Node-22 hosted artifact from run
`38644238903`; Node 24 and 26 produced byte-identical candidates.

The lock promotes only:

`candidate_enforcement_identity_accepted=false -> true`.

It keeps:

```text
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

Focused CI rederives the candidate on Node 22/24/26, byte-compares it to the
committed candidate evidence, derives this lock on all three Node majors, and
requires exact cross-node lock equality.

The current deployment installer can consume this lock directly: it reopens the
referenced candidate and independently verifies the candidate's exact 49-path
tracked source inventory against the protected deployment generation before
constructing any deployment receipt.

No protected install/apply, receipt publication, service/config/RPC,
credential/key/wallet/signer, payment/transaction, Chain-2050/WC,
inventory/treasury/liquidity, presale activation or funds movement occurs.

**PROTECT THE CORE.**
