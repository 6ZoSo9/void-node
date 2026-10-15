# Buy VOID delivery dependency provider closure v1

Marker: `VOID_BUY_VOID_DELIVERY_DEPENDENCY_PROVIDER_CLOSURE_V1`.

Status: **post-#2865 source/CI candidate census only**.

## Purpose

The accepted pre-#2865 enforcement work scanned the delivery-route module, which
reads signer/broadcaster methods from:

```text
globalThis.__void_buy_void_delivery_runtime_dependencies_v1
```

That route-level graph does not itself identify the executable code authorized
to populate the global.

Current server source supplies that dependency object through:

```text
buy_void_runtime_integration_v1
  -> buy_void_erc20_delivery_dependency_injection_v1
       -> buy_void_erc20_delivery_dependency_bootstrap_v1
            -> native fulfillment wallet credential signer
            -> Chain-2050 ERC-20 broadcaster
            -> delivery submission guard
```

Those methods may later read the reviewed credential, sign, call RPC and
broadcast when separately enabled. Their code therefore belongs in any future
claim of a complete production enforcement/executable closure.

The sign/broadcast adapter is **not** a runtime member of this provider graph:
the bootstrap and broadcaster reference its interfaces through TypeScript
`import type`, which is erased from compiled JavaScript. The delivery consumer
imports the adapter's runtime constants separately. This proof therefore binds
and content-addresses that adapter at the consumer boundary without falsely
classifying it as a provider-closure member.

## Exact generation

This candidate is authored from merged audited-dependency main:

```text
source_parent = 35ff3f8ec453f8104b59967580a84347d6bc1d23
package.json  = 14fbdf5717b07fd4c734f5da7a8e84ed59bee93f
package-lock  = 15b5c82ea36f13079a2f9e8863722f654eb3f201
```

The proof requires every source member of the discovered provider closure plus
`package.json`, `package-lock.json` and `tsconfig.build.json` to remain
unchanged from that source parent.

The focused workflow compiles with the locked TypeScript compiler directly. It
does not execute repository post-build helper scripts.

## Closure rules

The census begins at:

```text
dist/economic/buy_void_erc20_delivery_dependency_injection_v1.js
```

It follows only literal same-directory relative ES-module imports/exports,
bounds the closure to 128 modules, and content-addresses every compiled member.

It rejects:

- non-literal or dynamic `import()`;
- `require`, `createRequire`, `eval`, or `Function`;
- `process.getBuiltinModule` and `Module._load` style escape hatches;
- relative imports outside the reviewed economic compiled directory; and
- any third-party package other than `ethers`.

Node built-ins are inventoried explicitly in the receipt.

The proof also binds both sides of the ambient global:

- the actual server runtime statically imports the provider and delivery
  consumer;
- the provider writes exactly `decision.dependencies` to the reviewed global;
- the delivery consumer reads the exact same global key.

## Deliberate non-claims

This closes a **provider static-module census**, not the complete enforcement
authority.

A GREEN candidate still reports:

```text
delivery_route_closure_composed=false
whole_enforcement_closure_verified=false
package_runtime_identity_accepted=false
candidate_enforcement_identity_accepted=false
deployed_artifact_generation_verified=false
runtime_mount_authority=false
credential_read_performed=false
signing_performed=false
rpc_call_performed=false
transaction_broadcast_performed=false
production_source_finality_authority_ready=false
presale_activation=false
funds_movement=false
```

The next enforcement successor must compose this exact provider closure with the
delivery-route/preflight graph and a reviewed post-#2865 package-runtime
identity before it can claim whole executable closure.

No service, credential, customer/payment record, wallet/signer, RPC,
transaction, Chain-2050/WC, inventory, presale/market, treasury/liquidity or
funds action occurs here.

PROTECT THE CORE.
