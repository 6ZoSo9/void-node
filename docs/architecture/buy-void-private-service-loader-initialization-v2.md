# Buy VOID private service loader initialization V2

## Purpose

Version the independent broadcaster/custodian loader-initialization evidence
forward to the audited post-#2865 dependency generation.

The four caller TypeScript sources and both service-module Git blobs remain
byte-identical to the previously reviewed V1 lane (#2915). The only authority
generation that changed is the Node package profile:

- `package.json` blob
  `14fbdf5717b07fd4c734f5da7a8e84ed59bee93f`;
- `package-lock.json` blob
  `15b5c82ea36f13079a2f9e8863722f654eb3f201`;
- reviewed ethers-V2 profile
  `voidrnpr1_7cfd6b67e6c2bde498196fa8bc880031ea24f95942c194ee7e6f553054c08451`;
- reviewed ethers package aggregate
  `5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73`;
- `ethers@6.17.0`.

Historical V1 evidence is not repinned.

## Why the old dynamic-tool census is not re-executed

The original dynamic-tool census is intentionally package-generation-bound.
Under the audited #2865 pair the repository's reviewed successor classifies the
frozen census as a historical refusal. V2 therefore:

- binds the exact frozen census Git blob as lineage evidence;
- checks that it still names the two service targets and four exact callers
  qualified here;
- does **not** claim a new positive three-target census from the frozen script;
- directly proves these four current compiled loader bodies instead.

This avoids turning a deliberate historical refusal into a silent current
positive.

## Reviewed execution

The V2 proof binds exact Git blobs for:

- three prepared-transaction broadcaster caller sources;
- one prepared-transaction custodian caller source;
- both service modules;
- the frozen historical dynamic-tool census;
- current package/lock/build metadata;
- the reviewed Node package-runtime tool;
- the canonical ethers-V2 profile and its V2 proof.

The workflow installs the exact lock with lifecycle scripts disabled and invokes
the locked TypeScript compiler. Each compiled `defaultServiceModule()` body
must remain the exact reviewed dynamic-import form with the literal expected
service target.

The proof re-runs canonical ethers-V2 package enforcement, materializes that
profile into a private reviewed runtime, copies the exact service-module bytes,
and executes each compiled loader body through the reviewed filesystem
permission fence. It inspects exports, marker, factory presence and source-only
authority metadata, but never invokes either service factory.

## Positive evidence

A GREEN result may establish:

```text
package_generation=audited_post_2865
historical_dynamic_tool_census_reexecuted=false
audited_generation_frozen_census_positive=false
actual_compiled_loader_body_executed=true
exact_service_module_bytes_imported=true
broadcaster_module_initialization_qualified=true
custodian_module_initialization_qualified=true
dynamic_tool_initialization_closure_verified_for_broadcaster_and_custodian=true
service_factory_invoked=false
service_started=false
socket_created=false
credential_or_private_key_access=false
signing=false
transaction_submission=false
transaction_broadcast=false
money_movement=false
```

## Authority boundary

This is initialization evidence for two independent private services. It is not
the current V7 enforcement closure and does not expand launch authority.

It intentionally keeps:

```text
execution_network_isolation_provided=false
complete_executable_closure_verified=false
accepted_enforcement_generation=false
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
presale_activation=false
funds_movement=false
```

No service factory is called. No listener is started. No credential/private key,
wallet/signer, RPC call, transaction construction/submission/broadcast,
Chain-2050/WC mutation, inventory, treasury/liquidity, payment, presale
activation or funds movement occurs.

The V7 enforcement/source-finality owner lanes remain separate.

**PROTECT THE CORE.**
