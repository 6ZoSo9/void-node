# Buy VOID final V7 V2 enforcement candidate V1

## Purpose

Derive a fresh, **unaccepted** whole-enforcement candidate from the exact
28-member census established by #2974 on top of #2971 live-process V2
production-source authority.

## Exact predecessor evidence

- source generation: `82aee920f26b45c7e43bcc9f9e1023a175e2783a`;
- hosted 28-member census run: `38628146500`;
- census JSON SHA-256:
  `5d73fccde209c2cc9719ed488f3944c9cb625d7c32c66a0f99a0ccd4c0c1c350`;
- census ID:
  `voidbefv7c2_2dddb68128ce0baff4a848568fac7651c025cc97956cdf1b3d6faff6a9ae075a`;
- artifact/source count: 28 / 28;
- Node 22/24/26 exact census equality: GREEN;
- six-module V7 delta generation:
  `cfac0b510932203623a4b9a0c09ad9c6639efdb04b0e5f1ff9feba15175f9311`;
- six-module V7 source inventory:
  `55b409c31801d743af3e449edce3cdc5408170e16dfc285053a539208c44cacb`;
- six-module V7 artifact inventory:
  `45ae15e681a209b0cecef9d581febd98e7cefaf3db72d2c869efedd59e2d5429`.

## Closure

The candidate reuses the reviewed audited-package, provider-closure and
crash-consistent saga behavior evidence from the accepted post-2865 lineage,
but rederives the entire current 28-member compiled/source inventory.

The newly added V2 live-process module is independently parsed from its exact
compiled artifact and must contain no dynamic import and no Function
constructor. Its static execution edge is therefore explicitly part of the
current closure rather than silently inherited.

The hosted #2974 inventory digests retain the exact serialization used by the
cross-node workflow (`JSON.stringify`). The candidate separately records
sorted-key canonical inventory digests for its own content-addressed body; those
canonical digests are distinct evidence fields and must never be substituted for
the hosted census digests.

A green candidate may report:

```text
package_runtime_identity_accepted=true
provider_closure_composed=true
delivery_route_closure_composed=true
live_process_v2_static_execution_closure_verified=true
third_party_package_runtime_closure_verified=true
complete_executable_closure_verified=true
```

It must remain:

```text
candidate_enforcement_identity_accepted=false
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

Only a later separate lock may accept the candidate enforcement identity.
Protected selector installation, V2 receipt publication, deployment receipt
generation, provider qualification and coupled WC/VOID launch evidence remain
separate gates.

No live service/config/RPC, credential/key/wallet/signer, payment/transaction,
Chain-2050/WC, inventory/treasury/liquidity, presale or funds action occurs.

**PROTECT THE CORE.**
