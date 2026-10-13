# Buy VOID enforcement V6 current candidate

## Purpose

Derive a new **unaccepted** enforcement candidate from the current stacked
source generation after:

- compiled source-finality V5 lock #2908; and
- exact real-saga loader qualification #2909.

Historical enforcement V5 remains immutable and is expected to refuse current
Epoch-2 executable source. This successor does not repin V5.

## Exact parent and predecessor

Current source parent:

`99c9b6a5aaaf0f4a5440ebc2dfade3fba70dfc1e`

Locked source-finality compiled V5:

- manifest Git blob:
  `44dc5c187adeb35b6a41038a044165f1c6799c74`;
- compiled generation:
  `18758f6563f9a96aea0d55e293a4c10da8de349ba12ecc90fdebd82f486b944c`;
- `compiled_artifact_generation_verified=true`;
- deployed/runtime/production authority remains false.

## Dynamic saga edge

The current static enforcement graph is rebuilt and scanned from:

`dist/economic/buy_void_delivery_runtime_integration_v1.js`

The candidate requires exactly one code-generated dynamic edge:

`dist/economic/buy_void_erc20_execution_composition_v1.js`
→
`../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs`

It composes:

- #2909 exact real-saga module initialization evidence;
- the exact saga behavior proof
  `d33206063799aaddf64ce178a618e174e0ddf628`;
- exact saga source blob
  `d6a2d1cd82e5e255f435c1e21d1783774a44b2b1`.

Therefore this candidate may state that this dynamic edge's target identity and
initialization transitive closure are verified. No saga export is invoked by
the loader proof; the existing behavior proof exercises the saga with injected
inert adapters and reports no network request, credentials, wallet, signing,
real broadcast or money movement.

## Third-party package boundary

The static graph's non-builtin packages must be exactly:

`ethers`
`express`

The current pre-#2865 `ethers` installed byte closure is independently
reverified against reviewed profile:

- profile blob `87b650e28366acfea3d140ea7778f41f57e5b0c3`;
- profile ID
  `voidrnpr1_bb76a6a16b4fb779edffb4f541f7a91d0ddb00bfe404031b4387840e74001e77`;
- aggregate
  `5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73`.

There is currently no equivalent reviewed byte-runtime profile for
`express`. Therefore this candidate must keep:

`express_package_runtime_verified=false`
`third_party_package_runtime_closure_verified=false`
`complete_executable_closure_verified=false`

Dependency Draft #2865 remains an Amber semantic neighbor. If its package
generation lands, this pre-#2865 candidate becomes historical evidence and the
current package/compiler generation must be rederived.

## Authority boundary

This is derive-only candidate evidence. Even GREEN CI must keep:

`candidate_identity_accepted=false`
`deployed_artifact_generation_verified=false`
`runtime_mount_authority=false`
`production_source_finality_authority_ready=false`
`presale_activation=false`
`funds_movement=false`

It does not authorize a real customer payment, canary payment, source-chain
RPC finality acceptance, wallet/signer access, transaction signing/broadcast,
Chain-2050 mutation, inventory mutation, service deployment/restart or public
presale opening.

The next source gate after a GREEN candidate is the missing reviewed
`express` package-runtime byte profile (or a stronger combined package
profile), followed by a separately reviewed locked enforcement successor.

**PROTECT THE CORE.**
