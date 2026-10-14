# Buy VOID private service loader initialization V1

## Purpose

This source/CI-only qualification is stacked on the exact reviewed real-saga
loader head `99c9b6a5aaaf0f4a5440ebc2dfade3fba70dfc1e` (#2909).

#2909 qualifies the crash-consistent saga dynamic-import initialization edge.
The reviewed enforcement dynamic-tool census still contains two other unique
service targets:

- `tools/buy-void-prepared-transaction-broadcaster-service-v1.mjs` from three
  compiled caller loaders; and
- `tools/buy-void-prepared-transaction-custodian-service-v1.mjs` from one
  compiled caller loader.

This lane qualifies only those four actual compiled loader bodies and exact
service-module initialization. It does not call either service factory.

## Reviewed execution boundary

The proof binds exact Git blobs for:

- all four caller TypeScript sources;
- both service modules;
- the frozen dynamic-tool census;
- `package.json`, `package-lock.json` and `tsconfig.build.json`;
- the reviewed Node package-runtime V1 tool; and
- the reviewed V1 `ethers` package profile.

The workflow installs the exact lock with lifecycle scripts disabled and invokes
the locked TypeScript compiler directly. Each compiled `defaultServiceModule`
body must remain exactly the reviewed code-generated form:

```text
new Function("specifier", "return import(specifier)")
```

with one literal target for the expected broadcaster or custodian module.

The service modules themselves must have no dynamic import or `Function`
constructor and must retain their exact static dependency sets. Their exact
reviewed bytes are copied into a private temporary runtime alongside the
reviewed, content-verified `ethers` dependency closure. The reviewed package
runtime then executes each extracted loader under Node filesystem permissions
restricted to that private tree and with ambient Node/dynamic-loader overrides
removed.

The loaded module is inspected only for its exact exports, marker, factory
presence and source-only authority metadata. The factory is never invoked.

## What this proves

A GREEN result may establish:

```text
actual_compiled_loader_body_executed=true
exact_service_module_bytes_imported=true
broadcaster_module_initialization_qualified=true
custodian_module_initialization_qualified=true
service_factory_invoked=false
service_started=false
socket_created=false
credential_or_private_key_access=false
signing=false
transaction_submission=false
transaction_broadcast=false
money_movement=false
execution_network_isolation_provided=false
dynamic_tool_initialization_closure_verified_for_broadcaster_and_custodian=true
```

The original dynamic-tool census remains the authority for the full three-target
shape: saga 9 callers, broadcaster 3 callers, custodian 1 caller.

## What this does not prove

This is not service behavior qualification and not enforcement acceptance.
It intentionally keeps:

```text
complete_executable_closure_verified=false
accepted_enforcement_generation=false
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
presale_activation=false
funds_movement=false
```

No service socket is started. No custody record, credential, private key,
signer, RPC transport, transaction submission or broadcaster is invoked. Node's
permission fence restricts filesystem access but is not claimed as network
isolation; `execution_network_isolation_provided=false` remains explicit.

The reviewed V1 package profile is the pre-#2865 dependency generation. If the
audited dependency generation in #2865 lands, this exact V1-backed qualification
becomes historical and requires a versioned package-runtime successor rather
than repinning frozen V1 evidence.

A later enforcement successor may compose #2909's saga initialization evidence
with this broadcaster/custodian initialization evidence, but it must separately
justify any stronger claim about service factory behavior, packaged/deployed
identity, provider quorum or production source-finality authority.

**PROTECT THE CORE.**
