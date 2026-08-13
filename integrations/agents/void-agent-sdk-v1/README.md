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
