# Public Agent Service Acceptance Persistence Trusted Context Provider Binding V1

## Purpose

This lane closes the missing server-owned binding required by the merged
acceptance-persistence HTTP route. It installs the exact process-global provider
that the existing `src/index.ts` call site already resolves:

```text
__void_public_agent_service_acceptance_persistence_trusted_context_provider_v1
```

The provider returns catalog, work-order, and quote values from one
single operator-owned JSON bundle. The HTTP command cannot select the bundle
path or supply any of those trusted values.

The lane remains source-only. It does not create a bundle, install environment
configuration, mount or enable the route, enable the persistence runtime,
provision a persistence root, restart a service, deploy a release, submit an
HTTP command, or persist an acceptance.

## Source binding

The source contract is pinned to exact `origin/main`:

```text
9a9b9a47c4f07fdae4f2f2a765183d9f9a28d7d3
```

At that commit, the full acceptance-persistence route chain and live
`src/index.ts` call site were already merged. The call site forwarded a deferred
lookup of the provider global, but no tracked source installed that global.

## Disabled by default

The binding is disabled unless:

```text
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_ENABLED=1
```

Disabled execution returns before validating the apply flag, confirmation, or
bundle path. It does not inspect or mutate the provider global and does not read
a file.

## Dry run

A dry run uses:

```text
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_ENABLED=1
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_APPLY=0
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_BUNDLE_PATH=/absolute/operator-owned/trusted-context-bundle-v1.json
```

The confirmation must remain empty. Dry run validates only the server-owned
configuration shape. It does not require the bundle to exist, read the bundle,
or install the global provider.

## Confirmed installation

Installation requires:

```text
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_ENABLED=1
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_APPLY=1
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION=installAcceptancePersistenceTrustedContextProviderV1
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_BUNDLE_PATH=/absolute/operator-owned/trusted-context-bundle-v1.json
```

The installed process-global property is non-enumerable, non-configurable, and
non-writable. An existing property is never replaced.

Installation is deliberately deferred: it captures the validated absolute path
but does not read the bundle. The bundle is opened only when the already sealed
HTTP route/runtime chain invokes the provider for a canonical command.

## Bundle contract

The JSON bundle has exact top-level keys:

```json
{
  "marker": "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_V1",
  "version": 1,
  "catalog": {},
  "work_order": {},
  "quote": {}
}
```

One bundle keeps the trusted tuple atomic at the file boundary. Separate client
or environment paths cannot mix a catalog from one source with a work order or
quote from another source.

The provider requires:

- one absolute normalized path;
- no symlink in the resolved path;
- one regular file;
- a maximum size of 24 MiB;
- no group or other write permission;
- ownership by the runtime user or root;
- stable file metadata for the duration of the read;
- valid JSON;
- the exact marker and version; and
- exact top-level keys.

The returned `{catalog, work_order, quote}` object is deeply frozen. The merged
acceptance materializer remains responsible for validating the nested catalog,
work-order, quote, provider, requester, and acceptance identities. A mismatched
tuple fails closed; this binding does not weaken or replace those checks.

## Live entrypoint ordering

`src/index.ts` installs the provider binding immediately after publishing the
primary Express app and immediately before the existing acceptance-persistence
route call site. The binding result is exposed only as process-local diagnostic
state:

```text
__void_public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1_result
```

No bundle path is placed in that result. Only its SHA-256 fingerprint is
reported.

## Remaining activation boundary

Merging this source does not make acceptance persistence live. A later
operator-controlled activation must separately:

1. construct and verify a real bundle from the exact accepted catalog,
   work-order, and quote records;
2. place it at an operator-owned path with acceptable permissions;
3. provision a disposable acceptance-persistence root;
4. deploy every environment flag disabled;
5. prove disabled and dry-run behavior on the live entrypoint;
6. enable the provider and loopback route in a bounded canary; and
7. verify the resulting acceptance and replay records before wider use.

## Authority

This source lane grants no network-listener creation, external HTTP submission,
production acceptance persistence, production replay write, payment
authorization or execution, work authorization or dispatch, Work Credit write,
wallet or signer access, production signing, transaction broadcast, service
restart, deployment, runtime configuration mutation, or money movement.
