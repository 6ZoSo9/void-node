# Buy VOID audited post-#2865 enforcement identity lock V1

This lock accepts the exact byte-identical audited enforcement candidate derived
by #2928 after its source-finality artifact-order repair.

Candidate evidence:
- exact parent: `3c93b17200c4eeffeaea488c2970c5f7dcc6891e`;
- candidate bytes: `2806`;
- candidate SHA-256:
  `d2b1488dbc6b9dffeb7cdf428be10ea01720081347bc53438ed89a468defc70d`;
- candidate Git blob:
  `e85ec223ccb5babcc834a300e1be5abc315626dd`;
- enforcement-set SHA-256:
  `1f83d8e867fc53e8a9ed240f4876f1f9412b7b2dca7c06cbb479dbe38e40a93b`.

The candidate was independently produced with identical bytes on Node 22, 24
and 26. It composes the post-#2865 audited `ethers + express` package profile,
the accepted provider closure, all 23 reviewed delivery/preflight compiled
artifacts, the locked source-finality generation, and the exact real-saga
dynamic edge.

This successor promotes only:

```text
complete_executable_closure_verified=true
candidate_enforcement_identity_accepted=true
```

It keeps:

```text
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

The existing focused provider-closure workflow re-derives the candidate on
Node 22/24/26, requires exact equality with the committed candidate evidence,
derives the lock independently, and requires cross-node exact lock equality.

This is source/CI evidence only. It performs no deployment, service mutation,
credential/key/wallet/signer access, payment/RPC, transaction construction,
signing or broadcast, Chain-2050/WC mutation, inventory/treasury/liquidity
action, presale activation or funds movement.

PROTECT THE CORE.
