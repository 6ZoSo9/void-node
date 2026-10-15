# Buy VOID final protected V7/V2 enforcement acceptance lock v1

Marker: `VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V1`.

Status: **source/CI acceptance of one exact enforcement identity only**.

## Exact candidate

This lock consumes the exact unaccepted candidate produced by Draft #2989 at
`9982e7899a52402ad010fb9066ad78db8c9d49cc`.

Hosted run `38644238903` produced byte-identical Node 22/24/26 candidate output:
- Node 22 artifact `11931622277`;
- Node 24 artifact `11930629692`;
- Node 26 artifact `11931637125`;
- candidate bytes `16342`;
- candidate JSON SHA-256 `481603ad75f871aef503686548cc1e4b8b54d556f83dca55136813d33d6d991c`;
- candidate Git-blob SHA-1 `6b2958bdb4dbb38354d5a4b41e5b4d1e919b6794`;
- candidate enforcement-set SHA-256 `152dc7a45f4d596513cfd7dc44277ece1aea3d64e30e616089162760ec245a9e`.

The exact hosted candidate bytes are committed at
`ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v1.json` because the protected deployment installer reopens that
tracked object and independently verifies its complete 49-row source inventory
against the deployment generation. The lock proof rederives the #2989 candidate,
requires byte-for-byte equality with the committed hosted evidence, preserves the
candidate proof blob unchanged, and independently recomputes the enforcement-set
identity. The lock delta is five paths and changes no authority-bearing protected
source row.

## Promotion boundary

Only the exact reviewed candidate identity becomes accepted:

```text
complete_executable_closure_verified=true
current_enforcement_tracked_source_inventory_verified=true
candidate_enforcement_identity_accepted=true
```

The lock deliberately leaves:

```text
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

The extended #2989 workflow rederives candidate and lock independently on Node
22, 24 and 26 and requires exact lock equality across all three supported Node
majors. No historical evidence is rewritten.

This source/CI lock performs no Precision installation or deployment receipt
apply, service/RPC mutation, credential/key/wallet/signer access, payment,
transaction construction/signing/broadcast, Chain-2050/WC write,
inventory/treasury/liquidity action, presale activation or funds movement.

**PROTECT THE CORE.**
