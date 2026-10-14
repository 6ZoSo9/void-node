# Buy VOID enforcement artifact attestation V6

## Outcome

This lock composes the exact current V6 enforcement candidate from #2911 with
the accepted combined `ethers + express` package-runtime identity from #2913.

Bound candidate:

- candidate JSON SHA-256:
  `f3680f613095054be2699fefe6d1f11dc03eda725d930254d2a045462bf4646e`;
- candidate enforcement-set SHA-256:
  `43a1a3cbec71f59e0c33216afe5e5b826e119e95aa14acfd2bc2d8b2c238a297`;
- source runtime parent:
  `99c9b6a5aaaf0f4a5440ebc2dfade3fba70dfc1e`.

Bound package runtime:

- roots: `ethers`, `express`;
- profile ID:
  `voidrnpr1_c15b7f3cb00d85f378a69cfc536c3845e29f9be7047e3af0f9fbd646eb2f5860`;
- package aggregate:
  `5eb57ae9bfa6a0f195d5ccf40697985f0043456057525c3fdca7f4c894173561`;
- package manifest Git blob:
  `169216419f35c9213a96cde8d835c97ef4410710`.

The V6 candidate already proves the current static enforcement graph, exactly
one reviewed real-saga dynamic edge, no unknown dynamic imports, the saga
target identity and initialization closure, and the immutable compiled V5
source-finality predecessor. The package lock closes the candidate's only
declared third-party byte gap: Express.

The accepted enforcement identity is:

`c197ccf77e6fc7499143ed26f00be95c39ae2e8b16d2900255c0dcab576f0f4c`.

## Promotion boundary

This lock may promote:

```text
third_party_package_runtime_closure_verified=true
complete_executable_closure_verified=true
candidate_identity_accepted=true
```

It does **not** promote any live authority:

```text
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

The focused workflow first rederives the exact #2911 candidate on Node
22/24/26 and requires exact cross-node bytes. A second Node 22/24/26 lock
matrix independently rederives and permission-fence verifies the #2913 package
profile, then derives this exact manifest. The three accepted manifests must
also be byte-identical.

Dependency Draft #2865 is a generation boundary. If its package metadata lands,
this pre-#2865 V6 enforcement identity becomes historical and must not be
claimed as the current package generation.

No deployment, service/config mutation, credential/key/wallet/signer access,
real payment or RPC, transaction signing/broadcast, Chain-2050/WC mutation,
inventory/treasury/liquidity action, presale activation or funds movement is
authorized.

**PROTECT THE CORE.**
