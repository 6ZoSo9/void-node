# Buy VOID final protected V7/V2 enforcement acceptance lock v2

Marker: `VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V2`.

Status: **source/CI acceptance of one exact repaired V7/V2 enforcement identity only**.

## Exact candidate

This lock consumes the exact unaccepted V2 candidate produced by #2999 at
`1d138dcb3ac61f156fe8eb0fff27341fe97c04f9`.

Hosted run `38654613151` produced byte-identical Node 22/24/26 candidate
output:

- Node 22 artifact `11936242797`;
- Node 24 artifact `11935634883`;
- Node 26 artifact `11936605015`;
- candidate bytes `16342`;
- candidate JSON SHA-256
  `092a97373013d32dda610df7363587fa3a669f33248a37420b07541d12d892bb`;
- candidate Git blob SHA-1
  `4e23ecbb64eb26c14f5ab15af85eb86d59c3a718`;
- candidate enforcement-set SHA-256
  `05d7648032223f74a05d89200ef23a76a5265ef2a3a26e52c7f51ce3b33bc852`.

The candidate is rooted in accepted V4 protected census
`voidbefv7c4_9c8fa20632d3cfb431c0d13229153d19f076613720c7402e5374eab1f833401d`.

## Acceptance boundary

This child changes no path in the protected 49-member enforcement source
inventory. It commits the exact hosted candidate bytes, binds them with a
deterministic acceptance lock, rederives both candidate and lock independently
on Node 22/24/26, and proves the accepted lock is directly consumable by the
existing V7 deployment-receipt planner.

Only these facts are promoted:

```text
complete_executable_closure_verified=true
current_enforcement_tracked_source_inventory_verified=true
candidate_enforcement_identity_accepted=true
```

These remain false:

```text
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

The historical #2991 V1 lock remains historical evidence and is not repinned.

This PR performs no Precision install/apply, deployment receipt creation,
service/RPC/payment mutation, credential/key/wallet/signer access,
transaction construction/signing/broadcast, Chain-2050/WC action,
inventory/treasury/liquidity action, presale activation, or funds movement.

**PROTECT THE CORE.**
