# Buy VOID post-2933 enforcement candidate V2

Marker: `VOID_BUY_VOID_ENFORCEMENT_POST2933_CANDIDATE_V2`.

Status: source/CI-only candidate derivation; enforcement identity remains
unaccepted.

## Fresh evidence

The reconciled #2942 head `952be5c99bc78eac9f759bb4b51574ea335bd7ab` rederived the recursion-free
current V7 enforcement census on Node 22, 24 and 26 and required exact
cross-node byte identity.

- workflow run: `38583022688`
- Node-22 census artifact: `11903418393`
- census JSON: 13,651 bytes
- census JSON SHA-256:
  `ccad7171384b69265e0a5a1528f12ee178d67a65a43ed85424fdb5b9811eef5c`
- census Git blob SHA-1:
  `86f8a611e39cda45f86523595630858f1c9bf0cc`
- census ID:
  `voidbe2933c1_b37b0e86035a3dd1ccf09821445069ea0de1626be4763c9d19d2975645a93539`
- artifact inventory SHA-256:
  `cf36522638c099f7b8c5036fb32d943d6fe543329a36519e69cf2d9fb0105dd0`
- source inventory SHA-256:
  `4e86bb6f22dbd0e8908697291b78309c295cd316603532a3eb7ccfcc877749d5`
- artifact/source count: 27 / 27.

The same exact-head workflow also rederived the five-module V7 executable delta
byte-identically across Node 22/24/26:

- generation:
  `17e70d5f6fe47f7eda87aabfa79ead574ecadeec4eb44470b774f020c997006e`
- artifact inventory:
  `9ddb6e6b9ed47313bec79b20accc26c36be386ce862db8f2f771d871dd7c6fae`.

The predecessor V1 candidate correctly refuses this generation and is retained
only as historical evidence.

## V2 derivation

V2 reuses the existing reviewed composition logic but binds it to current source
parent `ccb4546cf841ce1a43a13339272e4d07c90f7cc0`, the fresh census, current
preflight bytes, current V7 delta, the accepted post-#2865 `ethers + express`
package profile, provider closure, predecessor enforcement lock and real-saga
edge/behavior evidence.

Node 22/24/26 independently derive V2 and the focused workflow requires the
candidate JSON bytes to be identical. No candidate set is hard-coded before
that cross-node derivation.

## Authority boundary

A green V2 candidate may prove:

```text
package_runtime_identity_accepted=true
provider_closure_composed=true
delivery_route_closure_composed=true
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

Only a later exact-evidence lock may promote the candidate enforcement identity.
Deployment receipts, immutable operator launch, live provider quorum and the
real one-payment canary remain separate gates.

No live runtime/service/config, credentials, wallet/signer, RPC/payment,
transaction, Chain-2050/WC, inventory/treasury/liquidity, presale/market or
funds action occurs.

PROTECT THE CORE.
