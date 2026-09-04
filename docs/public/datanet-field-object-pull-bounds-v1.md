# DataNet field-object pull bounded transport v1

Marker: `VOID_DATANET_FIELD_OBJECT_PULL_BOUNDS_V1`

Status: source/proof only; no deployment or runtime activation.

## Problem

`tools/datanet-field-object-pull-v1.mjs` previously accumulated every HTTP
response chunk in memory and read local files without an admitted byte ceiling.

The existing socket timeout was also an inactivity timeout, not a total
operation deadline. A peer that continued sending data slowly could therefore
keep the operation alive, and an oversized local or remote object could consume
unbounded process memory before its SHA-256 mismatch was reported.

The URL supplied by an operator was copied into receipts and console output
verbatim, so a URL containing user-info credentials could also leak that
material into local evidence.

## Repair

The puller now enforces three independent limits:

- `VOID_PULL_MAX_BYTES`
  - default: 64 MiB
  - accepted range: 1 byte through 256 MiB
- `VOID_PULL_TIMEOUT_MS`
  - inactivity timeout
  - default: 10 seconds
  - accepted range: 100 ms through 60 seconds
- `VOID_PULL_TOTAL_TIMEOUT_MS`
  - total operation deadline
  - default: 30 seconds
  - accepted range: 100 ms through 120 seconds

Invalid limit text fails before file or network I/O.

### Local sources

Local pathname and `file://` reads now:

1. open the leaf with `O_NOFOLLOW`;
2. require a regular file;
3. reject an admitted size above the byte ceiling;
4. read exactly the admitted size from the retained descriptor;
5. probe for growth;
6. re-stat the retained descriptor; and
7. reject a changed generation, short read, or growth.

A local symlink is not followed.

### HTTP sources

HTTP and HTTPS reads now:

- reject URL credentials;
- reject URL fragments;
- keep query text out of receipts and console output;
- reject redirects rather than following them;
- reject non-2xx status;
- reject malformed `Content-Length`;
- reject an advertised body above the byte ceiling before buffering;
- stop a chunked/streamed response as soon as it crosses the ceiling;
- enforce both inactivity and total deadlines; and
- retain zero attacker-controlled response bytes on a failed pull.

The expected SHA-256 remains the final acceptance condition.

## Receipt compatibility

The existing receipt marker and existing fields remain. A bounded `limits`
object is added:

```json
{
  "max_bytes": 67108864,
  "inactivity_timeout_ms": 10000,
  "total_timeout_ms": 30000
}
```

The object and receipt are created mode `0600` under the existing
`.void-field-trial/datanet-field-object-pull/` evidence root.

## Executable proof

`scripts/prove_datanet_field_object_pull_bounds_v1.mjs` runs the real CLI
against disposable local files and a loopback HTTP server.

It proves:

- bounded retained-descriptor local read;
- `file://` control;
- local oversize rejection with zero persisted payload bytes;
- leaf-symlink rejection;
- valid HTTP pull;
- redirect rejection;
- advertised oversize rejection;
- streamed oversize rejection;
- invalid Content-Length rejection;
- total-deadline enforcement;
- hash mismatch rejection;
- invalid limit rejection before receipt creation; and
- URL credential rejection without credential disclosure.

The proof creates and removes only disposable temporary directories.

## Authority boundary

This change does not:

- contact a production DataNet peer in CI;
- alter Chain-2050 state;
- deploy or restart a service;
- access credentials, keys, wallets, or signers;
- dispatch paid work;
- mutate Work Credits or validators;
- construct, sign, or broadcast a transaction;
- fund inventory; or
- move funds.
