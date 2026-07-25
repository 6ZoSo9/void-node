# External Opportunity Agent Intake Read-Only Discovery Route V1

## Purpose

This lane defines a framework-neutral, pure response handler for the canonical
well-known discovery path:

`/.well-known/void-agent-intake-capability-v1.json`

The response body is the exact sealed Agent Intake Capability V1 manifest with
fingerprint `c4e9ea03631b39962753cd7f91c198bbba1e4081c716da24e27f14a64f7bfd7a`.

## Contract

- `GET` returns `200` and the compact JSON manifest plus a trailing newline.
- `HEAD` returns the same headers and `Content-Length` as `GET`, with no body.
- `If-None-Match` accepts the strong ETag, a weak equivalent, a matching list
  member, or `*` and returns `304`.
- Unsupported methods return `405` with `Allow: GET, HEAD`.
- Any non-canonical path returns `404`.
- Public read-only CORS is `Access-Control-Allow-Origin: *`.
- Cache policy is `public, max-age=300, must-revalidate`.
- The strong ETag is `"sha256-c4e9ea03631b39962753cd7f91c198bbba1e4081c716da24e27f14a64f7bfd7a"`.
- The exact response-body SHA-256 is `a085c9d38ad6d1ab9358c3166a4e60f468ed5dd145060f3edf85e23f54227c97`.

## Integration boundary

This lane does not bind the handler into `src/index.ts`, Express, or another
server. It does not create a network listener, issue a network request, deploy
an endpoint, restart a service, read or write a journal, access credentials or
authentication secrets, submit paid work, award Work Credits, touch a wallet,
construct or submit transactions, or enable live execution.

A later separately reviewed route-binding lane may connect this pure handler to
an existing public-node listener.
