# Public Agent Service Order Status Read-Only Callable Express App Repair V1

## Purpose

Repair the live-startup failure observed during the first guarded order-status
route activation attempt without changing the route, source format, startup
callsite, configuration contract, listener topology, or authority boundary.

The exact activation attempt failed before HTTP port `4100` became ready.
Rollback removed the exact activation drop-in and restored the disabled
HTTP `404` state. The redacted diagnostic classified the failure as:

```text
invalid_express_app_provider_result
```

The callsite analysis also proved that the provider identifier was available
before the integration call. The failure was therefore inside the integration's
validation of the provider result, not an unavailable or late provider binding.

## Root cause

An Express application is a callable JavaScript function with methods such as
`get`. The integration previously passed `appProvider()` through the generic
`record` validator, which accepts only non-array objects. A real Express app has
`typeof app === "function"`, so startup refused it before the HTTP listener was
created.

The earlier fake-app proof used a plain object and therefore did not exercise
the callable Express runtime shape.

## Repair

The integration now uses a dedicated `expressApp` validator:

- the value may be a function or a non-array object;
- the value must expose `get` as a function;
- `null`, arrays, primitives, and callable values without `get` are rejected;
- the generic `record` validator remains unchanged for all other contracts;
- `src/index.ts` and its provider binding remain unchanged.

## Verification

The focused proof covers:

- disabled mode never invoking `appProvider`;
- an actual `express()` callable app being accepted without listening;
- a callable fake app registering exactly one route and serving a deterministic
  found response;
- plain-object fake-app compatibility;
- rejection of undefined, null, primitives, arrays, and callable values without
  `get`;
- unchanged source bytes;
- no listener creation, source write, configuration, daemon reload, service
  restart, deployment, or activation.

The existing order-status materializer, producer, source resolver, route
contract, request handler, route registrar, and HTTP integration proofs also
remain required.

## Decision

```text
startup_repair_source_ready=true
ready_to_open_pull_request=true
ready_to_retry_activation=false
integration_disabled=true
ready_for_activation=false
```

A successful source merge alone does not authorize another activation attempt.
The repaired code must be reviewed, merged, deployed to the live runtime, and
re-surveyed before a new activation packet can be built.
