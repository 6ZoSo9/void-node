# Buy VOID post-2865 provider closure lock v1

Marker: `VOID_BUY_VOID_DELIVERY_DEPENDENCY_PROVIDER_CLOSURE_POST2865_LOCK_V1`.

Status: **source/CI-only accepted provider-closure identity; whole enforcement HOLD**.

## Accepted hosted evidence

This lock consumes the exact byte-identical provider-closure candidate produced by
#2919 on Node 22, 24 and 26 at:

```text
candidate_parent = bc510343c5c418a75154bedcc445cbf1251dc037
candidate_tree   = 7e21075ccd632ea11f4d424424b348217a013dfe
candidate JSON SHA-256 =
6c2bfe62b0d669bc9794a13eb24d357026ca8f9f7c055af1bcc0c0893c94247b
provider_closure_sha256 =
3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945
```

The committed evidence file is the exact hosted Node-22 candidate bytes. The
#2919 cross-node job proved Node 24 and 26 emitted identical candidate bytes.

## What is accepted

The accepted provider closure begins at:

```text
buy_void_erc20_delivery_dependency_injection_v1
  -> buy_void_erc20_delivery_dependency_bootstrap_v1
       -> native fulfillment wallet credential signer
       -> Chain-2050 ERC-20 broadcaster
       -> delivery submission guard
```

The hosted evidence binds nine provider runtime artifacts, every corresponding
source path, the server-side provider import, the delivery-consumer import, the
ambient global writer/reader contract, and the separate sign/broadcast adapter
consumer boundary.

The provider closure contains only `ethers` as a third-party package and no
dynamic module loader.

## Permanent proof

The permanent proof does not trust a copied summary.

It:

1. requires the committed hosted candidate bytes to have the exact reviewed
   SHA-256;
2. recomputes the candidate's internal provider-closure content hash;
3. pins the exact #2919 candidate proof Git blob;
4. requires the exact hosted candidate commit and tree to remain real Git
   objects and ancestors of the lock head;
5. requires every reviewed provider source path plus package/lock/build config
   and candidate proof to remain unchanged since the hosted candidate;
6. recompiles the exact TypeScript generation;
7. reruns the #2919 candidate proof on the current descendant; and
8. requires semantic equality with the accepted hosted evidence, permitting
   only the expected descendant repository HEAD/tree and the content hash that
   includes those repository IDs to differ.

Node 22, 24 and 26 must emit byte-identical lock receipts.

## Authority boundary

This accepts only the provider static-module identity.

Still false:

```text
delivery_route_closure_composed=false
package_runtime_identity_accepted=false
whole_enforcement_closure_verified=false
candidate_enforcement_identity_accepted=false
deployed_artifact_generation_verified=false
runtime_mount_authority=false
credential_read_performed=false
signing_performed=false
rpc_call_performed=false
transaction_broadcast_performed=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

The next enforcement-generation successor must compose this exact provider lock
with the reviewed post-#2865 package lock and the current delivery-route /
source-finality graph.

No service, deployment, credential, wallet/signer, RPC/payment, transaction,
Chain-2050/WC, inventory, treasury/liquidity, presale or funds action occurs.

**PROTECT THE CORE.**
