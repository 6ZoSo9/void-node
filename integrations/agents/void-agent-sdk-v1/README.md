# VOID Agent SDK v1

A standalone, zero-dependency Node.js client for the public VOID agent-discovery chain.

It lets an outside developer or AI agent:

1. fetch `/.well-known/void-agent-discovery.json`;
2. validate the canonical same-origin discovery document;
3. fetch and validate the capability-negotiation catalog;
4. compute a client-side, fail-closed capability intersection;
5. produce a content-addressed machine-readable report.

The SDK does **not** authenticate, submit work, send credentials, access a wallet,
write Work Credits, execute payment, broadcast a transaction, mutate a node, or
deploy anything.

## Requirements

- Node.js 22.x, 24.x, or 26.x
- no npm dependencies
- HTTPS for non-loopback clearweb origins
- HTTP is accepted only for loopback or `.onion` origins

The release workflow proves the SDK, CLI, integrity manifest, and package dry-run
independently on Node.js 22, 24, and 26. Unsupported Node majors are not part of
the reviewed runtime contract.

## CLI

```bash
node cli.mjs \
  --base https://node.example \
  --want public_discovery,capability_negotiation \
  --pretty
```

Create a private report file:

```bash
node cli.mjs \
  --base https://node.example \
  --output void-agent-report.json
```

Output files are create-only and use mode `0600`.

## Library

```js
import {
  discoverVoidAgentV1,
  verifyVoidAgentReportV1,
} from "./index.mjs";

const report = await discoverVoidAgentV1({
  baseUrl: "https://node.example",
  wanted: ["public_discovery", "capability_negotiation"],
});

verifyVoidAgentReportV1(report);
console.log(report.report_id);
```

Tests may inject a custom `fetchImpl`; production callers normally use Node's
built-in `fetch`.

Use one stable transport function for retries. Each transport/origin admits one
request generation at a time. An overlapping call, or a retry while an earlier
fetch, body read or cancellation remains unresolved, fails before another fetch
with `*_transport_generation_unsettled`. Other origins and independent transport
functions remain isolated. Creating a new wrapper does not prove that an old
transport has released its resources.

The request uses a monotonic deadline; rejection cleanup has its own maximum
250 ms caller wait. Expiry of either wait does not release an unresolved resource.
In particular, successful custom `cancel()` cannot release a still-pending raw
`read()`. Detached observers consume late outcomes and retire the exact generation
only after all issued operations settle and EOF, stream error or successful
cancellation establishes body termination. Late bytes never become a successful
discovery report. A transport that never settles stays unavailable for that
origin; native stream errors can recover on a later call without resetting the SDK.

Custom response metadata is snapshotted once before body admission. HTTP status
must be an integer from 100 through 599, `ok` must be a boolean exactly matching
2xx status, and redirect evidence must be a boolean. Only successful status with
the exact requested final URL and JSON content type can contribute capability
evidence. Contradictions, invalid values and throwing accessors fail closed and
enter bounded cleanup while preserving the primary error.

## Fail-closed behavior

The SDK rejects:

- redirects;
- cross-origin or scheme-relative advertised paths;
- credentials embedded in the base URL;
- non-HTTPS clearweb origins;
- non-JSON responses;
- oversized response bodies;
- incorrect network, marker, or protocol values;
- mutation, credential, authentication, payment, Work Credit, or automatic
  fulfillment claims;
- unsafe HTTP methods;
- duplicate or malformed capability IDs;
- tampered discovery reports.

Unknown or ambiguous capabilities are always `not_granted`.

## Integrity

`integrity.json` binds every distributed package file by byte count and SHA-256.
The manifest intentionally excludes itself to avoid a circular hash.

## License

VOID Community License (VCL) v1.0. See `LICENSE`.
