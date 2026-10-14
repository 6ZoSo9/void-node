# Buy VOID post-2933 whole-enforcement candidate V1

Marker: `VOID_BUY_VOID_ENFORCEMENT_POST2933_CANDIDATE_V1`.

Status: **source/CI-only candidate; enforcement identity is not yet accepted.**

## Purpose

The accepted post-#2865 enforcement set from #2931 became historical when #2933
added the V7 production-finality executable surface. This successor derives the
first complete current-generation enforcement candidate instead of repinning the
historical 23-artifact lock.

It is stacked on #2933 after the provider-observation branding proof repair.
That repair changes only proof/workflow bytes; the economic/runtime generation
remains exactly the one independently censused by #2940.

## Hosted current-generation evidence

#2940 workflow run `38561882760` independently compiled the exact runtime on
Node 22, 24 and 26 and produced byte-identical 27-artifact census JSON.

- census JSON SHA-256:
  `bf8e33935d2d5b6604679bf64bd4dc6763fb9cf8cb3ff5b287e89325e773ddc0`
- census ID:
  `voidbe2933c1_bf0fae6a02a69c2fe17c2fd6a4a552db4f30dfdee16a8b4429865e3de389d888`
- artifact inventory SHA-256:
  `07ccac7dd9b02c4067739686e8020e589af9134886da62a9ad807ac54c4fbe5a`
- source inventory SHA-256:
  `828f4e6e3391c7f5b3d0e8e5ef131dd9ebb5325b0dd7f88b692b8e283bd74964`

The transition from #2931 is exact:

- predecessor artifacts: 23
- unchanged predecessor artifacts: 22
- changed artifact: source-finality execution preflight
- added artifacts: V7 provenance, same-live-process binding, provider-pair
  binding, and Ethereum checkout finality
- removed artifacts: none

The independently green five-module V7 delta generation is:

`2316526ff2366b785972f4fd11f49440a859704f57fcdc047f3edab623d39e4b`.

## Recomposition

The candidate proof independently revalidates:

1. all 27 current compiled/source identities;
2. #2931 as immutable historical predecessor evidence;
3. the accepted audited `ethers + express` package profile;
4. the post-#2865 provider closure and current descendant semantic
   requalification;
5. the exact V7 five-module executable delta;
6. the exact compiled real-saga dynamic-import edge; and
7. the existing crash-consistent saga behavior proof, which performs no real
   network, credential, wallet, signing, broadcast, or funds action.

The resulting candidate enforcement set is:

`839840e9480abdda2afe2daa3e948e7f1508ffe3a5e1c8316e4fc32b22ccebbc`.

## Candidate boundary

A green candidate may state:

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

If Node 22/24/26 rederive identical candidate bytes, the next step is a separate
versioned lock that promotes only the candidate enforcement identity.
Deployment/process/provider/live-canary authority remains separate.

No merge, deployment, service/config mutation, credentials/keys/wallet/signers,
real RPC/payment, transaction, Chain-2050/WC mutation, presale activation,
inventory/treasury/liquidity action or funds movement occurs.

**PROTECT THE CORE.**
