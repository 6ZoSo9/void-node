# Public Agent Service Order Status Read-Only Source Resolver V1

## Purpose

This contract resolves one stored order-status source by `submission_id` from a configured directory. It is the bounded filesystem bridge between the canonical order-status materializer and the read-only route contract.

The resolver is read-only. It does not register an HTTP route, mount a server handler, write source data, submit work, select or authenticate a provider, accept a quote, execute payment, dispatch work, write Work Credits, mutate runtime state, restart a service, or deploy.

## Canonical layout

For a configured source root:

```text
<source-root>/<submission_id>.json
```

`submission_id` must match:

```text
^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$
```

The resolver refuses traversal syntax, separators, percent encoding, symbolic links, hard links, non-regular files, malformed UTF-8, malformed JSON, oversized files, and any source whose top-level `submission_id` does not exactly match the requested identifier.

## Read boundary

The root must already exist as a real directory and its resolved path must equal its configured absolute path. The candidate is opened read-only with `O_NOFOLLOW` when supported. File identity and size are checked before and after reading to refuse replacement or mutation during the read.

Default maximum source size:

```text
1048576 bytes
```

## Deterministic result

A found result includes:

- `found: true`
- the canonical filename
- SHA-256 of the exact source bytes
- exact byte count
- the parsed source object
- all authority flags set to `false`

A missing result includes:

- `found: false`
- `reason: order_status_source_not_found`
- `source: null`
- `source_sha256: null`
- `source_size_bytes: 0`
- all authority flags set to `false`

The root path is never emitted.

## CLI

```bash
node tools/void-public-agent-service-order-status-readonly-source-resolver-v1.mjs \
  resolve \
  --root /path/to/order-status-sources \
  --submission-id void-order-status-example-v1
```

The JSON result is written to standard output. The tool has no output-file option and performs no writes.

## Downstream validation

The resolver validates filesystem containment, file safety, JSON shape, and submission identity. The canonical order-status materializer remains responsible for lifecycle semantics. The route contract remains responsible for the external HTTP response envelope.
