# Public Agent Service Acceptance Persistence HTTP Route Server Bootstrap Callsite Integration V1

## Purpose

This lane performs the separately reviewed production-bootstrap call-site integration promised by the sealed HTTP route server bootstrap composition. It adds one minimal, disabled-by-default call to the live TypeScript entrypoint while keeping the checked-in JavaScript snapshot unchanged.

The live service audit proves that `void-node-live.service` starts `ops/run-void-node-live-v1.sh`, which executes Node with the TSX loader and `src/index.ts`. The live `src/index.ts` matches both the local repository and current `origin/main`.

## Source and checkpoint binding

The call-site source evidence is pinned to:

```text
13ce1a2bcc8f993e8b16bfba4baf443c61934e55
```

The prerequisite bootstrap composition is sealed at:

```text
85bab8415a3ae8dd48bdf3428542b956d06dd6ee
```

The source evidence verifies:

- one executable `const app = express();` declaration at line 389;
- two executable live-app exports at lines 4593 and 6103;
- exactly one export before the first listener;
- the primary app export at line 4593;
- the first listener at line 4893;
- three listener calls at lines 4893, 9025, and 9065;
- zero existing composition imports or calls;
- `src/index.js` remains exact and is not the live systemd entrypoint.

The call is inserted immediately after the primary app export and before the first listener. This gives the composition an initialized Express app while preserving listener ownership in `src/index.ts`.

## Files changed

The lane adds:

- `src/http/public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1.ts`
- the matching proof, schema, example, documentation, and workflow

The lane makes one bounded edit to:

- `src/index.ts`

The lane does not modify:

- `src/index.js`
- `ops/run-void-node-live-v1.sh`
- the systemd unit or drop-ins
- the sealed bootstrap-composition implementation

## Disabled by default

The call-site adapter is disabled unless:

```text
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ENABLED=1
```

When disabled, the adapter returns before command validation, before importing the bootstrap-composition module, before forwarding the Express app provider, and before touching the trusted-context provider.

Merging this lane therefore does not mount a production route, install a dispatcher, inspect the Express stack, create a listener, or restart the service.

## Dry-run mode

Enable the adapter without apply:

```text
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ENABLED=1
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_APPLY=0
```

Dry-run mode requires all confirmation variables to remain empty. It imports and validates the exact composition module, then forwards an apply-false command. The sealed composition and every upstream layer retain their own disabled-by-default gates.

## Apply mode

Apply requires:

```text
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ENABLED=1
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_APPLY=1
```

It also requires four exact confirmations:

```text
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIRMATION=integrateAcceptancePersistenceHttpRouteServerBootstrapCallsiteV1
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_COMPOSITION_CONFIRMATION=bootstrapAcceptancePersistenceHttpRouteServerCompositionV1
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_REGISTRAR_CONFIRMATION=integrateAcceptancePersistenceHttpRouteServerRegistrarV1
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_MOUNT_CONFIRMATION=mountAcceptancePersistenceHttpRouteServerV1
```

The composition and its upstream route, mount, registrar, runtime, and persistence layers must also be independently enabled. This lane does not override or synthesize any upstream enablement.

## Module loading boundary

`src/index.ts` statically imports only the small call-site adapter under `src/http`. The adapter does not statically import the source-only composition chain. Once explicitly enabled, it dynamically imports:

```text
scripts/public_agent_service_acceptance_persistence_http_route_server_bootstrap_composition_v1.ts
```

This avoids changing the TypeScript build root or listener ownership. The current live service already runs with the TSX loader. Disabled execution never attempts the dynamic import.

The imported module must expose the exact composition marker, command marker, version, and executor. A mismatched or incomplete module is rejected before composition execution.

## Trusted-context provider

The call site forwards a deferred provider backed by:

```text
__void_public_agent_service_acceptance_persistence_trusted_context_provider_v1
```

The call-site adapter does not invoke that provider during bootstrap. The sealed route/runtime chain remains responsible for invoking it only when a canonical acceptance request reaches the handler.

If an enabled route later requires trusted context and the global provider is unavailable, the provider fails closed.

## Result visibility

The bootstrap result is stored at:

```text
__void_public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1_result
```

This is process-local diagnostic state. It is not a network route, authorization token, persistence record, or settlement receipt.

## Safety boundary

The lane grants no authority to:

- create, start, stop, or rebind a network listener;
- bypass the composition, registrar, mount, route, runtime, or persistence gates;
- accept an external HTTP submission during proof or build;
- write acceptance or replay state during proof or build;
- authorize or execute payment;
- dispatch work;
- sign or broadcast a transaction;
- write Work Credits;
- restart or deploy the service;
- move money.

## Proof requirements

The proof verifies:

- the pre-edit `src/index.ts` is exactly recoverable by removing one import and one call-site block;
- `src/index.js` remains byte-for-byte exact;
- one exact call-site import exists;
- one awaited call exists inside `__main__`;
- the call occurs after the unique pre-listener app export and before the first listener;
- the result global is assigned once;
- disabled execution does not validate the command or import the composition;
- invalid enable flags fail closed;
- dry-run confirmations are empty;
- apply requires the call-site confirmation;
- all four confirmations are forwarded exactly;
- the composition module identity is enforced;
- the app provider is forwarded and the trusted-context provider remains deferred;
- schema, example, documentation, and workflow remain bound to the implementation.
